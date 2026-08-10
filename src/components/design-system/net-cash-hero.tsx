"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { formatKRW } from "@/lib/tax/money";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { Money } from "./money";

/**
 * NetCashHero — 결과 화면의 주인공 (CTveiw result/NetCashHero 포팅)
 *
 * 제품 전체에서 가장 큰 글자. 잉크 네이비 바탕에 민트 금액. 이 조합은 이
 * 카드 한 곳에서만 쓴다. 다른 화면에서 재사용하면 "내게 남는 돈"이라는
 * 의미가 희석된다.
 *
 * 카운트업은 장식이 아니라 "계산이 실제로 일어났다"는 신호다. 모션 정책의
 * 유일한 예외이며, prefers-reduced-motion 에서는 즉시 최종값을 찍는다.
 */
export interface NetCashHeroProps extends React.ComponentProps<"div"> {
  value: number;
  period?: string;
  /** "19.4" 형태의 문자열. 계산은 엔진이 한다 */
  marginRate?: string;
  totalRevenue?: number;
  animate?: boolean;
}

const COUNT_UP_MS = 900;

export function NetCashHero({
  value,
  period,
  marginRate,
  totalRevenue,
  animate = true,
  className,
  ...rest
}: NetCashHeroProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [counted, setCounted] = React.useState(0);

  // 카운트업을 하지 않는 경우에는 상태를 거치지 않고 최종값을 바로 그린다.
  // 이렇게 두면 모션 축소 설정에서 0 이 한 프레임 새어 나가지 않는다.
  const running = animate && !reducedMotion;
  const shown = running ? counted : value;

  React.useEffect(() => {
    if (!running) return;

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_UP_MS);
      // ease-out — 끝에서 부드럽게 멈춘다
      const eased = 1 - Math.pow(1 - t, 3);
      setCounted(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, running]);

  return (
    <div
      className={cn(
        "rounded-lg bg-surface-ink px-card pt-[22px] pb-5 text-fg-on-color shadow-net",
        className,
      )}
      {...rest}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-micro font-black tracking-wide text-[var(--mint-500)]">
          NET CASH
        </span>
        {period && <span className="text-micro text-ink-400">· {period}</span>}
      </div>

      <p className="mb-2.5 text-caption text-ink-300">
        세금과 비용을 모두 뺀, 내 통장에 남는 돈
      </p>

      {/* 카운트업 중간값이 보조기술에 연속으로 읽히지 않도록 최종값만 노출한다 */}
      <span className="sr-only">{formatKRW(value)}원</span>
      <Money value={shown} role="net" size="hero" aria-hidden="true" />

      {(totalRevenue != null || marginRate != null) && (
        <div className="mt-[18px] flex gap-5 border-t border-white/12 pt-3.5">
          {totalRevenue != null && (
            <div>
              <p className="mb-[3px] text-micro text-ink-400">총 매출</p>
              <span className="num text-body font-bold text-ink-100">
                {formatKRW(totalRevenue)}
              </span>
            </div>
          )}
          {marginRate != null && (
            <div>
              <p className="mb-[3px] text-micro text-ink-400">세후 마진율</p>
              <span className="num text-body font-bold text-[var(--mint-500)]">
                {marginRate}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
