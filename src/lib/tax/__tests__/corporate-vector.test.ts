import { describe, expect, it } from "vitest";
import {
  CORPORATE_TAX_BRACKETS,
  DEFAULT_TAX_RATES,
  INCOME_TAX_BRACKETS,
  bracketsFor,
} from "@/config/tax-rates";
import { findBracket, simulate } from "../pipeline";
import type { TaxInput } from "../types";

/**
 * 법인세 검증 벡터 — 2026 사업연도 4구간
 *
 *   2억 이하 10% · 2억~200억 20% · 200억~3,000억 22% · 3,000억 초과 25%
 *   지방소득세 = 법인세 × 10%
 *
 * 출처: 국세청 「법인세 세율」 (2025.12 개정 · 2026-01-01 이후 개시 사업연도
 * 부터 전 구간 +1%p)
 * https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7746&mi=2372
 *
 * 과세표준을 원하는 값에 정확히 맞추기 위해 매출만 넣고 비용은 전부 0 으로
 * 둔다. 매출은 VAT 포함 수령액이므로 공급가액 = 과세표준이 되려면 ×1.1 이다.
 * 11의 배수를 골라 VAT 역산에서 1원도 남지 않게 했다.
 */
function corporateInput(
  annualTaxBase: number,
  periodMode: TaxInput["periodMode"] = "year",
): TaxInput {
  const factor = periodMode === "month" ? 12 : periodMode === "quarter" ? 4 : 1;
  return {
    businessType: "corporate",
    periodMode,
    periodLabel: "2026 사업연도",
    revenue: Math.round((annualTaxBase / factor) * 1.1),
    qualifiedEvidence: 0,
    freelancerPay: 0,
    salary: 0,
    fixedCost: 0,
    nonDeductibleCost: 0,
  };
}

describe("법인세 세율표 — 2026 사업연도 4구간", () => {
  it.each([
    [200_000_000, 0.1, 0],
    [200_000_001, 0.2, 20_000_000],
    [20_000_000_000, 0.2, 20_000_000],
    [20_000_000_001, 0.22, 420_000_000],
    [300_000_000_000, 0.22, 420_000_000],
    [300_000_000_001, 0.25, 9_420_000_000],
  ])("과세표준 %i → 세율 %f · 누진공제 %i", (taxBase, rate, deduction) => {
    const { bracket } = findBracket(taxBase, CORPORATE_TAX_BRACKETS);
    expect(bracket.rate).toBe(rate);
    expect(bracket.progressiveDeduction).toBe(deduction);
  });

  it("누진공제가 구간 경계에서 세액 역전을 만들지 않는다", () => {
    for (const b of CORPORATE_TAX_BRACKETS) {
      if (!Number.isFinite(b.upTo)) continue;
      const below = findBracket(b.upTo, CORPORATE_TAX_BRACKETS).bracket;
      const above = findBracket(b.upTo + 1, CORPORATE_TAX_BRACKETS).bracket;
      expect(b.upTo * below.rate - below.progressiveDeduction).toBeLessThanOrEqual(
        (b.upTo + 1) * above.rate - above.progressiveDeduction,
      );
    }
  });

  it("bracketsFor 가 유형별로 다른 표를 준다", () => {
    expect(bracketsFor("corporate")).toBe(CORPORATE_TAX_BRACKETS);
    expect(bracketsFor("individual")).toBe(INCOME_TAX_BRACKETS);
    expect(bracketsFor(undefined)).toBe(INCOME_TAX_BRACKETS);
  });
});

describe("법인세 계산 — 연간 모드", () => {
  it("과세표준 1억 → 법인세 10,000,000 · 지방소득세 1,000,000", () => {
    const { stage02, stage03 } = simulate(corporateInput(100_000_000));
    expect(stage02.taxBase).toBe(100_000_000);
    expect(stage03.taxKind).toBe("corporate");
    expect(stage03.bracket.rate).toBe(0.1);
    expect(stage03.bracketIndex).toBe(0);
    expect(stage03.annualIncomeTax).toBe(10_000_000);
    expect(stage03.periodIncomeTax).toBe(10_000_000);
    expect(stage03.localIncomeTax).toBe(1_000_000);
    expect(stage03.totalIncomeTax).toBe(11_000_000);
  });

  it("과세표준 3억 → 2억×10% + 1억×20% = 40,000,000", () => {
    const { stage02, stage03 } = simulate(corporateInput(300_000_000));
    expect(stage02.taxBase).toBe(300_000_000);
    expect(stage03.bracket.rate).toBe(0.2);
    expect(stage03.bracketIndex).toBe(1);
    // 300,000,000 × 20% − 20,000,000 = 40,000,000
    expect(stage03.annualIncomeTax).toBe(40_000_000);
    expect(stage03.annualIncomeTax).toBe(
      200_000_000 * 0.1 + (300_000_000 - 200_000_000) * 0.2,
    );
    expect(stage03.localIncomeTax).toBe(4_000_000);
    expect(stage03.totalIncomeTax).toBe(44_000_000);
  });

  it("구간 경계 — 과세표준이 정확히 2억이면 10% 구간에 남는다", () => {
    const at = simulate(corporateInput(200_000_000)).stage03;
    expect(at.bracketIndex).toBe(0);
    expect(at.bracket.rate).toBe(0.1);
    expect(at.annualIncomeTax).toBe(20_000_000);

    // 넘어가면 20% 구간이지만 누진공제가 있어 세액이 뛰지 않는다
    // 2.1억 × 20% − 20,000,000 = 22,000,000 (2억분 20,000,000 + 초과 1천만분 200만)
    const over = simulate(corporateInput(210_000_000)).stage03;
    expect(over.bracketIndex).toBe(1);
    expect(over.bracket.rate).toBe(0.2);
    expect(over.annualIncomeTax).toBe(22_000_000);
  });

  it("결손이면 법인세는 0 이다", () => {
    const { stage03 } = simulate({
      ...corporateInput(100_000_000),
      freelancerPay: 200_000_000,
    });
    expect(stage03.taxKind).toBe("corporate");
    expect(stage03.annualIncomeTax).toBe(0);
    expect(stage03.totalIncomeTax).toBe(0);
  });
});

