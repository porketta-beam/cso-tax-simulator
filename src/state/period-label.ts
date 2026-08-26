import type { PeriodMode } from "@/config/tax-rates";

/**
 * 기간 라벨 — "2026 Q2" 처럼 어느 기간인지 붙여 준다.
 *
 * 예전에는 렌더 시점의 `new Date()` 를 읽어 하이드레이션이 어긋났다. 지금은
 * 상태의 `periodStart` 에서 뽑으므로 서버·클라이언트가 같은 값을 그린다.
 * 하이드레이션 전(=`periodStart` 가 아직 비어 있을 때)만 날짜 없는 문구다.
 */
const GENERIC: Record<PeriodMode, string> = {
  month: "이번 달",
  quarter: "이번 분기",
  year: "올해",
};

/** `periodStart`(YYYY-MM-01) + 기간 모드 → 라벨 */
export function periodLabelFor(mode: PeriodMode, periodStart: string): string {
  const parsed = /^(\d{4})-(\d{2})/.exec(periodStart);
  if (!parsed) return GENERIC[mode];

  const year = parsed[1];
  const month = Number(parsed[2]);
  switch (mode) {
    case "month":
      return `${year}년 ${month}월`;
    case "quarter":
      return `${year} Q${Math.floor((month - 1) / 3) + 1}`;
    case "year":
      return `${year}년`;
  }
}
