---
name: qa-performance-cwv
description: Audits the performance and Core Web Vitals (LCP, INP, CLS) of a Next.js website, with mobile Lighthouse, web-vitals through Playwright, CrUX field data and a code review (next/image, next/font, next/script, Server/Client Components, Cache Components, Turbopack bundle and /public asset weights). Use it whenever someone asks to review speed, PageSpeed, Lighthouse, Core Web Vitals, LCP/INP/CLS, bundle size, slow images or why the site is slow on mobile, even if the metrics are not mentioned by name.
---

# Performance and Core Web Vitals

The goal is to answer two questions with measurements: **does the site pass Core Web Vitals on mobile?** and, if not, **which file and which line cause it**. Websites generated from Figma with AI always show the same failures: `<img>` instead of `next/image`, images exported at 2× or 3× without `sizes`, `"use client"` on components that don't need it, Google Fonts linked with `<link>`, third-party scripts loaded early, autoplay videos and multi-MB assets in `/public`.

**By default no code is modified**: the report is delivered and fixes are applied only if the user asks. Tools are installed in `/tmp/qa-performance-cwv/`, never in the project.

Boundaries with other skills: total page weight and CO2 footprint belong to `qa-ecodesign`; layout in other browsers, to `qa-responsive-browsers`; the choice of analytics tools and their consent, to `qa-analytics` and `qa-legal-spain`; metadata and indexing, to `qa-technical-seo`. Here only the **performance cost** of each thing is measured.

## Step 0. Context

Find out before measuring:

1. **Next version** (`package.json`). Next 16 changes things that affect this audit: Turbopack by default in `dev` and `build`; its own bundle analyzer (`next experimental-analyze` since 16.1; `next analyze` and JSONL export in 16.4); `next/image` `priority` deprecated in favour of `preload`; `images.qualities` defaults to `[75]`; Cache Components (`cacheComponents: true`) with Partial Prerendering. In Next 15 or with `--webpack`, the analyzer is `@next/bundle-analyzer`.
2. **Router** (App or Pages) and whether `next.config` has `cacheComponents`, `images` or `experimental`.
3. **Where it will be measured**: `next build && next start` locally (always) and, if it exists, the **staging or production URL**. Locally there is no CDN, Brotli or HTTP/2 (`next start` compresses with gzip), so network values are only indicative.
4. **Is there real traffic?** Field data (CrUX) only exists for origins with enough Chrome traffic. A new site won't have it.
5. The key routes: home, the heaviest template (listing, detail page, blog) and the conversion page (contact).

## Thresholds

Verified on web.dev and in the CrUX release notes as of October 2026: **they have not changed**. They are evaluated at the **75th percentile** of real visits, separately for mobile and desktop.

| Metric | Good | Needs improvement | Poor | Where it is measured |
|---|---|---|---|---|
| LCP | ≤ 2.5 s | ≤ 4 s | > 4 s | field and lab |
| INP | ≤ 200 ms | ≤ 500 ms | > 500 ms | field (in the lab only with simulated interactions) |
| CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 | field and lab |
| TBT (INP proxy) | ≤ 200 ms | ≤ 600 ms | > 600 ms | Lighthouse only |

New in 2026: since the CrUX release of 13-10-2026 there are **experimental** metrics that include *soft* navigations (experimental variants of LCP, INP and CLS with soft navigations). They don't change the official verdict; mention them only as a data point.

## Step 1. Tools

```bash
mkdir -p /tmp/qa-performance-cwv && cd /tmp/qa-performance-cwv && npm init -y >/dev/null \
  && npm i lighthouse@13 web-vitals@6 playwright >/dev/null && npx playwright install chromium
```

Environment variables don't carry over from one Bash call to the next: that is why every Lighthouse command is prefixed with `CHROME_PATH=…` (Playwright's Chromium) and every script is launched with `cd /tmp/qa-performance-cwv &&`.

Lighthouse 13 requires Node ≥ 22.19. Write this skill's five scripts into that directory. They are tested with Next 16.4.3, Lighthouse 13.5.0, web-vitals 6.2.3 and Playwright 1.6x.

## Step 2. Production build

```bash
npx next build 2>&1 | tee /tmp/qa-performance-cwv/build.log
npx next start -p 3000 &   # never measure on next dev: unminified and with HMR
```

In the build's route table: `○` static, `◐` Partial Prerender (static shell + streaming) and `ƒ` dynamic. A content page marked `ƒ` is usually caused by `cookies()`/`headers()` in a layout or by data without `'use cache'`; note it down.

## Step 3. Mobile Lighthouse, several routes and runs

```bash
cd /tmp/qa-performance-cwv && CHROME_PATH="$(node -e "console.log(require('playwright').chromium.executablePath())")" node lh-multi.mjs http://localhost:3000 / /servicios /contacto --runs=3 > lighthouse.json
```

`lh-multi.mjs`:

