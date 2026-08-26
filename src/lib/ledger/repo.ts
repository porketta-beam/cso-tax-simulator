import type { SupabaseClient } from "@supabase/supabase-js";

import type { BusinessType } from "@/config/tax-rates";
import type { Database } from "@/types/database";
import {
  DEFAULT_SETTINGS,
  entryToColumns,
  entryToRow,
  rowToEntry,
  type EntryInput,
  type LedgerEntry,
  type LedgerSettings,
} from "./model";
import type { DateRange } from "./range";

/**
 * `ledger_lines` · `profiles` 접근 (v2 §4)
 *
 * 훅이 아니라 평범한 async 함수다 — 클라이언트를 인자로 받으므로 테스트에서
 * 가짜를 넣기 쉽고, 서버·스크립트에서도 그대로 쓸 수 있다.
 *
 * 소유자 필터(`user_id`)를 여기서도 거는 이유: RLS 가 이미 막지만, 필터가
 * 없으면 인덱스 `(user_id, date desc)` 를 타지 못한다. 보안이 아니라 계획이다.
 *
 * 오류는 던진다. 화면이 잡아서 한 줄로 보여 준다.
 */
type Client = SupabaseClient<Database>;

/** 기간 안의 장부. 최신 날짜부터, 같은 날은 입력 순서 역순 */
export async function listEntries(
  sb: Client,
  userId: string,
  range: DateRange,
): Promise<LedgerEntry[]> {
  const { data, error } = await sb
    .from("ledger_lines")
    .select("*")
    .eq("user_id", userId)
    .gte("date", range.from)
    .lte("date", range.to)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToEntry);
}

/**
 * 한 건 조회. 수정 화면은 URL 의 id 로 바로 열릴 수 있어야 한다 — 목록을
 * 거쳐 왔다고 가정하고 그 달 조회 결과에서 찾으면, 새로고침이나 북마크로
 * 들어온 순간 "없는 내역"이 된다.
 *
 * 없으면 null. 남의 행은 RLS 가 걸러 내므로 여기서도 null 로 온다.
 */
export async function getEntry(sb: Client, id: string): Promise<LedgerEntry | null> {
  const { data, error } = await sb
    .from("ledger_lines")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToEntry(data) : null;
}

export async function insertEntry(
  sb: Client,
  userId: string,
  input: EntryInput,
): Promise<LedgerEntry> {
  const { data, error } = await sb
    .from("ledger_lines")
    .insert(entryToRow(input, userId))
    .select("*")
    .single();

  if (error) throw error;
  return rowToEntry(data);
}

/** 소유자는 보내지 않는다 — 바꿀 일이 없고, RLS 가 남의 행을 걸러 낸다 */
export async function updateEntry(
  sb: Client,
  id: string,
  input: EntryInput,
): Promise<LedgerEntry> {
  const { data, error } = await sb
    .from("ledger_lines")
    .update(entryToColumns(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return rowToEntry(data);
}

export async function deleteEntry(sb: Client, id: string): Promise<void> {
  const { error } = await sb.from("ledger_lines").delete().eq("id", id);
  if (error) throw error;
}

/**
 * 계산에 쓰는 설정. 프로필 행은 가입 트리거가 만들지만, 만에 하나 없으면
 * 기본값으로 계산을 이어 간다 — 설정 한 줄 때문에 결과 화면이 빈 화면이
 * 되는 편이 더 나쁘다.
 */
export async function getSettings(
  sb: Client,
  userId: string,
): Promise<LedgerSettings> {
  const { data, error } = await sb
    .from("profiles")
    .select("business_type, pension_cap_enabled, withholding_rate, dependents")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return DEFAULT_SETTINGS;

  return {
    businessType: data.business_type === "corporate" ? "corporate" : "individual",
    pensionCapEnabled: data.pension_cap_enabled,
    withholdingRate: Number(data.withholding_rate),
    dependents: data.dependents,
  };
}

export async function updateSettings(
  sb: Client,
  userId: string,
  patch: Partial<LedgerSettings>,
): Promise<void> {
  const row: {
    business_type?: BusinessType;
    pension_cap_enabled?: boolean;
    withholding_rate?: number;
    dependents?: number;
  } = {};
  if (patch.businessType !== undefined) row.business_type = patch.businessType;
  if (patch.pensionCapEnabled !== undefined) {
    row.pension_cap_enabled = patch.pensionCapEnabled;
  }
  if (patch.withholdingRate !== undefined) row.withholding_rate = patch.withholdingRate;
  if (patch.dependents !== undefined) row.dependents = patch.dependents;

  const { error } = await sb.from("profiles").update(row).eq("id", userId);
  if (error) throw error;
}
