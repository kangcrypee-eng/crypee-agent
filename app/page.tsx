import Link from 'next/link'

const POPULAR_MODULES = [
  { icon: '📋', name: '정부지원사업 사업계획서', desc: '예비창업패키지, 초기창업패키지 등 정부 공모 신청용', price: '₩2,970', id: 'M01' },
  { icon: '📝', name: '프리랜서 용역 계약서', desc: '표준 업무위탁 계약서 자동 생성', price: '₩990', id: 'M12' },
  { icon: '✍️', name: '블로그 SEO 콘텐츠 5편', desc: '네이버/구글 상위노출용 블로그 글', price: '₩990', id: 'M17' },
  { icon: '🎯', name: 'SWOT 분석', desc: '강점/약점/기회/위협 분석 + 전략 도출', price: '₩990', id: 'M32' },
  { icon: '🔔', name: '정부지원사업 공고 알림', desc: '조건에 맞는 공고를 매일 이메일로 알림', price: '₩990/월', id: 'M100' },
  { icon: '💎', name: 'IR 피치덱', desc: '시드/시리즈A 투자 유치용 발표 자료', price: '₩2,970', id: 'M02' },
]

const STEPS = [
  { num: '1', title: '모듈 선택', desc: '20+개의 AI 에이전트 모듈 중 필요한 것을 선택하세요.' },
  { num: '2', title: '정보 입력', desc: '사업 정보를 입력하면 AI가 맞춤 문서를 생성합니다.' },
  { num: '3', title: '결과물 확인', desc: '생성된 문서를 미리보기, 편집, 다운로드하세요.' },
]

