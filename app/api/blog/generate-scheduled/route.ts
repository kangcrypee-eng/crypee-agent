import { NextResponse } from 'next/server'
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

function convertToHtml(markdown: string, photos: { cdn_url: string }[]): string {
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
      return `<div style="text-align:center;margin:20px 0"><img src="${photos[idx].cdn_url}" alt="블로그 이미지" style="max-width:100%;width:860px;border-radius:4px" loading="lazy"></div>`
    }
    return ''
  })

  return html
}

export async function GET() {
  try {
    const today = new Date()
    const dayOfWeek = today.getDay() || 7 // 1=Mon..7=Sun

    // 활성 구독 조회
    const { data: subs } = await supabaseAdmin
      .from('blogpilot_subscriptions')
      .select('*')
      .eq('is_active', true)
      .eq('billing_status', 'active')
      .contains('schedule_days', [dayOfWeek])
      .limit(10)

    if (!subs?.length) return NextResponse.json({ message: '오늘 발행할 구독 없음', generated: 0 })

    const todayStr = today.toISOString().split('T')[0]
    let generated = 0

    for (const sub of subs) {
      try {
        // 이미 오늘 글이 있는지 체크
        const { count } = await supabaseAdmin
          .from('blogpilot_scheduled_posts')
          .select('id', { count: 'exact', head: true })
          .eq('subscription_id', sub.id)
          .eq('scheduled_date', todayStr)

        if ((count || 0) > 0) continue

        // 미리 설정된 주제가 있는지 확인 (planned 상태, 오늘 또는 날짜 미지정)
        const { data: plannedTopics } = await supabaseAdmin
          .from('blogpilot_scheduled_posts')
          .select('id, topic')
          .eq('subscription_id', sub.id)
          .eq('status', 'planned')
          .or(`scheduled_date.eq.${todayStr},scheduled_date.is.null`)
          .order('created_at', { ascending: true })
          .limit(1)

        const plannedTopic = plannedTopics?.[0] || null

        // 최근 앵글/제목 조회 (중복 방지)
        const { data: recentLogs } = await supabaseAdmin
          .from('blogpilot_generation_log')
          .select('title, angle')
          .eq('user_id', sub.user_id)
          .order('created_at', { ascending: false })
          .limit(20)

        const recentAngles = (recentLogs || []).map(l => l.angle || l.title).filter(Boolean)
        const recentTitles = (recentLogs || []).map(l => l.title).filter(Boolean)

        let topicParsed = { topic: '', keyword: '', angle: '' }

        if (plannedTopic) {
          // 미리 설정된 주제 사용
          topicParsed = { topic: plannedTopic.topic, keyword: plannedTopic.topic, angle: plannedTopic.topic }
          // planned → generating 상태로 변경
          await supabaseAdmin.from('blogpilot_scheduled_posts').update({ status: 'generating', scheduled_date: todayStr }).eq('id', plannedTopic.id)
        } else {
          // AI 자동 주제 생성
          const topicData = await callOpenAI({
            model: 'gpt-4o-mini', max_tokens: 200, temperature: 0.9,
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: getTopicGenerationPrompt(sub.business_type, recentTitles) }],
          })
          try { topicParsed = JSON.parse(topicData.choices?.[0]?.message?.content || '{}') } catch {}
        }

        // 사용 가능한 사진 선택 (30일 이상 미사용)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: availablePhotos } = await supabaseAdmin
          .from('blogpilot_photos')
          .select('id, cdn_url, vision_description')
          .eq('subscription_id', sub.id)
          .eq('is_available', true)
          .or(`last_used_at.is.null,last_used_at.lt.${thirtyDaysAgo.toISOString()}`)
          .limit(5)

        const postPhotos = availablePhotos || []
        const photoDescs = postPhotos.map(p => p.vision_description || '').filter(Boolean)

        // 글 생성
        const genData = await callOpenAI({
          model: 'gpt-4o-mini', max_tokens: 4096, temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: getAutoSystemPrompt(sub.business_type, sub.tone || 'friendly') },
            { role: 'user', content: getAutoUserPrompt(sub.business_type, sub.shop_name, topicParsed.keyword, photoDescs, recentAngles, { phone: sub.shop_phone, address: sub.shop_address, link: sub.shop_link }) },
          ],
        })

        let parsed = { title: '', body: '', hashtags: [] as string[] }
        try { parsed = JSON.parse(genData.choices?.[0]?.message?.content || '{}') } catch {}

        const bodyHtml = convertToHtml(parsed.body || '', postPhotos)

        // 글 저장 (planned 주제면 업데이트, 아니면 insert)
        if (plannedTopic) {
          await supabaseAdmin.from('blogpilot_scheduled_posts').update({
            trend_keyword: topicParsed.keyword,
            angle: topicParsed.angle,
            generated_title: parsed.title || topicParsed.topic,
            generated_body_html: bodyHtml,
            generated_hashtags: parsed.hashtags || [],
            photo_ids: postPhotos.map(p => p.id),
            status: 'done',
          }).eq('id', plannedTopic.id)
        } else {
          await supabaseAdmin.from('blogpilot_scheduled_posts').insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            scheduled_date: todayStr,
            topic: topicParsed.topic,
            trend_keyword: topicParsed.keyword,
            angle: topicParsed.angle,
            generated_title: parsed.title || topicParsed.topic,
            generated_body_html: bodyHtml,
            generated_hashtags: parsed.hashtags || [],
            photo_ids: postPhotos.map(p => p.id),
            status: 'done',
          })
        }

        // 사진 사용 기록
        for (const p of postPhotos) {
          await supabaseAdmin.from('blogpilot_photos').update({
            last_used_at: new Date().toISOString(),
            use_count: (p as any).use_count ? (p as any).use_count + 1 : 1,
          }).eq('id', p.id)
        }

        // 중복 방지 로그
        await supabaseAdmin.from('blogpilot_generation_log').insert({
          user_id: sub.user_id,
          title: parsed.title,
          main_keyword: topicParsed.keyword,
          angle: topicParsed.angle,
        })

        generated++
      } catch (e) {
        console.error(`Generate error for sub ${sub.id}:`, e)
      }
    }

    return NextResponse.json({ message: `${generated}편 생성 완료`, generated })
  } catch (error: any) {
    console.error('Scheduled generate error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
