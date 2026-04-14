import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// POST: 클라이언트가 bizinfo에서 가져온 결과를 받아 DB 처리
export async function POST(request: NextRequest) {
  try {
    const { activeItems } = await request.json()
    if (!Array.isArray(activeItems)) {
      return NextResponse.json({ error: 'activeItems 필요' }, { status: 400 })
    }

    const activePblancIds = new Set(activeItems.map((item: any) => item.pblancId).filter(Boolean))

    // 만료된 항목 삭제 (module_created 제외)
    const { data: allScans } = await supabaseAdmin
      .from('bizplan_scans')
      .select('id, pblanc_id, status')

    const expiredIds = (allScans || [])
      .filter(s => s.status !== 'module_created' && !activePblancIds.has(s.pblanc_id))
      .map(s => s.id)

    if (expiredIds.length > 0) {
      await supabaseAdmin.from('bizplan_scans').delete().in('id', expiredIds)
    }

    if (activeItems.length === 0) {
      return NextResponse.json({ total: 0, new: 0, deleted: expiredIds.length })
    }

    // 이미 있는 항목 확인
    const pblancIds = Array.from(activePblancIds)
    const { data: existing } = await supabaseAdmin
      .from('bizplan_scans')
      .select('pblanc_id')
      .in('pblanc_id', pblancIds)

    const existingIds = new Set((existing || []).map(e => e.pblanc_id))
    const newItems = activeItems.filter((item: any) => !existingIds.has(item.pblancId))

    for (const item of newItems) {
      await supabaseAdmin.from('bizplan_scans').upsert({
        pblanc_id: item.pblancId,
        title: item.title,
        organization: item.organization,
        field: item.field,
        deadline: item.deadline,
        url: item.url,
        status: 'new',
      }, { onConflict: 'pblanc_id', ignoreDuplicates: true })
    }

    return NextResponse.json({ total: activeItems.length, new: newItems.length, deleted: expiredIds.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
