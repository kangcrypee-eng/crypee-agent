import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-auth'

export const runtime = 'edge'

const ALLOWED_HOSTS = [
  'supabase.co',
  'supabase.in',
  'githubusercontent.com',
  'storage.googleapis.com',
]

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request)
  if ('error' in auth) return auth.error

  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url 파라미터 필요' }, { status: 400 })

  try {
    const parsed = new URL(url)
    const isAllowed = ALLOWED_HOSTS.some(h => parsed.hostname.endsWith(h))
    if (!isAllowed) return NextResponse.json({ error: '허용되지 않는 URL' }, { status: 403 })
  } catch {
    return NextResponse.json({ error: '잘못된 URL' }, { status: 400 })
  }

  try {
    const res = await fetch(url)
    if (!res.ok) return NextResponse.json({ error: `파일 다운로드 실패: ${res.status}` }, { status: 502 })

    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '다운로드 실패'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
