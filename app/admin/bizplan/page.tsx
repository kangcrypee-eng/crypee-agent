'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

function BizplanPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAdmin, loading } = useAuth()

  const scanId = searchParams.get('scanId')

  const [announcement, setAnnouncement] = useState<File | null>(null)
  const [template, setTemplate] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState('')

  const [moduleName, setModuleName] = useState('')
  const [moduleDesc, setModuleDesc] = useState('')
  const [modulePrice, setModulePrice] = useState(9900)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [templateIncluded, setTemplateIncluded] = useState(false)
  const [scanInfo, setScanInfo] = useState<{ url?: string; announcement_file_url?: string; template_file_url?: string; template_file_name?: string } | null>(null)
  const [fetchingFiles, setFetchingFiles] = useState(false)

  useEffect(() => { if (!loading && !isAdmin) router.push('/') }, [isAdmin, loading])

  useEffect(() => {
    if (!scanId) return
    setFetchingFiles(true)
    ;(async () => {
      const { data } = await supabase
        .from('bizplan_scans')
        .select('url, announcement_file_url, template_file_url, template_file_name')
        .eq('id', scanId)
        .single()

      if (!data) { setFetchingFiles(false); return }
      setScanInfo(data)

      const filePromises: Promise<void>[] = []

      if (data.announcement_file_url) {
        filePromises.push(
          fetch(`/api/admin/proxy-file?url=${encodeURIComponent(data.announcement_file_url)}`)
            .then(r => r.ok ? r.blob() : Promise.reject(new Error(`${r.status}`)))
            .then(blob => {
              setAnnouncement(new File([blob], '공고문.pdf', { type: 'application/pdf' }))
            })
            .catch(() => { /* 자동 다운로드 실패 시 수동 업로드 */ })
        )
      }

      const templateExt = (data.template_file_name || '').split('.').pop()?.toLowerCase()
      if (data.template_file_url && templateExt === 'pdf') {
        filePromises.push(
          fetch(`/api/admin/proxy-file?url=${encodeURIComponent(data.template_file_url)}`)
            .then(r => r.ok ? r.blob() : Promise.reject(new Error(`${r.status}`)))
            .then(blob => {
              setTemplate(new File([blob], data.template_file_name || '양식.pdf', { type: 'application/pdf' }))
            })
            .catch(() => { /* 자동 다운로드 실패 시 수동 업로드 */ })
        )
      }

      await Promise.allSettled(filePromises)
      setFetchingFiles(false)
    })()
  }, [scanId])

  if (loading || !isAdmin) return null

  const templateExt = (scanInfo?.template_file_name || '').split('.').pop()?.toLowerCase()
  const isHwpTemplate = templateExt === 'hwp' || templateExt === 'hwpx'

  const handleAnalyze = async () => {
    if (!announcement) { setError('공고문을 업로드해주세요'); return }
    if (!templateIncluded && !template) { setError('양식을 업로드하거나 "공고문에 양식 포함"을 체크해주세요'); return }
    setError(''); setAnalyzing(true)
    try {
      const fd = new FormData()
      fd.append('announcement', announcement)
      if (!templateIncluded && template) fd.append('template', template)
      const res = await fetch('/api/bizplan/analyze', { method: 'POST', body: fd })
      const text = await res.text()
      let data: any
      try { data = JSON.parse(text) } catch { setError('분석 API 오류 — 파일을 확인하거나 다시 시도해주세요'); setAnalyzing(false); return }
      if (!data.success) { setError(data.error || '분석 실패'); setAnalyzing(false); return }
      setAnalysis(data)
      if (data.phase1?.program_name) setModuleName(data.phase1.program_name + ' 사업계획서')
      if (data.phase1?.organization) setModuleDesc(`${data.phase1.organization} ${data.phase1.program_name || ''} 맞춤 사업계획서`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '오류 발생'
      setError(msg)
    }
    setAnalyzing(false)
  }

  const handleCreateModule = async () => {
    if (!moduleName.trim() || !analysis) return
    setSaving(true)
    try {
    const moduleId = `BP${Date.now().toString().slice(-6)}`
    const p1 = analysis.phase1 || {}
    const p2 = analysis.phase2 || {}
    const totalPages = p2.total_pages || 10
    const sectionTitles = Array.isArray(p2.sections) ? p2.sections.map((s: any) => s.title).filter(Boolean) : []

    const systemPrompt = buildSystemPrompt(analysis)
    const userPromptTemplate = buildUserPromptTemplate(moduleName, totalPages, sectionTitles)
    const additionalInputs = buildAdditionalInputs(p1)

    const { error: err } = await supabase.from('modules').insert({
      id: moduleId,
      name: moduleName,
      description: moduleDesc,
      category: '사업계획서',
      icon: '📋',
      tags: ['사업계획서', '정부지원', p1.field || '', p1.organization || ''].filter(Boolean),
      mode: 'bizplan',
      output_mode: 'generate',
      ai_model: 'claude-sonnet-4-6',
      max_tokens: 16384,
      temperature: 0.25,
      system_prompt: systemPrompt,
      user_prompt_template: userPromptTemplate,
      additional_inputs: additionalInputs,
      output_formats: ['pdf', 'docx', 'txt'],
      default_format: 'pdf',
      expected_pages: String(totalPages),
      tone: '비즈니스 경어',
      language: 'ko',
      required_sections: sectionTitles,
      min_section_length: 500,
      credit_cost: 0,
      price_krw: modulePrice,
      status: 'inactive',
    })

    if (err) { setMsg('모듈 생성 실패: ' + err.message); setSaving(false); return }

    if (scanId) {
      await supabase.from('bizplan_scans').update({
        status: 'module_created',
        module_id: moduleId,
        updated_at: new Date().toISOString(),
      }).eq('id', scanId)
    }

      setMsg(`✅ 모듈 ${moduleId} 생성 완료 (비활성 상태 — 어드민에서 활성화)`)
      setTimeout(() => router.push('/admin'), 2000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류'
      setMsg('오류: ' + msg)
    }
    setSaving(false)
  }

  return (
    <div className="max-w-[700px] mx-auto pt-6 pb-16 animate-in">
      <button onClick={() => router.push('/admin')} className="text-[12.5px] hover:opacity-70 mb-4 inline-block" style={{ color: 'var(--text-muted)' }}>← 어드민</button>
      <h1 className="text-[18px] font-bold mb-1">📋 맞춤 사업계획서 모듈 생성</h1>
      <p className="text-[12px] mb-6" style={{ color: 'var(--text-muted)' }}>공고문 + 양식 업로드 → AI 분석 → 모듈 자동 등록</p>

      {fetchingFiles && (
        <div className="p-4 rounded-xl border mb-4 text-[12px] text-center" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          공고 파일 자동 다운로드 중...
        </div>
      )}

      {!fetchingFiles && scanId && scanInfo && !announcement && (
        <div className="p-3 rounded-xl border mb-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {scanInfo.announcement_file_url ? (
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              공고문 자동 다운로드 실패 —
              <a href={`/api/admin/proxy-file?url=${encodeURIComponent(scanInfo.announcement_file_url)}`}
                download="공고문.pdf" className="underline ml-1" style={{ color: 'var(--accent)' }}>
                직접 다운로드
              </a>
              후 아래에 업로드해주세요.
            </p>
          ) : (
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              공고문 PDF를 직접 업로드해주세요.
              {scanInfo.url && (
                <>
                  {' '}
                  <a href={scanInfo.url} target="_blank" rel="noopener noreferrer"
                    className="underline" style={{ color: 'var(--accent)' }}>
                    공고 페이지 열기 →
                  </a>
                </>
              )}
            </p>
          )}
        </div>
      )}

      {!analysis ? (
        <div className="rounded-xl p-5 mb-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <FileUp label="공고문 *" desc="PDF, HWP, DOCX — 심사기준, 배점, 자격요건" file={announcement} setFile={setAnnouncement} />

          <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
            <input type="checkbox" checked={templateIncluded} onChange={e => setTemplateIncluded(e.target.checked)} className="w-3.5 h-3.5 accent-[var(--accent)]" />
            <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>공고문 안에 사업계획서 양식 포함됨 (별도 양식 없음)</span>
          </label>

          {!templateIncluded && isHwpTemplate && !template ? (
            <div className="mb-4">
              <p className="text-[12px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>사업계획서 양식 *</p>
              <div className="p-3 rounded-lg border" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border)' }}>
                <p className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>
                  HWP 파일 — PDF로 변환 후 업로드 필요
                </p>
                <p className="text-[11px] font-medium mb-2">{scanInfo?.template_file_name}</p>
                {scanInfo?.template_file_url && (
                  <a href={`/api/admin/proxy-file?url=${encodeURIComponent(scanInfo.template_file_url)}`}
                    download={scanInfo.template_file_name}
                    className="text-[11px] underline"
                    style={{ color: 'var(--accent)' }}>
                    HWP 다운로드
                  </a>
                )}
              </div>
              <div className="mt-2">
                <FileUp label="PDF 변환 후 업로드" desc="HWP → PDF 변환 후 업로드해주세요" file={template} setFile={setTemplate} />
              </div>
            </div>
          ) : !templateIncluded ? (
            <FileUp label="사업계획서 양식 *" desc="PDF, HWP, DOCX — 제출 양식 파일" file={template} setFile={setTemplate} />
          ) : null}

          {error && <p className="p-3 rounded-lg text-[12px] mb-3" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>{error}</p>}
          <button onClick={handleAnalyze} disabled={analyzing || !announcement || (!templateIncluded && !template)} className="w-full py-3 font-semibold text-[14px] rounded-lg disabled:opacity-50" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
            {analyzing ? '🔍 AI 분석 중... (30초~1분)' : '공고 분석하기'}
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-xl p-5 mb-3 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-[13px] font-semibold mb-3">📋 공고 분석</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {([['사업명', analysis.phase1?.program_name], ['주관기관', analysis.phase1?.organization], ['분야', analysis.phase1?.field], ['기간', analysis.phase1?.period]] as [string, unknown][]).filter(([, v]) => v != null && v !== '').map(([l, v]) => (
                <div key={l} className="p-2 rounded-lg" style={{ background: 'var(--surface-hover)' }}>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{l}</div>
                  <div className="text-[12px] font-medium">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
                </div>
              ))}
            </div>
            {Array.isArray(analysis.phase1?.evaluation) && analysis.phase1.evaluation.map((ev: any, i: number) => (
              <div key={i} className="flex justify-between text-[11px] py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                <span>{ev.name}</span><span className="font-bold" style={{ color: 'var(--accent)' }}>{ev.score}점</span>
              </div>
            ))}
          </div>

          {Array.isArray(analysis.phase2?.sections) && analysis.phase2.sections.length > 0 && (
            <div className="rounded-xl p-5 mb-3 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-[13px] font-semibold mb-2">📝 양식 ({analysis.phase2.total_pages ? analysis.phase2.total_pages + 'p' : '제한없음'})</p>
              {analysis.phase2.sections.map((s: any, i: number) => (
                <div key={i} className="text-[11px] py-1" style={{ color: 'var(--text-secondary)' }}>{s.number || i + 1}. {s.title}</div>
              ))}
            </div>
          )}

          <div className="rounded-xl p-5 mb-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-[13px] font-semibold mb-3">모듈 설정</p>
            <div className="mb-3"><label className="block text-[12px] mb-1" style={{ color: 'var(--text-secondary)' }}>모듈명</label><input value={moduleName} onChange={e => setModuleName(e.target.value)} className="inp" /></div>
            <div className="mb-3"><label className="block text-[12px] mb-1" style={{ color: 'var(--text-secondary)' }}>설명</label><input value={moduleDesc} onChange={e => setModuleDesc(e.target.value)} className="inp" /></div>
            <div><label className="block text-[12px] mb-1" style={{ color: 'var(--text-secondary)' }}>가격 (₩)</label><input type="number" value={modulePrice} onChange={e => setModulePrice(Number(e.target.value))} className="inp w-40" /></div>
          </div>

          {msg && <p className="p-3 rounded-lg text-[12px] mb-3 text-center" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{msg}</p>}
          <div className="flex gap-2">
            <button onClick={() => setAnalysis(null)} className="px-4 py-3 rounded-lg text-[13px] border" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>← 다시</button>
            <button onClick={handleCreateModule} disabled={saving || !moduleName.trim()} className="flex-1 py-3 font-semibold text-[14px] rounded-lg disabled:opacity-50" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
              {saving ? '생성 중...' : '모듈 생성 (비활성으로 등록)'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function AdminBizplanPage() {
  return (
    <Suspense>
      <BizplanPageInner />
    </Suspense>
  )
}

function FileUp({ label, desc, file, setFile }: { label: string; desc: string; file: File | null; setFile: (f: File | null) => void }) {
  return (
    <div className="mb-4">
      <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <p className="text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      {file ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border" style={{ background: 'var(--surface-input)', borderColor: 'var(--border)' }}>
          <span>📄</span><span className="flex-1 text-[12px]">{file.name}</span>
          <button onClick={() => setFile(null)} className="text-[11px]" style={{ color: 'var(--error-text)' }}>삭제</button>
        </div>
      ) : (
        <label className="block p-4 rounded-lg border-2 border-dashed text-center cursor-pointer hover:opacity-80" style={{ borderColor: 'var(--border-strong)' }}>
          <span className="text-lg opacity-40">📎</span>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>PDF, DOCX, HWP, TXT</p>
          <input type="file" accept=".pdf,.docx,.hwp,.txt" className="hidden" onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]) }} />
        </label>
      )}
    </div>
  )
}

