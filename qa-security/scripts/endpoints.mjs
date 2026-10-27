// endpoints.mjs: inventory of Route Handlers, Server Actions, proxy/middleware and effective Next config, with risk signals.
// Static (heuristic) analysis: every signal must be confirmed by reading the code.
// Usage: node endpoints.mjs <project-root> > endpoints.json
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const root = process.argv[2] || '.';
const SKIP = new Set(['node_modules', '.next', '.git', 'out', 'dist', 'build', 'coverage', 'public']);
const files = [];
(function walk(d) { for (const e of readdirSync(d, { withFileTypes: true })) {
  const p = join(d, e.name);
  if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p); } else if (/\.(?:[cm]?[jt]sx?)$/.test(e.name)) files.push(p);
} })(root);
const src = Object.fromEntries(files.map(f => [f, readFileSync(f, 'utf8')]));
const rel = f => relative(root, f);
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

// Signals (regex over the file text)
const S = {
  validation: /\b(?:z\.|zod|valibot|v\.object|yup|safeParse|\.parse\(|ajv|superstruct|arktype)/,
  auth: /\b(?:auth\(|getServerSession|currentUser|getUser\(|verifySession|requireUser|getSession|clerk|lucia|session\b|jwtVerify|headers\(\)\.get\(['"]authorization)/i,
  rateLimit: /rate.?limit|ratelimit|upstash|turnstile|recaptcha|hcaptcha|honeypot|botid|arcjet/i,
  envDump: /process\.env(?!\.)\b|\.\.\.process\.env/,
  errorLeak: /(?:error|err|e)\.(?:message|stack)\b.*(?:Response|json|return)|(?:Response|json)\(.*(?:error|err|e)\.(?:message|stack)/,
  logPII: /console\.(?:log|info|debug)\([^)]*(?:formData|email|mensaje|message|body|password|req)/i,
  ssrf: /fetch\(\s*(?:url|target|formData\.get|searchParams\.get|body\.|params\.|req\.)/,
  openRedirect: /redirect\(\s*(?:formData\.get|searchParams\.get|body\.|params\.|req\.|url\b|next\b|returnTo|callbackUrl)/,
  corsStar: /Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*/,
  rawSql: /\$queryRawUnsafe|\$executeRawUnsafe|sql\.raw\(|query\(\s*[`'"][^`'"]*\$\{/,
  evalUse: /\beval\(|new Function\(/,
  echo: /\becho\b\s*:|json\(\s*\{[^}]*\bbody\b/,
};
const sig = (t, keys) => keys.filter(k => S[k].test(t));

const out = { routeHandlers: [], serverActions: [], proxy: [], htmlInjection: [], clientImportsSecrets: [], serverOnly: [], config: {}, findings: [] };
const add = (sev, id, file, msg) => out.findings.push({ sev, id, file, msg });

for (const [f, t] of Object.entries(src)) {
  const r = rel(f);
  // Route Handlers (App Router) and API Routes (Pages Router)
  if (/(^|\/)app\/.*\/route\.[cm]?[jt]s$/.test(r) || /(^|\/)pages\/api\//.test(r)) {
    const methods = [...t.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map(m => m[1]);
    const s = sig(t, ['validation', 'auth', 'rateLimit', 'envDump', 'errorLeak', 'logPII', 'ssrf', 'openRedirect', 'corsStar', 'rawSql', 'evalUse', 'echo']);
    out.routeHandlers.push({ file: r, methods: methods.length ? methods : ['default'], signals: s });
    const mut = methods.some(m => m !== 'GET' && m !== 'HEAD') || /pages\/api/.test(r);
    if (s.includes('envDump')) add('critical', 'env-dump', r, 'Returns or exposes the whole process.env');
    if (mut && !s.includes('validation')) add('high', 'no-validation', r, 'Accepts data without schema validation (Zod/Valibot)');
    if (mut && !s.includes('auth')) add('medium', 'no-auth-signal', r, 'No visible session check: confirm whether it should be public');
    if (mut && !s.includes('rateLimit')) add('medium', 'no-rate-limit', r, 'No visible rate limiting or anti-spam');
    if (s.includes('echo')) add('medium', 'echo-input', r, 'Returns the user input as is');
    for (const k of ['errorLeak', 'ssrf', 'openRedirect', 'corsStar', 'rawSql', 'evalUse']) if (s.includes(k)) add(k === 'rawSql' || k === 'evalUse' || k === 'ssrf' ? 'high' : 'medium', k, r, `Risk signal: ${k}`);
  }
  // Server Actions: "use server" file or functions with "use server" inside
  const fileLevel = /^\s*(?:\/\/.*\n|\/\*[\s\S]*?\*\/\s*)*['"]use server['"]/.test(t);
  const inline = [...t.matchAll(/async\s+function\s+(\w+)\s*\([^)]*\)\s*\{\s*['"]use server['"]/g)].map(m => m[1]);
  if (fileLevel || inline.length) {
    const actions = fileLevel ? [...t.matchAll(/export\s+(?:async\s+function|const)\s+(\w+)/g)].map(m => m[1]) : inline;
    const s = sig(t, ['validation', 'auth', 'rateLimit', 'envDump', 'errorLeak', 'logPII', 'ssrf', 'openRedirect', 'rawSql', 'evalUse']);
    out.serverActions.push({ file: r, actions, signals: s, serverOnlyImport: /import\s+['"]server-only['"]/.test(t) });
    if (!s.includes('validation')) add('high', 'action-no-validation', r, `Server Action(s) ${actions.join(', ')} without validation: they are public POST endpoints`);
    if (!s.includes('auth')) add('medium', 'action-no-auth-signal', r, 'No re-authorization inside the action (confirm whether it is a public form)');
    if (!s.includes('rateLimit')) add('medium', 'action-no-rate-limit', r, 'Form without rate limiting or anti-spam (Turnstile, honeypot…)');
    if (s.includes('logPII')) add('low', 'log-pii', r, 'console.log with form data: personal data in the logs');
    if (/\.catch\(\s*\(\)\s*=>\s*(?:null|undefined|\{\s*\})\s*\)/.test(t)) add('low', 'swallowed-error', r, 'Silenced errors: the user does not know whether sending failed');
    for (const k of ['envDump', 'errorLeak', 'ssrf', 'openRedirect', 'rawSql', 'evalUse']) if (s.includes(k)) add(k === 'envDump' ? 'critical' : 'high', k, r, `Risk signal: ${k}`);
  }
  if (/(^|\/)(?:src\/)?(?:proxy|middleware)\.[jt]s$/.test(r)) {
    out.proxy.push({ file: r, convention: /middleware/.test(r) ? 'middleware (deprecated in Next 16: rename to proxy)' : 'proxy', matcher: (t.match(/matcher\s*:\s*([^\n]+)/) || [])[1]?.slice(0, 160), csp: /Content-Security-Policy/i.test(t), nonce: /nonce/i.test(t), authCheck: S.auth.test(t) });
    if (S.auth.test(t)) add('info', 'auth-in-proxy', r, 'Authorization in proxy/middleware: repeat it in the page/action (CVE-2025-29927 and 2026 bypasses)');
  }
  for (const m of t.matchAll(/dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:\s*([^}]+)\}/g)) {
    const safe = /JSON\.stringify|sanitize|DOMPurify|purify|xss\(/.test(m[1]);
    out.htmlInjection.push({ file: r, line: lineOf(t, m.index), expr: m[1].trim().slice(0, 80), sanitized: safe });
    if (!safe) add('high', 'dangerously-set-inner-html', `${r}:${lineOf(t, m.index)}`, 'Unsanitized HTML (use DOMPurify or avoid raw HTML)');
    else if (/JSON\.stringify/.test(m[1]) && !/replace\(\s*\/</.test(t)) add('low', 'jsonld-escape', `${r}:${lineOf(t, m.index)}`, "JSON-LD without escaping '<' (\\u003c)");
  }
  // Modules with secrets or server process.env without "server-only"
  if (!/['"]use client['"]/.test(t) && /process\.env\.(?!NEXT_PUBLIC_|NODE_ENV)[A-Z]/.test(t) && !/import\s+['"]server-only['"]/.test(t) && /(^|\/)(?:lib|utils|services|server|data)\//.test(r))
    out.serverOnly.push({ file: r, note: "Reads server variables without import 'server-only'" });
}
// Client components that import modules with secrets or server variables (one level of imports)
const resolve = (from, spec) => { const base = spec.startsWith('@/') ? join(root, spec.slice(2)) : spec.startsWith('.') ? join(dirname(from), spec) : null;
  if (!base) return null; for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js']) if (src[base + ext]) return base + ext; return null; };
for (const [f, t] of Object.entries(src)) {
  if (!/^\s*['"]use client['"]/.test(t)) continue;
  for (const m of t.matchAll(/import\s+[^'"]*from\s+['"]([^'"]+)['"]/g)) {
    const dep = resolve(f, m[1]); if (!dep) continue;
    const d = src[dep];
    if (/['"]use server['"]/.test(d)) continue;
    if (/\b[sr]k_live_|-----BEGIN [A-Z ]*PRIVATE KEY|NEXT_PUBLIC_[A-Z_]*SECRET|process\.env\.(?!NEXT_PUBLIC_|NODE_ENV)[A-Z]/.test(d)) {
      out.clientImportsSecrets.push({ client: rel(f), imports: rel(dep) });
      add('critical', 'client-imports-secret', rel(f), `Client component imports ${rel(dep)}, which contains secrets or server variables: they end up in the bundle or fail silently`);
    }
  }
}
// Effective config: .next/required-server-files.json (after build) or the text of next.config
const rsf = join(root, '.next/required-server-files.json');
const cfgFile = ['next.config.ts', 'next.config.mjs', 'next.config.js'].map(f => join(root, f)).find(existsSync);
const cfgText = cfgFile ? readFileSync(cfgFile, 'utf8') : '';
let c = null; try { c = JSON.parse(readFileSync(rsf, 'utf8')).config; } catch {}
const cfg = c ? { source: '.next/required-server-files.json', poweredByHeader: c.poweredByHeader, productionBrowserSourceMaps: c.productionBrowserSourceMaps, remotePatterns: c.images?.remotePatterns, domains: c.images?.domains,
  dangerouslyAllowSVG: c.images?.dangerouslyAllowSVG, dangerouslyAllowLocalIP: c.images?.dangerouslyAllowLocalIP, allowedOrigins: c.experimental?.serverActions?.allowedOrigins, bodySizeLimit: c.experimental?.serverActions?.bodySizeLimit,
  taint: c.experimental?.taint, sri: c.experimental?.sri, ignoreBuildErrors: c.typescript?.ignoreBuildErrors, cacheComponents: c.cacheComponents, headersDefined: /async\s+headers\s*\(/.test(cfgText) }
  : { source: cfgFile ? rel(cfgFile) + ' (text, no build)' : 'no next.config', poweredByHeader: /poweredByHeader\s*:\s*false/.test(cfgText) ? false : true, headersDefined: /async\s+headers\s*\(/.test(cfgText),
    productionBrowserSourceMaps: /productionBrowserSourceMaps\s*:\s*true/.test(cfgText), remotePatterns: (cfgText.match(/remotePatterns\s*:\s*\[[\s\S]*?\]/) || [])[0], dangerouslyAllowSVG: /dangerouslyAllowSVG\s*:\s*true/.test(cfgText) };
out.config = cfg;
if (cfg.poweredByHeader !== false) add('low', 'powered-by', cfgFile && rel(cfgFile), 'Missing poweredByHeader: false');
if (cfg.productionBrowserSourceMaps) add('medium', 'source-maps', cfgFile && rel(cfgFile), 'productionBrowserSourceMaps: true publishes the source code');
const rp = JSON.stringify(cfg.remotePatterns || '');
if (/"hostname":"\*\*?"|hostname:\s*['"]\*\*?['"]/.test(rp)) add('high', 'remote-patterns-wildcard', cfgFile && rel(cfgFile), 'images.remotePatterns accepts any host: open image proxy (cost, SSRF/DoS when self-hosting)');
if (cfg.domains?.length) add('medium', 'images-domains', cfgFile && rel(cfgFile), 'images.domains is deprecated: use remotePatterns with protocol and pathname');
if (cfg.dangerouslyAllowSVG) add('medium', 'svg-allowed', cfgFile && rel(cfgFile), 'dangerouslyAllowSVG: requires contentSecurityPolicy and contentDispositionType attachment');
if (cfg.dangerouslyAllowLocalIP) add('high', 'local-ip', cfgFile && rel(cfgFile), 'dangerouslyAllowLocalIP: the optimizer can request internal IPs');
if ((cfg.allowedOrigins || []).some(o => /^\*\*?$|^\*\*\./.test(o))) add('medium', 'allowed-origins-wide', cfgFile && rel(cfgFile), 'serverActions.allowedOrigins is too broad');
if (cfg.ignoreBuildErrors) add('medium', 'ignore-build-errors', cfgFile && rel(cfgFile), 'typescript.ignoreBuildErrors hides type errors in production');
if (!cfg.headersDefined && !out.proxy.some(p => p.csp)) add('high', 'no-security-headers', cfgFile && rel(cfgFile), 'Neither headers() in next.config nor CSP in proxy: no security headers (confirm with headers.mjs whether the hosting sets them)');
if (cfg.cacheComponents && out.proxy.some(p => p.nonce)) add('high', 'nonce-with-cache-components', out.proxy[0].file, 'CSP with nonce + Cache Components: prerendered pages ship without a nonce and the browser blocks their scripts');
const rank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
out.findings.sort((a, b) => rank[a.sev] - rank[b.sev]);
console.log(JSON.stringify(out, null, 1));
