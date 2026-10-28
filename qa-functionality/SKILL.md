---
name: qa-functionality
description: Functional testing of a corporate Next.js website before launch. Crawls internal and external links (404s, redirects, anchors), tests the menu, anchors and back button, forms without sending anything real to production, console errors, hydration errors and 4xx/5xx requests per page, 404 and error pages, tel:, mailto: and downloads. Use it whenever someone asks to test the website, check for broken links, verify forms, look at console errors or run functional QA before launch, even if "functionality" isn't mentioned.
---

# Functional QA

The goal is to answer one question with evidence: **does everything the user can click, fill in or visit work and give them a clear response?** In websites generated from Figma with AI it is common to find links to routes that were never created (`/servicioss`), buttons that are a `div` with `onClick`, orphan pages that nothing links to, forms that submit empty without showing any message, anchors to sections that do not exist and the default Next 404 page. The build catches none of this.

**By default no code is modified.** The report is delivered and fixes are made only if the user asks. No dependencies are installed in the project either: the tools go in `/tmp/qa-functionality/`.

**Never submit a real form to production.** The scripts intercept submissions with `page.route` and only let test data through to a local or staging environment.

## Step 0. Context

Find out before starting:

1. **Next version** (`package.json`). In Next 16.3+ `error.tsx` receives `retry` (stable; in 16.2 it was `unstable_retry`) in addition to `reset`; in 15 only `reset`. If `node_modules/next/dist/docs/` exists, check the exact version there.
2. **App Router or Pages Router**. In Pages the error pages are `pages/404.tsx`, `pages/500.tsx` and `pages/_error.tsx`.
3. **URL to test**. Use `next build && next start` or staging, never `next dev`: the dev server shows overlays and more verbose hydration messages, and does not reproduce the production cache.
4. **Form backend**: server action (`"use server"`), route handler (`app/api/**/route.ts`) or external service (Formspree, Resend, SendGrid, HubSpot, iframe). Ask where the messages should arrive and whether there is a staging environment with a test inbox.
5. **Planned antispam**: honeypot, Cloudflare Turnstile, reCAPTCHA, hCaptcha, rate limiting on the server or at the host.
6. **ripgrep**: the commands use `rg`. If it is not installed (`rg --version`), `brew install ripgrep` or replace `rg --files …` with `git ls-files -co --exclude-standard` and `rg -n` with `grep -rnE`.

## Step 1. Tools

```bash
mkdir -p /tmp/qa-functionality && cd /tmp/qa-functionality && npm init -y >/dev/null \
  && npm i playwright >/dev/null && npx playwright install chromium
```

Write the scripts from this document there. They are tested with Node 22 and Playwright 1.63 (the latest is 1.64.1). If the project already has Playwright, you can reuse its version.

## Step 2. Routes and special files

```bash
find app src/app -name 'page.*' -o -name 'route.*' 2>/dev/null | grep -v node_modules | sort
ls app/{not-found,error,global-error,global-not-found,loading}.* 2>/dev/null
rg -n "notFound\(\)|redirect\(" app src 2>/dev/null | head -30
```

| File | What to check | If missing |
|---|---|---|
| `app/not-found.tsx` | Exists, is in Spanish, links to home and keeps header and footer (it renders inside the root layout). Next adds `noindex` on its own | High: "404: This page could not be found." shows up in English |
| `app/error.tsx` | Has `'use client'`, offers a retry (`retry()` in 16.3+, `reset()` before) and does not show `error.message` to the user | High: a failure in one section takes the page down with "This page couldn't load" |
| `app/global-error.tsx` | `'use client'`, includes its own `<html lang="es">` and `<body>` and imports the styles (it does not inherit the layout or accept `metadata`) | Medium: root layout failures show the generic screen |
| `loading.tsx` or `<Suspense>` | Only on routes with slow data | Low |

`not-found.tsx` responds 404 if it resolves before streaming starts; if `notFound()` is called later, the status stays 200 with `noindex` (soft 404). Check it with step 4.

## Step 3. Links

The crawler renders each page with Chromium (it sees the links React paints) and adds the routes from `app/**/page.*` and from `sitemap.xml` as seeds, because pages that nothing links to are not found by following links.

```bash
cd /tmp/qa-functionality
node crawl-links.mjs http://localhost:3000 --app-dir=/path/to/project/app --external --out=links.json
```

`crawl-links.mjs`:

