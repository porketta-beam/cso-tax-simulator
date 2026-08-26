import { AppShell } from "@/components/screens/app-shell";
import { Card } from "@/components/design-system";

/** P1 쇼핑 홈 — 상품 카드 목업은 PR D 에서 */
export default function ShopScreen() {
  return (
    <AppShell title="쇼핑">
      <Card elevation="none">
        <p className="text-caption leading-normal text-fg-secondary">준비 중</p>
      </Card>
    </AppShell>
  );
}
