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
    const userPromptTemplate = buildUserPromptTemplate(moduleName, totalPages)
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

  let p = `당신은 정부지원사업 사업계획서 작성 전문 컨설턴트입니다. ${p1.program_name || '정부지원사업'} 사업계획서를 작성합니다.\n`

  // 공고 분석
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

  // 평가항목
  if (Array.isArray(p1.evaluation) && p1.evaluation.length) {
    const totalScore = p1.evaluation.reduce((s: number, e: any) => s + (e.score || 0), 0)
    p += `\n[평가항목 — 총 ${totalScore}점]\n`
    p1.evaluation.forEach((e: any, i: number) => {
      p += `${i + 1}. ${e.name}: ${e.score}점\n`
      if (Array.isArray(e.criteria) && e.criteria.length) {
        e.criteria.forEach((c: string) => { p += `   - ${c}\n` })
      }
    })
  }

  // 가점
  if (Array.isArray(p1.bonus) && p1.bonus.length) {
    p += `\n[가점 항목]\n`
    p1.bonus.forEach((b: any) => { p += `- ${typeof b === 'string' ? b : JSON.stringify(b)}\n` })
  }

  // 양식 구조
  if (Array.isArray(p2.sections) && p2.sections.length) {
    p += `\n[양식 구조 — 반드시 이 순서와 구조를 따를 것]\n`
    p += `※ ${totalPages}페이지 이내\n`
    if (p2.format) p += `※ 서식: ${p2.format}\n`

    p2.sections.forEach((s: any, i: number) => {
      p += `\n■ ${s.number || (i + 1)}. ${s.title}`
      if (s.page_limit) p += ` — ${s.page_limit}페이지`
      // 배점 최적화 매칭
      const matched = Array.isArray(st.sections) ? st.sections.find((ss: any) => ss.title === s.title) : null
      if (matched?.estimated_pages) p += ` (약 ${matched.estimated_pages}p)`
      p += '\n'
      if (Array.isArray(s.required_items) && s.required_items.length) {
        s.required_items.forEach((item: string) => { p += `- ${item}\n` })
      }
      if (s.notes) p += `※ ${s.notes}\n`
      if (matched?.focus) p += `[배점 집중: ${matched.focus}]\n`
    })
  }

  // 필수 표
  if (Array.isArray(p2.required_tables) && p2.required_tables.length) {
    p += `\n[필수 표/도표]\n`
    p2.required_tables.forEach((t: any) => { p += `- ${typeof t === 'string' ? t : JSON.stringify(t)}\n` })
  }

  // 작성 원칙
  p += `\n[작성 원칙]\n`
  p += `1. 양식의 섹션 구조, 표 형식, 순서를 정확히 따를 것\n`
  p += `2. ${totalPages}페이지 이내로 작성`
  if (Array.isArray(st.sections) && st.sections.length) {
    p += ` — 섹션별 분량:\n`
    st.sections.forEach((s: any) => { if (s.title && s.estimated_pages) p += `   - ${s.title}: 약 ${s.estimated_pages}p\n` })
  } else {
    p += '\n'
  }
  p += `3. 심사위원이 30초 안에 핵심을 파악할 수 있도록 각 섹션 첫 2줄에 핵심 배치\n`
  p += `4. 정량적 수치 필수 — 시장규모, 매출목표, 고용계획 (추정치는 [확인 필요])\n`
  p += `5. 표는 마크다운 표 형식으로 작성 (| 컬럼1 | 컬럼2 | 형식)\n`
  p += `6. 이미지 필요 위치에 [이미지: 설명] 마커 삽입\n`
  p += `7. 핵심 문장은 **볼드**로 강조\n`
  p += `8. ◦ 항목 → - 세부항목 형식으로 계층 구조 유지\n`
  p += `9. 평가배점 높은 항목에 분량과 내용을 집중\n`
  p += `10. 한국어로 작성\n`
  if (p1.etc) p += `11. 공고 특이사항: ${p1.etc}\n`

  return p
}

// BP001 기준 고정 템플릿 — 검증된 구조 그대로 사용
function buildUserPromptTemplate(programName: string, totalPages: number): string {
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
- 양식의 모든 섹션을 빠짐없이 작성
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
