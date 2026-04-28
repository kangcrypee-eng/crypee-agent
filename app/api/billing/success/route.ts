import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const authKey = searchParams.get('authKey')
  const customerKey = searchParams.get('customerKey')
  const subscriptionId = searchParams.get('subscriptionId')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.crypee.biz'

  if (!authKey || !customerKey || !subscriptionId) {
    return NextResponse.redirect(`${appUrl}/alerts?error=missing_params`)
  }

  const secretKey = process.env.TOSS_BILLING_SK || process.env.TOSS_SECRET_KEY
  if (!secretKey || secretKey === 'test_sk_xxx') {
    return NextResponse.redirect(`${appUrl}/alerts?error=payment_not_configured`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const supabase = createClient(supabaseUrl, supabaseKey)
  const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64')

  // 1. 빌링키 발급
  let billingKey = ''
  let cardCompany = ''
  let cardNumber = ''
  try {
    const res = await fetch('https://api.tosspayments.com/v1/billing/authorizations/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({ authKey, customerKey }),
    })
    const data = await res.json()
    if (!res.ok || data.code) throw new Error(data.message || '빌링키 발급 실패')
    billingKey = data.billingKey
    cardCompany = data.card?.company || ''
    cardNumber = data.card?.number || ''
  } catch (e: any) {
    return NextResponse.redirect(`${appUrl}/alerts?error=${encodeURIComponent(e.message)}`)
  }

  // 2. 첫 결제 (₩990)
  const orderId = `alert-${customerKey.substring(0, 8)}-${Date.now()}`
  try {
    const res = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({
        customerKey,
        amount: 990,
        orderId,
        orderName: 'crypee Agent 공고 알림 (월간)',
      }),
    })
    const data = await res.json()
    if (!res.ok || data.code) throw new Error(data.message || '첫 결제 실패')

    // 결제 기록
    await supabase.from('payments').insert({
      user_id: customerKey,
      module_id: 'M100',
      order_id: orderId,
      payment_key: data.paymentKey,
      amount: 990,
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
  } catch (e: any) {
    // 첫 결제 실패 → 빌링키만 저장하고 안내
    await supabase.from('alert_subscriptions').update({
      billing_key: billingKey,
      card_company: cardCompany,
      card_number: cardNumber,
      billing_status: 'failed',
    }).eq('id', subscriptionId)
    return NextResponse.redirect(`${appUrl}/alerts?error=${encodeURIComponent('카드 등록은 완료되었으나 첫 결제에 실패했습니다: ' + e.message)}`)
  }

  // 3. 구독 활성화 — 빌링키 + 다음 결제일 저장
  const nextBilling = new Date()
  nextBilling.setMonth(nextBilling.getMonth() + 1)

  await supabase.from('alert_subscriptions').update({
    billing_key: billingKey,
    card_company: cardCompany,
    card_number: cardNumber,
    billing_status: 'active',
    next_billing_at: nextBilling.toISOString(),
    is_active: true,
  }).eq('id', subscriptionId)

  // 모듈 사용 횟수 증가
  const { data: mod } = await supabase.from('modules').select('uses').eq('id', 'M100').single()
  await supabase.from('modules').update({ uses: (mod?.uses || 0) + 1 }).eq('id', 'M100')

  return NextResponse.redirect(`${appUrl}/alerts?subscribed=true`)
}
