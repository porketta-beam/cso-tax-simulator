"use client";

import * as React from "react";
import Link from "next/link";
import {
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";

import {
  BracketBar,
  BreakdownRow,
  Button,
  Card,
  Icon,
  NetCashHero,
  ReserveCard,
} from "@/components/design-system";
import { RangePicker, rangeIsValid } from "@/components/result/range-picker";
import { LegalNotice, SectionLabel } from "@/components/screens/app-shell";
import { TAX_RATES_EFFECTIVE_DATE } from "@/config/tax-rates";
import { downloadWorkbook, workbookFileName } from "@/lib/export-xlsx";
import {
  annualizationLabel,
  presetRange,
  rangeLabel,
  type DateRange,
} from "@/lib/ledger/range";
import { simulateRange } from "@/lib/ledger/simulate";
import { formatKRW, formatPercent } from "@/lib/tax/money";
import { useLedger } from "@/state/use-ledger";
import { useSettings } from "@/state/use-settings";

/**
 * T2 결과 (기능정의 v2 §3)
 *
 * 이 화면은 탭이다 — `AppShell` 은 `/tax/layout.tsx` 가 그린다. 여기서 또
 * 그리면 상단 바와 하단 탭이 두 겹으로 쌓인다.
 *
 * 기간은 **URL 이 들고 있다**(`?from=&to=`). 컴포넌트 상태로 두면 ⚙ 설정에
 * 다녀오거나 새로고침할 때마다 이번 달로 되돌아간다 — 석 달치를 보다가 설정
 * 한 줄 고치고 왔더니 화면이 딴 기간을 보여 주는 셈이다.
 */
export default function ResultPage() {
  // useSearchParams 는 프리렌더에서 Suspense 경계를 요구한다
  return (
    <React.Suspense fallback={<Status>불러오는 중…</Status>}>
      <ResultScreen />
    </React.Suspense>
  );
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** URL 은 사용자가 손댈 수 있는 값이다. 모양이 어긋나면 기본 기간으로 되돌린다 */
function rangeFromParams(params: ReadonlyURLSearchParams): DateRange {
  const fallback = presetRange("thisMonth", new Date());
  const from = params.get("from");
  const to = params.get("to");
  return {
    from: from && ISO_DATE.test(from) ? from : fallback.from,
    to: to && ISO_DATE.test(to) ? to : fallback.to,
  };
}

function ResultScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const range = rangeFromParams(params);

  return (
    <>
      <RangePicker
        value={range}
        onChange={(next) =>
          // 히스토리를 쌓지 않는다. 뒤로가기가 날짜 조작 하나하나를 되짚으면
          // 화면을 빠져나가는 데만 수십 번을 눌러야 한다.
          router.replace(`/tax/result?from=${next.from}&to=${next.to}`, {
            scroll: false,
          })
        }
      />
      {/* 기간이 뒤집혔으면 조회 자체를 하지 않는다 — 훅을 가진 자식을 안 그리면 된다 */}
      {rangeIsValid(range) && <ResultBody range={range} />}
    </>
  );
}

function ResultBody({ range }: { range: DateRange }) {
  const ledger = useLedger(range);
  const { settings, loading: settingsLoading, error: settingsError } = useSettings();
  const [exportError, setExportError] = React.useState<string | null>(null);

  if (ledger.loading || settingsLoading) return <Status>계산하는 중…</Status>;

  const failure = ledger.error ?? settingsError;
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
          // 장부는 다시 읽을 수 있지만, 설정 훅은 재조회를 열어 두지 않았다
          onClick={() => (ledger.error ? ledger.refresh() : window.location.reload())}
        >
          다시 시도
        </Button>
      </Card>
    );
  }

  const { entries } = ledger;
  if (entries.length === 0) {
    return (
      <Card>
        <h3 className="text-h3 font-bold text-fg-strong">이 기간에 내역이 없습니다</h3>
        <p className="mt-1 text-caption leading-normal text-fg-secondary">
          기간을 바꾸거나, 장부에 수입·지출을 입력하면 결과가 나옵니다.
        </p>
        <Button variant="primary" size="lg" fullWidth className="mt-3.5" asChild>
          <Link href="/tax/ledger">장부로 가기</Link>
        </Button>
      </Card>
    );
  }

  // 위 가드를 통과한 설정을 지역 const 로 잡아 둔다 — 아래 onExport 는 함수
  // 선언이라 TS 가 클로저 안에서는 null 가능성을 그대로 본다
  const loaded = settings;
  const simulation = simulateRange(entries, loaded, range);
  const { revenueVat, purchaseVat, vatPayable, personalDeduction } = simulation.stage02;
  const { brackets, bracketIndex, annualizationFactor, taxKind } = simulation.stage03;
  const { inflow, outflow, netCash, marginRate, reserveItems, reserveTotal } =
    simulation.stage04;
  // 비용 합계에 세금·보험은 넣지 않는다 — 바로 아랫줄에서 따로 빠진다
  const costTotal =
    outflow.qualifiedEvidence + outflow.payroll + outflow.fixedAndNonDeductible;

  async function onExport() {
    setExportError(null);
    try {
      await downloadWorkbook(
        workbookFileName(range),
        entries,
        loaded,
        range,
        simulation,
      );
    } catch {
      setExportError("엑셀 파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <>
      <NetCashHero
        value={netCash}
        period={rangeLabel(range)}
        totalRevenue={inflow}
        marginRate={formatPercent(marginRate)}
      />

      <SectionLabel>유입과 유출</SectionLabel>
      <Card>
        <BreakdownRow label="매출 입금" sub="VAT 포함 총액" value={inflow} role="in" />
        <BreakdownRow
          label="적격증빙 매입"
          value={outflow.qualifiedEvidence}
          role="out"
          indent={1}
        />
        <BreakdownRow label="인건비" value={outflow.payroll} role="out" indent={1} />
        <BreakdownRow
          label="고정비 · 불공제"
          value={outflow.fixedAndNonDeductible}
          role="out"
          indent={1}
        />
        <BreakdownRow label="비용 합계" value={-costTotal} role="out" level="total" />
        <BreakdownRow label="세금·보험 적립" value={-reserveTotal} role="tax" />
      </Card>

      <ReserveCard items={reserveItems} total={reserveTotal} />

      <SectionLabel>과세 구간</SectionLabel>
      <Card>
        <BracketBar
          brackets={brackets}
          activeIndex={bracketIndex}
          note={`${taxKind === "corporate" ? "법인세" : "종합소득세"} 구간입니다. 연환산 과세표준 기준이며 소득공제·세액공제는 반영되지 않았습니다.`}
        />
      </Card>

      <div className="mt-1 grid gap-2.5">
        <Button variant="primary" size="xl" fullWidth onClick={onExport}>
          <Icon name="download" />
          엑셀 파일로 저장
        </Button>
        <Button variant="outline" size="xl" fullWidth asChild>
          <Link href="/advisor">
            <Icon name="user" />
            세무사에게 물어보기
          </Link>
        </Button>
      </div>
      {exportError && (
        <p role="alert" className="text-caption leading-normal text-danger-fg">
          {exportError}
        </p>
      )}

      {/* 근거는 접어 둔다 — 펴 두면 결과가 밀려 내려가고, 없애면 숫자가
          블랙박스가 된다. 네이티브 <details> 로 충분하다 */}
      <Card padded={false} className="overflow-hidden">
        <details className="group">
          <summary className="flex h-tap-comfort cursor-pointer list-none items-center justify-between gap-2.5 px-card text-sm font-bold text-fg-strong [&::-webkit-details-marker]:hidden">
            계산 근거
            <Icon
              name="chevron-right"
              size={18}
              className="text-fg-faint transition-transform group-open:rotate-90"
            />
          </summary>

          <div className="border-t border-line-subtle px-card pt-1 pb-4">
            <BreakdownRow
              label="매출 공급가액"
              sub={`${formatKRW(inflow)} ÷ 1.1`}
              value={revenueVat.supply}
              role="in"
            />
            <BreakdownRow label="매출 VAT" sub="÷ 11" value={revenueVat.vat} role="tax" />
            <BreakdownRow
              label="매입 VAT 공제"
              sub={`${formatKRW(outflow.qualifiedEvidence)} ÷ 11`}
              value={-purchaseVat.vat}
              role="tax"
            />
            <BreakdownRow
              label="납부 VAT (예상)"
              value={vatPayable}
              role="tax"
              level="total"
            />
            {personalDeduction > 0 && (
              <BreakdownRow
                label="기본공제"
                sub="150만 × (본인 + 부양가족)"
                value={-personalDeduction}
                role="tax"
              />
            )}

            <p className="mt-3 text-caption leading-normal text-fg-secondary">
              {annualizationFactor === 1
                ? "이 기간은 1년치라 연환산 없이 세율표를 그대로 적용했습니다."
                : `누진세율은 연 단위입니다. ${annualizationLabel(range)} — 기간 과세표준을 1년치로 늘려 세율을 적용한 뒤, 그 세액을 다시 기간분으로 나눴습니다.`}
              {personalDeduction > 0 &&
                " 기본공제도 연 단위 금액이라 연환산한 뒤에 한 번만 뺍니다."}
            </p>
            <p className="num mt-2 text-micro text-fg-faint">
              세율표 기준일 {TAX_RATES_EFFECTIVE_DATE}
            </p>

            <LegalNotice />
          </div>
        </details>
      </Card>
    </>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return (
    <Card elevation="none">
      <p className="text-caption leading-normal text-fg-secondary">{children}</p>
    </Card>
  );
}
