import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'docs/verification/step6');
await mkdir(output, { recursive: true });
const master = `data:image/png;base64,${(await readFile(resolve(root, 'references/cyworld-master.png'))).toString('base64')}`;
const sizeRoles = [
  ['title', '.homepage-title', [181, 55, 65, 12], [8, 8.5, 9]],
  ['utility', '.utility-panel', [474, 35, 82, 68], [6, 6.5, 7]],
  ['section', '.home-panel h2', [168, 75, 43, 9], [6.5, 7, 7.5]],
  ['profile', '.profile-status', [62, 153, 66, 10], [6, 6.5, 7]],
  ['views', '.room-views', [168, 133, 100, 9], [6, 6.5, 7]],
  ['balloon', '.room-balloon', [262, 157, 52, 13], [6, 6.5, 7]],
  ['friends', '.friends-prompt', [185, 250, 120, 12], [6, 6.5, 7]],
  ['top', '.site-bar', [246, 6, 311, 12], [6, 6.5, 7]],
];
const positions = process.argv[3] === 'positions';
const roles = positions ? [
  ['title-y', '.homepage-title', [181, 54, 65, 14], [-1, 0, 1, 2]],
  ['balloon-x', '.room-balloon', [246, 144, 82, 40], [0, .5, 1]],
  ['balloon-y', '.room-balloon', [246, 144, 82, 40], [0, .5, 1]],
] : sizeRoles;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 579, height: 349 }, deviceScaleFactor: 1 });
  const analysis = await browser.newPage();
  await page.goto(pathToFileURL(resolve(root, 'index.html')).href);
  await page.evaluate(() => document.fonts.ready);
  const results = [];
  for (const [role, selector, region, sizes] of roles) {
    for (const size of sizes) {
      const declaration = positions ? `transform:translate${role.endsWith('-x') ? 'X' : 'Y'}(${size}px)` : `font-size:${size}px`;
      const style = await page.addStyleTag({ content: `${selector}{${declaration}}` });
      const screenshot = `data:image/png;base64,${(await page.screenshot()).toString('base64')}`;
      const mae = await analysis.evaluate(async ({ master, screenshot, region }) => {
        const data = await Promise.all([master, screenshot].map(async src => {
          const i = new Image(); i.src = src; await i.decode();
          const c = document.createElement('canvas'); c.width = 579; c.height = 349;
          const ctx = c.getContext('2d'); ctx.drawImage(i, 0, 0); return ctx.getImageData(0, 0, 579, 349).data;
        }));
        const [x, y, w, h] = region; let sum = 0;
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) for (let ch = 0; ch < 3; ch++) {
          const p = (yy * 579 + xx) * 4 + ch; sum += Math.abs(data[0][p] - data[1][p]);
        }
        return Number((sum / (w * h * 3)).toFixed(3));
      }, { master, screenshot, region });
      results.push({ role, selector, region, declaration, mae });
      await style.evaluate(e => e.remove());
    }
  }
  await writeFile(resolve(output, positions ? 'position-study.json' : 'type-study.json'), JSON.stringify({ note: 'Isolated candidates on the pre-final Step 6 layout. MAE is diagnostic, not proof of font identity.', results }, null, 2) + '\n');
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
