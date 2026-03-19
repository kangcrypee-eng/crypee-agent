'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

const ML:Record<string,string>={oneclick:'⚡ 원클릭',form:'📝 폼',chat:'💬 대화'}
const MC:Record<string,string>={oneclick:'bg-[rgba(0,212,170,0.1)] text-[#00D4AA] border-[rgba(0,212,170,0.2)]',form:'bg-[rgba(91,141,239,0.1)] text-[#5B8DEF] border-[rgba(91,141,239,0.2)]',chat:'bg-[rgba(155,141,255,0.1)] text-[#9B8DFF] border-[rgba(155,141,255,0.2)]'}
const MB:Record<string,string>={oneclick:'rgba(0,212,170,0.1)',form:'rgba(91,141,239,0.1)',chat:'rgba(155,141,255,0.1)'}

function parseTemplateFields(template:string):Array<{key:string;label:string;type:string;placeholder:string;required:boolean}> {
  const blanks:Array<{key:string;label:string;type:string;placeholder:string;required:boolean}>=[]
  const seen=new Set<string>()
  const regex=/\[_{4,}\]/g
  let match; let idx=0
  while((match=regex.exec(template))!==null){
    const before=template.substring(Math.max(0,match.index-80),match.index)
    const labelMatch=before.match(/(?:^|\n)\s*[-·•]?\s*(.+?)[:：]\s*$/)
    const label=labelMatch?labelMatch[1].trim():`입력 항목 ${idx+1}`
    const key=`blank_${idx}`
    if(!seen.has(label)){seen.add(label);blanks.push({key,label,type:'text',placeholder:label+' 입력',required:false});idx++}
  }
  return blanks
}

