'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { BUSINESS_TYPES, TONE_OPTIONS, BUSINESS_EXAMPLES } from '@/lib/blog-prompts'
import { PHOTO_CATEGORIES } from '@/lib/blog-pro-categories'
import Link from 'next/link'

export default function BlogWritePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

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
  const [step, setStep] = useState<'idle' | 'uploading' | 'analyzing' | 'writing' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const addPhotos = useCallback((files: FileList | null) => {
    if (!files) return
    const newPhotos = Array.from(files).slice(0, 5 - photos.length).map(file => ({
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
    if (!user) { router.push('/login'); return }
    if (!businessType || !shopName || !topic || !briefContent) {
      setErrorMsg('업종, 매장명, 주제, 내용을 모두 입력해주세요')
      return
    }
    if (photos.length === 0) {
      setErrorMsg('사진을 최소 1장 업로드해주세요')
      return
    }

    setErrorMsg('')
    setStep('uploading')

    try {
      // 1단계: 임시 postId 생성 (UUID)
      const tempPostId = crypto.randomUUID()

      // 2단계: 사진 업로드 (병렬)
      const uploadResults = await Promise.all(
        photos.map(async (p) => {
          const fd = new FormData()
          fd.append('file', p.file)
          fd.append('userId', user.id)
          fd.append('postId', tempPostId)
          const res = await fetch('/api/blog/upload-photo', { method: 'POST', body: fd })
          if (!res.ok) throw new Error('사진 업로드 실패')
          return res.json()
        })
      )

      setStep('analyzing')

      // 3단계: 블로그 글 생성
      setStep('writing')
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
      setStep('done')
      router.push(`/blog/preview/${postId}`)
    } catch (e: any) {
      setStep('error')
      setErrorMsg(e.message || '오류가 발생했습니다')
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>

  const ex = BUSINESS_EXAMPLES[businessType] || BUSINESS_EXAMPLES.other
  const isGenerating = step === 'uploading' || step === 'analyzing' || step === 'writing'

  return (
    <div className="max-w-[640px] mx-auto px-4 py-8 animate-in">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium mb-3" style={{ background: 'var(--mode-blog-bg, rgba(255,111,97,0.08))', color: 'var(--mode-blog-text, #FF6F61)', border: '1px solid var(--mode-blog-border, rgba(255,111,97,0.2))' }}>
          BlogPilot
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>블로그 글 만들기</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>주제와 사진만 올리면 SEO 최적화 글이 완성됩니다 · 티스토리에 바로 붙여넣기</p>
      </div>

      {/* 입력 폼 */}
      <div className="flex flex-col gap-5">
        {/* 업종 선택 */}
        <div>
          <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>업종</label>
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

        {/* 말투 선택 */}
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

        {/* 매장 정보 */}
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

        {/* 주제 */}
        <div>
          <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>주제</label>
          <input
            className="inp"
            placeholder={`예: ${ex.topic}`}
            value={topic}
            onChange={e => setTopic(e.target.value)}
            maxLength={100}
          />
        </div>

        {/* 카테고리 (선택) */}
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

        {/* 짧은 내용 */}
        <div>
          <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>짧은 내용</label>
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

        {/* 사진 업로드 */}
        <div>
          <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>사진 (1~5장)</label>
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

          {/* 사진 미리보기 */}
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
        </div>

        {/* 에러 메시지 */}
        {errorMsg && (
          <div className="rounded-lg px-4 py-3 text-[13px]" style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)' }}>
            {errorMsg}
          </div>
        )}

        {/* 생성 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={isGenerating}
          className="w-full py-3.5 rounded-xl font-semibold text-[15px] transition-all"
          style={{
            background: isGenerating ? 'var(--surface)' : 'var(--accent)',
            color: isGenerating ? 'var(--text-muted)' : '#fff',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
          }}
        >
          {step === 'idle' || step === 'error' ? '블로그 글 생성하기' :
           step === 'uploading' ? '사진 업로드 중...' :
           step === 'analyzing' ? '사진 분석 중...' :
           step === 'writing' ? '블로그 글 작성 중...' :
           '완료!'}
        </button>

        {isGenerating && (
          <div className="flex justify-center">
            <div className="spinner" />
          </div>
        )}
      </div>

      {/* 모듈 B 업셀 배너 */}
      <div className="mt-12 rounded-xl p-5 border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
          매일 자동으로 블로그 글을 올려드릴까요?
        </div>
        <p className="text-[12px] mb-3" style={{ color: 'var(--text-muted)' }}>
          BlogPilot Pro — 주 3회 자동 생성 + 이메일 발송 (준비 중)
        </p>
        <span className="inline-block px-4 py-1.5 rounded-full text-[12px] font-medium" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
          Coming Soon
        </span>
      </div>
    </div>
  )
}
