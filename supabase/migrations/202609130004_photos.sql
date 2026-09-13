begin;

create table public.photo_folders (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'folder' check (kind in ('folder', 'divider')),
  label text not null default '' check (char_length(label) <= 40),
  description text not null default '' check (char_length(description) <= 300),
  sort_order integer not null default 0 check (sort_order >= 0),
  unique (id, kind),
  check (kind = 'divider' or char_length(btrim(label)) > 0)
);
create table public.photo_posts (
  id uuid primary key,
  folder_id uuid not null,
  folder_kind text not null default 'folder' check (folder_kind = 'folder'),
  author_id uuid default auth.uid() references auth.users(id) on delete set null,
  author_name text not null check (char_length(btrim(author_name)) between 1 and 20),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body jsonb not null,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (folder_id, folder_kind) references public.photo_folders(id, kind) on delete restrict
);
create index photo_posts_page on public.photo_posts(folder_id, created_at desc, id desc);

create function private.validate_photo_post() returns trigger
language plpgsql set search_path = '' as $$
declare block jsonb; texts integer := 0; images integer := 0;
begin
  if jsonb_typeof(new.body) is distinct from 'array' then raise exception 'Invalid photo body'; end if;
  if jsonb_array_length(new.body) not between 1 and 100 then raise exception 'Invalid block count'; end if;
  for block in select value from jsonb_array_elements(new.body) loop
    if jsonb_typeof(block) is distinct from 'object' then raise exception 'Invalid block'; end if;
    if block->>'type' = 'text' and jsonb_typeof(block->'text') = 'string' then
      texts := texts + char_length(block->>'text');
    elsif block->>'type' = 'image' and jsonb_typeof(block->'path') = 'string' then
      if (block->>'path') !~ ('^' || new.id::text || '/[0-9a-f-]{36}\.(jpg|png|webp|gif)$') then
        raise exception 'Invalid image path';
      end if;
      images := images + 1;
    else raise exception 'Invalid block type';
    end if;
  end loop;
  if texts > 50000 or images not between 1 and 20 then raise exception 'Invalid content size'; end if;
  if tg_op = 'UPDATE' then new.revision := old.revision + 1; end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.validate_photo_post() from public, anon, authenticated;
create trigger validate_photo_post before insert or update on public.photo_posts
  for each row execute function private.validate_photo_post();

alter table public.photo_folders enable row level security;
alter table public.photo_posts enable row level security;
revoke all on public.photo_folders, public.photo_posts from public, anon, authenticated;
grant select on public.photo_folders, public.photo_posts to anon, authenticated;
grant insert (kind, label, description, sort_order), update (label, description, sort_order), delete
  on public.photo_folders to authenticated;
grant insert (id, folder_id, author_name, title, body), update (folder_id, title, body), delete
  on public.photo_posts to authenticated;
create policy photo_folders_read on public.photo_folders for select to anon, authenticated using (true);
create policy photo_folders_admin on public.photo_folders for all to authenticated
  using ((select public.is_minihompy_admin())) with check ((select public.is_minihompy_admin()));
create policy photo_posts_read on public.photo_posts for select to anon, authenticated using (true);
create policy photo_posts_insert on public.photo_posts for insert to authenticated
  with check ((select public.is_minihompy_admin()) and author_id = (select auth.uid()));
create policy photo_posts_update on public.photo_posts for update to authenticated
  using ((select public.is_minihompy_admin()) and author_id = (select auth.uid()))
  with check ((select public.is_minihompy_admin()) and author_id = (select auth.uid()));
create policy photo_posts_delete on public.photo_posts for delete to authenticated
  using ((select public.is_minihompy_admin()));

-- Public photographs only. Uploads have immutable, random names; no UPDATE/upsert policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('minihompy-photos', 'minihompy-photos', true, 6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
create policy photo_objects_read on storage.objects for select to authenticated
  using (bucket_id = 'minihompy-photos' and (select public.is_minihompy_admin()));
create policy photo_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'minihompy-photos' and (select public.is_minihompy_admin())
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|gif)$');
-- Published references cannot be removed through the browser Storage API.
create policy photo_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'minihompy-photos' and (select public.is_minihompy_admin())
    and not exists (select 1 from public.photo_posts p
      where p.body @> jsonb_build_array(jsonb_build_object('type', 'image', 'path', name))));

insert into public.photo_folders (label, description) values ('일상', '소중한 추억이 담겨 있는 저의 일상이예요.');
commit;
