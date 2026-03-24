import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const supabase = createClient(supabaseUrl, supabaseKey)
  const bizinfoKey = process.env.BIZINFO_API_KEY
  const kakaoKey = process.env.KAKAO_REST_API_KEY
  const senderKey = process.env.KAKAO_SENDER_KEY

  if (!bizinfoKey || !kakaoKey || !senderKey) {
    return NextResponse.json({ error: 'API keys not configured' }, { status: 500 })
  }

  const now = new Date()
  const currentHour = now.getUTCHours() + 9 // KST
  const currentDay = now.getDay() // 0=일, 1=월, ...

  // 현재 시간에 해당하는 활성 구독 조회
  const { data: subs } = await supabase.from('alert_subscriptions')
    .select('*, profiles:user_id(representative, business_name, email)')
    .eq('is_active', true)
    .eq('schedule_hour', currentHour % 24)

  if (!subs || subs.length === 0) {
    return NextResponse.json({ message: 'No subscriptions to check', checked: 0 })
  }

  let processed = 0

  for (const sub of subs) {
    // weekly인 경우 요일 체크
    if (sub.schedule_type === 'weekly' && sub.schedule_day !== currentDay) continue

    const filters = sub.filters || {}

    try {
      // 기업마당 API 호출
      const params = new URLSearchParams({
        crtfcKey: bizinfoKey,
        dataType: 'json',
        pageNo: '1',
        numOfRows: '10',
      })
      if (filters.area) params.set('searchAreaCd', filters.area)
      if (filters.keyword) params.set('searchNm', filters.keyword)

      const res = await fetch(`https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?${params}`)
      const data = await res.json()
      const items = data?.jsonArray || []

      // 필터링
      const matched = items.filter((item: any) => {
        if (filters.field && item.bsnsSumryCn && !item.bsnsSumryCn.includes(filters.field)) return false
        if (filters.status === '접수중' && item.reqstBeginEndDe && new Date(item.reqstBeginEndDe) < now) return false
        return true
      }).slice(0, 5)

      // 카카오 알림톡 발송
      const userName = (sub.profiles as any)?.representative || (sub.profiles as any)?.business_name || '사용자'

      let message = ''
      if (matched.length > 0) {
        message = `[crypee Agent] 정부지원사업 공고 알림\n\n${userName}님, 조건에 맞는 새 공고 ${matched.length}건\n\n`
        matched.slice(0, 3).forEach((item: any, i: number) => {
          message += `📋 ${item.pblancNm || '공고명 없음'}\n   ${item.jrsdInsttNm || ''} | ${item.reqstBeginEndDe || ''}\n   상세: ${item.pblancUrl || ''}\n\n`
        })
        if (matched.length > 3) message += `외 ${matched.length - 3}건 더 있습니다.`
      } else {
        message = `[crypee Agent] 정부지원사업 공고 알림\n\n${userName}님, 오늘은 새 공고가 없습니다.\n다음 알림: ${sub.schedule_type === 'daily' ? '내일' : '다음 주'} ${sub.schedule_hour}시`
      }

      // 카카오 알림톡 발송
      await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `KakaoAK ${kakaoKey}`,
        },
        body: new URLSearchParams({
          template_object: JSON.stringify({
            object_type: 'text',
            text: message,
            link: { web_url: 'https://crypee-agent.vercel.app/alerts', mobile_web_url: 'https://crypee-agent.vercel.app/alerts' },
          }),
        }),
      })

      // 로그 기록
      await supabase.from('alert_logs').insert({
        subscription_id: sub.id, user_id: sub.user_id,
        matched_count: matched.length, matched_items: matched,
        status: matched.length > 0 ? 'sent' : 'no_match',
      })

      await supabase.from('alert_subscriptions').update({ last_checked_at: now.toISOString(), last_sent_at: now.toISOString() }).eq('id', sub.id)
      processed++
    } catch (e) {
      console.error('Alert check error:', e)
      await supabase.from('alert_logs').insert({ subscription_id: sub.id, user_id: sub.user_id, matched_count: 0, status: 'failed' })
    }
  }

  return NextResponse.json({ message: `Processed ${processed} subscriptions`, checked: processed })
}
