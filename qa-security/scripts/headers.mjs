// headers.mjs: security headers of a deployed URL (or of local next start). Only normal GETs, nothing intrusive.
// Usage: node headers.mjs <url> [extra-path ...]      e.g. node headers.mjs https://staging.ejemplo.es /contacto
const [base, ...extra] = process.argv.slice(2);
if (!base) { console.error('Usage: node headers.mjs <url> [paths...]'); process.exit(1); }
const out = { url: base, pages: [], findings: [] };
const add = (sev, id, msg, evid) => out.findings.push({ sev, id, msg, ...(evid && { evidence: String(evid).slice(0, 300) }) });
const get = (u, o = {}) => fetch(u, { redirect: 'manual', headers: { 'user-agent': 'qa-security/1.0' }, signal: AbortSignal.timeout(15000), ...o });

let res, url = base;
try { res = await get(base); } catch (e) { console.log(JSON.stringify({ url: base, error: `not responding: ${e.cause?.code || e.message}` })); process.exit(2); }
for (let i = 0; i < 5 && res.status >= 300 && res.status < 400 && res.headers.get('location'); i++) { url = new URL(res.headers.get('location'), url).href; res = await get(url); }
const h = res.headers, html = await res.text();
const https = url.startsWith('https:'), local = /localhost|127\.0\.0\.1/.test(url);
out.pages.push({ url, status: res.status });

