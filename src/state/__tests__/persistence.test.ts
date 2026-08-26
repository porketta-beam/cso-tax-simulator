import { beforeEach, describe, expect, it, vi } from "vitest";

import { LOCAL_KEY, loadLocal, saveLocal } from "../persistence";
import { INITIAL_STATE, type SimulatorState } from "../simulator-reducer";

const filled: SimulatorState = {
  ...INITIAL_STATE,
  businessType: "corporate",
  periodMode: "month",
  periodStart: "2026-08-01",
  amounts: { ...INITIAL_STATE.amounts, revenue: 50_000_000, salary: 3_000_000 },
};

describe("로컬 저장", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("저장한 것을 그대로 되읽는다", () => {
    const stamped = saveLocal(filled, new Date("2026-08-26T09:00:00.000Z"));
    expect(stamped.updatedAt).toBe("2026-08-26T09:00:00.000Z");
    expect(loadLocal()).toEqual(stamped);
  });

  it("저장된 게 없으면 null", () => {
    expect(loadLocal()).toBeNull();
  });

  it("손상된 JSON 은 삼키지 않는다 — 화면이 조용히 깨지지 않도록", () => {
    localStorage.setItem(LOCAL_KEY, "{ 이건 JSON 이 아니다");
    expect(loadLocal()).toBeNull();

    localStorage.setItem(LOCAL_KEY, '{"app":"something-else","state":{}}');
    expect(loadLocal()).toBeNull();
  });

  it("저장소가 막혀도 앱은 계속 돈다 — 경고만 남긴다", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    expect(() => saveLocal(filled)).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});
