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

// 카테고리별 추가 입력 필드
export const CATEGORY_FIELDS: Record<string, { key: string; label: string; placeholder: string; type: 'text' | 'textarea'; required?: boolean }[]> = {
  food: [
    { key: 'origin', label: '원산지', placeholder: '예: 제주도, 국내산', type: 'text' },
    { key: 'ingredients', label: '원재료/성분', placeholder: '예: 아카시아꿀 100%', type: 'textarea' },
    { key: 'nutrition', label: '영양 정보', placeholder: '열량, 탄수화물, 단백질 등 (있으면)', type: 'textarea' },
    { key: 'certification', label: '인증/허가', placeholder: '예: HACCP, 유기농 인증, FDA', type: 'text' },
    { key: 'storage', label: '보관 방법/유통기한', placeholder: '예: 냉장 보관, 제조일로부터 12개월', type: 'text' },
    { key: 'shipping', label: '배송 안내', placeholder: '예: 평일 17시 이전 주문 당일 발송, 도서산간 추가 3,000원', type: 'textarea' },
    { key: 'exchange', label: '교환/반품 안내', placeholder: '예: 수령 후 7일 이내, 식품 특성상 단순변심 반품 시 왕복 배송비', type: 'textarea' },
  ],
  beauty: [
    { key: 'ingredients', label: '전성분', placeholder: '전성분 목록 (복사-붙여넣기)', type: 'textarea' },
    { key: 'volume', label: '용량', placeholder: '예: 50ml', type: 'text' },
    { key: 'skin_type', label: '추천 피부 타입', placeholder: '예: 건성, 민감성, 모든 피부', type: 'text' },
    { key: 'certification', label: '인증/테스트', placeholder: '예: 피부 자극 테스트 완료, 비건 인증', type: 'text' },
    { key: 'usage', label: '사용 방법', placeholder: '예: 세안 후 적당량을 취해 얼굴에 부드럽게 도포', type: 'textarea' },
    { key: 'caution', label: '주의사항', placeholder: '예: 눈 주위 사용 금지, 이상 발생 시 사용 중단', type: 'textarea' },
    { key: 'shipping', label: '배송 안내', placeholder: '배송 방법/기간/비용', type: 'textarea' },
    { key: 'exchange', label: '교환/반품 안내', placeholder: '교환/반품 조건', type: 'textarea' },
  ],
  fashion: [
    { key: 'material', label: '소재/원단', placeholder: '예: 면 95%, 스판 5%', type: 'text' },
    { key: 'size_info', label: '사이즈 정보', placeholder: '예: S(44), M(55), L(66) / 모델 키 170cm, 55사이즈 착용', type: 'textarea' },
    { key: 'color_options', label: '컬러 옵션', placeholder: '예: 블랙, 네이비, 아이보리', type: 'text' },
    { key: 'care', label: '세탁/관리 방법', placeholder: '예: 손세탁 권장, 드라이클리닝 가능', type: 'text' },
    { key: 'made_in', label: '제조국', placeholder: '예: 한국', type: 'text' },
    { key: 'shipping', label: '배송 안내', placeholder: '배송 방법/기간/비용', type: 'textarea' },
    { key: 'exchange', label: '교환/반품 (사이즈 교환)', placeholder: '예: 사이즈 교환 무료, 7일 이내', type: 'textarea' },
  ],
  electronics: [
    { key: 'specs', label: '주요 스펙', placeholder: '크기, 무게, 배터리, 연결 방식 등', type: 'textarea' },
    { key: 'compatibility', label: '호환성', placeholder: '예: iOS 15+, Android 12+, USB-C', type: 'text' },
    { key: 'package', label: '구성품', placeholder: '예: 본체, 충전 케이블, 사용 설명서', type: 'textarea' },
    { key: 'warranty', label: 'AS/보증', placeholder: '예: 1년 무상 보증, A/S 센터 번호', type: 'text' },
    { key: 'certification', label: '인증', placeholder: '예: KC 인증, FCC', type: 'text' },
    { key: 'shipping', label: '배송 안내', placeholder: '배송 방법/기간/비용', type: 'textarea' },
    { key: 'exchange', label: '교환/반품 안내', placeholder: '교환/반품 조건', type: 'textarea' },
  ],
  living: [
    { key: 'material', label: '소재/재질', placeholder: '예: 스테인리스, BPA-free', type: 'text' },
    { key: 'size_info', label: '크기/규격', placeholder: '예: 가로 30cm x 세로 20cm x 높이 15cm', type: 'text' },
    { key: 'care', label: '관리 방법', placeholder: '예: 식기세척기 사용 가능', type: 'text' },
    { key: 'shipping', label: '배송 안내', placeholder: '배송 방법/기간/비용', type: 'textarea' },
    { key: 'exchange', label: '교환/반품 안내', placeholder: '교환/반품 조건', type: 'textarea' },
  ],
  pet: [
    { key: 'ingredients', label: '원재료/성분', placeholder: '주원료, 첨가물 등', type: 'textarea' },
    { key: 'target_pet', label: '대상 동물/크기', placeholder: '예: 소형견, 전연령', type: 'text' },
    { key: 'feeding', label: '급여 방법/용량', placeholder: '예: 체중 5kg 기준 1일 2회, 50g씩', type: 'textarea' },
    { key: 'certification', label: '인증', placeholder: '예: 사료관리법 등록', type: 'text' },
    { key: 'shipping', label: '배송 안내', placeholder: '배송 방법/기간/비용', type: 'textarea' },
    { key: 'exchange', label: '교환/반품 안내', placeholder: '교환/반품 조건', type: 'textarea' },
  ],
  kids: [
    { key: 'age_range', label: '대상 연령', placeholder: '예: 0~12개월, 3~7세', type: 'text' },
    { key: 'material', label: '소재', placeholder: '예: 순면 100%, 오가닉 코튼', type: 'text' },
    { key: 'certification', label: '안전 인증', placeholder: '예: KC 안전 인증, 무독성 검사 완료', type: 'text' },
    { key: 'caution', label: '주의사항', placeholder: '예: 36개월 미만 사용 금지, 보호자 감독 하에 사용', type: 'textarea' },
    { key: 'shipping', label: '배송 안내', placeholder: '배송 방법/기간/비용', type: 'textarea' },
    { key: 'exchange', label: '교환/반품 안내', placeholder: '교환/반품 조건', type: 'textarea' },
  ],
  sports: [
    { key: 'material', label: '소재', placeholder: '예: 폴리에스터, 나일론', type: 'text' },
    { key: 'size_info', label: '사이즈/규격', placeholder: '사이즈 표 또는 규격', type: 'textarea' },
    { key: 'features_detail', label: '기능 상세', placeholder: '예: 방수, 속건, UV 차단', type: 'textarea' },
    { key: 'shipping', label: '배송 안내', placeholder: '배송 방법/기간/비용', type: 'textarea' },
    { key: 'exchange', label: '교환/반품 안내', placeholder: '교환/반품 조건', type: 'textarea' },
  ],
  other: [
    { key: 'details', label: '상세 정보', placeholder: '상품 상세 정보를 자유롭게 입력', type: 'textarea' },
    { key: 'shipping', label: '배송 안내', placeholder: '배송 방법/기간/비용', type: 'textarea' },
    { key: 'exchange', label: '교환/반품 안내', placeholder: '교환/반품 조건', type: 'textarea' },
  ],
}

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
