alter table public.beats
add column if not exists stems_available boolean default true;

update public.beats
set stems_available = true
where stems_available is null;
