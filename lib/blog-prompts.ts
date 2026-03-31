// BlogPilot 프롬프트 템플릿

export const BUSINESS_TYPES = [
  { value: 'hair_salon', label: '미용실', icon: '💇' },
  { value: 'cafe', label: '카페', icon: '☕' },
  { value: 'restaurant', label: '음식점', icon: '🍽️' },
  { value: 'nail', label: '네일샵', icon: '💅' },
  { value: 'pilates', label: '필라테스/요가', icon: '🧘' },
  { value: 'clinic', label: '병원/의원', icon: '🏥' },
  { value: 'academy', label: '학원', icon: '📚' },
  { value: 'realestate', label: '부동산', icon: '🏠' },
  { value: 'other', label: '기타', icon: '🏪' },
] as const

export type BusinessType = (typeof BUSINESS_TYPES)[number]['value']

// 업종별 placeholder 예시
export const BUSINESS_EXAMPLES: Record<string, { shopName: string; topic: string; brief: string }> = {
  hair_salon: { shopName: '크리피미용실 강남점', topic: '오늘 레이어드컷 시술한 고객', brief: '30대 여성분이 쇄골 기장 레이어드컷 하셨는데 볼륨감이 살아서 만족하셨어요' },
  cafe: { shopName: '크리피카페 성수점', topic: '신메뉴 딸기 라떼 출시', brief: '겨울 시즌 한정 딸기 라떼를 출시했는데 벌써 인기 메뉴 1위예요' },
  restaurant: { shopName: '크리피식당 홍대점', topic: '점심 특선 메뉴 소개', brief: '오늘의 점심 특선은 된장찌개 정식인데 반찬이 12가지라 손님들이 놀라세요' },
  nail: { shopName: '크리피네일 신사점', topic: '봄 시즌 네일 디자인', brief: '벚꽃 시즌 맞아서 핑크 그라데이션 네일이 인기 폭발이에요' },
  pilates: { shopName: '크리피필라테스 역삼점', topic: '체형교정 3개월 후기', brief: '거북목이 심했던 회원분이 3개월 만에 자세가 확 바뀌었어요' },
  clinic: { shopName: '크리피의원 강남점', topic: '봄철 피부 관리법', brief: '환절기라 피부 트러블 환자분들이 많아져서 관리법을 알려드려요' },
  academy: { shopName: '크리피학원 대치점', topic: '중간고사 대비반 오픈', brief: '이번 중간고사 대비 특강을 시작했는데 벌써 마감 임박이에요' },
  realestate: { shopName: '크리피부동산 잠실점', topic: '잠실 신축 아파트 매물', brief: '잠실역 도보 5분 신축 32평형이 나왔는데 학군이 정말 좋아요' },
  other: { shopName: '크리피샵', topic: '이번 주 이벤트', brief: '이번 주말 특별 이벤트를 준비했어요' },
}

// 말투 옵션
export const TONE_OPTIONS = [
  { value: 'friendly', label: '친근한 사장님', desc: '"안녕하세요~ 오늘도 찾아주셔서 감사해요 😊"', icon: '😊' },
  { value: 'professional', label: '전문가', desc: '"10년 경력의 노하우를 바탕으로 말씀드리겠습니다"', icon: '👔' },
  { value: 'casual', label: '편한 친구', desc: '"ㅎㅎ 이거 진짜 대만족이었어요~!"', icon: '🤙' },
  { value: 'informative', label: '정보 전달형', desc: '"오늘은 레이어드컷의 장점에 대해 알아보겠습니다"', icon: '📝' },
] as const

export type ToneType = (typeof TONE_OPTIONS)[number]['value']

