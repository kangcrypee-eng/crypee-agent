import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET() {
  try {
    const todayStr = new Date().toISOString().split('T')[0]

    // 발송 대기 글 조회
    const { data: posts } = await supabaseAdmin
      .from('blogpilot_scheduled_posts')
      .select('*, blogpilot_subscriptions!inner(delivery_method, delivery_email, shop_name)')
      .eq('status', 'done')
      .eq('delivery_status', 'pending')
      .lte('scheduled_date', todayStr)
      .limit(20)

    if (!posts?.length) return NextResponse.json({ message: '발송할 글 없음', delivered: 0 })

    const resendKey = process.env.RESEND_API_KEY
    let delivered = 0

    for (const post of posts) {
      try {
        const sub = (post as any).blogpilot_subscriptions
        if (sub.delivery_method !== 'email' || !sub.delivery_email) continue

        const hashtagsHtml = post.generated_hashtags?.length
          ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee">${post.generated_hashtags.map((t: string) => `<span style="display:inline-block;margin:2px 4px;padding:4px 10px;background:#f0f7ff;color:#2b7de9;border-radius:20px;font-size:12px">#${t}</span>`).join('')}</div>`
          : ''

        const emailBody = `
          <div style="max-width:680px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans KR',sans-serif">
            <div style="background:#00B894;color:#fff;padding:16px 24px;border-radius:12px 12px 0 0">
              <h2 style="margin:0;font-size:16px">BlogPilot Pro — 오늘의 블로그 글</h2>
              <p style="margin:4px 0 0;font-size:12px;opacity:0.8">${sub.shop_name}</p>
            </div>
            <div style="padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px">
              <h1 style="font-size:22px;font-weight:700;color:#333;margin-bottom:20px">${post.generated_title}</h1>
              ${post.generated_body_html}
              ${hashtagsHtml}
              <div style="margin-top:32px;padding:16px;background:#f8f8f8;border-radius:8px;font-size:13px;color:#666">
                <strong>티스토리에 올리는 법:</strong><br>
                1. 위 내용을 복사 (Ctrl+A → Ctrl+C)<br>
                2. 티스토리 → 글쓰기 → 붙여넣기 (Ctrl+V) → 발행
              </div>
            </div>
          </div>`

        if (resendKey) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: 'BlogPilot <noreply@crypee.com>',
              to: [sub.delivery_email],
              subject: `[BlogPilot] ${post.generated_title}`,
              html: emailBody,
            }),
          })
        }

        await supabaseAdmin.from('blogpilot_scheduled_posts').update({
          delivery_status: 'sent',
          delivered_at: new Date().toISOString(),
        }).eq('id', post.id)

        delivered++
      } catch (e) {
        console.error(`Deliver error for post ${post.id}:`, e)
        await supabaseAdmin.from('blogpilot_scheduled_posts').update({
          delivery_status: 'failed',
        }).eq('id', post.id)
      }
    }

    return NextResponse.json({ message: `${delivered}편 발송 완료`, delivered })
  } catch (error: any) {
    console.error('Deliver error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
