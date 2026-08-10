import { describe, expect, it } from "vitest";
import {
  DEFAULT_TAX_RATES,
  INCOME_TAX_BRACKETS,
  type TaxRates,
} from "@/config/tax-rates";
import { findBracket, simulate, splitVat } from "../pipeline";
import { applyRate, formatPercent } from "../money";
import type { TaxInput } from "../types";

/**
 * PRD §5 검증 벡터 — 목업 예시 재계산
 *
 * "이 값은 단위 테스트의 기준값으로 사용한다" (PRD §5). 세법이 개정되거나
 * 파이프라인을 손볼 때 이 파일이 회귀를 잡는다. 여기 숫자를 고치려면 반드시
 * PRD 를 먼저 고쳐야 한다.
 *
 * ⚠️ 장기요양보험 — PRD 내부에 불일치가 있다. §4.1 과 §11-5 는 항목 추가를
 * 요구하지만 §5.3 의 4대보험 합계 1,181,400 은 장기요양을 뺀 값이다
 * (540,000 + 425,400 + 108,000 + 108,000). 아래 벡터 테스트는 §5 가 발표한
 * 수치를 그대로 고정하기 위해 장기요양 요율을 0 으로 주입한다. 출고 기본값은
 * 장기요양을 포함하며, 그 차이는 아래 두 번째 describe 에서 검증한다.
 */
const RATES_AS_PUBLISHED: TaxRates = {
  ...DEFAULT_TAX_RATES,
  insurance: { ...DEFAULT_TAX_RATES.insurance, longTermCare: 0 },
};

/** PRD §5.1 — 2026 Q2 · 분기 모드 · 개인 종합소득세 */
const VECTOR_INPUT: TaxInput = {
  periodMode: "quarter",
  periodLabel: "2026 Q2",
  revenue: 120_000_000,
  qualifiedEvidence: 28_000_000,
  freelancerPay: 30_000_000,
  salary: 12_000_000,
  fixedCost: 4_500_000 + 1_800_000, // 임차료 + 통신비·공과금
  nonDeductibleCost: 3_200_000, // 접대비 등
};

describe("PRD §5 검증 벡터 (장기요양 제외 · 발표 수치)", () => {
  const result = simulate(VECTOR_INPUT, RATES_AS_PUBLISHED);
  const { stage02, stage03, stage04 } = result;

  it("§5.2 매출 VAT 역산", () => {
    expect(stage02.revenueVat.supply).toBe(109_090_909);
    expect(stage02.revenueVat.vat).toBe(10_909_091);
  });

  it("§5.2 매입 VAT 역산 — 적격증빙만", () => {
    expect(stage02.purchaseVat.supply).toBe(25_454_545);
    expect(stage02.purchaseVat.vat).toBe(2_545_455);
  });

  it("§5.2 납부 VAT", () => {
    expect(stage02.vatPayable).toBe(8_363_636);
  });

  it("§5.3 4대보험 회사부담 — 정규직 급여 12,000,000 기준", () => {
    expect(stage02.insurance.nationalPension).toBe(540_000);
    expect(stage02.insurance.healthInsurance).toBe(425_400);
    expect(stage02.insurance.employmentInsurance).toBe(108_000);
    expect(stage02.insurance.industrialAccident).toBe(108_000);
    expect(stage02.insurance.total).toBe(1_181_400);
  });

  it("§5.2 필요경비 — 4대보험 회사부담분이 산입된다", () => {
    expect(stage02.expenses.qualifiedSupply).toBe(25_454_545);
    expect(stage02.expenses.payroll).toBe(42_000_000);
    expect(stage02.expenses.fixedAndNonDeductible).toBe(9_500_000);
    expect(stage02.expenses.insurance).toBe(1_181_400);
    expect(stage02.expenses.total).toBe(78_135_945);
  });

  it("§5.2 분기 과세표준", () => {
    expect(stage02.taxBase).toBe(30_954_964);
  });

  it("§5.3 연환산 — 분기 과세표준 ×4 후 35% 구간에 진입한다", () => {
    expect(stage03.annualizationFactor).toBe(4);
    expect(stage03.annualizedTaxBase).toBe(123_819_856);
    expect(stage03.bracket.rate).toBe(0.35);
    expect(stage03.bracket.progressiveDeduction).toBe(15_440_000);
    expect(stage03.bracketIndex).toBe(3);
    expect(stage03.isAnnualized).toBe(true);
  });

  it("§5.3 소득세 — 연간 산출 후 기간 귀속분으로 환산", () => {
    expect(stage03.annualIncomeTax).toBe(27_896_949);
    expect(stage03.periodIncomeTax).toBe(6_974_237);
    expect(stage03.localIncomeTax).toBe(697_423);
    expect(stage03.totalIncomeTax).toBe(7_671_660);
  });

  it("§5.3 프리랜서 원천징수 — 회사 부담에 합산하지 않는다", () => {
    expect(stage03.withholding.amount).toBe(990_000);
    expect(stage03.withholding.netPaid).toBe(29_010_000);

    // 이중 차감 방지: 원천세는 4대보험 회사부담에도, Net Cash 유출에도
    // 따로 잡히지 않는다. 목업 06·07 의 오류가 바로 이것이었다.
    expect(stage02.insurance.total).toBe(1_181_400);
    expect(stage04.outflow.payroll).toBe(42_000_000); // 지급액 그대로, 원천세 가산 없음
    expect(stage04.outflow.total).toBe(
      stage04.outflow.qualifiedEvidence +
        stage04.outflow.payroll +
        stage04.outflow.fixedAndNonDeductible +
        stage04.outflow.insurance +
        stage04.outflow.vat +
        stage04.outflow.incomeTax,
    );
  });

  it("§5.4 Net Cash", () => {
    expect(stage04.inflow).toBe(120_000_000);
    expect(stage04.outflow.qualifiedEvidence).toBe(28_000_000);
    expect(stage04.outflow.payroll).toBe(42_000_000);
    expect(stage04.outflow.fixedAndNonDeductible).toBe(9_500_000);
    expect(stage04.outflow.insurance).toBe(1_181_400);
    expect(stage04.outflow.vat).toBe(8_363_636);
    expect(stage04.outflow.incomeTax).toBe(7_671_660);
    expect(stage04.outflow.total).toBe(96_716_696);
    expect(stage04.netCash).toBe(23_283_304);
  });

  it("§5.4 세후 마진율 19.4%", () => {
    expect(formatPercent(stage04.marginRate)).toBe("19.4");
  });

  it("§5.4 적립 권장 합계", () => {
    expect(stage04.reserveTotal).toBe(17_216_696);
  });

  it("§5.5 목업 대비 — Net Cash 가 33,696,840 이 아니라 23,283,304 이다", () => {
    const MOCKUP_NET_CASH = 33_696_840;
    expect(stage04.netCash).toBe(23_283_304);
    expect(MOCKUP_NET_CASH - stage04.netCash).toBe(10_413_536);
  });
});

