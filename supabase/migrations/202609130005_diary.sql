begin;

create table public.diary_folders (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(btrim(label)) between 1 and 40),
  sort_order integer not null default 0 check (sort_order >= 0)
);
create table public.diary_entries (
  id uuid primary key,
  folder_id uuid not null references public.diary_folders(id) on delete restrict,
  author_id uuid default auth.uid() references auth.users(id) on delete set null,
  author_name text not null check (char_length(btrim(author_name)) between 1 and 20),
  entry_date date not null check (entry_date between date '1900-01-01' and date '9999-12-31'),
  entry_time time not null check (entry_time < time '24:00' and extract(second from entry_time) = 0),
  weather text not null default '' check (weather in ('', '맑음', '흐림', '비', '눈')),
  body text not null check (char_length(btrim(body, E' \n\r\t')) between 1 and 50000),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index diary_entries_date on public.diary_entries(folder_id, entry_date, entry_time, id);
create function private.touch_diary_entry() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.touch_diary_entry() from public, anon, authenticated;
create trigger diary_entry_updated before update on public.diary_entries
  for each row execute function private.touch_diary_entry();

alter table public.diary_folders enable row level security;
alter table public.diary_entries enable row level security;
revoke all on public.diary_folders, public.diary_entries from public, anon, authenticated;
grant select on public.diary_folders, public.diary_entries to anon, authenticated;
grant insert (label, sort_order), update (label, sort_order), delete on public.diary_folders to authenticated;
grant insert (id, folder_id, author_name, entry_date, entry_time, weather, body),
  update (folder_id, entry_date, entry_time, weather, body), delete on public.diary_entries to authenticated;
create policy diary_folders_read on public.diary_folders for select to anon, authenticated using (true);
create policy diary_folders_admin on public.diary_folders for all to authenticated
  using ((select public.is_minihompy_admin())) with check ((select public.is_minihompy_admin()));
create policy diary_entries_read on public.diary_entries for select to anon, authenticated using (true);
create policy diary_entries_insert on public.diary_entries for insert to authenticated
  with check ((select public.is_minihompy_admin()) and author_id = (select auth.uid()));
create policy diary_entries_update on public.diary_entries for update to authenticated
  using ((select public.is_minihompy_admin()) and author_id = (select auth.uid()))
  with check ((select public.is_minihompy_admin()) and author_id = (select auth.uid()));
create policy diary_entries_delete on public.diary_entries for delete to authenticated
  using ((select public.is_minihompy_admin()));

-- Distinct days keep calendar markers correct even beyond the REST row limit.
create function public.diary_written_dates(selected_folder uuid, month_start date)
returns setof date language sql stable security invoker set search_path = '' as $$
  select distinct e.entry_date from public.diary_entries e
  where e.folder_id = selected_folder
    and e.entry_date >= date_trunc('month', month_start)::date
    and e.entry_date < (date_trunc('month', month_start) + interval '1 month')::date
  order by e.entry_date;
$$;
revoke all on function public.diary_written_dates(uuid, date) from public, anon, authenticated;
grant execute on function public.diary_written_dates(uuid, date) to anon, authenticated;
insert into public.diary_folders (label) values ('나의 다이어리');
commit;
