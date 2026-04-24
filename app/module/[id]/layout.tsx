import { createClient } from '@supabase/supabase-js'
import { Metadata } from 'next'

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data: m } = await supabaseServer
    .from('modules')
    .select('name, description, icon, price_krw, mode')
    .eq('id', params.id)
    .single()

  if (!m) {
    return {
      title: 'crypee Agent — AI 모듈',
      description: '비즈니스에 필요한 AI 모듈을 지금 바로 사용해보세요.',
    }
  }

  const price = m.price_krw || 0
  const priceText = price === 0 ? '무료' : `₩${price.toLocaleString()}`
  const modeText: Record<string, string> = { oneclick: '원클릭', form: '폼 작성', chat: '대화형', alert: '자동 알림' }
  const title = `${m.icon || ''} ${m.name} — crypee Agent`
  const description = `${m.description} | ${modeText[m.mode] || ''} · ${priceText}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.crypee.biz'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${appUrl}/module/${params.id}`,
      siteName: 'crypee Agent',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default function ModuleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
