"use client";

import * as React from "react";

import { Button, Card } from "@/components/design-system";
import { AppShell } from "@/components/screens/app-shell";
import { PRODUCTS } from "@/config/mock-catalog";

/**
 * P1 쇼핑 홈 (기능정의 v2 §3) — **목업**
 *
 * 상품도 결제도 아직 없다. "자세히"는 카드 아래 한 줄로만 답한다 — 토스트
 * 라이브러리를 들이면 이 화면 하나 때문에 앱 전체에 의존성이 붙는다.
 */
export default function ShopScreen() {
  const [opened, setOpened] = React.useState<string | null>(null);

  return (
    <AppShell title="쇼핑">
      <p className="text-caption leading-body text-fg-secondary">
        CSO 업무에 필요한 상품을 모았습니다. 지금은 목록만 보여 주며, 제휴와 결제는
        준비 중입니다.
      </p>

      {PRODUCTS.map((product) => (
        <Card key={product.name}>
          <div className="flex items-start gap-3.5">
            <span aria-hidden="true" className="text-[26px] leading-none">
              {product.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-body font-bold text-fg-strong">{product.name}</p>
              <p className="mt-1 text-caption leading-normal text-fg-secondary">
                {product.desc}
              </p>
              <p className="num mt-2 text-sm font-bold text-fg-default">
                {product.price}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpened(product.name)}
            >
              자세히
            </Button>
          </div>

          {opened === product.name && (
            <p
              role="status"
              className="mt-3 text-caption leading-normal font-bold text-fg-secondary"
            >
              준비 중인 기능입니다
            </p>
          )}
        </Card>
      ))}
    </AppShell>
  );
}
