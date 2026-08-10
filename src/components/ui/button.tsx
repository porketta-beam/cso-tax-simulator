import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Button — 조작 프리미티브 (CTveiw core/Button 포팅)
 *
 * shadcn 이 생성한 파일을 디자인 시스템 어휘로 재정의했다. shadcn 은
 * "복사해서 소유하는" 모델이므로 이 파일은 우리 코드다. 다만
 * `shadcn add button` 을 다시 돌리면 덮어써지니 주의.
 *
 * 세무 제품이라 버튼은 조용하다. 강조는 크기와 대비로만 만들고 색은 블루
 * 하나만 쓴다. 금액 색(민트·앰버)을 버튼에 쓰지 말 것 — 그 색들은 "돈의
 * 성격"을 뜻하므로 조작에 쓰면 의미가 무너진다.
 *
 * 화면 주 CTA 는 `size="xl" fullWidth` 가 기본이다.
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap",
    "border border-transparent font-bold select-none",
    "transition-[filter,transform,background-color] duration-[var(--dur-fast)] ease-standard",
    // 누를 때 살짝 눌리는 정도만. 스프링·바운스 없음.
    "active:scale-[0.98]",
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-action text-action-fg hover:brightness-95 active:bg-action-press",
        secondary: "bg-ink-100 text-fg-strong hover:brightness-95",
        outline: "border-line-default bg-surface-card text-fg-strong hover:bg-surface-sunken",
        ghost: "bg-transparent text-fg-link hover:bg-action-soft",
        ink: "bg-ink-900 text-fg-on-color hover:brightness-125",
      },
      size: {
        sm: "h-[38px] rounded-sm px-3.5 text-sm [&_svg]:size-4",
        md: "h-tap-min rounded-sm px-[18px] text-body [&_svg]:size-[18px]",
        lg: "h-tap-comfort rounded-md px-[22px] text-lg [&_svg]:size-5",
        xl: "h-tap-large rounded-md px-[26px] text-lg [&_svg]:size-[22px]",
        /* 아이콘 전용 — 시트 닫기처럼 라벨을 붙일 수 없는 자리에만 쓴다.
           디자인 시스템의 탭 타깃 하한 44px 을 지키려면 `icon` 을 쓸 것.
           `icon-sm` 은 시트/다이얼로그 모서리처럼 오조작 위험이 낮고 다른
           조작과 겹치지 않는 자리에 한해 허용한다. */
        icon: "size-tap-min rounded-sm [&_svg]:size-5",
        "icon-sm": "size-9 rounded-sm [&_svg]:size-4",
      },
      fullWidth: {
        true: "w-full",
        false: "w-auto",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "lg",
      fullWidth: false,
    },
  },
);

function Button({
  className,
  variant,
  size,
  fullWidth,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, fullWidth, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
