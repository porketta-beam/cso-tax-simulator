"use client";

import Link from "next/link";

import {
  Button,
  Card,
  FieldBlock,
  Icon,
  MoneyInput,
} from "@/components/design-system";
import {
  LedgerLockedHint,
  PreviewStrip,
  ScreenShell,
  SectionLabel,
} from "@/components/screens/screen-shell";
import { formatKRW } from "@/lib/tax/money";
import { useSimulator } from "@/state/simulator-context";

/** S-02 · 인건비·고정비 입력 (PRD §6.2) */
export default function PayrollScreen() {
  const { state, dispatch, simulation, ledgerActive, ledgerTotals } = useSimulator();
  const { insurance, expenses } = simulation.stage02;
  const { withholding } = simulation.stage03;

  const freelancerFromLedger = ledgerActive && ledgerTotals.payroll > 0;

  return (
    <ScreenShell
      title="인건비와 고정비"
      stepIndex={1}
      backHref="/revenue"
      secondary={
        <Button variant="secondary" size="xl" asChild>
          <Link href="/revenue">이전</Link>
        </Button>
      }
      primary={
        <Button variant="primary" size="xl" className="flex-1" asChild>
          <Link href="/tax-base">
            다음 · 과세표준
            <Icon name="chevron-right" />
          </Link>
        </Button>
      }
    >
      <Card>
        <FieldBlock num="3" title="인건비" desc="프리랜서와 정규직을 분리해 입력합니다">
          <SectionLabel>프리랜서 지급액 · 세전</SectionLabel>
          <div className="mt-2 mb-4">
            <MoneyInput
              aria-label="프리랜서 지급액"
              value={
                freelancerFromLedger
                  ? ledgerTotals.payroll
                  : state.amounts.freelancerPay || ""
              }
              disabled={freelancerFromLedger}
              onChange={(value) =>
                dispatch({
                  type: "SET_AMOUNT",
                  field: "freelancerPay",
                  value: Number(value) || 0,
                })
              }
              hint={
                freelancerFromLedger
                  ? <LedgerLockedHint />
                  : `3.3% 원천징수 ${formatKRW(withholding.amount)} · 실지급 ${formatKRW(withholding.netPaid)}`
              }
            />
          </div>

          <SectionLabel>정규직 급여 · 세전</SectionLabel>
          <div className="mt-2">
            <MoneyInput
              aria-label="정규직 급여"
              value={state.amounts.salary || ""}
              onChange={(value) =>
                dispatch({ type: "SET_AMOUNT", field: "salary", value: Number(value) || 0 })
              }
              hint={`4대보험 회사부담 ${formatKRW(insurance.total)} 추가 발생`}
              hintTone="warn"
            />
          </div>
        </FieldBlock>
      </Card>

      <Card tone="ok" elevation="none">
        <div className="flex gap-2.5">
          <Icon name="info" size={17} className="mt-px shrink-0 text-ok-fg" />
          <p className="text-caption leading-normal text-[var(--mint-900)]">
            프리랜서 <strong>3.3% 원천징수는 추가 비용이 아닙니다.</strong> 지급액에서
            떼어 대신 납부하는 돈이라 통장에서 나가는 총액은 그대로입니다. 회사 부담으로
            합산하지 않습니다.
          </p>
        </div>
      </Card>

      <Card>
        <FieldBlock num="4" title="고정비 · 기타" desc="임차료·통신비·공과금">
          <MoneyInput
            aria-label="고정비"
            value={ledgerActive ? ledgerTotals.fixed : state.amounts.fixedCost || ""}
            disabled={ledgerActive}
            onChange={(value) =>
              dispatch({ type: "SET_AMOUNT", field: "fixedCost", value: Number(value) || 0 })
            }
            hint={ledgerActive ? <LedgerLockedHint /> : "필요경비에 산입됩니다"}
          />

          <div className="mt-4">
            <SectionLabel>불공제 · 접대비·간이영수증</SectionLabel>
            <div className="mt-2">
              <MoneyInput
                aria-label="불공제 비용"
                value={
                  ledgerActive
                    ? ledgerTotals.nonDeductible
                    : state.amounts.nonDeductibleCost || ""
                }
                disabled={ledgerActive}
                onChange={(value) =>
                  dispatch({
                    type: "SET_AMOUNT",
                    field: "nonDeductibleCost",
                    value: Number(value) || 0,
                  })
                }
                hint={
                  ledgerActive ? (
                    <LedgerLockedHint />
                  ) : (
                    "매입세액 공제는 안 되지만 경비 인정은 됩니다"
                  )
                }
                hintTone={ledgerActive ? "muted" : "warn"}
              />
            </div>
          </div>
        </FieldBlock>
      </Card>

      <PreviewStrip
        items={[
          { label: "총 비용", value: expenses.payroll + expenses.fixedAndNonDeductible },
          { label: "4대보험 회사부담", value: insurance.total, accent: true },
        ]}
      />
    </ScreenShell>
  );
}
