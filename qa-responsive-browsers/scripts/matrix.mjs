// matrix.mjs: multi-browser × multi-width × device screenshots with a report of responsive invariants.
// Usage: node matrix.mjs <baseUrl> <route1,route2,...> <outDir>
// Variables (optional):
//   BROWSERS=chromium,webkit,firefox  WIDTHS=320,375,...  DEVICES="iPhone 15,Pixel 7,iPad Pro 11"
//   LANDSCAPE=0 (drops the landscape variant, included by default)  DARK=1 (repeats 375 and 1280 in dark mode)
//   PSEUDO=1 (repeats 375 with texts lengthened ~40 %)  FULLPAGE=0 (first screen only)
import * as pw from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const [base, routes = '/', outDir = 'responsive'] = process.argv.slice(2);
const env = process.env;
const BROWSERS = (env.BROWSERS || 'chromium,webkit,firefox').split(',');
const WIDTHS = (env.WIDTHS || '320,360,375,390,414,639,640,767,768,1023,1024,1279,1280,1440,1536,1920').split(',').map(Number);
const DEVICES = (env.DEVICES ?? 'iPhone 15,iPhone SE (3rd gen),Pixel 7,iPad Pro 11').split(',').filter(Boolean);
mkdirSync(outDir, { recursive: true });

// Variants: [label, context options, extras]
const variants = [...WIDTHS.map(w => [`w${w}`, { viewport: { width: w, height: 900 } }, {}])];
for (const d of DEVICES) {
  const desc = pw.devices[d]; if (!desc) { console.error(`unknown device: ${d}`); continue; }
  variants.push([d.replace(/\W+/g, '_'), desc, { mobile: desc.isMobile }]);
  if (env.LANDSCAPE !== '0' && pw.devices[`${d} landscape`]) variants.push([`${d.replace(/\W+/g, '_')}_landscape`, pw.devices[`${d} landscape`], { mobile: true }]);
}
if (env.DARK === '1') for (const w of [375, 1280]) variants.push([`w${w}_dark`, { viewport: { width: w, height: 900 }, colorScheme: 'dark' }, { dark: true }]);
if (env.PSEUDO === '1') variants.push(['w375_pseudo', { viewport: { width: 375, height: 900 } }, { pseudo: true }]);

