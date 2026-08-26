import { describe, expect, it } from "vitest";

import { authErrorMessage } from "@/lib/auth-errors";

describe("authErrorMessage", () => {
  it("code 를 먼저 본다", () => {
    expect(authErrorMessage({ code: "invalid_credentials", message: "whatever" })).toBe(
      "이메일 또는 비밀번호가 올바르지 않습니다",
    );
    expect(authErrorMessage({ code: "email_not_confirmed" })).toBe(
      "이메일 인증이 아직 완료되지 않았습니다. 메일함을 확인하세요",
    );
    expect(authErrorMessage({ code: "user_already_exists" })).toBe(
      "이미 가입된 이메일입니다",
    );
    expect(authErrorMessage({ code: "weak_password" })).toBe(
      "비밀번호는 6자 이상이어야 합니다",
    );
    expect(authErrorMessage({ code: "over_request_rate_limit" })).toBe(
      "요청이 너무 잦습니다. 잠시 후 다시 시도하세요",
    );
  });

  it("code 가 없으면 메시지로 되짚는다", () => {
    expect(authErrorMessage({ message: "Invalid login credentials" })).toBe(
      "이메일 또는 비밀번호가 올바르지 않습니다",
    );
    expect(authErrorMessage({ message: "User already registered" })).toBe(
      "이미 가입된 이메일입니다",
    );
    expect(
      authErrorMessage({ message: "Password should be at least 6 characters" }),
    ).toBe("비밀번호는 6자 이상이어야 합니다");
  });

  it("모르는 오류는 영문을 노출하지 않는다", () => {
    const unknown = "로그인 처리 중 문제가 생겼습니다";
    expect(authErrorMessage({ message: "AuthApiError: something exploded" })).toBe(unknown);
    expect(authErrorMessage(new Error("boom"))).toBe(unknown);
    expect(authErrorMessage(null)).toBe(unknown);
    expect(authErrorMessage(undefined)).toBe(unknown);
  });
});