```js
// crawl-links.mjs: crawls the site with Playwright (rendered DOM) and checks internal and external links, anchors, tel:, mailto: and downloads.
// Usage: node crawl-links.mjs <baseUrl> [--app-dir=app] [--routes=/,/contacto] [--external] [--max-pages=150] [--out=links.json]
//   --app-dir   adds the static routes from app/**/page.* as seeds (orphan pages are not found by following links)
//   --external  also checks external links (HEAD and, if it fails, GET; 4 in parallel; 10 s timeout)
import { chromium, request as pwRequest } from 'playwright';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [base, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map(a => { const [k, v = true] = a.replace(/^--/, '').split('='); return [k, v]; }));
const B = new URL(base), MAX = +(opt['max-pages'] || 150);
const findings = [], pages = {}, checked = new Map();
const add = (sev, type, pageUrl, href, detail, text) => findings.push({ sev, type, page: pageUrl, href, text: text?.slice(0, 60), detail });

function appRoutes(dir, prefix = '') {                       // static App Router routes
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (/^[@_]|^\[|^api$/.test(e)) continue;               // slots, private, dynamic, API
      out.push(...appRoutes(p, /^\(.*\)$/.test(e) ? prefix : `${prefix}/${e}`));
    } else if (/^page\.(t|j)sx?$|^page\.mdx$/.test(e)) out.push(prefix || '/');
  }
  return out;
}
const seeds = new Set(['/']);
if (opt['app-dir']) appRoutes(opt['app-dir']).forEach(r => seeds.add(r));
if (opt.routes) opt.routes.split(',').forEach(r => seeds.add(r));
const UA = 'Mozilla/5.0 (QA link check) Chrome/140';
const api = await pwRequest.newContext({ timeout: 10000, userAgent: UA });
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy;   // corporate network: external links go through the proxy
const apiExt = PROXY ? await pwRequest.newContext({ timeout: 10000, userAgent: UA, proxy: { server: PROXY } }) : api;
try {                                                         // sitemap.xml if it exists
  const sm = await api.get(new URL('/sitemap.xml', B).href);
  if (sm.ok()) for (const m of (await sm.text()).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) { const u = new URL(m[1]); if (u.host === B.host) seeds.add(u.pathname); }
} catch {}

const browser = await chromium.launch();
const page = await (await browser.newContext({ locale: 'es-ES' })).newPage();
const queue = [...seeds].map(p => new URL(p, B).href);
const norm = u => { const x = new URL(u); x.hash = ''; return x.href; };

async function status(url, external) {                       // status + redirect chain
  if (checked.has(url)) return checked.get(url);
  const chain = []; let cur = url, res, err;
  for (let i = 0; i < 6; i++) {
    try {
      res = external ? await apiExt.head(cur, { maxRedirects: 0 }).catch(() => null) : await api.get(cur, { maxRedirects: 0 });
      if (external && (!res || [403, 405, 501].includes(res.status()))) res = await apiExt.get(cur, { maxRedirects: 0 });   // many servers reject HEAD
    } catch (e) { err = e.message.split('\n')[0]; break; }
    const loc = res.headers()['location'];
    if (res.status() >= 300 && res.status() < 400 && loc) { chain.push(`${res.status()} → ${loc}`); cur = new URL(loc, cur).href; continue; }
    break;
  }
  const r = { status: err ? 0 : res.status(), chain, final: cur, error: err, type: res?.headers()['content-type'], size: +(res?.headers()['content-length'] || 0) };
  checked.set(url, r); return r;
}

while (queue.length && Object.keys(pages).length < MAX) {
  const url = norm(queue.shift());
  if (pages[url]) continue;
  let resp; try { resp = await page.goto(url, { waitUntil: 'load', timeout: 30000 }); await page.waitForTimeout(400); }
  catch (e) { pages[url] = { error: e.message.split('\n')[0] }; add('High', 'page-load-failed', url, url, pages[url].error); continue; }
  if (!/text\/html/.test(resp?.headers()['content-type'] || '')) { pages[url] = { status: resp?.status(), noHtml: true }; continue; }
  const data = await page.evaluate(() => {
    const where = el => el.closest('header') ? 'header' : el.closest('nav') ? 'nav' : el.closest('footer') ? 'footer' : 'main';
    const links = [...document.querySelectorAll('a[href], area[href], a:not([href])')].map(a => ({
      raw: a.getAttribute('href'), abs: a.href, text: (a.innerText || a.getAttribute('aria-label') || a.querySelector('img')?.alt || '').trim(),
      target: a.getAttribute('target'), rel: a.getAttribute('rel') || '', download: a.hasAttribute('download'), where: where(a) }));
    const ids = [...document.querySelectorAll('[id], a[name]')].map(e => e.id || e.getAttribute('name'));
    const fakeLinks = [...document.querySelectorAll('body *')].filter(el => !el.closest('a,button,label,summary,input,select,textarea,[role=button],[role=link],[tabindex]')
      && getComputedStyle(el).cursor === 'pointer' && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
      .map(el => `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 40)}"`);
    return { links, ids, fakeLinks };
  });
  pages[url] = { status: resp.status(), ids: data.ids, links: data.links.length };
  if (resp.status() >= 400) add('High', 'page-error', url, url, `HTTP ${resp.status()}`);
  for (const f of data.fakeLinks) add('High', 'clickable-not-link', url, null, `${f}: cursor:pointer without <a>/<button>; not keyboard-navigable and not crawlable`);
  for (const l of data.links) {
    const raw = (l.raw ?? '').trim();
    if (l.raw === null) { add('Medium', 'a-without-href', url, null, '<a> without href: neither a link nor a keyboard focus target', l.text); continue; }
    if (!raw || raw === '#' || /^javascript:/i.test(raw)) { add('High', 'empty-href', url, raw, 'empty href, "#" or javascript:', l.text); continue; }
    if (l.target === '_blank' && !/noopener|noreferrer/.test(l.rel)) add('Low', 'blank-without-rel', url, raw, 'target=_blank without rel="noopener noreferrer"', l.text);
    if (/^tel:/i.test(raw)) { const d = raw.slice(4).replace(/[\s().-]/g, ''); if (!/^\+?\d{6,15}$/.test(d)) add('High', 'invalid-tel', url, raw, 'tel: with invalid characters', l.text); else if (!d.startsWith('+')) add('Low', 'tel-without-prefix', url, raw, 'use international format +34…', l.text); continue; }
    if (/^mailto:/i.test(raw)) { const m = decodeURIComponent(raw.slice(7).split('?')[0]); if (!/^[^@\s,]+@[^@\s]+\.[a-z]{2,}(,[^@\s,]+@[^@\s]+\.[a-z]{2,})*$/i.test(m)) add('High', 'invalid-mailto', url, raw, 'malformed address', l.text); continue; }
    if (!/^https?:/.test(l.abs)) continue;
    const u = new URL(l.abs), internal = u.host === B.host;
    if (/localhost|127\.0\.0\.1|\.vercel\.app|\.netlify\.app|staging\.|preview\./.test(u.host) && !internal) add('High', 'link-to-non-production', url, raw, u.host, l.text);
    if (B.protocol === 'https:' && u.protocol === 'http:') add('Medium', 'http-link', url, raw, 'http:// link from https', l.text);
    if (!internal && !opt.external) continue;
    const r = await status(norm(l.abs), !internal);
    const isDl = l.download || /\.(pdf|zip|docx?|xlsx?|pptx?|dwg|rar|7z)$/i.test(u.pathname);
    if (r.status === 0) add(internal ? 'High' : 'Medium', 'link-no-response', url, raw, r.error, l.text);
    else if ([401, 403, 429, 999].includes(r.status) && !internal) add('Low', 'external-blocks-bots', url, raw, `HTTP ${r.status}: check manually in a browser`, l.text);
    else if (r.status >= 400) add(internal || isDl ? 'High' : 'Medium', internal ? 'broken-internal-link' : 'broken-external-link', url, raw, `HTTP ${r.status}`, l.text);
    if (r.chain.length) add(internal ? 'Medium' : 'Low', 'redirect', url, raw, r.chain.join(' | '), l.text);
    if (isDl && r.status < 400) add(r.size > 10e6 ? 'Medium' : 'Low', 'download', url, raw, `${r.type || '?'} · ${(r.size / 1e6).toFixed(1)} MB${r.size > 10e6 ? ' (heavy)' : ''}`, l.text);
    if (internal && r.status < 300 && /text\/html/.test(r.type || '') && !pages[norm(r.final)]) queue.push(r.final);
    if (internal && u.hash.length > 1) (pages.__frag ||= []).push({ from: url, target: norm(l.abs), id: decodeURIComponent(u.hash.slice(1)), raw, text: l.text });
  }
}
for (const f of pages.__frag || []) {                         // anchors: the id must exist in the target's rendered DOM
  const t = pages[f.target];
  if (t?.ids && !t.ids.includes(f.id)) add('Medium', 'missing-anchor', f.from, f.raw, `#${f.id} does not exist on ${f.target}`, f.text);
}
delete pages.__frag;
const seen = new Map(), uniq = [];                          // groups repeats (e.g. the same footer link on every page)
for (const f of findings) { const k = [f.type, f.href, f.detail].join('|'); if (seen.has(k)) seen.get(k).count++; else { f.count = 1; seen.set(k, f); uniq.push(f); } }
const byType = uniq.reduce((a, f) => (a[f.type] = (a[f.type] || 0) + 1, a), {});
const report = { base, pageCount: Object.keys(pages).length, linksChecked: checked.size, byType, findings: uniq, pages: Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, { status: v.status, links: v.links, error: v.error }])) };
writeFileSync(opt.out || 'links.json', JSON.stringify(report, null, 1));
console.log(JSON.stringify({ pageCount: report.pageCount, linksChecked: checked.size, byType }, null, 1));
await browser.close(); await api.dispose(); if (apiExt !== api) await apiExt.dispose();
```

| Type | Why it matters | Sev. |
|---|---|---|
| `broken-internal-link`, `page-error` | The user lands on a 404 or 500 from the site itself; often a route the AI misspelled | High |
| `clickable-not-link` | `div` with `onClick` and `cursor:pointer`: does not work with the keyboard, cannot be opened in a new tab and Google does not follow it | High |
| `empty-href`, `a-without-href` | `href="#"`, empty or `javascript:`: a disguised button or a half-finished link | High / Medium |
| `invalid-tel`, `invalid-mailto` | On mobile the user taps and nothing happens, or an email opens with the wrong recipient | High |
| `missing-anchor` | `#precios` without `id="precios"`: the click does nothing. Checked in the rendered DOM, not just the HTML | Medium |
| internal `redirect` | Unnecessary hops (`/contacto` → `/contacto/`): link to the final destination | Medium |
| `broken-external-link` | Social profile or partner that no longer exists | Medium |
| `link-to-non-production` | Links to `localhost`, `*.vercel.app` or staging left over from development | High |
| `download` | PDF or ZIP: status, type and size (over 10 MB, Medium) | Low / Medium |
| `external-blocks-bots` | 401/403/429/999 (LinkedIn, Cloudflare): open it manually before calling it broken | Low |
| `blank-without-rel` | `target="_blank"` without `rel`. Current browsers already apply `noopener` by default, but `rel="noopener noreferrer"` is still the recommended practice | Low |

