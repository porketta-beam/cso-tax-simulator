import { describe, expect, it } from "vitest";

import { simulate } from "@/lib/tax/pipeline";
import { applyEvidenceChange, sumLedger, type LedgerLine } from "../ledger";
import {
  INITIAL_STATE,
  parseBackupPayload,
  simulatorReducer,
  toBackupPayload,
  toTaxInput,
  type SimulatorState,
} from "../simulator-reducer";

function line(patch: Partial<LedgerLine>): LedgerLine {
  return {
    id: patch.id ?? Math.random().toString(36).slice(2),
    date: "2026-04-12",
    merchant: "테스트",
    amount: 1_000_000,
    evidence: "taxInvoice",
    category: "qualified",
    ...patch,
  };
}

describe("simulatorReducer", () => {
  it("사업자 유형은 개인이 기본이고 법인으로 바꿀 수 있다", () => {
    expect(INITIAL_STATE.businessType).toBe("individual");
    const state = simulatorReducer(INITIAL_STATE, {
      type: "SET_BUSINESS_TYPE",
      businessType: "corporate",
    });
    expect(state.businessType).toBe("corporate");
  });

  it("금액은 음수와 소수를 받지 않는다", () => {
    let state = simulatorReducer(INITIAL_STATE, {
      type: "SET_AMOUNT",
      field: "revenue",
      value: -500,
    });
    expect(state.amounts.revenue).toBe(0);

    state = simulatorReducer(state, {
      type: "SET_AMOUNT",
      field: "revenue",
      value: 1234.99,
    });
    expect(state.amounts.revenue).toBe(1234);
  });

  it("첫 명세가 들어오면 합계 반영을 자동으로 켠다", () => {
    expect(INITIAL_STATE.useLedgerTotals).toBe(false);
    const state = simulatorReducer(INITIAL_STATE, {
      type: "ADD_LEDGER_LINE",
      line: line({ id: "a" }),
    });
    expect(state.useLedgerTotals).toBe(true);
  });

  it("마지막 명세를 지우면 직접 입력으로 되돌린다", () => {
    let state = simulatorReducer(INITIAL_STATE, {
      type: "ADD_LEDGER_LINE",
      line: line({ id: "a" }),
    });
    state = simulatorReducer(state, { type: "REMOVE_LEDGER_LINE", id: "a" });
    expect(state.ledger).toHaveLength(0);
    expect(state.useLedgerTotals).toBe(false);
  });

  it("합계 반영을 꺼도 직접 입력값은 살아 있다 — 토글이 되돌아간다", () => {
    let state = simulatorReducer(INITIAL_STATE, {
      type: "SET_AMOUNT",
      field: "qualifiedEvidence",
      value: 5_000_000,
    });
    state = simulatorReducer(state, {
      type: "ADD_LEDGER_LINE",
      line: line({ id: "a", amount: 1_000_000 }),
    });

    expect(toTaxInput(state, "테스트").qualifiedEvidence).toBe(1_000_000);

    state = simulatorReducer(state, { type: "SET_USE_LEDGER_TOTALS", value: false });
    expect(toTaxInput(state, "테스트").qualifiedEvidence).toBe(5_000_000);
  });
});

describe("명세 → 집계 입력 버킷", () => {
  it("비용 구분 라벨이 아니라 VAT 공제 판정으로 나눈다", () => {
    // 세금계산서를 받은 임차료는 실제로 공제 대상이다. 라벨(고정비)로
    // 나누면 화면의 `공제` 배지와 계산이 어긋난다.
    const totals = sumLedger([
      line({ id: "a", category: "fixed", evidence: "taxInvoice", amount: 1_500_000 }),
    ]);
    expect(totals.qualified).toBe(1_500_000);
    expect(totals.fixed).toBe(0);
  });

  it("간이영수증 고정비는 공제 버킷에 들어가지 않는다", () => {
    const totals = sumLedger([
      line({ id: "a", category: "fixed", evidence: "simpleReceipt", amount: 74_000 }),
    ]);
    expect(totals.qualified).toBe(0);
    expect(totals.fixed).toBe(74_000);
  });

  it("불공제 구분은 증빙이 적격이어도 공제되지 않는다", () => {
    const totals = sumLedger([
      line({ id: "a", category: "nonDeductible", evidence: "card", amount: 380_000 }),
    ]);
    expect(totals.qualified).toBe(0);
    expect(totals.nonDeductible).toBe(380_000);
    expect(totals.deductibleTotal).toBe(0);
  });

  it("인건비 구분은 프리랜서 지급액으로 반영된다", () => {
    const state = simulatorReducer(INITIAL_STATE, {
      type: "ADD_LEDGER_LINE",
      line: line({ id: "a", category: "payroll", amount: 3_000_000 }),
    });
    expect(toTaxInput(state, "테스트").freelancerPay).toBe(3_000_000);
  });

  it("합계와 구성요소가 어긋나지 않는다", () => {
    const totals = sumLedger([
      line({ id: "a", category: "qualified", evidence: "card", amount: 100 }),
      line({ id: "b", category: "fixed", evidence: "simpleReceipt", amount: 200 }),
      line({ id: "c", category: "nonDeductible", evidence: "card", amount: 300 }),
      line({ id: "d", category: "payroll", evidence: "none", amount: 400 }),
    ]);
    expect(totals.count).toBe(4);
    expect(totals.total).toBe(1000);
    expect(totals.qualified + totals.fixed + totals.nonDeductible + totals.payroll).toBe(
      totals.total,
    );
  });
});

