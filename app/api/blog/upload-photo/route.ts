import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const postId = formData.get('postId') as string

    if (!file || !userId || !postId) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 })
    }

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: '파일 크기는 20MB 이하여야 합니다' }, { status: 400 })
    }

    // 파일 → Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // sharp로 리사이즈 + 압축
    let quality = 85
    let processed = await sharp(buffer)
      .resize({ width: 860, withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer()

    // 300KB 이하가 될 때까지 품질 낮춤
    while (processed.length > 300 * 1024 && quality > 30) {
      quality -= 10
      processed = await sharp(buffer)
        .resize({ width: 860, withoutEnlargement: true })
        .jpeg({ quality })
        .toBuffer()
    }

    // 메타데이터 (리사이즈 후 크기)
    const metadata = await sharp(processed).metadata()

    // Supabase Storage 업로드
    const filename = `${userId}/${postId}/${crypto.randomUUID()}.jpg`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('blog-photos')
      .upload(filename, processed, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
      })

    if (uploadError) {
      console.error('Upload error:', JSON.stringify(uploadError))
      return NextResponse.json({ error: `사진 업로드 실패: ${uploadError.message}` }, { status: 500 })
    }

    // Public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('blog-photos')
      .getPublicUrl(filename)

    return NextResponse.json({
      cdnUrl: urlData.publicUrl,
      width: metadata.width || 860,
      height: metadata.height || 0,
      originalFilename: file.name,
    })
  } catch (error: any) {
    console.error('Photo upload error:', error)
    return NextResponse.json({ error: error.message || '사진 처리 중 오류' }, { status: 500 })
  }
}
