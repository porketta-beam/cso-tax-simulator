"use client";

import Link from "next/link";

import {
  BracketBar,
  BreakdownRow,
  Button,
  Card,
  Icon,
  Money,
} from "@/components/design-system";
import { ScreenShell, SectionLabel } from "@/components/screens/screen-shell";
import { DEFAULT_TAX_RATES } from "@/config/tax-rates";
import { formatKRW } from "@/lib/tax/money";
import { useSimulator } from "@/state/simulator-context";

/** S-05 · 세율·4대보험 (PRD §6.2) */
const PERIOD_WORD = { month: "월", quarter: "분기", year: "연간" } as const;

export default function RatesScreen() {
  const { simulation } = useSimulator();
  const { insurance, taxBase } = simulation.stage02;
  const {
    annualizationFactor,
    annualizedTaxBase,
    taxKind,
    brackets,
    bracket,
    bracketIndex,
    annualIncomeTax,
    periodIncomeTax,
    localIncomeTax,
    totalIncomeTax,
    withholding,
    isAnnualized,
  } = simulation.stage03;

  const word = PERIOD_WORD[simulation.input.periodMode];
  const rates = DEFAULT_TAX_RATES.insurance;
  // 세율표·명칭은 엔진이 고른 것을 그대로 쓴다. 화면이 businessType 으로 다시
  // 고르면 강조된 구간이 실제 계산과 어긋날 수 있다.
  const isCorporate = taxKind === "corporate";
  const taxWord = isCorporate ? "법인세" : "소득세";

  return (
    <ScreenShell
      title="세율과 4대보험"
      stepIndex={3}
      backHref="/tax-base"
      secondary={
        <Button variant="secondary" size="xl" asChild>
          <Link href="/tax-base">이전</Link>
        </Button>
      }
      primary={
        <Button variant="primary" size="xl" className="flex-1" asChild>
          <Link href="/result">
            결과 보기
            <Icon name="chevron-right" />
          </Link>
        </Button>
      }
    >
      <SectionLabel>{isCorporate ? "법인세" : "종합소득세"} 누진 구간</SectionLabel>
      <Card>
        <BracketBar
          brackets={brackets}
          activeIndex={bracketIndex}
          note={
            isAnnualized
              ? `${word} 과세표준을 연환산(×${annualizationFactor})해 세율을 적용한 뒤 다시 ÷${annualizationFactor} 한 추정치입니다.`
              : undefined
          }
        />
      </Card>

      <Card>
        {isAnnualized && (
          <BreakdownRow
            label="연환산 과세표준"
            sub={`${formatKRW(taxBase)} × ${annualizationFactor}`}
            value={annualizedTaxBase}
            role="tax"
          />
        )}
        <BreakdownRow
          label={isAnnualized ? "연간 산출세액" : "산출세액"}
          sub={`× ${Math.round(bracket.rate * 100)}% − ${formatKRW(bracket.progressiveDeduction)}`}
          value={annualIncomeTax}
          role="tax"
        />
        {isAnnualized && (
          <BreakdownRow
            label={`${word} 귀속 산출세액`}
            sub={`÷ ${annualizationFactor}`}
            value={periodIncomeTax}
            role="tax"
          />
        )}
        <BreakdownRow
          label={`지방소득세 (${Math.round(DEFAULT_TAX_RATES.localIncomeTax * 100)}%)`}
          value={localIncomeTax}
          role="tax"
        />
        <BreakdownRow
          label={`납부 예상 ${taxWord}`}
          value={totalIncomeTax}
          role="tax"
          level="total"
        />
      </Card>

      <SectionLabel>4대보험 · 회사 부담</SectionLabel>
      <Card>
        <BreakdownRow
          label={`국민연금 ${(rates.nationalPension * 100).toFixed(1)}%`}
          value={insurance.nationalPension}
          role="out"
        />
        <BreakdownRow
          label={`건강보험 ${(rates.healthInsurance * 100).toFixed(3)}%`}
          value={insurance.healthInsurance}
          role="out"
        />
        <BreakdownRow
          label={`장기요양보험 건강보험료 × ${(rates.longTermCare * 100).toFixed(2)}%`}
          value={insurance.longTermCare}
          role="out"
        />
        <BreakdownRow
          label={`고용보험 ${(rates.employmentInsurance * 100).toFixed(1)}%`}
          value={insurance.employmentInsurance}
          role="out"
        />
        <BreakdownRow
          label={`산재보험 ${(rates.industrialAccident * 100).toFixed(1)}%`}
          value={insurance.industrialAccident}
          role="out"
        />
        <BreakdownRow
          label="회사 부담 합계"
          value={insurance.total}
          role="out"
          level="total"
        />
      </Card>

      <Card tone="sunken" elevation="none">
        <div className="flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <p className="text-sm font-bold text-fg-strong">프리랜서 원천징수</p>
            <p className="text-caption leading-snug text-fg-secondary">
              익월 10일까지 대신 납부 · 회사 부담 아님
            </p>
          </div>
          <Money value={withholding.amount} role="muted" size="sm" showUnit={false} />
        </div>
      </Card>
    </ScreenShell>
  );
}
