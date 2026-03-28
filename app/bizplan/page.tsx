'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

type Step = 'upload' | 'analysis' | 'input' | 'generating'

export default function BizplanPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [step, setStep] = useState<Step>('upload')

  // Step 1: 파일
  const [announcement, setAnnouncement] = useState<File | null>(null)
  const [template, setTemplate] = useState<File | null>(null)
  const [existing, setExisting] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  // Step 2: 분석 결과
  const [analysis, setAnalysis] = useState<any>(null)

  // Step 3: 사용자 입력
  const [idea, setIdea] = useState('')
  const [differentiator, setDifferentiator] = useState('')
  const [team, setTeam] = useState('')
  const [currentStatus, setCurrentStatus] = useState('')
  const [emphasis, setEmphasis] = useState('')

  useEffect(() => { if (!loading && !user) router.push('/login') }, [user, loading])
  if (loading) return <div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>로딩 중...</div>

  // Step 1 → 2: 파일 업로드 + 분석
  const handleAnalyze = async () => {
    if (!announcement || !template) { setError('공고문과 양식 파일을 모두 업로드해주세요'); return }
    setError(''); setAnalyzing(true)
    try {
      const fd = new FormData()
      fd.append('announcement', announcement)
      fd.append('template', template)
      if (existing) fd.append('existing', existing)

      const res = await fetch('/api/bizplan/analyze', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.success) { setError(data.error || '분석 실패'); setAnalyzing(false); return }
      setAnalysis(data)
      setStep('analysis')
    } catch (e: any) { setError(e.message || '오류 발생') }
    setAnalyzing(false)
  }

  const FileUpload = ({ label, desc, file, setFile, required }: { label: string; desc: string; file: File | null; setFile: (f: File | null) => void; required?: boolean }) => (
    <div className="mb-4">
      <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label} {required && <span style={{ color: 'var(--error-text)' }}>*</span>}
      </label>
      <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      {file ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: 'var(--surface-input)', borderColor: 'var(--border)' }}>
          <span className="text-lg">📄</span>
          <div className="flex-1">
            <span className="text-[12px] font-medium">{file.name}</span>
            <span className="text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(0)}KB</span>
          </div>
          <button onClick={() => setFile(null)} className="text-[12px] hover:opacity-70" style={{ color: 'var(--error-text)' }}>삭제</button>
        </div>
      ) : (
        <label className="block p-6 rounded-lg border-2 border-dashed text-center cursor-pointer hover:opacity-80 transition-all" style={{ borderColor: 'var(--border-strong)' }}>
          <div className="text-2xl mb-1 opacity-40">📎</div>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>클릭하여 파일 선택</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>PDF, DOCX, HWP, TXT</p>
          <input type="file" accept=".pdf,.docx,.hwp,.txt" className="hidden" onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]) }} />
        </label>
      )}
    </div>
  )

  return (
    <div className="max-w-[680px] mx-auto pt-6 pb-16 animate-in">
      <button onClick={() => router.push('/market')} className="text-[12.5px] hover:opacity-70 mb-4 inline-block" style={{ color: 'var(--text-muted)' }}>← 마켓</button>

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'var(--mode-chat-bg)' }}>📋</div>
        <div>
          <h1 className="text-[18px] font-bold">맞춤 사업계획서</h1>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>공고문 + 양식 기반 AI 맞춤 작성</p>
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2 mb-6">
        {[['upload', '파일 업로드'], ['analysis', '분석 확인'], ['input', '아이디어 입력'], ['generating', '생성']].map(([key, label], i) => (
          <div key={key} className="flex items-center gap-2">
            {i > 0 && <div className="w-6 h-px" style={{ background: 'var(--border)' }} />}
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold" style={step === key || ['upload', 'analysis', 'input', 'generating'].indexOf(step) >= i ? { background: 'var(--accent)', color: 'var(--bg)' } : { background: 'var(--surface-hover)', color: 'var(--text-muted)' }}>{i + 1}</div>
              <span className="text-[11px] hidden sm:inline" style={{ color: step === key ? 'var(--accent)' : 'var(--text-muted)' }}>{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ===== Step 1: 파일 업로드 ===== */}
      {step === 'upload' && (
        <div className="space-y-3">
          <div className="rounded-xl p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-[13px] font-semibold mb-1">공고문 & 양식 업로드</p>
            <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>AI가 공고의 심사기준과 양식 구조를 분석합니다. 분석까지는 무료입니다.</p>
            <FileUpload label="공고문 PDF" desc="정부지원사업 공고문 (심사기준, 지원자격, 배점)" file={announcement} setFile={setAnnouncement} required />
            <FileUpload label="사업계획서 양식" desc="제출해야 하는 사업계획서 양식 파일" file={template} setFile={setTemplate} required />
            <FileUpload label="기존 사업계획서 (선택)" desc="이전에 작성한 사업계획서가 있다면 업로드하세요. AI가 내용을 참고합니다." file={existing} setFile={setExisting} />
          </div>

          {error && <div className="p-3 rounded-lg text-[12px]" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>{error}</div>}

          <button onClick={handleAnalyze} disabled={analyzing || !announcement || !template}
            className="w-full py-3.5 font-semibold text-[14px] rounded-lg disabled:opacity-50 hover:opacity-90 transition-all" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
            {analyzing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--bg)', borderTopColor: 'transparent' }} />
                AI가 분석 중... (30초~1분)
              </span>
            ) : '공고 분석하기 (무료)'}
          </button>
        </div>
      )}

      {/* ===== Step 2: 분석 결과 확인 ===== */}
      {step === 'analysis' && analysis && (
        <div className="space-y-3">
          {/* 공고 분석 (Phase 1) */}
          <div className="rounded-xl p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-[13px] font-semibold mb-3">📋 공고 분석 결과</p>
            {analysis.phase1.parseError ? (
              <p className="text-[12px]" style={{ color: 'var(--error-text)' }}>공고문 분석에 실패했습니다. 다시 시도해주세요.</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <InfoBox label="사업명" value={analysis.phase1.program_name || '-'} />
                  <InfoBox label="주관기관" value={analysis.phase1.organization || '-'} />
                  <InfoBox label="지원분야" value={analysis.phase1.field || '-'} />
                  <InfoBox label="사업기간" value={analysis.phase1.period || '-'} />
                </div>
                {analysis.phase1.budget && <InfoBox label="지원규모" value={typeof analysis.phase1.budget === 'string' ? analysis.phase1.budget : JSON.stringify(analysis.phase1.budget)} />}

                {/* 심사항목 배점표 */}
                {analysis.phase1.evaluation?.length > 0 && (
                  <div>
                    <p className="text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>심사항목 배점</p>
                    <div className="space-y-1.5">
                      {analysis.phase1.evaluation.map((ev: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-medium">{ev.name}</span>
                              <span className="text-[12px] font-bold" style={{ color: 'var(--accent)' }}>{ev.score}점</span>
                            </div>
                            <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-hover)' }}>
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (ev.score / (analysis.phase1.evaluation.reduce((s: number, e: any) => s + (e.score || 0), 0) || 100)) * 100)}%`, background: 'var(--accent)' }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.phase1.eligibility?.length > 0 && (
                  <div>
                    <p className="text-[12px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>지원 자격</p>
                    <ul className="space-y-0.5">
                      {analysis.phase1.eligibility.map((e: string, i: number) => <li key={i} className="text-[11px] flex gap-1.5" style={{ color: 'var(--text-muted)' }}>✓ {e}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 양식 분석 (Phase 2) */}
          <div className="rounded-xl p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-[13px] font-semibold mb-3">📝 양식 분석 결과</p>
            {analysis.phase2.parseError ? (
              <p className="text-[12px]" style={{ color: 'var(--error-text)' }}>양식 분석에 실패했습니다.</p>
            ) : (
              <div className="space-y-2">
                {analysis.phase2.total_pages && <InfoBox label="페이지 제한" value={`${analysis.phase2.total_pages}페이지`} />}
                {analysis.phase2.sections?.map((sec: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--surface-hover)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium">{sec.number || i + 1}. {sec.title}</span>
                      {sec.page_limit && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sec.page_limit}p</span>}
                    </div>
                    {sec.required_items?.length > 0 && <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>필수: {sec.required_items.join(', ')}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 배점 최적화 구조 (Phase 3) */}
          {analysis.structure && (
            <div className="rounded-xl p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-[13px] font-semibold mb-3">🎯 배점 최적화 구조</p>
              <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>배점이 높은 섹션에 더 많은 분량을 배분했습니다.</p>
              <div className="space-y-1.5">
                {analysis.structure.sections.map((sec: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="w-[140px] truncate font-medium">{sec.title}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-hover)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (sec.estimated_pages / (analysis.structure.total_pages || 20)) * 100)}%`, background: 'var(--accent)', opacity: 0.7 + (sec.matched_evaluation?.length || 0) * 0.1 }} />
                    </div>
                    <span className="w-[40px] text-right" style={{ color: 'var(--text-muted)' }}>{sec.estimated_pages}p</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setStep('upload')} className="px-4 py-3 rounded-lg text-[13px] border hover:opacity-80" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>← 다시 업로드</button>
            <button onClick={() => setStep('input')} className="flex-1 py-3 font-semibold text-[14px] rounded-lg hover:opacity-90" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>다음: 아이디어 입력 →</button>
          </div>
        </div>
      )}

      {/* ===== Step 3: 사업 아이디어 입력 ===== */}
      {step === 'input' && (
        <div className="space-y-3">
          <div className="rounded-xl p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-[13px] font-semibold mb-1">사업 아이디어 입력</p>
            <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>AI가 공고 심사기준에 맞춰 사업계획서를 작성합니다.</p>

            <div className="mb-4">
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>사업 아이디어 <span style={{ color: 'var(--error-text)' }}>*</span></label>
              <textarea value={idea} onChange={e => setIdea(e.target.value)} rows={4} placeholder="어떤 문제를 해결하고, 어떤 방식으로 해결하는지 자유롭게 설명해주세요." className="inp" />
            </div>

            <div className="mb-4">
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>핵심 차별점 <span style={{ color: 'var(--error-text)' }}>*</span></label>
              <textarea value={differentiator} onChange={e => setDifferentiator(e.target.value)} rows={2} placeholder="기존 솔루션/경쟁사 대비 우리만의 차별점은 무엇인가요?" className="inp" />
            </div>

            <div className="mb-4">
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>팀 구성 (선택)</label>
              <textarea value={team} onChange={e => setTeam(e.target.value)} rows={2} placeholder="팀원 수, 역할, 주요 경력" className="inp" />
            </div>

            <div className="mb-4">
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>현재 진행 상태 (선택)</label>
              <input value={currentStatus} onChange={e => setCurrentStatus(e.target.value)} placeholder="예: MVP 완성, 베타 테스트 중, 매출 발생" className="inp" />
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>특별히 강조할 점 (선택)</label>
              <input value={emphasis} onChange={e => setEmphasis(e.target.value)} placeholder="예: 특허 보유, 해외 진출 계획, 사회적 가치" className="inp" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep('analysis')} className="px-4 py-3 rounded-lg text-[13px] border hover:opacity-80" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>← 분석 결과</button>
            <button onClick={() => { /* TODO: 결제 → 생성 */ alert('결제 + 생성 기능은 2단계에서 구현됩니다') }} disabled={!idea.trim() || !differentiator.trim()}
              className="flex-1 py-3 font-semibold text-[14px] rounded-lg disabled:opacity-50 hover:opacity-90" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
              사업계획서 생성하기 · ₩9,900
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg" style={{ background: 'var(--surface-hover)' }}>
      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-[12px] font-medium">{value}</div>
    </div>
  )
}
