begin;

create table public.guestbook_posts (
  id uuid primary key,
  number bigint generated always as identity unique,
  author_id uuid default auth.uid() references auth.users(id) on delete set null,
  author_name text not null check (char_length(btrim(author_name)) between 1 and 20 and author_name !~ '[[:cntrl:]]'),
  body text not null check (char_length(body) <= 5000 and char_length(btrim(body, E' \n\r\t')) > 0),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index guestbook_posts_page on public.guestbook_posts(created_at desc, id desc);
create index guestbook_posts_author on public.guestbook_posts(author_id);
create table private.guestbook_write_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_write timestamptz not null,
  window_start timestamptz not null,
  writes integer not null
);
revoke all on private.guestbook_write_limits from public, anon, authenticated;
alter table private.guestbook_write_limits enable row level security;

create function private.guard_guestbook_post() returns trigger
language plpgsql security definer set search_path = '' as $$
declare limits private.guestbook_write_limits; current_time timestamptz := clock_timestamp();
begin
  if tg_op = 'UPDATE' then
    if old.visibility = 'private' and new.visibility <> 'private' then
      raise exception '비공개 방명록은 다시 공개할 수 없습니다.';
    end if;
    if old.author_id is distinct from auth.uid() and new.body is distinct from old.body then
      raise exception '다른 사람의 방명록 본문은 수정할 수 없습니다.';
    end if;
    new.revision := old.revision + 1;
    new.updated_at := current_time;
  elsif not public.is_minihompy_admin() then
    -- Row lock serializes simultaneous writes; deleting posts cannot reset this counter.
    insert into private.guestbook_write_limits values (auth.uid(), '-infinity', current_time, 0)
      on conflict (user_id) do nothing;
    select * into limits from private.guestbook_write_limits where user_id = auth.uid() for update;
    if limits.last_write > current_time - interval '1 minute' then raise exception '방명록은 1분에 한 번 작성할 수 있습니다.'; end if;
    if limits.window_start <= current_time - interval '24 hours' then limits.window_start := current_time; limits.writes := 0; end if;
    if limits.writes >= 20 then raise exception '24시간 동안 작성 가능한 방명록 수를 초과했습니다.'; end if;
    update private.guestbook_write_limits set last_write = current_time, window_start = limits.window_start, writes = limits.writes + 1 where user_id = auth.uid();
  end if;
  return new;
end;
$$;
revoke all on function private.guard_guestbook_post() from public, anon, authenticated;
create trigger guard_guestbook_post before insert or update on public.guestbook_posts
  for each row execute function private.guard_guestbook_post();

alter table public.guestbook_posts enable row level security;
revoke all on public.guestbook_posts from public, anon, authenticated;
grant select on public.guestbook_posts to anon, authenticated;
grant insert (id, author_name, body, visibility), update (body, visibility), delete on public.guestbook_posts to authenticated;
create policy guestbook_read on public.guestbook_posts for select to anon, authenticated
  using (visibility = 'public' or author_id = (select auth.uid()) or (select public.is_minihompy_admin()));
create policy guestbook_insert on public.guestbook_posts for insert to authenticated
  with check (author_id = (select auth.uid()));
create policy guestbook_update on public.guestbook_posts for update to authenticated
  using (author_id = (select auth.uid()) or (select public.is_minihompy_admin()))
  with check (author_id = (select auth.uid()) or (select public.is_minihompy_admin()));
create policy guestbook_delete on public.guestbook_posts for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_minihompy_admin()));
commit;
