import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * 브라우저 Supabase 클라이언트
 *
 * 서버 코드가 없으므로 `@supabase/ssr` 은 쓰지 않는다. 세션은 브라우저
 * 저장소에만 있고, 장부는 서버에만 있다. 보호는 전적으로 RLS 가 한다 (PRD §9).
 *
 * 환경변수가 없으면 `null` 을 돌려준다. CI 빌드에는 `.env.local` 이 없고,
 * 그래도 빌드는 통과해야 하기 때문이다 — 그런 빌드에서는 `AuthGate` 가
 * 리다이렉트 대신 설정 안내를 띄운다.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** 로그인 기능을 쓸 수 있는 빌드인가 */
export const isAuthConfigured = Boolean(url && key);

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> | null {
  if (!url || !key) return null;
  client ??= createClient<Database>(url, key);
  return client;
}
