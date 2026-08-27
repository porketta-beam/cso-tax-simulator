"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button, Card, Chip, Icon, Money } from "@/components/design-system";
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
    <React.Suspense fallback={<SkeletonRows />}>
      <LedgerList />
    </React.Suspense>
  );
}

/** 본문 좌우 여백을 빠져나와 화면 폭을 그대로 쓰는 덩어리 (상단 크롬 · 목록) */
const BLEED = "-mx-gutter -mt-3";

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
      {/* 월 이동 · 요약 · 필터는 한 덩어리다. 목록이 스크롤되는 동안에도
          "지금 몇 월의 무엇을 보고 있는가"가 한 자리에 모여 있어야 한다 */}
      <div className={cn(BLEED, "border-b border-line-subtle bg-surface-card pt-1.5")}>
        <div className="flex items-center justify-center gap-1">
          <MonthButton label="지난 달" icon="chevron-left" onClick={() => goMonth(-1)} />
          <p className="num min-w-32 text-center text-lg font-black tracking-tight text-fg-strong">
            {monthLabel(month)}
          </p>
          <MonthButton label="다음 달" icon="chevron-right" onClick={() => goMonth(1)} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 px-gutter pb-3">
          <Money value={totals.incomeTotal} role="in" size="sm" signed showUnit={false} />
          <span aria-hidden="true" className="text-fg-faint">
            ·
          </span>
          <Money
            value={-totals.expenseTotal}
            role="out"
            size="sm"
            signed
            showUnit={false}
          />
          <span aria-hidden="true" className="text-fg-faint">
            ·
          </span>
          <span className="num text-caption font-bold text-fg-secondary">
            {totals.count}건
          </span>
        </div>

        {/* 칩이 네 개라 좁은 화면에서도 대개 한 줄에 들어가지만, 줄바꿈 대신
            가로 스크롤로 둔다 — 접혀 내려가면 그만큼 목록이 밀린다 */}
        <div
          className={cn(
            "flex gap-1.5 overflow-x-auto px-gutter pb-3",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {FILTERS.map((chip) => (
            <Chip
              key={chip.value}
              active={chip.value === filter}
              onClick={() => setFilter(chip.value)}
            >
              {chip.label}
            </Chip>
          ))}
        </div>
      </div>

      {error ? (
        <Card tone="danger" role="status" className="grid gap-3">
          <p className="text-caption leading-normal">{error}</p>
          <Button variant="outline" size="md" onClick={refresh}>
            다시 시도
          </Button>
        </Card>
      ) : loading && entries.length === 0 ? (
        <SkeletonRows />
      ) : groups.length === 0 ? (
        <Card className="grid justify-items-center px-card py-9 text-center">
          <Icon name="receipt" size={34} className="text-fg-faint" />
          <p className="mt-3.5 text-lg font-bold text-fg-strong">
            {entries.length === 0
              ? "이번 달 내역이 없습니다"
              : "조건에 맞는 내역이 없습니다"}
          </p>
          {entries.length === 0 && (
            <>
              <p className="mt-1.5 text-caption leading-normal text-fg-secondary">
                매출 한 건만 넣으면 VAT 역산부터 남는 돈까지 바로 계산합니다.
              </p>
              <Button asChild size="lg" fullWidth className="mt-4.5">
                <Link href={newHref}>
                  <Icon name="plus" size={18} />
                  내역 추가
                </Link>
              </Button>
            </>
          )}
        </Card>
      ) : (
        <div className={cn(BLEED, "pb-6")}>
          {groups.map((group) => (
            <section key={group.date}>
              <h2 className="px-gutter pt-3.5 pb-2 text-caption font-black text-fg-secondary">
                {dateHeading(group.date)}
              </h2>
              {group.entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  href={`/tax/ledger/${entry.id}?m=${month}`}
                />
              ))}
            </section>
          ))}
        </div>
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
          className="pointer-events-auto size-tap-large rounded-pill p-0 shadow-lg"
        >
          <Link href={newHref}>
            <Icon name="plus" size={28} />
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
        "inline-flex size-10 shrink-0 items-center justify-center rounded-sm",
        "text-fg-default hover:bg-surface-sunken",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
      )}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}

/**
 * 불러오는 중 — 글자 대신 앞으로 올 행의 모양을 그린다. "불러오는 중…" 한 줄은
 * 목록이 뜨는 순간 레이아웃이 통째로 튀어 어디를 보고 있었는지 잃게 만든다.
 */
function SkeletonRows() {
  return (
    <div className={cn(BLEED, "pt-3.5")} role="status" aria-label="불러오는 중">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-line-subtle bg-surface-card px-card py-4"
        >
          <div className="grid flex-1 gap-2">
            <Bar w="w-[86px]" h="h-5" />
            <Bar w="w-[150px]" h="h-3" />
            <Bar w="w-[70px]" h="h-2.5" />
          </div>
          <Bar w="w-24" h="h-4" />
        </div>
      ))}
    </div>
  );
}

function Bar({ w, h }: { w: string; h: string }) {
  return <div aria-hidden="true" className={cn("rounded-sm bg-ink-100", w, h)} />;
}
