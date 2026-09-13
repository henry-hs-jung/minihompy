import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const data = JSON.parse(readFileSync(resolve(root, 'docs/measurements/master-measurements.json'), 'utf8'));
const png = readFileSync(resolve(root, data.source));
if (png.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
    png.readUInt32BE(16) !== data.image.width || png.readUInt32BE(20) !== data.image.height) {
  throw new Error('Source PNG does not match measurement dimensions.');
}
const ids = new Set();
for (const region of [...data.regions, ...data.details]) {
  const { id, x, y, width, height } = region;
  if (ids.has(id) || ![x, y, width, height].every(Number.isInteger) ||
      x < 0 || y < 0 || width <= 0 || height <= 0 ||
      x + width > data.image.width || y + height > data.image.height) {
    throw new Error(`Invalid measurement: ${id}`);
  }
  ids.add(id);
}
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const colors = ['#b40038', '#005bbb', '#00654d', '#7439a3', '#994600'];
const source = `data:image/png;base64,${png.toString('base64')}`;
function panel(title, regions, top) {
  const left = 40;
  const scale = 2;
  let content = `<text x="40" y="${top - 26}" class="title">${escape(title)}</text>`;
  content += `<image href="${source}" x="${left}" y="${top}" width="1158" height="698" style="image-rendering:pixelated"/>`;
  for (let x = 0; x <= data.image.width; x += 50) {
    content += `<path d="M${left + x * scale} ${top - 5}v5" class="tick"/><text x="${left + x * scale}" y="${top - 8}" class="ruler">${x}</text>`;
  }
  for (let y = 0; y <= data.image.height; y += 25) {
    content += `<path d="M${left - 5} ${top + y * scale}h5" class="tick"/><text x="${left - 8}" y="${top + y * scale + 4}" class="ruler" text-anchor="end">${y}</text>`;
  }
  regions.forEach((r, i) => {
    const color = colors[i % colors.length];
    const x = left + r.x * scale;
    const y = top + r.y * scale;
    content += `<g><title>${escape(`${r.id}: ${r.name}; x=${r.x}, y=${r.y}, w=${r.width}, h=${r.height}`)}</title>`;
    content += `<rect x="${x}" y="${y}" width="${r.width * scale}" height="${r.height * scale}" fill="none" stroke="${color}" stroke-width="1.5"/>`;
    // IDs stay in the legend for the dense detail view, preserving tiny source elements.
    if (regions === data.regions) {
      content += `<rect x="${x}" y="${y}" width="31" height="15" fill="white"/><text x="${x + 2}" y="${y + 12}" fill="${color}" class="id">${r.id}</text>`;
    } else {
      const cx = x + r.width * scale;
      const cy = y + r.height * scale / 2;
      content += `<circle cx="${cx}" cy="${cy}" r="2.5" fill="${color}"/>`;
    }
    const ly = top + 20 + i * 33;
    content += `<rect x="1220" y="${ly - 12}" width="10" height="10" fill="${color}"/>`;
    content += `<text x="1240" y="${ly}" class="legend">${escape(`${r.id} ${r.name}`)}</text>`;
    content += `<text x="1240" y="${ly + 14}" class="coords">${r.x}, ${r.y} / ${r.width} x ${r.height} px</text></g>`;
  });
  return content;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1680" height="1595" viewBox="0 0 1680 1595">
<title>Cyworld master image measurements</title>
<desc>Original 579 by 349 pixel reference embedded at two times scale. Upper panel: main structure. Lower panel: details. Coordinates remain source-image pixels; most bounds have an estimated two-pixel tolerance.</desc>
<style>text{font-family:Arial,sans-serif;letter-spacing:0}.title{font-size:19px;font-weight:bold}.legend{font-size:14px}.coords{font-size:12px;fill:#555}.ruler{font-size:10px;fill:#555}.id{font-size:11px;font-weight:bold}.tick{stroke:#555;stroke-width:1}</style>
<rect width="1680" height="1595" fill="#fff"/>
${panel('A / Main structure - source pixels, displayed at 2x', data.regions, 65)}
${panel('B / Content and binder details - hover a rectangle for its ID', data.details, 845)}
<text x="40" y="1580" class="legend">Visible bounds, not original CSS. Default tolerance: +/-2 source pixels. Original PNG is embedded unchanged.</text>
</svg>`;
const output = resolve(root, 'docs/measurements/cyworld-master-annotated.svg');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, svg);
console.log(`Validated ${ids.size} regions. Generated ${output}`);