```js
// lh-multi.mjs: Lighthouse (mobile, simulated throttling) on several routes, N runs, median and summary of opportunities.
// Usage: CHROME_PATH=/path/chrome node lh-multi.mjs http://localhost:3000 / /servicios /contacto [--runs=3] [--desktop] > lighthouse.json
// Full reports are saved in ./lh/<route>-<n>.json to open them in https://googlechrome.github.io/lighthouse/viewer/
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2), flags = args.filter(a => a.startsWith('--')), pos = args.filter(a => !a.startsWith('--'));
const base = pos[0], paths = pos.slice(1).length ? pos.slice(1) : ['/'];
const RUNS = Number((flags.find(f => f.startsWith('--runs=')) || '--runs=3').split('=')[1]);
const desktop = flags.includes('--desktop');
mkdirSync('lh', { recursive: true });
const median = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const KEYS = { LCP: 'largest-contentful-paint', CLS: 'cumulative-layout-shift', TBT: 'total-blocking-time', FCP: 'first-contentful-paint', SI: 'speed-index' };
const THR = { LCP: [2500, 4000], CLS: [0.1, 0.25], TBT: [200, 600], FCP: [1800, 3000] };   // TBT: Lighthouse thresholds, INP proxy in the lab
const rate = (k, v) => !THR[k] ? undefined : v <= THR[k][0] ? 'good' : v <= THR[k][1] ? 'needs-improvement' : 'poor';

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
const results = [];
for (const path of paths) {
  const url = new URL(path, base).href, runs = [];
  for (let i = 0; i < RUNS; i++) {
    try {
      const r = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance'], ...(desktop && { preset: 'desktop' }) },
        desktop ? (await import('lighthouse/core/config/desktop-config.js')).default : undefined);
      const lhr = r.lhr; writeFileSync(`lh/${path.replace(/\W+/g, '_') || 'home'}-${i}.json`, r.report);
      if (lhr.runtimeError) { runs.push({ error: lhr.runtimeError.message }); continue; }
      runs.push({ lhr, score: Math.round(lhr.categories.performance.score * 100) });
    } catch (e) { runs.push({ error: e.message }); }
  }
  const ok = runs.filter(r => r.lhr);
  if (!ok.length) { results.push({ url, error: runs.map(r => r.error) }); continue; }
  const med = ok.find(r => r.score === median(ok.map(x => x.score)));                      // median run by score
  const A = med.lhr.audits;
  const metrics = Object.fromEntries(Object.entries(KEYS).map(([k, id]) => { const v = median(ok.map(r => r.lhr.audits[id]?.numericValue ?? NaN));
    return [k, { value: k === 'CLS' ? +v.toFixed(3) : Math.round(v), status: rate(k, v) }]; }));
  const items = id => A[id]?.details?.items || [];
  const lcpEl = A['lcp-breakdown-insight']?.details?.items?.find(i => i.type === 'node');
  const phases = A['lcp-breakdown-insight']?.details?.items?.find(i => i.type === 'table')?.items?.map(i => `${i.subpart}: ${Math.round(i.duration)} ms`);
  const opportunities = Object.values(A).filter(a => a.score !== null && a.score < 0.9 && !Object.values(KEYS).includes(a.id) && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable')
    .map(a => ({ id: a.id, title: a.title, value: a.displayValue || undefined, savingsMs: a.metricSavings?.LCP || a.metricSavings?.FCP || undefined, score: a.score }))
    .sort((a, b) => (a.score ?? 1) - (b.score ?? 1)).slice(0, 12);
  const reqs = items('network-requests');
  results.push({ url, passes: ok.length, scores: ok.map(r => r.score), medianScore: med.score, metrics,
    lcpElement: lcpEl ? { selector: lcpEl.selector, snippet: lcpEl.snippet } : undefined, lcpPhases: phases,
    totalWeightKB: Math.round((A['total-byte-weight']?.numericValue || 0) / 1024), requests: reqs.length,
    failedRequests: reqs.filter(r => r.statusCode >= 400 || r.statusCode === -1 || r.failed).map(r => r.url.slice(0, 100)),
    thirdParties: items('third-parties-insight').map(i => ({ entity: i.entity?.text || i.entity, kb: Math.round((i.transferSize || 0) / 1024), mainThreadMs: Math.round(i.mainThreadTime || 0) })),
    unsizedImages: items('unsized-images').map(i => i.url || i.node?.snippet),
    opportunities, benchmarkIndex: med.lhr.environment?.benchmarkIndex, lighthouse: med.lhr.lighthouseVersion,
    warnings: med.lhr.runWarnings?.length ? med.lhr.runWarnings : undefined });
}
await chrome.kill();
console.log(JSON.stringify({ mode: desktop ? 'desktop' : 'mobile (simulated Moto G Power, simulated slow 4G)', runs: RUNS, results }, null, 1));
```

How to read it:

- Use the **median** of 3–5 runs: between runs the score easily varies by ±5 points, and much more if the machine is busy (for example, compiling at the same time). `benchmarkIndex` indicates CPU power; if it is very low, TBT comes out inflated.
- `lcpElement` and `lcpPhases` tell **what** the LCP is and in which phase time is lost: TTFB (server), load delay (the image is discovered late: `preload`/`fetchPriority` missing), load duration (heavy image) or render delay (blocking CSS or fonts, JS).
- Lighthouse 13 replaced many audits with *insights*: `image-delivery-insight` (formerly `uses-responsive-images`, `modern-image-formats`…), `lcp-discovery-insight`, `render-blocking-insight`, `third-parties-insight`, `cache-insight`, `legacy-javascript-insight`, `lcp-breakdown-insight`. The score did not change.
- Limitations: throttling is **simulated** (Lantern model); it doesn't measure INP; it doesn't see what only happens after interacting; locally there is no CDN. That is why steps 4 and 5 complement it.

**Lighthouse CI** (if the user wants to monitor it on every PR): `@lhci/cli` 0.15.1 still bundles **Lighthouse 12.6.1**, with the old audit IDs. Assert only metrics, which work in both versions:

```js
// lighthouserc.js (propose it, don't install without permission)
module.exports = { ci: {
  collect: { startServerCommand: 'npm run start', url: ['http://localhost:3000/', 'http://localhost:3000/servicios'], numberOfRuns: 3 },
  assert: { assertions: {
    'categories:performance': ['error', { minScore: 0.9 }],
    'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
    'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
    'total-blocking-time': ['warn', { maxNumericValue: 200 }] } },
  upload: { target: 'temporary-public-storage' } } };
```

## Step 4. LCP, CLS and INP with web-vitals in a real browser

The `web-vitals` library (the same logic Chrome uses for CrUX) with its attribution build gives the exact element that causes each problem. INP only exists if there are interactions: pass with `--click` the selectors of what the user really touches (menu, accordion, tabs, filters). By default it clicks on the `h1`, which only gives a baseline.

```bash
cd /tmp/qa-performance-cwv && node vitals-pw.mjs http://localhost:3000 / /servicios --click="button[aria-controls=menu]" --runs=3 > vitals.json
```

`vitals-pw.mjs`:

