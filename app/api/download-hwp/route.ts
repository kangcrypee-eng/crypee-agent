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
  const bulletItems = extractBulletItems(markdown)
  const tableData = extractTableData(markdown)

  const tmpDir = os.tmpdir()
  const dataPath = path.join(tmpDir, 'hwpx_data.json')
  const outPath = path.join(tmpDir, 'hwpx_output.hwpx')

  fs.writeFileSync(dataPath, JSON.stringify({ templatePath, outPath, bulletItems, tableData }))

  const pyScriptPath = path.join(process.cwd(), 'lib', 'hwpx-inject.py')
  execSync(`python3 "${pyScriptPath}" "${dataPath}"`, { timeout: 10000 })

  const result = fs.readFileSync(outPath)
  try { fs.unlinkSync(dataPath) } catch {}
  try { fs.unlinkSync(outPath) } catch {}
  return result
}

// AI가 ===구분자=== 형식으로 출력하면 파싱, 아니면 기존 마크다운 파싱
function extractBulletItems(md: string): [string, string][] {
  // 구조화 형식 (===SECTION_N===)
  if (md.includes('===SECTION_1')) {
    return parseStructured(md)
  }
  // 기존 마크다운 형식 (### + ◦/-)
  return parseMarkdown(md)
}

function parseStructured(md: string): [string, string][] {
  const items: [string, string][] = []
  const sections = ['SECTION_1_문제인식', 'SECTION_2_실현가능성', 'SECTION_3_성장전략', 'SECTION_4_팀구성']
  const limits = [6, 5, 6, 3] // 양식 슬롯 수

  for (let i = 0; i < sections.length; i++) {
    const start = md.indexOf(`===${sections[i]}===`)
    const end = md.indexOf(`===END_${sections[i].split('_')[0]}_${sections[i].split('_')[1]}===`)
    if (start < 0) continue
    const body = md.substring(start, end > start ? end : md.length)

    let count = 0
    for (const line of body.split('\n')) {
      if (count >= limits[i]) break
      const t = line.trim()
      if (t.startsWith('◦ ')) {
        items.push(['b', t.substring(2).replace(/[<>]/g, '')])
        count++
      } else if (t.startsWith('- ')) {
        items.push(['d', t.substring(2).replace(/[<>]/g, '')])
        count++
      }
    }
  }
  return items
}

function parseMarkdown(md: string): [string, string][] {
  const items: [string, string][] = []

  function extract(startMarker: string, endMarker: string | null, limit: number) {
    const s = md.indexOf(startMarker)
    if (s < 0) return
    const e = endMarker ? md.indexOf(endMarker, s + 1) : md.length
    const body = md.substring(s, e > s ? e : md.length)
    let cur = '', marker = '', count = 0

    for (const line of body.split('\n')) {
      if (count >= limit) break
      const t = line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,4}\s*/, '').trim()
      if (!t || t.match(/^\|.*\|$/) || t.startsWith('|--')) continue

      if (t.startsWith('◦') || t.match(/^[①②③④⑤⑥]/) || t.match(/^#{2,4}\s/)) {
        if (cur && marker) { items.push([marker, cur.replace(/[<>]/g, '')]); count++ }
        marker = 'b'
        cur = t.replace(/^◦\s*/, '').replace(/^[①②③④⑤⑥]\s*/, '').replace(/^#{2,4}\s*/, '')
      } else if (t.startsWith('- ') || t.startsWith('· ')) {
        if (cur && marker) { items.push([marker, cur.replace(/[<>]/g, '')]); count++ }
        marker = 'd'
        cur = t.replace(/^[-·]\s*/, '')
      } else if (cur && t.length > 5) {
        cur += ' ' + t
      }
    }
    if (cur && marker && count < limit) { items.push([marker, cur.replace(/[<>]/g, '')]); count++ }
  }

  extract('■ 1. 문제', '■ 2. 실현', 6)
  extract('■ 2. 실현', '■ 3. 성장', 5)
  extract('■ 3. 성장', '■ 4. 팀', 6)
  extract('■ 4. 팀', null, 3)

  // 마크다운에 ■가 없으면 #으로 시도
  if (items.length === 0) {
    extract('1. 문제 인식', '2. 실현 가능', 6)
    extract('2. 실현 가능', '3. 성장전략', 5)
    extract('3. 성장전략', '4. 팀 구성', 6)
    extract('4. 팀 구성', null, 3)
  }

  return items
}

