import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { AuthGate } from "../auth-gate";

/**
 * AuthGate 는 "보호된 화면이 한 프레임도 새지 않는다"는 약속의 집행 지점이다.
 * 서버가 없어 판단이 전부 브라우저에서 일어나므로, 조건 하나만 뒤집혀도
 * 로그아웃 상태에서 장부 화면이 스쳐 지나간다 — 그 격자를 여기서 고정한다.
 */
const replace = vi.fn();
let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace }),
}));

const auth = { user: null as { email: string } | null, loading: false, configured: true };
vi.mock("@/state/auth-context", () => ({ useAuth: () => auth }));

function mount(state: Partial<typeof auth>, route: string) {
  Object.assign(auth, { user: null, loading: false, configured: true }, state);
  pathname = route;
  render(
    <AuthGate>
      <p>보호된 내용</p>
    </AuthGate>,
  );
}

const leaked = () => screen.queryByText("보호된 내용") !== null;

describe("AuthGate", () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it("세션 복구 중에는 보호된 화면을 내보내지 않는다", () => {
    mount({ loading: true }, "/tax/ledger");
    expect(leaked()).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it("로그아웃 상태로 보호된 경로에 들어오면 /login 으로 보낸다", () => {
    mount({}, "/tax/ledger");
    expect(leaked()).toBe(false);
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("로그인했으면 그대로 통과시킨다", () => {
    mount({ user: { email: "a@b.c" } }, "/tax/ledger");
    expect(leaked()).toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });

  it("로그인한 사용자가 /login 에 오면 홈으로 되돌린다", () => {
    mount({ user: { email: "a@b.c" } }, "/login");
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("로그아웃 상태에서 /login 은 열려 있다", () => {
    mount({}, "/login");
    expect(leaked()).toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });

  it("/design-system 은 세션과 무관하게 항상 열린다", () => {
    mount({ loading: true, configured: false }, "/design-system");
    expect(leaked()).toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });

  it("환경변수 없는 빌드는 리다이렉트 대신 이유를 적는다", () => {
    mount({ configured: false }, "/tax/ledger");
    expect(leaked()).toBe(false);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText(/설정되지 않은 빌드/)).toBeInTheDocument();
  });
});
