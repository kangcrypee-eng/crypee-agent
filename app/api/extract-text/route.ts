import { NextRequest, NextResponse } from 'next/server'
import { getDocumentProxy } from 'unpdf'

export const maxDuration = 30

async function extractPdfText(data: Uint8Array): Promise<{ text: string; pages: number }> {
  // unpdf의 getDocumentProxy로 직접 접근 — CMap 옵션 포함
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    console.log('Extract text:', file.name, Buffer.from(arrayBuffer).length, 'bytes')

    if (file.name.toLowerCase().endsWith('.pdf')) {
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

    const text = Buffer.from(arrayBuffer).toString('utf-8')
    return NextResponse.json({ success: true, text })
  } catch (e: any) {
    console.error('Extract text error:', e)
    return NextResponse.json({ error: e.message || '텍스트 추출 실패' }, { status: 500 })
  }
}