```js
// vitals-pw.mjs: LCP, CLS, INP, FCP and TTFB with the web-vitals library (attribution build) in Chromium via Playwright,
// emulating a mobile device with CPU x4 and slow 4G network. Lab: INP depends on the interactions that are simulated.
// Usage: node vitals-pw.mjs http://localhost:3000 / /servicios [--click="button.menu"] [--runs=3] [--no-throttle] > vitals.json
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
// The IIFE is not in "exports": it is located from the script's directory (/tmp/qa-performance-cwv/node_modules)
const WV = fileURLToPath(new URL('./node_modules/web-vitals/dist/web-vitals.attribution.iife.js', import.meta.url));

// A single init script: Playwright wraps each script in its own scope, so the library and the registration go together.
const INIT = readFileSync(WV, 'utf8') + `;window.__v = {}; const keep = m => { window.__v[m.name] = { value: m.value, a: m.attribution }; };
  for (const f of ['onLCP', 'onCLS', 'onINP', 'onFCP', 'onTTFB']) webVitals[f](keep, { reportAllChanges: true });`;
const args = process.argv.slice(2), flag = n => args.find(a => a.startsWith(`--${n}`));
const [base, ...paths] = args.filter(a => !a.startsWith('--'));
const clicks = args.filter(a => a.startsWith('--click=')).map(a => a.slice(8));
const RUNS = Number(flag('runs=')?.split('=')[1] || 3), throttle = !flag('no-throttle');
const THR = { LCP: [2500, 4000], CLS: [0.1, 0.25], INP: [200, 500], FCP: [1800, 3000], TTFB: [800, 1800] };
const median = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

const browser = await chromium.launch();
const out = [];
for (const path of (paths.length ? paths : ['/'])) {
  const url = new URL(path, base).href, runs = [];
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36' });
    const page = await ctx.newPage();
    if (throttle) { const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 }); }
    await page.addInitScript(INIT);
    const errors = [];
    page.on('requestfailed', r => errors.push(r.url().slice(0, 100)));
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(1500);
      for (let y = 0; y < 6; y++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(300); }   // triggers lazy-load and late shifts
      const targets = clicks.length ? clicks : ['h1'];                                                   // by default, a harmless click
      for (const sel of targets) { const el = page.locator(sel).first();
        if (await el.count()) { await el.scrollIntoViewIfNeeded().catch(() => {}); await el.click({ timeout: 5000, noWaitAfter: true }).catch(e => errors.push(`click ${sel}: ${e.message.split('\n')[0]}`)); await page.waitForTimeout(800); } }
      await page.keyboard.press('Tab'); await page.waitForTimeout(500);
      const v = await page.evaluate(() => { const s = x => x && JSON.parse(JSON.stringify(x, (k, val) => val instanceof Node || /Entry|entries|Entries$/.test(k) ? undefined : val)); return Object.fromEntries(Object.entries(window.__v).map(([k, m]) => [k, { value: m.value, a: s(m.a) }])); });
      runs.push({ v, errors });
    } catch (e) { runs.push({ error: e.message.split('\n')[0] }); }
    await ctx.close();
  }
  const ok = runs.filter(r => r.v);
  const metric = n => { const val = median(ok.map(r => r.v[n]?.value)); if (val == null) return { value: null, note: n === 'INP' ? 'no measurable interaction' : 'not reported' };
    const r = ok.find(x => x.v[n]?.value === val)?.v[n]?.a || {};
    const status = val <= THR[n][0] ? 'good' : val <= THR[n][1] ? 'needs-improvement' : 'poor';
    const attr = n === 'LCP' ? { element: r.target, url: r.url, ttfb: Math.round(r.timeToFirstByte), loadDelay: Math.round(r.resourceLoadDelay), loadDuration: Math.round(r.resourceLoadDuration), renderDelay: Math.round(r.elementRenderDelay) }
      : n === 'CLS' ? { largestShift: r.largestShiftTarget, value: r.largestShiftValue }
      : n === 'INP' ? { target: r.interactionTarget, type: r.interactionType, inputDelay: Math.round(r.inputDelay), processing: Math.round(r.processingDuration), presentation: Math.round(r.presentationDelay) } : undefined;
    return { value: n === 'CLS' ? +val.toFixed(3) : Math.round(val), status, ...(attr && { attribution: attr }) }; };
  out.push({ url, passes: ok.length, LCP: metric('LCP'), CLS: metric('CLS'), INP: metric('INP'), FCP: metric('FCP'), TTFB: metric('TTFB'),
    failedRequests: [...new Set(ok.flatMap(r => r.errors))], errors: runs.filter(r => r.error).map(r => r.error) });
}
await browser.close();
console.log(JSON.stringify({ conditions: throttle ? 'mobile 412x823, CPU x4, 150 ms RTT, 1.6 Mbps' : 'no throttling', results: out }, null, 1));
```

- If the Lighthouse LCP and this one differ a lot, trust this one more for the *what* and Lighthouse for the *how much*: Lighthouse simulates a slower network.
- `CLS.attribution.largestShift` is the element that moved; the cause is usually right above it (image without `width`/`height`, injected banner, font that changes metrics).
- High INP with a large `processing` = JS in the handler; with a large `inputDelay` = busy main thread (hydration, third parties); with a large `presentation` = huge DOM or costly re-render.
- Requests to external domains that fail show up in `failedRequests`: in an environment without Internet access, third parties are not measured; say so in the report.

## Step 5. Field data (the data that counts for Google)

- **CrUX API**: requires a Google Cloud API key with the "Chrome UX Report" API enabled; free, 150 queries/min per project; 28-day mobile window, updated daily. If there isn't enough data it returns **404**: say so, it's not an error of the site.

```bash
curl -s "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=$CRUX_KEY" -H 'Content-Type: application/json' \
  -d '{"origin":"https://www.ejemplo.es","formFactor":"PHONE","metrics":["largest_contentful_paint","interaction_to_next_paint","cumulative_layout_shift"]}' \
  | node -e 'const r=JSON.parse(require("fs").readFileSync(0)).record;for(const[k,v]of Object.entries(r?.metrics||{}))console.log(k,"p75 =",v.percentiles.p75)'
```

  Use `"url"` instead of `"origin"` for a specific page (needs more traffic). The **CrUX History API** (`records:queryHistoryRecord`) gives the weekly trend.