// CSP
const csp = h.get('content-security-policy'), cspRO = h.get('content-security-policy-report-only');
const dir = n => (csp || '').split(';').map(s => s.trim()).find(s => s.startsWith(n + ' ') || s === n);
if (!csp) add(cspRO ? 'medium' : 'high', 'csp-missing', cspRO ? 'CSP only in report-only mode' : 'No Content-Security-Policy', cspRO);
else {
  const script = dir('script-src') || dir('default-src') || '';
  const nonce = /'nonce-/.test(script), strictDyn = /'strict-dynamic'/.test(script);
  if (/'unsafe-inline'/.test(script) && !nonce && !/'sha(256|384|512)-/.test(script)) add('medium', 'csp-unsafe-inline', "script-src allows 'unsafe-inline' without nonce or hash: the CSP does not stop XSS", script);
  if (/'unsafe-eval'/.test(script)) add('medium', 'csp-unsafe-eval', "script-src allows 'unsafe-eval' (only needed in next dev)", script);
  if (/(^|\s)(\*|https?:|data:)(\s|$)/.test(script)) add('medium', 'csp-wildcard', 'script-src with a wildcard, scheme or data:', script);
  if (!dir('object-src') && !/'none'/.test(dir('default-src') || '')) add('low', 'csp-object-src', "Missing object-src 'none'");
  if (!dir('base-uri')) add('low', 'csp-base-uri', "Missing base-uri 'self' or 'none'");
  if (!dir('frame-ancestors') && !h.get('x-frame-options')) add('medium', 'clickjacking', 'No frame-ancestors or X-Frame-Options');
  if (nonce) {                                    // the nonce must change on every request and reach the <script> tags
    const n1 = script.match(/'nonce-([^']+)'/)[1];
    const n2 = ((await get(url)).headers.get('content-security-policy') || '').match(/'nonce-([^']+)'/)?.[1];
    if (n1 === n2) add('high', 'csp-nonce-static', 'The nonce does not change between requests (cached page or fixed nonce)', n1);
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(m => m[0]);
    const withoutNonce = scripts.filter(s => !/\bnonce=/.test(s));
    if (withoutNonce.length) add('high', 'csp-nonce-missing-in-html', `${withoutNonce.length}/${scripts.length} <script> without a nonce attribute: the browser will block them (prerendered page/PPR?)`, withoutNonce[0]);
    out.csp = { nonce: true, strictDynamic: strictDyn, scripts: scripts.length, withoutNonce: withoutNonce.length };
  }
}
if (!csp && !h.get('x-frame-options')) add('medium', 'clickjacking', 'No frame-ancestors or X-Frame-Options');
// HSTS (only meaningful over HTTPS)
const hsts = h.get('strict-transport-security');
if (https) {
  if (!hsts) add('high', 'hsts-missing', 'No Strict-Transport-Security');
  else { const ma = +(hsts.match(/max-age=(\d+)/i)?.[1] || 0);
    if (ma < 31536000) add('medium', 'hsts-short', `max-age=${ma} (< 1 year)`, hsts);
    if (!/includesubdomains/i.test(hsts)) add('low', 'hsts-subdomains', 'HSTS without includeSubDomains (consider it if all subdomains run on HTTPS)', hsts); }
} else add(local ? 'info' : 'critical', 'no-https', local ? 'Local URL over HTTP: HSTS and redirection are checked on the deployment' : 'The final URL is not HTTPS');
// Other headers
if ((h.get('x-content-type-options') || '').toLowerCase() !== 'nosniff') add('medium', 'nosniff-missing', 'Missing X-Content-Type-Options: nosniff');
const rp = h.get('referrer-policy');
if (!rp) add('low', 'referrer-policy-missing', 'Missing Referrer-Policy (recommended strict-origin-when-cross-origin)');
else if (/unsafe-url|no-referrer-when-downgrade/.test(rp)) add('medium', 'referrer-policy-weak', 'Referrer-Policy leaks the full URL', rp);
if (!h.get('permissions-policy')) add('low', 'permissions-policy-missing', 'Missing Permissions-Policy (disable camera, microphone, geolocation… if unused)');
if (h.get('x-powered-by')) add('low', 'x-powered-by', 'X-Powered-By header present: poweredByHeader: false', h.get('x-powered-by'));
if (/\d/.test(h.get('server') || '')) add('low', 'server-version', 'The Server header reveals a version', h.get('server'));
if (h.get('access-control-allow-origin') === '*') add('medium', 'cors-wildcard', 'Access-Control-Allow-Origin: * on HTML');
// Cookies
for (const c of h.getSetCookie?.() || []) {
  const name = c.split('=')[0], f = c.toLowerCase();
  const miss = [https && !f.includes('secure') && 'Secure', !f.includes('samesite') && 'SameSite', /sess|auth|token/i.test(name) && !f.includes('httponly') && 'HttpOnly'].filter(Boolean);
  if (miss.length) add(/sess|auth|token/i.test(name) ? 'high' : 'low', 'cookie-flags', `Cookie ${name} without ${miss.join(', ')}`);
}
// Public source maps: tries the .map of the first JS chunk
const chunk = html.match(/\/_next\/static\/[^"'\s]+\.js/)?.[0];
if (chunk) { const m = await get(new URL(chunk + '.map', url)); if (m.status === 200) add('medium', 'source-maps-public', 'Source maps reachable: they expose the source code', chunk + '.map'); }
// Error page: must not show stack traces or internal paths
const nf = await get(new URL('/__qa-does-not-exist-' + Date.now(), url)); const nfBody = await nf.text();
out.pages.push({ url: 'test 404', status: nf.status });
if (/at \w+ \(|node_modules\/|\/home\/|\/var\/task|webpack-internal|Error: /.test(nfBody)) add('medium', 'error-leak', 'The error page shows stack traces or internal paths');
// Extra paths: status and CSP only (useful for forms and pages with data)
for (const p of extra) { const x = await get(new URL(p, url)); out.pages.push({ url: p, status: x.status, csp: !!x.headers.get('content-security-policy'), cache: x.headers.get('cache-control') }); }
out.headers = Object.fromEntries([...h].filter(([k]) => /security|policy|x-|referrer|strict|server|permissions|cache-control/.test(k)));
const rank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
out.findings.sort((a, b) => rank[a.sev] - rank[b.sev]);
console.log(JSON.stringify(out, null, 1));
