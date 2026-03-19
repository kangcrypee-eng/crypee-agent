'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

export default function Nav() {
  const path = usePathname()
  const router = useRouter()
  const { user, isAdmin, credits, loading, signOut } = useAuth()

  const logout = async () => { await signOut(); router.push('/'); router.refresh() }

  return (
    <nav className="sticky top-0 z-50 bg-[#09090B]/80 backdrop-blur-xl border-b border-white/[.06]">
      <div className="max-w-[1120px] mx-auto flex items-center h-[52px] px-5 gap-2">
        <Link href="/" className="font-extrabold text-base tracking-tight mr-6">
          <span className="text-[#F4F4F5]">crypee</span><span className="text-[#00D4AA]"> Agent</span>
        </Link>
        <div className="hidden md:flex gap-1">
          <NL href="/market" cur={path}>모듈</NL>
          {user && <NL href="/mypage" cur={path}>마이페이지</NL>}
          {isAdmin && <NL href="/admin" cur={path}>어드민</NL>}
        </div>
        <div className="flex-1" />
        {loading ? null : user ? (
          <div className="flex items-center gap-2">
            <Link href="/mypage" className="flex items-center gap-1.5 px-3 py-1 bg-[rgba(0,212,170,0.1)] border border-[rgba(0,212,170,0.2)] rounded-2xl text-xs font-semibold text-[#00D4AA]">◆ {credits}</Link>
            <Link href="/profile" className="w-[30px] h-[30px] rounded-full bg-[#232328] border border-white/10 flex items-center justify-center text-[11px] font-bold text-[#A1A1AA]">
              {(user.representative||user.business_name||user.email||'U')[0].toUpperCase()}
            </Link>
            <button onClick={logout} className="text-[11px] text-[#63636E] hover:text-[#A1A1AA] ml-1">로그아웃</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link href="/login" className="px-3 py-1.5 text-[12px] text-[#A1A1AA] hover:text-white">로그인</Link>
            <Link href="/login?signup=1" className="px-3 py-1.5 bg-[#00D4AA] text-[#09090B] font-semibold text-[12px] rounded-md">회원가입</Link>
          </div>
        )}
      </div>
    </nav>
  )
}
function NL({ href, cur, children }: { href:string; cur:string; children:React.ReactNode }) {
  return <Link href={href} className={`px-3 py-1.5 text-[12.5px] font-medium rounded-md transition-all ${cur.startsWith(href)?'text-[#00D4AA] bg-[rgba(0,212,170,0.1)]':'text-[#63636E] hover:text-[#A1A1AA] hover:bg-[#18181B]'}`}>{children}</Link>
}
