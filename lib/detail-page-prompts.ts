// 스마트스토어 상세페이지 생성 프롬프트

export const PRODUCT_CATEGORIES = [
  { value: 'food', label: '식품/음료', icon: '🍽️' },
  { value: 'beauty', label: '화장품/뷰티', icon: '💄' },
  { value: 'fashion', label: '패션/의류', icon: '👔' },
  { value: 'electronics', label: '전자기기', icon: '📱' },
  { value: 'living', label: '생활/주방', icon: '🏠' },
  { value: 'pet', label: '반려동물', icon: '🐾' },
  { value: 'kids', label: '유아/키즈', icon: '👶' },
  { value: 'sports', label: '스포츠/아웃도어', icon: '⚽' },
  { value: 'other', label: '기타', icon: '📦' },
] as const

export const PHOTO_TAGS = [
  { value: 'main', label: '메인', icon: '⭐' },
  { value: 'usage', label: '사용 장면', icon: '👤' },
  { value: 'ingredient', label: '성분/원재료', icon: '🧪' },
  { value: 'size', label: '사이즈', icon: '📏' },
  { value: 'package', label: '패키지', icon: '📦' },
  { value: 'detail', label: '디테일', icon: '🔍' },
  { value: 'wearing', label: '착용/사용', icon: '👗' },
  { value: 'compare', label: '비교', icon: '⚖️' },
]

// 카테고리별 기본 디자인 설정
export const DEFAULT_DESIGNS: Record<string, { bg: string; text: string; accent: string; tone: string }> = {
  food: { bg: '#FBF8F3', text: '#4A3728', accent: '#8B6F47', tone: 'warm_natural' },
  beauty: { bg: '#1A1A1A', text: '#E8E8E8', accent: '#C9A96E', tone: 'premium_dark' },
  fashion: { bg: '#FFFFFF', text: '#333333', accent: '#111111', tone: 'minimal_white' },
  electronics: { bg: '#FFFFFF', text: '#333333', accent: '#2B7DE9', tone: 'clean_blue' },
  living: { bg: '#FAFAF8', text: '#3A3A3A', accent: '#5B8C5A', tone: 'natural_green' },
  pet: { bg: '#FFF8F0', text: '#4A3728', accent: '#E8964D', tone: 'warm_orange' },
  kids: { bg: '#FFF5F5', text: '#555555', accent: '#FF7B92', tone: 'pastel_pink' },
  sports: { bg: '#F5F5F5', text: '#222222', accent: '#FF4500', tone: 'bold_active' },
  other: { bg: '#FFFFFF', text: '#333333', accent: '#00B894', tone: 'clean_accent' },
}

// 레퍼런스 이미지 분석 프롬프트
export function getReferenceAnalysisPrompt(): string {
  return `이 상세페이지 이미지(들)의 디자인을 분석하세요.

JSON으로 출력:
{
  "layout_structure": ["hero", "badges", "pain_points", "feature_1", "feature_2", "specs_table", "cta", "shipping"],
  "design_tone": "warm_natural / premium_dark / minimal_white / vivid / corporate 중 하나",
  "color_scheme": { "background": "#hex", "text_primary": "#hex", "text_secondary": "#hex", "accent": "#hex" },
  "image_style": { "hero": "full_width / contained", "features": "full_width / split_left_right / grid" },
  "section_style": { "padding": "tight / normal / spacious", "divider": "line / background_alt / none" },
  "special_elements": ["trust_badges", "comparison_table", "step_guide", "countdown" 등 해당되는 것],
  "overall_feel": "한 문장으로 디자인 느낌 설명"
}`
}

// 상품 사진 분석 프롬프트
export function getPhotoAnalysisPrompt(): string {
  return `이 상품 사진을 분석하세요.

JSON으로 출력:
{
  "description": "사진 설명 (한국어, 1~2문장)",
  "suggested_tag": "main / usage / ingredient / size / package / detail / wearing / compare 중 하나",
  "colors": ["주요 색상 hex 2~3개"],
  "quality": "high / medium / low",
  "suggested_section": "hero / feature / specs / lifestyle 중 어디에 배치하면 좋을지"
}`
}

