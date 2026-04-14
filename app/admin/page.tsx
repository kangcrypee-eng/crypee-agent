'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { MODEL_PRICING } from '@/lib/pricing'

const modeLabel: Record<string, string> = { oneclick: '⚡ 원클릭', form: '📝 폼', chat: '💬 대화', alert: '🔔 알림' }
const isSeedModule = (id: string) => /^M\d+$/.test(id)
const statusLabel: Record<string, string> = { active: '활성', draft: '초안', inactive: '비활성' }
const statusColor: Record<string, string> = { active: 'var(--accent)', draft: '#EFAA5B', inactive: 'var(--text-muted)' }

// AI 모델별 1회 예상 비용 (USD)
const MODEL_COST: Record<string, number> = { 'claude-haiku-4-5': 0.01, 'claude-sonnet-4-6': 0.10, 'claude-opus-4-6': 0.33 }

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<'dashboard' | 'modules' | 'subscribers' | 'requests' | 'scans'>('dashboard')
  const [modules, setModules] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [generations, setGenerations] = useState<any[]>([])
  const [subscribers, setSubscribers] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [revPeriod, setRevPeriod] = useState<'week'|'month'|'quarter'|'half'|'year'|'all'>('month')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!loading && !isAdmin) router.push('/')
    if (isAdmin) fetchAll()
  }, [isAdmin, loading])

  const fetchAll = async () => {
    const [mods, pays, gens, subs, reqs] = await Promise.all([
      supabase.from('modules').select('*').order('category').order('uses', { ascending: false }),
      supabase.from('payments').select('*').eq('status', 'paid'),
      supabase.from('generations').select('id, module_id, user_id, created_at'),
      supabase.from('alert_subscriptions').select('*, profiles:user_id(email, business_name, representative)'),
      supabase.from('module_requests').select('*').order('created_at', { ascending: false }),
    ])
    if (mods.data) setModules(mods.data)
    if (pays.data) setPayments(pays.data)
    if (gens.data) setGenerations(gens.data)
    if (subs.data) setSubscribers(subs.data)
    if (reqs.data) setRequests(reqs.data)
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'active' ? 'inactive' : 'active'
    await supabase.from('modules').update({ status: next, updated_at: new Date().toISOString() }).eq('id', id)
    fetchAll(); showToast(`${id} → ${statusLabel[next]}`)
  }
  const deleteModule = async (id: string) => {
    await supabase.from('module_versions').delete().eq('module_id', id)
    await supabase.from('module_references').delete().eq('module_id', id)
    await supabase.from('modules').delete().eq('id', id)
    setDeleteTarget(null); fetchAll(); showToast(`${id} 삭제 완료`)
  }
  const getModelLabel = (model: string) => MODEL_PRICING[model as keyof typeof MODEL_PRICING]?.label || model

  // 기간 필터
  const periodStart = (period: typeof revPeriod): Date => {
    const d = new Date()
    if (period === 'week') { d.setDate(d.getDate() - 7); return d }
    if (period === 'month') { d.setMonth(d.getMonth() - 1); return d }
    if (period === 'quarter') { d.setMonth(d.getMonth() - 3); return d }
    if (period === 'half') { d.setMonth(d.getMonth() - 6); return d }
    if (period === 'year') { d.setFullYear(d.getFullYear() - 1); return d }
    return new Date(0)
  }
  const filteredPayments = revPeriod === 'all' ? payments : payments.filter(p => {
    const paidAt = new Date(p.paid_at || p.created_at)
    return paidAt >= periodStart(revPeriod)
  })

  // 통계 계산
  const totalRevenue = filteredPayments.reduce((s, p) => s + (p.amount || 0), 0)
  const totalGenerations = generations.length
  const uniqueUsers = new Set(generations.map(g => g.user_id)).size
  const uniquePayers = new Set(filteredPayments.map(p => p.user_id)).size
  const activeSubs = subscribers.filter(s => s.is_active).length

  // 모듈별 통계 (기간 필터 반영)
  const moduleStats = (moduleId: string) => {
    const uses = generations.filter(g => g.module_id === moduleId).length
    const users = new Set(generations.filter(g => g.module_id === moduleId).map(g => g.user_id)).size
    const payers = new Set(filteredPayments.filter(p => p.module_id === moduleId).map(p => p.user_id)).size
    const revenue = filteredPayments.filter(p => p.module_id === moduleId).reduce((s, p) => s + (p.amount || 0), 0)
    return { uses, users, payers, revenue }
  }

  const filtered = filter === 'all' ? modules : modules.filter(m => m.status === filter)

  if (loading) return <div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>로딩 중...</div>
  if (!isAdmin) return null

  return (
    <div className="pt-6 pb-16 animate-in">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">어드민</h2>
          <p className="text-[13px]" style={{color:'var(--text-muted)'}}>대시보드 · 모듈 관리 · 구독자</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/admin/bizplan')} className="px-4 py-2.5 font-semibold text-[13px] rounded-lg hover:opacity-90 border" style={{borderColor:'var(--accent-border)',color:'var(--accent)'}}>📋 사업계획서 모듈</button>
          <button onClick={() => router.push('/admin/upload')} className="px-5 py-2.5 font-semibold text-[13px] rounded-lg hover:opacity-90" style={{background:'var(--accent)',color:'var(--bg)'}}>+ 새 모듈 생성</button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-5">
        {([['dashboard','대시보드'],['modules','모듈 관리'],['subscribers','구독자'],['requests',`문의${requests.length>0?' ('+requests.filter(r=>r.status==='pending').length+')':''}`],['scans','공고 스캔']] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all" style={tab===k?{background:'var(--accent-bg)',color:'var(--accent)'}:{color:'var(--text-muted)'}}>{l}</button>
        ))}
      </div>

      {/* ===== 대시보드 탭 ===== */}
      {tab==='dashboard'&&<>
        {/* 테스트 모드 안내 */}
        {totalRevenue === 0 && payments.length === 0 && (
          <div className="rounded-xl p-4 mb-4 border text-[12.5px] leading-relaxed" style={{background:'rgba(239,170,91,0.08)',borderColor:'rgba(239,170,91,0.3)',color:'#EFAA5B'}}>
            <span className="font-bold">⚠️ 현재 테스트 결제 모드</span>
            <span className="ml-2" style={{color:'var(--text-secondary)'}}>토스페이먼츠 실 결제 전환 후 이 배너는 사라집니다. 실 결제 시작 전 확인사항: 토스 대시보드에서 라이브 키로 교체, Vercel 환경변수 TOSS_SECRET_KEY / NEXT_PUBLIC_TOSS_CK 업데이트 후 재배포.</span>
          </div>
        )}

        {/* 기간 필터 + 핵심 지표 */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="text-[12px] font-semibold" style={{color:'var(--text-muted)'}}>매출 기간</span>
          <div className="flex gap-1">
            {([['week','주간'],['month','월간'],['quarter','분기'],['half','반기'],['year','연간'],['all','전체']] as const).map(([k,l])=>(
              <button key={k} onClick={()=>setRevPeriod(k)}
                className="px-3 py-1 rounded-lg text-[11.5px] font-medium transition-all"
                style={revPeriod===k?{background:'var(--accent)',color:'#fff'}:{background:'var(--surface)',color:'var(--text-muted)',border:'1px solid var(--border)'}}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-5">
          {[
            ['매출',`₩${totalRevenue.toLocaleString()}`,'var(--accent)'],
            ['총 생성',''+totalGenerations,''],
            ['사용자',''+uniqueUsers+'명',''],
            ['결제자',''+uniquePayers+'명','var(--accent)'],
            ['알림 구독',''+activeSubs+'명','#5B8DEF'],
          ].map(([label,value,color])=>(
            <div key={label as string} className="rounded-xl p-4 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
              <div className="text-[10.5px] uppercase tracking-wider" style={{color:'var(--text-muted)'}}>{label}</div>
              <div className="text-2xl font-extrabold mt-1" style={{color:(color as string)||'var(--text)'}}>{value}</div>
            </div>
          ))}
        </div>

        {/* 서비스 현황 */}
        <div className="rounded-xl p-5 mb-5 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
          <h3 className="text-[14px] font-semibold mb-3">서비스 현황</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ['Vercel (호스팅)','100GB/월','~10,000명','$20/월'],
              ['Supabase (DB)','500MB, 50K req/일','~500명','$25/월'],
              ['Resend (이메일)','100건/일, 3K/월','~100명 구독','$20/월'],
              ['Anthropic (AI)','잔액 기반','잔액 소진 시','사용량 비례'],
            ].map(([name,free,limit,paid])=>(
              <div key={name} className="p-3 rounded-lg border" style={{borderColor:'var(--border)'}}>
                <div className="text-[12px] font-semibold mb-1">{name}</div>
                <div className="text-[11px]" style={{color:'var(--text-muted)'}}>무료: {free}</div>
                <div className="text-[11px]" style={{color:'var(--text-muted)'}}>병목: {limit}</div>
                <div className="text-[11px]" style={{color:'var(--accent)'}}>유료: {paid}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 모듈별 수익 분석 */}
        <div className="rounded-xl overflow-hidden border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
          <div className="p-4 border-b" style={{borderColor:'var(--border)'}}>
            <h3 className="text-[14px] font-semibold">모듈별 수익 분석</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b" style={{borderColor:'var(--border)'}}>
                  {['모듈','가격','사용','사용자','결제자','매출','AI 원가/회','순이익/회'].map(h=>(
                    <th key={h} className="px-4 py-3 text-[10.5px] font-semibold text-left uppercase tracking-wider" style={{color:'var(--text-muted)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.filter(m=>m.status==='active').map(m=>{
                  const st=moduleStats(m.id)
                  const cost=MODEL_COST[m.ai_model]||0.05
                  const costKrw=Math.round(cost*1350)
                  const price=m.price_krw||0
                  const profit=price-costKrw-(m.mode==='alert'?0:Math.round(price*0.033))
                  return(
                    <tr key={m.id} className="border-b" style={{borderColor:'var(--border)'}}>
                      <td className="px-4 py-3 text-[12px] font-medium">{m.icon} {m.name}</td>
                      <td className="px-4 py-3 text-[12px] font-semibold" style={{color:'var(--accent)'}}>{price===0?'무료':`₩${price.toLocaleString()}`}</td>
                      <td className="px-4 py-3 text-[13px]">{st.uses}</td>
                      <td className="px-4 py-3 text-[13px]">{st.users}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold">{st.payers}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold" style={{color:'var(--accent)'}}>₩{st.revenue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px]" style={{color:'var(--text-muted)'}}>{m.mode==='alert'?'-':`₩${costKrw}`}</td>
                      <td className="px-4 py-3 text-[12px] font-semibold" style={{color:profit>0?'var(--accent)':'var(--error-text)'}}>{price===0?'-':`₩${profit.toLocaleString()}`}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>}

      {/* ===== 모듈 관리 탭 ===== */}
      {tab==='modules'&&<>
        <div className="flex gap-1.5 mb-4">
          {[['all','전체'],['active','활성'],['draft','초안'],['inactive','비활성']].map(([key,label])=>(
            <button key={key} onClick={()=>setFilter(key)} className="px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all" style={filter===key?{background:'var(--accent-bg)',color:'var(--accent)'}:{color:'var(--text-muted)'}}>
              {label} {key==='all'?modules.length:modules.filter(m=>m.status===key).length}
            </button>
          ))}
        </div>
        <div className="rounded-xl overflow-hidden border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead><tr className="border-b" style={{borderColor:'var(--border)'}}>
                {['상태','ID','모듈명','카테고리','모드','AI 모델','가격','사용','결제','출처','액션'].map(h=>(
                  <th key={h} className="px-4 py-3 text-[10.5px] font-semibold text-left uppercase tracking-wider" style={{color:'var(--text-muted)'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(m=>{const st=moduleStats(m.id);return(
                  <tr key={m.id} className="border-b hover:opacity-90" style={{borderColor:'var(--border)'}}>
                    <td className="px-4 py-3"><button onClick={()=>toggleStatus(m.id,m.status)} className="flex items-center gap-1.5 text-[12px] hover:opacity-70" style={{color:'var(--text-secondary)'}}><span className="w-2 h-2 rounded-full" style={{background:statusColor[m.status]}}/>{statusLabel[m.status]}</button></td>
                    <td className="px-4 py-3 text-[12px] font-mono" style={{color:'var(--text-muted)'}}>{m.id}</td>
                    <td className="px-4 py-3"><div className="text-[13px] font-medium">{m.icon} {m.name}</div></td>
                    <td className="px-4 py-3 text-[12px]" style={{color:'var(--text-muted)'}}>{m.category}</td>
                    <td className="px-4 py-3 text-[11.5px] font-semibold" style={{color:`var(--mode-${m.mode}-text)`}}>{modeLabel[m.mode]}</td>
                    <td className="px-4 py-3 text-[11.5px]" style={{color:'var(--text-muted)'}}>{getModelLabel(m.ai_model)}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold" style={{color:'var(--accent)'}}>{(m.price_krw||0)===0?'무료':`₩${(m.price_krw||0).toLocaleString()}`}</td>
                    <td className="px-4 py-3 text-[13px]">{st.uses}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold" style={{color:'var(--accent)'}}>{st.payers}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={isSeedModule(m.id)?{background:'rgba(91,141,239,0.1)',color:'#5B8DEF'}:{background:'var(--accent-bg)',color:'var(--accent)'}}>{isSeedModule(m.id)?'시드':'어드민'}</span></td>
                    <td className="px-4 py-3"><div className="flex gap-1.5">
                      <button onClick={()=>router.push(`/admin/upload?edit=${m.id}`)} className="px-2.5 py-1 rounded-md text-[11px] font-medium border hover:opacity-80" style={{background:'var(--surface-hover)',borderColor:'var(--border)',color:'var(--text-secondary)'}}>{isSeedModule(m.id)?'보기':'수정'}</button>
                      <button onClick={()=>setDeleteTarget(m.id)} className="px-2.5 py-1 border rounded-md text-[11px] font-medium hover:opacity-80" style={{borderColor:'var(--error-border)',color:'var(--error-text)'}}>삭제</button>
                    </div></td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </>}

      {/* ===== 구독자 관리 탭 ===== */}
      {tab==='subscribers'&&<>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
          {[
            ['전체 구독자',subscribers.length+'명',''],
            ['활성',subscribers.filter(s=>s.is_active).length+'명','var(--accent)'],
            ['해지/실패',subscribers.filter(s=>!s.is_active).length+'명','var(--error-text)'],
          ].map(([label,value,color])=>(
            <div key={label as string} className="rounded-xl p-4 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
              <div className="text-[10.5px] uppercase tracking-wider" style={{color:'var(--text-muted)'}}>{label}</div>
              <div className="text-2xl font-extrabold mt-1" style={{color:(color as string)||'var(--text)'}}>{value}</div>
            </div>
          ))}
        </div>
        {subscribers.length===0?<div className="rounded-xl p-12 text-center border" style={{background:'var(--surface)',borderColor:'var(--border)'}}><p className="text-[13px]" style={{color:'var(--text-muted)'}}>아직 구독자가 없습니다</p></div>
        :<div className="rounded-xl overflow-hidden border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr className="border-b" style={{borderColor:'var(--border)'}}>
                {['상태','이메일','사업자명','필터','결제','가입일','마지막 발송'].map(h=>(
                  <th key={h} className="px-4 py-3 text-[10.5px] font-semibold text-left uppercase tracking-wider" style={{color:'var(--text-muted)'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {subscribers.map(s=>{
                  const p=s.profiles as any
                  const filters=s.filters||{}
                  const filterText=[...(filters.fields||[]),...(filters.regions||[]),filters.keyword].filter(Boolean).join(', ')||'전체'
                  return(
                    <tr key={s.id} className="border-b" style={{borderColor:'var(--border)'}}>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={s.is_active?{background:'var(--accent-bg)',color:'var(--accent)'}:{background:'var(--error-bg)',color:'var(--error-text)'}}>{s.is_active?'활성':s.billing_status==='cancelled'?'해지':'실패'}</span></td>
                      <td className="px-4 py-3 text-[12px]">{s.phone}</td>
                      <td className="px-4 py-3 text-[12px]" style={{color:'var(--text-secondary)'}}>{p?.business_name||p?.representative||'-'}</td>
                      <td className="px-4 py-3 text-[11px] max-w-[200px] truncate" style={{color:'var(--text-muted)'}}>{filterText}</td>
                      <td className="px-4 py-3 text-[11px]" style={{color:s.billing_status==='active'?'var(--accent)':'var(--text-muted)'}}>{s.billing_status==='active'?'₩990/월':s.billing_status||'없음'}</td>
                      <td className="px-4 py-3 text-[11px]" style={{color:'var(--text-muted)'}}>{s.created_at?new Date(s.created_at).toLocaleDateString('ko'):'-'}</td>
                      <td className="px-4 py-3 text-[11px]" style={{color:'var(--text-muted)'}}>{s.last_sent_at?new Date(s.last_sent_at).toLocaleDateString('ko'):'-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>}
      </>}

      {/* ===== 모듈 문의 탭 ===== */}
      {tab==='requests'&&<>
        {requests.length===0?<p className="text-center py-10 text-[13px]" style={{color:'var(--text-muted)'}}>문의가 없습니다</p>:
        <div className="space-y-2.5">
          {requests.map(r=>{
            const sc:Record<string,string>={pending:'#EF8F3B',reviewing:'#5B8DEF',planned:'var(--accent)',completed:'#4CAF50',declined:'var(--text-muted)'}
            const sl:Record<string,string>={pending:'대기',reviewing:'검토중',planned:'제작예정',completed:'완료',declined:'반려'}
            return(
              <div key={r.id} className="rounded-lg p-4 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{background:sc[r.status]+'20',color:sc[r.status]}}>{sl[r.status]}</span>
                    <span className="text-[11px] ml-2" style={{color:'var(--text-muted)'}}>{r.category}</span>
                  </div>
                  <span className="text-[10px]" style={{color:'var(--text-muted)'}}>{new Date(r.created_at).toLocaleDateString('ko')}</span>
                </div>
                <h3 className="text-[13px] font-semibold mb-1">{r.title}</h3>
                <p className="text-[12px] leading-relaxed mb-2" style={{color:'var(--text-secondary)'}}>{r.description}</p>
                <div className="flex items-center gap-2 text-[11px]" style={{color:'var(--text-muted)'}}>
                  <span>{r.email||'(이메일 없음)'}</span>
                  {r.status==='pending'&&<>
                    <button onClick={async()=>{await supabase.from('module_requests').update({status:'reviewing'}).eq('id',r.id);fetchAll()}} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{background:'#5B8DEF20',color:'#5B8DEF'}}>검토시작</button>
                    <button onClick={async()=>{await supabase.from('module_requests').update({status:'planned'}).eq('id',r.id);fetchAll()}} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{background:'var(--accent-bg)',color:'var(--accent)'}}>제작예정</button>
                  </>}
                </div>
              </div>
            )
          })}
        </div>}
      </>}

      {/* 공고 스캔 탭 */}
      {tab==='scans'&&<ScansTab />}

      {/* 삭제 모달 */}
      {deleteTarget&&<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={()=>setDeleteTarget(null)}>
        <div className="rounded-xl p-6 max-w-[380px] w-full mx-4 animate-in border" style={{background:'var(--surface)',borderColor:'var(--border-strong)'}} onClick={e=>e.stopPropagation()}>
          <h3 className="text-[16px] font-bold mb-2">모듈 삭제</h3>
          <p className="text-[13px] mb-1" style={{color:'var(--text-secondary)'}}><span className="font-semibold" style={{color:'var(--text)'}}>{deleteTarget}</span> 모듈을 삭제하시겠습니까?</p>
          <p className="text-[12px] mb-5" style={{color:'var(--error-text)',opacity:0.7}}>이 작업은 되돌릴 수 없습니다.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={()=>setDeleteTarget(null)} className="px-4 py-2 border rounded-lg text-[13px] hover:opacity-80" style={{borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>취소</button>
            <button onClick={()=>deleteModule(deleteTarget)} className="px-4 py-2 rounded-lg text-[13px] font-semibold" style={{background:'var(--error-text)',color:'white'}}>삭제</button>
          </div>
        </div>
      </div>}

      {toast&&<div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-lg text-[13px] font-medium border z-50 animate-in" style={{background:'var(--surface)',color:'var(--text)',borderColor:'var(--border-strong)'}}>{toast}</div>}
    </div>
  )
}

// 공고 스캔 탭 컴포넌트
function ScansTab() {
  const [scans, setScans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all'|'new'|'reviewing'|'module_created'|'skipped'>('all')
  const [sortBy, setSortBy] = useState<'deadline'|'created'>('deadline')
  const router = useRouter()

  const fetchScans = async () => {
    const { data } = await supabase.from('bizplan_scans').select('*').order('created_at', { ascending: false }).limit(200)
    if (data) setScans(data)
    setLoading(false)
  }

  useEffect(() => { fetchScans() }, [])

  const handleScan = async () => {
    setScanning(true); setScanResult('')
    try {
      const res = await fetch('/api/admin/bizplan-scan')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setScanResult(`스캔 완료: 전체 ${data.total}건, 신규 ${data.new}건${data.deleted > 0 ? `, 만료 삭제 ${data.deleted}건` : ''}`)
      fetchScans()
    } catch (e: any) { setScanResult('스캔 실패: ' + e.message) }
    setScanning(false)
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('bizplan_scans').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    fetchScans()
  }

  const parseDeadlineEnd = (deadline: string): Date | null => {
    if (!deadline) return null
    const parts = deadline.split('~')
    const endStr = (parts[1] || parts[0])?.trim().replace(/\./g, '-')
    const d = new Date(endStr)
    return isNaN(d.getTime()) ? null : d
  }

  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    new: { bg: 'var(--accent-bg)', color: 'var(--accent)', label: '신규' },
    reviewing: { bg: 'rgba(91,141,239,0.1)', color: '#5B8DEF', label: '검토 중' },
    module_created: { bg: 'rgba(0,184,148,0.1)', color: '#00B894', label: '모듈 생성 완료' },
    skipped: { bg: 'var(--surface)', color: 'var(--text-muted)', label: '건너뜀' },
  }

  const filtered = scans
    .filter(s => statusFilter === 'all' || s.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === 'deadline') {
        const da = parseDeadlineEnd(a.deadline)?.getTime() ?? 0
        const db = parseDeadlineEnd(b.deadline)?.getTime() ?? 0
        return da - db // 마감 임박 순
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  return (
    <>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1">
          {([['all','전체'],['new','신규'],['reviewing','검토 중'],['module_created','생성 완료'],['skipped','건너뜀']] as const).map(([k,l]) => (
            <button key={k} onClick={() => setStatusFilter(k)}
              className="px-3 py-1 rounded-lg text-[11.5px] font-medium"
              style={statusFilter === k ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {l} {k === 'all' ? scans.length : scans.filter(s => s.status === k).length}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="text-[11.5px] px-2 py-1 rounded-lg border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <option value="deadline">마감 임박순</option>
            <option value="created">등록 최신순</option>
          </select>
          <button onClick={handleScan} disabled={scanning}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            {scanning ? '스캔 중...' : '🔍 전체 공고 스캔'}
          </button>
        </div>
      </div>

      {scanResult && <div className="mb-4 rounded-lg px-4 py-2 text-[12px]" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{scanResult}</div>}

      {loading ? <div className="text-center py-10"><div className="spinner mx-auto" /></div> : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <p className="text-[14px] mb-2">{scans.length === 0 ? '스캔된 공고가 없습니다' : '해당 상태의 공고가 없습니다'}</p>
          {scans.length === 0 && <p className="text-[12px]">"전체 공고 스캔" 버튼을 눌러 기업마당에서 공고를 가져오세요</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(s => {
            const st = statusColors[s.status] || statusColors.new
            const deadlineEnd = parseDeadlineEnd(s.deadline)
            const daysLeft = deadlineEnd ? Math.ceil((deadlineEnd.getTime() - Date.now()) / 86400000) : null
            return (
              <div key={s.id} className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.organization}</span>
                      {daysLeft !== null && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: daysLeft <= 7 ? 'rgba(239,68,68,0.1)' : 'var(--surface-hover)', color: daysLeft <= 7 ? '#ef4444' : 'var(--text-muted)' }}>
                          D-{daysLeft}
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--text)' }}>{s.title}</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      접수: {s.deadline || '확인 필요'}
                      {s.module_id && <span> · 모듈: {s.module_id}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {s.url && <a href={s.url} target="_blank" className="px-2.5 py-1 rounded text-[10px] font-medium border" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}>공고 보기</a>}
                    {s.status === 'new' && (
                      <>
                        <button onClick={() => { updateStatus(s.id, 'reviewing'); router.push(`/admin/bizplan?scanId=${s.id}&title=${encodeURIComponent(s.title)}&org=${encodeURIComponent(s.organization || '')}`) }}
                          className="px-2.5 py-1 rounded text-[10px] font-semibold"
                          style={{ background: 'var(--accent)', color: '#fff' }}>
                          모듈 생성
                        </button>
                        <button onClick={() => updateStatus(s.id, 'skipped')}
                          className="px-2.5 py-1 rounded text-[10px] font-medium"
                          style={{ color: 'var(--text-muted)' }}>
                          건너뛰기
                        </button>
                      </>
                    )}
                    {s.status === 'reviewing' && (
                      <>
                        <button onClick={() => router.push(`/admin/bizplan?scanId=${s.id}&title=${encodeURIComponent(s.title)}`)}
                          className="px-2.5 py-1 rounded text-[10px] font-semibold"
                          style={{ background: '#5B8DEF', color: '#fff' }}>
                          이어서 생성
                        </button>
                        <button onClick={() => updateStatus(s.id, 'new')}
                          className="px-2.5 py-1 rounded text-[10px] font-medium border"
                          style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}>
                          초기화
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