**Alternatives without Playwright**, useful in CI (they do not see client-only links or orphan pages):

```bash
npx linkinator@8.1.0 http://localhost:3000 --recurse --check-fragments --redirects warn --format json > linkinator.json
lychee --include-fragments --format json --max-concurrency 8 https://staging.ejemplo.es   # lychee 0.24.2 (Rust binary); does not crawl recursively
```

## Step 4. Per-route smoke test

For each route, on desktop and on mobile: console errors and warnings, uncaught exceptions, hydration errors, failed requests and 4xx/5xx responses. Then the load without JavaScript and a non-existent URL.

```bash
node smoke.mjs http://localhost:3000 / /servicios /contacto /aviso-legal --out=smoke.json
```

`smoke.mjs`:

```js
// smoke.mjs: per-route smoke test. Console errors, exceptions, hydration errors, failed requests and 4xx/5xx,
// content without JavaScript and 404 page. Desktop and mobile.
// Usage: node smoke.mjs <baseUrl> <route> [<route>...] [--out=smoke.json] [--ignore=regex]
//   --ignore  regex of URLs/messages not to report (e.g. "googletagmanager|clarity" if they are reviewed separately)
import { chromium, devices } from 'playwright';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2), base = args[0];
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v = true] = a.slice(2).split('='); return [k, v]; }));
const routes = args.slice(1).filter(a => !a.startsWith('--'));
const IGN = opt.ignore ? new RegExp(opt.ignore) : null;
const HYDRATION = /hydrat|did not match|didn't match|server rendered (html|text)|Minified React error #(418|419|421|422|423|425)\b/i;
const browser = await chromium.launch();
const out = { base, routes: {}, notFound: null };

async function run(route, profile) {
  const ctx = await browser.newContext(profile === 'mobile' ? { ...devices['iPhone 13'], locale: 'es-ES' } : { viewport: { width: 1366, height: 900 }, locale: 'es-ES' });
  const page = await ctx.newPage(), r = { console: [], exceptions: [], hydration: [], failedRequests: [], http4xx5xx: [] };
  const skip = s => IGN && IGN.test(s);
  page.on('console', m => {
    if (!['error', 'warning'].includes(m.type()) || skip(m.text()) || /^Failed to load resource/.test(m.text())) return;   // already reported as requests
    const t = m.text().slice(0, 300);
    (HYDRATION.test(t) ? r.hydration : r.console).push({ type: m.type(), text: t, source: m.location()?.url?.slice(0, 120) });
  });
  page.on('pageerror', e => { const t = String(e.message).slice(0, 300); (HYDRATION.test(t) ? r.hydration : r.exceptions).push(t); });
  page.on('requestfailed', q => {
    const f = q.failure()?.errorText || '';
    if (f === 'net::ERR_ABORTED' && /_rsc=|\.txt\?/.test(q.url())) return;   // prefetch cancelled by navigation: noise
    if (!skip(q.url())) r.failedRequests.push({ url: q.url().slice(0, 160), type: q.resourceType(), error: f });
  });
  page.on('response', s => { if (s.status() >= 400 && !skip(s.url())) r.http4xx5xx.push({ url: s.url().slice(0, 160), status: s.status(), type: s.request().resourceType() }); });
  try {
    const resp = await page.goto(new URL(route, base).href, { waitUntil: 'load', timeout: 30000 });
    r.status = resp?.status(); r.finalUrl = page.url();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(z => setTimeout(z, 80)); } });
    await page.waitForTimeout(800);
    Object.assign(r, await page.evaluate(() => ({
      visibleText: document.body.innerText.replace(/\s+/g, ' ').length, h1: document.querySelectorAll('h1').length,
      horizontalScroll: document.documentElement.scrollWidth > innerWidth + 1, nextDevOverlay: !!document.querySelector('nextjs-portal') })));
  } catch (e) { r.loadError = e.message.split('\n')[0]; }
  await ctx.close();
  return r;
}

async function noJs(route) {                                   // what a crawler without JS sees, or a user if the bundle fails
  const ctx = await browser.newContext({ javaScriptEnabled: false, locale: 'es-ES' }), page = await ctx.newPage();
  try {
    await page.goto(new URL(route, base).href, { waitUntil: 'load', timeout: 30000 });
    return await page.evaluate(() => ({
      visibleText: document.body.innerText.replace(/\s+/g, ' ').length,
      h1: [...document.querySelectorAll('h1')].map(h => h.innerText.trim().slice(0, 60)),
      navLinks: document.querySelectorAll('header a[href], nav a[href]').length,
      // Motion/Framer and "reveal" animations leave opacity:0 in the server HTML: without JS that text is not visible
      hiddenUntilJs: [...document.querySelectorAll('[style*="opacity:0"], [style*="opacity: 0"], [style*="visibility:hidden"]')]
        .filter(e => e.textContent.trim()).map(e => `${e.tagName.toLowerCase()} "${e.textContent.trim().slice(0, 40)}"`).slice(0, 10),
      noscript: document.querySelectorAll('noscript').length }));
  } catch (e) { return { error: e.message.split('\n')[0] }; } finally { await ctx.close(); }
}

for (const route of routes) {
  const desktop = await run(route, 'desktop'), mobile = await run(route, 'mobile'), withoutJs = await noJs(route);
  const ratio = desktop.visibleText ? +(withoutJs.visibleText / desktop.visibleText).toFixed(2) : null;
  out.routes[route] = { desktop, mobile, noJs: { ...withoutJs, noJsTextRatio: ratio } };
  const n = x => x.console.length + x.exceptions.length + x.hydration.length + x.failedRequests.length + x.http4xx5xx.length;
  console.log(`${route}: HTTP ${desktop.status} · desktop ${n(desktop)} issues · mobile ${n(mobile)} · hydration ${desktop.hydration.length + mobile.hydration.length} · text without JS ${ratio}`);
}

// 404: a made-up URL must return a real 404 with a custom page (not the Next default) and a link to home
const ctx = await browser.newContext(), page = await ctx.newPage();
const resp = await page.goto(new URL(`/qa-missing-page-${Date.now()}`, base).href);
out.notFound = { status: resp.status(), ...(await page.evaluate(() => ({
  nextDefault: /This page could not be found/i.test(document.body.innerText),
  title: document.title, homeLink: !!document.querySelector('a[href="/"]'), robots: document.querySelector('meta[name=robots]')?.content }))) };
console.log(`404: HTTP ${out.notFound.status} · Next default page: ${out.notFound.nextDefault} · link to home: ${out.notFound.homeLink}`);
writeFileSync(opt.out || 'smoke.json', JSON.stringify(out, null, 1));
await browser.close();
```

