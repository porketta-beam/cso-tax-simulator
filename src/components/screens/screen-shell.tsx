"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Icon, StepIndicator } from "@/components/design-system";
import { useSimulator } from "@/state/simulator-context";

/** 5스텝 위저드의 단계 이름 (PRD §6.1 — 좌측 사이드바를 상단 한 줄로 압축) */
export const STEPS = [
  "매출·증빙",
  "인건비·고정비",
  "과세표준",
  "세율·보험",
  "결과",
] as const;

/**
 * ScreenShell — 모든 화면의 공통 뼈대
 *
 *   헤더(제목 + 뒤로 + 스텝) / 스크롤 본문 / 하단 고정 CTA
 *
 * 모바일 우선이다. 하단 CTA 는 sticky 로 붙고 safe-area 를 먹는다. 데스크톱
 * 에서는 본문을 가운데 정렬해 폭만 제한한다 — PRD §6.1 의 태블릿 2열·데스크톱
 * 사이드바 복원은 아직 구현하지 않았다.
 */
export interface ScreenShellProps {
  title: React.ReactNode;
  /** 0-based. 없으면 스텝 인디케이터를 숨긴다 */
  stepIndex?: number;
  backHref?: string;
  banner?: React.ReactNode;
  children: React.ReactNode;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
}

export function ScreenShell({
  title,
  stepIndex,
  backHref,
  banner,
  children,
  primary,
  secondary,
}: ScreenShellProps) {
  const router = useRouter();
  const { state } = useSimulator();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-surface-app">
      <header className="sticky top-0 z-10 shrink-0 border-b border-line-subtle bg-surface-card">
        <div className="px-gutter pt-1.5 pb-3.5">
          <div className="mb-3 flex items-center gap-2">
            {backHref && (
              <button
                type="button"
                onClick={() => router.push(backHref)}
                aria-label="이전 화면으로"
                className={cn(
                  "-ml-1 inline-flex size-8 shrink-0 items-center justify-center rounded-sm",
                  "text-fg-strong hover:bg-surface-sunken",
                  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                )}
              >
                <Icon name="chevron-left" size={22} />
              </button>
            )}
            <h1 className="text-h2 font-black tracking-tight text-fg-strong">{title}</h1>
          </div>
          {stepIndex != null && <StepIndicator steps={STEPS} current={stepIndex} />}
        </div>
        {/* 법인 로직이 없는 동안 어느 화면에서도 숫자를 법인 기준으로 읽지 않도록 */}
        {state.businessType === "corporate" && (
          <p
            role="status"
            className="border-t border-warn-line bg-warn-bg px-gutter py-1.5 text-center text-caption font-bold text-warn-fg"
          >
            법인 로직 준비 중 · 개인사업자 기준 추정치
          </p>
        )}
      </header>

      {/* grid-cols-[minmax(0,1fr)] 은 장식이 아니다. grid 아이템의 기본
          min-width 는 auto(=min-content) 라, 카드 안에 가로 스크롤 칩(BracketBar)
          처럼 줄바꿈 안 되는 요소가 있으면 열 너비가 그만큼 밀려 화면 전체가
          가로로 넘친다. 그러면 오른쪽 정렬된 금액이 화면 밖으로 잘려 나간다. */}
      <main className="grid flex-1 content-start gap-3 px-gutter py-4 grid-cols-[minmax(0,1fr)]">
        {banner}
        {children}
        <div className="h-2" />
      </main>

      {(primary || secondary) && (
        <footer
          className={cn(
            "sticky bottom-0 z-10 flex shrink-0 gap-2.5 border-t border-line-subtle",
            "bg-surface-card px-gutter pt-3 pb-[max(22px,env(safe-area-inset-bottom))]",
          )}
        >
          {secondary}
          {primary}
        </footer>
      )}
    </div>
  );
}

/** 자동 계산 미리보기 — 입력 화면 하단의 "지금까지 이렇게 됩니다" */
export function PreviewStrip({
  items,
}: {
  items: readonly { label: string; value: number; accent?: boolean }[];
}) {
  return (
    <div className="flex gap-4 rounded-md bg-ink-900 px-3.5 py-3">
      {items.map((it) => (
        <div key={it.label} className="min-w-0 flex-1">
          <p className="mb-[3px] text-micro text-ink-400">{it.label}</p>
          <span
            className={cn(
              "num text-lg font-bold",
              it.accent ? "text-[var(--mint-500)]" : "text-ink-0",
            )}
          >
            {it.value.toLocaleString("ko-KR")}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 text-micro font-black tracking-wide text-fg-faint">
      {children}
    </p>
  );
}

/** 결과·부록 화면 하단의 법적 고지 (PRD §10 — 필수) */
export function LegalNotice() {
  return (
    <p className="px-2 py-1 text-center text-micro leading-body text-fg-faint">
      본 계산 결과는 시뮬레이션 예시이며 실제 신고·세무 자문이 아닙니다. 소득공제·
      세액공제·감면·중간예납 등이 반영되지 않아 실제 납부세액과 다를 수 있습니다.
      계산 기준은 이 앱이 정한 것이며, 실제 적용 여부의 판단과 책임은 사용자 본인에게
      있습니다. 정확한 신고는 세무사와 협업하세요.
    </p>
  );
}

/** 다른 화면으로 넘어가는 카드형 링크 */
export function NavCard({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-card bg-surface-card px-card py-3.5 shadow-sm",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
      )}
    >
      <span className="flex items-center gap-2.5">
        <Icon name={icon} size={18} className="text-fg-default" />
        <span className="text-sm font-bold text-fg-strong">{label}</span>
      </span>
      <Icon name="chevron-right" size={18} className="text-fg-faint" />
    </Link>
  );
}
