import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const maxDuration = 60

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

async function fetchBizinfo(bizinfoKey: string, fieldCode?: string, regionCode?: string, keyword?: string): Promise<any[]> {
  const params = new URLSearchParams({
    crtfcKey: bizinfoKey, dataType: 'json', searchCnt: '50', pageUnit: '50', pageIndex: '1',
  })
  if (fieldCode) params.set('searchLclasId', fieldCode)
  if (regionCode) params.set('searchMnhsLcalsId', regionCode)
  if (keyword) params.set('hashtags', keyword)

  const res = await fetch(`https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?${params}`)
  const text = await res.text()
  try { return JSON.parse(text)?.jsonArray || [] } catch { return [] }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const supabase = createClient(supabaseUrl, supabaseKey)
  const bizinfoKey = process.env.BIZINFO_API_KEY
  const resendKey = process.env.RESEND_API_KEY

  if (!bizinfoKey) return NextResponse.json({ error: 'BIZINFO_API_KEY not configured' }, { status: 500 })

  const { data: subs } = await supabase.from('alert_subscriptions')
    .select('*, profiles:user_id(representative, business_name, email)')
    .eq('is_active', true)

  if (!subs || subs.length === 0) return NextResponse.json({ message: 'No subscriptions', checked: 0 })

  const resend = resendKey ? new Resend(resendKey) : null
  const now = new Date()
  let processed = 0

  for (const sub of subs) {
    const filters = sub.filters || {}
    const profile = sub.profiles as any
    const userEmail = sub.phone // phone 필드에 이메일 저장됨
    const userName = profile?.representative || profile?.business_name || '사용자'

    try {
      // 복수 필터: 각 조합으로 API 호출 후 합치기 (중복 제거)
      const filterFields: string[] = filters.fields || []
      const filterRegions: string[] = filters.regions || []
      const filterStatuses: string[] = filters.statuses || ['접수중']
      const seen = new Set<string>()
      let allItems: any[] = []

      if (filterFields.length === 0 && filterRegions.length === 0) {
        // 필터 없음: 전체 조회
        allItems = await fetchBizinfo(bizinfoKey, undefined, undefined, filters.keyword)
      } else if (filterFields.length > 0 && filterRegions.length === 0) {
        // 분야만 선택
        for (const f of filterFields) {
          const items = await fetchBizinfo(bizinfoKey, FIELD_CODES[f], undefined, filters.keyword)
          for (const item of items) { if (!seen.has(item.pblancId)) { seen.add(item.pblancId); allItems.push(item) } }
        }
      } else if (filterFields.length === 0 && filterRegions.length > 0) {
        // 지역만 선택
        for (const r of filterRegions) {
          const items = await fetchBizinfo(bizinfoKey, undefined, REGION_CODES[r], filters.keyword)
          for (const item of items) { if (!seen.has(item.pblancId)) { seen.add(item.pblancId); allItems.push(item) } }
        }
      } else {
        // 분야+지역 조합 (첫 번째 분야 + 전체 지역으로 조회)
        for (const f of filterFields) {
          const items = await fetchBizinfo(bizinfoKey, FIELD_CODES[f], undefined, filters.keyword)
          for (const item of items) {
            if (seen.has(item.pblancId)) continue
            // 지역 필터 적용 (해시태그에 지역명 포함 여부)
            if (filterRegions.length > 0) {
              const tags = item.hashtags || ''
              const name = item.pblancNm || ''
              if (!filterRegions.some((r: string) => tags.includes(r) || name.includes(`[${r}]`))) continue
            }
            seen.add(item.pblancId)
            allItems.push(item)
          }
        }
      }

      // 접수상태 필터
      const matched = allItems.filter((item: any) => {
        if (filterStatuses.includes('접수중') && !filterStatuses.includes('접수예정')) {
          if (item.reqstBeginEndDe) {
            const parts = item.reqstBeginEndDe.split(' ~ ')
            if (parts[1]) {
              const end = new Date(parts[1].trim())
              if (end < now) return false
            }
          }
        }
        return true
      })

      const total = matched.length
      const top = matched.slice(0, 10)

      // 이메일 발송 (매칭 공고 있을 때만)
      if (resend && userEmail && total > 0) {
        const itemsHtml = top.map((item: any) => `
          <div style="padding:12px 16px;border:1px solid #e5e5e5;border-radius:8px;margin-bottom:8px">
            <div style="font-weight:600;font-size:14px;color:#111;margin-bottom:4px">${item.pblancNm || '공고명 없음'}</div>
            <div style="font-size:12px;color:#666;margin-bottom:4px">${item.jrsdInsttNm || ''} · ${item.pldirSportRealmLclasCodeNm || ''}</div>
            <div style="font-size:12px;color:#888;margin-bottom:6px">접수: ${item.reqstBeginEndDe || '확인 필요'}</div>
            ${item.pblancUrl ? `<a href="${item.pblancUrl}" style="font-size:12px;color:#00B894;text-decoration:none">상세 보기 →</a>` : ''}
          </div>
        `).join('')

        const filterDesc = [
          filterFields.length > 0 ? `분야: ${filterFields.join(', ')}` : '',
          filterRegions.length > 0 ? `지역: ${filterRegions.join(', ')}` : '',
          filters.keyword ? `키워드: ${filters.keyword}` : '',
        ].filter(Boolean).join(' · ')

        try {
          await resend.emails.send({
            from: 'crypee Agent <alert@crypee.biz>',
            to: userEmail,
            subject: `[crypee agent] 정부지원사업 공고 ${total}건 — ${userName}님`,
            html: `
              <div style="max-width:560px;margin:0 auto;font-family:-apple-system,sans-serif">
                <div style="padding:24px 0;border-bottom:1px solid #eee;margin-bottom:20px">
                  <span style="font-weight:800;font-size:16px;color:#111">crypee</span>
                  <span style="font-weight:800;font-size:16px;color:#00B894"> Agent</span>
                </div>
                <h2 style="font-size:18px;color:#111;margin-bottom:4px">정부지원사업 공고 알림</h2>
                <p style="font-size:14px;color:#666;margin-bottom:8px">${userName}님, 조건에 맞는 공고 <strong>${total}건</strong>을 찾았습니다.</p>
                ${filterDesc ? `<p style="font-size:11px;color:#999;margin-bottom:16px;padding:8px 12px;background:#f8f8f8;border-radius:6px">${filterDesc}</p>` : ''}
                ${itemsHtml}
                ${total > 10 ? `<p style="font-size:12px;color:#999;margin-top:8px">외 ${total - 10}건이 더 있습니다. 기업마당에서 확인하세요.</p>` : ''}
                <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#aaa">
                  <p>이 메일은 crypee Agent 공고 알림 서비스에서 발송되었습니다.</p>
                  <p>© 2025 Crypee Solutions Corp.</p>
                </div>
              </div>
            `,
          })
        } catch (emailErr) {
          console.error('Email send error:', emailErr)
        }
      }

      // 로그 기록
      await supabase.from('alert_logs').insert({
        subscription_id: sub.id, user_id: sub.user_id,
        matched_count: total, matched_items: top,
        status: total > 0 ? 'sent' : 'no_match',
      })
      await supabase.from('alert_subscriptions').update({
        last_checked_at: now.toISOString(), last_sent_at: total > 0 ? now.toISOString() : undefined,
      }).eq('id', sub.id)

      processed++
    } catch (e) {
      console.error('Alert error:', e)
      await supabase.from('alert_logs').insert({ subscription_id: sub.id, user_id: sub.user_id, matched_count: 0, status: 'failed' })
    }
  }

  return NextResponse.json({ message: `Processed ${processed}`, checked: processed })
}