How to read `smoke.json`:

- **`hydration`**: in production React gives no details, only `Minified React error #418` (content differs between server and client) or #423/#425. Typical causes in generated code: `typeof window` in render, `Date`/`Math.random()`, `toLocaleString()` without a time zone, browser extensions or invalid HTML (`<div>` inside `<p>`). Reproduce it in `next dev` to see the exact component. High.
- **`exceptions`**: an uncaught JS error usually leaves the page without interactivity. Critical if it affects navigation or forms; otherwise High.
- **`http4xx5xx` and `failedRequests`**: images, fonts or scripts that do not load. Separate first-party ones (High) from third-party ones (analytics, maps, videos: Medium). A Google font blocked by CSP or a failing `gtag` also show up here.
- **`noJs.hiddenUntilJs`**: text with `opacity:0` in the server HTML (Motion "reveal" animations). If the JS fails or is slow, that text is not visible. High if it is the headline or the CTA.
- **`noJs.noJsTextRatio`** below 0.8 or an empty `h1`: key content depends on the client. High.
- **`notFound.nextDefault: true`** or a `status` other than 404: `not-found.tsx` is missing or there is a soft 404.
- `nextDevOverlay: true`: `next dev` is being tested; repeat against `next start`.

## Step 5. Navigation

```bash
node nav.mjs http://localhost:3000 / --out=nav-home.json
```

`nav.mjs`:

