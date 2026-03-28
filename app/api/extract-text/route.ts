import { NextRequest, NextResponse } from 'next/server'
import { getDocumentProxy } from 'unpdf'
import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'
import { parse as parseHwp } from 'hwp.js'
import { inflateRawSync } from 'zlib'
import cfb from 'cfb'

export const maxDuration = 30

// ============================================================
// 1. PDF 텍스트 추출 (unpdf + CMap CDN)
// ============================================================
async function extractPdf(data: Uint8Array): Promise<{ text: string; pages: number }> {
  const doc = await getDocumentProxy(data, {
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/cmaps/',
    cMapPacked: true,
    useSystemFonts: true,
  })
  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .filter((item: any) => item.str !== undefined)
      .map((item: any) => item.str)
      .join(' ')
    if (text.trim()) pages.push(text.trim())
  }
  return { text: pages.join('\n\n'), pages: doc.numPages }
}

// ============================================================
// 2. HWP 텍스트 추출 — hwp.js 시도 후 실패 시 CFB+zlib 직접 파싱
// ============================================================
function extractHwp(buffer: Buffer): string {
  // 방법 1: hwp.js (비압축 HWP)
  try {
    const parsed = parseHwp(buffer, { type: 'buffer' })
    const texts: string[] = []
    const extractItems = (items: any[]) => { if (!items?.length) return; let l=''; for (const i of items) { if (i.type===0) l+=typeof i.value==='string'?i.value:String.fromCharCode(i.value) }; if (l.trim()) texts.push(l.trim()) }
    const walkP = (p: any) => { if (!p) return; if (Array.isArray(p.content)) extractItems(p.content); if (p.controls) for (const c of p.controls) { if (c.content&&Array.isArray(c.content)) for (const row of c.content) { if (Array.isArray(row)) for (const cell of row) { if (cell.items) cell.items.forEach(walkP) } } } }
    if (parsed.sections) for (const s of parsed.sections) { if (s.content) s.content.forEach(walkP) }
    if (texts.length > 0) return texts.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  } catch { /* hwp.js 실패 → 방법 2 */ }

  // 방법 2: CFB + inflateRaw (압축된 HWP)
  const container = cfb.read(buffer, { type: 'buffer' })
  const texts: string[] = []

  // PrvText fallback
  const prvEntry = cfb.find(container, '/PrvText')
  const prvText = prvEntry ? Buffer.from(prvEntry.content).toString('utf16le').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''

  // BodyText/Section0~N
  let idx = 0
  while (true) {
    const entry = cfb.find(container, `/BodyText/Section${idx}`)
    if (!entry) break
    try {
      const inflated = inflateRawSync(Buffer.from(entry.content))
      let pos = 0
      while (pos < inflated.length - 4) {
        const hdr = inflated.readUInt32LE(pos)
        const tagID = hdr & 0x3FF
        let size = (hdr >> 20) & 0xFFF
        let ds = pos + 4
        if (size === 0xFFF) { if (pos + 8 > inflated.length) break; size = inflated.readUInt32LE(pos + 4); ds = pos + 8 }
        if (ds + size > inflated.length) break
        if (tagID === 67 && size > 0) {
          const tb = inflated.slice(ds, ds + size)
          let t = ''
          for (let i = 0; i < tb.length - 1; i += 2) { const c = tb.readUInt16LE(i); if (c===9) t+=' '; else if (c===10||c===13) t+='\n'; else if (c>=32) t+=String.fromCharCode(c) }
          if (t.trim()) texts.push(t.trim())
        }
        pos = ds + size; if (size <= 0) break
      }
    } catch { /* 섹션 해제 실패 */ }
    idx++
  }

  const full = texts.join('\n').replace(/[捤獥汤捯氠瑢湯湷]+/g, '').replace(/\n{3,}/g, '\n\n').trim()
  return full || prvText
}

// ============================================================
// 3. HWPX 텍스트 추출 (한컴 OWPML 구조: ZIP > section*.xml > hp:p)
//    한컴 공식 오픈소스 hwpx-contents-extract 알고리즘 기반
// ============================================================
function extractHwpx(buffer: Buffer): string {
  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()
  const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true })
  const texts: string[] = []

  // Contents/section*.xml 파일에서 본문 추출
  const sectionEntries = entries
    .filter(e => /Contents\/section\d*\.xml$/i.test(e.entryName))
    .sort((a, b) => a.entryName.localeCompare(b.entryName))

  const walkNode = (node: any) => {
    if (!node) return
    if (typeof node === 'string') { if (node.trim()) texts.push(node.trim()); return }
    if (typeof node === 'number') { texts.push(String(node)); return }
    if (node.t !== undefined) {
      const t = typeof node.t === 'string' ? node.t : typeof node.t === 'number' ? String(node.t) : ''
      if (t.trim()) texts.push(t.trim())
      return
    }
    if (Array.isArray(node)) { node.forEach(walkNode); return }
    if (typeof node === 'object') { for (const key of Object.keys(node)) walkNode(node[key]) }
  }

  for (const entry of sectionEntries) {
    const xml = entry.getData().toString('utf-8')
    walkNode(parser.parse(xml))
  }

  return texts.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// ============================================================
// API 라우트
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const name = file.name.toLowerCase()
    console.log('Extract:', file.name, buffer.length, 'bytes')

    // .hwp (레거시 바이너리)
    if (name.endsWith('.hwp') && !name.endsWith('.hwpx')) {
      try {
        const text = extractHwp(buffer)
        console.log('HWP:', text.length, 'chars')
        return NextResponse.json({ success: true, text: text || '', format: 'hwp', warning: text ? undefined : 'HWP에서 텍스트를 추출할 수 없습니다.' })
      } catch (e: any) {
        console.error('HWP error:', e)
        return NextResponse.json({ error: 'HWP 파싱 실패: ' + (e.message || '') }, { status: 400 })
      }
    }

    // .hwpx (OWPML XML 기반)
    if (name.endsWith('.hwpx')) {
      try {
        const text = extractHwpx(buffer)
        console.log('HWPX:', text.length, 'chars')
        return NextResponse.json({ success: true, text: text || '', format: 'hwpx', warning: text ? undefined : 'HWPX에서 텍스트를 추출할 수 없습니다.' })
      } catch (e: any) {
        console.error('HWPX error:', e)
        return NextResponse.json({ error: 'HWPX 파싱 실패: ' + (e.message || '') }, { status: 400 })
      }
    }

    // .pdf
    if (name.endsWith('.pdf')) {
      try {
        const { text, pages } = await extractPdf(new Uint8Array(arrayBuffer))
        console.log('PDF:', pages, 'pages,', text.length, 'chars')
        return NextResponse.json({ success: true, text: text || '', pages, format: 'pdf', warning: text ? undefined : 'PDF에서 텍스트를 추출할 수 없습니다.' })
      } catch (e: any) {
        console.error('PDF error:', e)
        return NextResponse.json({ error: 'PDF 파싱 실패: ' + (e.message || '') }, { status: 400 })
      }
    }

    // .txt, .docx 등
    const text = buffer.toString('utf-8')
    return NextResponse.json({ success: true, text, format: 'text' })
  } catch (e: any) {
    console.error('Extract error:', e)
    return NextResponse.json({ error: e.message || '텍스트 추출 실패' }, { status: 500 })
  }
}
