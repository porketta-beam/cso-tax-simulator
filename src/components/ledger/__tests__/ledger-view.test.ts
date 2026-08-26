import { describe, expect, it } from "vitest";

import type { EvidenceType } from "@/config/tax-rates";
import type { LedgerCategory, LedgerEntry } from "@/lib/ledger/model";
import {
  categoryLabel,
  dateHeading,
  entryTitle,
  filterEntries,
  groupByDate,
  isMonth,
  monthLabel,
  monthOf,
  shiftMonth,
  todayISO,
} from "../ledger-view";

/**
 * 목록의 그룹핑·필터는 틀려도 화면이 멀쩡해 보인다 — 빠진 행은 그냥 없는
 * 행처럼 보이기 때문이다. 조용히 깨지는 자리라 여기에 격자를 박아 둔다.
 */
let seq = 0;

function entry(over: Partial<LedgerEntry> = {}): LedgerEntry {
  const kind = over.kind ?? "expense";
  return {
    id: `e${++seq}`,
    kind,
    date: "2026-08-26",
    amount: 10_000,
    category: (kind === "income" ? "sales" : "qualified") as LedgerCategory,
    evidence: (kind === "income" ? null : "card") as EvidenceType | null,
    merchant: "",
    memo: "",
    autoForced: false,
    updatedAt: "2026-08-26T00:00:00Z",
    ...over,
  };
}

describe("filterEntries", () => {
  const income = entry({ kind: "income" });
  const deductible = entry({ category: "qualified", evidence: "taxInvoice" });
  const simple = entry({ category: "nonDeductible", evidence: "simpleReceipt" });
  const payroll = entry({ category: "payrollSalary", evidence: "none" });
  const all = [income, deductible, simple, payroll];

  it("전체는 그대로 둔다", () => {
    expect(filterEntries(all, "all")).toEqual(all);
  });

  it("수입·지출은 kind 로 가른다", () => {
    expect(filterEntries(all, "income")).toEqual([income]);
    expect(filterEntries(all, "expense")).toEqual([deductible, simple, payroll]);
  });

  it("불공제는 공제 판정이 false 인 지출만 — 수입은 섞이지 않는다", () => {
    // 인건비는 증빙이 있어도 매입세액이 없어 불공제로 들어온다
    expect(filterEntries(all, "nonDeductible")).toEqual([simple, payroll]);
  });
});

describe("groupByDate", () => {
  it("날짜별로 묶고 최신 날짜를 먼저 낸다", () => {
    const a = entry({ date: "2026-08-01" });
    const b = entry({ date: "2026-08-26" });
    const c = entry({ date: "2026-08-01" });

    expect(groupByDate([a, b, c])).toEqual([
      { date: "2026-08-26", entries: [b] },
      // 같은 날 안에서는 받은 순서를 지킨다 (repo 가 입력 역순으로 준다)
      { date: "2026-08-01", entries: [a, c] },
    ]);
  });

  it("정렬이 흔들려 들어와도 같은 날짜를 두 그룹으로 쪼개지 않는다", () => {
    const groups = groupByDate([
      entry({ date: "2026-08-02" }),
      entry({ date: "2026-08-01" }),
      entry({ date: "2026-08-02" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].entries).toHaveLength(2);
  });

  it("빈 장부는 빈 배열", () => {
    expect(groupByDate([])).toEqual([]);
  });
});

describe("행 이름", () => {
  it("거래처 → 메모 → 항목 라벨 순으로 떨어진다", () => {
    expect(entryTitle(entry({ merchant: "우리약국", memo: "월세" }))).toBe("우리약국");
    expect(entryTitle(entry({ merchant: "  ", memo: "월세" }))).toBe("월세");
    expect(entryTitle(entry({ category: "fixed" }))).toBe("고정비");
  });

  it("항목 라벨은 수입·지출 양쪽에서 찾는다", () => {
    expect(categoryLabel({ category: "sales" })).toBe("CSO 수수료 매출");
    expect(categoryLabel({ category: "payrollFreelancer" })).toBe("인건비 · 프리랜서");
  });
});

describe("월 이동", () => {
  it("연 경계를 넘는다", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-08", 0)).toBe("2026-08");
  });

  it("라벨은 0 을 떼고 읽는다", () => {
    expect(monthLabel("2026-08")).toBe("2026년 8월");
  });

  it("URL 에서 온 값은 형식을 확인한 뒤에만 쓴다", () => {
    expect(isMonth("2026-08")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("2026-8")).toBe(false);
    expect(isMonth(null)).toBe(false);
  });
});

describe("날짜", () => {
  it("오늘은 로컬 기준이다 — UTC 로 찍으면 한국 새벽이 전날이 된다", () => {
    // 로컬 2026-01-01 00:30 은 UTC 로는 아직 2025-12-31 이다
    expect(todayISO(new Date(2026, 0, 1, 0, 30))).toBe("2026-01-01");
  });

  it("월은 앞 7자리", () => {
    expect(monthOf("2026-08-26")).toBe("2026-08");
  });

  it("날짜 제목에 요일을 붙인다", () => {
    expect(dateHeading("2026-08-26")).toBe("8월 26일 (수)");
    expect(dateHeading("2026-08-01")).toBe("8월 1일 (토)");
  });
});