- **PageSpeed Insights API** (`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=…&strategy=mobile`): the URL must be public; the key is optional, but recommended for automated use. Google has announced it will stop including field data in the response: use CrUX for that.
- **No traffic** (new site or staging): there is only lab data. Recommend measuring in production with `useReportWebVitals` from `next/web-vitals` or the `web-vitals` library, sending to the analytics they already have (the choice and the consent belong to `qa-analytics`).

## Step 6. Code review

```bash
node /tmp/qa-performance-cwv/scan-code.mjs . > /tmp/qa-performance-cwv/code.jsonl
```

`scan-code.mjs`:

```js
// scan-code.mjs: code patterns that worsen LCP/CLS/INP or the bundle in Next.js (App Router).
// Usage: node scan-code.mjs <project-root> > code.jsonl   (summary on stderr)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.argv[2] || '.';
const SKIP = /^(node_modules|\.next|\.git|out|dist|build|coverage|\.turbo|\.vercel)$/;
const CC = ['next.config.ts', 'next.config.mjs', 'next.config.js'].some(n => { try { return /cacheComponents\s*:\s*true/.test(readFileSync(join(ROOT, n), 'utf8')); } catch { return false; } });
const files = [];
(function walk(d) { for (const n of readdirSync(d)) { if (SKIP.test(n)) continue; const p = join(d, n);
  try { const s = statSync(p); if (s.isDirectory()) walk(p); else if (/\.(tsx|jsx|ts|js|mjs|css)$/.test(n) && !/\.(test|spec|stories|d)\./.test(n)) files.push(p); } catch {} } })(ROOT);

const HEAVY = /^(moment|lodash|chart\.js|three|@mui\/icons-material|xlsx|pdfjs-dist|highlight\.js|prismjs|swiper|gsap|@fortawesome\/fontawesome-free)$/;
const THIRD = /googletagmanager|google-analytics|gtag|facebook\.net|connect\.facebook|hotjar|clarity\.ms|hs-scripts|hubspot|intercom|tiktok|linkedin|doubleclick|cookiebot|onetrust/;
const counts = {};
const emit = (rule, sev, file, line, match, fix) => { counts[rule] = (counts[rule] || 0) + 1;
  process.stdout.write(JSON.stringify({ rule, sev, file: relative(ROOT, file), line, match: String(match).replace(/\s+/g, ' ').slice(0, 140), fix }) + '\n'); };
const lineOf = (src, i) => src.slice(0, i).split('\n').length;
// Extracts complete (multi-line) JSX tags of one kind: <Image ... />, <img ...>, etc.
const tags = (src, name) => [...src.matchAll(new RegExp(`<${name}\\b([^>]|=>|\\{[^}]*\\})*?\\/?>`, 'g'))];

for (const f of files) {
  let src; try { src = readFileSync(f, 'utf8'); } catch { continue; }
  const code = src.replace(/\{\/\*[\s\S]*?\*\/\}|\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')); // without comments, same lines
  if (/\.css$/.test(f)) {
    for (const m of code.matchAll(/@import\s+url\(["']?https?:\/\/fonts\.(googleapis|gstatic)[^)]*\)/g)) emit('google-fonts-css', 'high', f, lineOf(code, m.index), m[0], 'next/font/google or next/font/local');
    for (const m of code.matchAll(/@font-face\s*\{[^}]*\}/g)) if (!/font-display/.test(m[0])) emit('font-face-no-display', 'low', f, lineOf(code, m.index), m[0], 'font-display: swap (or next/font)');
    continue;
  }
  if (/next\.config\./.test(f)) {
    if (/unoptimized\s*:\s*true/.test(code)) emit('images-unoptimized-global', 'high', f, lineOf(code, code.search(/unoptimized\s*:\s*true/)), 'images.unoptimized: true', 'remove it unless it is a static export with its own loader');
    if (!/image\/avif/.test(code)) emit('images-no-avif', 'low', f, 1, 'images.formats defaults to [image/webp]', "images: { formats: ['image/avif', 'image/webp'] } (more CPU to encode)");
    continue;
  }
  const isJsx = /\.(tsx|jsx)$/.test(f);
  const useClient = /^\s*(['"])use client\1/.test(code);
  if (isJsx) {
    for (const m of tags(code, 'img')) emit('img-not-next-image', /\.svg/.test(m[0]) ? 'medium' : 'high', f, lineOf(code, m.index), m[0], 'next/image with width/height or fill + sizes' + (/\bwidth=/.test(m[0]) && /\bheight=/.test(m[0]) ? '' : ' (currently without width/height: CLS risk)'));
    let preloads = 0;
    for (const m of tags(code, 'Image')) {
      const t = m[0], l = lineOf(code, m.index);
      if (/\bfill\b/.test(t) && !/\bsizes=/.test(t)) emit('image-fill-no-sizes', 'high', f, l, t, 'add a real sizes, e.g. sizes="(max-width: 768px) 100vw, 50vw"');
      else if (!/\bsizes=/.test(t) && /w-full|w-screen|100vw|width:\s*['"]?100%/.test(t)) emit('image-responsive-no-sizes', 'medium', f, l, t, 'add sizes matching the layout');
      if (/\bpriority\b/.test(t)) emit('image-priority-deprecated', 'low', f, l, t, 'Next 16: preload, or better loading="eager"/fetchPriority="high" on the LCP image');
      if (/\b(priority|preload)\b(?!=\{false\})/.test(t)) preloads++;
      if (/\bunoptimized\b(?!=\{false\})/.test(t) && !/\.svg/.test(t)) emit('image-unoptimized', 'medium', f, l, t, 'remove unoptimized except for SVG/GIF');
    }
    if (preloads > 1) emit('image-preload-multiple', 'medium', f, 1, `${preloads} images with priority/preload`, 'only the LCP image');
    for (const m of tags(code, 'link')) if (/fonts\.(googleapis|gstatic)/.test(m[0])) emit('google-fonts-link', 'high', f, lineOf(code, m.index), m[0], 'next/font: self-hosted, no external request or blocking CSS');
    for (const m of tags(code, 'script')) if (/\bsrc=/.test(m[0])) emit('script-not-next-script', 'medium', f, lineOf(code, m.index), m[0], 'next/script with a suitable strategy');
    for (const m of tags(code, 'Script')) {
      const t = m[0], l = lineOf(code, m.index), strat = (t.match(/strategy=["'](\w+)/) || [, 'afterInteractive'])[1];
      if (strat === 'beforeInteractive') emit('script-before-interactive', 'medium', f, l, t, 'only for critical scripts (consent manager, polyfills)');
      else if (THIRD.test(t) && strat === 'afterInteractive') emit('script-third-party-early', 'medium', f, l, t, 'lazyOnload or @next/third-parties; consent: see qa-analytics / qa-legal-spain');
    }
    for (const m of tags(code, 'iframe')) {
      const t = m[0], l = lineOf(code, m.index);
      if (/youtube\.com|youtu\.be|vimeo\.com/.test(t)) emit('iframe-video-no-facade', 'medium', f, l, t, 'YouTubeEmbed from @next/third-parties or a facade (thumbnail + click)');
      else if (!/loading=["']lazy/.test(t)) emit('iframe-no-lazy', 'low', f, l, t, 'loading="lazy" if it is below the fold');
    }
    for (const m of tags(code, 'video')) {
      const t = m[0], l = lineOf(code, m.index);
      if (/\bautoPlay\b/.test(t)) emit('video-autoplay', 'medium', f, l, t, 'avoid autoplay on mobile or use a short, muted, playsInline video with a poster');
      if (!/\bposter=/.test(t)) emit('video-no-poster', 'medium', f, l, t, 'poster= (avoids an empty gap and improves perceived LCP)');
      if (!/preload=["'](none|metadata)/.test(t)) emit('video-preload', 'low', f, l, t, 'preload="none" or "metadata"');
    }
  }
  if (useClient) {
    const hooks = /\buse(State|Effect|LayoutEffect|Reducer|Ref|Context|Transition|Optimistic|ActionState|FormStatus|Router|Pathname|SearchParams|[A-Z]\w*)\s*\(/.test(code);
    const browser = /\b(window|document|localStorage|sessionStorage|navigator)\./.test(code) && !/onClick=\{\(\)\s*=>\s*\(?window\.location/.test(code);
    const handlers = [...code.matchAll(/\bon[A-Z]\w+=\{/g)].length;
    const navOnly = /onClick=\{\(\)\s*=>\s*\(?(window\.location(\.href)?\s*=|router\.push\()/.test(code);
    if (!hooks && !browser && !handlers) emit('use-client-unnecessary', 'medium', f, 1, '"use client" without hooks, events or browser APIs', 'remove "use client": it becomes a Server Component (0 KB of JS)');
    else if (!hooks && !browser && navOnly && handlers === 1) emit('use-client-for-navigation', 'medium', f, 1, 'client only because of an onClick that navigates', 'use <Link href> and remove "use client"');
  }
  for (const m of code.matchAll(/import\s+(?:[\w*{}\s,]+from\s+)?["']([^"']+)["']/g)) {
    const pkg = m[1].startsWith('@') ? m[1].split('/').slice(0, 2).join('/') : m[1].split('/')[0];
    if (HEAVY.test(m[1]) || (HEAVY.test(pkg) && m[1] === pkg)) emit(useClient ? 'heavy-import-client' : 'heavy-import', useClient ? 'high' : 'low', f, lineOf(code, m.index), m[0], useClient ? 'move to a Server Component, per-function import or dynamic()' : 'on the server it does not weigh on the bundle; check whether it is used');
  }
  if (/\/layout\.(t|j)sx?$/.test(f) && /\b(cookies|headers|draftMode)\(\)/.test(code)) emit('layout-dynamic', 'medium', f, lineOf(code, code.search(/\b(cookies|headers|draftMode)\(\)/)), 'request API in a layout', 'isolate it in a component inside <Suspense>');
  for (const m of code.matchAll(/export\s+const\s+(dynamic|revalidate|fetchCache)\s*=\s*([^;\n]+)/g)) emit('segment-config', CC || /force-dynamic|=\s*0/.test(m[0]) ? 'medium' : 'low', f, lineOf(code, m.index), m[0], CC ? "with cacheComponents these no longer exist: use 'use cache' + cacheLife or <Suspense>" : 'valid without cacheComponents; force-dynamic or revalidate = 0 make the route dynamic: check whether it is needed');
  if (/(['"])use cache(: \w+)?\1/.test(code) && !/cacheLife\(/.test(code)) emit('use-cache-no-cachelife', 'low', f, lineOf(code, code.search(/use cache/)), "'use cache' without cacheLife", 'add an explicit cacheLife(...)');
}
console.error(JSON.stringify({ files: files.length, byRule: counts }, null, 1));
```

