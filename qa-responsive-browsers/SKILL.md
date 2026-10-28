---
name: qa-responsive-browsers
description: Audits the responsive behaviour and cross-browser compatibility of a Next.js/Tailwind website with Playwright (Chromium, WebKit and Firefox, widths from 320 to 1920 and emulated devices) and checks the compiled CSS against Baseline and browserslist. Covers horizontal scroll, clipping, overlaps, iOS Safari (100vh, safe area, input zoom, keyboard), landscape, hover on touch, dark mode and long texts. Use it whenever someone asks to review responsive, mobile, tablet, Safari, iPhone, cross-browser or compatibility, even if Playwright isn't mentioned.
---

# Responsive and cross-browser compatibility QA

The question: **does the website look and work well at any width, in current Safari, Chrome and Firefox, and on a real phone?** In websites generated from Figma with AI the failures repeat themselves: fixed widths copied from the frame (`w-[1440px]`), `h-screen` that on iPhone ends up under the browser bar, 14 px inputs that make iOS zoom, content that only appears with `:hover`, a "half-done" dark mode inherited from the Next template and modern CSS that the Safari of two years ago doesn't understand.

Figma usually only has desktop and mobile, so in between there is no reference: **invariants** (what must never happen) are checked across a matrix of widths and browsers, and the screenshots are reviewed. Comparison with the design belongs to `qa-figma-fidelity`; accessibility (reflow at 320 px as a WCAG criterion, touch targets, focus) belongs to `qa-accessibility`.

**By default no code is modified**: the report is delivered and fixes are only made if the user asks. The tools go in `/tmp/qa-responsive-browsers/`, never in the project.

## Step 0. Context

1. `package.json`: Next (15/16), Tailwind (v3/v4), `browserslist` if present, UI and animation libraries.
2. **Target browsers.** Next 16 declares Chrome 111+, Edge 111+, Firefox 111+ and Safari 16.4+. Tailwind v4 requires Chrome 111, Safari 16.4 and **Firefox 128** (it uses `@property`, `color-mix()`, cascade layers): with Tailwind v4 the real Firefox minimum is 128 even though Next says 111. If there is analytics, ask for the real breakdown of browsers and iOS versions.
3. **Breakpoints**: look for `--breakpoint-*` in the `@theme` block (v4) or `theme.screens` (v3). If they have been changed, adjust the matrix.
4. `app/layout.tsx`: `export const viewport` (`viewportFit`, `maximumScale`, `colorScheme`, `themeColor`), the classes on `<html>`/`<body>` and the `@media (prefers-color-scheme: dark)` block in `globals.css` (it comes with the create-next-app template).
5. URL: `next build && next start` or staging. In `next dev` the CSS is not optimised and the overlay alters the screenshots.
6. **ripgrep**: the commands use `rg`. If it isn't installed (`rg --version`), `brew install ripgrep` or replace `rg --files …` with `git ls-files -co --exclude-standard` and `rg -n` with `grep -rnE`.

## Step 1. Tools

```bash
mkdir -p /tmp/qa-responsive-browsers && cd /tmp/qa-responsive-browsers && npm init -y >/dev/null \
  && npm i playwright browserslist web-features postcss >/dev/null \
  && npx playwright install chromium webkit firefox      # on Linux CI: npx playwright install --with-deps
```

Tested with Playwright 1.63, browserslist 4.29.4, web-features 3.44.0 and Node 22. If a browser can't be installed, the script skips it and notes it: say so in the report.

**What each engine is and isn't in Playwright**: WebKit is Safari's engine, but it isn't iOS Safari (it has no dynamic URL bar, no virtual keyboard and no zoom when focusing inputs). The `devices` descriptors (`iPhone 15`, `Pixel 7`) emulate viewport, DPR, user agent and touch, nothing more. Firefox doesn't support `isMobile` (the script removes it). That is why step 7 requires at least one real iPhone and one real Android.

## Step 2. Width matrix

| Width | Why |
|---|---|
| 320 | Small phone and WCAG reflow (1280 at 400 %) |
| 360, 375, 390, 414 | Mid-range Android, iPhone SE/mini, iPhone 15/16, Plus |
| 639 / 640 | `sm` boundary (40rem) |
| 767 / 768 | `md` boundary (48rem), portrait tablet |
| 1023 / 1024 | `lg` boundary (64rem), landscape tablet |
| 1279 / 1280 | `xl` boundary (80rem), laptop |
| 1440 | Typical Figma frame width |
| 1536 | `2xl` boundary (96rem) |
| 1920 (and 2560 if there is a full-bleed hero) | Large desktop: containers without `max-w` stretch |

