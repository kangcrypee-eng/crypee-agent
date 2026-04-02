import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, title, html, hashtags } = await request.json()

    if (!email || !html) {
      return NextResponse.json({ error: '이메일과 내용이 필요합니다' }, { status: 400 })
    }

    const hashtagsHtml = hashtags?.length
      ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee">${hashtags.map((t: string) => `<span style="display:inline-block;margin:2px 4px;padding:4px 10px;background:#f0f7ff;color:#2b7de9;border-radius:20px;font-size:12px">#${t}</span>`).join('')}</div>`
      : ''

    const emailBody = `
      <div style="max-width:680px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans KR',sans-serif">
        <div style="background:#00B894;color:#fff;padding:16px 24px;border-radius:12px 12px 0 0">
          <h2 style="margin:0;font-size:16px">BlogPilot — 블로그 글이 준비됐어요!</h2>
        </div>
        <div style="padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px">
          <h1 style="font-size:22px;font-weight:700;color:#333;margin-bottom:20px">${title}</h1>
          ${html}
          ${hashtagsHtml}
          <div style="margin-top:32px;padding:16px;background:#f8f8f8;border-radius:8px;font-size:13px;color:#666">
            <strong>네이버 블로그에 올리는 법:</strong><br>
            1. 위 내용을 복사 (Ctrl+A → Ctrl+C)<br>
            2. 네이버 블로그 → 글쓰기<br>
            3. 에디터에 붙여넣기 (Ctrl+V) → 발행
          </div>
        </div>
      </div>
    `

    // Resend 또는 fallback SMTP
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'BlogPilot <noreply@crypee.biz>',
          to: [email],
          subject: `[BlogPilot] ${title}`,
          html: emailBody,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error((err as any).message || '이메일 전송 실패')
      }
    } else {
      console.log('[BlogPilot] RESEND_API_KEY 미설정 — 이메일 전송 스킵')
      return NextResponse.json({ success: true, simulated: true })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Email send error:', error)
    return NextResponse.json({ error: error.message || '이메일 전송 실패' }, { status: 500 })
  }
}
