import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(resolve(process.argv[2])).href);
const out = new URL('../docs/verification/release/', import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const errors = [], blocked = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://**/*', route => {
    if (route.request().method() === 'GET') return route.continue();
    blocked.push(route.request().method()); return route.abort();
  });
  await page.goto(new URL('../index.html', import.meta.url).href);
  await page.waitForFunction(() => window.MinihompySettings.status === 'ready');
  const result = await page.evaluate(async () => {
    const client = window.MinihompyBackend.getClient('visitor'), tables = {};
    for (const name of ['minihompy_settings','minihompy_profile','board_folders','board_posts','photo_folders','photo_posts','diary_folders','diary_entries','guestbook_posts','post_comments']) {
      const read = await client.from(name).select('id').limit(1);
      if (read.error) throw new Error(`${name}: ${read.error.message}`);
      tables[name] = { publicRead: true, hasRow: read.data.length > 0 };
    }
    const profile = await window.MinihompyProfileRepository.load();
    return { tables, profileRevision: profile.revision, identity: await window.MinihompyVisitorSession.context().then(({role,userId}) => ({role,userId})) };
  });
  assert.deepEqual(result.identity,{role:'reader',userId:null});
  assert.deepEqual(blocked,[]); assert.deepEqual(errors,[]);
  await writeFile(new URL('live-read.json',out),JSON.stringify({checkedAt:new Date().toISOString(),...result,blocked,errors,writes:0},null,2)+'\n');
  console.log('PASS: ten hosted tables publicly readable, profile repository load, reader identity, no accounts or writes. Rows and private content not logged.');
} finally { await browser.close(); }
