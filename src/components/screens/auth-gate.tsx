"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { Card } from "@/components/design-system";
import { useAuth } from "@/state/auth-context";

/**
 * AuthGate — 로그인 필수 (기능정의 v2 §1-5)
 *
 * v1 에서 로그인은 선택이었다. v2 는 장부가 서버에만 있으므로 로그인하지
 * 않으면 보여줄 것이 없다. 아래 세 경로만 열려 있고 나머지는 `/login` 으로
 * 보낸다.
 *
 * 서버 코드가 없다(정적 프리렌더). 그래서 판단은 전적으로 브라우저에서
 * 일어나고, 세션 복구가 끝나기 전에는 **아무것도 렌더하지 않는다** —
 * 보호된 화면이 한 프레임이라도 비쳤다가 사라지는 걸 막으려는 것이다.
 */
/** 로그인 여부와 무관하게 항상 열린다 — 스타일 기준 화면 */
const OPEN_ROUTES = ["/design-system"];
/** 로그인 **전에만** 의미가 있다. 이미 로그인했으면 홈으로 돌려보낸다 */
const AUTH_ROUTES = ["/login", "/signup"];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, configured } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isOpen = OPEN_ROUTES.includes(pathname);
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isPublic = isOpen || isAuthRoute;

  React.useEffect(() => {
    if (!configured || loading || isOpen) return;
    if (!user && !isPublic) router.replace("/login");
    else if (user && isAuthRoute) router.replace("/");
  }, [configured, loading, user, isOpen, isPublic, isAuthRoute, router]);

  /* 세션을 볼 필요조차 없는 경로는 먼저 통과시킨다. Supabase 가 느리거나
     죽어도 /design-system 은 열려 있어야 한다. */
  if (isOpen) return <>{children}</>;

  /* 환경변수가 없는 빌드(CI·프리뷰)에서는 리다이렉트 루프 대신 이유를 적는다.
     로그인 화면은 자기 몫의 안내를 이미 갖고 있으므로 그대로 통과시킨다. */
  if (!configured) {
    return isAuthRoute ? <>{children}</> : <ConfigMissing />;
  }

  if (loading) return <Pending />;
  if (!user && !isPublic) return <Pending />;
  if (user && isAuthRoute) return <Pending />;

  return <>{children}</>;
}

function Pending() {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface-app">
      <p className="text-caption text-fg-faint">불러오는 중…</p>
    </div>
  );
}

function ConfigMissing() {
  return (
    <div className="mx-auto grid min-h-dvh max-w-lg place-items-center bg-surface-app px-gutter">
      <Card tone="warn" elevation="none">
        <p className="text-caption leading-normal">
          로그인 기능이 설정되지 않은 빌드입니다.{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> 과{" "}
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> 를 넣고 다시 배포하세요.
        </p>
      </Card>
    </div>
  );
}
