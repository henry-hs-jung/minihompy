import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { chromium } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : 'playwright');
const output = resolve(root, 'docs/verification/photos-review');
await mkdir(output, { recursive: true });
const files = ['config.js', 'photos-data.js'];
const hashes = async () => Promise.all(files.map(async file => createHash('sha256').update(await readFile(resolve(root, file))).digest('hex')));
const before = await hashes();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
const results = [];
try {
  for (const [width, height, dpr] of [[1000, 700, 1], [375, 812, 1], [375, 812, 2]]) {
    for (const scenario of ['baseline', 'long', 'images', 'many']) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('requestfailed', request => errors.push(request.url()));
      await page.addInitScript(scenario => {
        if (scenario === 'baseline') return;
        let data;
        Object.defineProperty(window, 'MINIHOMPY_PHOTOS', {
          get: () => data,
          set: value => {
            data = value;
            if (scenario === 'long') {
              const long = '아주긴문구LongUnbrokenText'.repeat(16);
              data.folders[0].label = 'LongUnbrokenDivider'.repeat(30);
              data.folders[1].label = long;
              data.folders[1].description = long;
              data.posts[0].title = long;
              data.posts[0].caption = long + '\n' + long;
              data.posts[0].comments = [{ name: long, text: long, date: '10.17 12:04' }];
            }
            if (scenario === 'images') {
              // Synthetic aspect-ratio fixtures; no reference photo is transformed.
              const fixture = (w, h, color) => {
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
                ctx.fillStyle = '#fff'; ctx.fillRect(10, 10, w - 20, 8);
                return { src: canvas.toDataURL(), alt: `${w}x${h} ratio fixture`, width: w, height: h };
              };
              data.posts[0].images = [fixture(300, 600, '#6d9d7e'), fixture(900, 300, '#bc747c'), fixture(400, 400, '#698dac')];
            }
            if (scenario === 'many') {
              data.folders.push(...Array.from({ length: 35 }, (_, i) => ({ id: `extra-${i}`, label: `사진 폴더 ${i}`, description: '' })));
              data.posts = Array.from({ length: 80 }, (_, i) => ({ ...data.posts[0], id: `post-${i}` }));
              data.pageSize = 1;
            }
          },
        });
      }, scenario);
      await page.goto(`${pathToFileURL(resolve(root, 'index.html')).href}#/photos`);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.querySelectorAll('.photo-image')].map(img => img.decode()));
      });
      const check = await page.evaluate(() => {
        const main = document.querySelector('.photos-scroll');
        const sidebar = document.querySelector('.photo-sidebar');
        const nav = document.querySelector('.photo-folders');
        const footer = document.querySelector('.photo-folder-footer');
        const selectors = ['.photo-post-title', '.photo-caption', '.photo-comment', '.photo-description', '.photo-folder-divider', '.photo-pagination'];
        return {
          overflows: selectors.flatMap(s => [...document.querySelectorAll(s)].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'hidden').map(() => s)),
          foldersHorizontalOverflow: nav.scrollWidth > nav.clientWidth,
          mainOverflow: main.scrollWidth > main.clientWidth,
          sidebarOverflow: sidebar.scrollWidth > sidebar.clientWidth,
          foldersOverlapFooter: nav.getBoundingClientRect().bottom > footer.getBoundingClientRect().top,
          images: [...document.querySelector('.photo-post').querySelectorAll('.photo-image')].map(e => ({ width: e.clientWidth, height: e.clientHeight, ratio: e.naturalWidth / e.naturalHeight })),
          canvasWidth: document.querySelector('.minihompy').offsetWidth,
        };
      });
      await page.screenshot({ path: resolve(output, `${scenario}-${width}-dpr${dpr}.png`) });
      assert.deepEqual(check.overflows, [], `${scenario}: overflowing content`);
      assert.equal(check.mainOverflow, false, scenario);
      assert.equal(check.sidebarOverflow, false, scenario);
      assert.equal(check.foldersHorizontalOverflow, false, scenario);
      assert.equal(check.foldersOverlapFooter, false, scenario);
      assert.equal(check.canvasWidth, 579);
      for (const img of check.images) {
        assert.equal(img.width, 240);
        assert(Math.abs(img.height - img.width / img.ratio) <= 1);
      }
      if (scenario === 'images') assert.equal(check.images.length, 3, 'A multi-image post must render all photos');
      if (scenario === 'long') {
        const folder = page.locator('[data-folder="daily"]');
        assert((await folder.getAttribute('title')).length > 100);
        await page.locator('.photo-comment').first().scrollIntoViewIfNeeded();
      } else if (scenario === 'many') {
        while (await page.getByRole('button', { name: '다음 10페이지', exact: true }).count()) {
          await page.getByRole('button', { name: '다음 10페이지', exact: true }).click();
        }
        await page.locator('.photo-pagination button').last().click();
        assert.equal(await page.locator('.photo-post').getAttribute('data-post'), 'post-79');
        await page.locator('[data-folder="extra-34"]').click();
        assert.equal(await page.locator('.photo-empty').count(), 1);
        await page.locator('[data-folder="daily"]').click();
        await page.locator('.photo-pagination').scrollIntoViewIfNeeded();
      } else {
        await page.locator('.photo-comment-input').first().scrollIntoViewIfNeeded();
      }
      await page.screenshot({ path: resolve(output, `${scenario}-detail-${width}-dpr${dpr}.png`) });
      assert.deepEqual(errors, []);
      results.push({ width, height, dpr, scenario, check, errors });
      await page.close();
    }
  }
  assert.deepEqual(await hashes(), before, 'User configuration and sample data must remain unchanged');
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ hashes: Object.fromEntries(files.map((file, i) => [file, before[i]])), results }, null, 2) + '\n');
  console.log('PASS: 12 content scenarios, long text, portrait/wide/square and multiple images, 80 pages, 35 extra folders, unchanged data.');
} finally { await browser.close(); }