// Invariants, in plain JS so it doesn't depend on the transpiler. Only the outermost element is reported.
const CHECK = `((opts) => {
  const vw = document.documentElement.clientWidth, vh = innerHeight, out = [];
  const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '');
  const visible = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && +cs.opacity !== 0; };
  const fixedAnc = el => { for (let p = el; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).position === 'fixed') return true; return false; };
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 1) out.push({ type: 'horizontal-scroll', sev: 'critical', excess: sw - vw });
  const rep = [];
  const leaves = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (hasText && r.right > 0 && r.left < vw) leaves.push(el);
    const textOverflows = hasText && cs.overflowX === 'visible' && el.scrollWidth > el.clientWidth + 1 && r.left + el.scrollWidth > vw + 1;
    if ((r.right > vw + 1 || r.left < -1 || textOverflows) && !fixedAnc(el) && !rep.some(p => p.contains(el))) {
      let sc = false; for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (/auto|scroll/.test(getComputedStyle(p).overflowX)) sc = true;
      if (!sc) { rep.push(el); out.push({ type: textOverflows ? 'unbroken-text-overflow' : 'outside-viewport', sev: 'high', el: name(el), left: Math.round(r.left), right: Math.round(textOverflows ? r.left + el.scrollWidth : r.right) }); }
    }
    if (hasText && /(hidden|clip)/.test(cs.overflowX + cs.overflowY) && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2) && cs.webkitLineClamp === 'none' && cs.textOverflow !== 'ellipsis')
      out.push({ type: 'clipped-text', sev: 'high', el: name(el), text: el.innerText.trim().slice(0, 40) });
    if (el.tagName === 'IMG' && el.naturalWidth && Math.abs((r.width / r.height) / (el.naturalWidth / el.naturalHeight) - 1) > 0.03 && !/cover|contain|scale-down/.test(cs.objectFit))
      out.push({ type: 'distorted-image', sev: 'medium', el: name(el) });
    if (/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && r.top >= 0 && r.bottom <= vh && r.left >= 0 && r.right <= vw) {
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (hit && !el.contains(hit) && !hit.contains(el) && !(el.labels && [...el.labels].some(l => l.contains(hit)))) out.push({ type: 'interactive-covered', sev: 'high', el: name(el), by: name(hit) });
    }
    if (opts.mobile) {
      const fs = parseFloat(cs.fontSize);
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && !/checkbox|radio|range|color|hidden|submit|button/.test(el.type) && fs < 16)
        out.push({ type: 'input-under-16px-ios-zoom', sev: 'medium', el: name(el), fontSize: fs });
      if (hasText && fs < 12) out.push({ type: 'text-under-12px', sev: 'medium', el: name(el), fontSize: fs, text: el.textContent.trim().slice(0, 30) });
    }
  }
  // Overlaps between text blocks that are not ancestor/descendant (max. 400 leaves so it doesn't get slow)
  const L = leaves.slice(0, 400).map(e => [e, e.getBoundingClientRect()]);
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const [a, ra] = L[i], [b, rb] = L[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 4 && oy > 4) out.push({ type: 'text-overlap', sev: 'high', a: name(a), b: name(b), px: [Math.round(ox), Math.round(oy)] });
  }
  // Gross contrast (< 3:1) between text and its effective background: it gives away half-done dark modes (dark system
  // background + fixed dark text). The color is normalised by painting it on a canvas (works for Tailwind v4 oklch/lab).
  if (opts.contrast) {
    const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const rgba = c => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data]; };
    const lum = ([r, g, b]) => [r, g, b].map(v => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const canvasBg = getComputedStyle(document.documentElement).colorScheme.includes('dark') ? [18, 18, 18, 255] : [255, 255, 255, 255];
    for (const el of leaves.slice(0, 300)) {
      let bg = null; for (let p = el; p; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.backgroundImage !== 'none') { bg = 'img'; break; } const c = rgba(cs.backgroundColor); if (c[3] > 200) { bg = c; break; } }
      if (bg === 'img') continue;
      const fg = rgba(getComputedStyle(el).color), b = bg || canvasBg, L1 = lum(fg), L2 = lum(b);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      if (ratio < 3) out.push({ type: 'near-invisible-text', sev: 'high', el: name(el), ratio: +ratio.toFixed(2), text: el.textContent.trim().slice(0, 30) });
    }
  }
  return out.slice(0, 60);
})`;

// Stylesheet rules: 100vh without a dvh/svh alternative and content that only appears on :hover (unreachable on touch)
const CSSOM = `(() => {
  const vh = [], hover = [];
  const walk = (rules, media) => { for (const r of rules) {
    if (r.cssRules && !r.selectorText) { walk(r.cssRules, r.conditionText || r.media?.mediaText || media); continue; }
    if (!r.selectorText || !r.style) continue;
    for (const p of ['height', 'min-height', 'max-height']) if (/\\b100vh\\b/.test(r.style.getPropertyValue(p))) {
      const n = (() => { try { return document.querySelectorAll(r.selectorText).length; } catch { return 0; } })();
      if (n) vh.push({ selector: r.selectorText.slice(0, 80), prop: p, uses: n });
    }
    if (/:hover/.test(r.selectorText) && (r.style.opacity || r.style.visibility || r.style.display || r.style.getPropertyValue('--tw-translate-x'))) {
      const sel = r.selectorText.replace(/:hover/g, '');
      try { const els = [...document.querySelectorAll(sel)].filter(e => { const cs = getComputedStyle(e); return +cs.opacity === 0 || cs.visibility === 'hidden' || cs.display === 'none'; });
        if (els.length) hover.push({ selector: r.selectorText.slice(0, 80), media: media || '', hidden: els.length, withInteractive: els.some(e => e.querySelector('a,button,input')) }); } catch {}
    }
  } };
  for (const s of document.styleSheets) { try { walk(s.cssRules, ''); } catch {} }
  return { vh100: vh, hoverOnly: hover };
})()`;

