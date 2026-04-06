'use client'
import { useEffect, useState, useRef, Suspense } from 'react'

const loadTossV1Script = (): Promise<void> => new Promise((resolve, reject) => {
  if ((window as any).TossPayments) { resolve(); return }
  const s = document.createElement('script')
  s.src = 'https://js.tosspayments.com/v1/payment'
  s.onload = () => resolve()
  s.onerror = () => reject(new Error('결제 스크립트 로드 실패'))
  document.head.appendChild(s)
})
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

interface Post {
  id: string
  generated_title: string
  generated_body_html: string
  generated_hashtags: string[]
  topic: string
  created_at: string
}

export default function ResultsWrapper() {
  return <Suspense fallback={<div className="flex justify-center py-20"><div className="spinner" /></div>}><ResultsPage /></Suspense>
}

function ResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailAddr, setEmailAddr] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [paid, setPaid] = useState(false)
  const [paying, setPaying] = useState(false)
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const postIds = searchParams.get('ids')?.split(',') || []
  const isPurchased = searchParams.get('purchased') === 'true'

  useEffect(() => {
    if (!supabase || !postIds.length) { setLoading(false); return }
    (async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .in('id', postIds)
        .order('created_at', { ascending: true })
      if (data) {
        setPosts(data as Post[])
        // 하나라도 paid면 전체 paid
        if ((data as any[]).some(p => p.paid) || isPurchased) setPaid(true)
      }
      setLoading(false)
    })()
  }, [])

  const handlePayment = async () => {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CK || ''
    if (!clientKey) {
      // 토스 미설정 → 바로 해제
      if (supabase) {
        for (const p of posts) await supabase.from('blog_posts').update({ paid: true }).eq('id', p.id)
      }
      setPaid(true)
      return
    }
    setPaying(true)
    try {
      await loadTossV1Script()
      const tossPayments = (window as any).TossPayments(clientKey)
      const orderId = `blogbulk-${user!.id.substring(0, 8)}-${Date.now()}`
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const count = posts.length
      const price = count <= 12 ? 9900 : count <= 24 ? 19900 : 29900

      await tossPayments.requestPayment('카드', {
        amount: price,
        orderId,
        orderName: `BlogPilot ${count}편`,
        successUrl: `${appUrl}/api/blog/pro/payment-bulk?postIds=${postIds.join(',')}&returnUrl=${encodeURIComponent(`/blog/pro/results?ids=${postIds.join(',')}&purchased=true`)}`,
        failUrl: `${appUrl}/blog/pro/results?ids=${postIds.join(',')}&payFail=true`,
      })
    } catch (e: any) {
      if (e?.code !== 'USER_CANCEL') alert('결제 오류: ' + (e?.message || ''))
    }
    setPaying(false)
  }

  const handleCopy = async (post: Post) => {
    const el = contentRefs.current[post.id]
    if (!el) return
    try {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(el)
      selection?.removeAllRanges()
      selection?.addRange(range)
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([el.innerHTML], { type: 'text/html' }),
          'text/plain': new Blob([el.innerText], { type: 'text/plain' }),
        }),
      ])
      selection?.removeAllRanges()
    } catch {
      document.execCommand('copy')
    }
    setCopied(post.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const startEdit = (post: Post) => {
    setEditingId(post.id)
    setEditTitle(post.generated_title)
    // HTML → 텍스트 변환 (편집용)
    const div = document.createElement('div')
    div.innerHTML = post.generated_body_html
    setEditBody(div.innerText)
  }

  const saveEdit = async () => {
    if (!editingId || !supabase) return
    setSaving(true)
    // 텍스트 → 간단 HTML 변환
    const htmlBody = editBody.split('\n\n').map(p => {
      p = p.trim()
      if (!p) return ''
      return `<p style="font-size:16px;line-height:1.8;color:#333;margin:0 0 16px">${p.replace(/\n/g, '<br>')}</p>`
    }).join('\n')

    await supabase.from('blog_posts').update({
      generated_title: editTitle,
      generated_body_html: htmlBody,
    }).eq('id', editingId)

    setPosts(prev => prev.map(p => p.id === editingId ? { ...p, generated_title: editTitle, generated_body_html: htmlBody } : p))
    setEditingId(null)
    setSaving(false)
  }

  const handleEmailAll = async () => {
    if (!emailAddr || !posts.length) return
    setEmailSending(true)
    try {
      const res = await fetch('/api/blog/pro/send-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddr, postIds: posts.map(p => p.id) }),
      })
      if (res.ok) {
        setEmailSent(true)
        setTimeout(() => { setShowEmailModal(false); setEmailSent(false) }, 2000)
      }
    } catch {}
    setEmailSending(false)
  }

  if (authLoading || loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>
  if (!posts.length) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>생성된 글이 없습니다</div>

  return (
    <div className="max-w-[720px] mx-auto px-4 py-8 animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>생성 완료 — {posts.length}편</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>각 글을 확인하고 수정 · 복사 · 이메일 발송하세요</p>
        </div>
        {paid ? (
          <button onClick={() => setShowEmailModal(true)}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            전체 이메일 발송
          </button>
        ) : (
          <button onClick={handlePayment} disabled={paying}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            {paying ? '결제 중...' : `₩${(posts.length <= 12 ? 9900 : posts.length <= 24 ? 19900 : 29900).toLocaleString()} 결제하기`}
          </button>
        )}
      </div>

      {/* 글 목록 */}
      <div className="flex flex-col gap-4">
        {posts.map((post, i) => (
          <div key={post.id} className="rounded-2xl border overflow-hidden" style={{ background: '#fff', borderColor: 'var(--border)' }}>
            {/* 헤더 — 클릭하면 펼침 */}
            <button
              onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
              className="w-full px-5 py-4 flex items-center justify-between text-left"
              style={{ background: expandedId === post.id ? 'var(--accent-bg)' : 'transparent' }}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: 'var(--accent)', color: '#fff' }}>{i + 1}</span>
                <div>
                  <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{post.generated_title}</div>
                </div>
              </div>
              <span className="text-[16px]" style={{ color: 'var(--text-muted)' }}>{expandedId === post.id ? '▲' : '▼'}</span>
            </button>

            {/* 펼쳐진 내용 */}
            {expandedId === post.id && (
              <div>
                {editingId === post.id ? (
                  /* 수정 모드 — 결제 후에만 접근 가능 */
                  <div className="px-5 py-4 border-t" style={{ borderColor: '#eee' }}>
                    <input className="inp mb-3 text-[16px] font-bold" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                    <textarea className="inp" rows={15} value={editBody} onChange={e => setEditBody(e.target.value)} style={{ resize: 'vertical', fontSize: '14px', lineHeight: '1.8' }} />
                    <div className="flex gap-2 mt-3">
                      <button onClick={saveEdit} disabled={saving}
                        className="px-4 py-2 rounded-lg text-[13px] font-semibold"
                        style={{ background: 'var(--accent)', color: '#fff' }}>
                        {saving ? '저장 중...' : '저장'}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-lg text-[13px] border"
                        style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}>
                        취소
                      </button>
                    </div>
                  </div>
                ) : paid ? (
                  /* 결제 완료 — 전체 내용 */
                  <>
                    <div ref={el => { contentRefs.current[post.id] = el }} className="px-5 py-5 border-t" style={{ borderColor: '#eee' }}>
                      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#333', marginBottom: '20px', lineHeight: 1.4 }}>
                        {post.generated_title}
                      </h2>
                      <div dangerouslySetInnerHTML={{ __html: post.generated_body_html }} style={{ color: '#333', lineHeight: 1.8 }} />
                      {post.generated_hashtags?.length > 0 && (
                        <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #eee' }}>
                          {post.generated_hashtags.map((tag, j) => (
                            <span key={j} style={{ display: 'inline-block', margin: '2px 4px', color: '#2b7de9', fontSize: '14px' }}>#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="px-5 py-3 border-t flex gap-2" style={{ borderColor: '#eee' }}>
                      <button onClick={() => handleCopy(post)}
                        className="px-4 py-2 rounded-lg text-[12px] font-semibold"
                        style={{ background: 'var(--accent)', color: '#fff' }}>
                        {copied === post.id ? '복사 완료!' : '글+이미지 복사'}
                      </button>
                      <button onClick={() => startEdit(post)}
                        className="px-4 py-2 rounded-lg text-[12px] font-medium border"
                        style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>
                        수정
                      </button>
                    </div>
                  </>
                ) : (
                  /* 결제 전 — 상단 일부 노출, 나머지 블러 */
                  <div className="border-t" style={{ borderColor: '#eee' }}>
                    {/* 상단 ~120px: 선명하게 */}
                    <div className="px-5 pt-5 pointer-events-none select-none overflow-hidden" style={{ maxHeight: '120px' }}>
                      <div dangerouslySetInnerHTML={{ __html: post.generated_body_html }} style={{ color: '#333', lineHeight: 1.8, fontSize: '14px' }} />
                    </div>
                    {/* 하단: 블러 + 페이드 */}
                    <div className="relative overflow-hidden pointer-events-none select-none" style={{ maxHeight: '100px' }}>
                      <div className="px-5 pb-5" style={{ filter: 'blur(4px)', opacity: 0.6 }}>
                        <div dangerouslySetInnerHTML={{ __html: post.generated_body_html }} style={{ color: '#333', lineHeight: 1.8, fontSize: '14px' }} />
                      </div>
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 0%, rgba(255,255,255,0.98) 80%)' }} />
                    </div>
                    <div className="px-5 pb-4 text-center">
                      <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>결제 후 전체 내용을 확인할 수 있습니다</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 하단 */}
      <div className="mt-6 flex gap-3">
        <button onClick={() => router.push('/blog/pro')}
          className="flex-1 py-3 rounded-xl font-semibold text-[13px] border"
          style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>
          추가 생성하기
        </button>
        <button onClick={() => router.push('/blog/write')}
          className="flex-1 py-3 rounded-xl font-semibold text-[13px] border"
          style={{ borderColor: 'var(--accent-border)', color: 'var(--accent)' }}>
          단편 작성하기
        </button>
      </div>

      {/* 이메일 모달 */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-[90%] max-w-[400px]" style={{ background: 'var(--bg)' }}>
            <h3 className="text-[16px] font-bold mb-2" style={{ color: 'var(--text)' }}>전체 이메일 발송</h3>
            <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>{posts.length}편을 이메일 1통으로 보내드립니다</p>
            <input className="inp mb-4" type="email" placeholder="수신 이메일" value={emailAddr} onChange={e => setEmailAddr(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => setShowEmailModal(false)}
                className="flex-1 py-2.5 rounded-lg text-[13px] border"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}>취소</button>
              <button onClick={handleEmailAll} disabled={emailSending || !emailAddr}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                {emailSent ? '발송 완료!' : emailSending ? '발송 중...' : '발송'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
