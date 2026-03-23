'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

function Content() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, refresh } = useAuth()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [isSignUp, setIsSignUp] = useState(params.get('signup')==='1')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 이미 로그인된 상태면 마켓으로 리다이렉트
  useEffect(() => { if (user) router.replace('/market') }, [user])

  const submit = async () => {
    setError('')
    if (!email.trim()) { setError('이메일을 입력해주세요'); return }
    if (pw.length < 6) { setError('비밀번호는 6자 이상이어야 합니다'); return }
    setLoading(true)
    try {
      if (isSignUp) {
        const { data, error: e } = await supabase.auth.signUp({
          email: email.trim(),
          password: pw,
          options: { data: { email: email.trim() } }
        })
        if (e) { setError(e.message === 'User already registered' ? '이미 가입된 이메일입니다' : e.message); setLoading(false); return }
        if (data.user) {
          // profiles에 이미 존재하는지 확인 후 삽입
          const { data: existing } = await supabase.from('profiles').select('id').eq('id', data.user.id).single()
          if (!existing) {
            await supabase.from('profiles').insert({ id: data.user.id, email: email.trim(), credits: 3, role: 'user' })
          }
        }
        // 이메일 확인 없이 바로 로그인 시도
        if (data.session) {
          await refresh()
          router.push('/market')
        } else {
          // 이메일 확인이 필요한 경우 — 바로 로그인 시도
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
          if (signInErr) {
            setError('가입 완료! 이메일 확인 후 로그인해주세요.')
            setIsSignUp(false)
            setLoading(false)
            return
          }
          await refresh()
          router.push('/market')
        }
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
        if (e) {
          if (e.message === 'Invalid login credentials') setError('이메일 또는 비밀번호가 올바르지 않습니다')
          else if (e.message === 'Email not confirmed') setError('이메일 인증이 필요합니다. 받은 메일함을 확인해주세요.')
          else setError(e.message)
          setLoading(false)
          return
        }
        await refresh()
        router.push('/market')
      }
    } catch (e: any) { setError(e.message || '오류가 발생했습니다') }
    setLoading(false)
  }

  if (user) return <div className="pt-20 text-center text-[#63636E]">이동 중...</div>

  return (
    <div className="max-w-[380px] mx-auto pt-20 pb-16 animate-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-extrabold mb-1"><span className="text-white">crypee</span> <span className="text-[#00D4AA]">Agent</span></h1>
        <p className="text-xs text-[#63636E]">{isSignUp ? '계정을 만들고 3크레딧을 받으세요' : '로그인하세요'}</p>
      </div>
      <div className="bg-[#141417] border border-white/[.06] rounded-[10px] p-6">
        {error && <div className="mb-4 p-3 bg-[rgba(239,91,91,0.1)] border border-[rgba(239,91,91,0.2)] rounded-md text-xs text-[#EF5B5B]">{error}</div>}
        <div className="mb-3">
          <label className="block text-[11px] font-medium text-[#63636E] mb-1.5 uppercase tracking-wider">이메일</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@example.com" className="inp" autoComplete="email" />
        </div>
        <div className="mb-4">
          <label className="block text-[11px] font-medium text-[#63636E] mb-1.5 uppercase tracking-wider">비밀번호</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="6자 이상" onKeyDown={e => e.key === 'Enter' && submit()} className="inp" autoComplete={isSignUp ? 'new-password' : 'current-password'} />
        </div>
        <button onClick={submit} disabled={loading || !email || !pw} className="w-full py-2.5 bg-[#00D4AA] text-[#09090B] font-semibold text-[13px] rounded-md disabled:opacity-50 hover:bg-[#00E8BB] transition-all">
          {loading ? '처리 중...' : isSignUp ? '가입하기' : '로그인'}
        </button>
        <p className="text-center text-[12px] text-[#63636E] mt-4">
          {isSignUp ? '이미 계정이 있나요? ' : '계정이 없나요? '}
          <button onClick={() => { setIsSignUp(!isSignUp); setError('') }} className="text-[#00D4AA] hover:underline">
            {isSignUp ? '로그인' : '가입하기'}
          </button>
        </p>
      </div>
    </div>
  )
}
export default function LoginPage() { return <Suspense><Content /></Suspense> }
