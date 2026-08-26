import { describe, expect, it } from "vitest";

import { validatePassword } from "../password";

describe("validatePassword", () => {
  it("6자 미만이면 길이부터 잡는다", () => {
    expect(validatePassword("12345", "12345")).toBe("비밀번호는 6자 이상이어야 합니다");
  });

  it("두 칸이 다르면 불일치를 알린다", () => {
    expect(validatePassword("abcdef", "abcdeg")).toBe("두 비밀번호가 일치하지 않습니다");
  });

  it("길이도 맞고 두 칸이 같으면 통과한다", () => {
    expect(validatePassword("abcdef", "abcdef")).toBeNull();
  });

  it("짧으면서 다를 때는 길이 문제를 먼저 말한다 — 고쳐도 또 막히면 안 된다", () => {
    expect(validatePassword("123", "456")).toBe("비밀번호는 6자 이상이어야 합니다");
  });
});
