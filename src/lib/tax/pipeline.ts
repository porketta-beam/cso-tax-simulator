/**
 * 계산 파이프라인 (PRD §4.2 — 단방향)
 *
 *   STAGE 01  사용자 입력 (TaxInput)
 *      ↓
 *   STAGE 02  정제·차감 — VAT 역산 · 4대보험 · 필요경비 · 과세표준
 *      ↓
 *   STAGE 03  세율·보험 — 연환산 → 누진 매핑 → 기간 귀속 · 지방소득세
 *      ↓
 *   STAGE 04  결과 — Net Cash · 마진율 · 적립금 제안
 *
 * 각 단계는 **직전 단계의 산출물만** 읽는다. 역방향 참조 금지. 그래서 각
 * 단계 결과가 `prev` 로 이전 단계를 물고 간다.
 *
 * 4대보험은 PRD §4.2 상 STAGE 03 에 그려져 있지만, §4.4 가 회사부담분을
 * 필요경비에 산입하라고 하므로 과세표준보다 먼저 나와야 한다. 그래서
 * STAGE 02 에서 계산하고 STAGE 03 은 표시만 한다.
 */

import {
  DEFAULT_TAX_RATES,
  ANNUALIZATION_FACTOR,
  PERSONAL_DEDUCTION_PER_PERSON,
  bracketsFor,
  type IncomeTaxBracket,
  type TaxRates,
} from "@/config/tax-rates";
import { applyRate, atLeastZero, divideByOnePlusRate, mulDivFloor, won } from "./money";
import type {
  ExpenseBreakdown,
  InsuranceBreakdown,
  Stage02TaxBase,
  Stage03Rates,
  Stage04NetCash,
  TaxInput,
  TaxSimulation,
  VatSplit,
} from "./types";

/**
 * VAT 역산 (PRD §4.1 TAX-A)
 *
 *   공급가액 = 버림(VAT포함가 ÷ 1.1)
 *   VAT      = VAT포함가 − 공급가액
 *
 * VAT 를 따로 버림하지 않고 차액으로 구하는 이유: 공급가액 + VAT 가 항상
 * 원래 총액과 정확히 일치해야 화면에서 사용자가 눈으로 검산할 수 있다.
 */
export function splitVat(gross: number, vatRate: number): VatSplit {
  const safeGross = won(atLeastZero(gross));
  const supply = divideByOnePlusRate(safeGross, vatRate);
  return { gross: safeGross, supply, vat: safeGross - supply };
}

/**
 * 4대보험 회사부담 (PRD §4.1 INS)
 *
 * 기준은 **정규직 급여**다. 프리랜서 지급액은 4대보험 대상이 아니다.
 * 장기요양보험만 급여가 아니라 건강보험료를 기준으로 계산한다.
 */
export function calcInsurance(
  salary: number,
  rates: TaxRates = DEFAULT_TAX_RATES,
): InsuranceBreakdown {
  const { insurance, pensionMonthlyIncomeCap } = rates;
  const base = won(atLeastZero(salary));

  // PRD §13-1: 상한은 1단계 미적용. null 이면 급여 전액이 기준이다.
  const pensionBase =
    pensionMonthlyIncomeCap === null ? base : Math.min(base, pensionMonthlyIncomeCap);

  const nationalPension = applyRate(pensionBase, insurance.nationalPension);
  const healthInsurance = applyRate(base, insurance.healthInsurance);
  const longTermCare = applyRate(healthInsurance, insurance.longTermCare);
  const employmentInsurance = applyRate(base, insurance.employmentInsurance);
  const employmentStability = applyRate(base, insurance.employmentStability);
  const industrialAccident = applyRate(base, insurance.industrialAccident);

  return {
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    employmentStability,
    industrialAccident,
    total:
      nationalPension +
      healthInsurance +
      longTermCare +
      employmentInsurance +
      employmentStability +
      industrialAccident,
  };
}

