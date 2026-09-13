begin;
-- CURRENT_TIME is a SQL keyword, so use a distinct PL/pgSQL variable name.
create or replace function private.guard_guestbook_post() returns trigger
language plpgsql security definer set search_path = '' as $$
declare limits private.guestbook_write_limits; write_now timestamptz := clock_timestamp();
begin
  if tg_op = 'UPDATE' then
    if old.visibility = 'private' and new.visibility <> 'private' then
      raise exception '비공개 방명록은 다시 공개할 수 없습니다.';
    end if;
    if old.author_id is distinct from auth.uid() and new.body is distinct from old.body then
      raise exception '다른 사람의 방명록 본문은 수정할 수 없습니다.';
    end if;
    new.revision := old.revision + 1;
    new.updated_at := write_now;
  elsif not public.is_minihompy_admin() then
    insert into private.guestbook_write_limits values (auth.uid(), '-infinity', write_now, 0)
      on conflict (user_id) do nothing;
    select * into limits from private.guestbook_write_limits where user_id = auth.uid() for update;
    if limits.last_write > write_now - interval '1 minute' then raise exception '방명록은 1분에 한 번 작성할 수 있습니다.'; end if;
    if limits.window_start <= write_now - interval '24 hours' then limits.window_start := write_now; limits.writes := 0; end if;
    if limits.writes >= 20 then raise exception '24시간 동안 작성 가능한 방명록 수를 초과했습니다.'; end if;
    update private.guestbook_write_limits set last_write = write_now, window_start = limits.window_start, writes = limits.writes + 1 where user_id = auth.uid();
  end if;
  return new;
end;
$$;
revoke all on function private.guard_guestbook_post() from public, anon, authenticated;
commit;
