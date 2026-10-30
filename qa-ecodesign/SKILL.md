---
name: qa-ecodesign
description: Audits the ecodesign of a website (Next.js or other) by measuring with Playwright the transferred weight and the requests per page, estimating the footprint with CO2.js and the Sustainable Web Design v4 model (A+ to F scale), checking green hosting and reviewing images, video, fonts and third parties against RGESN 2024 and the W3C Web Sustainability Guidelines. Use it whenever someone asks to review web sustainability, carbon footprint, CO2, Website Carbon, page weight, a lightweight website or green hosting, even if ecodesign isn't mentioned.
---

# Web ecodesign audit

The goal is to answer with measurements: **how much data does each page move, which part is unnecessary and what approximate footprint does it represent?** The factor that weighs most in a website's footprint is data transfer: every kB is paid for in the network, the server and, above all, on the user's device. Websites generated from Figma with AI tend to export images at 2× or 3× the displayed size, autoplay videos in the hero, pile up font families and add third-party embeds and scripts that load even if nobody uses them.

**By default no code is modified**: the report is delivered and fixes are made only if the user asks. Tools are installed in `/tmp/qa-ecodesign/`, never in the project.

Boundaries: Core Web Vitals, per-route bundle and `/public` weights belong to `qa-performance-cwv` (its `assets-bundle.mjs` script finds leftover assets); the choice of analytics and its consent, to `qa-analytics` and `qa-legal`; behaviour on other devices, to `qa-responsive-browsers`. Here we measure the **cost in data and emissions**.

## Step 0. Context

1. **URL to measure**: production or staging. Local can be measured, but without CDN or Brotli, and without being able to check the hosting.
2. **Hosting and domain** (Vercel, Netlify, own server…) and **where the audience is** (Spain by default): this changes the carbon intensity of the electricity grid used in the local estimate.
3. **Representative routes**: home, a content page with images, one with video or embeds if there is one, and contact.
4. **Cookie banner**: if there is one, measure before accepting (what loads without consent) and, if the user asks, after. The legality of what loads belongs to `qa-legal`.

## Step 1. Tools

```bash
mkdir -p /tmp/qa-ecodesign && cd /tmp/qa-ecodesign && npm init -y >/dev/null \
  && npm i @tgwf/co2@0.19 playwright >/dev/null && npx playwright install chromium
```

Tested with `@tgwf/co2` 0.19.0, Playwright 1.6x and Node 22. Write the `page-weight-co2.mjs` script there.

## Step 2. Measure weight, requests and media

```bash
cd /tmp/qa-ecodesign && node page-weight-co2.mjs https://staging.ejemplo.es / /servicios /contacto --grid=ESP > eco.json
```

What it does and why:

