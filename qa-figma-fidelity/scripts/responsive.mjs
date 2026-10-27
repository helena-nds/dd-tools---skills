// responsive.mjs: responsive invariants across a matrix of widths (no reference design).
// Usage: node responsive.mjs <url> <outDir> [comma-separated widths]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const [url, outDir, list] = process.argv.slice(2);
const widths = (list || '320,360,375,390,414,639,640,767,768,1023,1024,1279,1280,1440,1535,1536,1920').split(',').map(Number);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const report = [];
for (const w of widths) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'networkidle' });              // navigate again at each width
  await page.evaluate(() => document.fonts.ready);
  const issues = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth, out = [];
    const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
    if (document.documentElement.scrollWidth > vw + 1) out.push({ type: 'page-horizontal-scroll', excess: document.documentElement.scrollWidth - vw });
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (!r.width || cs.position === 'fixed' || cs.visibility === 'hidden') continue;
      if (r.right > vw + 1 || r.left < -1) out.push({ type: 'outside-viewport', el: name(el), left: Math.round(r.left), right: Math.round(r.right) });
      if (/(hidden|clip)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) out.push({ type: 'hidden-horizontal-clipping', el: name(el), px: el.scrollWidth - el.clientWidth });
      if (/(hidden|clip)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1 && cs.webkitLineClamp === 'none') out.push({ type: 'text-clipped-vertically', el: name(el) });
      if (el.tagName === 'IMG' && el.naturalWidth && Math.abs(r.width / r.height - el.naturalWidth / el.naturalHeight) > 0.02 && !/cover|contain/.test(cs.objectFit))
        out.push({ type: 'distorted-image', el: name(el) });
      if (/^(A|BUTTON)$/.test(el.tagName) && r.top >= 0 && r.bottom <= innerHeight) {               // CTA covered by another layer
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (hit && !el.contains(hit) && !hit.contains(el)) out.push({ type: 'interactive-covered', el: name(el), by: name(hit) });
      }
    }
    return out.slice(0, 40);
  });
  await page.screenshot({ path: `${outDir}/w${w}.png`, fullPage: true });
  report.push({ width: w, problems: issues.length, issues });
  await page.close();
}
writeFileSync(`${outDir}/_responsive.json`, JSON.stringify(report, null, 1));
console.log(report.map(r => `${r.width}px: ${r.problems} problems`).join('\n'));
await browser.close();
