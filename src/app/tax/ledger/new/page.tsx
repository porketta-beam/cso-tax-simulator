"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { EntryForm } from "@/components/ledger/entry-form";
import { isMonth, monthOf, todayISO } from "@/components/ledger/ledger-view";
import { AppShell } from "@/components/screens/app-shell";
import type { EntryInput } from "@/lib/ledger/model";
import { monthRange } from "@/lib/ledger/range";
import { useLedger } from "@/state/use-ledger";

/**
 * T1-a 내역 추가 (기능정의 v2 §3)
 *
 * 탭이 아니라 그 위에 얹히는 화면이라 AppShell 을 직접 그린다
 * (`../../layout.tsx` 는 탭 두 개에만 셸을 씌운다).
 */
export default function LedgerNewScreen() {
  // useSearchParams 는 서스펜스 경계를 요구한다 (Next.js CSR bailout)
  return (
    <React.Suspense fallback={null}>
      <NewEntry />
    </React.Suspense>
  );
}

function NewEntry() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = React.useState(false);

  const raw = searchParams.get("m");
  const month = isMonth(raw) ? raw : monthOf(todayISO());
  const { add } = useLedger(monthRange(month));

  // 지난 달을 보다가 추가하면 그 달 1일이 기본이다. 오늘로 두면 방금 넣은
  // 내역이 보고 있던 목록에서 사라진다
  const today = todayISO();
  const defaultDate = monthOf(today) === month ? today : `${month}-01`;

  async function submit(input: EntryInput) {
    setSubmitting(true);
    try {
      await add(input);
      // 저장한 날짜의 달로 간다 — 다른 달 날짜를 골랐어도 방금 넣은 게 보인다
      router.replace(`/tax/ledger?m=${monthOf(input.date)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="내역 추가" back={`/tax/ledger?m=${month}`}>
      <EntryForm onSubmit={submit} submitting={submitting} defaultDate={defaultDate} />
    </AppShell>
  );
}
