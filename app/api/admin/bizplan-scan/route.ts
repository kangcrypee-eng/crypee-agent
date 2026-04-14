import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

const ALL_FIELDS: Record<string, string> = {
  '기술': '01', '인력': '02', '수출': '03', '내수': '04',
  '창업': '05', '경영': '06', '기타': '07', '융복합': '08',
}

const parseEnd = (str: string): Date | null => {
  if (!str) return null
  const parts = str.split('~')
  const s = (parts[1] || parts[0])?.trim()
  if (!s) return null
  if (/^\d{8}$/.test(s)) return new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`)
  return new Date(s.replace(/\./g, '-'))
}

export async function GET(request: NextRequest) {
  const bizinfoKey = process.env.BIZINFO_API_KEY
  if (!bizinfoKey) return NextResponse.json({ error: 'BIZINFO_API_KEY 미설정' }, { status: 500 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )

  try {
    // bizinfo API 호출 (Edge = 서울 서버에서 실행)
    const seen = new Set<string>()
    const allItems: any[] = []

    for (const [fieldName, fieldCode] of Object.entries(ALL_FIELDS)) {
      const params = new URLSearchParams({
        crtfcKey: bizinfoKey, dataType: 'json', searchCnt: '50', pageUnit: '50', pageIndex: '1', searchLclasId: fieldCode,
      })
      try {
        const res = await fetch(`https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?${params}`)
        const json = await res.json()
        for (const item of json?.jsonArray || []) {
          if (seen.has(item.pblancId)) continue
          seen.add(item.pblancId)
          allItems.push({ ...item, _field: fieldName })
        }
      } catch { /* 분야별 실패 무시 */ }
    }

    // 마감일 기준 필터
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const activeItems = allItems.filter(item => {
      const end = parseEnd(item.reqstBeginEndDe)
      return end && end >= today
    })

    const activePblancIds = new Set(activeItems.map((item: any) => item.pblancId).filter(Boolean))

    // 만료 항목 삭제
    const { data: allScans } = await supabaseAdmin
      .from('bizplan_scans')
      .select('id, pblanc_id, status')

    const expiredIds = (allScans || [])
      .filter((s: any) => s.status !== 'module_created' && !activePblancIds.has(s.pblanc_id))
      .map((s: any) => s.id)

    if (expiredIds.length > 0) {
      await supabaseAdmin.from('bizplan_scans').delete().in('id', expiredIds)
    }

    // 신규 항목 저장
    const pblancIds = Array.from(activePblancIds)
    let newCount = 0

    if (pblancIds.length > 0) {
      const { data: existing } = await supabaseAdmin
        .from('bizplan_scans')
        .select('pblanc_id')
        .in('pblanc_id', pblancIds)

      const existingIds = new Set((existing || []).map((e: any) => e.pblanc_id))
      const newItems = activeItems.filter((item: any) => !existingIds.has(item.pblancId))
      newCount = newItems.length

      for (const item of newItems) {
        const attachExt = (item.fileNm || '').split('.').pop()?.toLowerCase()
        await supabaseAdmin.from('bizplan_scans').upsert({
          pblanc_id: item.pblancId,
          title: item.pblancNm,
          organization: item.jrsdInsttNm,
          field: item._field,
          deadline: item.reqstBeginEndDe,
          url: item.pblancUrl,
          announcement_file_url: item.printFlpthNm || null,
          template_file_url: attachExt === 'pdf' ? (item.flpthNm || null) : null,
          template_file_name: item.fileNm || null,
          status: 'new',
        }, { onConflict: 'pblanc_id', ignoreDuplicates: true })
      }
    }

    return NextResponse.json({
      total: activeItems.length,
      new: newCount,
      deleted: expiredIds.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 })
  }
}
