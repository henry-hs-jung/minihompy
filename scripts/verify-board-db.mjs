import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const owner = '10000000-0000-0000-0000-000000000001';
const guest = '10000000-0000-0000-0000-000000000002';
const other = '10000000-0000-0000-0000-000000000003';
let checks = 0;
async function as(role, uid, callback) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid || '']);
  try { return await callback(); }
  finally { await db.exec('reset role'); }
}
async function denied(sql, params = [], code = '42501') {
  await assert.rejects(db.query(sql, params), error => (Array.isArray(code) ? code : [code]).includes(error.code));
  checks++;
}
try {
  // Minimal local Auth emulation; production uses Supabase's verified JWT UID.
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  for (const file of ['202609130001_identity.sql', '202609130002_board.sql', '202609130010_board_retry.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  await db.query('insert into auth.users values ($1),($2),($3)', [owner, guest, other]);
  await db.query('insert into private.minihompy_admins values ($1)', [owner]);
  const folder = (await db.query('select id from public.board_folders')).rows[0].id;
  let post;
  await as('anon', null, async () => {
    assert.equal((await db.query('select * from public.board_folders')).rows.length, 1);
    assert.equal((await db.query('select public.is_minihompy_admin() as admin')).rows[0].admin, false);
    await denied('select * from private.minihompy_admins');
    await denied("insert into public.board_posts(folder_id,author_name,title,body) values ($1,'이름','제목','본문')", [folder]);
  });
  await as('authenticated', owner, async () => {
    const key = '20000000-0000-0000-0000-000000000001';
    await db.query("insert into public.board_posts(id,folder_id,author_name,title,body) values ($1,$2,'주인','중복 방지','본문')", [key,folder]);
    await denied("insert into public.board_posts(id,folder_id,author_name,title,body) values ($1,$2,'주인','중복 방지','본문')", [key,folder], '23505');
    await db.query('delete from public.board_posts where id=$1',[key]);
    post = (await db.query("insert into public.board_posts(folder_id,author_name,title,body) values ($1,'주인','제목','본문') returning *", [folder])).rows[0];
    assert.equal(post.author_id, owner);
    assert.equal((await db.query("update public.board_posts set title='수정' where id=$1 returning *", [post.id])).rows.length, 1);
    for (const column of ['author_id', 'created_at', 'updated_at', 'id', 'author_name', 'folder_kind']) {
      await denied(`update public.board_posts set ${column}=${column} where id=$1`, [post.id]);
    }
    await denied("insert into public.board_posts(folder_id,author_id,author_name,title,body) values ($1,$2,'주인','제목','본문')", [folder, guest]);
    await denied("insert into public.board_posts(folder_id,author_name,title,body) values ($1,'주인',' ','본문')", [folder], '23514');
    const divider = (await db.query("insert into public.board_folders(kind) values ('divider') returning id")).rows[0].id;
    await denied("insert into public.board_posts(folder_id,author_name,title,body) values ($1,'주인','제목','본문')", [divider], '23503');
    await denied('delete from public.board_folders where id=$1', [folder], ['23503', '23001']);
  });
  await as('authenticated', guest, async () => {
    await denied("insert into public.board_posts(id,folder_id,author_name,title,body) values (gen_random_uuid(),$1,'손님','제목','본문')", [folder]);
    await denied("insert into public.board_posts(folder_id,author_name,title,body) values ($1,'손님','제목','본문')", [folder]);
    await denied("insert into public.board_folders(label) values ('폴더')");
    assert.equal((await db.query("update public.board_posts set title='침입' where id=$1 returning id", [post.id])).rows.length, 0);
    assert.equal((await db.query('delete from public.board_posts where id=$1 returning id', [post.id])).rows.length, 0);
    assert.equal((await db.query("update public.board_folders set label='침입' returning id")).rows.length, 0);
  });
  // Trusted fixture for future visitor posts; visitor creation is still blocked.
  const guestPost = (await db.query("insert into public.board_posts(folder_id,author_id,author_name,title,body) values ($1,$2,'손님','제목','본문') returning id", [folder, guest])).rows[0].id;
  await as('authenticated', owner, async () => {
    assert.equal((await db.query("update public.board_posts set body='관리자 수정' where id=$1 returning id", [guestPost])).rows.length, 0);
  });
  await as('authenticated', guest, async () => {
    assert.equal((await db.query("update public.board_posts set body='본인 수정' where id=$1 returning id", [guestPost])).rows.length, 1);
  });
  await as('authenticated', other, async () => {
    assert.equal((await db.query('delete from public.board_posts where id=$1 returning id', [guestPost])).rows.length, 0);
  });
  await as('anon', null, async () => {
    assert.equal((await db.query('select * from public.board_posts')).rows.length, 2);
  });
  await as('authenticated', owner, async () => {
    assert.equal((await db.query('delete from public.board_posts where id=$1 returning id', [guestPost])).rows.length, 1);
  });
  console.log(`PASS: board migrations including retry grant; public reads; admin writes; ownership; ${checks} rejected operations; unique retry ID; divider FK; safe folder deletion. Local PGlite, not hosted Supabase.`);
} finally { await db.close(); }
