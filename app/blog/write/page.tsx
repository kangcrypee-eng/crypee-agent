'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { BUSINESS_TYPES, TONE_OPTIONS, BUSINESS_EXAMPLES } from '@/lib/blog-prompts'
import { PHOTO_CATEGORIES } from '@/lib/blog-pro-categories'

const STEPS = ['업종 선택', '매장 정보', '주제 & 내용', '사진 업로드']

export default function BlogWritePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const uiStepRef = useRef(1)

  const [uiStep, setUiStep] = useState(1)
  const [businessType, setBusinessType] = useState('')
  const [tone, setTone] = useState('friendly')
  const [shopName, setShopName] = useState('')
  const [shopPhone, setShopPhone] = useState('')
  const [shopAddress, setShopAddress] = useState('')
  const [shopLink, setShopLink] = useState('')
  const [category, setCategory] = useState('')
  const [topic, setTopic] = useState('')
  const [briefContent, setBriefContent] = useState('')
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([])
  const [genStep, setGenStep] = useState<'idle' | 'uploading' | 'analyzing' | 'writing' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    window.history.pushState(null, '')
    const handlePop = () => {
      const current = uiStepRef.current
      if (current <= 1) {
        router.push('/market')
      } else {
        const prev = current - 1
        uiStepRef.current = prev
        setUiStep(prev)
        setErrorMsg('')
        window.history.pushState(null, '')
      }
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  const goNext = () => {
    setErrorMsg('')
    if (uiStep === 1 && !businessType) { setErrorMsg('업종을 선택해주세요'); return }
    if (uiStep === 2 && !shopName.trim()) { setErrorMsg('매장명을 입력해주세요'); return }
    if (uiStep === 3) {
      if (!topic.trim()) { setErrorMsg('주제를 입력해주세요'); return }
      if (briefContent.trim().length < 10) { setErrorMsg('내용을 10자 이상 입력해주세요'); return }
    }
    const next = uiStep + 1
    uiStepRef.current = next
    setUiStep(next)
    window.history.pushState(null, '')
  }

  const goBack = () => {
    setErrorMsg('')
    if (uiStep <= 1) { router.push('/market'); return }
    const prev = uiStep - 1
    uiStepRef.current = prev
    setUiStep(prev)
  }

  const compressImage = (file: File): Promise<File> => new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const maxW = 860
      const ratio = Math.min(maxW / img.width, maxW / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(objectUrl)
      const tryCompress = (quality: number) => {
        canvas.toBlob(blob => {
          if (!blob) { resolve(file); return }
          if (blob.size > 1024 * 1024 && quality > 0.4) {
            tryCompress(Math.round((quality - 0.1) * 10) / 10)
            return
          }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        }, 'image/jpeg', quality)
      }
      tryCompress(0.8)
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file) }
    img.src = objectUrl
  })

  const addPhotos = useCallback((files: FileList | null) => {
    if (!files) return
    const MAX_SIZE = 20 * 1024 * 1024
    const valid = Array.from(files).filter(f => {
      if (f.size > MAX_SIZE) {
        setErrorMsg(`"${f.name}" 파일이 너무 큽니다 (최대 20MB)`)
        return false
      }
      return true
    })
    const newPhotos = valid.slice(0, 5 - photos.length).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 5))
  }, [photos.length])

  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const handleSubmit = async () => {
    if (!user) { router.push('/login?redirect=/blog/write'); return }
    if (photos.length === 0) { setErrorMsg('사진을 최소 1장 업로드해주세요'); return }

    setErrorMsg('')
    setGenStep('uploading')

    try {
      const tempPostId = crypto.randomUUID()

      const uploadResults = await Promise.all(
        photos.map(async (p) => {
          const compressed = await compressImage(p.file)
          const fd = new FormData()
          fd.append('file', compressed)
          fd.append('userId', user.id)
          fd.append('postId', tempPostId)
          const res = await fetch('/api/blog/upload-photo', { method: 'POST', body: fd })
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
            throw new Error('사진 업로드 실패: ' + (err.error || res.status))
          }
          return res.json()
        })
      )

      setGenStep('analyzing')

      setGenStep('writing')
      const genRes = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          businessType,
          tone,
          shopName,
          shopPhone,
          shopAddress,
          shopLink,
          category,
          topic,
          briefContent,
          photos: uploadResults.map((r, i) => ({
            cdnUrl: r.cdnUrl,
            displayOrder: i,
            originalFilename: r.originalFilename,
          })),
        }),
      })

      if (!genRes.ok) {
        const err = await genRes.json()
        throw new Error(err.error || '글 생성 실패')
      }

      const { postId } = await genRes.json()
      setGenStep('done')
      router.push(`/blog/preview/${postId}`)
    } catch (e: any) {
      setGenStep('error')
      setErrorMsg(e.message || '오류가 발생했습니다')
    }
  }

  // loading 중에도 페이지 표시 (비로그인 유저 접근 허용)

  const ex = BUSINESS_EXAMPLES[businessType] || BUSINESS_EXAMPLES.other
  const isGenerating = genStep === 'uploading' || genStep === 'analyzing' || genStep === 'writing'

  return (
    <div className="max-w-[640px] mx-auto px-4 py-8 animate-in">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium mb-3" style={{ background: 'var(--mode-blog-bg, rgba(255,111,97,0.08))', color: 'var(--mode-blog-text, #FF6F61)', border: '1px solid var(--mode-blog-border, rgba(255,111,97,0.2))' }}>
          BlogPilot
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>블로그 글 만들기</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>주제와 사진만 올리면 SEO 최적화 글이 완성됩니다</p>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((label, i) => {
          const stepNum = i + 1
          const isActive = stepNum === uiStep
          const isDone = stepNum < uiStep
          return (
            <div key={stepNum} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all"
                  style={{
                    background: isDone ? 'var(--accent)' : isActive ? 'var(--accent)' : 'var(--surface)',
                    color: isDone || isActive ? '#fff' : 'var(--text-muted)',
                    border: isActive || isDone ? 'none' : '1.5px solid var(--border)',
                  }}>
                  {isDone ? '✓' : stepNum}
                </div>
                <span className="text-[10px] mt-1 hidden sm:block" style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-8 h-px mb-4" style={{ background: isDone ? 'var(--accent)' : 'var(--border)' }} />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-5">
        {/* Step 1: 업종 + 말투 */}
        {uiStep === 1 && <>
          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              업종 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BUSINESS_TYPES.map(bt => (
                <button
                  key={bt.value}
                  onClick={() => setBusinessType(bt.value)}
                  className="px-3 py-2.5 rounded-lg border text-[13px] font-medium transition-all"
                  style={{
                    borderColor: businessType === bt.value ? 'var(--accent)' : 'var(--border-strong)',
                    background: businessType === bt.value ? 'var(--accent-bg)' : 'var(--surface)',
                    color: businessType === bt.value ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {bt.icon} {bt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>말투</label>
            <div className="grid grid-cols-2 gap-2">
              {TONE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className="px-3 py-3 rounded-lg border text-left transition-all"
                  style={{
                    borderColor: tone === t.value ? 'var(--accent)' : 'var(--border-strong)',
                    background: tone === t.value ? 'var(--accent-bg)' : 'var(--surface)',
                  }}
                >
                  <div className="text-[13px] font-medium" style={{ color: tone === t.value ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {t.icon} {t.label}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {t.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>}

        {/* Step 2: 매장 정보 */}
        {uiStep === 2 && (
          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>매장 정보</label>
            <div className="flex flex-col gap-2.5">
              <input
                className="inp"
                placeholder={`매장명 (예: ${ex.shopName}) *`}
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                maxLength={50}
              />
              <input
                className="inp"
                placeholder="연락처 (예: 02-1234-5678)"
                value={shopPhone}
                onChange={e => setShopPhone(e.target.value)}
                maxLength={30}
              />
              <input
                className="inp"
                placeholder="주소 (예: 서울 강남구 역삼동 123-4)"
                value={shopAddress}
                onChange={e => setShopAddress(e.target.value)}
                maxLength={100}
              />
              <input
                className="inp"
                placeholder="예약 링크 (예: https://naver.me/...)"
                value={shopLink}
                onChange={e => setShopLink(e.target.value)}
                maxLength={200}
              />
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>매장명은 필수, 나머지는 입력하면 글 하단에 자동으로 들어갑니다</p>
            </div>
          </div>
        )}

        {/* Step 3: 주제 + 카테고리 + 내용 */}
        {uiStep === 3 && <>
          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              주제 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="inp"
              placeholder={`예: ${ex.topic}`}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              maxLength={100}
            />
          </div>

          {businessType && (
            <div>
              <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                카테고리 <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(선택 안 하면 자동)</span>
              </label>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setCategory('')}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium border"
                  style={{ borderColor: !category ? 'var(--accent)' : 'var(--border-strong)', background: !category ? 'var(--accent-bg)' : 'var(--surface)', color: !category ? 'var(--accent)' : 'var(--text-muted)' }}>
                  자동 선택
                </button>
                {(PHOTO_CATEGORIES[businessType] || PHOTO_CATEGORIES.other).map(c => (
                  <button key={c.value} onClick={() => setCategory(c.value)}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-medium border"
                    style={{ borderColor: category === c.value ? 'var(--accent)' : 'var(--border-strong)', background: category === c.value ? 'var(--accent-bg)' : 'var(--surface)', color: category === c.value ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              짧은 내용 <span style={{ color: '#ef4444' }}>*</span>
              <span className="font-normal text-[11px] ml-1" style={{ color: 'var(--text-muted)' }}>(최소 10자)</span>
            </label>
            <textarea
              className="inp"
              rows={3}
              placeholder={`예: ${ex.brief}`}
              value={briefContent}
              onChange={e => setBriefContent(e.target.value)}
              maxLength={500}
              style={{ resize: 'none' }}
            />
            <div className="text-right text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{briefContent.length}/500</div>
          </div>
        </>}

        {/* Step 4: 사진 업로드 */}
        {uiStep === 4 && (
          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              사진 (1~5장) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:opacity-80"
              style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); addPhotos(e.dataTransfer.files) }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => addPhotos(e.target.files)}
              />
              <div className="text-2xl mb-2">📷</div>
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                클릭하거나 사진을 여기에 끌어다 놓으세요
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {photos.length}/5장 선택됨
              </p>
            </div>

            {photos.length > 0 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    <img
                      src={p.preview}
                      alt={`사진 ${i + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border"
                      style={{ borderColor: 'var(--border-strong)' }}
                    />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                      style={{ background: 'var(--error-text)', color: '#fff' }}
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isGenerating && (
              <div className="mt-4 p-4 rounded-xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex justify-center mb-2"><div className="spinner" /></div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                  {genStep === 'uploading' ? '사진 업로드 중...' :
                   genStep === 'analyzing' ? '사진 분석 중...' :
                   '블로그 글 작성 중...'}
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>최대 30초 소요될 수 있습니다</p>
              </div>
            )}
          </div>
        )}

        {/* 에러 메시지 */}
        {errorMsg && (
          <div className="rounded-lg px-4 py-3 text-[13px]" style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)' }}>
            {errorMsg}
          </div>
        )}

        {/* 네비게이션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={goBack}
            className="flex-1 py-3.5 rounded-xl font-semibold text-[15px] border transition-all"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)', background: 'var(--surface)' }}
          >
            {uiStep === 1 ? '← 마켓' : '이전'}
          </button>

          {uiStep < 4 ? (
            <button
              onClick={goNext}
              className="flex-[2] py-3.5 rounded-xl font-semibold text-[15px] transition-all"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              다음
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isGenerating}
              className="flex-[2] py-3.5 rounded-xl font-semibold text-[15px] transition-all"
              style={{
                background: isGenerating ? 'var(--surface)' : 'var(--accent)',
                color: isGenerating ? 'var(--text-muted)' : '#fff',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
              }}
            >
              {genStep === 'error' ? '다시 시도' : isGenerating ? '생성 중...' : '블로그 글 생성하기'}
            </button>
          )}
        </div>
      </div>

      {/* 모듈 B 업셀 배너 */}
      {uiStep === 4 && !isGenerating && (
        <div className="mt-12 rounded-xl p-5 border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
            블로그 글을 한번에 만들어볼까요?
          </div>
          <p className="text-[12px] mb-3" style={{ color: 'var(--text-muted)' }}>
            최대 30편을 한번에 생성 → 이메일로 발송
          </p>
          <a href="/blog/pro" className="inline-block px-4 py-1.5 rounded-full text-[12px] font-semibold" style={{ background: 'var(--accent)', color: '#fff' }}>
            일괄 생성하기
          </a>
        </div>
      )}
    </div>
  )
}
