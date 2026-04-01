'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { PHOTO_CATEGORIES } from '@/lib/blog-pro-categories'
import Link from 'next/link'

export default function BlogProDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  // 주제 관리
  const [topics, setTopics] = useState<any[]>([])
  const [newTopic, setNewTopic] = useState('')
  const [newTopicDate, setNewTopicDate] = useState('')
  const [addingTopic, setAddingTopic] = useState(false)
  const [photoTip, setPhotoTip] = useState('')
  const [neededCats, setNeededCats] = useState<string[]>([])

  const loadTopics = async (subId: string) => {
    const res = await fetch(`/api/blog/pro/topics?userId=${user?.id}&subscriptionId=${subId}`)
    const d = await res.json()
    setTopics(d.topics || [])
  }

  useEffect(() => {
    if (!user) return
    fetch(`/api/blog/pro/dashboard?userId=${user.id}`)
      .then(r => r.json())
      .then(d => {
        setData(d); setLoading(false)
        if (d.subscription?.id) loadTopics(d.subscription.id)
      })
      .catch(() => setLoading(false))
  }, [user?.id])

  const handleAddTopic = async () => {
    if (!newTopic || !data?.subscription) return
    setAddingTopic(true); setPhotoTip(''); setNeededCats([])
    try {
      const res = await fetch('/api/blog/pro/topics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, subscriptionId: data.subscription.id, topic: newTopic, scheduledDate: newTopicDate || null, businessType: data.subscription.business_type }),
      })
      const d = await res.json()
      if (d.photoTip) setPhotoTip(d.photoTip)
      if (d.neededCategories?.length) setNeededCats(d.neededCategories)
      setNewTopic(''); setNewTopicDate('')
      loadTopics(data.subscription.id)
    } catch {}
    setAddingTopic(false)
  }

  const handleDeleteTopic = async (id: string) => {
    await fetch(`/api/blog/pro/topics?id=${id}`, { method: 'DELETE' })
    loadTopics(data.subscription.id)
  }

  const handleCancel = async () => {
    if (!confirm('구독을 취소하시겠습니까? 남은 기간은 계속 이용 가능합니다.')) return
    setCancelling(true)
    await fetch('/api/blog/pro/cancel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id }),
    })
    router.refresh()
    setCancelling(false)
  }

  if (authLoading || loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>
  if (!user) { router.push('/login'); return null }
  if (!data?.subscription) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-16 text-center">
        <p className="text-[14px] mb-4" style={{ color: 'var(--text-muted)' }}>아직 구독이 없습니다</p>
        <Link href="/blog/pro" className="px-6 py-3 rounded-xl font-semibold text-[14px]" style={{ background: 'var(--accent)', color: '#fff' }}>
          BlogPilot Pro 시작하기
        </Link>
      </div>
    )
  }

  const sub = data.subscription
  const cats = PHOTO_CATEGORIES[sub.business_type] || PHOTO_CATEGORIES.other
  const planLabels: Record<string, string> = { monthly: '1개월', semi_annual: '6개월', annual: '연간' }

  return (
    <div className="max-w-[720px] mx-auto px-4 py-8 animate-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>BlogPilot Pro</h1>
        <span className="px-3 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: sub.billing_status === 'active' ? 'var(--accent-bg)' : 'var(--error-bg)', color: sub.billing_status === 'active' ? 'var(--accent)' : 'var(--error-text)' }}>
          {sub.billing_status === 'active' ? '구독 중' : sub.billing_status === 'cancelled' ? '취소됨' : sub.billing_status}
        </span>
      </div>

      {/* 구독 정보 */}
      <div className="rounded-xl p-4 border mb-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{sub.shop_name} · {planLabels[sub.plan_type]} 플랜</div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {sub.subscription_end_at ? `만료: ${new Date(sub.subscription_end_at).toLocaleDateString('ko')}` : ''}
              {sub.next_billing_at ? ` · 다음 결제: ${new Date(sub.next_billing_at).toLocaleDateString('ko')}` : ''}
            </div>
          </div>
          {sub.billing_status === 'active' && (
            <button onClick={handleCancel} disabled={cancelling} className="text-[12px] px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--error-border)', color: 'var(--error-text)' }}>
              {cancelling ? '...' : '구독 취소'}
            </button>
          )}
        </div>
      </div>

      {/* 사진 현황 */}
      <div className="rounded-xl p-4 border mb-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex justify-between items-center mb-3">
          <div className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>사진 현황</div>
          <div className="text-[13px] font-bold" style={{ color: 'var(--accent)' }}>
            {data.totalAvailable}장 사용 가능 (약 {data.postsAvailable}회분)
          </div>
        </div>

        {data.totalAvailable < 9 && (
          <div className="rounded-lg p-3 mb-3 text-[12px]" style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)' }}>
            사진이 부족합니다! 새 사진을 올려주세요.
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {cats.map(c => {
            const count = data.availablePhotos?.[c.value] || 0
            const isLow = count < 3
            return (
              <div key={c.value} className="rounded-lg p-2.5 border text-center" style={{ borderColor: isLow ? 'var(--error-border)' : 'var(--border)', background: isLow ? 'var(--error-bg)' : 'transparent' }}>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.icon} {c.label}</div>
                <div className="text-[16px] font-bold" style={{ color: isLow ? 'var(--error-text)' : 'var(--text)' }}>{count}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 주제 관리 */}
      <div className="rounded-xl p-4 border mb-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="text-[14px] font-semibold mb-3" style={{ color: 'var(--text)' }}>주제 미리 설정</div>
        <p className="text-[12px] mb-3" style={{ color: 'var(--text-muted)' }}>주제를 미리 설정하면 AI가 해당 주제로 글을 작성하고, 필요한 사진을 안내해드려요</p>

        {/* 주제 추가 */}
        <div className="flex gap-2 mb-3">
          <input className="inp flex-1" placeholder="예: 봄 시즌 인기 스타일" value={newTopic} onChange={e => setNewTopic(e.target.value)} />
          <input className="inp" type="date" style={{ width: '140px' }} value={newTopicDate} onChange={e => setNewTopicDate(e.target.value)} />
          <button onClick={handleAddTopic} disabled={!newTopic || addingTopic}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap"
            style={{ background: 'var(--accent)', color: '#fff', opacity: !newTopic ? 0.5 : 1 }}>
            {addingTopic ? '...' : '추가'}
          </button>
        </div>

        {/* 사진 촬영 팁 */}
        {photoTip && (
          <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
            <div className="text-[12px] font-semibold mb-1" style={{ color: 'var(--accent)' }}>📷 이런 사진을 올려주세요</div>
            <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{photoTip}</div>
            {neededCats.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {neededCats.map(c => {
                  const cat = cats.find(cc => cc.value === c)
                  return cat ? (
                    <span key={c} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>
                      {cat.icon} {cat.label}
                    </span>
                  ) : null
                })}
              </div>
            )}
          </div>
        )}

        {/* 주제 목록 */}
        {topics.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {topics.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                <div>
                  <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{t.topic}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {t.scheduled_date || '날짜 미정'} · {t.status === 'planned' ? '대기' : t.status}
                  </div>
                </div>
                {t.status === 'planned' && (
                  <button onClick={() => handleDeleteTopic(t.id)} className="text-[11px] px-2 py-1 rounded" style={{ color: 'var(--error-text)' }}>삭제</button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-center py-3" style={{ color: 'var(--text-muted)' }}>설정된 주제가 없습니다. AI가 자동으로 주제를 선택합니다.</p>
        )}
      </div>

      {/* 최근 발행 */}
      <div className="rounded-xl p-4 border mb-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="text-[14px] font-semibold mb-3" style={{ color: 'var(--text)' }}>최근 발행</div>
        {data.recentPosts?.length === 0 ? (
          <p className="text-[13px] text-center py-4" style={{ color: 'var(--text-muted)' }}>아직 발행된 글이 없습니다</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.recentPosts?.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{p.generated_title || '(제목 없음)'}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{p.scheduled_date}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{
                  background: p.delivery_status === 'sent' ? 'var(--accent-bg)' : p.delivery_status === 'failed' ? 'var(--error-bg)' : 'var(--surface)',
                  color: p.delivery_status === 'sent' ? 'var(--accent)' : p.delivery_status === 'failed' ? 'var(--error-text)' : 'var(--text-muted)',
                }}>
                  {p.delivery_status === 'sent' ? '발송 완료' : p.delivery_status === 'failed' ? '발송 실패' : p.status === 'done' ? '발송 대기' : '생성 중'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 링크 */}
      <div className="flex gap-3">
        <Link href="/blog/write" className="flex-1 py-3 rounded-xl font-semibold text-[13px] text-center border" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>
          1편 바로 작성
        </Link>
        <Link href="/blog/pro" className="flex-1 py-3 rounded-xl font-semibold text-[13px] text-center border" style={{ borderColor: 'var(--accent-border)', color: 'var(--accent)' }}>
          사진 추가 업로드
        </Link>
      </div>
    </div>
  )
}
