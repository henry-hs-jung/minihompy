import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const owner = '10000000-0000-0000-0000-000000000001', guest = '10000000-0000-0000-0000-000000000002';
const id = '20000000-0000-0000-0000-000000000001', path = `${id}/30000000-0000-0000-0000-000000000001.jpg`;
const body = [{ type: 'text', text: '앞\n' }, { type: 'image', path }, { type: 'text', text: '\n뒤' }];
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
    grant execute on function auth.uid() to anon, authenticated;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
    grant select, insert, update, delete on storage.objects to anon, authenticated;`);
  for (const file of ['202609130001_identity.sql', '202609130004_photos.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  await db.query('insert into auth.users values ($1),($2)', [owner, guest]);
  await db.query('insert into private.minihompy_admins values ($1)', [owner]);
  const folder = (await db.query('select id from public.photo_folders')).rows[0].id;
  const insert = value => db.query("insert into public.photo_posts(id,folder_id,author_name,title,body) values ($1,$2,'주인','제목',$3) returning *", [id, folder, JSON.stringify(value)]);
  await as(null, async () => { assert.equal((await db.query('select * from public.photo_folders')).rows.length, 1); await assert.rejects(insert(body)); });
  await as(guest, async () => {
    await assert.rejects(insert(body));
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values ('minihompy-photos',$1)", [path]));
  });
  await as(owner, async () => {
    for (const invalid of [[], {}, [{ type: 'text', text: '사진 없음' }], [{ type: 'image', path: 'https://bad/image.jpg' }], Array(21).fill(body[1]), [{ type: 'html', text: '<script/>' }], [body[1], { type: 'text', text: 'x'.repeat(50001) }]]) await assert.rejects(insert(invalid));
    const row = (await insert(body)).rows[0]; assert.equal(row.author_id, owner); assert.equal(row.revision, 1);
    await db.query("insert into storage.objects(bucket_id,name) values ('minihompy-photos',$1)", [path]);
    assert.equal((await db.query('delete from storage.objects where name=$1 returning *', [path])).rows.length, 0, 'Published image protected');
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values ('minihompy-photos','bad.svg')"));
    await assert.rejects(db.query('update public.photo_posts set author_id=$1 where id=$2', [guest, id]));
    await assert.rejects(db.query('update public.photo_posts set revision=50 where id=$1', [id]));
    assert.equal((await db.query("update public.photo_posts set title='수정' where id=$1 and revision=1 returning revision", [id])).rows[0].revision, 2);
    assert.equal((await db.query("update public.photo_posts set title='충돌' where id=$1 and revision=1 returning id", [id])).rows.length, 0);
    await assert.rejects(db.query('delete from public.photo_folders where id=$1', [folder]));
  });
  await as(guest, async () => {
    assert.equal((await db.query('select * from public.photo_posts')).rows.length, 1);
    assert.equal((await db.query("update public.photo_posts set title='침입' returning id")).rows.length, 0);
    assert.equal((await db.query('delete from public.photo_posts returning id')).rows.length, 0);
    assert.equal((await db.query('delete from storage.objects returning id')).rows.length, 0);
  });
  await as(owner, async () => {
    await db.query('delete from public.photo_posts where id=$1', [id]);
    assert.equal((await db.query('delete from storage.objects where name=$1 returning id', [path])).rows.length, 1);
  });
  console.log('PASS: photo migration, public reads, admin CRUD, content validation, revisions, FK protection, Storage upload/delete RLS. Local emulated Storage tables, not hosted writes.');
} finally { await db.close(); }
