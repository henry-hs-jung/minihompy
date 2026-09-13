begin;
create table public.minihompy_profile (
  id integer primary key default 1 check (id = 1),
  image_path text not null default 'assets/photos/lake.jpg'
    check (image_path in ('', 'assets/photos/lake.jpg') or image_path ~ '^[0-9a-f-]{36}\.(jpg|png|webp|gif)$'),
  image_alt text not null default '호수 풍경' check (char_length(image_alt) <= 200),
  image_width integer not null default 192 check (image_width between 1 and 300),
  name text check (name is null or char_length(btrim(name)) between 1 and 20),
  paragraphs jsonb,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
create function private.validate_minihompy_profile() returns trigger
language plpgsql set search_path = '' as $$
declare item jsonb; total integer := 0;
begin
  if new.paragraphs is not null then
    if jsonb_typeof(new.paragraphs) is distinct from 'array' then raise exception 'Invalid paragraphs' using errcode = '23514'; end if;
    if jsonb_array_length(new.paragraphs) > 100 then raise exception 'Too many paragraphs' using errcode = '23514'; end if;
    for item in select * from jsonb_array_elements(new.paragraphs) loop
      if jsonb_typeof(item) is distinct from 'string' then raise exception 'Invalid paragraph' using errcode = '23514'; end if;
      total := total + char_length(item #>> '{}');
    end loop;
    if total > 10000 then raise exception 'Profile too long' using errcode = '23514'; end if;
  end if;
  if tg_op = 'UPDATE' then new.revision := old.revision + 1; end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.validate_minihompy_profile() from public, anon, authenticated;
create trigger validate_minihompy_profile before insert or update on public.minihompy_profile
for each row execute function private.validate_minihompy_profile();
alter table public.minihompy_profile enable row level security;
revoke all on public.minihompy_profile from public, anon, authenticated;
grant select on public.minihompy_profile to anon, authenticated;
grant update (image_path, image_alt, image_width, name, paragraphs) on public.minihompy_profile to authenticated;
create policy profile_read on public.minihompy_profile for select to anon, authenticated using (true);
create policy profile_update on public.minihompy_profile for update to authenticated
using ((select public.is_minihompy_admin())) with check ((select public.is_minihompy_admin()));
insert into public.minihompy_profile default values;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('minihompy-profile', 'minihompy-profile', true, 6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
create policy profile_objects_read on storage.objects for select to authenticated
using (bucket_id = 'minihompy-profile' and (select public.is_minihompy_admin()));
create policy profile_objects_insert on storage.objects for insert to authenticated
with check (bucket_id = 'minihompy-profile' and (select public.is_minihompy_admin())
  and name ~ '^[0-9a-f-]{36}\.(jpg|png|webp|gif)$');
create policy profile_objects_delete on storage.objects for delete to authenticated
using (bucket_id = 'minihompy-profile' and (select public.is_minihompy_admin())
  and not exists (select 1 from public.minihompy_profile p where p.image_path = storage.objects.name));
commit;
