import { describe, expect, it } from "vitest";

import { periodStartFor } from "../period";
import { periodLabelFor } from "../period-label";

describe("periodStartFor — 저장 행을 고르는 기간 키", () => {
  it("월간은 그 달 1일이다", () => {
    expect(periodStartFor("month", new Date(2026, 7, 26))).toBe("2026-08-01");
    expect(periodStartFor("month", new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(periodStartFor("month", new Date(2026, 11, 31))).toBe("2026-12-01");
  });

  it("분기는 그 분기의 첫 달 1일이다", () => {
    expect(periodStartFor("quarter", new Date(2026, 7, 26))).toBe("2026-07-01");
    expect(periodStartFor("quarter", new Date(2026, 4, 15))).toBe("2026-04-01");
  });

  it("분기 경계 — 마지막 날과 다음 첫날이 다른 행으로 갈린다", () => {
    expect(periodStartFor("quarter", new Date(2026, 2, 31))).toBe("2026-01-01");
    expect(periodStartFor("quarter", new Date(2026, 3, 1))).toBe("2026-04-01");
    expect(periodStartFor("quarter", new Date(2026, 8, 30))).toBe("2026-07-01");
    expect(periodStartFor("quarter", new Date(2026, 9, 1))).toBe("2026-10-01");
  });

  it("연간은 1월 1일이다", () => {
    expect(periodStartFor("year", new Date(2026, 7, 26))).toBe("2026-01-01");
    expect(periodStartFor("year", new Date(2027, 11, 31))).toBe("2027-01-01");
  });
});

describe("periodLabelFor — 라벨은 기간 키에서 나온다", () => {
  it("기간 키를 그대로 읽는다 — 오늘이 언제든 같은 값", () => {
    expect(periodLabelFor("month", "2026-08-01")).toBe("2026년 8월");
    expect(periodLabelFor("quarter", "2026-07-01")).toBe("2026 Q3");
    expect(periodLabelFor("quarter", "2026-01-01")).toBe("2026 Q1");
    expect(periodLabelFor("year", "2026-01-01")).toBe("2026년");
  });

  it("하이드레이션 전(키가 비었을 때)에는 날짜 없는 문구다", () => {
    expect(periodLabelFor("quarter", "")).toBe("이번 분기");
    expect(periodLabelFor("month", "")).toBe("이번 달");
    expect(periodLabelFor("year", "")).toBe("올해");
  });
});
