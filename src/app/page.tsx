/* 임시 진입점 — feat/screens 에서 S-00 온보딩 화면으로 교체된다.
   지금은 디자인 토큰이 Tailwind 유틸리티로 제대로 노출됐는지 확인하는 용도다. */
export default function Home() {
  return (
    <main className="mx-auto grid max-w-md gap-3 p-gutter">
      <p className="text-micro font-black tracking-wide text-fg-faint">
        DESIGN TOKENS
      </p>
      <h1 className="text-h1 leading-snug font-black tracking-tight text-fg-strong">
        네 칸만 채우면,
        <br />
        <span className="text-money-net">남는 돈</span>까지 보여드립니다
      </h1>

      <div className="rounded-lg bg-surface-ink p-card shadow-net">
        <p className="text-micro font-black tracking-wide text-money-net">
          NET CASH
        </p>
        <p className="num text-num-hero leading-tight font-black tracking-tight text-money-net">
          23,283,304
          <span className="text-h3 font-semibold opacity-70"> 원</span>
        </p>
      </div>

      <div className="rounded-card bg-warn-bg p-card text-warn-fg shadow-sm">
        <p className="text-sm font-bold">적립 권장 합계</p>
        <p className="num text-num-lg font-bold text-money-reserve">17,216,696</p>
      </div>
    </main>
  );
}
