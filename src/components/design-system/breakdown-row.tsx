import { cn } from "@/lib/utils";
import { Money, type MoneyProps } from "./money";

/**
 * BreakdownRow — 계산 내역 한 줄. 라벨 왼쪽, 금액 오른쪽 (CTveiw result/BreakdownRow 포팅)
 *
 * 이 제품 신뢰도의 핵심은 "어떻게 이 숫자가 나왔는지 따라갈 수 있는가"다.
 * 그래서 `sub` 에 산식을 그대로 적을 수 있게 했다 — 예: "120,000,000 ÷ 11".
 * 세무는 블랙박스면 안 된다.
 *
 * `level="total"` 은 소계·합계용으로 위에 구분선이 붙고 굵어진다.
 */
export interface BreakdownRowProps extends Omit<React.ComponentProps<"div">, "role"> {
  label: React.ReactNode;
  /** 산식이나 근거. 숫자가 들어가므로 tabular-nums 로 찍힌다 */
  sub?: React.ReactNode;
  value: number;
  role?: MoneyProps["role"];
  level?: "item" | "total";
  /** 하위 항목 들여쓰기 단계 */
  indent?: number;
}

export function BreakdownRow({
  label,
  sub,
  value,
  role = "out",
  level = "item",
  indent = 0,
  className,
  ...rest
}: BreakdownRowProps) {
  const isTotal = level === "total";

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 pb-[7px]",
        isTotal ? "mt-[5px] border-t border-line-subtle pt-3" : "pt-[7px]",
        className,
      )}
      style={indent > 0 ? { paddingLeft: indent * 14 } : undefined}
      {...rest}
    >
      <div className="min-w-0">
        <p
          className={cn(
            "leading-snug",
            isTotal
              ? "text-body font-bold text-fg-strong"
              : "text-sm font-medium text-fg-default",
          )}
        >
          {indent > 0 && (
            <span aria-hidden="true" className="mr-1 text-fg-faint">
              ↳
            </span>
          )}
          {label}
        </p>
        {sub && (
          <p className="num mt-0.5 text-caption leading-snug text-fg-faint">{sub}</p>
        )}
      </div>

      <Money
        value={value}
        role={role}
        size={isTotal ? "md" : "sm"}
        showUnit={false}
        className="mt-px shrink-0"
      />
    </div>
  );
}
