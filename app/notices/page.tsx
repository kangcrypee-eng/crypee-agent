import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '공지사항',
  description: 'crypee Agent 서비스 공지사항',
}

type Notice = {
  id: number
  date: string
  category: '약관' | '서비스' | '결제' | '보안' | '점검'
  title: string
  content: string
  link?: { label: string; href: string }
}

const notices: Notice[] = [
  {
    id: 5,
    date: '2026-05-27',
    category: '약관',
    title: '쿠키 정책 신규 게시 안내 (2026.06.01 시행)',
    content: `crypee Agent 쿠키 정책이 신규 게시됩니다.

주요 내용:
• 필수 쿠키, 기능 쿠키, 분석 쿠키, 마케팅 쿠키 4종류 구분 안내
• Google Analytics 4(GA4), 네이버 광고 픽셀 사용 명시
• 쿠키 동의 배너 운영 및 동의 철회 방법 안내
• EU/EEA 이용자 대상 ePrivacy Directive 적용 기준 안내
• 브라우저별 쿠키 관리 방법 안내

시행일: 2026년 6월 1일`,
    link: { label: '쿠키 정책 확인하기', href: '/cookie' },
  },
  {
    id: 4,
    date: '2026-05-27',
    category: '약관',
    title: '환불·취소 정책 신규 게시 안내 (2026.06.01 시행)',
    content: `crypee Agent 환불·취소 정책이 신규 게시됩니다.

주요 내용:
• 「전자상거래 등에서의 소비자보호에 관한 법률」(법률 제21312호) 기반 청약철회 기준 명시
• 구독 계약 체결일로부터 7일 이내 청약철회 가능
• AI 모듈 사용 시작(서비스 제공 개시) 후 청약철회 제한 사유 안내
• 회사 귀책(서비스 장애·이중 결제 등) 시 환불 기준 안내
• 환불 요청 절차 및 처리 기간(3영업일 이내 검토) 안내
• 소비자 분쟁 해결 기관 안내 (한국소비자원 1372)

시행일: 2026년 6월 1일`,
    link: { label: '환불·취소 정책 확인하기', href: '/refund' },
  },
  {
    id: 3,
    date: '2026-05-27',
    category: '약관',
    title: '개인정보처리방침 개정 안내 (2026.06.01 시행)',
    content: `crypee Agent 개인정보처리방침이 개정됩니다.

주요 변경 내용:
• 수집 항목 및 법적 근거 조항 번호 명시 (개인정보 보호법 제15조)
• AI 모듈 입력 데이터 처리 목적 및 보존 기간 명확화
• AI 모델 학습 목적 데이터 미사용 원칙 명시
• 개인정보 처리 수탁자 목록 업데이트 (Supabase, Anthropic, Vercel, Resend, 토스페이먼츠)
• 개인정보 해외 이전 내용 명시 (미국, 일본)
• 정보주체의 자동화된 결정 거부권(법 제37조의2) 안내 추가
• EU/EEA 이용자 대상 GDPR 별도 섹션 추가

시행일: 2026년 6월 1일`,
    link: { label: '개인정보처리방침 확인하기', href: '/privacy' },
  },
  {
    id: 2,
    date: '2026-05-27',
    category: '약관',
    title: '서비스 이용약관 개정 안내 (2026.06.01 시행)',
    content: `crypee Agent 서비스 이용약관이 개정됩니다.

주요 변경 내용:
• 「인공지능 발전과 신뢰 기반 조성 등에 관한 기본법」(AI기본법) 제31조 반영
  — 생성형 AI 서비스 사전 고지 의무 및 AI 출력물 표시 의무 명시
• 구독 계약 조항 신설 (자동 갱신, 요금 변경 사전 안내 등)
• AI 출력물 지식재산권 귀속 조항 상세화 (저작권 법적 불확실성 안내 포함)
• 청약철회 조항 전자상거래법 제17조 기준으로 정비
• 이용자 금지 행위 항목 구체화 (AI 출력물 사칭 행위 포함)
• 회사 면책 한도 조항 신설
• 분쟁 해결 및 소비자 분쟁 조정 기관 안내 추가

시행일: 2026년 6월 1일`,
    link: { label: '이용약관 확인하기', href: '/terms' },
  },
  {
    id: 1,
    date: '2026-05-27',
    category: '서비스',
    title: '모두의 창업 지원서 모듈 출시',
    content: `모두의 창업 프로그램 지원서를 AI로 자동 작성해주는 신규 모듈이 출시되었습니다.

• 사업 아이디어, 준비 현황 등 기본 정보 입력만으로 완성도 높은 지원서 초안 생성
• 네이버에서 "모두의 창업" 검색 시 확인 가능
• 이용 요금: ₩990

모듈 마켓에서 바로 이용하세요.`,
    link: { label: '모듈 마켓 바로가기', href: '/market' },
  },
]

const categoryColor: Record<Notice['category'], string> = {
  약관: '#3b82f6',
  서비스: '#00B894',
  결제: '#f59e0b',
  보안: '#ef4444',
  점검: '#6b7280',
}

export default function NoticesPage() {
  return (
    <div className="max-w-[760px] mx-auto pt-8 pb-20 animate-in">
      <h1 className="text-xl font-bold mb-1">공지사항</h1>
      <p className="text-[12px] mb-8" style={{ color: 'var(--text-muted)' }}>crypee Agent 서비스 공지사항입니다.</p>

      <div className="space-y-4">
        {notices.map((notice) => (
          <div key={notice.id} className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: categoryColor[notice.category] + '1a', color: categoryColor[notice.category] }}
              >
                {notice.category}
              </span>
              <h2 className="text-[14px] font-semibold flex-1" style={{ color: 'var(--text)' }}>{notice.title}</h2>
              <span className="text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>{notice.date}</span>
            </div>
            <div className="px-6 py-4">
              <p className="text-[13px] leading-[1.9] whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{notice.content}</p>
              {notice.link && (
                <Link
                  href={notice.link.href}
                  className="inline-block mt-3 text-[12.5px] font-medium hover:opacity-80"
                  style={{ color: 'var(--accent)' }}
                >
                  {notice.link.label} →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
