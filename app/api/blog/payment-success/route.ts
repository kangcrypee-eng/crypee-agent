import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const paymentKey = searchParams.get('paymentKey')
  const orderId = searchParams.get('orderId')
  const amount = searchParams.get('amount')
  const postId = searchParams.get('postId')
  const userId = searchParams.get('userId')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.crypee.biz'

  if (!paymentKey || !orderId || !amount || !postId || !userId) {
    return NextResponse.redirect(`${appUrl}/blog/preview/${postId}?payFail=true`)
  }

  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey || secretKey === 'test_sk_xxx') {
    return NextResponse.redirect(`${appUrl}/blog/preview/${postId}?payFail=true`)
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )

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
    return NextResponse.redirect(`${appUrl}/blog/preview/${postId}?payFail=true&message=${encodeURIComponent(e.message || '결제 승인 실패')}`)
  }

  // 2. payment 기록 저장
  await supabaseAdmin.from('payments').insert({
    user_id: userId,
    module_id: 'BLOG01',
    order_id: orderId,
    payment_key: paymentKey,
    amount: Number(amount),
    status: 'paid',
    paid_at: new Date().toISOString(),
  })

  // 3. blog_posts.paid = true
  await supabaseAdmin
    .from('blog_posts')
    .update({ paid: true })
    .eq('id', postId)

  // 4. 모듈 uses 증가
  const { data: mod } = await supabaseAdmin.from('modules').select('uses').eq('id', 'BLOG01').single()
  if (mod) await supabaseAdmin.from('modules').update({ uses: (mod.uses || 0) + 1 }).eq('id', 'BLOG01')

  return NextResponse.redirect(`${appUrl}/blog/preview/${postId}?purchased=true`)
}