// 말투별 프롬프트 가이드
const TONE_GUIDES: Record<string, string> = {
  friendly: `
## 말투 스타일: 친근한 사장님
- 반말이 아닌 존댓말, 하지만 딱딱하지 않고 따뜻한 느낌
- "~해요", "~거든요", "~답니다" 체를 섞어 사용
- 이모지를 문단마다 1~2개 자연스럽게 사용 (😊 💕 ✨ 🙌 👏 💪 🔥 ☺️ 🥰 💯 등)
- 독자에게 말 걸듯이: "혹시 ~고민 있으신 분?", "사실 저도 처음엔~"
- 감정 표현을 풍부하게: "너무 예쁘게 나와서 저도 뿌듯했어요 ☺️"
- 줄임말 가끔 사용: "완전", "진짜", "역시"
- 예시: "안녕하세요~ 오늘 정말 기분 좋은 시술이 있어서 소개해드려요 ✨"`,
  professional: `
## 말투 스타일: 전문가
- 정중하고 신뢰감 있는 "~합니다" 체 위주
- 전문 용어를 적절히 사용하되 괄호로 쉬운 설명 추가
- 이모지는 소제목이나 강조 포인트에만 절제해서 사용 (✅ 📌 💡 ⭐ 등)
- 근거와 이유를 설명: "~이기 때문에", "~의 관점에서"
- 경험과 전문성을 강조: "수많은 고객분들을 만나면서~"
- 예시: "안녕하세요. 오늘은 레이어드컷 시술 사례를 공유드립니다 📌"`,
  casual: `
## 말투 스타일: 편한 친구
- 격식 없이 편안한 느낌, 하지만 존댓말 유지
- "~요!", "~ㅎㅎ", "~거 아시죠?", "~잖아요~" 같은 구어체 활용
- 이모지를 적극적으로 사용 (😆 🤣 😍 👍 💖 🎉 ✌️ 😎 🫶 등)
- 리액션 표현: "아니 근데 진짜요", "솔직히 이건 못 참지", "대박이죠?!"
- 독자와 대화하듯: "여러분도 이런 경험 있으시죠?ㅎㅎ"
- 감탄사 자유롭게: "와 진짜", "헐", "미쳤어요 ㅠㅠ (좋은 의미)"
- 예시: "여러분!! 오늘 진짜 대만족 시술이 있었어요 😆🔥"`,
  informative: `
## 말투 스타일: 정보 전달형
- 깔끔하고 명확한 "~입니다/~합니다" 체
- 정보를 구조적으로 전달 (번호 매기기, 항목 나열)
- 이모지는 구분자/포인트 역할로만 사용 (✅ 📍 💡 ▶️ ✔️ 등)
- "오늘은 ~에 대해 알아보겠습니다"로 시작
- 팁, 주의사항 등 실용 정보 강조
- 비교/분석 내용 포함: "A vs B 차이점은~"
- 예시: "오늘은 레이어드컷과 허쉬컷의 차이점을 정리해보겠습니다 ✅"`,
}

