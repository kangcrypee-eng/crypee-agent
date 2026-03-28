import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const start = Date.now()
  try {
    const { moduleId, systemPrompt, userPrompt, aiModel, maxTokens, temperature, profileData, additionalData, stream: useStream } = await request.json()
    let fullPrompt = userPrompt || ''
    const allData = { ...profileData, ...additionalData }
    for (const [key, value] of Object.entries(allData)) {
      fullPrompt = fullPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), (value as string) || '(미입력)')
    }
    fullPrompt = fullPrompt.replace(/\{\{[^}]+\}\}/g, '(미입력)')

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: true, result: `[시뮬레이션 모드]\nAPI 키 미설정. 모듈: ${moduleId}`, usage: { input_tokens: 0, output_tokens: 0, model: aiModel, generation_time_ms: 0 } })
    }

    const isBP = moduleId?.startsWith('BP')
    const model = isBP ? 'claude-sonnet-4-6' : (aiModel || 'claude-sonnet-4-6')
    // 파트 분할 시 각 파트에 적절한 토큰 할당
    const baseMaxTokens = isBP ? 8000 : (maxTokens || 4096)
    const sysPrompt = (systemPrompt || '') + (isBP ? '\n\n[중요 지시사항]\n- 지정된 섹션을 빠짐없이 끝까지 완성하세요\n- 절대 중간에 생략하거나 요약하지 마세요\n- 각 항목을 구체적이고 상세하게 작성하세요\n- 표가 필요한 곳에는 반드시 마크다운 표를 포함하세요' : '')
    const body = { model, max_tokens: baseMaxTokens, temperature: temperature ?? 0.3, system: sysPrompt, messages: [{ role: 'user', content: fullPrompt }], stream: !!useStream }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
    })

    // 스트리밍 모드
    if (useStream) {
      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}))
        return NextResponse.json({ success: false, error: (errData as any).error?.message || `API ${res.status}` }, { status: 502 })
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let sseBuffer = '' // SSE 파싱용 버퍼 (청크 경계 처리)

      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              sseBuffer += decoder.decode(value, { stream: true })
              // 완전한 줄 단위로만 파싱 (청크 경계 버그 방지)
              const lines = sseBuffer.split('\n')
              sseBuffer = lines.pop() || '' // 마지막 불완전한 줄은 버퍼에 유지
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') continue
                  try {
                    const parsed = JSON.parse(data)
                    if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                      controller.enqueue(new TextEncoder().encode(parsed.delta.text))
                    }
                    if (parsed.type === 'message_delta' && parsed.usage) {
                      controller.enqueue(new TextEncoder().encode(`\n\n<!--USAGE:${JSON.stringify({ input_tokens: parsed.usage.input_tokens || 0, output_tokens: parsed.usage.output_tokens || 0, model, generation_time_ms: Date.now() - start })}-->`))
                    }
                  } catch {}
                }
              }
            }
            // 버퍼에 남은 데이터 처리
            if (sseBuffer.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(sseBuffer.slice(6))
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  controller.enqueue(new TextEncoder().encode(parsed.delta.text))
                }
              } catch {}
            }
          } catch (e) {
            console.error('Stream error:', e)
          }
          controller.close()
        }
      })

      return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
      })
    }

    // 일반 모드
    const data = await res.json()
    if (!res.ok || data.error) {
      return NextResponse.json({ success: false, error: data.error?.message || `API ${res.status}` }, { status: 502 })
    }
    const result = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
    return NextResponse.json({ success: true, result, usage: { input_tokens: data.usage?.input_tokens || 0, output_tokens: data.usage?.output_tokens || 0, model, generation_time_ms: Date.now() - start } })
  } catch (error: any) {
    console.error('Generate error:', error)
    return NextResponse.json({ success: false, error: error.message || '생성 중 오류가 발생했습니다' }, { status: 500 })
  }
}
