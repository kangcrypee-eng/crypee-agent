'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { BUSINESS_TYPES, TONE_OPTIONS, BUSINESS_EXAMPLES } from '@/lib/blog-prompts'
import { PHOTO_CATEGORIES } from '@/lib/blog-pro-categories'

const PLANS = [
  { value: 12, label: '12편', price: 9900 },
  { value: 24, label: '24편', price: 17900 },
  { value: 30, label: '30편', price: 19900 },
]

export default function BlogProPage() {
  const router = useRouter()
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

  if (authLoading) return <div className="flex justify-center py-20"><div className="spinner" /></div>
  if (!user) { router.push('/login'); return null }

  const ex = BUSINESS_EXAMPLES[businessType] || BUSINESS_EXAMPLES.other
  const cats = PHOTO_CATEGORIES[businessType] || PHOTO_CATEGORIES.other
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

  const handleGenerate = async () => {
    if (!email) { setError('수신 이메일을 입력해주세요'); return }
    if (totalPhotos < photosPerPost) { setError(`최소 ${photosPerPost}장의 사진이 필요합니다`); return }

    setError('')

    // 결제
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CK || ''
    if (clientKey) {
      try {
        const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk')
        const tossPayments = await loadTossPayments(clientKey)
        const payment = tossPayments.payment({ customerKey: user.id })
        const orderId = `blogbulk-${user.id.substring(0, 8)}-${Date.now()}`
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

        // 결제 성공 후 돌아올 URL에 파라미터 인코딩
        const params = encodeURIComponent(JSON.stringify({
          businessType, shopName, shopPhone, shopAddress, shopLink, tone, email,
          postCount, photosPerPost,
        }))

        await payment.requestPayment({
          method: 'CARD',
          amount: { currency: 'KRW', value: selectedPlan.price },
          orderId,
          orderName: `BlogPilot 일괄 ${postCount}편`,
          successUrl: `${appUrl}/blog/pro?paid=true&params=${params}`,
          failUrl: `${appUrl}/blog/pro?step=4&payFail=true`,
        })
        return // 결제 페이지로 이동
      } catch (e: any) {
        if (e?.code === 'USER_CANCEL') return
        setError('결제 오류: ' + (e?.message || ''))
        return
      }
    }

    // 토스 미설정 → 바로 생성
    await startGeneration()
  }

  const startGeneration = async () => {
    setGenerating(true)
    setGeneratingProgress(0)

    try {
      // 1. 사진 업로드
      setGeneratingProgress(5)
      const uploadedByCategory: Record<string, { id: string; cdnUrl: string }[]> = {}

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
      setGeneratingProgress(20)

      // 2. 사진 분류 (이미 카테고리별로 업로드했으니 카테고리 직접 설정)
      const allPhotoIds: string[] = []
      for (const [cat, photos] of Object.entries(uploadedByCategory)) {
        for (const p of photos) {
          allPhotoIds.push(p.id)
          // 카테고리 직접 업데이트 (사용자가 이미 분류함)
          await fetch('/api/blog/pro/classify-photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoIds: [p.id], businessType, manualCategory: cat }),
          }).catch(() => {})
        }
      }
      setGeneratingProgress(30)

      // 3. 글 일괄 생성
      const res = await fetch('/api/blog/pro/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          businessType, shopName, shopPhone, shopAddress, shopLink, tone, email,
          postCount, photosPerPost,
          uploadedByCategory,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '생성 실패')
      }

      setGeneratingProgress(100)
      setDone(true)
    } catch (e: any) {
      setError(e.message || '오류가 발생했습니다')
    }
    setGenerating(false)
  }

  // 결제 성공 후 돌아왔을 때
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('paid') === 'true' && !generating && !done) {
      // 결제 성공 → 생성 시작 (한번만)
      const paramsStr = urlParams.get('params')
      if (paramsStr && step !== 99) {
        setStep(99) // 중복 방지
        startGeneration()
      }
    }
  }

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
      {!done && !generating && (
        <div className="flex gap-1 mb-8 justify-center">
          {[1,2,3,4].map(s => (
            <div key={s} className="w-10 h-1 rounded-full" style={{ background: s <= step ? 'var(--accent)' : 'var(--border-strong)' }} />
          ))}
        </div>
      )}

      {error && <div className="mb-4 rounded-lg px-4 py-3 text-[13px]" style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)' }}>{error}</div>}

      {/* 생성 중 */}
      {generating && (
        <div className="text-center py-16">
          <div className="spinner mx-auto mb-4" />
          <h2 className="text-[18px] font-bold mb-2" style={{ color: 'var(--text)' }}>{postCount}편 생성 중...</h2>
          <div className="w-full max-w-[300px] mx-auto h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--surface)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${generatingProgress}%`, background: 'var(--accent)' }} />
          </div>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>완료되면 {email}로 발송됩니다</p>
        </div>
      )}

      {/* 완료 */}
      {done && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-[20px] font-bold mb-2" style={{ color: 'var(--text)' }}>{postCount}편 생성 완료!</h2>
          <p className="text-[14px] mb-6" style={{ color: 'var(--text-muted)' }}>{email}로 발송했습니다. 메일함을 확인해주세요.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/blog/write')} className="px-6 py-3 rounded-xl font-semibold text-[14px] border" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>
              단편 작성하기
            </button>
            <button onClick={() => { setDone(false); setStep(1); setCategoryPhotos({}); setGeneratingProgress(0) }}
              className="px-6 py-3 rounded-xl font-semibold text-[14px]" style={{ background: 'var(--accent)', color: '#fff' }}>
              다시 생성하기
            </button>
          </div>
        </div>
      )}

      {/* Step 1: 업종 */}
      {step === 1 && !generating && !done && (
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
      {step === 2 && !generating && !done && (
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
      {step === 3 && !generating && !done && (
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
      {step === 4 && !generating && !done && (
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

                {/* 사진 미리보기 */}
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
                  📷 사진 추가
                </button>
                <input ref={el => { fileRefs.current[c.value] = el }} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => addPhotos(c.value, e.target.files)} />
              </div>
            )
          })}

          {/* 현황 */}
          <div className="rounded-xl p-4 border" style={{ borderColor: totalPhotos >= photosPerPost ? 'var(--accent-border)' : 'var(--error-border)', background: totalPhotos >= photosPerPost ? 'var(--accent-bg)' : 'var(--error-bg)' }}>
            <div className="text-[13px] font-bold" style={{ color: totalPhotos >= photosPerPost ? 'var(--accent)' : 'var(--error-text)' }}>
              총 {totalPhotos}장 업로드 → {Math.floor(totalPhotos / photosPerPost)}편 생성 가능
            </div>
            {totalPhotos < neededPhotos && (
              <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {postCount}편 모두 만들려면 {neededPhotos - totalPhotos}장 더 필요
              </div>
            )}
          </div>

          {/* 이메일 */}
          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>수신 이메일 *</label>
            <input className="inp" type="email" placeholder="완성된 글을 받을 이메일" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          {/* 결제 + 생성 */}
          <button onClick={handleGenerate} disabled={totalPhotos < photosPerPost || !email}
            className="w-full py-3.5 rounded-xl font-semibold text-[15px]"
            style={{ background: 'var(--accent)', color: '#fff', opacity: (totalPhotos < photosPerPost || !email) ? 0.5 : 1 }}>
            ₩{selectedPlan.price.toLocaleString()} 결제하고 {postCount}편 생성하기
          </button>
        </div>
      )}
    </div>
  )
}
