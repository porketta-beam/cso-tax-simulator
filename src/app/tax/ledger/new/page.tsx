import { AppShell } from "@/components/screens/app-shell";
import { Card } from "@/components/design-system";

/** T1-a 추가 폼 — PR B 에서 채운다 */
export default function LedgerNewScreen() {
  return (
    <AppShell title="내역 추가" back="/tax/ledger">
      <Card elevation="none">
        <p className="text-caption leading-normal text-fg-secondary">준비 중</p>
      </Card>
    </AppShell>
  );
}
