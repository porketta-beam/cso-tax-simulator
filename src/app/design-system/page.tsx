"use client";

import * as React from "react";

import {
  Badge,
  BracketBar,
  BreakdownRow,
  Button,
  Card,
  FieldBlock,
  Icon,
  LineItemRow,
  Money,
  MoneyInput,
  NetCashHero,
  ReserveCard,
  SegmentedToggle,
  StepIndicator,
  StorageBanner,
} from "@/components/design-system";
import { INCOME_TAX_BRACKETS, TAX_RATES_EFFECTIVE_DATE } from "@/config/tax-rates";
import { formatKRW } from "@/lib/tax/money";
import { simulate } from "@/lib/tax/pipeline";
import type { StorageBannerVariant } from "@/components/design-system";

/**
 * 디자인 시스템 갤러리
 *
 * CTveiw 의 프리뷰 카드(`components/<group>/<group>.card.html`)를 앱 안으로
 * 옮긴 것이다. 컴포넌트를 고치면 여기서 바로 확인할 수 있어야 리뷰가 된다.
 * 화면(S-00~S-08)과 달리 제품 기능이 아니므로 라우팅에 노출하지 않는다.
 */

/** 갤러리에 쓸 예시 결과 — PRD §5 검증 벡터와 동일한 입력 */
const DEMO = simulate({
  periodMode: "quarter",
  periodLabel: "2026 Q2",
  revenue: 120_000_000,
  qualifiedEvidence: 28_000_000,
  freelancerPay: 30_000_000,
  salary: 12_000_000,
  fixedCost: 6_300_000,
  nonDeductibleCost: 3_200_000,
});

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-h2 font-black tracking-tight text-fg-strong">{title}</h2>
        {desc && (
          <p className="mt-1 text-caption leading-normal text-fg-secondary">{desc}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemGallery() {
  const [amount, setAmount] = React.useState<number | "">(120_000_000);
  const [period, setPeriod] = React.useState<"month" | "quarter" | "year">("quarter");
  const [banner, setBanner] = React.useState<StorageBannerVariant>("ios-tab");
  const [step, setStep] = React.useState(1);

  const supply = Math.floor(Number(amount || 0) / 1.1);

  return (
    <main className="mx-auto grid max-w-md gap-8 px-gutter py-8">
      <header>
        <Badge tone="blue">기준일 {TAX_RATES_EFFECTIVE_DATE}</Badge>
        <h1 className="mt-3 text-h1 leading-snug font-black tracking-tight text-fg-strong">
          디자인 시스템
        </h1>
        <p className="mt-2 text-body leading-normal text-fg-secondary">
          CTveiw 포팅본. 금액은 <code className="num">Money</code> 로만 찍고, 색은
          role 이 정한다.
        </p>
      </header>

      <Section
        title="Money"
        desc="role 이 돈의 성격을 정한다. 임의 색 금지."
      >
        <Card className="grid gap-2">
          {(["net", "in", "out", "tax", "reserve"] as const).map((role) => (
            <div key={role} className="flex items-baseline justify-between gap-3">
              <span className="num text-caption text-fg-faint">{role}</span>
              <Money value={23_283_304} role={role} size="md" />
            </div>
          ))}
        </Card>
        <Card className="flex flex-wrap items-baseline justify-between gap-3">
          <Money value={1_234_567} role="in" size="sm" />
          <Money value={1_234_567} role="in" size="md" />
          <Money value={1_234_567} role="in" size="lg" />
        </Card>
      </Section>

      <Section title="Button" desc="조작은 블루 하나. 주 CTA 는 xl + fullWidth.">
        <Card className="grid gap-2.5">
          <Button variant="primary" size="xl" fullWidth>
            시작하기
            <Icon name="chevron-right" />
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="lg">
              이전
            </Button>
            <Button variant="outline" size="lg">
              인쇄
            </Button>
            <Button variant="ghost" size="lg">
              더 보기
            </Button>
          </div>
          <Button variant="ink" size="md" fullWidth>
            잉크
          </Button>
          <Button variant="primary" size="lg" fullWidth disabled>
            비활성
          </Button>
        </Card>
      </Section>

      <Section title="Badge" desc="배지는 판정 결과다. 장식으로 쓰지 말 것.">
        <Card className="flex flex-wrap gap-2">
          <Badge tone="mint">
            <Icon name="check" /> 공제
          </Badge>
          <Badge tone="red">
            <Icon name="x" /> 불공제
          </Badge>
          <Badge tone="amber">확인 필요</Badge>
          <Badge tone="blue">기준일 2026-01-01</Badge>
          <Badge tone="neutral">
            <Icon name="plus" /> 항목 추가
          </Badge>
          <Badge tone="mint" variant="solid">
            solid
          </Badge>
        </Card>
      </Section>

      <Section title="Card" desc="구분은 테두리가 아니라 elevation 이 한다.">
        <div className="grid gap-3">
          <Card>기본 · shadow-sm</Card>
          <Card tone="sunken" elevation="none">
            sunken · elevation none
          </Card>
          <Card tone="ok" elevation="none">
            ok — 의미가 있을 때만 색 테두리
          </Card>
          <Card tone="warn" elevation="none">
            warn
          </Card>
          <Card tone="danger" elevation="none">
            danger
          </Card>
        </div>
      </Section>

      <Section title="MoneyInput · FieldBlock" desc="입력과 동시에 계산이 보인다.">
        <Card>
          <FieldBlock
            num="1"
            title="CSO 판매대행 수수료 수입"
            desc="원청에서 받은 VAT 포함 총액"
          >
            <MoneyInput
              value={amount}
              onChange={setAmount}
              aria-label="매출 금액"
              hint={`공급가액 ${formatKRW(supply)} · VAT ${formatKRW(Number(amount || 0) - supply)}`}
              hintTone="ok"
            />
          </FieldBlock>
        </Card>
        <Card>
          <FieldBlock num="2" title="오류 상태" desc="error 가 hint 를 대체한다">
            <MoneyInput
              value=""
              onChange={() => {}}
              aria-label="오류 예시"
              error="금액을 입력해 주세요"
            />
          </FieldBlock>
        </Card>
      </Section>

      <Section
        title="SegmentedToggle"
        desc="선택지가 계산을 크게 바꾸므로 항상 보이게 둔다. Radix RadioGroup 기반."
      >
        <Card className="grid gap-3">
          <SegmentedToggle
            label="입력 기간"
            size="lg"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "month", label: "월간" },
              { value: "quarter", label: "분기" },
              { value: "year", label: "연간" },
            ]}
          />
          <SegmentedToggle
            label="저장 환경"
            size="sm"
            value={banner}
            onChange={setBanner}
            options={[
              { value: "ios-tab", label: "iOS 탭" },
              { value: "in-app", label: "인앱" },
              { value: "blocked", label: "차단됨" },
            ]}
          />
        </Card>
      </Section>

      <Section title="StepIndicator" desc="사용자가 알아야 할 건 '얼마나 남았나' 하나다.">
        <Card className="grid gap-4">
          <StepIndicator
            steps={["매출·증빙", "인건비·고정비", "과세표준", "세율·보험", "결과"]}
            current={step}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              이전
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => Math.min(4, s + 1))}
            >
              다음
            </Button>
          </div>
        </Card>
      </Section>

      <Section title="LineItemRow" desc="표가 아니라 카드형 행. 모바일에서 가로 스크롤은 이탈이다.">
        <Card padded={false} className="overflow-hidden">
          <LineItemRow
            date="04.12"
            merchant="대웅제약 판촉물"
            amount={1_240_000}
            evidence="세금계산서"
            category="적격증빙"
            deductible
            onEdit={() => {}}
          />
          <LineItemRow
            date="04.18"
            merchant="○○의원 원장 미팅"
            amount={380_000}
            evidence="카드"
            category="접대비"
            deductible={false}
            onEdit={() => {}}
          />
        </Card>
      </Section>

      <Section title="BreakdownRow" desc="sub 에 산식을 그대로 적는다. 세무는 블랙박스면 안 된다.">
        <Card>
          <BreakdownRow
            label="매출 VAT"
            sub="120,000,000 ÷ 11"
            value={DEMO.stage02.revenueVat.vat}
            role="tax"
          />
          <BreakdownRow
            label="매입 VAT"
            sub="28,000,000 ÷ 11 · 적격증빙만"
            value={-DEMO.stage02.purchaseVat.vat}
            role="tax"
          />
          <BreakdownRow label="적격증빙 매입" value={DEMO.stage02.expenses.qualifiedSupply} indent={1} />
          <BreakdownRow
            label="납부 VAT (예상)"
            value={DEMO.stage02.vatPayable}
            role="tax"
            level="total"
          />
        </Card>
      </Section>

      <Section title="BracketBar" desc="8구간을 모바일에 욱여넣지 않는다. 적용 구간만 강조 + 자동 스크롤.">
        <Card>
          <BracketBar
            brackets={INCOME_TAX_BRACKETS}
            activeIndex={DEMO.stage03.bracketIndex}
            note="분기 과세표준을 연환산(×4)해 세율을 적용한 뒤 다시 ÷4 한 추정치입니다."
          />
        </Card>
      </Section>

      <Section title="NetCashHero" desc="제품 전체에서 가장 큰 글자. 이 조합은 여기서만 쓴다.">
        <NetCashHero
          value={DEMO.stage04.netCash}
          period={DEMO.input.periodLabel}
          totalRevenue={DEMO.stage04.inflow}
          marginRate={(DEMO.stage04.marginRate * 100).toFixed(1)}
        />
      </Section>

      <Section title="ReserveCard" desc="이 제품이 실제로 해결하는 문제는 계산이 아니라 세금 폭탄이다.">
        <ReserveCard
          items={DEMO.stage04.reserveItems}
          total={DEMO.stage04.reserveTotal}
        />
      </Section>

      <Section title="StorageBanner" desc="사용을 막지 않는다. 빠져나갈 길을 항상 붙인다.">
        <StorageBanner variant={banner} />
      </Section>
    </main>
  );
}
