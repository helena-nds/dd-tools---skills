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
