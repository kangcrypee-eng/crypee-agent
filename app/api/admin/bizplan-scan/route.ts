import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const ALL_FIELDS: Record<string, string> = {
  '기술': '01', '인력': '02', '수출': '03', '내수': '04',
  '창업': '05', '경영': '06', '기타': '07', '융복합': '08',
}

async function fetchBizinfo(bizinfoKey: string, fieldCode?: string): Promise<any[]> {
  const params = new URLSearchParams({
    crtfcKey: bizinfoKey, dataType: 'json', searchCnt: '50', pageUnit: '50', pageIndex: '1',
  })
  if (fieldCode) params.set('searchLclasId', fieldCode)
  const res = await fetch(`https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?${params}`)
  const text = await res.text()
  try { return JSON.parse(text)?.jsonArray || [] } catch { return [] }
}

// GET: 전체 분야 공고 스캔 (오늘 이후 접수분만)
export async function GET() {
  const bizinfoKey = process.env.BIZINFO_API_KEY
  if (!bizinfoKey) return NextResponse.json({ error: 'BIZINFO_API_KEY 미설정' }, { status: 500 })

  try {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0] // 2026-04-02
    const seen = new Set<string>()
    let allItems: any[] = []

    // 전체 분야 스캔
    for (const [fieldName, fieldCode] of Object.entries(ALL_FIELDS)) {
      const items = await fetchBizinfo(bizinfoKey, fieldCode)
      for (const item of items) {
        if (seen.has(item.pblancId)) continue
        seen.add(item.pblancId)
        item._field = fieldName
        allItems.push(item)
      }
    }

    // 오늘 이후 접수중인 것만 필터
    const active = allItems.filter((item: any) => {
      if (!item.reqstBeginEndDe) return false
      const parts = item.reqstBeginEndDe.split(' ~ ')
      // 접수 시작일이 오늘 이후이거나, 마감일이 오늘 이후
      if (parts[0]) {
        const begin = new Date(parts[0].trim())
        if (begin >= new Date(todayStr)) return true
      }
      if (parts[1]) {
        const end = new Date(parts[1].trim())
        return end >= now
      }
      return false
    })

    // 현재 API에서 유효한 pblancId 목록
    const activePblancIds = new Set(active.map((item: any) => item.pblancId).filter(Boolean))

    // DB에 있는 항목 중 API에 더 이상 없는 것 = 만료 → 삭제 (module_created 제외)
    const { data: allScans } = await supabaseAdmin
      .from('bizplan_scans')
      .select('id, pblanc_id, status')

    const expiredIds = (allScans || [])
      .filter(s => s.status !== 'module_created' && !activePblancIds.has(s.pblanc_id))
      .map(s => s.id)

    if (expiredIds.length > 0) {
      await supabaseAdmin.from('bizplan_scans').delete().in('id', expiredIds)
    }

    // 이미 DB에 있는 공고 확인
    const pblancIds = [...activePblancIds]
    if (pblancIds.length === 0) return NextResponse.json({ total: 0, new: 0, newItems: [], deleted: expiredIds.length })

    const { data: existing } = await supabaseAdmin
      .from('bizplan_scans')
      .select('pblanc_id')
      .in('pblanc_id', pblancIds)

    const existingIds = new Set((existing || []).map(e => e.pblanc_id))
    const newItems = active.filter((item: any) => !existingIds.has(item.pblancId))

    // 신규 공고 DB 저장
    for (const item of newItems) {
      await supabaseAdmin.from('bizplan_scans').upsert({
        pblanc_id: item.pblancId,
        title: item.pblancNm,
        organization: item.jrsdInsttNm,
        field: item._field || item.pldirSportRealmLclasCodeNm,
        deadline: item.reqstBeginEndDe,
        url: item.pblancUrl,
        status: 'new',
      }, { onConflict: 'pblanc_id', ignoreDuplicates: true })
    }

    return NextResponse.json({
      total: active.length,
      new: newItems.length,
      deleted: expiredIds.length,
      newItems: newItems.map((item: any) => ({
        pblancId: item.pblancId,
        title: item.pblancNm,
        organization: item.jrsdInsttNm,
        field: item._field,
        deadline: item.reqstBeginEndDe,
        url: item.pblancUrl,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
