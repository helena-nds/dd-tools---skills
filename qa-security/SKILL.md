---
name: qa-security
description: Security review of the configuration and code of a Next.js/React website (not pentesting) - Next and React versions with CVEs, npm audit and supply chain, secrets in the repo and bundle, NEXT_PUBLIC_, Server Actions and Route Handlers, CSP/HSTS headers, images.remotePatterns and errors. Use it whenever someone asks to review security, vulnerabilities, CVEs, secrets, headers, npm audit or whether the website is ready to publish, even if security isn't mentioned, and especially on websites generated with AI from Figma.
---

# Security review (configuration and code)

The audit answers one question: **can this website be published without exposing data, secrets or servers?** Websites generated from Figma by an AI agent always fail in the same places: keys pasted into the code or into `NEXT_PUBLIC_` variables (which end up in the public JavaScript), Route Handlers that return more than they should, unvalidated Server Actions, zero security headers and Next versions with critical advisories. On top of that, Next.js has published security patches almost every month since 2025, so the installed version goes stale quickly.

**Scope**: static review and normal GET requests. **No exploits, fuzzing or attacks**, even if the user asks for them: if a pentest is needed, recommend a specialized team. Cookies and RGPD/GDPR belong to `qa-legal-spain`; HTTPS, domains and staging `noindex` to `qa-deployment`; CI to `qa-maintainability`.

**By default no code is modified** and no dependencies are installed in the project: deliver the report and fix only if the user asks. If you find a real secret, **do not copy it in full into the report** (the scripts redact it) and recommend rotating it.

## Step 0. Context

1. `package.json` and lockfile: version of `next`, `react`, package manager (npm, pnpm, yarn, bun). Next 16 renamed `middleware.ts` to **`proxy.ts`** (Node.js runtime by default); if there is still a `middleware.ts`, note it.
2. `next.config.*`: `cacheComponents` (with Cache Components every page is Partial Prerendering, and that constrains the CSP in step 5), `output`, `images`, `headers()`, `experimental.serverActions`, `experimental.taint`.
3. Hosting (Vercel, Netlify, own Docker…): headers can be set in `next.config`, in `proxy.ts`, in `vercel.json` or in the reverse proxy. Ask for the staging URL if there is one.
4. Is there login, a database, a CMS or payments? It changes the weight of authorization findings a lot.
5. Prepare the tools outside the project:

```bash
mkdir -p /tmp/qa-security && cd /tmp/qa-security && npm init -y >/dev/null
# Write the five scripts of this skill here. They only use Node 22, no dependencies.
cd <project> && npx next build 2>&1 | tee /tmp/qa-security/build.log   # the bundle is needed for step 3
```

## Step 1. Versions with security advisories

```bash
node /tmp/qa-security/versions.mjs . > /tmp/qa-security/versions.json
npm audit --omit=dev --json > /tmp/qa-security/audit.json; npm audit --audit-level=high
```

`versions.mjs` does two things: it queries the npm registry advisory database **live** (the same one `npm audit` uses, fed by GitHub Security Advisories) and compares against a hand-verified table of minimum safe versions per branch. **Re-verify the table on every run**: open `https://nextjs.org/blog` (advisories are published as "Security Release" or "Security Update") and the advisories of `vercel/next.js` and `react/react` on GitHub. If there is anything newer than the script's `tableVerified`, update the table and say so in the report. The live query is not enough on its own: the React advisories of 14-10-2026 (GHSA-xqc2-xf4c-x3h3, GHSA-h3gv-c5rc-p453) were still not in the npm database on 26-10-2026.

`versions.mjs`:

```js
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
```

Advisories worth knowing (verified on 26-10-2026; extend with new ones):

