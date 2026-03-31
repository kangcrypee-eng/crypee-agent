import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSystemPrompt, getUserPrompt, getVisionPrompt } from '@/lib/blog-prompts'

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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error?.message || `OpenAI API ${res.status}`)
  }
  return res.json()
}

// GPT-4o Vision으로 사진 분석
async function analyzePhoto(imageUrl: string): Promise<string> {
  const data = await callOpenAI({
    model: 'gpt-4o',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: getVisionPrompt() },
        { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
      ],
    }],
  })
  return data.choices?.[0]?.message?.content || ''
}

export async function POST(request: NextRequest) {
  try {
    const { userId, businessType, topic, briefContent, photos, tone, shopName, shopPhone, shopAddress, shopLink } = await request.json()
    // photos: [{ cdnUrl, displayOrder, originalFilename }]

    if (!userId || !businessType || !topic || !briefContent) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 })
    }

    // blog_posts 레코드 생성
    const { data: post, error: postError } = await supabaseAdmin
      .from('blog_posts')
      .insert({
        user_id: userId,
        business_type: businessType,
        topic,
        brief_content: briefContent,
        status: 'generating',
      })
      .select('id')
      .single()

    if (postError || !post) {
      console.error('blog_posts insert error:', JSON.stringify(postError))
      return NextResponse.json({ error: `글 생성 시작 실패: ${postError?.message || 'unknown'}` }, { status: 500 })
    }

    const postId = post.id

    // 4. 사진 분석 (병렬) + DB 저장
    const photoDescriptions: string[] = []
    if (photos && photos.length > 0) {
      const visionResults = await Promise.all(
        photos.map(async (p: any, i: number) => {
          try {
            const desc = await analyzePhoto(p.cdnUrl)
            return { ...p, description: desc, order: i }
          } catch (e) {
            console.error(`Vision error for photo ${i}:`, e)
            return { ...p, description: '', order: i }
          }
        })
      )

      for (const r of visionResults) {
        photoDescriptions.push(r.description)
        await supabaseAdmin.from('blog_photos').insert({
          post_id: postId,
          user_id: userId,
          cdn_url: r.cdnUrl,
          original_filename: r.originalFilename || '',
          alt_text: r.description.slice(0, 100),
          vision_description: r.description,
          display_order: r.order,
        })
      }
    }

    // 5. GPT-4o mini로 글 생성
    const systemPrompt = getSystemPrompt(businessType, tone || 'friendly')
    const userPrompt = getUserPrompt(businessType, topic, briefContent, photoDescriptions, shopName, { phone: shopPhone, address: shopAddress, link: shopLink })

    const genData = await callOpenAI({
      model: 'gpt-4o-mini',
      max_tokens: 4096,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const rawContent = genData.choices?.[0]?.message?.content || '{}'
    let parsed: { title?: string; body?: string; hashtags?: string[] }
    try {
      parsed = JSON.parse(rawContent)
    } catch {
      parsed = { title: topic, body: rawContent, hashtags: [] }
    }

    // 6. 마크다운 → HTML 변환 + 이미지 삽입
    const bodyHtml = convertToHtml(parsed.body || '', photos || [])

    // 7. DB 업데이트
    await supabaseAdmin
      .from('blog_posts')
      .update({
        generated_title: parsed.title || topic,
        generated_body_html: bodyHtml,
        generated_hashtags: parsed.hashtags || [],
        status: 'done',
      })
      .eq('id', postId)

    return NextResponse.json({
      postId,
      title: parsed.title || topic,
      hashtags: parsed.hashtags || [],
    })
  } catch (error: any) {
    console.error('Blog generate error:', error)
    return NextResponse.json({ error: error.message || '블로그 글 생성 중 오류' }, { status: 500 })
  }
}

// 마크다운 → 네이버 호환 HTML + 이미지 삽입
function convertToHtml(markdown: string, photos: { cdnUrl: string }[]): string {
  let html = markdown
    // ## 소제목 → h2
    .replace(/^## (.+)$/gm, '<h2 style="font-size:20px;font-weight:700;margin:28px 0 12px;color:#333">$1</h2>')
    // **볼드** → strong
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 빈 줄 → 문단 구분
    .split('\n\n')
    .map(p => {
      p = p.trim()
      if (!p || p.startsWith('<h2')) return p
      return `<p style="font-size:16px;line-height:1.8;color:#333;margin:0 0 16px">${p.replace(/\n/g, '<br>')}</p>`
    })
    .join('\n')

  // [IMAGE:N] 플레이스홀더 → <img> 태그
  html = html.replace(/\[IMAGE:(\d+)\]/g, (_, num) => {
    const idx = parseInt(num) - 1
    if (photos[idx]) {
      return `<div style="text-align:center;margin:20px 0"><img src="${photos[idx].cdnUrl}" alt="블로그 이미지" style="max-width:100%;width:860px;border-radius:4px" loading="lazy"></div>`
    }
    return ''
  })

  return html
}
