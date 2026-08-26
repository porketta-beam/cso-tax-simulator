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
  /** 한 줄 설명 */
  desc: string;
  /** 가격 또는 혜택 */
  price: string;
}

export const PRODUCTS: readonly MockProduct[] = [
  {
    emoji: "🧾",
    name: "세금계산서 대행",
    desc: "발행부터 보관까지 대신 처리합니다",
    price: "월 19,800원",
  },
  {
    emoji: "💳",
    name: "카드 매입 자동 수집",
    desc: "적격증빙만 골라 장부에 모아둡니다",
    price: "월 9,900원",
  },
  {
    emoji: "🛡️",
    name: "CSO 배상책임보험",
    desc: "영업 중 사고에 대비하는 기본 보장",
    price: "연 12만원부터",
  },
  {
    emoji: "🚗",
    name: "업무용 차량 리스",
    desc: "리스료와 유류비를 경비로 처리합니다",
    price: "월 39만원부터",
  },
  {
    emoji: "📒",
    name: "세무 기장",
    desc: "매달 장부를 세무사가 마감합니다",
    price: "월 11만원부터",
  },
  {
    emoji: "🖥️",
    name: "사무용품",
    desc: "1인 사업자 필수 품목을 묶어 배송합니다",
    price: "제휴가 15% 할인",
  },
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
    specialty: "제약·의료기기 CSO",
    region: "서울 강남",
    intro: "CSO 수수료 구조와 원천징수를 12년 다뤘습니다",
    href: inquiry("김지현 세무사"),
  },
  {
    emoji: "👨🏻‍💼",
    name: "박성호 세무사",
    verified: true,
    specialty: "의약품 유통·도매",
    region: "경기 성남",
    intro: "부가세 신고와 매입 증빙 정리를 함께 봅니다",
    href: inquiry("박성호 세무사"),
  },
  {
    emoji: "🧑🏻‍💼",
    name: "이수민 세무사",
    verified: false,
    specialty: "1인 사업자 기장",
    region: "부산 해운대",
    intro: "처음 사업자를 낸 분들 상담이 많습니다",
    href: inquiry("이수민 세무사"),
  },
  {
    emoji: "👩🏻‍🏫",
    name: "정우진 세무사",
    verified: true,
    specialty: "법인 전환·대표 급여 설계",
    region: "대구 수성",
    intro: "개인에서 법인으로 넘어갈 시점을 같이 계산합니다",
    href: inquiry("정우진 세무사"),
  },
] as const;