describe("법인세 연환산 — 개인과 같은 ×N 후 ÷N", () => {
  it("분기 입력은 ×4 로 연환산한 뒤 ÷4 한다", () => {
    // 분기 과세표준 7,500만 → 연환산 3억 → 40,000,000 → 분기 귀속 10,000,000
    const { stage02, stage03 } = simulate(corporateInput(300_000_000, "quarter"));
    expect(stage02.taxBase).toBe(75_000_000);
    expect(stage03.annualizationFactor).toBe(4);
    expect(stage03.annualizedTaxBase).toBe(300_000_000);
    expect(stage03.isAnnualized).toBe(true);
    expect(stage03.annualIncomeTax).toBe(40_000_000);
    expect(stage03.periodIncomeTax).toBe(10_000_000);
    expect(stage03.localIncomeTax).toBe(1_000_000);
    expect(stage03.totalIncomeTax).toBe(11_000_000);
  });

  it("연환산을 빼면 세율 구간이 낮게 잡힌다 — 분기 금액을 연간이라 우기는 경우", () => {
    const quarterly = simulate(corporateInput(300_000_000, "quarter")).stage03;
    const asIfAnnual = simulate(corporateInput(75_000_000)).stage03;
    expect(asIfAnnual.bracket.rate).toBeLessThan(quarterly.bracket.rate);
  });

  it("월간 입력은 ×12 로 연환산한다", () => {
    const { stage03 } = simulate(corporateInput(240_000_000, "month"));
    expect(stage03.annualizationFactor).toBe(12);
    expect(stage03.annualizedTaxBase).toBe(240_000_000);
    expect(stage03.bracket.rate).toBe(0.2);
  });

  it("모든 금액이 정수 원이다", () => {
    const { stage02, stage03, stage04 } = simulate(
      corporateInput(300_000_000, "quarter"),
    );
    for (const amount of [
      stage02.taxBase,
      stage03.annualizedTaxBase,
      stage03.annualIncomeTax,
      stage03.periodIncomeTax,
      stage03.localIncomeTax,
      stage04.netCash,
      stage04.reserveTotal,
    ]) {
      expect(Number.isInteger(amount)).toBe(true);
    }
  });
});

describe("법인·개인 공통 로직은 그대로다", () => {
  const shared = {
    periodMode: "quarter" as const,
    periodLabel: "2026 Q2",
    revenue: 120_000_000,
    qualifiedEvidence: 28_000_000,
    freelancerPay: 30_000_000,
    salary: 12_000_000,
    fixedCost: 6_300_000,
    nonDeductibleCost: 3_200_000,
  };

  const individual = simulate(shared);
  const corporate = simulate({ ...shared, businessType: "corporate" });

  it("businessType 이 없으면 개인 결과와 완전히 같다 — 회귀 방어", () => {
    const explicit = simulate({ ...shared, businessType: "individual" });
    expect(individual.stage03.taxKind).toBe("income");
    expect(individual.stage03.brackets).toBe(DEFAULT_TAX_RATES.incomeTaxBrackets);
    expect(explicit.stage03.totalIncomeTax).toBe(individual.stage03.totalIncomeTax);
    expect(explicit.stage04.netCash).toBe(individual.stage04.netCash);
    expect(individual.stage04.reserveItems[1].label).toBe("소득세 + 지방소득세");
  });

  it("VAT·4대보험·원천징수·필요경비는 유형과 무관하다", () => {
    expect(corporate.stage02.vatPayable).toBe(individual.stage02.vatPayable);
    expect(corporate.stage02.insurance).toEqual(individual.stage02.insurance);
    expect(corporate.stage02.expenses).toEqual(individual.stage02.expenses);
    expect(corporate.stage02.taxBase).toBe(individual.stage02.taxBase);
    expect(corporate.stage03.withholding).toEqual(individual.stage03.withholding);
  });

  it("세율표만 갈린다 — 같은 과세표준에서 법인세가 더 싸다", () => {
    expect(corporate.stage03.brackets).toBe(DEFAULT_TAX_RATES.corporateTaxBrackets);
    expect(corporate.stage03.taxKind).toBe("corporate");
    // 연환산 과세표준 1.23억 — 개인은 35% 구간, 법인은 아직 10% 구간이다
    expect(corporate.stage03.bracket.rate).toBe(0.1);
    expect(individual.stage03.bracket.rate).toBe(0.35);
    expect(corporate.stage03.totalIncomeTax).toBeLessThan(
      individual.stage03.totalIncomeTax,
    );
    expect(corporate.stage04.netCash).toBeGreaterThan(individual.stage04.netCash);
  });

  it("적립 권장 라벨이 법인세로 바뀐다", () => {
    expect(corporate.stage04.reserveItems[1].label).toBe("법인세 + 지방소득세");
    expect(corporate.stage04.reserveTotal).toBe(
      Math.max(0, corporate.stage02.vatPayable) +
        corporate.stage03.totalIncomeTax +
        corporate.stage02.insurance.total,
    );
  });
});
