import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const { chromium } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'docs/verification/structure-step2');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const [width, height] of [[579, 349], [1280, 800], [375, 812]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [], resources = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => errors.push(request.url()));
    page.on('request', request => resources.push(request.url()));
    await page.goto(pathToFileURL(resolve(root, 'index.html')).href);
    await page.evaluate(() => document.fonts.ready);
    const file = `${width}x${height}.png`;
    const screenshot = await page.screenshot({ path: resolve(output, file) });
    // Before captures are intentionally retained with the user's configuration.
    const before = await readFile(resolve(output, `before-${file}`));
    assert(screenshot.equals(before), `HOME changed during extraction: ${file}`);
    const currentConfig = await page.evaluate(() => structuredClone(window.MINIHOMPY_CONFIG));
    assert.equal(await page.locator('.homepage-title').textContent(), currentConfig.page.title);
    assert.equal(await page.locator('.profile-status').textContent(), currentConfig.profile.introduction);
    assert.equal(await page.locator('.page-tab').count(), 9);
    await page.locator('.page-tab').nth(4).click();
    assert.equal(await page.evaluate(() => window.MinihompyApp.currentView), 'home', 'Click navigation belongs to Step 3');
    await page.evaluate(() => window.scrollTo(0, 0));
    const overflow = await page.locator('.profile-status, .relationship-slot').evaluateAll(elements => elements.filter(e => e.scrollWidth > e.clientWidth).map(e => e.className));
    await page.evaluate(() => {
      window.originalShell = [...document.querySelectorAll('.notebook-frame, .page-tabs, .binder-ring, .utility-panel, [data-view-slot]')];
    });
    const ids = await page.evaluate(() => Object.keys(window.MINIHOMPY_VIEWS));
    assert.equal(ids.length, 9);
    for (const id of ids.filter(id => id !== 'home')) {
      assert.equal(await page.evaluate(id => window.MinihompyApp.renderView(id), id), true);
      assert.equal(await page.locator('[data-view-slot="left"]').textContent(), '');
      assert.equal(await page.locator('[data-view-slot="main"]').textContent(), '');
      assert.equal(await page.locator('.home-scrollbar').isVisible(), false);
      assert.equal(await page.locator('[data-view-slot="main"]').getAttribute('data-view'), id);
    }
    if (width === 579) await page.screenshot({ path: resolve(output, 'empty-view.png') });
    assert.equal(await page.evaluate(() => window.MinihompyApp.renderView('not-a-menu')), false);
    const independent = await page.evaluate(() => {
      const text = value => { const fragment = document.createDocumentFragment(); fragment.append(document.createTextNode(value)); return fragment; };
      const original = window.MINIHOMPY_VIEWS.photos;
      window.MINIHOMPY_VIEWS.photos = { label: '사진첩', showScrollbar: false, createLeft: () => text('왼쪽'), createMain: () => text('본문') };
      window.MinihompyApp.renderView('photos');
      const content = [...document.querySelectorAll('[data-view-slot]')].map(e => e.textContent);
      window.MINIHOMPY_VIEWS.photos = original;
      window.MINIHOMPY_VIEWS.broken = { createLeft: () => text('변경 금지'), createMain: () => null };
      let rejected = false;
      try { window.MinihompyApp.renderView('broken'); } catch { rejected = true; }
      delete window.MINIHOMPY_VIEWS.broken;
      return { content, rejected, unchanged: document.querySelector('[data-view-slot="left"]').textContent === '왼쪽' };
    });
    assert.deepEqual(independent, { content: ['왼쪽', '본문'], rejected: true, unchanged: true });
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.MinihompyApp.renderView('home'));
      assert.equal(await page.locator('.profile-history').count(), 1);
      assert.equal(await page.locator('.miniroom').count(), 1);
    }
    assert.equal(await page.evaluate(() => window.originalShell.every(e => e.isConnected)), true);
    assert.equal(await page.locator('.home-scrollbar').isVisible(), true);
    await page.evaluate(() => document.fonts.ready);
    const roundtrip = await page.screenshot({ path: resolve(output, `roundtrip-${file}`) });
    const repaintPixels = await page.evaluate(async images => {
      const data = await Promise.all(images.map(async src => {
        const image = new Image(); image.src = src; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height);
      }));
      const differences = [];
      for (let i = 0; i < data[0].data.length; i += 4) {
        if ([0, 1, 2].some(c => data[0].data[i + c] !== data[1].data[i + c])) {
          differences.push({ x: (i / 4) % data[0].width, y: Math.floor(i / 4 / data[0].width), delta: Math.max(...[0, 1, 2].map(c => Math.abs(data[0].data[i + c] - data[1].data[i + c]))) });
        }
      }
      return differences;
    }, [screenshot, roundtrip].map(buffer => `data:image/png;base64,${buffer.toString('base64')}`));
    // Repainting SVG/text edges can change a handful of antialiased pixels.
    assert(repaintPixels.length <= 20 && repaintPixels.every(p => p.delta <= 64), `Unexpected repaint difference: ${width}px ${JSON.stringify(repaintPixels.slice(0, 20))} count=${repaintPixels.length}`);
    let horizontalScroll = 0;
    if (width < 579) {
      horizontalScroll = await page.evaluate(() => { window.scrollTo(1000, 0); return window.scrollX; });
      assert.equal(horizontalScroll, 204);
      const right = await page.screenshot({ path: resolve(output, `${width}x${height}-right.png`) });
      assert(right.equals(await readFile(resolve(output, `before-${width}x${height}-right.png`))));
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.addInitScript(() => {
      let config;
      Object.defineProperty(window, 'MINIHOMPY_CONFIG', {
        get: () => config,
        set: value => {
          config = value;
          Object.assign(config.page, { title: '님의 미니홈피' });
          Object.assign(config.profile, { name: '정', introduction: '자기소개가 없습니다.' });
        },
      });
    });
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    const reference = await page.screenshot({ path: resolve(output, `reference-${file}`) });
    assert(reference.equals(await readFile(resolve(root, 'docs/verification/step7', file))), 'Reference config retains original pixels');
    await page.evaluate(() => {
      window.MINIHOMPY_CONFIG.profile.introduction = '<img src=x onerror="window.injected=true">';
      window.MinihompyApp.renderView('photos');
      window.MinihompyApp.renderView('home');
    });
    assert.equal(await page.locator('.profile-status img').count(), 0);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    assert.deepEqual(errors, []);
    assert(resources.every(url => url.startsWith('file:')));
    results.push({ viewport: { width, height }, unchangedHome: true, unchangedReferenceHome: true, repaintPixels, views: ids, independentRegions: independent, horizontalScroll, existingTextOverflow: overflow, errors });
    await page.close();
  }
  const configHash = createHash('sha256').update(await readFile(resolve(root, 'config.js'))).digest('hex');
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ browser: browser.version(), deviceScaleFactor: 1, configHash, results }, null, 2) + '\n');
  console.log('PASS: unchanged user/reference HOME, independent slots, 8 empty views, round trips, shell identity, local loading.');
} finally { await browser.close(); }
