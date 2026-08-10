import type { IncomeTaxBracket, PeriodMode } from "@/config/tax-rates";

/**
 * STAGE 01 — 사용자 입력 (PRD §4.2)
 *
 * 목업의 ①②③④ 넘버링과 대응한다. 금액은 모두 정수 원.
 */
export interface TaxInput {
  /** 연환산 계수를 결정한다 (PRD §4.3) */
  periodMode: PeriodMode;
  /** 화면 표기용 — "2026 Q2" */
  periodLabel: string;

  /** ① CSO 수수료 매출 — VAT 포함 수령액 */
  revenue: number;
  /** ② 적격증빙 지출 — VAT 포함. 매입세액 공제 대상은 이 버킷뿐이다 */
  qualifiedEvidence: number;

  /** ③ 인건비 — 프리랜서 지급액 (세전 총액) */
  freelancerPay: number;
  /** ③ 인건비 — 정규직 급여 (세전 총액). 4대보험 산정 기준 */
  salary: number;

  /** ④ 고정비 — 임차료·통신비·공과금 (VAT 포함). 경비 산입, VAT 불공제 */
  fixedCost: number;
  /** ④ 불공제 비용 — 접대비·간이영수증 (VAT 포함). 경비 산입, VAT 불공제 */
  nonDeductibleCost: number;
}

/** VAT 역산 결과 — 한 버킷분 */
export interface VatSplit {
  /** VAT 포함 총액 */
  gross: number;
  /** 공급가액 = 버림(총액 ÷ (1 + 세율)) */
  supply: number;
  /** VAT = 총액 − 공급가액 */
  vat: number;
}

/** 4대보험 회사부담 명세 (PRD §4.1 INS) */
export interface InsuranceBreakdown {
  nationalPension: number;
  healthInsurance: number;
  /** 건강보험료 기준으로 계산된다 (급여 기준이 아니다) */
  longTermCare: number;
  employmentInsurance: number;
  employmentStability: number;
  industrialAccident: number;
  /** 회사부담 합계 — 필요경비에 산입된다 */
  total: number;
}

/** 필요경비 명세 (PRD §4.4) */
export interface ExpenseBreakdown {
  /** 적격증빙 매입 공급가액 (VAT 제외분) */
  qualifiedSupply: number;
  /** 인건비 = 프리랜서 + 정규직, 세전 총액 */
  payroll: number;
  /** 고정비 + 불공제, VAT 포함액 */
  fixedAndNonDeductible: number;
  /** 4대보험 회사부담분 */
  insurance: number;
  total: number;
}

/** STAGE 02 — 정제·차감 */
export interface Stage02TaxBase {
  input: TaxInput;
  revenueVat: VatSplit;
  purchaseVat: VatSplit;
  /** 납부 VAT = 매출 VAT − 매입 VAT. 음수면 환급 대상이나 1단계는 그대로 표시 */
  vatPayable: number;
  insurance: InsuranceBreakdown;
  expenses: ExpenseBreakdown;
  /** 기간 과세표준 = 매출 공급가액 − 필요경비 합계 */
  taxBase: number;
}

/** 프리랜서 원천징수 — 정보성 표시 전용. 회사 부담이 아니다 (PRD §4.1) */
export interface WithholdingInfo {
  /** 원천징수세액 = 지급액 × 3.3% */
  amount: number;
  /** 실지급액 = 지급액 − 원천징수세액 */
  netPaid: number;
}

/** STAGE 03 — 세율·보험 */
export interface Stage03Rates {
  prev: Stage02TaxBase;
  /** 연환산 계수 (월간 12 · 분기 4 · 연간 1) */
  annualizationFactor: number;
  /** 연환산 과세표준 = 기간 과세표준 × 계수 */
  annualizedTaxBase: number;
  /** 적용된 누진 구간 */
  bracket: IncomeTaxBracket;
  bracketIndex: number;
  /** 연간 산출세액 = 연환산 과세표준 × 세율 − 누진공제 */
  annualIncomeTax: number;
  /** 기간 귀속 산출세액 = 연간 산출세액 ÷ 계수 */
  periodIncomeTax: number;
  /** 지방소득세 = 기간 귀속 산출세액 × 10% */
  localIncomeTax: number;
  /** 기간 귀속 소득세 합계 = 산출세액 + 지방소득세 */
  totalIncomeTax: number;
  withholding: WithholdingInfo;
  /** 연환산이 적용됐는가 — 화면에 "연환산 기준 추정치" 라벨을 띄우는 조건 */
  isAnnualized: boolean;
}

/** 유출 항목 명세 (PRD §4.5) */
export interface OutflowBreakdown {
  qualifiedEvidence: number;
  payroll: number;
  fixedAndNonDeductible: number;
  insurance: number;
  vat: number;
  incomeTax: number;
  total: number;
}

/** 적립 권장 항목 (PRD §4.6) */
export interface ReserveItem {
  label: string;
  amount: number;
}

/** STAGE 04 — 결과 */
export interface Stage04NetCash {
  prev: Stage03Rates;
  /** 유입 = 매출 (VAT 포함 수령액) */
  inflow: number;
  outflow: OutflowBreakdown;
  /** Net Cash = 유입 − 유출 */
  netCash: number;
  /** 세후 마진율 = Net Cash ÷ 매출 (0~1). 라벨은 반드시 "세후" */
  marginRate: number;
  reserveItems: ReserveItem[];
  /** 적립 권장 합계 = 납부 VAT + 소득세 + 지방소득세 + 4대보험 회사부담 */
  reserveTotal: number;
}

/** 파이프라인 전체 결과 */
export interface TaxSimulation {
  input: TaxInput;
  stage02: Stage02TaxBase;
  stage03: Stage03Rates;
  stage04: Stage04NetCash;
}