describe("출고 기본 요율 — 장기요양보험 포함", () => {
  const asPublished = simulate(VECTOR_INPUT, RATES_AS_PUBLISHED);
  const shipped = simulate(VECTOR_INPUT, DEFAULT_TAX_RATES);

  it("장기요양보험료는 건강보험료 기준으로 계산된다", () => {
    const { healthInsurance, longTermCare } = shipped.stage02.insurance;
    expect(healthInsurance).toBe(425_400);
    expect(longTermCare).toBe(
      Math.floor(healthInsurance * DEFAULT_TAX_RATES.insurance.longTermCare),
    );
  });

  it("4대보험 합계는 §5 발표치 + 장기요양보험료다", () => {
    expect(shipped.stage02.insurance.total).toBe(
      asPublished.stage02.insurance.total + shipped.stage02.insurance.longTermCare,
    );
  });

  it("보험료가 늘면 필요경비도 같은 폭으로 늘고 과세표준은 줄어든다", () => {
    const delta = shipped.stage02.insurance.longTermCare;
    expect(shipped.stage02.expenses.total).toBe(asPublished.stage02.expenses.total + delta);
    expect(shipped.stage02.taxBase).toBe(asPublished.stage02.taxBase - delta);
  });

  it("보험료가 늘면 Net Cash 는 줄어든다", () => {
    expect(shipped.stage04.netCash).toBeLessThan(asPublished.stage04.netCash);
  });
});

