import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, userId } = await request.json()
    if (!subscriptionId || !userId) {
      return NextResponse.json({ error: '필수 정보 누락' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error } = await supabase.from('alert_subscriptions').update({
      billing_status: 'cancelled',
      is_active: false,
      billing_key: null,
      updated_at: new Date().toISOString(),
    }).eq('id', subscriptionId).eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true, message: '구독이 해지되었습니다. 남은 기간까지는 알림을 받으실 수 있습니다.' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '해지 실패' }, { status: 500 })
  }
}
