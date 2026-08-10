"use client";

import * as React from "react";

import type { PeriodMode } from "@/config/tax-rates";

/**
 * 기간 라벨 — "2026 Q2" 처럼 지금이 언제인지 붙여 준다.
 *
 * 날짜는 서버와 클라이언트가 다를 수 있어 그냥 렌더에 쓰면 하이드레이션이
 * 어긋난다. `useSyncExternalStore` 로 서버 스냅샷에는 날짜 없는 문구를 주고,
 * 하이드레이션이 끝난 뒤 실제 날짜 라벨로 바꾼다.
 *
 * 대상 기간을 사용자가 직접 고르는 기능은 1단계 범위 밖이라 "현재" 기준이다.
 */
const GENERIC: Record<PeriodMode, string> = {
  month: "이번 달",
  quarter: "이번 분기",
  year: "올해",
};

function formatNow(mode: PeriodMode, now: Date): string {
  const year = now.getFullYear();
  switch (mode) {
    case "month":
      return `${year}년 ${now.getMonth() + 1}월`;
    case "quarter":
      return `${year} Q${Math.floor(now.getMonth() / 3) + 1}`;
    case "year":
      return `${year}년`;
  }
}

/** 구독자가 없는 정적 스토어 — 값이 스스로 바뀌지 않는다 */
const noopSubscribe = () => () => {};

export function usePeriodLabel(mode: PeriodMode): string {
  const getSnapshot = React.useCallback(
    () => formatNow(mode, new Date()),
    [mode],
  );
  const getServerSnapshot = React.useCallback(() => GENERIC[mode], [mode]);

  return React.useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot);
}
