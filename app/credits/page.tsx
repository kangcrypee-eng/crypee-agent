'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

const PLANS = [
  { id: 'plan_10', credits: 10, price: 15000, perCredit: 1500, label: '', color: 'border-white/[.06]' },
  { id: 'plan_30', credits: 30, price: 39000, perCredit: 1300, label: '인기', color: 'border-[#00D4AA]/30 ring-1 ring-[#00D4AA]/20' },
  { id: 'plan_100', credits: 100, price: 99000, perCredit: 990, label: '최저가', color: 'border-[#5B8DEF]/30 ring-1 ring-[#5B8DEF]/20' },
]

export default function CreditsPage() {
  const { user, credits, loading } = useAuth()
  const router = useRouter()
  const [selected, setSelected] = useState('plan_30')
  const [paying, setPaying] = useState(false)

  useEffect(() => { if (!loading && !user) router.push('/login') }, [user, loading])

  const handlePayment = async () => {
    if (!user) return
    const plan = PLANS.find(p => p.id === selected)
    if (!plan) return

    setPaying(true)
    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      if (!clientKey || clientKey === 'test_ck_xxx') {
        alert('토스페이먼츠 클라이언트 키가 설정되지 않았습니다. .env.local의 NEXT_PUBLIC_TOSS_CLIENT_KEY를 설정해주세요.')
        setPaying(false)
        return
      }
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk')
      const tossPayments = await loadTossPayments(clientKey)
      const payment = tossPayments.payment({ customerKey: user.id })

      const orderId = `crypee-${user.id.substring(0, 8)}-${Date.now()}`
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: plan.price },
        orderId,
        orderName: `crypee Agent 크레딧 ${plan.credits}개`,
        successUrl: `${appUrl}/api/payment/success?credits=${plan.credits}&userId=${user.id}`,
        failUrl: `${appUrl}/api/payment/fail`,
      })
    } catch (e: any) {
      if (e?.code !== 'USER_CANCEL') alert('결제 오류: ' + (e?.message || '알 수 없는 오류'))
    }
    setPaying(false)
  }

  if (loading) return <div className="pt-20 text-center text-[#63636E]">로딩 중...</div>
  if (!user) return null

  return (
    <div className="max-w-[600px] mx-auto pt-8 pb-20 animate-in">
      <h1 className="text-xl font-bold mb-1">크레딧 충전</h1>
      <p className="text-[12px] text-[#63636E] mb-6">현재 보유: <span className="text-[#00D4AA] font-semibold">◆ {credits}</span></p>

      <div className="space-y-3 mb-6">
        {PLANS.map(plan => (
          <button key={plan.id} onClick={() => setSelected(plan.id)}
            className={`w-full p-5 rounded-xl border text-left transition-all ${selected === plan.id ? plan.color + ' bg-white/[.02]' : 'border-white/[.06] hover:border-white/10'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected === plan.id ? 'border-[#00D4AA]' : 'border-white/20'}`}>
                  {selected === plan.id && <div className="w-2.5 h-2.5 rounded-full bg-[#00D4AA]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-white">◆ {plan.credits} 크레딧</span>
                    {plan.label && <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${plan.label === '인기' ? 'bg-[rgba(0,212,170,0.1)] text-[#00D4AA]' : 'bg-[rgba(91,141,239,0.1)] text-[#5B8DEF]'}`}>{plan.label}</span>}
                  </div>
                  <span className="text-[11px] text-[#63636E]">크레딧당 ₩{plan.perCredit.toLocaleString()}</span>
                </div>
              </div>
              <span className="text-[17px] font-bold text-white">₩{plan.price.toLocaleString()}</span>
            </div>
          </button>
        ))}
      </div>

      <button onClick={handlePayment} disabled={paying}
        className="w-full py-3.5 bg-[#00D4AA] text-[#09090B] font-bold text-[14px] rounded-lg hover:bg-[#00E8BB] disabled:opacity-50 transition-all">
        {paying ? '결제 준비 중...' : `₩${(PLANS.find(p => p.id === selected)?.price || 0).toLocaleString()} 결제하기`}
      </button>

      <div className="mt-6 bg-[#141417] border border-white/[.06] rounded-xl p-5">
        <p className="text-[12px] font-semibold text-[#A1A1AA] mb-2">안내</p>
        <ul className="text-[11.5px] text-[#63636E] space-y-1 leading-relaxed">
          <li>· 크레딧은 구매일로부터 5년간 유효합니다.</li>
          <li>· 구매 후 7일 이내 미사용분에 한해 환불 가능합니다.</li>
          <li>· 무료 크레딧은 환불 대상이 아닙니다.</li>
          <li>· 결제 관련 문의: contact@crypee.io</li>
        </ul>
      </div>
    </div>
  )
}
