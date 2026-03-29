'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

function Pv() {
  const params=useSearchParams();const router=useRouter();const{user}=useAuth()
  const id=params.get('id')||''
  const purchased=params.get('purchased')==='true'
  const[m,setM]=useState<any>(null);const[result,setResult]=useState('');const[chains,setChains]=useState<any[]>([]);const[fmt,setFmt]=useState('pdf');const[ld,setLd]=useState(true)
  const[editing,setEditing]=useState(false);const[editText,setEditText]=useState('');const[saving,setSaving]=useState(false)
  const[genId,setGenId]=useState('');const[regenCount,setRegenCount]=useState(0);const[regenerating,setRegenerating]=useState(false);const[regenProg,setRegenProg]=useState(0)
  const[isLocked,setIsLocked]=useState(false);const[unlocking,setUnlocking]=useState(false)
  const textareaRef=useRef<HTMLTextAreaElement>(null)

  useEffect(()=>{
    supabase.from('modules').select('*').eq('id',id).single().then(({data:mod})=>{
      if(mod){
        setM(mod);setFmt(mod.default_format||'pdf')
        if(mod.chain_next?.length)supabase.from('modules').select('id,name,icon').in('id',mod.chain_next).then(({data})=>{if(data)setChains(data)})
        // bizplan 모듈: 결제 잠금 (토스 라이브키 설정 후 활성화)
        // 현재는 테스트 단계이므로 잠금 비활성화
        // TODO: 라이브키 설정 후 아래 주석 해제
        // if(mod.mode==='bizplan'&&(mod.price_krw||0)>0&&user){
        //   supabase.from('payments').select('id').eq('user_id',user.id).eq('module_id',id).eq('status','paid').limit(1).then(({data:pays})=>{
        //     setIsLocked(!pays||pays.length===0)
        //   })
        // }
      }
      const s=sessionStorage.getItem('lastResult');setResult(s||'(결과물을 불러올 수 없습니다. 모듈을 다시 실행해주세요.)');setLd(false)
    })
    // 최근 generation 정보 가져오기 (재생성 카운트용)
    if(user){
      supabase.from('generations').select('id,regen_count').eq('user_id',user.id).eq('module_id',id).order('created_at',{ascending:false}).limit(1).single().then(({data})=>{
        if(data){setGenId(data.id);setRegenCount(data.regen_count||0)}
      })
    }
  },[id,user])

  // bizplan 결제 → 잠금 해제
  const handleUnlock=async()=>{
    if(!m||!user)return
    const clientKey=process.env.NEXT_PUBLIC_TOSS_CK||''
    if(!clientKey){
      // 토스 미설정 → 무료 해제
      setIsLocked(false);return
    }
    setUnlocking(true)
    try{
      const{loadTossPayments}=await import('@tosspayments/tosspayments-sdk')
      const tossPayments=await loadTossPayments(clientKey)
      const payment=tossPayments.payment({customerKey:user.id})
      const orderId=`bp-${user.id.substring(0,8)}-${Date.now()}`
      const appUrl=process.env.NEXT_PUBLIC_APP_URL||window.location.origin
      await payment.requestPayment({
        method:'CARD',
        amount:{currency:'KRW',value:m.price_krw},
        orderId,
        orderName:m.name,
        successUrl:`${appUrl}/api/payment/success?moduleId=${m.id}&userId=${user.id}&returnTo=${encodeURIComponent('/preview?id='+m.id+'&purchased=true')}`,
        failUrl:`${appUrl}/api/payment/fail`,
      })
    }catch(e:any){
      if(e?.code!=='USER_CANCEL')alert('결제 오류: '+(e?.message||''))
    }
    setUnlocking(false)
  }

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

  // 테이블 구분선 체크 (셀 단위 — | --- | --- | 등)
  const isSepRow=(row:string)=>{
    const cells=row.replace(/^\||\|$/g,'').split('|')
    return cells.length>0&&cells.every(c=>/^[\s:\-]*$/.test(c))&&cells.some(c=>c.includes('-'))
  }
  const mdTableToHtml=(block:string,forPrint=false)=>{
    const rows=block.trim().split('\n').filter(r=>r.includes('|')&&!isSepRow(r))
    if(rows.length===0)return block
    const style=forPrint?'':'style="width:100%;border-collapse:collapse;margin:10px 0;font-size:13px"'
    let table=`<table ${style}>`
    rows.forEach((row,i)=>{
      const cells=row.split('|').filter(c=>c.trim()!=='')
      const tag=i===0?'th':'td'
      if(forPrint){
        table+='<tr>'+cells.map(c=>`<${tag}>${c.trim()}</${tag}>`).join('')+'</tr>'
      }else{
        const st=i===0?'background:#f5f5f5;font-weight:600;':''
        table+='<tr>'+cells.map(c=>`<${tag} style="border:1px solid #ddd;padding:8px 10px;${st}">${c.trim()}</${tag}>`).join('')+'</tr>'
      }
    })
    return table+'</table>'
  }

  const dl=async()=>{
    const text=editing?editText:result;if(!text||!m)return

    // HWPX 다운로드
    if(fmt==='hwpx'){
      try{
        const res=await fetch('/api/download-hwp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({markdown:text,title:m.name,moduleId:m.id})})
        if(!res.ok){alert('HWPX 생성 실패');return}
        const blob=await res.blob()
        const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=m.name+'.hwpx';a.click();URL.revokeObjectURL(a.href)
      }catch(e){alert('HWPX 다운로드 실패')}
      return
    }

    if(fmt==='pdf'){
      const printWindow=window.open('','_blank')
      if(!printWindow)return
      printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${m.name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap');
body{font-family:'Noto Sans KR',sans-serif;font-size:11pt;line-height:1.8;color:#111;margin:0;padding:20mm 18mm;max-width:210mm;box-sizing:border-box}
h1{font-size:16pt;font-weight:700;margin:20px 0 10px;border-bottom:2px solid #111;padding-bottom:5px}
h2{font-size:14pt;font-weight:600;margin:18px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}
h3{font-size:12pt;font-weight:600;margin:14px 0 6px}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:10pt}
th,td{border:1px solid #333;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#f0f0f0;font-weight:600}
strong{font-weight:700}
p{margin:6px 0}
.section-divider{border-top:2px solid #111;margin:15px 0}
.check-box{background:#FFF8E1;border:2px solid #FFB300;border-radius:8px;padding:15px 18px;margin:15px 0;page-break-inside:avoid}
.check-box .title{font-size:13pt;font-weight:700;color:#E65100;margin-bottom:8px}
.check-tag{background:#FFF3CD;color:#856404;padding:1px 4px;border-radius:2px;font-size:9pt;font-weight:600;border:1px solid #FFEEBA}
@media print{body{margin:0;padding:15mm}}
@page{size:A4;margin:15mm}
</style></head><body>`)
      let html=text
        .replace(/^### (.+)$/gm,'<h3>$1</h3>')
        .replace(/^## (.+)$/gm,'<h2>$1</h2>')
        .replace(/^# (.+)$/gm,'<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
        .replace(/━+/g,'<div class="section-divider"></div>')
        .replace(/\[확인 필요\]/g,'<span class="check-tag">📝 확인 필요</span>')
      html=html.replace(/(\|.+\|\n)+/g,(block)=>mdTableToHtml(block,true))
      // ⚠️ 블록 처리
      html=html.replace(/(?:^|\n)((?:>.*\n?)+)/g,(match)=>{
        if(!match.includes('확인 필요')&&!match.includes('보완'))return match
        const inner=match.replace(/(?:^|\n)>\s?/g,'\n').trim()
        return `<div class="check-box"><div class="title">⚠️ 제출 전 반드시 확인하세요</div>${inner}</div>`
      })
      html=html.replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')
      printWindow.document.write('<p>'+html+'</p>')
      printWindow.document.write('</body></html>')
      printWindow.document.close()
      setTimeout(()=>{printWindow.print()},500)
    } else {
      const b=new Blob([text],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=m.name+'.'+fmt;a.click()
    }
  }
  const render=(t:string)=>{
    let html=t.replace(/(\|.+\|\n)+/g,(block)=>mdTableToHtml(block,false))
    html=html.replace(/━+/g,'<hr style="border:none;border-top:2px solid #333;margin:16px 0">')
    // 양식 섹션 헤더 (■ 1. 문제 인식, ■ 일반현황 등)
    html=html.replace(/^#{1,2}\s*■\s*(.+)$/gm,'<div style="background:#1a1a2e;color:white;padding:10px 16px;margin:24px 0 12px;border-radius:4px;font-size:15px;font-weight:700">$1</div>')
    html=html.replace(/^#{1,2}\s*□\s*(.+)$/gm,'<div style="background:#f8f9fa;border:2px solid #333;padding:10px 16px;margin:24px 0 12px;border-radius:4px;font-size:15px;font-weight:700;color:#111">□ $1</div>')
    // 일반 헤딩
    html=html.replace(/^### (.+)$/gm,'<h3 style="font-size:14px;font-weight:600;color:#333;margin:14px 0 6px">$1</h3>')
    html=html.replace(/^## (.+)$/gm,'<h2 style="font-size:16px;font-weight:600;color:#222;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid #e8e8e8">$1</h2>')
    html=html.replace(/^# (.+)$/gm,'<h1 style="font-size:20px;font-weight:700;color:#111;margin-bottom:8px">$1</h1>')
    html=html.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    // ◦/- 불릿 스타일
    html=html.replace(/^◦\s*(.+)$/gm,'<div style="margin:12px 0 4px 8px;padding-left:12px;border-left:3px solid #2196F3;font-weight:600;color:#1a1a2e">◦ $1</div>')
    html=html.replace(/^-\s+(.+)$/gm,'<div style="margin:2px 0 2px 28px;color:#444;line-height:1.7">- $1</div>')
    // [확인 필요] 하이라이트
    html=html.replace(/\[확인 필요\]/g,'<span style="background:#FFF3CD;color:#856404;padding:1px 6px;border-radius:3px;font-size:12px;font-weight:600;border:1px solid #FFEEBA">📝 확인 필요</span>')
    // < 표 제목 > 스타일
    html=html.replace(/&lt;\s*(.+?)\s*&gt;/g,'<div style="text-align:center;font-size:13px;font-weight:600;color:#555;margin:12px 0 4px">< $1 ></div>')
    // ⚠️ 작성자 확인 필요 블록
    html=html.replace(/(?:^|<br>)((?:>.*(?:<br>|$))+)/g,(match)=>{
      if(!match.includes('확인 필요')&&!match.includes('보완'))return match
      const inner=match.replace(/(?:^|<br>)>\s?/g,'<br>').replace(/^<br>/,'')
      return `<div style="background:linear-gradient(135deg,#FFF8E1,#FFF3CD);border:2px solid #FFB300;border-radius:12px;padding:20px 24px;margin:20px 0;box-shadow:0 2px 8px rgba(255,179,0,0.15)"><div style="font-size:16px;font-weight:700;color:#E65100;margin-bottom:12px">⚠️ 제출 전 반드시 확인하세요</div>${inner}</div>`
    })
    html=html.replace(/\n\n/g,'</p><p style="margin-bottom:10px">')
    html=html.replace(/\n/g,'<br>')
    return html
  }

  if(ld)return<div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>로딩 중...</div>
  if(!m)return<div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>모듈 없음</div>

  const isFreeRegen=regenCount===0

  return(
    <div className="max-w-[760px] mx-auto pt-6 pb-16 animate-in">
      <button onClick={()=>router.push('/market')} className="text-[12.5px] hover:opacity-70 mb-3 inline-block" style={{color:'var(--text-muted)'}}>← 마켓</button>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div><h2 className="text-[17px] font-bold">{m.icon} {m.name}</h2><p className="text-[12px]" style={{color:'var(--text-muted)'}}>{m.category}</p></div>
        <div className="flex gap-1.5 flex-wrap">
          {!isLocked&&<>
            <select value={fmt} onChange={e=>setFmt(e.target.value)} className="px-2.5 py-1.5 rounded-[5px] text-[12px] border" style={{background:'var(--surface)',borderColor:'var(--border-strong)',color:'var(--text)'}}>{Array.from(new Set([...(m.output_formats||['pdf']),'hwpx'])).map((f:string)=><option key={f} value={f}>{f==='hwpx'?'HWPX (한글)':f.toUpperCase()}</option>)}</select>
            <button onClick={dl} className="px-3 py-1.5 font-semibold text-[12px] rounded-md" style={{background:'var(--accent)',color:'var(--bg)'}}>다운로드</button>
          </>}
          {!isLocked&&(editing
            ?<><button onClick={saveEdit} disabled={saving} className="px-3 py-1.5 font-semibold text-[12px] rounded-md disabled:opacity-50" style={{background:'#5B8DEF',color:'white'}}>{saving?'저장 중...':'수정 완료'}</button>
              <button onClick={cancelEdit} className="px-3 py-1.5 rounded-md text-[12px] border" style={{borderColor:'var(--border-strong)',color:'var(--text-muted)'}}>취소</button></>
            :<button onClick={startEdit} className="px-3 py-1.5 rounded-md text-[12px] border hover:opacity-80" style={{borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>수정하기</button>
          )}
          {!isLocked&&<button onClick={handleRegen} disabled={regenerating} className="px-3 py-1.5 border rounded-md text-[12px] disabled:opacity-50 hover:opacity-80" style={isFreeRegen?{borderColor:'var(--accent-border)',color:'var(--accent)'}:{borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>
            {regenerating?'생성 중...':isFreeRegen?'🔄 재생성 (1회 무료)':`🔄 재생성 · ₩${(m.price_krw||0).toLocaleString()}`}
          </button>}
        </div>
      </div>

      {regenerating&&<div className="rounded-[10px] p-6 mb-3 text-center border" style={{background:'var(--surface)',borderColor:'var(--border)'}}><div className="spinner mx-auto mb-2.5"/><p className="text-[13px] font-medium">재생성 중...</p><div className="mt-2.5 rounded h-[3px] max-w-[240px] mx-auto overflow-hidden" style={{background:'var(--surface-hover)'}}><div className="h-full rounded transition-all duration-500" style={{width:regenProg+'%',background:'var(--accent)'}}/></div></div>}

      {/* A4 문서 스타일 미리보기 */}
      <div className="rounded-[10px] overflow-hidden border" style={{borderColor:'var(--border-strong)'}}>
        <div className="flex items-center justify-between px-3.5 py-2 border-b" style={{background:'var(--surface-hover)',borderColor:'var(--border)'}}>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium" style={{color:'var(--text-secondary)'}}>📄 {m.name}</span>
            {editing&&<span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{background:'rgba(91,141,239,0.1)',color:'#5B8DEF'}}>편집 중</span>}
            {isLocked&&<span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{background:'var(--error-bg)',color:'var(--error-text)'}}>🔒 잠김</span>}
          </div>
          <span className="text-[10px]" style={{color:'var(--text-muted)'}}>{isLocked?'결제 후 전체 보기':'A4 미리보기'}</span>
        </div>
        {editing?<textarea ref={textareaRef} value={editText} onChange={e=>{setEditText(e.target.value);if(textareaRef.current){textareaRef.current.style.height='auto';textareaRef.current.style.height=textareaRef.current.scrollHeight+'px'}}} className="w-full min-h-[320px] sm:min-h-[480px] p-7 text-[13.5px] leading-[1.8] font-mono resize-none outline-none" style={{background:'var(--preview-bg)',color:'var(--preview-text)'}} spellCheck={false}/>
        :isLocked?(
          <div className="relative">
            <div className="p-7 text-[13.5px] leading-[1.8]" style={{background:'var(--preview-bg)',color:'var(--preview-text)',maxHeight:'500px',overflow:'hidden'}} dangerouslySetInnerHTML={{__html:'<p>'+render(result.substring(0,3000))+'</p>'}}/>
            <div className="absolute bottom-0 left-0 right-0 h-[200px]" style={{background:'linear-gradient(transparent, var(--preview-bg) 70%)'}}/>
            <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
              <p className="text-[14px] font-semibold mb-2" style={{color:'var(--preview-text)'}}>전체 결과물을 확인하세요</p>
              <p className="text-[12px] mb-4" style={{color:'#888'}}>결제 후 전체 내용 열람 + 편집 + 다운로드가 가능합니다.</p>
              <button onClick={handleUnlock} disabled={unlocking} className="px-6 py-3 font-semibold text-[14px] rounded-lg disabled:opacity-50" style={{background:'var(--accent)',color:'white'}}>
                {unlocking?'처리 중...':`전체 보기 · ₩${(m.price_krw||0).toLocaleString()}`}
              </button>
            </div>
          </div>
        )
        :<div className="p-7 min-h-[320px] sm:min-h-[480px] text-[13.5px] leading-[1.8]" style={{background:'var(--preview-bg)',color:'var(--preview-text)'}} dangerouslySetInnerHTML={{__html:'<p>'+render(result)+'</p>'}}/>}
        <div className="px-4 py-3 border-t" style={{borderColor:'var(--border)',background:'var(--surface-hover)'}}>
          <p className="text-[11px] leading-relaxed" style={{color:'var(--text-muted)'}}>⚠️ 본 문서는 AI가 자동 생성한 초안이며, <strong style={{color:'var(--text-secondary)'}}>모든 내용은 반드시 검토가 필요합니다.</strong> 수치, 통계, 사업비 등은 실제 데이터로 확인·수정 후 제출하세요. [확인 필요] 표시 항목은 반드시 보완이 필요합니다.</p>
        </div>
      </div>
      {chains.length>0&&<div className="rounded-[10px] p-4 mt-3 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}><p className="text-[12px] font-semibold mb-2" style={{color:'var(--text-muted)'}}>🔗 연결 모듈</p><div className="flex gap-1.5 flex-wrap">{chains.map(c=><button key={c.id} onClick={()=>router.push('/execute?id='+c.id)} className="px-3 py-1.5 border rounded-md text-[12px]" style={{borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>{c.icon} {c.name}</button>)}</div></div>}
    </div>
  )
}
export default function PreviewPage(){return<Suspense fallback={<div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>로딩 중...</div>}><Pv/></Suspense>}
