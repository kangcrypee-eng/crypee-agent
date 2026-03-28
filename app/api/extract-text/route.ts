import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    if (file.name.endsWith('.pdf')) {
      try {
        const pdfParse = require('pdf-parse')
        const data = await pdfParse(buffer)
        return NextResponse.json({ success: true, text: data.text, pages: data.numpages })
      } catch {
        return NextResponse.json({ error: 'PDF 파싱 실패. 다른 형식으로 시도해주세요.' }, { status: 400 })
      }
    }

    // txt, docx 등은 텍스트로
    const text = buffer.toString('utf-8')
    return NextResponse.json({ success: true, text })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '텍스트 추출 실패' }, { status: 500 })
  }
}
