"use client";

import * as React from "react";

import type { LedgerSettings } from "@/lib/ledger/model";
import { getSettings, updateSettings } from "@/lib/ledger/repo";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./auth-context";

/**
 * 계산에 쓰는 사용자 설정 (v2 §3 T2-1)
 *
 * `useLedger` 와 같은 구조다 — 로딩은 키로 파생하고, 저장 뒤에는 다시 읽는다.
 * 설정은 계정당 한 벌이고 자주 바뀌지 않아 이보다 복잡할 이유가 없다.
 *
 * 아직 못 읽었으면 `null` 이다. 화면은 그동안 폼을 비활성으로 둔다 —
 * 기본값을 미리 그려 두면 사용자가 저장하지도 않은 값을 자기 설정으로 믿는다.
 */
export interface UseSettings {
  settings: LedgerSettings | null;
  loading: boolean;
  /** 조회 실패 메시지. 저장 실패는 호출부로 던진다 */
  error: string | null;
  save(patch: Partial<LedgerSettings>): Promise<void>;
}

interface Loaded {
  key: string;
  settings: LedgerSettings | null;
  error: string | null;
}

export function useSettings(): UseSettings {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [nonce, setNonce] = React.useState(0);
  const key = `${userId ?? ""}|${nonce}`;
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);

  React.useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) return;

    let alive = true;
    void getSettings(sb, userId)
      .then((settings) => {
        if (alive) setLoaded({ key, settings, error: null });
      })
      .catch(() => {
        // 기본값으로 대신 그리면 사용자가 저장한 적 없는 값을 자기 설정으로
        // 믿는다. 값을 비우고 실패를 그대로 알린다.
        if (alive) {
          setLoaded({ key, settings: null, error: "설정을 불러오지 못했습니다" });
        }
      });

    return () => {
      alive = false;
    };
  }, [key, userId]);

  const save = React.useCallback(
    async (patch: Partial<LedgerSettings>) => {
      const sb = getSupabase();
      if (!sb) throw new Error("로그인 기능이 아직 설정되지 않았습니다");
      if (!userId) throw new Error("로그인이 필요합니다");
      await updateSettings(sb, userId, patch);
      setNonce((n) => n + 1);
    },
    [userId],
  );

  return {
    settings: loaded?.settings ?? null,
    loading: userId !== null && loaded?.key !== key,
    error: loaded?.key === key ? loaded.error : null,
    save,
  };
}
