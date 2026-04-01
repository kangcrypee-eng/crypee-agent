import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(request: NextRequest) {
  try {
    const { userId, businessType, shopName, shopPhone, shopAddress, shopLink, tone, deliveryEmail, scheduleDays, planType } = await request.json()

    if (!userId || !businessType || !shopName || !planType) {
      return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
    }

    const planAmounts: Record<string, number> = {
      monthly: 29900,
      semi_annual: 149000,
      annual: 249000,
    }

    // upsert 구독 정보
    const { data, error } = await supabaseAdmin
      .from('blogpilot_subscriptions')
      .upsert({
        user_id: userId,
        business_type: businessType,
        shop_name: shopName,
        shop_phone: shopPhone || null,
        shop_address: shopAddress || null,
        shop_link: shopLink || null,
        tone: tone || 'friendly',
        delivery_email: deliveryEmail || null,
        delivery_method: 'email',
        schedule_days: scheduleDays || [2, 4, 6],
        plan_type: planType,
        plan_amount: planAmounts[planType] || 29900,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select('id')
      .single()

    if (error) {
      console.error('Onboard error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ subscriptionId: data?.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '온보딩 실패' }, { status: 500 })
  }
}
