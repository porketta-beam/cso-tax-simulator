import { describe, expect, it } from "vitest";

import {
  aggregate,
  applyEvidenceChange,
  entryIsDeductible,
  rowToEntry,
  settingsToRates,
  type LedgerEntry,
} from "../model";
import { DEFAULT_TAX_RATES, PENSION_MONTHLY_INCOME_CAP } from "@/config/tax-rates";
import type { Database } from "@/types/database";

function entry(over: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: "x",
    kind: "expense",
    date: "2026-08-01",
    amount: 0,
    category: "qualified",
    evidence: "card",
    merchant: "",
    memo: "",
    autoForced: false,
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...over,
  };
}

describe("장부 → 집계 입력 버킷 (v2 §4)", () => {
  it("수입은 항목과 무관하게 매출로 모인다", () => {
    const totals = aggregate([
      entry({ kind: "income", category: "sales", evidence: null, amount: 10_000_000 }),
      entry({
        kind: "income",
        category: "otherIncome",
        evidence: null,
        amount: 500_000,
      }),
    ]);
    expect(totals.revenue).toBe(10_500_000);
    expect(totals.incomeTotal).toBe(10_500_000);
    expect(totals.expenseTotal).toBe(0);
  });

  it("항목 라벨이 아니라 VAT 공제 판정으로 나눈다", () => {
    // 세금계산서를 받은 임차료는 실제로 공제 대상이다
    const totals = aggregate([
      entry({ category: "fixed", evidence: "taxInvoice", amount: 1_500_000 }),
    ]);
    expect(totals.qualifiedEvidence).toBe(1_500_000);
    expect(totals.fixedCost).toBe(0);
  });

  it("간이영수증 고정비는 고정비 버킷에 남는다", () => {
    const totals = aggregate([
      entry({ category: "fixed", evidence: "simpleReceipt", amount: 74_000 }),
    ]);
    expect(totals.qualifiedEvidence).toBe(0);
    expect(totals.fixedCost).toBe(74_000);
  });

  it("간이영수증 적격증빙 매입은 불공제로 떨어진다", () => {
    const totals = aggregate([
      entry({ category: "qualified", evidence: "simpleReceipt", amount: 33_000 }),
    ]);
    expect(totals.qualifiedEvidence).toBe(0);
    expect(totals.nonDeductibleCost).toBe(33_000);
  });

  it("불공제 항목은 증빙이 적격이어도 공제되지 않는다", () => {
    const totals = aggregate([
      entry({ category: "nonDeductible", evidence: "card", amount: 380_000 }),
    ]);
    expect(totals.qualifiedEvidence).toBe(0);
    expect(totals.nonDeductibleCost).toBe(380_000);
  });

  it("인건비는 프리랜서와 정규직으로 갈린다", () => {
    const totals = aggregate([
      entry({ category: "payrollFreelancer", evidence: "none", amount: 3_000_000 }),
      entry({ category: "payrollSalary", evidence: "none", amount: 4_000_000 }),
    ]);
    expect(totals.freelancerPay).toBe(3_000_000);
    expect(totals.salary).toBe(4_000_000);
    expect(totals.qualifiedEvidence).toBe(0);
  });

  it("인건비는 세금계산서를 받아도 매입세액 공제 대상이 아니다", () => {
    const totals = aggregate([
      entry({
        category: "payrollFreelancer",
        evidence: "taxInvoice",
        amount: 1_000_000,
      }),
    ]);
    expect(totals.qualifiedEvidence).toBe(0);
    expect(totals.freelancerPay).toBe(1_000_000);
  });

  it("지출 버킷 합이 지출 합계와 어긋나지 않는다", () => {
    const totals = aggregate([
      entry({ category: "qualified", evidence: "card", amount: 100 }),
      entry({ category: "fixed", evidence: "simpleReceipt", amount: 200 }),
      entry({ category: "nonDeductible", evidence: "card", amount: 300 }),
      entry({ category: "payrollFreelancer", evidence: "none", amount: 400 }),
      entry({ category: "payrollSalary", evidence: "none", amount: 500 }),
      entry({ kind: "income", category: "sales", evidence: null, amount: 9_000 }),
    ]);
    expect(totals.count).toBe(6);
    expect(totals.expenseTotal).toBe(1_500);
    expect(
      totals.qualifiedEvidence +
        totals.fixedCost +
        totals.nonDeductibleCost +
        totals.freelancerPay +
        totals.salary,
    ).toBe(totals.expenseTotal);
  });

  it("수입은 공제 판정 대상이 아니다", () => {
    expect(
      entryIsDeductible(entry({ kind: "income", category: "sales", evidence: null })),
    ).toBe(false);
  });
});

