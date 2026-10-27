// keyboard.mjs: walks the page with Tab and records focus order, visible focus, obscured focus (2.4.11),
// focus on invisible elements, focus traps, positive tabindex and clickable elements with no keyboard access.
// Usage: node keyboard.mjs <url> <outDir> [maxTabs=60] [width=1280] [height=800]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const [url, outDir = '.', maxTabs = '60', width = '1280', height = '800'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +width, height: +height }, reducedMotion: 'reduce' });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

// Describes the active element (goes through shadow DOM) and measures whether another layer covers it.
const PROBE = `(() => {
  let el = document.activeElement; while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  if (!el || el === document.body) return null;
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  const lbl = el.labels?.[0]?.innerText;
  const name = (el.getAttribute('aria-label') || lbl || el.innerText || el.getAttribute('title') || el.getAttribute('alt') || (el.placeholder ? 'placeholder: ' + el.placeholder : '') || '').trim().replace(/\\s+/g, ' ').slice(0, 60);
  window.__qaIds ||= new WeakMap(); window.__qaN ||= 0;
  if (!window.__qaIds.has(el)) window.__qaIds.set(el, ++window.__qaN);
  const uid = window.__qaIds.get(el);
  const sel = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.type && el.tagName === 'INPUT' ? '[type=' + el.type + ']' : '') + (el.getAttribute('href') ? '[href="' + el.getAttribute('href') + '"]' : '');
  // Sample points inside the visible box; counts those covered by another element (sticky/fixed, modals…)
  const vw = innerWidth, vh = innerHeight, pts = [];
  for (const fx of [0.1, 0.5, 0.9]) for (const fy of [0.15, 0.5, 0.85]) pts.push([r.left + r.width * fx, r.top + r.height * fy]);
  let outside = 0, covered = 0, obscuredBy = null;
  for (const [x, y] of pts) {
    if (x < 0 || y < 0 || x >= vw || y >= vh) { outside++; continue; }
    const top = document.elementFromPoint(x, y);
    if (top && top !== el && !el.contains(top) && !top.contains(el)) { covered++; obscuredBy ||= top.closest('header,nav,footer,[role=dialog],div')?.tagName.toLowerCase() + '.' + String(top.className).split(' ').slice(0, 3).join('.'); }
  }
  let o = el, invisible = r.width < 2 || r.height < 2 || cs.visibility === 'hidden';
  for (; o && o !== document.documentElement; o = o.parentElement) if (+getComputedStyle(o).opacity === 0) invisible = true;
  return { uid, sel, role: el.getAttribute('role') || el.tagName.toLowerCase(), name: name, tabindex: el.getAttribute('tabindex'),
    box: [r.left, r.top, r.width, r.height].map(Math.round), outsideViewport: outside === pts.length, invisible,
    obscured: covered === pts.length - outside && covered > 0 ? 'total' : covered ? 'partial' : 'no', obscuredBy,
    focusVisible: el.matches(':focus-visible'),
    style: { outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 ? cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor : 'none', boxShadow: cs.boxShadow } };
})()`;
const clip = c => ({ x: Math.max(0, c[0] - 6), y: Math.max(0, c[1] - 6), width: Math.max(4, c[2] + 12), height: Math.max(4, c[3] + 12) });

const steps = [], seen = new Map();
for (let i = 0; i < +maxTabs; i++) {
  await page.keyboard.press('Tab');
  await page.waitForTimeout(60);
  const f = await page.evaluate(PROBE);
  if (!f) { steps.push({ step: i + 1, sel: '(body or outside the document)' }); if (i > 0) break; else continue; }
  // Visible focus: screenshot of the same area focused vs unfocused. Identical bytes = no visual change.
  let visualChange = null;
  if (!f.outsideViewport && !f.invisible && f.box[2] > 0) {
    try {
      const c = clip(f.box), a = await page.screenshot({ clip: c });
      await page.evaluate(() => { let el = document.activeElement; while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement; window.__qaFocus = el; el.blur(); });
      const b = await page.screenshot({ clip: c });
      await page.evaluate(() => window.__qaFocus?.focus({ preventScroll: true }));
      visualChange = !a.equals(b);
    } catch { visualChange = null; }
  }
  const n = (seen.get(f.uid) || 0) + 1; seen.set(f.uid, n);
  steps.push({ step: i + 1, ...f, visualChange });
  if (n > 1 && steps.length > 2 && steps[0].uid === f.uid) break;          // full cycle: back to the first one
  if (steps.length >= 4 && steps.slice(-4).every(p => p.uid === f.uid)) break; // stuck
}