function Exec() {
  const params=useSearchParams();const router=useRouter();const{user,credits,setCredits}=useAuth()
  const id=params.get('id')||'';const[m,setM]=useState<any>(null);const[mode,setMode]=useState('oneclick')
  const[ld,setLd]=useState(true);const[gen,setGen]=useState(false);const[prog,setProg]=useState(0)
  const[msgs,setMsgs]=useState<{type:string;text:string}[]>([]);const[ci,setCi]=useState('')
  const[cs,setCs]=useState(0);const[fd,setFd]=useState<Record<string,string>>({})
  const[templateFields,setTemplateFields]=useState<Array<{key:string;label:string;type:string;placeholder:string;required:boolean}>>([])
  const[showForm,setShowForm]=useState(false)

  useEffect(()=>{if(id)supabase.from('modules').select('*').eq('id',id).single().then(({data})=>{if(data){
    setM(data);setMode(data.mode)
    if(data.mode==='chat')initC(data)
    if(data.output_mode==='template'&&data.mode==='oneclick'){
      const fields=data.additional_inputs||[]
      if(fields.length>0){setTemplateFields(fields);setShowForm(true)}
      else{const parsed=parseTemplateFields(data.system_prompt||'');if(parsed.length>0){setTemplateFields(parsed);setShowForm(true)}}
    }
  };setLd(false)})},[id])

  const initC=(mod:any)=>{const q=mod.chat_questions||[];setCs(0);setMsgs([{type:'ai',text:mod.name+'을(를) 작성합니다.'},...(q.length?[{type:'ai',text:q[0].question}]:[])])}
  const sendC=()=>{if(!ci.trim()||!m)return;const t=ci.trim();setMsgs(p=>[...p,{type:'user',text:t}]);setCi('');const q=m.chat_questions||[];const ns=cs+1;if(q[cs])setFd(p=>({...p,[q[cs].field]:t}));setCs(ns);setTimeout(()=>{if(ns<q.length)setMsgs(p=>[...p,{type:'ai',text:q[ns].question}]);else{setMsgs(p=>[...p,{type:'ai',text:'정보 수집 완료. 생성합니다.'}]);setTimeout(generate,800)}},500)}

  const generate=async()=>{
    if(!m)return;if(credits<m.credit_cost){alert('크레딧 부족');return}
    setGen(true);for(let i=0;i<4;i++){setProg((i+1)*25);await new Promise(r=>setTimeout(r,700))}
    const pd:Record<string,string>={}
    if(user){for(const k of['business_name','representative','business_number','business_type','sector','item','service_desc','target_customer','track_record','address','phone','email'])pd[k]=(user as any)[k]||''}
    try{
      const res=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({moduleId:m.id,systemPrompt:m.system_prompt,userPrompt:m.user_prompt_template,aiModel:m.ai_model,maxTokens:m.max_tokens,temperature:m.temperature,profileData:pd,additionalData:fd})})
      const result=await res.json()
      if(!result.success){alert('생성 실패: '+(result.error||'알 수 없는 오류'));setGen(false);return}
      if(result.success&&user){
        await supabase.from('generations').insert({user_id:user.id,module_id:m.id,input_data:{...pd,...fd},output_text:result.result,output_format:m.default_format||'pdf',credits_used:m.credit_cost,input_tokens:result.usage?.input_tokens,output_tokens:result.usage?.output_tokens,ai_model:m.ai_model,generation_time_ms:result.usage?.generation_time_ms})
        const nc=credits-m.credit_cost;await supabase.from('profiles').update({credits:nc}).eq('id',user.id);setCredits(nc)
        await supabase.from('modules').update({uses:(m.uses||0)+1}).eq('id',m.id)
        sessionStorage.setItem('lastResult',result.result);sessionStorage.setItem('lastModule',JSON.stringify(m))
      }
      router.push('/preview?id='+m.id)
    }catch(e){alert('생성 실패');setGen(false)}
  }

  if(ld)return<div className="pt-20 text-center text-[#63636E]">로딩 중...</div>
  if(!m)return<div className="pt-20 text-center text-[#63636E]">모듈을 찾을 수 없습니다</div>
  const fields=m.additional_inputs||[]

  const renderFormFields=(flds:any[])=>flds.map((f:any)=><div key={f.key} className="mb-3.5"><label className="block text-[11.5px] font-medium text-[#A1A1AA] mb-1.5">{f.label}{f.required&&<span className="text-[#EF5B5B]"> *</span>}</label>
    {f.type==='textarea'?<textarea value={fd[f.key]||''} onChange={e=>setFd({...fd,[f.key]:e.target.value})} placeholder={f.placeholder} className="inp min-h-[80px]"/>
    :f.type==='select'?<select value={fd[f.key]||''} onChange={e=>setFd({...fd,[f.key]:e.target.value})} className="inp"><option value="">선택</option>{(f.options||[]).map((o:string)=><option key={o}>{o}</option>)}</select>
    :<input value={fd[f.key]||''} onChange={e=>setFd({...fd,[f.key]:e.target.value})} placeholder={f.placeholder} className="inp"/>}
  </div>)

  return(
    <div className="max-w-[680px] mx-auto pt-6 pb-16 animate-in">
      <button onClick={()=>router.push('/market')} className="text-[12.5px] text-[#63636E] hover:text-[#A1A1AA] mb-3 inline-block">← 마켓</button>
      <div className="bg-[#141417] border border-white/[.06] rounded-[10px] p-5 mb-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{background:MB[m.mode]}}>{m.icon||'📄'}</div><div className="flex-1"><div className="flex items-center gap-2 mb-0.5"><span className="text-[15px] font-bold">{m.name}</span><span className={`inline-flex px-2 py-0.5 rounded text-[10.5px] font-semibold border ${MC[m.mode]}`}>{ML[m.mode]}</span></div><div className="text-[12px] text-[#63636E]">◆ {m.credit_cost} · {m.category}</div></div></div></div>

      {gen?<div className="bg-[#141417] border border-white/[.06] rounded-[10px] p-10 text-center"><div className="spinner mx-auto mb-3.5"/><p className="text-[13.5px] font-medium">AI 에이전트 실행 중...</p><div className="mt-3.5 bg-[#18181B] rounded h-[3px] max-w-[280px] mx-auto overflow-hidden"><div className="h-full bg-[#00D4AA] rounded transition-all duration-500" style={{width:prog+'%'}}/></div></div>

      :mode==='oneclick'&&!showForm?<div className="bg-[#141417] border border-white/[.06] rounded-[10px] p-9 text-center"><p className="text-[13.5px] text-[#A1A1AA] mb-4">사업 정보 기반으로 즉시 실행합니다.</p><button onClick={generate} className="px-6 py-3 bg-[#00D4AA] text-[#09090B] font-semibold text-sm rounded-lg">⚡ 바로 실행</button><p className="text-[11px] text-[#63636E] mt-2.5">◆{m.credit_cost} 크레딧</p></div>

      :mode==='oneclick'&&showForm?<div className="bg-[#141417] border border-white/[.06] rounded-[10px] p-5">
        <p className="text-[12px] text-[#63636E] mb-3">📋 추가 정보를 입력하면 더 정확한 결과를 생성합니다. (선택)</p>
        {renderFormFields(templateFields)}
        <div className="flex justify-between items-center mt-2">
          <p className="text-[11px] text-[#63636E]">빈칸은 AI가 자동으로 채웁니다</p>
          <button onClick={generate} className="px-4 py-2 bg-[#00D4AA] text-[#09090B] font-semibold text-[12.5px] rounded-md">⚡ 실행 · ◆{m.credit_cost}</button>
        </div>
      </div>

      :mode==='form'?<div className="bg-[#141417] border border-white/[.06] rounded-[10px] p-5">
        {fields.length>0?renderFormFields(fields):<div className="mb-3.5"><label className="block text-[11.5px] font-medium text-[#A1A1AA] mb-1.5">추가 정보</label><textarea value={fd.extra||''} onChange={e=>setFd({...fd,extra:e.target.value})} placeholder="추가 정보 입력 (선택)" className="inp min-h-[80px]"/></div>}
        <div className="flex justify-between items-center mt-2"><button onClick={()=>{setMode('chat');if(m)initC(m)}} className="text-[12px] text-[#63636E]">💬 AI 상담 모드</button><button onClick={generate} className="px-4 py-2 bg-[#00D4AA] text-[#09090B] font-semibold text-[12.5px] rounded-md">실행 · ◆{m.credit_cost}</button></div>
      </div>

      :<div className="bg-[#141417] border border-white/[.06] rounded-[10px] overflow-hidden"><div className="flex flex-col h-[400px]">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">{msgs.map((msg,i)=><div key={i} className={`max-w-[82%] px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed ${msg.type==='ai'?'bg-[#1C1C20] text-[#A1A1AA] rounded-bl-sm self-start':'bg-[#00D4AA] text-[#09090B] font-medium rounded-br-sm self-end'}`}>{msg.text}</div>)}</div>
        <div className="p-2.5 border-t border-white/[.06] flex gap-1.5 bg-[#141417]"><input value={ci} onChange={e=>setCi(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendC()} placeholder="답변 입력..." className="flex-1 px-3 py-2 border border-white/10 rounded-[5px] text-[13px] bg-[#111114] text-white placeholder:text-[#3a3a42]"/><button onClick={sendC} className="px-3 py-2 bg-[#00D4AA] text-[#09090B] font-semibold text-[12px] rounded-md">전송</button></div>
      </div></div>}
    </div>
  )
}
export default function ExecutePage(){return<Suspense fallback={<div className="pt-20 text-center text-[#63636E]">로딩 중...</div>}><Exec/></Suspense>}
