// versions.mjs: installed version of next/react/sharp/react-server-dom-* against security advisories.
// Usage: node versions.mjs <project-root> [--offline]
//   1) Queries the npm advisory database LIVE (the same one `npm audit` uses, fed by GitHub Advisories).
//   2) Compares with the MIN_SAFE table below (hand-verified on the date shown). ALWAYS re-verify it.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const VERIFIED = '2026-10-26';
// Minimum safe version per branch according to the official advisories (nextjs.org/blog, GitHub Security Advisories).
// Branches not in this table no longer get patches: move to another branch.
const MIN_SAFE = {
  next: { '16': '16.4.1', '15.5': '15.5.28' },                  // 14-oct-2026 (GHSA-673q-mjm6-r5xr, GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r)
  'react-server-dom-webpack': { '19.0': '19.0.9', '19.1': '19.1.10', '19.2': '19.2.9', '19.3': '19.3.1' }, // GHSA-xqc2-xf4c-x3h3, GHSA-h3gv-c5rc-p453
  'react-server-dom-turbopack': { '19.0': '19.0.9', '19.1': '19.1.10', '19.2': '19.2.9', '19.3': '19.3.1' },
  'react-server-dom-parcel': { '19.0': '19.0.9', '19.1': '19.1.10', '19.2': '19.2.9', '19.3': '19.3.1' },
  sharp: { '0': '0.35.5' },                                       // CVE-2026-96889 (image library via sharp, Linux glibc), official Next workaround
};
const WATCH = ['next', 'react', 'react-dom', 'sharp', 'react-server-dom-webpack', 'react-server-dom-turbopack', 'react-server-dom-parcel', 'eslint-config-next', '@next/third-parties'];

const root = process.argv[2] || '.';
const offline = process.argv.includes('--offline');
const cmp = (a, b) => { const p = v => v.split(/[.-]/).slice(0, 3).map(Number); const [x, y] = [p(a), p(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
const readJson = f => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };

// Installed versions: node_modules > package-lock > range declared in package.json
const pkg = readJson(join(root, 'package.json')) || {};
const declared = { ...pkg.dependencies, ...pkg.devDependencies };
const lock = readJson(join(root, 'package-lock.json'));
const installed = {};
for (const name of WATCH) {
  const nm = readJson(join(root, 'node_modules', name, 'package.json'));
  const lk = lock?.packages?.[`node_modules/${name}`];
  const v = nm?.version || lk?.version || null;
  if (v || declared[name]) installed[name] = { version: v, declared: declared[name] || '(transitive)', source: nm ? 'node_modules' : lk ? 'package-lock' : 'package.json' };
}
// Copy of React that Next ships inside (the one Next's Server Components use, not the project's)
const bundled = existsSync(join(root, 'node_modules/next/dist/compiled/react/cjs/react.production.js'))
  ? (readFileSync(join(root, 'node_modules/next/dist/compiled/react/cjs/react.production.js'), 'utf8').match(/version = "([^"]+)"/) || [])[1] : null;

const findings = [];
for (const [name, info] of Object.entries(installed)) {
  const table = MIN_SAFE[name]; const v = info.version;
  if (!table || !v) continue;
  const parts = v.split('.');
  const branch = table[`${parts[0]}.${parts[1]}`] ? `${parts[0]}.${parts[1]}` : table[parts[0]] ? parts[0] : null;
  if (!branch) findings.push({ package: name, version: v, sev: 'critical', issue: `branch ${parts[0]}.${parts[1]} without security patches`, fix: `move to a supported branch: ${Object.values(table).join(" or ")}` });
  else if (cmp(v, table[branch]) < 0) findings.push({ package: name, version: v, sev: 'critical', issue: `below the minimum safe version of branch ${branch}`, fix: info.declared === '(transitive)' ? `update the package that pulls it in (e.g. next) or force it with "overrides": { "${name}": "^${table[branch]}" }` : `npm install ${name}@${table[branch]} (or the latest of the branch)` });
}

// Live query: "bulk" endpoint of the npm registry (returns only advisories affecting the versions sent)
let live = null;
if (!offline) {
  const body = Object.fromEntries(Object.entries(installed).filter(([, i]) => i.version).map(([n, i]) => [n, [i.version]]));
  try {
    const r = await fetch('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    const data = await r.json();
    live = Object.entries(data).flatMap(([n, advs]) => advs.map(a => ({ package: n, version: installed[n].version, severity: a.severity, title: a.title, vulnerable: a.vulnerable_versions, url: a.url })));
  } catch (e) { live = { error: `could not query the npm registry: ${e.message}. Use \`npm audit\` or check the advisories by hand.` }; }
}
const rank = { critical: 0, high: 1, moderate: 2, low: 3 };
if (Array.isArray(live)) {
  live.sort((a, b) => rank[a.severity] - rank[b.severity]);
  const bySev = live.reduce((m, a) => (m[a.severity] = (m[a.severity] || 0) + 1, m), {});
  live = { total: live.length, bySeverity: bySev, advisories: live.slice(0, 25), ...(live.length > 25 && { note: `${live.length - 25} more: run npm audit` }) };
}

console.log(JSON.stringify({
  tableVerified: VERIFIED,
  warning: 'The MIN_SAFE table ages: re-verify it on nextjs.org/blog and in the GitHub Security Advisories of vercel/next.js and react/react before giving the verdict.',
  installed: installed, reactBundledInNext: bundled,
  table: findings, liveAdvisories: live,
  verdict: findings.length || (live?.bySeverity?.critical || live?.bySeverity?.high) ? 'UPDATE' : 'no known advisories for these versions',
}, null, 1));
