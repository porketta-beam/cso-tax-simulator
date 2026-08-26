import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * 브라우저 Supabase 클라이언트 (M1-a · M1-b)
 *
 * 서버 코드가 없으므로 `@supabase/ssr` 은 쓰지 않는다. 세션은 브라우저
 * 저장소에만 있다. 밖으로 나가는 것은 로그인 자격증명과, **로그인한 동안의**
 * 시뮬레이터 상태다 — 로그아웃 상태에서는 아무것도 전송하지 않는다.
 * 보호는 전적으로 RLS 가 한다 (PRD §9).
 *
 * 환경변수가 없으면 `null` 을 돌려준다. CI 빌드에는 `.env.local` 이 없고,
 * 로그인은 선택 기능이라 나머지 앱은 그대로 동작해야 하기 때문이다.
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
