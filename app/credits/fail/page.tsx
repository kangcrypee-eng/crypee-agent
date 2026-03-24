'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function FailContent() {
  const params = useSearchParams()
  const router = useRouter()
  const message = params.get('message') || '결제에 실패했습니다'

  return (
    <div className="max-w-[480px] mx-auto pt-20 pb-20 text-center animate-in">
      <div className="rounded-xl p-10 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
        <div className="text-5xl mb-4">😥</div>
        <h1 className="text-xl font-bold mb-2">결제 실패</h1>
        <p className="text-[13px] mb-6 leading-relaxed" style={{color:'var(--text-secondary)'}}>{message}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => router.push('/credits')} className="px-5 py-2.5 font-semibold text-[13px] rounded-lg" style={{background:'var(--accent)',color:'var(--bg)'}}>다시 시도</button>
          <button onClick={() => router.push('/market')} className="px-5 py-2.5 text-[13px] rounded-lg border" style={{borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>마켓으로</button>
        </div>
      </div>
    </div>
  )
}

export default function FailPage() {
  return <Suspense fallback={<div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>로딩 중...</div>}><FailContent /></Suspense>
}
