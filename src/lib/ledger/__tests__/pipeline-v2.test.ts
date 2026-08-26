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
  /** 그 계수로 돌렸을 때의 연환산 과세표준 */
  function annualized(input: TaxInput, factor: number): number {
    return runStage03(runStage02({ ...input, annualizationFactor: factor })).annualizedTaxBase;
  }

  it("부양가족 수를 넘기지 않으면 v1 과 결과가 같다", () => {
    const stage02 = runStage02(BASE);
    expect(stage02.personalDeduction).toBe(0);
    expect(stage02.taxBase).toBe(stage02.revenueVat.supply - stage02.expenses.total);
  });

  it("기간 과세표준은 부양가족과 무관하다 — 공제는 연 단위라 STAGE 03 이 뺀다", () => {
    expect(runStage02({ ...BASE, dependents: 2 }).taxBase).toBe(runStage02(BASE).taxBase);
  });

  it("근거 표시용으로 공제액 자체는 STAGE 02 가 들고 나른다", () => {
    expect(runStage02({ ...BASE, dependents: 2 }).personalDeduction).toBe(
      PERSONAL_DEDUCTION_PER_PERSON * 3,
    );
  });

  it("부양가족 0 명도 본인 몫 150만은 빠진다", () => {
    expect(runStage02({ ...BASE, dependents: 0 }).personalDeduction).toBe(
      PERSONAL_DEDUCTION_PER_PERSON,
    );
  });

  it("한 달치(계수 12)든 한 해치(계수 1)든 연 150만 × (1 + 부양가족) 한 번만 빠진다", () => {
    // 기간 과세표준에서 먼저 빼면 계수가 곱해져 한 달치에서 1,800만이 빠진다
    for (const factor of [12, 4, 1]) {
      for (const dependents of [0, 2, 3]) {
        expect(annualized(BASE, factor) - annualized({ ...BASE, dependents }, factor)).toBe(
          PERSONAL_DEDUCTION_PER_PERSON * (1 + dependents),
        );
      }
    }
  });

  it("법인은 기본공제가 없다 — 부양가족 수를 넘겨도 무시한다", () => {
    const corporate: TaxInput = { ...BASE, businessType: "corporate" };
    const after = runStage02({ ...corporate, dependents: 3 });
    expect(after.personalDeduction).toBe(0);
    expect(after.taxBase).toBe(runStage02(corporate).taxBase);
    expect(annualized({ ...corporate, dependents: 3 }, 12)).toBe(annualized(corporate, 12));
  });

  it("공제가 세액까지 흘러간다", () => {
    const plain = simulate(BASE);
    const withDependents = simulate({ ...BASE, dependents: 3 });
    expect(withDependents.stage03.totalIncomeTax).toBeLessThan(
      plain.stage03.totalIncomeTax,
    );
  });

  it("공제가 과세표준보다 커도 음수가 되지 않는다", () => {
    const tiny: TaxInput = { ...BASE, revenue: 2_200_000, qualifiedEvidence: 0,
      freelancerPay: 0, salary: 0, fixedCost: 0, nonDeductibleCost: 0 };
    const stage03 = runStage03(runStage02({ ...tiny, dependents: 5, annualizationFactor: 1 }));
    expect(stage03.annualizedTaxBase).toBe(0);
    expect(stage03.totalIncomeTax).toBe(0);
  });
});

describe("연환산 계수 직접 지정 (v2 §3 T2)", () => {
  it("넘긴 계수가 기간 모드보다 우선한다", () => {
    const stage03 = runStage03(
      runStage02({ ...BASE, periodMode: "year", annualizationFactor: 4 }),
    );
    expect(stage03.annualizationFactor).toBe(4);
    // BASE 는 부양가족을 넘기지 않아 공제가 0 이다
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
