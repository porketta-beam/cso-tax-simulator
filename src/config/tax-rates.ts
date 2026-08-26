/**
 * 세율·요율 단일 출처 (PRD §4 Single Source of Truth)
 *
 * ⚠️ 모든 세율·요율·한도는 이 파일에서만 정의한다. 화면 컴포넌트와 계산 함수
 * 어디에서도 숫자 리터럴을 직접 쓰지 않는다. 세법이 개정되면 여기만 고치면
 * 전체가 갱신된다. 계산 기준 화면(S-07)은 이 파일을 그대로 렌더링한다.
 *
 * 엔진은 이 객체를 인자로 받는다(`simulate(input, rates)`). 기본값을 쓰되
 * 주입 가능하게 둔 이유:
 *   · 세법 개정 시 과거 기간을 옛 요율로 재계산해야 한다
 *   · PRD §13 의 미해결 이슈(업종별 산재요율 등)를 나중에 사용자 선택으로 승격
 *   · 검증 테스트가 특정 요율 조합을 고정할 수 있다
 */

/** 세율 기준일. 화면에 반드시 노출한다 (PRD §10). */
export const TAX_RATES_EFFECTIVE_DATE = "2026-01-01";

/** 기간 모드 → 연환산 계수 (PRD §4.3) */
export const ANNUALIZATION_FACTOR = {
  month: 12,
  quarter: 4,
  year: 1,
} as const;

export type PeriodMode = keyof typeof ANNUALIZATION_FACTOR;

export interface IncomeTaxBracket {
  /** 이 금액 이하까지 해당 세율. 최상단 구간은 Infinity */
  readonly upTo: number;
  /** 0.06 = 6% */
  readonly rate: number;
  /** 누진공제액 */
  readonly progressiveDeduction: number;
  /** 화면 표시용 짧은 라벨 */
  readonly label: string;
}

export interface InsuranceRates {
  /** 국민연금 — 정규직 급여 기준, 회사부담 */
  readonly nationalPension: number;
  /** 건강보험 — 정규직 급여 기준, 회사부담 */
  readonly healthInsurance: number;
  /**
   * 장기요양보험 — 건강보험료 기준(급여 기준이 아니다).
   *
   * ⚠️ PRD 내부 불일치: §4.1 은 "목업 누락 → 추가"로 이 항목을 요구하지만,
   * §5.3 검증 벡터의 4대보험 합계 1,181,400 은 이 항목을 뺀 값이다
   * (540,000 + 425,400 + 108,000 + 108,000). §11-5 가 "장기요양보험료 항목
   * 추가"를 변경 사항으로 명시하므로 PRD 의 의도는 포함이고 §5 표가 갱신되지
   * 않은 것으로 판단해 기본값에 포함했다. 검증 테스트는 이 값을 0 으로
   * 주입해 §5 의 발표 수치를 그대로 고정한다.
   * → 클라이언트 확인 필요.
   */
  readonly longTermCare: number;
  /** 고용보험 실업급여 사업주분 — 정규직 급여 기준 */
  readonly employmentInsurance: number;
  /**
   * 고용안정·직업능력개발사업 사업주 부담분.
   * PRD §13-3: 150인 미만 0.25% 이나 1단계 미반영. 자리만 확보하고 기본값 0.
   */
  readonly employmentStability: number;
  /**
   * 산재보험 — 업종별로 상이하다(PRD §13-2). 1단계는 기본값 사용,
   * 2단계에서 업종 선택으로 승격한다.
   */
  readonly industrialAccident: number;
}

/**
 * 사업자 유형. 세율표를 고르는 유일한 기준이다.
 *
 * 이 타입이 state 가 아니라 config 에 있는 이유: 세율표를 고르는 것이
 * 이 값의 유일한 쓸모인데, config 는 state 를 import 할 수 없다(단방향).
 * `@/state/simulator-reducer` 에서 그대로 re-export 하므로 기존 import 는
 * 그대로 동작한다.
 */
export type BusinessType = "individual" | "corporate";

