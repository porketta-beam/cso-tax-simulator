-- simulations — 계정별 시뮬레이터 상태 (M1-b)
--
-- 상태 전체를 (user_id, period_mode, period_start) 당 jsonb 한 행으로 넣는다.
-- 파일 백업(`toBackupPayload`)과 **같은 모양**이라 직렬화 코드도 검증기도
-- 하나뿐이고, 필드가 늘어도 스키마 마이그레이션이 필요 없다. 지금 서버가
-- 하는 일은 "기기 사이로 상태를 옮기는 것" 하나뿐이라 이 이상이 필요 없다.
--
-- ponytail: 명세(ledger)를 행으로 쪼개지 않았다. SQL 로 명세 한 줄을 집계·
-- 검색·정렬해야 할 일이 생기면(예: 연간 지출 리포트, 카드내역 자동 분류)
-- 그때 ledger_lines 테이블을 새 마이그레이션으로 덧붙이고 state 의 ledger 는
-- 그쪽으로 옮긴다.
--
-- 기간 키는 기간의 첫 달 1일이다 — 월간 2026-08, 분기 2026 Q3, 연간 2026 이
-- 각각 2026-08-01 / 2026-07-01 / 2026-01-01 이다.

create table public.simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_mode text not null check (period_mode in ('month', 'quarter', 'year')),
  period_start date not null,
  schema_version int not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 계정 × 기간당 한 행. 클라이언트의 upsert 가 이 제약을 충돌 대상으로 쓴다
  unique (user_id, period_mode, period_start)
);

alter table public.simulations enable row level security;

-- 남의 세무 입력값은 읽지도 쓰지도 못한다. 보호는 전적으로 RLS 가 한다 —
-- 브라우저에 나가는 publishable key 는 비밀이 아니다.
create policy "본인 시뮬레이션 조회" on public.simulations
  for select using (auth.uid() = user_id);

create policy "본인 시뮬레이션 생성" on public.simulations
  for insert with check (auth.uid() = user_id);

create policy "본인 시뮬레이션 수정" on public.simulations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "본인 시뮬레이션 삭제" on public.simulations
  for delete using (auth.uid() = user_id);

-- 0001 에서 만든 트리거 함수를 그대로 쓴다
create trigger simulations_set_updated_at
  before update on public.simulations
  for each row execute function public.set_updated_at();

-- M2 의 기간 이력 목록("지난 분기 보기")이 이 인덱스를 탄다
create index simulations_user_period_idx
  on public.simulations (user_id, period_start desc);
