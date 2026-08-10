import {
  EVIDENCE_TYPES,
  isVatDeductible,
  type CostCategory,
  type EvidenceType,
} from "@/config/tax-rates";
import { won } from "@/lib/tax/money";

/**
 * 지출 명세 한 건 (PRD §6.3)
 *
 * 2단계의 카드내역 CSV 자동 분류가 이 구조를 그대로 타깃으로 삼는다
 * (PRD §12). 필드를 바꾸면 `schemaVersion` 을 올릴 것.
 */
export interface LedgerLine {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  merchant: string;
  /** VAT 포함 금액 */
  amount: number;
  evidence: EvidenceType;
  category: CostCategory;
  memo?: string;
}

export interface LedgerTotals {
  /** 매입세액 공제 대상 — 집계 입력의 ② 적격증빙 지출로 들어간다 */
  qualified: number;
  /** 고정비 — 경비 산입, VAT 불공제 */
  fixed: number;
  /** 불공제 — 경비 산입, VAT 불공제 */
  nonDeductible: number;
  /**
   * 인건비 — 집계 입력의 ③ 프리랜서 지급액으로 반영된다.
   *
   * ⚠️ PRD §6.3 의 비용 구분에는 "인건비" 하나뿐인데 집계 입력은
   * 프리랜서와 정규직으로 나뉜다. 명세에 급여대장을 넣는 사용자는 없다고
   * 보고 프리랜서 쪽으로 붙였다. 화면에도 그 사실을 적어 둔다.
   */
  payroll: number;
  /** 전체 건수·합계 — 요약 표시용 */
  count: number;
  total: number;
  deductibleTotal: number;
}

/**
 * 명세를 집계 입력 버킷으로 접는다.
 *
 * 버킷은 **비용 구분 라벨이 아니라 VAT 공제 판정 결과로** 나눈다. 세금계산서를
 * 받은 임차료는 실제로 매입세액 공제 대상이므로, 라벨로 나누면 화면의 `공제`
 * 배지와 계산이 어긋난다.
 */
export function sumLedger(lines: readonly LedgerLine[]): LedgerTotals {
  const totals: LedgerTotals = {
    qualified: 0,
    fixed: 0,
    nonDeductible: 0,
    payroll: 0,
    count: lines.length,
    total: 0,
    deductibleTotal: 0,
  };

  for (const line of lines) {
    const amount = won(Math.max(0, line.amount));
    totals.total += amount;

    if (line.category === "payroll") {
      totals.payroll += amount;
      continue;
    }

    if (isVatDeductible(line.evidence, line.category)) {
      totals.qualified += amount;
      totals.deductibleTotal += amount;
    } else if (line.category === "fixed") {
      totals.fixed += amount;
    } else {
      totals.nonDeductible += amount;
    }
  }

  return totals;
}

/** 명세 한 건이 매입세액 공제 대상인지 — 배지 표시에 쓴다 */
export function lineIsDeductible(line: LedgerLine): boolean {
  return line.category !== "payroll" && isVatDeductible(line.evidence, line.category);
}

/**
 * 증빙 유형을 바꿨을 때 비용 구분을 어떻게 따라 움직일지 (PRD §6.3)
 *
 * 명세는 "간이영수증·무증빙을 고르면 비용구분이 자동으로 불공제로 전환된다"고
 * 정해져 있다. 그런데 되돌릴 때를 정해 두지 않으면 함정이 생긴다 — 간이영수증을
 * 골랐다가 "아 세금계산서였지" 하고 되돌려도 구분이 불공제에 묶여 있어, 사용자가
 * 눈치채지 못한 채 매입세액 공제를 통째로 못 받는다. 시뮬레이션 결과가 실제보다
 * 나쁘게 나오는데 원인을 알 방법이 없다.
 *
 * 그렇다고 무조건 되돌리면 반대 함정이 생긴다. 카드로 결제한 접대비를 사용자가
 * 일부러 불공제로 지정했는데, 증빙을 카드로 바꾸는 순간 적격증빙으로 튀어 오른다.
 *
 * 그래서 **우리가 자동으로 바꾼 경우에만** 되돌린다. 사용자가 직접 고른 구분은
 * 건드리지 않는다.
 */
export function applyEvidenceChange(
  current: Pick<LedgerLine, "evidence" | "category">,
  nextEvidence: EvidenceType,
  autoForced: boolean,
): { category: CostCategory; autoForced: boolean } {
  const deductible = EVIDENCE_TYPES[nextEvidence].deductible;

  if (!deductible && current.category === "qualified") {
    return { category: "nonDeductible", autoForced: true };
  }
  if (deductible && autoForced && current.category === "nonDeductible") {
    return { category: "qualified", autoForced: false };
  }
  return { category: current.category, autoForced };
}
