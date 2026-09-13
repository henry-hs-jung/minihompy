import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mockSettings } from './settings-fixture.mjs';
const { chromium }=await import(pathToFileURL(resolve(process.argv[2])).href);
const out=new URL('../docs/verification/scale/',import.meta.url); await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
try {
  const page=await browser.newPage(); await mockSettings(page);
  await page.goto(new URL('../index.html',import.meta.url).href);
  await page.waitForFunction(()=>window.MinihompySettings.status==='ready');
  for(const [width,height,scale] of [[1000,812,1.5],[375,812,1],[899,812,1],[900,559,1],[900,560,1.5]]){
    await page.setViewportSize({width,height}); await page.evaluate(()=>document.fonts.ready);
    const box=await page.locator('.minihompy').boundingBox();
    assert.equal(box.width,579*scale); assert.equal(box.height,349*scale);
    assert.equal(await page.locator('.minihompy').evaluate(e=>e.offsetWidth),579);
    await page.locator('#admin-auth-toggle').click();
    assert.equal((await page.locator('.admin-dialog').boundingBox()).width,270*scale);
    await page.keyboard.press('Escape');
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:new URL(`${width}-${height}.png`,out).pathname});
  }
  console.log('PASS: uniform 1.5x desktop geometry, 1x small viewport, resize breakpoints, login dialog, unchanged internal width.');
}finally{await browser.close();}
