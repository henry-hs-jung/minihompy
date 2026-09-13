begin;
create table public.minihompy_settings (
  id integer primary key default 1 check (id = 1),
  payload jsonb not null,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

create function private.validate_minihompy_settings()
returns trigger language plpgsql set search_path = '' as $$
declare
  field record;
  value jsonb;
  item jsonb;
  ids text[] := '{}';
begin
  if jsonb_typeof(new.payload) is distinct from 'object' then raise exception 'Invalid settings object' using errcode = '23514'; end if;
  for field in select * from (values
    ('page','browserTitle',1,80), ('page','title',1,120),
    ('profile','name',1,20), ('profile','introduction',0,2000), ('profile','detail',0,80),
    ('home','roomMessage',0,500), ('home','friendsMessage',0,500)
  ) as fields(section, key, minimum, maximum) loop
    value := new.payload -> field.section -> field.key;
    if jsonb_typeof(value) is distinct from 'string'
      or char_length(btrim(value #>> '{}')) not between field.minimum and field.maximum then
      raise exception 'Invalid setting: %.%', field.section, field.key using errcode = '23514';
    end if;
  end loop;
  foreach item in array array[new.payload#>'{home,today}', new.payload#>'{home,total}'] loop
    if jsonb_typeof(item) is distinct from 'number' then raise exception 'Invalid counter' using errcode = '23514'; end if;
    if (item::text)::numeric < 0 or (item::text)::numeric > 2147483647
      or trunc((item::text)::numeric) <> (item::text)::numeric then raise exception 'Invalid counter' using errcode = '23514'; end if;
  end loop;
  value := new.payload#>'{home,recentEmptyLines}';
  if jsonb_typeof(value) is distinct from 'array' then raise exception 'Invalid recent lines' using errcode = '23514'; end if;
  if jsonb_array_length(value) <> 3 then raise exception 'Expected three recent lines' using errcode = '23514'; end if;
  for item in select * from jsonb_array_elements(value) loop
    if jsonb_typeof(item) <> 'string' or char_length(item#>>'{}') > 500 then raise exception 'Invalid recent line' using errcode = '23514'; end if;
  end loop;
  value := new.payload->'menus';
  if jsonb_typeof(value) is distinct from 'array' then raise exception 'Invalid menus' using errcode = '23514'; end if;
  if jsonb_array_length(value) > 9 then raise exception 'Too many menus' using errcode = '23514'; end if;
  for item in select * from jsonb_array_elements(value) loop
    if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'id') is distinct from 'string'
      or not ((item->>'id') = any(array['home','profile','diary','music','photos','gallery','board','video','guestbook']))
      or (item->>'id') = any(ids) or jsonb_typeof(item->'visible') is distinct from 'boolean'
      or jsonb_typeof(item->'label') is distinct from 'string'
      or char_length(btrim(item->>'label')) not between 1 and 20 then
      raise exception 'Invalid or duplicate menu' using errcode = '23514';
    end if;
    ids := array_append(ids, item->>'id');
  end loop;
  if tg_op = 'UPDATE' then new.revision := old.revision + 1; end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.validate_minihompy_settings() from public, anon, authenticated;
create trigger validate_minihompy_settings before insert or update on public.minihompy_settings
for each row execute function private.validate_minihompy_settings();

alter table public.minihompy_settings enable row level security;
revoke all on public.minihompy_settings from public, anon, authenticated;
grant select on public.minihompy_settings to anon, authenticated;
grant update (payload) on public.minihompy_settings to authenticated;
create policy settings_read on public.minihompy_settings for select to anon, authenticated using (true);
create policy settings_update on public.minihompy_settings for update to authenticated
  using ((select public.is_minihompy_admin())) with check ((select public.is_minihompy_admin()));

-- Snapshot of the existing personal config. No browser fallback copy is used.
insert into public.minihompy_settings(payload) values ($config${
  "page": {"browserTitle":"미니홈피","title":"정현식님의 미니홈피"},
  "profile": {"name":"정현식","introduction":"안녕하세요, 정현식입니다","detail":"(성)"},
  "home": {
    "today":1,"total":2,
    "recentEmptyLines":["등록된 게시물이 없습니다","소식이 뜸한 친구에게 마음의 한마디를","남겨주세요"],
    "roomMessage":"미니룸 준비중","friendsMessage":"나의 소중한 첫번째 일촌이 되어 주세요."
  },
  "menus":[
    {"id":"home","label":"홈","visible":true},
    {"id":"profile","label":"프로필","visible":true},
    {"id":"diary","label":"다이어리","visible":true},
    {"id":"photos","label":"사진첩","visible":true},
    {"id":"board","label":"게시판","visible":true},
    {"id":"guestbook","label":"방명록","visible":true},
    {"id":"music","label":"쥬크박스","visible":false},
    {"id":"gallery","label":"갤러리","visible":false},
    {"id":"video","label":"동영상","visible":false}
  ]
}$config$::jsonb);
commit;