function buildSystemPrompt(analysis: any): string {
  const p1 = analysis.phase1 || {}
  const p2 = analysis.phase2 || {}
  const st = analysis.structure || {}
  const totalPages = p2.total_pages || 10
  const sections: any[] = Array.isArray(p2.sections) ? p2.sections : []
  const evaluations: any[] = Array.isArray(p1.evaluation) ? p1.evaluation : []
  const requiredTables: any[] = Array.isArray(p2.required_tables) ? p2.required_tables : []
  const structSections: any[] = Array.isArray(st.sections) ? st.sections : []

  let p = `당신은 정부지원사업 사업계획서 작성 전문 컨설턴트입니다. ${p1.program_name || '정부지원사업'} 사업계획서를 작성합니다.\n`

  // [공고 분석]
  p += `\n[공고 분석 — ${p1.program_name || ''}]\n`
  p += `사업명: ${p1.program_name || ''}\n`
  p += `주관: ${p1.organization || ''}\n`
  if (p1.field) p += `분야: ${p1.field}\n`
  if (p1.period) p += `기간: ${p1.period}\n`
  if (p1.budget) p += `지원규모: ${p1.budget}\n`
  if (p1.eligibility) {
    const elig = Array.isArray(p1.eligibility) ? p1.eligibility.join(', ') : p1.eligibility
    p += `지원대상: ${elig}\n`
  }
  if (p1.schedule) p += `접수: ${p1.schedule}\n`

  // [평가항목]
  if (evaluations.length) {
    const totalScore = evaluations.reduce((s: number, e: any) => s + (e.score || 0), 0)
    p += `\n[평가항목 — 총 ${totalScore}점]\n`
    evaluations.forEach((e: any, i: number) => {
      p += `${i + 1}. ${e.name}: ${e.score}점\n`
      if (Array.isArray(e.criteria) && e.criteria.length) {
        e.criteria.forEach((c: string) => { p += `   - ${c}\n` })
      }
    })
  }

  // [가점]
  if (Array.isArray(p1.bonus) && p1.bonus.length) {
    p += `\n[가점 항목]\n`
    p1.bonus.forEach((b: any) => { p += `- ${typeof b === 'string' ? b : JSON.stringify(b)}\n` })
  }

  // [양식 가이드]
  if (sections.length) {
    p += `\n[양식 가이드 — 각 섹션에서 반드시 다뤄야 할 내용]\n`
    sections.forEach((s: any, i: number) => {
      const items: string[] = Array.isArray(s.required_items) ? s.required_items : []
      p += `■ ${s.number || (i + 1)}. ${s.title}`
      if (s.page_limit) p += ` (${s.page_limit}p)`
      if (items.length) p += `: ${items.join(', ')}`
      p += '\n'
      if (s.notes) p += `   ※ ${s.notes}\n`
    })
  }

  // [출력 구조] — BP001 방식: 각 섹션의 실제 문서 뼈대
  p += `\n[출력 구조 — 반드시 이 구조 그대로 출력할 것]\n`
  p += `※ ${totalPages}페이지 이내`
  if (p2.format) p += ` / 서식: ${p2.format}`
  p += '\n'

  const placedTables = new Set<string>()

  sections.forEach((sec: any, i: number) => {
    const items: string[] = Array.isArray(sec.required_items) ? sec.required_items : []
    const secNum = sec.number || (i + 1)
    const structSec = structSections.find((ss: any) => ss.title === sec.title)

    // 이 섹션과 매칭되는 평가항목 찾기
    const matchedEvals = evaluations.filter((ev: any) => {
      const secTitle = (sec.title || '').toLowerCase()
      const evName = (ev.name || '').toLowerCase()
      return secTitle.includes(evName.substring(0, 4)) || evName.includes(secTitle.substring(0, 4))
    })

    p += `\n## ■ ${secNum}. ${sec.title}`
    if (structSec?.estimated_pages) p += ` — 약 ${structSec.estimated_pages}p`
    p += '\n'

    // 사실형 헤더 섹션: 항목이 짧은 명사형 (창업아이템명, 산출물 등)
    const isHeader = items.length > 0 && items.length <= 8
      && items.every((it: string) => it.length < 25 && !it.includes('분석') && !it.includes('전략'))
    // 서술형 섹션: 평가항목과 연결되거나 항목이 길고 서술적
    const isNarrative = matchedEvals.length > 0
      || items.some((it: string) => it.length >= 25)
      || items.length === 0

    // 이 섹션에 속하는 필수 표 찾기 (required_items 텍스트에서 표 이름 매칭)
    const itemsText = items.join(' ')
    const sectionTables = requiredTables.filter((t: any) => {
      const tname = typeof t === 'string' ? t : String(t)
      if (placedTables.has(tname)) return false
      const tnameShort = tname.replace(/[<>]/g, '').trim().substring(0, 8)
      return itemsText.includes(tnameShort) || (sec.title || '').includes(tnameShort.substring(0, 4))
    })

    if (isHeader && !isNarrative) {
      // 순수 표 섹션 (일반현황, 개요 등)
      p += '\n| 항목 | 내용 |\n|------|------|\n'
      items.forEach((item: string) => { p += `| ${item} | (내용) |\n` })
      p += '\n'
    } else {
      // 헤더 표 있으면 먼저 출력
      if (isHeader && items.length > 0) {
        p += '\n| 항목 | 내용 |\n|------|------|\n'
        items.forEach((item: string) => { p += `| ${item} | (내용) |\n` })
        p += '\n'
      }

      // ◦/- 서술형 — 평가항목의 세부기준을 content hint로 활용
      if (matchedEvals.length > 0) {
        matchedEvals.forEach((ev: any) => {
          const criteria: string[] = Array.isArray(ev.criteria) ? ev.criteria : []
          if (criteria.length >= 2) {
            p += `◦ (${criteria[0]} — 30자 이내 핵심 제목)\n`
            p += `- (구체적 현황, 통계 수치, 근거. 100~200자)\n`
            p += `- (추가 근거, 사례. 100~200자)\n`
            p += `◦ (${criteria[1]} — 30자 이내 핵심 제목)\n`
            p += `- (구체적 내용, 수치. 100~200자)\n`
            if (criteria[2]) p += `- (${criteria[2]}. 100~200자)\n`
          } else if (criteria.length === 1) {
            p += `◦ (${criteria[0]} — 30자 이내 핵심 제목)\n`
            p += `- (구체적 내용, 수치, 근거. 100~200자)\n`
            p += `- (추가 근거, 사례. 100~200자)\n`
          } else {
            p += `◦ (대항목 제목 — 30자 이내)\n`
            p += `- (구체적 내용, 수치, 근거. 100~200자)\n`
            p += `- (추가 근거. 100~200자)\n`
          }
        })
      } else {
        // 평가항목 매칭 없는 서술형
        p += `◦ (대항목 제목 — 30자 이내)\n`
        p += `- (구체적 내용, 수치, 근거. 100~200자)\n`
        p += `- (추가 근거, 사례. 100~200자)\n`
        p += `◦ (대항목 제목 — 30자 이내)\n`
        p += `- (구체적 내용. 100~200자)\n`
      }

      // 이 섹션에 속하는 필수 표 삽입
      sectionTables.forEach((t: any) => {
        const tname = typeof t === 'string' ? t : String(t)
        placedTables.add(tname)
        p += `\n< ${tname} >\n${makeTableSkeleton(tname)}\n`
      })
    }

    if (structSec?.focus) p += `[배점 집중: ${structSec.focus}]\n`
  })

  // 아직 배치되지 않은 필수 표
  const remaining = requiredTables.filter((t: any) => !placedTables.has(typeof t === 'string' ? t : String(t)))
  if (remaining.length > 0) {
    p += `\n[추가 필수 표]\n`
    remaining.forEach((t: any) => {
      const tname = typeof t === 'string' ? t : String(t)
      p += `\n< ${tname} >\n${makeTableSkeleton(tname)}\n`
    })
  }

  // [작성 원칙]
  p += `\n[작성 원칙]\n`
  p += `1. 반드시 위 [출력 구조]의 섹션 순서와 형식을 정확히 따를 것\n`
  p += `2. ◦(대항목)와 -(소항목) 형식 유지 — ◦는 한 줄 30자 이내 핵심 제목, -는 100~200자 구체적 내용\n`
  p += `3. 심사위원이 30초 안에 핵심을 파악할 수 있도록 각 섹션 첫 줄에 핵심 배치\n`
  p += `4. 정량적 수치 필수 — 시장규모, 매출목표, 고용계획 (추정치는 [확인 필요])\n`
  p += `5. 기존 사업계획서가 제공되면 그 기업의 정보를 우선 사용하되, 이 양식에 맞게 재구성\n`
  p += `6. 정보 부족 시 업종에 맞게 합리적으로 추정하되 [확인 필요] 표시\n`
  p += `7. 개인정보 마스킹: 이름→○○○, 학교→○○대학교\n`
  p += `8. 평가배점 높은 항목에 분량과 내용을 집중\n`
  p += `9. 사회적 가치(ESG) 반드시 포함\n`
  p += `10. 한국어로 작성\n`
  p += `11. ${totalPages}페이지 이내`
  if (structSections.length) {
    p += ` — 섹션별 분량:\n`
    structSections.forEach((s: any) => { if (s.title && s.estimated_pages) p += `    - ${s.title}: 약 ${s.estimated_pages}p\n` })
  } else {
    p += '\n'
  }
  if (p1.etc) p += `12. 공고 특이사항: ${p1.etc}\n`

  return p
}