```js
// nav.mjs: navigation. Menu on desktop and mobile, in-page anchors (target visible and not hidden under a fixed header),
// back/forward button and scroll restoration.
// Usage: node nav.mjs <baseUrl> [route=/] [--out=nav.json]
import { chromium, devices } from 'playwright';
import { writeFileSync } from 'node:fs';

const [base, route = '/', ...rest] = process.argv.slice(2);
const outFile = (rest.find(a => a.startsWith('--out=')) || '--out=nav.json').slice(6);
const url = new URL(route, base).href, browser = await chromium.launch(), out = { url };
const navLinks = () => [...document.querySelectorAll('header a[href], nav a[href]')].map(a => {
  const r = a.getBoundingClientRect(), cs = getComputedStyle(a);
  return { href: a.getAttribute('href'), text: a.innerText.trim().slice(0, 30), visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && r.bottom > 0 && r.right > 0 && r.left < innerWidth };
});

// 1. Menu: on desktop the header links are visible; on mobile they are either visible or there is a button that shows them
for (const [name, ctxOpt] of [['desktop', { viewport: { width: 1366, height: 900 } }], ['mobile', devices['iPhone 13']]]) {
  const ctx = await browser.newContext({ ...ctxOpt, locale: 'es-ES' }), page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const r = { links: await page.evaluate(navLinks), horizontalScroll: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1) };
  const toggle = page.locator('header button[aria-expanded], header button[aria-controls], button[aria-label*="men" i], header [role=button][aria-expanded]').first();
  if (await toggle.count() && await toggle.isVisible()) {
    r.toggle = { ariaLabel: await toggle.getAttribute('aria-label'), text: (await toggle.innerText()).trim(), expandedBefore: await toggle.getAttribute('aria-expanded') };
    await toggle.click(); await page.waitForTimeout(500);
    r.toggle.expandedAfter = await toggle.getAttribute('aria-expanded');
    r.toggle.visibleLinksWhenOpen = (await page.evaluate(navLinks)).filter(l => l.visible).length;
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    r.toggle.closesWithEscape = (await toggle.getAttribute('aria-expanded')) === 'false';
    r.toggle.focusOnToggleAfterEscape = await toggle.evaluate(t => document.activeElement === t);
  }
  r.verdict = !r.links.length ? 'no <header>/<nav> with links: navigation is not semantic or does not exist'
    : r.links.some(l => l.visible) ? 'ok' : r.toggle?.visibleLinksWhenOpen ? 'ok (dropdown menu)' : 'links hidden and no usable menu button';
  out[name] = r; await ctx.close();
}

// 2. In-page anchors: after the click, the target must be on screen and not under a fixed header (missing scroll-margin-top)
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'es-ES' }), page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
const anchors = await page.evaluate(() => [...document.querySelectorAll('a[href*="#"]')].map(a => a.getAttribute('href'))
  .filter(h => { const u = new URL(h, location.href); return u.pathname === location.pathname && u.hash.length > 1; }).filter((v, i, a) => a.indexOf(v) === i));
out.anchors = [];
for (const href of anchors.slice(0, 20)) {
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(200);
  const link = page.locator(`a[href="${href}"]`).first();
  if (!(await link.isVisible())) { out.anchors.push({ href, result: 'link not visible on desktop' }); continue; }
  await link.click(); await page.waitForTimeout(1200);
  out.anchors.push({ href, ...(await page.evaluate(id => {
    const t = document.getElementById(decodeURIComponent(id));
    if (!t) return { result: 'target does not exist' };
    const top = t.getBoundingClientRect().top;
    const fixed = [...document.querySelectorAll('header, nav, [class*=sticky], [class*=fixed]')].filter(e => /fixed|sticky/.test(getComputedStyle(e).position))
      .reduce((m, e) => Math.max(m, e.getBoundingClientRect().bottom), 0);
    return { top: Math.round(top), fixedHeaderHeight: Math.round(fixed), hashInUrl: location.hash,
      result: top < -2 || top > innerHeight ? 'target off screen' : top < fixed - 2 ? 'hidden under the fixed header (add scroll-margin-top)' : 'ok' };
  }, new URL(href, url).hash.slice(1))) });
}

// 3. Back/forward and scroll: scroll down, go to another internal page, go back and check URL and position
await page.goto(url, { waitUntil: 'networkidle' });
const target = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.href)
  .find(h => { const u = new URL(h); return u.origin === location.origin && u.pathname !== location.pathname && !/\.(pdf|zip|jpe?g|png)$/i.test(u.pathname); }));
if (target) {
  const y = await page.evaluate(() => { const y = Math.round((document.body.scrollHeight - innerHeight) * 0.6); scrollTo(0, y); return Math.round(scrollY); });
  await page.waitForTimeout(300);
  await page.evaluate(t => [...document.querySelectorAll('a[href]')].find(a => a.href === t)?.click(), target);   // real click: next/link does client-side navigation
  await page.waitForURL(u => u.href !== url, { timeout: 8000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
  const destination = page.url(), yDestination = await page.evaluate(() => Math.round(scrollY));
  await page.goBack(); await page.waitForTimeout(1200);
  const yBack = await page.evaluate(() => Math.round(scrollY)), urlBack = page.url();
  await page.goForward(); await page.waitForTimeout(800);
  out.history = { from: url, scrollBefore: y, destination, scrollOnArrival: yDestination, urlAfterBack: urlBack, scrollAfterBack: yBack,
    backOk: urlBack === url, forwardOk: page.url() === destination, scrollRestored: Math.abs(yBack - y) <= 60, destinationStartsAtTop: yDestination <= 5 };
}
await ctx.close(); await browser.close();
writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ desktop: out.desktop.verdict, mobile: out.mobile.verdict, toggle: out.mobile.toggle, anchors: out.anchors.map(a => `${a.href}: ${a.result}`), history: out.history }, null, 1));
```

- **Menu**: on mobile, the links must be visible or behind a button with `aria-expanded` that changes from `false` to `true`. Not closing with Escape is Medium; having no way to reach the links is Critical.
- **Anchors**: "hidden under the fixed header" is fixed with `scroll-margin-top` on the sections (`scroll-mt-24` in Tailwind). If there is `scroll-behavior: smooth`, check that it is disabled with `prefers-reduced-motion`.
- **History**: `backOk` and `scrollRestored` must be `true` and the destination must start at the top. A manual `scrollTo` in a `useEffect` or a full-screen container with `overflow: auto` (instead of the `body`) breaks restoration.
- Test manually what the script does not cover: dropdown menus with submenus, language switching, filters and tabs that should be reflected in the URL.

## Step 6. Forms

```bash
node forms.mjs http://localhost:3000/contacto --out=forms.json                      # no real submission
node forms.mjs https://staging.ejemplo.es/contacto --mode=staging --data=data.json   # real submission to staging
```

`forms.mjs`:

