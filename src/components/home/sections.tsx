import Link from "next/link";

import { Badge, Button, Card, Icon } from "@/components/design-system";
import { ADVISORS, PRODUCTS } from "@/config/mock-catalog";
import { cn } from "@/lib/utils";

/**
 * H0 홈의 하단 두 블록 — 추천 상품 레일 · 세무사 배너 (기능정의 v2 §3)
 *
 * 둘 다 목업 카탈로그(`@/config/mock-catalog`)만 읽는다. 서버를 타지 않으므로
 * 서버 컴포넌트로 둔다 — 홈이 장부를 기다리는 동안에도 이 부분은 이미 그려져
 * 있어서, 화면이 통째로 비어 보이지 않는다.
 */

const FOCUS = cn(
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
  "focus-visible:outline-[var(--focus-ring)]",
);

/** 섹션 제목 + 우측 "전체 보기" 링크 */
export function SectionHead({
  title,
  href,
  action,
}: {
  title: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="mt-2.5 flex items-baseline justify-between gap-2.5">
      <h2 className="min-w-0 text-h3 font-black tracking-tight text-fg-strong">
        {title}
      </h2>
      {href && action && (
        <Link
          href={href}
          className={cn("shrink-0 text-caption font-bold text-fg-link", FOCUS)}
        >
          {action}
        </Link>
      )}
    </div>
  );
}

/**
 * 가로 스크롤 상품 레일 — 앞의 3개만.
 *
 * 좌우 여백만큼 음수 마진을 줘 카드가 화면 끝까지 흘러 나가게 한다(더 있다는
 * 신호). 본문 그리드가 `minmax(0,1fr)` 이라 이 안쪽만 가로로 스크롤되고
 * 페이지 전체는 넘치지 않는다.
 */
export function ProductRail() {
  return (
    <div
      className={cn(
        "-mx-gutter flex gap-2.5 overflow-x-auto px-gutter pb-1",
        // 스크롤바가 카드 아래 여백을 먹으면 레일 높이가 들쭉날쭉해진다
        "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      )}
    >
      {PRODUCTS.slice(0, 3).map((product) => (
        <Link
          key={product.name}
          href="/shop"
          className={cn(
            "w-[196px] shrink-0 rounded-card bg-surface-card p-card shadow-sm",
            FOCUS,
          )}
        >
          <span aria-hidden="true" className="text-[26px] leading-none">
            {product.emoji}
          </span>
          <span className="mt-3 block text-body font-bold text-fg-strong">
            {product.name}
          </span>
          <span className="mt-1 block text-caption leading-normal text-fg-secondary">
            {product.desc}
          </span>
        </Link>
      ))}
    </div>
  );
}

/**
 * 세무사 배너 — 목록의 첫 세무사 한 명.
 *
 * 카드 본문은 목록(`/advisor`)으로, "상담 요청"은 곧바로 메일로 간다. 버튼을
 * 카드 링크 안에 넣지 않은 이유는 중첩된 링크가 유효하지 않기 때문이다 —
 * 넣으면 브라우저가 임의로 하나를 버린다.
 */
export function AccountantBanner() {
  const advisor = ADVISORS[0];

  return (
    <Card className="flex items-center gap-3">
      <Link
        href="/advisor"
        className={cn("flex min-w-0 flex-1 items-center gap-3.5 rounded-sm", FOCUS)}
      >
        <span
          aria-hidden="true"
          className="flex size-[46px] shrink-0 items-center justify-center rounded-pill bg-surface-sunken text-[24px] leading-none"
        >
          {advisor.emoji}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-body font-bold text-fg-strong">
              {advisor.name}
            </span>
            {advisor.verified && (
              <Badge tone="mint">
                <Icon name="check" size={12} />
                검증
              </Badge>
            )}
          </span>
          <span className="mt-[3px] block text-caption leading-normal text-fg-secondary">
            {advisor.specialty}
          </span>
        </span>
      </Link>
      <Button variant="outline" size="sm" asChild>
        <a href={advisor.href}>상담 요청</a>
      </Button>
    </Card>
  );
}