- Mobile (412×823, DPR 2.625) with an **empty cache**: it is the first visit, the worst case and the one Website Carbon and the rating scale use.
- It counts the **bytes on the wire** of each request (Chrome's `encodedDataLength`: compressed and with headers), not the size of the files on disk.
- It **scrolls** to the end and waits: that way lazy images, embeds and deferred third parties come in, which are also downloaded in a real visit. `initialKB` is what loads without scrolling and `afterScrollKB` what arrives afterwards.
- It reloads in the same session to measure the **repeat visit** (`repeatKB`): if it still downloads a lot, the HTTP cache is not working.
- It inspects the DOM: images displayed much smaller than their resolution, autoplay videos, embeds, loaded fonts and whether the CSS honours `prefers-color-scheme`.

`page-weight-co2.mjs`:

```js
// page-weight-co2.mjs: measures per page the real transfer (bytes on the wire, empty cache and repeat visit), requests by type and
// by origin, oversized media, autoplay and fonts; estimates CO2e with CO2.js (Sustainable Web Design v4).
// Usage: node page-weight-co2.mjs https://staging.ejemplo.es / /servicios [--grid=ESP] [--green=auto|true|false] [--no-scroll] > eco.json
import { chromium } from 'playwright';
import { co2, averageIntensity } from '@tgwf/co2';
import { check as greenCheck } from '@tgwf/co2/hosting';

const args = process.argv.slice(2), opt = (n, d) => (args.find(a => a.startsWith(`--${n}=`)) || `=${d}`).split('=')[1];
const [base, ...paths] = args.filter(a => !a.startsWith('--'));
const GRID = opt('grid', 'ESP'), GREEN = opt('green', 'auto'), SCROLL = !args.includes('--no-scroll');
const BUDGET = { targetKB: 975, idealKB: 530, requests: 40, thirdParties: 5 };   // see SKILL.md: 530 kB ≈ rating A, 975 kB ≈ B limit
const host = new URL(base).hostname, site = h => h.split('.').slice(-2).join('.');
const kB = b => Math.round(b / 100) / 10;                                         // decimal kB (the SWD model uses GB = 1e9 bytes)

let green = GREEN === 'true', greenInfo = GREEN === 'auto' ? 'not checked' : `forced by parameter (${GREEN})`;
if (GREEN === 'auto' && !/^(localhost|127\.|192\.168\.|10\.)/.test(host)) {
  try { const r = await Promise.race([greenCheck(host, { verbose: true, userAgentIdentifier: 'qa-ecodesign' }), new Promise((_, j) => setTimeout(() => j(new Error('timeout')), 8000))]);
    green = !!r.green; greenInfo = r.green ? `green (${r.hosted_by || 'verified provider'})` : 'not verified as green by Green Web Foundation'; }
  catch (e) { greenInfo = `could not query the Green Web Foundation API (${e.message})`; } }

const swd = new co2({ model: 'swd', version: 4, rating: true });
const gi = averageIntensity.data[GRID];
const visitOpts = { dataReloadRatio: 0, firstVisitPercentage: 1, returnVisitPercentage: 0 };     // first visit, empty cache
const estimate = bytes => ({ global: swd.perVisit(bytes, green),                                 // comparable with Website Carbon and the A+–F scale
  [GRID]: gi ? +swd.perVisitTrace(bytes, green, { ...visitOpts, gridIntensity: { device: { country: GRID }, dataCenter: { country: GRID }, network: { country: GRID } } }).co2.total.toFixed(4) : 'unknown country code' });

const browser = await chromium.launch();
const pages = [];
for (const path of (paths.length ? paths : ['/'])) {
  const url = new URL(path, base).href;
  const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  const req = new Map(); let phase = 'initial';
  cdp.on('Network.requestWillBeSent', e => { if (!req.has(e.requestId)) req.set(e.requestId, { url: e.request.url, type: e.type, phase, bytes: 0 }); });
  cdp.on('Network.responseReceived', e => { const r = req.get(e.requestId); if (r) { r.status = e.response.status; r.mime = e.response.mimeType; r.type = e.type || r.type; } });
  cdp.on('Network.loadingFinished', e => { const r = req.get(e.requestId); if (r) r.bytes = e.encodedDataLength; });
  cdp.on('Network.loadingFailed', e => { const r = req.get(e.requestId); if (r) r.failed = e.errorText; });
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    if (SCROLL) { phase = 'scroll';
      for (let i = 0; i < 15; i++) { await page.mouse.wheel(0, 800); await page.waitForTimeout(250); }
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(2000); }   // autoplay, lazy-load, deferred third parties
    const dom = await page.evaluate(() => ({
      imgs: [...document.images].filter(i => i.currentSrc && i.naturalWidth).map(i => ({ src: i.currentSrc.slice(0, 120), natural: `${i.naturalWidth}x${i.naturalHeight}`, displayed: `${Math.round(i.clientWidth)}x${Math.round(i.clientHeight)}`,
        ratio: i.clientWidth ? +(i.naturalWidth / (i.clientWidth * devicePixelRatio)).toFixed(1) : null, lazy: i.loading === 'lazy' })),
      videos: [...document.querySelectorAll('video')].map(v => ({ src: (v.currentSrc || v.src || '').slice(0, 120), autoplay: v.autoplay, muted: v.muted, poster: !!v.poster, preload: v.preload, loop: v.loop })),
      iframes: [...document.querySelectorAll('iframe')].map(f => ({ src: f.src.slice(0, 120), lazy: f.loading === 'lazy' })),
      fonts: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family} ${f.weight} ${f.style}`))],
      prefersDark: !![...document.styleSheets].find(s => { try { return [...s.cssRules].some(r => /prefers-color-scheme/.test(r.conditionText || r.media?.mediaText || '')); } catch { return false; } }) }));
    const all = [...req.values()].filter(r => !r.url.startsWith('data:'));
    const total = all.reduce((a, r) => a + r.bytes, 0), initial = all.filter(r => r.phase === 'initial').reduce((a, r) => a + r.bytes, 0);
    const byType = {}, byOrigin = {};
    for (const r of all) { const t = (r.type || 'Other'); byType[t] = byType[t] || { n: 0, kB: 0 }; byType[t].n++; byType[t].kB = kB(byType[t].kB * 1000 + r.bytes);
      let h; try { h = new URL(r.url).hostname; } catch { h = '?'; } const o = site(h) === site(host) ? '(first-party)' : h;
      byOrigin[o] = byOrigin[o] || { n: 0, kB: 0 }; byOrigin[o].n++; byOrigin[o].kB = kB(byOrigin[o].kB * 1000 + r.bytes); }
    // Repeat visit: same session, the HTTP cache should avoid almost everything
    for (const r of req.values()) r.repeat = false; phase = 'repeat'; const before = new Set(req.keys());
    await page.goto(url, { waitUntil: 'load', timeout: 60000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const repeat = [...req.entries()].filter(([id]) => !before.has(id)).map(([, r]) => r);
    const repeatBytes = repeat.reduce((a, r) => a + r.bytes, 0);
    const thirdParties = Object.keys(byOrigin).filter(o => o !== '(first-party)');
    const issues = [];
    if (total > BUDGET.targetKB * 1000) issues.push({ sev: total > 2.4e6 ? 'high' : 'medium', msg: `weight ${kB(total)} kB > ${BUDGET.targetKB} kB` });
    if (all.length > BUDGET.requests) issues.push({ sev: 'medium', msg: `${all.length} requests > ${BUDGET.requests}` });
    if (thirdParties.length > BUDGET.thirdParties) issues.push({ sev: 'medium', msg: `${thirdParties.length} third-party domains` });
    for (const i of dom.imgs.filter(i => i.ratio > 1.5 && !/\.svg(\?|$)|^data:image\/svg/.test(i.src)))   // SVG: scales at no cost
      issues.push({ sev: i.ratio > 3 ? 'high' : 'medium', msg: `image ${i.ratio}x larger than needed (${i.natural} for ${i.displayed} css px): ${i.src}` });
    for (const v of dom.videos.filter(v => v.autoplay)) issues.push({ sev: 'medium', msg: `autoplay video${v.loop ? ' in a loop' : ''}${v.poster ? '' : ' without poster'}: ${v.src}` });
    for (const f of dom.iframes.filter(f => /youtube|vimeo|google\.com\/maps/.test(f.src))) issues.push({ sev: 'medium', msg: `third-party embed loaded without interaction: ${f.src}` });
    const fontB = all.filter(r => r.type === 'Font').reduce((a, r) => a + r.bytes, 0);
    if (fontB > 100e3) issues.push({ sev: 'low', msg: `fonts: ${kB(fontB)} kB in ${all.filter(r => r.type === 'Font').length} files (subset, fewer weights/families, woff2)` });
    if (new Set(dom.fonts.map(f => f.split(' ')[0])).size > 2) issues.push({ sev: 'low', msg: `${new Set(dom.fonts.map(f => f.split(' ')[0])).size} font families loaded` });
    if (repeatBytes > total * 0.2) issues.push({ sev: 'medium', msg: `the repeat visit downloads ${kB(repeatBytes)} kB (${Math.round(repeatBytes / total * 100)} %): review Cache-Control` });
    for (const r of all.filter(r => r.failed || r.status >= 400)) issues.push({ sev: 'low', msg: `failed request (${r.failed || r.status}): ${r.url.slice(0, 100)}` });
    pages.push({ url, transferKB: kB(total), initialKB: kB(initial), afterScrollKB: kB(total - initial), requests: all.length, repeatKB: kB(repeatBytes),
      co2gPerVisit: estimate(total), byType, byOrigin, largest: all.sort((a, b) => b.bytes - a.bytes).slice(0, 8).map(r => ({ kB: kB(r.bytes), type: r.type, url: r.url.slice(0, 110) })),
      images: dom.imgs.length, videos: dom.videos, fonts: dom.fonts, darkModeCSS: dom.prefersDark, issues });
  } catch (e) { pages.push({ url, error: e.message.split('\n')[0] }); }
  await ctx.close();
}
await browser.close();
const ok = pages.filter(p => !p.error);
console.log(JSON.stringify({ model: 'Sustainable Web Design v4 (CO2.js), g CO2e per new visit', hosting: { host, green, info: greenInfo },
  intensity: { global: 494, [GRID]: gi ?? null, unit: 'g CO2e/kWh' }, budget: BUDGET,
  averageKB: ok.length ? kB(ok.reduce((a, p) => a + p.transferKB * 1000, 0) / ok.length) : null, pages }, null, 1));
