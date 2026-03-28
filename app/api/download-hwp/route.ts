import { NextRequest, NextResponse } from 'next/server'
import AdmZip from 'adm-zip'
import path from 'path'
import fs from 'fs'

export async function POST(request: NextRequest) {
  try {
    const { markdown, title, moduleId } = await request.json()
    if (!markdown) return NextResponse.json({ error: '내용이 없습니다' }, { status: 400 })

    // 템플릿 HWPX가 있으면 템플릿 주입 방식, 없으면 md2hwp 변환
    const templatePath = path.join(process.cwd(), 'templates', moduleId || '', '양식.hwpx')
    let buffer: Buffer

    if (fs.existsSync(templatePath)) {
      buffer = await injectIntoTemplate(templatePath, markdown)
    } else {
      const { convertMarkdownToHwp } = await import('md2hwp')
      const result = await convertMarkdownToHwp(markdown, { title: title || '사업계획서', author: 'crypee Agent' })
      buffer = Buffer.from(result)
    }

    const fileName = encodeURIComponent(title || '사업계획서') + '.hwpx'
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (e: any) {
    console.error('HWPX generation error:', e)
    return NextResponse.json({ error: e.message || 'HWPX 생성 실패' }, { status: 500 })
  }
}

// 마크다운에서 섹션별 내용 추출
function parseSections(md: string): Record<string, string> {
  const sections: Record<string, string> = {}

  // 일반현황 테이블에서 항목 추출
  const itemMatch = md.match(/창업아이템명[^\n]*\|\s*([^\n|]+)/i)
  sections['창업아이템명'] = itemMatch?.[1]?.trim() || ''

  const outputMatch = md.match(/산출물[^\n]*\|\s*([^\n|]+)/i)
  sections['산출물'] = outputMatch?.[1]?.trim() || ''

  const jobMatch = md.match(/직업[^\n]*\|\s*([^\n|]+)/i)
  sections['직업'] = jobMatch?.[1]?.trim() || ''

  const companyMatch = md.match(/기업[^\n]*명[^\n]*\|\s*([^\n|]+)/i)
  sections['기업명'] = companyMatch?.[1]?.trim() || ''

  // 아이템 개요
  const nameMatch = md.match(/명\s*칭[^\n]*\|\s*([^\n|]+)/i)
  sections['아이템명칭'] = nameMatch?.[1]?.trim() || ''

  const categoryMatch = md.match(/범\s*주[^\n]*\|\s*([^\n|]+)/i)
  sections['아이템범주'] = categoryMatch?.[1]?.trim() || ''

  // 본문 섹션 추출 (## 또는 # 기준)
  const problemMatch = md.match(/1\.\s*문제\s*인식.*?\n([\s\S]*?)(?=\n#|\n2\.\s*실현|$)/i)
  sections['문제인식'] = problemMatch?.[1]?.trim() || ''

  const solutionMatch = md.match(/2\.\s*실현\s*가능.*?\n([\s\S]*?)(?=\n#|\n3\.\s*성장|$)/i)
  sections['실현가능성'] = solutionMatch?.[1]?.trim() || ''

  const scaleupMatch = md.match(/3\.\s*성장\s*전략.*?\n([\s\S]*?)(?=\n#|\n4\.\s*팀|$)/i)
  sections['성장전략'] = scaleupMatch?.[1]?.trim() || ''

  const teamMatch = md.match(/4\.\s*팀\s*구성.*?\n([\s\S]*?)$/i)
  sections['팀구성'] = teamMatch?.[1]?.trim() || ''

  return sections
}

// 마크다운 → 플레인 텍스트 (XML 안에 넣을 용도)
function mdToPlain(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^\|.*\|$/gm, '') // 표 제거 (XML 표 구조는 유지)
    .replace(/^[-*]\s+/gm, '- ')
    .replace(/◦\s*/g, '◦ ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// HWPX 템플릿에 AI 내용 주입
async function injectIntoTemplate(templatePath: string, markdown: string): Promise<Buffer> {
  const zip = new AdmZip(templatePath)
  let xml = zip.getEntry('Contents/section0.xml')!.getData().toString('utf-8')
  const sections = parseSections(markdown)

  // === 일반현황 표 교체 ===
  if (sections['창업아이템명']) {
    xml = xml.replace(/OO기술이 적용된 OO기능의\(혜택을 제공하는\) OO제품·서비스 등/g, sections['창업아이템명'])
    xml = xml.replace(/OO기술이 적용된 OO기능의/g, sections['창업아이템명'])
  }
  if (sections['산출물']) {
    xml = xml.replace(/모바일 어플리케이션\(0개\), 웹사이트\(0개\)/g, sections['산출물'])
  }
  if (sections['직업']) {
    xml = xml.replace('교수 / 연구원 / 사무직 /', sections['직업'])
  }
  if (sections['기업명']) {
    xml = xml.replace('OOOOO', sections['기업명'])
  }

  // === 개요 요약 표 교체 ===
  if (sections['아이템명칭']) {
    xml = xml.replace('게토레이', sections['아이템명칭'])
    xml = xml.replace('Windows', '')
    xml = xml.replace('알파고', '')
  }
  if (sections['아이템범주']) {
    xml = xml.replace('스포츠음료', sections['아이템범주'])
    xml = xml.replace('OS(운영체계)', '')
    xml = xml.replace('인공지능프로그램', '')
  }

  // === 본문 섹션: ※ 안내문구를 AI 내용으로 교체 ===
  // 문제인식 안내문구
  if (sections['문제인식']) {
    const plain = mdToPlain(sections['문제인식']).substring(0, 5000)
    xml = xml.replace(
      /개발하고자 하는 창업 아이템의 국내·외 시장 현황 및 문제점 등의 제시[^<]*/,
      plain.substring(0, 2000)
    )
  }

  // 실현가능성 안내문구
  if (sections['실현가능성']) {
    const plain = mdToPlain(sections['실현가능성']).substring(0, 5000)
    xml = xml.replace(
      /아이디어를 제품·서비스로 개발 또는 구체화 하고자 하는 계획\(사업기간 내 일정 등\)[^<]*/,
      plain.substring(0, 2000)
    )
  }

  // 성장전략 안내문구
  if (sections['성장전략']) {
    const plain = mdToPlain(sections['성장전략']).substring(0, 5000)
    xml = xml.replace(
      /경쟁제품·경쟁사 분석, 창업 아이템의 목표 시장 진입 전략 등 기재[^<]*/,
      plain.substring(0, 2000)
    )
  }

  // 팀구성 안내문구
  if (sections['팀구성']) {
    const plain = mdToPlain(sections['팀구성']).substring(0, 5000)
    xml = xml.replace(
      /대표자 보유 역량\(경영 능력, 경력·학력, 기술력, 노하우, 인적 네트워크 등\) 기재/,
      plain.substring(0, 2000)
    )
  }

  // ※ 파란색 안내문구 제거 (양식 규칙)
  xml = xml.replace(/※ 예시 \d+ : [^<]*/g, '')
  xml = xml.replace(/※ 본 지원사업을 통해[^<]*/g, '')
  xml = xml.replace(/※ 예시 : 가벼움[^<]*/g, '')

  // 수정된 XML을 ZIP에 다시 넣기
  zip.updateFile('Contents/section0.xml', Buffer.from(xml, 'utf-8'))

  // PrvText 업데이트
  const prvEntry = zip.getEntry('Preview/PrvText.txt')
  if (prvEntry) {
    const prvText = markdown.replace(/[#*|]/g, '').substring(0, 2000)
    zip.updateFile('Preview/PrvText.txt', Buffer.from(prvText, 'utf-8'))
  }

  return zip.toBuffer()
}