export interface TaxRates {
  readonly effectiveDate: string;
  /** 부가가치세율 */
  readonly vat: number;
  /** 종합소득세 누진 구간 — 반드시 upTo 오름차순 */
  readonly incomeTaxBrackets: readonly IncomeTaxBracket[];
  /** 법인세 누진 구간 — 반드시 upTo 오름차순 */
  readonly corporateTaxBrackets: readonly IncomeTaxBracket[];
  /** 지방소득세 = 산출세액 × 이 값 */
  readonly localIncomeTax: number;
  /** 4대보험 회사부담 요율 */
  readonly insurance: InsuranceRates;
  /** 프리랜서 원천징수 (소득세 3% + 지방소득세 0.3%) */
  readonly freelancerWithholding: number;
  /**
   * 국민연금 기준소득월액 상한.
   * PRD §13-1: 1단계 미반영. null 이면 상한을 적용하지 않는다.
   * 고소득 정규직에서 국민연금이 과대계상될 수 있다.
   */
  readonly pensionMonthlyIncomeCap: number | null;
}

/** 현행 종합소득세 8구간 (PRD §4.1 TAX-B · 2026년 현행) */
export const INCOME_TAX_BRACKETS: readonly IncomeTaxBracket[] = [
  { upTo: 14_000_000, rate: 0.06, progressiveDeduction: 0, label: "1,400만" },
  { upTo: 50_000_000, rate: 0.15, progressiveDeduction: 1_260_000, label: "5,000만" },
  { upTo: 88_000_000, rate: 0.24, progressiveDeduction: 5_760_000, label: "8,800만" },
  { upTo: 150_000_000, rate: 0.35, progressiveDeduction: 15_440_000, label: "1.5억" },
  { upTo: 300_000_000, rate: 0.38, progressiveDeduction: 19_940_000, label: "3억" },
  { upTo: 500_000_000, rate: 0.4, progressiveDeduction: 25_940_000, label: "5억" },
  { upTo: 1_000_000_000, rate: 0.42, progressiveDeduction: 35_940_000, label: "10억" },
  { upTo: Infinity, rate: 0.45, progressiveDeduction: 65_940_000, label: "10억↑" },
] as const;

/**
 * 법인세 4구간 — 2026 사업연도
 *
 * 2025년 12월 개정으로 **2026-01-01 이후 개시하는 사업연도**부터 전 구간이
 * +1%p 올랐다 (9/19/21/24% → 10/20/22/25%). 그 이전 사업연도를 재계산하려면
 * 옛 표를 별도로 만들어 `TaxRates` 로 주입한다.
 * 출처: 국세청 「법인세 세율」
 * https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7746&mi=2372
 *
 * 누진공제는 개인 세율표와 같은 방식으로 뽑았다 —
 * 직전 구간 누진공제 + 직전 구간 상한 × 세율차:
 *     2억 × (20% − 10%) =        20,000,000
 *   200억 × (22% − 20%) =       400,000,000 → 누적     420,000,000
 *  3,000억 × (25% − 22%) =    9,000,000,000 → 누적   9,420,000,000
 */
export const CORPORATE_TAX_BRACKETS: readonly IncomeTaxBracket[] = [
  { upTo: 200_000_000, rate: 0.1, progressiveDeduction: 0, label: "2억" },
  { upTo: 20_000_000_000, rate: 0.2, progressiveDeduction: 20_000_000, label: "200억" },
  {
    upTo: 300_000_000_000,
    rate: 0.22,
    progressiveDeduction: 420_000_000,
    label: "3,000억",
  },
  {
    upTo: Infinity,
    rate: 0.25,
    progressiveDeduction: 9_420_000_000,
    label: "3,000억↑",
  },
] as const;

/** 기본 세율표 — 2026-01-01 기준 */
export const DEFAULT_TAX_RATES: TaxRates = {
  effectiveDate: TAX_RATES_EFFECTIVE_DATE,
  vat: 0.1,
  incomeTaxBrackets: INCOME_TAX_BRACKETS,
  corporateTaxBrackets: CORPORATE_TAX_BRACKETS,
  localIncomeTax: 0.1,
  insurance: {
    nationalPension: 0.045,
    healthInsurance: 0.03545,
    longTermCare: 0.1295,
    employmentInsurance: 0.009,
    employmentStability: 0,
    industrialAccident: 0.009,
  },
  freelancerWithholding: 0.033,
  pensionMonthlyIncomeCap: null,
};

/**
 * 사업자 유형에 맞는 누진 세율표. 엔진(STAGE 03)과 화면이 같은 함수를 쓴다.
 * 화면이 세율표를 직접 고르면 엔진이 쓴 표와 어긋나 강조된 구간이 틀어진다.
 */
export function bracketsFor(
  businessType: BusinessType | undefined,
  rates: TaxRates = DEFAULT_TAX_RATES,
): readonly IncomeTaxBracket[] {
  return businessType === "corporate"
    ? rates.corporateTaxBrackets
    : rates.incomeTaxBrackets;
}

