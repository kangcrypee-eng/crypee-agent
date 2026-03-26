import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

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
  const resendKey = process.env.RESEND_API_KEY

  if (!bizinfoKey) {
    return NextResponse.json({ error: 'BIZINFO_API_KEY not configured' }, { status: 500 })
  }

  // 모든 활성 구독 조회
  const { data: subs } = await supabase.from('alert_subscriptions')
    .select('*, profiles:user_id(representative, business_name, email)')
    .eq('is_active', true)

  if (!subs || subs.length === 0) {
    return NextResponse.json({ message: 'No subscriptions to check', checked: 0 })
  }

  const resend = resendKey ? new Resend(resendKey) : null
  const now = new Date()
  let processed = 0

  for (const sub of subs) {
    const filters = sub.filters || {}
    const profile = sub.profiles as any
    const userEmail = profile?.email
    const userName = profile?.representative || profile?.business_name || '사용자'

    try {
      // 기업마당 API 호출
      const params = new URLSearchParams({
        crtfcKey: bizinfoKey,
        dataType: 'json',
        searchCnt: '20',
        pageUnit: '20',
        pageIndex: '1',
      })
      if (filters.field && FIELD_CODES[filters.field]) params.set('searchLclasId', FIELD_CODES[filters.field])
      if (filters.region && REGION_CODES[filters.region]) params.set('searchMnhsLcalsId', REGION_CODES[filters.region])
      if (filters.keyword) params.set('hashtags', filters.keyword)

      const res = await fetch(`https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?${params}`)
      const text = await res.text()

      let items: any[] = []
      try { items = JSON.parse(text)?.jsonArray || [] } catch { console.error('API 파싱 실패') }

      // 접수상태 필터링
      const matched = items.filter((item: any) => {
        if (filters.status === '접수중' && item.reqstEndDe) {
          const endDate = new Date(item.reqstEndDe.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))
          if (endDate < now) return false
        }
        return true
      }).slice(0, 10)

      // 이메일 발송
      if (resend && userEmail && matched.length > 0) {
        const itemsHtml = matched.slice(0, 5).map((item: any) => `
          <div style="padding:12px 16px;border:1px solid #e5e5e5;border-radius:8px;margin-bottom:8px">
            <div style="font-weight:600;font-size:14px;color:#111;margin-bottom:4px">${item.pblancNm || '공고명 없음'}</div>
            <div style="font-size:12px;color:#666;margin-bottom:4px">${item.jrsdInsttNm || ''} · ${item.pldirSportRealmLclasCodeNm || ''}</div>
            <div style="font-size:12px;color:#888;margin-bottom:6px">접수: ${item.reqstBeginEndDe || '확인 필요'}</div>
            ${item.pblancUrl ? `<a href="${item.pblancUrl}" style="font-size:12px;color:#00B894;text-decoration:none">상세 보기 →</a>` : ''}
          </div>
        `).join('')

        await resend.emails.send({
          from: 'crypee Agent <onboarding@resend.dev>',
          to: userEmail,
          subject: `[crypee] 정부지원사업 공고 ${matched.length}건 — ${userName}님`,
          html: `
            <div style="max-width:560px;margin:0 auto;font-family:-apple-system,sans-serif">
              <div style="padding:24px 0;border-bottom:1px solid #eee;margin-bottom:20px">
                <span style="font-weight:800;font-size:16px;color:#111">crypee</span>
                <span style="font-weight:800;font-size:16px;color:#00B894"> Agent</span>
              </div>
              <h2 style="font-size:18px;color:#111;margin-bottom:4px">정부지원사업 공고 알림</h2>
              <p style="font-size:14px;color:#666;margin-bottom:20px">${userName}님, 조건에 맞는 공고 <strong>${matched.length}건</strong>을 찾았습니다.</p>
              ${filters.field || filters.region || filters.keyword ? `<p style="font-size:12px;color:#999;margin-bottom:16px">필터: ${[filters.field, filters.region, filters.keyword].filter(Boolean).join(' · ')}</p>` : ''}
              ${itemsHtml}
              ${matched.length > 5 ? `<p style="font-size:12px;color:#999;margin-top:8px">외 ${matched.length - 5}건 더 있습니다.</p>` : ''}
              <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#aaa">
                <p>이 메일은 crypee Agent 공고 알림 서비스에서 발송되었습니다.</p>
                <p>알림 설정 변경: crypee-agent-six.vercel.app/alerts</p>
              </div>
            </div>
          `,
        })
      } else if (resend && userEmail && matched.length === 0) {
        // 공고 없으면 이메일 안 보냄 (로그만 기록)
      }

      // 로그 기록
      await supabase.from('alert_logs').insert({
        subscription_id: sub.id, user_id: sub.user_id,
        matched_count: matched.length, matched_items: matched.slice(0, 5),
        status: matched.length > 0 ? 'sent' : 'no_match',
      })

      await supabase.from('alert_subscriptions').update({
        last_checked_at: now.toISOString(), last_sent_at: now.toISOString(),
      }).eq('id', sub.id)

      processed++
    } catch (e) {
      console.error('Alert check error:', e)
      await supabase.from('alert_logs').insert({
        subscription_id: sub.id, user_id: sub.user_id, matched_count: 0, status: 'failed',
      })
    }
  }

  return NextResponse.json({ message: `Processed ${processed} subscriptions`, checked: processed })
}