```

Interpreting `issues`: an image ≥ 1.5× larger than needed (with screen density already accounted for) is direct waste; ≥ 3× is high. SVGs are excluded because they scale at no cost. Failed requests to third parties indicate, in an environment without Internet, that this weight **has not been measured**: say so in the report instead of taking the total as correct.

## Step 3. Estimate the footprint (and explain it well)

**Model**: Sustainable Web Design **v4** (SWDM v4), which has been the default model in CO2.js since 0.18 (February 2026) and the one Website Carbon has used since 14-07-2025. It converts bytes into energy with these intensities (kWh/GB, with GB = 10⁹ bytes):

| Segment | Operational | Embodied (manufacturing) |
|---|---|---|
| Data centre | 0.055 | 0.012 |
| Networks | 0.059 | 0.013 |
| Device | 0.080 | 0.081 |

In total, about 0.3 kWh/GB. By default it multiplies by the global average intensity (494 g CO2e/kWh). **Green hosting** only cancels the operational part of the data centre, so it improves the result by around 18 %; it does not bring it to zero.

**Rating scale** (SWDM v4, g CO2e per visit, with global intensity; the kB are HTTP Archive percentiles from 2023):

| Rating | g CO2e | Approx. equivalent weight |
|---|---|---|
| A+ | ≤ 0.040 | ≤ 272 kB |
| A | ≤ 0.079 | ≤ 531 kB |
| B | ≤ 0.145 | ≤ 976 kB |
| C | ≤ 0.209 | ≤ 1.41 MB |
| D | ≤ 0.278 | ≤ 1.88 MB |
| E | ≤ 0.359 | ≤ 2.42 MB |
| F | > 0.359 | > 2.42 MB |

The script gives two figures: `global` (with rating, comparable with Website Carbon and across websites) and the one for the grid of the country given with `--grid` (Spain: 146 g/kWh according to the CO2.js annual data). Use the global one for the rating and the local one only as context: the rating is calibrated with the global intensity.

How to present it to the client: it is an **order-of-magnitude estimate** based on a proxy (transferred data). It is useful to compare versions and pages, not to declare exact emissions. Do not turn the result into marketing claims ("carbon-neutral website"): environmental claims have their own rules.

If the user prefers the Website Carbon figure (`websitecarbon.com`), they can enter the public URL; the difference from this script comes from scrolling, caching and when it is measured.

## Step 4. Green hosting

```bash
curl -s https://api.thegreenwebfoundation.org/api/v3/greencheck/www.ejemplo.es
```

It returns `green: true/false` and, if green, `hosted_by` and `supporting_documents`. No key required. The script only queries it with `--green=auto` (the default) and, if the API does not respond, reports it as "could not query" without assuming anything. Note that it checks the domain serving the HTML: behind a CDN, the result is the CDN's. If the client knows their provider is green but it does not show up, they can request a listing in the Green Web Foundation directory or publish a `carbon.txt`.

## Step 5. Budgets

Propose budgets per template and justify them like this:

| Budget | Value | Justification |
|---|---|---|
| Page weight, target | ≤ 975 kB | B rating limit (976 kB; at 1,000 kB it is already C); the median mobile home page in 2025 is 2,559 kB (Web Almanac), so it is demanding but realistic |
| Page weight, ideal | ≤ 530 kB | A rating |
| Requests | ≤ 40 | the median mobile home page has 75; a corporate website does not need that many |
| Third-party domains | ≤ 5 | each one is a connection, someone else's JS and personal data |
| Main image | ≤ 200 kB, AVIF/WebP | usually the heaviest resource and the LCP |
| Fonts | ≤ 100 kB in total, woff2, subset | one variable family or 2–3 weights are enough |
| First-load JS | ≤ 200 kB gzip | details in `qa-performance-cwv` |

Additional reference: Alex Russell (2024) calculates that, to load in 3 s on P75 global devices and networks, an HTML-based website can afford about 1.4 MiB in total with only 75 KiB of JS. RGESN (criterion 6.1) requires the service to **set itself** a maximum weight and a request limit per screen, but gives no figures: the values in this table are the proposal.

## Step 6. Good practices to review

Check each point against the script output and the code. In brackets, the RGESN 2024 criterion (78 criteria, voluntary, published by Arcep and Arcom with ADEME in May 2024) and the W3C WSG guideline.

- **Images** (RGESN 5.1 and 5.2; WSG 2.9): appropriate format (AVIF/WebP for photos, optimised SVG for icons), tuned compression and size matching what is displayed. In Next.js, `next/image` with a correct `sizes` solves almost all of it.
- **Video and animation** (RGESN 4.1, priority; WSG 2.9): no autoplay. If the design requires a background video, it should be short, without audio, compressed, with a `poster`, `preload="none"` and a static alternative on mobile and with `prefers-reduced-motion`.
- **Fonts** (RGESN 4.8; WSG 2.11): limit families and weights; consider system fonts for body text.
- **Third parties** (RGESN 2.10 and 4.4; WSG 3.5): assess their impact when choosing them and load them only when the user activates them: facades for YouTube, Vimeo and Google Maps; chat or widgets on click. Whatever loads before consent is also a legal problem.
- **Cache** (RGESN 6.2): long `Cache-Control` and `immutable` for hashed assets (`/_next/static` already has it); `/public` is served with `max-age=0`, so it is better to import images so they get a hash.
- **Do not load what is not seen** (RGESN 6.5): lazy-load below the fold and no unnecessary preloads.
- **Static rendering**: in Next.js, the `○` or `◐` pages of the build are served from cache with no server work per visit.
- **Dark mode**: offer it if the user prefers it (WSG 3.9, `prefers-color-scheme`), but **do not sell it as a saving**: on LCD screens it saves nothing (the backlight uses the same) and on OLED, at the usual 30–50 % brightness, the measured saving was only 3–9 % (Purdue, 2021). Do not add JS to manage it either.
- **Content**: avoid automatic carousels, infinite scroll and pages that load the whole catalogue; paginate.

## Severity

| Level | Examples in this phase |
|---|---|
| **Critical** | Does not normally apply: ecodesign does not block a launch on its own. Use it only if a page exceeds ~10 MB or consumes data non-stop (large looping video) |
| **High** | Page > 2.4 MB (F rating); image ≥ 3× its displayed size or > 1 MB; heavy autoplay video on the home page |
| **Medium** | Page between 1 and 2.4 MB; > 40 requests; > 5 third-party domains; embeds without a facade; repeat visit downloading > 20 %; video without `poster` |
| **Low** | Fonts > 100 kB; more than 2 families; hosting not verified as green; no documented budgets |

## Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

Save it as `ecodesign.md` (with `eco.json` next to it).

```markdown
# Ecodesign — <project> — <date> — <measured URL>

