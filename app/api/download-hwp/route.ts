import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

export async function POST(request: NextRequest) {
  try {
    const { markdown, title, moduleId } = await request.json()
    if (!markdown) return NextResponse.json({ error: '내용이 없습니다' }, { status: 400 })

    const templatePath = path.join(process.cwd(), 'templates', moduleId || '', '양식.hwpx')
    let buffer: Buffer

    if (fs.existsSync(templatePath)) {
      buffer = injectWithPython(templatePath, markdown)
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
    console.error('HWPX error:', e)
    return NextResponse.json({ error: e.message || 'HWPX 생성 실패' }, { status: 500 })
  }
}

function injectWithPython(templatePath: string, markdown: string): Buffer {
  // AI 마크다운에서 ◦/- 항목 추출
  const bulletItems = extractBulletItems(markdown)
  // 표 교체 데이터 추출
  const tableData = extractTableData(markdown)

  const tmpDir = os.tmpdir()
  const dataPath = path.join(tmpDir, 'hwpx_data.json')
  const outPath = path.join(tmpDir, 'hwpx_output.hwpx')

  fs.writeFileSync(dataPath, JSON.stringify({ templatePath, outPath, bulletItems, tableData }))

  const pyScriptPath = path.join(process.cwd(), 'lib', 'hwpx-inject.py')
  execSync(`python3 "${pyScriptPath}" "${dataPath}"`, { timeout: 10000 })

  const result = fs.readFileSync(outPath)
  // 정리
  try { fs.unlinkSync(dataPath) } catch {}
  try { fs.unlinkSync(outPath) } catch {}
  return result
}

function extractBulletItems(md: string): [string, string][] {
  const items: [string, string][] = []
  const sections = [
    { start: /1\.\s*문제\s*인식/i, end: /#{1,3}\s*2\.\s*실현|#{1,3}\s*■\s*2\./ },
    { start: /2\.\s*실현\s*가능/i, end: /#{1,3}\s*3\.\s*성장|#{1,3}\s*■\s*3\./ },
    { start: /3\.\s*성장\s*전략/i, end: /#{1,3}\s*4\.\s*팀|#{1,3}\s*■\s*4\./ },
    { start: /4\.\s*팀\s*구성/i, end: /$/ },
  ]

  for (const sec of sections) {
    const startMatch = md.match(sec.start)
    if (!startMatch) continue
    const startIdx = startMatch.index! + startMatch[0].length
    const rest = md.substring(startIdx)
    const endMatch = rest.match(sec.end)
    const body = endMatch ? rest.substring(0, endMatch.index) : rest

    // 마크다운에서 ◦/- 항목 추출
    const lines = body.split('\n')
    let currentItem = ''
    let currentMarker = ''

    for (const line of lines) {
      const trimmed = line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,4}\s*/, '').trim()
      if (!trimmed || trimmed.match(/^\|.*\|$/)) continue

      if (trimmed.startsWith('◦') || trimmed.match(/^[①②③④⑤⑥]/)) {
        if (currentItem && currentMarker) items.push([currentMarker, currentItem])
        currentMarker = 'b'
        currentItem = trimmed.replace(/^◦\s*/, '').replace(/^[①②③④⑤⑥]\s*/, '')
      } else if (trimmed.startsWith('-') || trimmed.startsWith('·')) {
        if (currentItem && currentMarker) items.push([currentMarker, currentItem])
        currentMarker = 'd'
        currentItem = trimmed.replace(/^[-·]\s*/, '')
      } else if (currentItem) {
        currentItem += ' ' + trimmed
      }
    }
    if (currentItem && currentMarker) items.push([currentMarker, currentItem])
  }

  return items
}

function extractTableData(md: string): Record<string, string> {
  const d: Record<string, string> = {}
  const tv = (key: string): string => {
    const m = md.match(new RegExp(key + '[^|]*\\|\\s*([^|\\n]+)', 'i'))
    return m?.[1]?.replace(/\*\*/g, '').trim() || ''
  }

  // === 일반현황 표 ===
  const itemName = tv('창업아이템명') || tv('아이템명')
  if (itemName) d['OO기술이 적용된 OO기능의(혜택을 제공하는) OO제품·서비스 등'] = itemName
  const output = tv('산출물')
  if (output) d['모바일 어플리케이션(0개), 웹사이트(0개)'] = output
  d['제작·개발 완료할 최종 생산품의 형태, 수량 등 기재'] = ''
  const company = tv('기업.*명')
  if (company) d['OOOOO'] = company
  d['교수 / 연구원 / 사무직 /'] = tv('직업') || '[확인 필요]'
  d['일반인 / 대학생 등'] = ''

  // === 팀구성현황 표 (1페이지 + 4페이지) ===
  d['공동대표'] = tv('과장') ? '과장' : '[확인 필요]'
  d['S/W 개발 총괄'] = tv('담당.*업무') || '[확인 필요]'
  d['홍보 및 마케팅'] = '[확인 필요]'
  d['OO학 박사, OO학과 교수 재직(00년)'] = '[확인 필요]'
  d['OO학 학사, OO 관련 경력(00년 이상)'] = '[확인 필요]'
  d["완료('00.00)"] = '[확인 필요]'
  d["예정('00.0)"] = '[확인 필요]'
  d["예정('00.00)"] = '[확인 필요]'

  // === 개요 요약 표 ===
  const name = tv('명\\s*칭')
  if (name) { d['게토레이'] = name; d['Windows'] = ''; d['알파고'] = '' }
  const cat = tv('범\\s*주')
  if (cat) { d['스포츠음료'] = cat; d['OS(운영체계)'] = ''; d['인공지능프로그램'] = '' }
  const overview = tv('아이템\\s*개요') || tv('솔루션\\s*개요') || tv('핵심\\s*문제')
  if (overview) {
    d['본 지원사업을 통해 개발 또는 구체화하고자 하는 제품·서비스 개요'] = overview
    d['(사용 용도, 사양, 가격 등), 핵심 기능·성능, 고객 제공 혜택 등'] = ''
    d['가벼움(고객 제공 혜택)을 위해서 용량을 줄이는 재료(핵심 기능)를 사용'] = ''
  }
  const probSummary = tv('문제\\s*인식') || tv('핵심\\s*문제')
  if (probSummary) {
    d['개발하고자 하는 창업 아이템의 국내·외 시장 현황 및 문제점 등'] = probSummary
    d['문제 해결을 위한 창업 아이템 필요성 등'] = ''
  }
  const solSummary = tv('실현\\s*가능')
  if (solSummary) {
    d['개발하고자 하는 창업 아이템을 사업기간 내 제품·서비스로 개발 또는 구체화'] = solSummary
    d['하고자 하는 계획(최종 산출물_형태, 수량 등)'] = ''
    d['개발하고자 하는 창업 아이템의 차별성 및 경쟁력 확보 전략'] = ''
  }
  const scaleSummary = tv('성장전략') || tv('성장\\s*전략')
  if (scaleSummary) d['경쟁사 분석, 목표 시장 진입 전략, 창업 아이템의 비즈니스 모델(수익화 모델), 사업 전체 로드맵, 투자유치 전략 등'] = scaleSummary
  const teamSummary = tv('팀\\s*구성')
  if (teamSummary) d['대표자, 팀원, 업무파트너(협력기업) 등 역량 활용 계획 등'] = teamSummary
  d['※ 예시 : 가벼움(고객 제공 혜택)을 위해서 용량을 줄이는 재료(핵심 기능)를 사용'] = ''

  // === 일정 표 ===
  d['필수 개발 인력 채용'] = '[확인 필요]'
  d['OO 전공 경력 직원 00명 채용'] = '[확인 필요]'
  d['제품 패키지 디자인 용역 진행'] = '[확인 필요]'
  d['웹사이트 자체 제작'] = '[확인 필요]'
  d['시제품 완성'] = '[확인 필요]'
  d['협약기간 내 시제품 제작 완료'] = '[확인 필요]'
  d['시제품 설계 및 프로토타입 제작'] = '[확인 필요]'
  d['외주 용역을 통한 시제품 제작'] = '[확인 필요]'
  d['OO, OO 프로모션 진행'] = '[확인 필요]'
  d['00.00 ~ 00.00'] = '[확인 필요]'
  d['00년 상반기'] = '[확인 필요]'
  d['00년 하반기'] = '[확인 필요]'
  // >00.00< 제거 — XML 태그를 건드려서 문서 손상시킴

  // === 사업비 표 ===
  d['DMD소켓 구입(00개×0000원)'] = '[확인 필요 - 재료비]'
  d['전원IC류 구입(00개×000원)'] = '[확인 필요 - 재료비]'
  d['시금형제작 외주용역(OOO제품 .... 플라스틱금형제작)'] = '[확인 필요 - 외주용역비]'
  d['국내 OO전시회 참가비(부스 임차 등 포함'] = '[확인 필요 - 지급수수료]'
  d['3,000,000'] = '[확인 필요]'
  d['7,000,000'] = '[확인 필요]'
  d['10,000,000'] = '[확인 필요]'
  d['1,000,000'] = '[확인 필요]'

  // === 협력기관 표 ===
  d['○○전자'] = '[확인 필요 - 파트너1]'
  d['시제품 관련 H/W 제작·개발'] = '[확인 필요]'
  d['테스트 장비 지원'] = '[확인 필요]'
  d['○○기업'] = '[확인 필요 - 파트너2]'
  d['S/W 제작·개발'] = '[확인 필요]'
  d['웹사이트 제작 용역'] = '[확인 필요]'

  // === 이미지 자리 → 추천 텍스트 (XML 안에서는 &lt; &gt;로 저장됨) ===
  d['사진(이미지) 또는 설계도 제목'] = '[이미지 추천: 제품/서비스 구조도 또는 핵심 기술 다이어그램]'

  return d
}
