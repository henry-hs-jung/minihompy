begin;

create table public.board_folders (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'folder' check (kind in ('folder', 'divider')),
  label text not null default '',
  description text not null default '' check (char_length(description) <= 300),
  sort_order integer not null default 0 check (sort_order >= 0),
  unique (id, kind),
  check ((kind = 'folder' and char_length(btrim(label)) between 1 and 40)
    or (kind = 'divider' and label = '' and description = ''))
);

create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null,
  folder_kind text not null default 'folder' check (folder_kind = 'folder'),
  author_id uuid default auth.uid() references auth.users(id) on delete set null,
  author_name text not null check (char_length(btrim(author_name)) between 1 and 20),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 50000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (folder_id, folder_kind) references public.board_folders(id, kind) on delete restrict
);
create index board_folders_order on public.board_folders(sort_order, id);
create index board_posts_folder_page on public.board_posts(folder_id, created_at desc, id desc);
create index board_posts_all_page on public.board_posts(created_at desc, id desc);
create index board_posts_author on public.board_posts(author_id);

create function private.touch_board_post()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.touch_board_post() from public, anon, authenticated;
create trigger board_post_updated before update on public.board_posts
for each row execute function private.touch_board_post();

alter table public.board_folders enable row level security;
alter table public.board_posts enable row level security;
revoke all on public.board_folders, public.board_posts from public, anon, authenticated;
grant select on public.board_folders, public.board_posts to anon, authenticated;
grant insert (kind, label, description, sort_order), update (label, description, sort_order), delete
  on public.board_folders to authenticated;
grant insert (folder_id, author_name, title, body), update (folder_id, title, body), delete
  on public.board_posts to authenticated;

create policy board_folders_read on public.board_folders for select to anon, authenticated using (true);
create policy board_folders_insert on public.board_folders for insert to authenticated
  with check ((select public.is_minihompy_admin()));
create policy board_folders_update on public.board_folders for update to authenticated
  using ((select public.is_minihompy_admin())) with check ((select public.is_minihompy_admin()));
create policy board_folders_delete on public.board_folders for delete to authenticated
  using ((select public.is_minihompy_admin()));

-- This stage stores public posts only. No visitor INSERT policy is provided.
create policy board_posts_read on public.board_posts for select to anon, authenticated using (true);
create policy board_posts_insert on public.board_posts for insert to authenticated
  with check ((select public.is_minihompy_admin()) and author_id = (select auth.uid()));
create policy board_posts_update on public.board_posts for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy board_posts_delete on public.board_posts for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_minihompy_admin()));

-- Start with one real folder, not the fictional screenshot sample posts.
insert into public.board_folders (label, sort_order) values ('자유게시판', 0);
commit;
