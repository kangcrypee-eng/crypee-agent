import { NextRequest, NextResponse } from 'next/server'
import { getDocumentProxy } from 'unpdf'

export const maxDuration = 30

// PDF 텍스트 추출
async function extractPdfText(data: Uint8Array): Promise<{ text: string; pages: number }> {
  const doc = await getDocumentProxy(data, {
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/cmaps/',
    cMapPacked: true,
    useSystemFonts: true,
  })
  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .filter((item: any) => item.str !== undefined)
      .map((item: any) => item.str)
      .join(' ')
    if (pageText.trim()) pages.push(pageText.trim())
  }
  return { text: pages.join('\n\n'), pages: doc.numPages }
}

// HWP 텍스트 추출 (hwp.js)
function extractHwpText(buffer: Buffer): string {
  const { parse } = require('hwp.js')
  const parsed = parse(buffer)
  const texts: string[] = []

  function walk(obj: any) {
    if (!obj) return
    if (typeof obj === 'string') { texts.push(obj); return }
    if (typeof obj.content === 'string') { texts.push(obj.content); return }
    if (Array.isArray(obj.content)) { obj.content.forEach(walk); return }
    if (Array.isArray(obj)) { obj.forEach(walk); return }
    // sections, paragraphs 등 순회
    if (obj.sections) obj.sections.forEach(walk)
    if (obj.content) walk(obj.content)
  }

  if (parsed.sections) {
    for (const section of parsed.sections) {
      if (section.content) {
        for (const paragraph of section.content) {
          walk(paragraph)
          texts.push('\n')
        }
      }
    }
  }

  return texts.join('').replace(/\n{3,}/g, '\n\n').trim()
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileName = file.name.toLowerCase()
    console.log('Extract text:', file.name, buffer.length, 'bytes')

    // HWP 파일
    if (fileName.endsWith('.hwp')) {
      try {
        const text = extractHwpText(buffer)
        console.log('HWP parsed:', text.length, 'chars')
        if (!text) {
          return NextResponse.json({ success: true, text: '', warning: 'HWP에서 텍스트를 추출할 수 없습니다.' })
        }
        return NextResponse.json({ success: true, text })
      } catch (hwpErr: any) {
        console.error('HWP parse error:', hwpErr)
        return NextResponse.json({ error: 'HWP 파싱 실패: ' + (hwpErr.message || '알 수 없는 오류') }, { status: 400 })
      }
    }

    // PDF 파일
    if (fileName.endsWith('.pdf')) {
      try {
        const { text, pages } = await extractPdfText(new Uint8Array(arrayBuffer))
        console.log('PDF parsed:', pages, 'pages,', text.length, 'chars')
        if (!text) {
          return NextResponse.json({ success: true, text: '', pages, warning: '텍스트를 추출할 수 없습니다.' })
        }
        return NextResponse.json({ success: true, text, pages })
      } catch (pdfErr: any) {
        console.error('PDF parse error:', pdfErr)
        return NextResponse.json({ error: 'PDF 파싱 실패: ' + (pdfErr.message || '알 수 없는 오류') }, { status: 400 })
      }
    }

    // TXT 등
    const text = buffer.toString('utf-8')
    return NextResponse.json({ success: true, text })
  } catch (e: any) {
    console.error('Extract text error:', e)
    return NextResponse.json({ error: e.message || '텍스트 추출 실패' }, { status: 500 })
  }
}
