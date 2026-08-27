"use client";

import * as React from "react";
import { useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";

import {
  Button,
  Card,
  ReadOnlyValue,
  SegmentedToggle,
  SettingGroup,
  SettingRow,
  Stepper,
  Toggle,
} from "@/components/design-system";
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
 * T2-1 계산 설정 (기능정의 v2 §3 · 4차 시안 S1)
 *
 * 앱 전반 설정이 아니라 **계산 결과를 바꾸는 값들**이다. 그래서 결과 화면의
 * ⚙ 에서 들어오고, 제목도 "계산 설정"이다.
 *
 * 저장은 하단 [저장] 하나로 한꺼번에 커밋한다 — 항목마다 즉시 저장하면 값 네
 * 개를 고치는 동안 세율표가 네 번 바뀐 중간 상태가 생긴다. 그래서 탭을 숨기고
 * 그 자리를 저장 버튼이 차지한다.
 */
export default function SettingsPage() {
  // useSearchParams 는 프리렌더에서 Suspense 경계를 요구한다
  return (
    <React.Suspense fallback={<LoadingScreen back="/tax/result" />}>
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

/** 행마다 딸리는 설명. 로딩 뼈대와 폼이 같은 문장을 써야 해서 밖에 둔다. */
const HELP = {
  individual: "종합소득세 8구간으로 계산합니다",
  corporate: "법인세 4구간으로 계산합니다",
  dependents: "기본공제 150만원 × (본인 1 + 부양가족). 본인은 제외하고 넣으세요",
  dependentsCorporate: "법인은 해당 없음",
  withholding: "프리랜서 인건비에서 미리 떼는 세금 · 소득세 3% + 지방소득세 0.3%",
  pensionCap: `켜면 정규직 급여의 국민연금을 기준소득월액 상한(월 ${formatKRW(
    PENSION_MONTHLY_INCOME_CAP,
  )}원)까지만 계산합니다`,
  effectiveDate: "이 앱이 쓰는 세율표의 기준일입니다. 바꿀 수 없습니다",
} as const;

function SettingsScreen() {
  const back = backHref(useSearchParams());
  const { settings, loading, error, save } = useSettings();

  // 처음 읽는 동안만 폼을 감춘다. 저장 뒤 재조회에도 이 화면을 갈아 끼우면
  // 폼이 통째로 다시 마운트되면서 방금 띄운 "저장됨"이 사라진다
  if (loading && !settings) return <LoadingScreen back={back} />;
  if (!settings) {
    return (
      <AppShell title="계산 설정" back={back} hideTabs>
        <Card tone="danger" elevation="none">
          <p className="text-caption leading-normal">
            {error ?? "설정을 불러오지 못했습니다"}
          </p>
        </Card>
      </AppShell>
    );
  }

  // 폼은 설정을 다 읽은 뒤에야 마운트된다 — 그래야 초기값을 effect 로
  // 집어넣지 않아도 되고, 저장한 적 없는 기본값이 잠깐 비치지도 않는다
  return <SettingsForm back={back} initial={settings} save={save} />;
}

/** 사용자에겐 3.3(%), 저장은 0.033. 입력 중간 상태("3.")를 허용해야 해서 문자열이다 */
function percentText(rate: number): string {
  return String(Math.round(rate * 1000) / 10);
}

/** 소수 넷째 자리까지 — DB 컬럼이 numeric(5,4) 다 */
function toRate(percent: number): number {
  return Math.round(percent * 100) / 10000;
}

function SettingsForm({
  back,
  initial,
  save,
}: {
  back: string;
  initial: LedgerSettings;
  save: (patch: Partial<LedgerSettings>) => Promise<void>;
}) {
  // 저장에 성공한 시점의 값. "고친 게 있는가"는 이것과의 비교로만 판정한다 —
  // 별도 dirty 플래그를 두면 원래 값으로 되돌린 것도 고친 것으로 남는다
  const [saved, setSaved] = React.useState<LedgerSettings | null>(null);
  const baseline = saved ?? initial;

  const [businessType, setBusinessType] = React.useState<BusinessType>(
    initial.businessType,
  );
  const [pensionCapEnabled, setPensionCapEnabled] = React.useState(
    initial.pensionCapEnabled,
  );
  const [withholding, setWithholding] = React.useState(
    percentText(initial.withholdingRate),
  );
  const [dependents, setDependents] = React.useState(initial.dependents);

  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const isCorporate = businessType === "corporate";
  const dirty =
    businessType !== baseline.businessType ||
    pensionCapEnabled !== baseline.pensionCapEnabled ||
    dependents !== baseline.dependents ||
    toRate(Number(withholding)) !== baseline.withholdingRate;

  async function onSave() {
    const percent = Number(withholding);

    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setError("원천징수율은 0~100 사이의 숫자여야 합니다");
      return;
    }
    if (!Number.isInteger(dependents) || dependents < 0) {
      setError("부양가족 수는 0 이상의 정수여야 합니다");
      return;
    }

    const next: LedgerSettings = {
      businessType,
      pensionCapEnabled,
      withholdingRate: toRate(percent),
      dependents,
    };

    setError(null);
    setBusy(true);
    try {
      await save(next);
      // 저장한 값을 그대로 기준으로 삼는다. 서버 재조회를 기다리면 그 사이
      // 버튼이 잠깐 다시 눌리는 상태가 된다
      setSaved(next);
      setWithholding(percentText(next.withholdingRate));
    } catch {
      setError("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="계산 설정"
      back={back}
      hideTabs
      footer={
        <div className="grid gap-1.5">
          {error && (
            <p
              role="alert"
              className="text-center text-caption font-semibold text-danger-fg"
            >
              {error}
            </p>
          )}
          {/* 값을 만지면 저절로 사라진다 — 안 지우면 저장하지 않은 값 옆에
              "저장됨"이 남아 저장했다고 믿게 된다 */}
          {saved && !dirty && (
            <p role="status" className="text-center text-caption font-bold text-ok-fg">
              저장됨
            </p>
          )}
          <Button
            variant="primary"
            size="xl"
            fullWidth
            disabled={!dirty || busy}
            onClick={onSave}
          >
            저장
          </Button>
        </div>
      }
    >
      <SettingGroup title="사업자">
        <SettingRow
          label="사업자 유형"
          help={isCorporate ? HELP.corporate : HELP.individual}
        >
          <div className="w-[150px] shrink-0">
            <SegmentedToggle
              label="사업자 유형"
              size="md"
              value={businessType}
              onChange={setBusinessType}
              options={[
                { value: "individual", label: "개인" },
                { value: "corporate", label: "법인" },
              ]}
            />
          </div>
        </SettingRow>
        {/* 법인세에는 기본공제가 없다 — 만질 수 있게 두면 넣은 숫자가 결과에
            반영되지 않는 이유를 알 길이 없다 */}
        <SettingRow
          label="부양가족 수"
          disabled={isCorporate}
          help={isCorporate ? HELP.dependentsCorporate : HELP.dependents}
        >
          <Stepper
            label="부양가족 수"
            value={dependents}
            onChange={setDependents}
            min={0}
            disabled={isCorporate}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="인건비 · 보험">
        <SettingRow label="프리랜서 원천징수율" help={HELP.withholding}>
          <span className="flex shrink-0 items-center gap-1.5">
            <input
              type="text"
              inputMode="decimal"
              value={withholding}
              onChange={(e) => setWithholding(e.target.value)}
              aria-label="프리랜서 원천징수율 (%)"
              className={cn(
                "num h-[38px] w-[68px] min-w-0 rounded-md px-2.5 text-right",
                "border border-line-default bg-surface-card",
                "text-body font-bold text-fg-strong",
                "outline-none focus-visible:border-action focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus-ring)]",
              )}
            />
            <span className="text-body font-bold text-fg-secondary">%</span>
          </span>
        </SettingRow>
        <SettingRow label="국민연금 상한 적용" help={HELP.pensionCap}>
          <Toggle
            label="국민연금 상한 적용"
            on={pensionCapEnabled}
            onChange={setPensionCapEnabled}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="기준">
        <SettingRow label="세율표 기준일" help={HELP.effectiveDate}>
          <ReadOnlyValue>{TAX_RATES_EFFECTIVE_DATE}</ReadOnlyValue>
        </SettingRow>
      </SettingGroup>
    </AppShell>
  );
}

/** 값을 아직 못 읽은 동안. 구조는 그대로 두고 값 자리만 비운다 */
function LoadingScreen({ back }: { back: string }) {
  const bar = (width: string) => (
    <div className={cn("h-3.5 shrink-0 rounded-sm bg-ink-100", width)} />
  );

  return (
    <AppShell title="계산 설정" back={back} hideTabs>
      <SettingGroup title="사업자">
        <SettingRow label="사업자 유형">{bar("w-[150px]")}</SettingRow>
        <SettingRow label="부양가족 수">{bar("w-[110px]")}</SettingRow>
      </SettingGroup>

      <SettingGroup title="인건비 · 보험">
        <SettingRow label="프리랜서 원천징수율" help={HELP.withholding}>
          {bar("w-[68px]")}
        </SettingRow>
        <SettingRow label="국민연금 상한 적용">{bar("w-[50px]")}</SettingRow>
      </SettingGroup>

      <SettingGroup title="기준">
        <SettingRow label="세율표 기준일" help={HELP.effectiveDate}>
          <ReadOnlyValue>{TAX_RATES_EFFECTIVE_DATE}</ReadOnlyValue>
        </SettingRow>
      </SettingGroup>
    </AppShell>
  );
}
