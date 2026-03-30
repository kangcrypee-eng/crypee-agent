'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'

const ML: Record<string, string> = { oneclick: '⚡ 원클릭', form: '📝 폼', chat: '💬 대화', alert: '🔔 알림' }

const renderHtml = (t: string) => t
  .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:600;margin:12px 0 4px">$1</h3>')
  .replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:600;margin:18px 0 8px;padding-bottom:4px;border-bottom:1px solid #e8e8e8">$1</h2>')
  .replace(/^# (.+)$/gm, '<h1 style="font-size:18px;font-weight:700;margin-bottom:6px">$1</h1>')
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\n\n/g, '</p><p style="margin-bottom:8px">')
  .replace(/\n/g, '<br>')

// 사업계획서 양식 렌더링 (preview/page.tsx render()와 동일)
const renderBizplan = (t: string) => {
  const isSepRow = (row: string) => {
    const cells = row.replace(/^\||\|$/g, '').split('|')
    return cells.length > 0 && cells.every(c => /^[\s:\-]*$/.test(c)) && cells.some(c => c.includes('-'))
  }
  const mdTableToHtml = (block: string) => {
    const rows = block.trim().split('\n').filter(r => r.includes('|') && !isSepRow(r))
    if (rows.length === 0) return block
    let table = '<table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:13px">'
    rows.forEach((row, i) => {
      const cells = row.split('|').filter(c => c.trim() !== '')
      const tag = i === 0 ? 'th' : 'td'
      const st = i === 0 ? 'background:#f5f5f5;font-weight:600;' : ''
      table += '<tr>' + cells.map(c => `<${tag} style="border:1px solid #ddd;padding:8px 10px;${st}">${c.trim()}</${tag}>`).join('') + '</tr>'
    })
    return table + '</table>'
  }
  const tv = (key: string) => {
    const m = t.match(new RegExp('\\|\\s*' + key + '\\s*\\|\\s*([^|\\n]+)', 'i'))
    return m?.[1]?.replace(/\*\*/g, '').trim() || ''
  }
  const getSection = (start: string, end: string | null) => {
    const s = t.indexOf(start); if (s < 0) return ''
    const after = t.substring(s + start.length)
    const e = end ? after.search(new RegExp(end)) : after.length
    return after.substring(0, e > 0 ? e : after.length).trim()
  }
  const bodyToHtml = (body: string) => {
    let h = body
    h = h.replace(/(\|.+\|\n)+/g, (block) => mdTableToHtml(block))
    h = h.replace(/^### (.+)$/gm, '<div style="font-size:13px;font-weight:700;color:#1E293B;margin:14px 0 6px;padding:4px 0;border-bottom:1px solid #E2E8F0">$1</div>')
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    h = h.replace(/^◦\s*(.+)$/gm, '<div style="margin:10px 0 3px 0;padding:6px 10px;background:#F8FAFC;border-left:3px solid #2563EB;font-weight:600;font-size:12px;color:#1E293B;line-height:1.6">◦ $1</div>')
    h = h.replace(/^- (.+)$/gm, '<div style="margin:1px 0 1px 20px;padding:2px 0;color:#374151;font-size:12px;line-height:1.65">- $1</div>')
    h = h.replace(/\[확인 필요\]/g, '<span style="background:#FFF3CD;color:#856404;padding:1px 4px;border-radius:2px;font-size:10px;font-weight:600;border:1px solid #FFEEBA">📝 확인 필요</span>')
    h = h.replace(/&lt;\s*(.+?)\s*&gt;/g, '<div style="text-align:center;font-size:11px;font-weight:600;color:#64748B;margin:10px 0 4px">&lt; $1 &gt;</div>')
    h = h.replace(/\n\n/g, '</p><p style="margin-bottom:6px">')
    h = h.replace(/\n/g, '<br>')
    return h
  }
  const S = 'style'
  const th = `${S}="border:1px solid #333;padding:7px 10px;background:#F0F0F0;font-weight:600;font-size:11px;text-align:center;vertical-align:middle"`
  const td = `${S}="border:1px solid #333;padding:7px 10px;font-size:11px;vertical-align:top;line-height:1.6"`
  const hdr = `${S}="background:#1B2A4A;color:white;padding:8px 14px;font-size:13px;font-weight:700;margin:20px 0 8px;border-left:4px solid #3B82F6"`
  const tbl = `${S}="width:100%;border-collapse:collapse;margin:8px 0"`
  const sec1 = getSection('■ 1. 문제 인식', '■ 2. 실현') || getSection('1. 문제 인식', '2. 실현')
  const sec2 = getSection('■ 2. 실현 가능성', '■ 3. 성장') || getSection('2. 실현 가능성', '3. 성장')
  const sec3 = getSection('■ 3. 성장전략', '■ 4. 팀') || getSection('3. 성장전략', '4. 팀')
  const sec4 = getSection('■ 4. 팀 구성', '$') || getSection('4. 팀 구성', '$')
  return `<div ${S}="font-family:'Noto Sans KR',sans-serif;font-size:11pt;line-height:1.6;color:#111">
<div ${S}="text-align:center;font-size:16px;font-weight:800;margin-bottom:4px;padding:8px 0">예비창업패키지 사업계획서</div>
<div ${S}="text-align:center;font-size:13px;color:#555;margin-bottom:16px">${tv('기업.*명') || '[기업명]'}</div>
<div ${hdr}>□ 일반현황</div>
<table ${tbl}><tr><th ${th} width="22%">창업아이템명</th><td ${td} colspan="3">${tv('창업아이템명') || tv('아이템명') || '[확인 필요]'}</td></tr>
<tr><th ${th}>산출물</th><td ${td} colspan="3">${tv('산출물') || '[확인 필요]'}</td></tr>
<tr><th ${th}>직업</th><td ${td}>${tv('직업') || '[확인 필요]'}</td><th ${th}>기업(예정)명</th><td ${td}>${tv('기업.*명') || '[확인 필요]'}</td></tr></table>
<div ${hdr}>□ 창업 아이템 개요(요약)</div>
<table ${tbl}><tr><th ${th} width="15%">명 칭</th><td ${td} width="35%">${tv('명\\s*칭') || '[확인 필요]'}</td><th ${th} width="15%">범 주</th><td ${td} width="35%">${tv('범\\s*주') || '[확인 필요]'}</td></tr>
<tr><th ${th}>아이템 개요</th><td ${td} colspan="3">${tv('아이템 개요') || '[확인 필요]'}</td></tr>
<tr><th ${th}>문제 인식</th><td ${td} colspan="3">${tv('문제 인식') || '[확인 필요]'}</td></tr>
<tr><th ${th}>실현 가능성</th><td ${td} colspan="3">${tv('실현\\s*가능성?') || '[확인 필요]'}</td></tr>
<tr><th ${th}>성장전략</th><td ${td} colspan="3">${tv('성장\\s*전략') || '[확인 필요]'}</td></tr>
<tr><th ${th}>팀 구성</th><td ${td} colspan="3">${tv('팀\\s*구성') || '[확인 필요]'}</td></tr></table>
<div ${hdr}>1. 문제 인식 (Problem)</div>${bodyToHtml(sec1)}
<div ${hdr}>2. 실현 가능성 (Solution)</div>${bodyToHtml(sec2)}
<div ${hdr}>3. 성장전략 (Scale-up)</div>${bodyToHtml(sec3)}
<div ${hdr}>4. 팀 구성 (Team)</div>${bodyToHtml(sec4)}
</div>`
}

export default function ModuleDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { user } = useAuth()
  const [m, setM] = useState<any>(null)
  const [ld, setLd] = useState(true)
  const [slideIdx, setSlideIdx] = useState(0)
  const [chains, setChains] = useState<any[]>([])

  useEffect(() => {
    if (!id) return
    supabase.from('modules').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setM(data)
        if (data.chain_next?.length) {
          supabase.from('modules').select('id,name,icon').in('id', data.chain_next).then(({ data: c }) => { if (c) setChains(c) })
        }
      }
      setLd(false)
    })
  }, [id])

  if (ld) return <div className="pt-20 text-center" style={{ color: 'var(--text-muted)' }}>로딩 중...</div>
  if (!m) return <div className="pt-20 text-center" style={{ color: 'var(--text-muted)' }}>모듈을 찾을 수 없습니다</div>

  const price = m.price_krw || 0
  const isAlert = m.mode === 'alert'
  const slides = buildSlides(m)
  const executeUrl = isAlert ? `/alerts/setup?module=${m.id}` : `/execute?id=${m.id}`

  return (
    <div className="max-w-[760px] mx-auto pt-6 pb-16 animate-in">
      <button onClick={() => router.push('/market')} className="text-[12.5px] hover:opacity-70 mb-4 inline-block" style={{ color: 'var(--text-muted)' }}>← 마켓</button>

      {/* 헤더 */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: `var(--mode-${m.mode}-bg)` }}>{m.icon || '📄'}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-[20px] font-bold">{m.name}</h1>
            <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold border" style={{ background: `var(--mode-${m.mode}-bg)`, color: `var(--mode-${m.mode}-text)`, borderColor: `var(--mode-${m.mode}-border)` }}>{ML[m.mode]}</span>
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{m.description}</p>
          <div className="flex items-center gap-3 mt-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            <span>{m.category}</span>
            <span className="w-0.5 h-0.5 rounded-full" style={{ background: 'var(--text-muted)' }} />
            <span>{(m.uses || 0).toLocaleString()}회 사용</span>
            {m.expected_pages && <><span className="w-0.5 h-0.5 rounded-full" style={{ background: 'var(--text-muted)' }} /><span>{m.expected_pages}페이지</span></>}
          </div>
        </div>
      </div>

      {/* 가격 + CTA */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={executeUrl} className="flex-1 py-3.5 font-semibold text-[14px] rounded-lg text-center hover:opacity-90 transition-all" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
          {isAlert ? `알림 설정하기${price > 0 ? ` · ₩${price.toLocaleString()}/월` : ''}` : m.mode === 'bizplan' ? '무료로 생성하기' : price === 0 ? '무료 실행' : `실행하기 · ₩${price.toLocaleString()}`}
        </Link>
      </div>

      {/* 미리보기 슬라이드 */}
      {slides.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold">미리보기</h2>
            {slides.length > 1 && (
              <div className="flex gap-1.5">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setSlideIdx(i)} className="w-2 h-2 rounded-full transition-all" style={{ background: i === slideIdx ? 'var(--accent)' : 'var(--border-strong)' }} />
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {slides[slideIdx]?.type === 'text' && (
              <div className="p-6 text-[13px] leading-[1.8] max-h-[400px] overflow-y-auto" style={{ background: 'var(--preview-bg)', color: 'var(--preview-text)' }} dangerouslySetInnerHTML={{ __html: m.mode === 'bizplan' ? renderBizplan(slides[slideIdx].content) : '<p>' + renderHtml(slides[slideIdx].content) + '</p>' }} />
            )}
            {slides[slideIdx]?.type === 'email' && (
              <div className="p-4" style={{ background: '#F5F5F5' }}>
                <div className="max-w-[480px] mx-auto rounded-lg overflow-hidden shadow-sm" style={{ background: 'white' }}>
                  <div className="px-5 py-4 border-b" style={{ borderColor: '#eee' }}>
                    <div className="text-[11px]" style={{ color: '#999' }}>From: alert@crypee.biz</div>
                    <div className="text-[13px] font-semibold mt-1" style={{ color: '#111' }}>{slides[slideIdx].subject}</div>
                  </div>
                  <div className="px-5 py-4 text-[12.5px] leading-[1.7]" style={{ color: '#333' }} dangerouslySetInnerHTML={{ __html: slides[slideIdx].content }} />
                </div>
              </div>
            )}
            {slides[slideIdx]?.type === 'info' && (
              <div className="p-6" style={{ background: 'var(--surface)' }}>
                <div className="text-[13px] leading-[1.8] whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{slides[slideIdx].content}</div>
              </div>
            )}
          </div>
          {slides.length > 1 && (
            <div className="flex justify-between mt-2">
              <button onClick={() => setSlideIdx(Math.max(0, slideIdx - 1))} disabled={slideIdx === 0} className="text-[12px] disabled:opacity-30" style={{ color: 'var(--text-muted)' }}>← 이전</button>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{slideIdx + 1} / {slides.length}</span>
              <button onClick={() => setSlideIdx(Math.min(slides.length - 1, slideIdx + 1))} disabled={slideIdx === slides.length - 1} className="text-[12px] disabled:opacity-30" style={{ color: 'var(--text-muted)' }}>다음 →</button>
            </div>
          )}
        </div>
      )}

      {/* 태그 */}
      {m.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {m.tags.map((t: string) => <span key={t} className="px-2.5 py-1 rounded-lg text-[11px] border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{t}</span>)}
        </div>
      )}

      {/* 상세 정보 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
        {[
          ['모드', ML[m.mode]],
          ['가격', price === 0 ? '무료' : `₩${price.toLocaleString()}${isAlert ? '/월' : ''}`],
          ['출력', (m.output_formats || []).map((f: string) => f.toUpperCase()).join(', ') || '-'],
          ['분량', m.expected_pages || '-'],
        ].map(([label, value]) => (
          <div key={label as string} className="p-3 rounded-lg border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
            <div className="text-[13px] font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {/* 연결 모듈 */}
      {chains.length > 0 && (
        <div className="rounded-xl p-5 border mb-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-[13px] font-semibold mb-3">🔗 연결 모듈</p>
          <div className="flex gap-2 flex-wrap">
            {chains.map(c => (
              <Link key={c.id} href={`/module/${c.id}`} className="px-3 py-2 rounded-lg border text-[12px] hover:opacity-80" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{c.icon} {c.name}</Link>
            ))}
          </div>
        </div>
      )}

      {/* 하단 CTA */}
      <div className="rounded-xl p-6 border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="text-[14px] font-semibold mb-2">지금 바로 사용해보세요</p>
        <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>{m.description}</p>
        <Link href={executeUrl} className="inline-block px-6 py-3 font-semibold text-[13px] rounded-lg hover:opacity-90" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
          {isAlert ? '알림 설정하기' : m.mode === 'bizplan' ? '무료로 생성하기' : '실행하기'}
        </Link>
      </div>
    </div>
  )
}

