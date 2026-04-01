import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAutoSystemPrompt, getAutoUserPrompt, getTopicGenerationPrompt } from '@/lib/blog-pro-prompts'

export const maxDuration = 120

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

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, businessType, shopName, tone, shopPhone, shopAddress, shopLink } = await request.json()

    // 사진 풀에서 랜덤으로 9장 (3편 x 3장)
    const { data: photos } = await supabaseAdmin
      .from('blogpilot_photos')
      .select('id, cdn_url, vision_description, category')
      .eq('subscription_id', subscriptionId)
      .eq('is_available', true)
      .limit(9)

    const photoPool = photos || []
    const posts = []

    for (let i = 0; i < 3; i++) {
      // 각 편에 사진 3장 배정
      const postPhotos = photoPool.slice(i * 3, (i + 1) * 3)
      const photoDescs = postPhotos.map(p => p.vision_description || '사진').filter(Boolean)

      // 주제 생성
      const topicData = await callOpenAI({
        model: 'gpt-4o-mini',
        max_tokens: 200,
        temperature: 0.9,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: getTopicGenerationPrompt(businessType, posts.map(p => p.title)) }],
      })
      let topicParsed = { topic: '', keyword: '', angle: '' }
      try { topicParsed = JSON.parse(topicData.choices?.[0]?.message?.content || '{}') } catch {}

      // 글 생성
      const genData = await callOpenAI({
        model: 'gpt-4o-mini',
        max_tokens: 4096,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: getAutoSystemPrompt(businessType, tone || 'friendly') },
          { role: 'user', content: getAutoUserPrompt(businessType, shopName, topicParsed.keyword, photoDescs, posts.map(p => p.angle), { phone: shopPhone, address: shopAddress, link: shopLink }) },
        ],
      })

      let parsed = { title: '', body: '', hashtags: [] as string[] }
      try { parsed = JSON.parse(genData.choices?.[0]?.message?.content || '{}') } catch {}

      // 간단한 HTML 변환
      let bodyHtml = (parsed.body || '')
        .replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:700;margin:20px 0 8px;color:#333">$1</h2>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .split('\n\n').map((p: string) => {
          p = p.trim()
          if (!p || p.startsWith('<h2')) return p
          return `<p style="font-size:15px;line-height:1.8;color:#333;margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`
        }).join('\n')

      // 이미지 플레이스홀더 → 실제 사진
      bodyHtml = bodyHtml.replace(/\[IMAGE:(\d+)\]/g, (_: string, num: string) => {
        const idx = parseInt(num) - 1
        if (postPhotos[idx]) {
          return `<div style="text-align:center;margin:16px 0"><img src="${postPhotos[idx].cdn_url}" style="max-width:100%;width:100%;border-radius:4px" /></div>`
        }
        return ''
      })

      // 사진에 사용된 카테고리 수집
      const usedCategories = Array.from(new Set(postPhotos.map(p => p.category)))

      posts.push({
        title: parsed.title || topicParsed.topic,
        bodyHtml,
        hashtags: (parsed.hashtags || []).slice(0, 8),
        photoUrls: postPhotos.map(p => p.cdn_url),
        categories: usedCategories,
        angle: topicParsed.angle,
      })
    }

    return NextResponse.json({ posts })
  } catch (error: any) {
    console.error('Preview posts error:', error)
    return NextResponse.json({ error: error.message || '미리보기 생성 실패' }, { status: 500 })
  }
}
