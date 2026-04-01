import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPhotoSuggestionPrompt } from '@/lib/blog-pro-prompts'
import { getCategoryValues } from '@/lib/blog-pro-categories'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// 주제 목록 조회
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')
  const subscriptionId = request.nextUrl.searchParams.get('subscriptionId')
  if (!userId || !subscriptionId) return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })

  const { data: topics } = await supabaseAdmin
    .from('blogpilot_scheduled_posts')
    .select('id, scheduled_date, topic, trend_keyword, angle, status')
    .eq('subscription_id', subscriptionId)
    .in('status', ['planned', 'pending'])
    .order('scheduled_date', { ascending: true })
    .limit(20)

  return NextResponse.json({ topics: topics || [] })
}

// 주제 추가
export async function POST(request: NextRequest) {
  try {
    const { userId, subscriptionId, topic, scheduledDate, businessType } = await request.json()
    if (!userId || !subscriptionId || !topic) {
      return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
    }

    // 주제 저장 (status = 'planned')
    const { data: post, error } = await supabaseAdmin
      .from('blogpilot_scheduled_posts')
      .insert({
        user_id: userId,
        subscription_id: subscriptionId,
        scheduled_date: scheduledDate || null,
        topic,
        status: 'planned',
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // GPT로 필요한 사진 카테고리 추천
    let photoSuggestion = { needed_categories: [] as string[], photo_tip: '' }
    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey && businessType) {
      try {
        const catValues = getCategoryValues(businessType)
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 200,
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: getPhotoSuggestionPrompt(businessType, topic, catValues) }],
          }),
        })
        if (res.ok) {
          const data = await res.json()
          try { photoSuggestion = JSON.parse(data.choices?.[0]?.message?.content || '{}') } catch {}
        }
      } catch {}
    }

    return NextResponse.json({
      topicId: post?.id,
      neededCategories: photoSuggestion.needed_categories || [],
      photoTip: photoSuggestion.photo_tip || '',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 주제 삭제
export async function DELETE(request: NextRequest) {
  const topicId = request.nextUrl.searchParams.get('id')
  if (!topicId) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  await supabaseAdmin
    .from('blogpilot_scheduled_posts')
    .delete()
    .eq('id', topicId)
    .in('status', ['planned', 'pending'])

  return NextResponse.json({ success: true })
}
