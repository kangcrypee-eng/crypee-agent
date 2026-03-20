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
      <div className="bg-[#141417] border border-white/[.06] rounded-xl p-10">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-xl font-bold mb-2">충전 완료!</h1>
        <p className="text-[14px] text-[#A1A1AA] mb-1">
          <span className="text-[#00D4AA] font-bold text-lg">◆ {credits}</span> 크레딧이 추가되었습니다
        </p>
        <p className="text-[12px] text-[#63636E] mb-6">크레딧은 즉시 사용 가능합니다.</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => router.push('/market')} className="px-5 py-2.5 bg-[#00D4AA] text-[#09090B] font-semibold text-[13px] rounded-lg">모듈 마켓으로</button>
          <button onClick={() => router.push('/mypage')} className="px-5 py-2.5 border border-white/10 text-[#A1A1AA] text-[13px] rounded-lg">마이페이지</button>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return <Suspense fallback={<div className="pt-20 text-center text-[#63636E]">로딩 중...</div>}><SuccessContent /></Suspense>
}
