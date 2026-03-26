import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

// 기업마당 API 분류코드 매핑
const FIELD_CODES: Record<string, string> = {
  '기술': '01', '인력': '02', '수출': '03', '내수': '04',
  '창업': '05', '경영': '06', '기타': '07', '융복합': '08',
}
const REGION_CODES: Record<string, string> = {
  '서울': '01', '부산': '02', '대구': '03', '인천': '04', '광주': '05',
  '대전': '06', '울산': '07', '세종': '08', '경기': '09', '강원': '10',
  '충북': '11', '충남': '12', '전북': '13', '전남': '14', '경북': '15',
  '경남': '16', '제주': '17',
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const supabase = createClient(supabaseUrl, supabaseKey)
  const bizinfoKey = process.env.BIZINFO_API_KEY

  if (!bizinfoKey) {
    return NextResponse.json({ error: 'BIZINFO_API_KEY not configured' }, { status: 500 })
  }

  // Hobby 플랜: 하루 1회 실행 → 모든 활성 구독 처리
  const { data: subs } = await supabase.from('alert_subscriptions')
    .select('*, profiles:user_id(representative, business_name, email, phone)')
    .eq('is_active', true)

  if (!subs || subs.length === 0) {
    return NextResponse.json({ message: 'No subscriptions to check', checked: 0 })
  }

  const now = new Date()
  let processed = 0

  for (const sub of subs) {
    const filters = sub.filters || {}

    try {
      // 기업마당 API 호출
      const params = new URLSearchParams({
        crtfcKey: bizinfoKey,
        dataType: 'json',
        searchCnt: '20',
        pageUnit: '20',
        pageIndex: '1',
      })

      // 분류코드 (지원분야)
      if (filters.field && FIELD_CODES[filters.field]) {
        params.set('searchLclasId', FIELD_CODES[filters.field])
      }
      // 지역코드
      if (filters.region && REGION_CODES[filters.region]) {
        params.set('searchMnhsLcalsId', REGION_CODES[filters.region])
      }
      // 키워드 (해시태그)
      if (filters.keyword) {
        params.set('hashtags', filters.keyword)
      }

      const res = await fetch(`https://www.bizinfo.go.kr/uss/rss/bizInfoApi.do?${params}`)
      const text = await res.text()

      let items: any[] = []
      try {
        const data = JSON.parse(text)
        items = data?.jsonArray || []
      } catch {
        console.error('기업마당 API 응답 파싱 실패:', text.substring(0, 200))
      }

      // 필터링: 접수상태
      const matched = items.filter((item: any) => {
        if (filters.status === '접수중') {
          // reqstBeginEndDe가 있고, 종료일이 현재 이후인 것만
          if (item.reqstEndDe) {
            const endDate = new Date(item.reqstEndDe.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))
            if (endDate < now) return false
          }
        }
        return true
      }).slice(0, 10)

      // 알림 메시지 생성
      const userName = (sub.profiles as any)?.representative || (sub.profiles as any)?.business_name || '사용자'

      let message = ''
      if (matched.length > 0) {
        message = `[crypee Agent] 정부지원사업 공고 알림\n\n${userName}님, 조건에 맞는 공고 ${matched.length}건\n\n`
        matched.slice(0, 5).forEach((item: any) => {
          message += `📋 ${item.pblancNm || '공고명 없음'}\n`
          if (item.jrsdInsttNm) message += `   기관: ${item.jrsdInsttNm}\n`
          if (item.reqstBeginEndDe) message += `   접수: ${item.reqstBeginEndDe}\n`
          if (item.pblancUrl) message += `   ${item.pblancUrl}\n`
          message += '\n'
        })
        if (matched.length > 5) message += `외 ${matched.length - 5}건\n`
      } else {
        message = `[crypee Agent] 정부지원사업 공고 알림\n\n${userName}님, 오늘은 조건에 맞는 새 공고가 없습니다.`
      }

      // TODO: 카카오 알림톡 발송 (카카오 비즈니스 채널 설정 후 활성화)
      // 현재는 로그만 기록
      console.log(`[Alert] User ${sub.user_id}: ${matched.length}건 매칭`)

      // 로그 기록
      await supabase.from('alert_logs').insert({
        subscription_id: sub.id,
        user_id: sub.user_id,
        matched_count: matched.length,
        matched_items: matched.slice(0, 5),
        status: matched.length > 0 ? 'sent' : 'no_match',
      })

      await supabase.from('alert_subscriptions').update({
        last_checked_at: now.toISOString(),
        last_sent_at: now.toISOString(),
      }).eq('id', sub.id)

      processed++
    } catch (e) {
      console.error('Alert check error:', e)
      await supabase.from('alert_logs').insert({
        subscription_id: sub.id, user_id: sub.user_id,
        matched_count: 0, status: 'failed',
      })
    }
  }

  return NextResponse.json({ message: `Processed ${processed} subscriptions`, checked: processed })
}