## Summary
| Page | Weight (kB) | Requests | Third parties | Repeat visit | g CO2e (global) | Rating | g CO2e (ES grid) |
|---|---|---|---|---|---|---|---|
| / | 296 | 14 | 2 (not measured) | 1 kB | 0.044 | A | 0.024 |

Hosting: <green / not verified / could not query>. Model: SWDM v4 via CO2.js 0.19 (estimate).

## Findings
### E-001 · Medium · YouTube embed loaded without interaction on /servicios
- Evidence: app/servicios/page.tsx:10 · the iframe downloads the full player on load
- Why it matters: hundreds of kB and third-party JS on every visit, even if nobody watches the video
- Fix: `import { YouTubeEmbed } from '@next/third-parties/google'` or a facade with a thumbnail and click

## Proposed budgets
## Breakdown by type and by origin
## What could not be measured
```

## False positives and limitations

- The footprint is an estimate based on transfer: it does not reflect the server cost per dynamic request, the cost of AI training or use, or the device life cycle specifically.
- Without Internet access (or with a WAF that blocks automated browsers), third parties do not load and the weight comes out below reality.
- The first visit overestimates real usage if many users return; SWDM v4 allows weighting new and returning visits (`firstVisitPercentage`, `returnVisitPercentage`, `dataReloadRatio` in `perVisitTrace`), but without analytics data do not make up percentages.
- First-party versus third-party is decided by the last two levels of the domain: in `.com.es`, `.org.es` or `.co.uk` the whole suffix counts as "first-party". Review `byOrigin` manually in those cases.
- A large unused asset in `/public` does not weigh on the page, but it does on the deployment: it goes into the `qa-performance-cwv` report.

## If the user asks for fixes

Order by kB saved: (1) images (format, size, `sizes`); (2) video and embeds (remove autoplay, facades); (3) third parties (remove unused ones, load on interaction); (4) fonts; (5) cache. After each block, run `page-weight-co2.mjs` again with the same routes and add a before/after table with kB and g CO2e.

## Sources

- SWDM v4: https://sustainablewebdesign.org/estimating-digital-emissions/ · ratings: https://sustainablewebdesign.org/digital-carbon-ratings/
- CO2.js: https://developers.thegreenwebfoundation.org/co2js/models/overview/ · Green Web API: https://developers.thegreenwebfoundation.org/api/greencheck/v3/check-single-domain/
- Website Carbon: https://www.websitecarbon.com/how-does-it-work/
- RGESN 2024: https://www.arcep.fr/actualites/actualites-et-communiques/detail/n/environnement-rgesn-170524.html
- W3C WSG (Group Note Draft, 16-10-2026): https://www.w3.org/TR/web-sustainability-guidelines/
- Web Almanac 2025, Page Weight: https://almanac.httparchive.org/en/2025/page-weight
