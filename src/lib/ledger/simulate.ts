import { simulate } from "@/lib/tax/pipeline";
import type { TaxSimulation } from "@/lib/tax/types";
import {
  aggregate,
  settingsToRates,
  type LedgerEntry,
  type LedgerSettings,
} from "./model";
import { annualizationFactor, rangeLabel, type DateRange } from "./range";

/**
 * 장부 + 설정 + 기간 → 계산 결과 (v2 §3 T2)
 *
 * 결과 화면과 홈 요약이 같은 함수를 쓴다. 두 화면이 각자 `TaxInput` 을 조립하면
 * 한쪽만 새 설정 필드를 넘기게 되고, 같은 달인데 홈과 결과의 Net Cash 가
 * 달라진다 — 사용자는 어느 쪽이 맞는지 알 방법이 없다.
 *
 * 순수 함수다. 훅도 클라이언트도 모른다.
 */
export function simulateRange(
  entries: readonly LedgerEntry[],
  settings: LedgerSettings,
  range: DateRange,
): TaxSimulation {
  const totals = aggregate(entries);

  return simulate(
    {
      businessType: settings.businessType,
      dependents: settings.dependents,
      // periodMode 는 v1 잔재다. annualizationFactor 를 넘기면 STAGE 03 이
      // 이 값을 보지 않는다 — 자유 범위는 월/분기/연으로 표현되지 않는다.
      periodMode: "month",
      annualizationFactor: annualizationFactor(range),
      periodLabel: rangeLabel(range),
      revenue: totals.revenue,
      qualifiedEvidence: totals.qualifiedEvidence,
      freelancerPay: totals.freelancerPay,
      salary: totals.salary,
      fixedCost: totals.fixedCost,
      nonDeductibleCost: totals.nonDeductibleCost,
    },
    settingsToRates(settings),
  );
}
