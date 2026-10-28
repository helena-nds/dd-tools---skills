---
name: qa-accessibility
description: Audits the real accessibility of a Next.js/React website against WCAG 2.2 AA with axe-core, eslint-plugin-jsx-a11y and Playwright (keyboard, visible and obscured focus, touch targets, landmarks and headings, zoom and reflow, reduced motion) plus a VoiceOver and NVDA testing guide. Use it whenever someone asks to review accessibility, a11y, WCAG, screen readers, keyboard navigation, focus, the EAA or Ley 11/2023 on a website, especially if it was generated from Figma with AI, even if WCAG isn't mentioned.
---

# Accessibility audit (WCAG 2.2 AA)

The question it answers: **can someone who browses with a keyboard, a screen reader, zoom or poor colour vision use this website?** Websites generated from Figma with AI fail in very predictable ways: `div` with `onClick` instead of buttons, icons with no name, `outline-none` copied from the design (Figma does not draw focus), the template's `lang="en"`, repeated titles, off-canvas menus that still receive focus, sticky headers that cover focus and fixed widths that break reflow.

Automation only covers part of it: Deque estimates that axe-core finds ~57 % of *issues* in its sample, but it can only check ~16 of the 50 WCAG 2.1 A/AA criteria (≈30–40 % of the criteria); in the GDS experiment, all tools combined detected 71 % of 143 barriers. That is why this skill combines scripts with a guided manual review, and the report must always state what was checked by hand.

**By default no code is modified**: deliver the report and fix only if the user asks. Do not install anything in the project: the tools go in `/tmp/qa-accessibility/`.

Boundaries with other skills: `qa-design-tokens` reviews the contrast of token pairs; `qa-figma-fidelity` compares against the design; `qa-responsive-browsers` covers layout per browser. This skill measures the accessibility of the rendered website.

## Step 0. Context

