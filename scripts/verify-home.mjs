import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// An optional module path lets the research environment reuse its installed browser tools.
const { chromium } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, process.argv[3] || 'docs/verification/step6');
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
    const resources = [];
    page.on('request', request => resources.push(request.url()));
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
      assert(expected.has(region.id), `Unknown region ${region.id}`);
      const source = { ...expected.get(region.id), ...spec.geometryRefinements?.[region.id] };
      for (const key of ['x', 'y', 'width', 'height']) {
        const observed = expected.get(region.id)[key];
        const tolerance = region.id === 'A04' ? spec.verification.stitchTolerance : spec.verification.majorEdgeTolerance;
        assert(Math.abs(region[key] - observed) <= tolerance, `${region.id}.${key} must remain within the original observation tolerance`);
        assert(Math.abs(region[key] - source[key]) <= 1, `${width}px ${region.id}.${key}: ${region[key]} != ${source[key]}`);
      }
    }
    const tabs = await page.locator('.page-tab').allTextContents();
    assert.deepEqual(tabs, measured.tabs.labels);
    assert.equal(await page.locator('.page-tab[aria-current="page"]').textContent(), '홈');
    const overflowingText = await page.locator('.page-tab, .site-links, .gift-heading, .recent-empty, .board-counts, .friends-prompt, .profile-status, .room-balloon > span, .relationship-slot, .music-title, .profile-history').evaluateAll(elements =>
      elements.filter(e => e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight).map(e => e.className));
    assert.deepEqual(overflowingText, [], 'Compact labels must fit their fixed boxes');
    const overlappingLabels = await page.evaluate(() => {
      const collisions = [];
      for (const selector of ['.site-links', '.room-views', '.friends-prompt', '.board-counts > div']) {
        for (const row of document.querySelectorAll(selector)) {
          const boxes = [...row.children].map(e => e.getBoundingClientRect());
          for (let i = 1; i < boxes.length; i++) {
            if (boxes[i - 1].right > boxes[i].left + .1) collisions.push(selector);
          }
        }
      }
      const title = document.querySelector('.homepage-title').getBoundingClientRect();
      const actions = document.querySelector('.header-actions').getBoundingClientRect();
      if (title.right > actions.left) collisions.push('homepage-title/header-actions');
      return collisions;
    });
    assert.deepEqual(overlappingLabels, [], 'Adjacent labels must not overlap');
    assert.equal(await page.locator('.search input').isDisabled(), true);
    assert.equal(await page.locator('.search button').isDisabled(), true);
    const canvas = await page.locator('.minihompy').boundingBox();
    assert.deepEqual(canvas, { x: 0, y: 0, width: 579, height: 349 });
    const contentGeometry = [];
    for (const [selector, id] of [['.miniroom', 'B10'], ['.friends-heading', 'B13'], ['.friends-prompt', 'B14']]) {
      const bounds = await page.locator(selector).boundingBox();
      const measured = expected.get(id);
      assert.deepEqual(bounds, { x: measured.x, y: measured.y, width: measured.width, height: measured.height }, selector);
      contentGeometry.push({ selector, ...bounds });
    }
    await page.screenshot({ path: resolve(output, `${width}x${height}.png`) });
    let horizontalScroll = 0;
    if (width < 579) {
      horizontalScroll = await page.evaluate(() => { window.scrollTo(1000, 0); return window.scrollX; });
      assert(horizontalScroll >= 579 - width, 'The entire fixed canvas must remain reachable');
      await page.screenshot({ path: resolve(output, `${width}x${height}-right.png`) });
    }
    assert.deepEqual(errors, [], 'No script errors or failed local resources');
    assert(resources.every(url => url.startsWith('file:') || url.startsWith('data:')), 'The static HOME must not require external requests');
    const spriteData = `data:image/png;base64,${(await readFile(resolve(root, 'assets/cyworld-reference-sprite.png'))).toString('base64')}`;
    const assets = await page.locator('.reference-sprite').evaluateAll(async (elements, spriteData) => {
      return Promise.all(elements.map(async element => {
        const style = getComputedStyle(element);
        const image = new Image();
        image.src = style.backgroundImage.slice(5, -2);
        await image.decode();
        const pixelImage = new Image();
        pixelImage.src = spriteData;
        await pixelImage.decode();
        const canvas = document.createElement('canvas');
        const { width, height, x, y } = element.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        const [sx, sy] = style.backgroundPosition.split(' ').map(parseFloat);
        context.drawImage(pixelImage, -sx, -sy, width, height, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;
        let coloredPixels = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) - Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) > 25) coloredPixels++;
        }
        return { label: element.getAttribute('aria-label'), x: x + window.scrollX, y: y + window.scrollY, width, height, coloredPixels, naturalWidth: image.naturalWidth };
      }));
    }, spriteData);
    assert.equal(assets.length, 4);
    assert.deepEqual(assets.map(({ x, y, width, height }) => [x, y, width, height]), [
      [56, 80, 76, 72], [316, 177, 18, 36], [476, 147, 38, 38], [516, 147, 38, 38],
    ], 'Only the four measured illustration regions are shown');
    for (const asset of assets) {
      assert.equal(asset.naturalWidth, 579);
      assert(asset.coloredPixels > 30, `Asset must contain the intended colored drawing: ${asset.label}`);
    }
    // DevTools CSS inspection re-fetches file URLs; those are not page load failures.
    page.removeAllListeners('requestfailed');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root: documentNode } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: documentNode.nodeId, selector: '.tab-label' });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    assert(fonts.some(font => font.isCustomFont && font.familyName.startsWith('Galmuri11')), `Bundled tab font must render: ${JSON.stringify(fonts)}`);
    const { nodeId: bodyNode } = await cdp.send('DOM.querySelector', { nodeId: documentNode.nodeId, selector: '.profile-status' });
    const { fonts: bodyFonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: bodyNode });
    assert(bodyFonts.some(font => font.isCustomFont && font.familyName.startsWith('Galmuri11')), 'Bundled body font must render');
    results.push({ viewport: { width, height }, geometry, contentGeometry, tabs, fonts, bodyFonts, assets, horizontalScroll, overlappingLabels, resources: [...new Set(resources)], errors });
    await page.close();
  }
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ browser: browser.version(), deviceScaleFactor: 1, results }, null, 2) + '\n');
  console.log('PASS: frame geometry, 9 tabs, HOME text bounds, 4 raster clips, body/tab fonts, desktop/mobile layout.');
} finally {
  await browser.close();
}
