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
      <p className="text-caption leading-body text-fg-secondary">
        <span className="font-bold text-fg-strong">CSO를 아는 세무사</span> 를 모았습니다.
        수수료 구조와 원천징수를 설명하지 않아도 되는 분들입니다.
      </p>

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
              <div className="flex items-center gap-1.5">
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
              <p className="mt-[3px] text-caption leading-normal text-fg-secondary">
                {advisor.specialty} · {advisor.region}
              </p>
              <p className="mt-1.5 text-caption leading-normal text-fg-default">
                {advisor.intro}
              </p>
            </div>
          </div>

          <Button variant="outline" size="lg" fullWidth className="mt-3.5" asChild>
            <a href={advisor.href}>상담 요청</a>
          </Button>
        </Card>
      ))}

      <p className="px-2 text-center text-micro leading-body text-fg-faint">
        상담 요청은 이메일로 연결됩니다.
      </p>
    </AppShell>
  );
}
