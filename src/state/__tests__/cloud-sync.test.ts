import { describe, expect, it } from "vitest";

import { pickNewer, syncStatusLabel } from "../cloud-sync";
import { INITIAL_STATE, type SimulatorState } from "../simulator-reducer";

function at(updatedAt: string, revenue = 0): SimulatorState {
  return {
    ...INITIAL_STATE,
    periodStart: "2026-07-01",
    updatedAt,
    amounts: { ...INITIAL_STATE.amounts, revenue },
  };
}

describe("pickNewer — 충돌은 updatedAt 이 새로운 쪽이 이긴다", () => {
  it("서버가 새로우면 서버가 이긴다", () => {
    const local = at("2026-08-26T09:00:00.000Z", 1);
    const remote = at("2026-08-26T10:00:00.000Z", 2);
    expect(pickNewer(local, remote)).toBe(remote);
  });

  it("로컬이 새로우면 로컬이 이긴다", () => {
    const local = at("2026-08-26T11:00:00.000Z", 1);
    const remote = at("2026-08-26T10:00:00.000Z", 2);
    expect(pickNewer(local, remote)).toBe(local);
  });

  it("같으면 로컬이 이긴다 — 사용자가 지금 보고 있는 쪽이다", () => {
    const local = at("2026-08-26T10:00:00.000Z", 1);
    const remote = at("2026-08-26T10:00:00.000Z", 2);
    expect(pickNewer(local, remote)).toBe(local);
  });

  it("서버에 행이 없으면 로컬이다", () => {
    const local = at("2026-08-26T10:00:00.000Z", 1);
    expect(pickNewer(local, null)).toBe(local);
  });

  it("한 번도 저장된 적 없는 로컬은 서버에 진다", () => {
    // v1·v2 파일에서 올라온 상태는 updatedAt 이 epoch 이다
    const local = at(new Date(0).toISOString());
    const remote = at("2026-08-26T10:00:00.000Z", 9);
    expect(pickNewer(local, remote)).toBe(remote);
  });
});

describe("syncStatusLabel", () => {
  it("로그아웃 상태는 기기 저장이라고 말한다", () => {
    expect(syncStatusLabel("off", null)).toContain("기기");
  });

  it("저장 완료는 시각을 붙인다", () => {
    expect(syncStatusLabel("saved", "2026-08-26T10:00:00.000Z")).not.toBe("저장됨");
    expect(syncStatusLabel("saved", null)).toBe("저장됨");
  });
});
