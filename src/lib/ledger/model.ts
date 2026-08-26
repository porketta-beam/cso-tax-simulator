import {
  DEFAULT_TAX_RATES,
  EVIDENCE_TYPES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PENSION_MONTHLY_INCOME_CAP,
  isVatDeductible,
  type BusinessType,
  type EvidenceType,
  type ExpenseCategory,
  type IncomeCategory,
  type TaxRates,
} from "@/config/tax-rates";
import { won } from "@/lib/tax/money";
import type { Database } from "@/types/database";

/**
 * 장부 한 건 (v2 §4) — `ledger_lines` 한 행의 camelCase 사본.
 *
 * DB 는 `kind`·`category`·`evidence` 에 CHECK 를 걸지 않는다(마이그레이션 0003
 * 의 `ponytail:` 주석 참고). 유효 집합의 단일 출처는 `tax-rates.ts` 의 상수이고,
 * 문자열 → 유니온 좁히기는 `rowToEntry` 한 곳에서만 일어난다.
 */
export interface LedgerEntry {
  id: string;
  kind: EntryKind;
  /** YYYY-MM-DD */
  date: string;
  /** 정수 원, VAT 포함. 부호는 kind 가 정한다 — 항상 양수다 */
  amount: number;
  category: LedgerCategory;
  /** 지출만. 수입은 null */
  evidence: EvidenceType | null;
  merchant: string;
  memo: string;
  /** 증빙 때문에 우리가 자동으로 불공제로 끌어온 행인가 */
  autoForced: boolean;
  updatedAt: string;
}

export type EntryKind = "income" | "expense";
export type LedgerCategory = IncomeCategory | ExpenseCategory;

/** 폼이 제출하는 모양 — id 와 updatedAt 은 DB 가 정한다 */
export type EntryInput = Omit<LedgerEntry, "id" | "updatedAt">;

type Row = Database["public"]["Tables"]["ledger_lines"]["Row"];
type InsertRow = Database["public"]["Tables"]["ledger_lines"]["Insert"];

/** 우리 앱만 이 테이블에 쓴다. 좁히기는 여기 한 곳뿐이다 */
export function rowToEntry(row: Row): LedgerEntry {
  const kind: EntryKind = row.kind === "income" ? "income" : "expense";
  return {
    id: row.id,
    kind,
    date: row.date,
    amount: won(row.amount),
    category: (row.category in INCOME_CATEGORIES || row.category in EXPENSE_CATEGORIES
      ? row.category
      : kind === "income"
        ? "otherIncome"
        : "nonDeductible") as LedgerCategory,
    evidence:
      kind === "expense" && row.evidence !== null && row.evidence in EVIDENCE_TYPES
        ? (row.evidence as EvidenceType)
        : null,
    merchant: row.merchant,
    memo: row.memo,
    autoForced: row.auto_forced,
    updatedAt: row.updated_at,
  };
}

/** 소유자를 뺀 컬럼들. update 는 소유자를 건드리지 않는다 */
export function entryToColumns(input: EntryInput): Omit<InsertRow, "user_id"> {
  return {
    kind: input.kind,
    date: input.date,
    amount: won(input.amount),
    category: input.category,
    evidence: input.kind === "expense" ? input.evidence : null,
    merchant: input.merchant,
    memo: input.memo,
    auto_forced: input.autoForced,
  };
}

export function entryToRow(input: EntryInput, userId: string): InsertRow {
  return { ...entryToColumns(input), user_id: userId };
}

/**
 * 이 한 건이 매입세액 공제 대상인가 — 배지 표시와 집계가 같은 함수를 쓴다.
 *
 * 인건비는 증빙과 무관하게 공제 대상이 아니다(용역비는 세금계산서를 받아도
 * 근로소득·사업소득이라 매입세액이 없다). 수입은 애초에 매입이 아니다.
 */
export function entryIsDeductible(
  entry: Pick<LedgerEntry, "kind" | "category" | "evidence">,
): boolean {
  if (entry.kind !== "expense" || entry.evidence === null) return false;
  const category = entry.category;
  if (
    category === "payrollFreelancer" ||
    category === "payrollSalary" ||
    category === "sales" ||
    category === "otherIncome"
  ) {
    return false;
  }
  return isVatDeductible(entry.evidence, category);
}

