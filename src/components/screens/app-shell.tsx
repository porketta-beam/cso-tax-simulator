"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/design-system";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/state/auth-context";

/**
 * AppShell — v2 모든 화면의 공통 뼈대 (기능정의 v2 §2)
 *
 *   상단 바(뒤로 · 제목 · 액션 · ☰) / 스크롤 본문 / 하단 탭 4개
 *
 * 일방향 마법사(ScreenShell + StepIndicator)를 대체한다. 이제 화면은 순서가
 * 아니라 계층이므로, 어디서든 다른 탭으로 건너뛸 수 있어야 한다.
 * 모바일 우선이며 데스크톱에서는 폭만 제한해 가운데 정렬한다.
 */
export interface AppShellProps {
  title: React.ReactNode;
  /** 뒤로 갈 곳. 없으면 뒤로 버튼을 숨긴다 (탭 최상위 화면) */
  back?: string;
  /** 상단 우측 슬롯 — 예: 결과 화면의 ⚙ 설정 */
  action?: React.ReactNode;
  /** 로그인·가입처럼 앱 밖(로그인 전) 화면에서는 탭과 ☰ 를 함께 감춘다 */
  hideTabs?: boolean;
  children: React.ReactNode;
}

const TABS = [
  { href: "/", label: "홈", icon: "house" },
  { href: "/tax", label: "세무", icon: "calculator" },
  { href: "/shop", label: "쇼핑", icon: "shopping-bag" },
] as const satisfies readonly { href: string; label: string; icon: IconName }[];

/** 루트만 정확히 일치로 본다 — 아니면 모든 경로에서 홈이 켜진다 */
function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const ICON_BUTTON = cn(
  "inline-flex size-9 shrink-0 items-center justify-center rounded-sm",
  "text-fg-strong hover:bg-surface-sunken",
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
);

export function AppShell({ title, back, action, hideTabs, children }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-surface-app">
      <header className="sticky top-0 z-20 shrink-0 border-b border-line-subtle bg-surface-card">
        <div className="flex min-h-[54px] items-center gap-1 px-gutter py-2">
          {back && (
            <Link href={back} aria-label="이전 화면으로" className={cn(ICON_BUTTON, "-ml-1.5")}>
              <Icon name="chevron-left" size={22} />
            </Link>
          )}
          <h1 className="min-w-0 flex-1 truncate text-h2 font-black tracking-tight text-fg-strong">
            {title}
          </h1>
          {action}
          {!hideTabs && (
            <button
              type="button"
              aria-label="메뉴 열기"
              onClick={() => setMenuOpen(true)}
              className={cn(ICON_BUTTON, "-mr-1.5")}
            >
              <Icon name="menu" size={22} />
            </button>
          )}
        </div>
      </header>

      {/* grid-cols-[minmax(0,1fr)] 은 장식이 아니다. grid 아이템의 기본
          min-width 는 auto(=min-content) 라, 카드 안에 가로 스크롤 영역처럼
          줄바꿈 안 되는 요소가 있으면 열 너비가 그만큼 밀려 화면 전체가
          가로로 넘친다. 그러면 오른쪽 정렬된 금액이 화면 밖으로 잘려 나간다. */}
      <main className="grid flex-1 content-start gap-3 px-gutter py-4 grid-cols-[minmax(0,1fr)]">
        {children}
        <div className="h-2" />
      </main>

      {!hideTabs && (
        <nav
          aria-label="주 메뉴"
          className={cn(
            "sticky bottom-0 z-20 grid shrink-0 grid-cols-4 border-t border-line-subtle bg-surface-card",
            // 노치 기기에서 홈 인디케이터에 탭이 깔리지 않도록
            "pb-[max(6px,env(safe-area-inset-bottom))]",
          )}
        >
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-tap-comfort flex-col items-center justify-center gap-1 text-micro font-bold",
                  "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                  active ? "text-action" : "text-fg-faint",
                )}
              >
                <Icon name={tab.icon} size={20} />
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            aria-label="메뉴 열기"
            onClick={() => setMenuOpen(true)}
            className={cn(
              "flex h-tap-comfort flex-col items-center justify-center gap-1 text-micro font-bold text-fg-faint",
              "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
            )}
          >
            <Icon name="menu" size={20} />
            메뉴
          </button>
        </nav>
      )}

      {!hideTabs && <MenuSheet open={menuOpen} onOpenChange={setMenuOpen} />}
    </div>
  );
}

