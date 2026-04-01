import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getClassificationPrompt } from '@/lib/blog-pro-prompts'

export const maxDuration = 120

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

async function classifyPhoto(imageUrl: string, businessType: string): Promise<{ category: string; description: string; person_hint: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { category: 'unclassified', description: '', person_hint: '' }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 150,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: getClassificationPrompt(businessType) },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      }],
    }),
  })
  if (!res.ok) return { category: 'unclassified', description: '', person_hint: '' }
  const data = await res.json()
  try {
    return JSON.parse(data.choices?.[0]?.message?.content || '{}')
  } catch {
    return { category: 'unclassified', description: '', person_hint: '' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { photoIds, businessType } = await request.json()
    if (!photoIds?.length || !businessType) {
      return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
    }

    // 사진 URL 조회
    const { data: photos } = await supabaseAdmin
      .from('blogpilot_photos')
      .select('id, cdn_url')
      .in('id', photoIds)

    if (!photos?.length) return NextResponse.json({ error: '사진을 찾을 수 없습니다' }, { status: 404 })

    // 5개씩 배치 분류
    const results: { id: string; category: string; description: string; person_hint: string; cdn_url: string }[] = []
    for (let i = 0; i < photos.length; i += 5) {
      const batch = photos.slice(i, i + 5)
      const batchResults = await Promise.all(
        batch.map(async (p) => {
          const r = await classifyPhoto(p.cdn_url, businessType)
          await supabaseAdmin.from('blogpilot_photos').update({
            category: r.category || 'unclassified',
            vision_description: r.person_hint ? `[${r.person_hint}] ${r.description}` : r.description,
          }).eq('id', p.id)
          return { id: p.id, cdn_url: p.cdn_url, category: r.category, description: r.description, person_hint: r.person_hint || '' }
        })
      )
      results.push(...batchResults)
    }

    // 카테고리별 집계
    const summary: Record<string, number> = {}
    for (const r of results) {
      summary[r.category] = (summary[r.category] || 0) + 1
    }

    return NextResponse.json({ classified: results.length, results, summary })
  } catch (error: any) {
    console.error('Classify error:', error)
    return NextResponse.json({ error: error.message || '분류 실패' }, { status: 500 })
  }
}
