import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const paymentKey = searchParams.get('paymentKey')
  const orderId = searchParams.get('orderId')
  const amount = searchParams.get('amount')
  const moduleId = searchParams.get('moduleId')
  const userId = searchParams.get('userId')
  const returnTo = searchParams.get('returnTo')
  const inputDataStr = searchParams.get('inputData')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.crypee.biz'

  if (!paymentKey || !orderId || !amount || !moduleId || !userId) {
    return NextResponse.redirect(`${appUrl}/credits/fail?message=${encodeURIComponent('결제 정보가 올바르지 않습니다')}`)
  }

  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey || secretKey === 'test_sk_xxx') {
    return NextResponse.redirect(`${appUrl}/credits/fail?message=${encodeURIComponent('결제 시스템이 설정되지 않았습니다')}`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const supabase = createClient(supabaseUrl, supabaseKey)
  const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64')

  // 1. 토스 결제 승인
  try {
    const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    })
    const data = await res.json()
    if (!res.ok || data.code) throw new Error(data.message || '결제 승인 실패')
  } catch (e: any) {
    return NextResponse.redirect(`${appUrl}/credits/fail?message=${encodeURIComponent(e.message || '결제 승인 실패')}`)
  }

  // 2. payment 기록 저장
  await supabase.from('payments').insert({
    user_id: userId, module_id: moduleId, order_id: orderId,
    payment_key: paymentKey, amount: Number(amount), status: 'paid', paid_at: new Date().toISOString(),
  })

  // returnTo가 있으면 AI 생성 없이 바로 리다이렉트 (bizplan 잠금 해제 등)
  if (returnTo) {
    return NextResponse.redirect(`${appUrl}${returnTo}`)
  }

  // 3. AI 생성
  const { data: mod } = await supabase.from('modules').select('*').eq('id', moduleId).single()
  if (!mod) {
    return NextResponse.redirect(`${appUrl}/credits/fail?message=${encodeURIComponent('모듈을 찾을 수 없습니다')}`)
  }

  // 입력 데이터 복원
  let inputData: Record<string, string> = {}
  if (inputDataStr) { try { inputData = JSON.parse(decodeURIComponent(inputDataStr)) } catch {} }

  // 프로필 데이터
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()
  const pd: Record<string, string> = {}
  if (profile) {
    for (const k of ['business_name','representative','business_number','business_type','sector','item','service_desc','target_customer','track_record','address','phone','email']) {
      pd[k] = (profile as any)[k] || ''
    }
  }
  const allData = { ...pd, ...inputData }

  // 프롬프트 변수 치환
  let fullPrompt = mod.user_prompt_template || ''
  for (const [key, value] of Object.entries(allData)) {
    fullPrompt = fullPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), (value as string) || '(미입력)')
  }
  fullPrompt = fullPrompt.replace(/\{\{[^}]+\}\}/g, '(미입력)')

  const apiKey = process.env.ANTHROPIC_API_KEY
  let resultText = ''
  let usage = { input_tokens: 0, output_tokens: 0 }

  const generateAI = async () => {
    if (!apiKey) throw new Error('API 키 없음')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: mod.ai_model || 'claude-sonnet-4-6', max_tokens: Math.max(mod.max_tokens || 4096, mod.id?.startsWith('BP') ? 16384 : 4096), temperature: mod.temperature ?? 0.3, system: (mod.system_prompt || '') + (mod.id?.startsWith('BP') ? '\n\n[중요] 반드시 모든 섹션을 빠짐없이 끝까지 완성하세요. 절대 중간에 생략하거나 요약하지 마세요.' : ''), messages: [{ role: 'user', content: fullPrompt }] }),
    })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error?.message || 'AI 생성 실패')
    resultText = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
    usage = { input_tokens: data.usage?.input_tokens || 0, output_tokens: data.usage?.output_tokens || 0 }
  }

  try {
    await generateAI()
  } catch {
    // 재시도 1회
    try { await generateAI() } catch (e: any) {
      // AI 생성 실패 → 자동 환불
      try {
        await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
          body: JSON.stringify({ cancelReason: 'AI 생성 실패로 인한 자동 환불' }),
        })
        await supabase.from('payments').update({ status: 'refunded', refund_amount: Number(amount), refund_reason: 'AI 생성 실패' }).eq('order_id', orderId)
      } catch {}
      return NextResponse.redirect(`${appUrl}/credits/fail?message=${encodeURIComponent('AI 생성에 실패하여 결제가 자동 취소되었습니다. 다시 시도해주세요.')}`)
    }
  }

  // 4. generation 기록 저장
  const { data: gen } = await supabase.from('generations').insert({
    user_id: userId, module_id: moduleId, input_data: allData,
    output_text: resultText, output_format: mod.default_format || 'pdf',
    credits_used: 0, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens,
    ai_model: mod.ai_model, generation_time_ms: 0,
  }).select('id').single()

  // payment에 generation_id 연결
  if (gen) await supabase.from('payments').update({ generation_id: gen.id }).eq('order_id', orderId)

  // uses 증가
  await supabase.from('modules').update({ uses: (mod.uses || 0) + 1 }).eq('id', moduleId)

  // sessionStorage 대신 DB에서 읽으므로 쿼리파라미터로 generation_id 전달
  return NextResponse.redirect(`${appUrl}/preview?id=${moduleId}&gid=${gen?.id || ''}`)
}
