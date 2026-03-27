import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const message = searchParams.get('message') || searchParams.get('code') || '결제에 실패했습니다'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.crypee.biz'
  return NextResponse.redirect(`${appUrl}/credits/fail?message=${encodeURIComponent(message)}`)
}
