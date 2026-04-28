import './globals.css'
import { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { AuthProvider } from '@/components/AuthProvider'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: { default: 'crypee Agent — AI 사업 운영 도구', template: '%s | crypee Agent' },
  description: '사업계획서, 계약서, 마케팅, 분석, 자동화 알림까지. 전문가가 설계한 AI 에이전트 모듈로 사업 운영에 필요한 모든 것을 해결하세요.',
  keywords: ['AI', '사업계획서', '계약서', '마케팅', 'SWOT', '정부지원사업', '소상공인', '스타트업', 'crypee'],
  metadataBase: new URL('https://www.crypee.biz'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://www.crypee.biz',
    siteName: 'crypee Agent',
    title: 'crypee Agent — AI 사업 운영 도구',
    description: '사업계획서, 계약서, 마케팅, 분석, 자동화 알림까지. AI 에이전트 모듈로 빠르게 해결하세요.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'crypee Agent' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'crypee Agent — AI 사업 운영 도구',
    description: '전문가가 설계한 AI 에이전트 모듈로 사업 운영에 필요한 모든 것을 해결하세요.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/apple-touch-icon.png',
  },
  verification: {
    google: '',
    other: {
      'naver-site-verification': 'd7d375704bfbae7791cc6f42227bd274c97e894c',
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t)}catch(e){}` }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <Nav />
            <main className="max-w-[1120px] mx-auto px-5">{children}</main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
