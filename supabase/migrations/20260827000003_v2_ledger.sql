-- ledger_lines — 장부 한 건 = 행 하나 (v2)
--
-- v1 은 시뮬레이터 상태 전체를 jsonb 한 덩어리(`simulations`)로 넣었다. v2 는
-- 마법사를 버리고 장부 앱이 되므로, 한 건씩 추가·수정·삭제하고 기간으로
-- 잘라 집계해야 한다. jsonb 한 덩어리로는 그 셋 다 못 한다.
--
-- ponytail: `kind`·`category`·`evidence` 에 CHECK 를 걸지 않았다. 세 값의
-- 유효 집합은 앱 상수(`src/config/tax-rates.ts`)가 단일 출처이고, 화면·집계·
-- 세금 계산이 전부 그 상수를 읽는다. CHECK 를 걸면 같은 목록이 두 곳에 생겨
-- 항목 하나 늘릴 때마다 마이그레이션이 딸려 온다. 값이 틀려도 남의 데이터를
-- 건드리지 못하고(RLS) 집계에서 불공제 쪽으로 떨어질 뿐이라 위험이 낮다.
-- 관리자 화면이나 SQL 리포트가 이 값을 신뢰해야 할 때 CHECK 를 붙인다.

create table public.ledger_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  date date not null,
  -- 정수 원, VAT 포함. 부호는 kind 가 정한다 — 금액은 항상 양수다
  amount bigint not null check (amount > 0),
  -- sales|otherIncome|qualified|fixed|nonDeductible|payrollFreelancer|payrollSalary
  category text not null,
  -- 지출만. card|taxInvoice|cashReceipt|simpleReceipt|none
  evidence text,
  merchant text not null default '',
  memo text not null default '',
  -- 증빙 때문에 우리가 자동으로 불공제로 끌어온 행인가. 사용자가 직접 고른
  -- 불공제와 구분해야 증빙을 되돌릴 때 같이 되돌릴 수 있다
  auto_forced boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ledger_lines enable row level security;

-- 남의 장부는 읽지도 쓰지도 못한다. 보호는 전적으로 RLS 가 한다 —
-- 브라우저에 나가는 publishable key 는 비밀이 아니다.
create policy "본인 장부 조회" on public.ledger_lines
  for select using (auth.uid() = user_id);

create policy "본인 장부 생성" on public.ledger_lines
  for insert with check (auth.uid() = user_id);

create policy "본인 장부 수정" on public.ledger_lines
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "본인 장부 삭제" on public.ledger_lines
  for delete using (auth.uid() = user_id);

-- 0001 에서 만든 트리거 함수를 그대로 쓴다
create trigger ledger_lines_set_updated_at
  before update on public.ledger_lines
  for each row execute function public.set_updated_at();

-- 모든 조회가 "내 것 + 기간" 이다. 목록은 최신 날짜부터 그린다
create index ledger_lines_user_date_idx
  on public.ledger_lines (user_id, date desc);

-- 설정은 테이블을 새로 만들지 않고 profiles 컬럼으로 붙인다. 계정당 한 벌뿐인
-- 값이라 1:1 테이블을 만들면 조인만 늘어난다.
alter table public.profiles
  -- 국민연금 기준소득월액 상한 적용 여부 (PRD §13-1)
  add column pension_cap_enabled boolean not null default false,
  -- 프리랜서 원천징수율. 기본 3.3% = 소득세 3% + 지방소득세 0.3%
  add column withholding_rate numeric(5,4) not null default 0.033,
  -- 부양가족 수(본인 제외). 개인만 쓴다 — 법인은 기본공제가 없다
  add column dependents int not null default 0 check (dependents >= 0);

-- v1 스냅샷 폐기. 장부가 행으로 쪼개지면서 jsonb 한 덩어리는 쓸 곳이 없다.
-- 들어 있던 것은 테스트 데이터뿐이다.
drop table public.simulations;
