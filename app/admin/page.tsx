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
  const [tab, setTab] = useState<'dashboard' | 'modules' | 'subscribers'>('dashboard')
  const [modules, setModules] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [generations, setGenerations] = useState<any[]>([])
  const [subscribers, setSubscribers] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!loading && !isAdmin) router.push('/')
    if (isAdmin) fetchAll()
  }, [isAdmin, loading])

  const fetchAll = async () => {
    const [mods, pays, gens, subs] = await Promise.all([
      supabase.from('modules').select('*').order('category').order('uses', { ascending: false }),
      supabase.from('payments').select('*').eq('status', 'paid'),
      supabase.from('generations').select('id, module_id, user_id, created_at'),
      supabase.from('alert_subscriptions').select('*, profiles:user_id(email, business_name, representative)'),
    ])
    if (mods.data) setModules(mods.data)
    if (pays.data) setPayments(pays.data)
    if (gens.data) setGenerations(gens.data)
    if (subs.data) setSubscribers(subs.data)
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

  // 통계 계산
  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const totalGenerations = generations.length
  const uniqueUsers = new Set(generations.map(g => g.user_id)).size
  const uniquePayers = new Set(payments.map(p => p.user_id)).size
  const activeSubs = subscribers.filter(s => s.is_active).length

  // 모듈별 통계
  const moduleStats = (moduleId: string) => {
    const uses = generations.filter(g => g.module_id === moduleId).length
    const users = new Set(generations.filter(g => g.module_id === moduleId).map(g => g.user_id)).size
    const payers = new Set(payments.filter(p => p.module_id === moduleId).map(p => p.user_id)).size
    const revenue = payments.filter(p => p.module_id === moduleId).reduce((s, p) => s + (p.amount || 0), 0)
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
        <button onClick={() => router.push('/admin/upload')} className="px-5 py-2.5 font-semibold text-[13px] rounded-lg hover:opacity-90" style={{background:'var(--accent)',color:'var(--bg)'}}>+ 새 모듈 생성</button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-5">
        {([['dashboard','대시보드'],['modules','모듈 관리'],['subscribers','구독자']] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all" style={tab===k?{background:'var(--accent-bg)',color:'var(--accent)'}:{color:'var(--text-muted)'}}>{l}</button>
        ))}
      </div>

      {/* ===== 대시보드 탭 ===== */}
      {tab==='dashboard'&&<>
        {/* 핵심 지표 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-5">
          {[
            ['총 매출','₩'+totalRevenue.toLocaleString(),'var(--accent)'],
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
        <div className="grid grid-cols-3 gap-2.5 mb-5">
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
