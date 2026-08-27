"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * 설정 화면 프리미티브 (4차 시안 · S1 계산 설정 / S2 앱 설정)
 *
 * 두 설정 화면은 저장 모델이 다르다 — 계산 설정은 하단 [저장] 하나로 한꺼번에
 * 커밋하고, 앱 설정은 항목마다 즉시 동작한다. 그래도 **행의 생김새는 같아야**
 * 한다. 같은 "설정"인데 줄 높이와 구분선이 화면마다 다르면 사용자는 둘을 다른
 * 종류의 화면으로 읽는다. 그래서 껍데기만 여기로 모으고 동작은 각 화면에 둔다.
 */

/** 설정 카드 — 제목 한 줄 + 행들. 구분선은 카드 테두리가 아니라 행 사이에만 있다. */
export function SettingGroup({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="px-0.5 pb-[7px] text-caption font-black tracking-tight text-fg-secondary">
        {title}
      </p>
      <Card>
        {/* minmax(0,1fr) — grid 아이템 기본 min-width 가 min-content 라
            줄바꿈 안 되는 값(긴 이메일 등)이 카드를 가로로 밀어낸다 */}
        <div className="grid grid-cols-[minmax(0,1fr)]">{children}</div>
      </Card>
    </div>
  );
}

/**
 * 카드 안 한 줄의 여백·구분선. 첫 줄에는 위 선이 없다.
 *
 * 앱 설정의 "비밀번호 변경" 블록처럼 라벨-값 구조가 아닌 행도 같은 리듬을
 * 따라야 해서 클래스로 내보낸다.
 */
export const SETTING_ROW = "border-t border-line-subtle pt-3.5 first:border-t-0 first:pt-0";

export function SettingRow({
  label,
  help,
  disabled,
  children,
}: {
  label: React.ReactNode;
  help?: React.ReactNode;
  /** 지금 쓸 수 없는 항목 — 값은 보이되 만질 수 없음을 흐리기로 알린다 */
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        SETTING_ROW,
        "grid grid-cols-[minmax(0,1fr)] gap-[9px] pb-3.5",
        disabled && "opacity-45",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <p className="min-w-0 flex-1 text-body font-bold text-fg-strong">{label}</p>
        {children}
      </div>
      {help && <p className="text-caption leading-normal text-fg-faint">{help}</p>}
    </div>
  );
}

/**
 * 숫자 스테퍼 − n +. 부양가족 수처럼 0~몇 명 범위에만 쓴다.
 *
 * 키보드 입력을 없애는 게 목적이다 — 범위가 좁은 값에 숫자 키패드를 띄우면
 * 오타로 "20명"이 들어가고, 그 값이 그대로 과세표준을 깎는다.
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max,
  disabled,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  /** 보조기술이 읽을 이름 — 버튼 라벨에 붙는다 ("부양가족 수 늘리기") */
  label: string;
}) {
  const step = (next: number, off: boolean, name: string, sign: string) => (
    <button
      type="button"
      aria-label={`${label} ${name}`}
      disabled={disabled || off}
      onClick={() => onChange(next)}
      className={cn(
        "inline-flex size-[38px] shrink-0 items-center justify-center rounded-md",
        "border border-line-default bg-surface-card",
        "text-[18px] leading-none font-bold text-fg-default",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus-ring)]",
        "disabled:cursor-default disabled:opacity-40",
      )}
    >
      {sign}
    </button>
  );

  return (
    <div className="flex shrink-0 items-center gap-2">
      {step(value - 1, value <= min, "줄이기", "−")}
      <span className="num min-w-[26px] text-center text-body font-black text-fg-strong">
        {value}
      </span>
      {step(value + 1, max != null && value >= max, "늘리기", "+")}
    </div>
  );
}

/** 켜고 끄는 스위치. 아직 동작하지 않는 항목에는 disabled 로 둔다. */
export function Toggle({
  on,
  onChange,
  disabled,
  label,
}: {
  on: boolean;
  onChange?: (on: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={cn(
        "flex h-[30px] w-[50px] shrink-0 items-center rounded-pill p-[3px]",
        "transition-colors duration-[var(--dur-fast)] ease-standard",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
        "disabled:cursor-default disabled:opacity-50",
        on ? "bg-action" : "bg-ink-200",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-6 rounded-pill bg-ink-0 shadow-sm",
          "transition-transform duration-[var(--dur-fast)] ease-standard",
          on ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

/** 바꿀 수 없는 값 — 세율표 기준일, 앱 버전, 이메일. */
export function ReadOnlyValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="num min-w-0 text-right text-body font-semibold break-all text-fg-secondary">
      {children}
    </span>
  );
}
