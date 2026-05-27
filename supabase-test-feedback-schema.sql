create table if not exists public.test_feedback (
  id uuid primary key default gen_random_uuid(),
  tester_name text,
  tester_email text,
  device text,
  ratings jsonb not null default '{}'::jsonb,
  clicked text,
  blocked text,
  unclear_step text,
  trust_notes text,
  bugs text,
  priority text,
  would_buy text,
  created_at timestamptz not null default now(),
  constraint test_feedback_email_check check (
    tester_email is null
    or tester_email = ''
    or position('@' in tester_email) > 1
  ),
  constraint test_feedback_would_buy_check check (
    would_buy is null
    or would_buy in ('yes', 'maybe', 'no')
  )
);

create index if not exists test_feedback_created_at_idx on public.test_feedback (created_at desc);

alter table public.test_feedback alter column tester_name drop not null;
alter table public.test_feedback alter column tester_email drop not null;
alter table public.test_feedback alter column device drop not null;
alter table public.test_feedback alter column clicked drop not null;
alter table public.test_feedback alter column blocked drop not null;
alter table public.test_feedback alter column unclear_step drop not null;
alter table public.test_feedback alter column trust_notes drop not null;
alter table public.test_feedback alter column bugs drop not null;
alter table public.test_feedback alter column priority drop not null;
alter table public.test_feedback alter column would_buy drop not null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'test_feedback'
    and column_name = 'title'
  ) then
    alter table public.test_feedback alter column title drop not null;
  end if;
end $$;

grant insert on public.test_feedback to anon;
grant insert on public.test_feedback to authenticated;
grant select, update, delete on public.test_feedback to authenticated;

alter table public.test_feedback enable row level security;

drop policy if exists "Public can create test feedback" on public.test_feedback;
create policy "Public can create test feedback"
on public.test_feedback for insert
with check (jsonb_typeof(ratings) = 'object');

drop policy if exists "Admin test feedback access" on public.test_feedback;
create policy "Admin test feedback access"
on public.test_feedback for all
using (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);
