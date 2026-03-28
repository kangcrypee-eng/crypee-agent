import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    if (file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfParse = (await import('pdf-parse')).default
        const data = await pdfParse(buffer)
        const text = (data.text || '').trim()
        if (!text) {
          return NextResponse.json({ success: true, text: '', pages: data.numpages, warning: '텍스트를 추출할 수 없습니다. 스캔 이미지 PDF일 수 있습니다.' })
        }
        return NextResponse.json({ success: true, text, pages: data.numpages })
      } catch (pdfErr: any) {
        console.error('PDF parse error:', pdfErr)
        return NextResponse.json({ error: 'PDF 파싱 실패: ' + (pdfErr.message || '알 수 없는 오류') }, { status: 400 })
      }
    }

    // txt, docx 등은 텍스트로
    const text = buffer.toString('utf-8')
    return NextResponse.json({ success: true, text })
  } catch (e: any) {
    console.error('Extract text error:', e)
    return NextResponse.json({ error: e.message || '텍스트 추출 실패' }, { status: 500 })
  }
}
