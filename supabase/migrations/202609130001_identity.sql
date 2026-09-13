-- Provision the owner's UUID using trusted SQL, never browser metadata.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.minihompy_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table private.minihompy_admins enable row level security;
revoke all on private.minihompy_admins from public, anon, authenticated;

create function public.is_minihompy_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.minihompy_admins as admins
    where admins.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_minihompy_admin() from public;
grant execute on function public.is_minihompy_admin() to anon, authenticated;
commit;