| Rule | Why it matters | Typical sev. |
|---|---|---|
| `img-not-next-image` | no srcset, no modern format, no lazy loading and, if width/height are missing, CLS | High (Medium if SVG) |
| `image-fill-no-sizes` | without `sizes`, the browser assumes `100vw` and downloads the largest version | High |
| `image-responsive-no-sizes` | fluid image with a fixed `width`: Next only generates 1x/2x | Medium |
| `image-preload-multiple`, `image-priority-deprecated` | preloading several competes with the LCP; in Next 16 `priority` is deprecated | Medium / Low |
| `google-fonts-link`, `google-fonts-css` | blocking external CSS + extra connection; `next/font` self-hosts it | High |
| `script-third-party-early`, `script-before-interactive`, `script-not-next-script` | third-party JS competing with hydration (INP, TBT) | Medium |
| `iframe-video-no-facade` | a YouTube embed downloads hundreds of KB of JS before anyone presses play | Medium |
| `video-autoplay`, `video-no-poster`, `video-preload` | data usage and LCP; without `poster` an empty gap remains | Medium |
| `use-client-unnecessary`, `use-client-for-navigation` | everything hanging from a `"use client"` goes into the bundle and hydrates | Medium |
| `heavy-import-client` | moment, full lodash, chart.js… in the browser bundle | High |
| `layout-dynamic`, `segment-config` | `cookies()` in a layout makes everything dynamic; with `cacheComponents`, `dynamic`/`revalidate` no longer exist (without it they are valid: only `force-dynamic` or `revalidate = 0` are flagged) | Medium |
| `images-no-avif`, `images-unoptimized-global` | AVIF saves ~20 % compared to WebP (slower to encode); `unoptimized` disables everything | Low / High |