| Advisory | What it allows | Affects | Patched in |
|---|---|---|---|
| CVE-2025-29927 (GHSA-f82v-jwr5-mffw), Mar-2025 | Bypassing middleware with the `x-middleware-subrequest` header (auth in middleware becomes useless) | 11.1.4–15.2.2 | 12.3.5, 13.5.9, 14.2.25, 15.2.3 |
| CVE-2025-55182 / CVE-2025-66478 "React2Shell", 3-Dec-2025 | Unauthenticated RCE in the RSC protocol (CVSS 10) | App Router 15.x, 16.0.x; `react-server-dom-*` 19.0.0, 19.1.0–19.1.1, 19.2.0 | Next 15.0.5…15.5.7, 16.0.7; React 19.0.1, 19.1.2, 19.2.1. If it was exposed unpatched after 4-Dec-2025, **rotate all secrets** |
| CVE-2025-55184 + CVE-2025-67779 (DoS), CVE-2025-55183 (Server Functions source code), 11-Dec-2025; CVE-2026-23864 (DoS), Jan-2026 | Hanging the server; reading the compiled code of other Server Functions (and secrets written in it) | Next ≥13.3; React 19.0–19.2 | Dec-2025: Next 14.2.35, 15.5.9, 16.0.10. CVE-2026-23864: Next 15.5.10, 16.0.11, 16.1.5 (13.x/14.x unpatched). React 19.0.4, 19.1.5, 19.2.4 |
| 2026 releases (July, August, September and 14-Oct) | Proxy bypass, SSRF in rewrites and in `/_next/image`, ISR cache poisoning, RCE in the image optimizer (AVIF and SVG via `sharp`), RCE in `use cache` with typed arrays, RCE in `ImageResponse` (16.2–16.3.5), DoS in Server Actions | 15.x and 16.x | **Current minimums: 16.4.1 (Active LTS) and 15.5.28 (Maintenance LTS)**; `sharp` ≥ 0.35.5; `react-server-dom-*` 19.0.9, 19.1.10, 19.2.9 or 19.3.1 |

How to read the result:

- **Next ships its own copy of React** for Server Components (`node_modules/next/dist/compiled/react-server-dom-*`; the script shows it in `reactBundledInNext`). In a Next app, RSC advisories are fixed by updating **`next`**, not `react`. Directly installed `react-server-dom-*` packages only matter with other frameworks (React Router, Waku, Vite RSC).
- Since July 2026 Next only patches the latest 16.x and 15.5. Any 14.x, 15.0–15.4 or 16.x older than the active LTS is an unpatched branch: **Critical** even if no advisory shows up today.
- In `npm audit`, separate production dependencies (`--omit=dev`) from development ones: a vulnerability in a build tool rarely reaches the user. Do not run `npm audit fix --force` without permission (it bumps major versions).
- A more complete and free alternative: OSV-Scanner (`osv-scanner scan source -r .`, a Google binary; install it from its releases or `go install github.com/google/osv-scanner/v2/cmd/osv-scanner@latest`).

## Step 2. Supply chain

The npm worms of 2025–2026 (Shai-Hulud in September 2025, Shai-Hulud 2.0 in November 2025 and the "Mini Shai-Hulud" waves of April–July 2026) stole npm, GitHub and cloud tokens from `preinstall`/`postinstall` scripts and republished themselves into hundreds of packages within hours. Some 2026 variants got in through `optionalDependencies` from git or through the package binary, with no install script, and others left persistence in `.claude/settings.json`.

```bash
node /tmp/qa-security/supplychain.mjs . > /tmp/qa-security/supplychain.json
npm audit signatures        # registry signatures and provenance (needs node_modules installed)
npm --version               # npm ≥ 11 supports allowScripts and min-release-age
```

`supplychain.mjs`:

