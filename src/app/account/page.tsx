"use client";

import * as React from "react";
import Link from "next/link";

import { Badge, Button, Card, Icon } from "@/components/design-system";
import { AppShell } from "@/components/screens/app-shell";
import { todayISO } from "@/components/ledger/ledger-view";
import { authErrorMessage } from "@/lib/auth-errors";
import { formatPercent } from "@/lib/tax/money";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/auth-context";
import { useLedger } from "@/state/use-ledger";
import { useSettings } from "@/state/use-settings";

/**
 * 내 정보 (☰ 메뉴 → 내 정보, 기능정의 v2 §3)
 *
 * 계정 그 자체 — 누구로 로그인해 있고, 무엇으로 계산하며, 어떻게 나가는가.
 * 앱 설정(`/settings`)과 계산 설정(`/tax/settings`)은 여기서 **링크로만** 닿는다.
 *
 * 로그아웃과 탈퇴는 무게가 다르므로 위치로 구분한다 — 로그아웃은 보통 버튼,
 * 탈퇴는 맨 아래 텍스트 버튼에 두 번 탭 확인. 탈퇴 확인이 사는 유일한 곳이다.
 * 로그인 여부 판단은 `AuthGate` 가 이미 했고, 로그아웃 뒤 `/login` 으로 보내는
 * 것도 `AuthGate` 가 한다 — 세션이 사라지면 어느 화면에 있든 같아야 한다.
 */
const PROVIDER_LABEL: Record<string, string> = {
  email: "이메일",
  google: "Google",
  kakao: "카카오",
};

/** 장부 규모를 세려면 전 기간을 봐야 한다. 계정 하나의 시작점 */
const LEDGER_EPOCH = "2000-01-01";

export default function AccountScreen() {
  const { user, signOut, deactivate } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  // ponytail: 건수와 최초 날짜만 쓰는데 행을 통째로 받아 온다. 장부가 수천
  // 건으로 커지면 count/min 집계 쿼리(`select count(*), min(date)`)로 바꾼다
  const { entries, loading: ledgerLoading } = useLedger({
    from: LEDGER_EPOCH,
    to: todayISO(),
  });
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // 어떤 조작이 도는 중인지까지 기억한다 — 불리언 하나면 탈퇴를 누른 순간
  // 로그아웃 버튼이 "로그아웃 중"이라고 거짓말을 한다
  const [busy, setBusy] = React.useState<"signOut" | "deactivate" | null>(null);

  if (!user) return null;

  const provider = user.app_metadata?.provider ?? "email";

  async function run(which: "signOut" | "deactivate", action: () => Promise<void>) {
    setBusy(which);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
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
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden="true"
            className="flex size-[52px] shrink-0 items-center justify-center rounded-pill bg-surface-sunken text-[26px] leading-none"
          >
            👤
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="min-w-0 truncate text-body font-bold text-fg-strong">
                {user.email}
              </p>
              <Badge tone="neutral">{PROVIDER_LABEL[provider] ?? provider}</Badge>
            </div>
            <p className="num mt-1 text-caption text-fg-secondary">
              {joinedOn(user.created_at)}
            </p>
          </div>
        </div>
      </Card>

      {/* 계산 설정은 결과 화면 ⚙ 에도 있다. 화면은 하나고 진입만 둘이라
          `?from=account` 로 돌아갈 곳을 알려 준다 */}
      <Card padded={false}>
        <Link
          href="/tax/settings?from=account"
          className={cn(
            "flex items-center gap-3 rounded-card p-card",
            "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-body font-bold text-fg-strong">계산 설정</span>
            {settingsLoading ? (
              <span
                aria-hidden="true"
                className="mt-1.5 block h-3 w-[78%] rounded-sm bg-ink-100"
              />
            ) : (
              <span className="mt-1 block text-caption leading-normal text-fg-secondary">
                {settingsSummary(settings)}
              </span>
            )}
          </span>
          <Icon name="chevron-right" size={17} className="text-fg-faint" />
        </Link>
      </Card>

      <p className="px-0.5 text-caption text-fg-secondary">
        {ledgerLoading ? "장부를 세는 중…" : ledgerSummary(entries)}
      </p>

      <Button
        variant="outline"
        size="lg"
        fullWidth
        className="mt-1"
        disabled={busy !== null}
        onClick={() => run("signOut", signOut)}
      >
        {busy === "signOut" ? "로그아웃 중" : "로그아웃"}
      </Button>

      <div className="mt-4 grid justify-items-center gap-2">
        {confirming ? (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <Button
              variant="ghost"
              size="md"
              disabled={busy !== null}
              className="text-danger-fg hover:bg-danger-bg"
              onClick={() => run("deactivate", deactivate)}
            >
              정말 탈퇴할까요? 다시 누르면 탈퇴됩니다
            </Button>
            <Button
              variant="ghost"
              size="md"
              disabled={busy !== null}
              onClick={() => setConfirming(false)}
            >
              취소
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="md"
            className="text-danger-fg hover:bg-danger-bg"
            onClick={() => setConfirming(true)}
          >
            탈퇴
          </Button>
        )}
        <p className="max-w-[320px] text-center text-caption leading-normal text-fg-faint">
          탈퇴해도 입력한 장부는 보관됩니다. 다시 로그인하면 이어서 쓸 수 있습니다.
        </p>
      </div>
    </AppShell>
  );
}

/** "2026년 8월 27일 가입". 값이 없으면 줄을 비우기보다 물음표를 남긴다 */
function joinedOn(createdAt: string | undefined): string {
  if (!createdAt) return "가입일 —";
  const date = new Date(createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `${date} 가입`;
}

/** 들어가 보지 않고도 지금 값을 알 수 있게 한 줄로 접는다 */
function settingsSummary(
  settings: ReturnType<typeof useSettings>["settings"],
): string {
  if (!settings) return "사업자 유형 · 부양가족 · 원천징수율";
  const kind = settings.businessType === "corporate" ? "법인" : "개인";
  const parts = [
    kind,
    `부양가족 ${settings.dependents}명`,
    `원천징수 ${formatPercent(settings.withholdingRate)}%`,
  ];
  // 꺼져 있으면 아예 말하지 않는다 — "상한 미적용"은 읽는 사람에게 일이 된다
  if (settings.pensionCapEnabled) parts.push("국민연금 상한 적용");
  return parts.join(" · ");
}

/** "장부 128건 · 2026년 1월부터" — 이 계정에 무엇이 쌓여 있는지 한 줄로 */
function ledgerSummary(entries: readonly { date: string }[]): string {
  if (entries.length === 0) return "장부가 비어 있습니다";
  // 조회는 최신순이지만 정렬에 기대지 않는다 — 한 번 흔들리면 조용히 틀린다
  const earliest = entries.reduce(
    (min, e) => (e.date < min ? e.date : min),
    entries[0].date,
  );
  const [year, month] = earliest.split("-").map(Number);
  return `장부 ${entries.length}건 · ${year}년 ${month}월부터`;
}
