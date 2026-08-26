import { describe, expect, it } from "vitest";

import {
  annualizationFactor,
  annualizationLabel,
  monthRange,
  presetRange,
  rangeLabel,
} from "../range";

describe("프리셋 (v2 §3 T2)", () => {
  // 시계를 읽지 않는다 — 오늘 날짜에 따라 통과 여부가 바뀌면 테스트가 아니다
  const today = new Date(2026, 7, 15); // 2026-08-15 (로컬)

  it("이번 달은 1일 ~ 말일", () => {
    expect(presetRange("thisMonth", today)).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });

  it("지난 달", () => {
    expect(presetRange("lastMonth", today)).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
    });
  });

  it("1월의 지난 달은 작년 12월", () => {
    expect(presetRange("lastMonth", new Date(2026, 0, 5))).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });

  it("이번 분기는 석 달", () => {
    expect(presetRange("thisQuarter", today)).toEqual({
      from: "2026-07-01",
      to: "2026-09-30",
    });
  });

  it("올해는 1/1 ~ 12/31", () => {
    expect(presetRange("thisYear", today)).toEqual({
      from: "2026-01-01",
      to: "2026-12-31",
    });
  });

  it("윤년 2월 말일을 맞춘다", () => {
    expect(presetRange("thisMonth", new Date(2028, 1, 10)).to).toBe("2028-02-29");
  });

  it("월 이동 헬퍼", () => {
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });
});

describe("연환산 계수", () => {
  it("한 달이면 12", () => {
    expect(annualizationFactor({ from: "2026-08-01", to: "2026-08-31" })).toBe(12);
  });

  it("2월 한 달도 12 — 일수로 환산하면 13.04 가 되어 과대평가된다", () => {
    expect(annualizationFactor({ from: "2026-02-01", to: "2026-02-28" })).toBe(12);
  });

  it("분기면 4", () => {
    expect(annualizationFactor({ from: "2026-07-01", to: "2026-09-30" })).toBe(4);
  });

  it("한 해면 1 — 환산하지 않는다", () => {
    expect(annualizationFactor({ from: "2026-01-01", to: "2026-12-31" })).toBe(1);
  });

  it("해를 넘겨도 개월수로 센다", () => {
    expect(annualizationFactor({ from: "2025-12-01", to: "2026-02-28" })).toBe(4);
  });

  it("달 경계에 안 맞으면 일수 기준", () => {
    // 2026-07-15 ~ 2026-08-28 = 45일
    expect(annualizationFactor({ from: "2026-07-15", to: "2026-08-28" })).toBe(365 / 45);
  });

  it("하루짜리 범위도 0 으로 나누지 않는다", () => {
    expect(annualizationFactor({ from: "2026-08-10", to: "2026-08-10" })).toBe(365);
  });
});

describe("라벨", () => {
  it("한 달", () => {
    expect(rangeLabel({ from: "2026-08-01", to: "2026-08-31" })).toBe("2026년 8월");
  });

  it("같은 해 여러 달", () => {
    expect(rangeLabel({ from: "2026-07-01", to: "2026-09-30" })).toBe(
      "2026년 7월 ~ 9월",
    );
  });

  it("해를 넘기면 양쪽에 연도를 붙인다", () => {
    expect(rangeLabel({ from: "2025-12-01", to: "2026-02-28" })).toBe(
      "2025년 12월 ~ 2026년 2월",
    );
  });

  it("임의 구간은 날짜 그대로", () => {
    expect(rangeLabel({ from: "2026-07-15", to: "2026-08-03" })).toBe(
      "2026.07.15 ~ 2026.08.03",
    );
  });

  it("연환산 문구", () => {
    expect(annualizationLabel({ from: "2026-07-01", to: "2026-09-30" })).toBe(
      "3개월 기준 연환산",
    );
    expect(annualizationLabel({ from: "2026-07-15", to: "2026-08-28" })).toBe(
      "45일 기준 연환산",
    );
  });
});
