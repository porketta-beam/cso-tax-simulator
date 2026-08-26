"use client";

import Link from "next/link";

import { Button, Card, Icon, Money, NetCashHero } from "@/components/design-system";
import { isoDate, presetRange, rangeLabel, type DateRange } from "@/lib/ledger/range";
import { simulateRange } from "@/lib/ledger/simulate";
import { formatPercent } from "@/lib/tax/money";
import { cn } from "@/lib/utils";
import { useLedger } from "@/state/use-ledger";
import { useSettings } from "@/state/use-settings";

/**
 * H0 세무 요약 카드 (기능정의 v2 §3)
 *
 * 이번 달 Net Cash 와 올해 누계를 한 카드에 담고, 카드 전체가 결과 화면으로
 * 간다 — 홈에서 궁금해진 것을 바로 파고들 수 있어야 한다.
 *
 * 계산은 결과 화면과 **같은 `simulateRange`** 를 쓴다. 홈이 따로 집계하면
 * 같은 달인데 홈과 결과의 Net Cash 가 달라지고, 사용자는 어느 쪽이 맞는지
 * 알 방법이 없다.
 *
 * 누계는 1/1~오늘 범위를 통째로 한 번 시뮬레이션한 값이다. 달마다 따로
 * 계산해 더하면 누진세율이 달 단위로 끊겨 실제보다 세금이 적게 나온다 —
 * 연환산 계수(`annualizationFactor`)가 부분 연도를 처리한다.
 */
export function TaxSummaryCard() {
  const today = new Date();
  const month = presetRange("thisMonth", today);
  const ytd: DateRange = { from: `${today.getFullYear()}-01-01`, to: isoDate(today) };

  const monthLedger = useLedger(month);
  const ytdLedger = useLedger(ytd);
  const { settings, loading: settingsLoading, error: settingsError } = useSettings();

  if (monthLedger.loading || ytdLedger.loading || settingsLoading) {
    return (
      <Card elevation="none">
        <p className="text-caption leading-normal text-fg-secondary">계산하는 중…</p>
      </Card>
    );
  }

  const failure = monthLedger.error ?? ytdLedger.error ?? settingsError;
  if (failure || !settings) {
    return (
      <Card tone="danger" elevation="none">
        <p className="text-caption leading-normal">
          {failure ?? "설정을 불러오지 못했습니다"}
        </p>
        <Button
          variant="outline"
          size="lg"
          fullWidth
          className="mt-3"
          onClick={() => {
            // 장부는 다시 읽을 수 있지만, 설정 훅은 재조회를 열어 두지 않았다
            if (monthLedger.error || ytdLedger.error) {
              monthLedger.refresh();
              ytdLedger.refresh();
            } else {
              window.location.reload();
            }
          }}
        >
          다시 시도
        </Button>
      </Card>
    );
  }

  if (monthLedger.entries.length === 0) {
    return <EmptyCard period={rangeLabel(month)} />;
  }

  const { netCash, inflow, marginRate } = simulateRange(
    monthLedger.entries,
    settings,
    month,
  ).stage04;
  const ytdNet = simulateRange(ytdLedger.entries, settings, ytd).stage04.netCash;

  return (
    <Link
      href={`/tax/result?from=${month.from}&to=${month.to}`}
      className={cn(
        "block rounded-lg",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
      )}
    >
      <NetCashHero
        value={netCash}
        period={rangeLabel(month)}
        totalRevenue={inflow}
        marginRate={formatPercent(marginRate)}
      />
      {/* 히어로 아래로 10px 파고들어 한 덩어리로 읽히게 한다 */}
      <div className="-mt-2.5 flex items-center justify-between gap-3 rounded-b-card bg-surface-card px-card pt-5 pb-3.5 shadow-sm">
        <div className="min-w-0">
          <p className="mb-[3px] text-micro text-fg-faint">
            올해 누계 Net Cash · 1월 1일 ~ {today.getMonth() + 1}월 {today.getDate()}일
          </p>
          <Money value={ytdNet} role="in" size="md" showUnit={false} />
        </div>
        <Icon name="chevron-right" size={18} className="text-fg-faint" />
      </div>
    </Link>
  );
}

/** 이번 달 장부가 비어 있을 때 — 요약 대신 첫 입력을 부른다 */
function EmptyCard({ period }: { period: string }) {
  return (
    <Card tone="ink" elevation="md">
      <span className="text-micro font-black tracking-wide text-[var(--mint-500)]">
        NET CASH · {period}
      </span>
      <p className="mt-3 text-h2 font-black tracking-tight text-fg-on-color">
        첫 내역을 입력하세요
      </p>
      <p className="mt-2 text-caption leading-body text-ink-300">
        매출 한 건만 넣으면 VAT 역산부터 남는 돈까지 바로 계산합니다.
      </p>
      <Button variant="primary" size="lg" fullWidth className="mt-4" asChild>
        <Link href="/tax/ledger/new">
          <Icon name="plus" />
          내역 추가
        </Link>
      </Button>
    </Card>
  );
}
