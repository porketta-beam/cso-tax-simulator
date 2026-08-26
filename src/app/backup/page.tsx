"use client";

import * as React from "react";

import { Button, Card, Icon, StorageBanner } from "@/components/design-system";
import { ScreenShell, SectionLabel } from "@/components/screens/screen-shell";
import { downloadWorkbook } from "@/lib/export-xlsx";
import { useSimulator } from "@/state/simulator-context";
import { parseBackupPayload, toBackupPayload } from "@/state/simulator-reducer";

/**
 * S-08 · 백업과 복원 (PRD §7)
 *
 * 서버가 없어 데이터가 기기에만 있고, iOS Safari 는 7일간 방문이 없으면
 * 저장소를 통째로 지운다. 그래서 "파일로 빼두는 길"이 기능이 아니라 안전망이다.
 *
 * ⚠️ 자동 저장(IndexedDB) 계층은 다음 마일스톤이다. 지금은 새로고침하면
 * 입력이 사라지므로, 이 화면의 내보내기가 유일한 보존 수단이다.
 */
type Status = { tone: "ok" | "danger"; message: string } | null;

function timestamp(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${String(now.getFullYear()).slice(2)}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
}

export default function BackupScreen() {
  const { state, dispatch, periodLabel, simulation, ledgerTotals } = useSimulator();
  const [status, setStatus] = React.useState<Status>(null);
  const [lastFile, setLastFile] = React.useState<string | null>(null);
  const [pasted, setPasted] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  function fileName(ext: string) {
    const slug = periodLabel.replace(/[^0-9A-Za-z가-힣]/g, "");
    return `CSO-TAX_${slug}_${timestamp(new Date())}.${ext}`;
  }

  function buildFile() {
    const payload = toBackupPayload(state, new Date().toISOString());
    return { name: fileName("json"), body: JSON.stringify(payload, null, 2) };
  }

  function saveBlob(name: string, body: string, type: string) {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    setLastFile(name);
    setStatus({ tone: "ok", message: `${name} 을 저장했습니다.` });
  }

  function download() {
    const { name, body } = buildFile();
    saveBlob(name, body, "application/json");
  }

  async function downloadXlsx() {
    const name = fileName("xlsx");
    await downloadWorkbook(name, state, simulation, ledgerTotals);
    setLastFile(name);
    setStatus({ tone: "ok", message: `${name} 을 저장했습니다.` });
  }

  async function copy() {
    const { body } = buildFile();
    try {
      await navigator.clipboard.writeText(body);
      setStatus({ tone: "ok", message: "클립보드에 복사했습니다." });
    } catch {
      setStatus({
        tone: "danger",
        message: "클립보드 권한이 없습니다. 파일로 저장을 이용해 주세요.",
      });
    }
  }

  function restore(raw: string) {
    const restored = parseBackupPayload(raw);
    if (!restored) {
      setStatus({
        tone: "danger",
        message: "이 파일은 CSO 세무 시뮬레이터 백업이 아니거나 손상됐습니다.",
      });
      return;
    }
    dispatch({ type: "RESTORE", state: restored });
    setStatus({ tone: "ok", message: "입력값을 불러왔습니다. 최신 세율로 다시 계산됩니다." });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    restore(await file.text());
    e.target.value = "";
  }

  return (
    <ScreenShell title="백업과 복원" backHref="/result">
      <StorageBanner variant="ios-tab" onPrimary={download} onSecondary={download} />

      {status && (
        <Card tone={status.tone === "ok" ? "ok" : "danger"} elevation="none">
          <p className="text-caption leading-normal">{status.message}</p>
        </Card>
      )}

      <SectionLabel>내보내기</SectionLabel>
      <Card>
        <p className="mb-3.5 text-caption leading-normal text-fg-secondary">
          입력값만 저장됩니다. 불러올 때는 항상 최신 세율로 다시 계산합니다.
        </p>
        <div className="grid gap-2.5">
          <Button variant="primary" size="lg" fullWidth onClick={download}>
            <Icon name="download" />
            파일로 저장
          </Button>
          <Button variant="outline" size="lg" fullWidth onClick={downloadXlsx}>
            <Icon name="file-text" />
            엑셀 파일로 저장
          </Button>
          <Button variant="outline" size="lg" fullWidth onClick={copy}>
            <Icon name="clipboard-copy" />
            클립보드로 복사
          </Button>
        </div>
        {lastFile && (
          <div className="mt-3.5 rounded-sm bg-surface-sunken px-3 py-2.5">
            <p className="mb-1 text-micro text-fg-faint">마지막으로 저장한 파일</p>
            <span className="num text-caption font-bold text-fg-strong">{lastFile}</span>
          </div>
        )}
      </Card>

      <Card tone="ok" elevation="none">
        <div className="flex gap-2.5">
          <Icon name="info" size={17} className="mt-px shrink-0 text-ok-fg" />
          <p className="text-caption leading-normal text-[var(--mint-900)]">
            <strong>클립보드로 복사</strong>한 뒤 카카오톡 &ldquo;나와의 채팅&rdquo;에
            붙여넣어 두면 파일 앱을 헤매지 않고 어느 기기에서든 복원할 수 있습니다.
          </p>
        </div>
      </Card>

      <SectionLabel>불러오기</SectionLabel>
      <Card>
        <div className="grid gap-2.5">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onFile}
            className="sr-only"
          />
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={() => fileRef.current?.click()}
          >
            <Icon name="upload" />
            파일 선택
          </Button>

          <label htmlFor="paste-backup" className="text-caption text-fg-secondary">
            또는 복사해 둔 내용을 붙여넣기
          </label>
          <textarea
            id="paste-backup"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={3}
            placeholder='{"app":"cso-tax-simulator",...}'
            className="w-full rounded-md border-2 border-line-subtle bg-surface-card p-3 text-caption outline-none focus:border-action"
          />
          <Button
            variant="outline"
            size="lg"
            fullWidth
            disabled={!pasted.trim()}
            onClick={() => restore(pasted)}
          >
            <Icon name="clipboard-copy" />
            붙여넣기로 복원
          </Button>
        </div>

        <p className="mt-3 text-caption leading-normal text-fg-secondary">
          파일 앱에서 <strong className="text-fg-strong">CSO</strong> 를 검색하면 백업
          파일이 모두 나옵니다.
        </p>
      </Card>

      <Card tone="warn" elevation="none">
        <p className="text-caption leading-normal">
          자동 저장은 아직 붙지 않았습니다. 지금은 새로고침하면 입력이 사라지니, 작업을
          마치면 반드시 백업 파일을 받아 주세요.
        </p>
      </Card>
    </ScreenShell>
  );
}