```js
// forms.mjs: tests every form on a page without actually submitting anything (page.route intercepts POST/PUT/PATCH).
// Usage: node forms.mjs <url> [--mode=block|staging] [--delay=1500] [--data=data.json] [--out=forms.json]
//   block (default): no submission leaves the browser. A 500 error is simulated after --delay ms; if the submission is fetch/JSON, success too.
//   staging: the valid submission and the server-validation test reach the backend. Only localhost or hosts with staging/preview/test/dev.
//   data.json: { "email": "qa+form@your-domain.es", "nombre": "Prueba QA" } (by field name) to override the test data.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2), url = args[0];
const opt = Object.fromEntries(args.slice(1).map(a => { const [k, v = true] = a.slice(2).split('='); return [k, v]; }));
const MODE = opt.mode || 'block', DELAY = +(opt.delay || 1500), DATA = opt.data ? JSON.parse(readFileSync(opt.data, 'utf8')) : {};
if (MODE === 'staging' && !/^(localhost|127\.0\.0\.1)$|(^|[.-])(staging|stg|preview|test|dev)([.-]|$)/.test(new URL(url).hostname)) { console.error('Staging mode refused: the host looks like production.'); process.exit(2); }
const ANALYTICS = /google-analytics|googletagmanager|doubleclick|clarity\.ms|hotjar|facebook|_vercel\/(insights|speed)|plausible|matomo/;
const SUBMIT = 'button:not([type=button]):not([type=reset]), input[type=submit]';
const sleep = ms => new Promise(z => setTimeout(z, ms));
const browser = await chromium.launch(), report = { url, mode: MODE, forms: [] };

function sample(f) {                                           // valid test value by type/name; reserved domain example.com
  if (DATA[f.name] !== undefined) return DATA[f.name];
  const n = `${f.name} ${f.type} ${f.autocomplete}`.toLowerCase();
  if (/mail/.test(n)) return 'qa+formulario@example.com';
  if (/tel|phone|movil|telefono/.test(n)) return '+34 600 000 000';
  if (/url|web/.test(n)) return 'https://example.com';
  if (/cp|postal|zip/.test(n)) return '28001';
  if (f.type === 'number') return '1';
  if (f.type === 'date') return '2026-12-01';
  return f.tag === 'textarea' ? '[QA] Mensaje de prueba automática. Ignorar.' : 'Prueba QA';
}
async function fillValid(form, fields, except) {
  for (const f of fields) {
    if (!f.name || f.hidden || f.name === except) continue;
    const el = form.locator(`[name="${f.name}"]`).first();
    try {
      if (f.type === 'checkbox' || f.type === 'radio') { if (f.required || /privacidad|acepto|consent|rgpd|terms/i.test(f.name)) await el.check(); }
      else if (f.tag === 'select') await el.selectOption({ index: 1 }).catch(() => {});
      else await el.fill(String(sample(f)));
    } catch (e) { f.fillError = e.message.split('\n')[0]; }
  }
}
const state = form => form.evaluate(f => {
  if (!f.isConnected) return { formGone: true };
  const b = f.querySelector('button:not([type=button]):not([type=reset]), input[type=submit]');
  return { invalid: [...f.querySelectorAll(':invalid')].filter(e => e.name).map(e => `${e.name}: ${e.validationMessage}`),
    ariaInvalid: f.querySelectorAll('[aria-invalid=true]').length, alerts: [...document.querySelectorAll('[role=alert],[role=status],[aria-live]')].map(e => e.innerText.trim()).filter(Boolean),
    button: b ? { disabled: b.disabled, ariaBusy: b.getAttribute('aria-busy'), text: (b.innerText || b.value || '').trim() } : null };
}).catch(() => ({ formGone: true }));

// Opens the page with the interceptor, runs `act` and returns requests, form state and the text that appeared
async function trial(i, onPost, act, wait = 1200) {
  const ctx = await browser.newContext({ locale: 'es-ES', serviceWorkers: 'block' }), page = await ctx.newPage(), posts = [];
  await page.route('**/*', async route => {
    const q = route.request();
    if (!['POST', 'PUT', 'PATCH'].includes(q.method())) return route.continue();
    if (ANALYTICS.test(q.url())) return route.fulfill({ status: 204 });
    posts.push({ url: q.url(), serverAction: !!q.headers()['next-action'], contentType: q.headers()['content-type']?.split(';')[0], body: (q.postData() || '').slice(0, 300) });
    return onPost(route);
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  const form = page.locator('form').nth(i), text = () => page.locator('body').innerText(), before = await text();
  const extra = (await act({ page, form })) || {};
  await page.waitForTimeout(wait);
  const after = await text();
  const r = { requests: posts.length, serverAction: posts[0]?.serverAction, ...extra, ...(await state(form)),
    newText: after.split('\n').map(s => s.trim()).filter(s => s && !before.includes(s)), sample: posts[0] };
  await ctx.close(); return r;
}

const probe = await browser.newPage();
await probe.goto(url, { waitUntil: 'networkidle' });
const forms = await probe.evaluate(() => [...document.forms].map(f => {
  const fields = [...f.elements].filter(e => /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) && !/^(submit|button|reset|image)$/.test(e.type)).map(e => {
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return { tag: e.tagName.toLowerCase(), type: e.type, name: e.name, required: e.required, autocomplete: e.autocomplete,
      label: !!(e.labels?.length || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby')), placeholder: e.placeholder || undefined,
      checkedByDefault: e.type === 'checkbox' ? e.defaultChecked : undefined,
      hidden: e.type === 'hidden' || cs.display === 'none' || cs.visibility === 'hidden' || r.width < 2 || r.left < -1000 };
  });
  return { action: f.getAttribute('action'), method: f.method, noValidate: f.noValidate, fields, hasSubmitButton: !!f.querySelector('button:not([type=button]):not([type=reset]), input[type=submit]'),
    honeypot: fields.some(x => x.hidden && x.type !== 'hidden'),
    captcha: [...new Set((document.documentElement.innerHTML.match(/challenges\.cloudflare\.com\/turnstile|recaptcha|hcaptcha|friendlycaptcha|altcha/gi) || []).map(s => s.toLowerCase()))] };
}));
await probe.close();

for (const [i, info] of forms.entries()) {
  if (!info.hasSubmitButton) { report.forms.push({ index: i, ...info, tests: 'no submit button: test manually' }); console.log(`form[${i}] no submit button: skipped`); continue; }
  const p = {}, fail = route => route.fulfill({ status: 500, body: 'QA simulated error' });
  // A. Empty submission: browser or custom validation should stop it, with no request
  p.empty = await trial(i, fail, ({ form }) => form.locator(SUBMIT).first().click());
  // B. Invalid email with everything else correct
  const em = info.fields.find(f => /mail/i.test(`${f.name} ${f.type}`) && !f.hidden);
  if (em) p.invalidEmail = await trial(i, fail, async ({ form }) => {
    await fillValid(form, info.fields, em.name); await form.locator(`[name="${em.name}"]`).fill('esto-no-es-un-email'); await form.locator(SUBMIT).first().click(); });
  // C. Valid data + double click + slow response: loading state, double submission and final message
  p.validSubmit = await trial(i, async route => { await sleep(DELAY); return MODE === 'staging' ? route.continue() : fail(route); }, async ({ page, form }) => {
    await fillValid(form, info.fields);
    const b = await form.locator(SUBMIT).first().boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.mouse.click(x, y); await sleep(120); await page.mouse.click(x, y); await sleep(300);
    return { mode: MODE === 'staging' ? 'real (staging)' : 'simulated 500 error', during: await state(form) };
  }, DELAY + 1500);
  // D. Simulated success: only if the submission is fetch/JSON (a server action needs a real RSC response)
  if (MODE === 'block' && p.validSubmit.requests && !p.validSubmit.serverAction)
    p.simulatedSuccess = await trial(i, async route => { await sleep(500); return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"success":true}' }); },
      async ({ form }) => { await fillValid(form, info.fields); await form.locator(SUBMIT).first().click(); }, 2000);
  // E. Server validation (staging only): browser validation is removed and the form is submitted empty
  if (MODE === 'staging') p.serverWithEmptyData = await trial(i, route => route.continue(), async ({ page, form }) => {
    await form.evaluate(f => { f.noValidate = true; f.querySelectorAll('[required],[pattern]').forEach(e => { e.removeAttribute('required'); e.removeAttribute('pattern'); }); });
    const resp = page.waitForResponse(q => ['POST', 'PUT'].includes(q.request().method()) && !ANALYTICS.test(q.url()), { timeout: 10000 }).catch(() => null);
    await form.locator(SUBMIT).first().click();
    return { status: (await resp)?.status() ?? null };
  }, 1500);
  report.forms.push({ index: i, ...info, tests: p });
  console.log(`form[${i}] ${info.fields.length} fields · no label: ${info.fields.filter(f => !f.label && !f.hidden).length} · empty→requests: ${p.empty.requests} · invalid email→requests: ${p.invalidEmail?.requests ?? 'n/a'} · double click→${p.validSubmit.requests} submissions · button disabled during submission: ${p.validSubmit.during?.button?.disabled} · message after submission: ${JSON.stringify(p.validSubmit.newText.slice(0, 2))}${p.serverWithEmptyData ? ` · server with empty data: HTTP ${p.serverWithEmptyData.status}, message ${JSON.stringify(p.serverWithEmptyData.newText.slice(0, 2))}` : ''} · antispam: ${[info.honeypot && 'honeypot', ...info.captcha].filter(Boolean).join(',') || 'none'}`);
}
if (!forms.length) console.log('No <form> on the page (check whether the form is a div with onClick or a third-party iframe).');
writeFileSync(opt.out || 'forms.json', JSON.stringify(report, null, 1));
await browser.close();
```

