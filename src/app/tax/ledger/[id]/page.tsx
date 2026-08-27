"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { Button, Card } from "@/components/design-system";
import { EntryForm } from "@/components/ledger/entry-form";
import { isMonth, monthOf, todayISO } from "@/components/ledger/ledger-view";
import { AppShell } from "@/components/screens/app-shell";
import type { EntryInput } from "@/lib/ledger/model";
import { useEntry } from "@/state/use-ledger";

/**
 * T1-a 내역 수정·삭제 (기능정의 v2 §3)
 *
 * id 는 `useParams()` 로 읽는다. 이 화면은 로그인한 사용자의 브라우저에서만
 * 의미가 있어(RLS 로 자기 행만 보인다) 서버에서 미리 그릴 것이 없다.
 *
 * 폼은 값을 다 받은 뒤에만 마운트한다 — 입력 상태를 최초 값으로 한 번만
 * 잡기 때문에, 빈 폼을 먼저 그려 두면 조회가 끝나도 칸이 비어 있다.
 */
export default function LedgerEditScreen() {
  // useSearchParams 는 서스펜스 경계를 요구한다 (Next.js CSR bailout)
  return (
    <React.Suspense fallback={null}>
      <EditEntry />
    </React.Suspense>
  );
}

function EditEntry() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = React.useState(false);

  const id = typeof params.id === "string" ? params.id : "";
  const { entry, loading, error, save, remove } = useEntry(id);

  // 목록에서 왔으면 그 달로 되돌아간다. 직접 열었으면 이 내역이 있는 달로
  const raw = searchParams.get("m");
  const month = isMonth(raw) ? raw : monthOf(entry?.date ?? todayISO());
  const listHref = `/tax/ledger?m=${month}`;

  async function run(action: () => Promise<void>, to: string) {
    setSubmitting(true);
    try {
      await action();
      router.replace(to);
    } finally {
      setSubmitting(false);
    }
  }

  if (!entry) {
    return (
      <AppShell title="내역 수정" back={listHref} hideTabs>
        {error ? (
          <Card tone="danger" role="status">
            <p className="text-caption leading-normal">{error}</p>
          </Card>
        ) : loading ? (
          <Card elevation="none" role="status">
            <p className="text-caption leading-normal text-fg-secondary">
              불러오는 중…
            </p>
          </Card>
        ) : (
          <Card className="grid justify-items-center gap-3 py-8 text-center">
            <p className="text-body leading-normal text-fg-secondary">
              내역을 찾을 수 없습니다
            </p>
            <Button asChild variant="outline" size="lg">
              <Link href={listHref}>장부로 돌아가기</Link>
            </Button>
          </Card>
        )}
      </AppShell>
    );
  }

  return (
    <EntryForm
      title="내역 수정"
      backHref={listHref}
      initial={entry}
      submitting={submitting}
      defaultDate={entry.date}
      onSubmit={(input: EntryInput) =>
        // 날짜를 바꿨으면 그 달 목록으로 — 안 그러면 방금 고친 게 안 보인다
        run(() => save(input), `/tax/ledger?m=${monthOf(input.date)}`)
      }
      onDelete={() => run(remove, listHref)}
    />
  );
}
