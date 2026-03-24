'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

export default function AlertsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [sub, setSub] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [ld, setLd] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user) {
      supabase.from('alert_subscriptions').select('*').eq('user_id', user.id).eq('module_type', 'gov_support').single().then(({ data }) => { if (data) setSub(data) })
      supabase.from('alert_logs').select('*').eq('user_id', user.id).order('sent_at', { ascending: false }).limit(20).then(({ data }) => { if (data) setLogs(data); setLd(false) })
    }
  }, [user, loading])

  if (loading || ld) return <div className="pt-20 text-center" style={{color:'var(--text-muted)'}}>로딩 중...</div>

  return (
    <div className="max-w-[600px] mx-auto pt-6 pb-16 animate-in">
      <h2 className="text-lg font-bold mb-1">🔔 공고 알림</h2>
      <p className="text-[12px] mb-6" style={{color:'var(--text-muted)'}}>내 알림 설정과 발송 기록</p>

      {sub ? (
        <div className="rounded-xl p-5 mb-4 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold">현재 알림 설정</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={sub.is_active ? {background:'var(--accent-bg)',color:'var(--accent)'} : {background:'var(--error-bg)',color:'var(--error-text)'}}>{sub.is_active ? '활성' : '비활성'}</span>
          </div>
          <div className="space-y-1 text-[12px]" style={{color:'var(--text-secondary)'}}>
            <p>주기: {sub.schedule_type === 'daily' ? '매일' : '매주'} {sub.schedule_hour}시</p>
            <p>전화번호: {sub.phone}</p>
            {sub.filters?.keyword && <p>키워드: {sub.filters.keyword}</p>}
            {sub.last_sent_at && <p>마지막 발송: {new Date(sub.last_sent_at).toLocaleString('ko')}</p>}
          </div>
          <button onClick={() => router.push('/alerts/setup')} className="mt-3 px-4 py-2 rounded-md text-[12px] border" style={{borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>설정 변경</button>
        </div>
      ) : (
        <div className="rounded-xl p-12 text-center border mb-4" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
          <p className="text-2xl mb-2">🔔</p>
          <p className="text-[13px] mb-3" style={{color:'var(--text-muted)'}}>아직 알림을 설정하지 않았습니다</p>
          <button onClick={() => router.push('/alerts/setup')} className="px-4 py-2 font-semibold text-[13px] rounded-md" style={{background:'var(--accent)',color:'var(--bg)'}}>알림 설정하기</button>
        </div>
      )}

      <h3 className="text-[14px] font-semibold mb-3">발송 기록</h3>
      {logs.length === 0 ? (
        <p className="text-[13px] py-8 text-center" style={{color:'var(--text-muted)'}}>아직 발송 기록이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="rounded-xl p-4 border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px]" style={{color:'var(--text-muted)'}}>{new Date(log.sent_at).toLocaleString('ko')}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={log.status === 'sent' ? {background:'var(--accent-bg)',color:'var(--accent)'} : log.status === 'no_match' ? {background:'var(--surface-hover)',color:'var(--text-muted)'} : {background:'var(--error-bg)',color:'var(--error-text)'}}>{log.status === 'sent' ? `${log.matched_count}건 매칭` : log.status === 'no_match' ? '공고 없음' : '실패'}</span>
              </div>
              {log.matched_items?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {log.matched_items.slice(0, 3).map((item: any, i: number) => (
                    <p key={i} className="text-[11px]" style={{color:'var(--text-secondary)'}}>📋 {item.pblancNm || '공고명 없음'}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