// 모듈 타입별 미리보기 슬라이드 자동 생성
function buildSlides(m: any): Array<{ type: string; content: string; subject?: string }> {
  const slides: Array<{ type: string; content: string; subject?: string }> = []

  // 1. sample_output이 있으면 텍스트 슬라이드
  if (m.sample_output) {
    slides.push({ type: 'text', content: m.sample_output })
  }

  // 2. 자동화형 (alert) → 이메일 목업
  if (m.mode === 'alert' || m.output_mode === 'automation') {
    slides.push({
      type: 'email',
      subject: '[crypee agent] 정부지원사업 공고 3건 — 홍길동님',
      content: `
        <div style="margin-bottom:16px">
          <span style="font-weight:800;font-size:15px;color:#111">crypee</span>
          <span style="font-weight:800;font-size:15px;color:#00B894"> Agent</span>
        </div>
        <h2 style="font-size:16px;color:#111;margin-bottom:4px">정부지원사업 공고 알림</h2>
        <p style="font-size:13px;color:#666;margin-bottom:12px">홍길동님, 조건에 맞는 공고 <strong>3건</strong>을 찾았습니다.</p>
        <p style="font-size:11px;color:#999;margin-bottom:12px;padding:6px 10px;background:#f8f8f8;border-radius:4px">분야: 창업, 기술 · 지역: 서울</p>
        <div style="padding:10px 14px;border:1px solid #e5e5e5;border-radius:6px;margin-bottom:6px">
          <div style="font-weight:600;font-size:13px;color:#111;margin-bottom:2px">2026년 예비창업패키지 모집 공고</div>
          <div style="font-size:11px;color:#666">중소벤처기업부 · 창업</div>
          <div style="font-size:11px;color:#888">접수: 2026-04-01 ~ 2026-04-30</div>
        </div>
        <div style="padding:10px 14px;border:1px solid #e5e5e5;border-radius:6px;margin-bottom:6px">
          <div style="font-weight:600;font-size:13px;color:#111;margin-bottom:2px">AI 기술 사업화 지원사업</div>
          <div style="font-size:11px;color:#666">정보통신산업진흥원 · 기술</div>
          <div style="font-size:11px;color:#888">접수: 2026-04-05 ~ 2026-04-25</div>
        </div>
        <div style="padding:10px 14px;border:1px solid #e5e5e5;border-radius:6px">
          <div style="font-weight:600;font-size:13px;color:#111;margin-bottom:2px">[서울] 소상공인 디지털전환 지원</div>
          <div style="font-size:11px;color:#666">서울특별시 · 경영</div>
          <div style="font-size:11px;color:#888">접수: 2026-03-25 ~ 2026-04-15</div>
        </div>
      `,
    })
  }

  // 3. 모듈 설명 슬라이드 (항상 마지막)
  const infoLines = []
  if (m.mode === 'alert') {
    infoLines.push('📌 이 모듈은 매일 오전 기업마당(bizinfo.go.kr) 공고를 확인합니다.')
    infoLines.push('📧 조건에 맞는 공고가 있을 때만 이메일로 알림을 보냅니다.')
    infoLines.push('🔍 지원분야, 지역, 키워드로 필터를 설정할 수 있습니다.')
    infoLines.push('💰 월 ₩990으로 매일 맞춤 공고를 받아보세요.')
  } else if (m.output_mode === 'template') {
    infoLines.push('📌 이 모듈은 법률 문서 템플릿을 자동 생성합니다.')
    infoLines.push('📝 사업자 정보가 자동으로 채워지고, 빈칸을 입력하면 완성됩니다.')
    infoLines.push('⚖️ AI 생성물은 참고용이며, 법적 문서는 전문가 검토를 권장합니다.')
  } else {
    infoLines.push('📌 사업 정보를 입력하면 AI가 맞춤 결과물을 생성합니다.')
    infoLines.push('✏️ 생성 후 직접 편집하고 다운로드할 수 있습니다.')
    infoLines.push('🔄 결과가 마음에 들지 않으면 1회 무료 재생성이 가능합니다.')
  }
  slides.push({ type: 'info', content: infoLines.join('\n\n') })

  return slides
}
