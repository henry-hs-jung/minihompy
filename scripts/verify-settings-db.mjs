import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const owner = '10000000-0000-0000-0000-000000000001';
const guest = '10000000-0000-0000-0000-000000000002';
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;`);
  for (const file of ['202609130001_identity.sql','202609130003_settings.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url),'utf8'));
  await db.query('insert into auth.users values ($1),($2)', [owner, guest]);
  await db.query('insert into private.minihompy_admins values ($1)', [owner]);
  const original = (await db.query('select * from public.minihompy_settings')).rows[0];
  async function as(role, uid) { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid || '']); await db.exec(`set role ${role}`); }
  await as('anon');
  assert.equal((await db.query('select * from public.minihompy_settings')).rows.length,1);
  await assert.rejects(db.query('update public.minihompy_settings set payload=payload'), e=>e.code==='42501');
  await as('authenticated', guest);
  assert.equal((await db.query('update public.minihompy_settings set payload=payload returning id')).rows.length,0);
  await assert.rejects(db.query('delete from public.minihompy_settings'), e=>e.code==='42501');
  await as('authenticated', owner);
  const value = structuredClone(original.payload); value.page.title='DB 제목';
  const saved = (await db.query('update public.minihompy_settings set payload=$1 where revision=$2 returning *',[value,original.revision])).rows[0];
  assert.equal(saved.revision,2);
  assert.equal((await db.query('update public.minihompy_settings set payload=$1 where revision=1 returning *',[value])).rows.length,0);
  await assert.rejects(db.query('update public.minihompy_settings set revision=100'), e=>e.code==='42501');
  await assert.rejects(db.query('insert into public.minihompy_settings(payload) values ($1)',[value]), e=>e.code==='42501');
  const mutations = [
    v=>{v.menus.push({id:'settings',label:'설정',visible:false});},
    v=>{v.menus[1].id=v.menus[0].id;},
    v=>{v.home.today=-1;}, v=>{v.home.today=0.5;}, v=>{v.home.total=null;},
    v=>{v.profile.name=' ';}, v=>{v.home.recentEmptyLines=[];}, v=>{delete v.page;},
    v=>{v.menus[0].visible='true';}, v=>{v.menus={};},
  ];
  for (const mutate of mutations) {
    const bad = structuredClone(original.payload); mutate(bad);
    await assert.rejects(db.query('update public.minihompy_settings set payload=$1',[bad]), e=>e.code==='23514');
  }
  value.menus=[];
  assert.equal((await db.query('update public.minihompy_settings set payload=$1 returning revision',[value])).rows[0].revision,3);
  console.log('PASS: settings migration, seed, public read, admin-only update, immutable revision, CAS conflict, invalid fields/menus, reserved settings tab, empty menu set. Local PGlite.');
} finally { await db.close(); }