describe("항등식 — 모든 요율 조합에서 성립해야 한다", () => {
  const cases = [
    { name: "§5 벡터 · 발표 요율", input: VECTOR_INPUT, rates: RATES_AS_PUBLISHED },
    { name: "§5 벡터 · 출고 요율", input: VECTOR_INPUT, rates: DEFAULT_TAX_RATES },
    {
      name: "연간 모드",
      input: { ...VECTOR_INPUT, periodMode: "year" as const },
      rates: DEFAULT_TAX_RATES,
    },
    {
      name: "전부 0",
      input: {
        ...VECTOR_INPUT,
        revenue: 0,
        qualifiedEvidence: 0,
        freelancerPay: 0,
        salary: 0,
        fixedCost: 0,
        nonDeductibleCost: 0,
      },
      rates: DEFAULT_TAX_RATES,
    },
  ];

  it.each(cases)("$name — 공급가액 + VAT = 총액", ({ input, rates }) => {
    const { stage02 } = simulate(input, rates);
    expect(stage02.revenueVat.supply + stage02.revenueVat.vat).toBe(
      stage02.revenueVat.gross,
    );
    expect(stage02.purchaseVat.supply + stage02.purchaseVat.vat).toBe(
      stage02.purchaseVat.gross,
    );
  });

  it.each(cases)("$name — 필요경비 합계 = 구성요소의 합", ({ input, rates }) => {
    const { expenses } = simulate(input, rates).stage02;
    expect(expenses.total).toBe(
      expenses.qualifiedSupply +
        expenses.payroll +
        expenses.fixedAndNonDeductible +
        expenses.insurance,
    );
  });

  it.each(cases)("$name — Net Cash = 유입 − 유출", ({ input, rates }) => {
    const { stage04 } = simulate(input, rates);
    expect(stage04.netCash).toBe(stage04.inflow - stage04.outflow.total);
  });

  it.each(cases)("$name — 적립 권장 = VAT + 소득세 + 4대보험", ({ input, rates }) => {
    const { stage02, stage03, stage04 } = simulate(input, rates);
    expect(stage04.reserveTotal).toBe(
      Math.max(0, stage02.vatPayable) + stage03.totalIncomeTax + stage02.insurance.total,
    );
  });

  it.each(cases)("$name — 모든 금액이 정수 원이다", ({ input, rates }) => {
    const { stage02, stage03, stage04 } = simulate(input, rates);
    const amounts = [
      stage02.vatPayable,
      stage02.taxBase,
      stage02.expenses.total,
      stage02.insurance.total,
      stage03.annualizedTaxBase,
      stage03.annualIncomeTax,
      stage03.periodIncomeTax,
      stage03.localIncomeTax,
      stage04.netCash,
      stage04.reserveTotal,
    ];
    for (const amount of amounts) {
      expect(Number.isInteger(amount)).toBe(true);
    }
  });
});

describe("기간 모드 — 연환산 (PRD §4.3)", () => {
  it("연간 모드는 연환산하지 않는다", () => {
    const { stage03 } = simulate(
      { ...VECTOR_INPUT, periodMode: "year" },
      RATES_AS_PUBLISHED,
    );
    expect(stage03.annualizationFactor).toBe(1);
    expect(stage03.isAnnualized).toBe(false);
    expect(stage03.annualizedTaxBase).toBe(stage03.prev.taxBase);
    expect(stage03.periodIncomeTax).toBe(stage03.annualIncomeTax);
  });

  it("월간 모드는 ×12 후 ÷12 한다", () => {
    const { stage03 } = simulate(
      { ...VECTOR_INPUT, periodMode: "month" },
      RATES_AS_PUBLISHED,
    );
    expect(stage03.annualizationFactor).toBe(12);
    expect(stage03.annualizedTaxBase).toBe(stage03.prev.taxBase * 12);
    expect(stage03.isAnnualized).toBe(true);
  });

  it("연환산을 빼먹으면 세금이 과소평가된다 — 목업의 오류", () => {
    const correct = simulate(VECTOR_INPUT, RATES_AS_PUBLISHED);
    // 같은 분기 금액을 '연간'이라고 우기면 구간이 낮게 잡힌다
    const wrong = simulate({ ...VECTOR_INPUT, periodMode: "year" }, RATES_AS_PUBLISHED);
    expect(wrong.stage03.bracket.rate).toBeLessThan(correct.stage03.bracket.rate);
    expect(wrong.stage03.totalIncomeTax).toBeLessThan(correct.stage03.totalIncomeTax);
  });
});

describe("누진 구간 매핑 (PRD §4.1 TAX-B)", () => {
  it.each([
    [14_000_000, 0.06, 0],
    [14_000_001, 0.15, 1_260_000],
    [50_000_000, 0.15, 1_260_000],
    [50_000_001, 0.24, 5_760_000],
    [88_000_000, 0.24, 5_760_000],
    [88_000_001, 0.35, 15_440_000],
    [150_000_000, 0.35, 15_440_000],
    [300_000_000, 0.38, 19_940_000],
    [500_000_000, 0.4, 25_940_000],
    [1_000_000_000, 0.42, 35_940_000],
    [1_000_000_001, 0.45, 65_940_000],
  ])("과세표준 %i → 세율 %f · 누진공제 %i", (taxBase, rate, deduction) => {
    const { bracket } = findBracket(taxBase, INCOME_TAX_BRACKETS);
    expect(bracket.rate).toBe(rate);
    expect(bracket.progressiveDeduction).toBe(deduction);
  });

  it("구간 경계에서 세액이 역전되지 않는다", () => {
    // 누진공제가 제대로 잡혀 있으면 과세표준이 1원 늘 때 세액이 줄어들 수 없다
    for (const b of INCOME_TAX_BRACKETS) {
      if (!Number.isFinite(b.upTo)) continue;
      const below = findBracket(b.upTo, INCOME_TAX_BRACKETS).bracket;
      const above = findBracket(b.upTo + 1, INCOME_TAX_BRACKETS).bracket;
      const taxBelow = b.upTo * below.rate - below.progressiveDeduction;
      const taxAbove = (b.upTo + 1) * above.rate - above.progressiveDeduction;
      expect(taxAbove).toBeGreaterThanOrEqual(taxBelow);
    }
  });
});

