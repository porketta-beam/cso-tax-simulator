"use client";

import * as React from "react";

import { Button, Card } from "@/components/design-system";
import { AppShell, NavCard, SectionLabel } from "@/components/screens/app-shell";
import { authErrorMessage } from "@/lib/auth-errors";
import { formatPercent } from "@/lib/tax/money";
import { useAuth } from "@/state/auth-context";
import { useSettings } from "@/state/use-settings";

/**
 * 내 정보 (☰ 메뉴 → 내 정보, 기능정의 v2 §3)
 *
 * 계정 그 자체 — 누구로 로그인해 있고, 어떻게 나가는가. 앱 설정(`/settings`)과
 * 계산 설정(`/tax/settings`)은 여기서 **링크로만** 닿는다.
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
  const { settings } = useSettings();
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
          <div>
            <p className="text-micro text-fg-faint">가입일</p>
            <p className="num text-body font-bold text-fg-strong">
              {joinedOn(user.created_at)}
            </p>
          </div>
        </div>
      </Card>

      {/* 계산 설정은 결과 화면 ⚙ 에도 있다. 화면은 하나고 진입만 둘이라
          `?from=account` 로 돌아갈 곳을 알려 준다 */}
      <NavCard
        href="/tax/settings?from=account"
        icon="calculator"
        label="계산 설정"
        desc={settingsSummary(settings)}
      />

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
          탈퇴해도 입력한 장부는 보관됩니다. 다시 로그인하면 이어서 쓸 수 있습니다.
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

/** "2026년 8월 27일". 값이 없으면 줄을 비우기보다 물음표를 남긴다 */
function joinedOn(createdAt: string | undefined): string {
  if (!createdAt) return "—";
  return new Date(createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** 들어가 보지 않고도 지금 값을 알 수 있게 한 줄로 접는다 */
function settingsSummary(
  settings: ReturnType<typeof useSettings>["settings"],
): string {
  if (!settings) return "사업자 유형 · 부양가족 · 원천징수율";
  const kind = settings.businessType === "corporate" ? "법인" : "개인";
  return `${kind} · 부양가족 ${settings.dependents} · 원천징수 ${formatPercent(settings.withholdingRate)}%`;
}
