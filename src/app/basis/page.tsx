"use client";

import { Badge, BreakdownRow, Card } from "@/components/design-system";
import {
  LegalNotice,
  ScreenShell,
  SectionLabel,
} from "@/components/screens/screen-shell";
import { DEFAULT_TAX_RATES, INCOME_TAX_BRACKETS } from "@/config/tax-rates";
import { formatKRW } from "@/lib/tax/money";
import { cn } from "@/lib/utils";
import { useSimulator } from "@/state/simulator-context";

/**
 * S-07 · 계산 기준 (부록) (PRD §6.2)
 *
 * 세율·요율의 단일 출처인 `config/tax-rates.ts` 를 그대로 렌더링한다.
 * 화면에 숫자를 직접 적지 않으므로 세법이 바뀌면 저 파일만 고치면 된다.
 */
export default function BasisScreen() {
  const { simulation } = useSimulator();
  const activeIndex = simulation.stage03.bracketIndex;
  const ins = DEFAULT_TAX_RATES.insurance;

  const insuranceRows: [string, string][] = [
    ["국민연금", `${(ins.nationalPension * 100).toFixed(1)}%`],
    ["건강보험", `${(ins.healthInsurance * 100).toFixed(3)}%`],
    ["장기요양보험", `건강보험료 × ${(ins.longTermCare * 100).toFixed(2)}%`],
    ["고용보험", `${(ins.employmentInsurance * 100).toFixed(1)}%`],
    ["산재보험", `≈${(ins.industrialAccident * 100).toFixed(1)}% (업종별 상이)`],
    [
      "프리랜서 원천징수",
      `${(DEFAULT_TAX_RATES.freelancerWithholding * 100).toFixed(1)}% (소득세 3% + 지방 0.3%)`,
    ],
  ];

  return (
    <ScreenShell title="계산 기준" backHref="/result">
      <Card tone="sunken" elevation="none">
        <p className="text-caption leading-normal text-fg-secondary">
          모든 세율과 요율은 여기 한 곳에서만 관리됩니다. 화면 어디에서도 숫자를 직접
          적지 않으므로, 세법이 바뀌면 이 표만 갱신하면 됩니다.
        </p>
        <div className="mt-2.5">
          <Badge tone="blue">기준일 {DEFAULT_TAX_RATES.effectiveDate}</Badge>
        </div>
      </Card>

      <SectionLabel>종합소득세 · 8구간</SectionLabel>
      <Card padded={false} className="overflow-hidden">
        <div className="flex bg-surface-sunken px-card py-2.5 text-micro font-black tracking-wide text-fg-faint">
          <span className="flex-1">과세표준 이하</span>
          <span className="w-12 text-right">세율</span>
          <span className="w-21 text-right">누진공제</span>
        </div>
        {INCOME_TAX_BRACKETS.map((b, i) => (
          <div
            key={b.label}
            className={cn(
              "flex items-center border-t border-line-subtle px-card py-2.5",
              i === activeIndex && "bg-ok-bg",
            )}
          >
            <span
              className={cn(
                "num flex-1 text-sm text-fg-default",
                i === activeIndex && "font-bold",
              )}
            >
              {Number.isFinite(b.upTo) ? formatKRW(b.upTo) : "10억 초과"}
            </span>
            <span
              className={cn(
                "num w-12 text-right text-sm font-bold",
                i === activeIndex ? "text-ok-fg" : "text-fg-strong",
              )}
            >
              {Math.round(b.rate * 100)}%
            </span>
            <span className="num w-21 text-right text-sm text-fg-secondary">
              {formatKRW(b.progressiveDeduction)}
            </span>
          </div>
        ))}
      </Card>

      <SectionLabel>부가가치세</SectionLabel>
      <Card>
        <BreakdownRow
          label="세율"
          sub="공급가액 = VAT 포함가 ÷ 1.1"
          value={Math.round(DEFAULT_TAX_RATES.vat * 100)}
          role="muted"
        />
        <p className="mt-2 text-caption leading-normal text-fg-secondary">
          매입세액 공제는 적격증빙(카드·세금계산서·지출증빙용 현금영수증)만 가능합니다.
          간이영수증·접대비·비영업용 소형승용차 관련은 불공제입니다.
        </p>
      </Card>

      <SectionLabel>4대보험 · 회사 부담 요율</SectionLabel>
      <Card>
        {insuranceRows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 py-1.5">
            <span className="text-sm text-fg-default">{label}</span>
            <span className="num text-sm font-bold text-fg-strong">{value}</span>
          </div>
        ))}
      </Card>

      <SectionLabel>반영하지 않은 것</SectionLabel>
      <Card tone="sunken" elevation="none">
        <ul className="grid gap-1.5 text-caption leading-normal text-fg-secondary">
          <li>· 소득공제(인적공제·연금보험료 등)와 세액공제·감면</li>
          <li>· 중간예납·기납부세액</li>
          <li>· 국민연금 기준소득월액 상한 (고소득 정규직에서 과대계상 가능)</li>
          <li>· 성실신고확인대상·간이과세자 구분</li>
          <li>· 실제 신고 시 적용되는 세액 10원 미만 절사</li>
        </ul>
      </Card>

      <LegalNotice />
    </ScreenShell>
  );
}
