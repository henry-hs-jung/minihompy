import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { chromium } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : 'playwright');
const output = resolve(root, 'docs/verification/photos-step2');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
const results = [];
try {
  for (const [width, height, dpr] of [[1000, 700, 1], [375, 812, 1], [375, 812, 2]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => errors.push(request.url()));
    await page.goto(`${pathToFileURL(resolve(root, 'index.html')).href}#/photos`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.photo-image').first().evaluate(img => img.decode());
    await page.screenshot({ path: resolve(output, `album-${width}-dpr${dpr}.png`) });
    const geometry = await page.evaluate(() => {
      const rect = selector => {
        const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
        return { x, y, width, height };
      };
      return { left: rect('.profile-panel'), main: rect('.home-panel'), image: rect('.photo-image'), canvas: rect('.minihompy') };
    });
    assert.deepEqual(geometry.left, { x: 36, y: 68, width: 112, height: 240 });
    assert.deepEqual(geometry.main, { x: 150, y: 68, width: 279, height: 240 });
    assert.equal(geometry.canvas.width, 579);
    assert.equal(geometry.image.width, 240);
    assert.equal(await page.locator('.photo-post').count(), 2);
    assert.equal(await page.locator('.photo-folder-divider').count(), 3);
    assert.equal(await page.locator('.home-scrollbar').isVisible(), false);
    assert(await page.locator('.photos-scroll').evaluate(e => e.scrollHeight > e.clientHeight && e.scrollWidth === e.clientWidth));
    await page.locator('.photo-scroll-arrow.down').click();
    assert(await page.locator('.photos-scroll').evaluate(e => e.scrollTop > 0));
    await page.locator('.photo-scroll-thumb').focus();
    await page.keyboard.press('End');
    assert(await page.locator('.photos-scroll').evaluate(e => Math.abs(e.scrollHeight - e.clientHeight - e.scrollTop) < 2));
    await page.keyboard.press('Home');
    assert.equal(await page.locator('.photos-scroll').evaluate(e => e.scrollTop), 0);
    if (width === 1000) {
      const thumb = await page.locator('.photo-scroll-thumb').boundingBox();
      await page.mouse.move(thumb.x + 4, thumb.y + 4);
      await page.mouse.down();
      await page.mouse.move(thumb.x + 4, thumb.y + 35);
      await page.mouse.up();
      assert(await page.locator('.photos-scroll').evaluate(e => e.scrollTop > 40));
    }
    await page.locator('.photo-pagination button').last().click();
    assert.equal(await page.locator('.photo-post').count(), 1);
    assert.equal(await page.locator('.photo-post').getAttribute('data-post'), 'lake-memory');
    assert.equal(await page.locator('.photos-scroll').evaluate(e => e.scrollTop), 0);
    await page.locator('[data-folder="travel"]').click();
    assert.equal(await page.locator('.photo-post').getAttribute('data-post'), 'travel-lake');
    assert.equal(await page.locator('.photo-pagination [aria-current]').textContent(), '1');
    await page.locator('[data-folder="friends"]').click();
    assert.equal(await page.locator('.photo-empty').count(), 1);
    await page.screenshot({ path: resolve(output, `empty-${width}-dpr${dpr}.png`) });
    await page.locator('[data-folder="daily"]').click();
    await page.locator('.photo-comment-input').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(output, `comments-${width}-dpr${dpr}.png`) });
    assert(await page.locator('.photo-comment-input input').first().isDisabled());
    await page.locator('[data-menu="home"]').click();
    assert.equal(await page.locator('.miniroom').count(), 1);
    assert.equal(await page.locator('.photos-scroll').count(), 0);
    await page.evaluate(() => { scrollTo(0, 0); });
    await page.screenshot({ path: resolve(output, `home-${width}-dpr${dpr}.png`) });
    await page.locator('[data-menu="photos"]').click();
    assert.equal(await page.locator('.photo-post').count(), 2);
    assert.equal(await page.locator('[data-folder="daily"]').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(errors, []);
    results.push({ width, height, dpr, geometry, errors });
    await page.close();
  }
  await writeFile(resolve(output, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log('PASS: album assets, fixed geometry, folders, dividers, pagination, empty state, comments, HOME return; desktop/mobile DPR 1/2.');
} finally { await browser.close(); }
