"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Icon, SegmentedToggle } from "@/components/design-system";
import { AppShell } from "@/components/screens/app-shell";
import { cn } from "@/lib/utils";

/**
 * T0 세무 홈 (기능정의 v2 §3)
 *
 * 장부 | 결과 두 탭만 이 셸을 쓴다. 장부 폼(`/tax/ledger/new`,
 * `/tax/ledger/[id]`)과 설정(`/tax/settings`)은 탭이 아니라 그 위에 얹히는
 * 독립 화면이므로 각자 AppShell 을 그린다 — 여기서는 그대로 통과시킨다.
 * 즉 **탭 페이지는 AppShell 을 직접 쓰지 않는다.**
 */
const TABS = [
  { value: "ledger", label: "장부", href: "/tax/ledger" },
  { value: "result", label: "결과", href: "/tax/result" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function TaxLayout({ children }: LayoutProps<"/tax">) {
  const pathname = usePathname();
  const router = useRouter();

  const tab = TABS.find((t) => t.href === pathname)?.value;
  if (!tab) return <>{children}</>;

  return (
    <AppShell
      title="세무"
      action={
        // ⚙ 는 결과 탭에서만 — 설정은 계산 결과를 바꾸는 값들이다
        tab === "result" ? (
          // useSearchParams 는 프리렌더에서 Suspense 경계를 요구한다. 셸 전체를
          // 감싸면 첫 페인트가 통째로 늦어지므로 이 아이콘 하나만 감싼다
          <React.Suspense fallback={<span className={ICON_LINK} />}>
            <SettingsLink />
          </React.Suspense>
        ) : undefined
      }
    >
      <SegmentedToggle
        label="세무 화면"
        size="md"
        value={tab}
        onChange={(next: TabValue) => {
          const target = TABS.find((t) => t.value === next);
          if (target) router.replace(target.href);
        }}
        options={TABS.map(({ value, label }) => ({ value, label }))}
      />
      {children}
    </AppShell>
  );
}

const ICON_LINK = cn(
  "inline-flex size-9 shrink-0 items-center justify-center rounded-sm",
  "text-fg-strong hover:bg-surface-sunken",
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
);

/**
 * ⚙ — 보고 있던 기간을 그대로 설정 화면에 실어 보낸다.
 *
 * 설정 화면의 뒤로가 이 쿼리로 결과 기간을 복원한다(`tax/settings/page.tsx`
 * 의 `backHref`). 안 실으면 석 달치를 보다가 설정 한 줄 고치고 돌아왔을 때
 * 화면이 이번 달로 리셋된다.
 */
function SettingsLink() {
  const params = useSearchParams();
  const from = params.get("from");
  const to = params.get("to");
  // 형식 검증은 설정 화면이 한다 — 어차피 사용자가 URL 을 손댈 수 있다
  const href = from && to ? `/tax/settings?from=${from}&to=${to}` : "/tax/settings";

  return (
    <Link href={href} aria-label="설정" className={ICON_LINK}>
      <Icon name="settings" size={20} />
    </Link>
  );
}
