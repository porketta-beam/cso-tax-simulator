"use client";

import { Card, Chip } from "@/components/design-system";
import {
  annualizationFactor,
  annualizationLabel,
  presetRange,
  type DateRange,
  type RangePreset,
} from "@/lib/ledger/range";
import { cn } from "@/lib/utils";

/**
 * 조회 기간 고르기 (v2 §3 T2)
 *
 * 자유 범위가 원칙이고 프리셋 칩은 그 범위를 대신 채워 주는 편의다. 그래서
 * 칩에는 자체 상태가 없다 — **지금 범위가 그 프리셋과 같은가**로 눌린 칩을
 * 판정한다. 칩을 눌러 얻은 상태를 따로 들고 있으면, 날짜를 손으로 고친 뒤에도
 * 칩이 눌린 채로 남아 화면이 거짓말을 한다.
 *
 * 오늘 날짜는 인자로 받는다. 컴포넌트가 시계를 읽으면 테스트가 오늘에 흔들린다.
 */
const PRESETS = [
  { value: "thisMonth", label: "이번 달" },
  { value: "lastMonth", label: "지난 달" },
  { value: "thisQuarter", label: "이번 분기" },
  { value: "thisYear", label: "올해" },
] as const satisfies readonly { value: RangePreset; label: string }[];

/** 시작일이 종료일보다 늦으면 조회할 기간이 아니다. 화면과 여기가 같은 판정을 쓴다 */
export function rangeIsValid(range: DateRange): boolean {
  return range.from <= range.to;
}

export interface RangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** 프리셋 기준일 */
  today?: Date;
  className?: string;
}

const DATE_INPUT = cn(
  "num h-tap-min w-full rounded-sm border border-line-default bg-surface-card px-2.5",
  "text-body font-semibold text-fg-strong",
  "outline-none focus-visible:border-action focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus-ring)]",
);

export function RangePicker({
  value,
  onChange,
  today = new Date(),
  className,
}: RangePickerProps) {
  const valid = rangeIsValid(value);
  const annualized = valid && annualizationFactor(value) !== 1;

  return (
    <Card className={className}>
      <div className="flex items-end gap-2.5">
        <DateField
          label="시작일"
          value={value.from}
          onChange={(from) => onChange({ ...value, from })}
        />
        <span aria-hidden="true" className="pb-3 text-fg-faint">
          –
        </span>
        <DateField
          label="종료일"
          value={value.to}
          onChange={(to) => onChange({ ...value, to })}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const range = presetRange(preset.value, today);
          const active = range.from === value.from && range.to === value.to;
          return (
            <Chip key={preset.value} active={active} onClick={() => onChange(range)}>
              {preset.label}
            </Chip>
          );
        })}
      </div>

      {!valid && (
        <p role="alert" className="mt-3 text-caption leading-normal text-danger-fg">
          시작일이 종료일보다 늦습니다. 날짜를 다시 골라 주세요.
        </p>
      )}

      {annualized && (
        <p className="mt-3 text-caption leading-normal text-warn-fg">
          {annualizationLabel(value)}입니다. 누진세율은 연 단위라, 이 기간 금액을
          1년치로 환산해 세율을 적용한 뒤 다시 기간분으로 나눠 보여드립니다.
        </p>
      )}
    </Card>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-1.5 block text-micro text-fg-faint">{label}</span>
      <input
        type="date"
        value={value}
        // 달력에서 지우면 빈 문자열이 온다. 빈 기간으로 조회할 수는 없으니 무시한다
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className={DATE_INPUT}
      />
    </label>
  );
}
