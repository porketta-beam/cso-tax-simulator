"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button, Card, Icon, Money } from "@/components/design-system";
import { EntryRow } from "@/components/ledger/entry-row";
import {
  FILTERS,
  dateHeading,
  filterEntries,
  groupByDate,
  isMonth,
  monthLabel,
  monthOf,
  shiftMonth,
  todayISO,
  type LedgerFilter,
} from "@/components/ledger/ledger-view";
import { aggregate } from "@/lib/ledger/model";
import { monthRange } from "@/lib/ledger/range";
import { useLedger } from "@/state/use-ledger";
import { cn } from "@/lib/utils";

/**
 * T1 장부 (기능정의 v2 §3)
 *
 * 상단 바와 장부/결과 세그먼트는 `../layout.tsx` 가 그린다. 이 화면은
 * AppShell 을 직접 쓰지 않는다 — 두 번 그리면 상단 바가 두 겹이 된다.
 *
 * 보고 있는 달은 상태가 아니라 URL(`?m=2026-08`)에 둔다. 폼에 갔다 돌아올 때
 * 같은 달로 되돌아와야 하는데, 컴포넌트 상태로 들고 있으면 라우팅 한 번에
 * 이번 달로 튕겨 나간다.
 */
export default function LedgerScreen() {
  // useSearchParams 는 서스펜스 경계를 요구한다 (Next.js CSR bailout)
  return (
    <React.Suspense fallback={<StatusCard>불러오는 중…</StatusCard>}>
      <LedgerList />
    </React.Suspense>
  );
}

function LedgerList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = React.useState<LedgerFilter>("all");

  // 쿼리는 사용자가 손댈 수 있다. 형식이 깨졌으면 이번 달로 본다
  const raw = searchParams.get("m");
  const month = isMonth(raw) ? raw : monthOf(todayISO());

  const { entries, loading, error, refresh } = useLedger(monthRange(month));

  // 요약은 필터와 무관하게 그 달 전체다 — 필터는 목록을 좁힐 뿐이다
  const totals = aggregate(entries);
  const groups = groupByDate(filterEntries(entries, filter));

  const newHref = `/tax/ledger/new?m=${month}`;

  function goMonth(delta: number) {
    router.replace(`/tax/ledger?m=${shiftMonth(month, delta)}`);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <MonthButton label="이전 달" icon="chevron-left" onClick={() => goMonth(-1)} />
        <p className="num text-h3 font-black text-fg-strong">{monthLabel(month)}</p>
        <MonthButton label="다음 달" icon="chevron-right" onClick={() => goMonth(1)} />
      </div>

      <Card className="grid grid-cols-3 items-baseline gap-2">
        <Summary label="수입">
          <Money value={totals.incomeTotal} role="in" size="sm" showUnit={false} />
        </Summary>
        <Summary label="지출">
          <Money value={totals.expenseTotal} role="out" size="sm" showUnit={false} />
        </Summary>
        <Summary label="건수">
          <span className="num text-num-sm font-semibold text-fg-strong">
            {totals.count}건
          </span>
        </Summary>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((chip) => {
          const active = chip.value === filter;
          return (
            <button
              key={chip.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(chip.value)}
              className={cn(
                "h-8 rounded-pill border px-3 text-caption font-bold",
                "transition-colors duration-[var(--dur-fast)] ease-standard",
                "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                active
                  ? "border-transparent bg-ink-900 text-fg-on-color"
                  : "border-line-default bg-surface-card text-fg-default",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <Card tone="danger" role="status" className="grid gap-3">
          <p className="text-caption leading-normal">{error}</p>
          <Button variant="outline" size="md" onClick={refresh}>
            다시 시도
          </Button>
        </Card>
      ) : loading && entries.length === 0 ? (
        <StatusCard>불러오는 중…</StatusCard>
      ) : groups.length === 0 ? (
        <Card className="grid justify-items-center gap-3 py-8 text-center">
          <p className="text-body leading-normal text-fg-secondary">
            {entries.length === 0
              ? "이번 달 내역이 없습니다"
              : "조건에 맞는 내역이 없습니다"}
          </p>
          {entries.length === 0 && (
            <Button asChild size="lg">
              <Link href={newHref}>
                <Icon name="plus" size={18} />
                내역 추가
              </Link>
            </Button>
          )}
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.date} className="grid gap-1.5">
            <h2 className="px-1 text-micro font-black tracking-wide text-fg-faint">
              {dateHeading(group.date)}
            </h2>
            <Card padded={false} className="overflow-hidden">
              {group.entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  href={`/tax/ledger/${entry.id}?m=${month}`}
                />
              ))}
            </Card>
          </section>
        ))
      )}

      {/* FAB 가 마지막 행을 덮지 않도록 */}
      <div className="h-12" />

      {/* 화면이 아니라 셸(max-w-lg) 오른쪽 끝에 붙인다. 넓은 화면에서 뷰포트
          모서리로 날아가면 목록과 상관없는 자리에 떠 있게 된다 */}
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 z-30 mx-auto flex max-w-lg justify-end px-gutter",
          "bottom-[calc(72px+env(safe-area-inset-bottom,0px))]",
        )}
      >
        <Button
          asChild
          aria-label="내역 추가"
          className="pointer-events-auto size-14 rounded-pill p-0 shadow-lg"
        >
          <Link href={newHref}>
            <Icon name="plus" size={26} />
          </Link>
        </Button>
      </div>
    </>
  );
}

function MonthButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: "chevron-left" | "chevron-right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex size-tap-min shrink-0 items-center justify-center rounded-sm",
        "text-fg-strong hover:bg-surface-sunken",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
      )}
    >
      <Icon name={icon} size={22} />
    </button>
  );
}

function Summary({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 text-micro text-fg-faint">{label}</p>
      {children}
    </div>
  );
}

function StatusCard({ children }: { children: React.ReactNode }) {
  return (
    <Card elevation="none" role="status">
      <p className="text-caption leading-normal text-fg-secondary">{children}</p>
    </Card>
  );
}