// 2.4.11 with minimal scrolling: Chromium centres the element on focus, but Firefox and Safari scroll
// just enough and leave it against the top edge (Shift+Tab) or bottom edge (Tab), where sticky headers
// and cookie banners sit. Simulated by aligning each stop to the top and to the bottom (respects scroll-padding).
const simulated = [];
for (const p of steps.filter(p => p.role && !p.invisible && !p.outsideViewport)) {
  for (const block of ['start', 'end']) {
    const f = await page.evaluate(`(() => { const el = [...document.querySelectorAll('*')].find(e => window.__qaIds?.get(e) === ${p.uid});
      if (!el) return null; el.focus({ preventScroll: true }); el.scrollIntoView({ block: '${block}' }); return ${PROBE}; })()`);
    if (f && f.obscured !== 'no') simulated.push({ direction: block === 'start' ? 'Shift+Tab (top edge)' : 'Tab (bottom edge)', ...f });
  }
}
// Elements with cursor:pointer that are neither interactive nor focusable (onClick on div/span: 2.1.1)
const clickWithoutKeyboard = await page.evaluate(() => {
  const INTER = 'a[href],button,input,select,textarea,summary,label,[tabindex],[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[contenteditable=true]';
  return [...document.querySelectorAll('body *')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width && getComputedStyle(el).cursor === 'pointer' && !el.closest(INTER) && getComputedStyle(el.parentElement).cursor !== 'pointer';
  }).slice(0, 20).map(el => ({ tag: el.tagName.toLowerCase(), class: String(el.className).slice(0, 80), text: el.innerText?.trim().slice(0, 40) }));
});
const positiveTabindex = await page.$$eval('[tabindex]', els => els.filter(e => +e.getAttribute('tabindex') > 0).map(e => e.outerHTML.slice(0, 100)));

const issues = [];
const first = steps.find(p => p.role);
if (!first || !/salt|skip|ir al contenido/i.test(first.name)) issues.push({ type: 'no-skip-link', sc: '2.4.1', detail: `first focus: ${first?.sel || 'none'}` });
for (const p of steps.filter(p => p.role)) {
  if (p.invisible || p.outsideViewport) issues.push({ type: 'focus-on-invisible-element', sc: '2.4.7/2.4.3', step: p.step, sel: p.sel, name: p.name, box: p.box });
  else if (p.obscured === 'total') issues.push({ type: 'focus-obscured', sc: '2.4.11', step: p.step, sel: p.sel, by: p.obscuredBy });
  else if (p.obscured === 'partial') issues.push({ type: 'focus-partially-obscured', sc: '2.4.12 (AAA, warning)', step: p.step, sel: p.sel, by: p.obscuredBy });
  if (p.visualChange === false) issues.push({ type: 'focus-not-visible', sc: '2.4.7', step: p.step, sel: p.sel, name: p.name, style: p.style });
}
for (const p of simulated)
  issues.push({ type: p.obscured === 'total' ? 'focus-obscured-minimal-scroll' : 'focus-partially-obscured-minimal-scroll', sc: p.obscured === 'total' ? '2.4.11' : '2.4.12 (AAA, warning)', direction: p.direction, sel: p.sel, name: p.name, by: p.obscuredBy });
if (steps.length >= 4 && steps.slice(-4).every(p => p.uid === steps.at(-1).uid)) issues.push({ type: 'possible-focus-trap', sc: '2.1.2', sel: steps.at(-1).sel });
for (const c of clickWithoutKeyboard) issues.push({ type: 'clickable-without-keyboard', sc: '2.1.1/4.1.2', ...c });
for (const t of positiveTabindex) issues.push({ type: 'positive-tabindex', sc: '2.4.3', html: t });

writeFileSync(`${outDir}/keyboard.json`, JSON.stringify({ url, viewport: [+width, +height], focusOrder: steps, minimalScrollSimulation: simulated, issues }, null, 1));
console.log(steps.map(p => `${String(p.step).padStart(2)} ${p.sel} "${p.name || ''}"${p.obscured && p.obscured !== 'no' ? ' [obscured ' + p.obscured + ']' : ''}${p.visualChange === false ? ' [NO VISIBLE FOCUS]' : ''}${p.invisible || p.outsideViewport ? ' [INVISIBLE]' : ''}`).join('\n'));
console.log(JSON.stringify(issues.reduce((a, p) => ((a[p.type] = (a[p.type] || 0) + 1), a), {})));
await browser.close();
