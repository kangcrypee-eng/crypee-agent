import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const PHASE1_PROMPT = `이 정부지원사업 공고문을 분석하세요.
아래 항목들을 JSON 형태로 추출하세요.
공고에 해당 항목이 없으면 빈 값으로 두세요.
공고에 있는 항목만 추출하고, 없는 항목을 추측하지 마세요.

추출할 항목:
1. program_name: 사업명
2. organization: 주관 기관
3. field: 지원 분야
4. eligibility: 지원 자격 (배열, 각 조건)
5. budget: 지원 규모 (총 예산, 기업당)
6. period: 사업 기간
7. evaluation: 심사 항목 (배열)
   각 항목: { "name": "항목명", "score": 배점, "criteria": ["세부기준1", "세부기준2"] }
8. bonus: 가산점 항목 (배열)
9. documents: 제출 서류 (배열)
10. schedule: 접수 기간/방법
11. etc: 기타 특이사항

반드시 유효한 JSON만 출력하세요. 설명 텍스트 없이 JSON만.`

const PHASE2_PROMPT = `이 사업계획서 양식을 분석하세요.
양식에 있는 그대로 추출하세요. 없는 섹션을 추가하지 마세요.

추출할 항목 (JSON):
1. total_pages: 전체 페이지 제한 (명시 안 되면 null)
2. sections: 섹션 목록 (배열)
   각 섹션: { "number": "번호", "title": "제목", "page_limit": 페이지제한(null이면없음), "required_items": ["필수 기재 항목들"], "notes": "작성 시 주의사항" }
3. format: 서식 요구사항 (글꼴, 크기, 줄간격 등, 명시된 것만)
4. required_tables: 필수 표/도표 목록
5. etc: 기타 양식 특이사항

반드시 유효한 JSON만 출력하세요. 설명 텍스트 없이 JSON만.`

async function callClaude(systemPrompt: string, userContent: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('API 키 없음')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Claude API 오류')
  const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')

  // JSON 추출 (코드블록 안에 있을 수 있음)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text]
  try {
    return JSON.parse(jsonMatch[1]?.trim() || text.trim())
  } catch {
    return { raw: text, parseError: true }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const announcementFile = formData.get('announcement') as File | null
    const templateFile = formData.get('template') as File | null
    const existingFile = formData.get('existing') as File | null

    if (!announcementFile || !templateFile) {
      return NextResponse.json({ error: '공고문과 양식 파일을 모두 업로드해주세요' }, { status: 400 })
    }

    // PDF 텍스트 추출 (unpdf + CMap CDN for Korean CIDFont)
    const { getDocumentProxy } = await import('unpdf')
    const extractText = async (file: File): Promise<string> => {
      const arrayBuffer = await file.arrayBuffer()
      if (file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const doc = await getDocumentProxy(new Uint8Array(arrayBuffer), {
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/cmaps/',
            cMapPacked: true, useSystemFonts: true,
          })
          const pages: string[] = []
          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i)
            const content = await page.getTextContent()
            pages.push(content.items.filter((it: any) => it.str !== undefined).map((it: any) => it.str).join(' '))
          }
          return pages.join('\n\n')
        } catch { return Buffer.from(arrayBuffer).toString('utf-8') }
      }
      return Buffer.from(arrayBuffer).toString('utf-8')
    }

    const announcementText = await extractText(announcementFile)
    const templateText = await extractText(templateFile)

    if (!announcementText.trim()) {
      return NextResponse.json({ error: '공고문에서 텍스트를 추출할 수 없습니다. PDF 파일을 확인해주세요.' }, { status: 400 })
    }

    // Phase 1: 공고문 분석
    const phase1 = await callClaude(PHASE1_PROMPT, `[공고문 내용]\n\n${announcementText.substring(0, 15000)}`)

    // Phase 2: 양식 분석
    const phase2 = await callClaude(PHASE2_PROMPT, `[사업계획서 양식 내용]\n\n${templateText.substring(0, 10000)}`)

    // Phase 3: 동적 구조 생성 (배점 기반 분량 배분)
    let structure = null
    if (phase1.evaluation && phase2.sections && !phase1.parseError && !phase2.parseError) {
      const totalPages = phase2.total_pages || 20
      const totalScore = phase1.evaluation.reduce((s: number, e: any) => s + (e.score || 0), 0) || 100

      structure = {
        total_pages: totalPages,
        sections: phase2.sections.map((sec: any) => {
          // 심사항목과 섹션 매칭 (키워드 기반)
          const matched = phase1.evaluation.filter((ev: any) => {
            const secTitle = (sec.title || '').toLowerCase()
            const evName = (ev.name || '').toLowerCase()
            return secTitle.includes(evName.substring(0, 4)) || evName.includes(secTitle.substring(0, 4))
          })
          const sectionScore = matched.reduce((s: number, e: any) => s + (e.score || 0), 0)
          const pageRatio = totalScore > 0 ? sectionScore / totalScore : 1 / phase2.sections.length
          const pages = Math.max(1, Math.round(totalPages * pageRatio))

          return {
            ...sec,
            matched_evaluation: matched,
            estimated_pages: pages,
            target_words: pages * 600,
            focus: matched.length > 0
              ? `배점 ${sectionScore}점 — ${matched.map((e: any) => e.name).join(', ')}에 집중`
              : '기본 작성',
          }
        }),
      }
    }

    // 기존 사업계획서 분석 (업로드 시)
    let existingAnalysis = null
    if (existingFile) {
      const existingText = await extractText(existingFile)
      if (existingText.trim()) {
        existingAnalysis = { fileName: existingFile.name, textLength: existingText.length, preview: existingText.substring(0, 500) }
      }
    }

    return NextResponse.json({
      success: true,
      phase1, // 공고 분석 결과
      phase2, // 양식 분석 결과
      structure, // 동적 구조 (배점 기반)
      existingAnalysis, // 기존 계획서 (있으면)
      meta: {
        announcementLength: announcementText.length,
        templateLength: templateText.length,
      },
    })
  } catch (e: any) {
    console.error('Bizplan analyze error:', e)
    return NextResponse.json({ error: e.message || '분석 중 오류가 발생했습니다' }, { status: 500 })
  }
}
