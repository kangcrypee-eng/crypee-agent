import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAutoSystemPrompt, getAutoUserPrompt, getTopicGenerationPrompt } from '@/lib/blog-pro-prompts'

export const maxDuration = 300

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

async function callOpenAI(body: Record<string, unknown>): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY 미설정')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`OpenAI API ${res.status}`)
  return res.json()
}

function convertToHtml(markdown: string, photos: { cdnUrl: string; category?: string }[]): string {
  let html = markdown
    .replace(/^## (.+)$/gm, '<h2 style="font-size:20px;font-weight:700;margin:28px 0 12px;color:#333">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .split('\n\n')
    .map(p => {
      p = p.trim()
      if (!p || p.startsWith('<h2')) return p
      return `<p style="font-size:16px;line-height:1.8;color:#333;margin:0 0 16px">${p.replace(/\n/g, '<br>')}</p>`
    })
    .join('\n')

  html = html.replace(/\[IMAGE:(\d+)\]/g, (_, num) => {
    const idx = parseInt(num) - 1
    if (photos[idx]) {
      return `<div style="text-align:center;margin:20px 0"><img src="${photos[idx].cdnUrl}" alt="블로그 이미지" style="max-width:100%;width:860px;border-radius:4px" loading="lazy"></div>`
    }
    return ''
  })
  return html
}

export async function POST(request: NextRequest) {
  try {
    const { userId, businessType, shopName, shopPhone, shopAddress, shopLink, tone, email, postCount, photosPerPost, uploadedByCategory } = await request.json()

    if (!userId || !businessType || !shopName || !email || !postCount) {
      return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
    }

    // 카테고리별 사진 풀 구성
    const photoPool: { cdnUrl: string; category: string }[] = []
    for (const [cat, photos] of Object.entries(uploadedByCategory || {})) {
      for (const p of photos as any[]) {
        photoPool.push({ cdnUrl: p.cdnUrl, category: cat })
      }
    }

    const generatedTitles: string[] = []
    const generatedPosts: { id: string; title: string; bodyHtml: string; hashtags: string[] }[] = []
    let photoIndex = 0

    for (let i = 0; i < postCount; i++) {
      try {
        // 이 글에 사용할 사진 배정 (순환)
        const postPhotos: { cdnUrl: string; category: string }[] = []
        for (let j = 0; j < photosPerPost; j++) {
          if (photoPool.length > 0) {
            postPhotos.push(photoPool[photoIndex % photoPool.length])
            photoIndex++
          }
        }

        const photoDescs = postPhotos.map((p, idx) => `사진 ${idx + 1}: ${p.category} 카테고리 이미지`)

        // 주제 생성
        const topicData = await callOpenAI({
          model: 'gpt-4o-mini', max_tokens: 200, temperature: 0.9,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: getTopicGenerationPrompt(businessType, generatedTitles) }],
        })
        let topicParsed = { topic: '', keyword: '', angle: '' }
        try { topicParsed = JSON.parse(topicData.choices?.[0]?.message?.content || '{}') } catch {}

        // 글 생성
        const genData = await callOpenAI({
          model: 'gpt-4o-mini', max_tokens: 4096, temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: getAutoSystemPrompt(businessType, tone || 'friendly') },
            { role: 'user', content: getAutoUserPrompt(businessType, shopName, topicParsed.keyword, photoDescs, generatedTitles.slice(-10), { phone: shopPhone, address: shopAddress, link: shopLink }) },
          ],
        })

        let parsed = { title: '', body: '', hashtags: [] as string[] }
        try { parsed = JSON.parse(genData.choices?.[0]?.message?.content || '{}') } catch {}

        const bodyHtml = convertToHtml(parsed.body || '', postPhotos)
        const title = parsed.title || topicParsed.topic || `블로그 글 ${i + 1}`

        // DB 저장
        const { data: post } = await supabaseAdmin.from('blog_posts').insert({
          user_id: userId,
          business_type: businessType,
          topic: topicParsed.topic,
          brief_content: `일괄 생성 ${i + 1}/${postCount}`,
          generated_title: title,
          generated_body_html: bodyHtml,
          generated_hashtags: parsed.hashtags || [],
          status: 'done',
          paid: true,
        }).select('id').single()

        generatedTitles.push(title)
        if (post) {
          generatedPosts.push({ id: post.id, title, bodyHtml, hashtags: parsed.hashtags || [] })
        }
      } catch (e) {
        console.error(`Bulk generate error ${i + 1}:`, e)
      }
    }

    // 이메일 발송 (1통에 전부)
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && generatedPosts.length > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.crypee.biz'

      const postsHtml = generatedPosts.map((p, i) => `
        <div style="margin-bottom:40px;padding-bottom:40px;border-bottom:2px solid #eee">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
            <span style="background:#00B894;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700">${i + 1}편</span>
            <a href="${appUrl}/blog/preview/${p.id}" style="font-size:12px;color:#00B894;text-decoration:none">복사 페이지 →</a>
          </div>
          <h2 style="font-size:20px;font-weight:700;color:#333;margin-bottom:16px">${p.title}</h2>
          ${p.bodyHtml}
          <div style="margin-top:16px;padding-top:12px;border-top:1px solid #eee">
            ${(p.hashtags || []).map(t => `<span style="display:inline-block;margin:2px 4px;padding:4px 10px;background:#f0f7ff;color:#2b7de9;border-radius:20px;font-size:12px">#${t}</span>`).join('')}
          </div>
        </div>
      `).join('')

      const emailBody = `
        <div style="max-width:680px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans KR',sans-serif">
          <div style="background:#00B894;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
            <h1 style="margin:0;font-size:18px">BlogPilot — ${shopName} 블로그 ${generatedPosts.length}편</h1>
            <p style="margin:6px 0 0;font-size:13px;opacity:0.8">각 글의 "복사 페이지"에서 글+이미지를 한번에 복사할 수 있어요</p>
          </div>
          <div style="padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px">
            ${postsHtml}
            <div style="padding:16px;background:#f8f8f8;border-radius:8px;font-size:13px;color:#666;text-align:center">
              각 글의 <strong>[복사 페이지]</strong> 링크를 클릭하면<br>글+이미지를 한번에 복사할 수 있어요!
            </div>
          </div>
        </div>`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'BlogPilot <noreply@crypee.com>',
          to: [email],
          subject: `[BlogPilot] ${shopName} 블로그 ${generatedPosts.length}편이 준비됐어요!`,
          html: emailBody,
        }),
      })
    }

    return NextResponse.json({
      generated: generatedPosts.length,
      postIds: generatedPosts.map(p => p.id),
    })
  } catch (error: any) {
    console.error('Bulk generate error:', error)
    return NextResponse.json({ error: error.message || '일괄 생성 실패' }, { status: 500 })
  }
}
