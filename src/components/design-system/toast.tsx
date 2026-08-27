"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Toast — 아직 없는 기능을 눌렀을 때 "왜 아무 일도 없는지" 한 줄로 답한다.
 *
 * 라이브러리를 들이지 않는다. 띄우는 자리가 쇼핑 목업 한 곳뿐이라 큐·스택·
 * 되돌리기 액션이 필요해지기 전까지는 `setTimeout` 하나로 충분하다.
 *
 * 사라지는 시점은 부모가 안다 — 스스로 감추면 부모의 상태와 화면이 어긋난다.
 * 등장 모션은 `--dur-base` 를 그대로 쓴다. 모션 축소를 켜면 이 토큰이 0ms 가
 * 되므로 여기서 따로 판정할 것이 없다.
 */
export interface ToastProps {
  message: React.ReactNode;
  /** 표시 시간이 끝났음을 알린다. 부모가 상태를 지운다 */
  onDone: () => void;
  durationMs?: number;
}

export function Toast({ message, onDone, durationMs = 2200 }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(onDone, durationMs);
    return () => clearTimeout(timer);
  }, [onDone, durationMs]);

  return (
    <div
      role="status"
      className={cn(
        // 화면이 아니라 셸(max-w-lg) 기준으로 가운데 — 넓은 화면에서 뷰포트
        // 한복판에 뜨면 방금 누른 카드와 상관없는 자리에 떠 있게 된다
        "pointer-events-none fixed inset-x-0 z-40 mx-auto flex max-w-lg justify-center px-gutter",
        "bottom-[calc(84px+env(safe-area-inset-bottom,0px))]",
        "animate-in fade-in slide-in-from-bottom-2 duration-[var(--dur-base)]",
      )}
    >
      <span className="rounded-pill bg-ink-900 px-[18px] py-[11px] text-sm font-bold text-fg-on-color shadow-lg">
        {message}
      </span>
    </div>
  );
}
