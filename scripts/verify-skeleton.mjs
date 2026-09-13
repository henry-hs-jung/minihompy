import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// An optional module path lets the research environment reuse its installed browser tools.
const { chromium } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'docs/verification/step4');
await mkdir(output, { recursive: true });
const spec = JSON.parse(await readFile(resolve(root, 'docs/visual-spec.json'), 'utf8'));
const measured = JSON.parse(await readFile(resolve(root, spec.measurements), 'utf8'));
const expected = new Map([...measured.regions, ...measured.details].map(r => [r.id, r]));
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const [width, height] of [spec.verification.comparisonViewport, ...spec.verification.otherViewports]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
    await page.goto(pathToFileURL(resolve(root, 'index.html')).href);
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.locator('[data-region]').evaluateAll(elements => elements.map(element => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { id: element.dataset.region, x, y, width, height };
    }));
    assert.equal(geometry.length, 14, 'Nine main regions, one scrollbar, four rings');
    for (const region of geometry) {
      const source = expected.get(region.id);
      assert(source, `Unknown region ${region.id}`);
      for (const key of ['x', 'y', 'width', 'height']) {
        assert(Math.abs(region[key] - source[key]) <= 1, `${width}px ${region.id}.${key}: ${region[key]} != ${source[key]}`);
      }
    }
    const tabs = await page.locator('.page-tab').allTextContents();
    assert.deepEqual(tabs, measured.tabs.labels);
    assert.equal(await page.locator('.page-tab[aria-current="page"]').textContent(), '홈');
    const overflowingText = await page.locator('.page-tab, .site-links, .gift-heading').evaluateAll(elements =>
      elements.filter(e => e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight).map(e => e.className));
    assert.deepEqual(overflowingText, [], 'Compact labels must fit their fixed boxes');
    const canvas = await page.locator('.minihompy').boundingBox();
    assert.deepEqual(canvas, { x: 0, y: 0, width: 579, height: 349 });
    await page.screenshot({ path: resolve(output, `${width}x${height}.png`) });
    let horizontalScroll = 0;
    if (width < 579) {
      horizontalScroll = await page.evaluate(() => { window.scrollTo(1000, 0); return window.scrollX; });
      assert(horizontalScroll >= 579 - width, 'The entire fixed canvas must remain reachable');
      await page.screenshot({ path: resolve(output, `${width}x${height}-right.png`) });
    }
    assert.deepEqual(errors, [], 'No script errors or failed local resources');
    // DevTools CSS inspection re-fetches file URLs; those are not page load failures.
    page.removeAllListeners('requestfailed');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root: documentNode } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: documentNode.nodeId, selector: '.tab-label' });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    assert(fonts.some(font => font.isCustomFont && font.familyName.startsWith('Galmuri11')), `Bundled tab font must render: ${JSON.stringify(fonts)}`);
    results.push({ viewport: { width, height }, geometry, tabs, fonts, horizontalScroll, errors });
    await page.close();
  }
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ browser: browser.version(), deviceScaleFactor: 1, results }, null, 2) + '\n');
  console.log('PASS: 14 regions, 9 tabs, label bounds, local resources, fixed desktop/mobile layout, horizontal scroll.');
} finally {
  await browser.close();
}
