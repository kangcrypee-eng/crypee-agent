'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

const PLANS = [
  { id: 'plan_10', credits: 10, price: 15000, perCredit: 1500, label: '', color: '' },
  { id: 'plan_30', credits: 30, price: 39000, perCredit: 1300, label: '인기', color: 'accent' },
  { id: 'plan_100', credits: 100, price: 99000, perCredit: 990, label: '최저가', color: 'blue' },
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

  const planBorderStyle = (plan: typeof PLANS[number], isSelected: boolean) => {
    if (!isSelected) return { borderColor: 'var(--border)', background: 'transparent' }
    if (plan.color === 'accent') return { borderColor: 'var(--accent-border)', boxShadow: '0 0 0 1px var(--accent-border)', background: 'var(--accent-bg)' }
    if (plan.color === 'blue') return { borderColor: 'rgba(91,141,239,0.3)', boxShadow: '0 0 0 1px rgba(91,141,239,0.2)', background: 'rgba(91,141,239,0.05)' }
    return { borderColor: 'var(--border)', background: 'var(--accent-bg)' }
  }

  if (loading) return <div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>로딩 중...</div>
  if (!user) return null

  return (
    <div className="max-w-[600px] mx-auto pt-8 pb-20 animate-in">
      <h1 className="text-xl font-bold mb-1">크레딧 충전</h1>
      <p className="text-[12px] mb-6" style={{color:'var(--text-muted)'}}>현재 보유: <span className="font-semibold" style={{color:'var(--accent)'}}>◆ {credits}</span></p>

      <div className="space-y-3 mb-6">
        {PLANS.map(plan => (
          <button key={plan.id} onClick={() => setSelected(plan.id)}
            className="w-full p-5 rounded-xl border text-left transition-all"
            style={planBorderStyle(plan, selected === plan.id)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{borderColor: selected === plan.id ? 'var(--accent)' : 'var(--border-strong)'}}>
                  {selected === plan.id && <div className="w-2.5 h-2.5 rounded-full" style={{background:'var(--accent)'}} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold" style={{color:'var(--text)'}}>◆ {plan.credits} 크레딧</span>
                    {plan.label && <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={plan.label === '인기' ? {background:'var(--mode-oneclick-bg)',color:'var(--mode-oneclick-text)'} : {background:'var(--mode-form-bg)',color:'var(--mode-form-text)'}}>{plan.label}</span>}
                  </div>
                  <span className="text-[11px]" style={{color:'var(--text-muted)'}}>크레딧당 ₩{plan.perCredit.toLocaleString()}</span>
                </div>
              </div>
              <span className="text-[17px] font-bold" style={{color:'var(--text)'}}>₩{plan.price.toLocaleString()}</span>
            </div>
          </button>
        ))}
      </div>

      <button onClick={handlePayment} disabled={paying}
        className="w-full py-3.5 font-bold text-[14px] rounded-lg hover:opacity-90 disabled:opacity-50 transition-all" style={{background:'var(--accent)',color:'var(--bg)'}}>
        {paying ? '결제 준비 중...' : `₩${(PLANS.find(p => p.id === selected)?.price || 0).toLocaleString()} 결제하기`}
      </button>

      <div className="mt-6 rounded-xl p-5 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
        <p className="text-[12px] font-semibold mb-2" style={{color:'var(--text-secondary)'}}>안내</p>
        <ul className="text-[11.5px] space-y-1 leading-relaxed" style={{color:'var(--text-muted)'}}>
          <li>· 크레딧은 구매일로부터 5년간 유효합니다.</li>
          <li>· 구매 후 7일 이내 미사용분에 한해 환불 가능합니다.</li>
          <li>· 무료 크레딧은 환불 대상이 아닙니다.</li>
          <li>· 결제 관련 문의: contact@crypee.io</li>
        </ul>
      </div>
    </div>
  )
}
