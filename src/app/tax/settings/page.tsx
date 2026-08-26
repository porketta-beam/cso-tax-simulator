"use client";

import * as React from "react";
import { useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";

import { Button, Card, FieldBlock, SegmentedToggle } from "@/components/design-system";
import { AppShell } from "@/components/screens/app-shell";
import {
  PENSION_MONTHLY_INCOME_CAP,
  TAX_RATES_EFFECTIVE_DATE,
  type BusinessType,
} from "@/config/tax-rates";
import type { LedgerSettings } from "@/lib/ledger/model";
import { formatKRW } from "@/lib/tax/money";
import { cn } from "@/lib/utils";
import { useSettings } from "@/state/use-settings";

/**
 * T2-1 계산 설정 (기능정의 v2 §3)
 *
 * 앱 전반 설정이 아니라 **계산 결과를 바꾸는 값들**이다. 그래서 결과 화면의
 * ⚙ 에서 들어오고, 제목도 "계산 설정"이다.
 *
 * 탭이 아니라 그 위에 얹히는 화면이라 자기 셸을 직접 그린다
 * (`/tax/layout.tsx` 는 탭 경로가 아니면 그대로 통과시킨다).
 */
export default function SettingsPage() {
  // useSearchParams 는 프리렌더에서 Suspense 경계를 요구한다
  return (
    <React.Suspense fallback={<Shell back="/tax/result">불러오는 중…</Shell>}>
      <SettingsScreen />
    </React.Suspense>
  );
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 어디서 들어왔는지 — 결과(⚙)와 내 정보 두 곳이다.
 *
 * 결과에서 왔다면 보고 있던 기간을 그대로 돌려준다. 기간을 잃으면 설정 한 줄
 * 고치고 돌아왔을 때 화면이 이번 달로 리셋된다.
 */
function backHref(params: ReadonlyURLSearchParams): string {
  const from = params.get("from");
  if (from === "account") return "/account";

  const to = params.get("to");
  return from && to && ISO_DATE.test(from) && ISO_DATE.test(to)
    ? `/tax/result?from=${from}&to=${to}`
    : "/tax/result";
}

function SettingsScreen() {
  const back = backHref(useSearchParams());
  const { settings, loading, error, save } = useSettings();

  // 처음 읽는 동안만 폼을 감춘다. 저장 뒤 재조회에도 이 화면을 갈아 끼우면
  // 폼이 통째로 다시 마운트되면서 방금 띄운 "저장됨"이 사라진다
  if (loading && !settings) return <Shell back={back}>불러오는 중…</Shell>;
  if (!settings) {
    return (
      <AppShell title="계산 설정" back={back}>
        <Card tone="danger" elevation="none">
          <p className="text-caption leading-normal">
            {error ?? "설정을 불러오지 못했습니다"}
          </p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="계산 설정" back={back}>
      {/* 폼은 설정을 다 읽은 뒤에야 마운트된다 — 그래야 초기값을 effect 로
          집어넣지 않아도 되고, 저장한 적 없는 기본값이 잠깐 비치지도 않는다 */}
      <SettingsForm initial={settings} save={save} />
    </AppShell>
  );
}

const FIELD = cn(
  "num h-tap-min w-full rounded-sm border border-line-default bg-surface-card px-3",
  "text-body font-semibold text-fg-strong",
  "outline-none focus-visible:border-action focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus-ring)]",
);

function SettingsForm({
  initial,
  save,
}: {
  initial: LedgerSettings;
  save: (patch: Partial<LedgerSettings>) => Promise<void>;
}) {
  const [businessType, setBusinessType] = React.useState<BusinessType>(
    initial.businessType,
  );
  const [pensionCapEnabled, setPensionCapEnabled] = React.useState(
    initial.pensionCapEnabled,
  );
  // 사용자는 3.3(%) 을 보고, 저장은 0.033 으로 한다. 입력 중간 상태("3.")를
  // 허용해야 하므로 문자열로 들고 있다가 저장할 때 한 번만 해석한다
  const [withholding, setWithholding] = React.useState(
    String(Math.round(initial.withholdingRate * 1000) / 10),
  );
  const [dependents, setDependents] = React.useState(String(initial.dependents));

  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSave() {
    const percent = Number(withholding);
    const people = Number(dependents);
    setStatus(null);

    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setError("원천징수율은 0~100 사이의 숫자여야 합니다");
      return;
    }
    if (!Number.isInteger(people) || people < 0) {
      setError("부양가족 수는 0 이상의 정수여야 합니다");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await save({
        businessType,
        pensionCapEnabled,
        // 소수 넷째 자리까지 — DB 컬럼이 numeric(5,4) 다
        withholdingRate: Math.round(percent * 100) / 10000,
        dependents: people,
      });
      setStatus("저장됨");
    } catch {
      setError("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  // 값을 만지면 직전 저장 알림은 지운다 — 안 지우면 안 저장한 값 옆에
  // "저장됨"이 남아 저장했다고 믿게 된다
  function edited<T>(set: (value: T) => void) {
    return (value: T) => {
      setStatus(null);
      set(value);
    };
  }

  return (
    <>
      <Card>
        <FieldBlock title="사업자 유형" desc="세율표를 고릅니다. 개인은 종합소득세 8구간, 법인은 법인세 4구간.">
          <SegmentedToggle
            label="사업자 유형"
            size="lg"
            value={businessType}
            onChange={edited<BusinessType>(setBusinessType)}
            options={[
              { value: "individual", label: "개인" },
              { value: "corporate", label: "법인" },
            ]}
          />
        </FieldBlock>
      </Card>

      <Card>
        <FieldBlock title="4대보험">
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={pensionCapEnabled}
              onChange={(e) => edited(setPensionCapEnabled)(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-[var(--action-primary)]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-fg-strong">
                국민연금 상한 적용
              </span>
              <span className="block text-caption leading-normal text-fg-secondary">
                월 {formatKRW(PENSION_MONTHLY_INCOME_CAP)}원 상한. 끄면 급여 전액이
                기준이 되어 고소득 정규직에서 국민연금이 과대계상됩니다.
              </span>
            </span>
          </label>
        </FieldBlock>
      </Card>

      <Card>
        <FieldBlock title="프리랜서 원천징수율" desc="기본 3.3% (소득세 3% + 지방소득세 0.3%). 결과 화면에는 참고 금액으로만 표시됩니다.">
          <label className="flex items-center gap-2.5">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="100"
              value={withholding}
              onChange={(e) => edited(setWithholding)(e.target.value)}
              aria-label="프리랜서 원천징수율 (%)"
              className={cn(FIELD, "max-w-[140px]")}
            />
            <span className="text-body font-bold text-fg-default">%</span>
          </label>
        </FieldBlock>
      </Card>

      <Card>
        <FieldBlock title="부양가족 수" desc="본인 제외. 기본공제 150만원 × (본인 + 부양가족) 이 연환산 과세표준에서 빠집니다. 법인은 적용되지 않습니다.">
          <label className="flex items-center gap-2.5">
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              value={dependents}
              onChange={(e) => edited(setDependents)(e.target.value)}
              aria-label="부양가족 수"
              className={cn(FIELD, "max-w-[140px]")}
            />
            <span className="text-body font-bold text-fg-default">명</span>
          </label>
        </FieldBlock>
      </Card>

      <Card tone="sunken" elevation="none">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-fg-strong">세율표 기준일</span>
          <span className="num text-sm font-bold text-fg-secondary">
            {TAX_RATES_EFFECTIVE_DATE}
          </span>
        </div>
        <p className="mt-1.5 text-caption leading-normal text-fg-secondary">
          세율·요율은 앱이 관리합니다. 개정되면 이 날짜가 바뀝니다.
        </p>
      </Card>

      <Button variant="primary" size="xl" fullWidth disabled={busy} onClick={onSave}>
        저장
      </Button>

      {error && (
        <p role="alert" className="text-caption leading-normal text-danger-fg">
          {error}
        </p>
      )}
      {status && (
        <p role="status" className="text-caption leading-normal font-bold text-ok-fg">
          {status}
        </p>
      )}
    </>
  );
}

function Shell({ back, children }: { back: string; children: React.ReactNode }) {
  return (
    <AppShell title="계산 설정" back={back}>
      <Card elevation="none">
        <p className="text-caption leading-normal text-fg-secondary">{children}</p>
      </Card>
    </AppShell>
  );
}
