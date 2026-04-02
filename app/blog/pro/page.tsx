'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { BUSINESS_TYPES, TONE_OPTIONS, BUSINESS_EXAMPLES } from '@/lib/blog-prompts'
import { PHOTO_CATEGORIES } from '@/lib/blog-pro-categories'

const PLANS = [
  { value: 12, label: '12편', price: 9900 },
  { value: 24, label: '24편', price: 19900 },
  { value: 36, label: '36편', price: 29900 },
]

export default function BlogProPageWrapper() {
  return <Suspense fallback={<div className="flex justify-center py-20"><div className="spinner" /></div>}><BlogProPage /></Suspense>
}

function BlogProPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const [step, setStep] = useState(1)
  const [businessType, setBusinessType] = useState('')
  const [shopName, setShopName] = useState('')
  const [shopPhone, setShopPhone] = useState('')
  const [shopAddress, setShopAddress] = useState('')
  const [shopLink, setShopLink] = useState('')
  const [tone, setTone] = useState('friendly')
  const [email, setEmail] = useState('')

  const [postCount, setPostCount] = useState(12)
  const [photosPerPost, setPhotosPerPost] = useState(3)
  const [categoryPhotos, setCategoryPhotos] = useState<Record<string, File[]>>({})

  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingProgress, setGeneratingProgress] = useState(0)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [generatedStarted, setGeneratedStarted] = useState(false)
  const [customCats, setCustomCats] = useState<{ value: string; label: string; icon: string }[]>([])
  const [newCatName, setNewCatName] = useState('')

  const ex = BUSINESS_EXAMPLES[businessType] || BUSINESS_EXAMPLES.other
  const baseCats = PHOTO_CATEGORIES[businessType] || PHOTO_CATEGORIES.other
  const cats = [...baseCats, ...customCats]
  const totalPhotos = Object.values(categoryPhotos).reduce((sum, arr) => sum + arr.length, 0)
  const neededPhotos = postCount * photosPerPost
  const selectedPlan = PLANS.find(p => p.value === postCount)!

  const addPhotos = (category: string, files: FileList | null) => {
    if (!files) return
    setCategoryPhotos(prev => ({
      ...prev,
      [category]: [...(prev[category] || []), ...Array.from(files)],
    }))
  }

  const removePhoto = (category: string, idx: number) => {
    setCategoryPhotos(prev => ({
      ...prev,
      [category]: (prev[category] || []).filter((_, i) => i !== idx),
    }))
  }

  // (결제는 results 페이지에서 처리)

  const startGenerationFromSaved = async (savedData: any) => {
    setGenerating(true)
    setGeneratingProgress(10)
    setStep(99)

    try {
      // 사진은 이미 업로드됨 (결제 전에 처리)
      setGeneratingProgress(30)

      const res = await fetch('/api/blog/pro/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedData),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '생성 실패')
      }

      const result = await res.json()
      setGeneratingProgress(100)
      sessionStorage.removeItem('blogpro_data')

      // results 페이지로 이동
      if (result.postIds?.length) {
        router.push(`/blog/pro/results?ids=${result.postIds.join(',')}`)
        return
      }
      setDone(true)
    } catch (e: any) {
      setError(e.message || '오류가 발생했습니다')
    }
    setGenerating(false)
  }

  const addCustomCategory = () => {
    if (!newCatName.trim()) return
    const value = `custom_${Date.now()}`
    setCustomCats(prev => [...prev, { value, label: newCatName.trim(), icon: '📁' }])
    setNewCatName('')
  }

  const handleGenerate = async () => {
    if (!user) { router.push('/login'); return }
    if (totalPhotos < 1) { setError('사진을 최소 1장 업로드해주세요'); return }
    setError('')

    // 1단계: 사진 업로드
    setUploading(true)
    setStep(99)
    const uploadedByCategory: Record<string, { id: string; cdnUrl: string }[]> = {}

    try {
      for (const [cat, files] of Object.entries(categoryPhotos)) {
        if (!files.length) continue
        const fd = new FormData()
        fd.append('userId', user.id)
        fd.append('subscriptionId', '')
        for (const f of files) fd.append('files', f)
        const res = await fetch('/api/blog/pro/upload-photos', { method: 'POST', body: fd })
        const data = await res.json()
        uploadedByCategory[cat] = data.photos || []
      }

      for (const [cat, photos] of Object.entries(uploadedByCategory)) {
        for (const p of photos) {
          await fetch('/api/blog/pro/classify-photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoIds: [p.id], businessType, manualCategory: cat }),
          }).catch(() => {})
        }
      }
    } catch (e: any) {
      setError('사진 업로드 실패: ' + (e.message || ''))
      setUploading(false)
      setStep(4)
      return
    }
    setUploading(false)

    // 2단계: 바로 생성 (결제 없이)
    const generateData = {
      userId: user.id,
      businessType, shopName, shopPhone, shopAddress, shopLink, tone, email,
      postCount, photosPerPost,
      uploadedByCategory,
    }
    await startGenerationFromSaved(generateData)
  }

  if (authLoading) return <div className="flex justify-center py-20"><div className="spinner" /></div>

  return (
    <div className="max-w-[640px] mx-auto px-4 py-8 animate-in">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium mb-3" style={{ background: 'var(--mode-blog-bg)', color: 'var(--mode-blog-text)', border: '1px solid var(--mode-blog-border)' }}>
          BlogPilot 일괄
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>블로그 글 일괄 생성</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>사진만 올리면 최대 30편을 한번에 만들어 이메일로 보내드려요</p>
      </div>

      {/* 스텝 표시 */}
      {!done && !generating && !uploading && step < 99 && (
        <div className="flex gap-1 mb-8 justify-center">
          {[1,2,3,4].map(s => (
            <div key={s} className="w-10 h-1 rounded-full" style={{ background: s <= step ? 'var(--accent)' : 'var(--border-strong)' }} />
          ))}
        </div>
      )}

      {error && <div className="mb-4 rounded-lg px-4 py-3 text-[13px]" style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)' }}>{error}</div>}

      {/* 업로드/생성 중 */}
      {(generating || uploading) && (
        <div className="text-center py-16">
          <div className="spinner mx-auto mb-4" />
          <h2 className="text-[18px] font-bold mb-2" style={{ color: 'var(--text)' }}>
            {uploading ? '사진 업로드 중...' : `${postCount}편 생성 중...`}
          </h2>
          <div className="w-full max-w-[300px] mx-auto h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--surface)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${generatingProgress}%`, background: 'var(--accent)' }} />
          </div>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {uploading ? '사진을 처리하고 있습니다' : `완료되면 ${email || '이메일'}로 발송됩니다`}
          </p>
        </div>
      )}

      {/* 완료 */}
      {done && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-[20px] font-bold mb-2" style={{ color: 'var(--text)' }}>{postCount}편 생성 완료!</h2>
          <p className="text-[14px] mb-6" style={{ color: 'var(--text-muted)' }}>이메일로 발송했습니다. 메일함을 확인해주세요.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/blog/write')} className="px-6 py-3 rounded-xl font-semibold text-[14px] border" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>
              단편 작성하기
            </button>
            <button onClick={() => { setDone(false); setStep(1); setCategoryPhotos({}); setGeneratingProgress(0); setGeneratedStarted(false) }}
              className="px-6 py-3 rounded-xl font-semibold text-[14px]" style={{ background: 'var(--accent)', color: '#fff' }}>
              다시 생성하기
            </button>
          </div>
        </div>
      )}

      {/* Step 1: 업종 */}
      {step === 1 && !generating && !uploading && !done && (
        <div>
          <h2 className="text-[16px] font-bold mb-4" style={{ color: 'var(--text)' }}>어떤 가게를 운영하세요?</h2>
          <div className="grid grid-cols-3 gap-2">
            {BUSINESS_TYPES.map(bt => (
              <button key={bt.value} onClick={() => { setBusinessType(bt.value); setStep(2) }}
                className="px-3 py-4 rounded-lg border text-center transition-all hover:opacity-80"
                style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)' }}>
                <div className="text-2xl mb-1">{bt.icon}</div>
                <div className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{bt.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: 매장 정보 + 말투 */}
      {step === 2 && !generating && !uploading && !done && (
        <div className="flex flex-col gap-4">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>매장 정보</h2>
          <input className="inp" placeholder={`매장명 (예: ${ex.shopName}) *`} value={shopName} onChange={e => setShopName(e.target.value)} />
          <input className="inp" placeholder="연락처" value={shopPhone} onChange={e => setShopPhone(e.target.value)} />
          <input className="inp" placeholder="주소" value={shopAddress} onChange={e => setShopAddress(e.target.value)} />
          <input className="inp" placeholder="예약 링크" value={shopLink} onChange={e => setShopLink(e.target.value)} />

          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>말투</label>
            <div className="grid grid-cols-2 gap-2">
              {TONE_OPTIONS.map(t => (
                <button key={t.value} onClick={() => setTone(t.value)}
                  className="px-3 py-2 rounded-lg border text-left text-[12px]"
                  style={{ borderColor: tone === t.value ? 'var(--accent)' : 'var(--border-strong)', background: tone === t.value ? 'var(--accent-bg)' : 'var(--surface)', color: tone === t.value ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => { if (!shopName) { setError('매장명을 입력해주세요'); return }; setError(''); setStep(3) }}
            className="w-full py-3.5 rounded-xl font-semibold text-[15px]" style={{ background: 'var(--accent)', color: '#fff' }}>
            다음
          </button>
        </div>
      )}

      {/* Step 3: 편수 선택 */}
      {step === 3 && !generating && !uploading && !done && (
        <div className="flex flex-col gap-4">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>몇 편을 만들까요?</h2>

          <div className="grid grid-cols-3 gap-2">
            {PLANS.map(p => (
              <button key={p.value} onClick={() => setPostCount(p.value)}
                className="rounded-xl p-4 border text-center"
                style={{ borderColor: postCount === p.value ? 'var(--accent)' : 'var(--border-strong)', background: postCount === p.value ? 'var(--accent-bg)' : 'var(--surface)' }}>
                <div className="text-[20px] font-bold" style={{ color: postCount === p.value ? 'var(--accent)' : 'var(--text)' }}>{p.label}</div>
                <div className="text-[14px] font-bold mt-1" style={{ color: 'var(--text)' }}>₩{p.price.toLocaleString()}</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>편당 ₩{Math.round(p.price / p.value).toLocaleString()}</div>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>글당 사진 수</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setPhotosPerPost(n)}
                  className="w-12 h-10 rounded-lg border text-[13px] font-medium"
                  style={{ borderColor: photosPerPost === n ? 'var(--accent)' : 'var(--border-strong)', background: photosPerPost === n ? 'var(--accent)' : 'var(--surface)', color: photosPerPost === n ? '#fff' : 'var(--text-muted)' }}>
                  {n}장
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg p-3 text-[12px]" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
            {postCount}편 × {photosPerPost}장 = 최소 <strong>{neededPhotos}장</strong> 사진 필요
          </div>

          <button onClick={() => setStep(4)}
            className="w-full py-3.5 rounded-xl font-semibold text-[15px]" style={{ background: 'var(--accent)', color: '#fff' }}>
            다음 — 사진 업로드
          </button>
        </div>
      )}

      {/* Step 4: 카테고리별 사진 업로드 + 결제 */}
      {step === 4 && !generating && !uploading && !done && (
        <div className="flex flex-col gap-4">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>카테고리별 사진 업로드</h2>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>각 카테고리에 맞는 사진을 올려주세요. AI가 카테고리에 맞게 글을 작성합니다.</p>

          {cats.map(c => {
            const files = categoryPhotos[c.value] || []
            return (
              <div key={c.value} className="rounded-xl p-4 border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{c.icon} {c.label}</span>
                  <span className="text-[12px] font-bold" style={{ color: files.length > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>{files.length}장</span>
                </div>

                {files.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2">
                    {files.map((f, i) => (
                      <div key={i} className="relative flex-shrink-0">
                        <img src={URL.createObjectURL(f)} className="w-14 h-14 object-cover rounded-md border" style={{ borderColor: 'var(--border)' }} alt="" />
                        <button onClick={() => removePhoto(c.value, i)}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center"
                          style={{ background: 'var(--error-text)', color: '#fff' }}>X</button>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => fileRefs.current[c.value]?.click()}
                  className="w-full py-2 rounded-lg border border-dashed text-[12px] font-medium"
                  style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}>
                  + 사진 추가
                </button>
                <input ref={el => { fileRefs.current[c.value] = el }} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => addPhotos(c.value, e.target.files)} />
              </div>
            )
          })}

          {/* 커스텀 카테고리 추가 */}
          <div className="flex gap-2">
            <input className="inp flex-1" placeholder="카테고리 직접 추가 (예: 이벤트, 시즌 메뉴)" value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCustomCategory() }} />
            <button onClick={addCustomCategory} disabled={!newCatName.trim()}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap"
              style={{ background: 'var(--accent)', color: '#fff', opacity: !newCatName.trim() ? 0.5 : 1 }}>
              + 추가
            </button>
          </div>

          {/* 현황 */}
          <div className="rounded-xl p-4 border" style={{ borderColor: totalPhotos > 0 ? 'var(--accent-border)' : 'var(--error-border)', background: totalPhotos > 0 ? 'var(--accent-bg)' : 'var(--error-bg)' }}>
            <div className="text-[13px] font-bold" style={{ color: totalPhotos > 0 ? 'var(--accent)' : 'var(--error-text)' }}>
              총 {totalPhotos}장 → {Math.max(1, Math.floor(totalPhotos / photosPerPost))}편 생성 가능
            </div>
            {totalPhotos < neededPhotos && totalPhotos > 0 && (
              <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                사진이 부족하면 자동 재활용됩니다
              </div>
            )}
          </div>

          {/* 생성 */}
          <button onClick={handleGenerate} disabled={totalPhotos < 1}
            className="w-full py-3.5 rounded-xl font-semibold text-[15px]"
            style={{ background: 'var(--accent)', color: '#fff', opacity: totalPhotos < 1 ? 0.5 : 1 }}>
            {postCount}편 미리보기 생성하기 (무료)
          </button>
          <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>생성 후 확인 → 결제 → 복사/이메일 이용 가능</p>

          <button onClick={() => setStep(3)} className="w-full py-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>이전으로</button>
        </div>
      )}
    </div>
  )
}
