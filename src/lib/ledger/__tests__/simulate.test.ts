import { describe, expect, it } from "vitest";

import {
  CORPORATE_TAX_BRACKETS,
  INCOME_TAX_BRACKETS,
  PENSION_MONTHLY_INCOME_CAP,
  PERSONAL_DEDUCTION_PER_PERSON,
} from "@/config/tax-rates";
import { DEFAULT_SETTINGS, type LedgerEntry, type LedgerSettings } from "../model";
import type { DateRange } from "../range";
import { simulateRange } from "../simulate";

function entry(over: Partial<LedgerEntry>): LedgerEntry {
  return {
    id: "x",
    kind: "expense",
    date: "2026-08-10",
    amount: 0,
    category: "qualified",
    evidence: "card",
    merchant: "",
    memo: "",
    autoForced: false,
    updatedAt: "2026-08-10T00:00:00.000Z",
    ...over,
  };
}

/** 한 달치 — 매출 33,000,000 · 적격증빙 매입 4,400,000 · 정규직 급여 3,000,000 */
const ENTRIES: LedgerEntry[] = [
  entry({ kind: "income", category: "sales", evidence: null, amount: 33_000_000 }),
  entry({ category: "qualified", evidence: "taxInvoice", amount: 4_400_000 }),
  entry({ category: "payrollSalary", evidence: "none", amount: 3_000_000 }),
  entry({ category: "nonDeductible", evidence: "simpleReceipt", amount: 500_000 }),
];

const AUGUST: DateRange = { from: "2026-08-01", to: "2026-08-31" };

const run = (settings: Partial<LedgerSettings> = {}, range: DateRange = AUGUST) =>
  simulateRange(ENTRIES, { ...DEFAULT_SETTINGS, ...settings }, range);

describe("simulateRange (v2 §3 T2)", () => {
  it("장부를 집계해 입력으로 넘기고, 남는 돈이 매출보다 작다", () => {
    const sim = run();
    expect(sim.input.revenue).toBe(33_000_000);
    expect(sim.input.qualifiedEvidence).toBe(4_400_000);
    expect(sim.input.salary).toBe(3_000_000);
    expect(sim.input.nonDeductibleCost).toBe(500_000);
    expect(sim.stage04.netCash).toBeGreaterThan(0);
    expect(sim.stage04.netCash).toBeLessThan(sim.stage04.inflow);
  });

  it("기간에서 연환산 계수와 라벨을 만든다", () => {
    expect(run().stage03.annualizationFactor).toBe(12);
    expect(run().input.periodLabel).toBe("2026년 8월");
    expect(run({}, { from: "2026-01-01", to: "2026-12-31" }).stage03.annualizationFactor).toBe(1);
  });

  it("장부가 비면 매출도 세금도 0 이다", () => {
    const empty = simulateRange([], DEFAULT_SETTINGS, AUGUST);
    expect(empty.stage04.inflow).toBe(0);
    expect(empty.stage04.netCash).toBe(0);
    expect(empty.stage03.totalIncomeTax).toBe(0);
  });

  it("부양가족이 늘면 세금이 줄고 남는 돈이 늘어난다", () => {
    const alone = run({ dependents: 0 });
    const family = run({ dependents: 2 });
    expect(family.stage02.personalDeduction).toBe(PERSONAL_DEDUCTION_PER_PERSON * 3);
    expect(family.stage03.totalIncomeTax).toBeLessThan(alone.stage03.totalIncomeTax);
    expect(family.stage04.netCash).toBeGreaterThan(alone.stage04.netCash);
  });

  it("법인이면 법인세 구간표를 쓰고 기본공제가 없다", () => {
    const corporate = run({ businessType: "corporate", dependents: 3 });
    expect(corporate.stage03.taxKind).toBe("corporate");
    expect(corporate.stage03.brackets).toBe(CORPORATE_TAX_BRACKETS);
    expect(corporate.stage02.personalDeduction).toBe(0);
    expect(run().stage03.brackets).toBe(INCOME_TAX_BRACKETS);
  });

  it("설정이 세율표로 넘어간다 — 원천징수율과 국민연금 상한", () => {
    const capped = run({ pensionCapEnabled: true, withholdingRate: 0.05 });
    const uncapped = run({ pensionCapEnabled: false });
    // 급여 300만은 상한(617만) 아래라 국민연금은 그대로다
    expect(capped.stage02.insurance.nationalPension).toBe(
      uncapped.stage02.insurance.nationalPension,
    );
    expect(PENSION_MONTHLY_INCOME_CAP).toBeGreaterThan(3_000_000);

    const withFreelancer = simulateRange(
      [...ENTRIES, entry({ category: "payrollFreelancer", evidence: "none", amount: 1_000_000 })],
      { ...DEFAULT_SETTINGS, withholdingRate: 0.05 },
      AUGUST,
    );
    expect(withFreelancer.stage03.withholding.amount).toBe(50_000);
  });
});
