"use client";

import { AppShell, NavCard } from "@/components/screens/app-shell";

/**
 * H0 홈 (기능정의 v2 §3)
 *
 * 지금은 갈 곳만 걸어 둔 조립본이다. 이번 달 Net Cash·세후 마진·올해 누계
 * 요약 카드는 장부 데이터층이 붙은 뒤 PR D 에서 채운다.
 */
export default function HomeScreen() {
  return (
    <AppShell title="홈">
      <NavCard
        href="/tax/result"
        icon="wallet"
        label="세무 요약"
        desc="이번 달 남는 돈과 올해 누계"
      />
      <NavCard
        href="/shop"
        icon="shopping-bag"
        label="추천 상품"
        desc="CSO에게 필요한 상품 모음"
      />
      <NavCard
        href="/advisor"
        icon="users"
        label="세무사 추천"
        desc="신고는 세무사와 함께"
      />
    </AppShell>
  );
}
