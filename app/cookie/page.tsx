import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '쿠키 정책',
  description: 'crypee Agent 쿠키 정책 — 주식회사 크리피솔루션즈',
}

const sections = [
  {
    title: '1. 쿠키란 무엇인가',
    content: `쿠키(Cookie)란 이용자가 웹사이트를 방문할 때 이용자의 기기(PC, 스마트폰 등)에 저장되는 소규모 텍스트 파일입니다. 쿠키는 이용자의 설정을 기억하거나, 로그인 상태를 유지하거나, 서비스 이용 패턴을 분석하는 데 사용됩니다.

crypee(https://www.crypee.biz)는 서비스 이용을 위해 다음과 같이 쿠키와 유사한 기술(로컬 스토리지, 세션 스토리지, 픽셀 태그 포함, 이하 "쿠키 등")을 사용합니다.`,
  },
  {
    title: '2. 쿠키의 종류 및 사용 목적',
    content: `[2.1 필수 쿠키 (Strictly Necessary Cookies)]
동의 불필요 — 서비스 이용에 반드시 필요하며, 이용자의 별도 동의 없이 활성화됩니다. 이 쿠키를 비활성화하면 서비스 이용이 불가능하거나 심각하게 제한됩니다.

쿠키명(예시) | 목적 | 보존 기간
session_id | 로그인 세션 유지, 보안 | 세션 종료 시
csrf_token | CSRF 공격 방지, 보안 | 세션 종료 시
auth_token | 인증 상태 유지 | 30일 (자동 로그아웃 설정에 따름)
cookie_consent | 이용자의 쿠키 동의 선택 저장 | 1년

[2.2 기능 쿠키 (Functional Cookies)]
동의 필요 — 서비스 이용 편의를 위한 쿠키로, 이용자의 언어 설정·UI 선호도 등을 기억합니다.

쿠키명(예시) | 목적 | 보존 기간
ui_theme | 다크모드 등 UI 설정 저장 | 1년
last_module | 마지막 사용 모듈 기억 | 30일

[2.3 분석·통계 쿠키 (Analytics Cookies)]
동의 필요 — 이용자가 서비스를 어떻게 이용하는지 분석하여 서비스 개선에 활용합니다. 수집 데이터는 집계·익명화 처리됩니다.

제공자 | 도구 | 목적 | 보존 기간 | 개인정보처리방침
Google LLC | Google Analytics 4 (GA4) | 페이지뷰, 이벤트 트래킹, 접속 경로 분석 | 최대 14개월 | https://policies.google.com/privacy

※ Google Analytics 관련: 수집된 데이터는 미국 소재 Google 서버로 전송됩니다. EU/EEA 이용자의 경우 Google의 표준계약조항(SCC)이 적용됩니다. 이용자는 Google Analytics 차단 도구를 통해 추적을 거부할 수 있습니다.

[2.4 마케팅 쿠키 (Marketing Cookies)]
동의 필요 — 이용자의 관심사에 맞는 광고를 제공하고 광고 효과를 측정하기 위해 사용됩니다.

제공자 | 도구 | 목적 | 보존 기간 | 개인정보처리방침
Google LLC | Google Ads 전환 추적 | 광고 전환 측정 | 90일 | https://policies.google.com/privacy
Naver Corp. | 네이버 광고 전환 추적 픽셀 | 네이버 광고 전환 측정 | 90일 | https://policy.naver.com/policy/privacy.html

※ 실제 집행하는 광고 플랫폼 확정 후 위 목록을 업데이트하여야 합니다.`,
  },
  {
    title: '3. 제3자 쿠키',
    content: `위 분석·마케팅 쿠키 중 일부는 제3자(Google, Naver 등)가 직접 설치합니다. 회사는 이러한 제3자 쿠키의 데이터 처리에 대해 직접 통제하지 않으며, 각 제3자의 개인정보처리방침이 적용됩니다.

제3자 쿠키 제공자의 개인정보처리방침:
• Google: https://policies.google.com/privacy
• Naver: https://policy.naver.com/policy/privacy.html`,
  },
  {
    title: '4. 쿠키 동의 및 관리',
    content: `[쿠키 동의 배너]
이용자가 crypee 웹사이트에 최초 방문하는 경우, 쿠키 동의 배너를 통해 쿠키 종류별로 동의 여부를 선택할 수 있습니다.

• 필수 쿠키: 동의 여부와 무관하게 활성화 (서비스 이용 필수)
• 기능 쿠키: 이용자 선택 (기본값: 동의)
• 분석 쿠키: 이용자 선택 (기본값: 비동의, EU 이용자) / (기본값: 동의, 기타)
• 마케팅 쿠키: 이용자 선택 (기본값: 비동의)

[쿠키 동의 변경]
이용자는 언제든지 다음 방법으로 쿠키 동의를 변경할 수 있습니다.
① 서비스 내 쿠키 설정 메뉴: 계정 설정 또는 하단 푸터의 "쿠키 설정" 링크를 통해 변경
② 브라우저 설정: 각 브라우저의 설정에서 쿠키를 비활성화하거나 삭제할 수 있습니다.

※ EU ePrivacy Directive 및 GDPR에 따르면 비필수 쿠키는 사전 명시적 동의(opt-in)가 원칙입니다. 한국 개인정보 보호법에서는 별도의 쿠키 동의 규정이 명시적으로 규정되어 있지 않으나, 개인정보를 수집·처리하는 쿠키의 경우 동법 제15조에 따른 동의가 필요할 수 있습니다.`,
  },
  {
    title: '5. 브라우저 쿠키 관리 방법',
    content: `주요 브라우저 쿠키 관리 방법:
• Chrome: 설정 > 개인정보 보호 및 보안 > 쿠키 및 기타 사이트 데이터
• Firefox: 설정 > 개인 정보 및 보안 > 쿠키와 사이트 데이터
• Safari: 설정 > Safari > 개인정보 보호
• Edge: 설정 > 쿠키 및 사이트 권한 > 쿠키 및 사이트 데이터 관리

⚠️ 브라우저에서 쿠키를 전체 비활성화하는 경우 로그인 유지 등 일부 서비스 기능을 이용하지 못할 수 있습니다.`,
  },
  {
    title: '6. 쿠키 보존 기간 및 삭제',
    content: `• 세션 쿠키: 브라우저 종료 시 자동 삭제
• 영구 쿠키: 각 쿠키의 만료 기간에 따라 자동 삭제 (위기 표 참조)
• 이용자가 동의를 철회하는 경우 해당 쿠키는 즉시 삭제되거나 더 이상 수집되지 않습니다.`,
  },
  {
    title: '7. 한국 법령 적용',
    content: `한국의 「개인정보 보호법」은 쿠키를 별도로 규율하는 조항을 두고 있지 않으나, 쿠키를 통해 이용자를 식별할 수 있는 개인정보가 수집·처리되는 경우에는 동법 제15조의 수집·이용 요건이 적용됩니다. 회사는 이 점을 고려하여 개인정보를 처리하는 쿠키에 대해 이용자의 동의를 받거나 처리방침에 명시합니다.`,
  },
  {
    title: '8. GDPR / ePrivacy 적용 (EU/EEA 이용자)',
    content: `EU/EEA 소재 이용자에게는 ePrivacy Directive(Directive 2002/58/EC, 개정 2009/136/EC)가 적용됩니다. 이에 따라:

• 필수 쿠키를 제외한 모든 쿠키 설치·이용에는 사전 명시적 동의(opt-in)가 필요합니다.
• 이용자는 언제든지 동의를 철회할 수 있으며, 철회가 동의만큼 용이해야 합니다.
• 동의는 자유롭고(freely given), 구체적이며(specific), 정보에 입각하고(informed), 명확(unambiguous)하여야 합니다.
• GDPR Art. 6(1)(a)에 따라 비필수 쿠키 처리의 법적 근거는 이용자의 동의입니다.

※ ePrivacy Regulation(유럽의 새로운 쿠키 규정)이 아직 최종 입법 전이므로, 향후 변경 가능성이 있습니다.`,
  },
  {
    title: '9. 쿠키 정책 변경',
    content: `회사는 법령 변경, 기술 변화, 새로운 서비스 도구 도입 등에 따라 이 쿠키 정책을 변경할 수 있습니다. 변경 사항은 서비스 내 공지사항을 통해 시행 7일 전부터 게시합니다.

문의: contact@crypee.io | https://www.crypee.biz`,
  },
]

export default function CookiePage() {
  return (
    <div className="max-w-[760px] mx-auto pt-8 pb-20 animate-in">
      <h1 className="text-xl font-bold mb-1">쿠키 정책</h1>
      <p className="text-[12px] mb-6" style={{ color: 'var(--text-muted)' }}>주식회사 크리피솔루션즈 | 시행일: 2026.06.01</p>
      <div className="space-y-3">
        {sections.map((s, i) => (
          <div key={i} className="rounded-xl p-6 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-[15px] font-bold mb-3" style={{ color: 'var(--text)' }}>{s.title}</h2>
            <p className="text-[13.5px] leading-[1.9] whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{s.content}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-between">
        <Link href="/privacy" className="text-[12px] hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← 개인정보처리방침</Link>
        <Link href="/terms" className="text-[12px] hover:opacity-70" style={{ color: 'var(--text-muted)' }}>이용약관 →</Link>
      </div>
    </div>
  )
}
