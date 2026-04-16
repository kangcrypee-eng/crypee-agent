'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

const ML:Record<string,string>={oneclick:'⚡ 원클릭',form:'📝 폼',chat:'💬 대화',alert:'🔔 알림',bizplan:'📝 폼'}

const PROFILE_FIELDS = new Set(['business_name','representative','business_number','business_type','sector','item','service_desc','target_customer','track_record','address','phone','email'])

const VAR_LABELS:Record<string,string>={
  program_name:'지원사업명',idea_detail:'사업 아이디어 상세',budget:'예산 (만원)',duration:'사업 기간',team:'팀 구성',
  investment_amount:'투자 유치 목표 금액',current_stage:'현재 사업 단계',key_metrics:'핵심 지표 (트랙션)',
  location:'예상 위치/상권',investment:'초기 투자 예산 (만원)',target_revenue:'목표 월매출 (만원)',
  client:'클라이언트/프로젝트명',scope:'프로젝트 범위',
  keywords:'타겟 키워드 (쉼표 구분)',tone_style:'글 톤',concept:'계정 컨셉/톤',frequency:'포스팅 빈도',
  employment_type:'고용 형태',position:'직위/직무',salary:'급여',
  contract_amount:'계약 금액',contract_period:'계약 기간',work_description:'업무 내용',
  counterparty_name:'상대방 상호',counterparty_representative:'상대방 대표자',counterparty_address:'상대방 주소',
  counterparty_business_number:'상대방 사업자등록번호',
  nda_period:'비밀유지 기간',penalty_amount:'위약벌 금액',service_url:'서비스 URL',
}

function inferType(key:string):{type:string;placeholder:string}{
  if(key.includes('amount')||key.includes('budget')||key.includes('investment')||key.includes('revenue')||key.includes('salary')||key.includes('penalty'))return{type:'text',placeholder:'예: 500만원'}
  if(key.includes('detail')||key.includes('scope')||key.includes('description')||key.includes('idea'))return{type:'textarea',placeholder:'자유롭게 입력해주세요'}
  if(key.includes('period')||key.includes('duration'))return{type:'text',placeholder:'예: 3개월, 1년'}
  return{type:'text',placeholder:''}
}

function parseNonProfileVars(template:string){
  const fields:Array<{key:string;label:string;type:string;placeholder:string;required:boolean}>=[];const seen=new Set<string>();const regex=/\{\{(\w+)\}\}/g;let match
  while((match=regex.exec(template))!==null){const key=match[1];if(!PROFILE_FIELDS.has(key)&&!seen.has(key)){seen.add(key);const{type,placeholder}=inferType(key);fields.push({key,label:VAR_LABELS[key]||key.replace(/_/g,' '),type,placeholder,required:false})}}
  return fields
}

function parseBlankFields(text:string){
  const fields:Array<{key:string;label:string;type:string;placeholder:string;required:boolean}>=[];const seen=new Set<string>();const regex=/\[_{4,}\]/g;let match;let idx=0
  while((match=regex.exec(text))!==null){const before=text.substring(Math.max(0,match.index-100),match.index);const labelMatch=before.match(/(?:^|\n)\s*[-·•]?\s*(.+?)[:：]\s*$/);const label=labelMatch?labelMatch[1].trim():`입력 항목 ${idx+1}`;if(!seen.has(label)){seen.add(label);fields.push({key:`blank_${idx}`,label,type:'text',placeholder:label+' 입력',required:false});idx++}}
  return fields
}

const fmtPrice=(n:number)=>n===0?'무료':`₩${n.toLocaleString()}`

const loadTossV1Script=():Promise<void>=>new Promise((resolve,reject)=>{
  if((window as any).TossPayments){resolve();return}
  const s=document.createElement('script')
  s.src='https://js.tosspayments.com/v1/payment'
  s.onload=()=>resolve()
  s.onerror=()=>reject(new Error('결제 스크립트 로드 실패'))
  document.head.appendChild(s)
})

