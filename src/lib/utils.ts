import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge 에 우리 디자인 토큰 스케일을 알려 준다.
 *
 * ⚠️ 이 설정이 없으면 금액 색이 조용히 사라진다. tailwind-merge 는 기본
 * 스케일만 알기 때문에 `text-num-md`(글자 크기)를 글자 **색** 그룹으로
 * 잘못 분류하고, 같은 그룹의 `text-money-net` 을 뒤에 온 클래스로 덮어쓴다.
 * 그러면 Net Cash 금액이 민트색이 아니라 상속색으로 렌더된다 — 빌드도
 * 타입체크도 통과하고, 화면만 틀린다.
 *
 * Tailwind v4 의 @theme 네임스페이스와 이름을 맞춰 둔다. globals.css 에
 * 토큰을 추가하면 여기도 같이 추가할 것.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      // --text-* (본문 스케일 + 금액 스케일)
      text: [
        "micro",
        "caption",
        "body",
        "h1",
        "h2",
        "h3",
        "display",
        "num-sm",
        "num-md",
        "num-lg",
        "num-hero",
      ],
      // --radius-*
      radius: ["card", "pill", "sheet"],
      // --shadow-*
      shadow: ["net"],
      // --spacing-* (p-card, h-tap-large, size-tap-min …)
      spacing: [
        "card",
        "gutter",
        "cta-bar",
        "content-bottom",
        "tap-min",
        "tap-comfort",
        "tap-large",
        "tap-field",
      ],
      // --leading-*
      leading: ["body"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
