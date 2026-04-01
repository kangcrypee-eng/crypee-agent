import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const userId = formData.get('userId') as string
    const subscriptionId = formData.get('subscriptionId') as string
    const files = formData.getAll('files') as File[]

    if (!userId || !files.length) {
      return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
    }

    const results = []
    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        let quality = 85
        let processed = await sharp(buffer)
          .resize({ width: 860, withoutEnlargement: true })
          .jpeg({ quality })
          .toBuffer()

        while (processed.length > 300 * 1024 && quality > 30) {
          quality -= 10
          processed = await sharp(buffer)
            .resize({ width: 860, withoutEnlargement: true })
            .jpeg({ quality })
            .toBuffer()
        }

        const metadata = await sharp(processed).metadata()
        const filename = `${userId}/pro-pool/${crypto.randomUUID()}.jpg`

        const { error: uploadError } = await supabaseAdmin.storage
          .from('blog-photos')
          .upload(filename, processed, { contentType: 'image/jpeg', cacheControl: '31536000' })

        if (uploadError) { console.error('Upload error:', uploadError); continue }

        const { data: urlData } = supabaseAdmin.storage.from('blog-photos').getPublicUrl(filename)

        const { data: photo } = await supabaseAdmin.from('blogpilot_photos').insert({
          user_id: userId,
          subscription_id: subscriptionId || null,
          cdn_url: urlData.publicUrl,
          original_filename: file.name,
          category: 'unclassified',
          width: metadata.width || 860,
          height: metadata.height || 0,
        }).select('id').single()

        results.push({ id: photo?.id, cdnUrl: urlData.publicUrl, filename: file.name })
      } catch (e) {
        console.error('Photo process error:', e)
      }
    }

    return NextResponse.json({ uploaded: results.length, photos: results })
  } catch (error: any) {
    console.error('Bulk upload error:', error)
    return NextResponse.json({ error: error.message || '업로드 실패' }, { status: 500 })
  }
}
