"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * MoneyInput — 금액 입력 필드 (CTveiw form/MoneyInput 포팅)
 *
 * 이 제품 입력의 90% 가 금액이라 이 컴포넌트 하나가 입력 경험을 결정한다.
 * 강제하는 것:
 *   · inputMode="numeric" — 모바일에서 숫자 키패드가 바로 뜬다
 *   · 입력 중 실시간 3자리 콤마 — 0 이 몇 개인지 세지 않아도 된다
 *   · tabular-nums — 타이핑 중 숫자가 좌우로 흔들리지 않는다
 *   · 우측 단위 고정 — "원" 을 사용자가 타이핑하지 않는다
 *
 * `hint` 에는 VAT 역산 결과 같은 즉시 피드백을 넣는다. 입력과 동시에 계산이
 * 보이는 것이 이 제품의 핵심 경험이다.
 *
 * shadcn Input 을 쓰지 않은 이유: 우측 정렬 + 고정 단위 + 콤마 포매팅 때문에
 * 래퍼가 입력의 테두리·포커스 상태를 소유해야 하는데, shadcn Input 은 그
 * 역할을 자기가 갖는다. 겹쳐 쓰면 테두리가 두 겹이 된다.
 */
const HINT_TONE = {
  muted: "text-fg-secondary",
  ok: "text-ok-fg",
  warn: "text-warn-fg",
  danger: "text-danger-fg",
} as const;

export interface MoneyInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: number | "";
  onChange?: (value: number | "") => void;
  unit?: string;
  hint?: React.ReactNode;
  hintTone?: keyof typeof HINT_TONE;
  error?: React.ReactNode;
  /** 라벨을 시각적으로 두지 않는 자리에 쓸 접근성 이름 */
  "aria-label"?: string;
}

export function MoneyInput({
  value,
  onChange,
  placeholder = "0",
  unit = "원",
  hint,
  hintTone = "muted",
  error,
  disabled = false,
  className,
  ...rest
}: MoneyInputProps) {
  const [focused, setFocused] = React.useState(false);

  const display =
    value === "" || value === null || value === undefined
      ? ""
      : Number(value).toLocaleString("ko-KR");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/[^\d]/g, "");
    onChange?.(digits === "" ? "" : Number(digits));
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "flex h-tap-field items-center gap-2 rounded-md border-2 px-3.5",
          "transition-colors duration-[var(--dur-fast)] ease-standard",
          disabled ? "bg-surface-sunken" : "bg-surface-card",
          error
            ? "border-danger-fg"
            : focused
              ? "border-action"
              : "border-line-subtle",
        )}
      >
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={display}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          className={cn(
            "num min-w-0 flex-1 border-none bg-transparent p-0 text-right outline-none",
            "text-num-lg font-bold tracking-tight text-fg-strong tabular-nums",
            "placeholder:text-fg-faint",
          )}
          {...rest}
        />
        <span className="shrink-0 text-body font-semibold text-fg-secondary">
          {unit}
        </span>
      </div>

      {(hint || error) && (
        <p
          className={cn(
            "mx-0.5 mt-2 text-caption leading-normal",
            error ? HINT_TONE.danger : HINT_TONE[hintTone],
          )}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
