"use client";

import * as React from "react";

import { Toast } from "@/components/design-system";
import { AppShell } from "@/components/screens/app-shell";
import { PRODUCTS } from "@/config/mock-catalog";
import { cn } from "@/lib/utils";

/**
 * P1 쇼핑 홈 (기능정의 v2 §3) — **목업**
 *
 * 상품도 결제도 아직 없다. 카드를 누르면 토스트 한 줄로만 답한다 — 상세
 * 화면을 흉내 내면 사용자가 살 수 없는 물건을 장바구니까지 끌고 간다.
 *
 * `key={shown}` 은 장식이 아니다. 같은 문구를 다시 띄울 때 토스트를 새로
 * 마운트해 표시 시간을 처음부터 다시 재게 한다.
 */
export default function ShopScreen() {
  const [shown, setShown] = React.useState(0);

  return (
    <AppShell title="쇼핑">
      <div>
        <h2 className="text-h2 font-black tracking-tight text-fg-strong">
          CSO에게 추천하는 상품
        </h2>
        <p className="mt-1.5 text-caption leading-normal text-fg-secondary">
          병원 방문 선물로 자주 나가는 것만 골랐습니다. 증빙은 장부에 바로 붙습니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {PRODUCTS.map((product) => (
          <button
            key={product.name}
            type="button"
            onClick={() => setShown((n) => n + 1)}
            className={cn(
              "flex flex-col rounded-card bg-surface-card p-card text-left shadow-sm",
              "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
            )}
          >
            <span
              aria-hidden="true"
              className="flex aspect-square w-full items-center justify-center rounded-md bg-surface-sunken text-[34px] leading-none"
            >
              {product.emoji}
            </span>
            <span className="mt-2.5 flex-1 text-body leading-snug font-bold text-fg-strong">
              {product.name}
            </span>
            <span className="num mt-1.5 text-body font-black text-fg-strong">
              {product.price}
            </span>
          </button>
        ))}
      </div>

      {shown > 0 && (
        <Toast key={shown} message="준비 중" onDone={() => setShown(0)} />
      )}
    </AppShell>
  );
}
