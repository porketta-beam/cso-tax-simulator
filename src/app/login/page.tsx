"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, Card } from "@/components/design-system";
import { ScreenShell } from "@/components/screens/screen-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage } from "@/lib/auth-errors";
import { useAuth, type OAuthProvider } from "@/state/auth-context";

/**
 * 로그인 (M1-a)
 *
 * 로그인은 선택 기능이다. 이 화면을 거치지 않아도 시뮬레이터는 전부 쓸 수 있다.
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
      router.replace("/account");
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
      <ScreenShell title="로그인" backHref="/">
        <Card tone="warn" elevation="none">
          <p className="text-caption leading-normal">
            로그인 기능이 아직 설정되지 않았습니다. 로그인 없이도 시뮬레이터는 그대로
            쓸 수 있습니다.
          </p>
        </Card>
        <Button variant="outline" size="lg" fullWidth asChild>
          <Link href="/">시뮬레이터로 돌아가기</Link>
        </Button>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="로그인" backHref="/">
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
    </ScreenShell>
  );
}