describe("증빙 유형 변경 시 항목 자동 전환 (PRD §6.3)", () => {
  it("간이영수증을 고르면 적격증빙 매입에서 불공제로 끌어온다", () => {
    expect(applyEvidenceChange({ category: "qualified" }, "simpleReceipt", false)).toEqual(
      { category: "nonDeductible", autoForced: true },
    );
  });

  it("우리가 바꾼 것이면 적격 증빙으로 되돌릴 때 같이 되돌린다", () => {
    const forced = applyEvidenceChange({ category: "qualified" }, "simpleReceipt", false);
    expect(
      applyEvidenceChange({ category: forced.category }, "taxInvoice", forced.autoForced),
    ).toEqual({ category: "qualified", autoForced: false });
  });

  it("사용자가 직접 고른 불공제는 건드리지 않는다", () => {
    // 카드로 결제한 접대비를 일부러 불공제로 지정한 경우
    expect(applyEvidenceChange({ category: "nonDeductible" }, "card", false)).toEqual({
      category: "nonDeductible",
      autoForced: false,
    });
  });

  it("고정비·인건비 항목은 증빙을 바꿔도 그대로 둔다", () => {
    for (const category of ["fixed", "payrollFreelancer", "payrollSalary"] as const) {
      expect(applyEvidenceChange({ category }, "simpleReceipt", false)).toEqual({
        category,
        autoForced: false,
      });
    }
  });
});

describe("행 → 엔트리", () => {
  const row: Database["public"]["Tables"]["ledger_lines"]["Row"] = {
    id: "row-1",
    user_id: "u1",
    kind: "expense",
    date: "2026-08-03",
    amount: 33_000,
    category: "qualified",
    evidence: "card",
    merchant: "쿠팡",
    memo: "",
    auto_forced: false,
    created_at: "2026-08-03T00:00:00.000Z",
    updated_at: "2026-08-03T00:00:00.000Z",
  };

  it("수입 행의 증빙은 버린다 — 매입이 아니다", () => {
    const converted = rowToEntry({
      ...row,
      kind: "income",
      category: "sales",
      evidence: "card",
    });
    expect(converted.evidence).toBeNull();
    expect(converted.kind).toBe("income");
  });

  it("모르는 항목은 불공제로 떨어뜨린다 — 공제를 과대 인정하지 않는다", () => {
    expect(rowToEntry({ ...row, category: "무언가" }).category).toBe("nonDeductible");
  });
});

describe("설정 → 세율표", () => {
  it("원천징수율과 국민연금 상한만 덮는다", () => {
    const rates = settingsToRates({
      businessType: "individual",
      pensionCapEnabled: true,
      withholdingRate: 0.088,
      dependents: 2,
    });
    expect(rates.freelancerWithholding).toBe(0.088);
    expect(rates.pensionMonthlyIncomeCap).toBe(PENSION_MONTHLY_INCOME_CAP);
    expect(rates.incomeTaxBrackets).toBe(DEFAULT_TAX_RATES.incomeTaxBrackets);
  });

  it("상한을 끄면 null — 급여 전액이 기준이다", () => {
    const rates = settingsToRates({
      businessType: "individual",
      pensionCapEnabled: false,
      withholdingRate: 0.033,
      dependents: 0,
    });
    expect(rates.pensionMonthlyIncomeCap).toBeNull();
  });
});
