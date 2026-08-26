# CSO 세무 시뮬레이터 — Frontend

제약 영업대행사(CSO) 1인 개인사업자를 위한 세무 시뮬레이터. 수입·지출을 **장부**에
한 건씩 넣으면 VAT 역산 → 과세표준 → 누진세율·4대보험 → **Net Cash** 까지 계산하고,
신고 시점에 미리 빼둘 **적립금**을 제안한다.

**로그인이 필요하다.** 장부는 계정에 저장되므로 기기가 바뀌어도 이어서 쓴다.
분석 도구는 쓰지 않는다.

v2 구조와 화면 정의는 `../../claudedocs/기능정의_v2.md` 가 단일 출처다.

## 근거 문서

| 문서 | 역할 |
|---|---|
| `../../claudedocs/기능정의_v2.md` | v2 화면 지도 · 장부 모델 · 삭제 목록 |
| `../../PRD.md` | 계산 로직(§4) · 검증 벡터(§5) · 기술 스택(§8) |
| `../../CTveiw/` | 디자인 시스템 — 토큰, 컴포넌트, 9개 화면 UI 킷 |

## 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS v4 (`@theme` 에 디자인 토큰 이식) |
| UI 프리미티브 | shadcn/ui (radix) |
| 상태 | 장부는 Supabase(서버) — 로컬 사본 없음 |
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
    page.tsx                H0 홈(대시보드)     /
    tax/layout.tsx          T0 세무 셸 — 장부|결과 세그먼트
    tax/page.tsx            → /tax/ledger 로 보냄
    tax/ledger/             T1 장부 목록        /tax/ledger
    tax/ledger/new/         T1-a 추가 폼        /tax/ledger/new
    tax/ledger/[id]/        T1-a 수정 폼        /tax/ledger/[id]
    tax/result/             T2 결과·기간 선택   /tax/result
    tax/settings/           T2-1 계산 설정      /tax/settings
    settings/               S1 앱 설정          /settings
    shop/                   P1 쇼핑(목업)       /shop
    advisor/                A1 세무사 추천(목업) /advisor
    account/                내 정보·탈퇴        /account
    login/                  로그인              /login
    signup/                 회원가입            /signup
    design-system/          컴포넌트 갤러리     /design-system
  components/
    ui/                shadcn 프리미티브 — 복사해서 소유하는 코드다.
                       button·card·badge 는 디자인 시스템 어휘로 재정의했으므로
                       `shadcn add` 를 다시 돌리면 덮어써진다
    design-system/     CTveiw 포팅 컴포넌트 15종 + 배럴(index.ts)
    screens/           app-shell.tsx  상단 바 + 하단 탭 4개 + ☰ 메뉴 시트
                       auth-gate.tsx  로그인 가드
  config/
    tax-rates.ts       ⚠️ 모든 세율·요율의 단일 출처 (PRD §4 원칙)
    mock-catalog.ts    쇼핑·세무사 목업 — 실데이터로 갈 때 이 파일만 교체한다
  lib/
    tax/               계산 파이프라인 (STAGE 02 → 03 → 04)
  state/
    auth-context.tsx   Supabase 세션 보관
supabase/
  migrations/          DB 스키마의 단일 출처
```

### 설정이 두 개인 이유

**계산 설정**(`/tax/settings`)은 결과 숫자를 바꾸는 값들이다 — 사업자 유형·국민연금
상한·원천징수율·부양가족 수. 결과 화면 ⚙ 와 내 정보에서 들어간다. **앱 설정**
(`/settings`)은 계산과 무관한 앱 자체의 값들이다 — 비밀번호 변경·알림·장부 전체
내보내기·앱 정보. ☰ 메뉴에서만 들어간다. 둘을 합치면 한 화면에서 "설정을 바꿨더니
세금이 달라졌다"와 "안 달라졌다"가 동시에 일어난다.

### 컴포넌트 사용 규칙

화면 코드는 `@/components/design-system` 배럴에서만 import 한다. shadcn 프리미티브를
화면에서 직접 쓰면 디자인 시스템이 강제하는 규칙(금액은 `role` 로만, 카드는 elevation
으로 구분)을 우회하게 된다.

`globals.css` 에 디자인 토큰을 추가하면 **`src/lib/utils.ts` 의 tailwind-merge 설정도
같이 고칠 것.** 빠뜨리면 `text-money-net` 같은 색이 같은 접두사의 크기 유틸리티에
덮여 조용히 사라진다 — 빌드도 타입체크도 통과하고 화면만 틀린다.

## 인증 — 로그인 필수

Supabase Auth 를 쓴다. `/login`, `/signup`, `/design-system` 을 뺀 모든 라우트는
`src/components/screens/auth-gate.tsx` 가 막고, 세션이 없으면 `/login` 으로 보낸다.
서버 코드가 없으므로 `@supabase/ssr` 대신 브라우저 클라이언트
(`src/lib/supabase.ts`)만 쓰고, 판단은 전부 브라우저에서 일어난다 — 세션이
확인되기 전에는 아무것도 렌더하지 않는다(보호된 화면이 스쳐 지나가면 안 된다).

```bash
cp .env.example .env.local   # 값은 Supabase 대시보드에서
```

| 환경변수 | 비고 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 공개 값 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개 값. 보호는 RLS 가 한다 |

값이 없어도 빌드는 그대로 된다(CI 에는 `.env.local` 이 없다). 이때 앱은 리다이렉트
루프 대신 "설정되지 않은 빌드" 안내를 띄운다.

### Supabase 대시보드에서 켜 둬야 하는 것

| 항목 | 값 |
|---|---|
| Authentication → URL Configuration → Site URL | 운영 도메인 |
| Authentication → URL Configuration → Redirect URLs | `http://localhost:3000/`, `https://<운영도메인>/`, Vercel 프리뷰 도메인 |
| Authentication → Providers → Email → Confirm email | **ON** (가입 직후에는 로그인되지 않는다) |
| Authentication → Providers → Google | 켜고 client ID/secret 등록 |
| Authentication → Providers → Kakao | 켜고 REST API 키/secret 등록 |