```js
// supplychain.mjs: npm supply chain hygiene (lockfile, install scripts, origins, .npmrc, signs of Shai-Hulud-type worms).
// Usage: node supplychain.mjs <project-root> > supplychain.json      (installs and runs nothing)
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] || '.';
const out = { lockfiles: [], installScripts: [], origins: {}, npmrc: {}, ioc: [], findings: [] };
const add = (sev, id, msg, evid) => out.findings.push({ sev, id, msg, ...(evid !== undefined && { evidence: evid }) });
const read = f => { try { return readFileSync(join(root, f), 'utf8'); } catch { return null; } };
const pkg = JSON.parse(read('package.json') || '{}');

// 1) Lockfile: a single one, committed and consistent with the package manager
out.lockfiles = ['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb'].filter(f => existsSync(join(root, f)));
if (!out.lockfiles.length) add('high', 'no-lockfile', 'No lockfile: every install can bring in new (and compromised) versions');
if (out.lockfiles.length > 1) add('medium', 'multiple-lockfiles', 'Several lockfiles: mixed package managers, the unused one goes stale', out.lockfiles);
if (/(^|\n)\s*(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)\s*(\n|$)/.test(read('.gitignore') || '')) add('high', 'lockfile-ignored', 'The lockfile is in .gitignore');

// 2) Declared dependencies: dangerous ranges and non-registry origins
for (const [name, spec] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies })) {
  if (/^(\*|latest|x|)$/.test(spec)) add('high', 'unpinned', `${name}: "${spec}" accepts any version`);
  if (/^(git|github:|git\+|https?:|file:|link:)|^[\w-]+\/[\w.-]+(#.*)?$/.test(spec)) add('medium', 'non-registry-dep', `${name} comes from ${spec}: no registry integrity`);
}
// 3) package-lock: install scripts, integrity, hosts
const lock = (() => { try { return JSON.parse(read('package-lock.json')); } catch { return null; } })();
if (lock?.packages) {
  const hosts = {};
  for (const [path, p] of Object.entries(lock.packages)) {
    if (!path) continue;
    const name = path.replace(/^.*node_modules\//, '');
    if (p.hasInstallScript) out.installScripts.push(`${name}@${p.version}`);
    if (p.resolved) { const h = p.resolved.startsWith('http') ? new URL(p.resolved).host : p.resolved.split(':')[0]; hosts[h] = (hosts[h] || 0) + 1; }
    if (p.resolved && !p.integrity && !p.link) add('medium', 'no-integrity', `${name} without an integrity hash in the lockfile`);
  }
  out.origins = hosts;
  for (const h of Object.keys(hosts)) if (h !== 'registry.npmjs.org') add('medium', 'other-host', `Packages resolved from ${h}: confirm it is your private registry`, hosts[h]);
  if (lock.lockfileVersion < 2) add('low', 'old-lockfile', `lockfileVersion ${lock.lockfileVersion}: regenerate with a recent npm`);
} else if (out.lockfiles.length) out.note = 'Non-npm lockfile: review scripts with `pnpm ignored-builds` / `pnpm approve-builds` or your package manager\'s equivalent';
const rootScripts = Object.keys(pkg.scripts || {}).filter(s => /^(pre|post)?install$|^prepare$/.test(s));
if (rootScripts.length) out.installScripts.unshift(...rootScripts.map(s => `(root) ${s}: ${pkg.scripts[s]}`));
if (out.installScripts.length) add('info', 'install-scripts', `${out.installScripts.length} packages run scripts on install: check they are expected (sharp, esbuild, @swc…)`, out.installScripts.slice(0, 30));

// 4) Script policy and minimum release age (.npmrc, package.json allowScripts, pnpm)
const npmrc = read('.npmrc') || '';
out.npmrc = { ignoreScripts: /ignore-scripts\s*=\s*true/.test(npmrc), minReleaseAge: (npmrc.match(/min-release-age\s*=\s*(\d+)/) || [])[1] || null,
  allowScripts: pkg.allowScripts ? Object.keys(pkg.allowScripts).length : null, pnpmOnlyBuilt: pkg.pnpm?.onlyBuiltDependencies || null,
  pnpmMinimumReleaseAge: /minimumReleaseAge/.test(read('pnpm-workspace.yaml') || '') };
if (!out.npmrc.ignoreScripts && out.npmrc.allowScripts === null && !out.npmrc.pnpmOnlyBuilt) add('medium', 'scripts-policy', 'No install-script policy (ignore-scripts, allowScripts in npm ≥ 11 or pnpm onlyBuiltDependencies)');
if (!out.npmrc.minReleaseAge && !out.npmrc.pnpmMinimumReleaseAge) add('low', 'no-release-age', 'No minimum release age (min-release-age in .npmrc / minimumReleaseAge in pnpm): worms are published and pulled within hours');
if (/_authToken\s*=\s*(?!\$\{)\S+/.test(npmrc)) add('critical', 'npmrc-token', 'Project .npmrc with a literal token');

// 5) Known indicators of compromise (Shai-Hulud 2.0, Mini Shai-Hulud 2026)
const IOC_FILES = ['setup_bun.js', 'bun_environment.js', '.claude/setup.mjs', '.claude/router_runtime.js'];
for (const f of IOC_FILES) if (existsSync(join(root, f))) out.ioc.push(f);
const claude = read('.claude/settings.json');
if (claude && /SessionStart[\s\S]{0,400}(node|bun|curl|sh)\b/.test(claude)) out.ioc.push('.claude/settings.json with a SessionStart hook that runs code: review it');
const tasks = read('.vscode/tasks.json');
if (tasks && /folderOpen/.test(tasks)) out.ioc.push('.vscode/tasks.json with runOn folderOpen: review it');
try { for (const w of readdirSync(join(root, '.github/workflows'))) { const t = read(`.github/workflows/${w}`) || '';
  if (/shai-?hulud|SHA1HULUD/i.test(w + t) || (/self-hosted/.test(t) && /discussion/.test(t + w))) out.ioc.push(`.github/workflows/${w}`); } } catch {}
// node_modules: payload files at the root of each package
try { for (const d of readdirSync(join(root, 'node_modules'))) {
  const dirs = d.startsWith('@') ? readdirSync(join(root, 'node_modules', d)).map(x => `${d}/${x}`) : [d];
  for (const p of dirs) for (const f of ['setup_bun.js', 'bun_environment.js']) if (existsSync(join(root, 'node_modules', p, f))) out.ioc.push(`node_modules/${p}/${f}`);
} } catch {}
if (out.ioc.length) add('critical', 'ioc', 'Signs of an npm worm: isolate the machine, rotate credentials (npm, GitHub, cloud) and raise the alarm', out.ioc);
const rank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
out.findings.sort((a, b) => rank[a.sev] - rank[b.sev]);
console.log(JSON.stringify(out, null, 1));
```