// 업종별 톤 & 키워드 가이드
const BUSINESS_GUIDES: Record<string, string> = {
  hair_salon: `
- 업종 특화: 미용실/헤어살롱
- 자주 쓰는 표현: 시술, 컨설팅, 두상, 모질, 볼륨, 레이어, 기장, 텍스처, 염색, 펌, 매직, 클리닉
- 글 구조: 고객 사연/니즈 → 상담 과정 → 시술 포인트/테크닉 → 완성 결과 → 고객 반응 → 매장 안내
- 사진 활용: 시술 전후 비교, 완성 스타일링, 매장 분위기, 제품 소개
- 필수 포함: 시술명, 기장, 대상(성별/연령대), 관리법 팁`,
  cafe: `
- 업종 특화: 카페
- 자주 쓰는 표현: 원두, 로스팅, 시그니처, 디저트, 공간, 분위기, 라떼아트, 핸드드립
- 글 구조: 메뉴/공간 소개 → 맛/분위기 묘사 → 추천 상황 → 매장 정보
- 사진 활용: 음료/디저트 클로즈업, 매장 인테리어, 계절 메뉴
- 필수 포함: 메뉴명, 가격대, 위치/접근성, 영업시간`,
  restaurant: `
- 업종 특화: 음식점/맛집
- 자주 쓰는 표현: 재료, 조리법, 정성, 비법, 한 그릇, 맛집, 단골, 반찬
- 글 구조: 메뉴 소개 → 재료/조리 포인트 → 맛 묘사 → 고객 반응 → 매장 안내
- 사진 활용: 대표 메뉴, 플레이팅, 재료, 매장 외관
- 필수 포함: 대표 메뉴, 가격, 위치, 주차 정보`,
  nail: `
- 업종 특화: 네일샵
- 자주 쓰는 표현: 디자인, 컬러, 젤네일, 트렌드, 케어, 큐티클, 아트, 시즌
- 글 구조: 디자인 소개 → 컬러/트렌드 설명 → 시술 포인트 → 고객 만족 → 예약 안내
- 필수 포함: 디자인명, 시술 시간, 유지 기간, 관리 팁`,
  pilates: `
- 업종 특화: 필라테스/요가
- 자주 쓰는 표현: 코어, 자세교정, 체형, 루틴, 호흡, 근력, 유연성, 밸런스
- 글 구조: 운동 목적/고민 → 동작/프로그램 설명 → 효과/변화 → 센터 안내
- 필수 포함: 프로그램명, 대상, 효과, 수업 구성`,
  clinic: `
- 업종 특화: 병원/의원
- 자주 쓰는 표현: 진료, 상담, 케어, 증상, 치료, 예방, 시술, 회복
- 글 구조: 증상/니즈 설명 → 원인 분석 → 치료 과정 → 결과/효과 → 병원 안내
- 필수 포함: 시술/치료명, 대상, 주의사항, 상담 안내`,
  academy: `
- 업종 특화: 학원/교육
- 자주 쓰는 표현: 커리큘럼, 수업, 성적향상, 관리, 상담, 맞춤, 레벨
- 글 구조: 교육 니즈/고민 → 프로그램 소개 → 학습 방법 → 성과 → 학원 안내
- 필수 포함: 과목/프로그램명, 대상 학년, 수업 방식, 상담 안내`,
  realestate: `
- 업종 특화: 부동산
- 자주 쓰는 표현: 매물, 시세, 입지, 교통, 학군, 전망, 투자, 실거주
- 글 구조: 매물/지역 소개 → 입지 장점 → 주변 환경 → 시세 정보 → 상담 안내
- 필수 포함: 위치, 면적, 가격대, 교통/학군, 문의 안내`,
  other: `
- 업종 특화: 일반 매장/업체
- 글 구조: 주제 소개 → 상세 내용 → 고객 혜택/후기 → 매장/업체 안내
- 필수 포함: 업체명, 위치, 핵심 서비스, 연락처`,
}

