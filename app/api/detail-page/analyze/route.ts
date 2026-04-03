import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { getReferenceAnalysisPrompt, getPhotoAnalysisPrompt } from '@/lib/detail-page-prompts'

export const maxDuration = 120

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

async function callVision(imageUrl: string, prompt: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY 미설정')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
      ]}],
    }),
  })
  if (!res.ok) throw new Error(`Vision API ${res.status}`)
  const data = await res.json()
  try { return JSON.parse(data.choices?.[0]?.message?.content || '{}') } catch { return {} }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const userId = formData.get('userId') as string
    const referenceFiles = formData.getAll('references') as File[]
    const productFiles = formData.getAll('products') as File[]
    const productTags = formData.get('productTags') as string // JSON array

    if (!userId) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 400 })

    const results: any = { references: [], products: [] }

    // 1. 레퍼런스 이미지 업로드 + 분석 (최대 3장만, 1번 호출로 합침)
    const refUrls: string[] = []
    for (const file of referenceFiles.slice(0, 3)) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const processed = await sharp(buffer).resize({ width: 800, withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer()
      const filename = `${userId}/detail-ref/${crypto.randomUUID()}.jpg`
      await supabaseAdmin.storage.from('blog-photos').upload(filename, processed, { contentType: 'image/jpeg' })
      const { data: urlData } = supabaseAdmin.storage.from('blog-photos').getPublicUrl(filename)
      refUrls.push(urlData.publicUrl)
    }
    // 레퍼런스 1번만 Vision 호출 (첫 번째 이미지로 대표 분석)
    if (refUrls.length > 0) {
      const analysis = await callVision(refUrls[0], getReferenceAnalysisPrompt())
      results.references.push({ cdnUrl: refUrls[0], analysis })
    }

    // 2. 상품 사진 업로드 (먼저 전부 업로드, 그 다음 Vision 병렬 호출)
    const tags = productTags ? JSON.parse(productTags) : []
    const uploadedProducts: { cdnUrl: string; tag: string; idx: number }[] = []

    for (let i = 0; i < productFiles.length; i++) {
      const file = productFiles[i]
      const buffer = Buffer.from(await file.arrayBuffer())
      const processed = await sharp(buffer).resize({ width: 860, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer()
      const filename = `${userId}/detail-product/${crypto.randomUUID()}.jpg`
      await supabaseAdmin.storage.from('blog-photos').upload(filename, processed, { contentType: 'image/jpeg' })
      const { data: urlData } = supabaseAdmin.storage.from('blog-photos').getPublicUrl(filename)
      uploadedProducts.push({ cdnUrl: urlData.publicUrl, tag: tags[i] || 'detail', idx: i })
    }

    // Vision 분석 병렬 (최대 5개씩)
    for (let i = 0; i < uploadedProducts.length; i += 5) {
      const batch = uploadedProducts.slice(i, i + 5)
      const batchResults = await Promise.all(
        batch.map(async (p) => {
          try {
            const analysis = await callVision(p.cdnUrl, getPhotoAnalysisPrompt())
            return { cdnUrl: p.cdnUrl, tag: p.tag !== 'detail' ? p.tag : (analysis.suggested_tag || 'detail'), analysis }
          } catch {
            return { cdnUrl: p.cdnUrl, tag: p.tag, analysis: { description: '', suggested_section: 'feature' } }
          }
        })
      )
      results.products.push(...batchResults)
    }

    // 레퍼런스 분석 결과 병합 (여러 장의 공통 패턴 추출)
    let mergedDesign = null
    if (results.references.length > 0) {
      const first = results.references[0].analysis
      mergedDesign = {
        ...first,
        // 여러 레퍼런스에서 공통 요소 추출
        layout_structure: first.layout_structure || [],
        design_tone: first.design_tone || 'minimal_white',
        color_scheme: first.color_scheme || {},
      }
    }

    return NextResponse.json({
      referenceDesign: mergedDesign,
      products: results.products,
      referenceCount: results.references.length,
      productCount: results.products.length,
    })
  } catch (error: any) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: error.message || '분석 실패' }, { status: 500 })
  }
}