function Exec() {
  const params=useSearchParams();const router=useRouter();const{user}=useAuth()
  const id=params.get('id')||'';const[m,setM]=useState<any>(null);const[mode,setMode]=useState('oneclick')
  const[ld,setLd]=useState(true);const[gen,setGen]=useState(false);const[prog,setProg]=useState(0);const[paying,setPaying]=useState(false)
  const[msgs,setMsgs]=useState<{type:string;text:string}[]>([]);const[ci,setCi]=useState('')
  // bizplan 파일 업로드
  const[existingPlan,setExistingPlan]=useState<File|null>(null);const[images,setImages]=useState<File[]>([])
  const[useExistingMode,setUseExistingMode]=useState(false)
  const[genStep,setGenStep]=useState('')
  const[cs,setCs]=useState(0);const[fd,setFd]=useState<Record<string,string>>({})
  const[autoFields,setAutoFields]=useState<Array<{key:string;label:string;type:string;placeholder:string;required:boolean}>>([])
  const[profileFields,setProfileFields]=useState<Array<{key:string;label:string;value:string}>>([])
  const[showProfileEdit,setShowProfileEdit]=useState(false)

  useEffect(()=>{if(id)supabase.from('modules').select('*').eq('id',id).single().then(({data})=>{if(data){
    setM(data);setMode(data.mode)
    if(data.mode==='chat')initC(data)
    if(data.mode==='alert'){router.push('/alerts/setup?module='+data.id);return}
    const templateVars=parseNonProfileVars(data.user_prompt_template||'')
    const blankVars=data.output_mode==='template'?parseBlankFields(data.system_prompt||''):[]
    const explicitFields=data.additional_inputs||[];const explicitKeys=new Set(explicitFields.map((f:any)=>f.key))
    const allAutoFields=[...explicitFields,...templateVars.filter(f=>!explicitKeys.has(f.key)),...blankVars.filter(f=>!explicitKeys.has(f.key))]
    setAutoFields(allAutoFields)
    const usedProfileVars:Array<{key:string;label:string;value:string}>=[]
    const profileLabels:Record<string,string>={business_name:'상호',representative:'대표자',business_number:'사업자등록번호',business_type:'사업자 유형',sector:'업종',item:'업태',service_desc:'서비스 설명',target_customer:'타겟 고객',track_record:'주요 실적',address:'주소',phone:'연락처',email:'이메일'}
    const tpl=data.user_prompt_template||''
    for(const k of Array.from(PROFILE_FIELDS)){if(tpl.includes(`{{${k}}}`))usedProfileVars.push({key:k,label:profileLabels[k]||k,value:''})}
    setProfileFields(usedProfileVars)
  };setLd(false)})},[id])

  useEffect(()=>{if(user&&profileFields.length>0)setProfileFields(prev=>prev.map(f=>({...f,value:(user as any)[f.key]||''})))},[user,profileFields.length])

  const initC=(mod:any)=>{const q=mod.chat_questions||[];setCs(0);setMsgs([{type:'ai',text:mod.name+'을(를) 작성합니다.'},...(q.length?[{type:'ai',text:q[0].question}]:[])])}
  const sendC=()=>{if(!ci.trim()||!m)return;const t=ci.trim();setMsgs(p=>[...p,{type:'user',text:t}]);setCi('');const q=m.chat_questions||[];const ns=cs+1;if(q[cs])setFd(p=>({...p,[q[cs].field]:t}));setCs(ns);setTimeout(()=>{if(ns<q.length)setMsgs(p=>[...p,{type:'ai',text:q[ns].question}]);else{setMsgs(p=>[...p,{type:'ai',text:'정보 수집 완료. 생성합니다.'}]);setTimeout(handleExecute,800)}},500)}

  // 입력 데이터 수집
  const collectInputData=()=>{
    const pd:Record<string,string>={}
    if(user){for(const k of Array.from(PROFILE_FIELDS))pd[k]=(user as any)[k]||''}
    for(const pf of profileFields){if(pf.value)pd[pf.key]=pf.value}
    return{...pd,...fd}
  }

  // 실행 (무료 → 직접 생성, 유료 → 토스 결제)
  const handleExecute=async()=>{
    if(!m||!user)return
    const price=m.price_krw||0
    if(m.mode==='bizplan'){
      // 사업계획서: 먼저 무료 생성 → preview에서 부분 공개 → 결제
      await generateDirect()
    } else if(price===0){
      await generateDirect()
    } else {
      await startPayment(price)
    }
  }

  // 파일 텍스트 추출 — HWP/PDF/TXT 모두 서버 API로 처리
  const extractText=async(file:File):Promise<string>=>{
    const name=file.name.toLowerCase()
    if(name.endsWith('.pdf')||name.endsWith('.hwp')||name.endsWith('.hwpx')){
      const formBody=new FormData();formBody.append('file',file)
      try{
        const res=await fetch('/api/extract-text',{method:'POST',body:formBody})
        const data=await res.json()
        if(!res.ok){console.error('Extract failed:',data.error);return ''}
        console.log('Extracted:',data.text?.length||0,'chars')
        return data.text||''
      }catch(e){console.error('Extract error:',e);return ''}
    }
    return new Promise((resolve)=>{
      const reader=new FileReader()
      reader.onload=()=>resolve(reader.result as string||'')
      reader.onerror=()=>resolve('')
      reader.readAsText(file)
    })
  }

  // 스트림 읽기 헬퍼
  const readStream=async(res:Response):Promise<string>=>{
    const reader=res.body?.getReader()
    const decoder=new TextDecoder()
    let text=''
    if(reader){
      while(true){
        const{done,value}=await reader.read()
        if(done)break
        text+=decoder.decode(value,{stream:true})
      }
    }
    // 메타데이터 분리
    const meta=text.match(/<!--USAGE:(.*?)-->/)
    if(meta)text=text.replace(meta[0],'').trim()
    return text
  }

  // 단일 파트 생성 호출
  const callGenerate=async(prompt:string,sysPrompt:string,inputData:Record<string,string>,extra:Record<string,string>,tokens?:number):Promise<string>=>{
    const res=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({moduleId:m!.id,systemPrompt:sysPrompt,userPrompt:prompt,aiModel:m!.ai_model,maxTokens:tokens||m!.max_tokens,temperature:m!.temperature,profileData:inputData,additionalData:extra,stream:true})})
    if(!res.ok){const err=await res.json().catch(()=>({error:'생성 실패'}));throw new Error(err.error||'알 수 없는 오류')}
    return readStream(res)
  }

  // 무료 모듈: 직접 AI 생성
  const generateDirect=async()=>{
    if(!m||!user)return
    setGen(true);setGenStep('준비 중...');setProg(5)

    const inputData=collectInputData()
    const extraData={...fd}

    // bizplan: 기존 사업계획서 텍스트를 추가 데이터에 포함
    if(existingPlan){
      try{
        setGenStep('📄 기존 계획서 분석 중...');setProg(10)
        const text=await extractText(existingPlan)
        if(text.trim()){
          extraData._existing_plan=text.substring(0,15000)
          console.log('기존 계획서 텍스트 로드 완료:',text.length,'자')
        }else{
          if(useExistingMode){alert('파일에서 텍스트를 추출할 수 없습니다.\nHWP, HWPX, PDF(텍스트 포함), TXT 파일을 업로드해주세요.');setGen(false);setGenStep('');return}
        }
      }catch(e:any){console.error('기존 계획서 처리 실패:',e);alert('파일 처리 실패: '+(e.message||'알 수 없는 오류'));setGen(false);setGenStep('');return}
    }

    try{
      // 프롬프트 구성
      let enhancedPrompt=m.user_prompt_template||''

      if(m.mode==='bizplan'&&extraData._existing_plan){
        // 기존 사업계획서가 있으면 프롬프트에 명시적으로 포함
        if(useExistingMode){
          // 기존 계획서 기반: user_prompt_template 제외 (프로필 정보가 기존 계획서를 덮어쓰는 것 방지)
          const sections=(m.required_sections||[]).join(', ')
          enhancedPrompt=`[작성 모드: 기존 사업계획서 기반 재작성]

[핵심 지시사항]
1. 아래 "기존 사업계획서"의 기업명, 아이템, 수치, 실적, 팀 정보를 그대로 사용하세요
2. 시스템 프롬프트에 정의된 구조와 형식을 정확히 따르세요
${sections?`3. 다음 항목을 빠짐없이 작성하세요: ${sections}\n`:''}4. 기존 계획서에 없는 정보만 [확인 필요]로 표시하세요
5. 기존 계획서의 기업명·대표자·사업내용을 변경하지 마세요

━━━ 기존 자료 전문 ━━━
${extraData._existing_plan}
━━━ 기존 자료 끝 ━━━

위 기존 자료의 내용을 기반으로, 시스템 프롬프트의 형식에 맞춰 작성해주세요.`
        }else{
          enhancedPrompt+=`\n\n━━━ 참고: 기존 사업계획서 ━━━\n${extraData._existing_plan}\n━━━ 참고 끝 ━━━\n\n위 기존 계획서의 핵심 내용, 수치, 표현을 참고하여 양식에 맞게 작성해주세요.`
        }
      }


      setGenStep(m.mode==='bizplan'?'✍️ 사업계획서 작성 중... (약 1~2분)':'✍️ AI가 작성 중...');setProg(20)
      // useExistingMode: 프로필 데이터를 보내지 않음 (기존 계획서 내용만 사용)
      const genProfileData=useExistingMode?{}:inputData
      const fullText=await callGenerate(enhancedPrompt,m.system_prompt,genProfileData,extraData)
      if(!fullText.trim()){alert('생성 실패: 결과물이 비어있습니다');setGen(false);setGenStep('');return}

      setGenStep('💾 저장 중...');setProg(95)
      await supabase.from('generations').insert({user_id:user.id,module_id:m.id,input_data:inputData,output_text:fullText,output_format:m.default_format||'pdf',credits_used:0,ai_model:m.ai_model})
      await supabase.from('modules').update({uses:(m.uses||0)+1}).eq('id',m.id)
      sessionStorage.setItem('lastResult',fullText);sessionStorage.setItem('lastModule',JSON.stringify(m))
      setProg(100);setGenStep('✅ 완료!')
      router.push('/preview?id='+m.id)
    }catch(e:any){alert('생성 실패: '+(e.message||''));setGen(false);setGenStep('')}
  }

  // 유료 모듈: 토스 결제 시작
  const startPayment=async(price:number)=>{
    if(!user||!m)return
    setPaying(true)
    try{
      const clientKey=process.env.NEXT_PUBLIC_TOSS_CK||''
      if(!clientKey){alert('결제 시스템이 아직 설정되지 않았습니다.');setPaying(false);return}
      await loadTossV1Script()
      const tossPayments=(window as any).TossPayments(clientKey)
      const orderId=`crypee-${user.id.substring(0,8)}-${Date.now()}`
      const appUrl=process.env.NEXT_PUBLIC_APP_URL||window.location.origin
      const inputData=collectInputData()
      await tossPayments.requestPayment('카드',{
        amount:price,
        orderId,
        orderName:m.name,
        successUrl:`${appUrl}/api/payment/success?moduleId=${m.id}&userId=${user.id}&inputData=${encodeURIComponent(JSON.stringify(inputData))}`,
        failUrl:`${appUrl}/api/payment/fail`,
      })
    }catch(e:any){
      if(e?.code!=='USER_CANCEL')alert('결제 오류: '+(e?.message||'알 수 없는 오류'))
    }
    setPaying(false)
  }

  if(ld)return<div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>로딩 중...</div>
  if(!m)return<div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>모듈을 찾을 수 없습니다</div>

  const modeStyle=(md:string)=>({background:`var(--mode-${md}-bg)`,color:`var(--mode-${md}-text)`,borderColor:`var(--mode-${md}-border)`})
  const modeBg=(md:string)=>`var(--mode-${md}-bg)`
  const price=m.price_krw||0
  const btnText=m.mode==='bizplan'?'생성하기':price===0?'무료 실행':`실행하기 · ${fmtPrice(price)}`
  const hasAutoFields=autoFields.length>0
  const isChat=mode==='chat'
  const showInputForm=!isChat&&hasAutoFields

  const renderFormFields=(flds:any[])=>flds.map((f:any)=><div key={f.key} className="mb-3.5"><label className="block text-[11.5px] font-medium mb-1.5" style={{color:'var(--text-secondary)'}}>{f.label}{f.required&&<span style={{color:'var(--error-text)'}}> *</span>}</label>
    {f.type==='textarea'?<textarea value={fd[f.key]||''} onChange={e=>setFd({...fd,[f.key]:e.target.value})} placeholder={f.placeholder} className="inp min-h-[80px]"/>
    :f.type==='select'?<select value={fd[f.key]||''} onChange={e=>setFd({...fd,[f.key]:e.target.value})} className="inp"><option value="">선택</option>{(f.options||[]).map((o:string)=><option key={o}>{o}</option>)}</select>
    :<input value={fd[f.key]||''} onChange={e=>setFd({...fd,[f.key]:e.target.value})} placeholder={f.placeholder} className="inp"/>}
  </div>)

  return(
    <div className="max-w-[680px] mx-auto pt-6 pb-16 animate-in">
      <button onClick={()=>router.push('/market')} className="text-[12.5px] hover:opacity-70 mb-3 inline-block" style={{color:'var(--text-muted)'}}>← 마켓</button>
      <div className="rounded-[10px] p-5 mb-3 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{background:modeBg(m.mode)}}>{m.icon||'📄'}</div><div className="flex-1"><div className="flex items-center gap-2 mb-0.5"><span className="text-[15px] font-bold">{m.name}</span><span className="inline-flex px-2 py-0.5 rounded text-[10.5px] font-semibold border" style={modeStyle(m.mode)}>{ML[m.mode]||m.mode}</span></div><div className="text-[12px]" style={{color:'var(--text-muted)'}}>{fmtPrice(price)} · {m.category}</div></div></div></div>

      {(gen||paying)?<div className="rounded-[10px] p-10 text-center border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
        <div className="spinner mx-auto mb-4"/>
        <p className="text-[14px] font-semibold mb-1">{paying?'결제 준비 중...':'AI 에이전트 실행 중'}</p>
        {gen&&<>
          <p className="text-[13px] mb-4" style={{color:'var(--accent)'}}>{genStep}</p>
          <div className="mt-2 rounded-full h-[4px] max-w-[300px] mx-auto overflow-hidden" style={{background:'var(--surface-hover)'}}>
            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{width:prog+'%',background:'var(--accent)'}}/>
          </div>
          <p className="text-[11px] mt-3" style={{color:'var(--text-muted)'}}>
            {m?.mode==='bizplan'?'사업계획서는 약 1~2분 소요됩니다. 잠시만 기다려주세요.':'보통 30초~1분 소요됩니다.'}
          </p>
        </>}
      </div>

      :isChat?<div className="rounded-[10px] overflow-hidden border" style={{background:'var(--surface)',borderColor:'var(--border)'}}><div className="flex flex-col h-[400px]">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">{msgs.map((msg,i)=><div key={i} className={`max-w-[82%] px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed ${msg.type==='ai'?'rounded-bl-sm self-start':'font-medium rounded-br-sm self-end'}`} style={msg.type==='ai'?{background:'var(--surface-hover)',color:'var(--text-secondary)'}:{background:'var(--accent)',color:'var(--bg)'}}>{msg.text}</div>)}</div>
        <div className="p-2.5 flex gap-1.5 border-t" style={{borderColor:'var(--border)',background:'var(--surface)'}}><input value={ci} onChange={e=>setCi(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendC()} placeholder="답변 입력..." className="flex-1 px-3 py-2 rounded-[5px] text-[13px] border" style={{background:'var(--surface-input)',borderColor:'var(--border-strong)',color:'var(--text)'}}/><button onClick={sendC} className="px-3 py-2 font-semibold text-[12px] rounded-md" style={{background:'var(--accent)',color:'var(--bg)'}}>전송</button></div>
      </div></div>

      :showInputForm?<div className="space-y-3">
        {/* bizplan: 작성 모드 선택 */}
        {m?.mode==='bizplan'&&<div className="flex gap-2 mb-1">
          <button onClick={()=>setUseExistingMode(false)} className="flex-1 py-2.5 rounded-lg text-[13px] font-medium border transition-all" style={!useExistingMode?{background:'var(--accent-bg)',color:'var(--accent)',borderColor:'var(--accent-border)'}:{borderColor:'var(--border)',color:'var(--text-muted)'}}>직접 입력</button>
          <button onClick={()=>setUseExistingMode(true)} className="flex-1 py-2.5 rounded-lg text-[13px] font-medium border transition-all" style={useExistingMode?{background:'var(--accent-bg)',color:'var(--accent)',borderColor:'var(--accent-border)'}:{borderColor:'var(--border)',color:'var(--text-muted)'}}>기존 계획서 기반</button>
        </div>}

        {useExistingMode?(
          <div className="rounded-[10px] p-5 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
            <p className="text-[13px] font-semibold mb-1" style={{color:'var(--text)'}}>기존 사업계획서 업로드</p>
            <p className="text-[11px] mb-4" style={{color:'var(--text-muted)'}}>기존 사업계획서를 업로드하면 AI가 이 공고의 양식과 심사기준에 맞춰 전면 재작성합니다.</p>
            {existingPlan?(
              <div className="flex items-center gap-2 p-3 rounded-lg border" style={{background:'var(--surface-input)',borderColor:'var(--border)'}}>
                <span>📄</span><span className="flex-1 text-[12px]">{existingPlan.name} <span style={{color:'var(--text-muted)'}}>({(existingPlan.size/1024).toFixed(0)}KB)</span></span>
                <button onClick={()=>setExistingPlan(null)} className="text-[11px]" style={{color:'var(--error-text)'}}>삭제</button>
              </div>
            ):(
              <label className="block p-6 rounded-lg border-2 border-dashed text-center cursor-pointer hover:opacity-80" style={{borderColor:'var(--accent-border)'}}>
                <span className="text-2xl">📄</span>
                <p className="text-[12px] mt-1 font-medium" style={{color:'var(--accent)'}}>기존 사업계획서 업로드</p>
                <p className="text-[10px] mt-0.5" style={{color:'var(--text-muted)'}}>HWP, HWPX, PDF, TXT (필수)</p>
                <input type="file" accept=".pdf,.docx,.txt,.hwp,.hwpx" className="hidden" onChange={e=>{if(e.target.files?.[0])setExistingPlan(e.target.files[0])}}/>
              </label>
            )}
          </div>
        ):(
          <div className="rounded-[10px] p-5 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
            <p className="text-[13px] font-semibold mb-1" style={{color:'var(--text)'}}>입력 정보</p>
            <p className="text-[11px] mb-4" style={{color:'var(--text-muted)'}}>아래 정보를 입력해주세요. 비워두면 AI가 [빈칸] 처리합니다.</p>
            {renderFormFields(autoFields)}
          </div>
        )}
        {/* bizplan 파일 업로드 */}
        {m?.mode==='bizplan'&&<div className="rounded-[10px] p-5 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
          <p className="text-[13px] font-semibold mb-1" style={{color:'var(--text)'}}>참고 자료 업로드 (선택)</p>
          <p className="text-[11px] mb-4" style={{color:'var(--text-muted)'}}>기존 사업계획서나 이미지를 업로드하면 AI가 참고하여 더 정확한 결과물을 생성합니다.</p>

          <div className="mb-4">
            <label className="block text-[12px] font-medium mb-1.5" style={{color:'var(--text-secondary)'}}>기존 사업계획서 (선택)</label>
            {existingPlan?(
              <div className="flex items-center gap-2 p-2.5 rounded-lg border" style={{background:'var(--surface-input)',borderColor:'var(--border)'}}>
                <span>📄</span><span className="flex-1 text-[12px]">{existingPlan.name} <span style={{color:'var(--text-muted)'}}>({(existingPlan.size/1024).toFixed(0)}KB)</span></span>
                <button onClick={()=>setExistingPlan(null)} className="text-[11px]" style={{color:'var(--error-text)'}}>삭제</button>
              </div>
            ):(
              <label className="block p-4 rounded-lg border-2 border-dashed text-center cursor-pointer hover:opacity-80" style={{borderColor:'var(--border-strong)'}}>
                <span className="text-lg opacity-40">📎</span>
                <p className="text-[10px]" style={{color:'var(--text-muted)'}}>이전에 작성한 사업계획서 (HWP, HWPX, PDF, TXT)</p>
                <input type="file" accept=".pdf,.docx,.txt,.hwp,.hwpx" className="hidden" onChange={e=>{if(e.target.files?.[0])setExistingPlan(e.target.files[0])}}/>
              </label>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{color:'var(--text-secondary)'}}>이미지/도표 (선택, 최대 5개)</label>
            <div className="space-y-1.5 mb-2">
              {images.map((img,i)=>(
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg border" style={{background:'var(--surface-input)',borderColor:'var(--border)'}}>
                  <span>🖼️</span><span className="flex-1 text-[11px]">{img.name}</span>
                  <button onClick={()=>setImages(images.filter((_,j)=>j!==i))} className="text-[11px]" style={{color:'var(--error-text)'}}>삭제</button>
                </div>
              ))}
            </div>
            {images.length<5&&(
              <label className="block p-3 rounded-lg border-2 border-dashed text-center cursor-pointer hover:opacity-80" style={{borderColor:'var(--border-strong)'}}>
                <span className="text-sm opacity-40">🖼️</span>
                <span className="text-[10px] ml-1" style={{color:'var(--text-muted)'}}>서비스 스크린샷, 조직도, 도표 등</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={e=>{if(e.target.files)setImages([...images,...Array.from(e.target.files)].slice(0,5))}}/>
              </label>
            )}
          </div>
        </div>}

        {profileFields.length>0&&<div className="rounded-[10px] p-5 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
          <div className="flex items-center justify-between mb-3">
            <div><p className="text-[13px] font-semibold" style={{color:'var(--text)'}}>내 사업자 정보</p><p className="text-[11px]" style={{color:'var(--text-muted)'}}>프로필에서 자동으로 채워졌습니다</p></div>
            <button onClick={()=>setShowProfileEdit(!showProfileEdit)} className="text-[11px] hover:opacity-70" style={{color:'var(--text-muted)'}}>{showProfileEdit?'접기':'수정'}</button>
          </div>
          {showProfileEdit?profileFields.map((pf,i)=><div key={pf.key} className="mb-2.5"><label className="block text-[11px] mb-1" style={{color:'var(--text-muted)'}}>{pf.label}</label><input value={pf.value} onChange={e=>{const nf=[...profileFields];nf[i]={...nf[i],value:e.target.value};setProfileFields(nf)}} className="inp text-[12.5px]"/></div>)
          :<div className="flex flex-wrap gap-x-4 gap-y-1">{profileFields.filter(pf=>pf.value).map(pf=><span key={pf.key} className="text-[11px]" style={{color:'var(--text-muted)'}}>{pf.label}: <span style={{color:'var(--text-secondary)'}}>{pf.value.length>20?pf.value.substring(0,20)+'...':pf.value}</span></span>)}</div>}
        </div>}
        <div className="flex justify-between items-center">
          {mode==='form'&&<button onClick={()=>{setMode('chat');if(m)initC(m)}} className="text-[12px]" style={{color:'var(--text-muted)'}}>💬 AI 상담 모드</button>}
          {mode!=='form'&&<div/>}
          <button onClick={handleExecute} disabled={paying} className="px-5 py-2.5 font-semibold text-[13px] rounded-md disabled:opacity-50" style={{background:'var(--accent)',color:'var(--bg)'}}>{btnText}</button>
        </div>
      </div>

      :<div className="rounded-[10px] p-9 text-center border" style={{background:'var(--surface)',borderColor:'var(--border)'}}><p className="text-[13.5px] mb-4" style={{color:'var(--text-secondary)'}}>사업 정보 기반으로 즉시 실행합니다.</p><button onClick={handleExecute} disabled={paying} className="px-6 py-3 font-semibold text-sm rounded-lg disabled:opacity-50" style={{background:'var(--accent)',color:'var(--bg)'}}>{btnText}</button><p className="text-[11px] mt-2.5" style={{color:'var(--text-muted)'}}>{price>0?fmtPrice(price):'무료'}</p></div>}
    </div>
  )
}
export default function ExecutePage(){return<Suspense fallback={<div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>로딩 중...</div>}><Exec/></Suspense>}
