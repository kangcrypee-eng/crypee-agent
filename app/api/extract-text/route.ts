import { NextRequest, NextResponse } from 'next/server'
import { getDocumentProxy } from 'unpdf'
import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'

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
// 2. HWP 텍스트 추출 (hwp.js — 레거시 바이너리 .hwp)
// ============================================================
function extractHwp(buffer: Buffer): string {
  const { parse } = require('hwp.js')
  const parsed = parse(buffer, { type: 'buffer' })
  const texts: string[] = []

  function extractFromItems(items: any[]) {
    if (!items || !Array.isArray(items)) return
    let line = ''
    for (const item of items) {
      if (item.type === 0) {
        if (typeof item.value === 'string') line += item.value
        else if (typeof item.value === 'number') line += String.fromCharCode(item.value)
      }
    }
    if (line.trim()) texts.push(line.trim())
  }

  function walkParagraph(para: any) {
    if (!para) return
    if (Array.isArray(para.content)) extractFromItems(para.content)
    if (para.controls) {
      for (const ctrl of para.controls) {
        if (ctrl.content && Array.isArray(ctrl.content)) {
          for (const row of ctrl.content) {
            if (Array.isArray(row)) {
              for (const cell of row) {
                if (cell.items) cell.items.forEach(walkParagraph)
              }
            }
          }
        }
      }
    }
  }

  if (parsed.sections) {
    for (const section of parsed.sections) {
      if (section.content) section.content.forEach(walkParagraph)
    }
  }
  return texts.join('\n').replace(/\n{3,}/g, '\n\n').trim()
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
