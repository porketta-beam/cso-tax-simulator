"use client";

import * as React from "react";

import {
  Badge,
  Button,
  Card,
  MoneyInput,
  SegmentedToggle,
} from "@/components/design-system";
import { AppShell } from "@/components/screens/app-shell";
import {
  EVIDENCE_TYPES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type EvidenceType,
} from "@/config/tax-rates";
import {
  applyEvidenceChange,
  type EntryInput,
  type EntryKind,
  type LedgerCategory,
  type LedgerEntry,
} from "@/lib/ledger/model";
import { cn } from "@/lib/utils";

/**
 * T1-a 내역 추가·수정 폼 (기능정의 v2 §3)
 *
 * 추가 화면과 수정 화면이 같은 컴포넌트를 쓴다. 증빙 ↔ 항목 연동 규칙이 두
 * 벌이 되면 한쪽만 고쳐지고, 그러면 어느 화면으로 들어왔느냐에 따라 공제
 * 판정이 달라진다.
 *
 * 폼이 셸까지 그린다. [저장]·[삭제]는 하단 고정 영역(`AppShell` 의 `footer`)에
 * 있어야 하는데 그 자리는 `<form>` 밖이다 — 버튼은 `form` 속성으로 폼에
 * 묶는다. 상태를 화면 쪽으로 끌어올려 나누면 "저장할 수 있는가"의 판정이 두
 * 곳에 생긴다.
 *
 * 저장·삭제 자체는 부모가 한다. 폼은 실패 메시지만 자기 자리에 띄운다 —
 * 화면을 떠나기 전에 무엇이 잘못됐는지 입력값 옆에서 보여야 한다.
 */
export interface EntryFormProps {
  title: string;
  /** 뒤로 갈 목록 주소 — 보고 있던 달을 유지한다 */
  backHref: string;
  /** 수정일 때의 기존 값. 없으면 추가 */
  initial?: LedgerEntry;
  onSubmit(input: EntryInput): Promise<void> | void;
  /** 수정 화면에만 준다. 있으면 하단에 삭제(두 번 탭)가 붙는다 */
  onDelete?(): Promise<void> | void;
  submitting?: boolean;
  /** 추가일 때의 기본 날짜 — 보고 있던 달이 이번 달이 아니면 그 달 1일 */
  defaultDate: string;
}

const INCOME_OPTIONS = Object.entries(INCOME_CATEGORIES);
const EXPENSE_OPTIONS = Object.entries(EXPENSE_CATEGORIES);
const EVIDENCE_OPTIONS = Object.entries(EVIDENCE_TYPES);

/** 하단 [저장] 을 본문의 폼에 묶는다 — 한 화면에 폼은 하나뿐이다 */
const FORM_ID = "entry-form";
const DELETE_HINT_ID = "entry-delete-hint";

/**
 * 셀렉트·텍스트 입력의 공통 껍데기.
 *
 * shadcn `Select`(Radix 팝오버)를 쓰지 않고 네이티브 `<select>` 를 쓴다.
 * 모바일에서 네이티브 피커가 한 손으로 다루기 좋고, 이 프리미티브는 아직
 * 시맨틱 토큰이 아니라 shadcn 기본 토큰(`border-input`, `bg-popover`)과
 * 32px 높이로 만들어져 있어 탭 타깃 하한 44px 을 깬다.
 */
const FIELD = cn(
  "h-tap-field w-full min-w-0 rounded-md border-2 border-line-subtle bg-surface-card px-3",
  "text-body font-semibold text-fg-strong",
  "transition-colors duration-[var(--dur-fast)] ease-standard",
  "outline-none focus:border-action",
);

const LABEL = "text-caption font-bold text-fg-secondary";

/** 저장·삭제 실패를 한 줄로. 원인이 빠지면 사용자가 할 수 있는 일이 없다 */
function actionErrorMessage(error: unknown, what: string): string {
  const { message } = (error ?? {}) as { message?: string };
  return message ? `${what}하지 못했습니다 (${message})` : `${what}하지 못했습니다`;
}

