'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const loadTossV1Script = (): Promise<void> => new Promise((resolve, reject) => {
  if ((window as any).TossPayments) { resolve(); return }
  const s = document.createElement('script')
  s.src = 'https://js.tosspayments.com/v1/payment'
  s.onload = () => resolve()
  s.onerror = () => reject(new Error('결제 스크립트 로드 실패'))
  document.head.appendChild(s)
})

interface BlogPost {
  id: string
  business_type: string
  topic: string
  brief_content: string
  generated_title: string
  generated_body_html: string
  generated_hashtags: string[]
  paid: boolean
  created_at: string
}

export default function BlogPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [paying, setPaying] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const loadPost = async () => {
    if (!id || !supabase) return
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single()
    if (data) setPost(data as BlogPost)
    setLoading(false)
  }

  useEffect(() => {
    loadPost()
  }, [id])

  // 결제 성공 후 돌아왔을 때 paid 상태 반영
  useEffect(() => {
    if (searchParams.get('purchased') === 'true' && post && !post.paid) {
      setPost({ ...post, paid: true })
    }
  }, [searchParams, post?.id])

  const isPaid = post?.paid === true

  // 토스 결제
  const handlePayment = async () => {
    if (!post || !user) return
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CK || ''
    if (!clientKey) {
      // 토스 미설정 → 무료 해제
      await supabase?.from('blog_posts').update({ paid: true }).eq('id', post.id)
      setPost({ ...post, paid: true })
      return
    }
    setPaying(true)
    try {
      await loadTossV1Script()
      const tossPayments = (window as any).TossPayments(clientKey)
      const orderId = `blog-${user.id.substring(0, 8)}-${Date.now()}`
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      await tossPayments.requestPayment('카드', {
        amount: 990,
        orderId,
        orderName: 'BlogPilot 블로그 글 1편',
        successUrl: `${appUrl}/api/blog/payment-success?postId=${post.id}&userId=${user.id}`,
        failUrl: `${appUrl}/blog/preview/${post.id}?payFail=true`,
      })
    } catch (e: any) {
      if (e?.code !== 'USER_CANCEL') alert('결제 오류: ' + (e?.message || ''))
    }
    setPaying(false)
  }

  // 텍스트 + 이미지 통째로 복사 (리치 텍스트)
  const handleCopy = async () => {
    if (!contentRef.current) return
    try {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(contentRef.current)
      selection?.removeAllRanges()
      selection?.addRange(range)

      const html = contentRef.current.innerHTML
      const text = contentRef.current.innerText
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ])

      selection?.removeAllRanges()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(contentRef.current)
      selection?.removeAllRanges()
      selection?.addRange(range)
      document.execCommand('copy')
      selection?.removeAllRanges()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSendEmail = async () => {
    if (!email || !post) return
    setEmailSending(true)
    try {
      const res = await fetch('/api/blog/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, email, title: post.generated_title, html: post.generated_body_html, hashtags: post.generated_hashtags }),
      })
      if (res.ok) {
        setEmailSent(true)
        setTimeout(() => { setShowEmailModal(false); setEmailSent(false) }, 2000)
      }
    } catch (e) {
      console.error(e)
    }
    setEmailSending(false)
  }

  if (loading || authLoading) return <div className="flex justify-center py-20"><div className="spinner" /></div>
  if (!post) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>글을 찾을 수 없습니다</div>

  return (
    <div className="max-w-[720px] mx-auto px-4 py-8 animate-in">
      {/* 상단 바 */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/blog/write" className="text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
          ← 새 글 작성
        </Link>
      </div>

      {/* 블로그 미리보기 */}
      <div className="rounded-2xl border overflow-hidden relative" style={{ background: '#fff', borderColor: 'var(--border)' }}>
        {/* 블로그 헤더 */}
        <div className="px-6 py-4 border-b" style={{ borderColor: '#eee' }}>
          <div className="text-[12px] mb-1" style={{ color: '#999' }}>블로그 미리보기</div>
        </div>

        {/* 글 내용 */}
        <div ref={contentRef} className="px-6 py-6">
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#333', marginBottom: '24px', lineHeight: 1.4 }}>
            {post.generated_title}
          </h1>
          <div
            dangerouslySetInnerHTML={{ __html: post.generated_body_html }}
            style={{ color: '#333', lineHeight: 1.8 }}
          />
          {post.generated_hashtags && post.generated_hashtags.length > 0 && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
              {post.generated_hashtags.map((tag, i) => (
                <span key={i} style={{ display: 'inline-block', margin: '2px 4px', color: '#2b7de9', fontSize: '14px' }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 결제 전: 블러 오버레이 */}
        {!isPaid && (
          <div className="absolute inset-0 top-[52px] flex items-end justify-center" style={{ background: 'linear-gradient(transparent 30%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.98) 70%)' }}>
            <div className="text-center pb-10">
              <p className="text-[14px] font-semibold mb-2" style={{ color: 'var(--text)' }}>전체 내용을 확인하려면 결제해주세요</p>
              <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>글 + 이미지 복사, 이메일 전송 포함</p>
              <button
                onClick={handlePayment}
                disabled={paying}
                className="px-8 py-3 rounded-xl font-semibold text-[15px] transition-all"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {paying ? '결제 진행 중...' : '₩990 결제하고 받기'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 결제 완료 후: 액션 버튼 */}
      {isPaid && (
        <>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 rounded-xl font-semibold text-[14px] transition-all"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {copied ? '복사 완료!' : '글 + 이미지 복사하기'}
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex-1 py-3 rounded-xl font-semibold text-[14px] border transition-all"
              style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)', color: 'var(--text-secondary)' }}
            >
              이메일로 받기
            </button>
          </div>

          <div className="mt-4 rounded-xl p-4" style={{ background: 'var(--surface)' }}>
            <p className="text-[13px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>티스토리에 올리는 법</p>
            <ol className="text-[12px] space-y-1" style={{ color: 'var(--text-muted)' }}>
              <li>1. [글 + 이미지 복사하기] 클릭</li>
              <li>2. 티스토리 → 글쓰기</li>
              <li>3. 에디터에 붙여넣기 (Ctrl+V) — 글과 이미지가 한번에 들어갑니다</li>
              <li>4. 미리보기 확인 후 발행</li>
            </ol>
          </div>
        </>
      )}

      {/* 결제 전: 안내 */}
      {!isPaid && (
        <div className="mt-6 rounded-xl p-4 text-center" style={{ background: 'var(--surface)' }}>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            미리보기는 무료 · 복사/이메일은 결제 후 이용 가능
          </p>
        </div>
      )}

      {/* 모듈 B 업셀 */}
      <div className="mt-8 rounded-xl p-5 border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
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

      {/* 이메일 모달 */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-[90%] max-w-[400px]" style={{ background: 'var(--bg)' }}>
            <h3 className="text-[16px] font-bold mb-4" style={{ color: 'var(--text)' }}>이메일로 받기</h3>
            <input
              className="inp mb-4"
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-medium border"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}
              >
                취소
              </button>
              <button
                onClick={handleSendEmail}
                disabled={emailSending || !email}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {emailSent ? '전송 완료!' : emailSending ? '전송 중...' : '전송'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
