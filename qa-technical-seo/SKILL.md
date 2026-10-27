---
name: qa-technical-seo
description: Audits the technical SEO of a Next.js website (App Router, Next 15/16) before launch. Crawls the site without JavaScript and checks title, description, canonical, robots/noindex, h1 and heading hierarchy, lang, hreflang, Open Graph, broken links, real 404, redirects, sitemap.xml, robots.txt and server-rendered content. Use it whenever someone asks to review SEO, indexing, metadata, the sitemap, robots.txt, canonicals or broken links, or to prepare a website launch or migration, even if "technical SEO" isn't mentioned.
---

# Technical SEO audit (Next.js)

The goal is to answer one question with evidence: **can Google and Bing crawl, understand and index every page the way we want?** Websites generated from Figma with AI usually ship with the template metadata ("Create Next App"), `lang="en"`, the same title on every page, no `metadataBase`, no `sitemap.ts` or `robots.ts`, several `<h1>` copied from the design's text styles and links to routes that don't exist. None of that is visible in the browser, which is why it slips through.

**By default, no code is modified.** Deliver the report and fix things only if the user asks. Don't install dependencies in the project either: the tools go in `/tmp/qa-technical-seo/`.

Out of scope (they have their own skill): speed and Core Web Vitals (`qa-performance-cwv`), text quality (`qa-content`), AI crawlers, detailed JSON-LD and llms.txt (`qa-geo`), cookies (`qa-legal-spain`).

## Step 0. Context

Find out before crawling:

1. **Next version** (`package.json`). In Next 16 `middleware` is renamed to `proxy`, `params` and the `id` of `generateSitemaps` are promises, and a `generateMetadata` resolved at request time (dynamic route or, with `cacheComponents: true`, if it reads `cookies()`, `headers()`, `params` or data without `'use cache'`) is sent by **streaming** (since Next 15.2): the tags arrive inside `<body>` except for the bots in `htmlLimitedBots` (step 6). Read the docs for the installed version in `node_modules/next/dist/docs/` if present.
2. **App Router or Pages Router**. This skill is designed for App Router; in Pages Router the metadata goes in `next/head` and the step 3 scripts still work.
3. **Production domain** (for `--site`), **staging URL** and whether it is a **migration** from a previous website (you need the list of old URLs for the redirects).
4. **Languages**: if Spanish only, `lang="es"` and no hreflang. If there are several, how they are routed (`app/[lang]/`, domains).
5. **Hosting/CDN** (Vercel, Netlify, Cloudflare…): affects headers, domain redirects and whether staging sends `X-Robots-Tag: noindex`.
6. **ripgrep**: the `rg` commands need ripgrep on the PATH (`command -v rg`); macOS doesn't ship it and Claude Code's bundled one usually isn't reachable. If it's missing, install it only with permission (`brew install ripgrep`) or, in a git repo, use `git ls-files -co --exclude-standard` as the file list (e.g. `git ls-files -co --exclude-standard -- '*.tsx' | xargs grep -n "pattern"`).

Always audit against `next build && next start` (or the staging URL), never against `next dev`: the development server doesn't reproduce production streaming, headers or 404.

## Step 1. Set up the tools

```bash
mkdir -p /tmp/qa-technical-seo && cd /tmp/qa-technical-seo && npm init -y >/dev/null \
  && npm i cheerio robots-parser playwright >/dev/null && npx playwright install chromium
```

Write this skill's four scripts there. They are tested with Node 22, Next 16.4, cheerio 1.2, robots-parser 3.0 and Playwright 1.64. Run them with absolute paths.

## Step 2. Static code review (routes and metadata)

```bash
node /tmp/qa-technical-seo/routes.mjs . --seeds-out /tmp/qa-technical-seo/seeds.txt > /tmp/qa-technical-seo/routes.json
```

It returns the App Router routes (to detect orphan pages), the special files present, which pages export `metadata`/`generateMetadata`, `metadataBase`, `title.template` and `lang` of the root layout, and whether `next.config` has `redirects`, `headers`, `X-Robots-Tag` or `htmlLimitedBots`. Each problem comes with `file:line`.

`routes.mjs`:

