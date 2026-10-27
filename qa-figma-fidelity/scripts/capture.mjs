// capture.mjs: deterministic capture of a route + computed styles per section.
// Usage: node capture.mjs <url> <width> <height> <map.json> <outDir> [dpr=1]
//   map.json = { "hero": "[data-section=hero]", "servicios": "#servicios", ... }  (section name → CSS selector)
import { chromium } from 'playwright';
import { parse, formatHex8 } from 'culori';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const [url, w, h, mapPath, outDir, dpr = '1'] = process.argv.slice(2);
const sections = JSON.parse(readFileSync(mapPath, 'utf8'));
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text', '--disable-font-subpixel-positioning', '--force-color-profile=srgb', '--hide-scrollbars'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr, colorScheme: 'light', reducedMotion: 'reduce', locale: 'es-ES', timezoneId: 'Europe/Madrid' });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', m => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 200)));

await page.goto(url, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} nextjs-portal{display:none!important}' });
await page.evaluate(async () => {                       // force lazy images and fonts
  for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
  window.scrollTo(0, 0);
  await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
  await document.fonts.ready;
});
await page.mouse.move(0, 0);
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/_full.png`, fullPage: true });

// Plain JS (string) to avoid helpers injected by transpilers
const EXTRACT = `(sel) => {
  const root = document.querySelector(sel); if (!root) return null;
  const P = ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','textTransform','textAlign','color','backgroundColor','backgroundImage',
    'borderTopWidth','borderTopColor','borderTopStyle','borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius',
    'boxShadow','opacity','paddingTop','paddingRight','paddingBottom','paddingLeft','gap','rowGap','columnGap','display','flexDirection',
    'justifyContent','alignItems','position','zIndex','objectFit','objectPosition','maxWidth','width','height'];
  const r0 = root.getBoundingClientRect();
  const pick = el => { const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
    return { tag: el.tagName.toLowerCase(), id: el.id || undefined, cls: (el.getAttribute('class') || '').slice(0, 160) || undefined,
      figma: el.dataset.figmaNode, text: own ? own.slice(0, 80) : undefined,
      box: { x: +(r.left - r0.left).toFixed(1), y: +(r.top - r0.top).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
      style: Object.fromEntries(P.map(p => [p, cs[p]])),
      img: el.tagName === 'IMG' ? { natural: [el.naturalWidth, el.naturalHeight], src: (el.currentSrc || '').slice(0, 160) } : undefined };
  };
  const interesting = [...root.querySelectorAll('*')].filter(el => {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false;
    return /^(H[1-6]|P|A|BUTTON|IMG|SVG|INPUT|TEXTAREA|SELECT|LABEL|LI|FIGURE|VIDEO)$/.test(el.tagName) || el.dataset.figmaNode ||
      [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  }).slice(0, 80);
  return { root: pick(root), elements: interesting.map(pick) };
}`;
const toHex = s => s.replace(/(?:rgba?|oklch|oklab|lab|lch|hsla?|color)\([^)]*\)/g, m => { const c = parse(m); return c ? formatHex8(c) : m; });
const result = { url, viewport: { w: +w, h: +h, dpr: +dpr }, clientWidth: await page.evaluate(() => document.documentElement.clientWidth), sections: {} };

for (const [name, sel] of Object.entries(sections)) {
  const loc = page.locator(sel).first();
  if (!(await loc.count())) { result.sections[name] = { error: `selector not found: ${sel}` }; continue; }
  await loc.scrollIntoViewIfNeeded();
  await loc.screenshot({ path: `${outDir}/${name}.png`, animations: 'disabled', caret: 'hide' });
  const data = await page.evaluate(`(${EXTRACT})(${JSON.stringify(sel)})`);
  for (const el of [data.root, ...data.elements]) for (const k of Object.keys(el.style)) el.style[k] = toHex(String(el.style[k]));
  result.sections[name] = data;
}
result.fonts = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family} ${f.weight} ${f.style}`));
result.figmaTempUrls = await page.evaluate(() => [...document.querySelectorAll('img,source,image')].map(e => e.currentSrc || e.src || e.getAttribute('href') || '').filter(u => /figma\.com\/api|localhost:3845|127\.0\.0\.1:3845/.test(u)));
result.consoleErrors = consoleErrors;
writeFileSync(`${outDir}/_styles.json`, JSON.stringify(result, null, 1));
console.log(`OK: ${Object.keys(sections).length} sections → ${outDir} (clientWidth=${result.clientWidth})`);
await browser.close();
