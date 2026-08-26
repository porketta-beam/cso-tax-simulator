import "@testing-library/jest-dom/vitest";

/**
 * jsdom 에는 ResizeObserver 가 없다. Radix 프리미티브(SegmentedToggle 이 쓰는
 * RadioGroup 등)는 마운트 시점에 이걸 새로 만들므로, 없으면 컴포넌트가
 * 렌더도 되기 전에 터진다. 크기를 재는 것이 목적이 아니므로 빈 구현이면
 * 충분하다 — 레이아웃을 검증하는 테스트는 어차피 jsdom 에서 쓸 수 없다.
 */
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/**
 * jsdom 에는 matchMedia 도 없다. `NetCashHero` 는 모션 축소 설정을 **렌더 중에**
 * 읽으므로(`usePrefersReducedMotion` → `useSyncExternalStore`), 없으면 Net Cash
 * 가 들어간 화면은 렌더도 되기 전에 터진다. 항상 false(모션 허용)를 돌려준다 —
 * 축소 설정을 검증하는 테스트는 이 스텁을 각자 덮어쓰면 된다.
 */
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (media: string) =>
    ({
      media,
      matches: false,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
