import { describe, expect, it } from "vitest";

import { simulate } from "@/lib/tax/pipeline";
import { sumLedger } from "@/state/ledger";
import { INITIAL_STATE, toTaxInput, type SimulatorState } from "@/state/simulator-reducer";
import { buildCsv } from "../export-csv";

describe("buildCsv", () => {
  const state: SimulatorState = {
    ...INITIAL_STATE,
    amounts: { ...INITIAL_STATE.amounts, revenue: 11_000_000 },
    ledger: [
      {
        id: "a",
        date: "2026-04-12",
        merchant: '홍길동, "약국"',
        amount: 110_000,
        evidence: "card",
        category: "qualified",
      },
    ],
    useLedgerTotals: true,
  };
  const csv = buildCsv(state, simulate(toTaxInput(state, "2026 Q2")), sumLedger(state.ledger));

  it("BOM 으로 시작하고 CRLF 로 줄을 끝낸다", () => {
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\r\n");
    expect(csv.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("쉼표·따옴표가 든 필드는 RFC-4180 으로 감싼다", () => {
    expect(csv).toContain('2026-04-12,"홍길동, ""약국""",110000,신용카드,적격증빙 매입,공제,');
  });

  it("입력 금액과 계산 결과가 정수로 들어간다", () => {
    expect(csv).toContain("CSO 판매대행 수수료 수입,11000000\r\n");
    expect(csv).toContain("매출 공급가액,10000000\r\n");
  });
});
