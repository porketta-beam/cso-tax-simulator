import type { BusinessType, IncomeTaxBracket, PeriodMode } from "@/config/tax-rates";

/**
 * STAGE 01 — 사용자 입력 (PRD §4.2)
 *
 * 목업의 ①②③④ 넘버링과 대응한다. 금액은 모두 정수 원.
 */
export interface TaxInput {
  /**
   * 세율표를 결정한다 — 개인이면 종합소득세 8구간, 법인이면 법인세 4구간.
   * 없으면 `individual`. 나머지 계산(VAT·4대보험·원천징수·필요경비)은 동일하다.
   */
  businessType?: BusinessType;
  /** 연환산 계수를 결정한다 (PRD §4.3) */
  periodMode: PeriodMode;
  /** 화면 표기용 — "2026 Q2" */
  periodLabel: string;
  /**
   * 연환산 계수 직접 지정 (v2 §3 T2). 있으면 STAGE 03 이 `periodMode` 대신
   * 이 값을 쓴다. v2 는 기간을 자유 범위로 고르므로 월/분기/연 세 값으로는
   * 계수를 표현할 수 없다 — `annualizationFactor(range)` 가 만들어 넣는다.
   */
  annualizationFactor?: number;
  /**
   * 부양가족 수(본인 제외). **개인만** — 법인은 무시한다 (v2 §3 T2-1).
   * 없으면(undefined) 기본공제를 아예 적용하지 않는다. v1 호출부는 이 값을
   * 넘기지 않으므로 계산 결과가 그대로 유지된다.
   */
  dependents?: number;

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
  /**
   * 기본공제 = 150만 × (1 + 부양가족). 법인이거나 부양가족 수를 넘기지
   * 않았으면 0 이다.
   *
   * ⚠️ **연 단위** 금액이라 여기서 빼지 않는다 — 실제 차감은 STAGE 03 이
   * 연환산한 뒤에 한다. 화면의 근거 섹션이 이 줄을 보여 주려고 명세만
   * 여기서 들고 나른다.
   */
  personalDeduction: number;
  /** 기간 과세표준 = 매출 공급가액 − 필요경비 합계 (기본공제 차감 전) */
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
  /**
   * 어느 세율표로 계산했는가. 화면이 businessType 을 다시 읽어 표를 고르면
   * 엔진이 쓴 표와 어긋날 수 있으므로 결과가 직접 들고 나른다.
   * 필드 이름(`annualIncomeTax` 등)은 법인일 때도 그대로다 — 호출부가 너무 많다.
   */
  taxKind: "income" | "corporate";
  /** 적용에 쓴 누진 구간 전체. 화면의 구간바가 이 배열을 그린다 */
  brackets: readonly IncomeTaxBracket[];
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
