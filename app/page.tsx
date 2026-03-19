import Link from 'next/link'
export default function Home() {
  return (
    <div className="animate-in">
      <section className="text-center py-20 px-4">
        <h1 className="text-[clamp(28px,4.5vw,44px)] font-extrabold tracking-tight leading-[1.15] mb-4">사업 운영에 필요한 모든 것,<br/><span className="text-[#00D4AA]">crypee Agent</span>에서 찾으세요</h1>
        <p className="text-[15px] text-[#A1A1AA] max-w-[480px] mx-auto mb-7 leading-relaxed">사업계획서, 시장 분석, 마케팅, 계약서, 재무 예측까지.<br/>AI 에이전트 모듈이 당신의 사업을 지원합니다.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/login?signup=1" className="px-6 py-3 bg-[#00D4AA] text-[#09090B] font-semibold text-sm rounded-lg">무료로 시작 →</Link>
          <Link href="/market" className="px-6 py-3 border border-white/10 text-[#A1A1AA] font-semibold text-sm rounded-lg">모듈 둘러보기</Link>
        </div>
      </section>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pb-12">
        {[['⚡','원클릭 실행','사업 정보 기반 즉시 생성'],['🧩','모듈 마켓','사업 라이프사이클 전체 커버'],['💬','AI 상담','대화로 단계적 해결'],['📄','다양한 출력','PDF, HWP, DOCX, TXT'],['🔗','체이닝','분석→전략→실행 자동 연결'],['🔒','검증된 프롬프트','전문가 설계 에이전트']].map(([i,t,d])=>(
          <div key={t} className="p-5 rounded-[10px] border border-white/[.06] bg-[#141417]"><div className="text-[22px] mb-2">{i}</div><h3 className="text-[13.5px] font-semibold mb-1">{t}</h3><p className="text-[12px] text-[#63636E]">{d}</p></div>
        ))}
      </section>
    </div>
  )
}