describe("증빙 유형 변경 시 비용 구분 자동 전환 (PRD §6.3)", () => {
  it("간이영수증을 고르면 적격증빙 매입에서 불공제로 끌어온다", () => {
    const next = applyEvidenceChange(
      { evidence: "card", category: "qualified" },
      "simpleReceipt",
      false,
    );
    expect(next).toEqual({ category: "nonDeductible", autoForced: true });
  });

  it("우리가 바꾼 것이면 적격 증빙으로 되돌릴 때 같이 되돌린다", () => {
    // 이게 없으면 간이영수증을 잘못 골랐다가 되돌려도 불공제에 묶여
    // 사용자가 모르는 채 매입세액 공제를 통째로 못 받는다
    const forced = applyEvidenceChange(
      { evidence: "card", category: "qualified" },
      "simpleReceipt",
      false,
    );
    const reverted = applyEvidenceChange(
      { evidence: "simpleReceipt", category: forced.category },
      "taxInvoice",
      forced.autoForced,
    );
    expect(reverted).toEqual({ category: "qualified", autoForced: false });
  });

  it("사용자가 직접 고른 불공제는 건드리지 않는다", () => {
    // 카드로 결제한 접대비를 일부러 불공제로 지정한 경우
    const next = applyEvidenceChange(
      { evidence: "simpleReceipt", category: "nonDeductible" },
      "card",
      false,
    );
    expect(next).toEqual({ category: "nonDeductible", autoForced: false });
  });

  it("고정비·인건비 구분은 증빙을 바꿔도 그대로 둔다", () => {
    for (const category of ["fixed", "payroll"] as const) {
      expect(
        applyEvidenceChange({ evidence: "card", category }, "simpleReceipt", false),
      ).toEqual({ category, autoForced: false });
    }
  });
});

describe("명세가 계산까지 흘러간다", () => {
  it("명세를 넣으면 납부 VAT 가 바뀐다", () => {
    let state = simulatorReducer(INITIAL_STATE, {
      type: "SET_AMOUNT",
      field: "revenue",
      value: 120_000_000,
    });
    const before = simulate(toTaxInput(state, "테스트")).stage02.vatPayable;

    state = simulatorReducer(state, {
      type: "ADD_LEDGER_LINE",
      line: line({ id: "a", amount: 28_000_000, evidence: "taxInvoice" }),
    });
    const after = simulate(toTaxInput(state, "테스트")).stage02.vatPayable;

    expect(before).toBe(10_909_091);
    expect(after).toBe(8_363_636);
  });
});

describe("백업 파일", () => {
  const filled: SimulatorState = {
    ...INITIAL_STATE,
    businessType: "corporate",
    periodMode: "month",
    amounts: { ...INITIAL_STATE.amounts, revenue: 50_000_000, salary: 3_000_000 },
    ledger: [line({ id: "a" })],
    useLedgerTotals: true,
  };

  it("내보낸 파일을 그대로 되읽는다", () => {
    const raw = JSON.stringify(toBackupPayload(filled, "2026-08-10T00:00:00.000Z"));
    expect(parseBackupPayload(raw)).toEqual(filled);
  });

  it("남의 JSON 은 받지 않는다", () => {
    expect(parseBackupPayload('{"app":"something-else","state":{}}')).toBeNull();
    expect(parseBackupPayload("not json")).toBeNull();
    expect(parseBackupPayload("null")).toBeNull();
    expect(parseBackupPayload('{"app":"cso-tax-simulator"}')).toBeNull();
  });

  it("손상된 금액은 기본값으로 떨어뜨린다 — 화면이 조용히 깨지지 않도록", () => {
    const raw = JSON.stringify({
      app: "cso-tax-simulator",
      state: {
        periodMode: "quarter",
        amounts: { revenue: "많이", salary: -100, freelancerPay: 5_000_000 },
        ledger: "배열이 아님",
      },
    });
    const restored = parseBackupPayload(raw);
    expect(restored).not.toBeNull();
    expect(restored!.amounts.revenue).toBe(0);
    expect(restored!.amounts.salary).toBe(0);
    expect(restored!.amounts.freelancerPay).toBe(5_000_000);
    expect(restored!.ledger).toEqual([]);
  });

  it("알 수 없는 기간 모드는 분기로 떨어뜨린다", () => {
    const raw = JSON.stringify({
      app: "cso-tax-simulator",
      state: { periodMode: "decade", amounts: {} },
    });
    expect(parseBackupPayload(raw)!.periodMode).toBe("quarter");
  });

  it("사업자 유형이 없는 v1 파일은 개인사업자로 읽는다", () => {
    const raw = JSON.stringify({
      app: "cso-tax-simulator",
      schemaVersion: 1,
      state: { periodMode: "quarter", amounts: {} },
    });
    expect(parseBackupPayload(raw)!.businessType).toBe("individual");
  });

  it("알 수 없는 사업자 유형은 개인사업자로 떨어뜨린다", () => {
    const raw = JSON.stringify({
      app: "cso-tax-simulator",
      state: { businessType: "조합", amounts: {} },
    });
    expect(parseBackupPayload(raw)!.businessType).toBe("individual");
  });
});