// 카피라이팅 프롬프트
export function getCopywritingPrompt(
  category: string,
  designAnalysis: any,
  photoAnalyses: { tag: string; description: string; suggested_section: string }[],
  productInfo: { name: string; price: string; features: string[]; target?: string; differentiator?: string }
): string {
  const catLabel = PRODUCT_CATEGORIES.find(c => c.value === category)?.label || '기타'
  const design = designAnalysis || DEFAULT_DESIGNS[category] || DEFAULT_DESIGNS.other

  const layoutOrder = designAnalysis?.layout_structure
    ? `레퍼런스 레이아웃 순서: ${designAnalysis.layout_structure.join(' → ')}`
    : '카테고리 기본 구조를 따르세요'

  const photoContext = photoAnalyses.map((p, i) =>
    `- 사진 ${i + 1} [${p.tag}]: ${p.description} → 배치: ${p.suggested_section}`
  ).join('\n')

  return `당신은 대한민국 최고의 스마트스토어 상세페이지 카피라이터입니다.
고전환율 상세페이지를 작성합니다.

## 상품 정보
- 상품명: ${productInfo.name}
- 카테고리: ${catLabel}
- 가격: ${productInfo.price}
- 핵심 특장점: ${productInfo.features.join(' / ')}
${productInfo.target ? `- 타겟 고객: ${productInfo.target}` : ''}
${productInfo.differentiator ? `- 차별점: ${productInfo.differentiator}` : ''}

## 디자인 분석 결과
- 톤: ${design.design_tone || design.tone || 'minimal'}
- 배경: ${design.color_scheme?.background || design.bg || '#fff'}
- 텍스트: ${design.color_scheme?.text_primary || design.text || '#333'}
- 강조색: ${design.color_scheme?.accent || design.accent || '#00B894'}
${layoutOrder}

## 상품 사진
${photoContext}

## 작성 규칙
- 모바일 퍼스트 (세로 스크롤 최적화)
- 감정을 자극하는 카피 (기능 나열 X, 고객의 고민 → 해결 스토리)
- 각 섹션은 한 화면에 들어오는 분량
- 사진 배치: [IMAGE:N] 플레이스홀더 사용 (N은 사진 번호, 1부터)
- 스펙/성분 정보는 깔끔한 표 형태로

## 출력 (JSON)
{
  "headline": "메인 카피 (1줄)",
  "subheadline": "서브 카피 (1줄)",
  "sections": [
    {
      "type": "hero / badges / pain_points / feature / specs / usage_guide / cta / shipping",
      "title": "섹션 제목 (있는 경우)",
      "content": "섹션 본문 (마크다운)",
      "image_refs": [1],
      "background": "white / alt / accent"
    }
  ]
}`
}

// HTML 생성
export function generateDetailPageHtml(
  copyData: { headline: string; subheadline: string; sections: any[] },
  photos: { cdnUrl: string; tag: string }[],
  design: { bg: string; text: string; accent: string; tone: string },
  productName: string
): string {
  const bgAlt = design.tone === 'premium_dark' ? '#222222' : '#FAFAFA'
  const bgAccent = design.accent + '10'

  let html = `<div style="max-width:680px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans KR',sans-serif;background:${design.bg};color:${design.text};">\n`

  for (const section of copyData.sections) {
    const sectionBg = section.background === 'alt' ? bgAlt : section.background === 'accent' ? bgAccent : design.bg
    const padding = '48px 24px'

    html += `<div style="padding:${padding};background:${sectionBg};">\n`

    // 이미지 배치
    if (section.image_refs?.length) {
      for (const ref of section.image_refs) {
        const photo = photos[ref - 1]
        if (photo) {
          html += `  <img src="${photo.cdnUrl}" alt="${productName}" style="width:100%;border-radius:0;margin-bottom:20px;" loading="lazy">\n`
        }
      }
    }

    // 제목
    if (section.title) {
      html += `  <h2 style="font-size:20px;font-weight:700;color:${design.text};margin-bottom:16px;line-height:1.4;">${section.title}</h2>\n`
    }

    // 본문
    if (section.content) {
      const content = section.content
        .replace(/\*\*(.+?)\*\*/g, `<strong>$1</strong>`)
        .replace(/^- (.+)$/gm, `<p style="font-size:15px;color:${design.text};line-height:1.8;padding:8px 0;border-bottom:1px solid ${design.bg === '#1A1A1A' ? '#333' : '#F0F0F0'};">✓ $1</p>`)
        .replace(/\n\n/g, '</p><p style="font-size:15px;line-height:1.8;margin-bottom:12px;">')
        .replace(/\n/g, '<br>')

      html += `  <div style="font-size:15px;color:${design.text};opacity:0.85;line-height:1.8;">${content}</div>\n`
    }

    html += `</div>\n`
  }

  html += `</div>`
  return html
}
