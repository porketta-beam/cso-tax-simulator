/**
 * 쇼핑(P1) · 세무사 추천(A1) 화면의 **시연용 목업** (기능정의 v2 §3, §8)
 *
 * 제휴 상품과 세무사는 아직 정해지지 않았다. 실데이터로 넘어갈 때 이 파일만
 * 교체하면 되도록, 화면은 여기 정의된 모양에만 의존한다 — 가격도 숫자가 아니라
 * 문구다. 목업 단계에서 통화 연산을 흉내 내면 나중에 실제 가격 체계(부가세
 * 포함 여부·할인·구독 주기)와 어긋난 계산기가 하나 더 생긴다.
 */

/** 상담 요청 mailto — 제목에 한국어가 들어가므로 반드시 인코딩한다 */
function inquiry(name: string): string {
  return `mailto:tax@example.com?subject=${encodeURIComponent(
    `[CSO 세무] ${name} 상담 요청`,
  )}`;
}

export interface MockProduct {
  /** 상품 이미지 자리 */
  emoji: string;
  name: string;
  /** 가격 또는 혜택 */
  price: string;
}

/**
 * 2차 시안에서 상품이 "병원 방문 선물" 컨셉으로 바뀌었다. CSO 가 실제로 사는
 * 것은 세무 서비스가 아니라 거래처에 들고 갈 물건이고, 그 지출이 곧 장부의
 * 접대비·판촉비 행이 된다.
 */
export const PRODUCTS: readonly MockProduct[] = [
  { emoji: "🎁", name: "홍삼 정과 선물세트", price: "89,000원" },
  { emoji: "☕", name: "프리미엄 원두 드립백 30입", price: "32,000원" },
  { emoji: "🍰", name: "수제 디저트 박스 12구", price: "28,000원" },
  { emoji: "🍎", name: "제철 과일 바구니", price: "65,000원" },
  { emoji: "🍵", name: "전통 차 6종 세트", price: "41,000원" },
  { emoji: "🧺", name: "간식 스낵 박스 대용량", price: "24,900원" },
] as const;

export interface MockAdvisor {
  /** 프로필 사진 자리 */
  emoji: string;
  name: string;
  /** 우리가 확인한 세무사인가 — 배지로 표시된다 */
  verified: boolean;
  specialty: string;
  region: string;
  /** 한 줄 소개 */
  intro: string;
  /** "상담 요청" 이 여는 mailto */
  href: string;
}

export const ADVISORS: readonly MockAdvisor[] = [
  {
    emoji: "👩🏻‍💼",
    name: "김지현 세무사",
    verified: true,
    specialty: "제약·의료기기 CSO 전문",
    region: "서울 강남",
    intro: "상담 12년 · 수수료 매출 신고를 가장 많이 다뤘습니다.",
    href: inquiry("김지현 세무사"),
  },
  {
    emoji: "👨🏻‍💼",
    name: "박상우 세무사",
    verified: true,
    specialty: "프리랜서 인건비·원천징수",
    region: "서울 마포",
    intro: "인건비 비중이 큰 1인 사업자를 주로 봅니다.",
    href: inquiry("박상우 세무사"),
  },
  {
    emoji: "👩🏽‍💼",
    name: "이수민 세무사",
    verified: true,
    specialty: "부가세 신고·환급",
    region: "경기 성남",
    intro: "적격증빙 정리부터 예정신고까지 함께 봅니다.",
    href: inquiry("이수민 세무사"),
  },
  {
    emoji: "👨🏾‍💼",
    name: "정태호 세무사",
    verified: true,
    specialty: "법인 전환 검토",
    region: "부산 해운대",
    intro: "매출 3억 전후 개인사업자 전환 상담이 많습니다.",
    href: inquiry("정태호 세무사"),
  },
] as const;
