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