export function getSystemPrompt(businessType: string, tone: string = 'friendly'): string {
  const bizGuide = BUSINESS_GUIDES[businessType] || BUSINESS_GUIDES.other
  const toneGuide = TONE_GUIDES[tone] || TONE_GUIDES.friendly
  return `당신은 블로그 글 작성 전문가입니다. 소상공인 사장님의 매장 홍보를 위한 블로그 글을 작성합니다.
실제 매장을 운영하는 사장님이 직접 쓴 것처럼 자연스럽고 생생하게 작성해야 합니다.

${toneGuide}

## 블로그 SEO 규칙 (반드시 준수)
- 제목: 15~30자, 핵심 키워드를 앞에 배치, 이모지 1개 포함 가능
- 본문: 2,500~4,000자 (공백 포함) — 충분히 길고 상세하게
- 소제목: 4~6개 (## 마크다운 형식), 소제목에 이모지 활용
- 해시태그: 검색량 높은 키워드 10~15개
- 문단: 2~3문장마다 줄바꿈 (블로그 가독성)
- 이미지 위치: 소제목 아래에 [IMAGE:N] 플레이스홀더 삽입 (N은 사진 번호, 1부터 시작)
- 글 하단: 매장 정보 + 방문/예약 유도 문구 (이모지 포함)

## 업종별 가이드
${bizGuide}

## 글쓰기 핵심 규칙
- ❌ AI가 쓴 느낌 절대 금지. 기계적이고 반복적인 문장 구조 피하기.
- ✅ 실제 경험담처럼 생생하게: "오늘 오신 고객분은~", "사실 처음에는~"
- ✅ 사장님이 제공한 "짧은 내용"이 글의 핵심 소재. 이걸 중심으로 스토리를 풀어가세요.
- ✅ 감정과 디테일을 넣어주세요: "딱 보는 순간 '이거다!' 싶었어요"
- ✅ 이모지를 문단 사이사이에 자연스럽게 배치 (강제로 넣지 말고 감정/강조에 맞게)
- ✅ 중간중간 독자에게 말 걸기: "혹시 이런 고민 있으신 분?", "참고하시면 좋을 것 같아요!"
- ✅ 구체적 수치/팁 포함: 시술 시간, 관리법, 주의사항 등 실용 정보
- ✅ 글 끝에 자연스러운 CTA: "궁금하신 점 있으면 편하게 문의주세요~ 😊"
- ❌ 같은 표현 반복 금지 (매 문단 시작을 다르게)
- ❌ "오늘은 ~를 소개합니다" 같은 뻔한 도입 금지
- ✅ 사진 설명이 제공되면 해당 내용을 본문에 자연스럽게 녹이세요.

## 출력 형식 (JSON)
{
  "title": "블로그 제목 (이모지 포함 가능)",
  "body": "본문 (마크다운, 소제목은 ##, 이미지 위치는 [IMAGE:N], 이모지 자연스럽게 포함)",
  "hashtags": ["해시태그1", "해시태그2", ...]
}`
}

export function getUserPrompt(
  businessType: string,
  topic: string,
  briefContent: string,
  photoDescriptions: string[],
  shopName?: string,
  shopInfo?: { phone?: string; address?: string; link?: string }
): string {
  const bizLabel = BUSINESS_TYPES.find(b => b.value === businessType)?.label || '기타'
  const photoContext = photoDescriptions.length > 0
    ? `\n\n## 업로드된 사진 분석 결과\n${photoDescriptions.map((d, i) => `- 사진 ${i + 1}: ${d}`).join('\n')}\n\n위 사진 내용을 본문에 자연스럽게 반영하고, 해당 위치에 [IMAGE:N] 플레이스홀더를 넣어주세요.`
    : ''

  const infoLines: string[] = []
  if (shopInfo?.phone) infoLines.push(`- 연락처: ${shopInfo.phone}`)
  if (shopInfo?.address) infoLines.push(`- 주소: ${shopInfo.address}`)
  if (shopInfo?.link) infoLines.push(`- 예약/문의 링크: ${shopInfo.link}`)
  const shopInfoContext = infoLines.length > 0
    ? `\n\n## 매장 정보 (글 하단에 자연스럽게 포함해주세요)\n${infoLines.join('\n')}`
    : ''

  return `## 업종: ${bizLabel}
## 매장명: ${shopName || '(미입력)'}
## 주제: ${topic}
## 사장님이 전해준 내용:
${briefContent}
${photoContext}${shopInfoContext}

위 내용을 바탕으로 블로그 글을 작성해주세요.
- 본문은 2,500~4,000자로 충분히 길고 상세하게 써주세요.
- 실제 사장님이 쓴 것처럼 자연스럽고, 이모지도 적절히 넣어주세요.
- 매장 정보가 있으면 글 마지막에 깔끔하게 정리해서 넣어주세요.
- JSON 형식으로 출력해주세요.`
}

export function getVisionPrompt(): string {
  return `이 사진을 분석해주세요. 다음 정보를 한국어로 간결하게 제공해주세요:
1. 사진에 보이는 것 (무엇이 찍혔는지 구체적으로)
2. 분위기/특징 (밝기, 색감, 전문성 등)
3. 블로그 글에서 이 사진을 어떤 맥락으로 사용하면 좋을지

2~3문장으로 간결하게 답변해주세요.`
}
