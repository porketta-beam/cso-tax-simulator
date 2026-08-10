"use client";

import { RadioGroup } from "radix-ui";

import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

/**
 * SegmentedToggle — 배타 선택 (CTveiw form/SegmentedToggle 포팅)
 *
 * 드롭다운을 쓰지 않는 이유: 선택지가 2~4개고 각 선택이 계산 결과를 크게
 * 바꾸기 때문에, 무엇을 고를 수 있는지 항상 보여야 한다. 선택지가 5개를
 * 넘으면 이 컴포넌트를 쓰지 말고 목록 화면으로 뺄 것.
 *
 * 원본은 role="tablist" 로 마크업했지만 여기서는 Radix **RadioGroup** 을 쓴다.
 * 탭은 패널이 딸린 구조를 뜻하는데 이 컨트롤에는 패널이 없다. 보조기술에는
 * "여러 개 중 하나를 고르는 라디오"가 정확한 설명이고, 좌우 방향키 이동도
 * 공짜로 따라온다.
 */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export interface SegmentedToggleProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  /** 시각적 라벨이 없을 때 보조기술에 읽힐 이름 */
  label?: string;
  className?: string;
}

const SIZE = {
  sm: "h-[38px] text-caption",
  md: "h-tap-min text-sm",
  lg: "h-tap-comfort text-body",
} as const;

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  fullWidth = true,
  label,
  className,
}: SegmentedToggleProps<T>) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(next) => onChange(next as T)}
      aria-label={label}
      orientation="horizontal"
      loop
      className={cn(
        "flex gap-1 rounded-md bg-surface-sunken p-1",
        fullWidth ? "w-full" : "w-auto",
        className,
      )}
    >
      {options.map((opt) => (
        <RadioGroup.Item
          key={opt.value}
          value={opt.value}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-sm px-3 whitespace-nowrap",
            "transition-colors duration-[var(--dur-fast)] ease-standard",
            "outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus-ring)]",
            SIZE[size],
            fullWidth ? "flex-1" : "shrink-0",
            "text-fg-secondary font-medium",
            "data-[state=checked]:bg-surface-card data-[state=checked]:font-bold",
            "data-[state=checked]:text-fg-strong data-[state=checked]:shadow-sm",
          )}
        >
          {opt.icon && <Icon name={opt.icon} size={15} />}
          {opt.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
