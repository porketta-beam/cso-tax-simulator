# CSO 세무 시뮬레이터 — Frontend

제약 영업대행사(CSO) 1인 개인사업자를 위한 세무 시뮬레이터. 네 칸(매출·증빙·인건비·고정비)만
채우면 VAT 역산 → 과세표준 → 누진세율·4대보험 → **Net Cash** 까지 계산하고, 신고 시점에
미리 빼둘 **적립금**을 제안한다.

입력값은 기기 밖으로 나가지 않는다. 서버 없음, 외부 전송·분석 도구 없음.

## 근거 문서

| 문서 | 역할 |
|---|---|
| `../../PRD.md` | 계산 로직(§4) · 검증 벡터(§5) · 화면 명세(§6) · 기술 스택(§8) |
| `../../CTveiw/` | 디자인 시스템 — 토큰, 컴포넌트, 9개 화면 UI 킷 |

## 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS v4 (`@theme` 에 디자인 토큰 이식) |
| UI 프리미티브 | shadcn/ui (radix) |
| 상태 | React Context + reducer |
| 테스트 | Vitest — PRD §5 검증 벡터를 회귀 기준으로 고정 |
| 배포 | Vercel |

## 개발

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # PRD §5 검증 벡터 회귀 테스트
npm run typecheck
npm run lint
```

## 구조

```
src/
  app/
    page.tsx           S-00 시작          /
    revenue/           S-01 매출·증빙     /revenue
    payroll/           S-02 인건비·고정비 /payroll
    ledger/            S-03 지출 명세     /ledger
    tax-base/          S-04 과세표준      /tax-base
    rates/             S-05 세율·4대보험  /rates
    result/            S-06 Net Cash      /result
    basis/             S-07 계산 기준     /basis
    backup/            S-08 백업·복원     /backup
    design-system/     컴포넌트 갤러리    /design-system
  components/
    ui/                shadcn 프리미티브 — 복사해서 소유하는 코드다.
                       button·card·badge 는 디자인 시스템 어휘로 재정의했으므로
                       `shadcn add` 를 다시 돌리면 덮어써진다
    design-system/     CTveiw 포팅 컴포넌트 15종 + 배럴(index.ts)
    screens/           화면 공통 셸(헤더·스크롤 본문·하단 고정 CTA)
  config/
    tax-rates.ts       ⚠️ 모든 세율·요율의 단일 출처 (PRD §4 원칙)
  lib/
    tax/               계산 파이프라인 (STAGE 02 → 03 → 04)
  state/               Context + reducer, 명세 집계, 백업 직렬화
```

### 컴포넌트 사용 규칙

화면 코드는 `@/components/design-system` 배럴에서만 import 한다. shadcn 프리미티브를
화면에서 직접 쓰면 디자인 시스템이 강제하는 규칙(금액은 `role` 로만, 카드는 elevation
으로 구분)을 우회하게 된다.

`globals.css` 에 디자인 토큰을 추가하면 **`src/lib/utils.ts` 의 tailwind-merge 설정도
같이 고칠 것.** 빠뜨리면 `text-money-net` 같은 색이 같은 접두사의 크기 유틸리티에
덮여 조용히 사라진다 — 빌드도 타입체크도 통과하고 화면만 틀린다.

## 아직 없는 것

1단계 범위 안에서도 다음 마일스톤으로 미뤄 둔 것들이다.

| 항목 | 현재 상태 |
|---|---|
| 자동 저장 (IndexedDB) | 없음. 새로고침하면 입력이 사라진다. S-08 의 파일 내보내기/불러오기는 동작한다 |
| PWA (manifest·Service Worker) | 없음. 오프라인 동작과 홈 화면 설치 불가 |
| 저장 환경 감지 (PRD §7.3) | 배너는 `ios-tab` 고정. 실제 감지 로직 없음 |
| 태블릿 2열·데스크톱 사이드바 (PRD §6.1) | 모바일 우선 + 데스크톱 가운데 정렬까지만 |

### 단일 출처 원칙

모든 세율·요율·한도는 `src/config/tax-rates.ts` 에서만 정의한다. 화면 컴포넌트와 계산
함수 어디에서도 숫자 리터럴을 직접 쓰지 않는다. 세법이 개정되면 이 파일 한 곳만 고친다.
계산 기준 화면(S-07)은 이 파일을 그대로 렌더링한다.

## 브랜치 전략 — GitHub Flow

`main` 은 항상 배포 가능한 상태를 유지한다. 모든 작업은 `main` 에서 브랜치를 따고,
PR 로 리뷰한 뒤 머지한다. `main` 에 직접 커밋하지 않는다.

```
main ──┬── feat/design-tokens ──┐
       ├── feat/tax-engine ─────┤
       ├── feat/ui-components ──┼──> PR → merge → Vercel 배포
       └── feat/screens ────────┘
```

## 법적 고지

본 계산 결과는 시뮬레이션 예시이며 실제 신고·세무 자문이 아니다. 소득공제·세액공제·감면·
중간예납 등이 반영되지 않아 실제 납부세액과 다를 수 있다. 세율은 **2026-01-01 기준**이다.
