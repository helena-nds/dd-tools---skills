---
name: qa-figma-fidelity
description: Design QA that compares an implemented website (Next.js/React) with its Figma design, using the Figma MCP server and Playwright. Measures spacing, typography, colors, radii, shadows, assets, states and responsive behaviour. Delivers a P0–P3 report with side-by-side screenshots and fixes with file and line. Use it whenever someone asks to check whether the website "looks like the Figma", review pixel perfect, do design QA or a visual review, validate an implementation generated from Figma, or find differences between design and code, even if Playwright isn't mentioned.
---

# Figma ↔ website fidelity QA

The goal is to state with evidence **where the website departs from the design, by how much, and where to fix it**. Pixel comparison alone is not enough: Figma and Chromium rasterise text differently, so a correct implementation already gives 2–3 % different pixels and agents end up chasing noise. That is why this skill combines three checks, from most to least reliable:

1. **Measured computed styles** (`getComputedStyle` + `getBoundingClientRect`) against the values of the Figma node. This is the one that gives the verdict.
2. **Side-by-side visual review** (Figma | web | diff), looking at the images. Useful for composition and assets.
3. **Pixel diff per section**. Only to prioritise where to look.

**By default no code is modified**: the report is delivered and fixes are only made if the user asks.

## Requirements

- URL of the Figma file (and, if possible, the specific frames): `figma.com/design/:fileKey/...?node-id=1-2`, where the nodeId is `1:2`.
- **Figma MCP** server connected. The remote one (`https://mcp.figma.com/mcp`) is recommended. Don't have the remote and the desktop server active at the same time: it confuses the agent.
- Website running locally. For the final verdict use `next build && next start`, not `next dev`: the dev server adds overlays, HMR and unoptimised CSS. If only `dev` is available, hide the indicator with `devIndicators: false` in `next.config` or let the script hide it.
- Tools in a separate directory:

```bash
mkdir -p /tmp/design-qa && cd /tmp/design-qa && npm init -y >/dev/null \
  && npm i playwright pngjs pixelmatch culori >/dev/null && npx playwright install chromium
```

If the project already has Playwright, you can reuse its version.

## Figma call budget (read this before starting)

Only the tools that read from Figma count:

| Seat | Limit |
|---|---|
| View/Collab | 20 calls per month |
| Full/Dev, Professional | 200 per day, 10 per minute |
| Full/Dev, Organization | 200 per day, 15 per minute |
| Full/Dev, Enterprise | 600 per day, 20 per minute |

A full QA of one page can use dozens of calls. Therefore:

- **Cache everything on disk**: `.design-qa/figma/<nodeId>.{json,png}`. Suggest that the user add `.design-qa/` to `.gitignore` (don't edit it without permission; if they'd rather not touch the repo, use `/tmp/design-qa/cache`). Before calling, check whether you already have it.
- Work out how many calls you will need and tell the user if there are many. With a View/Collab seat, warn them before starting.
- If you get a 429 or a limit warning, **stop** and record in the report what was left unreviewed. Don't retry in a loop.
- With the remote server: call `create_session(fileKey, description)` first and pass the `sessionId` on every call. The server asks you to load the `figma-design-to-code` skill before `get_design_context`: use the one from the Figma plugin if you have it; otherwise read the MCP resource `skill://figma/figma-design-to-code/SKILL.md`.

## Step 1. Map Figma frames to routes and sections

1. `get_metadata(fileKey)` without a nodeId lists the pages. With the page's nodeId, it lists the frames (name, x, y, width, height). The convention is usually "Home – Desktop 1440" or "Home – Mobile 390".
2. For each frame, `get_metadata(frameId)` gives the top-level children: these are the **sections** (hero, services, footer…).
3. Locate each section in the code: search with `rg` for the literal text from the design, ids, `data-section`, or use `get_code_connect_map` if there is Code Connect.
4. Write `.design-qa/map.json` and **confirm it with the user** if anything is unclear:

```json
{ "frames": [
  { "nodeId": "12:345", "route": "/", "width": 1440, "height": 900,
    "sections": { "hero": { "nodeId": "12:400", "selector": "[data-section=hero]" },
                  "servicios": { "nodeId": "12:480", "selector": "#servicios" } } } ] }
```

If there are no stable selectors, propose (without applying it) adding `data-section="…"` (or `data-figma-node="12:400"`) to the components. It makes this QA and the following ones easier.

## Step 2. Figma reference (per section)

