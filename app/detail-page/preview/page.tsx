'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

function PreviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const postId = searchParams.get('id') || ''
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editHtml, setEditHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!postId || !supabase) { setLoading(false); return }
    supabase.from('blog_posts').select('*').eq('id', postId).single().then(({ data }) => {
      if (data) setPost(data)
      setLoading(false)
    })
  }, [postId])

  const handleCopy = async () => {
    if (!contentRef.current) return
    try {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(contentRef.current)
      selection?.removeAllRanges()
      selection?.addRange(range)
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([contentRef.current.innerHTML], { type: 'text/html' }),
          'text/plain': new Blob([contentRef.current.innerText], { type: 'text/plain' }),
        }),
      ])
      selection?.removeAllRanges()
    } catch {
      document.execCommand('copy')
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyHtml = async () => {
    if (!post) return
    await navigator.clipboard.writeText(post.generated_body_html)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const startEdit = () => {
    setEditHtml(post.generated_body_html)
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!supabase || !post) return
    setSaving(true)
    await supabase.from('blog_posts').update({ generated_body_html: editHtml }).eq('id', post.id)
    setPost({ ...post, generated_body_html: editHtml })
    setEditing(false)
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>
  if (!post) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>상세페이지를 찾을 수 없습니다</div>

  return (
    <div className="max-w-[800px] mx-auto px-4 py-8 animate-in">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>상세페이지 미리보기</h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>{post.generated_title}</p>
        </div>
        <button onClick={() => router.push('/detail-page')} className="text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
          ← 새로 만들기
        </button>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 mb-4">
        <button onClick={handleCopy}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold"
          style={{ background: 'var(--accent)', color: '#fff' }}>
          {copied ? '복사 완료!' : '글+이미지 복사'}
        </button>
        <button onClick={handleCopyHtml}
          className="px-4 py-2 rounded-lg text-[13px] font-medium border"
          style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>
          HTML 코드 복사
        </button>
        <button onClick={editing ? saveEdit : startEdit}
          className="px-4 py-2 rounded-lg text-[13px] font-medium border"
          style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>
          {saving ? '저장 중...' : editing ? 'HTML 저장' : 'HTML 수정'}
        </button>
        {editing && (
          <button onClick={() => setEditing(false)}
            className="px-4 py-2 rounded-lg text-[13px]"
            style={{ color: 'var(--text-muted)' }}>
            취소
          </button>
        )}
      </div>

      {/* 사용 안내 */}
      <div className="rounded-lg p-3 mb-4 text-[12px]" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>
        스마트스토어: 상품 등록 → 상세 설명 → HTML 모드 → "HTML 코드 복사" 붙여넣기<br/>
        쿠팡/카페24: 상품 등록 → 상세 설명 → HTML 에디터 → 붙여넣기
      </div>

      {/* HTML 수정 모드 */}
      {editing && (
        <div className="mb-4">
          <textarea className="inp" rows={20} value={editHtml} onChange={e => setEditHtml(e.target.value)}
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', resize: 'vertical' }} />
        </div>
      )}

      {/* 모바일 미리보기 프레임 */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: '#fff', borderColor: 'var(--border)' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#eee', background: '#f8f8f8' }}>
          <span className="text-[11px] font-medium" style={{ color: '#999' }}>📱 모바일 미리보기 (680px)</span>
          <span className="text-[11px]" style={{ color: '#ccc' }}>스마트스토어</span>
        </div>
        <div ref={contentRef} dangerouslySetInnerHTML={{ __html: post.generated_body_html }} />
      </div>
    </div>
  )
}

export default function DetailPagePreview() {
  return <Suspense fallback={<div className="flex justify-center py-20"><div className="spinner" /></div>}><PreviewContent /></Suspense>
}
