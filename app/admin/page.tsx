'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { MODEL_PRICING } from '@/lib/pricing'

const modeLabel: Record<string, string> = { oneclick: '⚡ 원클릭', form: '📝 폼', chat: '💬 대화' }
const modeColor: Record<string, string> = { oneclick: 'text-[#00D4AA]', form: 'text-[#5B8DEF]', chat: 'text-[#9B8DFF]' }
const statusLabel: Record<string, string> = { active: '활성', draft: '초안', inactive: '비활성' }
const statusColor: Record<string, string> = { active: 'bg-[#00D4AA]', draft: 'bg-[#EFAA5B]', inactive: 'bg-[#63636E]' }

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth()
  const router = useRouter()
  const [modules, setModules] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!loading && !isAdmin) router.push('/')
    if (isAdmin) fetchModules()
  }, [isAdmin, loading])

  const fetchModules = async () => {
    const { data } = await supabase
      .from('modules')
      .select('*')
      .order('category', { ascending: true })
      .order('uses', { ascending: false })
    if (data) setModules(data)
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'active' ? 'inactive' : 'active'
    await supabase.from('modules').update({ status: next, updated_at: new Date().toISOString() }).eq('id', id)
    fetchModules()
    showToast(`${id} → ${statusLabel[next]}`)
  }

  const deleteModule = async (id: string) => {
    await supabase.from('module_versions').delete().eq('module_id', id)
    await supabase.from('module_references').delete().eq('module_id', id)
    await supabase.from('modules').delete().eq('id', id)
    setDeleteTarget(null)
    fetchModules()
    showToast(`${id} 삭제 완료`)
  }

  const getModelLabel = (model: string) => {
    const m = MODEL_PRICING[model as keyof typeof MODEL_PRICING]
    return m?.label || model
  }

  const filtered = filter === 'all' ? modules : modules.filter(m => m.status === filter)
  const stats = {
    total: modules.length,
    active: modules.filter(m => m.status === 'active').length,
    draft: modules.filter(m => m.status === 'draft').length,
    totalCredits: modules.reduce((s, m) => s + (m.uses * m.credit_cost), 0),
  }

  if (loading) return <div className="pt-20 text-center text-[#63636E]">로딩 중...</div>
  if (!isAdmin) return null

  return (
    <div className="pt-6 pb-16 animate-in">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">어드민</h2>
          <p className="text-[13px] text-[#63636E]">모듈 관리 · 통계 · 설정</p>
        </div>
        <button onClick={() => router.push('/admin/upload')}
          className="px-5 py-2.5 bg-[#00D4AA] text-[#09090B] font-semibold text-[13px] rounded-lg hover:bg-[#00E8BB] transition-all">
          + 새 모듈 생성
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        {[
          ['전체 모듈', stats.total, ''],
          ['활성', stats.active, 'text-[#00D4AA]'],
          ['초안', stats.draft, 'text-[#EFAA5B]'],
          ['총 크레딧 소비', stats.totalCredits.toLocaleString(), 'text-[#EFAA5B]'],
        ].map(([label, value, color]) => (
          <div key={label as string} className="bg-[#141417] border border-white/[.06] rounded-xl p-4">
            <div className="text-[10.5px] text-[#63636E] uppercase tracking-wider">{label}</div>
            <div className={`text-2xl font-extrabold mt-1 ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 mb-4">
        {[['all', '전체'], ['active', '활성'], ['draft', '초안'], ['inactive', '비활성']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${filter === key ? 'bg-[#00D4AA]/10 text-[#00D4AA]' : 'text-[#63636E] hover:text-[#A1A1AA]'}`}>
            {label} {key === 'all' ? modules.length : modules.filter(m => m.status === key).length}
          </button>
        ))}
      </div>

      {/* Module Table */}
      <div className="bg-[#141417] border border-white/[.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-white/[.06]">
                {['상태', 'ID', '모듈명', '카테고리', '모드', 'AI 모델', '크레딧', '사용', '액션'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10.5px] font-semibold text-[#63636E] text-left uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b border-white/[.04] hover:bg-white/[.02] transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(m.id, m.status)}
                      className="flex items-center gap-1.5 text-[12px] text-[#A1A1AA] hover:text-white transition-all">
                      <span className={`w-2 h-2 rounded-full ${statusColor[m.status]}`} />
                      {statusLabel[m.status]}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-[12px] font-mono text-[#63636E]">{m.id}</td>
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-medium">{m.icon} {m.name}</div>
                    <div className="text-[11px] text-[#63636E] mt-0.5 max-w-[250px] truncate">{m.description}</div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#63636E]">{m.category}</td>
                  <td className={`px-4 py-3 text-[11.5px] font-semibold ${modeColor[m.mode]}`}>{modeLabel[m.mode]}</td>
                  <td className="px-4 py-3 text-[11.5px] text-[#63636E]">{getModelLabel(m.ai_model)}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold">◆{m.credit_cost}</td>
                  <td className="px-4 py-3 text-[13px]">{m.uses?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => router.push(`/admin/upload?edit=${m.id}`)}
                        className="px-2.5 py-1 bg-white/[.04] border border-white/[.06] rounded-md text-[11px] font-medium text-[#A1A1AA] hover:bg-white/[.08] hover:text-white transition-all">
                        수정
                      </button>
                      <button onClick={() => setDeleteTarget(m.id)}
                        className="px-2.5 py-1 border border-[#EF5B5B]/20 rounded-md text-[11px] font-medium text-[#EF5B5B]/60 hover:bg-[#EF5B5B]/10 hover:text-[#EF5B5B] transition-all">
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-[#63636E] text-sm">
            {filter === 'all' ? '등록된 모듈이 없습니다. 새 모듈을 생성해주세요.' : `${statusLabel[filter] || filter} 상태인 모듈이 없습니다.`}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setDeleteTarget(null)}>
          <div className="bg-[#18181B] border border-white/10 rounded-xl p-6 max-w-[380px] w-full mx-4 animate-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold mb-2">모듈 삭제</h3>
            <p className="text-[13px] text-[#A1A1AA] mb-1">
              <span className="font-semibold text-white">{deleteTarget}</span> 모듈을 삭제하시겠습니까?
            </p>
            <p className="text-[12px] text-[#EF5B5B]/70 mb-5">
              이 작업은 되돌릴 수 없으며, 관련 버전 기록과 레퍼런스도 함께 삭제됩니다.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-white/10 rounded-lg text-[13px] text-[#A1A1AA] hover:bg-white/[.04]">
                취소
              </button>
              <button onClick={() => deleteModule(deleteTarget)}
                className="px-4 py-2 bg-[#EF5B5B] rounded-lg text-[13px] font-semibold text-white hover:bg-[#E04444]">
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#232328] text-white px-5 py-2.5 rounded-lg text-[13px] font-medium border border-white/10 z-50 animate-in">
          {toast}
        </div>
      )}
    </div>
  )
}
