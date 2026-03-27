'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      // URL에서 코드 추출하여 세션 교환
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Auth callback error:', error)
        router.push('/login?error=auth_failed')
        return
      }

      if (session?.user) {
        // 프로필 존재 확인 → 없으면 생성 (카카오 첫 로그인)
        const { data: existing } = await supabase.from('profiles').select('id').eq('id', session.user.id).single()
        if (!existing) {
          const meta = session.user.user_metadata || {}
          await supabase.from('profiles').insert({
            id: session.user.id,
            email: session.user.email || meta.email || '',
            representative: meta.name || meta.full_name || '',
            credits: 0,
            role: 'user',
          })
        }
        router.push('/market')
      } else {
        router.push('/login')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="pt-20 text-center animate-in" style={{color:'var(--text-muted)'}}>
      <div className="spinner mx-auto mb-4" />
      <p className="text-[13px]">로그인 처리 중...</p>
    </div>
  )
}