What it tests and how to read it:

| Test | Correct | Finding |
|---|---|---|
| A. Empty submission | `requests: 0` and fields in `invalid` or custom messages | It submits empty: `required`/client-side validation is missing (High) |
| B. Invalid email | `requests: 0` and a message on the field | It accepts `esto-no-es-un-email` (High) |
| C. Double click and slow response | `requests: 1`, `during.button.disabled: true` or text "Enviando…", and a clear error message after the 500 | 2 submissions (High: duplicate emails); no loading state (Medium); no message or a generic error screen (High) |
| D. Simulated success (fetch/JSON) | Confirmation message in `newText` | Nothing changes: the user does not know whether it was sent (High) |
| E. Server with empty data (staging) | 4xx or an error message | 200 with no message: the server accepts anything (Critical if it actually sends an email) |

Also review `fields`: fields without a `label` (input for `qa-accessibility`), fields without a `name` (they are not submitted), missing `autocomplete` on name, email and phone, and `checkedByDefault: true` on consent checkboxes (assessed by `qa-legal-spain`). `honeypot` and `captcha` show whether there is antispam.

With server actions a success cannot be simulated: the response is in RSC format. To check it, use `--mode=staging`. The browser's native messages come out in Chromium's language; they are not a content finding.

**What must be checked manually on staging:**

1. **Actual email delivery** (Critical): the message reaches the right inbox, with a sender on the company's own domain, the user's `Reply-To`, does not land in spam, and the user gets a confirmation if one is planned. Use `qa+date@client-domain` addresses and warn the client beforehand.
2. **Provider errors**: with the API key empty or wrong on staging, the user must see an error and the failure must be logged; the error must not be swallowed with `.catch(() => null)`.
3. **Antispam**: honeypot or Turnstile/hCaptcha, validated **on the server** (reCAPTCHA without consent carries legal risk: see `qa-legal-spain`). Rate limiting by IP (middleware/proxy, Upstash, host rules): 10 consecutive submissions from the same IP must end in 429.
4. **Never** in production: no load tests, no submission loops, no fake data reaching the client's CRM.

## Step 7. Contact, maps and downloads on mobile

`crawl-links.mjs` validates the format; the behaviour is tested on a real phone or on BrowserStack: `tel:` in international format (`tel:+34910000000`) and with the same number that is displayed; `mailto:` with the right address and an encoded `?subject=`; "Cómo llegar" (directions) opens the maps app at the right address and the map iframe has an alternative if consent blocks it; PDFs open, are the current version and have a descriptive name; WhatsApp as `https://wa.me/34XXXXXXXXX`.

## Step 8. Reusable tests (optional)

If the user wants these checks to stay in the repository, generate a `@playwright/test` spec. Ask for permission before adding `@playwright/test` to `devDependencies`.

```bash
node /tmp/qa-functionality/gen-tests.mjs e2e/qa-functionality.spec.ts --routes=/,/servicios,/contacto --forms=/contacto
BASE_URL=http://localhost:3000 npx playwright test e2e/qa-functionality.spec.ts
```

`gen-tests.mjs`:

```js
// gen-tests.mjs: generates a reusable @playwright/test spec (per-route smoke, 404 and forms with no real submission).
// Usage: node gen-tests.mjs <output.spec.ts> --routes=/,/servicios,/contacto [--forms=/contacto]
// Only writes the given file; installs nothing. Then run it with: BASE_URL=http://localhost:3000 npx playwright test <output>
import { writeFileSync } from 'node:fs';
const [outFile, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map(a => { const [k, v = ''] = a.slice(2).split('='); return [k, v]; }));
const routes = (opt.routes || '/').split(',').filter(Boolean), forms = (opt.forms || '').split(',').filter(Boolean);
writeFileSync(outFile, `// Generated by qa-functionality. Adjust IGNORE if there are third parties failing outside your control.
import { test, expect, type Page } from '@playwright/test';
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const ROUTES = ${JSON.stringify(routes)};
const FORMS = ${JSON.stringify(forms)};
const IGNORE = /googletagmanager|google-analytics|clarity\\.ms|hotjar/;

function watch(page: Page) {
  const problems: string[] = [];
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) problems.push('console: ' + m.text()); });
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(BASE) && !IGNORE.test(r.url())) problems.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', r => { if (!IGNORE.test(r.url()) && r.failure()?.errorText !== 'net::ERR_ABORTED') problems.push('failed ' + r.url()); });
  return problems;
}

