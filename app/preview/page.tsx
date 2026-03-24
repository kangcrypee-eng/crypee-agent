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
  const[genId,setGenId]=useState('');const[regenCount,setRegenCount]=useState(0);const[regenerating,setRegenerating]=useState(false);const[regenProg,setRegenProg]=useState(0)
  const textareaRef=useRef<HTMLTextAreaElement>(null)

  useEffect(()=>{
    supabase.from('modules').select('*').eq('id',id).single().then(({data:mod})=>{
      if(mod){setM(mod);setFmt(mod.default_format||'pdf');if(mod.chain_next?.length)supabase.from('modules').select('id,name,icon').in('id',mod.chain_next).then(({data})=>{if(data)setChains(data)})}
      const s=sessionStorage.getItem('lastResult');setResult(s||'(결과물을 불러올 수 없습니다. 모듈을 다시 실행해주세요.)');setLd(false)
    })
    // 최근 generation 정보 가져오기 (재생성 카운트용)
    if(user){
      supabase.from('generations').select('id,regen_count').eq('user_id',user.id).eq('module_id',id).order('created_at',{ascending:false}).limit(1).single().then(({data})=>{
        if(data){setGenId(data.id);setRegenCount(data.regen_count||0)}
      })
    }
  },[id,user])

  const startEdit=()=>{setEditText(result);setEditing(true);setTimeout(()=>{if(textareaRef.current){textareaRef.current.style.height='auto';textareaRef.current.style.height=textareaRef.current.scrollHeight+'px'}},50)}
  const cancelEdit=()=>{setEditing(false);setEditText('')}
  const saveEdit=async()=>{
    setSaving(true);setResult(editText);sessionStorage.setItem('lastResult',editText)
    if(user&&genId){await supabase.from('generations').update({output_text:editText}).eq('id',genId)}
    setEditing(false);setSaving(false)
  }

  const handleRegen=async()=>{
    if(!m||!user)return
    const isFree=regenCount===0
    const price=m.price_krw||0
    if(!isFree&&price>0&&!confirm(`재생성에 ₩${price.toLocaleString()}이 결제됩니다. 계속할까요?`))return

    setRegenerating(true)
    for(let i=0;i<4;i++){setRegenProg((i+1)*25);await new Promise(r=>setTimeout(r,600))}

    const pd:Record<string,string>={}
    for(const k of['business_name','representative','business_number','business_type','sector','item','service_desc','target_customer','track_record','address','phone','email'])pd[k]=(user as any)[k]||''
    // 이전 입력 데이터 복원
    if(genId){
      const{data:genData}=await supabase.from('generations').select('input_data').eq('id',genId).single()
      if(genData?.input_data){for(const[k,v]of Object.entries(genData.input_data)){if(typeof v==='string')pd[k]=v}}
    }

    try{
      const res=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({moduleId:m.id,systemPrompt:m.system_prompt,userPrompt:m.user_prompt_template,aiModel:m.ai_model,maxTokens:m.max_tokens,temperature:m.temperature,profileData:pd,additionalData:{}})})
      const data=await res.json()
      if(!data.success){alert('재생성 실패: '+(data.error||'알 수 없는 오류'));setRegenerating(false);return}

      // DB 업데이트
      if(genId){
        await supabase.from('generations').update({output_text:data.result,regen_count:regenCount+1,input_tokens:data.usage?.input_tokens,output_tokens:data.usage?.output_tokens,generation_time_ms:data.usage?.generation_time_ms}).eq('id',genId)
      }

      // 유료 재생성인 경우 결제 기록
      if(!isFree&&(m.price_krw||0)>0){
        await supabase.from('payments').insert({user_id:user.id,module_id:m.id,order_id:`regen-${user.id.substring(0,8)}-${Date.now()}`,amount:m.price_krw,status:'paid',paid_at:new Date().toISOString()})
      }

      setResult(data.result);sessionStorage.setItem('lastResult',data.result)
      setRegenCount(regenCount+1)
    }catch(e){alert('재생성 실패')}
    setRegenerating(false);setRegenProg(0)
  }

  const dl=()=>{const text=editing?editText:result;if(!text||!m)return;const b=new Blob([text],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=m.name+'.'+(fmt==='pdf'?'txt':fmt);a.click()}
  const render=(t:string)=>t.replace(/^### (.+)$/gm,'<h3 style="font-size:14px;font-weight:600;color:#333;margin:14px 0 6px">$1</h3>').replace(/^## (.+)$/gm,'<h2 style="font-size:16px;font-weight:600;color:#222;margin:22px 0 10px;padding-bottom:6px;border-bottom:1px solid #e8e8e8">$1</h2>').replace(/^# (.+)$/gm,'<h1 style="font-size:20px;font-weight:700;color:#111;margin-bottom:8px">$1</h1>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n\n/g,'</p><p style="margin-bottom:10px">').replace(/\n/g,'<br>')

  if(ld)return<div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>로딩 중...</div>
  if(!m)return<div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>모듈 없음</div>

  const isFreeRegen=regenCount===0

  return(
    <div className="max-w-[760px] mx-auto pt-6 pb-16 animate-in">
      <button onClick={()=>router.push('/market')} className="text-[12.5px] hover:opacity-70 mb-3 inline-block" style={{color:'var(--text-muted)'}}>← 마켓</button>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div><h2 className="text-[17px] font-bold">{m.icon} {m.name}</h2><p className="text-[12px]" style={{color:'var(--text-muted)'}}>{m.category}</p></div>
        <div className="flex gap-1.5 flex-wrap">
          <select value={fmt} onChange={e=>setFmt(e.target.value)} className="px-2.5 py-1.5 rounded-[5px] text-[12px] border" style={{background:'var(--surface)',borderColor:'var(--border-strong)',color:'var(--text)'}}>{(m.output_formats||['pdf']).map((f:string)=><option key={f}>{f.toUpperCase()}</option>)}</select>
          <button onClick={dl} className="px-3 py-1.5 font-semibold text-[12px] rounded-md" style={{background:'var(--accent)',color:'var(--bg)'}}>다운로드</button>
          {!editing?<button onClick={startEdit} className="px-3 py-1.5 rounded-md text-[12px] border hover:opacity-80" style={{borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>수정하기</button>
          :<><button onClick={saveEdit} disabled={saving} className="px-3 py-1.5 font-semibold text-[12px] rounded-md disabled:opacity-50" style={{background:'#5B8DEF',color:'white'}}>{saving?'저장 중...':'수정 완료'}</button>
          <button onClick={cancelEdit} className="px-3 py-1.5 rounded-md text-[12px] border" style={{borderColor:'var(--border-strong)',color:'var(--text-muted)'}}>취소</button></>}
          <button onClick={handleRegen} disabled={regenerating} className="px-3 py-1.5 border rounded-md text-[12px] disabled:opacity-50 hover:opacity-80" style={isFreeRegen?{borderColor:'var(--accent-border)',color:'var(--accent)'}:{borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>
            {regenerating?'생성 중...':isFreeRegen?'🔄 재생성 (1회 무료)':`🔄 재생성 · ₩${(m.price_krw||0).toLocaleString()}`}
          </button>
        </div>
      </div>

      {regenerating&&<div className="rounded-[10px] p-6 mb-3 text-center border" style={{background:'var(--surface)',borderColor:'var(--border)'}}><div className="spinner mx-auto mb-2.5"/><p className="text-[13px] font-medium">재생성 중...</p><div className="mt-2.5 rounded h-[3px] max-w-[240px] mx-auto overflow-hidden" style={{background:'var(--surface-hover)'}}><div className="h-full rounded transition-all duration-500" style={{width:regenProg+'%',background:'var(--accent)'}}/></div></div>}

      <div className="rounded-[10px] overflow-hidden border" style={{borderColor:'var(--border-strong)'}}>
        <div className="flex items-center gap-2 px-3.5 py-2 border-b" style={{background:'var(--surface-hover)',borderColor:'var(--border)'}}>
          <div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-[#FF5F57]"/><span className="w-2 h-2 rounded-full bg-[#FEBC2E]"/><span className="w-2 h-2 rounded-full bg-[#28C840]"/></div>
          <div className="flex-1 rounded px-2.5 py-1 text-[11px] font-mono border" style={{background:'var(--surface-input)',borderColor:'var(--border)',color:'var(--text-muted)'}}>{m.id.toLowerCase()}-output.{fmt}</div>
          {editing&&<span className="text-[10px] font-semibold" style={{color:'#5B8DEF'}}>편집 모드</span>}
        </div>
        {editing?<textarea ref={textareaRef} value={editText} onChange={e=>{setEditText(e.target.value);if(textareaRef.current){textareaRef.current.style.height='auto';textareaRef.current.style.height=textareaRef.current.scrollHeight+'px'}}} className="w-full min-h-[480px] p-7 text-[13.5px] leading-[1.8] font-mono resize-none outline-none" style={{background:'var(--preview-bg)',color:'var(--preview-text)'}} spellCheck={false}/>
        :<div className="p-7 min-h-[480px] text-[13.5px] leading-[1.8]" style={{background:'var(--preview-bg)',color:'var(--preview-text)'}} dangerouslySetInnerHTML={{__html:'<p>'+render(result)+'</p>'}}/>}
      </div>
      {chains.length>0&&<div className="rounded-[10px] p-4 mt-3 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}><p className="text-[12px] font-semibold mb-2" style={{color:'var(--text-muted)'}}>🔗 연결 모듈</p><div className="flex gap-1.5 flex-wrap">{chains.map(c=><button key={c.id} onClick={()=>router.push('/execute?id='+c.id)} className="px-3 py-1.5 border rounded-md text-[12px]" style={{borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>{c.icon} {c.name}</button>)}</div></div>}
    </div>
  )
}
export default function PreviewPage(){return<Suspense fallback={<div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>로딩 중...</div>}><Pv/></Suspense>}
