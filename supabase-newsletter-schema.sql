create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'footer',
  status text not null default 'subscribed',
  page_url text,
  user_agent text,
  subscribed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_subscribers_email_check check (
    email = lower(email)
    and position('@' in email) > 1
    and position('.' in split_part(email, '@', 2)) > 1
  ),
  constraint newsletter_subscribers_status_check check (
    status in ('subscribed', 'unsubscribed')
  )
);

create index if not exists newsletter_subscribers_created_at_idx
on public.newsletter_subscribers (subscribed_at desc);

grant insert on public.newsletter_subscribers to anon;
grant insert on public.newsletter_subscribers to authenticated;
grant select, update, delete on public.newsletter_subscribers to authenticated;

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "Public can subscribe to newsletter" on public.newsletter_subscribers;
create policy "Public can subscribe to newsletter"
on public.newsletter_subscribers for insert
with check (
  status = 'subscribed'
  and email = lower(email)
  and position('@' in email) > 1
);

drop policy if exists "Admin newsletter subscribers access" on public.newsletter_subscribers;
create policy "Admin newsletter subscribers access"
on public.newsletter_subscribers for all
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
