"use client";

import * as React from "react";
import Link from "next/link";

import {
  Badge,
  BreakdownRow,
  Button,
  Card,
  Icon,
  LineItemRow,
  MoneyInput,
  SegmentedToggle,
} from "@/components/design-system";
import { ScreenShell } from "@/components/screens/screen-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  COST_CATEGORIES,
  EVIDENCE_TYPES,
  isVatDeductible,
  type CostCategory,
  type EvidenceType,
} from "@/config/tax-rates";
import { cn } from "@/lib/utils";
import { applyEvidenceChange, lineIsDeductible, type LedgerLine } from "@/state/ledger";
import { useSimulator } from "@/state/simulator-context";

/**
 * S-03 · 지출 명세 (PRD §6.3 — 신규 요구사항)
 *
 * 모바일에서는 표가 아니라 **카드형 리스트 + 하단 시트 편집** 이다. 표는 가로
 * 스크롤을 만들고, 가로 스크롤은 이탈을 만든다.
 */

type Draft = Omit<LedgerLine, "id">;

function emptyDraft(): Draft {
  return {
    date: new Date().toISOString().slice(0, 10),
    merchant: "",
    amount: 0,
    evidence: "card",
    category: "qualified",
    memo: "",
  };
}

/** 원본 UI 킷의 "04.12" 표기 */
function shortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return month && day ? `${month}.${day}` : iso;
}

type DeductibleFilter = "all" | "deductible" | "nonDeductible";

const FILTER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "deductible", label: "공제" },
  { value: "nonDeductible", label: "불공제" },
] as const satisfies readonly { value: DeductibleFilter; label: string }[];

/** 시트 안 텍스트 입력 — 금액 필드(MoneyInput)와 같은 높이·테두리로 맞춘다 */
const FIELD_CLASS =
  "h-tap-field rounded-md border-2 border-line-subtle bg-surface-card px-3.5 text-body text-fg-strong focus-visible:border-action focus-visible:ring-0";
const LABEL_CLASS = "text-sm font-bold text-fg-strong";

