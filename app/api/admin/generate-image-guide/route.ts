import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request)
  if ('error' in auth) return auth.error

  const { name, description, category, promoCopy } = await request.json()
  if (!name) return NextResponse.json({ error: '필수값 누락' }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API 키 없음' }, { status: 500 })

  const headline = promoCopy?.headline || ''
  const subtext = promoCopy?.subtext || ''
  const cta = promoCopy?.cta || ''
  const tags = (promoCopy?.tags || []).join(', ')

  const prompt = `아래 AI 모듈의 SNS 광고 이미지에 들어갈 텍스트를 추천해주세요.

모듈명: ${name}
설명: ${description || ''}
카테고리: ${category || ''}
메인 카피: ${headline}
서브 카피: ${subtext}
CTA: ${cta}
해시태그: ${tags}

아래 JSON 형식으로만 응답하세요 (설명 없이 JSON만):
{
  "headline": "이미지 메인 텍스트 (2줄 이내, 임팩트 있게, 개행은 \\n으로)",
  "subheadline": "이미지 서브 텍스트 (1줄, 핵심 혜택)",
  "badge": "이미지 상단 뱃지 텍스트 (예: 🆕 NEW · AI 자동화 · 창업 필수템, 10자 이내)",
  "cta_button": "버튼 텍스트 (6자 이내)",
  "caption": "SNS 게시물 본문 캡션 (2~3줄, 이모지 포함, 해시태그 제외)",
  "hashtags": ["해시태그1", "해시태그2", "해시태그3", "해시태그4", "해시태그5"]
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: 'Claude 오류' }, { status: 502 })

  const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const guide = JSON.parse(jsonMatch?.[0] || text)
    return NextResponse.json({ guide })
  } catch {
    return NextResponse.json({ error: '파싱 실패', raw: text }, { status: 500 })
  }
}