function makeTableSkeleton(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('일정') || n.includes('추진')) {
    return `| 구분 | 추진 내용 | 추진 기간 | 세부 내용 |\n|------|----------|----------|----------|\n| 1 | (내용) | (기간) | (세부) |`
  }
  if (n.includes('사업비') || n.includes('집행') || n.includes('예산')) {
    return `| 비목 | 산출 근거 | 금액(원) |\n|------|----------|----------|\n| 재료비 | (내용) | (금액) |\n| 외주용역비 | (내용) | (금액) |`
  }
  if (n.includes('팀') || n.includes('인력') || n.includes('구성')) {
    return `| 구분 | 직위 | 담당 업무 | 보유역량 | 구성 상태 |\n|------|------|----------|----------|----------|\n| 1 | (직위) | (업무) | (역량) | (상태) |`
  }
  if (n.includes('경쟁') || n.includes('비교')) {
    return `| 구분 | 자사 | 경쟁사A | 경쟁사B |\n|------|------|---------|----------|\n| (항목) | (내용) | (내용) | (내용) |`
  }
  if (n.includes('시장') || n.includes('tam') || n.includes('sam')) {
    return `| 목표시장 | 규모 | 근거 |\n|---------|------|------|\n| TAM | (내용) | (내용) |\n| SAM | (내용) | (내용) |\n| SOM | (내용) | (내용) |`
  }
  if (n.includes('협력') || n.includes('파트너')) {
    return `| 구분 | 파트너명 | 보유역량 | 협업방안 | 협력 시기 |\n|------|---------|----------|----------|----------|\n| (내용) | (내용) | (내용) | (내용) | (내용) |`
  }
  if (n.includes('로드맵') || n.includes('단계')) {
    return `| 단계 | 기간 | 주요 내용 | 목표 |\n|------|------|----------|------|\n| 1단계 | (기간) | (내용) | (목표) |\n| 2단계 | (기간) | (내용) | (목표) |`
  }
  return `| 구분 | 내용 | 세부사항 |\n|------|------|----------|\n| (내용) | (내용) | (내용) |`
}