export default function LedgerScreen() {
  const { state, dispatch, ledgerTotals } = useSimulator();
  const [filter, setFilter] = React.useState<DeductibleFilter>("all");
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft>(emptyDraft);
  /** 비용 구분을 우리가 자동으로 바꿨는가 — 되돌릴지 판단하는 데 쓴다 */
  const [autoForced, setAutoForced] = React.useState(false);

  function openNew() {
    setEditingId(null);
    setDraft(emptyDraft());
    setAutoForced(false);
    setOpen(true);
  }

  function openEdit(line: LedgerLine) {
    setEditingId(line.id);
    setDraft({ ...line });
    setAutoForced(false);
    setOpen(true);
  }

  function setEvidence(evidence: EvidenceType) {
    const next = applyEvidenceChange(draft, evidence, autoForced);
    setDraft({ ...draft, evidence, category: next.category });
    setAutoForced(next.autoForced);
  }

  function setCategory(category: CostCategory) {
    // 사용자가 직접 고른 구분은 이후 증빙을 바꿔도 우리가 건드리지 않는다
    setDraft({ ...draft, category });
    setAutoForced(false);
  }

  function save() {
    if (!draft.merchant.trim() || draft.amount <= 0) return;
    if (editingId) {
      dispatch({ type: "UPDATE_LEDGER_LINE", id: editingId, patch: draft });
    } else {
      dispatch({
        type: "ADD_LEDGER_LINE",
        line: { ...draft, id: crypto.randomUUID() },
      });
    }
    setOpen(false);
  }

  function remove() {
    if (editingId) dispatch({ type: "REMOVE_LEDGER_LINE", id: editingId });
    setOpen(false);
  }

  const evidenceDeductible = EVIDENCE_TYPES[draft.evidence].deductible;
  const draftDeductible =
    draft.category !== "payroll" && isVatDeductible(draft.evidence, draft.category);

  // 표시용 필터다. 합계(ledgerTotals)는 항상 전체 명세로 계산된다.
  const visibleLines = state.ledger.filter(
    (line) => filter === "all" || lineIsDeductible(line) === (filter === "deductible"),
  );

  return (
    <ScreenShell
      title="지출 명세"
      backHref="/revenue"
      secondary={
        <Button variant="secondary" size="xl" asChild>
          <Link href="/revenue">이전</Link>
        </Button>
      }
      primary={
        <Button variant="primary" size="xl" className="flex-1" asChild>
          <Link href="/payroll">
            합계 반영
            <Icon name="chevron-right" />
          </Link>
        </Button>
      }
    >
      <Card tone="sunken" elevation="none">
        <p className="text-caption leading-normal text-fg-secondary">
          건별로 입력하면 증빙 유형에 따라 공제 여부가 자동 판정되고, 합계가 매출·증빙
          화면에 반영됩니다.
        </p>
      </Card>

      {state.ledger.length > 0 && (
        <SegmentedToggle
          label="공제 여부로 보기"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={FILTER_OPTIONS}
        />
      )}

      <Card padded={false} className="overflow-hidden">
        {visibleLines.length === 0 ? (
          <p className="px-card py-8 text-center text-caption text-fg-secondary">
            {state.ledger.length === 0
              ? "아직 입력한 명세가 없습니다."
              : "해당 구분의 명세가 없습니다."}
          </p>
        ) : (
          visibleLines.map((line) => (
            <LineItemRow
              key={line.id}
              date={shortDate(line.date)}
              merchant={line.merchant}
              amount={line.amount}
              evidence={EVIDENCE_TYPES[line.evidence].label}
              category={COST_CATEGORIES[line.category].label}
              deductible={lineIsDeductible(line)}
              onEdit={() => openEdit(line)}
            />
          ))
        )}

        <button
          type="button"
          onClick={openNew}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 p-3.5",
            "text-sm font-bold text-fg-link hover:bg-surface-sunken",
            "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
          )}
        >
          <Icon name="plus" size={16} />
          명세 추가
        </button>
      </Card>

      {state.ledger.length > 0 && (
        <Card>
          <BreakdownRow
            label="명세 합계"
            sub={`${ledgerTotals.count}건`}
            value={ledgerTotals.total}
            role="out"
          />
          <BreakdownRow
            label="공제 대상"
            value={ledgerTotals.deductibleTotal}
            role="out"
            indent={1}
          />
          <BreakdownRow
            label="불공제"
            value={ledgerTotals.total - ledgerTotals.deductibleTotal}
            role="out"
            indent={1}
          />
          {ledgerTotals.payroll > 0 && (
            <p className="mt-3 rounded-sm bg-surface-sunken px-2.5 py-2 text-caption leading-normal text-fg-secondary">
              인건비 구분은 <strong>프리랜서 지급액</strong>으로 반영됩니다. 정규직
              급여는 인건비 화면에서 직접 입력해 주세요.
            </p>
          )}
        </Card>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[92dvh] rounded-t-sheet">
          <SheetHeader>
            <SheetTitle className="text-h3 font-bold text-fg-strong">
              {editingId ? "명세 수정" : "명세 추가"}
            </SheetTitle>
            <SheetDescription>
              증빙 유형과 비용 구분에 따라 공제 여부가 자동으로 판정됩니다.
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 overflow-y-auto px-4 pb-4">
            {/* 입력 칸을 가라앉은 카드 위에 올려 흰 필드가 도드라지게 한다 */}
            <Card tone="sunken" elevation="none" className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ledger-date" className={LABEL_CLASS}>
                  일자
                </Label>
                <Input
                  id="ledger-date"
                  type="date"
                  className={FIELD_CLASS}
                  value={draft.date}
                  onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ledger-merchant" className={LABEL_CLASS}>
                  거래처 / 가맹점
                </Label>
                <Input
                  id="ledger-merchant"
                  className={FIELD_CLASS}
                  value={draft.merchant}
                  placeholder="예: 대웅제약 판촉물"
                  onChange={(e) => setDraft((d) => ({ ...d, merchant: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ledger-amount" className={LABEL_CLASS}>
                  금액 (VAT 포함)
                </Label>
                <MoneyInput
                  id="ledger-amount"
                  value={draft.amount || ""}
                  onChange={(value) =>
                    setDraft((d) => ({ ...d, amount: Number(value) || 0 }))
                  }
                />
              </div>

              <fieldset className="grid gap-2">
                <legend className={cn("mb-2", LABEL_CLASS)}>증빙 유형</legend>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(EVIDENCE_TYPES) as EvidenceType[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEvidence(key)}
                      aria-pressed={draft.evidence === key}
                      className={cn(
                        "h-tap-min rounded-sm border px-3 text-sm font-medium",
                        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                        draft.evidence === key
                          ? "border-action bg-action-soft font-bold text-fg-strong"
                          : "border-line-subtle bg-surface-card text-fg-secondary",
                      )}
                    >
                      {EVIDENCE_TYPES[key].label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="grid gap-2">
                <legend className={cn("mb-2", LABEL_CLASS)}>비용 구분</legend>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(COST_CATEGORIES) as CostCategory[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key)}
                      aria-pressed={draft.category === key}
                      disabled={key === "qualified" && !evidenceDeductible}
                      className={cn(
                        "h-tap-min rounded-sm border px-3 text-sm font-medium",
                        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                        draft.category === key
                          ? "border-action bg-action-soft font-bold text-fg-strong"
                          : "border-line-subtle bg-surface-card text-fg-secondary",
                      )}
                    >
                      {COST_CATEGORIES[key].label}
                    </button>
                  ))}
                </div>
                {!evidenceDeductible && (
                  <p className="text-caption leading-normal text-warn-fg">
                    {EVIDENCE_TYPES[draft.evidence].label}은 매입세액 공제를 받을 수
                    없어 적격증빙 매입으로 지정할 수 없습니다. 경비 인정은 됩니다.
                  </p>
                )}
              </fieldset>

              <div className="grid gap-2">
                <Label htmlFor="ledger-memo" className={LABEL_CLASS}>
                  메모 (선택)
                </Label>
                <Input
                  id="ledger-memo"
                  className={FIELD_CLASS}
                  value={draft.memo ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, memo: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-sm bg-surface-card px-3 py-2.5">
                <span className="text-sm font-bold text-fg-strong">판정 결과</span>
                <Badge tone={draftDeductible ? "mint" : "red"}>
                  <Icon name={draftDeductible ? "check" : "x"} size={12} />
                  {draftDeductible ? "공제" : "불공제"}
                </Badge>
              </div>
            </Card>

            <div className="flex gap-2.5">
              {editingId && (
                <Button variant="outline" size="xl" onClick={remove}>
                  <Icon name="trash-2" />
                  삭제
                </Button>
              )}
              <Button
                variant="primary"
                size="xl"
                className="flex-1"
                onClick={save}
                disabled={!draft.merchant.trim() || draft.amount <= 0}
              >
                {editingId ? "수정 완료" : "추가"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </ScreenShell>
  );
}
