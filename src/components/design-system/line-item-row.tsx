import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Icon } from "./icon";
import { Money } from "./money";

/**
 * LineItemRow — 지출 명세 한 건 (CTveiw ledger/LineItemRow 포팅)
 *
 * 1단계는 CSV 업로드 대신 수동 입력이므로, 한 건을 넣는 마찰이 곧 제품의
 * 이탈률이다. 그래서 표(table)가 아니라 카드형 행으로 만든다. 모바일에서
 * 표는 가로 스크롤을 만들고, 가로 스크롤은 이탈을 만든다.
 *
 * 배지는 판정 결과다:
 *   mint "공제"   적격증빙 + 불공제 구분 아님
 *   red  "불공제" 간이영수증·무증빙·접대비
 */
export interface LineItemRowProps extends React.ComponentProps<"div"> {
  date: string;
  merchant: string;
  amount: number;
  evidence?: string;
  category?: string;
  deductible?: boolean;
  onEdit?: () => void;
}

export function LineItemRow({
  date,
  merchant,
  amount,
  evidence,
  category,
  deductible = true,
  onEdit,
  className,
  ...rest
}: LineItemRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-line-subtle bg-surface-card px-card py-3",
        className,
      )}
      {...rest}
    >
      <div className="min-w-0 flex-1">
        <p className="mb-[3px] truncate text-body font-semibold text-fg-strong">
          {merchant}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="num text-caption text-fg-faint">{date}</span>
          {evidence && (
            <span className="text-caption text-fg-secondary">· {evidence}</span>
          )}
          {category && (
            <span className="text-caption text-fg-secondary">· {category}</span>
          )}
          <Badge tone={deductible ? "mint" : "red"}>
            <Icon name={deductible ? "check" : "x"} size={12} />
            {deductible ? "공제" : "불공제"}
          </Badge>
        </div>
      </div>

      <Money
        value={amount}
        role="out"
        size="sm"
        showUnit={false}
        className="shrink-0"
      />

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`${merchant} 수정`}
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-sm",
            "text-fg-faint hover:bg-surface-sunken",
            "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
          )}
        >
          <Icon name="chevron-right" size={18} />
        </button>
      )}
    </div>
  );
}