If `qa-code-optimization` has already been run, reuse its `"use client"` and heavy-import findings and focus here on their measured impact.

## Step 7. /public weights and bundle per route

```bash
node /tmp/qa-performance-cwv/assets-bundle.mjs . > /tmp/qa-performance-cwv/assets.json   # after next build
```

`assets-bundle.mjs`:

```js
// assets-bundle.mjs: inventory of /public weights and first-load JS per route from .next (after next build).
// Usage: node assets-bundle.mjs <project-root> > assets.json
import { readFileSync, readdirSync, statSync, existsSync, openSync, readSync, closeSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';

const ROOT = process.argv[2] || '.';
const kb = n => Math.round(n / 102.4) / 10;
const walk = (d, out = []) => { if (!existsSync(d)) return out; for (const n of readdirSync(d)) { const p = join(d, n);
  try { statSync(p).isDirectory() ? walk(p, out) : out.push(p); } catch {} } return out; };

// 1. /public: size, real type (magic bytes), usage in the code and thresholds
const K = 1024, LIMITS = { image: 200 * K, svg: 50 * K, video: 5 * K * K, font: 100 * K, other: 500 * K }; // indicative, KiB
const kind = e => /\.(jpe?g|png|webp|avif|gif)$/i.test(e) ? 'image' : e === '.svg' ? 'svg' : /\.(mp4|webm|mov|ogv)$/i.test(e) ? 'video' : /\.(woff2?|ttf|otf)$/i.test(e) ? 'font' : 'other';
const magic = p => { const b = Buffer.alloc(16); const fd = openSync(p, 'r'); readSync(fd, b, 0, 16, 0); closeSync(fd);
  const h = b.toString('hex'), a = b.toString('latin1');
  return h.startsWith('ffd8ff') ? 'jpeg' : h.startsWith('89504e47') ? 'png' : a.slice(8, 12) === 'WEBP' ? 'webp' : /ftyp(avif|avis)/.test(a) ? 'avif'
    : a.startsWith('GIF8') ? 'gif' : /ftyp/.test(a) ? 'mp4' : h.startsWith('1a45dfa3') ? 'webm' : a.startsWith('wOF2') ? 'woff2' : a.startsWith('wOFF') ? 'woff' : /^\s*(<\?xml|<svg)/.test(a) ? 'svg' : 'unknown'; };
const srcText = walk(ROOT).filter(p => !/node_modules|\.next|\/public\//.test(p) && /\.(tsx?|jsx?|mdx?|css|json)$/.test(p))
  .map(p => { try { return readFileSync(p, 'utf8'); } catch { return ''; } }).join('\n');
const pub = walk(join(ROOT, 'public')).map(p => { const size = statSync(p).size, e = extname(p).toLowerCase(), k = kind(e), real = magic(p);
  const issues = [];
  if (size > LIMITS[k]) issues.push(`weighs ${kb(size)} KB (> ${kb(LIMITS[k])} KB indicative for ${k})`);
  if (k === 'image' && !['jpeg', 'png', 'webp', 'avif', 'gif'].includes(real)) issues.push(`not a valid image (header: ${real})`);
  if (k === 'image' && /png|jpeg/.test(real) && size > 100 * K) issues.push('legacy format: serve via next/image (WebP/AVIF) or convert');
  if (k === 'svg' && size > 10e3 && /<image|base64/.test(readFileSync(p, 'utf8'))) issues.push('SVG with embedded bitmap');
  const used = srcText.includes(basename(p));
  if (!used) issues.push('not referenced in the code (leftover?)');
  return { file: relative(ROOT, p), kb: kb(size), kind: k, header: real, used, issues, sev: !issues.length ? null : size > K * K || /valid image/.test(issues.join()) ? 'high' : size > LIMITS[k] || /legacy|bitmap/.test(issues.join()) ? 'medium' : 'low' };
}).sort((a, b) => b.kb - a.kb);

// 2. First-load JS per route (Next 16: .next/diagnostics/route-bundle-stats.json, undocumented; otherwise build-manifest)
const NEXT = join(ROOT, '.next');
const comp = {};
const sizeOf = rel => { const p = join(ROOT, rel.startsWith('.next') ? rel : join('.next', rel));
  if (!comp[p]) { try { const b = readFileSync(p); comp[p] = { raw: b.length, gzip: gzipSync(b, { level: 9 }).length, br: brotliCompressSync(b).length }; } catch { comp[p] = { raw: 0, gzip: 0, br: 0 }; } } return comp[p]; };
let routes = [], source = null;
const rbs = join(NEXT, 'diagnostics/route-bundle-stats.json');
if (existsSync(rbs)) { source = rbs; routes = JSON.parse(readFileSync(rbs, 'utf8')).map(r => ({ route: r.route, chunks: r.firstLoadChunkPaths })); }
else if (existsSync(join(NEXT, 'app-build-manifest.json'))) { source = 'app-build-manifest.json';
  routes = Object.entries(JSON.parse(readFileSync(join(NEXT, 'app-build-manifest.json'), 'utf8')).pages).map(([route, ch]) => ({ route, chunks: ch.filter(c => c.endsWith('.js')) })); }
const BUDGET_GZ = Number(process.env.JS_BUDGET_KB || 200);
const byRoute = routes.map(r => { const t = r.chunks.reduce((a, c) => { const s = sizeOf(c); return { raw: a.raw + s.raw, gzip: a.gzip + s.gzip, br: a.br + s.br }; }, { raw: 0, gzip: 0, br: 0 });
  return { route: r.route, chunks: r.chunks.length, jsKB: kb(t.raw), jsGzipKB: kb(t.gzip), jsBrotliKB: kb(t.br), overBudget: kb(t.gzip) > BUDGET_GZ }; }).sort((a, b) => b.jsGzipKB - a.jsGzipKB);
const chunks = walk(join(NEXT, 'static')).filter(p => /\.(js|css)$/.test(p)).map(p => ({ file: relative(ROOT, p), kb: kb(statSync(p).size), gzipKB: kb(gzipSync(readFileSync(p)).length) })).sort((a, b) => b.kb - a.kb);
const media = walk(join(NEXT, 'static/media')).map(p => ({ file: basename(p), kb: kb(statSync(p).size) })).sort((a, b) => b.kb - a.kb);
console.log(JSON.stringify({ public: { totalKB: kb(pub.reduce((a, x) => a + x.kb * 1024, 0)), withIssues: pub.filter(x => x.issues.length), noIssues: pub.filter(x => !x.issues.length).length },
  firstLoadJS: { source, budgetGzipKB: BUDGET_GZ, byRoute }, largestChunks: chunks.slice(0, 10), nextMedia: media.slice(0, 10),
  warning: source ? null : 'No build found: run next build first' }, null, 1));
```

