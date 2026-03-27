'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const STEPS = [
  { num: '1', title: '모듈 선택', desc: '필요한 AI 에이전트 모듈을 선택하세요.' },
  { num: '2', title: '정보 입력', desc: '사업 정보를 입력하면 AI가 맞춤 결과를 생성합니다.' },
  { num: '3', title: '결과물 활용', desc: '생성된 결과물을 미리보기, 편집, 다운로드하세요.' },
]

const CATEGORIES = [
  { icon: '📋', name: '사업계획서' }, { icon: '📑', name: '제안서/견적' }, { icon: '📝', name: '계약/법무' },
  { icon: '📢', name: '마케팅' }, { icon: '⚙️', name: '운영/관리' }, { icon: '🔍', name: '리서치/분석' },
  { icon: '💰', name: '재무/회계' }, { icon: '💬', name: '커뮤니케이션' }, { icon: '👔', name: '채용/HR' },
  { icon: '🚀', name: '전략/성장' },
]

export default function Home() {
  const [modules, setModules] = useState<any[]>([])
  const [selectedCat, setSelectedCat] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('modules').select('*').eq('status', 'active').order('uses', { ascending: false }).then(({ data }) => {
      if (data) setModules(data)
    })
  }, [])

  const totalModules = modules.length
  const moduleCountLabel = `${Math.floor(totalModules / 10) * 10}+`
  const popularModules = modules.slice(0, 6)
  const catModules = selectedCat ? modules.filter(m => m.category === selectedCat) : []

  return (
    <div className="animate-in">
      {/* Hero */}
      <section className="text-center pt-16 pb-12 px-4">
        <div className="inline-block px-4 py-1.5 rounded-full text-[12px] font-medium mb-5 border" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', borderColor: 'var(--accent-border)' }}>
          AI 에이전트가 사업 운영을 지원합니다
        </div>
        <h1 className="text-[clamp(28px,4.5vw,48px)] font-extrabold tracking-tight leading-[1.12] mb-5">
          사업에 필요한 모든 것,<br /><span style={{ color: 'var(--accent)' }}>crypee Agent</span>
        </h1>
        <p className="text-[15px] max-w-[520px] mx-auto mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          사업계획서, 계약서, 마케팅, 분석, 자동화 알림까지.<br />
          전문가가 설계한 AI 모듈로 빠르게 해결하세요.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/market" className="px-7 py-3.5 font-semibold text-[14px] rounded-lg hover:opacity-90 transition-all" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
            모듈 둘러보기 →
          </Link>
          <Link href="/login?signup=1" className="px-7 py-3.5 font-semibold text-[14px] rounded-lg border hover:opacity-80 transition-all" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>
            시작하기
          </Link>
        </div>
        <p className="text-[12px] mt-4" style={{ color: 'var(--text-muted)' }}>카카오 간편 가입 · 이메일 가입</p>
      </section>

      {/* 핵심 기능 */}
      <section className="pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            ['⚡', '원클릭 실행', '사업 정보만 입력하면 즉시 생성'],
            ['🧩', `${moduleCountLabel}개 모듈`, '문서 작성부터 자동화까지'],
            ['💬', 'AI 상담 모드', '대화하며 단계적으로 작성'],
            ['🔔', '자동화 알림', '조건에 맞는 공고를 매일 알림'],
          ].map(([i, t, d]) => (
            <div key={t as string} className="p-5 rounded-xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="text-[24px] mb-2">{i}</div>
              <h3 className="text-[13px] font-semibold mb-1">{t}</h3>
              <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 사용 방법 */}
      <section className="pb-12">
        <h2 className="text-[20px] font-bold text-center mb-2">어떻게 사용하나요?</h2>
        <p className="text-[13px] text-center mb-8" style={{ color: 'var(--text-muted)' }}>3단계로 원하는 결과를 얻으세요</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {STEPS.map(s => (
            <div key={s.num} className="p-6 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold mb-3" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{s.num}</div>
              <h3 className="text-[15px] font-semibold mb-1">{s.title}</h3>
              <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 인기 모듈 (DB 기반 자동) */}
      <section className="pb-12">
        <h2 className="text-[20px] font-bold text-center mb-2">인기 모듈</h2>
        <p className="text-[13px] text-center mb-8" style={{ color: 'var(--text-muted)' }}>가장 많이 사용되는 AI 에이전트 모듈</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {popularModules.map(m => (
            <Link key={m.id} href={m.mode === 'alert' ? `/alerts/setup?module=${m.id}` : `/execute?id=${m.id}`} className="p-5 rounded-xl border hover:opacity-90 transition-all block" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-start gap-3">
                <span className="text-[22px]">{m.icon || '📄'}</span>
                <div className="flex-1">
                  <h3 className="text-[13.5px] font-semibold mb-0.5">{m.name}</h3>
                  <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{m.description}</p>
                  <p className="text-[12px] font-semibold mt-2" style={{ color: 'var(--accent)' }}>
                    {(m.price_krw || 0) === 0 ? '무료' : `₩${(m.price_krw || 0).toLocaleString()}${m.mode === 'alert' ? '/월' : ''}`}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link href="/market" className="text-[13px] font-medium hover:underline" style={{ color: 'var(--accent)' }}>전체 모듈 보기 →</Link>
        </div>
      </section>

      {/* 카테고리 (클릭 시 해당 모듈 표시) */}
      <section className="pb-12">
        <h2 className="text-[20px] font-bold text-center mb-2">사업의 모든 단계를 지원합니다</h2>
        <p className="text-[13px] text-center mb-8" style={{ color: 'var(--text-muted)' }}>카테고리를 클릭하면 해당 모듈을 확인할 수 있습니다</p>
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          {CATEGORIES.map(c => (
            <button key={c.name} onClick={() => setSelectedCat(selectedCat === c.name ? null : c.name)}
              className="px-4 py-2.5 rounded-lg border text-[12.5px] font-medium transition-all"
              style={selectedCat === c.name ? { background: 'var(--accent-bg)', color: 'var(--accent)', borderColor: 'var(--accent-border)' } : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              {c.icon} {c.name} {modules.filter(m => m.category === c.name).length > 0 && <span style={{ color: 'var(--text-muted)' }}>{modules.filter(m => m.category === c.name).length}</span>}
            </button>
          ))}
        </div>
        {selectedCat && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 animate-in">
            {catModules.length === 0 ? (
              <div className="col-span-3 text-center py-8" style={{ color: 'var(--text-muted)' }}>
                <p className="text-[13px]">해당 카테고리의 모듈이 준비 중입니다</p>
              </div>
            ) : catModules.map(m => (
              <Link key={m.id} href={m.mode === 'alert' ? `/alerts/setup?module=${m.id}` : `/execute?id=${m.id}`} className="p-4 rounded-xl border hover:opacity-90 transition-all block" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2.5">
                  <span className="text-[18px]">{m.icon || '📄'}</span>
                  <div className="flex-1">
                    <h3 className="text-[13px] font-semibold">{m.name}</h3>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{m.description}</p>
                  </div>
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
                    {(m.price_krw || 0) === 0 ? '무료' : `₩${(m.price_krw || 0).toLocaleString()}`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="pb-16">
        <div className="rounded-xl p-8 border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-[18px] font-bold mb-2">지금 바로 시작하세요</h2>
          <p className="text-[13px] mb-6 max-w-[400px] mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            카카오 또는 이메일로 간편 가입하고,<br />AI 에이전트 모듈을 체험해보세요.
          </p>
          <Link href="/login?signup=1" className="inline-block px-7 py-3.5 font-semibold text-[14px] rounded-lg hover:opacity-90 transition-all" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
            시작하기
          </Link>
          <p className="text-[11px] mt-6" style={{ color: 'var(--text-muted)' }}>
            ※ AI 생성물은 참고 자료로 제공되며, 법적 효력을 보장하지 않습니다. 법적 문서는 전문가 검토를 권장합니다.
          </p>
        </div>
      </section>
    </div>
  )
}
