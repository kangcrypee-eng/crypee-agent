import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const paymentKey = searchParams.get('paymentKey')
  const orderId = searchParams.get('orderId')
  const amount = searchParams.get('amount')
  const postIds = searchParams.get('postIds')?.split(',') || []
  const returnUrl = searchParams.get('returnUrl') || '/blog/pro'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.crypee.biz'

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.redirect(`${appUrl}${returnUrl}&payFail=true`)
  }

  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) {
    return NextResponse.redirect(`${appUrl}${returnUrl}&payFail=true`)
  }

  const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64')

  // 1. 토스 결제 승인
  try {
    const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    })
    const data = await res.json()
    if (!res.ok || data.code) throw new Error(data.message || '결제 승인 실패')
  } catch (e: any) {
    return NextResponse.redirect(`${appUrl}${returnUrl}&payFail=true`)
  }

  // 2. 모든 글 paid = true
  for (const id of postIds) {
    await supabaseAdmin.from('blog_posts').update({ paid: true }).eq('id', id)
  }

  // 3. payment 기록
  const { data: firstPost } = await supabaseAdmin.from('blog_posts').select('user_id').eq('id', postIds[0]).single()
  if (firstPost) {
    await supabaseAdmin.from('payments').insert({
      user_id: firstPost.user_id,
      module_id: 'BLOG02',
      order_id: orderId,
      payment_key: paymentKey,
      amount: Number(amount),
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
  }

  return NextResponse.redirect(`${appUrl}${decodeURIComponent(returnUrl)}`)
}
