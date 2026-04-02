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

    if (!userId || !businessType || !shopName || !postCount) {
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

    return NextResponse.json({
      generated: generatedPosts.length,
      postIds: generatedPosts.map(p => p.id),
    })
  } catch (error: any) {
    console.error('Bulk generate error:', error)
    return NextResponse.json({ error: error.message || '일괄 생성 실패' }, { status: 500 })
  }
}
