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

  useEffect(() => { if (user) router.replace('/market') }, [user])

  const toKoreanError = (msg: string) => {
    if (msg.includes('Invalid login credentials') || msg.includes('Invalid email or password')) return '이메일 또는 비밀번호가 올바르지 않습니다'
    if (msg.includes('Email not confirmed')) return '이메일 인증이 필요합니다. 받은 메일함을 확인해주세요.'
    if (msg.includes('User already registered')) return '이미 가입된 이메일입니다'
    if (msg.includes('Password should be at least') || msg.includes('password')) return '비밀번호는 6자 이상이어야 합니다'
    if (msg.includes('Unable to validate email') || msg.includes('invalid format') || msg.includes('valid email')) return '올바른 이메일 형식이 아닙니다'
    if (msg.includes('rate limit') || msg.includes('Too many')) return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요'
    if (msg.includes('Email link is invalid') || msg.includes('expired')) return '링크가 만료되었습니다. 다시 시도해주세요'
    return '오류가 발생했습니다. 다시 시도해주세요'
  }

  const submit = async () => {
    setError('')
    if (!email.trim()) { setError('이메일을 입력해주세요'); return }
    if (pw.length < 6) { setError('비밀번호는 6자 이상이어야 합니다'); return }
    setLoading(true)
    try {
      if (isSignUp) {
        const { data, error: e } = await supabase.auth.signUp({
          email: email.trim(), password: pw,
          options: { data: { email: email.trim() } }
        })
        if (e) { setError(toKoreanError(e.message)); setLoading(false); return }
        if (data.user) {
          const { data: existing } = await supabase.from('profiles').select('id').eq('id', data.user.id).single()
          if (!existing) await supabase.from('profiles').insert({ id: data.user.id, email: email.trim(), credits: 0, role: 'user' })
        }
        if (data.session) { await refresh(); router.push('/market') }
        else {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
          if (signInErr) { setError('가입 완료! 이메일 확인 후 로그인해주세요.'); setIsSignUp(false); setLoading(false); return }
          await refresh(); router.push('/market')
        }
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
        if (e) { setError(toKoreanError(e.message)); setLoading(false); return }
        await refresh(); router.push('/market')
      }
    } catch (e: any) { setError('오류가 발생했습니다. 다시 시도해주세요') }
    setLoading(false)
  }

  // 카카오 로그인
  const loginWithKakao = async () => {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) setError('카카오 로그인 오류: ' + error.message)
  }

  if (user) return <div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>이동 중...</div>

  return (
    <div className="max-w-[380px] mx-auto pt-20 pb-16 animate-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-extrabold mb-1"><span style={{color:'var(--text)'}}>crypee</span> <span style={{color:'var(--accent)'}}>Agent</span></h1>
        <p className="text-xs" style={{color:'var(--text-muted)'}}>{isSignUp ? '계정을 만들고 시작하세요' : '로그인하세요'}</p>
      </div>
      <div className="rounded-[10px] p-6 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
        {error && <div className="mb-4 p-3 rounded-md text-xs border" style={{background:'var(--error-bg)',borderColor:'var(--error-border)',color:'var(--error-text)'}}>{error}</div>}

        {/* 카카오 로그인 */}
        <button onClick={loginWithKakao} className="w-full py-2.5 font-semibold text-[13px] rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2 mb-4" style={{background:'#FEE500',color:'#191919'}}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#191919" d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.45 4.08 3.64 5.18-.16.56-.58 2.03-.67 2.35-.1.39.14.39.3.28.12-.08 1.94-1.32 2.73-1.86.65.09 1.32.14 2 .14 4.42 0 8-2.79 8-6.21S13.42 1 9 1"/></svg>
          카카오로 시작하기
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{background:'var(--border)'}}/>
          <span className="text-[11px]" style={{color:'var(--text-muted)'}}>또는</span>
          <div className="flex-1 h-px" style={{background:'var(--border)'}}/>
        </div>

        {/* 이메일 로그인 */}
        <div className="mb-3">
          <label className="block text-[11px] font-medium mb-1.5 uppercase tracking-wider" style={{color:'var(--text-muted)'}}>이메일</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@example.com" className="inp" autoComplete="email" />
        </div>
        <div className="mb-4">
          <label className="block text-[11px] font-medium mb-1.5 uppercase tracking-wider" style={{color:'var(--text-muted)'}}>비밀번호</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="6자 이상" onKeyDown={e => e.key === 'Enter' && submit()} className="inp" autoComplete={isSignUp ? 'new-password' : 'current-password'} />
        </div>
        <button onClick={submit} disabled={loading || !email || !pw} className="w-full py-2.5 font-semibold text-[13px] rounded-md disabled:opacity-50 hover:opacity-90 transition-all" style={{background:'var(--accent)',color:'var(--bg)'}}>
          {loading ? '처리 중...' : isSignUp ? '이메일로 가입하기' : '이메일로 로그인'}
        </button>
        <p className="text-center text-[12px] mt-4" style={{color:'var(--text-muted)'}}>
          {isSignUp ? '이미 계정이 있나요? ' : '계정이 없나요? '}
          <button onClick={() => { setIsSignUp(!isSignUp); setError('') }} className="hover:underline" style={{color:'var(--accent)'}}>
            {isSignUp ? '로그인' : '가입하기'}
          </button>
        </p>
      </div>
    </div>
  )
}
export default function LoginPage() { return <Suspense><Content /></Suspense> }
