import { cn } from "@/lib/utils";

/**
 * Chip — 알약 모양의 토글 버튼
 *
 * 결과 화면의 기간 프리셋과 장부의 필터가 같은 문법을 쓴다. 한쪽만 고쳐져
 * 같은 자리의 같은 컨트롤이 다르게 보이는 일이 없도록 한 곳에 둔다.
 *
 * 눌린 상태를 잉크 배경으로만 말하지 않고 `aria-pressed` 로도 말한다 —
 * 색 대비는 화면을 읽어 주는 도구에 전달되지 않는다.
 */
export interface ChipProps extends React.ComponentProps<"button"> {
  active?: boolean;
}

export function Chip({ active = false, className, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "h-8 shrink-0 rounded-pill border px-3 text-caption font-bold",
        "transition-colors duration-[var(--dur-fast)] ease-standard",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
        active
          ? "border-transparent bg-ink-900 text-fg-on-color"
          : "border-line-default bg-surface-card text-fg-default hover:bg-surface-sunken",
        className,
      )}
      {...rest}
    />
  );
}
