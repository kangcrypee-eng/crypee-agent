'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { useAuth } from '@/components/AuthProvider'

function SuccessContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { refresh } = useAuth()
  const credits = params.get('credits') || '0'

  // 결제 완료 후 프로필 데이터 리프레시하여 크레딧 갱신
  useEffect(() => { refresh() }, [])

  return (
    <div className="max-w-[480px] mx-auto pt-20 pb-20 text-center animate-in">
      <div className="rounded-xl p-10 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-xl font-bold mb-2">충전 완료!</h1>
        <p className="text-[14px] mb-1" style={{color:'var(--text-secondary)'}}>
          <span className="font-bold text-lg" style={{color:'var(--accent)'}}>◆ {credits}</span> 크레딧이 추가되었습니다
        </p>
        <p className="text-[12px] mb-6" style={{color:'var(--text-muted)'}}>크레딧은 즉시 사용 가능합니다.</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => router.push('/market')} className="px-5 py-2.5 font-semibold text-[13px] rounded-lg" style={{background:'var(--accent)',color:'var(--bg)'}}>모듈 마켓으로</button>
          <button onClick={() => router.push('/mypage')} className="px-5 py-2.5 text-[13px] rounded-lg border" style={{borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>마이페이지</button>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return <Suspense fallback={<div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>로딩 중...</div>}><SuccessContent /></Suspense>
}
