"use client";

import Link from "next/link";

import {
  BreakdownRow,
  Button,
  Card,
  Icon,
  NetCashHero,
  ReserveCard,
} from "@/components/design-system";
import {
  LegalNotice,
  NavCard,
  ScreenShell,
  SectionLabel,
} from "@/components/screens/screen-shell";
import { formatPercent } from "@/lib/tax/money";
import { useSimulator } from "@/state/simulator-context";

/** S-06 · Net Cash 결과 (PRD §6.2) */
export default function ResultScreen() {
  const { simulation, periodLabel } = useSimulator();
  const { revenueVat, vatPayable, expenses, insurance, taxBase } = simulation.stage02;
  const { totalIncomeTax, isAnnualized } = simulation.stage03;
  const { netCash, marginRate, inflow, reserveItems, reserveTotal } = simulation.stage04;

  return (
    <ScreenShell
      title={`결과 · ${periodLabel}`}
      stepIndex={4}
      backHref="/rates"
      secondary={
        <Button variant="secondary" size="xl" onClick={() => window.print()}>
          <Icon name="printer" />
          인쇄
        </Button>
      }
      primary={
        <Button variant="primary" size="xl" className="flex-1" asChild>
          <Link href="/backup">
            <Icon name="download" />
            백업 파일 받기
          </Link>
        </Button>
      }
    >
      <NetCashHero
        value={netCash}
        period={periodLabel}
        totalRevenue={inflow}
        marginRate={formatPercent(marginRate)}
      />

      {isAnnualized && (
        <p className="rounded-sm border border-warn-line bg-warn-bg px-2.5 py-2 text-caption leading-normal text-warn-fg">
          연환산 기준 추정치입니다. 입력한 기간 금액을 1년치로 환산해 누진세율을 적용한
          뒤 다시 기간분으로 나눈 값입니다.
        </p>
      )}

      <ReserveCard items={reserveItems} total={reserveTotal} />

      <SectionLabel>세무 항목별 요약</SectionLabel>
      <Card>
        <BreakdownRow label="매출 공급가액" value={revenueVat.supply} role="in" />
        <BreakdownRow label="필요경비" value={-expenses.total} role="out" />
        <BreakdownRow label="과세표준" value={taxBase} role="tax" />
        <BreakdownRow label="납부 VAT" value={vatPayable} role="tax" />
        <BreakdownRow label="납부 소득세" value={totalIncomeTax} role="tax" />
        <BreakdownRow label="4대보험 회사부담" value={insurance.total} role="tax" />
        <BreakdownRow
          label="총 세금·보험"
          value={reserveTotal}
          role="tax"
          level="total"
        />
      </Card>

      <NavCard href="/basis" icon="landmark" label="계산 기준 보기" />
      <NavCard href="/backup" icon="download" label="백업과 복원" />

      <LegalNotice />
    </ScreenShell>
  );
}
