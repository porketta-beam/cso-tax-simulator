import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { DateRange } from "@/lib/ledger/range";
import { RangePicker } from "../range-picker";

/** 시계를 읽지 않는다 — 오늘에 따라 통과 여부가 바뀌면 테스트가 아니다 */
const TODAY = new Date(2026, 7, 15); // 2026-08-15 (로컬)
const AUGUST: DateRange = { from: "2026-08-01", to: "2026-08-31" };

function mount(value: DateRange = AUGUST) {
  const onChange = vi.fn();
  render(<RangePicker value={value} onChange={onChange} today={TODAY} />);
  return onChange;
}

const chip = (label: string) => screen.getByRole("button", { name: label });
const pressed = () =>
  screen
    .getAllByRole("button")
    .filter((b) => b.getAttribute("aria-pressed") === "true")
    .map((b) => b.textContent);

describe("RangePicker (v2 §3 T2)", () => {
  it("지금 범위와 같은 프리셋만 눌린 상태로 보인다", () => {
    mount();
    expect(pressed()).toEqual(["이번 달"]);
  });

  it("날짜를 손으로 고치면 어떤 칩도 눌려 있지 않다", () => {
    mount({ from: "2026-08-03", to: "2026-08-20" });
    expect(pressed()).toEqual([]);
  });

  it("칩을 누르면 그 프리셋의 범위를 올려보낸다", () => {
    const onChange = mount();

    fireEvent.click(chip("이번 분기"));
    expect(onChange).toHaveBeenCalledWith({ from: "2026-07-01", to: "2026-09-30" });

    fireEvent.click(chip("지난 달"));
    expect(onChange).toHaveBeenCalledWith({ from: "2026-07-01", to: "2026-07-31" });

    fireEvent.click(chip("올해"));
    expect(onChange).toHaveBeenCalledWith({ from: "2026-01-01", to: "2026-12-31" });
  });

  it("시작일만 바꿔도 종료일은 그대로 따라간다", () => {
    const onChange = mount();
    fireEvent.change(screen.getByLabelText("시작일"), {
      target: { value: "2026-08-10" },
    });
    expect(onChange).toHaveBeenCalledWith({ from: "2026-08-10", to: "2026-08-31" });
  });

  it("날짜를 비우면 무시한다 — 빈 기간으로 조회할 수는 없다", () => {
    const onChange = mount();
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("시작일이 종료일보다 늦으면 이유를 알린다", () => {
    mount({ from: "2026-09-01", to: "2026-08-31" });
    expect(screen.getByRole("alert")).toHaveTextContent("시작일이 종료일보다 늦습니다");
  });

  it("연환산 안내는 계수가 1 이 아닐 때만 뜬다", () => {
    const { unmount } = render(
      <RangePicker value={AUGUST} onChange={vi.fn()} today={TODAY} />,
    );
    expect(screen.getByText(/1개월 기준 연환산/)).toBeInTheDocument();
    unmount();

    render(
      <RangePicker
        value={{ from: "2026-01-01", to: "2026-12-31" }}
        onChange={vi.fn()}
        today={TODAY}
      />,
    );
    expect(screen.queryByText(/연환산/)).not.toBeInTheDocument();
  });
});
