-- profiles — auth.users 와 1:1 로 붙는 프로필 (M1-a)
--
-- 이 파일이 스키마의 단일 출처다. 이미 적용된 마이그레이션은 고치지 않고
-- 새 파일을 덧붙인다.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  -- role 은 뒤 마일스톤(세무사 열람)을 위해 미리 잡아 둔 자리다. 지금은 모든
  -- 가입자가 'user' 이고, 이 값을 읽는 코드는 아직 없다.
  role text not null default 'user' check (role in ('user', 'accountant', 'admin')),
  business_type text not null default 'individual'
    check (business_type in ('individual', 'corporate')),
  -- 탈퇴는 하드 삭제가 아니라 이 타임스탬프다(소프트 삭제). 세무 자료는
  -- 신고 이후에도 되돌아볼 일이 있고, 실수로 누른 탈퇴가 복구 불가능한 삭제가
  -- 되면 안 되기 때문이다. 실제 보관 기간과 파기 절차는 아직 정하지 않았다 —
  -- 정해지면 별도 마이그레이션으로 정리 작업을 붙인다.
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 남의 프로필은 읽지도 쓰지도 못한다.
create policy "본인 프로필 조회" on public.profiles
  for select using (auth.uid() = id);

create policy "본인 프로필 수정" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- insert 정책은 일부러 없다. 행은 아래 트리거만 만든다 — 클라이언트가 직접
-- insert 할 수 있으면 남의 id 로 행을 선점하는 길이 열린다.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 가입 직후 프로필 행을 만든다. auth 스키마에 쓰기 때문에 security definer 가
-- 필요하고, definer 함수는 search_path 를 고정해 두지 않으면 탈취 경로가 된다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