What to check in the result:

- A single, committed **lockfile**; in CI, `npm ci` (not `npm install`).
- **Install scripts**: the `installScripts` list should only contain packages that build binaries (`sharp`, `esbuild`, `@swc/*`, `unrs-resolver`…). Anything else: investigate. Recommended policy, from most to least modern: `allowScripts` in `package.json` managed with `npm install-scripts approve <pkg>` (npm 11 warns; **npm 12 blocks unapproved scripts by default**), `onlyBuiltDependencies` in pnpm, or `ignore-scripts=true` in `.npmrc`.
- **Minimum release age**: `min-release-age=3` in `.npmrc` (npm ≥ 11, days) or `minimumReleaseAge` in `pnpm-workspace.yaml` (minutes). It avoids installing a compromised version during its first hours.
- **IOC**: if `ioc` shows up, it is **Critical**: do not run anything else on that machine, alert the user and recommend rotating npm, GitHub and cloud tokens. `npm audit` flags any package with a malware advisory as critical.
- If `npm audit signatures` fails due to the network (downloading the Sigstore keys), say so in the report; it is not a project finding.

## Step 3. Secrets in the repo, in git and in the bundle

Any variable with the `NEXT_PUBLIC_` prefix **is inlined into the public JavaScript at build time**: if its name contains SECRET, TOKEN or PASSWORD, it is a published secret. And a `"use client"` component that imports a module containing a key drags that key into the bundle even if nobody uses it.

```bash
node /tmp/qa-security/secrets.mjs . > /tmp/qa-security/secrets.json
```

`secrets.mjs` looks for known key patterns (Stripe, AWS, GitHub, Slack, SendGrid, OpenAI, Anthropic, private keys, database URLs with a password, Supabase `service_role` JWTs, high-entropy assignments), checks the `.env*` files (whether they are in git or outside `.gitignore`) and searches `.next/static` and `out/` both for the patterns and for **the literal value of every server variable**: if the value appears in the bundle, it has leaked.

`secrets.mjs`:

```js
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
```

