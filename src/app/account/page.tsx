"use client";

import * as React from "react";

import { Button, Card } from "@/components/design-system";
import { AppShell, SectionLabel } from "@/components/screens/app-shell";
import { authErrorMessage } from "@/lib/auth-errors";
import { useAuth } from "@/state/auth-context";

/**
 * 내 정보 (☰ 메뉴 → 내 정보)
 *
 * 탈퇴의 두 번 탭 확인이 사는 유일한 곳이다. 메뉴 시트의 "탈퇴" 도 여기로
 * 보낸다 — 확인 흐름을 복제하면 한쪽만 고쳐질 수 있다.
 * 로그인 여부 판단은 `AuthGate` 가 이미 했다.
 */
const PROVIDER_LABEL: Record<string, string> = {
  email: "이메일",
  google: "Google",
  kakao: "카카오",
};

export default function AccountScreen() {
  const { user, signOut, deactivate } = useAuth();
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (!user) return null;

  const provider = user.app_metadata?.provider ?? "email";

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="내 정보" back="/">
      {error && (
        <Card tone="danger" elevation="none" role="status">
          <p className="text-caption leading-normal">{error}</p>
        </Card>
      )}

      <Card>
        <div className="grid gap-3">
          <div>
            <p className="text-micro text-fg-faint">이메일</p>
            <p className="text-body font-bold break-all text-fg-strong">{user.email}</p>
          </div>
          <div>
            <p className="text-micro text-fg-faint">로그인 방식</p>
            <p className="text-body font-bold text-fg-strong">
              {PROVIDER_LABEL[provider] ?? provider}
            </p>
          </div>
        </div>
      </Card>

      <Button
        variant="outline"
        size="lg"
        fullWidth
        disabled={busy}
        onClick={() => run(signOut)}
      >
        로그아웃
      </Button>

      <SectionLabel>탈퇴</SectionLabel>
      <Card>
        <p className="text-caption leading-normal text-fg-secondary">
          탈퇴하면 로그인이 해제됩니다. 입력한 자료는 보관 정책에 따라 보존됩니다.
        </p>

        {confirming ? (
          <div className="mt-3.5 grid gap-2.5">
            <p className="text-caption leading-normal font-bold text-danger-fg">
              정말 탈퇴하시겠습니까? 한 번 더 누르면 처리됩니다.
            </p>
            <Button
              variant="outline"
              size="lg"
              fullWidth
              disabled={busy}
              className="border-danger-line text-danger-fg hover:bg-danger-bg"
              onClick={() => run(deactivate)}
            >
              탈퇴합니다
            </Button>
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              취소
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="lg"
            fullWidth
            className="mt-3.5 border-danger-line text-danger-fg hover:bg-danger-bg"
            onClick={() => setConfirming(true)}
          >
            탈퇴
          </Button>
        )}
      </Card>
    </AppShell>
  );
}
