import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

export async function GET() {
  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey || secretKey === 'test_sk_xxx') {
    return NextResponse.json({ error: 'TOSS_SECRET_KEY not configured' }, { status: 500 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const supabase = createClient(supabaseUrl, supabaseKey)
  const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64')

  const now = new Date()

  // 결제일이 지난 활성 구독 조회
  const { data: subs } = await supabase.from('alert_subscriptions')
    .select('*')
    .eq('billing_status', 'active')
    .not('billing_key', 'is', null)
    .lte('next_billing_at', now.toISOString())

  if (!subs || subs.length === 0) {
    return NextResponse.json({ message: 'No billing to process', charged: 0 })
  }

  let charged = 0
  let failed = 0

  for (const sub of subs) {
    const orderId = `alert-${sub.user_id.substring(0, 8)}-${Date.now()}-${charged}`

    try {
      const res = await fetch(`https://api.tosspayments.com/v1/billing/${sub.billing_key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({
          customerKey: sub.user_id,
          amount: 990,
          orderId,
          orderName: 'crypee Agent 공고 알림 (월간)',
        }),
      })
      const data = await res.json()

      if (!res.ok || data.code) {
        throw new Error(data.message || '결제 실패')
      }

      // 결제 성공 → 다음 결제일 갱신
      const nextBilling = new Date(sub.next_billing_at)
      nextBilling.setMonth(nextBilling.getMonth() + 1)

      await supabase.from('payments').insert({
        user_id: sub.user_id, module_id: 'M100', order_id: orderId,
        payment_key: data.paymentKey, amount: 990, status: 'paid',
        paid_at: now.toISOString(),
      })

      await supabase.from('alert_subscriptions').update({
        next_billing_at: nextBilling.toISOString(),
        billing_status: 'active',
      }).eq('id', sub.id)

      charged++
    } catch (e: any) {
      console.error(`Billing failed for ${sub.id}:`, e.message)

      // 결제 실패 → 알림 비활성화
      await supabase.from('alert_subscriptions').update({
        billing_status: 'failed',
        is_active: false,
      }).eq('id', sub.id)

      failed++
    }
  }

  return NextResponse.json({ message: `Charged: ${charged}, Failed: ${failed}`, charged, failed })
}
