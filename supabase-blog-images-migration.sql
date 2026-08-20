-- Run once in the Supabase SQL editor for an existing project.

alter table public.posts
add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public blog images are readable" on storage.objects;
create policy "Public blog images are readable"
on storage.objects for select
using (bucket_id = 'blog-images');

drop policy if exists "Admin can upload blog images" on storage.objects;
create policy "Admin can upload blog images"
on storage.objects for insert
with check (
  bucket_id = 'blog-images'
  and exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);
