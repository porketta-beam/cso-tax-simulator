import { describe, expect, it } from "vitest";

import { buildWorkbook } from "@/lib/export-xlsx";
import { simulate } from "@/lib/tax/pipeline";
import { sumLedger } from "@/state/ledger";
import { INITIAL_STATE, toTaxInput, type SimulatorState } from "@/state/simulator-reducer";

describe("buildWorkbook", () => {
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
  const build = (s: SimulatorState) =>
    buildWorkbook(s, simulate(toTaxInput(s, "2026 Q2")), sumLedger(s.ledger));

  it("명세가 있으면 3개, 비어 있으면 2개 시트를 만든다", () => {
    expect(build(state).map((s) => s.sheet)).toEqual(["입력값", "계산 결과", "지출 명세"]);
    expect(build({ ...state, ledger: [] }).map((s) => s.sheet)).toEqual([
      "입력값",
      "계산 결과",
    ]);
  });

  it("입력 금액은 숫자 셀로 들어가고 사업자 유형 행이 있다", () => {
    const [input] = build(state);
    expect(input.data).toContainEqual([
      "CSO 판매대행 수수료 수입",
      { value: 11_000_000, type: Number },
    ]);
    expect(input.data).toContainEqual(["사업자 유형", "개인사업자"]);
  });

  it("명세 행의 증빙·비용구분·공제여부를 라벨로 옮긴다", () => {
    const ledger = build(state)[2].data;
    expect(ledger[1]).toEqual([
      "2026-04-12",
      '홍길동, "약국"',
      { value: 110_000, type: Number },
      "신용카드",
      "적격증빙 매입",
      "공제",
      "",
    ]);
    expect(ledger[2]).toEqual(["합계", "", { value: 110_000, type: Number }]);
  });
});
