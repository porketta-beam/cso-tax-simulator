"use client";

import Link from "next/link";

import {
  BreakdownRow,
  Button,
  Card,
  Icon,
  Money,
} from "@/components/design-system";
import { ScreenShell, SectionLabel } from "@/components/screens/screen-shell";
import { formatKRW } from "@/lib/tax/money";
import { useSimulator } from "@/state/simulator-context";

/** S-04 · 과세표준 확정 (PRD §6.2) */
export default function TaxBaseScreen() {
  const { simulation } = useSimulator();
  const { input, revenueVat, purchaseVat, vatPayable, expenses, insurance, taxBase } =
    simulation.stage02;

  return (
    <ScreenShell
      title="과세표준 확정"
      stepIndex={2}
      backHref="/payroll"
      secondary={
        <Button variant="secondary" size="xl" asChild>
          <Link href="/payroll">이전</Link>
        </Button>
      }
      primary={
        <Button variant="primary" size="xl" className="flex-1" asChild>
          <Link href="/rates">
            다음 · 세율
            <Icon name="chevron-right" />
          </Link>
        </Button>
      }
    >
      <SectionLabel>부가가치세 역산</SectionLabel>
      <Card>
        <BreakdownRow
          label="매출 VAT"
          sub={`${formatKRW(input.revenue)} ÷ 11`}
          value={revenueVat.vat}
          role="tax"
        />
        <BreakdownRow
          label="매입 VAT"
          sub={`${formatKRW(input.qualifiedEvidence)} ÷ 11 · 적격증빙만`}
          value={-purchaseVat.vat}
          role="tax"
        />
        <BreakdownRow
          label="납부 VAT (예상)"
          value={vatPayable}
          role="tax"
          level="total"
        />
      </Card>

      <SectionLabel>필요경비</SectionLabel>
      <Card>
        <BreakdownRow label="매출 공급가액" value={revenueVat.supply} role="in" />
        <BreakdownRow
          label="적격증빙 매입"
          value={expenses.qualifiedSupply}
          role="out"
          indent={1}
        />
        <BreakdownRow label="인건비" value={expenses.payroll} role="out" indent={1} />
        <BreakdownRow
          label="고정비·불공제"
          value={expenses.fixedAndNonDeductible}
          role="out"
          indent={1}
        />
        <BreakdownRow
          label="4대보험 회사부담"
          value={insurance.total}
          role="out"
          indent={1}
        />
        <BreakdownRow
          label="필요경비 합계"
          value={-expenses.total}
          role="out"
          level="total"
        />
      </Card>

      <Card tone="ink" elevation="md">
        <p className="mb-1.5 text-micro font-black tracking-wide text-ink-400">
          과세표준 (예상)
        </p>
        <Money value={taxBase} role="net" size="lg" />
        <p className="mt-2.5 text-caption leading-normal text-ink-400">
          {simulation.stage03.taxKind === "corporate"
            ? "이월결손금·비과세·세액공제는 반영되지 않았습니다."
            : "소득공제(인적공제·연금보험료 등)는 반영되지 않았습니다."}
        </p>
      </Card>
    </ScreenShell>
  );
}
