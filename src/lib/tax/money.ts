/**
 * 금액 연산 — 정수(원) 기반 (PRD §4.7)
 *
 * 부동소수점 누적오차를 차단하기 위해 모든 금액은 정수 원 단위로 다루고,
 * 각 단계 산출 시 1원 미만은 버린다(floor).
 *
 * ⚠️ `Math.floor(base * rate)` 를 쓰면 안 된다. IEEE 754 에서
 *   12_000_000 * 0.009 === 107999.99999999999
 * 이므로 고용보험료가 108,000 이 아니라 107,999 로 떨어진다. 요율이 걸린
 * 모든 항목에서 1원씩 어긋나고, 그 오차가 필요경비 → 과세표준 → 세액으로
 * 전파된다. 그래서 비율 연산은 전부 `mulDivFloor` 를 거친다.
 */

/** 요율을 정수로 환산할 때 쓰는 배율. 1e-6 자리까지 표현한다. */
const RATE_SCALE = 1_000_000;

/**
 * floor(a × num ÷ den) 을 오버플로 없이 정확히 계산한다.
 *
 * a × num 을 그대로 곱하면 2^53 을 넘길 수 있으므로 a 를 den 으로 나눈
 * 몫과 나머지로 쪼갠다.
 *
 *   a = q·den + r  (0 ≤ r < den)
 *   ⌊a·num/den⌋ = q·num + ⌊r·num/den⌋
 *
 * q·num 은 결과와 같은 크기라 안전하고, r·num < den·num 이라 안전하다.
 */
export function mulDivFloor(a: number, num: number, den: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(num) || den === 0) return 0;
  const q = Math.floor(a / den);
  const r = a - q * den;
  return q * num + Math.floor((r * num) / den);
}

/** 1원 미만 버림. 계산 결과를 다음 단계로 넘기기 전에 반드시 통과시킨다. */
export function won(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.floor(value);
}

/** 비율 적용 후 1원 미만 버림. 요율이 걸린 모든 금액은 이 함수를 쓴다. */
export function applyRate(base: number, rate: number): number {
  if (!Number.isFinite(base) || !Number.isFinite(rate)) return 0;
  return mulDivFloor(base, Math.round(rate * RATE_SCALE), RATE_SCALE);
}

/**
 * VAT 포함가에서 공급가액을 역산한다 — 버림(총액 ÷ (1 + 세율)).
 *
 * `gross / 1.1` 로 계산하면 1.1 이 이진수로 정확히 표현되지 않아
 * 33_000_000 / 1.1 === 29999999.999999996 처럼 떨어져 공급가액이 1원
 * 모자라게 나온다. 정수비(10/11)로 바꿔 계산한다.
 */
export function divideByOnePlusRate(gross: number, rate: number): number {
  if (!Number.isFinite(gross) || !Number.isFinite(rate)) return 0;
  const scaled = Math.round(rate * RATE_SCALE);
  const g = gcd(RATE_SCALE, RATE_SCALE + scaled);
  return mulDivFloor(gross, RATE_SCALE / g, (RATE_SCALE + scaled) / g);
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/** 음수를 0 으로 눌러 준다. 과세표준·세액이 음수가 되는 경우에 쓴다. */
export function atLeastZero(value: number): number {
  return value > 0 ? value : 0;
}

/** 3자리 콤마. 화면 표기용. */
export function formatKRW(value: number): string {
  return won(Number(value) || 0).toLocaleString("ko-KR");
}

/**
 * 백분율 문자열. 소수 첫째 자리까지.
 * 마진율처럼 "19.4%" 형태로 보여줄 때 쓴다.
 */
export function formatPercent(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return "0.0";
  return (ratio * 100).toFixed(digits);
}
