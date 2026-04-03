// 스마트스토어 상세페이지 — 클라이언트 상수 (서버 함수 없음)

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