/**
 * ☰ 메뉴 시트 (기능정의 v2 §3)
 *
 * 탭에 넣기엔 자주 쓰지 않지만 어디서든 닿아야 하는 것들 — 계정·설정·
 * 로그아웃·탈퇴 — 를 모은다. 탈퇴는 여기서 처리하지 않고 `/account` 로
 * 보낸다. 두 번 탭 확인 흐름을 두 곳에 복제하면 한쪽만 고쳐질 수 있다.
 */
export function MenuSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { user, signOut } = useAuth();

  async function onSignOut() {
    await signOut();
    onOpenChange(false);
    router.replace("/login");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "mx-auto max-w-lg gap-0 rounded-t-sheet bg-surface-card",
          "pb-[max(16px,env(safe-area-inset-bottom))]",
        )}
      >
        <SheetHeader className="gap-1 px-gutter pt-5 pb-3">
          <SheetTitle className="text-h3 font-black text-fg-strong">메뉴</SheetTitle>
          <SheetDescription className="truncate text-caption text-fg-secondary">
            {user?.email ?? "로그인이 필요합니다"}
          </SheetDescription>
        </SheetHeader>

        <div className="grid pb-2">
          <MenuItem href="/account" icon="user" label="내 정보" onNavigate={onOpenChange} />
          <MenuItem
            href="/tax/settings"
            icon="settings"
            label="설정"
            onNavigate={onOpenChange}
          />
          <MenuItem icon="log-out" label="로그아웃" onClick={onSignOut} />
          {/* 탈퇴 확인(두 번 탭)은 /account 한 곳에만 있다 */}
          <MenuItem
            href="/account"
            icon="trash-2"
            label="탈퇴"
            tone="danger"
            onNavigate={onOpenChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MenuItem({
  href,
  icon,
  label,
  tone,
  onClick,
  onNavigate,
}: {
  href?: string;
  icon: IconName;
  label: string;
  tone?: "danger";
  onClick?: () => void;
  onNavigate?: (open: boolean) => void;
}) {
  const className = cn(
    "flex h-tap-comfort items-center gap-3 px-gutter text-body font-bold",
    "hover:bg-surface-sunken",
    "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
    tone === "danger" ? "text-danger-fg" : "text-fg-strong",
  );

  if (href) {
    return (
      <Link href={href} className={className} onClick={() => onNavigate?.(false)}>
        <Icon name={icon} size={19} />
        {label}
      </Link>
    );
  }

  return (
    <button type="button" className={cn(className, "text-left")} onClick={onClick}>
      <Icon name={icon} size={19} />
      {label}
    </button>
  );
}

/** 화면 안 소제목 */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 text-micro font-black tracking-wide text-fg-faint">
      {children}
    </p>
  );
}

/** 결과·부록 화면 하단의 법적 고지 (PRD §10 — 필수) */
export function LegalNotice() {
  return (
    <p className="px-2 py-1 text-center text-micro leading-body text-fg-faint">
      본 계산 결과는 시뮬레이션 예시이며 실제 신고·세무 자문이 아닙니다. 소득공제·
      세액공제·감면·중간예납 등이 반영되지 않아 실제 납부세액과 다를 수 있습니다.
      계산 기준은 이 앱이 정한 것이며, 실제 적용 여부의 판단과 책임은 사용자 본인에게
      있습니다. 정확한 신고는 세무사와 협업하세요.
    </p>
  );
}

/** 다른 화면으로 넘어가는 카드형 링크 */
export function NavCard({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: IconName;
  label: string;
  desc?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-3 rounded-card bg-surface-card px-card py-3.5 shadow-sm",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon name={icon} size={18} className="text-fg-default" />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-fg-strong">{label}</span>
          {desc && (
            <span className="block text-caption leading-snug text-fg-secondary">
              {desc}
            </span>
          )}
        </span>
      </span>
      <Icon name="chevron-right" size={18} className="text-fg-faint" />
    </Link>
  );
}
