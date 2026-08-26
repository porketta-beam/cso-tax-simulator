import { COST_CATEGORIES, EVIDENCE_TYPES, type PeriodMode } from "@/config/tax-rates";
import type { TaxSimulation } from "@/lib/tax/types";
import { lineIsDeductible, type LedgerTotals } from "@/state/ledger";
import type { SimulatorState } from "@/state/simulator-reducer";

/**
 * 엑셀용 CSV 내보내기 (S-08)
 *
 * 한국어 엑셀이 그대로 열도록 UTF-8 BOM + CRLF 로 쓴다. 금액은 천단위 구분 없는
 * 정수라 엑셀이 숫자로 인식한다. 백업(JSON)과 달리 복원용이 아니라 열람용이다.
 */
const PERIOD_LABEL: Record<PeriodMode, string> = {
  month: "월간",
  quarter: "분기",
  year: "연간",
};

type Row = readonly (string | number)[];

function cell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function section(title: string, rows: readonly Row[]): string[] {
  return [title, ...rows.map((row) => row.map(cell).join(","))];
}

export function buildCsv(
  state: SimulatorState,
  simulation: TaxSimulation,
  ledgerTotals?: LedgerTotals,
): string {
  const { amounts, ledger } = state;
  const { revenueVat, purchaseVat, vatPayable, expenses, insurance, taxBase } =
    simulation.stage02;
  const { periodIncomeTax, localIncomeTax, totalIncomeTax, withholding } =
    simulation.stage03;
  const { inflow, netCash, marginRate, reserveTotal } = simulation.stage04;

  const input: Row[] = [
    ["항목", "값"],
    ["기간 유형", PERIOD_LABEL[state.periodMode]],
    ["CSO 판매대행 수수료 수입", amounts.revenue],
    ["적격증빙 지출", amounts.qualifiedEvidence],
    ["프리랜서 지급액", amounts.freelancerPay],
    ["정규직 급여", amounts.salary],
    ["고정비", amounts.fixedCost],
    ["불공제 비용", amounts.nonDeductibleCost],
    ["명세 합계 반영", state.useLedgerTotals && ledger.length > 0 ? "예" : "아니오"],
  ];

  const result: Row[] = [
    ["항목", "금액"],
    ["매출 공급가액", revenueVat.supply],
    ["매출세액", revenueVat.vat],
    ["매입세액", purchaseVat.vat],
    ["납부 VAT", vatPayable],
    ["필요경비", expenses.total],
    ["과세표준", taxBase],
    ["소득세 산출세액", periodIncomeTax],
    ["지방소득세", localIncomeTax],
    ["납부 소득세", totalIncomeTax],
    ["4대보험 회사부담", insurance.total],
    ["프리랜서 원천징수(참고)", withholding.amount],
    ["총 세금·보험(적립 권장)", reserveTotal],
    ["매출(유입)", inflow],
    ["Net Cash", netCash],
    ["세후 마진율(%)", Math.round(marginRate * 10000) / 100],
  ];

  const blocks = [section("입력값", input), section("계산 결과", result)];

  if (ledger.length > 0) {
    const lines: Row[] = [
      ["일자", "거래처", "금액", "증빙", "비용구분", "공제여부", "메모"],
      ...ledger.map((line) => [
        line.date,
        line.merchant,
        line.amount,
        EVIDENCE_TYPES[line.evidence].label,
        COST_CATEGORIES[line.category].label,
        lineIsDeductible(line) ? "공제" : "불공제",
        line.memo ?? "",
      ]),
    ];
    if (ledgerTotals) lines.push(["합계", "", ledgerTotals.total, "", "", "", ""]);
    blocks.push(section("지출 명세", lines));
  }

  return "\uFEFF" + blocks.map((b) => b.join("\r\n")).join("\r\n\r\n") + "\r\n";
}
