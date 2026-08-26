"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button, Card } from "@/components/design-system";
import { ScreenShell, SectionLabel } from "@/components/screens/screen-shell";
import { authErrorMessage } from "@/lib/auth-errors";
import { useAuth } from "@/state/auth-context";
import { syncStatusLabel } from "@/state/cloud-sync";
import { useSimulator } from "@/state/simulator-context";

/**
 * 내 계정 (M1-a · M1-b)
 *
 * 앱에서 유일하게 로그인을 요구하는 화면이다. 나머지 화면은 익명으로 그대로
 * 동작한다. 로그인한 동안에는 입력값이 계정에 저장되므로, 지금 어디에
 * 저장돼 있는지도 여기서 밝힌다.
 */
const PROVIDER_LABEL: Record<string, string> = {
  email: "이메일",
  google: "Google",
  kakao: "카카오",
};

export default function AccountScreen() {
  const router = useRouter();
  const { user, loading, signOut, deactivate } = useAuth();
  const { syncStatus, lastSyncedAt } = useSimulator();
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (!user) {
    return (
      <ScreenShell title="내 계정" backHref="/">
        <Card elevation="none">
          <p className="text-caption leading-normal text-fg-secondary">
            로그인 상태를 확인하고 있습니다.
          </p>
        </Card>
      </ScreenShell>
    );
  }

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
    <ScreenShell title="내 계정" backHref="/">
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

      <SectionLabel>저장</SectionLabel>
      <Card>
        <p className="text-caption leading-normal text-fg-secondary">
          입력한 내용은 내 계정에 자동 저장됩니다. 다른 기기에서 로그인하면 이어서 쓸
          수 있습니다.
        </p>
        <p className="mt-2 text-caption font-bold text-fg-strong">
          {syncStatusLabel(syncStatus, lastSyncedAt)}
        </p>
      </Card>

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
    </ScreenShell>
  );
}
