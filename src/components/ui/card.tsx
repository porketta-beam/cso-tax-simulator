import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Card — 정보 묶음의 기본 단위 (CTveiw core/Card 포팅)
 *
 * 구분은 테두리가 아니라 **elevation** 이 한다. 1px 회색 선을 주 구분선으로
 * 쓰지 말 것. 예외는 tone 이 ok/warn/danger 인 경우로, 이때만 의미를 싣기
 * 위해 색 테두리가 붙는다.
 *
 * tone="ink" 는 결과 화면의 Net Cash 히어로 전용이다. 다른 화면에서
 * 재사용하면 "내게 남는 돈"이라는 의미가 희석된다.
 *
 * shadcn 생성 파일을 디자인 시스템 어휘로 재정의했다. 하위 컴포넌트
 * (CardHeader / CardTitle / …)는 필요할 때 쓰도록 남겨 두되, 이 제품의
 * 카드는 대부분 children 을 직접 담는다.
 */
const cardVariants = cva("", {
  variants: {
    tone: {
      default: "bg-surface-card text-fg-default",
      sunken: "bg-surface-sunken text-fg-default",
      ink: "bg-surface-ink text-fg-on-color",
      ok: "border border-ok-line bg-ok-bg text-ok-fg",
      warn: "border border-warn-line bg-warn-bg text-warn-fg",
      danger: "border border-danger-line bg-danger-bg text-danger-fg",
    },
    elevation: {
      none: "shadow-none",
      sm: "shadow-sm",
      md: "shadow-md",
      lg: "shadow-lg",
      /** Net Cash 히어로 전용 — 민트 기가 도는 발광 */
      net: "shadow-net",
    },
    padded: {
      true: "p-card",
      false: "p-0",
    },
  },
  compoundVariants: [
    // 히어로 카드만 더 큰 곡률을 쓴다
    { tone: "ink", class: "rounded-lg" },
  ],
  defaultVariants: {
    tone: "default",
    elevation: "sm",
    padded: true,
  },
});

function Card({
  className,
  tone,
  elevation,
  padded,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-tone={tone}
      className={cn(
        "rounded-card",
        cardVariants({ tone, elevation, padded }),
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("mb-3 flex items-start gap-2.5", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-h3 leading-snug font-bold text-fg-strong", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-caption leading-normal text-fg-secondary", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn(className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("mt-3 flex items-center", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};
