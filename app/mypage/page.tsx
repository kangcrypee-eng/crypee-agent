'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

export default function MyPage() {
  const {user,credits,loading}=useAuth(); const router=useRouter(); const [gens,setGens]=useState<any[]>([])
  useEffect(()=>{if(!loading&&!user)router.push('/login');if(user)supabase.from('generations').select('*, modules(name, icon)').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50).then(({data})=>{if(data)setGens(data)})},[user,loading])
  if(loading)return<div className="pt-20 text-center text-[#63636E]">로딩 중...</div>
  if(!user)return null

  const viewResult=(g:any)=>{
    sessionStorage.setItem('lastResult',g.output_text||'');sessionStorage.setItem('lastModule',JSON.stringify({id:g.module_id,name:g.modules?.name||g.module_id,icon:g.modules?.icon||'📄',category:'',credit_cost:g.credits_used,output_formats:['pdf','docx','txt'],default_format:g.output_format||'pdf'}))
    router.push('/preview?id='+g.module_id)
  }

  return(
    <div className="pt-6 pb-16 animate-in">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="text-xl font-bold">마이페이지</h2><p className="text-xs text-[#63636E]">{user.business_name||user.email}</p></div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-[rgba(0,212,170,0.1)] border border-[rgba(0,212,170,0.2)] rounded-lg"><span className="text-xs text-[#63636E]">크레딧</span><span className="ml-2 text-lg font-bold text-[#00D4AA]">◆ {credits}</span></div>
          <button onClick={()=>router.push('/profile')} className="px-3 py-2 border border-white/10 rounded-md text-xs text-[#A1A1AA]">프로필 수정</button>
        </div>
      </div>
      {gens.length===0?<div className="bg-[#141417] border border-white/[.06] rounded-xl p-12 text-center"><p className="text-2xl mb-2">📂</p><p className="text-[13px] text-[#63636E]">아직 실행한 모듈이 없습니다</p><button onClick={()=>router.push('/market')} className="mt-3 px-4 py-2 bg-[#00D4AA] text-[#09090B] font-semibold text-xs rounded-md">모듈 마켓</button></div>
      :<div className="space-y-2">{gens.map(g=><div key={g.id} onClick={()=>viewResult(g)} className="bg-[#141417] border border-white/[.06] rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-white/10 hover:bg-[#1C1C20] transition-all"><div className="w-9 h-9 rounded-lg bg-[#1C1C20] flex items-center justify-center text-lg flex-shrink-0">{g.modules?.icon||'📄'}</div><div className="flex-1"><div className="font-semibold text-[13px]">{g.modules?.name||g.module_id}</div><div className="text-[11px] text-[#63636E] mt-0.5">{new Date(g.created_at).toLocaleDateString('ko')} · ◆{g.credits_used}</div></div><button onClick={e=>{e.stopPropagation();viewResult(g)}} className="px-3 py-1.5 border border-white/10 rounded-md text-[11px] text-[#A1A1AA] hover:bg-white/[.03]">보기</button></div>)}</div>}
    </div>
  )
}
