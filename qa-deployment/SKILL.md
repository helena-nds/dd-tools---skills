---
name: qa-deployment
description: Reviews the deployment of a Next.js website - environment variables per environment, noindex on staging and previews, domain and www/apex redirect, HTTPS/HSTS, asset caching, render strategy per route from next build, standalone and Docker, regions, ISR, 404/500, redirects, monitoring, rollback and backups. Use it whenever someone asks to review a deployment, staging, previews, the domain, Vercel, Docker, caching or whether the website is ready to go to production, even if "deployment" isn't mentioned.
---

# Deployment and infrastructure review

The question is: **is what's published what should be, on the right domain, indexable only where it should be, and with a way back if something fails?** In websites generated from Figma with AI, the code usually arrives "working locally" and deployment is done by hand: staging indexed by Google with test content, production with a forgotten `noindex`, `www` and non-`www` serving the same site, legal pages rendered on every visit for no reason, no custom 404 and nobody watching whether the site goes down.

**By default, nothing is modified** (no code, no DNS, no hosting configuration): deliver the report and fix things only if the user asks. The tools go in `/tmp/qa-deployment/`. Out of scope: speed and Core Web Vitals (`qa-performance-cwv`), security headers, secrets and CVEs (`qa-security`), cookies (`qa-legal`), CI and tests (`qa-maintainability`).

## Step 0. Context

Ask or find out:

1. **URLs**: production (with and without `www`), staging and a sample preview. Which is the canonical domain?
2. **Hosting**: Vercel, Netlify, Cloudflare, own Docker/VPS… (`vercel.json`, `netlify.toml`, `Dockerfile`, `.github/workflows`). On Vercel: plan and whether previews have Deployment Protection.
3. **Next**: version (15 and 16 change the `next build` output and the `proxy.ts` convention), `cacheComponents`, `output` (`standalone`, `export`), `images`, `redirects`/`rewrites`.
4. **Data**: CMS, database or forms that store anything (determines backups and rollback).
5. **ripgrep**: the commands use `rg`. If it isn't installed (`rg --version`), `brew install ripgrep`, or replace `rg --files …` with `git ls-files -co --exclude-standard` and `rg -n` with `grep -rnE`.
6. Prepare the tools directory:

```bash
mkdir -p /tmp/qa-deployment && cd /tmp/qa-deployment && npm init -y >/dev/null
# Write build-routes.mjs and deploy-check.mjs here (Node 22 only, no dependencies).
```

## Step 1. Render strategy per route (`next build`)

```bash
cd <project> && npx next build 2>&1 | tee /tmp/qa-deployment/build.log
node /tmp/qa-deployment/build-routes.mjs /tmp/qa-deployment/build.log . > /tmp/qa-deployment/routes.json
```

Route table symbols:

| Symbol | Without Cache Components (Next 15, or 16 without `cacheComponents`) | With Cache Components (Next 16) |
|---|---|---|
| `○` | Static: full HTML at build time | Same: full HTML |
| `●` | SSG with `generateStaticParams`/`getStaticProps` | Doesn't appear in App Router |
| `◐` | — | Partial Prerender: static shell + streamed parts |
| `ƒ` | Dynamic: rendered on every request | Empty prerender accepted: everything is rendered on every request |

The `Revalidate` and `Expire` columns (Next 16) show the shortest revalidation among the route's `use cache` entries (default profile: 15 min and 1 year). Route Handlers, the proxy (row `ƒ Proxy (Middleware)`) and dynamic OG images are always `ƒ`. In Next 15 the table also has size columns (`Size`, `First Load JS`).

`build-routes.mjs`:

