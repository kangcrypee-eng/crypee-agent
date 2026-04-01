// BlogPilot Pro 프롬프트 템플릿
import { PHOTO_CATEGORIES } from './blog-pro-categories'
import { getSystemPrompt } from './blog-prompts'

// GPT-4o Vision 사진 분류 프롬프트
export function getClassificationPrompt(businessType: string): string {
  const cats = PHOTO_CATEGORIES[businessType] || PHOTO_CATEGORIES.other
  const catList = cats.map(c => `- ${c.value}: ${c.label}`).join('\n')

  const hairSalonExtra = businessType === 'hair_salon' ? `

## 미용실 특별 규칙
- 시술 결과 사진은 반드시 사람(고객)의 특징을 묘사해주세요 (머리 길이, 색상, 스타일 등)
- 같은 사람의 다른 각도 사진을 구별할 수 있도록 "person_hint" 필드에 특징을 적어주세요
  예: "쇄골기장 갈색 레이어드컷 여성", "턱선기장 블랙 단발 여성"
- 비포&애프터도 같은 사람이면 동일한 person_hint를 사용하세요` : ''

  return `이 사진을 아래 카테고리 중 하나로 분류해주세요.

## 카테고리
${catList}
${hairSalonExtra}

## 출력 형식 (JSON)
{
  "category": "카테고리값",
  "description": "사진 설명 (한국어, 1~2문장)",
  "person_hint": "인물 특징 (시술/인물 사진인 경우, 아니면 빈 문자열)"
}

반드시 위 카테고리 값 중 하나만 선택하세요. 판단이 어려우면 가장 가까운 것을 선택하세요.`
}

// 자동 생성용 시스템 프롬프트 (기존 getSystemPrompt 확장)
export function getAutoSystemPrompt(businessType: string, tone: string): string {
  return getSystemPrompt(businessType, tone) + `

## 추가 규칙 (자동 생성 모드)
- 트렌드 키워드가 제공되면 자연스럽게 글에 반영하세요.
- 이전에 작성한 주제/앵글 목록이 제공되면 절대 중복하지 마세요.
- 매번 다른 도입부, 다른 구조, 다른 관점으로 작성하세요.
- 독자가 "또 이 내용이네" 느끼지 않도록 신선하게 써주세요.`
}

// 자동 생성용 유저 프롬프트
export function getAutoUserPrompt(
  businessType: string,
  shopName: string,
  trendKeyword: string,
  photoDescriptions: string[],
  recentAngles: string[],
  shopInfo: { phone?: string; address?: string; link?: string }
): string {
  const bizLabels: Record<string, string> = {
    hair_salon: '미용실', cafe: '카페', restaurant: '음식점', nail: '네일샵',
    pilates: '필라테스/요가', clinic: '병원/의원', academy: '학원',
    realestate: '부동산', other: '기타'
  }
  const bizLabel = bizLabels[businessType] || '기타'

  const photoContext = photoDescriptions.length > 0
    ? `\n\n## 오늘 사용할 사진\n${photoDescriptions.map((d, i) => `- 사진 ${i + 1}: ${d}`).join('\n')}\n\n위 사진을 본문에 자연스럽게 반영하고 [IMAGE:N] 플레이스홀더를 넣어주세요.`
    : ''

  const dedup = recentAngles.length > 0
    ? `\n\n## 최근 작성한 주제 (중복 금지!)\n${recentAngles.map(a => `- ${a}`).join('\n')}\n\n위 주제와 절대 겹치지 않는 새로운 앵글로 작성하세요.`
    : ''

  const infoLines: string[] = []
  if (shopInfo.phone) infoLines.push(`- 연락처: ${shopInfo.phone}`)
  if (shopInfo.address) infoLines.push(`- 주소: ${shopInfo.address}`)
  if (shopInfo.link) infoLines.push(`- 예약/문의 링크: ${shopInfo.link}`)
  const shopInfoCtx = infoLines.length > 0
    ? `\n\n## 매장 정보 (글 하단에 포함)\n${infoLines.join('\n')}`
    : ''

  return `## 업종: ${bizLabel}
## 매장명: ${shopName}
## 오늘의 트렌드 키워드: ${trendKeyword || '없음'}
${photoContext}${dedup}${shopInfoCtx}

위 내용을 바탕으로 블로그 글을 작성해주세요.
- 본문은 2,500~4,000자로 충분히 길고 상세하게 써주세요.
- 트렌드 키워드를 자연스럽게 녹여주세요.
- 이모지도 적절히 넣어주세요.
- JSON 형식으로 출력해주세요.`
}

// 주제에 필요한 사진 카테고리 추천
export function getPhotoSuggestionPrompt(businessType: string, topic: string, categories: string[]): string {
  const catList = categories.join(', ')
  return `다음 블로그 주제를 작성하려면 어떤 사진이 필요할까요?

업종: ${businessType}
주제: ${topic}
사용 가능한 카테고리: ${catList}

JSON 형식으로 출력:
{
  "needed_categories": ["필요한 카테고리1", "필요한 카테고리2"],
  "photo_tip": "사장님에게 드리는 사진 촬영 팁 (1~2문장, 한국어)"
}`
}

// 트렌드 주제 생성 프롬프트 (키워드 없을 때 fallback)
export function getTopicGenerationPrompt(businessType: string, recentTitles: string[]): string {
  const bizLabels: Record<string, string> = {
    hair_salon: '미용실', cafe: '카페', restaurant: '음식점', nail: '네일샵',
    pilates: '필라테스/요가', clinic: '병원/의원', academy: '학원',
    realestate: '부동산', other: '기타'
  }
  const recent = recentTitles.length > 0
    ? `\n\n최근 작성한 제목 (중복 금지):\n${recentTitles.map(t => `- ${t}`).join('\n')}`
    : ''

  return `${bizLabels[businessType] || '매장'} 블로그에 올릴 주제를 1개 추천해주세요.
- 계절감/트렌드를 반영하세요 (현재 시점 기준)
- 검색량이 높을 만한 주제를 선택하세요
- 고객이 관심 가질 실용적인 내용이어야 합니다
${recent}

JSON 형식으로 출력:
{ "topic": "주제", "keyword": "핵심 검색 키워드", "angle": "차별화 포인트 한 줄" }`
}