Comparing section by section avoids an offset at the top shifting the whole page.

- **Screenshot at 1x**: `get_screenshot(fileKey, nodeId, maxDimension)`. By default `maxDimension` is 1024 and it **downscales** large frames (a 1440×5000 ends up at ~295×1024, useless for comparison). Pass `maxDimension = max(width, height)` of the node according to `get_metadata`. Check in the response that the rendered width matches the original. By default the image arrives as a short-lived URL: download it straight away (`curl -o`) into the cache.
- **Export at 2x** (for retina or fine detail): `download_assets(fileKey, nodeId, defaultFormat: "png", defaultScale: 2)`. There may be a size cap on very large nodes, so export per section.
- **Exact values**: `get_design_context(fileKey, nodeId, clientFrameworks: "react,nextjs", clientLanguages: "typescript,css")` returns reference code (React + Tailwind) with sizes, colors, typography and auto layout. If the node is large and the response comes back "sparse" or truncated, request the children separately: in large files it is easy to lose the padding without noticing.
- **Variables**: `get_variable_defs(fileKey, nodeId)` tells you which values are bound to variables. Those properties must resolve to a token in the code.
- **States and motion**: if the component has variants (hover, focus, disabled…), locate them with `get_metadata` on the component set. `get_motion_context` gives keyframes and easing.

Save the PNGs as `.design-qa/figma/<frame>/<section>.png`.

## Step 3. Web capture and computed styles

Same width as the Figma frame, `deviceScaleFactor` equal to the Figma export scale (1 or 2), animations disabled, fonts loaded, lazy images forced and no leftover hover:

```bash
node /tmp/design-qa/capture.mjs http://localhost:3000/ 1440 900 .design-qa/selectors-home.json .design-qa/web/home-1440 1
# selectors-home.json = { "hero": "[data-section=hero]", "servicios": "#servicios" }
```

`capture.mjs`:

```js
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
```

Check in `_styles.json`:

- `clientWidth` matches the frame width. If not, a scrollbar is taking width away.
- `fonts` contains **every family/weight pair** that Figma uses. If a weight is missing, the browser synthesises a fake bold (P1). With `next/font` the family name comes out with a hash or a "Fallback" suffix: normalise it before comparing.
- `figmaTempUrls` is empty. If there are Figma asset URLs or `localhost:3845` URLs, they expire: P0.
- `consoleErrors` is empty.

## Step 4. Pixel diff and side-by-side composite

```bash
node /tmp/design-qa/diff.mjs .design-qa/figma/home/hero.png .design-qa/web/home-1440/hero.png .design-qa/diff/home-hero
```

`diff.mjs`:

```js
// diff.mjs: compares the Figma PNG with the web one and generates a diff + side-by-side composite.
// Usage: node diff.mjs figma.png web.png outPrefix   → outPrefix-diff.png, outPrefix-side.png
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { readFileSync, writeFileSync } from 'node:fs';

const [fa, fb, out] = process.argv.slice(2);
const a = PNG.sync.read(readFileSync(fa)), b = PNG.sync.read(readFileSync(fb));
const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
const crop = img => { const o = new PNG({ width: w, height: h }); PNG.bitblt(img, o, 0, 0, w, h, 0, 0); return o; };
const A = crop(a), B = crop(b), D = new PNG({ width: w, height: h });
const n = pixelmatch(A.data, B.data, D.data, w, h, { threshold: 0.1, includeAA: false, alpha: 0.3, diffColorAlt: [0, 160, 255] });
writeFileSync(`${out}-diff.png`, PNG.sync.write(D));

// Side by side: Figma | Web | Diff (8 px grey separator)
const gap = 8, H = Math.max(a.height, b.height), S = new PNG({ width: a.width + b.width + w + gap * 2, height: H });
S.data.fill(200);
PNG.bitblt(a, S, 0, 0, a.width, a.height, 0, 0);
PNG.bitblt(b, S, 0, 0, b.width, b.height, a.width + gap, 0);
PNG.bitblt(D, S, 0, 0, w, h, a.width + b.width + gap * 2, 0);
writeFileSync(`${out}-side.png`, PNG.sync.write(S));

const ratio = n / (w * h);
console.log(JSON.stringify({
  figma: [a.width, a.height], web: [b.width, b.height], sizeDelta: { w: b.width - a.width, h: b.height - a.height },
  diffPixels: n, diffRatio: +ratio.toFixed(4),
  reading: ratio < 0.03 ? 'probable noise (antialiasing)' : ratio < 0.10 ? 'inspect' : 'probable structural difference',
}, null, 1));
```

