import { AppShell } from "@/components/screens/app-shell";
import { Card } from "@/components/design-system";

/** T1-a 수정 폼 — PR B 에서 채운다. 행 id 는 그때 params 로 읽는다 */
export default function LedgerEditScreen() {
  return (
    <AppShell title="내역 수정" back="/tax/ledger">
      <Card elevation="none">
        <p className="text-caption leading-normal text-fg-secondary">준비 중</p>
      </Card>
    </AppShell>
  );
}
