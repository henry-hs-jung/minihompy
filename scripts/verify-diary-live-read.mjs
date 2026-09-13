import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(resolve(process.argv[2])).href);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 812 } });
  const errors = [], paths = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => errors.push(r.url()));
  await page.route('https://itkymmxnbjylyzbmdxdb.supabase.co/**', route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (req.method() !== 'GET' && !(req.method() === 'POST' && path.endsWith('/rpc/diary_written_dates'))) return route.abort();
    paths.push(path); return route.continue();
  });
  await page.goto(`${new URL('../index.html', import.meta.url).href}#/diary`);
  await page.waitForFunction(() => document.querySelector('.diary-entry') || document.querySelector('.diary-empty')?.textContent === '등록된 일기가 없습니다.');
  assert(await page.locator('.diary-write').isHidden());
  assert.equal(await page.locator('.diary-edit,.diary-delete').count(), 0);
  assert(paths.some(p => p.endsWith('/diary_folders')));
  assert(paths.some(p => p.endsWith('/diary_entries')));
  assert(paths.some(p => p.endsWith('/rpc/diary_written_dates')));
  assert.deepEqual(errors, []);
  console.log('PASS: hosted diary folders/calendar/entries via actual browser and SDK; public reader; only GET and read-only calendar RPC. No hosted writes.');
} finally { await browser.close(); }
