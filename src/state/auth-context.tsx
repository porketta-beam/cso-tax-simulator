"use client";

import * as React from "react";
import type { User } from "@supabase/supabase-js";

import { getSupabase, isAuthConfigured } from "@/lib/supabase";

/**
 * 인증 상태 (M1-a)
 *
 * 로그인은 **선택** 기능이다. 로그인하지 않아도 시뮬레이터 전체가 그대로
 * 동작해야 하므로, 여기서 하는 일은 세션을 들고 있는 것뿐이다. 계산 상태
 * (SimulatorProvider)와는 아무 연결도 없다 — 기기 밖으로 나가는 것은 로그인
 * 자격증명뿐이고, DB 동기화는 M1-b 다.
 *
 * 실패는 예외로 던진다. 화면은 `authErrorMessage(err)` 한 줄로 받는다.
 */
export type OAuthProvider = "google" | "kakao";

interface AuthContextValue {
  user: User | null;
  /** 세션 복구가 끝나기 전인가 — 이 동안에는 로그인 여부를 판단하지 않는다 */
  loading: boolean;
  /** 환경변수가 있어 로그인 기능을 쓸 수 있는 빌드인가 */
  configured: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signInWithOAuth(provider: OAuthProvider): Promise<void>;
  signOut(): Promise<void>;
  /** 탈퇴 — 하드 삭제가 아니라 profiles.deactivated_at 기록 후 로그아웃 */
  deactivate(): Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) throw new Error("로그인 기능이 아직 설정되지 않았습니다");
  return supabase;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  /* 환경변수가 없으면 복구할 세션도 없다. 초기값을 빌드 상수로 두면
     effect 안에서 loading 을 끄지 않아도 되고, 서버·클라이언트 첫 렌더가
     같은 값이라 하이드레이션도 어긋나지 않는다. */
  const [loading, setLoading] = React.useState(isAuthConfigured);

  React.useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: isAuthConfigured,

      async signIn(email, password) {
        const { error } = await requireClient().auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },

      async signUp(email, password) {
        const { error } = await requireClient().auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/account` },
        });
        if (error) throw error;
      },

      async signInWithOAuth(provider) {
        const { error } = await requireClient().auth.signInWithOAuth({
          provider,
          options: { redirectTo: `${window.location.origin}/account` },
        });
        if (error) throw error;
      },

      async signOut() {
        const { error } = await requireClient().auth.signOut();
        if (error) throw error;
      },

      async deactivate() {
        const supabase = requireClient();
        if (!user) return;
        const { error } = await supabase
          .from("profiles")
          .update({ deactivated_at: new Date().toISOString() })
          .eq("id", user.id);
        if (error) throw error;
        await supabase.auth.signOut();
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth 는 AuthProvider 안에서만 쓸 수 있습니다");
  }
  return ctx;
}
