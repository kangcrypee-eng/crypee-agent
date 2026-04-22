import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request)
  if ('error' in auth) return auth.error

  const { name, description, category, systemPrompt } = await request.json()
  if (!name || !systemPrompt) return NextResponse.json({ error: '필수값 누락' }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API 키 없음' }, { status: 500 })

  const prompt = `아래 AI 모듈의 홍보 이미지용 카피를 작성해주세요.

모듈명: ${name}
설명: ${description || ''}
카테고리: ${category || ''}
시스템 프롬프트 요약: ${systemPrompt.substring(0, 500)}

아래 JSON 형식으로만 응답하세요 (설명 없이 JSON만):
{
  "headline": "메인 카피 (2줄, 임팩트 있게, 개행은 \\n으로)",
  "subtext": "서브 카피 (1~2줄, 핵심 기능/혜택 요약)",
  "cta": "CTA 문구 (10자 이내)",
  "tags": ["해시태그1", "해시태그2", "해시태그3"]
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: 'Claude 오류' }, { status: 502 })

  const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const copy = JSON.parse(jsonMatch?.[0] || text)
    return NextResponse.json({ copy })
  } catch {
    return NextResponse.json({ error: '파싱 실패', raw: text }, { status: 500 })
  }
}