- `sizeDelta.h ≠ 0` is already a finding: the section has too much or too little height (padding, line-height, image).
- Rough ratio (a heuristic, not a standard): under 3 % is antialiasing noise; between 3 and 10 % needs inspecting; over 10 % points to a structural problem.
- **Open and look at `*-side.png`** with the image-reading tool. Compare the full view first (composition, order, alignment) and then zoomed-in regions: don't sign off a section if the details can't be made out in the full view. A clean diff doesn't guarantee the right asset, and a noisy diff doesn't mean it's wrong.

## Step 5. Compare measured values with Figma

This is the core of the skill. For each relevant element in the section (headings, paragraphs, buttons, images, icons, containers), compare what was measured in `_styles.json` with the Figma node.

**Figma → CSS conversion**

| Figma | Expected CSS value | Watch out for |
|---|---|---|
| px | px (1 Figma px = 1 CSS px at 1x) | — |
| Line height in px | `line-height: Npx` | — |
| Line height in % | unitless `value/100` (140 % → 1.4) | The computed value comes out in px: compare with `fontSize × 1.4` |
| Line height "Auto" | `normal` | Not 1:1 across engines. Compare the box height with ±2 px |
| Letter spacing in % | `em = %/100` (−2 % → −0.02em) | The computed value comes out in px: compare with `fontSize × %/100` |
| Weights | Thin 100 · ExtraLight 200 · Light 300 · Regular 400 · Medium 500 · SemiBold 600 · Bold 700 · ExtraBold 800 · Black 900 | "Italic" goes in `font-style` |
| Text case Upper/Title | `text-transform` | That the text hasn't been typed in capitals by hand |
| Auto layout H/V | `display:flex; flex-direction: row/column` | — |
| Item spacing / Space between | `gap` / `justify-content: space-between` | — |
| Padding | `padding` | — |
| Hug / Fill / Fixed | `auto` / `flex: 1` or `align-self: stretch` / fixed width | A **Fixed** on a page container is almost always a conversion error |
| Corner radius (per corner) | per-corner `border-radius` | Corner smoothing has no direct equivalent |
| Stroke Inside / Outside | `border` (border-box) / `outline` or `box-shadow 0 0 0 N` | That the border doesn't change the box size |
| Drop / Inner shadow | `box-shadow` / `inset` | — |
| Fill + layer opacity | resulting color | The script already converts oklch/rgb to hex. Compare with ΔE2000 |
| Image fill Fill / Fit / Crop | `object-fit: cover` / `contain` / `object-position` | Container aspect ratio ±1 % |
| Vertical trim | `text-box: trim-both cap alphabetic` | Without trim, the web box is taller: compare the text position, not just the box |

**Starting tolerances** (adjust them if the user is more or less strict):

| Property | Tolerance |
|---|---|
| Geometry (position relative to the section, size) | ±2 px |
| Font-size | ±1 px |
| Line-height | ±2 px |
| Letter-spacing | ±0.5 px |
| Borders and radii | ±1 px |
| Color | ΔE2000 ≤ 2 |
| Font-family and font-weight | exact match |

Positions are measured **relative to the section root**, so a global offset isn't penalised.

## Step 6. States

A closed dropdown doesn't verify its open state. For each interactive component with variants in Figma, trigger the state in Playwright (`hover()`, `focus()` with the `Tab` key, `click()` for open/active, `disabled` by forcing the attribute if needed) and repeat steps 3–5 on that element. Always check that there is **visible focus** even if Figma doesn't draw it: if it's missing, it's an accessibility problem.

## Step 7. Responsive

Figma usually only has desktop and mobile. At intermediate widths there is no reference, so **invariants** are checked: no horizontal scroll, no elements outside the viewport, no hidden clipping, no distorted images and no covered buttons.

```bash
node /tmp/design-qa/responsive.mjs http://localhost:3000/ .design-qa/responsive/home
```

`responsive.mjs`:

```js
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
```

By default it tests 320 (WCAG reflow), typical mobile widths and each Tailwind breakpoint ±1 px (639/640, 767/768, 1023/1024, 1279/1280, 1535/1536), plus 1440 and 1920. Also review the `w*.png` screenshots: typography that jumps abruptly, containers that don't centre or that lose their max-width.

