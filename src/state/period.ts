import type { PeriodMode } from "@/config/tax-rates";

/**
 * 기간 키 — 저장·동기화 행 하나를 가리키는 값 (M1-b).
 *
 * 서버에는 (user_id, period_mode, period_start) 당 한 행이 있다. 그 행을
 * 고르는 열쇠가 `periodStart` 다: 기간의 **첫 달 1일**(`YYYY-MM-01`).
 * 분기 2026 Q3 은 `2026-07-01`, 2026년 연간은 `2026-01-01` 이다.
 *
 * 날짜를 여기서 읽지 않고 인자로 받는다 — reducer 가 순수해야 테스트가
 * 오늘 날짜에 흔들리지 않는다.
 */
export function periodStartFor(mode: PeriodMode, today: Date): string {
  const month = today.getMonth(); // 0-based
  const first =
    mode === "year" ? 0 : mode === "quarter" ? Math.floor(month / 3) * 3 : month;
  return `${today.getFullYear()}-${String(first + 1).padStart(2, "0")}-01`;
}
