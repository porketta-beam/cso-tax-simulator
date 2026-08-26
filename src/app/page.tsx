import {
  AccountantBanner,
  ProductRail,
  SectionHead,
} from "@/components/home/sections";
import { TaxSummaryCard } from "@/components/home/tax-summary-card";
import { AppShell } from "@/components/screens/app-shell";

/**
 * H0 홈 (기능정의 v2 §3)
 *
 * 대시보드다 — 이번 달 세무 요약 하나, 그 아래 상품·세무사. 세 블록 모두
 * 탭하면 각자의 화면으로 들어간다.
 *
 * `/tax` 아래가 아니라 루트라 자기 셸을 직접 그린다.
 */
export default function HomeScreen() {
  return (
    <AppShell title="홈">
      <TaxSummaryCard />

      <SectionHead title="CSO에게 추천하는 상품" href="/shop" action="전체 보기" />
      <ProductRail />

      <SectionHead title="세무사 상담" />
      <AccountantBanner />
    </AppShell>
  );
}
