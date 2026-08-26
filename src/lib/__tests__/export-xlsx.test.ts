import { describe, expect, it } from "vitest";

import { TAX_RATES_EFFECTIVE_DATE } from "@/config/tax-rates";
import { buildWorkbook, workbookFileName } from "@/lib/export-xlsx";
import { DEFAULT_SETTINGS, type LedgerEntry } from "@/lib/ledger/model";
import type { DateRange } from "@/lib/ledger/range";
import { simulateRange } from "@/lib/ledger/simulate";

const RANGE: DateRange = { from: "2026-08-01", to: "2026-08-31" };

const ENTRIES: LedgerEntry[] = [
  {
    id: "in",
    kind: "income",
    date: "2026-08-03",
    amount: 11_000_000,
    category: "sales",
    evidence: null,
    merchant: "제약사 A",
    memo: "",
    autoForced: false,
    updatedAt: "2026-08-03T00:00:00.000Z",
  },
  {
    id: "out",
    kind: "expense",
    date: "2026-08-12",
    amount: 110_000,
    category: "qualified",
    evidence: "card",
    merchant: '홍길동, "약국"',
    memo: "샘플",
    autoForced: false,
    updatedAt: "2026-08-12T00:00:00.000Z",
  },
];

/** SheetData 의 셀은 문자열이거나 `{ value, type }` 이다. 검사용으로만 좁힌다 */
const asCell = (cell: unknown) =>
  cell as { value?: unknown; type?: unknown; fontWeight?: string } | null;

const build = (entries: readonly LedgerEntry[] = ENTRIES) =>
  buildWorkbook(
    entries,
    DEFAULT_SETTINGS,
    RANGE,
    simulateRange(entries, DEFAULT_SETTINGS, RANGE),
  );

describe("buildWorkbook (v2 §3 T2)", () => {
  it("장부가 비어 있어도 시트 세 장을 만든다 — 명세는 머리글만 남는다", () => {
    expect(build().map((s) => s.sheet)).toEqual(["입력값", "계산 결과", "지출 명세"]);

    const empty = build([]);
    expect(empty.map((s) => s.sheet)).toEqual(["입력값", "계산 결과", "지출 명세"]);
    expect(empty[2].data).toHaveLength(1);
  });

  it("머리글은 굵게, 열 너비는 칸 수와 맞는다", () => {
    for (const sheet of build()) {
      expect(sheet.data[0].every((cell) => asCell(cell)?.fontWeight === "bold")).toBe(
        true,
      );
      expect(sheet.columns).toHaveLength(sheet.data[0].length);
    }
  });

  it("입력값 시트에 기간·사업자 유형·집계·설정이 들어간다", () => {
    const [input] = build();
    expect(input.data).toContainEqual(["기간", "2026-08-01 ~ 2026-08-31"]);
    expect(input.data).toContainEqual(["사업자 유형", "개인사업자"]);
    expect(input.data).toContainEqual([
      "매출 입금(수입 합계)",
      { value: 11_000_000, type: Number },
    ]);
    expect(input.data).toContainEqual([
      "적격증빙 매입",
      { value: 110_000, type: Number },
    ]);
    expect(input.data).toContainEqual([
      "프리랜서 원천징수율(%)",
      { value: 3.3, type: Number },
    ]);
    expect(input.data).toContainEqual(["세율표 기준일", TAX_RATES_EFFECTIVE_DATE]);
  });

  it("계산 결과는 숫자 셀이고, 개인이면 소득세로 이름 붙는다", () => {
    const rows = build()[1].data;
    const labels = rows.map(([cell]) => (typeof cell === "string" ? cell : ""));
    expect(labels).toContain("납부 VAT");
    expect(labels).toContain("납부 소득세");
    expect(labels).toContain("4대보험 회사부담");
    expect(labels).toContain("Net Cash");
    expect(rows).toContainEqual(["연환산 계수", { value: 12, type: Number }]);
    for (const row of rows.slice(1)) {
      const cell = asCell(row[1]);
      if (cell && typeof cell === "object") expect(cell.type).toBe(Number);
    }
  });

  it("법인이면 같은 자리의 이름만 법인세로 바뀐다", () => {
    const settings = { ...DEFAULT_SETTINGS, businessType: "corporate" as const };
    const rows = buildWorkbook(
      ENTRIES,
      settings,
      RANGE,
      simulateRange(ENTRIES, settings, RANGE),
    )[1].data;
    expect(rows.map(([cell]) => cell)).toContain("납부 법인세");
  });

  it("지출 명세는 장부 한 건이 한 줄 — 항목·증빙·공제 여부를 라벨로 옮긴다", () => {
    const lines = build()[2].data;
    expect(lines[1]).toEqual([
      "2026-08-03",
      "수입",
      "CSO 수수료 매출",
      "",
      "제약사 A",
      { value: 11_000_000, type: Number },
      "",
      "",
    ]);
    expect(lines[2]).toEqual([
      "2026-08-12",
      "지출",
      "적격증빙 매입",
      "신용카드",
      '홍길동, "약국"',
      { value: 110_000, type: Number },
      "공제",
      "샘플",
    ]);
  });

  it("파일명에 기간이 그대로 들어간다", () => {
    expect(workbookFileName(RANGE)).toBe("cso-tax_2026-08-01_2026-08-31.xlsx");
  });
});
