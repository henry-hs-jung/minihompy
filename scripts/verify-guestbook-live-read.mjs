import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(resolve(process.argv[2])).href);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 812 } });
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => errors.push(r.url()));
  await page.route('https://itkymmxnbjylyzbmdxdb.supabase.co/**', route => {
    const req = route.request(); requests.push(req.url());
    return req.method() === 'GET' ? route.continue() : route.abort();
  });
  await page.goto(`${new URL('../index.html', import.meta.url).href}#/guestbook`);
  await page.locator('.guestbook-save').waitFor();
  assert.equal(await page.locator('.guestbook-post.is-private').count(), 0);
  assert.equal(await page.locator('.guestbook-edit,.guestbook-delete,.guestbook-make-private').count(), 0);
  assert(requests.some(url => url.includes('/guestbook_posts')));
  assert.equal(await page.locator('.captcha-dialog').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: hosted guestbook public read via browser and SDK; no private rows or write-management controls; GET only, no anonymous account creation.');
} finally { await browser.close(); }
