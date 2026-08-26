import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthGate } from "@/components/screens/auth-gate";
import { AuthProvider } from "@/state/auth-context";

export const metadata: Metadata = {
  title: "CSO 세무 시뮬레이터",
  description:
    "장부처럼 수입·지출을 입력하면 VAT 역산부터 종합소득세·법인세, 4대보험, 신고 때 미리 빼둘 금액까지 계산합니다.",
  applicationName: "CSO 세무 시뮬레이터",
  robots: { index: false, follow: false },
};

/* viewportFit: "cover" — 노치 기기에서 하단 탭이 safe-area 를 쓰려면 필요하다.
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
        {/* v2 는 로그인 필수다. 세션이 확인되기 전에는 AuthGate 가 아무것도
            내보내지 않으므로, 화면 코드는 user 가 있다고 가정해도 된다. */}
        <AuthProvider>
          <AuthGate>{children}</AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
