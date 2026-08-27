"use client";

import * as React from "react";

import {
  Badge,
  Button,
  ReadOnlyValue,
  SETTING_ROW,
  SettingGroup,
  SettingRow,
  Toggle,
} from "@/components/design-system";
import { AppShell } from "@/components/screens/app-shell";
import { TAX_RATES_EFFECTIVE_DATE } from "@/config/tax-rates";
import { authErrorMessage } from "@/lib/auth-errors";
import { downloadWorkbook, workbookFileName } from "@/lib/export-xlsx";
import { simulateRange } from "@/lib/ledger/simulate";
import { isoDate, type DateRange } from "@/lib/ledger/range";
import { PASSWORD_MIN_LENGTH, validatePassword } from "@/lib/password";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/auth-context";
import { useLedger } from "@/state/use-ledger";
import { useSettings } from "@/state/use-settings";
import pkg from "../../../package.json";

/**
 * S1 앱 설정 (기능정의 v2 §3 · 4차 시안 S2)
 *
 * **계산 설정(`/tax/settings`)과 다른 화면이다.** 여기 있는 값들은 결과 숫자를
 * 바꾸지 않는다 — 계정·알림·내보내기·앱 정보. 그래서 진입도 ☰ 메뉴 한 곳뿐이고,
 * 저장 버튼도 없다: 항목마다 즉시 동작한다. 둘을 한 화면에 합치면 "설정을
 * 바꿨는데 세금이 달라졌다"와 "안 달라졌다"가 같은 화면에서 일어난다.
 */
export default function AppSettingsScreen() {
  return (
    <AppShell title="앱 설정" back="/">
      <SettingGroup title="계정">
        <AccountRows />
      </SettingGroup>

      <SettingGroup title="알림">
        {/* 목업 — 저장하지 않는다. 켤 수 있게 두면 켠 줄 알고 기한을 놓친다 */}
        <SettingRow label="신고 기한 알림">
          <span className="flex shrink-0 items-center gap-2">
            <Badge tone="neutral">준비 중</Badge>
            <Toggle label="신고 기한 알림" on={false} disabled />
          </span>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="데이터">
        <ExportRow />
      </SettingGroup>

      <SettingGroup title="정보">
        <SettingRow label="세율표 기준일">
          <ReadOnlyValue>{TAX_RATES_EFFECTIVE_DATE}</ReadOnlyValue>
        </SettingRow>
        <SettingRow label="앱 버전">
          <ReadOnlyValue>{pkg.version}</ReadOnlyValue>
        </SettingRow>
        {/* 자리만 잡아 둔다. 링크 없이 두면 눌러도 아무 일이 없다 */}
        <SettingRow label="이용약관">
          <Badge tone="neutral">준비 중</Badge>
        </SettingRow>
        <SettingRow label="개인정보 처리방침">
          <Badge tone="neutral">준비 중</Badge>
        </SettingRow>
      </SettingGroup>
    </AppShell>
  );
}

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  kakao: "카카오",
};

const FIELD = cn(
  "h-tap-field w-full min-w-0 rounded-md px-3",
  "bg-surface-card text-body font-semibold text-fg-strong",
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus-ring)]",
);

function AccountRows() {
  const { user, updatePassword } = useAuth();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // AuthGate 를 통과한 화면이라 user 는 있다. 그래도 타입은 좁혀야 한다
  if (!user) return null;
  const provider = user.app_metadata?.provider ?? "email";
  const providerLabel = PROVIDER_LABEL[provider] ?? provider;

  // 아직 한 글자도 안 친 칸을 빨갛게 칠하지 않는다 — 화면에 들어오자마자
  // 틀렸다고 말하는 폼이 된다
  const short = password.length > 0 && password.length < PASSWORD_MIN_LENGTH;
  const mismatch = confirm.length > 0 && password !== confirm;
  const invalid = validatePassword(password, confirm);
  const hint = short || mismatch ? invalid : null;

  function edited(set: (value: string) => void) {
    return (value: string) => {
      // 방금 바꾼 값 옆에 직전 "변경됨"이 남아 있으면 안 된다
      setDone(false);
      setError(null);
      set(value);
    };
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
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
      setDone(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SettingRow label="이메일">
        <ReadOnlyValue>{user.email}</ReadOnlyValue>
      </SettingRow>

      {provider !== "email" ? (
        <SettingRow
          label="비밀번호"
          help={`${providerLabel} 계정으로 로그인 중입니다 — 비밀번호는 해당 서비스에서 관리합니다`}
        >
          <Badge tone="neutral">{providerLabel}</Badge>
        </SettingRow>
      ) : (
        <form onSubmit={onSubmit} className={cn(SETTING_ROW, "grid gap-[9px]")}>
          <p className="text-body font-bold text-fg-strong">비밀번호 변경</p>
          <input
            type="password"
            autoComplete="new-password"
            aria-label="새 비밀번호"
            placeholder={`새 비밀번호 · ${PASSWORD_MIN_LENGTH}자 이상`}
            value={password}
            onChange={(e) => edited(setPassword)(e.target.value)}
            className={cn(
              FIELD,
              "border",
              short ? "border-danger-line" : "border-line-default",
            )}
          />
          <input
            type="password"
            autoComplete="new-password"
            aria-label="새 비밀번호 확인"
            placeholder="새 비밀번호 확인"
            value={confirm}
            onChange={(e) => edited(setConfirm)(e.target.value)}
            className={cn(
              FIELD,
              "border",
              mismatch ? "border-danger-line" : "border-line-default",
            )}
          />
          {(error ?? hint) && (
            <p role="alert" className="text-caption font-semibold text-danger-fg">
              {error ?? hint}
            </p>
          )}
          {done && (
            <p role="status" className="text-caption font-bold text-ok-fg">
              변경됨
            </p>
          )}
          <div>
            <Button
              type="submit"
              variant="outline"
              size="md"
              disabled={invalid !== null || busy}
            >
              변경
            </Button>
          </div>
        </form>
      )}
    </>
  );
}

/**
 * 장부 전체를 엑셀 한 파일로. 기간은 "처음부터 오늘까지"다 —
 * 시작 하한(2000-01-01)은 장부가 존재할 수 없는 과거라 사실상 전체와 같다.
 */
function ExportRow() {
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

  // 실패는 설명 자리에 색만 바꿔 얹는다. 행 밖에 따로 띄우면 어느 항목이
  // 실패했는지가 사라진다
  const help = error ? (
    <span role="alert" className="font-semibold text-danger-fg">
      {error}
    </span>
  ) : loading ? (
    "장부를 세는 중…"
  ) : ledgerError ? (
    ledgerError
  ) : entries.length === 0 ? (
    "내보낼 장부가 없습니다"
  ) : (
    "전 기간 장부를 .xlsx 로 내려받습니다"
  );

  return (
    <SettingRow label="장부 전체 엑셀 내보내기" help={help}>
      <Button
        variant="outline"
        size="sm"
        disabled={!ready || busy}
        onClick={onExport}
      >
        내보내기
      </Button>
    </SettingRow>
  );
}
