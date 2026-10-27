// reflow-motion.mjs: reflow at 320 px (1.4.10), 200 % zoom (1.4.4), text spacing (1.4.12),
// text in px that ignores the user's font size, and animations with prefers-reduced-motion (2.3.3/2.2.2).
// Usage: node reflow-motion.mjs <url> <outDir>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const [url, outDir = '.'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const out = { url };

// Horizontal overflow: only the outermost element that sticks out (its children are not repeated).
// Tables, code, maps, video/canvas and containers with their own scroll are allowed (1.4.10 exception).
const OVERFLOW = `(() => {
  const vw = document.documentElement.clientWidth, res = [];
  const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 4).join('.') : '');
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    // Text that overflows its own box (long words, URLs without breaks): the rect does not show it, scrollWidth does
    const textOverflows = cs.overflowX === 'visible' && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && el.scrollWidth > el.clientWidth + 1 && r.left + el.scrollWidth > vw + 1;
    if (!r.width || (r.right <= vw + 1 && !textOverflows)) continue;
    if (el.closest('table,pre,code,video,canvas,[role=application],[data-qa-2d]')) continue;
    let p = el, ownScroll = false, fixed = false;
    for (; p && p !== document.body; p = p.parentElement) { const c = getComputedStyle(p); if (c.position === 'fixed') fixed = true; if (p !== el && /auto|scroll/.test(c.overflowX)) ownScroll = true; }
    if (fixed || ownScroll || res.some(x => x.node.contains(el))) continue;   // fixed/off-canvas content is checked by keyboard.mjs
    res.push({ node: el, el: name(el), right: Math.round(textOverflows ? r.left + el.scrollWidth : r.right), width: Math.round(r.width), ...(textOverflows && { reason: 'unbroken text overflows its box' }) });
  }
  return { horizontalScroll: document.documentElement.scrollWidth - vw, culprits: res.slice(0, 15).map(({ node, ...x }) => x) };
})()`;
const CLIPPED = `(() => [...document.querySelectorAll('body *')].filter(el => {
  const cs = getComputedStyle(el); if (!el.innerText?.trim() || el.children.length > 3) return false;
  if (el.getBoundingClientRect().width <= 1) return false;             // sr-only and similar
  return (/(hidden|clip)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) || (/(hidden|clip)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2);
}).slice(0, 15).map(el => el.tagName.toLowerCase() + ' "' + el.innerText.trim().slice(0, 50) + '"'))()`;

for (const [key, vp, dpr] of [['reflow320', { width: 320, height: 256 }, 1], ['zoom200', { width: 640, height: 450 }, 2]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: dpr });
  await page.goto(url, { waitUntil: 'networkidle' });
  out[key] = { ...(await page.evaluate(OVERFLOW)), clippedText: await page.evaluate(CLIPPED) };
  await page.screenshot({ path: `${outDir}/${key}.png`, fullPage: true });
  await page.close();
}

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
// Text that does not scale with the browser font size (fixed px): the root font-size is doubled and compared
const texts = `[...document.querySelectorAll('body *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getBoundingClientRect().width > 1)`;
const before = await page.evaluate(`${texts}.map(e => parseFloat(getComputedStyle(e).fontSize))`);
await page.addStyleTag({ content: 'html{font-size:200% !important}' });
out.fixedPxText = await page.evaluate(`(() => { const a = ${JSON.stringify(before)}; return ${texts}.map((e, i) => ({ e, a: a[i], d: parseFloat(getComputedStyle(e).fontSize) }))
  .filter(x => x.a && x.d < x.a * 1.5).slice(0, 15).map(x => x.e.tagName.toLowerCase() + ' ' + x.a + 'px "' + x.e.textContent.trim().slice(0, 40) + '"'); })()`);
await page.reload({ waitUntil: 'networkidle' });
// 1.4.12 text spacing (official WCAG bookmarklet): no content may be lost or clipped
await page.addStyleTag({ content: '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}' });
out.textSpacing = { clippedText: await page.evaluate(CLIPPED), ...(await page.evaluate(OVERFLOW)) };
await page.close();

// Motion: with reduce no animation should keep running (infinite or > 5 s), and no autoplay video
for (const pref of ['no-preference', 'reduce']) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: pref });
  await p.goto(url, { waitUntil: 'networkidle' });
  out['motion_' + pref] = await p.evaluate(() => ({
    animations: document.getAnimations().filter(a => a.playState === 'running').map(a => {
      const t = a.effect?.getTiming?.() || {}, el = a.effect?.target;
      return { type: a.constructor.name, name: a.animationName || a.transitionProperty || '', el: el ? el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 3).join('.') : '',
        infinite: t.iterations === Infinity, durationMs: t.duration };
    }).slice(0, 20),
    autoplayVideos: [...document.querySelectorAll('video[autoplay]')].map(v => ({ src: v.currentSrc.slice(0, 80), controls: v.controls, muted: v.muted })),
    smoothScroll: getComputedStyle(document.documentElement).scrollBehavior === 'smooth',
  }));
  await p.close();
}
const r = out.motion_reduce;
out.issues = [
  ...(out.reflow320.horizontalScroll > 0 ? [{ type: 'reflow-320', sc: '1.4.10', detail: out.reflow320 }] : []),
  ...(out.zoom200.horizontalScroll > 0 || out.zoom200.clippedText.length ? [{ type: 'zoom-200', sc: '1.4.4', detail: out.zoom200 }] : []),
  ...(out.textSpacing.clippedText.length ? [{ type: 'text-spacing', sc: '1.4.12', detail: out.textSpacing.clippedText }] : []),
  ...(out.fixedPxText.length ? [{ type: 'fixed-px-text', sc: '1.4.4 (recommendation)', detail: out.fixedPxText }] : []),
  ...(r.animations.some(a => a.infinite || a.durationMs > 5000) ? [{ type: 'animation-ignores-reduced-motion', sc: '2.2.2/2.3.3', detail: r.animations.filter(a => a.infinite || a.durationMs > 5000) }] : []),
  ...(r.autoplayVideos.some(v => !v.controls) ? [{ type: 'autoplay-video-without-controls', sc: '2.2.2', detail: r.autoplayVideos }] : []),
  ...(r.smoothScroll ? [{ type: 'smooth-scroll-with-reduce', sc: '2.3.3 (AAA, warning)' }] : []),
];
writeFileSync(`${outDir}/reflow-motion.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.issues.map(p => ({ type: p.type, sc: p.sc, n: Array.isArray(p.detail) ? p.detail.length : p.detail?.culprits?.length })), null, 0));
await browser.close();
