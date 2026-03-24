'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

export default function MyPage() {
  const {user,loading}=useAuth(); const router=useRouter()
  const [tab,setTab]=useState<'results'|'payments'>('results')
  const [gens,setGens]=useState<any[]>([])
  const [payments,setPayments]=useState<any[]>([])

  useEffect(()=>{
    if(!loading&&!user)router.push('/login')
    if(user){
      supabase.from('generations').select('*, modules(name, icon)').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50).then(({data})=>{if(data)setGens(data)})
      supabase.from('payments').select('*, modules:module_id(name, icon)').eq('user_id',user.id).eq('status','paid').order('paid_at',{ascending:false}).limit(50).then(({data})=>{if(data)setPayments(data)})
    }
  },[user,loading])

  if(loading)return<div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>로딩 중...</div>
  if(!user)return null

  const viewResult=(g:any)=>{
    sessionStorage.setItem('lastResult',g.output_text||'');sessionStorage.setItem('lastModule',JSON.stringify({id:g.module_id,name:g.modules?.name||g.module_id,icon:g.modules?.icon||'📄',category:'',credit_cost:0,price_krw:0,output_formats:['pdf','docx','txt'],default_format:g.output_format||'pdf'}))
    router.push('/preview?id='+g.module_id)
  }

  return(
    <div className="pt-6 pb-16 animate-in">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="text-xl font-bold">마이페이지</h2><p className="text-xs" style={{color:'var(--text-muted)'}}>{user.business_name||user.email}</p></div>
        <button onClick={()=>router.push('/profile')} className="px-3 py-2 rounded-md text-xs border" style={{borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>프로필 수정</button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4">
        <button onClick={()=>setTab('results')} className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all" style={tab==='results'?{background:'var(--accent-bg)',color:'var(--accent)'}:{color:'var(--text-muted)'}}>생성 결과물</button>
        <button onClick={()=>setTab('payments')} className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all" style={tab==='payments'?{background:'var(--accent-bg)',color:'var(--accent)'}:{color:'var(--text-muted)'}}>결제 내역</button>
      </div>

      {tab==='results'&&<>
        {gens.length===0?<div className="rounded-xl p-12 text-center border" style={{background:'var(--surface)',borderColor:'var(--border)'}}><p className="text-2xl mb-2">📂</p><p className="text-[13px]" style={{color:'var(--text-muted)'}}>아직 실행한 모듈이 없습니다</p><button onClick={()=>router.push('/market')} className="mt-3 px-4 py-2 font-semibold text-xs rounded-md" style={{background:'var(--accent)',color:'var(--bg)'}}>모듈 마켓</button></div>
        :<div className="space-y-2">{gens.map(g=><div key={g.id} onClick={()=>viewResult(g)} className="rounded-xl p-4 flex items-center gap-3 cursor-pointer border transition-all hover:opacity-90" style={{background:'var(--surface)',borderColor:'var(--border)'}}><div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{background:'var(--surface-hover)'}}>{g.modules?.icon||'📄'}</div><div className="flex-1"><div className="font-semibold text-[13px]">{g.modules?.name||g.module_id}</div><div className="text-[11px] mt-0.5" style={{color:'var(--text-muted)'}}>{new Date(g.created_at).toLocaleDateString('ko')}</div></div><button onClick={e=>{e.stopPropagation();viewResult(g)}} className="px-3 py-1.5 rounded-md text-[11px] border hover:opacity-80" style={{borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>보기</button></div>)}</div>}
      </>}

      {tab==='payments'&&<>
        {payments.length===0?<div className="rounded-xl p-12 text-center border" style={{background:'var(--surface)',borderColor:'var(--border)'}}><p className="text-2xl mb-2">💳</p><p className="text-[13px]" style={{color:'var(--text-muted)'}}>결제 내역이 없습니다</p></div>
        :<div className="space-y-2">{payments.map(p=><div key={p.id} className="rounded-xl p-4 flex items-center gap-3 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}><div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{background:'var(--surface-hover)'}}>{p.modules?.icon||'💳'}</div><div className="flex-1"><div className="font-semibold text-[13px]">{p.modules?.name||p.module_id}</div><div className="text-[11px] mt-0.5" style={{color:'var(--text-muted)'}}>{new Date(p.paid_at).toLocaleDateString('ko')} · ₩{(p.amount||0).toLocaleString()}</div></div><span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{background:'var(--accent-bg)',color:'var(--accent)'}}>{p.status==='paid'?'결제완료':p.status==='refunded'?'환불됨':p.status}</span></div>)}</div>}
      </>}
    </div>
  )
}
