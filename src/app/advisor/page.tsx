import { AppShell } from "@/components/screens/app-shell";
import { Card } from "@/components/design-system";

/** A1 세무사 추천 — 탭이 아니라 홈에서 들어오는 화면이라 뒤로가 있다 */
export default function AdvisorScreen() {
  return (
    <AppShell title="세무사 추천" back="/">
      <Card elevation="none">
        <p className="text-caption leading-normal text-fg-secondary">준비 중</p>
      </Card>
    </AppShell>
  );
}
