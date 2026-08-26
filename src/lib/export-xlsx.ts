import writeExcelFile, { type SheetData } from "write-excel-file/browser";

import { COST_CATEGORIES, EVIDENCE_TYPES, type PeriodMode } from "@/config/tax-rates";
import type { TaxSimulation } from "@/lib/tax/types";
import { lineIsDeductible, type LedgerTotals } from "@/state/ledger";
import type { SimulatorState } from "@/state/simulator-reducer";

/**
 * 엑셀(.xlsx) 내보내기 (S-08)
 *
 * 파일은 브라우저 안에서 만든다 — 서버로 아무것도 보내지 않는다(PRD §9).
 * 금액은 숫자 셀(`type: Number`)로 넣어 엑셀에서 그대로 합계·정렬이 된다.
 * 백업(JSON)과 달리 복원용이 아니라 열람용이다.
 */
const PERIOD_LABEL: Record<PeriodMode, string> = {
  month: "월간",
  quarter: "분기",
  year: "연간",
};

/** `write-excel-file` 의 다중 시트 인자 — 필요한 속성만 좁혀 쓴다. */
export type WorkbookSheet = {
  sheet: string;
  data: SheetData;
  columns: { width: number }[];
};

/** 한국어 라벨이 잘리지 않을 만큼만 넓힌다. */
const PAIR_WIDTHS = [{ width: 30 }, { width: 18 }];
const LEDGER_WIDTHS = [12, 22, 14, 14, 18, 10, 24].map((width) => ({ width }));

const head = (...labels: string[]) =>
  labels.map((value) => ({ value, fontWeight: "bold" as const }));
const num = (value: number) => ({ value, type: Number });

export function buildWorkbook(
  state: SimulatorState,
  simulation: TaxSimulation,
  ledgerTotals?: LedgerTotals,
): WorkbookSheet[] {
  const { amounts, ledger } = state;
  const { revenueVat, purchaseVat, vatPayable, expenses, insurance, taxBase } =
    simulation.stage02;
  const { periodIncomeTax, localIncomeTax, totalIncomeTax, withholding } =
    simulation.stage03;
  const { inflow, netCash, marginRate, reserveTotal } = simulation.stage04;

  const input: SheetData = [
    head("항목", "값"),
    ["사업자 유형", state.businessType === "corporate" ? "법인사업자" : "개인사업자"],
    ["기간 유형", PERIOD_LABEL[state.periodMode]],
    ["CSO 판매대행 수수료 수입", num(amounts.revenue)],
    ["적격증빙 지출", num(amounts.qualifiedEvidence)],
    ["프리랜서 지급액", num(amounts.freelancerPay)],
    ["정규직 급여", num(amounts.salary)],
    ["고정비", num(amounts.fixedCost)],
    ["불공제 비용", num(amounts.nonDeductibleCost)],
    ["명세 합계 반영", state.useLedgerTotals && ledger.length > 0 ? "예" : "아니오"],
  ];

  const result: SheetData = [
    head("항목", "금액"),
    ["매출 공급가액", num(revenueVat.supply)],
    ["매출세액", num(revenueVat.vat)],
    ["매입세액", num(purchaseVat.vat)],
    ["납부 VAT", num(vatPayable)],
    ["필요경비", num(expenses.total)],
    ["과세표준", num(taxBase)],
    ["소득세 산출세액", num(periodIncomeTax)],
    ["지방소득세", num(localIncomeTax)],
    ["납부 소득세", num(totalIncomeTax)],
    ["4대보험 회사부담", num(insurance.total)],
    ["프리랜서 원천징수(참고)", num(withholding.amount)],
    ["총 세금·보험(적립 권장)", num(reserveTotal)],
    ["매출(유입)", num(inflow)],
    ["Net Cash", num(netCash)],
    ["세후 마진율(%)", num(Math.round(marginRate * 10000) / 100)],
  ];

  const sheets: WorkbookSheet[] = [
    { sheet: "입력값", data: input, columns: PAIR_WIDTHS },
    { sheet: "계산 결과", data: result, columns: PAIR_WIDTHS },
  ];

  if (ledger.length > 0) {
    const lines: SheetData = [
      head("일자", "거래처", "금액", "증빙", "비용구분", "공제여부", "메모"),
      ...ledger.map((line) => [
        line.date,
        line.merchant,
        num(line.amount),
        EVIDENCE_TYPES[line.evidence].label,
        COST_CATEGORIES[line.category].label,
        lineIsDeductible(line) ? "공제" : "불공제",
        line.memo ?? "",
      ]),
    ];
    if (ledgerTotals) lines.push(["합계", "", num(ledgerTotals.total)]);
    sheets.push({ sheet: "지출 명세", data: lines, columns: LEDGER_WIDTHS });
  }

  return sheets;
}

/** 이 파일에서 유일하게 DOM 을 건드리는 자리 — 브라우저가 곧바로 내려받는다. */
export function downloadWorkbook(
  fileName: string,
  state: SimulatorState,
  simulation: TaxSimulation,
  ledgerTotals?: LedgerTotals,
): Promise<void> {
  return writeExcelFile(buildWorkbook(state, simulation, ledgerTotals)).toFile(fileName);
}
