"use client";

import * as React from "react";
import Link from "next/link";

import { Button, Card } from "@/components/design-system";
import { AppShell } from "@/components/screens/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage } from "@/lib/auth-errors";
import { useAuth, type OAuthProvider } from "@/state/auth-context";

/**
 * 회원가입
 *
 * 프로젝트에 이메일 인증이 켜져 있으므로 가입 직후에는 로그인되지 않는다.
 * 메일의 링크를 눌러야 세션이 생긴다.
 */
const FIELD_CLASS =
  "h-tap-field rounded-md border-2 border-line-subtle bg-surface-card px-3.5 text-body text-fg-strong focus-visible:border-action focus-visible:ring-0";
const LABEL_CLASS = "text-sm font-bold text-fg-strong";
const MIN_PASSWORD = 6;

export default function SignUpScreen() {
  const { configured, signUp, signInWithOAuth } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError("비밀번호는 6자 이상이어야 합니다");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 서로 다릅니다");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signUp(email, password);
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onOAuth(provider: OAuthProvider) {
    setBusy(true);
    setError(null);
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <AppShell title="회원가입" hideTabs>
        <Card tone="warn" elevation="none">
          <p className="text-caption leading-normal">
            로그인 기능이 아직 설정되지 않았습니다. 환경변수를 넣고 다시 배포해야
            합니다.
          </p>
        </Card>
      </AppShell>
    );
  }

  if (sent) {
    return (
      <AppShell title="회원가입" back="/login" hideTabs>
        <Card tone="ok" elevation="none" role="status">
          <p className="text-caption leading-normal">
            확인 메일을 보냈습니다. 메일의 링크를 누르면 가입이 완료됩니다.
          </p>
        </Card>
        <Button variant="outline" size="lg" fullWidth asChild>
          <Link href="/login">로그인 화면으로</Link>
        </Button>
      </AppShell>
    );
  }

  return (
    <AppShell title="회원가입" back="/login" hideTabs>
      {error && (
        <Card tone="danger" elevation="none" role="status">
          <p className="text-caption leading-normal">{error}</p>
        </Card>
      )}

      <Card>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="signup-email" className={LABEL_CLASS}>
              이메일
            </Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              className={FIELD_CLASS}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="signup-password" className={LABEL_CLASS}>
              비밀번호
            </Label>
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD}
              className={FIELD_CLASS}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-caption text-fg-secondary">6자 이상으로 정해 주세요.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="signup-confirm" className={LABEL_CLASS}>
              비밀번호 확인
            </Label>
            <Input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              required
              className={FIELD_CLASS}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" size="xl" fullWidth disabled={busy}>
            가입하기
          </Button>
        </form>
      </Card>

      <div className="grid gap-2.5">
        <Button
          variant="outline"
          size="lg"
          fullWidth
          disabled={busy}
          onClick={() => onOAuth("google")}
        >
          Google로 계속하기
        </Button>
        <Button
          variant="outline"
          size="lg"
          fullWidth
          disabled={busy}
          onClick={() => onOAuth("kakao")}
        >
          카카오로 계속하기
        </Button>
      </div>

      <p className="text-center text-caption text-fg-secondary">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-bold text-fg-link underline">
          로그인
        </Link>
      </p>
    </AppShell>
  );
}
