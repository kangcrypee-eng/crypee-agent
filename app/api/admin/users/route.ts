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

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, business_name, representative, role, credits, created_at')
    .order('created_at', { ascending: false })

  if (!profiles) return NextResponse.json({ users: [] })

  // auth.users에서 마지막 로그인 시각 가져오기
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const authMap: Record<string, string> = {}
  for (const u of authData?.users || []) {
    authMap[u.id] = u.last_sign_in_at || ''
  }

  const users = profiles.map(p => ({
    ...p,
    last_sign_in_at: authMap[p.id] || null,
  }))

  return NextResponse.json({ users })
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdmin(request)
  if ('error' in auth) return auth.error

  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: '유저 ID 필요' }, { status: 400 })

  // 어드민 계정은 삭제 불가
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  if (profile?.role === 'admin') return NextResponse.json({ error: '어드민 계정은 삭제할 수 없습니다' }, { status: 403 })

  // Supabase Auth에서 삭제 (cascade로 profiles도 삭제됨)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