// BP001 기준 고정 템플릿 — 섹션 목록은 공고별로 동적 주입
function buildUserPromptTemplate(programName: string, totalPages: number, sectionTitles: string[]): string {
  const sectionList = sectionTitles.length > 0
    ? sectionTitles.join(', ')
    : '모든 섹션'
  return `[사업자 정보]
상호(예정): {{business_name}}
대표자: {{representative}}
업종: {{sector}} / {{item}}
서비스: {{service_desc}}
타겟 고객: {{target_customer}}
실적: {{track_record}}

[사업 아이디어]
{{idea}}

[핵심 차별점]
{{differentiator}}

[팀 구성]
{{team}}

[현재 진행 상태]
{{current_status}}

[강조할 점]
{{emphasis}}

[신청 분야]
{{apply_field}}

[예상 사업비 사용 계획]
{{budget_plan}}

위 정보를 바탕으로 ${programName} 사업계획서 양식에 맞춰 작성해주세요.
- 양식의 모든 섹션(${sectionList})을 빠짐없이 작성
- ${totalPages}페이지 이내
- 정보 부족한 부분은 업종에 맞게 합리적으로 추정하되 [확인 필요] 표시`
}

// BP001 기준 고정 입력 필드 — 신청 분야만 공고별로 동적 추가
function buildAdditionalInputs(p1: any): any[] {
  const applyOptions: string[] = Array.isArray(p1.eligibility)
    ? p1.eligibility.map((e: unknown) => typeof e === 'string' ? e : String(e)).filter(Boolean)
    : []

  return [
    { key: 'idea', label: '사업 아이디어', type: 'textarea', placeholder: '어떤 문제를 해결하고, 어떤 방식으로 해결하는지 상세히 설명해주세요', required: true },
    { key: 'differentiator', label: '핵심 차별점', type: 'textarea', placeholder: '기존 솔루션 대비 기술적/사업적 차별점', required: true },
    { key: 'team', label: '팀 구성 현황', type: 'textarea', placeholder: '대표자 경력, 팀원 역할/역량, 협력기관 (있으면)', required: false },
    { key: 'current_status', label: '현재 진행 상태', type: 'text', placeholder: '예: 아이디어 단계, MVP 개발 중, 시제품 완성', required: false },
    { key: 'emphasis', label: '강조할 점', type: 'text', placeholder: '예: 특허 보유, 수상 이력, 가점 해당 항목', required: false },
    ...(applyOptions.length > 1 ? [{ key: 'apply_field', label: '신청 분야', type: 'select', placeholder: '', required: true, options: applyOptions }] : []),
    { key: 'budget_plan', label: '사업비 사용 계획 (간략)', type: 'textarea', placeholder: '예: 시제품 제작 1500만원, 마케팅 500만원, 인건비 1000만원', required: false },
  ]
}
