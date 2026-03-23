'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { categories } from '@/lib/modules'

const ML:Record<string,string> = {oneclick:'⚡ 원클릭',form:'📝 폼',chat:'💬 대화'}
const MC:Record<string,string> = {oneclick:'bg-[rgba(0,212,170,0.1)] text-[#00D4AA] border-[rgba(0,212,170,0.2)]',form:'bg-[rgba(91,141,239,0.1)] text-[#5B8DEF] border-[rgba(91,141,239,0.2)]',chat:'bg-[rgba(155,141,255,0.1)] text-[#9B8DFF] border-[rgba(155,141,255,0.2)]'}
const MB:Record<string,string> = {oneclick:'rgba(0,212,170,0.1)',form:'rgba(91,141,239,0.1)',chat:'rgba(155,141,255,0.1)'}

const render=(t:string)=>t.replace(/^### (.+)$/gm,'<h3 style="font-size:13px;font-weight:600;color:#333;margin:10px 0 4px">$1</h3>').replace(/^## (.+)$/gm,'<h2 style="font-size:15px;font-weight:600;color:#222;margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid #e8e8e8">$1</h2>').replace(/^# (.+)$/gm,'<h1 style="font-size:18px;font-weight:700;color:#111;margin-bottom:6px">$1</h1>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n\n/g,'</p><p style="margin-bottom:8px">').replace(/\n/g,'<br>')

export default function MarketPage() {
  const [cat,setCat]=useState('전체');const [search,setSearch]=useState('');const [mods,setMods]=useState<any[]>([]);const [loading,setLoading]=useState(true);const router=useRouter()
  const [selected,setSelected]=useState<any>(null);const [showSample,setShowSample]=useState(false)

  useEffect(()=>{supabase.from('modules').select('*').eq('status','active').order('uses',{ascending:false}).then(({data})=>{if(data)setMods(data);setLoading(false)})},[])
  const list=mods.filter(m=>{if(cat!=='전체'&&m.category!==cat)return false;if(search&&!m.name.includes(search)&&!(m.description||'').includes(search))return false;return true})

  return(
    <div className="pt-6 pb-16 animate-in">
      <h2 className="text-lg font-bold mb-1">모듈 마켓</h2><p className="text-xs text-[#63636E] mb-4">필요한 AI 에이전트를 선택하고 바로 실행하세요</p>
      <div className="relative mb-4"><svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#63636E] w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="모듈 검색..." className="w-full pl-10 pr-4 py-2.5 border border-white/10 rounded-[7px] text-[13px] bg-[#141417] text-white placeholder:text-[#63636E]"/></div>
      <div className="flex gap-1 overflow-x-auto pb-1 mb-4" style={{scrollbarWidth:'none'}}>{categories.map(c=><button key={c} onClick={()=>setCat(c)} className={`px-3.5 py-1.5 rounded-2xl text-xs font-medium border whitespace-nowrap transition-all ${c===cat?'bg-[#00D4AA] text-[#09090B] border-[#00D4AA]':'border-white/[.06] text-[#63636E]'}`}>{c}{c!=='전체'?' '+mods.filter(m=>m.category===c).length:''}</button>)}</div>
      {loading?<div className="text-center py-20 text-[#63636E]">로딩 중...</div>:list.length===0?<div className="text-center py-20 text-[#63636E]">{search?`"${search}" 결과 없음`:'모듈이 없습니다'}</div>:
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">{list.map(m=>
        <div key={m.id} onClick={()=>setSelected(m)} className="bg-[#141417] border border-white/[.06] rounded-[10px] p-4 cursor-pointer hover:border-white/10 hover:bg-[#1C1C20] transition-all relative">
          <div className="absolute top-3 right-3"><span className={`inline-flex px-2 py-0.5 rounded text-[10.5px] font-semibold border ${MC[m.mode]||''}`}>{ML[m.mode]||m.mode}</span></div>
          <div className="flex items-start gap-2.5 mb-2"><div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{background:MB[m.mode]||'rgba(99,99,110,0.1)'}}>{m.icon||'📄'}</div><div><div className="text-[13.5px] font-semibold mb-0.5 pr-16">{m.name}</div><div className="text-[11.5px] text-[#63636E] leading-relaxed">{m.description}</div></div></div>
          <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-[#63636E]"><span>◆ {m.credit_cost}</span><span className="w-0.5 h-0.5 rounded-full bg-[#63636E]"/><span>{(m.uses||0).toLocaleString()}회</span>{m.sample_output&&<><span className="w-0.5 h-0.5 rounded-full bg-[#63636E]"/><span className="text-[#00D4AA]">예시</span></>}</div>
        </div>
      )}</div>}

      {/* 모듈 상세 모달 */}
      {selected&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>{setSelected(null);setShowSample(false)}}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
        <div className="relative bg-[#141417] border border-white/[.06] rounded-xl w-full max-w-[560px] max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
          <div className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center text-2xl flex-shrink-0" style={{background:MB[selected.mode]}}>{selected.icon||'📄'}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5"><span className="text-[16px] font-bold">{selected.name}</span><span className={`inline-flex px-2 py-0.5 rounded text-[10.5px] font-semibold border ${MC[selected.mode]}`}>{ML[selected.mode]}</span></div>
                <p className="text-[12.5px] text-[#63636E]">{selected.description}</p>
              </div>
              <button onClick={()=>{setSelected(null);setShowSample(false)}} className="text-[#63636E] hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="flex items-center gap-3 mb-4 text-[12px] text-[#63636E]">
              <span>◆ {selected.credit_cost} 크레딧</span>
              <span className="w-0.5 h-0.5 rounded-full bg-[#63636E]"/>
              <span>{selected.category}</span>
              <span className="w-0.5 h-0.5 rounded-full bg-[#63636E]"/>
              <span>{(selected.uses||0).toLocaleString()}회 사용</span>
              {selected.expected_pages&&<><span className="w-0.5 h-0.5 rounded-full bg-[#63636E]"/><span>{selected.expected_pages}페이지</span></>}
            </div>

            {selected.tags?.length>0&&<div className="flex gap-1 flex-wrap mb-4">{selected.tags.map((t:string)=><span key={t} className="px-2 py-0.5 bg-white/[.03] border border-white/[.06] rounded text-[10.5px] text-[#63636E]">{t}</span>)}</div>}

            {/* 예시 보기 / 접기 */}
            {selected.sample_output&&!showSample&&<button onClick={()=>setShowSample(true)} className="w-full mb-4 py-2.5 border border-[#00D4AA]/20 rounded-lg text-[13px] text-[#00D4AA] hover:bg-[#00D4AA]/5 transition-all">예시 결과물 보기 (무료)</button>}

            {showSample&&selected.sample_output&&<div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold text-[#A1A1AA]">예시 결과물</span>
                <button onClick={()=>setShowSample(false)} className="text-[11px] text-[#63636E]">접기</button>
              </div>
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <div className="p-5 max-h-[300px] overflow-y-auto bg-[#FAFAF8] text-[#1a1a1a] text-[12.5px] leading-[1.7]" dangerouslySetInnerHTML={{__html:'<p>'+render(selected.sample_output)+'</p>'}}/>
              </div>
            </div>}

            {!selected.sample_output&&<div className="mb-4 py-6 text-center border border-dashed border-white/10 rounded-lg"><p className="text-[12px] text-[#63636E]">예시 결과물이 아직 준비되지 않았습니다</p></div>}

            <div className="flex gap-2">
              <button onClick={()=>{setSelected(null);setShowSample(false);router.push('/execute?id='+selected.id)}} className="flex-1 py-3 bg-[#00D4AA] text-[#09090B] font-semibold text-[13px] rounded-lg hover:bg-[#00E8BB] transition-all">실행하기 · ◆{selected.credit_cost}</button>
              <button onClick={()=>{setSelected(null);setShowSample(false)}} className="px-4 py-3 border border-white/10 text-[#A1A1AA] text-[13px] rounded-lg">닫기</button>
            </div>
          </div>
        </div>
      </div>}
    </div>
  )
}