```js
// build-routes.mjs: parses the `next build` route table and cross-checks it with the .next/ manifests.
// Usage: npx next build 2>&1 | tee /tmp/qa-deployment/build.log
//        node build-routes.mjs /tmp/qa-deployment/build.log <project-root> > routes.json
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [logPath, root = '.'] = process.argv.slice(2);
const log = readFileSync(logPath, 'utf8').replace(/\x1b\[[0-9;]*m/g, '');
const json = f => { try { return JSON.parse(readFileSync(join(root, '.next', f), 'utf8')); } catch { return null; } };
const SYM = { '○': 'static', '●': 'ssg', '◐': 'partial', 'ƒ': 'dynamic', 'λ': 'dynamic' };
const out = { next: (log.match(/Next\.js ([\d.]+[\w.-]*)/) || [])[1] || null, cacheComponents: /Cache Components enabled/.test(log),
  proxy: /ƒ Proxy \(Middleware\)|Proxy \(Middleware\)|ƒ Middleware/.test(log), routes: [], summary: {}, findings: [] };
const add = (sev, id, msg, route) => out.findings.push({ sev, id, msg, ...(route && { route }) });

// Rows: "├ ○ /blog   1h   1d" (group rows without a symbol group the routes generated below them)
let router = null;
for (const line of log.split('\n')) {
  const h = line.match(/^Route \((app|pages)\)/); if (h) { router = h[1]; continue; }
  if (!router) continue;
  const m = line.match(/^[\s│├└┌─]*([○●◐ƒλ])\s+(\S+)(?:\s+(\S+))?(?:\s+(\S+))?/);
  if (m && m[2].startsWith('/')) {
    const t = /^\d+(?:s|m|h|d|w|y)$/;                                   // Revalidate/Expire columns (not Next 15 sizes)
    out.routes.push({ router, type: SYM[m[1]], symbol: m[1], route: m[2], ...(t.test(m[3]) && { revalidate: m[3], expire: t.test(m[4]) ? m[4] : undefined }), ...(/^[\s│]/.test(line) && { generated: true }) });
  } else if (/^\s*\+\s*\d+ more paths|\[\+\d+ more paths\]/.test(line)) out.routes.at(-1).morePaths = line.trim();
  else if (/^[○●◐ƒ]\s+\(/.test(line.trim())) router = null;          // legend: end of the table
}
// Manifests: actual ISR/revalidate, redirects, rewrites, headers, effective config
const pre = json('prerender-manifest.json'), rm = json('routes-manifest.json'), rsf = json('required-server-files.json');
if (pre) for (const r of out.routes) { const e = pre.routes?.[r.route]; if (e) r.initialRevalidateSeconds = e.initialRevalidateSeconds; }
const cfg = rsf?.config || {};
out.config = { output: cfg.output ?? null, poweredByHeader: cfg.poweredByHeader, trailingSlash: cfg.trailingSlash, images: cfg.images && { unoptimized: cfg.images.unoptimized, minimumCacheTTL: cfg.images.minimumCacheTTL, remotePatterns: cfg.images.remotePatterns?.length },
  deploymentId: cfg.deploymentId || null, expireTime: cfg.expireTime, assetPrefix: cfg.assetPrefix || null };
out.redirects = (rm?.redirects || []).filter(r => !r.internal).map(r => ({ source: r.source, destination: r.destination, status: r.statusCode ?? (r.permanent ? 308 : 307) }));
const rw = rm?.rewrites; out.rewrites = Array.isArray(rw) ? rw.length : rw ? Object.values(rw).flat().length : 0;
out.headerRules = (rm?.headers || []).map(h => ({ source: h.source, keys: h.headers.map(x => x.key) }));

// Error and infrastructure files
const exists = (...fs) => fs.some(f => ['', 'src/'].some(p => existsSync(join(root, p + f))));
const ext = n => ['tsx', 'jsx', 'ts', 'js'].map(e => `app/${n}.${e}`);
out.files = { notFound: exists(...ext('not-found')), error: exists(...ext('error')), globalError: exists(...ext('global-error')),
  instrumentation: exists('instrumentation.ts', 'instrumentation.js'), instrumentationClient: exists('instrumentation-client.ts', 'instrumentation-client.js'),
  robots: exists(...ext('robots'), 'public/robots.txt'), sitemap: exists(...ext('sitemap'), 'public/sitemap.xml'), dockerfile: exists('Dockerfile'), vercelJson: exists('vercel.json') };
if (!out.files.notFound) add('high', 'no-not-found', 'No app/not-found: the 404 is Next\'s generic English one');
if (!out.files.error) add('medium', 'no-error', 'No app/error: a render failure shows the generic screen');
if (!out.files.globalError) add('low', 'no-global-error', 'No app/global-error: a failure in the root layout has no page of its own');
if (!out.files.instrumentation) add('medium', 'no-instrumentation', 'No instrumentation.ts (onRequestError / OpenTelemetry / Sentry): server errors go nowhere');
if (out.files.dockerfile && out.config.output !== 'standalone') add('medium', 'docker-no-standalone', "There is a Dockerfile but no output: 'standalone': the image drags the whole node_modules along");
if (out.config.output === 'standalone') add('info', 'standalone', 'output standalone: copy public/ and .next/static next to server.js (or serve them from a CDN) and start with node server.js, not next start');
if (out.config.output === 'export' && out.proxy) add('critical', 'export-with-proxy', 'output export does not run proxy/middleware');
if (out.config.poweredByHeader !== false) add('low', 'powered-by', 'poweredByHeader not disabled');

// Render strategy per route
const contentRoute = r => !/^\/(api|_not-found|_global-error)\b|\.(xml|txt|ico|png|jpg|webmanifest)$|opengraph-image|twitter-image|icon|apple-icon/.test(r.route);
for (const r of out.routes) {
  if (r.type === 'dynamic' && contentRoute(r) && !r.route.includes('[')) add('medium', 'dynamic-content-page', `${r.route} is rendered on every request: if it is public content (legal notice, services…) it should be ○; look for cookies()/headers()/searchParams/connection() or uncached data`, r.route);
  if (r.type === 'partial' && contentRoute(r)) add('info', 'partial', `${r.route}: static shell + streamed content. Correct if the dynamic part depends on the user`, r.route);
  if (r.revalidate && /^\d+s$/.test(r.revalidate) && parseInt(r.revalidate) < 60) add('low', 'short-revalidate', `${r.route} revalidates every ${r.revalidate}: origin load and cost`, r.route);
}
out.summary = out.routes.reduce((m, r) => (m[r.type] = (m[r.type] || 0) + 1, m), {});
if (!out.routes.length) add('high', 'no-table', 'Route table not found: did the build fail or is the log incomplete?');
const rank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
out.findings.sort((a, b) => rank[a.sev] - rank[b.sev]);
console.log(JSON.stringify(out, null, 1));
```