export default function Home() {
  return (
    <div className="animate-in">
      {/* Hero */}
      <section className="text-center pt-16 pb-12 px-4">
        <div className="inline-block px-4 py-1.5 rounded-full text-[12px] font-medium mb-5 border" style={{background:'var(--accent-bg)',color:'var(--accent)',borderColor:'var(--accent-border)'}}>
          AI가 사업 문서를 대신 작성합니다
        </div>
        <h1 className="text-[clamp(28px,4.5vw,48px)] font-extrabold tracking-tight leading-[1.12] mb-5">
          사업 운영에 필요한 모든 문서,<br/><span style={{color:'var(--accent)'}}>AI 에이전트</span>가 만듭니다
        </h1>
        <p className="text-[15px] max-w-[520px] mx-auto mb-8 leading-relaxed" style={{color:'var(--text-secondary)'}}>
          사업계획서, 계약서, 마케팅 콘텐츠, 재무 분석까지.<br/>
          전문가가 설계한 AI 모듈로 몇 분 만에 완성하세요.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/market" className="px-7 py-3.5 font-semibold text-[14px] rounded-lg hover:opacity-90 transition-all" style={{background:'var(--accent)',color:'var(--bg)'}}>
            모듈 둘러보기 →
          </Link>
          <Link href="/login?signup=1" className="px-7 py-3.5 font-semibold text-[14px] rounded-lg border hover:opacity-80 transition-all" style={{borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>
            무료로 시작
          </Link>
        </div>
        <p className="text-[12px] mt-4" style={{color:'var(--text-muted)'}}>가입 즉시 무료 모듈 사용 가능 · 카카오 간편 가입</p>
      </section>

      {/* 핵심 기능 */}
      <section className="pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            ['⚡', '원클릭 실행', '사업 정보만 입력하면 즉시 생성'],
            ['🧩', '20+ 모듈', '사업 라이프사이클 전체 커버'],
            ['💬', 'AI 상담 모드', '대화하며 단계적으로 작성'],
            ['📄', '다양한 포맷', 'PDF, DOCX, HWP, TXT 다운로드'],
          ].map(([i, t, d]) => (
            <div key={t as string} className="p-5 rounded-xl border text-center" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
              <div className="text-[24px] mb-2">{i}</div>
              <h3 className="text-[13px] font-semibold mb-1">{t}</h3>
              <p className="text-[11.5px]" style={{color:'var(--text-muted)'}}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 사용 방법 */}
      <section className="pb-12">
        <h2 className="text-[20px] font-bold text-center mb-2">어떻게 사용하나요?</h2>
        <p className="text-[13px] text-center mb-8" style={{color:'var(--text-muted)'}}>3단계로 전문 문서를 완성하세요</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {STEPS.map(s => (
            <div key={s.num} className="p-6 rounded-xl border" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold mb-3" style={{background:'var(--accent-bg)',color:'var(--accent)'}}>{s.num}</div>
              <h3 className="text-[15px] font-semibold mb-1">{s.title}</h3>
              <p className="text-[12.5px] leading-relaxed" style={{color:'var(--text-muted)'}}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 인기 모듈 */}
      <section className="pb-12">
        <h2 className="text-[20px] font-bold text-center mb-2">인기 모듈</h2>
        <p className="text-[13px] text-center mb-8" style={{color:'var(--text-muted)'}}>가장 많이 사용되는 AI 에이전트 모듈</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {POPULAR_MODULES.map(m => (
            <Link key={m.id} href={`/execute?id=${m.id}`} className="p-5 rounded-xl border hover:opacity-90 transition-all block" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
              <div className="flex items-start gap-3">
                <span className="text-[22px]">{m.icon}</span>
                <div className="flex-1">
                  <h3 className="text-[13.5px] font-semibold mb-0.5">{m.name}</h3>
                  <p className="text-[11.5px] leading-relaxed" style={{color:'var(--text-muted)'}}>{m.desc}</p>
                  <p className="text-[12px] font-semibold mt-2" style={{color:'var(--accent)'}}>{m.price}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link href="/market" className="text-[13px] font-medium hover:underline" style={{color:'var(--accent)'}}>전체 모듈 보기 →</Link>
        </div>
      </section>

      {/* 카테고리 */}
      <section className="pb-12">
        <h2 className="text-[20px] font-bold text-center mb-2">사업의 모든 단계를 지원합니다</h2>
        <p className="text-[13px] text-center mb-8" style={{color:'var(--text-muted)'}}>11개 카테고리, 20+개 모듈</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            ['📋','사업계획서'],['📑','제안서/견적'],['📝','계약/법무'],['📢','마케팅'],
            ['⚙️','운영/관리'],['🔍','리서치/분석'],['💰','재무/회계'],['💬','커뮤니케이션'],
            ['👔','채용/HR'],['🚀','전략/성장'],['🔔','자동화/알림'],
          ].map(([icon, name]) => (
            <div key={name as string} className="px-4 py-2.5 rounded-lg border text-[12.5px] font-medium" style={{background:'var(--surface)',borderColor:'var(--border)',color:'var(--text-secondary)'}}>
              {icon} {name}
            </div>
          ))}
        </div>
      </section>

      {/* AI 면책 + CTA */}
      <section className="pb-16">
        <div className="rounded-xl p-8 border text-center" style={{background:'var(--surface)',borderColor:'var(--border)'}}>
          <h2 className="text-[18px] font-bold mb-2">지금 바로 시작하세요</h2>
          <p className="text-[13px] mb-6 max-w-[400px] mx-auto leading-relaxed" style={{color:'var(--text-muted)'}}>
            카카오 또는 이메일로 간편 가입하고,<br/>무료 모듈부터 체험해보세요.
          </p>
          <Link href="/login?signup=1" className="inline-block px-7 py-3.5 font-semibold text-[14px] rounded-lg hover:opacity-90 transition-all" style={{background:'var(--accent)',color:'var(--bg)'}}>
            무료로 시작하기
          </Link>
          <p className="text-[11px] mt-6" style={{color:'var(--text-muted)'}}>
            ※ AI 생성물은 참고 자료로 제공되며, 법적 효력을 보장하지 않습니다. 법적 문서는 전문가 검토를 권장합니다.
          </p>
        </div>
      </section>
    </div>
  )
}
