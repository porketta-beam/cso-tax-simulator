"use client";

import * as React from "react";

import {
  deleteEntry,
  getEntry,
  insertEntry,
  listEntries,
  updateEntry,
} from "@/lib/ledger/repo";
import type { EntryInput, LedgerEntry } from "@/lib/ledger/model";
import type { DateRange } from "@/lib/ledger/range";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./auth-context";

/**
 * 기간 장부 조회 + CRUD (v2 §7 A1)
 *
 * 캐시도 낙관적 갱신도 없다. 변경 뒤에는 다시 읽는다 — 한 사용자의 한 달치
 * 행은 많아야 수백 개이고, 서버가 계산한 결과(`updated_at`, 트리거)를 화면이
 * 그대로 받는 편이 정합성을 지키기 쉽다.
 *
 * 상태를 effect 안에서 동기적으로 세팅하지 않는다(`react-hooks/
 * set-state-in-effect`). 로딩 여부는 **가져온 결과의 키가 지금 키와 같은가**로
 * 파생한다 — 별도 loading 플래그를 effect 로 켰다 끄면 조회 키가 바뀔 때마다
 * 한 프레임씩 어긋난다.
 */
export interface UseLedger {
  entries: readonly LedgerEntry[];
  loading: boolean;
  /** 조회 실패 메시지. 변경 실패는 호출부로 던진다 */
  error: string | null;
  add(input: EntryInput): Promise<void>;
  update(id: string, input: EntryInput): Promise<void>;
  remove(id: string): Promise<void>;
  refresh(): void;
}

interface Loaded {
  key: string;
  entries: LedgerEntry[];
  error: string | null;
}

const EMPTY: readonly LedgerEntry[] = [];

function requireClient() {
  const sb = getSupabase();
  if (!sb) throw new Error("로그인 기능이 아직 설정되지 않았습니다");
  return sb;
}

function loadErrorMessage(error: unknown): string {
  const { message } = (error ?? {}) as { message?: string };
  return message ? `장부를 불러오지 못했습니다 (${message})` : "장부를 불러오지 못했습니다";
}

export function useLedger(range: DateRange): UseLedger {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { from, to } = range;

  // 변경 후 재조회를 일으키는 유일한 스위치. 키의 일부라 effect 가 알아서 돈다
  const [nonce, setNonce] = React.useState(0);
  const key = `${userId ?? ""}|${from}|${to}|${nonce}`;
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);

  React.useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) return;

    let alive = true;
    void listEntries(sb, userId, { from, to })
      .then((entries) => {
        if (alive) setLoaded({ key, entries, error: null });
      })
      .catch((err: unknown) => {
        if (alive) setLoaded({ key, entries: [], error: loadErrorMessage(err) });
      });

    return () => {
      alive = false;
    };
  }, [key, userId, from, to]);

  const add = React.useCallback(
    async (input: EntryInput) => {
      if (!userId) throw new Error("로그인이 필요합니다");
      await insertEntry(requireClient(), userId, input);
      setNonce((n) => n + 1);
    },
    [userId],
  );

  const update = React.useCallback(async (id: string, input: EntryInput) => {
    await updateEntry(requireClient(), id, input);
    setNonce((n) => n + 1);
  }, []);

  const remove = React.useCallback(async (id: string) => {
    await deleteEntry(requireClient(), id);
    setNonce((n) => n + 1);
  }, []);

  const refresh = React.useCallback(() => setNonce((n) => n + 1), []);

  return {
    // 재조회 중에는 직전 결과를 그대로 둔다. 목록이 깜빡이며 비는 것보다 낫다
    entries: loaded?.entries ?? EMPTY,
    loading: userId !== null && loaded?.key !== key,
    error: loaded?.key === key ? loaded.error : null,
    add,
    update,
    remove,
    refresh,
  };
}

/**
 * 장부 한 건 조회 + 수정·삭제 (v2 §3 T1-a)
 *
 * 수정 화면 전용이다. `useLedger` 로 그 달을 통째로 읽어 id 로 찾는 방법도
 * 있지만, 그러면 목록을 거치지 않고 들어온 URL(새로고침·북마크)에서 어느
 * 달을 읽어야 할지 알 수 없다. 저장 뒤 재조회도 하지 않는다 — 저장하면
 * 곧바로 목록으로 나가므로 다시 읽을 화면이 없다.
 */
export interface UseEntry {
  entry: LedgerEntry | null;
  loading: boolean;
  /** 조회 실패 메시지. 저장·삭제 실패는 호출부로 던진다 */
  error: string | null;
  save(input: EntryInput): Promise<void>;
  remove(): Promise<void>;
}

export function useEntry(id: string): UseEntry {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const key = `${userId ?? ""}|${id}`;
  const [loaded, setLoaded] = React.useState<{
    key: string;
    entry: LedgerEntry | null;
    error: string | null;
  } | null>(null);

  React.useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) return;

    let alive = true;
    void getEntry(sb, id)
      .then((entry) => {
        if (alive) setLoaded({ key, entry, error: null });
      })
      .catch((err: unknown) => {
        if (alive) setLoaded({ key, entry: null, error: loadErrorMessage(err) });
      });

    return () => {
      alive = false;
    };
  }, [key, userId, id]);

  const save = React.useCallback(
    async (input: EntryInput) => {
      await updateEntry(requireClient(), id, input);
    },
    [id],
  );

  const remove = React.useCallback(async () => {
    await deleteEntry(requireClient(), id);
  }, [id]);

  const matched = loaded?.key === key ? loaded : null;

  return {
    entry: matched?.entry ?? null,
    loading: userId !== null && matched === null,
    error: matched?.error ?? null,
    save,
    remove,
  };
}
