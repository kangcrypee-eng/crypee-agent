'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 크레딧 충전 페이지는 더 이상 사용하지 않음 → 마이페이지로 리다이렉트
export default function CreditsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/mypage') }, [])
  return <div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>이동 중...</div>
}
