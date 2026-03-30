'use client'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { useTheme } from './ThemeProvider'

export default function Nav() {
  const path = usePathname()
  const router = useRouter()
  const { user, isAdmin, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  const logout = async () => { await signOut(); router.push('/'); router.refresh(); setMenuOpen(false) }

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{background:'var(--bg-nav)',borderColor:'var(--border)'}}>
      <div className="max-w-[1120px] mx-auto flex items-center h-[52px] px-4 sm:px-5 gap-2">
        <Link href="/" className="font-extrabold text-base tracking-tight mr-4 sm:mr-6">
          <span style={{color:'var(--text)'}}>crypee</span><span style={{color:'var(--accent)'}}> Agent</span>
        </Link>

        {/* 데스크톱 메뉴 */}
        <div className="hidden md:flex gap-1">
          <NL href="/market" cur={path}>모듈</NL>
          <NL href="/request" cur={path}>모듈 문의</NL>
          {isAdmin && <NL href="/admin" cur={path}>어드민</NL>}
        </div>

        <div className="flex-1" />

        <button onClick={toggle} className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-sm border transition-all hover:opacity-80" style={{borderColor:'var(--border-strong)',background:'var(--surface)'}}>
          {theme==='dark'?'☀️':'🌙'}
        </button>

        {user ? (
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/mypage" className="text-[12px] hover:opacity-80" style={{color:'var(--text-secondary)'}}>마이페이지</Link>
            <Link href="/profile" className="w-[34px] h-[34px] rounded-full border flex items-center justify-center text-[12px] font-bold" style={{background:'var(--surface)',borderColor:'var(--border-strong)',color:'var(--text-secondary)'}}>
              {(user.representative||user.business_name||user.email||'U')[0].toUpperCase()}
            </Link>
            <button onClick={logout} className="text-[12px] ml-1 hover:opacity-80" style={{color:'var(--text-muted)'}}>로그아웃</button>
          </div>
        ) : (
          <div className="hidden sm:flex gap-2">
            <Link href="/login" className="px-3 py-1.5 text-[12px] hover:opacity-80" style={{color:'var(--text-secondary)'}}>로그인</Link>
            <Link href="/login?signup=1" className="px-3 py-1.5 font-semibold text-[12px] rounded-md" style={{background:'var(--accent)',color:'var(--bg)'}}>시작하기</Link>
          </div>
        )}

        {/* 모바일 햄버거 */}
        <button onClick={()=>setMenuOpen(!menuOpen)} className="md:hidden w-[34px] h-[34px] rounded-full flex items-center justify-center border" style={{borderColor:'var(--border-strong)',background:'var(--surface)'}}>
          <span className="text-[16px]">{menuOpen?'✕':'☰'}</span>
        </button>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {menuOpen && (
        <div className="md:hidden border-t px-4 pb-4 pt-2" style={{background:'var(--bg)',borderColor:'var(--border)'}}>
          <div className="flex flex-col gap-1">
            <MNL href="/market" cur={path} onClick={()=>setMenuOpen(false)}>모듈 마켓</MNL>
            <MNL href="/request" cur={path} onClick={()=>setMenuOpen(false)}>모듈 문의</MNL>
            {user && <MNL href="/mypage" cur={path} onClick={()=>setMenuOpen(false)}>마이페이지</MNL>}
            {user && <MNL href="/profile" cur={path} onClick={()=>setMenuOpen(false)}>프로필</MNL>}
            {user && <MNL href="/alerts" cur={path} onClick={()=>setMenuOpen(false)}>공고 알림</MNL>}
            {isAdmin && <MNL href="/admin" cur={path} onClick={()=>setMenuOpen(false)}>어드민</MNL>}
            <div className="border-t my-2" style={{borderColor:'var(--border)'}}/>
            {user ? (
              <button onClick={logout} className="text-left px-3 py-2.5 rounded-lg text-[13px]" style={{color:'var(--text-muted)'}}>로그아웃</button>
            ) : (
              <>
                <MNL href="/login" cur={path} onClick={()=>setMenuOpen(false)}>로그인</MNL>
                <Link href="/login?signup=1" onClick={()=>setMenuOpen(false)} className="px-3 py-2.5 rounded-lg text-[13px] font-semibold text-center" style={{background:'var(--accent)',color:'var(--bg)'}}>시작하기</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

function NL({ href, cur, children }: { href:string; cur:string; children:React.ReactNode }) {
  const active = cur.startsWith(href)
  return <Link href={href} className="px-3 py-1.5 text-[12.5px] font-medium rounded-md transition-all" style={{color:active?'var(--accent)':'var(--text-muted)',background:active?'var(--accent-bg)':'transparent'}}>{children}</Link>
}

function MNL({ href, cur, onClick, children }: { href:string; cur:string; onClick:()=>void; children:React.ReactNode }) {
  const active = cur.startsWith(href)
  return <Link href={href} onClick={onClick} className="px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all" style={{color:active?'var(--accent)':'var(--text-secondary)',background:active?'var(--accent-bg)':'transparent'}}>{children}</Link>
}
