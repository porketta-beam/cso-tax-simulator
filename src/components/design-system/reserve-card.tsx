import { cn } from "@/lib/utils";
import type { ReserveItem } from "@/lib/tax/types";
import { Icon } from "./icon";
import { Money } from "./money";

/**
 * ReserveCard — "신고 시점에 미리 빼둘 돈" (CTveiw result/ReserveCard 포팅)
 *
 * 이 제품이 실제로 해결하는 문제는 계산이 아니라 세금 폭탄이다. Net Cash
 * 다음으로 중요한 카드이므로 앰버로 독립된 존재감을 준다.
 * 앰버는 이 카드와 경고 배너 외에는 쓰지 않는다.
 */
export interface ReserveCardProps extends React.ComponentProps<"div"> {
  items: readonly ReserveItem[];
  total: number;
  caption?: React.ReactNode;
}

export function ReserveCard({
  items,
  total,
  caption = "신고 시점에 미리 빼두면 세금 폭탄을 피할 수 있습니다",
  className,
  ...rest
}: ReserveCardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-warn-line bg-warn-bg p-card",
        className,
      )}
      {...rest}
    >
      <div className="mb-[3px] flex items-center gap-[7px]">
        <Icon name="piggy-bank" size={18} className="text-warn-fg" />
        <h3 className="text-h3 font-bold text-[var(--amber-900)]">
          가상 통장 적립금 제안
        </h3>
      </div>
      <p className="text-caption leading-normal text-warn-fg">{caption}</p>

      <div className="mt-3.5">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex items-center justify-between gap-3 py-1.5"
          >
            <span className="text-sm text-[var(--amber-900)]">{it.label}</span>
            <Money value={it.amount} role="reserve" size="sm" showUnit={false} />
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 border-t border-warn-line pt-3">
        <span className="text-body font-bold text-[var(--amber-900)]">
          적립 권장 합계
        </span>
        <Money value={total} role="reserve" size="lg" />
      </div>
    </div>
  );
}