function extractTableData(md: string): Record<string, string> {
  const d: Record<string, string> = {}

  // 구조화 형식 (===TABLE_DATA===)
  if (md.includes('===TABLE_DATA===')) {
    const start = md.indexOf('===TABLE_DATA===') + '===TABLE_DATA==='.length
    const end = md.indexOf('===END_TABLE_DATA===')
    const block = md.substring(start, end > start ? end : md.length)
    const kv: Record<string, string> = {}
    for (const line of block.split('\n')) {
      const m = line.match(/^([^:]+):\s*(.*)$/)
      if (m) kv[m[1].trim()] = m[2].trim()
    }

    d['OOOOO'] = kv['기업명'] || '[확인 필요]'
    d['OO기술이 적용된 OO기능의(혜택을 제공하는) OO제품·서비스 등'] = kv['창업아이템명'] || '[확인 필요]'
    d['모바일 어플리케이션(0개), 웹사이트(0개)'] = kv['산출물'] || '[확인 필요]'
    d['게토레이'] = kv['명칭'] || '[확인 필요]'
    d['스포츠음료'] = kv['범주'] || '[확인 필요]'
    d['교수 / 연구원 / 사무직 /'] = kv['직업'] || '[확인 필요]'
    d['대표자, 팀원, 업무파트너(협력기업) 등 역량 활용 계획 등'] = kv['팀구성요약'] || '[확인 필요]'
    // Python에서 사용 (lineBreak 블록 교체 + 명칭/범주)
    d['명칭'] = kv['명칭'] || '[확인 필요]'
    d['범주'] = kv['범주'] || '[확인 필요]'
    d['아이템개요'] = kv['아이템개요'] || '[확인 필요]'
    d['문제인식요약'] = kv['문제인식요약'] || '[확인 필요]'
    d['실현가능성요약'] = kv['실현가능성요약'] || '[확인 필요]'
    d['성장전략요약'] = kv['성장전략요약'] || '[확인 필요]'
    d['팀구성요약'] = kv['팀구성요약'] || '[확인 필요]'
    d['공동대표'] = kv['팀1직위'] || '[확인 필요]'
    d['S/W 개발 총괄'] = kv['팀1업무'] || '[확인 필요]'
    d['OO학 박사, OO학과 교수 재직(00년)'] = kv['팀1역량'] || '[확인 필요]'
    d['홍보 및 마케팅'] = kv['팀2업무'] || '[확인 필요]'
    d['OO학 학사, OO 관련 경력(00년 이상)'] = kv['팀2역량'] || '[확인 필요]'
    d['필수 개발 인력 채용'] = kv['일정1'] || '[확인 필요]'
    d['OO 전공 경력 직원 00명 채용'] = kv['일정1세부'] || '[확인 필요]'
    d['제품 패키지 디자인 용역 진행'] = kv['일정2세부'] || '[확인 필요]'
    d['웹사이트 자체 제작'] = kv['일정3세부'] || '[확인 필요]'
    d['시제품 완성'] = kv['일정4'] || '[확인 필요]'
    d['협약기간 내 시제품 제작 완료'] = kv['일정4세부'] || '[확인 필요]'
    d['DMD소켓 구입(00개×0000원)'] = kv['사업비1'] || '[확인 필요]'
    d['전원IC류 구입(00개×000원)'] = kv['사업비2'] || '[확인 필요]'
    d['시금형제작 외주용역(OOO제품 .... 플라스틱금형제작)'] = kv['사업비3'] || '[확인 필요]'
    d['국내 OO전시회 참가비(부스 임차 등 포함'] = kv['사업비4'] || '[확인 필요]'
    d['시제품 설계 및 프로토타입 제작'] = kv['전체일정1'] || '[확인 필요]'
    d['외주 용역을 통한 시제품 제작'] = kv['전체일정2'] || '[확인 필요]'
    d['OO, OO 프로모션 진행'] = kv['전체일정3'] || '[확인 필요]'
    d['○○전자'] = kv['협력1이름'] || '[확인 필요]'
    d['시제품 관련 H/W 제작·개발'] = kv['협력1역량'] || '[확인 필요]'
    d['테스트 장비 지원'] = kv['협력1방안'] || '[확인 필요]'
    d['○○기업'] = kv['협력2이름'] || '[확인 필요]'
    d['S/W 제작·개발'] = kv['협력2역량'] || '[확인 필요]'
    d['웹사이트 제작 용역'] = kv['협력2방안'] || '[확인 필요]'
  } else {
    // 기존 마크다운에서 추출
    const tv = (key: string): string => {
      const m = md.match(new RegExp(key + '[^|]*\\|\\s*([^|\\n]+)', 'i'))
      return m?.[1]?.replace(/\*\*/g, '').trim() || ''
    }
    d['OOOOO'] = tv('기업.*명') || '[확인 필요]'
    d['OO기술이 적용된 OO기능의(혜택을 제공하는) OO제품·서비스 등'] = tv('창업아이템명') || tv('아이템명') || '[확인 필요]'
    d['모바일 어플리케이션(0개), 웹사이트(0개)'] = tv('산출물') || '[확인 필요]'
    d['게토레이'] = tv('명\\s*칭') || '[확인 필요]'
    d['스포츠음료'] = tv('범\\s*주') || '[확인 필요]'
    d['대표자, 팀원, 업무파트너(협력기업) 등 역량 활용 계획 등'] = tv('팀\\s*구성') || '[확인 필요]'
    d['공동대표'] = '[확인 필요]'; d['S/W 개발 총괄'] = '[확인 필요]'
    d['홍보 및 마케팅'] = '[확인 필요]'
    d['OO학 박사, OO학과 교수 재직(00년)'] = '[확인 필요]'
    d['OO학 학사, OO 관련 경력(00년 이상)'] = '[확인 필요]'
    d['필수 개발 인력 채용'] = '[확인 필요]'; d['OO 전공 경력 직원 00명 채용'] = '[확인 필요]'
    d['제품 패키지 디자인 용역 진행'] = '[확인 필요]'; d['웹사이트 자체 제작'] = '[확인 필요]'
    d['시제품 완성'] = '[확인 필요]'; d['협약기간 내 시제품 제작 완료'] = '[확인 필요]'
    d['DMD소켓 구입(00개×0000원)'] = '[확인 필요]'; d['전원IC류 구입(00개×000원)'] = '[확인 필요]'
    d['시금형제작 외주용역(OOO제품 .... 플라스틱금형제작)'] = '[확인 필요]'
    d['국내 OO전시회 참가비(부스 임차 등 포함'] = '[확인 필요]'
    d['시제품 설계 및 프로토타입 제작'] = '[확인 필요]'; d['외주 용역을 통한 시제품 제작'] = '[확인 필요]'
    d['OO, OO 프로모션 진행'] = '[확인 필요]'
    d['○○전자'] = '[확인 필요]'; d['○○기업'] = '[확인 필요]'
    d['시제품 관련 H/W 제작·개발'] = '[확인 필요]'; d['테스트 장비 지원'] = '[확인 필요]'
    d['S/W 제작·개발'] = '[확인 필요]'; d['웹사이트 제작 용역'] = '[확인 필요]'
  }

  // 공통 교체 (안전 검증됨)
  d['3,000,000'] = '[확인 필요]'; d['7,000,000'] = '[확인 필요]'
  d['10,000,000'] = '[확인 필요]'; d['1,000,000'] = '[확인 필요]'
  d['00.00 ~ 00.00'] = '[확인 필요]'
  d['00년 상반기'] = '[확인 필요]'; d['00년 하반기'] = '[확인 필요]'
  d['일반인 / 대학생 등'] = ' '
  d['교수 / 연구원 / 사무직 /'] = d['교수 / 연구원 / 사무직 /'] || '[확인 필요]'

  return d
}
