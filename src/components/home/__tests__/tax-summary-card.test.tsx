import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { LedgerEntry, LedgerSettings } from "@/lib/ledger/model";
import { presetRange } from "@/lib/ledger/range";
import { simulateRange } from "@/lib/ledger/simulate";
import { formatKRW } from "@/lib/tax/money";
import { TaxSummaryCard } from "../tax-summary-card";

/**
 * 홈 요약은 결과 화면과 **같은 숫자**를 보여야 한다. 두 화면이 어긋나면
 * 사용자는 어느 쪽이 맞는지 알 방법이 없다. 여기서는 카드가 장부를 그대로
 * `simulateRange` 로 넘기는지, 비었을 때 첫 입력을 부르는지를 고정한다.
 *
 * 데이터층은 통째로 대신 세운다 — Supabase 를 태우면 이 검증과 무관한
 * 네트워크·세션이 끼어든다.
 */
const mocks = vi.hoisted(() => ({
  entries: [] as LedgerEntry[],
  settings: {
    businessType: "individual",
    pensionCapEnabled: false,
    withholdingRate: 0.033,
    dependents: 0,
  } as LedgerSettings,
}));

vi.mock("@/state/use-ledger", () => ({
  useLedger: () => ({
    entries: mocks.entries,
    loading: false,
    error: null,
    add: async () => {},
    update: async () => {},
    remove: async () => {},
    refresh: () => {},
  }),
}));

vi.mock("@/state/use-settings", () => ({
  useSettings: () => ({
    settings: mocks.settings,
    loading: false,
    error: null,
    save: async () => {},
  }),
}));

const month = presetRange("thisMonth", new Date());

function income(amount: number): LedgerEntry {
  return {
    id: "1",
    kind: "income",
    date: month.from,
    amount,
    category: "sales",
    evidence: null,
    merchant: "제약사",
    memo: "",
    autoForced: false,
    updatedAt: `${month.from}T00:00:00Z`,
  };
}

describe("TaxSummaryCard", () => {
  beforeEach(() => {
    mocks.entries = [];
  });

  it("이번 달 내역이 없으면 첫 입력을 부른다", () => {
    render(<TaxSummaryCard />);

    expect(screen.getByText("첫 내역을 입력하세요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /내역 추가/ })).toHaveAttribute(
      "href",
      "/tax/ledger/new",
    );
  });

  it("내역이 있으면 이번 달 Net Cash 와 올해 누계를 보여 준다", () => {
    mocks.entries = [income(11_000_000)];
    const expected = simulateRange(mocks.entries, mocks.settings, month).stage04.netCash;

    render(<TaxSummaryCard />);

    expect(screen.queryByText("첫 내역을 입력하세요")).toBeNull();
    // 카운트업 중간값이 아니라 최종값이 읽혀야 한다 (히어로의 sr-only 라인)
    expect(screen.getByText(`${formatKRW(expected)}원`)).toBeInTheDocument();
    expect(screen.getByText(/올해 누계 Net Cash/)).toBeInTheDocument();
  });

  it("요약 카드는 이번 달 기간을 그대로 결과 화면에 넘긴다", () => {
    mocks.entries = [income(11_000_000)];
    render(<TaxSummaryCard />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `/tax/result?from=${month.from}&to=${month.to}`,
    );
  });
});