const PSEUDO = `(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const map = { a: 'á', e: 'é', i: 'í', o: 'ö', u: 'ü', n: 'ñ' };
  for (let n; (n = w.nextNode());) if (n.textContent.trim() && !/^(SCRIPT|STYLE)$/.test(n.parentElement.tagName)) {
    const t = n.textContent.replace(/[aeioun]/g, c => map[c]); n.textContent = '[' + t + ' ' + 'ŁöŕéḿÏṗśüḿ'.repeat(Math.ceil(t.length * 0.04)) + ']'; } })()`;

const report = [];
for (const bName of BROWSERS) {
  let browser;
  try { browser = await pw[bName].launch(); }
  catch (e) { report.push({ browser: bName, error: 'not available: ' + e.message.split('\n')[0].slice(0, 120) }); console.error(`${bName}: not available (npx playwright install ${bName})`); continue; }
  const version = browser.version();
  for (const [label, ctxOpts, extra] of variants) {
    const o = { ...ctxOpts }; delete o.defaultBrowserType;
    if (bName === 'firefox') delete o.isMobile;                       // Firefox doesn't support isMobile in Playwright
    const ctx = await browser.newContext({ ...o, reducedMotion: 'reduce', locale: 'es-ES' });
    for (const route of routes.split(',')) {
      const page = await ctx.newPage();
      try {
        await page.goto(new URL(route, base).href, { waitUntil: 'networkidle', timeout: 30000 });
        await page.evaluate(() => document.fonts.ready);
        if (extra.pseudo) await page.evaluate(PSEUDO);
        const issues = await page.evaluate(`${CHECK}(${JSON.stringify({ mobile: !!(extra.mobile || (ctxOpts.viewport?.width ?? 1280) < 768), contrast: !!extra.dark || label === 'w1280' })})`);
        const row = { browser: `${bName} ${version}`, variant: label, width: ctxOpts.viewport.width, route, problems: issues.length, issues };
        if (label === 'w375' || extra.mobile) row.css = await page.evaluate(CSSOM);
        await page.screenshot({ path: `${outDir}/${bName}-${label}-${route === '/' ? 'home' : route.replace(/\W+/g, '_')}.png`, fullPage: env.FULLPAGE !== '0' });
        report.push(row);
      } catch (e) { report.push({ browser: bName, variant: label, route, error: e.message.split('\n')[0] }); }
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
}
writeFileSync(`${outDir}/_matrix.json`, JSON.stringify(report, null, 1));
// Summary: by problem type → in which browsers/variants it appears
const summary = {};
for (const f of report.filter(f => f.issues)) for (const i of f.issues) {
  const k = `${i.type} @ ${f.route}`; (summary[k] ||= new Set()).add(`${f.browser.split(' ')[0]}:${f.variant}`);
}
for (const f of report.filter(f => f.css)) {
  for (const v of f.css.vh100) (summary[`100vh without dvh/svh (${v.selector}) @ ${f.route}`] ||= new Set()).add(`${f.browser.split(' ')[0]}:${f.variant}`);
  for (const h of f.css.hoverOnly) (summary[`hover-only content (${h.selector}) @ ${f.route}`] ||= new Set()).add(`${f.browser.split(' ')[0]}:${f.variant}`);
}
console.log(report.filter(f => f.error).map(f => `ERROR ${f.browser} ${f.variant || ''} ${f.route || ''}: ${f.error}`).join('\n'));
for (const [k, v] of Object.entries(summary)) console.log(`${k}\n    ${[...v].slice(0, 12).join(' ')}${v.size > 12 ? ` (+${v.size - 12})` : ''}`);