## Step 8. Typical errors in AI Figma → code conversion

Check them explicitly; they are the most frequent:

| Error | How to detect it |
|---|---|
| `position: absolute` copied from Figma on flow elements | `position` in `_styles.json`; layout that breaks at ±100 px from the frame width |
| Fixed widths and heights (`w-[1440px]`, `h-[933px]`), values like `leading-[22.126px]` | `rg -n "\[[0-9.]+px\]" app components` |
| Hand-written hex or px instead of tokens | Cross-check with `get_variable_defs`. For the full audit, use the `qa-design-tokens` skill |
| Font weights not loaded | `fonts` against the Figma styles |
| Icons at 24×24 when the instance is scaled to 16 or 20 | The MCP returns the component's original size: measure the SVG bbox |
| SVGs with `fill="#…"` (they don't inherit color) or icons redrawn by hand | Compare with the `svgAssets` from `download_assets` |
| Duplicate or ghost elements (two search icons) | Count nodes (`svg`, `img`) per section against Figma |
| Image with a different crop or aspect ratio | `object-fit`/`object-position` and natural vs rendered size (it should be sharp at 2x) |
| Text rendered as an image | `img`/`svg` where Figma has a TEXT node |
| `div` instead of `button`, `a`, `nav` or `h1–h6` | Tags in `_styles.json`; `page.locator('body').ariaSnapshot()` |
| Different copy, lorem ipsum or leftovers from the prompt | Compare the texts with the TEXT nodes |
| Badly stacked layers covering buttons | `interactive-covered` rule in responsive.mjs |

## Severity and verdict

| Level | Criterion | Examples |
|---|---|---|
| **P0 · Blocker** | Breaks the page or makes it unusable | Broken layout, overflow hiding CTAs, missing or wrong asset in the hero, temporary Figma URLs, text as an image |
| **P1 · High** | Any user notices it | Wrong font or weight, brand color with ΔE > 5, section spacing off by ≥ 8 px, missing hover/focus state, badly cropped image |
| **P2 · Medium** | Moderate drift | Spacing off by 3–7 px, line-height off by > 2 px, brand color with ΔE 2–5, different radius or shadow, literals instead of tokens, failures at intermediate widths |
| **P3 · Minor** | Within ±2 px, subpixel, ΔE 2–5 on non-brand colors | Polish |

**Verdict**:

- **PASS**: no P0, P1 or P2 left. P3s can remain as follow-up.
- **FAIL**: some P0, P1 or P2 remains.
- **BLOCKED**: Figma or the website could not be captured (call limit, node without export, the website doesn't start).

Separate **objective mismatches** (measured) from **subjective observations** (visual polish).

## Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

`.design-qa/report.md` (plus `report.json`). Write the report in the user's language.

```markdown
# Design QA — / (Home) — Figma 12:345 — 1440×900 @1x — commit 3f2a1c — 2026-10-26
Verdict: FAIL (P0: 0 · P1: 2 · P2: 5 · P3: 7) · Responsive: 2 problems (320, 768)
Figma calls used: 14 (cache in .design-qa/figma)

## Hero section (12:400) ↔ [data-section=hero]
![Figma | Web | Diff](diff/home-hero-side.png)
Diff: 6.8 % · Δ height: +24 px

| # | Sev. | Element / property | Figma | Web | Δ | Fix |
|---|---|---|---|---|---|---|
| H1 | P1 | h1 font-weight | 600 (SemiBold) | 700 | +100 | components/Hero.tsx:24 `font-bold` → `font-semibold`; load weight 600 in app/layout.tsx:8 |
| H2 | P2 | gap h1 → p | 16 px | 20 px | +4 | Hero.tsx:22 `gap-5` → `gap-4` |

## States
## Responsive
## Assets and typography
## Subjective observations
## Not reviewed / blockers
```

To get to the `file:line`, search with `rg` for the literal text, the section selector or a class unique to the element.

Optionally, so the designer can review it in Figma: the remote server's `generate_figma_design` tool (a write tool, it doesn't use quota) captures the website as Figma layers next to the design. Only use it if the user asks, because it writes to the file.

## If the user asks for fixes

Fix the structural issues first (container widths, layout) and the details afterwards. Capture and compare again after each batch of changes and keep a history: finding → change → new measurement. If an element doesn't converge in 3 rounds, the problem is structural (wrong layout or component): stop and explain it instead of continuing to nudge pixels.
