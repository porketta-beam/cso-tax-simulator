/**
 * 조회 기간 (v2 §3 T2)
 *
 * v1 의 기간 모드(월/분기/연)를 버리고 시작일~종료일 자유 선택으로 간다.
 * 프리셋은 그 범위를 채워 주는 편의일 뿐, 계산은 언제나 범위에서만 파생된다.
 *
 * 날짜는 전부 `YYYY-MM-DD` 문자열이고 연산은 UTC 로 한다 — 로컬 자정으로
 * 파싱하면 DST 전환일에 하루가 23·25시간이 되어 일수가 어긋난다.
 * 오늘 날짜는 인자로 받는다. 함수가 시계를 읽으면 테스트가 오늘에 흔들린다.
 */
export interface DateRange {
  /** YYYY-MM-DD, 포함 */
  from: string;
  /** YYYY-MM-DD, 포함 */
  to: string;
}

export type RangePreset = "thisMonth" | "lastMonth" | "thisQuarter" | "thisYear";

const DAY_MS = 86_400_000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** 연·월(1-based)·일 → YYYY-MM-DD */
function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** 그 달의 마지막 날. month 는 1-based */
function lastDayOf(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

interface Parts {
  year: number;
  /** 1-based */
  month: number;
  day: number;
}

function parts(date: string): Parts {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function utc(date: string): number {
  const { year, month, day } = parts(date);
  return Date.UTC(year, month - 1, day);
}

/** 시작 달 1일 ~ 끝 달 말일 */
function monthsRange(year: number, fromMonth: number, toMonth: number): DateRange {
  return {
    from: ymd(year, fromMonth, 1),
    to: ymd(year, toMonth, lastDayOf(year, toMonth)),
  };
}

/** 프리셋 칩 → 범위. `today` 는 사용자가 보는 로컬 날짜다 */
export function presetRange(preset: RangePreset, today: Date): DateRange {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  switch (preset) {
    case "thisMonth":
      return monthsRange(year, month, month);
    case "lastMonth": {
      // 1월의 지난 달은 작년 12월이다
      const prevYear = month === 1 ? year - 1 : year;
      const prevMonth = month === 1 ? 12 : month - 1;
      return monthsRange(prevYear, prevMonth, prevMonth);
    }
    case "thisQuarter": {
      const first = Math.floor((month - 1) / 3) * 3 + 1;
      return monthsRange(year, first, first + 2);
    }
    case "thisYear":
      return monthsRange(year, 1, 12);
  }
}

/** 장부 화면의 월 이동용. `2026-08` → 2026-08-01 ~ 2026-08-31 */
export function monthRange(yyyyMm: string): DateRange {
  const [year, month] = yyyyMm.split("-").map(Number);
  return monthsRange(year, month, month);
}

/** 범위가 달 경계에 딱 맞는가 — 1일에 시작해 말일에 끝나는가 */
function wholeMonths(range: DateRange): number | null {
  const from = parts(range.from);
  const to = parts(range.to);
  if (from.day !== 1 || to.day !== lastDayOf(to.year, to.month)) return null;
  const count = (to.year - from.year) * 12 + (to.month - from.month) + 1;
  return count > 0 ? count : null;
}

/** 포함 일수 */
function dayCount(range: DateRange): number {
  const days = Math.round((utc(range.to) - utc(range.from)) / DAY_MS) + 1;
  return days > 0 ? days : 1;
}

/**
 * 연환산 계수 (v2 §3 T2)
 *
 *   달 경계에 맞는 범위 → 12 / 개월수   (3개월이면 4, 12개월이면 1)
 *   그 밖의 범위        → 365 / 일수
 *
 * 두 갈래인 이유: 달마다 길이가 달라 2월 한 달을 28/365 로 환산하면 계수가
 * 13.04 가 되어 세금이 과대평가된다. 사용자가 고르는 범위의 대부분은 달 단위라
 * 그쪽을 정확히 맞추고, 임의 구간만 일수로 근사한다.
 */
export function annualizationFactor(range: DateRange): number {
  const months = wholeMonths(range);
  return months === null ? 365 / dayCount(range) : 12 / months;
}

/** "2026년 8월" · "2026년 7월 ~ 9월" · "2026.07.15 ~ 2026.08.03" */
export function rangeLabel(range: DateRange): string {
  const from = parts(range.from);
  const to = parts(range.to);

  if (wholeMonths(range) !== null) {
    if (from.year === to.year) {
      return from.month === to.month
        ? `${from.year}년 ${from.month}월`
        : `${from.year}년 ${from.month}월 ~ ${to.month}월`;
    }
    return `${from.year}년 ${from.month}월 ~ ${to.year}년 ${to.month}월`;
  }

  const dotted = (p: Parts) => `${p.year}.${pad(p.month)}.${pad(p.day)}`;
  return `${dotted(from)} ~ ${dotted(to)}`;
}

/**
 * "3개월 기준 연환산" · "45일 기준 연환산".
 * 계수가 1 이면 환산이 없는 셈이므로 화면은 이 문구를 감춘다.
 */
export function annualizationLabel(range: DateRange): string {
  const months = wholeMonths(range);
  return months === null
    ? `${dayCount(range)}일 기준 연환산`
    : `${months}개월 기준 연환산`;
}
