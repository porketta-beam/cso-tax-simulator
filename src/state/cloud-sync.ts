import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/database";
import {
  SCHEMA_VERSION,
  parseBackupPayload,
  toBackupPayload,
  type SimulatorState,
} from "./simulator-reducer";

/**
 * 계정별 서버 동기화 (M1-b)
 *
 * 로그인한 사용자만이다. 로그아웃 상태에서는 이 파일의 어떤 함수도 호출되지
 * 않고, 세무 입력값은 기기 밖으로 나가지 않는다.
 *
 * 상태 전체를 (user_id, period_mode, period_start) 당 jsonb **한 행**으로
 * 넣는다 — 파일 백업과 같은 모양이라 직렬화 코드도 검증기도 하나뿐이다.
 *
 * 충돌 규칙: payload 안의 `updatedAt`(클라이언트 시계)이 더 새로운 쪽이
 * 이긴다. 재시도 큐도 오프라인 큐도 없다 — 다음 변경이 다시 보낸다.
 */
export type SyncStatus = "off" | "idle" | "saving" | "saved" | "error";

type Client = SupabaseClient<Database>;

/**
 * ⚠️ v2 마이그레이션 0003 이 `simulations` 테이블을 지웠다 — 장부가 행 단위
 * (`ledger_lines`)로 쪼개지면서 jsonb 스냅샷은 쓸 곳이 없어졌다. 이 파일 전체가
 * v2 앱 셸 PR 에서 삭제되지만, 그 전까지 v1 마법사가 컴파일은 돼야 하므로
 * 여기서만 타입 없는 클라이언트로 내려간다. 런타임에서는 이미 죽은 경로다 —
 * 호출부가 오류를 잡아 "서버 저장에 실패했습니다"로 표시한다.
 */
function v1Snapshots(supabase: Client) {
  return (supabase as unknown as SupabaseClient).from("simulations");
}

/**
 * 로컬과 서버 중 새것을 고른다. 같으면 로컬이 이긴다 — 방금 손댄 쪽을
 * 사용자가 눈으로 보고 있기 때문이다. ISO 문자열은 사전순 = 시간순이다.
 */
export function pickNewer(
  local: SimulatorState,
  remote: SimulatorState | null,
): SimulatorState {
  if (!remote) return local;
  return remote.updatedAt > local.updatedAt ? remote : local;
}

/** 이 기간의 서버 행. 없으면 null, 손상됐으면(=검증 실패) 역시 null */
export async function fetchRemote(
  supabase: Client,
  userId: string,
  periodMode: string,
  periodStart: string,
): Promise<SimulatorState | null> {
  const { data, error } = await v1Snapshots(supabase)
    .select("state")
    .eq("user_id", userId)
    .eq("period_mode", periodMode)
    .eq("period_start", periodStart)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return parseBackupPayload(JSON.stringify(data.state));
}

/** 이 기간의 서버 행을 덮어쓴다 */
export async function pushRemote(
  supabase: Client,
  userId: string,
  state: SimulatorState,
): Promise<void> {
  const payload = toBackupPayload(state, state.updatedAt);
  const { error } = await v1Snapshots(supabase).upsert(
    {
      user_id: userId,
      period_mode: state.periodMode,
      period_start: state.periodStart,
      schema_version: SCHEMA_VERSION,
      state: payload as unknown as Json,
    },
    { onConflict: "user_id,period_mode,period_start" },
  );
  if (error) throw error;
}

/** 화면 한 줄짜리 동기화 상태 문구 — S-00 과 /account 가 같이 쓴다 */
export function syncStatusLabel(
  status: SyncStatus,
  lastSyncedAt: string | null,
): string {
  switch (status) {
    case "off":
      return "이 기기에만 저장됩니다";
    case "saving":
      return "저장 중…";
    case "error":
      return "서버 저장에 실패했습니다. 이 기기에는 저장돼 있습니다";
    case "saved":
      return lastSyncedAt
        ? `${new Date(lastSyncedAt).toLocaleString("ko-KR")} 저장됨`
        : "저장됨";
    case "idle":
      return "내 계정에 자동 저장됩니다";
  }
}
