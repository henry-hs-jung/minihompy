import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(resolve(process.argv[2])).href);
const base = 'https://henry-phd-finance.github.io/minihompy/';
const out = new URL('../docs/verification/deployment/', import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
try {
  for (const width of [1000,375]) {
    const page = await browser.newPage({ viewport: {width,height:812}, deviceScaleFactor: width === 375 ? 2 : 1 });
    const errors = [], blocked = [], badResponses = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`); });
    await page.route('https://**/*', route => {
      if (route.request().method() === 'GET') return route.continue();
      // This stable SQL RPC only reads dates for the diary calendar.
      if (route.request().method() === 'POST' && route.request().url() === 'https://itkymmxnbjylyzbmdxdb.supabase.co/rest/v1/rpc/diary_written_dates') return route.continue();
      blocked.push(`${route.request().method()} ${route.request().url()}`); return route.abort();
    });
    await page.goto(`${base}#/home`);
    await page.waitForFunction(() => window.MinihompySettings?.status === 'ready');
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('[data-menu="settings"]').count(),0);
    const menus = await page.locator('[data-menu]').evaluateAll(links => links.map(link => link.dataset.menu));
    for (const menu of menus) {
      await page.locator(`[data-menu="${menu}"]`).click();
      await page.waitForLoadState('networkidle');
      assert.equal(await page.locator('[data-view-slot="main"]').getAttribute('data-view'),menu);
      assert.equal(await page.locator('.minihompy').evaluate(e => e.getBoundingClientRect().width),width >= 900 ? 868.5 : 579);
      assert(await page.locator('img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0)));
      await page.evaluate(() => window.scrollTo(0,0));
      await page.screenshot({path:new URL(`${menu}-${width}.png`,out).pathname});
    }
    await page.reload(); await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('[data-view-slot="main"]').getAttribute('data-view'),menus.at(-1));
    assert.deepEqual(await page.evaluate(async () => { const ctx=await window.MinihompyVisitorSession.context(); return {role:ctx.role,userId:ctx.userId}; }),{role:'reader',userId:null});
    assert.deepEqual(errors,[]); assert.deepEqual(blocked,[]); assert.deepEqual(badResponses,[]);
    for (const path of ['references/cyworld-master.png','supabase/migrations/202609130001_identity.sql','docs/deployment.md']) assert.equal((await page.request.get(base+path)).status(),404);
    console.log(`PASS: live Pages ${width}px, ${menus.join(', ')}, hash reload, images/fonts/assets, no private artifact paths, no writes or accounts.`);
    await page.close();
  }
} finally { await browser.close(); }
