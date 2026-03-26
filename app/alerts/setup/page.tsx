'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

const FIELDS = [
  { label: '기술', code: '01' }, { label: '인력', code: '02' },
  { label: '수출', code: '03' }, { label: '내수', code: '04' },
  { label: '창업', code: '05' }, { label: '경영', code: '06' },
  { label: '융복합', code: '08' }, { label: '기타', code: '07' },
]
const REGIONS = [
  { label: '서울', code: '01' }, { label: '부산', code: '02' }, { label: '대구', code: '03' },
  { label: '인천', code: '04' }, { label: '광주', code: '05' }, { label: '대전', code: '06' },
  { label: '울산', code: '07' }, { label: '세종', code: '08' }, { label: '경기', code: '09' },
  { label: '강원', code: '10' }, { label: '충북', code: '11' }, { label: '충남', code: '12' },
  { label: '전북', code: '13' }, { label: '전남', code: '14' }, { label: '경북', code: '15' },
  { label: '경남', code: '16' }, { label: '제주', code: '17' },
]
const STATUSES = ['접수예정', '접수중']

function SetupContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { user } = useAuth()
  // 복수 선택 가능한 필터
  const [fields, setFields] = useState<string[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>(['접수중'])
  const [keyword, setKeyword] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [existing, setExisting] = useState<any>(null)

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    supabase.from('alert_subscriptions').select('*').eq('user_id', user.id).eq('module_type', 'gov_support').single().then(({ data }) => {
      if (data) {
        setExisting(data)
        setFields(data.filters?.fields || [])
        setRegions(data.filters?.regions || [])
        setStatuses(data.filters?.statuses || ['접수중'])
        setKeyword(data.filters?.keyword || '')
        setEmail(data.phone || '')
      }
    })
  }, [user])

  const toggleArr = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  const handleSave = async () => {
    if (!user) return
    if (!email.trim()) { setMsg('이메일을 입력해주세요'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/alerts/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          filters: { fields, regions, statuses, keyword },
          scheduleType: 'daily', scheduleHour: 9, scheduleDay: null,
          phone: email.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMsg(existing ? '알림 설정이 업데이트되었습니다!' : '알림이 설정되었습니다!')
        setTimeout(() => router.push('/alerts'), 1500)
      } else setMsg(data.error || '오류가 발생했습니다')
    } catch { setMsg('오류가 발생했습니다') }
    setSaving(false)
  }

  const MultiSelect = ({ label, options, selected, onToggle }: { label: string; options: Array<{ label: string; code: string }>; selected: string[]; onToggle: (v: string) => void }) => (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
        {selected.length > 0 && <span className="text-[10px]" style={{ color: 'var(--accent)' }}>{selected.length}개 선택</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => <button key={o.code} onClick={() => onToggle(o.label)} className="px-3 py-1.5 rounded-lg text-[12px] border transition-all" style={selected.includes(o.label) ? { background: 'var(--accent-bg)', color: 'var(--accent)', borderColor: 'var(--accent-border)' } : { borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{o.label}</button>)}
      </div>
    </div>
  )

  const MultiSelectSimple = ({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) => (
    <div className="mb-4">
      <label className="block text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => <button key={o} onClick={() => onToggle(o)} className="px-3 py-1.5 rounded-lg text-[12px] border transition-all" style={selected.includes(o) ? { background: 'var(--accent-bg)', color: 'var(--accent)', borderColor: 'var(--accent-border)' } : { borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{o}</button>)}
      </div>
    </div>
  )

  return (
    <div className="max-w-[600px] mx-auto pt-6 pb-16 animate-in">
      <button onClick={() => router.push('/market')} className="text-[12.5px] hover:opacity-70 mb-3 inline-block" style={{ color: 'var(--text-muted)' }}>← 마켓</button>
      <h2 className="text-lg font-bold mb-1">🔔 정부지원사업 공고 알림</h2>
      <p className="text-[12px] mb-6" style={{ color: 'var(--text-muted)' }}>기업마당(bizinfo.go.kr) 공고를 매일 체크하여 조건에 맞는 공고를 이메일로 알려드립니다.</p>

      {existing && <div className="mb-4 p-3 rounded-lg text-[12px]" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>기존 알림 설정이 있습니다. 수정하시면 기존 설정이 업데이트됩니다.</div>}

      <div className="rounded-xl p-5 mb-3 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="text-[13px] font-semibold mb-1">공고 필터</p>
        <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>복수 선택 가능합니다. 선택하지 않으면 전체 대상입니다.</p>
        <MultiSelect label="지원분야" options={FIELDS} selected={fields} onToggle={v => toggleArr(fields, v, setFields)} />
        <MultiSelect label="지역" options={REGIONS} selected={regions} onToggle={v => toggleArr(regions, v, setRegions)} />
        <MultiSelectSimple label="접수상태" options={STATUSES} selected={statuses} onToggle={v => toggleArr(statuses, v, setStatuses)} />
        <div className="mb-2">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>키워드 (선택)</label>
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="예: AI, 디지털전환, 스마트공장" className="inp" />
          <p className="text-[10.5px] mt-1" style={{ color: 'var(--text-muted)' }}>기업마당 해시태그 기준으로 검색됩니다</p>
        </div>
      </div>

      <div className="rounded-xl p-5 mb-3 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="text-[13px] font-semibold mb-3">알림 수신</p>
        <div className="mb-4">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>알림 수신 이메일</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder={user?.email || 'example@email.com'} className="inp" />
          <p className="text-[10.5px] mt-1" style={{ color: 'var(--text-muted)' }}>공고 알림을 받을 이메일 주소를 입력해주세요</p>
        </div>
        <p className="text-[11px] p-3 rounded-lg" style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}>
          매일 오전 9시에 기업마당 공고를 확인합니다. 조건에 맞는 공고가 있을 때만 이메일을 보내드립니다. 공고가 없으면 이메일이 발송되지 않습니다.
        </p>
      </div>

      {msg && <div className="mb-3 p-3 rounded-lg text-[12px] text-center" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{msg}</div>}

      <button onClick={handleSave} disabled={saving || !email.trim()} className="w-full py-3 font-semibold text-[14px] rounded-lg disabled:opacity-50" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
        {saving ? '저장 중...' : existing ? '알림 설정 업데이트' : '알림 설정하기'}
      </button>
      <p className="text-[11px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>현재 무료 · 매칭 공고가 있을 때만 발송</p>
    </div>
  )
}

export default function AlertSetupPage() { return <Suspense><SetupContent /></Suspense> }