1. `package.json`: Next version (15 or 16; in 16 with `cacheComponents: true` visited routes stay in the DOM hidden with `display: none` inside `<Activity>`, so use visibility-aware selectors), React, Tailwind (v3/v4) and UI libraries (Radix, React Aria, Headless UI already handle focus and ARIA; a hand-made component does not).
2. App Router or Pages Router; `app/layout.tsx` (`lang`, skip link, `metadata`, `viewport`).
3. URL to audit: preferably `next build && next start` or staging. In `next dev` the overlay (`nextjs-portal`) pollutes axe; the scripts exclude it.
4. Key routes: home, one of each template, forms, login/checkout if any (3.3.7/3.3.8), and the 404.
5. Regulations: WCAG 2.2 AA is the current standard (EN 301 549, referenced by the EAA, is being aligned with 2.2). WCAG 3 is still a working draft (W3C published another one in September 2026) and "will not be a standard for a few years": mention it only as context. In Spain the EAA applies through Ley 11/2023 (Spain's EAA transposition law) since 28-06-2025 (e-commerce, banking, transport…): for the legal scope, refer to the `qa-legal-spain` skill.
6. **ripgrep**: the `rg` commands need ripgrep on the PATH (`command -v rg`); macOS does not ship it and Claude Code's bundled one is usually not reachable. If it is missing, install it only with permission (`brew install ripgrep`) or, in a git repo, use `git ls-files -co --exclude-standard` as the file list (e.g. `git ls-files -co --exclude-standard -- '*.tsx' | xargs grep -n "pattern"`).

## Step 1. Tools

```bash
mkdir -p /tmp/qa-accessibility && cd /tmp/qa-accessibility && npm init -y >/dev/null \
  && npm i playwright @axe-core/playwright >/dev/null && npx playwright install chromium
```

Tested with Playwright 1.63/1.64, `@axe-core/playwright` 4.14.0 (axe-core 4.14) and Node 22. Write the scripts from this document there and run them with the website running.

Optional alternatives (they do not replace the scripts): **Pa11y 10** (`npx pa11y --runner axe --runner htmlcs <url>`; HTML_CodeSniffer is a second engine that finds different things; it downloads its own Chrome and needs Node ≥ 22.13) and **pa11y-ci 5** to crawl a sitemap in CI; **Lighthouse** (uses a subset of axe: a 100 is not enough); the **axe DevTools** and **WAVE** extensions for the manual review.

## Step 2. Static linter (jsx-a11y)

`eslint-config-next` already ships `eslint-plugin-jsx-a11y`, but only enables 6 rules (alt-text and ARIA). Run the `strict` rules with a temporary config, without touching the project's:

`eslint.a11y.mjs`:

```js
// eslint.a11y.mjs: temporary config (does not touch the project's own) with the jsx-a11y "strict" rules.
// Resolves packages from the project (cwd), so this file can live in /tmp.
// eslint-config-next already registers the "jsx-a11y" plugin: here only its rules are added. Registering it again
// (e.g. with jsxA11y.flatConfigs.recommended) gives "Cannot redefine plugin jsx-a11y".
// Usage (from the project root, with the folders that exist): npx eslint -c /tmp/qa-accessibility/eslint.a11y.mjs app components -f json > /tmp/qa-accessibility/eslint.json
import { createRequire } from "node:module";
const require = createRequire(`${process.cwd()}/package.json`);
const nextVitals = require("eslint-config-next/core-web-vitals");
const jsxA11y = require("eslint-plugin-jsx-a11y");

export default [
  ...(Array.isArray(nextVitals) ? nextVitals : nextVitals.default),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: { ...jsxA11y.flatConfigs.strict.rules },
    // next/link and next/image count as <a> and <img> for the rules
    settings: { "jsx-a11y": { components: { Link: "a", Image: "img" } } },
  },
];
```

```bash
npx eslint -c /tmp/qa-accessibility/eslint.a11y.mjs app components -f json > /tmp/qa-accessibility/eslint.json
```

- `eslint-plugin-jsx-a11y` 6.10.2 (Oct. 2024) declares compatibility up to ESLint 9. With ESLint 10, the alternative is the fork `eslint-plugin-jsx-a11y-x` (0.2.0, flat config, ESLint 9/10); do not install it without permission.
- Rules that catch the most in AI code: `alt-text`, `click-events-have-key-events` + `no-static-element-interactions` (`div onClick`), `iframe-has-title`, `anchor-is-valid`, `label-has-associated-control`, `no-autofocus`, `interactive-supports-focus`.
- The linter does not see the final DOM: an `<Image alt={title}>` with an empty `title` passes. That is why the scripts come next.

## Step 3. axe per page

`axe.mjs`:

```js
// axe.mjs: axe-core per route with the WCAG 2.0/2.1/2.2 A and AA tags (+ best-practice separately).
// Usage: node axe.mjs <baseUrl> <route1,route2,...> <outDir> [width=1280]
//   → <outDir>/axe.jsonl (one line per failed rule and route) and a console summary
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const [base, routes = '/', outDir = '.', width = '1280'] = process.argv.slice(2);
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: +width, height: 900 }, locale: 'es-ES', reducedMotion: 'reduce' });
const lines = [], summary = [];
for (const route of routes.split(',')) {
  const page = await ctx.newPage();
  const url = new URL(route, base).href;
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    // Two passes: WCAG (normative) and best-practice (recommendation). The Next dev overlay is excluded.
    for (const [group, tags] of [['wcag', WCAG], ['best-practice', ['best-practice']]]) {
      const r = await new AxeBuilder({ page }).withTags(tags).exclude('nextjs-portal').analyze();
      for (const v of r.violations) lines.push({
        route, status: resp?.status(), group, rule: v.id, impact: v.impact,
        wcag: v.tags.filter(t => /^wcag\d{3,4}$/.test(t)).map(t => t.replace(/^wcag(\d)(\d)(\d+)$/, '$1.$2.$3')),
        help: v.help, url: v.helpUrl, nodes: v.nodes.length,
        examples: v.nodes.slice(0, 5).map(n => ({ selector: n.target.join(' '), html: n.html.slice(0, 160), summary: n.failureSummary?.split('\n').slice(0, 3).join(' | ') })) });
      if (group === 'wcag') summary.push({ route, violations: r.violations.length, nodes: r.violations.reduce((a, v) => a + v.nodes.length, 0),
        reviewManually: r.incomplete.map(i => `${i.id}(${i.nodes.length})`), rulesPassed: r.passes.length });
    }
  } catch (e) { summary.push({ route, error: e.message.split('\n')[0] }); }
  await page.close();
}
writeFileSync(`${outDir}/axe.jsonl`, lines.map(l => JSON.stringify(l)).join('\n') + '\n');
console.log(JSON.stringify({ width: +width, summary, byRule: Object.entries(lines.reduce((a, l) => ((a[`${l.group}:${l.rule}`] = (a[`${l.group}:${l.rule}`] || 0) + l.nodes), a), {})) }, null, 1));
await browser.close();
```

```bash
node /tmp/qa-accessibility/axe.mjs http://localhost:3000 /,/servicios,/contacto /tmp/qa-accessibility/out 1280
node /tmp/qa-accessibility/axe.mjs http://localhost:3000 /,/servicios,/contacto /tmp/qa-accessibility/out-mobile 390
```

- The tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` also enable `target-size` (2.5.8), which axe ships **disabled** by default. `best-practice` (heading order, `region`, `landmark-*`) runs in a separate pass and counts as a recommendation.
- `reviewManually` lists the `incomplete` results (e.g. contrast over an image or gradient): they are not passes, they must be looked at.
- axe does not know whether `lang="en"` is the real language, whether two `h1` make sense, or whether a `placeholder` acts as a label: step 5 covers that.

## Step 4. Keyboard: order, visible focus and obscured focus

`keyboard.mjs`:

```js
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
```

```bash
node /tmp/qa-accessibility/keyboard.mjs http://localhost:3000/ /tmp/qa-accessibility/out/keyboard-home 80
node /tmp/qa-accessibility/keyboard.mjs http://localhost:3000/ /tmp/qa-accessibility/out/keyboard-home-mobile 80 390 844
```

How to read `keyboard.json`:

- **`focusOrder`**: compare it with the visual order in the screenshot. An order that jumps (footer before main, crossed columns) fails 2.4.3.
- **`focus-not-visible` (2.4.7)**: the script compares a screenshot of the focused area with the same area unfocused; if the pixels do not change, there is no indicator. It detects `outline-none` without `focus-visible:ring-*` even when the style is a background change. In an iframe it is normal to see it: check by hand.
- **`focus-on-invisible-element`**: links in an off-canvas menu, `opacity-0` or off-screen elements that receive focus. The keyboard user "loses" focus (2.4.3/2.4.7). Fix: `inert` or `hidden` while the menu is closed.
- **`focus-obscured-minimal-scroll` (2.4.11)**: Chromium centres the element when tabbing, but Firefox and Safari scroll the minimum and leave it under the sticky header or the cookie banner. The script simulates this. Fix: `html { scroll-padding-top: <header height> }` (or `scroll-pt-24` in Tailwind), and the same at the bottom if there is a fixed bar.
- **`clickable-without-keyboard` (2.1.1)**: elements with `cursor: pointer` that are not focusable (the typical `div onClick`). Heuristic: confirm it in the code.
- **`no-skip-link` (2.4.1)**: there is no "Saltar al contenido" (skip to content) link as the first focus. With correct landmarks the criterion can still be met, but on sites with a long menu it is High.
- Focus traps (2.1.2): the script warns if focus gets stuck. Open every modal and menu by hand: Esc closes it, focus stays inside while it is open and returns to the button that opened it.

## Step 5. Structure: accessibility tree, titles and Next navigation

`structure.mjs`:

```js
// structure.mjs: accessibility tree (ariaSnapshot) per route → landmarks, headings, accessible names,
// language, unique titles (used by the Next route announcer) and client navigation with next/link (focus and announcement).
// Usage: node structure.mjs <baseUrl> <route1,route2,...> <outDir> [expectedLang=es]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const [base, routes = '/', outDir = '.', lang = 'es'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'es-ES' });
const report = [], titles = {};
const ES = /\b(el|la|los|las|de|del|que|y|en|para|con|por|una?|nuestr[oa]s?)\b/gi, EN = /\b(the|and|of|to|for|with|your|our|is|are)\b/gi;

for (const route of routes.split(',')) {
  const r = { route, issues: [] }, P = (type, sc, detail) => r.issues.push({ type, sc, detail });
  try {
    const resp = await page.goto(new URL(route, base).href, { waitUntil: 'networkidle' });
    r.status = resp?.status();
    const snap = await page.locator('body').ariaSnapshot();
    writeFileSync(`${outDir}/aria${route === '/' ? '_home' : route.replaceAll('/', '_')}.yml`, snap);
    const L = snap.split('\n');
    const heads = L.map(l => l.match(/- heading "(.*)" \[level=(\d)\]/)).filter(Boolean).map(m => ({ text: m[1], level: +m[2] }));
    const lm = role => L.filter(l => new RegExp(`^\\s*- ${role}\\b`).test(l)).length;
    r.landmarks = { banner: lm('banner'), navigation: lm('navigation'), main: lm('main'), contentinfo: lm('contentinfo'), region: lm('region'), search: lm('search') };
    r.headings = heads.map(h => `${'  '.repeat(h.level - 1)}h${h.level} ${h.text}`);
    if (r.landmarks.main !== 1) P('main-not-unique', '1.3.1', `main: ${r.landmarks.main}`);
    if (!r.landmarks.banner) P('no-banner', '1.3.1 (best practice)', 'no top-level <header>');
    if (!r.landmarks.navigation) P('no-nav', '1.3.1 (best practice)', 'no <nav>');
    if (!r.landmarks.contentinfo) P('no-contentinfo', '1.3.1 (best practice)', 'no top-level <footer>');
    const h1 = heads.filter(h => h.level === 1).length;
    if (h1 !== 1) P('h1-not-unique', '1.3.1/2.4.6', `${h1} h1: ${heads.filter(h => h.level === 1).map(h => h.text).join(' | ')}`);
    heads.forEach((h, i) => { if (i && h.level > heads[i - 1].level + 1) P('heading-level-skip', '1.3.1', `h${heads[i - 1].level} → h${h.level} "${h.text}"`); });
    // Empty accessible names that axe does not always flag (e.g. role=img with no name inside a link)
    for (const l of L) if (/^\s*- (link|button|img|textbox|checkbox|combobox)(:|$| \[)/.test(l)) P('no-accessible-name', '4.1.2/1.1.1', l.trim());
    const dom = await page.evaluate(() => ({
      lang: document.documentElement.lang, title: document.title,
      text: document.body.innerText.slice(0, 4000),
      placeholderOnly: [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]),textarea,select')]
        .filter(e => e.placeholder && !e.labels?.length && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.title)
        .map(e => `${e.tagName.toLowerCase()}[name=${e.name}] placeholder="${e.placeholder}"`),
      imgWithoutAlt: [...document.images].filter(i => !i.hasAttribute('alt')).map(i => i.getAttribute('src')?.slice(0, 80)),
      viewport: document.querySelector('meta[name=viewport]')?.content || null,
      announcer: !!document.querySelector('next-route-announcer'),
    }));
    r.lang = dom.lang; r.title = dom.title; r.nextAnnouncer = dom.announcer;
    (titles[dom.title] ||= []).push(route);
    const es = (dom.text.match(ES) || []).length, en = (dom.text.match(EN) || []).length;
    if (!dom.lang) P('no-lang', '3.1.1', '<html> without lang');
    else if (!dom.lang.toLowerCase().startsWith(lang)) P('wrong-lang', '3.1.1', `lang="${dom.lang}" but "${lang}" was expected (es/en words in the text: ${es}/${en})`);
    if (/create next app|untitled|^$/i.test(dom.title)) P('default-title', '2.4.2', `"${dom.title}"`);
    for (const c of dom.placeholderOnly) P('placeholder-as-label', '3.3.2/1.3.1', c);
    for (const s of dom.imgWithoutAlt) P('img-without-alt', '1.1.1', s);
    if (/maximum-scale=(0?\.\d|1(\.0)?)\b|user-scalable=(no|0)/.test(dom.viewport || '')) P('zoom-blocked', '1.4.4', dom.viewport);
  } catch (e) { r.error = e.message.split('\n')[0]; }
  report.push(r);
}
const duplicates = Object.entries(titles).filter(([, v]) => v.length > 1);
for (const [t, rs] of duplicates) report.find(r => r.route === rs[0]).issues.push({ type: 'duplicate-title', sc: '2.4.2', detail: `"${t}" on ${rs.join(', ')}: the Next route announcer does not announce the page change` });

// Client navigation (next/link): where does focus end up and what is announced? window is marked to tell it apart from a full reload.
const nav = [];
const firstRoute = routes.split(',')[0];
await page.goto(new URL(firstRoute, base).href, { waitUntil: 'networkidle' });
// next/link renders a normal <a>: internal links are tried one by one (max. 6) to see which navigate without reloading.
const SEL = 'a[href^="/"]:not([href^="//"])';
const total = Math.min(6, await page.locator(SEL).count());
for (let i = 0; i < total; i++) {
  await page.goto(new URL(firstRoute, base).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => { window.__qaMark = 1; });
  const a = page.locator(SEL).nth(i), href = await a.getAttribute('href');
  if (href === firstRoute) continue;
  await a.focus(); await page.keyboard.press('Enter');
  await page.waitForURL(u => u.pathname !== new URL(firstRoute, base).pathname, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  nav.push(await page.evaluate(href => {
    const el = document.activeElement, r = el?.getBoundingClientRect();
    const ann = document.querySelector('next-route-announcer')?.shadowRoot?.textContent || '';
    return { href, url: location.pathname, client: window.__qaMark === 1, focusOn: el === document.body ? 'body' : el?.tagName.toLowerCase() + (el?.getAttribute('href') ? `[href="${el.getAttribute('href')}"]` : ''),
      focusVisible: !!r && r.width > 0 && r.height > 0, announced: ann, title: document.title };
  }, href));
}
for (const n of nav.filter(n => n.client)) {
  const r = report.find(x => x.route === firstRoute);
  if (!n.announced) r.issues.push({ type: 'client-navigation-not-announced', sc: '4.1.3', detail: `${n.href}: the announcer said nothing (same title?)` });
  if (!n.focusVisible || n.focusOn === 'body') r.issues.push({ type: 'focus-lost-after-navigation', sc: '2.4.3', detail: `${n.href}: focus on ${n.focusOn} (visible: ${n.focusVisible})` });
}
writeFileSync(`${outDir}/structure.json`, JSON.stringify({ routes: report, clientNavigation: nav }, null, 1));
for (const r of report) console.log(`${r.route} [${r.status}] lang=${r.lang} title="${r.title}" landmarks=${JSON.stringify(r.landmarks)}\n  ${(r.headings || []).join('\n  ')}\n  issues: ${r.issues.map(p => p.type).join(', ') || 'none'}`);
console.log('navigation:', JSON.stringify(nav));
await browser.close();
```

```bash
node /tmp/qa-accessibility/structure.mjs http://localhost:3000 /,/servicios,/contacto /tmp/qa-accessibility/out/structure es
```

It saves one `aria_<route>.yml` per page (the tree a screen reader would hear, via `locator.ariaSnapshot()`) and checks:

- A single `main`; top-level `banner`, `navigation` and `contentinfo`; one `h1` and no skipped levels (1.3.1, 2.4.6).
- `lang` on `<html>` matches the language of the content (3.1.1). The create-next-app template ships `lang="en"`.
- Its own, distinct `title` on every route (2.4.2). **In Next it matters twice**: the *route announcer* (`<next-route-announcer>`, an `aria-live` region) announces client navigation by reading `document.title` (otherwise the `h1`, otherwise the URL) and **only if the title changes**. With repeated titles, navigation with `next/link` is silent for a screen reader.
- `placeholder-as-label`: the placeholder disappears when typing and does not replace a `<label>` (3.3.2).
- `zoom-blocked`: the `generateViewport` docs show `maximumScale: 1, userScalable: false` as an example and agents copy it. It fails 1.4.4.
- **Client navigation**: the script presses Enter on each internal link and tells `next/link` (no reload) apart from a plain `<a>`. In the App Router, Next scrolls the view but **does not move focus**: after navigating it usually stays on `body` and the next Tab starts from the top or from an unexpected point. It is Medium; if there is a long menu, recommend a skip link and/or moving focus to the `h1` in a client component.
- `next/image` requires `alt` (empty `alt=""` if decorative). An `alt` with the file name or "image" is a failure even if axe passes it.

## Step 6. Touch targets (2.5.8)

`targets.mjs`:

```js
// targets.mjs: touch target size (WCAG 2.5.8 AA: 24×24 px or spacing exception; 44×44 recommended).
// Usage: node targets.mjs <url> <outDir> [width=390]   (emulates a touch phone at that width)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const [url, outDir = '.', width = '390'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +width, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });
const res = await page.evaluate(() => {
  const SEL = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=checkbox],[role=radio],[role=switch],[role=tab],[role=menuitem],[tabindex]:not([tabindex="-1"])';
  const els = [...document.querySelectorAll(SEL)].filter(e => {
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && r.right > 0 && r.left < innerWidth;   // off-screen is handled by keyboard.mjs
  }).filter(e => !e.parentElement.closest(SEL));                                                               // only the outer target
  const box = e => e.getBoundingClientRect();
  const name = e => (e.getAttribute('aria-label') || e.innerText || e.value || e.getAttribute('href') || '').trim().slice(0, 40);
  const sel = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.getAttribute('href') ? `[href="${e.getAttribute('href')}"]` : '') + (e.type && e.tagName === 'INPUT' ? `[type=${e.type}]` : '');
  // "Inline" exception: link inside a sentence (has sibling text nodes with content)
  const inline = e => e.tagName === 'A' && getComputedStyle(e).display === 'inline' && [...e.parentElement.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 3);
  const out = [];
  for (const e of els) {
    const r = box(e), w = Math.round(r.width * 10) / 10, h = Math.round(r.height * 10) / 10;
    if (w >= 44 && h >= 44) continue;
    let verdict = w >= 24 && h >= 24 ? 'ok-AA (<44 recommended)' : 'small';
    if (verdict === 'small') {
      if (inline(e)) verdict = 'inline exception';
      else if (['checkbox', 'radio'].includes(e.type) && !getComputedStyle(e).appearance.includes('none')) verdict = 'small (native control: user-agent exception only if not restyled)';
      else {
        // Spacing exception: a 24 px circle centred on each small target must not intersect another target or another circle
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const clashes = els.some(o => {
          if (o === e) return false;
          const q = box(o), ox = Math.max(q.left, Math.min(cx, q.right)), oy = Math.max(q.top, Math.min(cy, q.bottom));
          if (Math.hypot(cx - ox, cy - oy) < 12) return true;                                     // the circle intersects the other target
          const small = q.width < 24 || q.height < 24;
          return small && Math.hypot(cx - (q.left + q.width / 2), cy - (q.top + q.height / 2)) < 24;  // intersects the circle of another small target
        });
        verdict = clashes ? 'FAILS 2.5.8' : 'spacing exception';
      }
    }
    out.push({ sel: sel(e), name: name(e), w, h, verdict });
  }
  return out;
});
writeFileSync(`${outDir}/targets.json`, JSON.stringify({ url, width: +width, targets: res }, null, 1));
for (const o of res) console.log(`${o.verdict.padEnd(24)} ${o.w}×${o.h} ${o.sel} "${o.name}"`);
await browser.close();
```

```bash
node /tmp/qa-accessibility/targets.mjs http://localhost:3000/ /tmp/qa-accessibility/out/targets 390
```

AA requires 24×24 px **or** that a 24 px circle centred on the target does not touch another target or another circle (spacing exception); links inside a sentence and unstyled native controls are also exempt. `FAILS 2.5.8` is a failure; `ok-AA (<44 recommended)` is Low (44×44 is the recommendation of WCAG 2.5.5 AAA and of Apple). Typical fix: `min-h-11 min-w-11` or `p-2` on icon buttons, spacing with `gap-2`.

## Step 7. Zoom, reflow, text spacing and motion

`reflow-motion.mjs`:

```js
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
```

```bash
node /tmp/qa-accessibility/reflow-motion.mjs http://localhost:3000/ /tmp/qa-accessibility/out/reflow-home
```

- `reflow320` (1.4.10): 320 CSS px equal 1280 px at 400 %. Any horizontal scroll is a failure except tables, maps and code. Typical culprit: `w-[1440px]` copied from the frame, words or URLs without `break-words`.
- `zoom200` (1.4.4): 640 px with DPR 2 equals a 1280 px browser at 200 %.
- `textSpacing` (1.4.12): injects the criterion's values; clipped text = failure (fixed heights, `truncate`, `line-clamp` with no alternative).
- `fixedPxText`: text that does not grow when the browser font size is increased (`text-[11px]`, `style={{fontSize: 11}}`). Not a failure on its own (zoom does scale it) but it hurts people who change the default size: Low, or Medium if it is also < 12 px.
- Motion: with `prefers-reduced-motion: reduce` no infinite animation or animation > 5 s may remain (2.2.2), nor large parallax/zoom (2.3.3, AAA, recommended). In Tailwind use `motion-safe:animate-*` or `motion-reduce:animate-none`; in Motion, `useReducedMotion()` or `<MotionConfig reducedMotion="user">`.

## Step 8. Manual review (mandatory)

What no tool can decide. Do at least the home page and one form, and record the result of each point in the report:

| Criterion | What to check |
|---|---|
| 1.1.1 | The `alt` describes the image's function; decorative images have `alt=""` |
| 1.3.1 / 4.1.2 | Menu, accordion, tabs, modal: role, `aria-expanded`, `aria-controls`; Esc and focus return |
| 1.4.1 / 1.4.11 | States (error, selected, focus) do not rely on colour alone; input borders and focus ≥ 3:1 |
| 2.5.7 Dragging (new in 2.2) | Sliders, swipe carousels, sortable lists, maps: there are buttons or a single-click alternative |
| 3.2.6 Consistent help (new in 2.2) | If there is chat, a phone number or a help link, it appears in the same relative order on every page |
| 3.3.1 / 3.3.3 | Form errors in text, associated with `aria-describedby`, announced (`aria-live` or focus to the first error) |
| 3.3.7 Redundant entry (new in 2.2) | Multi-step processes do not ask for the same thing twice (shipping address = billing, etc.) |
| 3.3.8 Accessible authentication (new in 2.2) | Pasting works in password and code fields (no `onPaste={e => e.preventDefault()}`), `autocomplete="current-password"`/`one-time-code`, no puzzle CAPTCHA without an alternative |
| 1.3.5 | `autocomplete` on name, email, phone, address |
| 1.2.x | Videos with captions; nothing flashes more than 3 times per second (2.3.1) |

**VoiceOver (macOS + Safari)**: turn it on with Cmd+F5. `VO` = Ctrl+Option.
1. Load the page: it should read the title. `VO+U` opens the rotor: review the lists of headings, landmarks, links and form controls: do they make sense out of context ("Leer más" (read more) ×6 does not)?
2. `VO+Cmd+H` jumps from heading to heading; `VO+A` reads everything in order (`VO+→` moves element by element): the reading order matches the visual order.
3. In the form, Tab through each field: it must announce label, type, required and, after submitting empty, the error.
4. Open the mobile menu (narrow the window) and a modal: it announces "expanded/collapsed", focus goes in and returns on close.
5. Navigate with a `next/link`: the new title must be announced.
6. On iPhone (Settings > Accessibility > VoiceOver): swipe right to move forward, rotor by rotating two fingers, double tap to activate.

**NVDA (Windows + Firefox or Chrome)**, free, `NVDA` = Insert:
1. `H` / `1`–`6` headings, `D` landmarks, `K` links, `F` fields, `B` buttons; `NVDA+F7` elements list.
2. Check that it switches to focus mode on its own in fields (`NVDA+Space` toggles modes) and that custom buttons activate with Enter and Space.
3. Submit the form with errors: the error must be read without looking for it.
4. Speech viewer (NVDA menu > Tools) to copy what was announced into the report.

If you have no Mac or Windows machine, say so in the report and leave this section as pending: do not mark it as passed.

## Severity

| Level | Examples in this phase |
|---|---|
| **Critical** | Main action inaccessible by keyboard (`div onClick` on the CTA or the menu), focus trap, form without labels in a purchase/contact flow, blocked zoom, image links with no name, authentication that prevents pasting. Fails WCAG A/AA in a key flow (legal risk under the EAA) |
| **High** | Text contrast < 4.5:1, no visible focus, focus covered by the header (2.4.11), focus on a hidden menu, wrong `lang`, targets < 24 px without spacing, horizontal scroll at 320 px, infinite animation that ignores reduced motion, repeated titles (silent navigation) |
| **Medium** | Several `h1` or skipped levels, placeholder as label on a secondary field, focus to `body` after navigating, no skip link, incomplete landmarks, unreviewed axe `incomplete` results |
| **Low** | Targets between 24 and 44 px, text in fixed px, AAA improvements, axe best-practice |

## Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

Save it as `qa-accessibility.md` (and the JSON/JSONL files from `out/` as `qa-accessibility.json` or attachments):

```markdown
# Accessibility — <project> — <date> — commit <hash> — WCAG 2.2 AA
Verdict: NOT CONFORMANT (Critical 2 · High 6 · Medium 4 · Low 3) · Manual review: VoiceOver yes / NVDA pending

