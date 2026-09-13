import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(resolve(process.argv[2])).href);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
try {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('requestfailed', r => errors.push(r.url()));
  await page.route('https://itkymmxnbjylyzbmdxdb.supabase.co/**', route => route.request().method() === 'GET' ? route.continue() : route.abort());
  await page.goto(new URL('../index.html', import.meta.url).href);
  await page.waitForFunction(() => window.MinihompySettings.status === 'ready');
  const results = await page.evaluate(async () => {
    const client = window.MinihompyBackend.getClient('visitor');
    const probe = await client.from('post_comments').select('id').limit(1); if (probe.error) throw probe.error;
    const results = {};
    for (const [kind, table] of Object.entries({ board: 'board_posts', photos: 'photo_posts', diary: 'diary_entries', guestbook: 'guestbook_posts' })) {
      const parent = await client.from(table).select('id').limit(1); if (parent.error) throw parent.error;
      if (!parent.data.length) { results[kind] = 'no public parent; skipped list'; continue; }
      const result = await window.MinihompyCommentsRepository.list(kind, parent.data[0].id, 1, 20);
      if (result.context.role !== 'reader' || result.context.userId) throw new Error('Unexpected authenticated identity');
      results[kind] = { count: result.count, loaded: result.items.length };
    }
    return results;
  });
  assert.deepEqual(errors, []);
  console.log('PASS: hosted comment table/parent-aware public reads via actual SDK; GET only, no accounts or writes.', JSON.stringify(results));
} finally { await browser.close(); }
