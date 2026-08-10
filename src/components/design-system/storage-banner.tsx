import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

/**
 * StorageBanner — 저장 환경 경고 (CTveiw system/StorageBanner 포팅)
 *
 * 이 제품은 서버가 없어서 데이터가 기기에만 있다. 그런데 iOS Safari 는 7일간
 * 방문이 없으면 저장소를 통째로 지우고, 카카오톡 인앱브라우저는 종료 시
 * 소실될 수 있다. 사용자는 이 사실을 알 방법이 없다.
 *
 * 설계 원칙: **사용을 막지 않는다.** 상단에 배너를 띄우고 계속 쓰게 하되,
 * 빠져나갈 길(홈 화면 추가 / 백업 파일 / 다른 브라우저로 열기)을 항상 붙인다.
 * 모달로 가로막으면 진입 마찰만 커지고 데이터는 여전히 사라진다.
 */
export type StorageBannerVariant = "ios-tab" | "in-app" | "blocked";

interface BannerConfig {
  tone: "warn" | "danger";
  icon: IconName;
  title: string;
  desc: string;
  primary: string;
  secondary: string | null;
}

const CONFIG: Record<StorageBannerVariant, BannerConfig> = {
  "ios-tab": {
    tone: "warn",
    icon: "triangle-alert",
    title: "7일간 방문하지 않으면 입력한 내용이 사라집니다",
    desc: "홈 화면에 추가하면 그대로 보관됩니다.",
    primary: "홈 화면에 추가하는 법",
    secondary: "백업 파일 받기",
  },
  "in-app": {
    tone: "warn",
    icon: "smartphone",
    title: "카카오톡 브라우저에서는 저장이 유지되지 않을 수 있습니다",
    desc: "Safari나 Chrome으로 열어 주세요.",
    primary: "다른 브라우저로 열기",
    secondary: "백업 파일 받기",
  },
  blocked: {
    tone: "danger",
    icon: "circle-alert",
    title: "이 브라우저에서는 자동 저장이 되지 않습니다",
    desc: "작업을 마치면 반드시 백업 파일을 받아 주세요.",
    primary: "백업 파일 받기",
    secondary: null,
  },
};

const TONE = {
  warn: {
    box: "border-warn-line bg-warn-bg",
    icon: "text-warn-fg",
    title: "text-[var(--amber-900)]",
    desc: "text-warn-fg",
    button: "border-warn-line text-[var(--amber-900)]",
    link: "text-warn-fg",
  },
  danger: {
    box: "border-danger-line bg-danger-bg",
    icon: "text-danger-fg",
    title: "text-[var(--red-900)]",
    desc: "text-danger-fg",
    button: "border-danger-line text-[var(--red-900)]",
    link: "text-danger-fg",
  },
} as const;

export interface StorageBannerProps extends React.ComponentProps<"div"> {
  variant?: StorageBannerVariant;
  onPrimary?: () => void;
  onSecondary?: () => void;
}

export function StorageBanner({
  variant = "ios-tab",
  onPrimary,
  onSecondary,
  className,
  ...rest
}: StorageBannerProps) {
  const config = CONFIG[variant];
  const tone = TONE[config.tone];

  return (
    <div
      role="status"
      className={cn("flex gap-2.5 rounded-md border px-3.5 py-3", tone.box, className)}
      {...rest}
    >
      <Icon name={config.icon} size={18} className={cn("mt-px", tone.icon)} />

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug font-bold", tone.title)}>
          {config.title}
        </p>
        <p className={cn("mt-0.5 text-caption leading-snug", tone.desc)}>
          {config.desc}
        </p>

        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPrimary}
            className={cn(
              "h-8 rounded-sm border bg-surface-card px-3 text-caption font-bold",
              "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
              tone.button,
            )}
          >
            {config.primary}
          </button>
          {config.secondary && (
            <button
              type="button"
              onClick={onSecondary}
              className={cn(
                "h-8 px-3 text-caption font-bold underline",
                "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                tone.link,
              )}
            >
              {config.secondary}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
