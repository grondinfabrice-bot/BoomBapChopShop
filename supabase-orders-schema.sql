create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "Admins can read admin list" on public.admin_users;
create policy "Admins can read admin list"
on public.admin_users for select
using (user_id = auth.uid());

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_email text not null,
  customer_first_name text,
  customer_last_name text,
  items jsonb not null default '[]'::jsonb,
  contract_urls text[] not null default '{}',
  total numeric(10, 2) not null default 0,
  currency text not null default 'EUR',
  status text not null default 'demo',
  payment_provider text,
  payment_reference text,
  license_acceptance jsonb not null default '{}'::jsonb,
  email_sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_status_check check (
    status in ('demo', 'pending_payment', 'paid', 'email_sent', 'delivered', 'cancelled', 'refunded')
  ),
  constraint orders_email_check check (position('@' in customer_email) > 1),
  constraint orders_total_check check (total >= 0),
  constraint orders_items_array_check check (jsonb_typeof(items) = 'array')
);

create index if not exists orders_customer_email_idx on public.orders (customer_email);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.orders enable row level security;

drop policy if exists "Public can create demo orders" on public.orders;
create policy "Public can create demo orders"
on public.orders for insert
with check (
  status = 'demo'
  and customer_email is not null
  and jsonb_array_length(items) > 0
);

drop policy if exists "Admin orders access" on public.orders;
create policy "Admin orders access"
on public.orders for all
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

insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;
