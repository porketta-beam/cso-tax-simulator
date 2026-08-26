"use client";

import * as React from "react";

import { DEFAULT_TAX_RATES } from "@/config/tax-rates";
import { getSupabase } from "@/lib/supabase";
import { simulate } from "@/lib/tax/pipeline";
import type { TaxSimulation } from "@/lib/tax/types";
import { useAuth } from "./auth-context";
import { fetchRemote, pickNewer, pushRemote, type SyncStatus } from "./cloud-sync";
import { sumLedger, type LedgerTotals } from "./ledger";
import { periodLabelFor } from "./period-label";
import { periodStartFor } from "./period";
import { loadLocal, saveLocal } from "./persistence";
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
 * 저장은 두 겹이다 (M1-b):
 *   1. 로컬 — 로그인 여부와 무관. 300ms 디바운스로 localStorage 에 쓴다.
 *   2. 서버 — 로그인했을 때만. 1s 디바운스로 이 기간의 행 하나를 덮어쓴다.
 * 로컬이 먼저 복구되고, 서버 쪽이 더 새로우면 그 값이 이긴다.
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
  /** 서버 동기화 상태. 로그아웃 상태에서는 항상 "off" */
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
}

const SimulatorContext = React.createContext<SimulatorContextValue | null>(null);

/** 저장을 건너뛸지 판단하는 지문 — 저장 시각만 다른 값을 다시 보내지 않는다 */
function fingerprint(state: SimulatorState): string {
  return JSON.stringify({ ...state, updatedAt: "" });
}

export function SimulatorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(simulatorReducer, INITIAL_STATE);
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [remoteStatus, setRemoteStatus] = React.useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = React.useState<string | null>(null);
  /** 서버에서 이미 당겨 온 (계정 + 기간) 키. 이게 맞아야 밀어 올린다 */
  const [pulledKey, setPulledKey] = React.useState<string | null>(null);

  /** 저장 시각이 찍힌 최신 상태 — 서버와 비교하고 서버로 보내는 것은 이쪽이다 */
  const stampedRef = React.useRef<SimulatorState>(state);
  /** 마지막으로 서버에 올린 지문 */
  const sentRef = React.useRef<string | null>(null);

  /* 파생값으로 둔다 — effect 안에서 setState 를 부르면 렌더가 연쇄한다.
     기간 키는 하이드레이션이 채우므로, 비어 있으면 아직 복구 전이다. */
  const hydrated = state.periodStart !== "";
  const cloudEnabled = Boolean(userId) && Boolean(getSupabase());
  const syncKey =
    cloudEnabled && userId ? `${userId}|${state.periodMode}|${state.periodStart}` : null;
  const syncStatus: SyncStatus = cloudEnabled ? remoteStatus : "off";

  // 1) 로컬 복구. 렌더 중에는 저장소를 건드리지 않는다 — 하이드레이션이 어긋난다
  React.useEffect(() => {
    const now = new Date();
    const local = loadLocal(now);
    const next =
      local ??
      // 저장된 게 없으면 기간 키만 오늘 기준으로 채운다
      { ...INITIAL_STATE, periodStart: periodStartFor(INITIAL_STATE.periodMode, now) };
    stampedRef.current = next;
    dispatch({ type: "RESTORE", state: next });
  }, []);

  // 2) 로컬 저장 (300ms)
  React.useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      stampedRef.current = saveLocal(state);
    }, 300);
    return () => clearTimeout(timer);
  }, [hydrated, state]);

  // 3) 서버에서 당기기 — 로그인 시점과 기간이 바뀔 때
  React.useEffect(() => {
    const supabase = getSupabase();
    if (!hydrated || !userId || !syncKey || !supabase) return;

    let cancelled = false;
    void fetchRemote(supabase, userId, state.periodMode, state.periodStart)
      .then((remote) => {
        if (cancelled) return;
        const winner = pickNewer(stampedRef.current, remote);
        const tookRemote = remote !== null && winner === remote;
        if (tookRemote) {
          stampedRef.current = winner;
          dispatch({ type: "RESTORE", state: winner });
        }
        /* 방금 서버에서 받은 것을 그대로 되돌려 보내지 않도록 지문을 맞춰 둔다.
           반대로 로컬이 이겼으면 지문을 비워, 아래 4)가 곧바로 밀어 올리게 한다 */
        sentRef.current = tookRemote ? fingerprint(winner) : null;
        setPulledKey(syncKey);
        setRemoteStatus(tookRemote ? "saved" : "idle");
        if (tookRemote) setLastSyncedAt(winner.updatedAt);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[cloud-sync] 서버에서 불러오지 못했습니다", err);
        setRemoteStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, userId, syncKey, state.periodMode, state.periodStart]);

  // 4) 서버로 밀어 올리기 (1s). 이 기간을 당겨 온 뒤에만 동작한다
  React.useEffect(() => {
    const supabase = getSupabase();
    if (!hydrated || !userId || !supabase) return;
    if (!syncKey || pulledKey !== syncKey) return;
    if (fingerprint(state) === sentRef.current) return;

    const timer = setTimeout(() => {
      const stamped = saveLocal(state);
      stampedRef.current = stamped;
      const mark = fingerprint(stamped);
      setRemoteStatus("saving");
      void pushRemote(supabase, userId, stamped)
        .then(() => {
          sentRef.current = mark;
          setLastSyncedAt(stamped.updatedAt);
          setRemoteStatus("saved");
        })
        .catch((err) => {
          console.warn("[cloud-sync] 서버에 저장하지 못했습니다", err);
          setRemoteStatus("error");
        });
    }, 1000);

    return () => clearTimeout(timer);
  }, [hydrated, userId, syncKey, pulledKey, state]);

  const value = React.useMemo<SimulatorContextValue>(() => {
    const periodLabel = periodLabelFor(state.periodMode, state.periodStart);
    return {
      state,
      dispatch,
      simulation: simulate(toTaxInput(state, periodLabel), DEFAULT_TAX_RATES),
      ledgerTotals: sumLedger(state.ledger),
      ledgerActive: state.useLedgerTotals && state.ledger.length > 0,
      periodLabel,
      syncStatus,
      lastSyncedAt,
    };
  }, [state, syncStatus, lastSyncedAt]);

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
