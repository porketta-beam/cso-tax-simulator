"use client";

import * as React from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * 사용자가 모션 축소를 켰는지 렌더 시점에 읽는다.
 *
 * `useEffect` + `setState` 로 구현하면 첫 페인트에 애니메이션이 한 프레임
 * 새어 나가고, react-hooks 의 set-state-in-effect 규칙에도 걸린다.
 * `useSyncExternalStore` 는 렌더 중에 값을 읽으므로 둘 다 없다.
 *
 * SSR 스냅샷은 false 다 — 서버는 사용자 설정을 알 수 없고, 하이드레이션
 * 직후 실제 값으로 정정된다.
 */
export function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