Tailwind v4's default breakpoints are `sm` 40rem (640), `md` 48rem (768), `lg` 64rem (1024), `xl` 80rem (1280) and `2xl` 96rem (1536), mobile-first (`md:` = from 768 up). Container variants (`@sm` = 24rem) are not the viewport ones. Testing each boundary ±1 px catches the ranges nobody looked at.

Default devices: `iPhone 15`, `iPhone SE (3rd gen)`, `Pixel 7` and `iPad Pro 11`, each also in landscape. Playwright 1.63 ships up to `iPhone 17`, `Pixel 9` and `Galaxy S24`; from 1.64 the descriptors include `screen`, so screen-based media queries see the emulated size.

## Step 3. Screenshots and invariants (matrix.mjs)

`matrix.mjs` runs through several browsers and devices, only reports the outermost element that overflows, and detects unbroken text, overlaps, inputs that will zoom on iOS, near-invisible text in dark mode, `100vh` and content that only appears with `:hover`.

`matrix.mjs`:

```js
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
```

```bash
node /tmp/qa-responsive-browsers/matrix.mjs http://localhost:3000 /,/servicios,/contacto /tmp/qa-responsive-browsers/out/responsive
DARK=1 PSEUDO=1 node /tmp/qa-responsive-browsers/matrix.mjs http://localhost:3000 / /tmp/qa-responsive-browsers/out/responsive-extra
```

About 2 minutes per browser with 5 routes and the full matrix. To iterate quickly: `WIDTHS=375,1280 DEVICES="iPhone 15" BROWSERS=chromium`.

