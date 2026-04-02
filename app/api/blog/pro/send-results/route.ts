import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(request: NextRequest) {
  try {
    const { email, postIds } = await request.json()
    if (!email || !postIds?.length) {
      return NextResponse.json({ error: '이메일과 글 ID가 필요합니다' }, { status: 400 })
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY 미설정' }, { status: 500 })
    }

    // 글 조회
    const { data: posts } = await supabaseAdmin
      .from('blog_posts')
      .select('id, generated_title, generated_body_html, generated_hashtags')
      .in('id', postIds)
      .order('created_at', { ascending: true })

    if (!posts?.length) {
      return NextResponse.json({ error: '글을 찾을 수 없습니다' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.crypee.biz'

    const postsHtml = posts.map((p, i) => `
      <div style="margin-bottom:40px;padding-bottom:40px;border-bottom:2px solid #eee">
        <div style="display:inline-block;background:#00B894;color:#fff;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:16px">${i + 1}편</div>
        <h2 style="font-size:20px;font-weight:700;color:#333;margin-bottom:16px">${p.generated_title}</h2>
        ${p.generated_body_html}
        ${p.generated_hashtags?.length ? `<div style="margin-top:16px;padding-top:12px;border-top:1px solid #eee">${p.generated_hashtags.map((t: string) => `<span style="display:inline-block;margin:2px 4px;padding:4px 10px;background:#f0f7ff;color:#2b7de9;border-radius:20px;font-size:12px">#${t}</span>`).join('')}</div>` : ''}
        <div style="margin-top:12px"><a href="${appUrl}/blog/preview/${p.id}" style="color:#00B894;font-size:13px;text-decoration:none;font-weight:600">복사 페이지에서 글+이미지 복사하기 →</a></div>
      </div>
    `).join('')

    const emailBody = `
      <div style="max-width:680px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans KR',sans-serif">
        <div style="background:#00B894;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;font-size:18px">BlogPilot — 블로그 ${posts.length}편</h1>
          <p style="margin:6px 0 0;font-size:13px;opacity:0.8">각 글의 "복사 페이지"에서 글+이미지를 한번에 복사할 수 있어요</p>
        </div>
        <div style="padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px">
          ${postsHtml}
        </div>
      </div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: 'BlogPilot <noreply@crypee.biz>',
        to: [email],
        subject: `[BlogPilot] 블로그 ${posts.length}편이 준비됐어요!`,
        html: emailBody,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: (err as any).message || '이메일 발송 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true, sent: posts.length })
  } catch (error: any) {
    console.error('Send results error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
