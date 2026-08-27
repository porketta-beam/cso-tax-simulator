import { Badge, Button, Card, Icon } from "@/components/design-system";
import { AppShell } from "@/components/screens/app-shell";
import { ADVISORS } from "@/config/mock-catalog";

/**
 * A1 세무사 추천 (기능정의 v2 §3) — **목업**
 *
 * 탭이 아니라 홈·결과에서 들어오는 화면이라 뒤로가 있다. 실제 세무사 명단은
 * 아직 없고, 상담 요청은 mailto 한 줄이 전부다 — 예약 시스템을 흉내 내면
 * 연결되지 않는 폼에 사용자가 정보를 남긴다.
 */
export default function AdvisorScreen() {
  return (
    <AppShell title="세무사 추천" back="/">
      <div>
        <h2 className="text-h2 font-black tracking-tight text-fg-strong">
          CSO를 아는 세무사
        </h2>
        <p className="mt-1.5 text-caption leading-normal text-fg-secondary">
          수수료 매출과 불공제 판정을 이미 다뤄 본 세무사만 모았습니다.
        </p>
      </div>

      {ADVISORS.map((advisor) => (
        <Card key={advisor.name}>
          <div className="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className="flex size-[46px] shrink-0 items-center justify-center rounded-pill bg-surface-sunken text-[24px] leading-none"
            >
              {advisor.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-body font-bold text-fg-strong">
                  {advisor.name}
                </p>
                {advisor.verified && (
                  <Badge tone="mint">
                    <Icon name="check" size={12} />
                    검증
                  </Badge>
                )}
              </div>
              {/* 전문 분야가 이름 다음으로 굵다 — 이 목록에서 고르는 기준이다 */}
              <p className="mt-1 text-caption font-bold text-fg-default">
                {advisor.specialty}
              </p>
              <p className="mt-0.5 text-caption text-fg-faint">{advisor.region}</p>
              <p className="mt-1.5 text-caption leading-normal text-fg-secondary">
                {advisor.intro}
              </p>
              <div className="mt-3">
                <Button variant="outline" size="sm" asChild>
                  <a href={advisor.href}>상담 요청</a>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}

      <p className="mt-1 text-center text-caption text-fg-faint">
        상담 요청은 이메일로 연결됩니다
      </p>
    </AppShell>
  );
}
