'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { useTheme } from './ThemeProvider'

export default function Nav() {
  const path = usePathname()
  const router = useRouter()
  const { user, isAdmin, credits, signOut } = useAuth()
  const { theme, toggle } = useTheme()

  const logout = async () => { await signOut(); router.push('/'); router.refresh() }

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{background:'var(--bg-nav)',borderColor:'var(--border)'}}>
      <div className="max-w-[1120px] mx-auto flex items-center h-[52px] px-5 gap-2">
        <Link href="/" className="font-extrabold text-base tracking-tight mr-6">
          <span style={{color:'var(--text)'}}>crypee</span><span style={{color:'var(--accent)'}}> Agent</span>
        </Link>
        <div className="hidden md:flex gap-1">
          <NL href="/market" cur={path}>모듈</NL>
          {user && <NL href="/mypage" cur={path}>마이페이지</NL>}
          {isAdmin && <NL href="/admin" cur={path}>어드민</NL>}
        </div>
        <div className="flex-1" />
        <button onClick={toggle} className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm border transition-all hover:opacity-80" style={{borderColor:'var(--border-strong)',background:'var(--surface)'}}>
          {theme==='dark'?'☀️':'🌙'}
        </button>
        {user ? (
          <div className="flex items-center gap-2">
            <Link href="/credits" className="flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-semibold" style={{background:'var(--accent-bg)',border:'1px solid var(--accent-border)',color:'var(--accent)'}}>◆ {credits}</Link>
            <Link href="/profile" className="w-[30px] h-[30px] rounded-full border flex items-center justify-center text-[11px] font-bold" style={{background:'var(--surface)',borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>
              {(user.representative||user.business_name||user.email||'U')[0].toUpperCase()}
            </Link>
            <button onClick={logout} className="text-[11px] ml-1 hover:opacity-80" style={{color:'var(--text-muted)'}}>로그아웃</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link href="/login" className="px-3 py-1.5 text-[12px] hover:opacity-80" style={{color:'var(--text-secondary)'}}>로그인</Link>
            <Link href="/login?signup=1" className="px-3 py-1.5 font-semibold text-[12px] rounded-md" style={{background:'var(--accent)',color:'var(--bg)'}}>회원가입</Link>
          </div>
        )}
      </div>
    </nav>
  )
}
function NL({ href, cur, children }: { href:string; cur:string; children:React.ReactNode }) {
  const active = cur.startsWith(href)
  return <Link href={href} className="px-3 py-1.5 text-[12.5px] font-medium rounded-md transition-all" style={{color:active?'var(--accent)':'var(--text-muted)',background:active?'var(--accent-bg)':'transparent'}}>{children}</Link>
}
