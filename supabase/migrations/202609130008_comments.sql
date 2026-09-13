begin;
create table public.post_comments (
  id uuid primary key,
  board_post_id uuid references public.board_posts(id) on delete cascade,
  photo_post_id uuid references public.photo_posts(id) on delete cascade,
  diary_entry_id uuid references public.diary_entries(id) on delete cascade,
  guestbook_post_id uuid references public.guestbook_posts(id) on delete cascade,
  author_id uuid default auth.uid() references auth.users(id) on delete set null,
  author_name text not null check (char_length(btrim(author_name)) between 1 and 20 and author_name !~ '[[:cntrl:]]'),
  body text not null check (char_length(body) <= 1000 and char_length(btrim(body, E' \n\r\t')) > 0),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(board_post_id, photo_post_id, diary_entry_id, guestbook_post_id) = 1)
);
create index comments_board on public.post_comments(board_post_id, created_at, id) where board_post_id is not null;
create index comments_photo on public.post_comments(photo_post_id, created_at, id) where photo_post_id is not null;
create index comments_diary on public.post_comments(diary_entry_id, created_at, id) where diary_entry_id is not null;
create index comments_guestbook on public.post_comments(guestbook_post_id, created_at, id) where guestbook_post_id is not null;
create index comments_author on public.post_comments(author_id);

-- Invoker rights are essential: guestbook RLS also governs every comment operation.
create function public.can_read_comment_parent(board_id uuid, photo_id uuid, diary_id uuid, guestbook_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select (num_nonnulls(board_id, photo_id, diary_id, guestbook_id) = 1) and (
    exists (select 1 from public.board_posts where id = board_id)
    or exists (select 1 from public.photo_posts where id = photo_id)
    or exists (select 1 from public.diary_entries where id = diary_id)
    or exists (select 1 from public.guestbook_posts where id = guestbook_id)
  );
$$;
revoke all on function public.can_read_comment_parent(uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.can_read_comment_parent(uuid, uuid, uuid, uuid) to anon, authenticated;

create table private.comment_write_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_write timestamptz not null,
  window_start timestamptz not null,
  writes integer not null
);
revoke all on private.comment_write_limits from public, anon, authenticated;
alter table private.comment_write_limits enable row level security;
create function private.guard_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare limits private.comment_write_limits; write_now timestamptz := clock_timestamp();
begin
  if tg_op = 'UPDATE' then
    new.revision := old.revision + 1;
    new.updated_at := write_now;
  elsif not public.is_minihompy_admin() then
    insert into private.comment_write_limits values (auth.uid(), '-infinity', write_now, 0)
      on conflict (user_id) do nothing;
    select * into limits from private.comment_write_limits where user_id = auth.uid() for update;
    if limits.last_write > write_now - interval '10 seconds' then raise exception '댓글은 10초에 한 번 작성할 수 있습니다.'; end if;
    if limits.window_start <= write_now - interval '24 hours' then limits.window_start := write_now; limits.writes := 0; end if;
    if limits.writes >= 100 then raise exception '24시간 동안 작성 가능한 댓글 수를 초과했습니다.'; end if;
    update private.comment_write_limits set last_write = write_now, window_start = limits.window_start, writes = limits.writes + 1 where user_id = auth.uid();
  end if;
  return new;
end;
$$;
revoke all on function private.guard_comment() from public, anon, authenticated;
create trigger guard_comment before insert or update on public.post_comments for each row execute function private.guard_comment();

alter table public.post_comments enable row level security;
revoke all on public.post_comments from public, anon, authenticated;
grant select on public.post_comments to anon, authenticated;
grant insert (id, board_post_id, photo_post_id, diary_entry_id, guestbook_post_id, author_name, body), update (body), delete on public.post_comments to authenticated;
create policy comments_read on public.post_comments for select to anon, authenticated
  using (public.can_read_comment_parent(board_post_id, photo_post_id, diary_entry_id, guestbook_post_id));
create policy comments_insert on public.post_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_read_comment_parent(board_post_id, photo_post_id, diary_entry_id, guestbook_post_id));
create policy comments_update on public.post_comments for update to authenticated
  using (author_id = (select auth.uid()) and public.can_read_comment_parent(board_post_id, photo_post_id, diary_entry_id, guestbook_post_id))
  with check (author_id = (select auth.uid()) and public.can_read_comment_parent(board_post_id, photo_post_id, diary_entry_id, guestbook_post_id));
create policy comments_delete on public.post_comments for delete to authenticated
  using ((author_id = (select auth.uid()) or (select public.is_minihompy_admin())) and public.can_read_comment_parent(board_post_id, photo_post_id, diary_entry_id, guestbook_post_id));
commit;
