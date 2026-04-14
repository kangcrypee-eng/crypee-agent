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

  const [scanInfo, setScanInfo] = useState<{ announcement_file_url?: string; template_file_url?: string; template_file_name?: string } | null>(null)
  const [fetchingFiles, setFetchingFiles] = useState(false)

  useEffect(() => { if (!loading && !isAdmin) router.push('/') }, [isAdmin, loading])

  useEffect(() => {
    if (!scanId) return
    setFetchingFiles(true)
    ;(async () => {
      const { data } = await supabase
        .from('bizplan_scans')
        .select('announcement_file_url, template_file_url, template_file_name')
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
    if (!announcement || !template) { setError('공고문과 양식을 모두 업로드해주세요'); return }
    setError(''); setAnalyzing(true)
    try {
      const fd = new FormData()
      fd.append('announcement', announcement)
      fd.append('template', template)
      const res = await fetch('/api/bizplan/analyze', { method: 'POST', body: fd })
      const data = await res.json()
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
    const moduleId = `BP${Date.now().toString().slice(-6)}`
    const systemPrompt = buildSystemPrompt(analysis)

    const { error: err } = await supabase.from('modules').insert({
      id: moduleId, name: moduleName, description: moduleDesc,
      category: '사업계획서', icon: '📋',
      tags: ['사업계획서', '정부지원', analysis.phase1?.field || ''].filter(Boolean),
      mode: 'bizplan', output_mode: 'generate',
      ai_model: 'claude-opus-4-6', max_tokens: 16384, temperature: 0.3,
      system_prompt: systemPrompt,
      user_prompt_template: `[사업자 정보]
상호: {{business_name}}
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

위 정보를 바탕으로, 분석된 공고의 양식 구조와 심사배점에 맞춰 사업계획서를 작성해주세요.`,
      additional_inputs: [
        { key: 'idea', label: '사업 아이디어', type: 'textarea', placeholder: '어떤 문제를 해결하고, 어떤 방식으로 해결하는지 설명해주세요', required: true },
        { key: 'differentiator', label: '핵심 차별점', type: 'textarea', placeholder: '기존 솔루션 대비 차별점', required: true },
        { key: 'team', label: '팀 구성 (선택)', type: 'textarea', placeholder: '팀원 수, 역할, 주요 경력', required: false },
        { key: 'current_status', label: '현재 진행 상태 (선택)', type: 'text', placeholder: '예: MVP 완성, 매출 발생', required: false },
        { key: 'emphasis', label: '강조할 점 (선택)', type: 'text', placeholder: '예: 특허 보유, 해외 진출', required: false },
      ],
      credit_cost: 0, price_krw: modulePrice, status: 'inactive',
    })

    if (err) { setMsg('실패: ' + err.message); setSaving(false); return }

    if (scanId) {
      await supabase.from('bizplan_scans').update({
        status: 'module_created',
        module_id: moduleId,
        updated_at: new Date().toISOString(),
      }).eq('id', scanId)
    }

    setMsg(`✅ 모듈 ${moduleId} 생성 완료 (비활성 상태 — 어드민에서 활성화)`)
    setTimeout(() => router.push('/admin'), 2000)
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

      {!fetchingFiles && scanId && scanInfo && !scanInfo.announcement_file_url && !announcement && (
        <div className="p-3 rounded-xl border mb-4 text-[12px]" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#ef4444' }}>
          파일 URL 미확인 — 어드민으로 돌아가 <strong>전체 공고 스캔</strong>을 한 번 더 실행하면 자동 로드됩니다. 또는 직접 업로드해주세요.
        </div>
      )}

      {!analysis ? (
        <div className="rounded-xl p-5 mb-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <FileUp label="공고문 PDF *" desc="심사기준, 배점, 자격요건" file={announcement} setFile={setAnnouncement} />

          {isHwpTemplate && !template ? (
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
          ) : (
            <FileUp label="사업계획서 양식 *" desc="제출 양식 파일" file={template} setFile={setTemplate} />
          )}

          {error && <p className="p-3 rounded-lg text-[12px] mb-3" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>{error}</p>}
          <button onClick={handleAnalyze} disabled={analyzing || !announcement || !template} className="w-full py-3 font-semibold text-[14px] rounded-lg disabled:opacity-50" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
            {analyzing ? '🔍 AI 분석 중... (30초~1분)' : '공고 분석하기'}
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-xl p-5 mb-3 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-[13px] font-semibold mb-3">📋 공고 분석</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[['사업명', analysis.phase1?.program_name], ['주관기관', analysis.phase1?.organization], ['분야', analysis.phase1?.field], ['기간', analysis.phase1?.period]].filter(([, v]) => v).map(([l, v]) => (
                <div key={l as string} className="p-2 rounded-lg" style={{ background: 'var(--surface-hover)' }}>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{l}</div>
                  <div className="text-[12px] font-medium">{v as string}</div>
                </div>
              ))}
            </div>
            {analysis.phase1?.evaluation?.map((ev: any, i: number) => (
              <div key={i} className="flex justify-between text-[11px] py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                <span>{ev.name}</span><span className="font-bold" style={{ color: 'var(--accent)' }}>{ev.score}점</span>
              </div>
            ))}
          </div>

          {analysis.phase2?.sections?.length > 0 && (
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
  const p1 = analysis.phase1 || {}; const p2 = analysis.phase2 || {}; const st = analysis.structure || {}
  let p = `당신은 정부지원사업 사업계획서 작성 전문가입니다.\n\n[공고 분석]\n사업명: ${p1.program_name || ''}\n주관: ${p1.organization || ''}\n분야: ${p1.field || ''}\n기간: ${p1.period || ''}\n`
  if (p1.evaluation?.length) { p += '\n[심사항목]\n'; p1.evaluation.forEach((e: any) => { p += `- ${e.name}: ${e.score}점\n`; if (e.criteria?.length) p += `  세부: ${e.criteria.join(', ')}\n` }) }
  if (p2.sections?.length) { p += `\n[양식 구조 — ${p2.total_pages || '미정'}페이지]\n`; p2.sections.forEach((s: any, i: number) => { p += `${s.number || i + 1}. ${s.title}${s.page_limit ? ` (${s.page_limit}p)` : ''}\n` }) }
  if (st.sections?.length) { p += '\n[배점 최적화]\n'; st.sections.forEach((s: any) => { p += `- ${s.title}: ${s.estimated_pages}p, ${s.focus || ''}\n` }) }
  p += `\n[작성 원칙]\n1. 양식 섹션 구조를 정확히 따를 것\n2. 배점 높은 항목에 집중\n3. 정량적 수치 필수 (추정치는 [확인 필요])\n4. 이미지 필요 위치에 [이미지: 설명] 마커\n5. 핵심 문장 **볼드** 강조\n6. 한국어 작성`
  return p
}
