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
  const parsed = parse(buffer, { type: 'buffer' })
  const texts: string[] = []

  // content items에서 type:0 텍스트 추출
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

  // 문단 순회 (테이블 셀 내부 포함)
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
