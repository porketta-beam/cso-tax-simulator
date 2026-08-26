import { cn } from "@/lib/utils";
import type { IncomeTaxBracket } from "@/config/tax-rates";

/**
 * BracketBar — 종합소득세 누진 구간에서 내가 어디에 있는지 (CTveiw result/BracketBar 포팅)
 *
 * 현행 세법은 8구간이다. 가로 스크롤 칩으로 두면 폰에서 앞쪽 6%·15% 칩이
 * 잘려 보이는데 사용자는 스크롤된다는 걸 알아채지 못한다. 그래서 줄바꿈으로
 * 8개를 전부 보여 주고(430px 에서 2줄) 적용 구간만 크게 강조한다.
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
  return (
    <div className={cn("w-full min-w-0", className)} {...rest}>
      <div className="flex flex-wrap gap-1.5">
        {brackets.map((b, i) => {
          const active = i === activeIndex;
          return (
            <div
              key={b.label}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex flex-col items-center gap-[3px] rounded-sm",
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
