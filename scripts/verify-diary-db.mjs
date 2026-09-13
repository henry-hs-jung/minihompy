import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const owner = '10000000-0000-0000-0000-000000000001', guest = '10000000-0000-0000-0000-000000000002';
const id = '20000000-0000-0000-0000-000000000001';
async function as(uid, fn) {
  await db.exec(`set role ${uid ? 'authenticated' : 'anon'}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid || '']);
  try { await fn(); } finally { await db.exec('reset role'); }
}
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  for (const file of ['202609130001_identity.sql', '202609130005_diary.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  await db.query('insert into auth.users values ($1),($2)', [owner, guest]);
  await db.query('insert into private.minihompy_admins values ($1)', [owner]);
  const folder = (await db.query('select id from public.diary_folders')).rows[0].id;
  const insert = (date = '2024-02-29', time = '12:34', weather = '맑음', body = '일기') => db.query("insert into public.diary_entries(id,folder_id,author_name,entry_date,entry_time,weather,body) values ($1,$2,'주인',$3,$4,$5,$6) returning *", [id, folder, date, time, weather, body]);
  await as(null, async () => { assert.equal((await db.query('select * from public.diary_folders')).rows.length, 1); await assert.rejects(insert()); });
  await as(guest, async () => { await assert.rejects(insert()); await assert.rejects(db.query("insert into public.diary_folders(label) values ('침입')")); });
  await as(owner, async () => {
    for (const values of [['2023-02-29'], ['1899-12-31'], ['2024-02-29', '24:00'], ['2024-02-29', '12:34:01'], ['2024-02-29', '12:34', '태풍'], ['2024-02-29', '12:34', '', ' \n\t'], ['2024-02-29', '12:34', '', 'x'.repeat(50001)]]) await assert.rejects(insert(...values));
    const row = (await insert()).rows[0]; assert.equal(row.author_id, owner); assert.equal(row.revision, 1);
    assert.equal((await db.query('select * from public.diary_written_dates($1,$2)', [folder, '2024-02-01'])).rows.length, 1);
    for (const column of ['id', 'revision', 'author_id', 'author_name', 'created_at', 'updated_at']) await assert.rejects(db.query(`update public.diary_entries set ${column}=${column}`));
    assert.equal((await db.query("update public.diary_entries set body='수정' where id=$1 and revision=1 returning revision", [id])).rows[0].revision, 2);
    assert.equal((await db.query("update public.diary_entries set body='충돌' where id=$1 and revision=1 returning id", [id])).rows.length, 0);
    await assert.rejects(db.query('delete from public.diary_folders where id=$1', [folder]));
  });
  await as(guest, async () => {
    assert.equal((await db.query('select * from public.diary_entries')).rows.length, 1);
    assert.equal((await db.query("update public.diary_entries set body='침입' returning id")).rows.length, 0);
    assert.equal((await db.query('delete from public.diary_entries returning id')).rows.length, 0);
  });
  await as(null, async () => {
    assert.equal((await db.query('select * from public.diary_written_dates($1,$2)', [folder, '2024-02-01'])).rows.length, 1);
    assert.equal((await db.query('select * from public.diary_written_dates($1,$2)', [folder, '2024-03-01'])).rows.length, 0);
  });
  // More than the REST row cap must still yield one marker per written day.
  await db.query("insert into public.diary_entries(id,folder_id,author_id,author_name,entry_date,entry_time,body) select gen_random_uuid(),$1,$2,'주인','2024-02-29','12:00','일기' from generate_series(1,1100)", [folder, owner]);
  await as(null, async () => assert.equal((await db.query('select * from public.diary_written_dates($1,$2)', [folder, '2024-02-01'])).rows.length, 1));
  await as(owner, async () => assert.equal((await db.query('delete from public.diary_entries where id=$1 and revision=2 returning id', [id])).rows.length, 1));
  console.log('PASS: diary migration, public reads/calendar, admin writes, revisions/ownership, date/time/weather/body constraints, FK, >1000-entry markers. Local PGlite.');
} finally { await db.close(); }
