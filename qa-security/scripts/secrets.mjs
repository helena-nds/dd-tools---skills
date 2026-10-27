// secrets.mjs: secrets in the code, in .env* files, in git and in the client bundle (.next/static, out/).
// Usage: node secrets.mjs <project-root> > secrets.json     (run `next build` first to check the bundle)
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.argv[2] || '.';
const SKIP = new Set(['node_modules', '.next', '.git', 'out', 'dist', 'build', 'coverage', '.turbo', '.cache']);
const TEXT = /^\.(?:[cm]?[jt]sx?|json|ya?ml|toml|mdx?|html?|css|txt|sh|py|sql|map)$/;
const RULES = [
  ['stripe-secret-live', 'critical', /\b[sr]k_live_[0-9a-zA-Z]{10,}/g],
  ['stripe-secret-test', 'high', /\b[sr]k_test_[0-9a-zA-Z]{10,}/g],
  ['aws-access-key', 'critical', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ['google-api-key', 'medium', /\bAIza[0-9A-Za-z_-]{35}\b/g],              // Firebase/Maps web: public by design if restricted
  ['github-token', 'critical', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})/g],
  ['slack-token', 'critical', /\bxox[abprs]-[A-Za-z0-9-]{10,}/g],
  ['sendgrid-key', 'critical', /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g],
  ['openai-key', 'critical', /\bsk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{30,}/g],
  ['anthropic-key', 'critical', /\bsk-ant-[a-z]{3,5}\d{2}-[A-Za-z0-9_-]{40,}/g],
  ['private-key', 'critical', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----/g],
  ['db-url-with-password', 'critical', /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|rediss?|amqps?):\/\/[^\s:@\/'"`]+:[^\s@\/'"`]{3,}@[^\s'"`]+/g],
  ['jwt', 'medium', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
  ['generic-assignment', 'high', /(?:secret|passw(?:or)?d|api[_-]?key|auth[_-]?token|access[_-]?token|private[_-]?key|client[_-]?secret)["']?\s*[:=]\s*["'`]([^"'`\s]{12,})["'`]/gi],
  ['next-public-secret-name', 'critical', /\bNEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PRIVATE|PASSWORD|PASSWD|SERVICE_ROLE|TOKEN|API_KEY)\b/g],
];
const PUBLIC_BY_DESIGN = /ANON|PUBLISHABLE|SITE_KEY|PUBLIC_KEY|POSTHOG|SENTRY_DSN|SEARCH_KEY|MEASUREMENT|FIREBASE_API_KEY|MAPS/;
const PLACEHOLDER = /x{4,}|your[_-]|example|changeme|placeholder|<|\$\{|process\.env|\*{3,}|dummy|lorem/i;
const redact = s => s.length <= 10 ? s.slice(0, 3) + '…' : `${s.slice(0, 8)}…(${s.length} chars)`;
const entropy = s => { const f = {}; for (const c of s) f[c] = (f[c] || 0) + 1; return -Object.values(f).reduce((a, n) => a + n / s.length * Math.log2(n / s.length), 0); };

function* walk(dir, skip = SKIP) {
  let entries; try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!skip.has(e.name)) yield* walk(p, skip); }
    else if (e.isFile()) yield p;
  }
}
function scanText(file, text, where, out) {
  const lines = text.length > 3e6 ? [text] : text.split('\n');
  lines.forEach((line, i) => {
    const hit = new Set();
    for (const [id, sev, re] of RULES) for (const m of line.matchAll(re)) {
      const val = m[1] || m[0];
      if (id === 'generic-assignment' && (PLACEHOLDER.test(val) || entropy(val) < 3.3 || [...hit].some(h => h.includes(val) || val.includes(h)))) continue;
      hit.add(val);
      if (id === 'next-public-secret-name' && PUBLIC_BY_DESIGN.test(val)) continue;
      let s = sev, note;
      if (id === 'jwt') { try { const p = JSON.parse(Buffer.from(m[0].split('.')[1], 'base64url')); if (p.role === 'service_role') { s = 'critical'; note = 'Supabase service_role: bypasses RLS'; } else note = `JWT role=${p.role ?? '?'}: check whether it is an anonymous key`; } catch {} }
      if (where === 'bundle' && s !== 'critical' && id !== 'google-api-key') s = 'critical', note = (note ? note + '; ' : '') + 'in the public bundle';
      if (where === 'env-file' && id !== 'next-public-secret-name') s = 'info', note = (note ? note + '; ' : '') + 'in .env*: only a finding if it is committed or not ignored (see env[])';
      out.push({ where, rule: id, sev: s, file: relative(root, file), line: lines.length > 1 ? i + 1 : undefined, match: id === 'next-public-secret-name' ? val : redact(val), ...(note && { note }) });
    }
  });
}

