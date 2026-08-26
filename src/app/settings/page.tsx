"use client";

import * as React from "react";

import { Badge, Button, Card, Icon } from "@/components/design-system";
import { AppShell, SectionLabel } from "@/components/screens/app-shell";
import { TAX_RATES_EFFECTIVE_DATE } from "@/config/tax-rates";
import { authErrorMessage } from "@/lib/auth-errors";
import { downloadWorkbook, workbookFileName } from "@/lib/export-xlsx";
import { simulateRange } from "@/lib/ledger/simulate";
import { isoDate, type DateRange } from "@/lib/ledger/range";
import { validatePassword } from "@/lib/password";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/auth-context";
import { useLedger } from "@/state/use-ledger";
import { useSettings } from "@/state/use-settings";
import pkg from "../../../package.json";

/**
 * S1 앱 설정 (기능정의 v2 §3)
 *
 * **계산 설정(`/tax/settings`)과 다른 화면이다.** 여기 있는 값들은 결과 숫자를
 * 바꾸지 않는다 — 계정·알림·내보내기·앱 정보. 그래서 진입도 ☰ 메뉴 한 곳뿐이다.
 * 둘을 한 화면에 합치면 "설정을 바꿨는데 세금이 달라졌다"와 "안 달라졌다"가
 * 같은 화면에서 일어난다.
 */
export default function AppSettingsScreen() {
  return (
    <AppShell title="앱 설정" back="/">
      <SectionLabel>계정</SectionLabel>
      <AccountSection />

      <SectionLabel>알림</SectionLabel>
      <Card>
        {/* 목업 — 저장하지 않는다. 켤 수 있게 두면 켠 줄 알고 기한을 놓친다 */}
        <label className="flex items-center gap-2.5 opacity-60">
          <input
            type="checkbox"
            disabled
            checked={false}
            readOnly
            className="size-5 shrink-0 accent-[var(--action-primary)]"
          />
          <span className="min-w-0 flex-1 text-sm font-bold text-fg-strong">
            신고 기한 알림
          </span>
          <Badge tone="amber">준비 중</Badge>
        </label>
        <p className="mt-2 text-caption leading-normal text-fg-secondary">
          부가세·종합소득세 신고 기한을 미리 알려 드릴 예정입니다.
        </p>
      </Card>

      <SectionLabel>데이터</SectionLabel>
      <ExportSection />

      <SectionLabel>정보</SectionLabel>
      <Card padded={false} className="overflow-hidden">
        <InfoRow label="세율표 기준일" value={TAX_RATES_EFFECTIVE_DATE} />
        <InfoRow label="앱 버전" value={pkg.version} />
        {/* 링크 자리만 잡아 둔다. href 없이 두면 눌러도 아무 일이 없다 */}
        <InfoRow label="이용약관" pending />
        <InfoRow label="개인정보 처리방침" pending />
      </Card>
    </AppShell>
  );
}

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  kakao: "카카오",
};

const FIELD = cn(
  "h-tap-min w-full rounded-sm border border-line-default bg-surface-card px-3",
  "text-body font-semibold text-fg-strong",
  "outline-none focus-visible:border-action focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus-ring)]",
);

function AccountSection() {
  const { user, updatePassword } = useAuth();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // AuthGate 를 통과한 화면이라 user 는 있다. 그래도 타입은 좁혀야 한다
  if (!user) return null;
  const provider = user.app_metadata?.provider ?? "email";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const invalid = validatePassword(password, confirm);
    setStatus(null);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await updatePassword(password);
      setPassword("");
      setConfirm("");
      setStatus("변경됨");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <p className="text-micro text-fg-faint">이메일</p>
      <p className="text-body font-bold break-all text-fg-strong">{user.email}</p>

      {provider !== "email" ? (
        <p className="mt-3.5 border-t border-line-subtle pt-3.5 text-caption leading-normal text-fg-secondary">
          {PROVIDER_LABEL[provider] ?? provider} 계정으로 로그인 중입니다 — 비밀번호는
          해당 서비스에서 관리합니다.
        </p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="mt-3.5 grid gap-2.5 border-t border-line-subtle pt-3.5"
        >
          <p className="text-sm font-bold text-fg-strong">비밀번호 변경</p>
          <input
            type="password"
            autoComplete="new-password"
            aria-label="새 비밀번호"
            placeholder="새 비밀번호"
            value={password}
            onChange={(e) => {
              setStatus(null);
              setPassword(e.target.value);
            }}
            className={FIELD}
          />
          <input
            type="password"
            autoComplete="new-password"
            aria-label="새 비밀번호 확인"
            placeholder="새 비밀번호 확인"
            value={confirm}
            onChange={(e) => {
              setStatus(null);
              setConfirm(e.target.value);
            }}
            className={FIELD}
          />
          <Button type="submit" variant="outline" size="lg" fullWidth disabled={busy}>
            비밀번호 변경
          </Button>
          {error && (
            <p role="alert" className="text-caption leading-normal text-danger-fg">
              {error}
            </p>
          )}
          {status && (
            <p
              role="status"
              className="text-caption leading-normal font-bold text-ok-fg"
            >
              {status}
            </p>
          )}
        </form>
      )}
    </Card>
  );
}

/**
 * 장부 전체를 엑셀 한 파일로. 기간은 "처음부터 오늘까지"다 —
 * 시작 하한(2000-01-01)은 장부가 존재할 수 없는 과거라 사실상 전체와 같다.
 */
function ExportSection() {
  const range: DateRange = { from: "2000-01-01", to: isoDate(new Date()) };
  const { entries, loading, error: ledgerError } = useLedger(range);
  const { settings } = useSettings();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const ready = !loading && !ledgerError && settings !== null && entries.length > 0;

  async function onExport() {
    if (!settings) return;
    setError(null);
    setBusy(true);
    try {
      await downloadWorkbook(
        workbookFileName(range),
        entries,
        settings,
        range,
        simulateRange(entries, settings, range),
      );
    } catch {
      setError("엑셀 파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <p className="text-sm font-bold text-fg-strong">장부 전체 엑셀 내보내기</p>
      <p className="mt-1 text-caption leading-normal text-fg-secondary">
        {loading
          ? "장부를 세는 중…"
          : ledgerError
            ? ledgerError
            : entries.length === 0
              ? "내보낼 내역이 아직 없습니다."
              : `지금까지 입력한 ${entries.length}건이 한 파일로 저장됩니다. 기간을 골라 내보내려면 결과 화면을 쓰세요.`}
      </p>
      <Button
        variant="outline"
        size="lg"
        fullWidth
        className="mt-3.5"
        disabled={!ready || busy}
        onClick={onExport}
      >
        <Icon name="download" />
        엑셀 파일로 저장
      </Button>
      {error && (
        <p role="alert" className="mt-2.5 text-caption leading-normal text-danger-fg">
          {error}
        </p>
      )}
    </Card>
  );
}

function InfoRow({
  label,
  value,
  pending,
}: {
  label: string;
  value?: string;
  pending?: boolean;
}) {
  return (
    <div className="flex min-h-tap-min items-center justify-between gap-3 border-b border-line-subtle px-card last:border-b-0">
      <span className="text-sm font-bold text-fg-strong">{label}</span>
      {pending ? (
        <Badge tone="amber">준비 중</Badge>
      ) : (
        <span className="num text-sm font-bold text-fg-secondary">{value}</span>
      )}
    </div>
  );
}
