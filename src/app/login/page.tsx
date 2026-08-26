"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, Card } from "@/components/design-system";
import { AppShell } from "@/components/screens/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage } from "@/lib/auth-errors";
import { useAuth, type OAuthProvider } from "@/state/auth-context";

/**
 * 로그인
 *
 * v2 는 로그인 필수다. `/login`·`/signup` 만 열려 있고 나머지 화면은
 * `AuthGate` 가 여기로 돌려보낸다. 로그인에 성공하면 홈으로 간다.
 */
const FIELD_CLASS =
  "h-tap-field rounded-md border-2 border-line-subtle bg-surface-card px-3.5 text-body text-fg-strong focus-visible:border-action focus-visible:ring-0";
const LABEL_CLASS = "text-sm font-bold text-fg-strong";

export default function LoginScreen() {
  const router = useRouter();
  const { configured, signIn, signInWithOAuth } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace("/");
    } catch (err) {
      setError(authErrorMessage(err));
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
      <AppShell title="로그인" hideTabs>
        <Card tone="warn" elevation="none">
          <p className="text-caption leading-normal">
            로그인 기능이 아직 설정되지 않았습니다. 환경변수를 넣고 다시 배포해야
            합니다.
          </p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="로그인" hideTabs>
      {error && (
        <Card tone="danger" elevation="none" role="status">
          <p className="text-caption leading-normal">{error}</p>
        </Card>
      )}

      <Card>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="login-email" className={LABEL_CLASS}>
              이메일
            </Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              className={FIELD_CLASS}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="login-password" className={LABEL_CLASS}>
              비밀번호
            </Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              className={FIELD_CLASS}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" size="xl" fullWidth disabled={busy}>
            로그인
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
        아직 계정이 없으신가요?{" "}
        <Link href="/signup" className="font-bold text-fg-link underline">
          회원가입
        </Link>
      </p>
    </AppShell>
  );
}
