"use client";

import Link from "next/link";

import {
  Badge,
  Button,
  Card,
  Icon,
  SegmentedToggle,
  StorageBanner,
} from "@/components/design-system";
import { SectionLabel } from "@/components/screens/screen-shell";
import { useAuth } from "@/state/auth-context";
import { useSimulator } from "@/state/simulator-context";
import type { BusinessType } from "@/state/simulator-reducer";
import type { PeriodMode } from "@/config/tax-rates";

/** S-00 · 시작 (PRD §6.2) */

const PROMISE = [
  {
    icon: "receipt",
    title: "매출·증빙 입력",
    desc: "VAT 포함 총액만 넣으면 공급가액을 역산",
  },
  {
    icon: "users",
    title: "인건비·고정비",
    desc: "프리랜서 3.3%와 정규직 4대보험을 분리",
  },
  {
    icon: "calculator",
    title: "과세표준·세율",
    desc: "현행 8구간 누진세율 + 연환산 적용",
  },
  { icon: "wallet", title: "Net Cash", desc: "내 통장에 실제로 남는 돈" },
] as const;

export default function StartScreen() {
  const { state, dispatch } = useSimulator();
  const { user } = useAuth();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-surface-app">
      <main className="grid flex-1 content-start gap-5 px-gutter pt-7 pb-4 grid-cols-[minmax(0,1fr)]">
        {/* 로그인은 선택이다. 안 해도 아래 위저드는 그대로 동작한다 */}
        <p className="-mb-2 truncate text-right text-caption">
          <Link
            href={user ? "/account" : "/login"}
            className="font-bold text-fg-link underline"
          >
            {user ? `${user.email} · 내 계정` : "로그인"}
          </Link>
        </p>

        <div>
          <Badge tone="neutral">CSO 세무 시뮬레이터</Badge>
          <h1 className="mt-3.5 text-h1 leading-snug font-black tracking-tight text-fg-strong">
            네 칸만 채우면,
            <br />
            <span className="text-money-net">남는 돈</span>까지 보여드립니다
          </h1>
          <p className="mt-2.5 text-body leading-body text-fg-secondary">
            매출·증빙·인건비·고정비만 넣으면 VAT 역산부터 종합소득세, 4대보험, 그리고
            신고 때 미리 빼둘 금액까지 자동으로 계산합니다.
          </p>
        </div>

        <Card padded={false} className="overflow-hidden">
          {PROMISE.map((step, i) => (
            <div
              key={step.title}
              className={
                "flex items-center gap-3 px-card py-3.5" +
                (i < PROMISE.length - 1 ? " border-b border-line-subtle" : "")
              }
            >
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-sm bg-surface-sunken">
                <Icon name={step.icon} size={17} className="text-fg-default" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-fg-strong">{step.title}</p>
                <p className="text-caption leading-snug text-fg-secondary">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </Card>

        <div>
          <SectionLabel>사업자 유형</SectionLabel>
          <div className="mt-2">
            <SegmentedToggle
              label="사업자 유형"
              size="lg"
              value={state.businessType}
              onChange={(businessType: BusinessType) =>
                dispatch({ type: "SET_BUSINESS_TYPE", businessType })
              }
              options={[
                { value: "individual", label: "개인사업자" },
                { value: "corporate", label: "법인사업자" },
              ]}
            />
          </div>
          {state.businessType === "corporate" && (
            <Card tone="warn" elevation="none" className="mt-2.5">
              <p className="text-caption leading-normal">
                법인사업자 계산 로직은 준비 중입니다. 지금은 개인사업자(종합소득세) 기준으로
                계산됩니다.
              </p>
            </Card>
          )}
        </div>

        <div>
          <SectionLabel>입력 기간</SectionLabel>
          <div className="mt-2">
            <SegmentedToggle
              label="입력 기간"
              size="lg"
              value={state.periodMode}
              onChange={(mode: PeriodMode) =>
                dispatch({ type: "SET_PERIOD_MODE", mode })
              }
              options={[
                { value: "month", label: "월간" },
                { value: "quarter", label: "분기" },
                { value: "year", label: "연간" },
              ]}
            />
          </div>
          {state.periodMode !== "year" && (
            <p className="mt-2.5 text-caption leading-normal text-warn-fg">
              종합소득세는 연 단위 누진과세입니다. 입력한 금액을 연환산해 세율을 적용한
              뒤 다시 기간분으로 나눠 보여드립니다.
            </p>
          )}
        </div>

        <StorageBanner variant="ios-tab" />
      </main>

      <footer className="shrink-0 border-t border-line-subtle bg-surface-card px-gutter pt-3 pb-[max(22px,env(safe-area-inset-bottom))]">
        <Button variant="primary" size="xl" fullWidth asChild>
          <Link href="/revenue">
            시작하기
            <Icon name="chevron-right" />
          </Link>
        </Button>
        <p className="mt-2.5 text-center text-micro leading-normal text-fg-faint">
          입력한 내용은 이 기기 안에만 저장되며 외부로 전송되지 않습니다
        </p>
      </footer>
    </div>
  );
}
