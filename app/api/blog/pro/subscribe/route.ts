import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const authKey = searchParams.get('authKey')
  const customerKey = searchParams.get('customerKey')
  const subscriptionId = searchParams.get('subscriptionId')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.crypee.biz'

  if (!authKey || !customerKey || !subscriptionId) {
    return NextResponse.redirect(`${appUrl}/blog/pro?error=missing_params`)
  }

  const billingSecretKey = process.env.TOSS_BILLING_SK || process.env.TOSS_SECRET_KEY
  if (!billingSecretKey) {
    return NextResponse.redirect(`${appUrl}/blog/pro?error=no_billing_key`)
  }

  const authHeader = 'Basic ' + Buffer.from(billingSecretKey + ':').toString('base64')

  // 1. 빌링키 발급
  let billingKey = '', cardCompany = '', cardNumber = ''
  try {
    const res = await fetch('https://api.tosspayments.com/v1/billing/authorizations/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ authKey, customerKey }),
    })
    const data = await res.json()
    if (!res.ok || data.code) throw new Error(data.message || '빌링키 발급 실패')
    billingKey = data.billingKey
    cardCompany = data.card?.company || ''
    cardNumber = data.card?.number || ''
  } catch (e: any) {
    return NextResponse.redirect(`${appUrl}/blog/pro?error=${encodeURIComponent(e.message)}`)
  }

  // 2. 구독 정보 조회
  const { data: sub } = await supabaseAdmin
    .from('blogpilot_subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single()

  if (!sub) return NextResponse.redirect(`${appUrl}/blog/pro?error=subscription_not_found`)

  // 3. 첫 결제
  const orderId = `blogpro-${sub.user_id.substring(0, 8)}-${Date.now()}`
  try {
    const res = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        customerKey,
        amount: sub.plan_amount,
        orderId,
        orderName: `BlogPilot Pro ${sub.plan_type === 'monthly' ? '1개월' : sub.plan_type === 'semi_annual' ? '6개월' : '연간'}`,
      }),
    })
    const data = await res.json()
    if (!res.ok || data.code) throw new Error(data.message || '결제 실패')
  } catch (e: any) {
    return NextResponse.redirect(`${appUrl}/blog/pro?error=${encodeURIComponent(e.message)}`)
  }

  // 4. payment 기록
  await supabaseAdmin.from('payments').insert({
    user_id: sub.user_id,
    module_id: 'BLOG02',
    order_id: orderId,
    payment_key: billingKey,
    amount: sub.plan_amount,
    status: 'paid',
    paid_at: new Date().toISOString(),
  })

  // 5. 구독 활성화
  const now = new Date()
  const months = sub.plan_type === 'monthly' ? 1 : sub.plan_type === 'semi_annual' ? 6 : 12
  const endDate = new Date(now)
  endDate.setMonth(endDate.getMonth() + months)
  const nextBilling = new Date(now)
  nextBilling.setMonth(nextBilling.getMonth() + (sub.plan_type === 'monthly' ? 1 : months))

  await supabaseAdmin
    .from('blogpilot_subscriptions')
    .update({
      billing_key: billingKey,
      card_company: cardCompany,
      card_number: cardNumber,
      billing_status: 'active',
      is_active: true,
      subscription_start_at: now.toISOString(),
      subscription_end_at: endDate.toISOString(),
      next_billing_at: sub.plan_type === 'monthly' ? nextBilling.toISOString() : null,
      updated_at: now.toISOString(),
    })
    .eq('id', subscriptionId)

  return NextResponse.redirect(`${appUrl}/blog/pro/dashboard?subscribed=true`)
}
