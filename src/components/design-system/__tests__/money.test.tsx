import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Money } from "../money";
import { BreakdownRow } from "../breakdown-row";

/**
 * Money 는 디자인 시스템이 강제하는 규칙의 집행 지점이다. 여기가 깨지면
 * 금액 표기 규칙 전체가 조용히 무너지므로 테스트로 고정한다.
 */
describe("Money", () => {
  it("3자리 콤마로 찍는다", () => {
    render(<Money value={23283304} role="net" />);
    expect(screen.getByText(/23,283,304/)).toBeInTheDocument();
  });

  it("소수점 이하는 버린다 — 화면에도 정수 원만 나온다", () => {
    render(<Money value={1234.99} role="in" />);
    expect(screen.getByText(/1,234/)).toBeInTheDocument();
    expect(screen.queryByText(/1,235/)).not.toBeInTheDocument();
  });

  it("tabular-nums 를 항상 적용한다 — 표에서 세로 정렬이 무너지지 않도록", () => {
    const { container } = render(<Money value={1000} role="in" />);
    const el = container.firstElementChild;
    expect(el).toHaveClass("num");
    expect(el).toHaveClass("tabular-nums");
  });

  it("role 이 색을 결정한다 — 임의 색 금지", () => {
    const roles = [
      ["net", "text-money-net"],
      ["in", "text-money-in"],
      ["out", "text-money-out"],
      ["tax", "text-money-tax"],
      ["reserve", "text-money-reserve"],
    ] as const;

    for (const [role, expected] of roles) {
      const { container, unmount } = render(<Money value={1} role={role} />);
      expect(container.firstElementChild).toHaveClass(expected);
      unmount();
    }
  });

  it("음수는 하이픈이 아니라 U+2212 minus 로 찍는다 — 숫자와 폭이 맞는다", () => {
    render(<Money value={-5000} role="out" />);
    expect(screen.getByText(/−5,000/)).toBeInTheDocument();
  });

  it("signed 일 때만 양수에 + 를 붙인다", () => {
    const { rerender } = render(<Money value={5000} role="in" signed />);
    expect(screen.getByText(/\+5,000/)).toBeInTheDocument();

    rerender(<Money value={5000} role="in" />);
    expect(screen.queryByText(/\+5,000/)).not.toBeInTheDocument();
  });

  it("showUnit=false 면 단위를 숨긴다 — 표 안에서 쓸 때", () => {
    const { container } = render(
      <Money value={1000} role="out" showUnit={false} />,
    );
    expect(container.textContent).toBe("1,000");
  });
});

describe("BreakdownRow", () => {
  it("sub 에 산식을 그대로 노출한다 — 세무는 블랙박스면 안 된다", () => {
    render(
      <BreakdownRow label="매출 VAT" sub="120,000,000 ÷ 11" value={10909091} />,
    );
    expect(screen.getByText("120,000,000 ÷ 11")).toBeInTheDocument();
    expect(screen.getByText(/10,909,091/)).toBeInTheDocument();
  });

  it("level=total 이면 구분선이 붙는다 — 소계임을 형태로 알린다", () => {
    const { container } = render(
      <BreakdownRow label="합계" value={100} level="total" />,
    );
    expect(container.firstElementChild).toHaveClass("border-t");
  });
});
