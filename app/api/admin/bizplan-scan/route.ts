import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

async function fetchBizinfo(bizinfoKey: string, fieldCode: string): Promise<any[]> {
  const params = new URLSearchParams({
    crtfcKey: bizinfoKey, dataType: 'json', searchCnt: '50', pageUnit: '50', pageIndex: '1',
    searchLclasId: fieldCode,
  })
  const res = await fetch(`https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?${params}`)
  const text = await res.text()
  try { return JSON.parse(text)?.jsonArray || [] } catch { return [] }
}

// GET: 창업 공고 스캔 (cron 또는 수동 호출)
export async function GET() {
  const bizinfoKey = process.env.BIZINFO_API_KEY
  if (!bizinfoKey) return NextResponse.json({ error: 'BIZINFO_API_KEY 미설정' }, { status: 500 })

  try {
    // 창업(05) 분야 공고 조회
    const items = await fetchBizinfo(bizinfoKey, '05')
    const now = new Date()

    // 접수중인 것만 필터
    const active = items.filter((item: any) => {
      if (!item.reqstBeginEndDe) return true
      const parts = item.reqstBeginEndDe.split(' ~ ')
      if (parts[1]) {
        const end = new Date(parts[1].trim())
        return end >= now
      }
      return true
    })

    // 이미 처리된 공고 확인 (bizplan_scans 테이블)
    const pblancIds = active.map((item: any) => item.pblancId).filter(Boolean)
    const { data: existing } = await supabaseAdmin
      .from('bizplan_scans')
      .select('pblanc_id')
      .in('pblanc_id', pblancIds)

    const existingIds = new Set((existing || []).map(e => e.pblanc_id))

    // 신규 공고만 필터
    const newItems = active.filter((item: any) => !existingIds.has(item.pblancId))

    // 신규 공고 DB 저장
    for (const item of newItems) {
      await supabaseAdmin.from('bizplan_scans').upsert({
        pblanc_id: item.pblancId,
        title: item.pblancNm,
        organization: item.jrsdInsttNm,
        field: item.pldirSportRealmLclasCodeNm,
        deadline: item.reqstBeginEndDe,
        url: item.pblancUrl,
        status: 'new',
      }, { onConflict: 'pblanc_id', ignoreDuplicates: true })
    }

    return NextResponse.json({
      total: active.length,
      new: newItems.length,
      newItems: newItems.map((item: any) => ({
        pblancId: item.pblancId,
        title: item.pblancNm,
        organization: item.jrsdInsttNm,
        deadline: item.reqstBeginEndDe,
        url: item.pblancUrl,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
