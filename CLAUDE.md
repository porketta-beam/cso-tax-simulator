@AGENTS.md

# 프로젝트 규칙

## Supabase 스키마

- `supabase/migrations/*.sql` 이 스키마의 **단일 출처**다. 이미 적용된
  마이그레이션 파일은 절대 고치지 않는다 — 바꿀 게 있으면 새 파일을 덧붙인다.
- 스키마를 바꾼 뒤에는 타입을 다시 뽑는다:
  `supabase gen types typescript --linked > src/types/database.ts`
  `src/types/database.ts` 는 이 명령의 출력 그대로다 — 손으로 고치지 않는다.
- 원격에 적용된 마이그레이션: `20260826000001_profiles.sql`,
  `20260826000002_simulations.sql`, `20260827000003_v2_ledger.sql`
  (`ledger_lines` 추가 · `profiles` 설정 컬럼 3개 추가 · `simulations` 삭제).

## 환경변수

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

둘 다 브라우저에 노출되는 공개 값이다. 이름은 `.env.example` 에만 두고 값은
`.env.local`(커밋 금지)에 둔다. 값이 없으면 로그인 기능만 꺼지고 나머지 앱은
그대로 동작해야 한다 — CI 빌드에는 `.env.local` 이 없다.

## 로그인은 선택이다

로그인하지 않아도 시뮬레이터 전체를 쓸 수 있어야 한다. 라우트 가드는
`/account` 하나뿐이다. **로그아웃 상태에서는 세무 입력값이 기기 밖으로 나가지
않는다** — 서버로 보내는 코드(`src/state/cloud-sync.ts`)는 세션이 있을 때만
호출된다. 분석 도구는 없다.

## 저장 (M1-b)

- 로컬은 항상, 서버는 로그인했을 때만. 로컬 키는 `cso-tax:state` 하나이고
  담기는 모양은 백업 파일과 같다(`toBackupPayload`) — 검증기를 하나만 두려고.
- 서버는 (`user_id`, `period_mode`, `period_start`) 당 jsonb **한 행**이다.
  `periodStart` 는 기간의 첫 달 1일(`YYYY-MM-01`).
- 충돌은 payload 안의 `updatedAt` 이 새로운 쪽이 이긴다. 같으면 로컬.
  재시도 큐는 없다 — 다음 변경이 다시 보낸다.
- `updatedAt` 은 **reducer 가 찍지 않는다.** 저장 계층이 찍는다 — reducer 가
  시계를 읽으면 순수성이 깨져 테스트가 오늘 날짜에 흔들린다. 같은 이유로
  `SET_PERIOD_MODE` 도 `today` 를 인자로 받는다.
- 상태 필드를 바꾸면 `SCHEMA_VERSION` 을 올리고, 옛 버전 payload 가 계속
  파싱되는지 테스트를 남긴다(현재 v3, v1·v2 호환).
