'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

const FIELDS = ['기술','인력','수출','내수','창업','경영','기타']
const TARGETS = ['예비창업자','1년미만','3년미만','5년미만','7년미만','7년이상']
const SIZES = ['소기업','중기업','중견기업']
const REGIONS = ['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주']
const STATUSES = ['접수예정','접수중']

function SetupContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { user } = useAuth()
  const [field, setField] = useState('')
  const [target, setTarget] = useState('')
  const [size, setSize] = useState('')
  const [region, setRegion] = useState('')
  const [status, setStatus] = useState('접수중')
  const [keyword, setKeyword] = useState('')
  const [scheduleType, setScheduleType] = useState<'daily'|'weekly'>('daily')
  const [scheduleHour, setScheduleHour] = useState(9)
  const [scheduleDay, setScheduleDay] = useState(1)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { if (!user) router.push('/login') }, [user])

  const handleSave = async () => {
    if (!user) return
    if (!phone.trim()) { setMsg('전화번호를 입력해주세요'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/alerts/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          filters: { field, target, size, region, status, keyword },
          scheduleType, scheduleHour, scheduleDay: scheduleType === 'weekly' ? scheduleDay : null, phone,
        }),
      })
      const data = await res.json()
      if (data.success) { setMsg('알림이 설정되었습니다!'); setTimeout(() => router.push('/alerts'), 1500) }
      else setMsg(data.error || '오류가 발생했습니다')
    } catch { setMsg('오류가 발생했습니다') }
    setSaving(false)
  }

  const SelectGroup = ({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) => (
    <div className="mb-4">
      <label className="block text-[12px] font-medium mb-2" style={{color:'var(--text-secondary)'}}>{label}</label>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => onChange('')} className="px-3 py-1.5 rounded-lg text-[12px] border transition-all" style={!value ? {background:'var(--accent-bg)',color:'var(--accent)',borderColor:'var(--accent-border)'} : {borderColor:'var(--border)',color:'var(--text-muted)'}}>전체</button>
        {options.map(o => <button key={o} onClick={() => onChange(o === value ? '' : o)} className="px-3 py-1.5 rounded-lg text-[12px] border transition-all" style={o === value ? {background:'var(--accent-bg)',color:'var(--accent)',borderColor:'var(--accent-border)'} : {borderColor:'var(--border)',color:'var(--text-muted)'}}>{o}</button>)}
      </div>
    </div>
  )

  return (
    <div className="max-w-[600px] mx-auto pt-6 pb-16 animate-in">
      <button onClick={() => router.push('/market')} className="text-[12.5px] hover:opacity-70 mb-3 inline-block" style={{color:'var(--text-muted)'}}>← 마켓</button>
      <h2 className="text-lg font-bold mb-1">🔔 정부지원사업 공고 알림</h2>
      <p className="text-[12px] mb-6" style={{color:'var(--text-muted)'}}>조건에 맞는 공고가 올라오면 카카오톡으로 알림을 보내드립니다.</p>

      <div className="rounded-xl p-5 mb-3 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
        <p className="text-[13px] font-semibold mb-4">필터 설정</p>
        <SelectGroup label="지원분야" options={FIELDS} value={field} onChange={setField} />
        <SelectGroup label="지원대상" options={TARGETS} value={target} onChange={setTarget} />
        <SelectGroup label="기업규모" options={SIZES} value={size} onChange={setSize} />
        <SelectGroup label="지역" options={REGIONS} value={region} onChange={setRegion} />
        <SelectGroup label="접수상태" options={STATUSES} value={status} onChange={setStatus} />
        <div className="mb-4">
          <label className="block text-[12px] font-medium mb-1.5" style={{color:'var(--text-secondary)'}}>키워드 (선택)</label>
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="예: AI, 디지털전환" className="inp" />
        </div>
      </div>

      <div className="rounded-xl p-5 mb-3 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
        <p className="text-[13px] font-semibold mb-4">알림 주기</p>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setScheduleType('daily')} className="flex-1 py-2.5 rounded-lg text-[13px] font-medium border transition-all" style={scheduleType === 'daily' ? {background:'var(--accent-bg)',color:'var(--accent)',borderColor:'var(--accent-border)'} : {borderColor:'var(--border)',color:'var(--text-muted)'}}>매일</button>
          <button onClick={() => setScheduleType('weekly')} className="flex-1 py-2.5 rounded-lg text-[13px] font-medium border transition-all" style={scheduleType === 'weekly' ? {background:'var(--accent-bg)',color:'var(--accent)',borderColor:'var(--accent-border)'} : {borderColor:'var(--border)',color:'var(--text-muted)'}}>매주</button>
        </div>
        {scheduleType === 'weekly' && <div className="mb-3">
          <label className="block text-[12px] font-medium mb-1.5" style={{color:'var(--text-secondary)'}}>요일</label>
          <select value={scheduleDay} onChange={e => setScheduleDay(Number(e.target.value))} className="inp">{['일','월','화','수','목','금','토'].map((d, i) => <option key={i} value={i}>{d}요일</option>)}</select>
        </div>}
        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{color:'var(--text-secondary)'}}>알림 시간</label>
          <select value={scheduleHour} onChange={e => setScheduleHour(Number(e.target.value))} className="inp">{Array.from({length:24},(_, i) => <option key={i} value={i}>{i}시</option>)}</select>
        </div>
      </div>

      <div className="rounded-xl p-5 mb-4 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
        <p className="text-[13px] font-semibold mb-3">카카오톡 수신 번호</p>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" className="inp" />
        <p className="text-[11px] mt-1.5" style={{color:'var(--text-muted)'}}>카카오톡에 등록된 전화번호를 입력해주세요</p>
      </div>

      {msg && <div className="mb-3 p-3 rounded-lg text-[12px] text-center" style={{background:'var(--accent-bg)',color:'var(--accent)'}}>{msg}</div>}

      <button onClick={handleSave} disabled={saving} className="w-full py-3 font-semibold text-[14px] rounded-lg disabled:opacity-50" style={{background:'var(--accent)',color:'var(--bg)'}}>{saving ? '저장 중...' : '알림 설정하기'}</button>
      <p className="text-[11px] text-center mt-2" style={{color:'var(--text-muted)'}}>₩1,980/월 · 첫 30일 무료</p>
    </div>
  )
}

export default function AlertSetupPage() { return <Suspense><SetupContent /></Suspense> }
