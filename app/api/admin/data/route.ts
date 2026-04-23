import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/admin-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request)
  if ('error' in auth) return auth.error

  const [mods, pays, gens, subs, reqs] = await Promise.all([
    supabaseAdmin.from('modules').select('*').order('category').order('uses', { ascending: false }),
    supabaseAdmin.from('payments').select('*').eq('status', 'paid'),
    supabaseAdmin.from('generations').select('id, module_id, user_id, created_at'),
    supabaseAdmin.from('alert_subscriptions').select('*, profiles:user_id(email, business_name, representative)'),
    supabaseAdmin.from('module_requests').select('*').order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    modules: mods.data || [],
    payments: pays.data || [],
    generations: gens.data || [],
    subscribers: subs.data || [],
    requests: reqs.data || [],
  })
}
