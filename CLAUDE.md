@AGENTS.md

# 프로젝트 규칙

## Supabase 스키마

- `supabase/migrations/*.sql` 이 스키마의 **단일 출처**다. 이미 적용된
  마이그레이션 파일은 절대 고치지 않는다 — 바꿀 게 있으면 새 파일을 덧붙인다.
- 스키마를 바꾼 뒤에는 타입을 다시 뽑는다:
  `supabase gen types typescript --linked > src/types/database.ts`
  (현재 `src/types/database.ts` 는 CLI 링크 전 임시 수기 작성본이다.)

## 환경변수

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

둘 다 브라우저에 노출되는 공개 값이다. 이름은 `.env.example` 에만 두고 값은
`.env.local`(커밋 금지)에 둔다. 값이 없으면 로그인 기능만 꺼지고 나머지 앱은
그대로 동작해야 한다 — CI 빌드에는 `.env.local` 이 없다.

## 로그인은 선택이다

로그인하지 않아도 시뮬레이터 전체를 쓸 수 있어야 한다. 라우트 가드는
`/account` 하나뿐이다. 사용자의 세무 입력값은 M1-b(동기화) 전까지 기기 밖으로
나가지 않는다 — 지금 서버로 가는 것은 로그인 자격증명뿐이고, 분석 도구는 없다.
