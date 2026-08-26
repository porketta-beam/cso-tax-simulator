import type { PeriodMode } from "@/config/tax-rates";
import type { TaxInput } from "@/lib/tax/types";
import { sumLedger, type LedgerLine } from "./ledger";

/**
 * 백업 파일과 저장 스키마의 버전. 필드 구조가 바뀌면 올린다.
 * 2단계 서버 도입 시 이 값이 그대로 서버 스키마 버전이 된다 (PRD §12).
 */
export const SCHEMA_VERSION = 2;

/**
 * 사업자 유형. 법인 계산 로직은 아직 없다 — `corporate` 를 골라도 계산은
 * 개인사업자(종합소득세) 기준으로 돌고, 화면이 그 사실을 경고한다.
 */
export type BusinessType = "individual" | "corporate";

/** 사용자가 직접 채우는 금액 필드 */
export type AmountField =
  | "revenue"
  | "qualifiedEvidence"
  | "freelancerPay"
  | "salary"
  | "fixedCost"
  | "nonDeductibleCost";

export interface SimulatorState {
  schemaVersion: number;
  businessType: BusinessType;
  periodMode: PeriodMode;
  /** 사용자가 직접 입력한 금액. 명세 반영 여부와 무관하게 보존된다 */
  amounts: Record<AmountField, number>;
  ledger: LedgerLine[];
  /**
   * 명세 합계를 금액 필드에 자동 반영할지 (PRD §6.3).
   * 끄면 직접 입력값으로 돌아가고, 명세는 그대로 보존된다.
   */
  useLedgerTotals: boolean;
}

export type SimulatorAction =
  | { type: "SET_BUSINESS_TYPE"; businessType: BusinessType }
  | { type: "SET_PERIOD_MODE"; mode: PeriodMode }
  | { type: "SET_AMOUNT"; field: AmountField; value: number }
  | { type: "ADD_LEDGER_LINE"; line: LedgerLine }
  | { type: "UPDATE_LEDGER_LINE"; id: string; patch: Partial<Omit<LedgerLine, "id">> }
  | { type: "REMOVE_LEDGER_LINE"; id: string }
  | { type: "SET_USE_LEDGER_TOTALS"; value: boolean }
  | { type: "RESTORE"; state: SimulatorState }
  | { type: "RESET" };

export const INITIAL_STATE: SimulatorState = {
  schemaVersion: SCHEMA_VERSION,
  businessType: "individual",
  periodMode: "quarter",
  amounts: {
    revenue: 0,
    qualifiedEvidence: 0,
    freelancerPay: 0,
    salary: 0,
    fixedCost: 0,
    nonDeductibleCost: 0,
  },
  ledger: [],
  useLedgerTotals: false,
};

export function simulatorReducer(
  state: SimulatorState,
  action: SimulatorAction,
): SimulatorState {
  switch (action.type) {
    case "SET_BUSINESS_TYPE":
      return { ...state, businessType: action.businessType };

    case "SET_PERIOD_MODE":
      return { ...state, periodMode: action.mode };

    case "SET_AMOUNT":
      return {
        ...state,
        amounts: {
          ...state.amounts,
          [action.field]: Math.max(0, Math.floor(action.value) || 0),
        },
      };

    case "ADD_LEDGER_LINE": {
      const ledger = [...state.ledger, action.line];
      // 첫 명세가 들어오면 합계 반영을 자동으로 켠다. 명세를 넣었는데
      // 금액이 안 바뀌면 사용자는 입력이 먹히지 않았다고 읽는다.
      return { ...state, ledger, useLedgerTotals: true };
    }

    case "UPDATE_LEDGER_LINE":
      return {
        ...state,
        ledger: state.ledger.map((line) =>
          line.id === action.id ? { ...line, ...action.patch } : line,
        ),
      };

    case "REMOVE_LEDGER_LINE": {
      const ledger = state.ledger.filter((line) => line.id !== action.id);
      return {
        ...state,
        ledger,
        // 마지막 한 건을 지우면 직접 입력으로 되돌린다
        useLedgerTotals: ledger.length > 0 && state.useLedgerTotals,
      };
    }

    case "SET_USE_LEDGER_TOTALS":
      return { ...state, useLedgerTotals: action.value };

    case "RESTORE":
      return { ...action.state, schemaVersion: SCHEMA_VERSION };

    case "RESET":
      return INITIAL_STATE;

    default:
      return state;
  }
}