/**
 * 매입세액 공제가 가능한 증빙 유형 (PRD §4.1 TAX-A).
 * 간이영수증·무증빙은 불공제.
 */
export const EVIDENCE_TYPES = {
  card: { label: "신용카드", deductible: true },
  taxInvoice: { label: "세금계산서", deductible: true },
  cashReceipt: { label: "현금영수증(지출증빙)", deductible: true },
  simpleReceipt: { label: "간이영수증", deductible: false },
  none: { label: "무증빙", deductible: false },
} as const;

export type EvidenceType = keyof typeof EVIDENCE_TYPES;

/** 지출 명세의 비용 구분 (PRD §6.3) */
export const COST_CATEGORIES = {
  qualified: { label: "적격증빙 매입", vatDeductible: true },
  fixed: { label: "고정비", vatDeductible: false },
  nonDeductible: { label: "불공제", vatDeductible: false },
  payroll: { label: "인건비", vatDeductible: false },
} as const;

export type CostCategory = keyof typeof COST_CATEGORIES;

/**
 * 매입세액 공제 가능 판정 (PRD §6.3 자동 판정 규칙)
 *
 *   공제 가능 = 증빙유형 ∈ {신용카드, 세금계산서, 현금영수증}
 *              AND 비용구분 ≠ 불공제
 *
 * 명세(S-03)의 합계를 집계 입력으로 되돌릴 때는 **비용 구분 라벨이 아니라 이
 * 판정 결과로** 버킷을 나눈다. 즉 "고정비 + 세금계산서" 한 건은 적격증빙
 * 버킷으로 들어가 매입세액이 공제된다. 라벨로 나누면 화면의 `공제` 배지와
 * 실제 계산이 어긋난다 — 세금계산서를 받은 임차료는 실제로 공제 대상이다.
 */
export function isVatDeductible(
  evidence: EvidenceType,
  category: CostCategory,
): boolean {
  return EVIDENCE_TYPES[evidence].deductible && category !== "nonDeductible";
}

/**
 * 장부 수입 항목 (v2 §3 T1-a)
 *
 * 두 항목 다 매출로 집계된다 — VAT 포함 수령액이라는 점이 같기 때문이다.
 * 나뉘어 있는 이유는 화면에서 "이 달 CSO 수수료가 얼마인가"를 사용자가
 * 구분해 보기 위해서다.
 */
export const INCOME_CATEGORIES = {
  sales: { label: "CSO 수수료 매출" },
  otherIncome: { label: "기타 수입" },
} as const;

export type IncomeCategory = keyof typeof INCOME_CATEGORIES;

/**
 * 장부 지출 항목 (v2 §3 T1-a)
 *
 * v1 의 `COST_CATEGORIES` 에서 `payroll` 하나를 프리랜서/정규직으로 쪼갠
 * 것이다. 집계 입력이 둘을 다르게 다루기 때문이다 — 정규직 급여만 4대보험
 * 산정 기준이 되고, 프리랜서 지급액만 원천징수 표시 대상이다. v1 은 명세에
 * 급여대장을 넣는 사용자가 없다고 보고 전부 프리랜서로 붙였는데, 장부가
 * 주 입력 수단이 되는 v2 에서는 그 가정이 깨진다.
 */
export const EXPENSE_CATEGORIES = {
  qualified: { label: "적격증빙 매입", vatDeductible: true },
  fixed: { label: "고정비", vatDeductible: false },
  nonDeductible: { label: "불공제", vatDeductible: false },
  payrollFreelancer: { label: "인건비 · 프리랜서", vatDeductible: false },
  payrollSalary: { label: "인건비 · 정규직", vatDeductible: false },
} as const;

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

/**
 * 기본공제 1인당 금액 — 소득세법 §50 (본인 + 부양가족 각 150만원).
 * **개인만** 적용한다. 법인은 기본공제라는 개념이 없다.
 */
export const PERSONAL_DEDUCTION_PER_PERSON = 1_500_000;

/**
 * 국민연금 기준소득월액 상한 (2025.7 ~ 2026.6 적용, 국민연금공단 고시).
 * 설정에서 "상한 적용"을 켜면 `TaxRates.pensionMonthlyIncomeCap` 로 들어간다.
 * 끄면 null — 급여 전액이 기준이 되어 고소득 정규직에서 과대계상된다.
 */
export const PENSION_MONTHLY_INCOME_CAP = 6_170_000;
