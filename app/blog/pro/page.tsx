'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { BUSINESS_TYPES, TONE_OPTIONS, BUSINESS_EXAMPLES } from '@/lib/blog-prompts'
import { PHOTO_CATEGORIES } from '@/lib/blog-pro-categories'

const PLANS = [
  { value: 'monthly', label: '1개월', price: 29900, monthly: 29900, posts: 12, discount: '' },
  { value: 'semi_annual', label: '6개월', price: 149000, monthly: 24833, posts: 72, discount: '17% 할인' },
  { value: 'annual', label: '연간', price: 249000, monthly: 20750, posts: 144, discount: '31% 할인' },
]

const DAYS = [
  { value: 1, label: '월' }, { value: 2, label: '화' }, { value: 3, label: '수' },
  { value: 4, label: '목' }, { value: 5, label: '금' }, { value: 6, label: '토' }, { value: 7, label: '일' },
]

export default function BlogProOnboarding() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [businessType, setBusinessType] = useState('')
  const [shopName, setShopName] = useState('')
  const [shopPhone, setShopPhone] = useState('')
  const [shopAddress, setShopAddress] = useState('')
  const [shopLink, setShopLink] = useState('')
  const [tone, setTone] = useState('friendly')
  const [deliveryEmail, setDeliveryEmail] = useState('')
  const [scheduleDays, setScheduleDays] = useState([2, 4, 6])
  const [planType, setPlanType] = useState('monthly')

  const [photos, setPhotos] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedPhotos, setUploadedPhotos] = useState<{ id: string; cdnUrl: string }[]>([])
  const [subscriptionId, setSubscriptionId] = useState('')

  const [classifying, setClassifying] = useState(false)
  const [classifyResult, setClassifyResult] = useState<Record<string, number>>({})
  const [classifyDetails, setClassifyDetails] = useState<{ id: string; cdn_url: string; category: string; description: string; person_hint: string }[]>([])
  const [totalAvailPosts, setTotalAvailPosts] = useState(0)

  const [previewPosts, setPreviewPosts] = useState<any[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  if (authLoading) return <div className="flex justify-center py-20"><div className="spinner" /></div>
  if (!user) { router.push('/login'); return null }

  const ex = BUSINESS_EXAMPLES[businessType] || BUSINESS_EXAMPLES.other
  const cats = PHOTO_CATEGORIES[businessType] || PHOTO_CATEGORIES.other

  const addPhotos = (files: FileList | null) => {
    if (!files) return
    setPhotos(prev => [...prev, ...Array.from(files)])
  }

  const handleOnboard = async () => {
    setProcessing(true); setError('')
    try {
      const res = await fetch('/api/blog/pro/onboard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, businessType, shopName, shopPhone, shopAddress, shopLink, tone, deliveryEmail: deliveryEmail || user.email, scheduleDays, planType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSubscriptionId(data.subscriptionId)
      setStep(3)
    } catch (e: any) { setError(e.message) }
    setProcessing(false)
  }

  const handleUpload = async () => {
    if (!photos.length) return
    setUploading(true); setUploadProgress(0)
    const results: { id: string; cdnUrl: string }[] = []
    const batchSize = 5
    for (let i = 0; i < photos.length; i += batchSize) {
      const batch = photos.slice(i, i + batchSize)
      const fd = new FormData()
      fd.append('userId', user.id)
      fd.append('subscriptionId', subscriptionId)
      for (const f of batch) fd.append('files', f)
      const res = await fetch('/api/blog/pro/upload-photos', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.photos) results.push(...data.photos)
      setUploadProgress(Math.min(100, Math.round(((i + batchSize) / photos.length) * 100)))
    }
    setUploadedPhotos(results)
    setUploading(false)
    setStep(4)
  }

  const handleClassify = async () => {
    setClassifying(true)
    try {
      const res = await fetch('/api/blog/pro/classify-photos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: uploadedPhotos.map(p => p.id), businessType }),
      })
      const data = await res.json()
      if (data.summary) {
        setClassifyResult(data.summary)
        const total = Object.values(data.summary as Record<string, number>).reduce((a, b) => a + b, 0)
        setTotalAvailPosts(Math.floor(total / 3))
      }
      if (data.results) setClassifyDetails(data.results)
      setStep(5)
    } catch (e: any) { setError(e.message) }
    setClassifying(false)
  }

  const handlePreview = async () => {
    setPreviewLoading(true)
    try {
      const res = await fetch('/api/blog/pro/preview-posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, businessType, shopName, tone, shopPhone, shopAddress, shopLink }),
      })
      const data = await res.json()
      setPreviewPosts(data.posts || [])
      setStep(6)
    } catch (e: any) { setError(e.message) }
    setPreviewLoading(false)
  }

  const handlePayment = async () => {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_BILLING_CK || ''
    if (!clientKey) {
      // 시뮬레이션: 바로 활성화
      setStep(8); return
    }
    try {
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk')
      const tossPayments = await loadTossPayments(clientKey)
      const payment = tossPayments.payment({ customerKey: user.id })
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: PLANS.find(p => p.value === planType)!.price },
        orderId: `blogpro-${user.id.substring(0, 8)}-${Date.now()}`,
        orderName: `BlogPilot Pro ${PLANS.find(p => p.value === planType)!.label}`,
        successUrl: `${appUrl}/api/blog/pro/subscribe?subscriptionId=${subscriptionId}`,
        failUrl: `${appUrl}/blog/pro?error=payment_failed`,
      })
    } catch (e: any) {
      if (e?.code !== 'USER_CANCEL') setError('결제 오류: ' + (e?.message || ''))
    }
  }

  const toggleDay = (d: number) => {
    setScheduleDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 py-8 animate-in">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium mb-3" style={{ background: 'var(--mode-blog-bg)', color: 'var(--mode-blog-text)', border: '1px solid var(--mode-blog-border)' }}>
          BlogPilot Pro
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>블로그 정기 포스팅</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>사진만 올려두면 주 3회 자동으로 블로그 글을 써드립니다</p>
      </div>

      {/* 스텝 표시 */}
      <div className="flex gap-1 mb-8 justify-center">
        {[1,2,3,4,5,6,7,8].map(s => (
          <div key={s} className="w-8 h-1 rounded-full" style={{ background: s <= step ? 'var(--accent)' : 'var(--border-strong)' }} />
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg px-4 py-3 text-[13px]" style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)' }}>{error}</div>}

      {/* Step 1: 업종 선택 */}
      {step === 1 && (
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

      {/* Step 2: 매장 정보 + 말투 + 플랜 */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>매장 정보를 알려주세요</h2>
          <input className="inp" placeholder={`매장명 (예: ${ex.shopName}) *`} value={shopName} onChange={e => setShopName(e.target.value)} />
          <input className="inp" placeholder="연락처" value={shopPhone} onChange={e => setShopPhone(e.target.value)} />
          <input className="inp" placeholder="주소" value={shopAddress} onChange={e => setShopAddress(e.target.value)} />
          <input className="inp" placeholder="예약 링크" value={shopLink} onChange={e => setShopLink(e.target.value)} />
          <input className="inp" placeholder="글 수신 이메일" value={deliveryEmail} onChange={e => setDeliveryEmail(e.target.value)} />

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

          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>발행 요일</label>
            <div className="flex gap-2">
              {DAYS.map(d => (
                <button key={d.value} onClick={() => toggleDay(d.value)}
                  className="w-10 h-10 rounded-full text-[13px] font-medium border"
                  style={{ borderColor: scheduleDays.includes(d.value) ? 'var(--accent)' : 'var(--border-strong)', background: scheduleDays.includes(d.value) ? 'var(--accent)' : 'var(--surface)', color: scheduleDays.includes(d.value) ? '#fff' : 'var(--text-muted)' }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>구독 플랜</label>
            <div className="flex flex-col gap-2">
              {PLANS.map(p => (
                <button key={p.value} onClick={() => setPlanType(p.value)}
                  className="flex items-center justify-between px-4 py-3 rounded-lg border"
                  style={{ borderColor: planType === p.value ? 'var(--accent)' : 'var(--border-strong)', background: planType === p.value ? 'var(--accent-bg)' : 'var(--surface)' }}>
                  <div>
                    <span className="text-[14px] font-semibold" style={{ color: planType === p.value ? 'var(--accent)' : 'var(--text)' }}>{p.label}</span>
                    {p.discount && <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'var(--accent)', color: '#fff' }}>{p.discount}</span>}
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>₩{p.price.toLocaleString()}</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>월 ₩{p.monthly.toLocaleString()} · {p.posts}편</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleOnboard} disabled={!shopName || processing}
            className="w-full py-3.5 rounded-xl font-semibold text-[15px]"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            {processing ? '저장 중...' : '다음 — 사진 업로드'}
          </button>
        </div>
      )}

      {/* Step 3: 사진 업로드 */}
      {step === 3 && (
        <div>
          <h2 className="text-[16px] font-bold mb-2" style={{ color: 'var(--text)' }}>가게 사진을 올려주세요</h2>
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>매장 사진, 시술 사진, 메뉴 사진 등 가리지 말고 다 올려주세요! (최소 30장 권장)</p>

          <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer mb-4"
            style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)' }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); addPhotos(e.dataTransfer.files) }}>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addPhotos(e.target.files)} />
            <div className="text-3xl mb-2">📷</div>
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>클릭하거나 여기에 끌어다 놓으세요</p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--accent)' }}>{photos.length}장 선택됨</p>
          </div>

          {uploading && (
            <div className="mb-4">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: 'var(--accent)' }} />
              </div>
              <p className="text-[12px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>업로드 중... {uploadProgress}%</p>
            </div>
          )}

          <button onClick={handleUpload} disabled={!photos.length || uploading}
            className="w-full py-3.5 rounded-xl font-semibold text-[15px]"
            style={{ background: photos.length >= 30 ? 'var(--accent)' : 'var(--accent)', color: '#fff', opacity: !photos.length ? 0.5 : 1 }}>
            {uploading ? '업로드 중...' : `${photos.length}장 업로드하기`}
          </button>
        </div>
      )}

      {/* Step 4: AI 분류 */}
      {step === 4 && (
        <div>
          <h2 className="text-[16px] font-bold mb-2" style={{ color: 'var(--text)' }}>사진을 AI가 자동 분류합니다</h2>
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>총 {uploadedPhotos.length}장 업로드 완료. AI가 카테고리별로 자동 정리합니다.</p>

          {classifying ? (
            <div className="text-center py-10"><div className="spinner mx-auto mb-3" /><p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>사진 분류 중... (사진이 많으면 1~2분 소요)</p></div>
          ) : (
            <button onClick={handleClassify}
              className="w-full py-3.5 rounded-xl font-semibold text-[15px]"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              AI 자동 분류 시작
            </button>
          )}
        </div>
      )}

      {/* Step 5: 분류 결과 + 카테고리별 사진 그리드 */}
      {step === 5 && (
        <div>
          <h2 className="text-[16px] font-bold mb-2" style={{ color: 'var(--text)' }}>사진 분류 완료!</h2>
          <div className="rounded-xl p-4 mb-4 text-center" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
            <div className="text-[14px] font-bold" style={{ color: 'var(--accent)' }}>총 {classifyDetails.length}장 → 약 {totalAvailPosts}회분 발행 가능</div>
            <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>주 3회 기준 약 {Math.ceil(totalAvailPosts / 3)}주</div>
          </div>

          {/* 카테고리별 사진 그리드 */}
          <div className="flex flex-col gap-4 mb-4">
            {cats.map(c => {
              const catPhotos = classifyDetails.filter(p => p.category === c.value)
              if (catPhotos.length === 0) return null
              // 미용실: person_hint로 그룹핑
              const groups = businessType === 'hair_salon' && (c.value === 'procedure_result' || c.value === 'before_after')
                ? Object.entries(catPhotos.reduce((acc, p) => {
                    const key = p.person_hint || '기타'
                    if (!acc[key]) acc[key] = []
                    acc[key].push(p)
                    return acc
                  }, {} as Record<string, typeof catPhotos>))
                : null

              return (
                <div key={c.value} className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{c.icon} {c.label}</span>
                    <span className="text-[12px] font-bold" style={{ color: 'var(--accent)' }}>{catPhotos.length}장</span>
                  </div>
                  {groups ? (
                    // 미용실: 시술별 그룹핑
                    <div className="flex flex-col gap-2">
                      {groups.map(([hint, photos], gi) => (
                        <div key={gi}>
                          <div className="text-[11px] mb-1 px-1" style={{ color: 'var(--text-muted)' }}>{hint}</div>
                          <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {photos.map(p => (
                              <img key={p.id} src={p.cdn_url} className="w-16 h-16 object-cover rounded-md flex-shrink-0 border" style={{ borderColor: 'var(--border)' }} alt="" />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {catPhotos.map(p => (
                        <img key={p.id} src={p.cdn_url} className="w-16 h-16 object-cover rounded-md flex-shrink-0 border" style={{ borderColor: 'var(--border)' }} alt="" />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button onClick={() => setStep(6)} className="w-full py-3.5 rounded-xl font-semibold text-[15px]" style={{ background: 'var(--accent)', color: '#fff' }}>
            맞아요! 미리보기 보기
          </button>
        </div>
      )}

      {/* Step 6: 미리보기 (세로 블로그 스타일) */}
      {step === 6 && (
        <div>
          <h2 className="text-[16px] font-bold mb-4" style={{ color: 'var(--text)' }}>1주일치 미리보기</h2>
          {previewPosts.length === 0 ? (
            previewLoading ? (
              <div className="text-center py-10"><div className="spinner mx-auto mb-3" /><p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>3편 미리 생성 중... (약 1분)</p></div>
            ) : (
              <button onClick={handlePreview} className="w-full py-3.5 rounded-xl font-semibold text-[15px]" style={{ background: 'var(--accent)', color: '#fff' }}>
                미리보기 생성하기
              </button>
            )
          ) : (
            <>
              <div className="flex flex-col gap-6 mb-4">
                {previewPosts.map((p, i) => (
                  <div key={i} className="rounded-2xl border overflow-hidden relative" style={{ background: '#fff', borderColor: 'var(--border)' }}>
                    {/* 상단 바: 요일 + 카테고리 */}
                    <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: '#eee' }}>
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold" style={{ background: 'var(--accent)', color: '#fff' }}>
                        {['화', '목', '토'][i]}요일
                      </span>
                      {p.categories?.map((c: string, ci: number) => {
                        const cat = cats.find(cc => cc.value === c)
                        return cat ? (
                          <span key={ci} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                            {cat.icon} {cat.label}
                          </span>
                        ) : null
                      })}
                    </div>

                    {/* 글 내용 (세로 블로그 스타일) */}
                    <div className="px-5 py-5">
                      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#333', marginBottom: '16px', lineHeight: 1.4 }}>
                        {p.title}
                      </h3>
                      <div
                        dangerouslySetInnerHTML={{ __html: p.bodyHtml }}
                        style={{ color: '#333', lineHeight: 1.8 }}
                        onCopy={e => e.preventDefault()}
                      />
                      {/* 해시태그 */}
                      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                        {p.hashtags.map((t: string, j: number) => (
                          <span key={j} style={{ display: 'inline-block', margin: '2px 4px', color: '#2b7de9', fontSize: '13px' }}>#{t}</span>
                        ))}
                      </div>
                    </div>

                    {/* 워터마크 */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ color: 'rgba(0,0,0,0.04)', fontSize: '60px', fontWeight: 900, transform: 'rotate(-25deg)' }}>PREVIEW</div>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-center mb-4" style={{ color: 'var(--text-muted)' }}>전체 내용은 구독 후 확인하실 수 있어요</p>
              <button onClick={() => setStep(7)} className="w-full py-3.5 rounded-xl font-semibold text-[15px]" style={{ background: 'var(--accent)', color: '#fff' }}>
                구독하기
              </button>
            </>
          )}
        </div>
      )}

      {/* Step 7: 결제 */}
      {step === 7 && (
        <div>
          <h2 className="text-[16px] font-bold mb-4" style={{ color: 'var(--text)' }}>구독 결제</h2>
          <div className="rounded-xl p-5 border mb-4" style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-bg)' }}>
            <div className="text-[14px] font-bold" style={{ color: 'var(--accent)' }}>{PLANS.find(p => p.value === planType)?.label} 플랜</div>
            <div className="text-[20px] font-bold mt-1" style={{ color: 'var(--text)' }}>₩{(PLANS.find(p => p.value === planType)?.price || 0).toLocaleString()}</div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>주 {scheduleDays.length}회 · 총 {PLANS.find(p => p.value === planType)?.posts}편</div>
          </div>
          <button onClick={handlePayment} className="w-full py-3.5 rounded-xl font-semibold text-[15px]" style={{ background: 'var(--accent)', color: '#fff' }}>
            결제하기
          </button>
          <button onClick={() => setStep(6)} className="w-full py-2 mt-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>이전으로</button>
        </div>
      )}

      {/* Step 8: 완료 */}
      {step === 8 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-[20px] font-bold mb-2" style={{ color: 'var(--text)' }}>구독 완료!</h2>
          <p className="text-[14px] mb-6" style={{ color: 'var(--text-muted)' }}>이제 매주 자동으로 블로그 글을 써드립니다</p>
          <button onClick={() => router.push('/blog/pro/dashboard')}
            className="px-8 py-3 rounded-xl font-semibold text-[15px]"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            대시보드로 이동
          </button>
        </div>
      )}
    </div>
  )
}