## Summary
- Routes: 5 · axe: 12 nodes in 5 rules · jsx-a11y: 6 warnings · Keyboard: 3 issues · Reflow 320: fails on /servicios
- Coverage: automated (axe + scripts) + manual (step 8 table). What was not reviewed is listed at the end.

## Findings
| # | Sev. | WCAG | Where | Evidence | Why it matters | Fix |
|---|---|---|---|---|---|---|
| A-001 | Critical | 2.1.1, 4.1.2 | components/Header.tsx:6 | `<div onClick>` "Contacto": does not receive focus (keyboard.json, clickable-without-keyboard) | Without a mouse the contact page cannot be reached | `<Link href="/contacto">Contacto</Link>` |
| A-002 | High | 2.4.11 | app/layout.tsx (sticky header) | /: "Enlace 1" covered by `nav` when going up with Shift+Tab | The user cannot see where they are | `html { scroll-padding-top: 6rem }` |

## Manual review (VoiceOver / NVDA)
## Not reviewed and why
## Prevention recommendations (CI)
```

Group repetitions (the low-contrast footer shows up on every route: one finding with "5 routes"). To get to `file:line`, search with `rg` for the text or the class of the selector axe reports.

## False positives and limitations

- `focus-not-visible` in third-party iframes and on elements whose focus is drawn on the parent (`:focus-within`): confirm with the screenshot.
- `clickable-without-keyboard` also shows up on `label` or cards with a stretched link (`after:absolute inset-0`): if there is a focusable `a` inside, it is not a failure.
- The minimal-scroll simulation can flag elements that do not fail in Chromium: the failure is real in Firefox/Safari.
- Without webkit/firefox or a screen reader, this skill's coverage is Chromium + rules only; say so.
- `ariaSnapshot` reflects Chromium's tree; VoiceOver and NVDA may differ (hence step 8).
- With pnpm, `eslint-plugin-jsx-a11y` does not resolve from the project root (it is a dependency of `eslint-config-next`): run step 2 with npm or mark it as not reviewed.

## If the user asks for fixes

Order: (1) semantics and keyboard (real buttons/links, menu with `inert` while closed, no traps), (2) names and labels (`alt`, `aria-label` on icons, `<label htmlFor>`), (3) `lang`, per-route `metadata.title` and skip link in `app/layout.tsx`, (4) global visible focus (`focus-visible:outline-2 focus-visible:outline-offset-2` in the base layer, never `outline-none` without a replacement) and `scroll-padding-top`, (5) contrast (via tokens, see `qa-design-tokens`), (6) motion and targets. Re-run the scripts after each block. To prevent regressions: the axe test in Playwright (`expect(results.violations).toEqual([])` with the same tags) in CI and the jsx-a11y `strict` rules in the project config (with permission).

## Sources

- WCAG 2.2: https://www.w3.org/TR/WCAG22/ · What's new and Understanding 2.5.8: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- WCAG 3 status: https://www.w3.org/WAI/WCAG3
- @axe-core/playwright: https://www.npmjs.com/package/@axe-core/playwright · axe coverage (Deque): https://www.deque.com/automated-accessibility-coverage-report/
- GDS, automated tools: https://accessibility.blog.gov.uk/2017/02/24/what-we-found-when-we-tested-tools-on-the-worlds-least-accessible-webpage/
- Next.js, accessibility and route announcer: `node_modules/next/dist/docs/03-architecture/accessibility.md`
