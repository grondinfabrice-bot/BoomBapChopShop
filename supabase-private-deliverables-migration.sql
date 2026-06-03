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