/**
 * 증빙 유형을 바꿨을 때 항목을 어떻게 따라 움직일지 (PRD §6.3)
 *
 * "간이영수증·무증빙을 고르면 항목이 자동으로 불공제로 전환된다"는 규칙만
 * 있고 되돌릴 때가 정해져 있지 않으면 함정이 생긴다 — 간이영수증을 골랐다가
 * "아 세금계산서였지" 하고 되돌려도 항목이 불공제에 묶여 있어, 사용자가
 * 눈치채지 못한 채 매입세액 공제를 통째로 못 받는다. 결과가 실제보다 나쁘게
 * 나오는데 원인을 알 방법이 없다.
 *
 * 그렇다고 무조건 되돌리면 반대 함정이 생긴다. 카드로 결제한 접대비를
 * 사용자가 일부러 불공제로 지정했는데, 증빙을 카드로 바꾸는 순간 적격증빙으로
 * 튀어 오른다.
 *
 * 그래서 **우리가 자동으로 바꾼 경우에만** 되돌린다. 사용자가 직접 고른
 * 항목은 건드리지 않는다.
 */
export function applyEvidenceChange(
  current: { category: LedgerCategory },
  nextEvidence: EvidenceType,
  autoForced: boolean,
): { category: LedgerCategory; autoForced: boolean } {
  const deductible = EVIDENCE_TYPES[nextEvidence].deductible;

  if (!deductible && current.category === "qualified") {
    return { category: "nonDeductible", autoForced: true };
  }
  if (deductible && autoForced && current.category === "nonDeductible") {
    return { category: "qualified", autoForced: false };
  }
  return { category: current.category, autoForced };
}

/** 장부 → 파이프라인 입력 버킷 (v2 §4) */
export interface LedgerTotals {
  /** ① 매출 = 수입 전액 (VAT 포함 수령액) */
  revenue: number;
  /** ② 적격증빙 지출 — 매입세액 공제 대상 */
  qualifiedEvidence: number;
  /** ④ 고정비 — 공제 판정이 false 인 `fixed` 만 */
  fixedCost: number;
  /** ④ 불공제 비용 — 인건비를 뺀 나머지 지출 */
  nonDeductibleCost: number;
  /** ③ 프리랜서 지급액 */
  freelancerPay: number;
  /** ③ 정규직 급여 — 4대보험 산정 기준 */
  salary: number;
  incomeTotal: number;
  expenseTotal: number;
  count: number;
}

/**
 * 장부를 집계 입력 버킷으로 접는다.
 *
 * 버킷은 **항목 라벨이 아니라 VAT 공제 판정 결과로** 나눈다. 세금계산서를 받은
 * 임차료는 실제로 매입세액 공제 대상이므로, 라벨(고정비)로 나누면 화면의 `공제`
 * 배지와 계산이 어긋난다.
 */
export function aggregate(entries: readonly LedgerEntry[]): LedgerTotals {
  const totals: LedgerTotals = {
    revenue: 0,
    qualifiedEvidence: 0,
    fixedCost: 0,
    nonDeductibleCost: 0,
    freelancerPay: 0,
    salary: 0,
    incomeTotal: 0,
    expenseTotal: 0,
    count: entries.length,
  };

  for (const entry of entries) {
    const amount = won(Math.max(0, entry.amount));

    if (entry.kind === "income") {
      totals.incomeTotal += amount;
      totals.revenue += amount;
      continue;
    }

    totals.expenseTotal += amount;

    if (entry.category === "payrollFreelancer") {
      totals.freelancerPay += amount;
    } else if (entry.category === "payrollSalary") {
      totals.salary += amount;
    } else if (entryIsDeductible(entry)) {
      totals.qualifiedEvidence += amount;
    } else if (entry.category === "fixed") {
      totals.fixedCost += amount;
    } else {
      totals.nonDeductibleCost += amount;
    }
  }

  return totals;
}

/** 계산에 영향을 주는 사용자 설정 (v2 §3 T2-1) — `profiles` 컬럼 네 개 */
export interface LedgerSettings {
  businessType: BusinessType;
  pensionCapEnabled: boolean;
  withholdingRate: number;
  dependents: number;
}

export const DEFAULT_SETTINGS: LedgerSettings = {
  businessType: "individual",
  pensionCapEnabled: false,
  withholdingRate: DEFAULT_TAX_RATES.freelancerWithholding,
  dependents: 0,
};

/**
 * 설정 → 세율표. 사용자가 만질 수 있는 값만 기본 세율표 위에 덮는다.
 * 부양가족은 세율표가 아니라 과세표준 차감이므로 `TaxInput.dependents` 로 간다.
 */
export function settingsToRates(
  settings: LedgerSettings,
  base: TaxRates = DEFAULT_TAX_RATES,
): TaxRates {
  return {
    ...base,
    freelancerWithholding: settings.withholdingRate,
    pensionMonthlyIncomeCap: settings.pensionCapEnabled
      ? PENSION_MONTHLY_INCOME_CAP
      : null,
  };
}