/** STAGE 02 — 정제·차감 */
export function runStage02(
  input: TaxInput,
  rates: TaxRates = DEFAULT_TAX_RATES,
): Stage02TaxBase {
  const revenueVat = splitVat(input.revenue, rates.vat);
  const purchaseVat = splitVat(input.qualifiedEvidence, rates.vat);
  const vatPayable = revenueVat.vat - purchaseVat.vat;

  const insurance = calcInsurance(input.salary, rates);

  // PRD §4.4 — 산입: 적격증빙 공급가액 · 인건비(세전) · 고정비·불공제(VAT 포함)
  //            · 4대보험 회사부담분
  //            제외: 프리랜서 원천세(인건비에 이미 포함), 근로자부담 보험료
  const payroll = won(atLeastZero(input.freelancerPay)) + won(atLeastZero(input.salary));
  const fixedAndNonDeductible =
    won(atLeastZero(input.fixedCost)) + won(atLeastZero(input.nonDeductibleCost));

  const personalDeduction = personalDeductionFor(input);

  const expenses: ExpenseBreakdown = {
    qualifiedSupply: purchaseVat.supply,
    payroll,
    fixedAndNonDeductible,
    insurance: insurance.total,
    total: purchaseVat.supply + payroll + fixedAndNonDeductible + insurance.total,
  };

  return {
    input,
    revenueVat,
    purchaseVat,
    vatPayable,
    insurance,
    expenses,
    personalDeduction,
    // 과세표준은 음수가 될 수 있다(결손). 표시용으로는 그대로 두고,
    // 세액 계산에서만 0 으로 눌러 준다.
    taxBase: revenueVat.supply - expenses.total - personalDeduction,
  };
}

/**
 * 기본공제 = 150만 × (본인 1 + 부양가족) — 소득세법 §50 (v2 §3 T2-1)
 *
 * 법인은 0 이다. `dependents` 를 넘기지 않은 호출부도 0 이다 — v1 결과가
 * 부양가족 항목이 생겼다는 이유만으로 달라지면 안 된다.
 */
function personalDeductionFor(input: TaxInput): number {
  if (input.businessType === "corporate" || input.dependents === undefined) return 0;
  const dependents = Math.max(0, Math.trunc(input.dependents));
  return PERSONAL_DEDUCTION_PER_PERSON * (1 + dependents);
}

/** 과세표준이 속하는 누진 구간을 찾는다. brackets 는 upTo 오름차순이어야 한다. */
export function findBracket(
  taxBase: number,
  brackets: readonly IncomeTaxBracket[],
): { bracket: IncomeTaxBracket; index: number } {
  const index = brackets.findIndex((b) => taxBase <= b.upTo);
  const safeIndex = index === -1 ? brackets.length - 1 : index;
  return { bracket: brackets[safeIndex], index: safeIndex };
}

/**
 * STAGE 03 — 세율·보험 (PRD §4.3 연환산)
 *
 *   연환산_과세표준 = 기간_과세표준 × 계수
 *   연간_산출세액   = 세율표적용(연환산_과세표준)
 *   기간_산출세액   = 연간_산출세액 ÷ 계수
 *
 * 분기 금액에 연간 누진세율표를 그대로 적용하면 구간이 과소 적용되어 세금이
 * 크게 과소평가된다. 목업의 가장 중대한 오류였다.
 *
 * 법인은 세율표만 갈아 끼운다 — 연환산·정수 연산·지방소득세 10% 는 동일하다.
 */