/**
 * 상태를 계산 엔진 입력으로 접는다.
 *
 * 명세 반영이 켜져 있으면 지출 버킷은 명세 합계가 이긴다. 직접 입력값은
 * 덮어쓰지 않고 그대로 남겨 두어, 토글을 끄면 원래 값으로 복귀한다.
 */
export function toTaxInput(state: SimulatorState, periodLabel: string): TaxInput {
  const { amounts } = state;
  const totals = sumLedger(state.ledger);
  const useLedger = state.useLedgerTotals && state.ledger.length > 0;

  return {
    periodMode: state.periodMode,
    periodLabel,
    revenue: amounts.revenue,
    qualifiedEvidence: useLedger ? totals.qualified : amounts.qualifiedEvidence,
    freelancerPay: useLedger && totals.payroll > 0 ? totals.payroll : amounts.freelancerPay,
    salary: amounts.salary,
    fixedCost: useLedger ? totals.fixed : amounts.fixedCost,
    nonDeductibleCost: useLedger ? totals.nonDeductible : amounts.nonDeductibleCost,
  };
}

/** 백업 파일 본문 — 입력값만 담는다. 결과는 불러올 때 최신 세율로 다시 계산한다 */
export interface BackupPayload {
  app: "cso-tax-simulator";
  schemaVersion: number;
  exportedAt: string;
  state: SimulatorState;
}

export function toBackupPayload(
  state: SimulatorState,
  exportedAt: string,
): BackupPayload {
  return {
    app: "cso-tax-simulator",
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    state,
  };
}

/**
 * 백업 파일을 검증해 상태로 되돌린다. 남의 JSON 이나 손상된 파일을 그대로
 * 삼키면 화면이 조용히 깨지므로, 모양이 맞지 않으면 null 을 준다.
 */
export function parseBackupPayload(raw: string): SimulatorState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const payload = parsed as Partial<BackupPayload>;
  if (payload.app !== "cso-tax-simulator") return null;
  if (typeof payload.state !== "object" || payload.state === null) return null;

  const state = payload.state as Partial<SimulatorState>;
  const amounts = state.amounts;
  if (typeof amounts !== "object" || amounts === null) return null;

  const restoredAmounts = { ...INITIAL_STATE.amounts };
  for (const key of Object.keys(INITIAL_STATE.amounts) as AmountField[]) {
    const value = (amounts as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      restoredAmounts[key] = Math.max(0, Math.floor(value));
    }
  }

  const ledger = Array.isArray(state.ledger)
    ? state.ledger.filter(
        (line): line is LedgerLine =>
          typeof line === "object" &&
          line !== null &&
          typeof (line as LedgerLine).id === "string" &&
          typeof (line as LedgerLine).amount === "number",
      )
    : [];

  const periodMode: PeriodMode =
    state.periodMode === "month" || state.periodMode === "year"
      ? state.periodMode
      : "quarter";

  // v1 파일에는 이 필드가 없다 — 그때는 전부 개인사업자였다
  const businessType: BusinessType =
    state.businessType === "corporate" ? "corporate" : "individual";

  return {
    schemaVersion: SCHEMA_VERSION,
    businessType,
    periodMode,
    amounts: restoredAmounts,
    ledger,
    useLedgerTotals: Boolean(state.useLedgerTotals) && ledger.length > 0,
  };
}
