import writeExcelFile, { type SheetData } from "write-excel-file/browser";

import {
  EVIDENCE_TYPES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TAX_RATES_EFFECTIVE_DATE,
} from "@/config/tax-rates";
import {
  aggregate,
  entryIsDeductible,
  type LedgerEntry,
  type LedgerSettings,
} from "@/lib/ledger/model";
import { annualizationLabel, type DateRange } from "@/lib/ledger/range";
import type { TaxSimulation } from "@/lib/tax/types";

/**
 * 엑셀(.xlsx) 내보내기 (v2 §3 T2)
 *
 * 파일은 브라우저 안에서 만든다 — 서버로 아무것도 보내지 않는다. 금액은
 * 숫자 셀(`type: Number`)로 넣어 엑셀에서 그대로 합계·정렬이 된다.
 *
 * 시트 세 장의 역할이 다르다. **입력값**은 "무엇을 넣었나", **계산 결과**는
 * "어떻게 나왔나", **지출 명세**는 "그 합계가 어느 행에서 왔나"다. 셋을 한
 * 장에 합치면 세무사에게 보낼 때 근거를 짚어 주기 어렵다.
 */
export type WorkbookSheet = {
  sheet: string;
  data: SheetData;
  columns: { width: number }[];
};

/** 한국어 라벨이 잘리지 않을 만큼만 넓힌다. */
const PAIR_WIDTHS = [{ width: 30 }, { width: 18 }];
const ENTRY_WIDTHS = [12, 10, 18, 16, 20, 14, 10, 24].map((width) => ({ width }));

/** 수입·지출 항목 라벨은 키가 겹치지 않아 한 표로 합쳐 둔다 */
const CATEGORY_LABEL = { ...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES };

const head = (...labels: string[]) =>
  labels.map((value) => ({ value, fontWeight: "bold" as const }));
const num = (value: number) => ({ value, type: Number });

/** `cso-tax_2026-08-01_2026-08-31.xlsx` — 파일명만 봐도 어느 기간인지 안다 */
export function workbookFileName(range: DateRange): string {
  return `cso-tax_${range.from}_${range.to}.xlsx`;
}

export function buildWorkbook(
  entries: readonly LedgerEntry[],
  settings: LedgerSettings,
  range: DateRange,
  simulation: TaxSimulation,
): WorkbookSheet[] {
  const totals = aggregate(entries);
  const { revenueVat, purchaseVat, vatPayable, expenses, insurance, taxBase } =
    simulation.stage02;
  const {
    annualizationFactor,
    periodIncomeTax,
    localIncomeTax,
    totalIncomeTax,
    withholding,
    taxKind,
  } = simulation.stage03;
  // 법인이면 같은 줄의 이름만 바뀐다 — 값의 의미와 자리는 그대로다
  const taxWord = taxKind === "corporate" ? "법인세" : "소득세";
  const { inflow, netCash, marginRate, reserveTotal } = simulation.stage04;

  const input: SheetData = [
    head("항목", "값"),
    ["기간", `${range.from} ~ ${range.to}`],
    ["사업자 유형", settings.businessType === "corporate" ? "법인사업자" : "개인사업자"],
    ["매출 입금(수입 합계)", num(totals.revenue)],
    ["적격증빙 매입", num(totals.qualifiedEvidence)],
    ["프리랜서 지급액", num(totals.freelancerPay)],
    ["정규직 급여", num(totals.salary)],
    ["고정비", num(totals.fixedCost)],
    ["불공제 비용", num(totals.nonDeductibleCost)],
    ["장부 건수", num(totals.count)],
    ["국민연금 상한 적용", settings.pensionCapEnabled ? "예" : "아니오"],
    // 0.033 × 100 은 3.3000000000000003 이다 — 셀에 그대로 들어가면 안 된다
    ["프리랜서 원천징수율(%)", num(Math.round(settings.withholdingRate * 1000) / 10)],
    ["부양가족 수", num(settings.dependents)],
    ["세율표 기준일", TAX_RATES_EFFECTIVE_DATE],
  ];

  const result: SheetData = [
    head("항목", "금액"),
    ["매출 공급가액", num(revenueVat.supply)],
    ["매출세액", num(revenueVat.vat)],
    ["매입세액", num(purchaseVat.vat)],
    ["납부 VAT", num(vatPayable)],
    ["필요경비", num(expenses.total)],
    ["과세표준", num(taxBase)],
    // 소수 둘째 자리까지. 45일 같은 임의 구간은 계수가 8.11 처럼 떨어진다
    ["연환산 계수", num(Math.round(annualizationFactor * 100) / 100)],
    ["연환산 기준", annualizationLabel(range)],
    ["기본공제", num(simulation.stage02.personalDeduction)],
    [`${taxWord} 산출세액`, num(periodIncomeTax)],
    ["지방소득세", num(localIncomeTax)],
    [`납부 ${taxWord}`, num(totalIncomeTax)],
    ["4대보험 회사부담", num(insurance.total)],
    ["프리랜서 원천징수(참고)", num(withholding.amount)],
    ["총 세금·보험(적립 권장)", num(reserveTotal)],
    ["매출(유입)", num(inflow)],
    ["Net Cash", num(netCash)],
    ["세후 마진율(%)", num(Math.round(marginRate * 10000) / 100)],
  ];

  const lines: SheetData = [
    head("날짜", "수입/지출", "항목", "증빙", "거래처", "금액", "공제 여부", "메모"),
    ...entries.map((entry) => [
      entry.date,
      entry.kind === "income" ? "수입" : "지출",
      CATEGORY_LABEL[entry.category].label,
      entry.evidence ? EVIDENCE_TYPES[entry.evidence].label : "",
      entry.merchant,
      num(entry.amount),
      // 수입은 매입이 아니라 공제 여부라는 칸 자체가 성립하지 않는다
      entry.kind === "income" ? "" : entryIsDeductible(entry) ? "공제" : "불공제",
      entry.memo,
    ]),
  ];

  return [
    { sheet: "입력값", data: input, columns: PAIR_WIDTHS },
    { sheet: "계산 결과", data: result, columns: PAIR_WIDTHS },
    { sheet: "지출 명세", data: lines, columns: ENTRY_WIDTHS },
  ];
}

/** 이 파일에서 유일하게 DOM 을 건드리는 자리 — 브라우저가 곧바로 내려받는다. */
export function downloadWorkbook(
  fileName: string,
  entries: readonly LedgerEntry[],
  settings: LedgerSettings,
  range: DateRange,
  simulation: TaxSimulation,
): Promise<void> {
  return writeExcelFile(buildWorkbook(entries, settings, range, simulation)).toFile(
    fileName,
  );
}
