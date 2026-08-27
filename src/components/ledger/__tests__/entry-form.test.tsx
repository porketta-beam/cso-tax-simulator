import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { LedgerEntry } from "@/lib/ledger/model";
import { EntryForm } from "../entry-form";

/**
 * 증빙 ↔ 항목 연동은 이 제품에서 가장 조용히 틀리는 규칙이다. 잘못돼도
 * 화면은 멀쩡하고, 결과 화면의 세금만 슬그머니 달라진다. 폼이 그 규칙을
 * 어떻게 집행하는지 여기서 고정한다.
 */
function mount(over: Partial<React.ComponentProps<typeof EntryForm>> = {}) {
  const onSubmit = vi.fn();
  render(
    <EntryForm
      title="내역 추가"
      backHref="/tax/ledger?m=2026-08"
      defaultDate="2026-08-26"
      onSubmit={onSubmit}
      {...over}
    />,
  );
  return { onSubmit };
}

const category = () => screen.getByLabelText("항목") as HTMLSelectElement;
const evidence = () => screen.queryByLabelText("증빙") as HTMLSelectElement | null;
const amount = () => screen.getByLabelText("금액");
// 거래처·메모 라벨에는 " · 선택" 이 붙는다 — 이름 앞부분으로 찾는다
const merchant = () => screen.getByLabelText(/^거래처/);
const memo = () => screen.getByLabelText(/^메모/);
const submit = () => screen.getByRole("button", { name: /저장/ });
const del = () => screen.getByRole("button", { name: "삭제" });

function typeAmount(value: string) {
  fireEvent.change(amount(), { target: { value } });
}

describe("EntryForm — 수입/지출 전환", () => {
  it("수입으로 바꾸면 증빙 칸이 사라지고 항목이 수입 항목으로 초기화된다", () => {
    mount();
    expect(category().value).toBe("qualified");
    expect(evidence()).not.toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "수입" }));

    expect(evidence()).toBeNull();
    expect(category().value).toBe("sales");
    // 지출 항목은 선택지에서 사라진다 — 남아 있으면 집계가 매출로 샌다
    expect(screen.queryByRole("option", { name: "고정비" })).toBeNull();
  });

  it("지출로 되돌리면 지출 항목과 증빙이 다시 나온다", () => {
    mount();
    fireEvent.click(screen.getByRole("radio", { name: "수입" }));
    fireEvent.click(screen.getByRole("radio", { name: "지출" }));

    expect(category().value).toBe("qualified");
    expect(evidence()?.value).toBe("card");
  });
});

describe("EntryForm — 증빙 자동 전환", () => {
  it("간이영수증을 고르면 항목이 불공제로 바뀌고 '자동' 배지가 붙는다", () => {
    mount();
    fireEvent.change(evidence()!, { target: { value: "simpleReceipt" } });

    expect(category().value).toBe("nonDeductible");
    expect(screen.getByText("자동")).toBeInTheDocument();
  });

  it("카드로 되돌리면 자동 전환된 항목만 적격증빙으로 복귀한다", () => {
    mount();
    fireEvent.change(evidence()!, { target: { value: "none" } });
    expect(category().value).toBe("nonDeductible");

    fireEvent.change(evidence()!, { target: { value: "card" } });
    expect(category().value).toBe("qualified");
    expect(screen.queryByText("자동")).toBeNull();
  });

  it("사용자가 직접 고른 불공제는 증빙을 바꿔도 그대로 둔다", () => {
    mount();
    fireEvent.change(category(), { target: { value: "nonDeductible" } });
    expect(screen.queryByText("자동")).toBeNull();

    fireEvent.change(evidence()!, { target: { value: "card" } });

    // 카드로 결제한 접대비를 일부러 불공제로 잡은 경우 — 튀어 오르면 안 된다
    expect(category().value).toBe("nonDeductible");
  });
});

describe("EntryForm — 저장", () => {
  it("금액이 0이거나 비어 있으면 저장할 수 없다", () => {
    mount();
    expect(submit()).toBeDisabled();

    typeAmount("0");
    expect(submit()).toBeDisabled();

    typeAmount("1");
    expect(submit()).toBeEnabled();
  });

  it("입력한 그대로 EntryInput 을 넘긴다", async () => {
    const { onSubmit } = mount();

    fireEvent.change(screen.getByLabelText("날짜"), { target: { value: "2026-08-20" } });
    typeAmount("330000");
    fireEvent.change(evidence()!, { target: { value: "taxInvoice" } });
    fireEvent.change(category(), { target: { value: "fixed" } });
    fireEvent.change(merchant(), { target: { value: " 우리부동산 " } });
    fireEvent.change(memo(), { target: { value: "8월 월세" } });

    fireEvent.click(submit());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      kind: "expense",
      date: "2026-08-20",
      amount: 330000,
      category: "fixed",
      evidence: "taxInvoice",
      merchant: "우리부동산",
      memo: "8월 월세",
      autoForced: false,
    });
  });

  it("수입은 증빙 없이(null) 넘어간다", async () => {
    const { onSubmit } = mount();
    fireEvent.click(screen.getByRole("radio", { name: "수입" }));
    typeAmount("1000000");
    fireEvent.click(submit());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      kind: "income",
      category: "sales",
      evidence: null,
    });
  });

  it("저장이 실패하면 화면을 떠나지 않고 이유를 띄운다", async () => {
    mount({
      onSubmit: vi.fn().mockRejectedValue(new Error("네트워크 오류")),
    });
    typeAmount("1000");
    fireEvent.click(submit());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("저장하지 못했습니다 (네트워크 오류)");
  });
});

describe("EntryForm — 수정·삭제", () => {
  const existing: LedgerEntry = {
    id: "abc",
    kind: "expense",
    date: "2026-08-10",
    amount: 55_000,
    category: "nonDeductible",
    evidence: "simpleReceipt",
    merchant: "김밥천국",
    memo: "",
    autoForced: true,
    updatedAt: "2026-08-10T00:00:00Z",
  };

  it("기존 값을 그대로 채우고 자동 전환 표시를 유지한다", () => {
    mount({ initial: existing, defaultDate: "2026-08-26" });

    expect(screen.getByLabelText("날짜")).toHaveValue("2026-08-10");
    expect(amount()).toHaveValue("55,000");
    expect(category().value).toBe("nonDeductible");
    expect(evidence()?.value).toBe("simpleReceipt");
    expect(screen.getByText("자동")).toBeInTheDocument();
  });

  it("삭제는 두 번 눌러야 실행된다", async () => {
    const onDelete = vi.fn();
    mount({ initial: existing, onDelete });

    fireEvent.click(del());
    expect(onDelete).not.toHaveBeenCalled();
    // 라벨은 그대로 두고 확인 문구를 아래에 붙인다
    expect(
      screen.getByText("정말 삭제할까요? 다시 누르면 삭제됩니다"),
    ).toBeInTheDocument();

    fireEvent.click(del());
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  it("추가 화면에는 삭제 버튼이 없다", () => {
    mount();
    expect(screen.queryByRole("button", { name: "삭제" })).toBeNull();
  });
});