### 스키마

`supabase/migrations/*.sql` 이 단일 출처다. 적용된 마이그레이션은 고치지 않고
새 파일을 덧붙인다. 스키마를 바꾼 뒤에는
`supabase gen types typescript --linked > src/types/database.ts` 로 타입을 다시
뽑는다 (`src/types/database.ts` 는 이 명령의 출력 그대로다 — 손으로 고치지 않는다).

| 마이그레이션 | 내용 |
|---|---|
| `20260826000001_profiles.sql` | `profiles` — auth.users 와 1:1, 소프트 탈퇴 |
| `20260826000002_simulations.sql` | `simulations` — 계정 × 기간당 jsonb 한 행 |

탈퇴는 하드 삭제가 아니라 `profiles.deactivated_at` 기록 + 로그아웃이다.
자료는 보존되며, 보관 기간과 파기 절차는 아직 정하지 않았다.

## 저장 — 서버 한 곳

장부는 `ledger_lines` 행으로 계정에 저장된다. **로컬 사본은 두지 않는다** —
사본을 두는 순간 어긋난 두 값 중 어느 쪽이 맞는지 판정해야 하고, 그 판정기를
유지할 이유가 없다. 설정(사업자 유형·국민연금 상한·원천징수율·부양가족 수)은
`profiles` 컬럼이다. 로그아웃 상태에서는 아무것도 전송하지 않는다 —
애초에 화면에 들어오지 못한다.

| | 내용 |
|---|---|
| 장부 한 건 | 날짜 · 수입/지출 · 금액(정수 원, VAT 포함) · 항목 · 증빙(지출만) · 거래처 · 메모 |
| 공제 판정 | 증빙 종류로 자동 결정한다(간이영수증·무증빙 → 불공제) |
| 기간 | 결과 화면에서 시작일~종료일을 직접 고른다. 저장된 "기간 모드"는 없다 |

JSON 백업/복원은 v2 에서 없앴다. 엑셀(.xlsx) 내보내기는 결과 화면(T2)으로 옮겨
다시 붙인다.

## 아직 없는 것

1단계 범위 안에서도 다음 마일스톤으로 미뤄 둔 것들이다.

| 항목 | 현재 상태 |
|---|---|
| P1 쇼핑 · A1 세무사 추천 | 화면은 있으나 상품·세무사는 목업(`config/mock-catalog.ts`)이다. 결제도 예약도 없다 |
| 신고 기한 알림 | 앱 설정에 자리만 있고 저장되지 않는다 ("준비 중") |
| 이용약관 · 개인정보 처리방침 | 문서를 아직 쓰지 않았다. 앱 설정에 행만 있다 |
| PWA (manifest·Service Worker) | 없음. 오프라인 동작과 홈 화면 설치 불가 |
| 태블릿 2열·데스크톱 사이드바 (PRD §6.1) | 모바일 우선 + 데스크톱 가운데 정렬까지만 |

## 법인사업자

설정 화면(T2-1)에서 **법인사업자**를 고르면 과세표준에 종합소득세 8구간 대신 **법인세
4구간**을 적용한다 — 2억 이하 10% · 2억~200억 20% · 200억~3,000억 22% · 3,000억 초과
25%. 2025년 12월 개정으로 **2026-01-01 이후 개시하는 사업연도**부터 전 구간이 +1%p
올랐고, 그 표를 쓴다([국세청 「법인세 세율」](https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7746&mi=2372)).
지방소득세 10%, 연환산(월 ×12 · 분기 ×4), 정수 원 연산은 개인과 동일하다. VAT 역산,
4대보험, 프리랜서 3.3% 원천징수, 필요경비 산입 규칙도 그대로다. 대표 급여는 **정규직
급여 칸**에 넣으면 필요경비와 4대보험 회사부담에 함께 잡힌다.

1차 버전이라 법인 고유의 세부 규정 — 성실신고확인, 최저한세, 이월결손금, 세액공제·
감면, 중간예납 — 은 반영하지 않았다. 결과 화면의 계산 근거 섹션이 법인 모드에서 이 범위를
그대로 밝힌다.

### 단일 출처 원칙

모든 세율·요율·한도는 `src/config/tax-rates.ts` 에서만 정의한다. 화면 컴포넌트와 계산
함수 어디에서도 숫자 리터럴을 직접 쓰지 않는다. 세법이 개정되면 이 파일 한 곳만 고친다.
결과 화면의 계산 근거 섹션은 이 파일을 그대로 렌더링한다.

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
