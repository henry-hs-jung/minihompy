import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(resolve(process.argv[2])).href);
const out = new URL('../docs/verification/board-writing/', import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
try {
  for (const width of [1000, 375]) {
    const page = await browser.newPage({ viewport: { width, height: 812 } });
    const errors = [], methods = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => errors.push(request.url()));
    await page.route('https://itkymmxnbjylyzbmdxdb.supabase.co/**', route => {
      const request = route.request();
      methods.push(request.method());
      if (request.method() !== 'GET') return route.abort();
      return route.continue();
    });
    await page.goto(`${new URL('../index.html', import.meta.url).href}#/board`);
    await page.locator('.board-table').waitFor();
    assert((await page.locator('.board-folder').count()) >= 2);
    assert.equal(await page.locator('.board-write').count(), 0);
    assert(await page.locator('.board-scroll').evaluate(e => e.scrollWidth <= e.clientWidth));
    assert(methods.length >= 2 && methods.every(method => method === 'GET'));
    assert.deepEqual(errors, []);
    await page.screenshot({ path: new URL(`live-read-${width}.png`, out).pathname });
    await page.close();
  }
  console.log('PASS: hosted public folders/posts via real browser and SDK, reader has no write controls; GET only.');
} finally { await browser.close(); }
