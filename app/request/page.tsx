'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

const categories = ['사업계획서', '마케팅', '법률/계약', '재무/회계', '인사/채용', 'IT/개발', '디자인', '번역', '기타']

export default function RequestPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    setSubmitted(true)
    if (!category || !title.trim() || desc.trim().length < 10) return
    if (!user && !email) return
    setSending(true)
    const { error } = await supabase.from('module_requests').insert({
      user_id: user?.id || null,
      email: user?.email || email || null,
      category,
      title,
      description: desc,
    })
    setSending(false)
    if (error) {
      alert('제출 실패: ' + error.message)
      return
    }
    setDone(true)
  }

  if (done) return (
    <div className="max-w-[520px] mx-auto pt-20 pb-16 text-center animate-in">
      <div className="text-4xl mb-4">✅</div>
      <h1 className="text-[20px] font-bold mb-2">문의가 접수되었습니다</h1>
      <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>검토 후 모듈 제작을 진행하겠습니다.</p>
      <button onClick={() => router.push('/market')} className="px-5 py-2.5 rounded-lg font-semibold text-[13px]" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>마켓으로 돌아가기</button>
    </div>
  )

  return (
    <div className="max-w-[520px] mx-auto pt-8 pb-16 animate-in">
      <button onClick={() => router.push('/market')} className="text-[12.5px] hover:opacity-70 mb-4 inline-block" style={{ color: 'var(--text-muted)' }}>← 마켓</button>

      <h1 className="text-[20px] font-bold mb-1">모듈 문의하기</h1>
      <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>필요한 AI 모듈을 알려주세요. 검토 후 제작해드립니다.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>분야 *</label>
          <div className="flex flex-wrap gap-1.5">
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all"
                style={c === category
                  ? { background: 'var(--accent)', color: 'var(--bg)', borderColor: 'var(--accent)' }
                  : { borderColor: 'var(--border)', color: 'var(--text-muted)' }
                }>{c}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: submitted && !title.trim() ? '#ef4444' : 'var(--text-secondary)' }}>모듈 제목 *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 청년창업사관학교 사업계획서" className="w-full px-3.5 py-2.5 rounded-lg border text-[13px] outline-none" style={{ background: 'var(--surface)', borderColor: submitted && !title.trim() ? '#ef4444' : 'var(--border)', color: 'var(--text)' }} />
        </div>

        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: submitted && desc.trim().length < 10 ? '#ef4444' : 'var(--text-secondary)' }}>상세 설명 * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(최소 10자)</span></label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="어떤 기능이 필요한지 자세히 설명해주세요.&#10;&#10;예: 청년창업사관학교 공고에 맞는 사업계획서를 AI가 자동 작성해주는 모듈이 필요합니다. 평가항목이 예비창업패키지와 다르고..." rows={5} className="w-full px-3.5 py-2.5 rounded-lg border text-[13px] outline-none resize-none leading-relaxed" style={{ background: 'var(--surface)', borderColor: submitted && desc.trim().length < 10 ? '#ef4444' : 'var(--border)', color: 'var(--text)' }} />
          <div className="flex justify-between mt-1">
            {submitted && desc.trim().length < 10 && <span className="text-[11px]" style={{ color: '#ef4444' }}>최소 10자 이상 입력해주세요</span>}
            <span className="text-[11px] ml-auto" style={{ color: 'var(--text-muted)' }}>{desc.length}자</span>
          </div>
        </div>

        {!user && (
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>이메일 * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(답변 받을 이메일)</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" className="w-full px-3.5 py-2.5 rounded-lg border text-[13px] outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }} />
          </div>
        )}

        <button onClick={handleSubmit} disabled={sending || (!user && !email)}
          className="w-full py-3 font-semibold text-[14px] rounded-lg disabled:opacity-40 hover:opacity-90 transition-all"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
          {sending ? '제출 중...' : '문의 제출하기'}
        </button>

        <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>제출된 문의는 1~2일 내 검토됩니다.</p>
      </div>
    </div>
  )
}