```js
// routes.mjs: static App Router analysis for SEO: routes (page.*), special metadata files,
// metadata exports per page, metadataBase/title.template/lang of the root layout and next.config.
// Usage: node routes.mjs <project-root> [--seeds-out seeds.txt] > routes.json   (seeds = static routes, for crawl.mjs)
import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.argv[2] || '.';
const seedsOut = process.argv.includes('--seeds-out') ? process.argv[process.argv.indexOf('--seeds-out') + 1] : null;
const appDir = ['app', 'src/app'].map(d => join(root, d)).find(existsSync);
if (!appDir) { console.error('No app/ or src/app/: Pages Router? Review pages/ by hand.'); process.exit(1); }
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (!/^(node_modules|\.next)$/.test(f)) walk(p); } else files.push(p); } })(appDir);
const rel = f => relative(root, f), inApp = f => relative(appDir, f).replace(/\\/g, '/');
const lineOf = (src, re) => { const i = src.search(re); return i < 0 ? null : src.slice(0, i).split('\n').length; };
// Public route: strips (groups); ignores _private folders and @slots
const routeOf = f => { const segs = inApp(f).split('/').slice(0, -1); return segs.some(s => /^[_@]/.test(s)) ? null : '/' + segs.filter(s => !/^\(.*\)$/.test(s)).join('/'); };

const SPECIAL = { sitemap: /(^|\/)sitemap\.(xml|js|ts)$/, robots: /^robots\.(txt|js|ts)$/, manifest: /^manifest\.(json|webmanifest|js|ts)$/,
  'opengraph-image': /(^|\/)opengraph-image\.(jpe?g|png|gif|js|ts|tsx)$/, icon: /(^|\/)(icon|apple-icon)\d*\.(ico|jpe?g|png|svg|js|ts|tsx)$/,
  'not-found': /^(global-)?not-found\.(js|jsx|ts|tsx)$/ };
const special = Object.fromEntries(Object.entries(SPECIAL).map(([k, re]) => [k, files.map(inApp).filter(f => re.test(f))]));
for (const f of ['robots.txt', 'sitemap.xml', 'llms.txt']) if (existsSync(join(root, 'public', f))) (special[f.split('.')[0]] ||= []).push(`public/${f}`);

const pages = files.filter(f => /(^|[\\/])page\.(js|jsx|ts|tsx|md|mdx)$/.test(f) && routeOf(f)).map(f => {
  const src = readFileSync(f, 'utf8');
  return { route: routeOf(f), dynamic: /\[/.test(routeOf(f)), file: rel(f), useClient: /^\s*['"]use client['"]/.test(src),
    metadata: /export\s+(const|let)\s+metadata\b|generateMetadata/.test(src), line: lineOf(src, /export\s+(const|let)\s+metadata\b|generateMetadata/),
    description: /\bdescription\s*:/.test(src), canonical: /canonical\s*:/.test(src), h1: (src.match(/<h1[\s>]/g) || []).length };
});
const rootLayout = ['tsx', 'jsx', 'js', 'ts'].map(e => join(appDir, `layout.${e}`)).find(existsSync);
const rl = rootLayout ? readFileSync(rootLayout, 'utf8') : '';
const layout = rootLayout && { file: rel(rootLayout), lang: (rl.match(/<html[^>]*\blang=\{?["'`]?([^"'`}\s]+)/) || [])[1] || null, langLine: lineOf(rl, /<html/),
  metadataBase: /metadataBase\s*:/.test(rl), titleTemplate: /template\s*:\s*['"`][^'"`]*%s/.test(rl),
  title: (rl.match(/title\s*:\s*['"`]([^'"`]+)['"`]/) || [])[1] || null, titleLine: lineOf(rl, /title\s*:/),
  headTags: ((rl.match(/<head>[\s\S]*?<\/head>/) || [''])[0].match(/<(link|meta|title)[^>]*>/g) || []) };
const cfgFile = ['next.config.ts', 'next.config.mjs', 'next.config.js'].map(f => join(root, f)).find(existsSync);
const cfg = cfgFile ? readFileSync(cfgFile, 'utf8') : '';
const config = { file: cfgFile && rel(cfgFile), redirects: /redirects\s*\(|redirects\s*:/.test(cfg), headers: /headers\s*\(/.test(cfg), xRobotsTag: /X-Robots-Tag/i.test(cfg),
  htmlLimitedBots: /htmlLimitedBots/.test(cfg), proxy: ['proxy.ts', 'proxy.js', 'middleware.ts', 'middleware.js', 'src/proxy.ts', 'src/middleware.ts'].filter(f => existsSync(join(root, f))) };

const problems = []; const P = (sev, code, where, detail) => problems.push({ sev, code, where, detail });
if (!special.sitemap.length) P('High', 'missing-sitemap', 'app/', 'no app/sitemap.(ts|xml) and no public/sitemap.xml');
if (!special.robots.length) P('High', 'missing-robots', 'app/', 'no app/robots.(ts|txt) and no public/robots.txt');
if (!special['opengraph-image'].length) P('Medium', 'missing-opengraph-image', 'app/', 'no opengraph-image (check whether metadata has openGraph.images)');
if (!special['not-found'].length) P('Low', 'missing-not-found', 'app/', 'no not-found.tsx: generic Next 404');
if (!special.icon.length) P('Low', 'missing-icon', 'app/', 'no icon/apple-icon (only favicon.ico)');
if (!special.manifest.length) P('Low', 'missing-manifest', 'app/', 'no manifest');
if (layout) {
  if (!layout.metadataBase) P('High', 'no-metadataBase', layout.file, 'relative canonical/OG URLs are not resolved to the domain');
  if (!layout.titleTemplate) P('Medium', 'no-title-template', layout.file, 'no title.template ("%s | Brand")');
  if (layout.lang && !/^es/.test(layout.lang)) P('High', 'root-layout-lang', `${layout.file}:${layout.langLine}`, `lang="${layout.lang}"`);
  if (/create next app/i.test(layout.title || '')) P('Critical', 'template-metadata', `${layout.file}:${layout.titleLine}`, `title "${layout.title}"`);
  if (layout.headTags.length) P('Low', 'manual-head', layout.file, layout.headTags.join(' '));
}
for (const p of pages) {
  if (!p.metadata) { if (p.route !== '/' || !layout?.title) P('High', 'page-without-metadata', p.file, `${p.route}: inherits the layout title/description (duplicates)`); }
  else { if (!p.description) P('Medium', 'metadata-without-description', `${p.file}:${p.line}`, p.route); if (!p.canonical) P('Medium', 'metadata-without-canonical', `${p.file}:${p.line}`, p.route); }
  if (p.useClient && p.metadata) P('High', 'metadata-in-client-component', p.file, 'metadata only works in Server Components');
  if (p.h1 > 1) P('Medium', 'multiple-h1-in-code', p.file, `${p.h1} <h1>`);
}
if (seedsOut) writeFileSync(seedsOut, pages.filter(p => !p.dynamic).map(p => p.route).join('\n') + '\n');
console.log(JSON.stringify({ appDir: rel(appDir), routes: pages.map(p => p.route), pages, rootLayout: layout, special, config, problems }, null, 1));
```

What else to check by hand in the code:

- **Special files** (Next 16 docs): `app/sitemap.ts` (or `sitemap.xml`), `app/robots.ts`, `app/opengraph-image.(png|tsx)` and `twitter-image` (max. 8 MB and 5 MB; otherwise the build fails), `app/icon.*` and `app/apple-icon.*`, `app/manifest.ts`, `app/not-found.tsx`. `favicon.ico` can only live at the root of `app/`. Metadata files take priority over the `metadata` object.
- **Metadata inheritance**: objects are merged **shallowly**. A page that defines `openGraph: { title }` loses the layout's `openGraph.images`. Share the fields through a common object.
- **`alternates.canonical`**: with `metadataBase`, `canonical: './'` in the root layout resolves to each page's URL (verified in Next 16.4), but `canonical: '/'` makes **all** of them point to the home page. Without `metadataBase`, a relative URL in a field that requires one breaks the build.
- **Manual `<head>`** in `layout.tsx` (hand-written `<link>`, `<meta>`, `<title>`): these must go through the Metadata API so they aren't duplicated.
- **Navigation without `<a href>`**: `rg -n "onClick=.*(location\.href|router\.push)" app components`. Google only discovers links that are `<a href>`.
- **URLs**: lowercase, hyphenated and without accents. Routes come from the folder names the AI chose (`app/Servicios_Nuevos/`).

## Step 3. Crawl without JavaScript

Start the production build on a free port and crawl from the home page. `--seeds` adds the routes from the code to discover those nobody links to. `--site` is the production domain: canonical, OG and hreflang must point to it.

```bash
node /tmp/qa-technical-seo/crawl.mjs http://localhost:3000/ --site https://www.cliente.es --lang es \
  --seeds /tmp/qa-technical-seo/seeds.txt --out /tmp/qa-technical-seo/out
# staging: --mode staging (requires noindex); external links: --external (slower)
```

It generates `out/pages.jsonl` (one line per URL with all the data), `out/summary.json` (findings with severity) and a grouped summary on the console. It also requests a non-existent URL to check the **real 404**.

`crawl.mjs`:

```js
// crawl.mjs: SEO crawler without JavaScript (what a non-rendering bot sees). Walks the site from the home page
// following internal <a href> and extracts per URL: status, redirect chain, title, description, canonical,
// robots (meta and X-Robots-Tag), h1/hierarchy, lang, hreflang, Open Graph/Twitter, images without alt and broken links.
// Usage: node crawl.mjs <baseUrl> [--site https://production-domain.es] [--lang es] [--mode prod|staging]
//        [--max 300] [--seeds /a,/b | --seeds routes.txt] [--external] [--out ./seo-out]
// Output: <out>/pages.jsonl (one line per URL), <out>/summary.json (aggregated findings) and a summary on stdout.
import * as cheerio from 'cheerio';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? (args[i + 1]?.startsWith('--') || args[i + 1] === undefined ? true : args[i + 1]) : d; };
const BASE = new URL(args[0] || 'http://localhost:3000/');
const SITE = opt('site', null) ? new URL(opt('site')).origin : null;    // production domain expected in canonical/OG
const LANG = String(opt('lang', 'es')).toLowerCase(), MODE = opt('mode', 'prod'), MAX = Number(opt('max', 300)), OUT = opt('out', './seo-out');
const CHECK_EXTERNAL = !!opt('external', false), UA = opt('ua', 'Mozilla/5.0 (compatible; qa-technical-seo/1.0)');
mkdirSync(OUT, { recursive: true });

const seedsArg = opt('seeds', '');
const seeds = !seedsArg ? [] : (existsSync(seedsArg) ? readFileSync(seedsArg, 'utf8').split(/\s+/) : String(seedsArg).split(',')).filter(Boolean);
const TEMPLATE_TITLES = /^(create next app|next\.js|my app|untitled|document|home|vite \+ react|react app)$/i;
const TEMPLATE_DESC = /generated by create next app|^description$|lorem ipsum/i;

const norm = (u, base) => { try { const x = new URL(u, base); x.hash = ''; return x.href; } catch { return null; } };
const isInternal = u => { try { return new URL(u).origin === BASE.origin; } catch { return false; } };
const skipPath = u => /\/_next\/|\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|map|woff2?|ttf|pdf|zip|mp4|webm|xml|txt|json)(?:\?|$)/i.test(new URL(u).pathname);

async function get(url, method = 'GET') {
  const chain = []; let cur = url;
  for (let i = 0; i < 10; i++) {
    let r; try { r = await fetch(cur, { method, redirect: 'manual', headers: { 'user-agent': UA, accept: 'text/html,*/*' }, signal: AbortSignal.timeout(20000) }); }
    catch (e) { return { url, finalUrl: cur, status: 0, error: String(e.cause?.code || e.message), chain }; }
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { const to = norm(r.headers.get('location'), cur); chain.push({ status: r.status, from: cur, to }); cur = to; continue; }
    const body = method === 'GET' ? await r.text().catch(() => '') : '';
    return { url, finalUrl: cur, status: r.status, headers: Object.fromEntries(r.headers), body, chain };
  }
  return { url, finalUrl: cur, status: 0, error: 'too many redirects', chain };
}

function analyze(res) {
  const $ = cheerio.load(res.body);
  // Read from the whole document: with metadata streaming Next puts it in <body> (flagged separately in metaInBody)
  const metaN = n => $(`meta[name="${n}" i]`).first().attr('content')?.trim();
  const metaP = p => $(`meta[property="${p}"]`).first().attr('content')?.trim();
  const titles = $('title').filter((_, e) => !$(e).parents('svg').length).map((_, e) => $(e).text().trim()).get();
  const canon = $('link[rel="canonical"]').map((_, e) => $(e).attr('href')).get();
  const headings = $('body').find('h1,h2,h3,h4,h5,h6').map((_, e) => ({ l: +e.tagName[1], t: $(e).text().trim().replace(/\s+/g, ' ').slice(0, 80) })).get();
  const jumps = []; for (let i = 1; i < headings.length; i++) if (headings[i].l > headings[i - 1].l + 1) jumps.push(`h${headings[i - 1].l}→h${headings[i].l} ("${headings[i].t}")`);
  const links = $('a[href]').map((_, e) => ({ href: $(e).attr('href'), text: $(e).text().trim().slice(0, 60), rel: $(e).attr('rel') || '' })).get();
  const imgs = $('img').map((_, e) => ({ src: $(e).attr('src') || $(e).attr('data-src') || '', alt: $(e).attr('alt') })).get();
  const $t = cheerio.load(res.body.replace(/></g, '> <'));   // space between tags so words can be counted
  $t('script,style,noscript,template,svg,title').remove();
  const text = $t('body').text().replace(/\s+/g, ' ').trim();
  return {
    lang: $('html').attr('lang') || null,
    titles, title: titles[0] ?? null,
    description: metaN('description') ?? null,
    canonical: canon, robotsMeta: [metaN('robots'), metaN('googlebot')].filter(Boolean).join(' | ') || null,
    robotsInBody: $('body meta[name="robots" i]').map((_, e) => $(e).attr('content')).get(),
    metaInBody: $('body title, body meta[name="description"], body link[rel="canonical"], body meta[property^="og:"]').length,
    viewport: !!metaN('viewport'),
    hreflang: $('link[rel="alternate"][hreflang]').map((_, e) => ({ lang: $(e).attr('hreflang'), href: $(e).attr('href') })).get(),
    og: { title: metaP('og:title'), description: metaP('og:description'), image: metaP('og:image'), url: metaP('og:url'), type: metaP('og:type'), locale: metaP('og:locale'),
      w: metaP('og:image:width'), h: metaP('og:image:height') },
    twitter: { card: metaN('twitter:card'), image: metaN('twitter:image') },
    icons: $('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]').map((_, e) => $(e).attr('rel')).get(),
    h1: headings.filter(h => h.l === 1).map(h => h.t), firstHeading: headings[0]?.l ?? null, headingJumps: jumps,
    links, imgs, jsonLd: $('script[type="application/ld+json"]').length, words: text ? text.split(' ').length : 0,
  };
}

const pages = new Map(), status = new Map(), linkedFrom = new Map();
const link = (t, src) => { if (!linkedFrom.has(t)) linkedFrom.set(t, new Set()); linkedFrom.get(t).add(src); };
const queue = [norm(BASE.href)];
for (const s of seeds) { const u = norm(s, BASE); if (u) queue.push(u); }
const seedSet = new Set(queue.slice(1));
const reachedByLink = new Set([norm(BASE.href)]);

const probe = await get(BASE.href);
if (!probe.status) { console.error(`${BASE.href} does not respond (${probe.error}). Is the server running?`); process.exit(2); }

while (queue.length && pages.size < MAX) {
  const url = queue.shift();
  if (pages.has(url)) continue;
  const res = await get(url);
  status.set(url, res.status);
  const ct = res.headers?.['content-type'] || '';
  const rec = { url, status: res.status, finalUrl: res.finalUrl, chain: res.chain, error: res.error,
    xRobotsTag: res.headers?.['x-robots-tag'] || null, contentType: ct, bytes: res.body?.length || 0 };
  const finalNorm = norm(res.finalUrl);
  if (res.chain.length && finalNorm !== url && isInternal(finalNorm)) {      // internal redirect: record it and crawl the target
    rec.redirectsTo = finalNorm; if (!pages.has(finalNorm)) queue.push(finalNorm); reachedByLink.add(finalNorm);
  } else if (res.status === 200 && /html/.test(ct)) {
    Object.assign(rec, analyze(res));
    for (const l of rec.links) {
      const t = norm(l.href, res.finalUrl);
      if (!t || !/^https?:/.test(t)) continue;
      link(t, url);
      if (isInternal(t) && !skipPath(t)) { reachedByLink.add(t); if (!pages.has(t)) queue.push(t); }
    }
    const toBase = u => { const t = norm(u, res.finalUrl); return t && SITE && t.startsWith(SITE) ? BASE.origin + t.slice(SITE.length) : t; };
    for (const h of rec.hreflang) { const t = toBase(h.href); if (t) link(t, url + ' (hreflang)'); }
    for (const im of [rec.og.image, rec.twitter.image].filter(Boolean)) { const t = toBase(im); if (t) link(t, url + ' (og:image)'); }
    for (const i of rec.imgs) { const t = norm(i.src, res.finalUrl); if (t && /^https?:/.test(t)) link(t, url); }
  }
  pages.set(url, rec);
}

// Status of linked resources that are not crawled pages (internal images, PDFs, external ones if --external)
for (const t of linkedFrom.keys()) {
  if (status.has(t) || (!isInternal(t) && !CHECK_EXTERNAL)) continue;
  let r = await get(t, 'HEAD');
  if (r.status === 405 || r.status === 403 || r.status === 0) r = await get(t);   // some servers don't accept HEAD
  status.set(t, r.status);
}

// Site-wide check: a non-existent URL must return a real 404
const rnd = norm(`/qa-seo-404-${Date.now()}`, BASE);
const nf = await get(rnd);
const nfa = nf.status && nf.body ? analyze(nf) : {};
const site = {
  notFound: { url: rnd, status: nf.status, noindex: /noindex/i.test(nfa.robotsMeta || '') || nfa.robotsInBody?.some(r => /noindex/i.test(r)), title: nfa.title,
    nextDefault: /could not be found/i.test(nf.body || '') },
};

// ---------- Findings ----------
const issues = [];
const add = (sev, code, url, detail) => issues.push({ sev, code, url, detail });
const titleMap = new Map(), descMap = new Map();
const expectOrigin = SITE || BASE.origin;

for (const p of pages.values()) {
  if (p.status === 0) { add('High', 'no-response', p.url, p.error); continue; }
  if (p.status >= 500) add('Critical', 'error-5xx', p.url, `status ${p.status}`);
  else if (p.status >= 400 && seedSet.has(p.url)) add('High', 'status-4xx', p.url, `status ${p.status} (route from the code or seed)`);   // linked ones are reported as broken-internal-link
  if (p.chain?.length > 1) add('Medium', 'redirect-chain', p.url, p.chain.map(c => `${c.status} → ${c.to}`).join(' · '));
  for (const c of p.chain || []) if ([302, 307].includes(c.status)) add('Low', 'temporary-redirect', p.url, `${c.status} → ${c.to} (if it is permanent, use permanent: true → 308)`);
  if (p.redirectsTo && linkedFrom.has(p.url)) add('Low', 'link-to-redirect', p.url, `linked internally but redirects (${p.chain.map(c => c.status).join('→')}) to ${p.redirectsTo}: link to the target`);
  if (p.status !== 200 || !/html/.test(p.contentType) || p.redirectsTo) continue;

  const noindex = /noindex/i.test(`${p.robotsMeta} ${p.xRobotsTag} ${p.robotsInBody.join(' ')}`);
  if (MODE === 'prod' && noindex) add('Critical', 'noindex-in-production', p.url, `meta: ${p.robotsMeta || '-'} · X-Robots-Tag: ${p.xRobotsTag || '-'} · body: ${p.robotsInBody.join(',') || '-'}`);
  if (MODE === 'staging' && !noindex) add('High', 'staging-indexable', p.url, 'staging without noindex or X-Robots-Tag (and without auth): Google can index it');
  if (p.robotsInBody.length) add('Low', 'robots-in-body', p.url, 'meta robots outside <head> (metadata streaming)');
  if (p.metaInBody) add('Medium', 'metadata-in-body', p.url, `${p.metaInBody} metadata tags in <body> for this user-agent (streaming): check htmlLimitedBots`);

  if (!p.title) add('Critical', 'missing-title', p.url, 'no <title>');
  else {
    if (TEMPLATE_TITLES.test(p.title)) add('Critical', 'template-title', p.url, `"${p.title}"`);
    else if (p.title.length < 15 || p.title.length > 60) add('Low', 'title-length', p.url, `${p.title.length} characters: "${p.title}" (guideline 15–60; Google truncates by width, there is no official limit)`);
    titleMap.set(p.title, [...(titleMap.get(p.title) || []), p.url]);
  }
  if (p.titles.length > 1) add('Medium', 'multiple-titles', p.url, p.titles.join(' | '));
  if (!p.description) add('High', 'missing-description', p.url, 'no meta description');
  else {
    if (TEMPLATE_DESC.test(p.description)) add('Critical', 'template-description', p.url, `"${p.description}"`);
    else if (p.description.length < 70 || p.description.length > 160) add('Low', 'description-length', p.url, `${p.description.length} characters (guideline 70–160)`);
    descMap.set(p.description, [...(descMap.get(p.description) || []), p.url]);
  }
  if (!p.canonical.length) add('Medium', 'missing-canonical', p.url, 'no <link rel="canonical"> (alternates.canonical)');
  if (p.canonical.length > 1) add('High', 'multiple-canonicals', p.url, p.canonical.join(' | '));
  for (const c of p.canonical) {
    if (!/^https?:\/\//.test(c)) add('Medium', 'relative-canonical', p.url, c);
    else if (new URL(c).origin !== expectOrigin) add(SITE ? 'Critical' : 'Medium', 'canonical-other-origin', p.url, `${c} (expected ${expectOrigin})`);
  }
  if (!p.lang) add('High', 'missing-lang', p.url, '<html> without lang');
  else if (!p.lang.toLowerCase().startsWith(LANG)) add('High', 'wrong-lang', p.url, `lang="${p.lang}" (expected ${LANG})`);
  if (!p.viewport) add('Medium', 'missing-viewport', p.url, 'no meta viewport');
  if (p.h1.length === 0) add('High', 'missing-h1', p.url, 'no <h1> in the served HTML');
  if (p.h1.length > 1) add('Medium', 'multiple-h1', p.url, p.h1.map(t => `"${t}"`).join(', '));
  if (p.firstHeading && p.firstHeading !== 1) add('Low', 'first-heading-not-h1', p.url, `starts at h${p.firstHeading}`);
  for (const j of p.headingJumps) add('Low', 'heading-jump', p.url, j);
  if (!p.og.title || !p.og.description || !p.og.image) add('Medium', 'incomplete-open-graph', p.url, `missing: ${['title', 'description', 'image'].filter(k => !p.og[k]).map(k => 'og:' + k).join(', ')}`);
  if (p.og.image && !/^https?:\/\//.test(p.og.image)) add('Medium', 'relative-og-image', p.url, p.og.image);
  if (p.og.image && p.og.w && (p.og.w !== '1200' || p.og.h !== '630')) add('Low', 'og-image-size', p.url, `${p.og.w}×${p.og.h} (recommended 1200×630)`);
  if (!p.twitter.card) add('Low', 'missing-twitter-card', p.url, 'no twitter:card');
  const noAlt = p.imgs.filter(i => i.alt === undefined);
  if (noAlt.length) add('Medium', 'img-missing-alt', p.url, noAlt.map(i => i.src).slice(0, 5).join(', '));
  if (p.words < 50) add('Low', 'little-text-without-js', p.url, `${p.words} words in the served HTML: thin page or client-only content (confirm it with render-check.mjs)`);
  const path = new URL(p.url).pathname;
  if (/[A-Z]|_|%20|[^\x00-\x7F]/.test(path)) add('Low', 'unclean-url', p.url, 'uppercase letters, underscores, spaces or accents in the path');
  if (p.hreflang.length) {
    const langs = p.hreflang.map(h => h.lang.toLowerCase());
    if (!langs.includes('x-default')) add('Low', 'hreflang-missing-x-default', p.url, langs.join(', '));
    if (!p.hreflang.some(h => norm(h.href, p.url) === p.url || norm(h.href, p.url) === p.canonical[0])) add('Medium', 'hreflang-missing-self-reference', p.url, langs.join(', '));
    for (const h of p.hreflang) {
      if (!/^https?:\/\//.test(h.href)) add('Medium', 'relative-hreflang', p.url, h.href);
      if (!/^(x-default|[a-z]{2,3}(-[a-z]{4})?(-([a-z]{2}|\d{3}))?)$/i.test(h.lang)) add('High', 'invalid-hreflang-code', p.url, h.lang);
      const t = pages.get(norm(h.href, p.url));
      if (t?.hreflang && !t.hreflang.some(x => norm(x.href, t.url) === p.url)) add('Medium', 'hreflang-missing-return-link', p.url, `${h.href} does not link back`);
    }
  }
  if (p.url === norm(BASE.href) && !p.icons.length) add('Low', 'missing-icons', p.url, 'no favicon/icon/apple-touch-icon/manifest in <head>');
}
// canonical pointing to another URL (e.g. alternates.canonical: '/' in the root layout, inherited by every page)
const canonTargets = new Map();
const strip = u => u.replace(/\/$/, '');
for (const p of pages.values()) for (const c of (p.canonical || []).slice(0, 1)) {
  if (!/^https?:/.test(c)) continue;
  const local = strip(c.replace(expectOrigin, BASE.origin));
  if (local !== strip(p.url)) canonTargets.set(local, [...(canonTargets.get(local) || []), p.url]);
}
for (const [t, from] of canonTargets) add(from.length > 1 ? 'High' : 'Medium', 'canonical-not-self-referencing', from.join(' , '), `canonical → ${t}${from.length > 1 ? ' (several pages: fixed canonical in a layout?)' : ''}`);
// canonical → URL that is not 200 or is noindex
for (const p of pages.values()) for (const c of p.canonical || []) {
  const t = pages.get(norm(c.replace(expectOrigin, BASE.origin), BASE));
  if (t && t.url !== p.url && (t.status !== 200 || /noindex/i.test(`${t.robotsMeta} ${t.xRobotsTag}`))) add('High', 'canonical-to-non-indexable-url', p.url, `${c} → status ${t.status}`);
}
for (const [t, us] of titleMap) if (us.length > 1) add('High', 'duplicate-title', us.join(' , '), `"${t}" on ${us.length} URLs`);
for (const [d, us] of descMap) if (us.length > 1) add('Medium', 'duplicate-description', us.join(' , '), `"${d.slice(0, 80)}" on ${us.length} URLs`);
for (const [t, from] of linkedFrom) {
  const s = status.get(t);
  if (s === undefined || (s >= 200 && s < 400)) continue;
  const internal = isInternal(t), src = [...from].join(' ');
  const code = /\(hreflang\)/.test(src) ? 'hreflang-to-broken-url' : /\(og:image\)/.test(src) ? 'broken-og-image' : internal ? 'broken-internal-link' : 'broken-external-link';
  add(internal ? 'High' : 'Medium', code, t, `status ${s} · from ${[...from].slice(0, 5).join(', ')}`);
}
for (const s of seedSet) if (!reachedByLink.has(s) && pages.get(s)?.status === 200) add('Medium', 'orphan-page', s, 'exists but no crawlable internal link points to it');
if (site.notFound.status === 200) add('High', 'soft-404', rnd, 'a non-existent URL returns 200');
else if (site.notFound.status !== 404) add('Medium', '404-unexpected-status', rnd, `status ${site.notFound.status}`);
if (site.notFound.nextDefault) add('Low', 'default-404', rnd, 'default Next 404 page (app/not-found.tsx is missing)');

const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
issues.sort((a, b) => order[a.sev] - order[b.sev]);
writeFileSync(`${OUT}/pages.jsonl`, [...pages.values()].map(p => JSON.stringify({ ...p, links: p.links?.length, imgs: p.imgs?.length })).join('\n') + '\n');
const bySev = issues.reduce((a, i) => (a[i.sev] = (a[i.sev] || 0) + 1, a), {});
writeFileSync(`${OUT}/summary.json`, JSON.stringify({ base: BASE.href, site: SITE, mode: MODE, crawled: pages.size, bySev, siteChecks: site, issues }, null, 1));
console.log(JSON.stringify({ crawled: pages.size, urls: [...pages.keys()], bySev, siteChecks: site }, null, 1));
// Summary grouped by code (full detail is in summary.json)
const groups = new Map();
for (const i of issues) { const k = `${i.sev}|${i.code}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); }
for (const [k, list] of groups) {
  const [sev, code] = k.split('|');
  console.log(`[${sev}] ${code} ×${list.length}`);
  for (const i of list.slice(0, 4)) console.log(`    ${i.url} · ${i.detail}`);
  if (list.length > 4) console.log(`    … and ${list.length - 4} more`);
}
```

How to read the output:

- **Title and description**: there is no official character limit; Google truncates by device width. The length thresholds are guidelines (Low). What matters is template, missing or **duplicate** metadata.
- **`metadata-in-body`**: with metadata streaming, the tags arrive inside `<body>` for user-agents not listed in `htmlLimitedBots`. Google processes them (it runs JS and accepts meta robots in the body), but non-rendering bots may not see them. Fixed in step 6.
- **`noindex-in-production`** checks the meta robots (in head and body) and the `X-Robots-Tag` header. It is the most expensive failure: it usually comes from copying the staging configuration.
- **`orphan-page`**: the route exists in the code but no `<a href>` reaches it. If it should rank, link it from the navigation or the footer.
- **`link-to-redirect`**: internal links must point to the final target.
- **`soft-404`** or **`404-unexpected-status`**: Next returns 404 before streaming starts. If `notFound()` is called after the response has started, the status stays at 200 with `noindex` (Google may flag it as a soft 404). For a real 404, check the slug before rendering or in `proxy.ts`.

## Step 4. robots.txt and sitemap.xml

```bash
node /tmp/qa-technical-seo/robots-sitemap.mjs http://localhost:3000/ --site https://www.cliente.es \
  --pages /tmp/qa-technical-seo/out/pages.jsonl > /tmp/qa-technical-seo/robots-sitemap.json
```

`robots-sitemap.mjs`:

```js
// robots-sitemap.mjs: validates robots.txt and sitemap.xml (including sitemap indexes) and cross-checks them with the crawl.
// Usage: node robots-sitemap.mjs <baseUrl> [--site https://production-domain.es] [--pages seo-out/pages.jsonl] [--mode prod|staging] [--max 500]
//   --site: production origin. If the <loc> entries use that domain and you are auditing locally/on staging, they are requested against <baseUrl>.
// Output: JSON on stdout { robots, sitemaps, issues }.
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import { readFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const BASE = new URL(args[0] || 'http://localhost:3000/');
const SITE = opt('site') ? new URL(opt('site')).origin : BASE.origin;
const MODE = opt('mode', 'prod'), MAX = Number(opt('max', 500));
const pagesFile = opt('pages');
const UA = 'Mozilla/5.0 (compatible; qa-technical-seo/1.0)';
const issues = []; const add = (sev, code, where, detail) => issues.push({ sev, code, where, detail });
const toLocal = u => { try { const x = new URL(u); return x.origin === SITE ? BASE.origin + x.pathname + x.search : u; } catch { return u; } };
async function get(url, redirect = 'manual') {
  try { const r = await fetch(url, { redirect, headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
    return { status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() }; }
  catch (e) { return { status: 0, error: String(e.cause?.code || e.message), body: '' }; }
}

// ---------- robots.txt ----------
const robotsUrl = new URL('/robots.txt', BASE).href;
const rr = await get(robotsUrl, 'follow');
const robots = { url: robotsUrl, status: rr.status, contentType: rr.headers?.['content-type'], bytes: Buffer.byteLength(rr.body || '') };
let parser = null;
if (rr.status === 200) {
  parser = robotsParser(new URL('/robots.txt', SITE).href, rr.body);
  robots.text = rr.body.slice(0, 4000);
  robots.sitemaps = parser.getSitemaps();
  const lines = rr.body.split(/\r?\n/).map(l => l.replace(/#.*/, '').trim()).filter(Boolean);
  robots.groups = []; let g = null;
  for (const l of lines) {
    const [k, ...v] = l.split(':'); const key = k.trim().toLowerCase(), val = v.join(':').trim();
    if (key === 'user-agent') { if (!g || g.rules.length) robots.groups.push(g = { agents: [], rules: [] }); g.agents.push(val); }
    else if (g && /^(allow|disallow|crawl-delay|content-signal)$/.test(key)) g.rules.push(`${key}: ${val}`);
    else if (/^(noindex|nofollow)$/.test(key)) add('Medium', 'robots-unsupported-directive', robotsUrl, `"${l}": Google does not support noindex in robots.txt`);
  }
  if (!/text\/plain/.test(robots.contentType || '')) add('Medium', 'robots-content-type', robotsUrl, robots.contentType);
  if (robots.bytes > 500 * 1024) add('Medium', 'robots-too-large', robotsUrl, `${robots.bytes} bytes (Google reads 500 KiB)`);
  const blocksAll = parser.isDisallowed(new URL('/', SITE).href, 'Googlebot');
  if (MODE === 'prod' && blocksAll) add('Critical', 'robots-blocks-all', robotsUrl, 'Googlebot cannot crawl "/" (staging robots in production?)');
  if (MODE === 'staging' && !blocksAll) add('Medium', 'staging-robots-open', robotsUrl, 'on staging the right approach is auth or noindex (X-Robots-Tag); robots.txt alone is not enough');
  if (parser.isDisallowed(new URL('/_next/static/chunks/x.js', SITE).href, 'Googlebot')) add('High', 'robots-blocks-next-static', robotsUrl, 'blocks /_next/: Google cannot render CSS/JS');
  if (!robots.sitemaps.length) add('Low', 'robots-missing-sitemap', robotsUrl, 'no Sitemap: line');
  for (const s of robots.sitemaps) if (!/^https?:\/\//.test(s)) add('High', 'robots-relative-sitemap', robotsUrl, s);
    else if (new URL(s).origin !== SITE) add('High', 'robots-sitemap-other-domain', robotsUrl, `${s} (expected ${SITE})`);
} else if (rr.status === 404) add('High', 'missing-robots', robotsUrl, '404: everything is crawled, but there is no Sitemap: line and no decisions about bots (create app/robots.ts)');
else if (rr.status >= 500 || rr.status === 0) add('Critical', 'robots-5xx', robotsUrl, `status ${rr.status}${rr.error ? ' ' + rr.error : ''}: Google stops crawling the site while it lasts`);
else add('Medium', 'robots-status', robotsUrl, `status ${rr.status}`);

// ---------- sitemaps ----------
const queue = [...new Set([...(robots.sitemaps || []).map(s => new URL(s, SITE).href), new URL('/sitemap.xml', SITE).href])];
const sitemaps = []; const locs = new Map(); const seen = new Set();
while (queue.length) {
  const sm = queue.shift(); if (seen.has(sm)) continue; seen.add(sm);
  const r = await get(toLocal(sm), 'follow');
  const info = { url: sm, status: r.status, contentType: r.headers?.['content-type'], bytes: Buffer.byteLength(r.body || '') };
  sitemaps.push(info);
  if (r.status !== 200) { add(sm.endsWith('/sitemap.xml') && !(robots.sitemaps || []).includes(sm) ? ((robots.sitemaps || []).length ? 'Low' : 'High') : 'Critical', 'sitemap-unreachable', sm, `status ${r.status}`); continue; }
  const $ = cheerio.load(r.body, { xml: true });
  const rootTag = $.root().children().first().prop('tagName')?.toLowerCase();
  info.type = rootTag;
  if (!/^(urlset|sitemapindex)$/.test(rootTag || '')) { add('Critical', 'sitemap-invalid-xml', sm, `root <${rootTag}>`); continue; }
  if (!/sitemaps\.org\/schemas\/sitemap\/0\.9/.test(r.body)) add('High', 'sitemap-missing-namespace', sm, 'missing xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  if (info.bytes > 50 * 1024 * 1024) add('High', 'sitemap-too-large', sm, `${info.bytes} bytes (max. 50 MB uncompressed)`);
  if (rootTag === 'sitemapindex') { $('sitemap > loc').each((_, e) => queue.push($(e).text().trim())); continue; }
  const urls = $('url');
  info.urls = urls.length;
  if (urls.length > 50000) add('High', 'sitemap-too-many-urls', sm, `${urls.length} (max. 50,000)`);
  const lastmods = [];
  urls.each((_, e) => {
    const loc = $(e).find('loc').first().text().trim(), lm = $(e).find('lastmod').first().text().trim();
    if (lm) lastmods.push(lm);
    if (!/^https?:\/\//.test(loc)) add('High', 'sitemap-relative-loc', sm, loc);
    else if (new URL(loc).origin !== SITE) add('High', 'sitemap-loc-other-domain', sm, `${loc} (expected ${SITE})`);
    if (lm && (isNaN(Date.parse(lm)) || !/^\d{4}-\d{2}-\d{2}/.test(lm))) add('Medium', 'sitemap-invalid-lastmod', loc, lm);
    else if (lm && Date.parse(lm) > Date.now() + 86400000) add('Medium', 'sitemap-future-lastmod', loc, lm);
    if (locs.has(loc)) add('Low', 'sitemap-duplicate-url', loc, sm);
    locs.set(loc, { sitemap: sm, lastmod: lm || null });
  });
  if (lastmods.length > 3 && new Set(lastmods.map(l => l.slice(0, 16))).size === 1) add('Low', 'sitemap-identical-lastmod', sm, `every URL has lastmod ${lastmods[0]} (new Date() at build time?): Google ignores it if it is not reliable`);
}

// ---------- Each sitemap URL: 200, indexable, canonical ----------
const crawled = new Map();
if (pagesFile && existsSync(pagesFile)) for (const l of readFileSync(pagesFile, 'utf8').split('\n').filter(Boolean)) { const p = JSON.parse(l); crawled.set(p.url, p); }
let checked = 0;
for (const loc of locs.keys()) {
  if (checked++ >= MAX) { add('Low', 'sitemap-not-fully-checked', '', `only ${MAX} URLs were checked`); break; }
  const local = toLocal(new URL(loc, SITE).href);
  const r = await get(local);
  if (r.status >= 300 && r.status < 400) { add('High', 'sitemap-url-redirects', loc, `${r.status} → ${r.headers.location}`); continue; }
  if (r.status !== 200) { add('High', 'sitemap-url-not-200', loc, `status ${r.status}`); continue; }
  const $ = cheerio.load(r.body);
  const robotsMeta = $('meta[name="robots" i]').attr('content') || '';
  if (/noindex/i.test(robotsMeta + (r.headers['x-robots-tag'] || ''))) add('High', 'sitemap-url-noindex', loc, 'noindex URL inside the sitemap');
  const canon = $('head link[rel="canonical"]').attr('href');
  if (canon && canon.replace(/\/$/, '') !== loc.replace(/\/$/, '')) add('Medium', 'sitemap-url-not-canonical', loc, `canonical → ${canon}`);
  if (parser?.isDisallowed(loc, 'Googlebot')) add('High', 'sitemap-url-blocked-by-robots', loc, 'in the sitemap but blocked in robots.txt');
}
// Cross-check with the crawl: indexable pages missing from the sitemap
if (crawled.size && locs.size) {
  const inSitemap = new Set([...locs.keys()].map(l => toLocal(l).replace(/\/$/, '')));
  for (const p of crawled.values()) {
    if (p.status !== 200 || !/html/.test(p.contentType || '') || /noindex/i.test(`${p.robotsMeta} ${p.xRobotsTag}`)) continue;
    if (!inSitemap.has(p.url.replace(/\/$/, ''))) add('Medium', 'page-missing-from-sitemap', p.url, 'indexable and linked, but not in the sitemap');
  }
}
if (crawled.size && parser) for (const p of crawled.values())
  if (p.status === 200 && parser.isDisallowed(p.url.replace(BASE.origin, SITE), 'Googlebot')) add('High', 'page-blocked-by-robots', p.url, `robots.txt line ${parser.getMatchingLineNumber(p.url.replace(BASE.origin, SITE), 'Googlebot')}`);

const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
issues.sort((a, b) => order[a.sev] - order[b.sev]);
console.log(JSON.stringify({ base: BASE.href, site: SITE, robots, sitemaps, sitemapUrls: locs.size, issues }, null, 1));
```

Rules it applies (Google Search Central):

- `robots.txt` returning 5xx or unreachable: Google stops crawling the site while it lasts (Critical). With 404, it crawls everything.
- `Disallow: /` for `*` or Googlebot in production is Critical. `noindex` in robots.txt is not supported. Blocking `/_next/` prevents rendering.
- A `Disallow` does **not** deindex: if the URL is linked it can appear without a snippet. To remove something from the index, use `noindex` and let it be crawled.
- Sitemap: absolute URLs on the canonical domain, max. 50,000 URLs or 50 MB per file. Google ignores `priority` and `changefreq` and only uses `lastmod` if it is reliable: `lastModified: new Date()` on every entry makes it useless.
- Every sitemap URL must return 200, be indexable and be its own canonical; and every indexable page should be in the sitemap.

Decisions about AI crawlers in robots.txt (GPTBot, ClaudeBot…) belong to the `qa-geo` skill.

## Step 5. Server-rendered content

```bash
node /tmp/qa-technical-seo/render-check.mjs --pages /tmp/qa-technical-seo/out/pages.jsonl > /tmp/qa-technical-seo/render.json
```

Compares the served HTML with the DOM rendered in Chromium. Google renders JavaScript, but not always and not immediately, it doesn't render non-200 responses and it may skip rendering if it sees `noindex`. Bing renders in a more limited way, and no AI provider documents that its crawlers run JS (published log analyses suggest they don't). What matters (main text, links, title, canonical, robots) must be in the initial HTML. The typical case in AI-generated websites: a `"use client"` on the page that loads the text in a `useEffect`.

`render-check.mjs`:

```js
// render-check.mjs: compares the served HTML (no JS) with the DOM rendered in Chromium (with JS).
// Detects content, links, title, canonical or robots that only exist after running JavaScript.
// Usage: node render-check.mjs <url1> [url2 ...]   |   node render-check.mjs --pages seo-out/pages.jsonl
// Output: JSON per URL with differences and findings.
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
let urls = args.filter(a => /^https?:/.test(a));
const pi = args.indexOf('--pages');
if (pi >= 0) urls = readFileSync(args[pi + 1], 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(p => p.status === 200 && !p.redirectsTo && /html/.test(p.contentType || '')).map(p => p.url);

const EXTRACT = html => {
  const $ = cheerio.load(html.replace(/></g, '> <'));   // space between tags so words can be counted
  const meta = { title: $('title').first().text().trim(), description: $('meta[name="description"]').attr('content') || '',
    canonical: $('link[rel="canonical"]').attr('href') || '', robots: $('meta[name="robots"]').map((_, e) => $(e).attr('content')).get().join(','),
    h1: $('h1').map((_, e) => $(e).text().trim()).get().join(' | '), links: $('a[href]').length, jsonLd: $('script[type="application/ld+json"]').length };
  $('script,style,noscript,template,svg,title').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return { ...meta, words: text ? text.split(' ').length : 0, text };
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 qa-technical-seo', locale: 'es-ES' });
const out = [];
for (const url of urls) {
  try {
    const raw = EXTRACT(await (await fetch(url, { headers: { 'user-agent': 'qa-technical-seo' } })).text());
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    const ren = EXTRACT(await page.content());
    await page.close();
    const issues = [];
    const onlyJsWords = ren.words - raw.words;
    if (onlyJsWords > 100 && ren.words > raw.words * 1.5) issues.push({ sev: 'High', code: 'content-only-with-js', detail: `${raw.words} words without JS vs ${ren.words} with JS` });
    else if (onlyJsWords > 30) issues.push({ sev: 'Low', code: 'some-content-with-js', detail: `+${onlyJsWords} words after JS` });
    for (const k of ['title', 'canonical', 'robots', 'description', 'h1'])
      if (raw[k] !== ren[k]) issues.push({ sev: ['canonical', 'robots'].includes(k) ? 'High' : 'Medium', code: `${k}-changes-with-js`, detail: `without JS: "${raw[k].slice(0, 80)}" · with JS: "${ren[k].slice(0, 80)}"` });
    if (ren.links > raw.links) issues.push({ sev: 'Medium', code: 'links-only-with-js', detail: `${raw.links} links without JS vs ${ren.links} with JS` });
    if (ren.jsonLd > raw.jsonLd) issues.push({ sev: 'Medium', code: 'jsonld-only-with-js', detail: `${raw.jsonLd} vs ${ren.jsonLd}` });
    // Sentences that only appear with JS (sample)
    const rawSet = new Set(raw.text.split(/(?<=[.!?])\s+/));
    const jsOnly = ren.text.split(/(?<=[.!?])\s+/).filter(s => s.length > 30 && !rawSet.has(s) && !raw.text.includes(s)).slice(0, 3);
    out.push({ url, raw: { words: raw.words, links: raw.links, title: raw.title, h1: raw.h1 }, rendered: { words: ren.words, links: ren.links, title: ren.title, h1: ren.h1 }, jsOnlySample: jsOnly, issues });
  } catch (e) { out.push({ url, error: e.message.split('\n')[0] }); }
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
```

## Step 6. Manual and configuration checks

- **`lang`**: `<html lang="es">` (or `es-ES`) in `app/layout.tsx`. On multilingual sites, the `app/[lang]/` layout must set the segment's language.
- **hreflang** (multilingual only): `alternates.languages` on every page, with a self-reference, valid ISO codes (`es-ES`, `en`), `x-default` and **reciprocity** (if A points to B, B points to A). Each target must return 200.
- **Open Graph / Twitter**: `og:title`, `og:description`, an absolute 1200×630 `og:image` that returns 200, and `twitter:card: summary_large_image`. Preview it with the LinkedIn or Facebook debuggers if the site is already public.
- **Redirects**: in `next.config` (`redirects()`), `permanent: true` returns **308**, not 301. Google treats 308 like 301, so there's no need to force `statusCode: 301`. In a migration, cross-check the list of old URLs (old sitemap, Search Console, Analytics) with the new site: each old URL must redirect in a single hop to its equivalent, not to the home page. Also check `http→https` and `www`/non-`www` with `curl -sI`.
- **Staging indexability**: `curl -sI https://staging… | grep -i x-robots-tag`. The safe options are password-protecting staging or sending `X-Robots-Tag: noindex` from `headers()` only outside production. A `robots.txt` with `Disallow: /` is not enough. Check in production that this header is **not** present.
- **Metadata streaming and bots**: if `metadata-in-body` appears on pages that should rank, add the bots that don't run JS to `htmlLimitedBots` (section "If the user asks for fixes"). `htmlLimitedBots` **replaces** the default list, so you have to copy it.
- **Basic structured data**: check in `pages.jsonl` that the home page has JSON-LD (`jsonLd > 0`). Full validation (types, NAP, visible content) is in `qa-geo`.
- **Search Console and Bing Webmaster Tools** (requires access from the client; don't do it without it): verify the domain property (DNS), submit the sitemap, review the pages report and run "URL Inspection" on the home page and on one page per template. Bing can import from Search Console and supports IndexNow. Without access, leave it as a pending task in the report.

## Severity

| Level | Examples in this phase |
|---|---|
| **Critical** | `noindex` or `X-Robots-Tag: noindex` in production; `robots.txt` with `Disallow: /` or 5xx; template metadata ("Create Next App"); pages without `<title>`; 5xx errors; canonical to a staging domain |
| **High** | Duplicate title; no description; wrong `lang`; broken internal links; no sitemap or robots.txt; soft 404; multiple canonicals or canonical to a non-indexable URL; sitemap URLs that redirect or return 404; main content only with JS; no `metadataBase`; broken hreflang |
| **Medium** | No canonical; several `<h1>`; incomplete OG or relative `og:image`; duplicate description; images without `alt`; orphan pages or pages missing from the sitemap; redirect chains; metadata in `<body>` due to streaming |
| **Low** | Title/description lengths; heading jumps; no `twitter:card`; default Next 404; identical `lastmod`; links to redirects; no icons or manifest; URLs with uppercase letters or underscores |

## Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

Write the report in the user's language.

Save `technical-seo.md` (and `technical-seo.json` with the union of `summary.json`, `robots-sitemap.json`, `routes.json` and `render.json`):

```markdown
# Technical SEO — <project> — <date> — commit <hash>
Audited environment: <URL> (production build) · Canonical domain: <https://…> · Next <version>
Summary: X critical · Y high · Z medium · W low · N URLs crawled · sitemap: N URLs · robots.txt: OK/KO

## Blockers before launch
| # | Sev. | URL / file:line | Finding | Evidence | Fix |
|---|---|---|---|---|---|
| S-001 | Critical | app/layout.tsx:11 | Template metadata on every page | `<title>Create Next App</title>` on 4/4 URLs | metadata with `title.template` and its own description (see below) |

## Indexability (robots, noindex, canonical, status, sitemap)
## Metadata per page (table URL · title (length) · description (length) · canonical · h1)
## Broken links and redirects (target · status · linked from)
## Headings, language and hreflang
## Open Graph and special files
## Content without JavaScript
## Pending: Search Console / Bing Webmaster Tools
```

Group repeated items ("template description on 12 URLs") and leave the detail in the JSON. Each finding carries evidence (URL, `file:line`, header or HTML fragment), why it matters in one sentence, and the fix.

## False positives and limitations

- The crawl only follows `<a href>` from the served HTML. Dynamic routes (`[slug]`) don't appear in `seeds.txt`: add real examples by hand.
- `little-text-without-js` is a guideline: it's normal on legal or contact pages. `render-check.mjs` gives the verdict.
- When auditing locally with `--site`, a canonical to the production domain is correct; without `--site`, it is reported as Medium so you can review it.
- `img-missing-alt` only flags images **without** an `alt` attribute. `alt=""` is valid on decorative images.
- Headers added by the hosting (Vercel, Cloudflare) don't exist locally: rerun `crawl.mjs` against staging and production.
- External links are only checked with `--external`. Some sites return 403 to automated requests: verify them by hand before reporting them as broken.

## If the user asks for fixes

Order: indexability (noindex, robots, status) → root layout metadata → per-page metadata → links and redirects → sitemap → the rest. After each block, `next build`, start the server and rerun the scripts.

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
export const metadata: Metadata = {
  metadataBase: new URL('https://www.cliente.es'),
  title: { template: '%s | Cliente', default: 'Cliente · Qué hace en una frase' },   // Spanish site copy: "what the business does, in one sentence"
  description: 'Descripción propia de 70–160 caracteres con el servicio y la ubicación.',   // unique 70–160 char description with service and location
  alternates: { canonical: './' },                      // './', not '/': each page canonicalizes to itself
  openGraph: { siteName: 'Cliente', locale: 'es_ES', type: 'website' },
  twitter: { card: 'summary_large_image' },
}
// <html lang="es">
```

```ts
// app/robots.ts
import type { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: 'https://www.cliente.es/sitemap.xml' }
}
// app/sitemap.ts: one entry per indexable page, absolute URLs and a real lastModified (content date, not new Date())
```

```ts
// next.config.ts
import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  async redirects() { return [{ source: '/servicios-antiguos', destination: '/servicios', permanent: true }] },  // 308
  async headers() {                                   // noindex outside production
    // VERCEL_ENV only exists on Vercel; on other hosting, set NOINDEX=1 on staging only
    const noindex = process.env.VERCEL_ENV ? process.env.VERCEL_ENV !== 'production' : process.env.NOINDEX === '1'
    return !noindex ? [] : [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] }]
  },
  // Only if there is metadata in <body>: Next 16.4 default list + bots that don't run JS
  htmlLimitedBots: /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-SearchBot|Claude-User|PerplexityBot|Perplexity-User|meta-externalagent|meta-webindexer|CCBot/i,
}
```

Add `app/not-found.tsx` with useful links (Next adds `noindex` by itself). After launch, submit the sitemap in Search Console and Bing Webmaster Tools.

## Sources

- Next 16 docs shipped in `node_modules/next/dist/docs/` (generate-metadata, sitemap, robots, opengraph-image, app-icons, manifest, not-found, redirects, htmlLimitedBots, loading#status-codes).
- Google: [title links](https://developers.google.com/search/docs/appearance/title-link) · [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) · [robots meta and X-Robots-Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag) · [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) · [documentation updates](https://developers.google.com/search/updates)
- Bing: [Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)
