import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { name, description, category, promoCopy } = await request.json()
  if (!name) return NextResponse.json({ error: '필수값 누락' }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API 키 없음' }, { status: 500 })

  const headline = promoCopy?.headline || ''
  const subtext = promoCopy?.subtext || ''
  const cta = promoCopy?.cta || ''
  const tags = (promoCopy?.tags || []).join(', ')

  const prompt = `아래 AI 모듈의 SNS 광고 이미지 제작 가이드를 작성해주세요.

모듈명: ${name}
설명: ${description || ''}
카테고리: ${category || ''}
메인 카피: ${headline}
서브 카피: ${subtext}
CTA: ${cta}
해시태그: ${tags}

아래 JSON 형식으로만 응답하세요 (설명 없이 JSON만):
{
  "concept": "이미지 컨셉 한 줄 설명",
  "background": {
    "type": "solid | gradient | photo",
    "colors": ["#색상코드1", "#색상코드2"],
    "description": "배경 설명"
  },
  "layout": "레이아웃 설명 (텍스트/요소 배치)",
  "visual_elements": ["시각적 요소1", "시각적 요소2", "시각적 요소3"],
  "typography": {
    "headline_style": "헤드라인 폰트 스타일 설명",
    "font_recommendation": "추천 폰트명"
  },
  "color_palette": ["#메인색", "#강조색", "#텍스트색", "#배경색"],
  "platforms": [
    {"name": "인스타그램 피드", "size": "1080x1080", "tip": "플랫폼별 주의사항"},
    {"name": "인스타그램 스토리", "size": "1080x1920", "tip": "플랫폼별 주의사항"},
    {"name": "카카오 채널", "size": "800x400", "tip": "플랫폼별 주의사항"}
  ],
  "do": ["해야 할 것1", "해야 할 것2", "해야 할 것3"],
  "dont": ["하지 말아야 할 것1", "하지 말아야 할 것2"]
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