It detects heavy files, images that aren't what they claim to be (binary header), large JPG/PNG that should go through `next/image`, and assets nobody references. First-load JS comes from `.next/diagnostics/route-bundle-stats.json` (Next 16, undocumented internal file; if it changes, use the next step). Indicative budget: **≤ 200 KB gzip of first-load JS per route** on a corporate website; Next + React already take about 130–140 KB gzip, so the margin for the project's own code is small. Adjust with `JS_BUDGET_KB`.

**Which package weighs on each route (Turbopack, Next ≥ 16.4)**: the official analyzer replaces `@next/bundle-analyzer`, which only works with webpack. `next analyze` does not overwrite the `.next` build (verified): it only writes to `.next/diagnostics/analyze`.

```bash
npx next analyze --output --snapshot qa                                   # writes .next/diagnostics/analyze
npx next analyze export --snapshot qa > /tmp/qa-performance-cwv/graph.jsonl
node /tmp/qa-performance-cwv/bundle-graph.mjs /tmp/qa-performance-cwv/graph.jsonl 8 > /tmp/qa-performance-cwv/bundle.json
```

`bundle-graph.mjs`:

```js
// bundle-graph.mjs: summarises the Turbopack analyzer graph (Next >= 16.4) per route: client JS per package and the project's own modules.
// Usage: npx next analyze --output --snapshot qa && npx next analyze export --snapshot qa > graph.jsonl
//        node bundle-graph.mjs graph.jsonl [top=8] > bundle.json
import { readFileSync } from 'node:fs';
const [file, topArg = '8'] = process.argv.slice(2), TOP = Number(topArg);
const kb = n => Math.round(n / 102.4) / 10;
const routes = {};
const R = r => (routes[r] ??= { initial: new Set(), parts: [] });
for (const line of readFileSync(file, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let o; try { o = JSON.parse(line); } catch { continue; }
  if (o.type === 'group') for (const out of o.outputs || []) R(o.route).initial.add(out);   // groups loaded when the route renders
  else if (o.type === 'part' && o.filename?.startsWith('[client-fs]')) R(o.route).parts.push(o);
}
const pkgOf = p => { const m = p.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/); return m ? m[1] : p.startsWith('[project]/') ? '(project)' : '(other)'; };
const HEAVY = /^(moment|lodash|chart\.js|three|@mui\/|xlsx|pdfjs-dist|highlight\.js|prismjs|swiper|gsap|framer-motion|motion|@fortawesome|date-fns|recharts|d3|mapbox-gl|leaflet)/;
const out = [];
for (const [route, { initial, parts }] of Object.entries(routes)) {
  if (!parts.length) continue;
  const seen = new Set(), byPkg = {}, own = {}; let ini = 0, asyncB = 0, css = 0, media = 0;
  for (const p of parts) {
    const k = p.filename + '|' + p.source_path; if (seen.has(k)) continue; seen.add(k);
    const c = p.compressed_size ?? p.size ?? 0, isInitial = initial.has(p.filename);
    if (p.filename.endsWith('.css')) { css += c; continue; }
    if (!p.filename.endsWith('.js')) { media += c; continue; }                 // fonts, icons…
    if (/polyfill-nomodule/.test(p.source_path)) continue;                    // only for browsers without ES modules
    if (!isInitial) { asyncB += c; continue; }                                // dynamic()/import() and deferred chunks
    ini += c; const pkg = pkgOf(p.source_path); byPkg[pkg] = (byPkg[pkg] || 0) + c;
    if (pkg === '(project)') own[p.source_path.replace('[project]/', '')] = (own[p.source_path.replace('[project]/', '')] || 0) + c;
  }
  const packages = Object.entries(byPkg).sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([pkg, b]) => ({ pkg, compressedKB: kb(b), heavy: HEAVY.test(pkg) || undefined }));
  out.push({ route, initialJsCompressedKB: kb(ini), asyncJsKB: kb(asyncB), cssKB: kb(css), fontsAndMediaKB: kb(media), packages,
    ownModulesInClient: Object.entries(own).sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([m, b]) => ({ module: m, kb: kb(b) })) });
}
out.sort((a, b) => b.initialJsCompressedKB - a.initialJsCompressedKB);
console.log(JSON.stringify({ note: 'compressed_size from the analyzer, summed per module: somewhat overestimates the real gzip of the chunk; use it to compare. "next" includes react-dom (it is compiled inside next).', routes: out }, null, 1));
```

