import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t mt-20" style={{borderColor:'var(--border)'}}>
      <div className="max-w-[1120px] mx-auto px-5 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="font-extrabold text-base tracking-tight mb-2">
              <span style={{color:'var(--text)'}}>crypee</span><span style={{color:'var(--accent)'}}> Agent</span>
            </div>
            <p className="text-[12px] leading-relaxed" style={{color:'var(--text-muted)'}}>AI 에이전트가 사업 운영에 필요한<br/>문서를 자동으로 생성합니다.</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{color:'var(--text-muted)'}}>서비스</p>
            <div className="flex flex-col gap-2">
              <Link href="/market" className="text-[12.5px] hover:opacity-80" style={{color:'var(--text-secondary)'}}>모듈 마켓</Link>
              <Link href="/credits" className="text-[12.5px] hover:opacity-80" style={{color:'var(--text-secondary)'}}>크레딧 충전</Link>
              <Link href="/login?signup=1" className="text-[12.5px] hover:opacity-80" style={{color:'var(--text-secondary)'}}>회원가입</Link>
              <Link href="/login" className="text-[12.5px] hover:opacity-80" style={{color:'var(--text-secondary)'}}>로그인</Link>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{color:'var(--text-muted)'}}>법적 고지</p>
            <div className="flex flex-col gap-2">
              <Link href="/terms" className="text-[12.5px] hover:opacity-80" style={{color:'var(--text-secondary)'}}>서비스 이용약관</Link>
              <Link href="/privacy" className="text-[12.5px] hover:opacity-80" style={{color:'var(--text-secondary)'}}>개인정보처리방침</Link>
            </div>
          </div>
        </div>
        <div className="border-t pt-6" style={{borderColor:'var(--border)'}}>
          <div className="text-[11px] leading-[1.8] space-y-0.5" style={{color:'var(--text-muted)'}}>
            <p>주식회사 크리피솔루션즈 (Crypee Solutions Corp.) | 대표이사: 민동선</p>
            <p>사업자등록번호: 173-87-02739 | 통신판매업: 제 2025-서울강남-04382호</p>
            <p>주소: 서울특별시 강남구 테헤란로 431, 에스7018호(삼성동, 저스트코타워)</p>
            <p>이메일: contact@crypee.io</p>
            <p className="mt-3 opacity-50">© 2025 Crypee Solutions Corp. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
