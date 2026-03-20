'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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

  const load = async () => {
    if (!supabase) { setLoading(false); return }
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Auth timeout')), 5000))
    try {
      const { data: { user: au } } = await Promise.race([supabase.auth.getUser(), timeout])
      if (!au) { setUser(null); setLoading(false); return }
      const { data } = await Promise.race([supabase.from('profiles').select('*').eq('id', au.id).single(), timeout])
      if (data) { setUser(data as Profile); setCredits(data.credits || 0) }
    } catch (e) { console.error('Auth:', e) }
    setLoading(false)
  }

  useEffect(() => {
    load()
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load())
    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setUser(null); setCredits(0) }

  return <Ctx.Provider value={{ user, loading, isAdmin: user?.role==='admin', credits, setCredits, signOut, refresh:load }}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)
