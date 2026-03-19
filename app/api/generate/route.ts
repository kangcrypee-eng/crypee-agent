import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const start = Date.now()
  try {
    const { moduleId, systemPrompt, userPrompt, aiModel, maxTokens, temperature, profileData, additionalData } = await request.json()
    let fullPrompt = userPrompt || ''
    const allData = { ...profileData, ...additionalData }
    for (const [key, value] of Object.entries(allData)) {
      fullPrompt = fullPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), (value as string) || '(미입력)')
    }
    fullPrompt = fullPrompt.replace(/\{\{[^}]+\}\}/g, '(미입력)')

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: true, result: `[시뮬레이션 모드]\n\nAPI 키가 설정되지 않았습니다.\n모듈: ${moduleId}\n모델: ${aiModel}\n\n.env.local에 ANTHROPIC_API_KEY를 추가하면 실제 AI 생성이 작동합니다.\n\n--- 전달된 프롬프트 ---\n${fullPrompt.substring(0, 500)}...`, usage: { input_tokens: 0, output_tokens: 0, model: aiModel, generation_time_ms: Date.now()-start } })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: aiModel || 'claude-sonnet-4-5-20250929', max_tokens: maxTokens || 4096, temperature: temperature ?? 0.3, system: systemPrompt || '', messages: [{ role: 'user', content: fullPrompt }] }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message || 'API error')
    const result = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
    return NextResponse.json({ success: true, result, usage: { input_tokens: data.usage?.input_tokens || 0, output_tokens: data.usage?.output_tokens || 0, model: aiModel, generation_time_ms: Date.now() - start } })
  } catch (error: any) {
    console.error('Generate error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
