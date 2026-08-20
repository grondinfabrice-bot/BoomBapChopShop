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
  subtotal numeric(10, 2) not null default 0,
  discount jsonb not null default '{}'::jsonb,
  total numeric(10, 2) not null default 0,
  currency text not null default 'EUR',
  status text not null default 'demo',
  payment_provider text,
  payment_reference text,
  license_acceptance jsonb not null default '{}'::jsonb,
  email_sent_at timestamptz,
  collector_card_status text not null default 'pending',
  collector_card_path text,
  collector_card_sent_at timestamptz,
  collector_card_error text,
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

alter table public.orders
add column if not exists subtotal numeric(10, 2) not null default 0,
add column if not exists discount jsonb not null default '{}'::jsonb,
add column if not exists collector_card_status text not null default 'pending',
add column if not exists collector_card_path text,
add column if not exists collector_card_sent_at timestamptz,
add column if not exists collector_card_error text;

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label text,
  discount_type text not null default 'percent',
  discount_value numeric(10, 2) not null,
  applies_to text not null default 'all',
  min_order_total numeric(10, 2) not null default 0,
  max_uses integer,
  used_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_codes_code_upper_check check (code = upper(code)),
  constraint promo_codes_discount_type_check check (discount_type in ('percent', 'fixed')),
  constraint promo_codes_applies_to_check check (applies_to in ('all', 'beats', 'services')),
  constraint promo_codes_discount_value_check check (discount_value > 0),
  constraint promo_codes_min_order_total_check check (min_order_total >= 0),
  constraint promo_codes_used_count_check check (used_count >= 0),
  constraint promo_codes_max_uses_check check (max_uses is null or max_uses > 0)
);

create index if not exists promo_codes_code_idx on public.promo_codes (code);
create index if not exists promo_codes_active_idx on public.promo_codes (active);

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
alter table public.promo_codes enable row level security;

drop policy if exists "Public can create demo orders" on public.orders;

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

drop policy if exists "Customers can read their own orders" on public.orders;
create policy "Customers can read their own orders"
on public.orders for select
using (lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "Admin promo codes access" on public.promo_codes;
create policy "Admin promo codes access"
on public.promo_codes for all
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

drop trigger if exists set_promo_codes_updated_at on public.promo_codes;
create trigger set_promo_codes_updated_at
before update on public.promo_codes
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

alter table public.beats
add column if not exists delivery_files jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public)
values ('deliverables', 'deliverables', false)
on conflict (id) do nothing;

drop policy if exists "Admin can upload deliverables" on storage.objects;
create policy "Admin can upload deliverables"
on storage.objects for insert
with check (
  bucket_id = 'deliverables'
  and exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);
