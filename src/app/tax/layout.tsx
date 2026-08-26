"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
          <Link
            href="/tax/settings"
            aria-label="설정"
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-sm",
              "text-fg-strong hover:bg-surface-sunken",
              "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
            )}
          >
            <Icon name="settings" size={20} />
          </Link>
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
