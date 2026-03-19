'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { MODEL_PRICING, ModelId, estimateModulePricing } from '@/lib/pricing'
import { categories } from '@/lib/modules'

const tones = ['비즈니스 경어', '격식체', '반말/친근', '학술적', '법률']
const languages = ['한국어', '영어', '일본어']
const allFormats = ['pdf', 'docx', 'xlsx', 'hwp', 'txt', 'html']
const tokenOptions = [1024, 2048, 4096, 8192, 16384]

function UploadContent() {
  const { isAdmin, loading } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const editId = params.get('edit')

  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [category, setCategory] = useState('사업계획서')
  const [icon, setIcon] = useState('📄')
  const [tags, setTags] = useState('')
  const [mode, setMode] = useState<'oneclick' | 'form' | 'chat'>('form')
  const [outputMode, setOutputMode] = useState<'generate' | 'template'>('generate')
  const [status, setStatus] = useState<'draft' | 'active' | 'inactive'>('draft')

  const [aiModel, setAiModel] = useState<ModelId>('claude-sonnet-4-5-20250929')
  const [maxTokens, setMaxTokens] = useState(4096)
  const [temperature, setTemperature] = useState(0.3)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [userPromptTemplate, setUserPromptTemplate] = useState('')

  const [outputFormats, setOutputFormats] = useState<string[]>(['pdf'])
  const [defaultFormat, setDefaultFormat] = useState('pdf')
  const [expectedPages, setExpectedPages] = useState('1~3')
  const [tone, setTone] = useState('비즈니스 경어')
  const [language, setLanguage] = useState('한국어')

  const [requiredSections, setRequiredSections] = useState('')
  const [minSectionLength, setMinSectionLength] = useState(200)
  const [forbiddenExpr, setForbiddenExpr] = useState('')
  const [requiredExpr, setRequiredExpr] = useState('')
  const [refInstruction, setRefInstruction] = useState('')

  const [fields, setFields] = useState<{ key: string; label: string; type: string; placeholder: string; required: boolean }[]>([])
  const [questions, setQuestions] = useState<{ question: string; field: string }[]>([])
  const [chainNext, setChainNext] = useState('')
  const [creditCost, setCreditCost] = useState(1)
  const [pricing, setPricing] = useState<any>(null)
  const [changeNote, setChangeNote] = useState('')
  const [refFiles, setRefFiles] = useState<{ name: string; usage: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (editId) {
      supabase.from('modules').select('*').eq('id', editId).single().then(({ data }) => {
        if (!data) return
        setId(data.id); setName(data.name); setDesc(data.description || ''); setCategory(data.category)
        setIcon(data.icon || '📄'); setTags((data.tags || []).join(', ')); setMode(data.mode)
        setOutputMode(data.output_mode || 'generate'); setStatus(data.status)
        setAiModel(data.ai_model); setMaxTokens(data.max_tokens); setTemperature(data.temperature)
        setSystemPrompt(data.system_prompt); setUserPromptTemplate(data.user_prompt_template)
        setOutputFormats(data.output_formats || ['pdf']); setDefaultFormat(data.default_format || 'pdf')
        setExpectedPages(data.expected_pages || ''); setTone(data.tone || '비즈니스 경어')
        setLanguage(data.language || '한국어')
        setRequiredSections((data.required_sections || []).join('\n'))
        setMinSectionLength(data.min_section_length || 200)
        setForbiddenExpr((data.forbidden_expressions || []).join(', '))
        setRequiredExpr((data.required_expressions || []).join(', '))
        setRefInstruction(data.reference_instruction || '')
        setCreditCost(data.credit_cost)
        setChainNext((data.chain_next || []).join(', '))
        if (data.additional_inputs) setFields(data.additional_inputs)
        if (data.chat_questions) setQuestions(data.chat_questions)
      })
    }
  }, [editId])

  useEffect(() => {
    const p = estimateModulePricing(systemPrompt, userPromptTemplate, '', maxTokens, aiModel)
    setPricing(p)
    if (!editId) setCreditCost(p.credits)
  }, [systemPrompt, userPromptTemplate, maxTokens, aiModel])

  useEffect(() => {
    if (!loading && !isAdmin) router.push('/')
  }, [isAdmin, loading])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const addField = () => setFields([...fields, { key: `field_${fields.length + 1}`, label: '', type: 'text', placeholder: '', required: false }])
  const removeField = (i: number) => setFields(fields.filter((_, idx) => idx !== i))
  const updateField = (i: number, key: string, val: any) => setFields(fields.map((f, idx) => idx === i ? { ...f, [key]: val } : f))

  const addQuestion = () => setQuestions([...questions, { question: '', field: `q_${questions.length + 1}` }])
  const removeQuestion = (i: number) => setQuestions(questions.filter((_, idx) => idx !== i))
  const updateQuestion = (i: number, key: string, val: string) => setQuestions(questions.map((q, idx) => idx === i ? { ...q, [key]: val } : q))

  const toggleFormat = (f: string) => setOutputFormats(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])

  const handleSave = async (deployStatus: 'draft' | 'active') => {
    if (!name || !systemPrompt) { showToast('모듈명과 System Prompt는 필수입니다'); return }
    setSaving(true)
    const moduleData = {
      id: id || `M${String(Date.now()).slice(-6)}`,
      name, description: desc, category, icon,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      mode, output_mode: outputMode,
      ai_model: aiModel, max_tokens: maxTokens, temperature,
      system_prompt: systemPrompt, user_prompt_template: userPromptTemplate,
      additional_inputs: mode === 'form' ? fields : [],
      chat_questions: mode === 'chat' ? questions : [],
      output_formats: outputFormats, default_format: defaultFormat,
      output_style: tone, expected_pages: expectedPages, tone, language,
      required_sections: requiredSections.split('\n').filter(Boolean),
      min_section_length: minSectionLength,
      forbidden_expressions: forbiddenExpr.split(',').map(t => t.trim()).filter(Boolean),
      required_expressions: requiredExpr.split(',').map(t => t.trim()).filter(Boolean),
      reference_instruction: refInstruction,
      credit_cost: creditCost,
      estimated_input_tokens: pricing?.inputTokens || 0,
      estimated_output_tokens: pricing?.outputTokens || 0,
      estimated_cost_krw: pricing?.totalKRW || 0,
      chain_next: chainNext.split(',').map(t => t.trim()).filter(Boolean),
      status: deployStatus,
      updated_at: new Date().toISOString(),
    }

    let error
    if (editId) {
      const res = await supabase.from('modules').update(moduleData).eq('id', editId)
      error = res.error
      if (!error && changeNote) {
        await supabase.from('module_versions').insert({
          module_id: editId, version: `${Date.now()}`,
          system_prompt: systemPrompt, user_prompt_template: userPromptTemplate,
          ai_model: aiModel, max_tokens: maxTokens, temperature, change_note: changeNote,
        })
      }
    } else {
      const res = await supabase.from('modules').insert(moduleData)
      error = res.error
    }

    setSaving(false)
    if (error) { showToast('저장 실패: ' + error.message); return }
    showToast(deployStatus === 'active' ? '모듈이 배포되었습니다' : '임시저장 완료')
    setTimeout(() => router.push('/admin'), 1000)
  }

  if (loading || !isAdmin) return null

  return (
    <div className="max-w-[860px] mx-auto pt-6 pb-24 animate-in">
      <button onClick={() => router.push('/admin')} className="text-[12.5px] text-[#63636E] hover:text-[#A1A1AA] mb-4 inline-flex items-center gap-1">
        ← 어드민으로 돌아가기
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">{editId ? '모듈 수정' : '모듈 생성'}</h2>
          <p className="text-[13px] text-[#63636E] mt-0.5">AI 에이전트 모듈을 설정합니다</p>
        </div>
        {editId && (
          <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${status === 'active' ? 'bg-[rgba(0,212,170,0.1)] text-[#00D4AA]' : 'bg-[rgba(239,170,91,0.1)] text-[#EFAA5B]'}`}>
            {status === 'active' ? '활성' : status === 'draft' ? '초안' : '비활성'}
          </span>
        )}
      </div>

      {/* ===== 기본 정보 ===== */}
      <Section title="기본 정보" desc="모듈의 기본 정보를 입력합니다">
        <Row>
          <Field label="아이콘" width="w-20">
            <input value={icon} onChange={e => setIcon(e.target.value)} className="inp text-center text-xl" />
          </Field>
          <Field label="모듈 ID" width="w-32">
            <input value={id} onChange={e => setId(e.target.value)} placeholder="M01" className="inp font-mono" disabled={!!editId} />
          </Field>
          <Field label="모듈명" width="flex-1">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="정부지원사업 사업계획서" className="inp" />
          </Field>
        </Row>
        <Row>
          <Field label="카테고리" width="w-48">
            <select value={category} onChange={e => setCategory(e.target.value)} className="inp">
              {categories.filter(c => c !== '전체').map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="설명" width="flex-1">
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="모듈에 대한 간단한 설명" className="inp" />
          </Field>
        </Row>
        <div className="mb-4">
          <Field label="태그 (쉼표 구분)">
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="정부지원, 창업, 공모" className="inp" />
          </Field>
        </div>
        <Row>
          <Field label="실행 모드" width="flex-1">
            <div className="grid grid-cols-3 gap-2">
              {([['oneclick', '⚡ 원클릭', '프로필만으로 즉시 생성'], ['form', '📝 폼 입력', '추가 필드 입력 후 생성'], ['chat', '💬 대화형', 'AI와 대화하며 생성']] as const).map(([m, label, sub]) => (
                <button key={m} onClick={() => setMode(m as any)}
                  className={`p-3 rounded-lg border text-left transition-all ${mode === m ? 'border-[#00D4AA]/30 bg-[#00D4AA]/5' : 'border-white/[.06] hover:border-white/10'}`}>
                  <div className={`text-[13px] font-semibold ${mode === m ? 'text-[#00D4AA]' : 'text-white'}`}>{label}</div>
                  <div className="text-[10.5px] text-[#63636E] mt-0.5">{sub}</div>
                </button>
              ))}
            </div>
          </Field>
        </Row>
        <Row>
          <Field label="출력 모드" width="flex-1">
            <div className="grid grid-cols-2 gap-2">
              {([['generate', '🤖 AI 생성형', 'AI가 내용을 처음부터 생성'], ['template', '📋 템플릿 치환형', '기준 문서에서 변수만 교체']] as const).map(([m, label, sub]) => (
                <button key={m} onClick={() => setOutputMode(m as any)}
                  className={`p-3 rounded-lg border text-left transition-all ${outputMode === m ? 'border-[#00D4AA]/30 bg-[#00D4AA]/5' : 'border-white/[.06] hover:border-white/10'}`}>
                  <div className={`text-[13px] font-semibold ${outputMode === m ? 'text-[#00D4AA]' : 'text-white'}`}>{label}</div>
                  <div className="text-[10.5px] text-[#63636E] mt-0.5">{sub}</div>
                </button>
              ))}
            </div>
          </Field>
        </Row>
      </Section>

      {/* ===== AI 설정 ===== */}
      <Section title="AI 설정" desc="사용할 AI 모델과 프롬프트를 설정합니다">
        <Field label="AI 모델 선택">
          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(MODEL_PRICING) as [ModelId, typeof MODEL_PRICING[ModelId]][]).map(([key, val]) => (
              <button key={key} onClick={() => setAiModel(key)}
                className={`p-4 rounded-lg border text-left transition-all ${aiModel === key ? 'border-[#00D4AA]/30 bg-[#00D4AA]/5 ring-1 ring-[#00D4AA]/20' : 'border-white/[.06] hover:border-white/10'}`}>
                <div className={`text-[14px] font-bold ${aiModel === key ? 'text-[#00D4AA]' : 'text-white'}`}>{val.label}</div>
                <div className="text-[11px] text-[#63636E] mt-1">{val.desc}</div>
                <div className="text-[10px] text-[#63636E] mt-2 font-mono bg-black/20 rounded px-2 py-1 inline-block">
                  입력 ${val.input}/M · 출력 ${val.output}/M
                </div>
              </button>
            ))}
          </div>
        </Field>

        <Row>
          <Field label="Max Tokens (최대 출력 길이)" width="w-1/2">
            <select value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))} className="inp">
              {tokenOptions.map(t => <option key={t} value={t}>{t.toLocaleString()} tokens</option>)}
            </select>
          </Field>
          <Field label={`Temperature (창의성): ${temperature}`} width="w-1/2">
            <div className="pt-1">
              <input type="range" min="0" max="1" step="0.1" value={temperature}
                onChange={e => setTemperature(Number(e.target.value))}
                className="w-full accent-[#00D4AA] h-2" />
              <div className="flex justify-between text-[10px] text-[#63636E] mt-1">
                <span>0.0 정확/일관</span><span>1.0 창의적/다양</span>
              </div>
            </div>
          </Field>
        </Row>

        <Field label="System Prompt" desc="AI에게 부여할 역할, 작성 원칙, 출력 구조를 정의합니다">
          <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={14}
            placeholder={`당신은 ~~ 분야의 전문가입니다.\n\n[작성 원칙]\n1. ...\n2. ...\n\n[출력 구조]\n1. ...\n2. ...`}
            className="inp font-mono text-[12.5px] leading-[1.7]" />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10.5px] text-[#63636E]">AI에게 부여할 역할과 규칙을 상세하게 작성하세요</span>
            <span className="text-[10.5px] text-[#63636E] font-mono">~{Math.ceil(systemPrompt.length / 3.5).toLocaleString()} tokens</span>
          </div>
        </Field>

        <Field label="User Prompt Template" desc="사용자 정보가 삽입되는 템플릿입니다. {{변수명}}으로 사업자 정보를 자동 삽입합니다">
          <textarea value={userPromptTemplate} onChange={e => setUserPromptTemplate(e.target.value)} rows={8}
            placeholder={`[사업자 정보]\n상호: {{business_name}}\n대표자: {{representative}}\n업종: {{sector}} / {{item}}\n서비스: {{service_desc}}\n\n위 정보를 바탕으로 작성해주세요.`}
            className="inp font-mono text-[12.5px] leading-[1.7]" />
          <div className="mt-1.5 p-2.5 bg-black/20 rounded-md">
            <span className="text-[10.5px] text-[#63636E]">사용 가능 변수: </span>
            {['business_name', 'representative', 'business_number', 'business_type', 'sector', 'item', 'service_desc', 'target_customer', 'track_record', 'address', 'phone', 'email'].map(v => (
              <code key={v} className="text-[10px] text-[#00D4AA]/70 bg-[#00D4AA]/5 px-1.5 py-0.5 rounded mx-0.5 font-mono">{`{{${v}}}`}</code>
            ))}
          </div>
        </Field>
      </Section>

      {/* ===== 레퍼런스 ===== */}
      <Section title="레퍼런스 (예시 파일)" desc="결과물의 기준이 되는 예시 파일을 업로드합니다">
        <div className="border border-dashed border-white/10 rounded-lg p-8 text-center cursor-pointer hover:border-[#00D4AA]/30 hover:bg-[#00D4AA]/[.02] transition-all mb-4">
          <div className="text-2xl mb-2 opacity-40">📎</div>
          <p className="text-[13px] text-[#63636E]"><span className="text-[#00D4AA] font-medium">클릭</span>하여 레퍼런스 파일 업로드</p>
          <p className="text-[11px] text-[#63636E] mt-1">PDF, DOCX, TXT, HWP · 최대 5개 · 파일당 10MB</p>
        </div>
        {refFiles.length > 0 && refFiles.map((f, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-[#111114] rounded-lg mb-2">
            <span className="text-lg">📄</span>
            <span className="flex-1 text-[13px] text-[#A1A1AA]">{f.name}</span>
            <select value={f.usage} onChange={e => { const nf = [...refFiles]; nf[i].usage = e.target.value; setRefFiles(nf) }}
              className="bg-transparent border border-white/10 rounded-md px-2.5 py-1.5 text-[11px] text-[#A1A1AA]">
              <option>스타일 참고</option><option>구조 참고</option><option>템플릿 원본</option>
            </select>
            <button onClick={() => setRefFiles(refFiles.filter((_, idx) => idx !== i))} className="text-[#63636E] hover:text-[#EF5B5B] text-lg px-1">×</button>
          </div>
        ))}
        <Field label="학습 지시" desc="레퍼런스 파일을 어떻게 활용할지 AI에게 지시합니다">
          <textarea value={refInstruction} onChange={e => setRefInstruction(e.target.value)}
            placeholder="이 문서의 구조와 어투를 따라 작성하세요. 섹션 순서와 분량을 참고하되, 내용은 새로 생성하세요."
            rows={3} className="inp" />
        </Field>
      </Section>

      {/* ===== 출력 설정 ===== */}
      <Section title="출력 설정" desc="결과물의 형식, 분량, 어투를 설정합니다">
        <Field label="출력 형식 (복수 선택 가능)">
          <div className="flex gap-2 flex-wrap">
            {allFormats.map(f => (
              <button key={f} onClick={() => toggleFormat(f)}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium border transition-all ${outputFormats.includes(f) ? 'bg-[#00D4AA]/10 text-[#00D4AA] border-[#00D4AA]/20' : 'border-white/[.06] text-[#63636E] hover:border-white/10'}`}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </Field>
        <Row>
          <Field label="기본 출력 형식" width="w-1/4">
            <select value={defaultFormat} onChange={e => setDefaultFormat(e.target.value)} className="inp">
              {outputFormats.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
            </select>
          </Field>
          <Field label="예상 분량" width="w-1/4">
            <input value={expectedPages} onChange={e => setExpectedPages(e.target.value)} placeholder="8~12페이지" className="inp" />
          </Field>
          <Field label="어투" width="w-1/4">
            <select value={tone} onChange={e => setTone(e.target.value)} className="inp">
              {tones.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="언어" width="w-1/4">
            <select value={language} onChange={e => setLanguage(e.target.value)} className="inp">
              {languages.map(l => <option key={l}>{l}</option>)}
            </select>
          </Field>
        </Row>
      </Section>

      {/* ===== 품질 설정 ===== */}
      <Section title="품질 설정" desc="결과물에 반드시 포함되어야 할 내용과 표현 규칙을 설정합니다">
        <Field label="필수 포함 섹션" desc="줄바꿈으로 구분하세요. 이 섹션들이 결과물에 반드시 포함됩니다">
          <textarea value={requiredSections} onChange={e => setRequiredSections(e.target.value)} rows={5}
            placeholder={`사업 개요\n시장 분석\n비즈니스 모델\n실행 계획\n예산 계획`}
            className="inp" />
        </Field>
        <Row>
          <Field label="섹션별 최소 분량 (자)" width="w-1/3">
            <input type="number" value={minSectionLength} onChange={e => setMinSectionLength(Number(e.target.value))} className="inp" />
          </Field>
          <Field label="금지 표현 (쉼표 구분)" width="flex-1">
            <input value={forbiddenExpr} onChange={e => setForbiddenExpr(e.target.value)} placeholder="아마도, ~일 수도, 확실하지 않지만" className="inp" />
          </Field>
        </Row>
        <Field label="필수 표현 (쉼표 구분)" desc="결과물에 반드시 포함되어야 하는 키워드나 표현">
          <input value={requiredExpr} onChange={e => setRequiredExpr(e.target.value)} placeholder="목표 매출, 기대효과, 정량적 수치" className="inp" />
        </Field>
      </Section>

      {/* ===== 사용자 입력 필드 (form) ===== */}
      {mode === 'form' && (
        <Section title="사용자 입력 필드" desc="사용자가 추가로 입력해야 하는 필드를 정의합니다">
          {fields.length === 0 && (
            <p className="text-[13px] text-[#63636E] mb-3">아직 추가된 필드가 없습니다</p>
          )}
          {fields.map((f, i) => (
            <div key={i} className="p-3 bg-[#111114] rounded-lg mb-2">
              <div className="flex gap-2 items-center">
                <span className="text-[11px] text-[#63636E] w-5 text-center font-mono">{i + 1}</span>
                <input value={f.label} onChange={e => updateField(i, 'label', e.target.value)} placeholder="필드 라벨" className="inp flex-1" />
                <select value={f.type} onChange={e => updateField(i, 'type', e.target.value)} className="inp w-28">
                  <option value="text">텍스트</option><option value="textarea">장문</option>
                  <option value="number">숫자</option><option value="select">선택</option><option value="date">날짜</option>
                </select>
                <input value={f.placeholder} onChange={e => updateField(i, 'placeholder', e.target.value)} placeholder="입력 힌트" className="inp flex-1" />
                <label className="flex items-center gap-1.5 text-[11px] text-[#63636E] whitespace-nowrap cursor-pointer">
                  <input type="checkbox" checked={f.required} onChange={e => updateField(i, 'required', e.target.checked)} className="accent-[#00D4AA] w-3.5 h-3.5" />
                  필수
                </label>
                <button onClick={() => removeField(i)} className="text-[#63636E] hover:text-[#EF5B5B] text-lg w-6 text-center">×</button>
              </div>
            </div>
          ))}
          <button onClick={addField} className="mt-2 text-[13px] text-[#00D4AA] hover:text-[#00E8BB] font-medium">+ 입력 필드 추가</button>
        </Section>
      )}

      {/* ===== 대화 시나리오 (chat) ===== */}
      {mode === 'chat' && (
        <Section title="대화 시나리오" desc="AI가 순서대로 물어볼 질문을 정의합니다">
          {questions.length === 0 && (
            <p className="text-[13px] text-[#63636E] mb-3">아직 추가된 질문이 없습니다</p>
          )}
          {questions.map((q, i) => (
            <div key={i} className="p-3 bg-[#111114] rounded-lg mb-2">
              <div className="flex gap-2 items-start">
                <span className="text-[11px] text-[#63636E] w-5 text-center font-mono mt-2.5">{i + 1}</span>
                <div className="flex-1">
                  <textarea value={q.question} onChange={e => updateQuestion(i, 'question', e.target.value)}
                    placeholder="AI가 물어볼 질문" rows={2} className="inp w-full mb-1.5" />
                  <input value={q.field} onChange={e => updateQuestion(i, 'field', e.target.value)}
                    placeholder="저장할 변수명 (영문)" className="inp w-40 text-[11px] font-mono" />
                </div>
                <button onClick={() => removeQuestion(i)} className="text-[#63636E] hover:text-[#EF5B5B] text-lg w-6 text-center mt-2">×</button>
              </div>
            </div>
          ))}
          <button onClick={addQuestion} className="mt-2 text-[13px] text-[#00D4AA] hover:text-[#00E8BB] font-medium">+ 질문 추가</button>
        </Section>
      )}

      {/* ===== 가격 산정 ===== */}
      <Section title="💰 가격 산정" desc="토큰 소비량을 예측하고 판매 가격을 설정합니다">
        {pricing && (
          <div className="bg-[#111114] rounded-lg p-5 mb-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <div className="text-[11px] text-[#63636E] uppercase tracking-wider mb-1">AI 모델</div>
                <div className="text-[15px] font-semibold">{MODEL_PRICING[aiModel].label}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#63636E] uppercase tracking-wider mb-1">예상 토큰</div>
                <div className="text-[15px] font-semibold">
                  입력 ~{pricing.inputTokens.toLocaleString()} + 출력 ~{pricing.outputTokens.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#63636E] uppercase tracking-wider mb-1">원가</div>
                <div className="text-[15px] font-semibold">
                  ₩{Math.round(pricing.totalKRW).toLocaleString()}
                  <span className="text-[12px] text-[#63636E] ml-1">(${pricing.totalUSD.toFixed(4)})</span>
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#63636E] uppercase tracking-wider mb-1">추천 가격 (마진 {Math.round(pricing.margin)}%)</div>
                <div className="text-[15px] font-semibold text-[#00D4AA]">
                  ◆ {pricing.credits} 크레딧
                  <span className="text-[12px] text-[#63636E] ml-1">(₩{pricing.sellingPrice.toLocaleString()})</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[11px] text-[#63636E] uppercase tracking-wider mb-1.5">크레딧 설정</div>
            <div className="flex items-center gap-2">
              <input type="number" value={creditCost} onChange={e => setCreditCost(Number(e.target.value))} min={1}
                className="inp w-20 text-center text-lg font-bold" />
              <span className="text-[14px] text-[#63636E]">◆</span>
            </div>
          </div>
          {pricing && (
            <button onClick={() => setCreditCost(pricing.credits)}
              className="mt-5 text-[12px] text-[#00D4AA] hover:text-[#00E8BB] font-medium hover:underline">
              → 자동 추천 적용 (◆{pricing.credits})
            </button>
          )}
        </div>
      </Section>

      {/* ===== 체이닝 ===== */}
      <Section title="모듈 체이닝" desc="이 모듈 완료 후 추천할 연결 모듈을 지정합니다">
        <Field label="연결 모듈 ID (쉼표 구분)">
          <input value={chainNext} onChange={e => setChainNext(e.target.value)} placeholder="M07, M12, M37" className="inp" />
        </Field>
      </Section>

      {/* ===== 버전 메모 ===== */}
      {editId && (
        <Section title="변경 메모" desc="이번 수정의 변경 사항을 기록합니다 (버전 관리용)">
          <textarea value={changeNote} onChange={e => setChangeNote(e.target.value)}
            placeholder="예: 시장 분석 섹션 프롬프트 개선, 출력 분량 증가" rows={3} className="inp" />
        </Section>
      )}

      {/* ===== 하단 액션 ===== */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#09090B]/90 backdrop-blur-lg border-t border-white/[.06] z-40">
        <div className="max-w-[860px] mx-auto px-5 py-3 flex justify-between items-center">
          <button onClick={() => router.push('/admin')} className="text-[13px] text-[#63636E] hover:text-[#A1A1AA]">취소</button>
          <div className="flex gap-2">
            <button onClick={() => handleSave('draft')} disabled={saving}
              className="px-5 py-2.5 border border-white/10 rounded-lg text-[13px] font-medium text-[#A1A1AA] hover:bg-white/[.03] disabled:opacity-50">
              {saving ? '저장 중...' : '임시저장'}
            </button>
            <button onClick={() => handleSave('active')} disabled={saving}
              className="px-6 py-2.5 bg-[#00D4AA] text-[#09090B] rounded-lg text-[13px] font-semibold hover:bg-[#00E8BB] disabled:opacity-50">
              {saving ? '저장 중...' : editId ? '저장 및 배포' : '생성 및 배포'}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#232328] text-white px-5 py-2.5 rounded-lg text-[13px] font-medium border border-white/10 z-50 animate-in">
          {toast}
        </div>
      )}
    </div>
  )
}

// === Helper Components ===

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141417] border border-white/[.06] rounded-xl p-6 mb-4">
      <div className="mb-4 pb-3 border-b border-white/[.06]">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {desc && <p className="text-[11.5px] text-[#63636E] mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ label, desc, width, children }: { label: string; desc?: string; width?: string; children: React.ReactNode }) {
  return (
    <div className={`mb-3 ${width || ''}`}>
      <label className="block text-[11.5px] font-medium text-[#A1A1AA] mb-1.5">{label}</label>
      {desc && <p className="text-[10.5px] text-[#63636E] mb-1.5">{desc}</p>}
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-3 mb-1">{children}</div>
}

export default function UploadPage() {
  return <Suspense fallback={<div className="pt-20 text-center text-[#63636E]">로딩 중...</div>}><UploadContent /></Suspense>
}
