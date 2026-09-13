import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'docs/verification/step6');
await mkdir(output, { recursive: true });
const sources = ['references/cyworld-master.png', 'docs/verification/step5/579x349.png', 'docs/verification/step6/579x349.png'];
const images = await Promise.all(sources.map(async file => `data:image/png;base64,${(await readFile(resolve(root, file))).toString('base64')}`));
const regions = [
  ['전체', 0, 0, 579, 349], ['상단', 7, 4, 560, 16],
  ['프레임 위', 19, 32, 435, 36], ['프레임 아래', 19, 299, 435, 26],
  ['격자', 469, 200, 92, 130], ['프로필 하단', 46, 239, 92, 40],
  ['HOME 본문', 168, 75, 240, 67], ['말풍선', 246, 144, 82, 40],
  ['일촌평', 168, 222, 240, 42], ['우측', 469, 32, 92, 113], ['탭', 432, 73, 31, 161],
];
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>HOME pixel comparison</title>
<style>body{margin:16px;font:12px/1.5 sans-serif;color:#222;background:#eee}h1{font-size:18px}h2{font-size:14px;margin:16px 0 4px}.row{display:flex;gap:12px}figure{margin:0}figcaption{height:22px}canvas{display:block;background:#fff;image-rendering:pixelated}.detail canvas{width:calc(var(--w)*3px);height:calc(var(--h)*3px)}</style>
<h1>Master / Step 5 / Step 6 / 50% Overlay / Absolute Difference</h1><main></main>
<script>
const images=${JSON.stringify(images)}, regions=${JSON.stringify(regions)};
window.ready=(async()=>{
const loaded=await Promise.all(images.map(src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i);i.src=src})));
const pixels=loaded.map(i=>{const c=document.createElement('canvas');c.width=579;c.height=349;const x=c.getContext('2d');x.drawImage(i,0,0);return x.getImageData(0,0,579,349).data});
const result=[];
for(const [name,x,y,w,h] of regions){
 const section=document.createElement('section');section.innerHTML='<h2>'+name+'</h2><div class="row"></div>';section.id='region-'+result.length;if(name!=='전체')section.className='detail';document.querySelector('main').append(section);
 const scores=[];
 for(let k=0;k<5;k++){
  const f=document.createElement('figure');f.innerHTML='<figcaption>'+['Master','Step 5','Step 6','50% Overlay','Difference (1x)'][k]+'</figcaption>';const c=document.createElement('canvas');c.width=w;c.height=h;c.style.setProperty('--w',w);c.style.setProperty('--h',h);f.append(c);section.querySelector('.row').append(f);const ctx=c.getContext('2d');
  if(k<3)ctx.drawImage(loaded[k],x,y,w,h,0,0,w,h);
  if(k===3){ctx.drawImage(loaded[0],x,y,w,h,0,0,w,h);ctx.globalAlpha=.5;ctx.drawImage(loaded[2],x,y,w,h,0,0,w,h)}
  if(k===4){const d=ctx.createImageData(w,h);for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const p=((yy+y)*579+xx+x)*4,q=(yy*w+xx)*4;for(let ch=0;ch<3;ch++)d.data[q+ch]=Math.abs(pixels[0][p+ch]-pixels[2][p+ch]);d.data[q+3]=255}ctx.putImageData(d,0,0)}
 }
 for(let k=1;k<3;k++){let sum=0;for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)for(let ch=0;ch<3;ch++){const p=(yy*579+xx)*4+ch;sum+=Math.abs(pixels[0][p]-pixels[k][p])}scores.push(Number((sum/(w*h*3)).toFixed(3)))}
 result.push({name,x,y,width:w,height:h,beforeMAE:scores[0],afterMAE:scores[1]});
}
const samples=[[470,210,90,100],[22,60,5,180],[160,49,260,4],[160,303,240,4],[200,226,200,17]];
const colors=samples.map(([x,y,w,h])=>({x,y,w,h,colors:pixels.map(data=>{const counts=new Map();for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const p=(yy*579+xx)*4;const rgb=[...data.slice(p,p+3)].join(',');counts.set(rgb,(counts.get(rgb)||0)+1)}return [...counts].sort((a,b)=>b[1]-a[1]).slice(0,5)})}));
return {regions:result,colors};
})();</script></html>`;
await writeFile(resolve(output, 'comparison.html'), html);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 3000, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(resolve(output, 'comparison.html')).href);
  const metrics = await page.evaluate(() => window.ready);
  await writeFile(resolve(output, 'comparison.json'), JSON.stringify(metrics, null, 2) + '\n');
  await page.locator('#region-0').screenshot({ path: resolve(output, 'comparison.png') });
  await page.locator('#region-0 canvas').nth(3).screenshot({ path: resolve(output, 'overlay.png') });
  await page.locator('#region-0 canvas').nth(4).screenshot({ path: resolve(output, 'difference.png') });
  await page.addStyleTag({ content: '.detail .row{width:max-content}.detail figure:nth-child(2),.detail figure:nth-child(n+4){display:none}.detail{width:max-content}' });
  for (const index of [2, 3, 6, 7, 8, 9]) {
    await page.locator(`#region-${index}`).screenshot({ path: resolve(output, `detail-${index}.png`) });
  }
  console.log(JSON.stringify(metrics));
} finally { await browser.close(); }
