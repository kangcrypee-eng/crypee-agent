import './globals.css'
import { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { AuthProvider } from '@/components/AuthProvider'
export const metadata: Metadata = { title: 'crypee Agent', description: '사업 운영에 필요한 모든 것' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="ko"><body><AuthProvider><Nav /><main className="max-w-[1120px] mx-auto px-5">{children}</main><Footer /></AuthProvider></body></html>)
}
