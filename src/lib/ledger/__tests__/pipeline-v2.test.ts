import { describe, expect, it } from "vitest";

import { PERSONAL_DEDUCTION_PER_PERSON } from "@/config/tax-rates";
import { runStage02, runStage03, simulate } from "@/lib/tax/pipeline";
import type { TaxInput } from "@/lib/tax/types";
import { annualizationFactor } from "../range";

/** v1 이 넘기던 그대로 — v2 전용 필드가 없는 입력 */
const BASE: TaxInput = {
  periodMode: "quarter",
  periodLabel: "2026 Q3",
  revenue: 110_000_000,
  qualifiedEvidence: 22_000_000,
  freelancerPay: 6_000_000,
  salary: 12_000_000,
  fixedCost: 3_300_000,
  nonDeductibleCost: 1_100_000,
};

describe("기본공제 (v2 §3 T2-1)", () => {
  it("부양가족 수를 넘기지 않으면 v1 과 결과가 같다", () => {
    const stage02 = runStage02(BASE);
    expect(stage02.personalDeduction).toBe(0);
    expect(stage02.taxBase).toBe(
      stage02.revenueVat.supply - stage02.expenses.total,
    );
  });

  it("개인은 과세표준에서 150만 × (본인 + 부양가족) 을 뺀다", () => {
    const before = runStage02(BASE).taxBase;
    const after = runStage02({ ...BASE, dependents: 2 });
    expect(after.personalDeduction).toBe(PERSONAL_DEDUCTION_PER_PERSON * 3);
    expect(after.taxBase).toBe(before - PERSONAL_DEDUCTION_PER_PERSON * 3);
  });

  it("부양가족 0 명도 본인 몫 150만은 빠진다", () => {
    const after = runStage02({ ...BASE, dependents: 0 });
    expect(after.personalDeduction).toBe(PERSONAL_DEDUCTION_PER_PERSON);
  });

  it("법인은 기본공제가 없다 — 부양가족 수를 넘겨도 무시한다", () => {
    const corporate: TaxInput = { ...BASE, businessType: "corporate" };
    const before = runStage02(corporate).taxBase;
    const after = runStage02({ ...corporate, dependents: 3 });
    expect(after.personalDeduction).toBe(0);
    expect(after.taxBase).toBe(before);
  });

  it("공제가 세액까지 흘러간다", () => {
    const plain = simulate(BASE);
    const withDependents = simulate({ ...BASE, dependents: 3 });
    expect(withDependents.stage03.totalIncomeTax).toBeLessThan(
      plain.stage03.totalIncomeTax,
    );
  });
});

describe("연환산 계수 직접 지정 (v2 §3 T2)", () => {
  it("넘긴 계수가 기간 모드보다 우선한다", () => {
    const stage03 = runStage03(
      runStage02({ ...BASE, periodMode: "year", annualizationFactor: 4 }),
    );
    expect(stage03.annualizationFactor).toBe(4);
    expect(stage03.annualizedTaxBase).toBe(stage03.prev.taxBase * 4);
  });

  it("넘기지 않으면 기간 모드 계수를 그대로 쓴다", () => {
    expect(runStage03(runStage02(BASE)).annualizationFactor).toBe(4);
  });

  it("정수가 아닌 계수(임의 일수 구간)도 기간 귀속으로 되돌아온다", () => {
    const factor = annualizationFactor({ from: "2026-07-15", to: "2026-08-28" });
    const stage03 = runStage03(runStage02({ ...BASE, annualizationFactor: factor }));
    expect(stage03.annualizationFactor).toBeCloseTo(365 / 45, 10);
    // 연간 산출세액을 다시 계수로 나눈 값이 기간 귀속 세액이다
    expect(stage03.periodIncomeTax).toBe(Math.floor(stage03.annualIncomeTax / factor));
    expect(stage03.isAnnualized).toBe(true);
  });

  it("0 이나 음수가 들어오면 기간 모드로 되돌린다 — 0 으로 나누지 않는다", () => {
    const stage03 = runStage03(
      runStage02({ ...BASE, periodMode: "month", annualizationFactor: 0 }),
    );
    expect(stage03.annualizationFactor).toBe(12);
  });
});
