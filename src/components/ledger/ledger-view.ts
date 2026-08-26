import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/config/tax-rates";
import { entryIsDeductible, type LedgerEntry } from "@/lib/ledger/model";

/**
 * T1 장부 목록의 순수 로직 (기능정의 v2 §3 T1)
 *
 * 그룹핑·필터·월 이동은 화면 안에 두면 조용히 깨진다 — 필터 한 줄이 뒤집혀도
 * 목록은 여전히 "그럴듯하게" 그려지기 때문이다. 렌더에서 떼어 내 테스트로
 * 고정한다.
 *
 * 날짜는 전부 `YYYY-MM-DD` 문자열이다. `Date` 로 왕복시키지 않는다 —
 * `toISOString()` 은 UTC 로 찍어서 KST 자정 직후의 하루를 전날로 되돌린다.
 */

/** 항목 코드 → 라벨. 수입·지출 키가 겹치지 않아 한 표로 합쳐 둔다 */
export const CATEGORY_LABELS = {
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
} as const;

export function categoryLabel(entry: Pick<LedgerEntry, "category">): string {
  return CATEGORY_LABELS[entry.category].label;
}

/**
 * 행에 표시할 이름. 거래처가 비면 메모, 그것도 비면 항목 라벨로 떨어진다 —
 * 이름 없는 빈 줄은 어느 건인지 알아볼 수가 없다.
 */
export function entryTitle(entry: LedgerEntry): string {
  return entry.merchant.trim() || entry.memo.trim() || categoryLabel(entry);
}

export type LedgerFilter = "all" | "income" | "expense" | "nonDeductible";

export const FILTERS: readonly { value: LedgerFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "income", label: "수입" },
  { value: "expense", label: "지출" },
  { value: "nonDeductible", label: "불공제" },
];

/**
 * 불공제 칩은 "매입세액을 못 받는 지출"이다. 인건비도 여기 들어온다 —
 * 판정 함수(`entryIsDeductible`)가 배지와 같은 답을 내므로, 칩으로 거른
 * 목록과 화면의 빨간 배지가 항상 일치한다.
 */
export function filterEntries(
  entries: readonly LedgerEntry[],
  filter: LedgerFilter,
): LedgerEntry[] {
  switch (filter) {
    case "income":
      return entries.filter((e) => e.kind === "income");
    case "expense":
      return entries.filter((e) => e.kind === "expense");
    case "nonDeductible":
      return entries.filter((e) => e.kind === "expense" && !entryIsDeductible(e));
    case "all":
      return [...entries];
  }
}

export interface DateGroup {
  /** YYYY-MM-DD */
  date: string;
  entries: LedgerEntry[];
}

/**
 * 날짜별 묶음, 최신 날짜 먼저. 같은 날 안에서는 받은 순서를 지킨다.
 *
 * 입력이 이미 정렬돼 있다고 가정하고 이어 붙이면, 정렬이 한 번이라도
 * 흔들리는 날 같은 날짜 그룹이 두 개로 쪼개져 나온다. Map 으로 모으면
 * 입력 순서와 무관하게 옳다.
 */
export function groupByDate(entries: readonly LedgerEntry[]): DateGroup[] {
  const byDate = new Map<string, LedgerEntry[]>();
  for (const entry of entries) {
    const bucket = byDate.get(entry.date);
    if (bucket) bucket.push(entry);
    else byDate.set(entry.date, [entry]);
  }
  return [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, group]) => ({ date, entries: group }));
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** 로컬 기준 오늘. UTC 로 찍으면 한국 시간 오전 9시 이전이 전날이 된다 */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** `2026-08-26` → `2026-08` */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** `2026-08` + 1 → `2026-09`, `2026-12` + 1 → `2027-01` */
export function shiftMonth(yyyyMm: string, delta: number): string {
  const [year, month] = yyyyMm.split("-").map(Number);
  const zeroBased = year * 12 + (month - 1) + delta;
  return `${Math.floor(zeroBased / 12)}-${pad((zeroBased % 12) + 1)}`;
}

/** `2026-08` → `2026년 8월` */
export function monthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-").map(Number);
  return `${year}년 ${month}월`;
}

/** `YYYY-MM` 형식만 받는다. URL 쿼리는 사용자가 손댈 수 있다 */
export function isMonth(value: string | null): value is string {
  return value !== null && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** `2026-08-26` → `8월 26일 (수)` */
export function dateHeading(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  // UTC 로 요일을 뽑는다. 로컬 자정 파싱은 DST 지역에서 하루가 밀린다
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return `${month}월 ${day}일 (${weekday})`;
}
