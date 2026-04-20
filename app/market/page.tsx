'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { categories } from '@/lib/modules'

const ML:Record<string,string> = {oneclick:'⚡ 원클릭',form:'📝 폼',chat:'💬 대화',alert:'🔔 알림',bizplan:'📝 폼'}

const render=(t:string)=>t.replace(/^### (.+)$/gm,'<h3 style="font-size:13px;font-weight:600;color:#333;margin:10px 0 4px">$1</h3>').replace(/^## (.+)$/gm,'<h2 style="font-size:15px;font-weight:600;color:#222;margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid #e8e8e8">$1</h2>').replace(/^# (.+)$/gm,'<h1 style="font-size:18px;font-weight:700;color:#111;margin-bottom:6px">$1</h1>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n\n/g,'</p><p style="margin-bottom:8px">').replace(/\n/g,'<br>')

const isSepRow=(row:string)=>{const cells=row.replace(/^\||\|$/g,'').split('|');return cells.length>0&&cells.every(c=>/^[\s:\-]*$/.test(c))&&cells.some(c=>c.includes('-'))}
const tblHtml=(block:string)=>{const rows=block.trim().split('\n').filter(r=>r.includes('|')&&!isSepRow(r));if(!rows.length)return block;let t='<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:11px">';rows.forEach((r,i)=>{const cells=r.split('|').filter(c=>c.trim()!=='');const tag=i===0?'th':'td';const st=i===0?'background:#f5f5f5;font-weight:600;':'';t+='<tr>'+cells.map(c=>`<${tag} style="border:1px solid #ddd;padding:6px 8px;${st}">${c.trim()}</${tag}>`).join('')+'</tr>'});return t+'</table>'}
const renderBp=(t:string)=>{
  const tv=(k:string)=>{const m=t.match(new RegExp('\\|\\s*'+k+'\\s*\\|\\s*([^|\\n]+)','i'));return m?.[1]?.replace(/\*\*/g,'').trim()||''}
  const gs=(s:string,e:string|null)=>{const i=t.indexOf(s);if(i<0)return '';const a=t.substring(i+s.length);const j=e?a.search(new RegExp(e)):a.length;return a.substring(0,j>0?j:a.length).trim()}
  const bh=(b:string)=>{let h=b;h=h.replace(/(\|.+\|\n)+/g,block=>tblHtml(block));h=h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');h=h.replace(/^◦\s*(.+)$/gm,'<div style="margin:8px 0 2px;padding:4px 8px;background:#F8FAFC;border-left:3px solid #2563EB;font-weight:600;font-size:11px;color:#1E293B;line-height:1.5">◦ $1</div>');h=h.replace(/^- (.+)$/gm,'<div style="margin:1px 0 1px 16px;padding:1px 0;color:#374151;font-size:11px;line-height:1.5">- $1</div>');h=h.replace(/\[확인 필요\]/g,'<span style="background:#FFF3CD;color:#856404;padding:0 3px;border-radius:2px;font-size:9px;font-weight:600">확인 필요</span>');h=h.replace(/&lt;\s*(.+?)\s*&gt;/g,'<div style="text-align:center;font-size:10px;font-weight:600;color:#64748B;margin:8px 0 3px">&lt; $1 &gt;</div>');h=h.replace(/\n\n/g,'<br>');h=h.replace(/\n/g,'<br>');return h}
  const S='style',th=`${S}="border:1px solid #333;padding:5px 8px;background:#F0F0F0;font-weight:600;font-size:10px;text-align:center;vertical-align:middle"`,td=`${S}="border:1px solid #333;padding:5px 8px;font-size:10px;vertical-align:top;line-height:1.5"`,hdr=`${S}="background:#1B2A4A;color:white;padding:6px 10px;font-size:11px;font-weight:700;margin:14px 0 6px;border-left:3px solid #3B82F6"`,tbl=`${S}="width:100%;border-collapse:collapse;margin:6px 0"`
  const s1=gs('■ 1. 문제','■ 2. 실현')||gs('1. 문제 인식','2. 실현'),s2=gs('■ 2. 실현','■ 3. 성장')||gs('2. 실현 가능성','3. 성장'),s3=gs('■ 3. 성장','■ 4. 팀')||gs('3. 성장전략','4. 팀'),s4=gs('■ 4. 팀','$')||gs('4. 팀 구성','$')
  return `<div ${S}="font-family:'Noto Sans KR',sans-serif;font-size:10px;line-height:1.5;color:#111">
<div ${S}="text-align:center;font-size:13px;font-weight:800;margin-bottom:3px">예비창업패키지 사업계획서</div>
<div ${hdr}>□ 일반현황</div>
<table ${tbl}><tr><th ${th} width="22%">창업아이템명</th><td ${td} colspan="3">${tv('창업아이템명')||tv('아이템명')||'[확인 필요]'}</td></tr>
<tr><th ${th}>산출물</th><td ${td} colspan="3">${tv('산출물')||'[확인 필요]'}</td></tr></table>
<div ${hdr}>□ 개요(요약)</div>
<table ${tbl}><tr><th ${th} width="15%">명 칭</th><td ${td} width="35%">${tv('명\\s*칭')||'[확인 필요]'}</td><th ${th} width="15%">범 주</th><td ${td} width="35%">${tv('범\\s*주')||'[확인 필요]'}</td></tr>
<tr><th ${th}>아이템 개요</th><td ${td} colspan="3">${tv('아이템 개요')||'[확인 필요]'}</td></tr></table>
<div ${hdr}>1. 문제 인식 (Problem)</div>${bh(s1)}
<div ${hdr}>2. 실현 가능성 (Solution)</div>${bh(s2)}
<div ${hdr}>3. 성장전략 (Scale-up)</div>${bh(s3)}
<div ${hdr}>4. 팀 구성 (Team)</div>${bh(s4)}
</div>`
}

export default function MarketPage() {
  const [cat,setCat]=useState('전체');const [search,setSearch]=useState('');const [mods,setMods]=useState<any[]>([]);const [loading,setLoading]=useState(true);const router=useRouter()
  const [selected,setSelected]=useState<any>(null);const [showSample,setShowSample]=useState(false)

  useEffect(()=>{supabase.from('modules').select('*').eq('status','active').order('uses',{ascending:false}).then(({data})=>{if(data)setMods(data);setLoading(false)})},[])
  const list=mods.filter(m=>{if(cat!=='전체'&&m.category!==cat)return false;if(search&&!m.name.includes(search)&&!(m.description||'').includes(search))return false;return true})

  const modeStyle=(mode:string)=>({background:`var(--mode-${mode}-bg)`,color:`var(--mode-${mode}-text)`,borderColor:`var(--mode-${mode}-border)`})
  const modeBg=(mode:string)=>`var(--mode-${mode}-bg)`

  return(
    <div className="pt-6 pb-16 animate-in">
      <div className="flex items-center justify-between mb-1"><h2 className="text-lg font-bold">모듈 마켓</h2><button onClick={()=>router.push('/request')} className="px-3 py-1.5 rounded-lg text-[12px] font-medium border hover:opacity-80 transition-all" style={{borderColor:'var(--accent-border)',color:'var(--accent)'}}>💬 모듈 문의</button></div><p className="text-xs mb-4" style={{color:'var(--text-muted)'}}>필요한 AI 에이전트를 선택하고 바로 실행하세요</p>
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
        <div className="relative rounded-xl w-full max-w-[560px] max-h-[92vh] overflow-y-auto border" style={{background:'var(--surface)',borderColor:'var(--border)'}} onClick={e=>e.stopPropagation()}>
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
              <span>{selected.mode==='bizplan'?(selected.price_krw||0)>0?`₩${(selected.price_krw||0).toLocaleString()} (열람)`:'무료':(selected.price_krw||0)===0?'무료':`₩${(selected.price_krw||0).toLocaleString()}`}</span>
              <span className="w-0.5 h-0.5 rounded-full" style={{background:'var(--text-muted)'}}/>
              <span>{selected.category}</span>
              <span className="w-0.5 h-0.5 rounded-full" style={{background:'var(--text-muted)'}}/>
              <span>{(selected.uses||0).toLocaleString()}회 사용</span>
              {selected.expected_pages&&<><span className="w-0.5 h-0.5 rounded-full" style={{background:'var(--text-muted)'}}/><span>{selected.expected_pages}페이지</span></>}
            </div>

            {selected.tags?.length>0&&<div className="flex gap-1 flex-wrap mb-4">{selected.tags.map((t:string)=><span key={t} className="px-2 py-0.5 rounded text-[10.5px] border" style={{background:'var(--surface-hover)',borderColor:'var(--border)',color:'var(--text-muted)'}}>{t}</span>)}</div>}

            {/* 미리보기 (바로 표시) */}
            <div className="mb-4">
              <p className="text-[12px] font-semibold mb-2" style={{color:'var(--text-secondary)'}}>미리보기</p>
              {selected.id==='MODOO001'?(
                <div className="rounded-lg overflow-hidden border" style={{borderColor:'var(--border-strong)'}}>
                  <div className="p-5 max-h-[480px] overflow-y-auto text-[12px] leading-[1.8]" style={{background:'var(--preview-bg)',color:'var(--preview-text)'}}>
                    <div className="text-[13px] font-bold mb-3" style={{color:'#333'}}>예시 출력물</div>
                    <div style={{color:'#555',fontSize:'12px'}}>
                      <p className="font-semibold mb-1" style={{color:'#333'}}>## Q2. 아이디어를 떠올린 배경 이야기를 들려주세요.</p>
                      <p className="mb-3">저는 소규모 창업을 준비하면서 정부 지원사업 공고를 찾는 데 예상보다 훨씬 많은 시간을 써야 한다는 것을 깨달았습니다. 창업진흥원, 중소기업진흥공단, 각 지자체 홈페이지를 따로따로 들어가서 공고를 확인하고, 자격 조건이 맞는지 하나씩 읽어봐야 했습니다. 어느 날 딱 제 조건에 맞는 지원사업 마감일을 하루 놓쳤을 때, 이 과정을 AI가 대신해 줄 수 있다면 얼마나 좋을까 생각했습니다. 그것이 이 서비스를 시작한 계기입니다.</p>
                      <p className="font-semibold mb-1" style={{color:'#333'}}>## Q3. 아이디어는 누구의 어떤 문제를 해결해주나요?</p>
                      <p className="mb-3">주요 대상은 정부 지원사업의 존재는 알지만 공고를 찾고 자격을 확인하는 과정이 번거로워 포기하는 예비창업자와 소규모 사업자입니다. 기존 알림 서비스들은 개인 조건을 반영하지 않아 무관한 공고가 쏟아지는 문제가 있었습니다. 저희 서비스는 사용자 프로필을 기반으로 AI가 적합한 공고만 선별하고, 신청서 초안 작성까지 보조하여 지원 성공률을 높입니다.</p>
                      <p className="font-semibold mb-1" style={{color:'#333'}}>## Q4. 아이디어를 어떻게 실현하고 싶으신가요?</p>
                      <p className="mb-3">모두의 창업 프로그램의 지원금으로 공고 수집 파이프라인과 AI 매칭 알고리즘을 고도화할 계획입니다. 멘토링을 통해 실제 창업자들이 어떤 부분에서 가장 큰 어려움을 겪는지 현장 의견을 듣고 싶습니다. 최종 목표는 국내 창업자 누구나 지원사업 기회를 놓치지 않도록 돕는 AI 플랫폼을 완성하는 것입니다.</p>
                      <p className="font-semibold mb-1" style={{color:'#333'}}>## 📷 첨부 사진 추천 (최대 5장)</p>
                      <p>사진 1 — 서비스 화면 스크린샷 · 사진 2 — 아이디어 메모/화이트보드 · 사진 3 — 복잡한 공고 목록 캡처 · 사진 4 — 창업 행사/멘토 상담 · 사진 5 — 타겟 고객 모습</p>
                    </div>
                    <div className="mt-3 p-2.5 rounded-lg text-[11px]" style={{background:'#f0f7ff',color:'#2b7de9'}}>✅ 생성 후 ₩990 결제 시 전체 열람 · 편집 · 다운로드</div>
                  </div>
                </div>
              ):selected.id?.startsWith('BLOG')?(
                <div className="rounded-lg overflow-hidden border" style={{borderColor:'var(--border-strong)'}}>
                  <div className="p-5" style={{background:'var(--preview-bg)'}}>
                    {selected.id==='BLOG01'?(
                      <div className="text-[12px] leading-[1.8]" style={{color:'var(--preview-text)'}}>
                        <div className="text-[13px] font-bold mb-3" style={{color:'#333'}}>이렇게 만들어요</div>
                        <div className="flex flex-col gap-2.5">
                          {[{n:'1',t:'업종 선택',d:'미용실, 카페, 음식점 등 9개 업종'},
                            {n:'2',t:'말투 선택',d:'친근한 사장님 / 전문가 / 편한 친구 / 정보 전달형'},
                            {n:'3',t:'매장 정보',d:'매장명 + 연락처, 주소, 예약 링크 (선택)'},
                            {n:'4',t:'주제 & 내용',d:'오늘의 주제 + 짧은 경험담 1~3줄'},
                            {n:'5',t:'사진 업로드',d:'1~5장 사진 → AI가 분석해서 글에 반영'},
                            {n:'6',t:'완성!',d:'SEO 최적화 글 + 이미지 → 복사해서 티스토리에 붙여넣기'}
                          ].map(s=>(
                            <div key={s.n} className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'var(--accent)',color:'#fff'}}>{s.n}</span>
                              <div><div className="text-[12px] font-semibold" style={{color:'#333'}}>{s.t}</div><div className="text-[11px]" style={{color:'#888'}}>{s.d}</div></div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 p-3 rounded-lg" style={{background:'#f0f7ff'}}>
                          <div className="text-[11px] font-semibold mb-1" style={{color:'#2b7de9'}}>출력 결과물</div>
                          <div className="text-[11px]" style={{color:'#555'}}>
                            <strong>제목:</strong> SEO 최적화 제목 (15~30자)<br/>
                            <strong>본문:</strong> 2,500~4,000자 + 이모지 + 소제목 4~6개<br/>
                            <strong>사진:</strong> 업로드한 사진이 글 중간에 자동 배치<br/>
                            <strong>해시태그:</strong> 검색량 기반 10~15개<br/>
                            <strong>매장 안내:</strong> 연락처 · 주소 · 예약 링크 자동 삽입
                          </div>
                        </div>
                      </div>
                    ):(
                      <div className="text-[12px] leading-[1.8]" style={{color:'var(--preview-text)'}}>
                        <div className="text-[13px] font-bold mb-3" style={{color:'#333'}}>일괄 생성 프로세스</div>
                        <div className="flex flex-col gap-2.5">
                          {[{n:'1',t:'업종 + 매장 정보',d:'업종 선택 + 매장명, 연락처, 주소'},
                            {n:'2',t:'편수 선택',d:'12편 ₩9,900 / 24편 ₩19,900 / 36편 ₩29,900'},
                            {n:'3',t:'카테고리별 사진 업로드',d:'원하는 카테고리에 사진 업로드 + 커스텀 카테고리 추가 가능'},
                            {n:'4',t:'무료 미리보기',d:'AI가 전부 생성 → 미리보기로 확인 + 수정'},
                            {n:'5',t:'결제 → 복사/이메일',d:'만족하면 결제 → 글+이미지 복사 · 이메일 발송'}
                          ].map(s=>(
                            <div key={s.n} className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:'var(--accent)',color:'#fff'}}>{s.n}</span>
                              <div><div className="text-[12px] font-semibold" style={{color:'#333'}}>{s.t}</div><div className="text-[11px]" style={{color:'#888'}}>{s.d}</div></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ):selected.sample_output?(
                <div className="rounded-lg overflow-hidden border" style={{borderColor:'var(--border-strong)'}}>
                  <div className="p-5 max-h-[480px] overflow-y-auto text-[12.5px] leading-[1.7]" style={{background:'var(--preview-bg)',color:'var(--preview-text)'}} dangerouslySetInnerHTML={{__html:selected.id?.startsWith('BP')?renderBp(selected.sample_output):'<p>'+render(selected.sample_output)+'</p>'}}/>
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
            </div>

            <div className="flex gap-2">
              <button onClick={()=>{setSelected(null);setShowSample(false);router.push(selected.id==='BLOG01'?'/blog/write':selected.id==='BLOG02'?'/blog/pro':selected.id==='M200'?'/detail-page':selected.mode==='alert'?'/alerts/setup?module='+selected.id:'/execute?id='+selected.id)}} className="flex-1 py-3 font-semibold text-[13px] rounded-lg hover:opacity-90 transition-all" style={{background:'var(--accent)',color:'var(--bg)'}}>{selected.id==='BLOG01'?'단편 작성하기':selected.id==='BLOG02'?'일괄 생성하기':selected.id==='M200'?'상세페이지 만들기':selected.mode==='alert'?'알림 설정하기':selected.mode==='bizplan'?(selected.price_krw||0)>0?`생성하기 · 열람 ₩${(selected.price_krw||0).toLocaleString()}`:'생성하기':(selected.price_krw||0)===0?'무료 실행':`실행하기 · ₩${(selected.price_krw||0).toLocaleString()}`}</button>
              <button onClick={()=>{setSelected(null);setShowSample(false)}} className="px-4 py-3 text-[13px] rounded-lg border hover:opacity-80" style={{borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>닫기</button>
            </div>
          </div>
        </div>
      </div>}
    </div>
  )
}
