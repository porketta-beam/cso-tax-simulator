import type { BusinessType, PeriodMode } from "@/config/tax-rates";
import type { TaxInput } from "@/lib/tax/types";
import { sumLedger, type LedgerLine } from "./ledger";
import { periodStartFor } from "./period";

/**
 * 사업자 유형은 세율표를 고르는 값이라 단일 출처인 `config/tax-rates.ts` 에
 * 산다(config → state 방향 import 는 금지). 기존 호출부를 위해 여기서 그대로
 * 내보낸다.
 */
export type { BusinessType };

/**
 * 백업 파일과 저장 스키마의 버전. 필드 구조가 바뀌면 올린다.
 * 서버(`simulations.schema_version`)도 이 값을 그대로 쓴다 (PRD §12).
 *
 * v3 — `periodStart`(기간 키) · `updatedAt`(충돌 판정) 추가 (M1-b)
 * v2 — `businessType` 추가
 */
export const SCHEMA_VERSION = 3;

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
  /**
   * 대상 기간의 첫 달 1일 (`YYYY-MM-01`). 저장·동기화 행을 고르는 열쇠다.
   * 하이드레이션 전에는 빈 문자열 — 날짜는 서버가 알 수 없다.
   */
  periodStart: string;
  /**
   * 마지막으로 저장된 시각 (ISO). **reducer 는 이 값을 건드리지 않는다** —
   * 저장 계층(`persistence.ts` · `cloud-sync.ts`)이 찍는다. reducer 안에서
   * 시계를 읽으면 순수성이 깨져 테스트가 오늘 날짜에 흔들린다.
   */
  updatedAt: string;
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
  /** 기간 모드를 바꾸면 기간 키도 따라 움직인다. 시계는 호출부가 넘긴다 */
  | { type: "SET_PERIOD_MODE"; mode: PeriodMode; today: Date }
  | { type: "SET_PERIOD_START"; periodStart: string }
  | { type: "SET_AMOUNT"; field: AmountField; value: number }
  | { type: "ADD_LEDGER_LINE"; line: LedgerLine }
  | { type: "UPDATE_LEDGER_LINE"; id: string; patch: Partial<Omit<LedgerLine, "id">> }
  | { type: "REMOVE_LEDGER_LINE"; id: string }
  | { type: "SET_USE_LEDGER_TOTALS"; value: boolean }
  /** 상태 통째로 교체 — 백업 복원 · 로컬 복구 · 서버 동기화가 모두 쓴다 */
  | { type: "RESTORE"; state: SimulatorState }
  | { type: "RESET" };

export const INITIAL_STATE: SimulatorState = {
  schemaVersion: SCHEMA_VERSION,
  businessType: "individual",
  periodMode: "quarter",
  periodStart: "",
  updatedAt: "",
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
      return {
        ...state,
        periodMode: action.mode,
        periodStart: periodStartFor(action.mode, action.today),
      };

    case "SET_PERIOD_START":
      return { ...state, periodStart: action.periodStart };

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
      // 기간 키는 남긴다 — 지금 보고 있는 기간을 비우는 건 초기화가 아니라 이동이다
      return { ...INITIAL_STATE, periodStart: state.periodStart };

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
    businessType: state.businessType,
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

/**
 * 백업 파일 본문 — 입력값만 담는다. 결과는 불러올 때 최신 세율로 다시 계산한다.
 * 로컬 저장(localStorage)과 서버 행(`simulations.state`)도 같은 모양을 쓴다.
 */
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
 *
 * v1·v2 파일에는 `periodStart`·`updatedAt` 이 없다 — 기간 키는 `now` 기준으로
 * 만들고, 저장 시각은 epoch 으로 둔다(서버에 무엇이 있든 그쪽이 더 새롭다).
 */
export function parseBackupPayload(
  raw: string,
  now: Date = new Date(),
): SimulatorState | null {
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

  const rawPeriodStart = state.periodStart;
  const periodStart =
    typeof rawPeriodStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawPeriodStart)
      ? rawPeriodStart
      : periodStartFor(periodMode, now);

  return {
    schemaVersion: SCHEMA_VERSION,
    businessType,
    periodMode,
    periodStart,
    updatedAt:
      typeof state.updatedAt === "string" && state.updatedAt
        ? state.updatedAt
        : new Date(0).toISOString(),
    amounts: restoredAmounts,
    ledger,
    useLedgerTotals: Boolean(state.useLedgerTotals) && ledger.length > 0,
  };
}
