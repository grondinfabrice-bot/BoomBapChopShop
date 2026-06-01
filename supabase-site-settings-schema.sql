create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "Public site settings are readable" on public.site_settings;
create policy "Public site settings are readable"
on public.site_settings for select
using (true);

drop policy if exists "Admin site settings write access" on public.site_settings;
create policy "Admin site settings write access"
on public.site_settings for all
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

insert into public.site_settings (key, value)
values (
  'ticker',
  '{"tickerText":"MP3 / WAV / STEMS INSTANT DELIVERY | NEW DROP: SHADOW OF THE SP | REAL SAMPLES. RAW SOUL. TIMELESS BANGERS. SP-1200 MPC3000 LICENSING OPTIONS BUILT FOR ARTISTS"}'::jsonb
)
on conflict (key) do nothing;
