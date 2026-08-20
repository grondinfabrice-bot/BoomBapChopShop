alter table public.orders
add column if not exists collector_card_status text not null default 'pending',
add column if not exists collector_card_path text,
add column if not exists collector_card_sent_at timestamptz,
add column if not exists collector_card_error text;

insert into storage.buckets (id, name, public)
values ('collector-cards', 'collector-cards', false)
on conflict (id) do nothing;

drop policy if exists "Admins can read collector cards" on storage.objects;
create policy "Admins can read collector cards"
on storage.objects for select
using (
  bucket_id = 'collector-cards'
  and exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);