How to interpret it:

- A corporate or studio website should be almost entirely `○` (or `◐` where something is per user). A content page in `ƒ` (legal notice, services) is rendered on every visit: slower, more expensive and fragile if a service fails. It is usually caused by `cookies()`, `headers()`, `searchParams` or an uncached `fetch` in the layout.
- Revalidations of a few seconds on content that rarely changes: useless load on the origin.
- `output: 'standalone'` is the right choice for Docker: copy `public/` and `.next/static` into `.next/standalone` (or serve them from a CDN) and start with `node server.js`, not `next start`. With several instances, set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` and `deploymentId` so Server Actions and assets don't break across replicas.
- `output: 'export'` doesn't run the proxy, Server Actions, dynamic Route Handlers or the image optimizer.
- Cross-check `redirects` (from the manifest) with the old URLs if the website replaces another one: every indexed URL of the old site should have a 301/308.

## Step 2. Environment variables per environment

1. List the variables the code uses: `rg -o "process\.env\.[A-Z0-9_]+" -N --no-filename app components lib src | sort -u`.
2. Compare them with what is configured in each environment: `vercel env ls` (Vercel CLI), the hosting dashboard or the server's `docker-compose`/secrets. Each variable must exist in **Production** and in **Preview/Staging**, with different values where appropriate (payment keys in test mode on staging, a different database).
3. `NEXT_PUBLIC_*` variables are **frozen at build time**: if a Docker image is built and promoted from staging to production, it will carry the staging values. For per-environment values at runtime, read them on the server.
4. Load order in Next: `process.env` → `.env.$(NODE_ENV).local` → `.env.local` → `.env.$(NODE_ENV)` → `.env`. A committed `.env.production` with real values is a finding (and goes to `qa-security`).
5. A missing variable usually causes a 500 only on the route that uses it: test the form and the `ƒ` routes on staging.

## Step 3. Verify the deployed URL

```bash
node /tmp/qa-deployment/deploy-check.mjs https://www.ejemplo.es/ > /tmp/qa-deployment/prod.json
node /tmp/qa-deployment/deploy-check.mjs https://staging.ejemplo.es/ --staging > /tmp/qa-deployment/staging.json
node /tmp/qa-deployment/deploy-check.mjs https://mi-proyecto-git-rama-equipo.vercel.app/ --staging > /tmp/qa-deployment/preview.json
# --http and --alt force the URLs to compare; --resolve host=ip tests a domain before switching DNS
```

`deploy-check.mjs`:

```js
// deploy-check.mjs: checks a deployed URL: http→https and www/apex redirects, TLS, HSTS, robots (production vs staging),
// caching of /_next/static and /_next/image, real 404, region and timings. Plain GET requests only.
// Usage: node deploy-check.mjs <url> [--staging] [--http <http-url>] [--alt <alternate-host-url>] [--resolve host=ip,host2=ip]
//   --staging: the URL is staging/preview: noindex (or password protection) is expected.
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const base = args.find(a => /^https?:\/\//.test(a) && args[args.indexOf(a) - 1] !== '--http' && args[args.indexOf(a) - 1] !== '--alt');
const staging = args.includes('--staging');
const resolveMap = Object.fromEntries((opt('--resolve') || '').split(',').filter(Boolean).map(s => s.split('=')));
const lookup = (host, o, cb) => resolveMap[host] ? (o.all ? cb(null, [{ address: resolveMap[host], family: 4 }]) : cb(null, resolveMap[host], 4)) : dns.lookup(host, o, cb);

function req(url, { method = 'GET', max = 2e6 } = {}) {
  return new Promise(resolve => {
    const u = new URL(url), t0 = performance.now();
    const r = (u.protocol === 'https:' ? https : http).request(u, { method, agent: false, lookup, timeout: 15000, headers: { 'user-agent': 'qa-deployment/1.0', accept: 'text/html,*/*' } }, res => {
      const ttfb = Math.round(performance.now() - t0), cert = res.socket.getPeerCertificate?.(), chunks = []; let n = 0;
      res.on('data', c => { if (n < max) chunks.push(c); n += c.length; });
      res.on('end', () => resolve({ url, status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8'), ttfb, total: Math.round(performance.now() - t0), cert: cert && cert.valid_to ? cert : null }));
    });
    r.on('timeout', () => r.destroy(new Error('timeout')));
    r.on('error', e => resolve({ url, error: e.code || e.message }));
    r.end();
  });
}
async function chain(url) {                         // follows redirects by hand to see every hop
  const hops = []; let cur = url;
  for (let i = 0; i < 8; i++) { const r = await req(cur); hops.push({ url: cur, status: r.status ?? r.error, location: r.headers?.location });
    if (r.error || !(r.status >= 300 && r.status < 400 && r.headers.location)) return { hops, final: r };
    cur = new URL(r.headers.location, cur).href; }
  return { hops, final: { error: 'too many redirects' } };
}
const out = { url: base, environment: staging ? 'staging/preview' : 'production', checks: {}, findings: [] };
const add = (sev, id, msg, evid) => out.findings.push({ sev, id, msg, ...(evid !== undefined && { evidence: evid }) });
const C = out.checks;

// 1) Main page and redirect chain
const main = await chain(base);
C.main = main.hops;
if (main.final.error) { add('critical', 'unreachable', `Not responding: ${main.final.error}`); console.log(JSON.stringify(out, null, 1)); process.exit(2); }
const fin = main.final, finURL = new URL(main.hops.at(-1).url), H = fin.headers;
const local = /^(localhost|127\.)/.test(finURL.hostname);
if (fin.status === 401 || fin.status === 403) C.protected = `responds ${fin.status}: protected (Vercel Deployment Protection, basic auth…)`;
else if (fin.status !== 200) add('critical', 'status', `The main page responds ${fin.status}`);
if (main.hops.length > 2) add('low', 'redirect-chain', `${main.hops.length - 1} redirects to reach the final URL`, main.hops.map(h => `${h.status} ${h.url}`));
for (const h of main.hops.slice(0, -1)) if (![301, 308].includes(h.status)) add('medium', 'temporary-redirect', `${h.status} (temporary) redirect at ${h.url}: use 301/308 for domains (if it is a language redirect within the same host, ignore it)`, h.location);

// 2) http → https and alternate host (www ↔ apex)
if (finURL.protocol === 'https:') {
  const httpURL = opt('--http') || `http://${finURL.hostname}${finURL.pathname}`;
  const h = await chain(httpURL); C.http = h.hops;
  if (h.final.error && h.hops.length === 1) add('medium', 'http-closed', `${httpURL} does not respond (${h.final.error}): anyone typing http:// doesn't get through`);
  else if (!h.hops[0].location?.startsWith('https:')) add('critical', 'no-https-redirect', `${httpURL} does not redirect to HTTPS`, h.hops[0]);
  else if (![301, 308].includes(h.hops[0].status)) add('medium', 'https-redirect-temporary', `http→https with ${h.hops[0].status}`, h.hops[0]);
  // TLS
  const cert = fin.cert || (await req(finURL.href, { method: 'HEAD' })).cert;
  if (cert) { const days = Math.floor((new Date(cert.valid_to) - Date.now()) / 864e5);
    C.tls = { issuer: cert.issuer?.O || cert.issuer?.CN, expires: cert.valid_to, daysLeft: days, san: cert.subjectaltname };
    if (days < 14) add('high', 'cert-expiring', `The certificate expires in ${days} days`); else if (days < 30) add('medium', 'cert-expiring', `The certificate expires in ${days} days: is renewal automatic?`); }
  const hsts = H['strict-transport-security'];
  if (!hsts) add('high', 'hsts-missing', 'No Strict-Transport-Security'); else C.hsts = hsts;
}
const sub = finURL.hostname.split('.').length > 2 && !finURL.hostname.startsWith('www.');
if (!local && (opt('--alt') || (!staging && !sub))) {
  const altHost = finURL.hostname.startsWith('www.') ? finURL.hostname.slice(4) : `www.${finURL.hostname}`;
  const altURL = opt('--alt') || `${finURL.protocol}//${altHost}/`;
  const a = await chain(altURL); C.alternateHost = a.hops;
  const altFinal = a.hops.at(-1).url;
  if (a.final.error && a.hops.length === 1) add('medium', 'alt-host-down', `${altURL} does not respond (${a.final.error}): missing DNS record or certificate for the www/non-www variant`);
  else if (a.hops.length === 1 && a.final.status === 200) add('high', 'duplicate-host', `${altURL} serves the site without redirecting: duplicate content between www and apex`);
  else if (new URL(altFinal).hostname !== finURL.hostname) add('medium', 'alt-host-elsewhere', `${altURL} ends up at ${altFinal}`);
}

// 3) Indexing: X-Robots-Tag, meta robots and robots.txt
const xrt = H['x-robots-tag'] || '', meta = (fin.body.match(/<meta[^>]+name=["']robots["'][^>]*>/i) || [''])[0];
const robots = await req(new URL('/robots.txt', finURL).href);
const disallowAll = robots.status === 200 && robots.body.split(/\r?\n\s*\r?\n/).some(g => /^\s*User-agent:\s*\*\s*$/im.test(g) && /^\s*Disallow:\s*\/\s*$/im.test(g));
const noindex = /noindex/i.test(xrt) || /noindex/i.test(meta);
C.indexing = { xRobotsTag: xrt || null, metaRobots: meta || null, robotsTxt: robots.status, robotsDisallowAll: disallowAll };
if (!staging && (noindex || disallowAll)) add('critical', 'prod-noindex', 'Production blocks search engines (noindex or Disallow: /)', { xrt, meta, disallowAll });
if (staging && !noindex && !C.protected) add('critical', 'staging-indexable', `Staging/preview is indexable: no X-Robots-Tag noindex and no protection${disallowAll ? ' (robots.txt Disallow does not prevent indexing linked URLs)' : ''}`);
if (!staging && robots.status !== 200) add('low', 'no-robots', `/robots.txt responds ${robots.status ?? robots.error}`);

// 4) Asset caching
const asset = fin.body.match(/\/_next\/static\/[^"'\s?)]+\.(?:js|css|woff2)/)?.[0];
if (asset) { const r = await req(new URL(asset, finURL).href); const cc = r.headers?.['cache-control'] || '';
  C.cacheStatic = { asset, status: r.status, cacheControl: cc };
  if (!/max-age=31536000/.test(cc) || !/immutable/.test(cc)) add('high', 'static-cache', '/_next/static without "public, max-age=31536000, immutable": the CDN or proxy is overriding it', cc); }
const img = fin.body.match(/\/_next\/image\?url=[^"'\s]+/)?.[0]?.replace(/&amp;/g, '&');
if (img) { const r = await req(new URL(img, finURL).href); C.cacheImage = { status: r.status, contentType: r.headers?.['content-type'], cacheControl: r.headers?.['cache-control'] };
  if (r.status !== 200) add('high', 'image-optimizer', `/_next/image responds ${r.status ?? r.error}`); }
const fav = await req(new URL('/favicon.ico', finURL).href);
C.cachePublic = { '/favicon.ico': fav.headers?.['cache-control'] || fav.error };
C.cacheHTML = { cacheControl: H['cache-control'], age: H.age, xVercelCache: H['x-vercel-cache'], xNextjsCache: H['x-nextjs-cache'], cfCache: H['cf-cache-status'] };

// 5) Real 404
const nf = await req(new URL(`/qa-does-not-exist-${Date.now()}`, finURL).href);
C.notFound = { status: nf.status, generic: /This page could not be found/.test(nf.body || '') };
if (nf.status === 200) add('high', 'soft-404', 'A non-existent URL responds 200 (soft 404)');
else if (nf.status >= 500) add('critical', '404-is-500', `A non-existent URL responds ${nf.status}`);
if (C.notFound.generic) add('medium', 'default-404', 'Next\'s generic English 404: create app/not-found.tsx with navigation');

// 6) Platform, region and timings (5 requests to the final URL)
C.platform = { server: H.server, xPoweredBy: H['x-powered-by'], xVercelId: H['x-vercel-id'], region: H['x-vercel-id']?.split('::').slice(0, -1).join(' → '), cfRay: H['cf-ray'] };
if (H['x-powered-by']) add('low', 'x-powered-by', `X-Powered-By: ${H['x-powered-by']}`);
const ts = []; for (let i = 0; i < 5; i++) { const r = await req(finURL.href); if (r.ttfb) ts.push(r.ttfb); }
ts.sort((a, b) => a - b); C.timings = { ttfbMs: ts, median: ts[2] };
if (ts[2] > 800) add('medium', 'slow-ttfb', `Median TTFB ${ts[2]} ms from this machine (uncached page, distant region or cold start)`);
const rank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
out.findings.sort((a, b) => rank[a.sev] - rank[b.sev]);
console.log(JSON.stringify(out, null, 1));
```

What to look at in each block:

- **HTTPS**: `http://` must redirect with 301/308 to `https://` in a single hop; certificate with more than 30 days left or automatic renewal; HSTS present.
- **www and apex**: one redirects to the other with 301/308, preserving the path. If both respond 200, there is duplicate content. If the variant doesn't respond, the DNS record or the certificate is missing.
- **Indexing**: production **without** `noindex` or `Disallow: /`; staging and previews **with** `X-Robots-Tag: noindex` or password-protected (401/403). A `Disallow: /` in robots.txt is not enough: Google can index linked URLs even if it doesn't crawl them. On Vercel, Preview Deployments get `X-Robots-Tag: noindex` automatically, **but not when the branch has its own domain** (`staging.ejemplo.es`): there you have to add it, for example like this:

```ts
// next.config.ts: noindex on everything that isn't production
async headers() {
  // VERCEL_ENV only exists on Vercel; elsewhere, set NOINDEX=1 on staging only
  const noindex = process.env.VERCEL_ENV ? process.env.VERCEL_ENV !== 'production' : process.env.NOINDEX === '1'
  return !noindex ? [] :
    [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] }]
}
```

  And redirect the production `*.vercel.app` to the custom domain (a rule with `has: [{ type: 'host', value: 'mi-proyecto.vercel.app' }]`) or use `rel=canonical`.
- **Caching**: `/_next/static/*` must be served with `public, max-age=31536000, immutable` (Next sets it and it can't be changed; if it's missing, a CDN or proxy is overriding it). `/_next/image` uses `minimumCacheTTL` (4 h by default) or the origin's `Cache-Control` if larger. Dynamic HTML is served with `private, no-cache, no-store` and static HTML with `s-maxage`. Files in `public/` have no hash: if they change without being renamed (logo, PDF), the CDN may serve the old version.
- **404**: a non-existent URL must return **404** (not 200 or 500) with a custom page in Spanish; `app/not-found.tsx`, `app/error.tsx` and `app/global-error.tsx`. To test the 500 without breaking anything, check that `error.tsx` exists and that `onRequestError` logs it.
- **Region**: on Vercel, `x-vercel-id` shows the CDN and function region. New projects run functions in `iad1` (Washington); for a Spanish audience and data in the EU, change it in Settings → Functions or with `"regions": ["cdg1"]` (or `fra1`) in `vercel.json`, close to the database. `preferredRegion` and `runtime = 'edge'` are deprecated in Next 16.
- **Timings**: median TTFB of 5 requests from your machine. Indicative only; speed is audited in `qa-performance-cwv`.

## Step 4. Monitoring, rollback and backups

This is reviewed by asking and reading configuration; the scripts can't see it:

- **Uptime**: an external monitor (UptimeRobot, Better Stack, Checkly, your hosting's own) on the home page and a critical route (form), alerting a specific person. Without a monitor, the client discovers the outage.
- **Errors**: `instrumentation.ts` with `onRequestError` or an SDK. Sentry: `npx @sentry/wizard@latest -i nextjs` (creates `instrumentation.ts`, `instrumentation-client.ts` and the configuration; ask for permission first, it installs dependencies). OpenTelemetry: `@vercel/otel` with `registerOTel('name')` in `register()`. Check that source maps are uploaded to the error service and **not** published.
- **Rollback**: how do you go back to the previous version and who can do it? On Vercel, Instant Rollback from Deployments (or `vercel rollback`); with Docker, images tagged by version (never just `latest`) and the command to relaunch the previous one. A code rollback doesn't undo database migrations.
- **Backups** (if there is a CMS or database): automatic, with known retention, **outside** the main provider and with a restore tested at least once. Export of the CMS content (Sanity, Payload, headless WordPress…) and of uploaded files.
- **Domain**: automatic domain renewal, correct registrant (the client, not the freelancer) and documented DNS access.

## Severity

| Level | Examples in this phase |
|---|---|
| **Critical** | Production with `noindex` or `Disallow: /`; staging or preview indexable and reachable; `http` without redirect to `https`; the home page doesn't respond 200; 404 that returns 500; missing production environment variable that breaks a route |
| **High** | `www` and apex both serving the site without redirecting; no `app/not-found`; soft 404; missing HSTS; `/_next/static` without immutable caching; certificate expiring in less than 14 days without renewal; no backups of a CMS in production |
| **Medium** | Content pages in `ƒ` for no reason; 302/307 redirects between domains; no `error.tsx` and no error monitoring; function region far from the data; no documented rollback plan; Dockerfile without `standalone` |
| **Low** | Chains of 2 or more redirects; no `global-error.tsx`; `X-Powered-By`; no `robots.txt` |

## Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

Save `qa-deployment.md` and `qa-deployment.json` (the scripts' JSON):

```markdown
# Deployment — <project> — <date> — commit <hash> — <hosting>
Production: https://www.ejemplo.es (canonical) · Staging: https://staging.ejemplo.es
Verdict: READY | READY WITH RISKS | NOT READY · Critical: N · High: N · Medium: N · Low: N

## Findings
| # | Sev. | Where | Evidence | Why it matters | Fix |
|---|---|---|---|---|---|
| D-001 | Critical | https://staging.ejemplo.es | No X-Robots-Tag; responds 200 without a password | Google can index the test site and compete with production | `headers()` with noindex outside production, or Deployment Protection |

## Routes and rendering     (build-routes table: route, symbol, revalidate, comment)
## Domains and HTTPS   (redirect chains, certificate, HSTS)
## Indexing per environment
## Caching              (static, image, public, HTML)
## Environment variables (variable × environment table, no values)
## Monitoring, rollback and backups
## Not reviewed
```

## False positives and limits

- `deploy-check.mjs` measures from the agent's machine: timings and the CDN region change depending on where the request comes from.
- If staging is protected (401/403), the script can't see its headers: that's correct, but check that the protection also covers the branch's `*.vercel.app` URLs.
- `build-routes.mjs` reads the table printed by `next build`; if the format changes in a future version, review the output by hand and adjust the row regex.
- Locally (`http://localhost`) HTTPS, `www` and HSTS can't be checked: say so in the report and check them on staging.

## If the user asks for fixes

Order: 1) indexing (remove the production `noindex` or add it on staging) and HTTPS; 2) `www`/apex and `*.vercel.app` redirect to the canonical domain; 3) `not-found.tsx` and `error.tsx`; 4) `ƒ` routes that should be static; 5) monitoring and rollback document. After each change, deploy to staging, rerun `deploy-check.mjs` on both environments and compare the JSON.

## Sources

- Next 16 (in `node_modules/next/dist/docs/`): guides/building (symbols), self-hosting, environment-variables, config output, instrumentation
- Vercel: https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines · https://vercel.com/kb/guide/avoiding-duplicate-content-with-vercel-app-urls · https://vercel.com/docs/functions/configuring-functions/region
