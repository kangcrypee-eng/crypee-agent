import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '모두의 창업 AI 지원서 작성 도우미 — crypee Agent',
  description: '모두의 창업 지원서, AI가 10분 만에 완성해드립니다. 아이디어 배경·문제 해결·실현 방법 등 핵심 질문 답변을 AI가 맞춤 작성. 첨부사진 추천까지.',
  keywords: ['모두의 창업', '모두의 창업 신청서', '모두의 창업 지원서', '모두의 창업 AI', '창업 지원서 작성', '모두의 창업 합격', '창업 자기소개서 AI', 'crypee'],
  openGraph: {
    title: '모두의 창업 AI 지원서 작성 도우미',
    description: '모두의 창업 지원서, AI가 10분 만에 완성해드립니다.',
    url: 'https://www.crypee.biz/modoo',
    siteName: 'crypee Agent',
    type: 'website',
    locale: 'ko_KR',
  },
  alternates: {
    canonical: 'https://www.crypee.biz/modoo',
  },
}

const FAQ = [
  { q: '모두의 창업 지원서는 무엇을 써야 하나요?', a: '아이디어를 떠올린 배경, 누구의 어떤 문제를 해결하는지, 어떻게 실현할 것인지를 구체적으로 작성해야 합니다. AI가 사업 아이디어만 입력하면 각 항목 답변을 자동으로 작성해드립니다.' },
  { q: 'AI가 쓴 지원서를 그대로 제출해도 되나요?', a: 'AI가 초안을 완성하면 본인 경험과 언어로 가다듬어 제출하시면 됩니다. 핵심 논리 구조와 문장 흐름을 AI가 잡아주므로 작성 시간을 크게 줄일 수 있습니다.' },
  { q: '얼마나 걸리나요?', a: '아이디어 입력 후 AI 생성까지 약 30~60초입니다. 결과물은 ₩990에 전체 열람 및 다운로드 가능합니다.' },
  { q: '모두의 창업 외에 다른 창업 프로그램에도 쓸 수 있나요?', a: '네. 예비창업패키지, 초기창업패키지 등 유사 창업 지원 프로그램의 자기소개서 작성에도 활용하실 수 있습니다.' },
]

export default function ModooPage() {
  return (
    <div className="max-w-[760px] mx-auto pt-8 pb-20 px-4">

      {/* 히어로 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-semibold mb-4" style={{ background: 'rgba(0,184,148,0.1)', color: '#00B894', border: '1px solid rgba(0,184,148,0.3)' }}>
          AI 지원서 작성
        </div>
        <h1 className="text-3xl font-extrabold mb-4 leading-tight">
          모두의 창업 지원서<br />
          <span style={{ color: 'var(--accent)' }}>AI가 10분 만에 완성</span>해드립니다
        </h1>
        <p className="text-[15px] leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
          아이디어만 입력하면 모두의 창업 핵심 질문 답변을<br />
          AI가 설득력 있게 작성합니다. 첨부사진 추천까지.
        </p>
        <Link
          href="/market?module=MODOO001"
          className="inline-block px-8 py-4 font-bold text-[16px] rounded-xl hover:opacity-90 transition-all"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}
        >
          무료로 시작하기 →
        </Link>
        <p className="text-[12px] mt-3" style={{ color: 'var(--text-muted)' }}>미리보기 무료 · 전체 열람 ₩990</p>
      </div>

      {/* 주요 기능 */}
      <div className="mb-12">
        <h2 className="text-[20px] font-bold mb-6 text-center">모두의 창업 AI 도우미, 이런 점이 달라요</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '✍️', title: '핵심 질문 자동 완성', desc: '아이디어 배경, 문제 정의, 실현 방법 등 모두의 창업 평가 항목에 맞춘 답변 자동 작성' },
            { icon: '📷', title: '첨부사진 추천', desc: '어떤 사진을 첨부하면 좋은지 AI가 구체적으로 추천해드립니다' },
            { icon: '⚡', title: '30초 완성', desc: '긴 시간 고민할 필요 없이 아이디어를 입력하면 바로 초안이 완성됩니다' },
          ].map(item => (
            <div key={item.title} className="p-5 rounded-xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="text-[14px] font-bold mb-2">{item.title}</h3>
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 사용 방법 */}
      <div className="mb-12 rounded-xl p-6 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h2 className="text-[18px] font-bold mb-5">사용 방법</h2>
        <ol className="space-y-4">
          {[
            { step: '01', title: '사업 아이디어 입력', desc: '어떤 문제를 해결하고 싶은지, 어떤 서비스인지 간단히 설명해주세요' },
            { step: '02', title: 'AI 답변 생성', desc: '모두의 창업 질문 항목에 맞는 답변이 자동으로 작성됩니다' },
            { step: '03', title: '검토 후 제출', desc: '생성된 내용을 본인 언어로 다듬어 지원서에 붙여넣기 하세요' },
          ].map(item => (
            <li key={item.step} className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>{item.step}</span>
              <div>
                <p className="text-[14px] font-semibold mb-0.5">{item.title}</p>
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <h2 className="text-[18px] font-bold mb-5">자주 묻는 질문</h2>
        <div className="space-y-3">
          {FAQ.map(item => (
            <div key={item.q} className="rounded-xl p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-[13px] font-semibold mb-2">Q. {item.q}</p>
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>A. {item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 CTA */}
      <div className="rounded-xl p-8 border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h2 className="text-[18px] font-bold mb-2">지금 모두의 창업 지원서 작성 시작하기</h2>
        <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>미리보기는 무료 · 전체 열람 및 다운로드 ₩990</p>
        <Link
          href="/market?module=MODOO001"
          className="inline-block px-8 py-4 font-bold text-[15px] rounded-xl hover:opacity-90 transition-all"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}
        >
          AI 지원서 작성하기 →
        </Link>
      </div>

      {/* JSON-LD 구조화 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: '모두의 창업 AI 지원서 작성 도우미',
            applicationCategory: 'BusinessApplication',
            description: '모두의 창업 지원서를 AI가 자동으로 작성해드립니다. 아이디어 배경, 문제 해결, 실현 방법 등 핵심 질문 답변 자동 완성.',
            url: 'https://www.crypee.biz/modoo',
            offers: {
              '@type': 'Offer',
              price: '990',
              priceCurrency: 'KRW',
            },
            operatingSystem: 'Web',
            inLanguage: 'ko',
          }),
        }}
      />
    </div>
  )
}