const res = { repo: [], env: [], bundle: [], git: {}, summary: {} };
// 1) Source code and configuration
for (const f of walk(root)) {
  const base = f.split('/').pop();
  if (/^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/.test(base)) continue;
  if (!(TEXT.test(extname(f)) || /^\.env|^\.npmrc$|^\.dev\.vars$/.test(base))) continue;
  try { if (statSync(f).size > 2e6) continue; scanText(f, readFileSync(f, 'utf8'), base.startsWith('.env') ? 'env-file' : 'repo', res.repo); } catch {}
  if (base === '.npmrc' && /_authToken\s*=\s*(?!\$\{)\S+/.test(readFileSync(f, 'utf8'))) res.repo.push({ where: 'repo', rule: 'npmrc-token', sev: 'critical', file: relative(root, f), match: 'literal _authToken' });
}
// 2) Environment variables: names, values (to search for them in the bundle) and whether git ignores them
const isGit = existsSync(join(root, '.git'));
const git = (...a) => { try { return execFileSync('git', ['-C', root, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const serverValues = [];
for (const f of readdirSync(root).filter(n => /^\.env/.test(n))) {
  const vars = readFileSync(join(root, f), 'utf8').split('\n').map(l => l.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*["']?(.*?)["']?\s*$/)).filter(Boolean);
  const tracked = isGit ? git('ls-files', '--error-unmatch', f) !== null : null;
  const ignored = isGit ? git('check-ignore', '-q', f) !== null : (existsSync(join(root, '.gitignore')) && readFileSync(join(root, '.gitignore'), 'utf8').split('\n').some(p => p.trim() && new RegExp('^' + p.trim().replace(/\./g, '\\.').replace(/\*/g, '.*') + '$').test(f)));
  const example = /example|sample|template/.test(f);
  res.env.push({ file: f, vars: vars.map(v => v[1]), inGit: tracked, ignored: ignored,
    sev: example ? 'info' : tracked ? 'critical' : !ignored ? 'high' : 'ok',
    note: example ? 'template: check it carries no real values' : tracked ? 'committed to git: rotate secrets and purge history' : !ignored ? 'not covered by .gitignore' : undefined });
  for (const [, name, val] of vars) {
    if (example || val.length < 8 || PLACEHOLDER.test(val)) continue;
    if (!name.startsWith('NEXT_PUBLIC_')) serverValues.push({ name, val });
    else if (/SECRET|PRIVATE|PASSWORD|PASSWD|SERVICE_ROLE|TOKEN|API_KEY/.test(name) && !PUBLIC_BY_DESIGN.test(name)) serverValues.push({ name, val, isPublic: true });
  }
}
if (isGit) res.git.envHistory = (git('log', '--all', '--diff-filter=A', '--name-only', '--format=', '--', '.env*', '**/.env*') || '').split('\n').filter(Boolean);
// 3) Client bundle: patterns + literal values of server variables + public source maps
const bundleDirs = ['.next/static', 'out'].map(d => join(root, d)).filter(existsSync);
let maps = 0, files = 0;
for (const d of bundleDirs) for (const f of walk(d, new Set())) {
  if (f.endsWith('.map')) { maps++; continue; }
  if (!/\.(?:js|html|txt|json|rsc|css)$/.test(f)) continue;
  files++;
  let text; try { text = readFileSync(f, 'utf8'); } catch { continue; }
  scanText(f, text, 'bundle', res.bundle);
  for (const { name, val, isPublic } of serverValues) if (text.includes(val)) res.bundle.push({ where: 'bundle', rule: isPublic ? 'next-public-secret-in-bundle' : 'server-env-value-in-bundle', sev: 'critical', file: relative(root, f), match: `${name}=${redact(val)}` });
}
if (!bundleDirs.length) res.bundle.push({ rule: 'no-build', sev: 'info', note: 'no .next/static or out/: run next build to check the bundle' });
if (maps) res.bundle.push({ rule: 'public-source-maps', sev: 'medium', match: `${maps} .map in the bundle`, note: 'productionBrowserSourceMaps exposes the source code' });
const all = [...res.repo, ...res.env.filter(e => e.sev !== 'ok'), ...res.bundle];
res.summary = { bundleFiles: files, bySeverity: all.reduce((m, f) => (m[f.sev] = (m[f.sev] || 0) + 1, m), {}), isGitRepo: isGit };
console.log(JSON.stringify(res, null, 1));
