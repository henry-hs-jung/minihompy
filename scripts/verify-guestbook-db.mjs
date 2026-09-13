import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const admin = '10000000-0000-0000-0000-000000000001', writer = '10000000-0000-0000-0000-000000000002', other = '10000000-0000-0000-0000-000000000003';
async function as(uid, fn) {
  await db.exec(`set role ${uid ? 'authenticated' : 'anon'}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid || '']);
  try { await fn(); } finally { await db.exec('reset role'); }
}
const insert = (visibility = 'public', body = '방명록') => db.query("insert into public.guestbook_posts(id,author_name,body,visibility) values (gen_random_uuid(),'방문자',$1,$2) returning *", [body, visibility]);
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  for (const file of ['202609130001_identity.sql', '202609130006_guestbook.sql', '202609130007_guestbook_clock.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  await db.query('insert into auth.users values ($1),($2),($3)', [admin, writer, other]);
  await db.query('insert into private.minihompy_admins values ($1)', [admin]);
  let publicPost, privatePost;
  await as(null, async () => { await assert.rejects(insert()); assert.equal((await db.query('select * from public.guestbook_posts')).rows.length, 0); });
  await as(writer, async () => {
    publicPost = (await insert()).rows[0]; assert.equal(publicPost.author_id, writer);
    assert.equal(publicPost.revision, 1);
    await assert.rejects(insert(), /1분/);
    await assert.rejects(db.query('select * from private.guestbook_write_limits'));
    for (const col of ['id', 'number', 'author_id', 'author_name', 'revision', 'created_at', 'updated_at']) await assert.rejects(db.query(`update public.guestbook_posts set ${col}=${col}`));
  });
  await db.query("update private.guestbook_write_limits set last_write=now()-interval '2 minutes' where user_id=$1", [writer]);
  await as(writer, async () => { privatePost = (await insert('private')).rows[0]; });
  await as(null, async () => assert.deepEqual((await db.query('select id from public.guestbook_posts')).rows.map(r => r.id), [publicPost.id]));
  await as(other, async () => {
    assert.equal((await db.query('select * from public.guestbook_posts where id=$1', [privatePost.id])).rows.length, 0);
    assert.equal((await db.query("update public.guestbook_posts set body='침입' where id=$1 returning id", [publicPost.id])).rows.length, 0);
    assert.equal((await db.query('delete from public.guestbook_posts returning id')).rows.length, 0);
  });
  await as(admin, async () => {
    assert.equal((await db.query('select * from public.guestbook_posts')).rows.length, 2);
    await assert.rejects(db.query("update public.guestbook_posts set body='관리자 덮어쓰기' where id=$1", [publicPost.id]), /다른 사람/);
    await db.query("update public.guestbook_posts set visibility='private' where id=$1 and revision=1", [publicPost.id]);
    await assert.rejects(db.query("update public.guestbook_posts set visibility='public' where id=$1", [publicPost.id]), /다시 공개/);
    await assert.rejects(insert('public', ' \n\t')); await assert.rejects(insert('public', 'x'.repeat(5001)));
    await insert(); await insert();
  });
  await as(writer, async () => {
    assert.equal((await db.query('select * from public.guestbook_posts where author_id=$1', [writer])).rows.length, 2);
    await assert.rejects(db.query("update public.guestbook_posts set visibility='public' where id=$1", [publicPost.id]), /다시 공개/);
    assert.equal((await db.query("update public.guestbook_posts set body='수정' where id=$1 and revision=1 returning id", [publicPost.id])).rows.length, 0);
    assert.equal((await db.query("update public.guestbook_posts set body='수정' where id=$1 and revision=2 returning revision", [publicPost.id])).rows[0].revision, 3);
    await db.query('delete from public.guestbook_posts where id=$1', [privatePost.id]);
    await assert.rejects(insert(), /1분/);
  });
  await db.query("update private.guestbook_write_limits set last_write=now()-interval '2 minutes', writes=20 where user_id=$1", [writer]);
  await as(writer, async () => { await assert.rejects(insert(), /24시간/); });
  await db.query("update private.guestbook_write_limits set window_start=now()-interval '25 hours' where user_id=$1", [writer]);
  await as(writer, async () => { await insert(); });
  await as(admin, async () => { assert.equal((await db.query('delete from public.guestbook_posts where id=$1 returning id', [publicPost.id])).rows.length, 1); });
  console.log('PASS: guestbook migration, anonymous denial, author/admin/public visibility, ownership, immutable metadata, one-way privacy, revisions, rate limits including deletion and reset. Local PGlite.');
} finally { await db.close(); }
