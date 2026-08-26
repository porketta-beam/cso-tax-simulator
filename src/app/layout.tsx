import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/state/auth-context";
import { SimulatorProvider } from "@/state/simulator-context";

export const metadata: Metadata = {
  title: "CSO 세무 시뮬레이터",
  description:
    "매출·증빙·인건비·고정비만 넣으면 VAT 역산부터 종합소득세, 4대보험, 신고 때 미리 빼둘 금액까지. 입력값은 기기 밖으로 나가지 않습니다.",
  applicationName: "CSO 세무 시뮬레이터",
  robots: { index: false, follow: false },
};

/* viewportFit: "cover" — 노치 기기에서 하단 고정 CTA 가 safe-area 를 쓰려면 필요하다.
   themeColor 는 잉크 네이비(--gray-900). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0D1B2A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* Pretendard — 한국어 본문 + 금액 숫자. tabular-nums(tnum) 를 지원하므로
            자릿수가 바뀌어도 금액이 좌우로 흔들리지 않는다. 임시 서체다. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="flex min-h-full flex-col">
        {/* 위저드 상태는 화면 이동 사이에 유지돼야 하므로 레이아웃에 둔다.
            인증은 그 바깥이다 — 로그인은 선택이고, 계산 상태와 아무 연결도 없다. */}
        <AuthProvider>
          <SimulatorProvider>{children}</SimulatorProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
