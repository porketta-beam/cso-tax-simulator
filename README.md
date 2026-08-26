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
    login/             로그인             /login
    signup/            회원가입           /signup
    account/           내 계정            /account
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
supabase/
  migrations/          DB 스키마의 단일 출처 (아직 push 하지 않았다)
```

### 컴포넌트 사용 규칙

화면 코드는 `@/components/design-system` 배럴에서만 import 한다. shadcn 프리미티브를
화면에서 직접 쓰면 디자인 시스템이 강제하는 규칙(금액은 `role` 로만, 카드는 elevation
으로 구분)을 우회하게 된다.

`globals.css` 에 디자인 토큰을 추가하면 **`src/lib/utils.ts` 의 tailwind-merge 설정도
같이 고칠 것.** 빠뜨리면 `text-money-net` 같은 색이 같은 접두사의 크기 유틸리티에
덮여 조용히 사라진다 — 빌드도 타입체크도 통과하고 화면만 틀린다.

## 인증 (M1-a)

Supabase Auth 를 쓴다. **로그인은 선택**이다 — 로그인하지 않아도 시뮬레이터
전체가 그대로 동작하고, 라우트 가드는 `/account` 하나뿐이다. 서버가 없으므로
`@supabase/ssr` 대신 브라우저 클라이언트(`src/lib/supabase.ts`)만 쓴다.
사용자의 세무 입력값은 여전히 기기 밖으로 나가지 않는다 — 지금 서버로 가는
것은 로그인 자격증명뿐이고, DB 동기화는 M1-b 다.

```bash
cp .env.example .env.local   # 값은 Supabase 대시보드에서
```

| 환경변수 | 비고 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 공개 값 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개 값. 보호는 RLS 가 한다 |

값이 없으면 로그인 화면만 "설정되지 않았습니다"로 바뀌고 빌드는 그대로 된다
(CI 에는 `.env.local` 이 없다).

### Supabase 대시보드에서 켜 둬야 하는 것

| 항목 | 값 |
|---|---|
| Authentication → URL Configuration → Site URL | 운영 도메인 |
| Authentication → URL Configuration → Redirect URLs | `http://localhost:3000/account`, `https://<운영도메인>/account`, Vercel 프리뷰 도메인 |
| Authentication → Providers → Email → Confirm email | **ON** (가입 직후에는 로그인되지 않는다) |
| Authentication → Providers → Google | 켜고 client ID/secret 등록 |
| Authentication → Providers → Kakao | 켜고 REST API 키/secret 등록 |

### 스키마

`supabase/migrations/*.sql` 이 단일 출처다. 적용된 마이그레이션은 고치지 않고
새 파일을 덧붙인다. 스키마를 바꾼 뒤에는
`supabase gen types typescript --linked > src/types/database.ts` 로 타입을 다시
뽑는다 (현재 파일은 CLI 링크 전 임시 수기 작성본이다).

탈퇴는 하드 삭제가 아니라 `profiles.deactivated_at` 기록 + 로그아웃이다.
자료는 보존되며, 보관 기간과 파기 절차는 아직 정하지 않았다.

## 아직 없는 것

1단계 범위 안에서도 다음 마일스톤으로 미뤄 둔 것들이다.

| 항목 | 현재 상태 |
|---|---|
| 자동 저장 (IndexedDB) | 없음. 새로고침하면 입력이 사라진다. S-08 의 파일 내보내기/불러오기는 동작한다 |
| PWA (manifest·Service Worker) | 없음. 오프라인 동작과 홈 화면 설치 불가 |
| 저장 환경 감지 (PRD §7.3) | 배너는 `ios-tab` 고정. 실제 감지 로직 없음 |
| 태블릿 2열·데스크톱 사이드바 (PRD §6.1) | 모바일 우선 + 데스크톱 가운데 정렬까지만 |

## 법인사업자

시작 화면(S-00)에서 **법인사업자**를 고르면 과세표준에 종합소득세 8구간 대신 **법인세
4구간**을 적용한다 — 2억 이하 10% · 2억~200억 20% · 200억~3,000억 22% · 3,000억 초과
25%. 2025년 12월 개정으로 **2026-01-01 이후 개시하는 사업연도**부터 전 구간이 +1%p
올랐고, 그 표를 쓴다([국세청 「법인세 세율」](https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7746&mi=2372)).
지방소득세 10%, 연환산(월 ×12 · 분기 ×4), 정수 원 연산은 개인과 동일하다. VAT 역산,
4대보험, 프리랜서 3.3% 원천징수, 필요경비 산입 규칙도 그대로다. 대표 급여는 **정규직
급여 칸**에 넣으면 필요경비와 4대보험 회사부담에 함께 잡힌다.

1차 버전이라 법인 고유의 세부 규정 — 성실신고확인, 최저한세, 이월결손금, 세액공제·
감면, 중간예납 — 은 반영하지 않았다. 계산 기준 화면(S-07)이 법인 모드에서 이 범위를
그대로 밝힌다.

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
