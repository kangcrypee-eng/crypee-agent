'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { PRODUCT_CATEGORIES, PHOTO_TAGS, DEFAULT_DESIGNS } from '@/lib/detail-page-prompts'

export default function DetailPageCreate() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const refFileRef = useRef<HTMLInputElement>(null)
  const productFileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [category, setCategory] = useState('')
  const [productName, setProductName] = useState('')
  const [price, setPrice] = useState('')
  const [features, setFeatures] = useState(['', '', ''])
  const [target, setTarget] = useState('')
  const [differentiator, setDifferentiator] = useState('')

  const [refPhotos, setRefPhotos] = useState<File[]>([])
  const [productPhotos, setProductPhotos] = useState<{ file: File; tag: string; preview: string }[]>([])

  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const [analysisResult, setAnalysisResult] = useState<any>(null)

  if (authLoading) return <div className="flex justify-center py-20"><div className="spinner" /></div>

  const addRefPhotos = (files: FileList | null) => {
    if (!files) return
    setRefPhotos(prev => [...prev, ...Array.from(files)].slice(0, 10))
  }

  const addProductPhotos = (files: FileList | null) => {
    if (!files) return
    const newPhotos = Array.from(files).map(file => ({
      file,
      tag: 'detail',
      preview: URL.createObjectURL(file),
    }))
    setProductPhotos(prev => [...prev, ...newPhotos].slice(0, 10))
  }

  const updateTag = (idx: number, tag: string) => {
    setProductPhotos(prev => prev.map((p, i) => i === idx ? { ...p, tag } : p))
  }

  const removeProduct = (idx: number) => {
    setProductPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const handleGenerate = async () => {
    if (!user) { router.push('/login'); return }
    if (!productName || !category || productPhotos.length === 0) {
      setError('상품명, 카테고리, 상품 사진(최소 1장)을 입력해주세요')
      return
    }
    setError('')
    setAnalyzing(true)
    setProgress(10)

    try {
      // 1. 사진 분석
      const fd = new FormData()
      fd.append('userId', user.id)
      for (const f of refPhotos) fd.append('references', f)
      for (const p of productPhotos) fd.append('products', p.file)
      fd.append('productTags', JSON.stringify(productPhotos.map(p => p.tag)))

      const analyzeRes = await fetch('/api/detail-page/analyze', { method: 'POST', body: fd })
      if (!analyzeRes.ok) throw new Error((await analyzeRes.json()).error || '분석 실패')
      const analysis = await analyzeRes.json()
      setAnalysisResult(analysis)
      setAnalyzing(false)
      setProgress(50)

      // 2. 카피 + HTML 생성
      setGenerating(true)
      const genRes = await fetch('/api/detail-page/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          category,
          productName,
          price,
          features: features.filter(f => f.trim()),
          target,
          differentiator,
          referenceDesign: analysis.referenceDesign,
          products: analysis.products,
        }),
      })
      if (!genRes.ok) throw new Error((await genRes.json()).error || '생성 실패')
      const result = await genRes.json()
      setProgress(100)

      // 미리보기로 이동
      router.push(`/blog/preview/${result.postId}`)
    } catch (e: any) {
      setError(e.message || '오류가 발생했습니다')
    }
    setAnalyzing(false)
    setGenerating(false)
  }

  const design = DEFAULT_DESIGNS[category] || DEFAULT_DESIGNS.other

  return (
    <div className="max-w-[640px] mx-auto px-4 py-8 animate-in">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium mb-3" style={{ background: 'rgba(43,125,233,0.08)', color: '#2B7DE9', border: '1px solid rgba(43,125,233,0.2)' }}>
          상세페이지
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>스마트스토어 상세페이지</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>상품 사진 + 정보만 입력하면 고전환율 상세페이지가 완성됩니다</p>
      </div>

      {/* 스텝 */}
      {!analyzing && !generating && (
        <div className="flex gap-1 mb-8 justify-center">
          {[1,2,3,4].map(s => (
            <div key={s} className="w-10 h-1 rounded-full" style={{ background: s <= step ? 'var(--accent)' : 'var(--border-strong)' }} />
          ))}
        </div>
      )}

      {error && <div className="mb-4 rounded-lg px-4 py-3 text-[13px]" style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)' }}>{error}</div>}

      {/* 분석/생성 중 */}
      {(analyzing || generating) && (
        <div className="text-center py-16">
          <div className="spinner mx-auto mb-4" />
          <h2 className="text-[18px] font-bold mb-2" style={{ color: 'var(--text)' }}>
            {analyzing ? '사진 분석 중...' : '상세페이지 생성 중...'}
          </h2>
          <div className="w-full max-w-[300px] mx-auto h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--surface)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--accent)' }} />
          </div>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {analyzing ? '레퍼런스 + 상품 사진을 AI가 분석하고 있습니다' : 'Claude가 카피를 작성하고 HTML을 조합하고 있습니다'}
          </p>
        </div>
      )}

      {/* Step 1: 카테고리 */}
      {step === 1 && !analyzing && !generating && (
        <div>
          <h2 className="text-[16px] font-bold mb-4" style={{ color: 'var(--text)' }}>어떤 상품인가요?</h2>
          <div className="grid grid-cols-3 gap-2">
            {PRODUCT_CATEGORIES.map(c => (
              <button key={c.value} onClick={() => { setCategory(c.value); setStep(2) }}
                className="px-3 py-4 rounded-lg border text-center transition-all hover:opacity-80"
                style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)' }}>
                <div className="text-2xl mb-1">{c.icon}</div>
                <div className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{c.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: 상품 정보 */}
      {step === 2 && !analyzing && !generating && (
        <div className="flex flex-col gap-4">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>상품 정보</h2>
          <input className="inp" placeholder="상품명 *" value={productName} onChange={e => setProductName(e.target.value)} />
          <input className="inp" placeholder="가격 (예: 29,900원)" value={price} onChange={e => setPrice(e.target.value)} />

          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>핵심 특장점 (최대 3개) *</label>
            {features.map((f, i) => (
              <input key={i} className="inp mb-2" placeholder={`특장점 ${i + 1}`}
                value={f} onChange={e => setFeatures(prev => prev.map((p, j) => j === i ? e.target.value : p))} />
            ))}
          </div>

          <input className="inp" placeholder="타겟 고객 (선택)" value={target} onChange={e => setTarget(e.target.value)} />
          <input className="inp" placeholder="경쟁 대비 차별점 (선택)" value={differentiator} onChange={e => setDifferentiator(e.target.value)} />

          <button onClick={() => { if (!productName) { setError('상품명을 입력해주세요'); return }; if (!features.some(f => f.trim())) { setError('특장점을 최소 1개 입력해주세요'); return }; setError(''); setStep(3) }}
            className="w-full py-3.5 rounded-xl font-semibold text-[15px]" style={{ background: 'var(--accent)', color: '#fff' }}>
            다음
          </button>
        </div>
      )}

      {/* Step 3: 레퍼런스 이미지 */}
      {step === 3 && !analyzing && !generating && (
        <div className="flex flex-col gap-4">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>레퍼런스 상세페이지 (선택)</h2>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>마음에 드는 상세페이지를 캡처해서 올려주세요. AI가 그 디자인 스타일을 따라합니다. 없으면 건너뛰기 가능.</p>

          <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer"
            style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)' }}
            onClick={() => refFileRef.current?.click()}>
            <input ref={refFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addRefPhotos(e.target.files)} />
            <div className="text-2xl mb-2">🎨</div>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>레퍼런스 이미지 업로드 (최대 10장)</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--accent)' }}>{refPhotos.length}장 선택됨</p>
          </div>

          {refPhotos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {refPhotos.map((f, i) => (
                <div key={i} className="relative flex-shrink-0">
                  <img src={URL.createObjectURL(f)} className="w-20 h-20 object-cover rounded-lg border" style={{ borderColor: 'var(--border)' }} alt="" />
                  <button onClick={() => setRefPhotos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center"
                    style={{ background: 'var(--error-text)', color: '#fff' }}>X</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setStep(4)}
              className="flex-1 py-3 rounded-xl font-semibold text-[14px]" style={{ background: 'var(--accent)', color: '#fff' }}>
              다음
            </button>
            <button onClick={() => { setRefPhotos([]); setStep(4) }}
              className="px-6 py-3 rounded-xl text-[14px] border" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}>
              건너뛰기
            </button>
          </div>
        </div>
      )}

      {/* Step 4: 상품 사진 + 생성 */}
      {step === 4 && !analyzing && !generating && (
        <div className="flex flex-col gap-4">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>상품 사진 업로드</h2>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>상품 사진을 올리고 각 사진의 용도를 선택해주세요. 메인 사진 1장은 필수!</p>

          <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer"
            style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)' }}
            onClick={() => productFileRef.current?.click()}>
            <input ref={productFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addProductPhotos(e.target.files)} />
            <div className="text-2xl mb-2">📸</div>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>상품 사진 업로드 (최대 10장)</p>
          </div>

          {/* 사진 목록 + 태그 선택 */}
          {productPhotos.length > 0 && (
            <div className="flex flex-col gap-3">
              {productPhotos.map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl p-3 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <div className="relative flex-shrink-0">
                    <img src={p.preview} className="w-16 h-16 object-cover rounded-lg" alt="" />
                    <button onClick={() => removeProduct(i)}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center"
                      style={{ background: 'var(--error-text)', color: '#fff' }}>X</button>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] mb-1.5" style={{ color: 'var(--text-muted)' }}>사진 {i + 1}</p>
                    <div className="flex gap-1 flex-wrap">
                      {PHOTO_TAGS.map(t => (
                        <button key={t.value} onClick={() => updateTag(i, t.value)}
                          className="px-2 py-0.5 rounded text-[10px] font-medium border"
                          style={{
                            borderColor: p.tag === t.value ? 'var(--accent)' : 'var(--border)',
                            background: p.tag === t.value ? 'var(--accent-bg)' : 'transparent',
                            color: p.tag === t.value ? 'var(--accent)' : 'var(--text-muted)',
                          }}>
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 디자인 미리보기 */}
          {category && (
            <div className="rounded-xl p-4 border" style={{ background: design.bg, borderColor: 'var(--border)' }}>
              <div className="text-[11px] mb-1" style={{ color: design.text, opacity: 0.5 }}>디자인 톤 미리보기</div>
              <div className="text-[16px] font-bold" style={{ color: design.text }}>{productName || '상품명'}</div>
              <div className="text-[12px] mt-1" style={{ color: design.accent }}>{price || '₩29,900'}</div>
              <div className="text-[11px] mt-1" style={{ color: design.text, opacity: 0.6 }}>
                {refPhotos.length > 0 ? '레퍼런스 디자인 기반으로 생성됩니다' : `${PRODUCT_CATEGORIES.find(c => c.value === category)?.label} 기본 디자인 적용`}
              </div>
            </div>
          )}

          <button onClick={handleGenerate} disabled={productPhotos.length === 0}
            className="w-full py-3.5 rounded-xl font-semibold text-[15px]"
            style={{ background: 'var(--accent)', color: '#fff', opacity: productPhotos.length === 0 ? 0.5 : 1 }}>
            상세페이지 생성하기 (₩2,900)
          </button>

          <button onClick={() => setStep(3)} className="w-full py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>이전으로</button>
        </div>
      )}
    </div>
  )
}
