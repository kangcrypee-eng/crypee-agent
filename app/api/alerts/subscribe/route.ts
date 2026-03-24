import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, filters, scheduleType, scheduleHour, scheduleDay, phone } = body

    if (!userId || !phone) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 기존 구독 확인
    const { data: existing } = await supabase.from('alert_subscriptions')
      .select('id').eq('user_id', userId).eq('module_type', 'gov_support').single()

    if (existing) {
      // 업데이트
      const { error } = await supabase.from('alert_subscriptions').update({
        filters, schedule_type: scheduleType, schedule_hour: scheduleHour,
        schedule_day: scheduleDay || null, phone, is_active: true, updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
      if (error) throw error
      return NextResponse.json({ success: true, message: '알림 설정이 업데이트되었습니다', id: existing.id })
    } else {
      // 새로 생성
      const { data, error } = await supabase.from('alert_subscriptions').insert({
        user_id: userId, module_type: 'gov_support', filters,
        schedule_type: scheduleType, schedule_hour: scheduleHour,
        schedule_day: scheduleDay || null, phone,
      }).select('id').single()
      if (error) throw error
      return NextResponse.json({ success: true, message: '알림이 설정되었습니다', id: data?.id })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '오류가 발생했습니다' }, { status: 500 })
  }
}
