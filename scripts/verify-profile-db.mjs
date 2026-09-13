import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const owner = '10000000-0000-0000-0000-000000000001', guest = '10000000-0000-0000-0000-000000000002';
async function as(uid, fn) {
  await db.exec(`set role ${uid ? 'authenticated' : 'anon'}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid || '']);
  try { await fn(); } finally { await db.exec('reset role'); }
}
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant select,insert,update,delete on storage.objects to anon,authenticated;`);
  for (const file of ['202609130001_identity.sql','202609130009_profile.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url),'utf8'));
  await db.query('insert into auth.users values ($1),($2)', [owner,guest]);
  await db.query('insert into private.minihompy_admins values ($1)',[owner]);
  await as(null, async () => {
    assert.equal((await db.query('select * from public.minihompy_profile')).rows[0].image_width,192);
    await assert.rejects(db.query("update public.minihompy_profile set name='x'"));
  });
  await as(guest, async () => {
    assert.equal((await db.query("update public.minihompy_profile set name='x' returning id")).rows.length,0);
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('minihompy-profile','10000000-0000-0000-0000-000000000001.jpg')"));
  });
  await as(owner, async () => {
    assert.equal((await db.query("update public.minihompy_profile set name='이름',paragraphs='[\"소개\",\"본문\"]' where revision=1 returning revision")).rows[0].revision,2);
    assert.equal((await db.query("update public.minihompy_profile set name='충돌' where revision=1 returning id")).rows.length,0);
    for (const expression of ["name=''", "name=repeat('x',21)", 'image_width=0', 'image_width=301', "image_path='javascript:alert(1)'", "paragraphs='{}'", "paragraphs='[1]'", "paragraphs='null'", "paragraphs=jsonb_build_array(repeat('x',10001))", "paragraphs=to_jsonb(array_fill('a'::text,array[101]))"]) await assert.rejects(db.query(`update public.minihompy_profile set ${expression}`));
    for (const column of ['id','revision','updated_at']) await assert.rejects(db.query(`update public.minihompy_profile set ${column}=${column}`));
    await assert.rejects(db.query('delete from public.minihompy_profile'));
    await assert.rejects(db.query('insert into public.minihompy_profile default values'));
    await db.query("update public.minihompy_profile set name=null, paragraphs=null, image_path=''");
    const path='10000000-0000-0000-0000-000000000001.jpg';
    await db.query("insert into storage.objects(bucket_id,name) values('minihompy-profile',$1)",[path]);
    await db.query('update public.minihompy_profile set image_path=$1',[path]);
    assert.equal((await db.query('delete from storage.objects returning id')).rows.length,0);
    assert.equal((await db.query("update storage.objects set name='overwrite.jpg' returning id")).rows.length,0);
    await db.query("update public.minihompy_profile set image_path=''");
    assert.equal((await db.query('delete from storage.objects returning id')).rows.length,1);
  });
  const bucket=(await db.query('select * from storage.buckets')).rows[0];
  assert.equal(Number(bucket.file_size_limit),6291456);
  assert.equal(bucket.public,true);
  console.log('PASS: profile seed, public read, admin-only updates, CAS, validation, immutable metadata, image policies and published image protection. Local PGlite.');
} finally { await db.close(); }
