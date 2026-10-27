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