Look for packages flagged `heavy` and large own modules in `ownModulesInClient`. To see the import chain of a module, open the interactive UI (`npx next analyze`, port 4000). In Next 16.0 there is no Turbopack analyzer (use next build --webpack with @next/bundle-analyzer, with permission); in 16.1–16.3 there is only the UI with next experimental-analyze, without export, and in Next 15 or with `next build --webpack`, use `ANALYZE=true` with `@next/bundle-analyzer` (with permission, because it touches `next.config`).

## Step 8. Next.js-specific manual review

- **LCP image**: it must be `next/image` with `preload` (Next 16) or, better, `loading="eager"` + `fetchPriority="high"`; never `loading="lazy"`. Only one per page. If it's a CSS background (`background-image`), the browser discovers it late: switch it to `<Image fill sizes="100vw">`.
- **`sizes`** consistent with the real layout (`(max-width: 768px) 100vw, 50vw`); check it with `image-delivery-insight`. Formats: by default only WebP; AVIF with `images.formats: ['image/avif', 'image/webp']`. With Next 16, a `quality` outside `images.qualities` is snapped to the closest allowed value.
- **Fonts**: `next/font` with `subsets`, only the weights used (or a variable font) and `display: 'swap'` (the default). Each font declared in the root layout is **preloaded on every page**: if one (e.g. the mono) is used on a single page, import it only there or use `preload: false`.
- **`next/script`**: `beforeInteractive` only for critical things; `afterInteractive` (default) for what's needed early; `lazyOnload` for chat, widgets or maps. `worker` still doesn't work with the App Router. For GTM, GA, YouTube and Maps there is `@next/third-parties` (experimental) with facades.
- **Server vs Client**: `"use client"` as low in the tree as possible (interactive leaves), never on layouts or whole pages.
- **`dynamic()`** for what isn't visible on load (modals, carousels, maps, charts). `ssr: false` only inside Client Components.
- **Cache Components**: `'use cache'` always with `cacheLife`; per-request data inside `<Suspense>` so the rest goes into the static shell. With PPR, a nonce-based CSP is not compatible.
- **Video**: `poster`, `preload="none"`, no heavy autoplay on mobile; if autoplay is used, `muted` + `playsInline`, short and compressed.
- **/public caching**: `next start` serves `/public` with `Cache-Control: public, max-age=0`, while `/_next/static` gets `immutable` for one year. Statically imported images (`import foto from './foto.jpg'`) are hashed and get long caching.
- **Animations**: only `transform` and `opacity`; animating `top`, `height` or `margin` causes CLS and layout work.

## Severity

| Level | Examples in this phase |
|---|---|
| **Critical** | LCP > 4 s or CLS > 0.25 on mobile (field, or lab if there is no field data) on home or conversion; multi-MB image as the LCP; page that never finishes loading |
| **High** | LCP 2.5–4 s; INP > 200 ms; CLS 0.1–0.25; Lighthouse < 50; unoptimized `<img>` above the fold; Google Fonts with `<link>`; heavy library on the client; first-load JS well above the budget |
| **Medium** | Lighthouse 50–89; unnecessary `"use client"`; third parties with an early strategy; embed without facade; video without `poster`; missing `sizes` below the fold; leftover asset > 1 MB in `/public` |
| **Low** | deprecated `priority`; AVIF not enabled; implicit `cacheLife`; SVG not optimized with SVGO |

## Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

Save it as `performance-cwv.md` (and the scripts' JSON in `performance-cwv/`).

```markdown
# Performance and Core Web Vitals — <project> — <date> — commit <hash>

## Verdict
| Route | LCP | INP | CLS | Mobile Lighthouse (median) | Source |
|---|---|---|---|---|---|
| / | 3.1 s (needs improvement) | — | 0.05 | 91 | lab (no CrUX data) |

## Findings
### PERF-001 · High · Google Fonts with <link> in the layout
- Evidence: app/layout.tsx:22 · `render-blocking-insight` on / and /servicios · LCP render delay 1.3 s
- Why it matters: external CSS that blocks first paint and opens another connection
- Fix: `import { Inter } from 'next/font/google'; const inter = Inter({ subsets: ['latin'], display: 'swap' })` and remove the `<link>`

## Bundle and assets (table per route, heavy packages, /public)
## Field data (CrUX) or why there is none
## What could not be measured (blocked third parties, INP without real interactions…)
```

Each finding includes evidence (file:line, URL, measurement), severity, why it matters and the fix with Next.js code where applicable.

## False positives and limitations

- `use-client-unnecessary` uses heuristics: a component may need the client because of a library that uses hooks internally. Confirm it by reading the file.
- `image-responsive-no-sizes` only sees classes and styles on the tag; if the width comes from the container, it doesn't detect it.
- An "unreferenced" asset may be used from the CMS or from MDX content; ask before proposing to delete it.
- Lighthouse and Playwright locally don't reflect the real network or the CDN. The official verdict is CrUX's.

## If the user asks for fixes

Order: (1) the LCP element of each template (format, `sizes`, priority); (2) blocking resources (fonts, external CSS, `beforeInteractive` scripts); (3) CLS (dimensions, reserved space for embeds and banners); (4) client JS (`"use client"`, heavy imports, `dynamic()`, third parties to `lazyOnload`); (5) caching and rendering (`'use cache'`, Suspense). After each block: `next build`, same scripts with the same routes and runs, and a before/after table in the report.

## Sources

- Thresholds: https://web.dev/articles/vitals · CrUX: https://developer.chrome.com/docs/crux/api and https://developer.chrome.com/docs/crux/release-notes
- Lighthouse 13: https://developer.chrome.com/blog/lighthouse-13-0 · PSI API: https://developers.google.com/speed/docs/insights/v5/get-started
- Next.js 16 (docs included in `node_modules/next/dist/docs/`): guides *package-bundling*, *production-checklist*, *videos*, *lazy-loading*; reference for `Image`, `Font`, `Script`, `cacheComponents`
