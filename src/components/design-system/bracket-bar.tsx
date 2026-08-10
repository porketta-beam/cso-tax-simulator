"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import type { IncomeTaxBracket } from "@/config/tax-rates";

/**
 * BracketBar — 종합소득세 누진 구간에서 내가 어디에 있는지 (CTveiw result/BracketBar 포팅)
 *
 * 현행 세법은 8구간이다. 모바일에 8개를 한 줄로 욱여넣으면 아무것도 안
 * 읽히므로 가로 스크롤 칩으로 두고 적용 구간만 크게 강조한다. 진입 시 활성
 * 칩이 화면에 보이도록 자동 스크롤한다.
 *
 * `note` 에는 연환산 사실을 반드시 적는다. 분기 입력에 연간 세율표를 그대로
 * 적용하면 세금이 크게 과소평가되는데, 사용자는 그 차이를 알 방법이 없다.
 */
export interface BracketBarProps extends React.ComponentProps<"div"> {
  brackets: readonly IncomeTaxBracket[];
  activeIndex: number;
  note?: React.ReactNode;
}

export function BracketBar({
  brackets,
  activeIndex,
  note,
  className,
  ...rest
}: BracketBarProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const activeRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = activeRef.current;
    const box = scrollRef.current;
    if (!el || !box) return;
    box.scrollLeft = Math.max(
      0,
      el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2,
    );
  }, [activeIndex]);

  return (
    <div className={cn("w-full", className)} {...rest}>
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {brackets.map((b, i) => {
          const active = i === activeIndex;
          return (
            <div
              key={b.label}
              ref={active ? activeRef : null}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex shrink-0 flex-col items-center gap-[3px] rounded-sm",
                "transition-all duration-[var(--dur-base)] ease-standard",
                active
                  ? "min-w-[76px] bg-ink-900 px-3 py-2.5 text-fg-on-color"
                  : "min-w-[56px] bg-surface-sunken px-2.5 py-2 text-fg-secondary",
              )}
            >
              <span
                className={cn(
                  "num leading-none font-black",
                  active
                    ? "text-h3 text-[var(--mint-500)]"
                    : "text-sm text-fg-secondary",
                )}
              >
                {Math.round(b.rate * 100)}%
              </span>
              <span className="text-micro whitespace-nowrap opacity-85">{b.label}</span>
            </div>
          );
        })}
      </div>

      {note && (
        <p className="mt-2.5 rounded-sm border border-warn-line bg-warn-bg px-2.5 py-2 text-caption leading-normal text-warn-fg">
          {note}
        </p>
      )}
    </div>
  );
}
