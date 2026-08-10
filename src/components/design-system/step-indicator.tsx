import { cn } from "@/lib/utils";

/**
 * StepIndicator — 5스텝 위저드의 현재 위치 (CTveiw form/StepIndicator 포팅)
 *
 * 목업은 좌측에 세로 사이드바로 파이프라인을 그렸지만 모바일에는 그럴 공간이
 * 없다. 상단 한 줄로 압축한다: 진행 막대 + "2 / 5" + 현재 단계 이름.
 * 사용자가 알아야 하는 건 "얼마나 남았나" 하나뿐이다.
 */
export interface StepIndicatorProps extends React.ComponentProps<"div"> {
  steps: readonly string[];
  current: number;
}

export function StepIndicator({
  steps,
  current,
  className,
  ...rest
}: StepIndicatorProps) {
  const total = steps.length || 1;
  const label = steps[current] ?? "";

  return (
    <div
      className={cn("w-full", className)}
      role="group"
      aria-label={`${total}단계 중 ${current + 1}단계: ${label}`}
      {...rest}
    >
      <div className="mb-2.5 flex gap-1" aria-hidden="true">
        {steps.map((step, i) => (
          <div
            key={step}
            className={cn(
              "h-1 flex-1 rounded-pill transition-colors duration-[var(--dur-base)] ease-standard",
              i < current
                ? "bg-[var(--mint-500)]"
                : i === current
                  ? "bg-action"
                  : "bg-ink-200",
            )}
          />
        ))}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="num text-caption font-bold tracking-wide text-action tabular-nums">
          {current + 1} / {total}
        </span>
        <span className="text-sm font-semibold text-fg-secondary">{label}</span>
      </div>
    </div>
  );
}