export function EntryForm({
  title,
  backHref,
  initial,
  onSubmit,
  onDelete,
  submitting = false,
  defaultDate,
}: EntryFormProps) {
  const [kind, setKind] = React.useState<EntryKind>(initial?.kind ?? "expense");
  const [date, setDate] = React.useState(initial?.date ?? defaultDate);
  const [amount, setAmount] = React.useState<number | "">(initial?.amount ?? "");
  const [category, setCategory] = React.useState<LedgerCategory>(
    initial?.category ?? "qualified",
  );
  const [evidence, setEvidence] = React.useState<EvidenceType>(
    initial?.evidence ?? "card",
  );
  const [autoForced, setAutoForced] = React.useState(initial?.autoForced ?? false);
  const [merchant, setMerchant] = React.useState(initial?.merchant ?? "");
  const [memo, setMemo] = React.useState(initial?.memo ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  const expense = kind === "expense";

  function changeKind(next: EntryKind) {
    if (next === kind) return;
    setKind(next);
    // 항목 집합이 서로 다르다. 지출 항목이 수입 행에 남으면 집계가 어긋난다
    setCategory(next === "income" ? "sales" : "qualified");
    setEvidence("card");
    setAutoForced(false);
  }

  function changeEvidence(next: EvidenceType) {
    setEvidence(next);
    // 간이영수증·무증빙 → 불공제 자동 전환. 되돌리기는 우리가 바꾼 것만 (model.ts)
    const applied = applyEvidenceChange({ category }, next, autoForced);
    setCategory(applied.category);
    setAutoForced(applied.autoForced);
  }

  function changeCategory(next: LedgerCategory) {
    setCategory(next);
    // 사용자가 직접 고른 항목은 증빙을 바꿔도 되돌리지 않는다
    setAutoForced(false);
  }

  const valid = amount !== "" && amount > 0 && date !== "";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || submitting) return;
    setError(null);
    try {
      await onSubmit({
        kind,
        date,
        amount: Number(amount),
        category,
        evidence: expense ? evidence : null,
        merchant: merchant.trim(),
        memo: memo.trim(),
        autoForced,
      });
    } catch (err) {
      setError(actionErrorMessage(err, "저장"));
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setConfirmingDelete(false);
      setError(actionErrorMessage(err, "삭제"));
    }
  }

  return (
    <AppShell
      title={title}
      back={backHref}
      hideTabs
      footer={
        <div className="grid gap-1.5">
          {error && (
            <p
              role="alert"
              className="px-0.5 text-caption leading-normal font-semibold text-danger-fg"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            form={FORM_ID}
            size="xl"
            fullWidth
            disabled={!valid || submitting}
          >
            {submitting ? "저장 중…" : "저장"}
          </Button>

          {onDelete && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="md"
                fullWidth
                disabled={submitting}
                aria-describedby={confirmingDelete ? DELETE_HINT_ID : undefined}
                onClick={handleDelete}
                className="text-danger-fg hover:bg-danger-bg"
              >
                삭제
              </Button>
              {/* 확인은 아래 한 줄로 묻는다. 버튼 라벨이 통째로 바뀌면 방금
                  무엇을 눌렀는지 잃고, 같은 자리에서 다른 것을 누르게 된다 */}
              {confirmingDelete && (
                <p
                  id={DELETE_HINT_ID}
                  className="text-center text-caption text-danger-fg"
                >
                  정말 삭제할까요? 다시 누르면 삭제됩니다
                </p>
              )}
            </>
          )}
        </div>
      }
    >
      {/* display: contents — 폼이 셸 본문 그리드의 간격을 그대로 물려받는다 */}
      <form id={FORM_ID} onSubmit={handleSubmit} className="contents">
        <SegmentedToggle
          label="수입 / 지출"
          size="md"
          value={kind}
          onChange={changeKind}
          options={[
            { value: "income", label: "수입" },
            { value: "expense", label: "지출" },
          ]}
        />

        <Card className="grid gap-4">
          <Field id="entry-date" label="날짜">
            <input
              id="entry-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={cn(FIELD, "num")}
            />
          </Field>

          <Field id="entry-amount" label="금액">
            <MoneyInput
              id="entry-amount"
              value={amount}
              onChange={setAmount}
              hint="VAT 포함 금액을 그대로 넣으세요"
            />
          </Field>

          <Field
            id="entry-category"
            label="항목"
            badge={
              autoForced ? (
                <Badge tone="amber" title="증빙 때문에 자동으로 불공제로 바꿨습니다">
                  자동
                </Badge>
              ) : undefined
            }
          >
            <select
              id="entry-category"
              value={category}
              onChange={(e) => changeCategory(e.target.value as LedgerCategory)}
              className={FIELD}
            >
              {(expense ? EXPENSE_OPTIONS : INCOME_OPTIONS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          {/* 증빙은 지출만. 수입에는 매입세액이 없어 물어볼 것이 없다 */}
          {expense && (
            <Field id="entry-evidence" label="증빙">
              <select
                id="entry-evidence"
                value={evidence}
                onChange={(e) => changeEvidence(e.target.value as EvidenceType)}
                className={FIELD}
              >
                {EVIDENCE_OPTIONS.map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {autoForced && (
            <p className="-mt-2.5 text-caption leading-normal text-warn-fg">
              {EVIDENCE_TYPES[evidence].label}은 적격증빙이 아니어서 항목이 불공제로
              바뀌었습니다. 직접 다시 고를 수 있습니다.
            </p>
          )}

          <Field id="entry-merchant" label="거래처" optional>
            <input
              id="entry-merchant"
              type="text"
              autoComplete="off"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="예: 한국팜텍"
              className={cn(FIELD, "placeholder:font-normal placeholder:text-fg-faint")}
            />
          </Field>

          <Field id="entry-memo" label="메모" optional>
            <input
              id="entry-memo"
              type="text"
              autoComplete="off"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 8월 정산분"
              className={cn(FIELD, "placeholder:font-normal placeholder:text-fg-faint")}
            />
          </Field>
        </Card>

        {!valid && (
          <p className="text-center text-caption text-fg-faint">
            금액을 넣으면 저장할 수 있습니다.
          </p>
        )}
      </form>
    </AppShell>
  );
}

/** 라벨 + 컨트롤 한 칸. 배지는 라벨 밖에 둔다 — 접근성 이름에 섞이면 안 된다 */
function Field({
  id,
  label,
  badge,
  optional,
  children,
}: {
  id: string;
  label: string;
  badge?: React.ReactNode;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className={LABEL}>
          {label}
          {optional && <span className="font-medium text-fg-faint"> · 선택</span>}
        </label>
        {badge}
      </div>
      {children}
    </div>
  );
}
