'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { categories } from '@/lib/modules'

const ML:Record<string,string> = {oneclick:'⚡ 원클릭',form:'📝 폼',chat:'💬 대화',alert:'🔔 알림'}

const render=(t:string)=>t.replace(/^### (.+)$/gm,'<h3 style="font-size:13px;font-weight:600;color:#333;margin:10px 0 4px">$1</h3>').replace(/^## (.+)$/gm,'<h2 style="font-size:15px;font-weight:600;color:#222;margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid #e8e8e8">$1</h2>').replace(/^# (.+)$/gm,'<h1 style="font-size:18px;font-weight:700;color:#111;margin-bottom:6px">$1</h1>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n\n/g,'</p><p style="margin-bottom:8px">').replace(/\n/g,'<br>')

export default function MarketPage() {
  const [cat,setCat]=useState('전체');const [search,setSearch]=useState('');const [mods,setMods]=useState<any[]>([]);const [loading,setLoading]=useState(true);const router=useRouter()
  const [selected,setSelected]=useState<any>(null);const [showSample,setShowSample]=useState(false)

  useEffect(()=>{supabase.from('modules').select('*').eq('status','active').order('uses',{ascending:false}).then(({data})=>{if(data)setMods(data);setLoading(false)})},[])
  const list=mods.filter(m=>{if(cat!=='전체'&&m.category!==cat)return false;if(search&&!m.name.includes(search)&&!(m.description||'').includes(search))return false;return true})

  const modeStyle=(mode:string)=>({background:`var(--mode-${mode}-bg)`,color:`var(--mode-${mode}-text)`,borderColor:`var(--mode-${mode}-border)`})
  const modeBg=(mode:string)=>`var(--mode-${mode}-bg)`

  return(
    <div className="pt-6 pb-16 animate-in">
      <h2 className="text-lg font-bold mb-1">모듈 마켓</h2><p className="text-xs mb-4" style={{color:'var(--text-muted)'}}>필요한 AI 에이전트를 선택하고 바로 실행하세요</p>
      <div className="relative mb-4"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{color:'var(--text-muted)'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="모듈 검색..." className="w-full pl-10 pr-4 py-2.5 rounded-[7px] text-[13px] border" style={{background:'var(--surface)',borderColor:'var(--border-strong)',color:'var(--text)'}} /></div>
      <div className="flex gap-1 overflow-x-auto pb-1 mb-4" style={{scrollbarWidth:'none'}}>{categories.map(c=><button key={c} onClick={()=>setCat(c)} className={`px-3.5 py-1.5 rounded-2xl text-xs font-medium border whitespace-nowrap transition-all`} style={c===cat?{background:'var(--accent)',color:'var(--bg)',borderColor:'var(--accent)'}:{borderColor:'var(--border)',color:'var(--text-muted)'}}>{c}{c!=='전체'?' '+mods.filter(m=>m.category===c).length:''}</button>)}</div>
      {loading?<div className="text-center py-20" style={{color:'var(--text-muted)'}}>로딩 중...</div>:list.length===0?<div className="text-center py-20" style={{color:'var(--text-muted)'}}>{search?`"${search}" 결과 없음`:'모듈이 없습니다'}</div>:
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">{list.map(m=>
        <div key={m.id} onClick={()=>setSelected(m)} className="rounded-[10px] p-4 cursor-pointer border transition-all hover:opacity-90 relative" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
          <div className="absolute top-3 right-3"><span className="inline-flex px-2 py-0.5 rounded text-[10.5px] font-semibold border" style={modeStyle(m.mode)}>{ML[m.mode]||m.mode}</span></div>
          <div className="flex items-start gap-2.5 mb-2"><div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{background:modeBg(m.mode)}}>{m.icon||'📄'}</div><div><div className="text-[13.5px] font-semibold mb-0.5 pr-16">{m.name}</div><div className="text-[11.5px] leading-relaxed" style={{color:'var(--text-muted)'}}>{m.description}</div></div></div>
          <div className="flex items-center gap-1.5 mt-2.5 text-[11px]" style={{color:'var(--text-muted)'}}><span style={{color:'var(--accent)',fontWeight:600}}>{(m.price_krw||0)===0?'무료':`₩${(m.price_krw||0).toLocaleString()}${m.mode==='alert'?'/월':''}`}</span><span className="w-0.5 h-0.5 rounded-full" style={{background:'var(--text-muted)'}}/><span>{(m.uses||0).toLocaleString()}회</span>{m.sample_output&&<><span className="w-0.5 h-0.5 rounded-full" style={{background:'var(--text-muted)'}}/><span style={{color:'var(--accent)'}}>예시</span></>}</div>
        </div>
      )}</div>}

      {/* 모듈 상세 모달 */}
      {selected&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>{setSelected(null);setShowSample(false)}}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
        <div className="relative rounded-xl w-full max-w-[560px] max-h-[85vh] overflow-y-auto border" style={{background:'var(--surface)',borderColor:'var(--border)'}} onClick={e=>e.stopPropagation()}>
          <div className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center text-2xl flex-shrink-0" style={{background:modeBg(selected.mode)}}>{selected.icon||'📄'}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5"><span className="text-[16px] font-bold">{selected.name}</span><span className="inline-flex px-2 py-0.5 rounded text-[10.5px] font-semibold border" style={modeStyle(selected.mode)}>{ML[selected.mode]}</span></div>
                <p className="text-[12.5px]" style={{color:'var(--text-muted)'}}>{selected.description}</p>
              </div>
              <button onClick={()=>{setSelected(null);setShowSample(false)}} className="text-xl leading-none hover:opacity-70" style={{color:'var(--text-muted)'}}>×</button>
            </div>

            <div className="flex items-center gap-3 mb-4 text-[12px]" style={{color:'var(--text-muted)'}}>
              <span>{(selected.price_krw||0)===0?'무료':`₩${(selected.price_krw||0).toLocaleString()}`}</span>
              <span className="w-0.5 h-0.5 rounded-full" style={{background:'var(--text-muted)'}}/>
              <span>{selected.category}</span>
              <span className="w-0.5 h-0.5 rounded-full" style={{background:'var(--text-muted)'}}/>
              <span>{(selected.uses||0).toLocaleString()}회 사용</span>
              {selected.expected_pages&&<><span className="w-0.5 h-0.5 rounded-full" style={{background:'var(--text-muted)'}}/><span>{selected.expected_pages}페이지</span></>}
            </div>

            {selected.tags?.length>0&&<div className="flex gap-1 flex-wrap mb-4">{selected.tags.map((t:string)=><span key={t} className="px-2 py-0.5 rounded text-[10.5px] border" style={{background:'var(--surface-hover)',borderColor:'var(--border)',color:'var(--text-muted)'}}>{t}</span>)}</div>}

            {/* 미리보기 */}
            {!showSample&&<button onClick={()=>setShowSample(true)} className="w-full mb-4 py-2.5 rounded-lg text-[13px] border transition-all hover:opacity-80" style={{borderColor:'var(--accent-border)',color:'var(--accent)'}}>미리보기</button>}

            {showSample&&<div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold" style={{color:'var(--text-secondary)'}}>미리보기</span>
                <button onClick={()=>setShowSample(false)} className="text-[11px]" style={{color:'var(--text-muted)'}}>접기</button>
              </div>
              {selected.sample_output?(
                <div className="rounded-lg overflow-hidden border" style={{borderColor:'var(--border-strong)'}}>
                  <div className="p-5 max-h-[250px] overflow-y-auto text-[12.5px] leading-[1.7]" style={{background:'var(--preview-bg)',color:'var(--preview-text)'}} dangerouslySetInnerHTML={{__html:'<p>'+render(selected.sample_output)+'</p>'}}/>
                </div>
              ):(selected.mode==='alert'||selected.output_mode==='automation')?(
                <div className="rounded-lg overflow-hidden border p-3" style={{borderColor:'var(--border-strong)',background:'#F5F5F5'}}>
                  <div className="max-w-[420px] mx-auto rounded-lg overflow-hidden shadow-sm" style={{background:'white'}}>
                    <div className="px-4 py-3 border-b" style={{borderColor:'#eee'}}>
                      <div className="text-[10px]" style={{color:'#999'}}>From: alert@crypee.biz</div>
                      <div className="text-[12px] font-semibold mt-0.5" style={{color:'#111'}}>[crypee agent] 정부지원사업 공고 3건</div>
                    </div>
                    <div className="px-4 py-3 text-[11px] leading-[1.6]" style={{color:'#333'}}>
                      <p className="mb-2"><strong>홍길동</strong>님, 조건에 맞는 공고 <strong>3건</strong></p>
                      {['2026년 예비창업패키지 모집','AI 기술 사업화 지원','소상공인 디지털전환'].map(t=><div key={t} className="p-2 mb-1 rounded" style={{border:'1px solid #eee'}}><div className="font-semibold" style={{fontSize:'11px'}}>{t}</div><div style={{fontSize:'10px',color:'#888'}}>접수중</div></div>)}
                    </div>
                  </div>
                </div>
              ):(
                <div className="p-5 rounded-lg text-center border border-dashed" style={{borderColor:'var(--border-strong)'}}>
                  <p className="text-[12px]" style={{color:'var(--text-muted)'}}>예시 결과물 준비 중</p>
                </div>
              )}
            </div>}

            <div className="flex gap-2">
              <button onClick={()=>{setSelected(null);setShowSample(false);router.push(selected.mode==='alert'?'/alerts/setup?module='+selected.id:'/execute?id='+selected.id)}} className="flex-1 py-3 font-semibold text-[13px] rounded-lg hover:opacity-90 transition-all" style={{background:'var(--accent)',color:'var(--bg)'}}>{selected.mode==='alert'?'알림 설정하기':(selected.price_krw||0)===0?'무료 실행':`실행하기 · ₩${(selected.price_krw||0).toLocaleString()}`}</button>
              <button onClick={()=>{setSelected(null);setShowSample(false);router.push('/module/'+selected.id)}} className="px-4 py-3 text-[13px] rounded-lg border hover:opacity-80" style={{borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>상세</button>
            </div>
          </div>
        </div>
      </div>}
    </div>
  )
}
