"use client";

import * as React from "react";

import { DEFAULT_TAX_RATES } from "@/config/tax-rates";
import { simulate } from "@/lib/tax/pipeline";
import type { TaxSimulation } from "@/lib/tax/types";
import { sumLedger, type LedgerTotals } from "./ledger";
import { usePeriodLabel } from "./period-label";
import {
  INITIAL_STATE,
  simulatorReducer,
  toTaxInput,
  type SimulatorAction,
  type SimulatorState,
} from "./simulator-reducer";

/**
 * 시뮬레이터 상태 (PRD §8 — React Context + reducer)
 *
 * 파이프라인이 단방향이라 상태도 단방향으로 둔다. 화면은 입력만 dispatch 하고,
 * 계산 결과는 전부 여기서 파생된다. 화면이 중간 결과를 들고 있지 않으므로
 * 어느 화면에서 뒤로 가도 숫자가 어긋날 수 없다.
 *
 * ⚠️ 저장 계층은 다음 마일스톤이다. 지금은 메모리에만 있으므로 새로고침하면
 * 사라진다. 백업 화면(S-08)의 파일 내보내기/불러오기는 동작한다.
 */
interface SimulatorContextValue {
  state: SimulatorState;
  dispatch: React.Dispatch<SimulatorAction>;
  /** 현재 입력으로 계산한 결과. 입력이 바뀌면 즉시 갱신된다 */
  simulation: TaxSimulation;
  ledgerTotals: LedgerTotals;
  /** 명세 합계가 금액 필드를 덮고 있는가 */
  ledgerActive: boolean;
  periodLabel: string;
}

const SimulatorContext = React.createContext<SimulatorContextValue | null>(null);

export function SimulatorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(simulatorReducer, INITIAL_STATE);
  const periodLabel = usePeriodLabel(state.periodMode);

  const value = React.useMemo<SimulatorContextValue>(() => {
    const ledgerTotals = sumLedger(state.ledger);
    const input = toTaxInput(state, periodLabel);
    return {
      state,
      dispatch,
      simulation: simulate(input, DEFAULT_TAX_RATES),
      ledgerTotals,
      ledgerActive: state.useLedgerTotals && state.ledger.length > 0,
      periodLabel,
    };
  }, [state, periodLabel]);

  return (
    <SimulatorContext.Provider value={value}>{children}</SimulatorContext.Provider>
  );
}

export function useSimulator(): SimulatorContextValue {
  const ctx = React.useContext(SimulatorContext);
  if (!ctx) {
    throw new Error("useSimulator 는 SimulatorProvider 안에서만 쓸 수 있습니다");
  }
  return ctx;
}
