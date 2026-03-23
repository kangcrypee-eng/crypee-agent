'use client'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string; role: string; business_name?: string; representative?: string;
  business_number?: string; business_type?: string; sector?: string; item?: string;
  service_desc?: string; target_customer?: string; track_record?: string;
  address?: string; phone?: string; email?: string; opening_date?: string; credits: number;
}

interface AuthCtx {
  user: Profile | null; loading: boolean; isAdmin: boolean; credits: number;
  setCredits: (n: number) => void; signOut: () => Promise<void>; refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user:null, loading:true, isAdmin:false, credits:0, setCredits:()=>{}, signOut:async()=>{}, refresh:async()=>{} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState(0)

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setUser(null); setCredits(0); setLoading(false); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (data) { setUser(data as Profile); setCredits(data.credits || 0) }
      else { setUser(null); setCredits(0) }
    } catch (e) { console.error('Auth:', e) }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setUser(null); setCredits(0); setLoading(false) }
      else load()
    })
    return () => subscription.unsubscribe()
  }, [load])

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(null); setCredits(0)
  }

  return <Ctx.Provider value={{ user, loading, isAdmin: user?.role==='admin', credits, setCredits, signOut, refresh:load }}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)