export function runStage03(
  prev: Stage02TaxBase,
  rates: TaxRates = DEFAULT_TAX_RATES,
): Stage03Rates {
  // v2 는 자유 범위라 계수를 직접 넘긴다. 0 이나 음수가 들어오면 기간 귀속
  // 환산에서 0 으로 나누게 되므로 환산 없음(1)으로 떨어뜨린다.
  const requested = prev.input.annualizationFactor;
  const factor =
    requested !== undefined && Number.isFinite(requested) && requested > 0
      ? requested
      : ANNUALIZATION_FACTOR[prev.input.periodMode];
  const taxableBase = atLeastZero(prev.taxBase);
  const annualizedTaxBase = won(taxableBase * factor);

  const isCorporate = prev.input.businessType === "corporate";
  const brackets = bracketsFor(prev.input.businessType, rates);
  const { bracket, index } = findBracket(annualizedTaxBase, brackets);

  const annualIncomeTax = atLeastZero(
    applyRate(annualizedTaxBase, bracket.rate) - bracket.progressiveDeduction,
  );
  const periodIncomeTax = mulDivFloor(annualIncomeTax, 1, factor);
  const localIncomeTax = applyRate(periodIncomeTax, rates.localIncomeTax);

  const withholdingAmount = applyRate(
    atLeastZero(prev.input.freelancerPay),
    rates.freelancerWithholding,
  );

  return {
    prev,
    annualizationFactor: factor,
    annualizedTaxBase,
    taxKind: isCorporate ? "corporate" : "income",
    brackets,
    bracket,
    bracketIndex: index,
    annualIncomeTax,
    periodIncomeTax,
    localIncomeTax,
    totalIncomeTax: periodIncomeTax + localIncomeTax,
    withholding: {
      amount: withholdingAmount,
      netPaid: won(atLeastZero(prev.input.freelancerPay)) - withholdingAmount,
    },
    isAnnualized: factor > 1,
  };
}

/**
 * STAGE 04 — Net Cash (PRD §4.5)
 *
 * 회계상 손익이 아니라 "통장에 실제로 남는 돈"이다. 그래서 유출에 매입
 * 지출을 VAT 포함 실지출액으로 넣고, 프리랜서 원천세는 넣지 않는다
 * (인건비 지급액에 이미 포함돼 있어 이중 차감이 된다).
 */
export function runStage04(prev: Stage03Rates): Stage04NetCash {
  const s02 = prev.prev;
  const { input } = s02;

  const outflow = {
    qualifiedEvidence: won(atLeastZero(input.qualifiedEvidence)),
    payroll: s02.expenses.payroll,
    fixedAndNonDeductible: s02.expenses.fixedAndNonDeductible,
    insurance: s02.insurance.total,
    vat: atLeastZero(s02.vatPayable),
    incomeTax: prev.totalIncomeTax,
    total: 0,
  };
  outflow.total =
    outflow.qualifiedEvidence +
    outflow.payroll +
    outflow.fixedAndNonDeductible +
    outflow.insurance +
    outflow.vat +
    outflow.incomeTax;

  const inflow = won(atLeastZero(input.revenue));
  const netCash = inflow - outflow.total;

  // PRD §4.6 — 신고 시점에 미리 빼둘 돈
  const reserveItems = [
    { label: "납부 VAT · 예정 신고", amount: atLeastZero(s02.vatPayable) },
    {
      label:
        prev.taxKind === "corporate"
          ? "법인세 + 지방소득세"
          : "소득세 + 지방소득세",
      amount: prev.totalIncomeTax,
    },
    { label: "4대보험 회사 부담", amount: s02.insurance.total },
  ];

  return {
    prev,
    inflow,
    outflow,
    netCash,
    marginRate: inflow > 0 ? netCash / inflow : 0,
    reserveItems,
    reserveTotal: reserveItems.reduce((sum, it) => sum + it.amount, 0),
  };
}

/** 파이프라인 전체 실행. 화면은 이 함수 하나만 호출한다. */
export function simulate(
  input: TaxInput,
  rates: TaxRates = DEFAULT_TAX_RATES,
): TaxSimulation {
  const stage02 = runStage02(input, rates);
  const stage03 = runStage03(stage02, rates);
  const stage04 = runStage04(stage03);
  return { input, stage02, stage03, stage04 };
}
