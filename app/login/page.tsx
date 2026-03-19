'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function Content() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [isSignUp, setIsSignUp] = useState(params.get('signup')==='1')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError(''); if(pw.length<6){setError('비밀번호는 6자 이상');return}
    setLoading(true)
    try {
      if (isSignUp) {
        const { data, error: e } = await supabase.auth.signUp({ email, password: pw })
        if(e){setError(e.message);setLoading(false);return}
        if(data.user) await supabase.from('profiles').insert({id:data.user.id,email,credits:3,role:'user'})
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password: pw })
        if(e){setError(e.message);setLoading(false);return}
      }
      router.push('/market'); router.refresh()
    } catch(e:any){setError(e.message||'오류')}
    setLoading(false)
  }

  return (
    <div className="max-w-[380px] mx-auto pt-20 pb-16 animate-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-extrabold mb-1"><span className="text-white">crypee</span> <span className="text-[#00D4AA]">Agent</span></h1>
        <p className="text-xs text-[#63636E]">{isSignUp?'계정을 만들고 3크레딧을 받으세요':'로그인하세요'}</p>
      </div>
      <div className="bg-[#141417] border border-white/[.06] rounded-[10px] p-6">
        {error&&<div className="mb-4 p-3 bg-[rgba(239,91,91,0.1)] border border-[rgba(239,91,91,0.2)] rounded-md text-xs text-[#EF5B5B]">{error}</div>}
        <div className="mb-3"><label className="block text-[11px] font-medium text-[#63636E] mb-1.5 uppercase tracking-wider">이메일</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="hello@example.com" className="inp"/></div>
        <div className="mb-4"><label className="block text-[11px] font-medium text-[#63636E] mb-1.5 uppercase tracking-wider">비밀번호</label><input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="6자 이상" onKeyDown={e=>e.key==='Enter'&&submit()} className="inp"/></div>
        <button onClick={submit} disabled={loading||!email||!pw} className="w-full py-2.5 bg-[#00D4AA] text-[#09090B] font-semibold text-[13px] rounded-md disabled:opacity-50">{loading?'처리 중...':isSignUp?'가입하기':'로그인'}</button>
        <p className="text-center text-[12px] text-[#63636E] mt-4">{isSignUp?'이미 계정이 있나요? ':'계정이 없나요? '}<button onClick={()=>{setIsSignUp(!isSignUp);setError('')}} className="text-[#00D4AA] hover:underline">{isSignUp?'로그인':'가입하기'}</button></p>
      </div>
    </div>
  )
}
export default function LoginPage(){return<Suspense><Content/></Suspense>}
