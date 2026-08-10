import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Badge — 상태 표시 알약 (CTveiw core/Badge 포팅)
 *
 * 이 제품에서 배지는 대부분 "이 지출이 공제되는가"를 말한다.
 *   mint  공제 가능 (적격증빙)
 *   red   불공제
 *   amber 확인 필요
 *
 * 장식으로 쓰지 말 것 — 배지가 붙어 있으면 사용자는 판정 결과로 읽는다.
 */
const badgeVariants = cva(
  [
    "inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-pill px-2.5",
    "text-micro leading-none font-bold",
    "[&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0",
  ],
  {
    variants: {
      tone: {
        neutral: "",
        mint: "",
        amber: "",
        red: "",
        blue: "",
      },
      variant: {
        soft: "",
        solid: "text-fg-on-color",
      },
    },
    compoundVariants: [
      { tone: "neutral", variant: "soft", class: "bg-ink-100 text-fg-default" },
      { tone: "neutral", variant: "solid", class: "bg-ink-700" },
      { tone: "mint", variant: "soft", class: "bg-ok-bg text-ok-fg" },
      { tone: "mint", variant: "solid", class: "bg-[var(--mint-600)]" },
      { tone: "amber", variant: "soft", class: "bg-warn-bg text-warn-fg" },
      { tone: "amber", variant: "solid", class: "bg-[var(--amber-600)]" },
      { tone: "red", variant: "soft", class: "bg-danger-bg text-danger-fg" },
      { tone: "red", variant: "solid", class: "bg-[var(--red-600)]" },
      { tone: "blue", variant: "soft", class: "bg-action-soft text-[var(--blue-700)]" },
      { tone: "blue", variant: "solid", class: "bg-action" },
    ],
    defaultVariants: {
      tone: "neutral",
      variant: "soft",
    },
  },
);

function Badge({
  className,
  tone,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ tone, variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
