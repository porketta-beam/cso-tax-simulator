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
`.env.local`(커밋 금지)에 둔다. CI 빌드에는 `.env.local` 이 없으므로 값이 없어도
빌드는 통과해야 한다 — 이때 앱은 리다이렉트 루프 대신 "설정되지 않은 빌드" 안내를
띄운다(`AuthGate`).

## 로그인 필수

`/login`, `/signup`, `/design-system` 을 뺀 **모든 라우트**는
`src/components/screens/auth-gate.tsx` 가 막는다. 서버 코드가 없으므로 판단은
전부 브라우저에서 일어난다 — 세션이 확인되기 전에는 아무것도 렌더하지 않는다.
보호된 화면이 한 프레임이라도 비쳤다 사라지면 그건 버그다.

장부는 서버에만 있다. **localStorage 에 세무 자료를 두지 않는다** — 로컬 사본을
두는 순간 서버와 어긋난 값이 어느 쪽이 맞는지 판정해야 하고, 그 판정기를
유지할 이유가 없다. 분석 도구도 없다.