describe("정수 연산 — 부동소수점 오차 차단 (PRD §4.7)", () => {
  it("요율 곱셈이 1원도 어긋나지 않는다", () => {
    // Math.floor(12_000_000 * 0.009) 은 107_999 가 된다 (IEEE 754)
    expect(applyRate(12_000_000, 0.009)).toBe(108_000);
    expect(applyRate(12_000_000, 0.03545)).toBe(425_400);
    expect(applyRate(12_000_000, 0.045)).toBe(540_000);
    expect(applyRate(30_000_000, 0.033)).toBe(990_000);
    expect(applyRate(425_400, 0.1295)).toBe(55_089);
  });

  it("VAT 역산이 나누어떨어지는 금액에서 1원 모자라지 않는다", () => {
    // 33_000_000 / 1.1 === 29999999.999999996
    expect(splitVat(33_000_000, 0.1)).toEqual({
      gross: 33_000_000,
      supply: 30_000_000,
      vat: 3_000_000,
    });
    expect(splitVat(11_000_000, 0.1).supply).toBe(10_000_000);
  });

  it("아주 큰 금액에서도 오버플로 없이 정확하다", () => {
    // 1조 매출 — a × num 을 그대로 곱하면 2^53 을 넘긴다
    const { supply, vat } = splitVat(1_000_000_000_000, 0.1);
    expect(supply + vat).toBe(1_000_000_000_000);
    expect(supply).toBe(909_090_909_090);
    expect(applyRate(1_000_000_000_000, 0.045)).toBe(45_000_000_000);
  });
});

describe("경계 조건", () => {
  it("입력이 전부 0 이면 모든 결과가 0 이다", () => {
    const { stage02, stage03, stage04 } = simulate(
      {
        periodMode: "quarter",
        periodLabel: "빈 입력",
        revenue: 0,
        qualifiedEvidence: 0,
        freelancerPay: 0,
        salary: 0,
        fixedCost: 0,
        nonDeductibleCost: 0,
      },
      DEFAULT_TAX_RATES,
    );
    expect(stage02.vatPayable).toBe(0);
    expect(stage02.taxBase).toBe(0);
    expect(stage03.totalIncomeTax).toBe(0);
    expect(stage04.netCash).toBe(0);
    expect(stage04.marginRate).toBe(0);
    expect(stage04.reserveTotal).toBe(0);
  });

  it("결손(과세표준 음수)이면 소득세는 0 이다", () => {
    const { stage02, stage03 } = simulate(
      {
        periodMode: "quarter",
        periodLabel: "결손",
        revenue: 10_000_000,
        qualifiedEvidence: 0,
        freelancerPay: 50_000_000,
        salary: 0,
        fixedCost: 0,
        nonDeductibleCost: 0,
      },
      DEFAULT_TAX_RATES,
    );
    expect(stage02.taxBase).toBeLessThan(0);
    expect(stage03.annualIncomeTax).toBe(0);
    expect(stage03.periodIncomeTax).toBe(0);
    expect(stage03.localIncomeTax).toBe(0);
    expect(stage03.totalIncomeTax).toBe(0);
  });

  it("매입이 매출보다 크면 납부 VAT 가 음수가 된다 — 환급 대상", () => {
    const { stage02, stage04 } = simulate(
      {
        periodMode: "quarter",
        periodLabel: "환급",
        revenue: 10_000_000,
        qualifiedEvidence: 30_000_000,
        freelancerPay: 0,
        salary: 0,
        fixedCost: 0,
        nonDeductibleCost: 0,
      },
      DEFAULT_TAX_RATES,
    );
    expect(stage02.vatPayable).toBeLessThan(0);
    // 환급액을 Net Cash 유입으로 당겨쓰지 않는다 — 1단계는 0 으로 눌러 보수적으로
    expect(stage04.outflow.vat).toBe(0);
  });
});
