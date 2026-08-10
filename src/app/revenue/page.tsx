"use client";

import Link from "next/link";

import {
  Button,
  Card,
  FieldBlock,
  Icon,
  MoneyInput,
} from "@/components/design-system";
import { PreviewStrip, ScreenShell } from "@/components/screens/screen-shell";
import { formatKRW } from "@/lib/tax/money";
import { useSimulator } from "@/state/simulator-context";

/** S-01 · 매출·증빙 입력 (PRD §6.2) */
export default function RevenueScreen() {
  const { state, dispatch, simulation, ledgerActive, ledgerTotals } = useSimulator();
  const { revenueVat, purchaseVat, vatPayable } = simulation.stage02;

  return (
    <ScreenShell
      title="매출과 증빙"
      stepIndex={0}
      backHref="/"
      primary={
        <Button variant="primary" size="xl" className="flex-1" asChild>
          <Link href="/payroll">
            다음 · 인건비
            <Icon name="chevron-right" />
          </Link>
        </Button>
      }
    >
      <Card>
        <FieldBlock
          num="1"
          title="CSO 판매대행 수수료 수입"
          desc="원청에서 받은 VAT 포함 총액"
        >
          <MoneyInput
            aria-label="CSO 판매대행 수수료 수입"
            value={state.amounts.revenue || ""}
            onChange={(value) =>
              dispatch({ type: "SET_AMOUNT", field: "revenue", value: Number(value) || 0 })
            }
            hint={`공급가액 ${formatKRW(revenueVat.supply)} · VAT ${formatKRW(revenueVat.vat)}`}
            hintTone="ok"
          />
        </FieldBlock>
      </Card>

      <Card>
        <FieldBlock
          num="2"
          title="적격증빙 지출"
          desc="카드·세금계산서 등 증빙 있는 매입만"
        >
          <MoneyInput
            aria-label="적격증빙 지출"
            value={
              ledgerActive ? ledgerTotals.qualified : state.amounts.qualifiedEvidence || ""
            }
            disabled={ledgerActive}
            onChange={(value) =>
              dispatch({
                type: "SET_AMOUNT",
                field: "qualifiedEvidence",
                value: Number(value) || 0,
              })
            }
            hint={
              ledgerActive
                ? `지출 명세 ${ledgerTotals.count}건의 합계가 반영됐습니다`
                : `공급가액 ${formatKRW(purchaseVat.supply)} · 매입 VAT ${formatKRW(purchaseVat.vat)} 공제`
            }
            hintTone={ledgerActive ? "muted" : "ok"}
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-caption leading-snug text-fg-secondary">
              건별로 넣으면 증빙 유형에 따라 공제 여부가 자동 판정됩니다.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/ledger">명세 입력</Link>
            </Button>
          </div>

          {ledgerActive && (
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_USE_LEDGER_TOTALS", value: false })}
              className="mt-2 text-caption font-bold text-fg-link underline"
            >
              직접 입력으로 전환 (명세는 보존됩니다)
            </button>
          )}
        </FieldBlock>
      </Card>

      <PreviewStrip
        items={[
          { label: "납부 예상 VAT", value: vatPayable, accent: true },
          {
            label: "공급가액 차이",
            value: revenueVat.supply - purchaseVat.supply,
          },
        ]}
      />
    </ScreenShell>
  );
}
