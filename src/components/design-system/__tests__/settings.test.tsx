import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { Stepper, Toggle } from "../settings";

/**
 * 스테퍼와 토글은 값이 바로 계산에 들어간다. 하한 아래로 내려가거나 스위치가
 * 눌린 상태를 보조기술에 거꾸로 알리면 사용자는 자기가 고른 적 없는 설정으로
 * 세금을 본다 — 그래서 여기만 테스트로 고정한다.
 */
describe("Stepper", () => {
  it("하한에서는 − 를 막고 + 만 살려 둔다", () => {
    const onChange = vi.fn();
    render(<Stepper label="부양가족 수" value={0} onChange={onChange} />);

    const minus = screen.getByRole("button", { name: /줄이기/ });
    expect(minus).toBeDisabled();
    fireEvent.click(minus);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /늘리기/ }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("max 에 닿으면 + 를 막는다", () => {
    render(<Stepper label="부양가족 수" value={3} max={3} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /늘리기/ })).toBeDisabled();
  });

  it("disabled 면 양쪽 다 눌리지 않는다", () => {
    const onChange = vi.fn();
    render(<Stepper label="부양가족 수" value={2} disabled onChange={onChange} />);

    for (const name of [/줄이기/, /늘리기/]) {
      const button = screen.getByRole("button", { name });
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(onChange).not.toHaveBeenCalled();
  });

  it("라벨을 버튼 이름에 붙인다 — 한 화면에 스테퍼가 둘이어도 구분된다", () => {
    render(<Stepper label="부양가족 수" value={1} onChange={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "부양가족 수 늘리기" }),
    ).toBeInTheDocument();
  });
});

describe("Toggle", () => {
  it("누르면 aria-checked 가 뒤집힌다", () => {
    function Harness() {
      const [on, setOn] = React.useState(false);
      return <Toggle label="국민연금 상한 적용" on={on} onChange={setOn} />;
    }
    render(<Harness />);

    const toggle = screen.getByRole("switch", { name: "국민연금 상한 적용" });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("disabled 면 눌러도 바뀌지 않는다 — 목업 항목이 켜진 것처럼 보이면 안 된다", () => {
    const onChange = vi.fn();
    render(<Toggle label="신고 기한 알림" on={false} disabled onChange={onChange} />);

    const toggle = screen.getByRole("switch", { name: "신고 기한 알림" });
    expect(toggle).toBeDisabled();
    fireEvent.click(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });
});
