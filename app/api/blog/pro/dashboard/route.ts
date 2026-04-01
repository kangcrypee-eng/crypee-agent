import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId 필요' }, { status: 400 })

  // 구독 정보
  const { data: sub } = await supabaseAdmin
    .from('blogpilot_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!sub) return NextResponse.json({ subscription: null, photos: [], posts: [] })

  // 사진 카테고리별 집계
  const { data: photos } = await supabaseAdmin
    .from('blogpilot_photos')
    .select('id, category, is_available, last_used_at, cdn_url')
    .eq('subscription_id', sub.id)
    .eq('is_available', true)

  const photoCounts: Record<string, number> = {}
  const availablePhotos: Record<string, number> = {}
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  for (const p of photos || []) {
    photoCounts[p.category] = (photoCounts[p.category] || 0) + 1
    if (!p.last_used_at || new Date(p.last_used_at) < thirtyDaysAgo) {
      availablePhotos[p.category] = (availablePhotos[p.category] || 0) + 1
    }
  }

  const totalAvailable = Object.values(availablePhotos).reduce((a, b) => a + b, 0)
  const postsAvailable = Math.floor(totalAvailable / 3)

  // 최근 발행 글
  const { data: posts } = await supabaseAdmin
    .from('blogpilot_scheduled_posts')
    .select('id, scheduled_date, generated_title, status, delivery_status, delivered_at')
    .eq('subscription_id', sub.id)
    .order('scheduled_date', { ascending: false })
    .limit(10)

  return NextResponse.json({
    subscription: sub,
    photoCounts,
    availablePhotos,
    totalPhotos: (photos || []).length,
    totalAvailable,
    postsAvailable,
    recentPosts: posts || [],
  })
}
