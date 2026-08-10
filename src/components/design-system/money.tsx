import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { formatKRW, won } from "@/lib/tax/money";

/**
 * Money — 이 디자인 시스템에서 가장 중요한 컴포넌트 (CTveiw core/Money 포팅)
 *
 * 금액은 절대 맨 텍스트로 찍지 않는다. 세 가지를 강제하기 위해서다.
 *   1) tabular-nums — 자릿수가 바뀌어도 표에서 세로 정렬이 안 무너진다
 *   2) role 로 색이 결정된다 — 임의 색 금지
 *   3) 3자리 콤마와 부호 표기가 한 곳에서만 처리된다
 *
 * role 은 "돈의 성격"이다:
 *   net      내게 남는 돈 (민트) — 결과 화면 주인공
 *   in       유입 (잉크) — 중립
 *   out      유출 (회색) — 중립
 *   tax      세금 (짙은 회색) — 부정색을 쓰지 않는다. 세금은 사실이지 나쁜 게 아니다
 *   reserve  미리 빼둘 돈 (앰버)
 */
const moneyVariants = cva(
  "num inline-flex items-baseline gap-[3px] leading-tight tabular-nums",
  {
    variants: {
      role: {
        net: "text-money-net",
        in: "text-money-in",
        out: "text-money-out",
        tax: "text-money-tax",
        reserve: "text-money-reserve",
        muted: "text-fg-secondary",
      },
      size: {
        sm: "text-num-sm font-semibold",
        md: "text-num-md font-bold",
        lg: "text-num-lg font-bold tracking-tight",
        hero: "text-num-hero font-black tracking-tight",
      },
      strong: {
        true: "font-black",
        false: "",
      },
    },
    defaultVariants: { role: "in", size: "md", strong: false },
  },
);

/** 단위("원")는 금액보다 한 단계 작게. 크기별 대응표. */
const UNIT_SIZE = {
  sm: "text-caption",
  md: "text-sm",
  lg: "text-body",
  hero: "text-h3",
} as const;

export interface MoneyProps
  extends Omit<React.ComponentProps<"span">, "role">,
    VariantProps<typeof moneyVariants> {
  value: number;
  /** 양수에 + 를 붙인다. 증감 표기용 */
  signed?: boolean;
  unit?: string;
  showUnit?: boolean;
}

export function Money({
  value,
  role,
  size = "md",
  strong,
  signed = false,
  unit = "원",
  showUnit = true,
  className,
  ...rest
}: MoneyProps) {
  const n = won(Number(value) || 0);
  // 음수 부호는 하이픈(-)이 아니라 U+2212 minus 를 쓴다. 숫자와 폭이 맞는다.
  const sign = signed && n > 0 ? "+" : n < 0 ? "−" : "";

  return (
    <span
      className={cn(moneyVariants({ role, size, strong }), className)}
      {...rest}
    >
      {sign}
      {formatKRW(Math.abs(n))}
      {showUnit && (
        <span className={cn(UNIT_SIZE[size ?? "md"], "font-semibold opacity-70")}>
          {unit}
        </span>
      )}
    </span>
  );
}