for (const route of ROUTES) {
  test(\`smoke \${route}: no console errors, exceptions or 4xx/5xx\`, async ({ page }) => {
    const problems = watch(page);
    const res = await page.goto(BASE + route, { waitUntil: 'networkidle' });
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('h1')).toHaveCount(1);
    expect(problems).toEqual([]);
  });
}

test('missing URL returns 404 with a custom page and a link to home', async ({ page }) => {
  const res = await page.goto(BASE + '/qa-missing-page-' + Date.now());
  expect(res?.status()).toBe(404);
  await expect(page.getByText('This page could not be found')).toHaveCount(0);
  await expect(page.locator('a[href="/"]').first()).toBeVisible();
});

for (const route of FORMS) {
  test(\`form \${route}: empty submission does not leave the browser\`, async ({ page }) => {
    const posts: string[] = [];
    await page.route('**/*', async r => {
      if (r.request().method() === 'GET' || IGNORE.test(r.request().url())) return r.continue();
      posts.push(r.request().url()); await new Promise(z => setTimeout(z, 1000));
      return r.fulfill({ status: 500, body: 'simulated' });            // never reaches the backend
    });
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    const submit = page.locator('form button:not([type=button]), form input[type=submit]').first();
    await submit.click();
    await page.waitForTimeout(800);
    expect(posts, 'the empty submission must not leave the browser').toHaveLength(0);
  });
}
`);
console.log(`Wrote ${outFile}: ${routes.length} routes, ${forms.length} forms`);
```

## Severity

| Level | Examples in this phase |
|---|---|
| **Critical** | The contact form does not deliver messages; a JS exception that breaks the menu or the form; inaccessible mobile navigation; a server that accepts and sends empty data |
| **High** | Broken internal link; clickable `div` instead of a link; form without validation, without a success or error message, or that submits twice; hydration error; first-party resources with 4xx/5xx; `not-found.tsx` or `error.tsx` missing; malformed `tel:`/`mailto:`; text hidden without JS |
| **Medium** | Missing anchor or anchor hidden under the header; internal redirects; broken external link; no loading state; menu that does not close with Escape; failing third parties; `global-error.tsx` missing |
| **Low** | `target=_blank` without `rel`; `tel:` without the +34 prefix; external links that block bots (check manually); `loading.tsx` missing |

## Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

Save it as `qa-functionality.md` (plus `links.json`, `smoke.json`, `nav-*.json` and `forms.json`).

```markdown
# Functional QA — <project> — <date> — <tested URL> — commit <hash>

## Summary
- Routes tested: N (M found only in app/, with no incoming link)
- Links: N checked · X broken internal · Y broken external · Z missing anchors
- Console: N errors on M routes · hydration: yes/no · resources with 4xx/5xx: N
- Forms: N · client validation ✓/✗ · server ✓/✗/not tested · double submission ✓/✗ · antispam: …
- Special pages: not-found ✓/✗ · error ✓/✗ · global-error ✓/✗
- Findings: X critical · Y high · Z medium · W low

## Findings
| # | Sev. | Where (URL · file:line) | What happens | Evidence | Why it matters | Fix |
|---|---|---|---|---|---|---|
| F-001 | High | /servicios · components/Header.tsx:7 | Link to /servicioss | HTTP 404 | Leads to an error from the menu | `href="/servicios"` |

## Forms (one table per form with tests A–E)
## Not tested / pending staging or a real phone
```

To get to `file:line`, search for the `href` or the link text with `rg -n`. Group repeats: a broken footer link on 12 pages is one finding, not 12.

## False positives and limitations

- External links with 403/429/999 are usually anti-bot protection: check them in a browser before reporting them as broken.
- From networks with a proxy, the scripts use `HTTPS_PROXY` for external links; the browser may fail with `ERR_TUNNEL_CONNECTION_FAILED` on third parties (Google Fonts, GTM). That is the test environment, not the website: repeat it from a normal network.
- `clickable-not-link` uses `cursor:pointer` as a hint: review doubtful cases manually (whole clickable cards with a link inside).
- The crawler does not fill in forms or log in, and does not discover dynamic routes (`[slug]`) that are not linked or in the sitemap: pass them with `--routes`.
- `error.tsx` and `global-error.tsx` cannot be triggered in production without changing code. If the user authorises it, on a branch: a component that throws an error with `?qa-error=1`, and check that the custom screen appears.

## If the user asks for fixes

Order: 1) forms and email delivery; 2) broken links, clickable `div`s and menu; 3) `not-found`/`error`/`global-error`; 4) console and hydration; 5) the rest. Run the scripts again after each block.

Snippets for Next 16 (in 15, `retry` becomes `reset`):

`app/not-found.tsx`: a Server Component with `<h1>Página no encontrada</h1>`, a helpful sentence and `<Link href="/">Volver al inicio</Link>`; it inherits header and footer from the layout.

```tsx
// app/error.tsx (visitor-facing text in Spanish)
"use client";
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main role="alert" className="mx-auto max-w-xl py-24 text-center">
      <h1>Algo ha fallado al cargar esta sección</h1>
      <p>Inténtalo de nuevo. Si el problema sigue, escríbenos a hola@ejemplo.es.</p>
      <button onClick={() => retry()}>Reintentar</button>
    </main>
  );
}
```

Form with a server action: server-side validation with Zod, honeypot, messages and loading state with `useActionState` (the button is disabled while `pending`, which prevents double submission):

```tsx
// app/contacto/actions.ts (validation messages are shown to Spanish visitors)
"use server";
import { z } from "zod";
const Schema = z.object({ email: z.email("Escribe un email válido"), mensaje: z.string().trim().min(10, "Cuéntanos un poco más (mínimo 10 caracteres)") });
export async function enviar(_prev: unknown, formData: FormData) {
  if (formData.get("website")) return { ok: true };                     // honeypot: bots fill it in
  const r = Schema.safeParse(Object.fromEntries(formData));
  if (!r.success) return { ok: false, errores: z.flattenError(r.error).fieldErrors };
  try { await enviarCorreo(r.data); return { ok: true }; }
  catch { return { ok: false, mensaje: "No hemos podido enviar tu mensaje. Inténtalo de nuevo o llámanos." }; }
}
```

On the client: `const [state, action, pending] = useActionState(enviar, null)`, `<button disabled={pending}>{pending ? "Enviando…" : "Enviar mensaje"}</button>` and the messages in a `<p role="status">` (or `role="alert"` for errors). Keep `required` and `type="email"` on the inputs: client-side validation helps the user, server-side validation protects.

## Sources

- Next.js `error.js`, `not-found.js`, `loading.js` (status codes), forms and server actions guides: `node_modules/next/dist/docs/01-app/` (v16.4) and https://nextjs.org/docs/app/api-reference/file-conventions/error
- Playwright: https://playwright.dev/docs/network (page.route) · https://playwright.dev/docs/api/class-apirequestcontext
- linkinator 8.1.0: `npx linkinator --help` · https://github.com/JustinBeckwith/linkinator
- lychee 0.24.2: https://lychee.cli.rs/guides/cli/ · https://github.com/lycheeverse/lychee/releases
- React minified errors: https://react.dev/errors/418
