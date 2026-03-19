'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

function Pv() {
  const params=useSearchParams();const router=useRouter();const{user}=useAuth()
  const id=params.get('id')||''
  const[m,setM]=useState<any>(null);const[result,setResult]=useState('');const[chains,setChains]=useState<any[]>([]);const[fmt,setFmt]=useState('pdf');const[ld,setLd]=useState(true)
  const[editing,setEditing]=useState(false);const[editText,setEditText]=useState('');const[saving,setSaving]=useState(false)
  const textareaRef=useRef<HTMLTextAreaElement>(null)

  useEffect(()=>{
    supabase.from('modules').select('*').eq('id',id).single().then(({data:mod})=>{
      if(mod){setM(mod);setFmt(mod.default_format||'pdf');if(mod.chain_next?.length)supabase.from('modules').select('id,name,icon').in('id',mod.chain_next).then(({data})=>{if(data)setChains(data)})}
      const s=sessionStorage.getItem('lastResult');setResult(s||'(결과물을 불러올 수 없습니다. 모듈을 다시 실행해주세요.)');setLd(false)
    })
  },[id])

  const startEdit=()=>{setEditText(result);setEditing(true);setTimeout(()=>{if(textareaRef.current){textareaRef.current.style.height='auto';textareaRef.current.style.height=textareaRef.current.scrollHeight+'px'}},50)}
  const cancelEdit=()=>{setEditing(false);setEditText('')}
  const saveEdit=async()=>{
    setSaving(true)
    setResult(editText);sessionStorage.setItem('lastResult',editText)
    if(user){
      const{data:gen}=await supabase.from('generations').select('id').eq('user_id',user.id).eq('module_id',id).order('created_at',{ascending:false}).limit(1).single()
      if(gen)await supabase.from('generations').update({output_text:editText}).eq('id',gen.id)
    }
    setEditing(false);setSaving(false)
  }

  const dl=()=>{const text=editing?editText:result;if(!text||!m)return;const b=new Blob([text],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=m.name+'.'+(fmt==='pdf'?'txt':fmt);a.click()}
  const render=(t:string)=>t.replace(/^### (.+)$/gm,'<h3 style="font-size:14px;font-weight:600;color:#333;margin:14px 0 6px">$1</h3>').replace(/^## (.+)$/gm,'<h2 style="font-size:16px;font-weight:600;color:#222;margin:22px 0 10px;padding-bottom:6px;border-bottom:1px solid #e8e8e8">$1</h2>').replace(/^# (.+)$/gm,'<h1 style="font-size:20px;font-weight:700;color:#111;margin-bottom:8px">$1</h1>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n\n/g,'</p><p style="margin-bottom:10px">').replace(/\n/g,'<br>')

  if(ld)return<div className="pt-20 text-center text-[#63636E]">로딩 중...</div>
  if(!m)return<div className="pt-20 text-center text-[#63636E]">모듈 없음</div>

  return(
    <div className="max-w-[760px] mx-auto pt-6 pb-16 animate-in">
      <button onClick={()=>router.push('/market')} className="text-[12.5px] text-[#63636E] hover:text-[#A1A1AA] mb-3 inline-block">← 마켓</button>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div><h2 className="text-[17px] font-bold">{m.icon} {m.name}</h2><p className="text-[12px] text-[#63636E]">{m.category} · ◆{m.credit_cost}</p></div>
        <div className="flex gap-1.5">
          <select value={fmt} onChange={e=>setFmt(e.target.value)} className="px-2.5 py-1.5 border border-white/10 rounded-[5px] text-[12px] bg-[#141417] text-white">{(m.output_formats||['pdf']).map((f:string)=><option key={f}>{f.toUpperCase()}</option>)}</select>
          <button onClick={dl} className="px-3 py-1.5 bg-[#00D4AA] text-[#09090B] font-semibold text-[12px] rounded-md">다운로드</button>
          {!editing?<button onClick={startEdit} className="px-3 py-1.5 border border-white/10 text-[#A1A1AA] text-[12px] rounded-md hover:bg-white/[.03]">수정하기</button>
          :<><button onClick={saveEdit} disabled={saving} className="px-3 py-1.5 bg-[#5B8DEF] text-white font-semibold text-[12px] rounded-md disabled:opacity-50">{saving?'저장 중...':'수정 완료'}</button>
          <button onClick={cancelEdit} className="px-3 py-1.5 border border-white/10 text-[#63636E] text-[12px] rounded-md">취소</button></>}
          <button onClick={()=>router.push('/execute?id='+m.id)} className="px-3 py-1.5 border border-white/10 text-[#A1A1AA] text-[12px] rounded-md">재실행</button>
        </div>
      </div>
      <div className="border border-white/10 rounded-[10px] overflow-hidden">
        <div className="flex items-center gap-2 px-3.5 py-2 bg-[#1C1C20] border-b border-white/[.06]">
          <div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-[#FF5F57]"/><span className="w-2 h-2 rounded-full bg-[#FEBC2E]"/><span className="w-2 h-2 rounded-full bg-[#28C840]"/></div>
          <div className="flex-1 bg-[#111114] border border-white/[.06] rounded px-2.5 py-1 text-[11px] text-[#63636E] font-mono">{m.id.toLowerCase()}-output.{fmt}</div>
          {editing&&<span className="text-[10px] text-[#5B8DEF] font-semibold">편집 모드</span>}
        </div>
        {editing?<textarea ref={textareaRef} value={editText} onChange={e=>{setEditText(e.target.value);if(textareaRef.current){textareaRef.current.style.height='auto';textareaRef.current.style.height=textareaRef.current.scrollHeight+'px'}}} className="w-full min-h-[480px] p-7 bg-[#FAFAF8] text-[#1a1a1a] text-[13.5px] leading-[1.8] font-mono resize-none outline-none" spellCheck={false}/>
        :<div className="p-7 min-h-[480px] bg-[#FAFAF8] text-[#1a1a1a] text-[13.5px] leading-[1.8]" dangerouslySetInnerHTML={{__html:'<p>'+render(result)+'</p>'}}/>}
      </div>
      {chains.length>0&&<div className="bg-[#141417] border border-white/[.06] rounded-[10px] p-4 mt-3"><p className="text-[12px] font-semibold text-[#63636E] mb-2">🔗 연결 모듈</p><div className="flex gap-1.5 flex-wrap">{chains.map(c=><button key={c.id} onClick={()=>router.push('/execute?id='+c.id)} className="px-3 py-1.5 border border-white/10 rounded-md text-[12px] text-[#A1A1AA]">{c.icon} {c.name}</button>)}</div></div>}
    </div>
  )
}
export default function PreviewPage(){return<Suspense fallback={<div className="pt-20 text-center text-[#63636E]">로딩 중...</div>}><Pv/></Suspense>}
