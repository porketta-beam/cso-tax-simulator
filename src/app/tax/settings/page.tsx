import { AppShell } from "@/components/screens/app-shell";
import { Card } from "@/components/design-system";

/** T2-1 설정 — 사업자 유형·연금 상한·원천징수율·부양가족은 PR C 에서 */
export default function SettingsScreen() {
  return (
    <AppShell title="설정" back="/tax/result">
      <Card elevation="none">
        <p className="text-caption leading-normal text-fg-secondary">준비 중</p>
      </Card>
    </AppShell>
  );
}