| Invariant | Base severity | Reading |
|---|---|---|
| `horizontal-scroll` | Critical | The whole page scrolls horizontally. Look for the culprit in `outside-viewport` |
| `outside-viewport` | High | Outermost element that overflows. Typical: `w-[1440px]`, `min-w-*`, images without `max-w-full`, `grid-cols-3` without a mobile variant |
| `unbroken-text-overflow` | High | A word, email or URL wider than its box: `break-words` (or `wrap-anywhere`), `min-w-0` on flex children |
| `clipped-text` | High | Text cut off by `overflow-hidden` with a fixed height (`truncate` and `line-clamp` don't count, they are intentional) |
| `text-overlap` | High | Two text blocks overlap: `absolute` copied from Figma, negative margins |
| `interactive-covered` | High | A button or link sits under another layer (header, banner, image) |
| `near-invisible-text` | High | Contrast < 3:1 between text and effective background. In `*_dark` it gives away a half-done dark mode (exact AA contrast is measured by `qa-accessibility`) |
| `input-under-16px-ios-zoom` | Medium | iOS Safari zooms the page when focusing an input with text < 16 px |
| `text-under-12px` | Medium | Readability on mobile |
| `distorted-image` | Medium | Aspect ratio different from the original without `object-cover/contain` |
| `100vh without dvh/svh` | Medium | See step 4 |
| `hover-only content` | High if it hides links or buttons | On touch there is no hover: Tailwind v4 puts `hover:` inside `@media (hover: hover)`, so that content never appears on mobile |

**Look at the screenshots** (`<browser>-<variant>-<route>.png`) with the image-reading tool, at least 320, 768, 1280 and 1920 and the devices: typography that jumps, containers that lose their `max-w` and stretch, pixelated images, a menu that doesn't collapse, a CTA below the fold on mobile. Compare the same width across Chromium, WebKit and Firefox: height differences in buttons or inputs usually come from `appearance` and system fonts.

## Step 4. iOS Safari and mobile

| Topic | What happens | How to check it | Fix |
|---|---|---|---|
| `100vh` (`h-screen`) | On iOS (and Chrome Android) `vh` is the height with the bar hidden: the end of the hero is covered on load | `css-baseline.mjs` (`iosRisks`) and `100vh` in matrix | `h-dvh` if it should follow the bar, `h-svh` so it always fits (doesn't jump when scrolling), `min-h-svh` on heroes. Support: Safari 15.4+ (Baseline widely available) |
| Safe area (notch, home bar) | With `viewport-fit=cover` the content goes under the notch and the bottom bar; without it, the `env()` values are 0 | `viewport` in the layout; landscape screenshot on a real device | `export const viewport = { viewportFit: 'cover' }` and `pb-[env(safe-area-inset-bottom)]` / `px-[max(1rem,env(safe-area-inset-left))]` on fixed bars |
| Zoom when focusing inputs | Text < 16 px → Safari zooms in and doesn't always zoom back | `input-under-16px-ios-zoom` | `text-base` on inputs (at least on mobile). **Don't** use `maximumScale: 1`/`userScalable: false`: it blocks zoom and fails WCAG 1.4.4 |
| `position: fixed` + keyboard | On iOS the keyboard doesn't resize the layout viewport: `fixed bottom-0` bars end up covered or floating; Safari doesn't support the meta viewport's `interactive-widget` | `iosRisks` (fixed + bottom); real test with the keyboard open | Avoid fixed bottom bars on screens with forms, or hide them while an input has focus; `visualViewport` (`resize` event) if it is essential |
| Landscape | Fixed-height menus that don't fit (343 px tall on iPhone 15), huge `h-screen` heroes, notch on one side | `*_landscape` variants | `max-h-dvh overflow-y-auto` on menus; left/right safe area |
| Hover on touch | Dropdown menus and cards that show the CTA on hover | `hover-only content` | Always show it on touch, or open it with a click/`<details>`/a button with `aria-expanded` |
| Native controls | `select`, `date`, `range` and buttons with different system styles in WebKit | WebKit vs Chromium screenshots | `appearance-none` with custom styles and visible focus |

## Step 5. Dark mode and long texts

- **Dark mode**: `DARK=1` repeats 375 and 1280 with `prefers-color-scheme: dark`. The Next template changes the `body`'s `--background`/`--foreground` in dark mode, but components generated from Figma set light backgrounds (`bg-white`): the result is near-white text on white. Either it is properly supported (tokens per mode, see `qa-design-tokens`), or the `@media (prefers-color-scheme: dark)` block is removed and `color-scheme: light` is declared (`export const viewport = { colorScheme: 'light' }`) so that inputs and scrollbars don't change on their own.
- **Long texts**: `PSEUDO=1` lengthens every text by ~40 % with accents (simulating German/French/Catalan and long names) and repeats the invariants at 375. Also test by hand: a long email in the footer, a URL in a paragraph, a 3-line heading, 6-digit prices and a button with double the text. Typical fix: `min-w-0` on flex children, `break-words`, `hyphens-auto` (needs the correct `lang` on `<html>`), `text-balance` on headings, and not fixing the height of buttons or cards.

## Step 6. CSS compatibility (Baseline)

Scan the **compiled** CSS (what reaches the browser, including what Tailwind adds) and cross-check each feature with [web-features](https://web-platform-dx.github.io/web-features/) (the Baseline data) and with the target browsers:

`css-baseline.mjs`:

```js
// css-baseline.mjs: scans the COMPILED CSS (.next/static/**/*.css) and lists the features with limited support
// according to Baseline (web-features package) and the target browsers (browserslist).
// Usage: [IGNORE=cursor,resize,font-family-ui] TARGETS="chrome >= 111, edge >= 111, firefox >= 111, safari >= 16.4, ios_saf >= 16.4" node css-baseline.mjs <a.css> [b.css ...]
//   Without TARGETS it uses the Next 16 minimums (the ones above). Output: JSON with features that are not "widely available",
//   target browsers that don't support them and whether the use is protected by @supports.
import postcss from 'postcss';
import browserslist from 'browserslist';
import { features } from 'web-features';
import { readFileSync } from 'node:fs';

const TARGETS = process.env.TARGETS || 'chrome >= 111, edge >= 111, firefox >= 111, safari >= 16.4, ios_saf >= 16.4';
const BL2WF = { chrome: 'chrome', edge: 'edge', firefox: 'firefox', safari: 'safari', ios_saf: 'safari_ios', and_chr: 'chrome_android', and_ff: 'firefox_android' };
const minVer = {};                                       // web-features browser → minimum target version
for (const t of browserslist(TARGETS)) { const [b, v] = t.split(' '); const k = BL2WF[b]; if (!k) continue; const n = parseFloat(v.split('-')[0]); if (!(k in minVer) || n < minVer[k]) minVer[k] = n; }

const idx = {};                                          // BCD key → feature id
for (const [id, f] of Object.entries(features)) for (const k of f.compat_features || []) idx[k] = id;
const UNITS = { dvh: 'dynamic', dvw: 'dynamic', dvi: 'dynamic', dvb: 'dynamic', dvmin: 'dynamic', dvmax: 'dynamic', svh: 'small', svw: 'small', svmin: 'small', svmax: 'small', lvh: 'large', lvw: 'large' };
const keysFor = { at: n => [`css.at-rules.${n}`], prop: n => [`css.properties.${n}`], val: (p, v) => [`css.properties.${p}.${v}`],
  fn: n => [`css.types.color.${n}`, `css.types.${n}`, `css.types.image.gradient.${n}`, `css.types.transform-function.${n}`, `css.types.basic-shape.${n}`],
  sel: n => [`css.selectors.${n}`], unit: u => UNITS[u] ? [`css.types.length.viewport_percentage_units_${UNITS[u]}`] : [`css.types.length.${u}`],
  media: n => [`css.at-rules.media.${n}`] };

const uses = new Map();                                  // featureId → { count, unguarded, examples }
const hit = (keys, example, guarded) => {
  for (const k of keys) { const id = idx[k]; if (!id) continue;
    const u = uses.get(id) || { count: 0, unguarded: 0, examples: new Set(), bcd: new Set() };
    u.count++; if (!guarded) u.unguarded++; if (u.examples.size < 3) u.examples.add(example.slice(0, 90)); u.bcd.add(k); uses.set(id, u); return; }
};
const iosRisks = [];
for (const file of process.argv.slice(2)) {
  let root; try { root = postcss.parse(readFileSync(file, 'utf8'), { from: file }); } catch (e) { console.error(`${file}: ${e.message}`); continue; }
  root.walk(node => {
    let guarded = false; for (let p = node.parent; p; p = p.parent) if (p.type === 'atrule' && p.name === 'supports') guarded = true;
    if (node.type === 'atrule') {
      hit(keysFor.at(node.name), `@${node.name} ${node.params}`, guarded);
      if (node.name === 'media') {
        if (/[<>]=?/.test(node.params)) hit(keysFor.media('range_syntax'), `@media ${node.params}`, guarded);
        for (const m of node.params.matchAll(/\(\s*([a-z-]+)\s*[:)<>=]/g)) hit(keysFor.media(m[1]), `@media ${node.params}`, guarded);
      }
    } else if (node.type === 'rule') {
      for (const m of node.selector.matchAll(/::?([a-z-]+)(?=[^a-z-]|$)/g)) hit(keysFor.sel(m[1]), node.selector, guarded);
      if (/(^|[^\w-])&/.test(node.selector)) hit(['css.selectors.nesting'], node.selector, guarded);
    } else if (node.type === 'decl') {
      const prop = node.prop.toLowerCase(), val = node.value;
      if (!prop.startsWith('--')) hit(keysFor.prop(prop), `${prop}: ${val}`, guarded);
      for (const w of val.match(/(?<![\w-])[a-z][a-z-]+(?![\w(-])/g) || []) hit(keysFor.val(prop, w), `${prop}: ${val}`, guarded);
      for (const m of val.matchAll(/([a-z-]+)\(/g)) hit(keysFor.fn(m[1]), `${prop}: ${val}`, guarded);
      for (const m of val.matchAll(/\d(dv[hwib]|dvmin|dvmax|sv[hw]|svmin|svmax|lv[hw]|cq[whib]|cqmin|cqmax|lh|rlh|cap|rcap|ic)\b/g)) hit(keysFor.unit(m[1]), `${prop}: ${val}`, guarded);
      for (const m of val.matchAll(/env\(\s*([a-z-]+)/g)) hit([`css.types.env.${m[1]}`, 'css.types.env'], `${prop}: ${val}`, guarded);
      // Specific Safari iOS risks
      if (/(^|-)height$/.test(prop) && /\b100vh\b/.test(val)) iosRisks.push({ risk: '100vh (the Safari iOS bar covers the end; use 100dvh/100svh)', rule: node.parent.selector, decl: `${prop}: ${val}` });
      if (prop === 'position' && val === 'fixed' && node.parent.nodes?.some(d => d.prop === 'bottom')) iosRisks.push({ risk: 'position: fixed + bottom (the virtual keyboard shifts or covers it on iOS)', rule: node.parent.selector });
    }
  });
}
// Known noise: cursor/resize don't apply on touch; ui-monospace sits inside a stack with fallbacks.
const IGNORE = new Set((process.env.IGNORE ?? 'cursor,resize,font-family-ui').split(',').filter(Boolean));
const out = [];
for (const [id, u] of uses) {
  if (IGNORE.has(id)) continue;
  const f = features[id], st = f.status || {};
  if (st.baseline === 'high') continue;                  // widely available: no risk
  const missing = Object.entries(minVer).filter(([b, v]) => !st.support?.[b] || parseFloat(st.support[b]) > v).map(([b, v]) => `${b} ${v}${st.support?.[b] ? ` (since ${st.support[b]})` : ' (no support)'}`);
  out.push({ feature: id, name: f.name, baseline: st.baseline === 'low' ? `newly available (${st.baseline_low_date})` : 'limited', count: u.count,
    withoutSupports: u.unguarded, unsupportedTargets: missing, examples: [...u.examples], bcd: [...u.bcd].slice(0, 3) });
}
const rank = x => (x.unsupportedTargets.length ? 0 : 2) + (x.withoutSupports ? 0 : 1);
out.sort((a, b) => rank(a) - rank(b) || b.count - a.count);
console.log(JSON.stringify({ targets: TARGETS, minimums: minVer, featuresUsed: uses.size, noWidelyAvailable: out, iosRisks }, null, 1));
```

```bash
next build   # if there is no recent build
TARGETS="chrome >= 111, edge >= 111, firefox >= 128, safari >= 16.4, ios_saf >= 16.4" \
  node /tmp/qa-responsive-browsers/css-baseline.mjs $(find .next/static -name '*.css') > /tmp/qa-responsive-browsers/out/baseline.json
# with the project's browserslist: TARGETS="$(npx browserslist | paste -sd, -)" … or a Baseline query:
TARGETS="baseline widely available" node /tmp/qa-responsive-browsers/css-baseline.mjs $(find .next/static -name '*.css')
```

- **Baseline**: *widely available* = in all major browsers for 30 months or more; *newly available* = for less than that; *limited* = some browser is missing. Recent browserslist (tested with 4.29.4) understands `baseline widely available`, `baseline 2025`, `baseline newly available` and `… with downstream` (Chromium-based browsers).
- **How to read `noWidelyAvailable`**: what matters is `unsupportedTargets` and `withoutSupports`. A feature with no support in a target and **without** `@supports` around it is a finding; with `@supports` it is a progressive enhancement (Low).
- Real examples: `field-sizing` (newly available Jun 2026; Safari 26.2+), `interpolate-size` (limited: Chromium only), anchor positioning (limited), view transitions (newly), `registered-custom-properties` (Tailwind v4's `@property`: Firefox 128+; Tailwind includes a fallback in `@layer properties`).
- Severity: High if it breaks layout or content in a target (invisible text, layout that depends on anchor positioning); Medium if it degrades (animation, `text-wrap: balance`); Low if it is inside `@supports` or decorative.
- For the source code, in CI and with permission: the `css/use-baseline` rule from `@eslint/css`, `stylelint-plugin-use-baseline` (CSS) and `eslint-plugin-baseline-js` (JS). A caniuse-based alternative: `doiuse` (its CLI fails on multi-line minified CSS; use it as a PostCSS plugin).

## Step 7. Real browsers and devices

- Minimum: one iPhone with current iOS and one from two versions back, and a mid-range Android with Chrome. Desktop: current Safari macOS, Chrome, Firefox and Edge.
- Free: iPhone over cable + Safari > Develop (Web Inspector), the iOS Simulator in Xcode (macOS only), Chrome `chrome://inspect` for Android, the Android Studio emulator.
- Check by hand what emulation doesn't see: the URL bar appearing and disappearing, the keyboard open on forms, zoom on inputs, safe area in landscape, momentum scrolling in menus, autoplay videos (`playsInline muted`), scrolling performance.
- Paid services (optional, never mandatory): BrowserStack, LambdaTest/TestMu AI or Sauce Labs provide real devices and old Safari versions; Playwright can connect to them to reuse `matrix.mjs`.

## Severity

| Level | Examples in this phase |
|---|---|
| **Critical** | Horizontal scroll on mobile, CTA or menu unreachable in some target browser, layout broken in iOS Safari, a form that can't be submitted with the iOS keyboard open |
| **High** | Elements outside the viewport or covered, clipped or overlapping text, content or links only reachable with hover, dark mode leaving text invisible, a feature with no support and no `@supports` that breaks something in a target |
| **Medium** | `100vh` on heroes, inputs < 16 px, text < 12 px, distorted images, failures only at intermediate widths (639, 1023…), improvable landscape |
| **Low** | Cosmetic differences between engines, progressive features inside `@supports`, very wide containers at 1920+ |

## Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

`qa-responsive.md` (plus `_matrix.json`, `baseline.json` and the screenshots).

```markdown
# Responsive and browsers — <project> — <date> — commit <hash>
Verdict: NOT APPROVED (Critical 1 · High 3 · Medium 4 · Low 2)
Tested: chromium 156 (17 widths + 4 devices ×2 orientations) · webkit 27.2 · firefox 157 · Real: iPhone 15 iOS 26 (yes) / Android (pending)
Targets: chrome/edge ≥ 111, firefox ≥ 128, safari/iOS ≥ 16.4

| # | Sev. | Where | Browsers / widths | Evidence | Why it matters | Fix |
|---|---|---|---|---|---|---|
| R-001 | Critical | components/Header.tsx:4 | all, 320–1439 | `div.header.w-[1440px]` overflows by 1120 px at 320 (screenshot chromium-w320-servicios.png) | The whole page scrolls horizontally on mobile | `w-full max-w-7xl mx-auto` |
| R-002 | Medium | app/page.tsx:12 | iOS | `.h-screen` → `height: 100vh` | The end of the hero sits under the Safari bar | `min-h-svh` |

## Compatibility (Baseline)
## Screenshots reviewed
## Not tested and why
```

Group by cause (one `w-[1440px]` that breaks 26 variants is one finding). To get the `file:line`, search with `rg` for the class given by the selector.

## False positives and limitations

- Carousels and tables with their own scroll (`overflow-x-auto`) don't count; if a carousel uses `overflow-hidden` with children outside on purpose, mark it with `data-qa-2d` or discard it by hand.
- Anything inside `position: fixed` (closed off-canvas menus) is ignored for overflow: focus in those menus is reviewed by `qa-accessibility`.
- `near-invisible-text` ignores image or gradient backgrounds, and computes contrast against the first opaque background: check it in the screenshot.
- `css-baseline.mjs` ignores `cursor`, `resize` (they don't apply on touch) and `ui-monospace` (it sits in a stack with fallbacks) by default: change that with `IGNORE=`. It detects what maps to BCD keys; unusual CSS tricks can slip through.
- Emulation ≠ device: without step 7, the report must say "real iOS not tested".

## If the user asks for fixes

Order: (1) structural overflows (fixed widths → `w-full max-w-*`, `absolute` → flex/grid), (2) hover-only content and menus, (3) iOS (`svh/dvh`, `text-base` on inputs, safe area), (4) dark mode (support it or explicitly disable it), (5) unsupported features (wrap in `@supports` or replace). Re-run `matrix.mjs` at the affected widths after each batch and a full pass at the end, in all three engines.

## Sources

- Tailwind v4, responsive and compatibility: https://tailwindcss.com/docs/responsive-design · https://tailwindcss.com/docs/compatibility
- Next 16, supported browsers and `generateViewport`: `node_modules/next/dist/docs/01-app/01-getting-started/01-installation.md`, `…/04-functions/generate-viewport.md`
- Baseline with browserslist: https://web.dev/articles/use-baseline-with-browserslist · web-features: https://www.npmjs.com/package/web-features
- Playwright, release notes and devices: https://playwright.dev/python/docs/release-notes
- iOS input zoom: https://weblog.west-wind.com/posts/2023/Apr/17/Preventing-iOS-Textbox-Auto-Zooming-and-ViewPort-Sizing · `interactive-widget` in WebKit: https://github.com/WebKit/standards-positions/issues/65
