import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const paymentKey = searchParams.get('paymentKey')
  const orderId = searchParams.get('orderId')
  const amount = searchParams.get('amount')
  const credits = Number(searchParams.get('credits') || '0')
  const userId = searchParams.get('userId')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!paymentKey || !orderId || !amount || !credits || !userId) {
    return NextResponse.redirect(`${appUrl}/api/payment/fail?message=${encodeURIComponent('결제 정보가 올바르지 않습니다')}`)
  }

  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey || secretKey === 'test_sk_xxx') {
    return NextResponse.redirect(`${appUrl}/api/payment/fail?message=${encodeURIComponent('결제 시스템이 설정되지 않았습니다')}`)
  }

  // 1. 토스 결제 승인 요청
  let paymentData: any
  try {
    const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64')
    const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    })
    paymentData = await res.json()
    if (!res.ok || paymentData.code) {
      throw new Error(paymentData.message || '결제 승인 실패')
    }
  } catch (e: any) {
    return NextResponse.redirect(`${appUrl}/api/payment/fail?message=${encodeURIComponent(e.message || '결제 승인 실패')}`)
  }

  // 2. DB에 크레딧 반영
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 프로필 크레딧 증가
    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single()
    if (!profile) throw new Error('사용자를 찾을 수 없습니다')

    const newCredits = (profile.credits || 0) + credits
    const { error: updateError } = await supabase.from('profiles').update({ credits: newCredits }).eq('id', userId)
    if (updateError) throw new Error('크레딧 반영 실패: ' + updateError.message)

    // 거래 기록 저장
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: credits,
      type: 'purchase',
      description: `크레딧 ${credits}개 구매 (₩${Number(amount).toLocaleString()})`,
      payment_key: paymentKey,
      order_id: orderId,
    })

    return NextResponse.redirect(`${appUrl}/credits/success?credits=${credits}`)
  } catch (e: any) {
    // 3. DB 반영 실패 시 → 토스 결제 취소
    console.error('DB 반영 실패, 결제 취소 시도:', e)
    try {
      const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64')
      await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ cancelReason: '크레딧 반영 실패로 인한 자동 취소' }),
      })
    } catch (cancelError) {
      console.error('결제 취소도 실패:', cancelError)
      // 이 경우 수동 처리 필요
      return NextResponse.redirect(`${appUrl}/api/payment/fail?message=${encodeURIComponent('결제는 완료되었으나 크레딧 반영에 실패했습니다. contact@crypee.io로 문의해주세요. 주문번호: ' + orderId)}`)
    }
    return NextResponse.redirect(`${appUrl}/api/payment/fail?message=${encodeURIComponent('크레딧 반영 실패로 결제가 자동 취소되었습니다. 다시 시도해주세요.')}`)
  }
}
