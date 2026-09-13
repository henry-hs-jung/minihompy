import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(root, 'docs/verification/tab-fonts');
await mkdir(out, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'cyworld-tab-fonts-'));
const variants = [
  { id: 'current', family: 'WenQuanYi Zen Hei', size: 7, scale: 1 },
  { id: 'dotum-7', family: 'Dotum', size: 7, scale: 1 },
  { id: 'gulim-7', family: 'Gulim', size: 7, scale: 1 },
  { id: 'dotum-6', family: 'Dotum', size: 6, scale: 1 },
  { id: 'gulim-6', family: 'Gulim', size: 6, scale: 1 },
  { id: 'dotum-12-half', family: 'Dotum', size: 12, scale: 0.5 },
  { id: 'gulim-12-half', family: 'Gulim', size: 12, scale: 0.5 },
  { id: 'dotum-12-055', family: 'Dotum', size: 12, scale: 0.55 },
  { id: 'dotum-mono-12-half', family: 'Dotum', size: 12, scale: 0.5, monochrome: true },
  { id: 'gulim-mono-12-half', family: 'Gulim', size: 12, scale: 0.5, monochrome: true }
];
let browser;
try {
  execFileSync('python3', ['-c', 'import sys; from fontTools.ttLib import TTCollection; from pathlib import Path; c=TTCollection("/mnt/c/Windows/Fonts/gulim.ttc");\nfor index,name in [(0,"Gulim"),(2,"Dotum")]:\n f=c.fonts[index]\n for table in ["EBDT","EBLC"]:\n  if table in f: del f[table]\n f.save(Path(sys.argv[1])/(name+".ttf"))', temporary]);
  const fontData = {};
  for (const name of ['Dotum', 'Gulim']) fontData[name] = (await readFile(join(temporary, `${name}.ttf`))).toString('base64');
  const masks = JSON.parse(execFileSync('python3', ['-c', 'import json; from PIL import ImageFont; result={};\nfor family,index in [("Gulim",0),("Dotum",2)]:\n font=ImageFont.truetype("/mnt/c/Windows/Fonts/gulim.ttc",12,index=index); result[family]={}\n for text in ["홈","프로필","다이어리","쥬크박스","사진첩","갤러리","게시판","동영상","방명록"]:\n  mask=font.getmask(text,mode="1"); w,h=mask.size; result[family][text]={"width":w,"height":h,"pixels":[[x,y] for y in range(h) for x in range(w) if mask[y*w+x]]}\nprint(json.dumps(result))'], { encoding: 'utf8' }));
  browser = await chromium.launch({ headless: true });
  const results = [];
  for (const variant of variants) {
    const page = await browser.newPage({ viewport: { width: 579, height: 349 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(resolve(root, 'index.html')).href);
    if (fontData[variant.family]) await page.evaluate(async ({ family, data }) => {
      const font = new FontFace(family, `url(data:font/ttf;base64,${data})`);
      await font.load();
      document.fonts.add(font);
    }, { family: variant.family, data: fontData[variant.family] });
    await page.locator('.page-tab').evaluateAll((tabs, variant) => {
      for (const tab of tabs) {
        const label = document.createElement('span');
        label.textContent = tab.textContent;
        label.style.cssText = `font-family:'${variant.family}';font-size:${variant.size}px;line-height:${variant.size + 2}px;letter-spacing:0;flex:none;transform:scale(${variant.scale});`;
        tab.replaceChildren(label);
      }
    }, variant);
    await page.evaluate(() => document.fonts.ready);
    if (variant.monochrome) await page.locator('.page-tab > span').evaluateAll((spans, masks) => {
      for (const span of spans) {
        const mask = masks[span.textContent];
        span.style.width = `${mask.width}px`;
        span.style.height = `${mask.height}px`;
        span.style.lineHeight = '0';
        span.dataset.label = span.textContent;
        span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${mask.width}" height="${mask.height}" viewBox="0 0 ${mask.width} ${mask.height}">${mask.pixels.map(([x,y]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="currentColor"/>`).join('')}</svg>`;
      }
    }, masks[variant.family]);
    await page.locator('.page-tabs').screenshot({ path: join(out, `${variant.id}.png`) });
    const labels = await page.locator('.page-tab > span').evaluateAll(spans => spans.map(span => {
      const r = span.getBoundingClientRect();
      return { text: span.dataset.label || span.textContent, x: r.x, y: r.y, width: r.width, height: r.height };
    }));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root: node } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: node.nodeId, selector: '.page-tab > span' });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    results.push({ ...variant, fonts, labels });
    await page.close();
  }
  await writeFile(join(out, 'results.json'), JSON.stringify({ browser: browser.version(), deviceScaleFactor: 1, outlineNote: 'Dotum/Gulim outlines loaded from temporary TTF faces with EBDT/EBLC removed because native embedded bitmap rendering was blank in this Chromium environment.', monochromeNote: 'FreeType monochrome masks at 12px, rendered as diagnostic SVG pixels at 0.5 scale; not a verified historical Windows render.', results }, null, 2) + '\n');
  const columns = [
    `<section><h2>Master</h2><p>579px source</p><div class="view"><div class="crop"><img class="master" src="../../../references/cyworld-master.png" alt="Master tabs"></div></div></section>`,
    `<section><h2>R06</h2><p>740px to 560px</p><div class="view"><div class="crop"><img class="r06" src="../../../references/research/moneytoday-master-related.jpg" alt="R06 tabs"></div></div></section>`,
    ...variants.map(v => `<section><h2>${v.id}</h2><p>${v.size}px x ${v.scale}</p><img class="sample" src="${v.id}.png" alt="${v.id} tabs"></section>`)
  ];
  await writeFile(join(out, 'comparison.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Tab font comparison</title><style>*{box-sizing:border-box}body{margin:20px;font:12px Arial,sans-serif;color:#333;background:#fff;letter-spacing:0}main{display:flex;gap:16px}section{width:124px;flex:none}h2{font-size:12px;margin:0 0 8px}p{height:16px;margin:0 0 10px}.sample{width:124px;height:644px;image-rendering:pixelated}.view{width:124px;height:644px}.crop{position:relative;width:31px;height:161px;overflow:hidden;transform:scale(4);transform-origin:top left}.crop img{position:absolute;max-width:none;image-rendering:pixelated}.master{width:579px;height:349px;left:-432px;top:-73px}.r06{width:560px;height:auto;left:-425px;top:-69px}</style><main>${columns.join('')}</main></html>`);
  const sheet = await browser.newPage({ viewport: { width: 1740, height: 740 }, deviceScaleFactor: 1 });
  await sheet.goto(pathToFileURL(join(out, 'comparison.html')).href);
  await sheet.screenshot({ path: join(out, 'comparison.png'), fullPage: true });
  await sheet.close();
  console.log(JSON.stringify(results.map(r => ({ id: r.id, fonts: r.fonts, diaryWidth: r.labels[2].width })), null, 2));
} finally {
  if (browser) await browser.close();
  await rm(temporary, { recursive: true, force: true });
}
