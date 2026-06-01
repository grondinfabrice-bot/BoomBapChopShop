-- Replace the email below with the email you use to log in to the admin.
insert into public.admin_users (user_id)
select id
from auth.users
where email = 'TON_EMAIL_ADMIN'
on conflict (user_id) do nothing;

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