- `env[].inGit: true` or `git.envHistory` with files: the secret is already in the history. Removing it from the last commit is not enough: **rotate** the key and, if the repo is or will be public, purge the history (`git filter-repo`) with explicit permission.
- Keys that are public by design (Supabase anon/publishable, Stripe `pk_`, Firebase web, captcha site keys): not a finding if they are restricted (RLS, authorized domains).
- For the full git history, use a dedicated tool: `gitleaks git -v --redact .` (Homebrew, Docker `ghcr.io/gitleaks/gitleaks` or binary) or `trufflehog git file://. --no-verification` (without `--no-verification`, trufflehog **sends** the secrets to the providers to validate them: ask for permission first).

## Step 4. Server Actions, Route Handlers and proxy

Every exported Server Action is a **public POST endpoint** even if no button calls it, and so are Route Handlers. Validation, authorization and rate limiting go **inside** each one; the proxy (formerly middleware) is not a reliable barrier, as CVE-2025-29927 and the 2026 bypasses showed.

```bash
node /tmp/qa-security/endpoints.mjs . > /tmp/qa-security/endpoints.json
```

`endpoints.mjs`:

```js
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
```

The signals are heuristic: open every flagged file and confirm. Per-endpoint checklist:

- **Validation** of every input with a schema (`z.object(...).safeParse`), including `params` and `searchParams` of dynamic routes.
- **Authorization** inside the action or in the Data Access Layer (session **and** resource ownership). A contact form can be public, but then it needs **anti-spam and rate limiting** (Cloudflare Turnstile, honeypot, per-IP limit with Upstash or similar), because it sends emails you pay for.
- **What it returns**: never `process.env`, full database objects, `error.message`/`stack` or the input as is. Return `{ ok: false, error: 'Mensaje para el usuario' }` (a user-facing message, in Spanish on the site) and log the details on the server.
- **Logs**: `console.log(formData)` leaves personal data in the hosting logs.
- **CSRF**: Next compares `Origin` with `Host`/`X-Forwarded-Host` in Server Actions; `serverActions.allowedOrigins` should only list real hosts (reverse proxy, alternative domain), without broad wildcards. Requests without an `Origin` header pass with a warning. `POST` Route Handlers do not have that protection: if they use session cookies, check it yourself.
- **`server-only`**: modules that read secrets or the database should start with `import 'server-only'` so that importing them from a client component breaks the build. Optional: `experimental.taint` and `experimental_taintUniqueValue` to mark values that must never reach the client.
- **`dangerouslySetInnerHTML`** only with sanitized HTML (DOMPurify) or escaped JSON-LD (`JSON.stringify(data).replace(/</g, '\\u003c')`).
- **`images.remotePatterns`** with protocol, exact host and `pathname`; never `hostname: '**'` (the optimizer becomes an open proxy, and the 2026 SSRF and DoS advisories only apply if there are remotePatterns). No `dangerouslyAllowLocalIP`; `dangerouslyAllowSVG` only with `contentSecurityPolicy`.

## Step 5. Headers and responses

Against local `next start` and, above all, against staging or production (there the hosting has the final say):

```bash
node /tmp/qa-security/headers.mjs https://staging.ejemplo.es /contacto /api/contact
```

`headers.mjs`:

```js
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
```

Recommended values:

| Header | Starting value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' …; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests` + the third-party domains actually used |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` (`preload` only if it is going to be submitted to hstspreload.org) |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` (adjust to what the website uses) |
| `X-Powered-By` | absent: `poweredByHeader: false` in `next.config` |

**CSP and Cache Components (Next 16)**: the official guide generates a per-request nonce in `proxy.ts`, but the nonce is only applied with **dynamic rendering**, and the documentation itself warns that it is not compatible with Partial Prerendering. With `cacheComponents: true` prerendered pages ship `<script>` tags **without a nonce** and the browser blocks them (`headers.mjs` flags it as `csp-nonce-missing-in-html`). Options, in order:

1. A CSP without nonce in `next.config` `headers()` with every directive except the strict script one (`script-src 'self' 'unsafe-inline'`): it does not stop an injected XSS, but it does stop clickjacking, `object`, `base` and forms posting elsewhere.
2. `experimental.sri` (script hashes, experimental): lets you drop `'unsafe-inline'` if no CSP violations show up in the browser.
3. Nonce with fully dynamic rendering (`await connection()`): loses the static HTML and the CDN cache; only if the requirements demand it.

