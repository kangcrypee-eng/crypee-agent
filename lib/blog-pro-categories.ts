// BlogPilot Pro — 업종별 사진 카테고리

export interface PhotoCategory {
  value: string
  label: string
  icon: string
}

export const PHOTO_CATEGORIES: Record<string, PhotoCategory[]> = {
  hair_salon: [
    { value: 'procedure_result', label: '시술 결과', icon: '✂️' },
    { value: 'before_after', label: '비포&애프터', icon: '🔄' },
    { value: 'atmosphere', label: '매장 분위기', icon: '🏠' },
    { value: 'designer', label: '디자이너', icon: '👩‍🎨' },
    { value: 'product', label: '제품&도구', icon: '🧴' },
  ],
  cafe: [
    { value: 'menu_drink', label: '음료', icon: '☕' },
    { value: 'menu_dessert', label: '디저트', icon: '🍰' },
    { value: 'interior', label: '매장 내부', icon: '🏠' },
    { value: 'exterior', label: '매장 외부', icon: '🏪' },
    { value: 'seasonal', label: '시즌 메뉴', icon: '🌸' },
  ],
  restaurant: [
    { value: 'main_menu', label: '대표 메뉴', icon: '🍽️' },
    { value: 'side_menu', label: '사이드 메뉴', icon: '🥗' },
    { value: 'interior', label: '매장 내부', icon: '🏠' },
    { value: 'plating', label: '플레이팅', icon: '🎨' },
    { value: 'kitchen', label: '주방', icon: '👨‍🍳' },
  ],
  nail: [
    { value: 'design', label: '네일 디자인', icon: '💅' },
    { value: 'before_after', label: '비포&애프터', icon: '🔄' },
    { value: 'atmosphere', label: '매장 분위기', icon: '🏠' },
    { value: 'product', label: '제품', icon: '🧴' },
    { value: 'seasonal', label: '시즌 디자인', icon: '🌸' },
  ],
  pilates: [
    { value: 'exercise', label: '운동 장면', icon: '🧘' },
    { value: 'before_after', label: '비포&애프터', icon: '🔄' },
    { value: 'interior', label: '센터 내부', icon: '🏠' },
    { value: 'equipment', label: '기구', icon: '🏋️' },
    { value: 'trainer', label: '트레이너', icon: '💪' },
  ],
  clinic: [
    { value: 'procedure', label: '시술/치료', icon: '💉' },
    { value: 'before_after', label: '비포&애프터', icon: '🔄' },
    { value: 'interior', label: '병원 내부', icon: '🏥' },
    { value: 'equipment', label: '장비', icon: '🔬' },
    { value: 'staff', label: '의료진', icon: '👨‍⚕️' },
  ],
  academy: [
    { value: 'class', label: '수업 장면', icon: '📝' },
    { value: 'interior', label: '학원 내부', icon: '🏫' },
    { value: 'material', label: '교재/자료', icon: '📚' },
    { value: 'result', label: '성과/결과', icon: '🏆' },
    { value: 'teacher', label: '강사', icon: '👨‍🏫' },
  ],
  realestate: [
    { value: 'interior', label: '매물 내부', icon: '🏠' },
    { value: 'exterior', label: '매물 외부', icon: '🏢' },
    { value: 'neighborhood', label: '주변 환경', icon: '🌳' },
    { value: 'floorplan', label: '도면/평면도', icon: '📐' },
    { value: 'view', label: '전망', icon: '🌇' },
  ],
  other: [
    { value: 'product', label: '제품/서비스', icon: '📦' },
    { value: 'interior', label: '매장 내부', icon: '🏠' },
    { value: 'exterior', label: '매장 외부', icon: '🏪' },
    { value: 'staff', label: '직원', icon: '👥' },
    { value: 'event', label: '이벤트', icon: '🎉' },
  ],
}

// 카테고리 값 → 라벨 변환
export function getCategoryLabel(businessType: string, categoryValue: string): string {
  const cats = PHOTO_CATEGORIES[businessType] || PHOTO_CATEGORIES.other
  return cats.find(c => c.value === categoryValue)?.label || categoryValue
}

// 해당 업종의 카테고리 값 리스트
export function getCategoryValues(businessType: string): string[] {
  const cats = PHOTO_CATEGORIES[businessType] || PHOTO_CATEGORIES.other
  return cats.map(c => c.value)
}
