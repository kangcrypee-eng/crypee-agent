import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCopywritingPrompt, generateDetailPageHtml, DEFAULT_DESIGNS, PRODUCT_CATEGORIES } from '@/lib/detail-page-prompts'

export const maxDuration = 120

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(request: NextRequest) {
  try {
    const { userId, category, productName, price, features, target, differentiator, referenceDesign, products } = await request.json()

    if (!userId || !productName || !category) {
      return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
    }

    // 카피라이팅 (Claude Sonnet)
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY 미설정' }, { status: 500 })

    const photoAnalyses = (products || []).map((p: any) => ({
      tag: p.tag,
      description: p.analysis?.description || '',
      suggested_section: p.analysis?.suggested_section || 'feature',
    }))

    const copyPrompt = getCopywritingPrompt(
      category,
      referenceDesign,
      photoAnalyses,
      { name: productName, price, features: features || [], target, differentiator }
    )

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        temperature: 0.5,
        system: '당신은 스마트스토어 상세페이지 전문 카피라이터입니다. 반드시 JSON 형식으로 출력하세요.',
        messages: [{ role: 'user', content: copyPrompt }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.json()
      throw new Error((err as any).error?.message || `Claude API ${claudeRes.status}`)
    }

    const claudeData = await claudeRes.json()
    const rawContent = (claudeData.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')

    let copyData: any
    try {
      // JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
      let jsonStr = rawContent
      const codeBlock = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlock) jsonStr = codeBlock[1]
      else {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) jsonStr = jsonMatch[0]
      }
      copyData = JSON.parse(jsonStr.trim())
    } catch (parseErr) {
      console.error('Claude JSON parse error:', parseErr, 'raw:', rawContent.slice(0, 500))
      // Fallback: sections를 수동으로 구성
      copyData = {
        headline: productName,
        subheadline: `${PRODUCT_CATEGORIES.find(c => c.value === category)?.label || ''} 상세페이지`,
        sections: [
          { type: 'hero', title: productName, content: rawContent.slice(0, 2000), image_refs: [1], background: 'white' },
        ]
      }
    }

    // HTML 생성
    const design = referenceDesign?.color_scheme
      ? { bg: referenceDesign.color_scheme.background || '#fff', text: referenceDesign.color_scheme.text_primary || '#333', accent: referenceDesign.color_scheme.accent || '#00B894', tone: referenceDesign.design_tone || 'minimal' }
      : DEFAULT_DESIGNS[category] || DEFAULT_DESIGNS.other

    const photos = (products || []).map((p: any) => ({ cdnUrl: p.cdnUrl, tag: p.tag }))
    const html = generateDetailPageHtml(copyData, photos, design, productName)

    // DB 저장
    const { data: post } = await supabaseAdmin.from('blog_posts').insert({
      user_id: userId,
      business_type: category,
      topic: productName,
      brief_content: `상세페이지 생성 — ${productName}`,
      generated_title: copyData.headline || productName,
      generated_body_html: html,
      generated_hashtags: [],
      status: 'done',
      paid: false,
    }).select('id').single()

    return NextResponse.json({
      postId: post?.id,
      headline: copyData.headline,
      subheadline: copyData.subheadline,
      sectionCount: copyData.sections?.length || 0,
      html,
    })
  } catch (error: any) {
    console.error('Generate detail page error:', error)
    return NextResponse.json({ error: error.message || '생성 실패' }, { status: 500 })
  }
}