Before applying a strict CSP, deploy it as `Content-Security-Policy-Report-Only` and watch the console: Google Tag Manager, YouTube, maps and external fonts need their domains.

## Severity

| Level | Examples in this phase |
|---|---|
| **Critical** | Next on an unpatched branch or below its branch minimum; a real secret in the repo, in a committed `.env` or in the bundle; `NEXT_PUBLIC_*SECRET*`; an endpoint that returns `process.env`; npm worm IOC; token in `.npmrc` |
| **High** | Server Action or Route Handler that writes without validation; no CSP or headers; nonce that does not reach the HTML; `remotePatterns` with `**`; unsanitized `dangerouslySetInnerHTML`; production dependency with a high advisory; HSTS missing in production |
| **Medium** | No rate limiting or anti-spam on forms; no install-script policy; `unsafe-inline` in `script-src`; public source maps; stack traces on error pages; no `X-Content-Type-Options` |
| **Low** | `X-Powered-By`; missing `Referrer-Policy` or `Permissions-Policy`; `console.log` with form data; no `min-release-age` |

## Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

Save `qa-security.md` and `qa-security.json` (the scripts' JSON). Write the report in the user's language. Template:

```markdown
# Security — <project> — <date> — commit <hash> — Next <version> (advisory table verified on <date>)
Verdict: DO NOT PUBLISH | PUBLISH WITH RISKS | OK · Critical: N · High: N · Medium: N · Low: N

## Findings
| # | Sev. | Where (file:line / URL) | Evidence | Why it matters | Fix |
|---|---|---|---|---|---|
| S-001 | Critical | app/api/contact/route.ts:3 | `Response.json({ env: process.env })` | Publishes every server key | Return only `{ ok }`; rotate the exposed keys |

## Versions and advisories   (script table + new advisories found on nextjs.org/blog)
## Supply chain
## Secrets                 (redacted; list of keys to rotate)
## Endpoints               (table: file, methods/actions, validation, auth, rate limit)
## Headers                 (per URL)
## Not reviewed / limits
```

Common fix snippets (as proposals only):

```ts
// app/contacto/actions.ts
// Field names (mensaje, privacidad) match the Spanish form; the error message is shown to Spanish visitors.
'use server'
import 'server-only'
import { z } from 'zod'
const Contacto = z.object({ email: z.email(), mensaje: z.string().min(10).max(5000), privacidad: z.literal('on') })
export async function enviar(_prev: unknown, formData: FormData) {
  const datos = Contacto.safeParse(Object.fromEntries(formData))
  if (!datos.success) return { ok: false, error: 'Revisa los campos marcados' }
  // + Turnstile/honeypot check and per-IP limit before sending
  return { ok: true }
}
```

```ts
// next.config.ts
const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { remotePatterns: [new URL('https://images.unsplash.com/**')] },
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" },
    ] }]
  },
}
```

## False positives and limits

- `endpoints.mjs` looks for words (`auth(`, `session`, `z.`): validation in another module is not seen, and a stray word can give a false "has auth". Confirm by reading.
- `secrets.mjs` does not read the full git history (it only detects `.env` files that were ever added): use gitleaks or trufflehog for that.
- `headers.mjs` sees what the URL returns; locally, the headers added by the hosting will be missing. The headers verdict is given on staging or production.
- The versions table expires: without re-verifying it, the report cannot say "no known vulnerabilities".

## If the user asks for fixes

Order: 1) rotate exposed secrets and take them out of the code (into server variables without `NEXT_PUBLIC_`); 2) update `next` to the latest of its LTS branch and rebuild; 3) lock down endpoints (validation, minimal response, anti-spam); 4) headers; 5) supply chain policy. After each block, rerun the corresponding script and `next build`, and check in the browser that the CSP does not break anything.

## Sources

- Next advisories: https://nextjs.org/blog (CVE-2025-66478, 11-Dec-2025, July–October 2026) · https://github.com/vercel/next.js/security/advisories
- React: https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components · https://github.com/react/react/security/advisories
- Next 16 guides (included in `node_modules/next/dist/docs/`): data-security, content-security-policy, environment-variables, proxy
- npm: https://docs.npmjs.com/cli/commands/npm-audit · `npm help config` (allow-scripts, min-release-age)
