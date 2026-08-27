import Link from "next/link";

import { Badge, Icon, Money } from "@/components/design-system";
import { entryIsDeductible, type LedgerEntry } from "@/lib/ledger/model";
import { cn } from "@/lib/utils";
import { categoryLabel, entryTitle, evidenceLabel } from "./ledger-view";

/**
 * 장부 한 건의 목록 행 (기능정의 v2 §3 T1)
 *
 * `LineItemRow` 를 쓰지 않는 이유: 그쪽은 지출 명세 전용이라 금액이 항상
 * 유출 색이고 공제 배지가 무조건 붙는다. 수입 행에 붙이면 매출이 비용 색으로
 * 나오고 "공제" 배지까지 달려, 화면이 사실과 다른 말을 하게 된다.
 *
 * 위에서부터 판정(배지) → 이름 → 증빙 순으로 읽힌다. 사용자가 목록을 훑는
 * 이유는 "이 지출이 공제되는가"를 확인하려는 것이라, 판정이 먼저 와야 한다.
 * 증빙 줄은 지출에만 붙는다 — 수입에는 판정할 매입세액이 없다.
 *
 * 행 전체가 링크다. 모바일에서 오른쪽 끝 작은 아이콘만 탭 타깃이면 수정에
 * 도달하는 마찰이 그대로 이탈이 된다.
 */
export function EntryRow({ entry, href }: { entry: LedgerEntry; href: string }) {
  const income = entry.kind === "income";
  const deductible = entryIsDeductible(entry);
  const evidence = evidenceLabel(entry);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 border-b border-line-subtle bg-surface-card px-card py-3",
        "hover:bg-surface-sunken",
        "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="mb-1 flex flex-wrap items-center gap-1.5">
          <Badge tone={income ? "blue" : "neutral"}>{categoryLabel(entry)}</Badge>
          {!income && (
            <Badge tone={deductible ? "mint" : "red"}>
              <Icon name={deductible ? "check" : "x"} size={12} />
              {deductible ? "공제" : "불공제"}
            </Badge>
          )}
        </span>
        <span className="block truncate text-body font-semibold text-fg-strong">
          {entryTitle(entry)}
        </span>
        {!income && evidence && (
          <span className="mt-0.5 block text-caption text-fg-faint">{evidence}</span>
        )}
      </span>

      {/* 부호는 값으로 넘긴다 — Money 가 색과 부호를 한 곳에서 정한다 */}
      <Money
        value={income ? entry.amount : -entry.amount}
        role={income ? "in" : "out"}
        size="sm"
        signed
        showUnit={false}
        className="shrink-0"
      />
      <Icon name="chevron-right" size={18} className="text-fg-faint" />
    </Link>
  );
}
