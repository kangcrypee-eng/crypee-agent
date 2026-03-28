import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { markdown, title } = await request.json()
    if (!markdown) return NextResponse.json({ error: '내용이 없습니다' }, { status: 400 })

    const { convertMarkdownToHwp } = await import('md2hwp')
    const buffer = await convertMarkdownToHwp(markdown, {
      title: title || '사업계획서',
      author: 'crypee Agent',
    })

    const fileName = encodeURIComponent(title || '사업계획서') + '.hwpx'
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (e: any) {
    console.error('HWPX generation error:', e)
    return NextResponse.json({ error: e.message || 'HWPX 생성 실패' }, { status: 500 })
  }
}
