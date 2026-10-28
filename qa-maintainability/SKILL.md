---
name: qa-maintainability
description: Scores from 0 to 100 the maintainability of a Next.js website generated from Figma with AI and proposes a plan - useful README, pinned Node version, lockfile, npm scripts, .env.example, minimum tests (E2E smoke with Playwright and Vitest), GitHub Actions CI with lint, types, build and tests, Dependabot or Renovate, AGENTS.md and CLAUDE.md, optional Storybook. Use it whenever someone asks whether a project can be maintained, handed over to the client or another team, to set up CI or tests, or to prepare the repo before delivering it, even if maintainability isn't mentioned.
---

# Maintainability

The goal is to answer with evidence: **can another person (or an agent) clone this repository, get it running, change it and deploy it without breaking anything and without asking?** Websites generated from Figma with AI usually come out with the `create-next-app` README, no pinned Node version, no tests, no CI and no `.env.example`: they work on the laptop of whoever built them and break on the first handover. The result is a score from 0 to 100, findings with evidence and a plan with copy-ready templates.

**By default nothing is modified**: deliver the report and the templates; create files or install dependencies in the project only if the user asks. The script goes in `/tmp/qa-maintainability/`.

Overlaps: code quality, ESLint and `next build` → `qa-code-optimization`; secrets in `.env` or in the repo → `qa-security`; per-environment variables, hosting and rollback → `qa-deployment`; empty tests or tests without assertions → `qa-ai-generated-code`; thorough testing of links and forms → `qa-functionality`.

## Step 0. Context

1. **Next version** (`package.json`). Next 16 requires Node ≥ 20.9, no longer has `next lint` and generates `AGENTS.md` (since 16.3, `next dev` creates or updates it when it detects an agent; `create-next-app` includes it by default).
2. **Who will maintain the website**: the studio, the client or another agency. If it is handed over, README and `.env.example` become essential.
3. **Where the repo lives** (GitHub, GitLab, Bitbucket) and where it is deployed (Vercel, Netlify, own server): it changes the CI template.
4. **Git**: `git log --oneline | head` and `git ls-files | head`. The script uses `git ls-files` to know whether the lockfile is committed.

## Step 1. Run the script

```bash
mkdir -p /tmp/qa-maintainability
# write maintainability.mjs (below) there and, from the project root:
npm outdated --json > /tmp/qa-maintainability/outdated.json 2>/dev/null   # optional: needs node_modules installed
node /tmp/qa-maintainability/maintainability.mjs --outdated /tmp/qa-maintainability/outdated.json > /tmp/qa-maintainability/maintainability.json
```

It has no dependencies (Node 22). It only reads files and, if there is git, runs `git ls-files`. `npm outdated` returns exit code 1 when there are outdated packages; that is normal.

`maintainability.mjs`:

```js
// maintainability.mjs: scores (0–100) the maintainability of a Next.js project and lists the findings with evidence.
// Checks README, Node version, lockfile, scripts, .env.example, tests, CI, automatic updates,
// AGENTS.md/CLAUDE.md, .gitignore and Storybook. Only reads files; installs or runs nothing from the project.
// Usage (from the project root):
//   node /tmp/qa-maintainability/maintainability.mjs [--outdated outdated.json] > maintainability.json
//   (outdated.json optional: npm outdated --json > outdated.json)
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const argv = process.argv.slice(2), arg = k => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : null; };
const read = f => { try { return readFileSync(f, 'utf8'); } catch { return null; } };
const pkg = (() => { try { return JSON.parse(read('package.json')); } catch { return {}; } })();
const deps = { ...pkg.dependencies, ...pkg.devDependencies }, scripts = pkg.scripts || {};
const major = v => Number(String(v ?? '').match(/\d+/)?.[0]) || null;
const nextMajor = major(deps.next), nextMinor = Number(String(deps.next || '').match(/\d+\.(\d+)/)?.[1] ?? 0);
const checks = [], findings = [];
const check = (area, max, points, detail) => checks.push({ area, points: Math.max(0, Math.min(max, Math.round(points * 10) / 10)), max, detail });
const finding = (area, sev, finding, evidence, fix) => findings.push({ area, sev, finding, evidence, fix });
const SKIP = /(^|\/)(node_modules|\.next|\.git|out|dist|build|coverage|\.turbo|\.vercel|playwright-report|test-results|storybook-static)(\/|$)/;
function walk(dir = '.', acc = [], depth = 0) {
  if (depth > 8) return acc;
  let ents; try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) { const p = dir === '.' ? e.name : join(dir, e.name); if (SKIP.test(p)) continue;
    if (e.isDirectory()) walk(p, acc, depth + 1); else if (e.isFile()) acc.push(p); }
  return acc;
}
const files = walk();
const git = (() => { try { return execSync('git ls-files', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n').filter(Boolean); } catch { return null; } })();

// 1. README (15)
const readmeFile = files.find(f => /^readme(\.md|\.mdx|\.txt)?$/i.test(f)), readme = readmeFile ? read(readmeFile) : '';
const isDefault = /bootstrapped with \[`?create-next-app/i.test(readme);
if (!readmeFile) { check('README', 15, 0, 'does not exist'); finding('README', 'high', 'No README', '-', 'Create a README with the skill template'); }
else if (isDefault) { check('README', 15, 1, 'unadapted create-next-app template'); finding('README', 'high', 'Default create-next-app README', `${readmeFile}: "bootstrapped with create-next-app"`, 'Rewrite: requirements, installation, variables, scripts, deployment, contact'); }
else {
  // Keywords in Spanish and English: the README may be written in either
  const secs = { 'installation': /instal|install|npm (ci|i|install)\b|pnpm i|primeros pasos|getting started/i, 'scripts': /npm run|pnpm \w|scripts|comandos/i,
    'environment variables': /\.env|variables de entorno|environment variables/i, 'deployment': /despliegue|desplegar|deploy|vercel|netlify|producci[oó]n|hosting/i,
    'requirements (Node)': /node(\.js)?\s*(>=?|v)?\s*\d{2}|\.nvmrc|requisitos|requirements|prerequisites/i };
  const missing = Object.entries(secs).filter(([, re]) => !re.test(readme)).map(([k]) => k);
  check('README', 15, 5 + 2 * (5 - missing.length), missing.length ? `missing: ${missing.join(', ')}` : 'complete');
  if (missing.length) finding('README', missing.length > 2 ? 'medium' : 'low', `Incomplete README: missing ${missing.join(', ')}`, readmeFile, 'Add the missing sections');
}

// 2. Node version (10)
const EOL = { 18: '2025-04-30', 20: '2026-04-30', 22: '2027-04-30', 24: '2028-04-30', 26: '2029-04-30' };   // official Node.js schedule
const src = {};
for (const f of ['.nvmrc', '.node-version']) if (existsSync(f)) src[f] = read(f).trim();
const tv = read('.tool-versions')?.match(/^nodejs\s+(\S+)/m); if (tv) src['.tool-versions'] = tv[1];
if (pkg.engines?.node) src['engines.node'] = pkg.engines.node;
if (pkg.volta?.node) src['volta.node'] = pkg.volta.node;
if (pkg.devEngines?.runtime?.name === 'node' && pkg.devEngines.runtime.version) src['devEngines.runtime'] = pkg.devEngines.runtime.version;
const majors = [...new Set(Object.values(src).map(v => /^lts\//i.test(v) ? 'lts' : major(v)).filter(Boolean))];
const hardPin = Object.keys(src).some(k => k !== 'engines.node');
let nodePts = 0;
if (!Object.keys(src).length) finding('Node', 'medium', 'Node version not pinned', 'no .nvmrc, .node-version or engines', 'Create .nvmrc (24) and "engines": { "node": ">=24 <25" }');
else {
  nodePts += hardPin ? 6 : 4;
  if (!hardPin) finding('Node', 'low', 'Only engines.node: nvm, fnm and setup-node do not pick it by default', JSON.stringify(src), 'Add .nvmrc with the same version');
  const m = majors.find(x => typeof x === 'number'), today = new Date().toISOString().slice(0, 10);
  if (m && m < 20 || (m === 20 && Number(String(Object.values(src)[0]).split('.')[1] || 9) < 9)) finding('Node', 'critical', `Node ${m}: Next 16 requires ≥ 20.9`, JSON.stringify(src), 'Upgrade to Node 24 LTS');
  else if (m && m % 2 === 1) finding('Node', 'medium', `Node ${m} is not LTS`, JSON.stringify(src), 'Use an even LTS version (24)');
  else if (m && EOL[m] && EOL[m] < today) finding('Node', 'high', `Node ${m} unsupported since ${EOL[m]}`, JSON.stringify(src), 'Upgrade to Node 24 LTS');
  else { nodePts += 2; if (m && EOL[m] && EOL[m] < new Date(Date.now() + 200 * 864e5).toISOString().slice(0, 10)) finding('Node', 'low', `Node ${m} loses support on ${EOL[m]}`, JSON.stringify(src), 'Plan the move to the next LTS'); }
  if (majors.length > 1) finding('Node', 'medium', 'Different Node versions depending on the file', JSON.stringify(src), 'Unify (.nvmrc, engines and CI)'); else nodePts += 2;
}
check('Node pinned', 10, nodePts, JSON.stringify(src));

// 3. Lockfile (10)
const LOCKS = { 'package-lock.json': 'npm', 'pnpm-lock.yaml': 'pnpm', 'yarn.lock': 'yarn', 'bun.lock': 'bun', 'bun.lockb': 'bun', 'npm-shrinkwrap.json': 'npm' };
const locks = Object.keys(LOCKS).filter(existsSync), pm = pkg.packageManager?.split('@')[0];
const gi = read('.gitignore') || '';
let lockPts = 0;
if (!locks.length) finding('Lockfile', 'high', 'No lockfile: every install can bring different versions', '-', 'npm install and commit package-lock.json; use npm ci in CI');
else {
  lockPts = locks.length === 1 ? 8 : 4;
  if (locks.length > 1) finding('Lockfile', 'medium', `Several lockfiles (${locks.join(', ')})`, locks.join(', '), 'Pick one package manager and delete the rest');
  const ignored = locks.filter(l => new RegExp(`^/?${l.replace('.', '\\.')}\\s*$`, 'm').test(gi) || (git?.length && !git.includes(l)));
  if (ignored.length) { lockPts -= 6; finding('Lockfile', 'high', 'Lockfile not committed', `${ignored.join(', ')} ignored or outside git`, 'Remove it from .gitignore and commit it'); }
  if (pm && !locks.some(l => LOCKS[l] === pm)) finding('Lockfile', 'medium', `packageManager says ${pm} but the lockfile is from ${locks.map(l => LOCKS[l]).join('/')}`, pkg.packageManager, 'Align packageManager with the lockfile');
  else lockPts += 2;
}
check('Lockfile', 10, lockPts, locks.join(', ') || 'none');

// 4. Scripts (10)
let scPts = 0;
const has = re => Object.entries(scripts).find(([k, v]) => re.test(k) || re.test(v));
if (scripts.dev && scripts.build && scripts.start) scPts += 3; else finding('Scripts', 'medium', 'Basic scripts missing (dev/build/start)', Object.keys(scripts).join(', '), 'Add dev, build and start');
const lint = scripts.lint;
if (lint && !/next lint/.test(lint)) scPts += 3;
else finding('Scripts', lint ? 'high' : 'medium', lint ? '"lint" uses next lint, removed in Next 16' : 'No lint script', lint || '-', '"lint": "eslint" (or "biome check")');
if (has(/typecheck|type-check|tsc\b/)) scPts += 2; else finding('Scripts', 'low', 'No typecheck script', '-', '"typecheck": "next typegen && tsc --noEmit"');
const testScript = scripts.test && !/no test specified/.test(scripts.test) ? scripts.test : has(/^test:|vitest|playwright test|jest/)?.[1];
if (testScript) scPts += 2; else finding('Scripts', 'medium', 'No test script', scripts.test || '-', '"test": "vitest run", "test:e2e": "playwright test"');
check('npm scripts', 10, scPts, Object.keys(scripts).join(', '));

// 5. Environment variables (10)
// App variables (not test configuration ones: Playwright's BASE_URL, etc.)
const SRC = files.filter(f => /\.(m?[jt]sx?|cjs)$/.test(f) && !/\.d\.ts$|^(playwright|vitest|jest|vite)\.config\.|(^|\/)(e2e|tests?|__tests__)\/|\.(test|spec)\./.test(f));
const BUILTIN = /^(NODE_ENV|NEXT_RUNTIME|NEXT_PHASE|PORT|HOSTNAME|CI|VERCEL\w*|NETLIFY|TZ|npm_\w+|PWD|HOME)$/;
const used = {};
for (const f of SRC) { const s = read(f) || ''; for (const m of s.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)|process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]|import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g)) {
  const k = m[1] || m[2] || m[3]; if (!BUILTIN.test(k)) (used[k] ??= []).push(f); } }
const exFile = ['.env.example', '.env.sample', '.env.template', '.env.local.example', '.env.dist'].find(existsSync);
const exKeys = new Set((read(exFile) || '').split('\n').map(l => l.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=/)?.[1]).filter(Boolean));
const envFiles = files.filter(f => /^\.env(\..+)?$/.test(f) && f !== exFile);
const usedKeys = Object.keys(used), undocumented = usedKeys.filter(k => !exKeys.has(k));
if (!usedKeys.length && !envFiles.length) check('.env.example', 10, 10, 'the code uses no environment variables');
else {
  let envPts = exFile ? 5 : 0;
  if (!exFile) finding('Environment', 'medium', 'No .env.example: whoever clones the repo does not know which variables are needed', `used: ${usedKeys.join(', ') || '-'}; files: ${envFiles.join(', ')}`, 'Create .env.example with every key, without real values');
  envPts += usedKeys.length ? 5 * (1 - undocumented.length / usedKeys.length) : 5;
  if (exFile && undocumented.length) finding('Environment', 'low', `Variables used but not documented in ${exFile}`, undocumented.map(k => `${k} (${used[k][0]})`).join(', '), 'Add them to .env.example');
  check('.env.example', 10, envPts, `used: ${usedKeys.length}, undocumented: ${undocumented.length}`);
}
const giLines = gi.split('\n').map(l => l.trim());
const envIgnored = git ? envFiles.every(f => { try { execSync(`git check-ignore -q "${f}"`, { stdio: 'ignore' }); return true; } catch { return false; } }) : giLines.some(l => /^\/?\.env(\*|\.\*|\*?\.local|\.local\*?)?$/.test(l));
if (envFiles.length && !envIgnored) finding('Environment', 'high', `.env not ignored in git (${envFiles.join(', ')})`, '.gitignore without .env*', 'Add .env* and !.env.example to .gitignore; secrets → qa-security');
for (const [re, name] of [[/^\/?(\.next|\.next\/)$/, '.next'], [/^\/?node_modules\/?$/, 'node_modules'], [/tsbuildinfo/, '*.tsbuildinfo'], [/next-env\.d\.ts/, 'next-env.d.ts']])
  if (!giLines.some(l => re.test(l))) finding('Git', name === '.next' || name === 'node_modules' ? 'medium' : 'low', `.gitignore does not include ${name}`, '.gitignore', `Add ${name}`);

// 6. Tests (15)
const testFiles = files.filter(f => /\.(test|spec)\.[cm]?[jt]sx?$/.test(f) || /(^|\/)(e2e|__tests__)\/.+\.[cm]?[jt]sx?$/.test(f));
const pwCfg = files.find(f => /^playwright\.config\.[cm]?[jt]s$/.test(f)), unitCfg = files.find(f => /^(vitest|jest)\.config\.[cm]?[jt]s$|^vite\.config\.[cm]?[jt]s$/.test(f));
const e2e = testFiles.filter(f => /@playwright\/test|cypress|from ['"]playwright/.test(read(f) || ''));
const unit = testFiles.filter(f => !e2e.includes(f) && /\b(expect|assert)\b/.test(read(f) || ''));
const empty = testFiles.filter(f => !/\b(expect|assert|toHaveURL|toBeVisible)\b/.test(read(f) || ''));
let tPts = 0;
if ((pwCfg || deps['@playwright/test'] || deps.cypress) && e2e.length) tPts += 8;
else finding('Tests', 'high', 'No E2E smoke tests for key pages and forms', pwCfg || '-', 'Playwright: the skill smoke.spec.ts template');
if (unit.length) tPts += 4; else finding('Tests', 'low', 'No unit tests (Vitest) for the project logic', unitCfg || '-', 'Vitest for utilities, validation and pure Server Actions');
if (testScript) tPts += 3;
if (empty.length) finding('Tests', 'medium', 'Tests without assertions', empty.slice(0, 5).join(', '), 'Add expect or delete (details in qa-ai-generated-code)');
check('Tests', 15, tPts, `${e2e.length} E2E, ${unit.length} unit, config: ${[pwCfg, unitCfg].filter(Boolean).join(', ') || 'none'}`);

// 7. CI (15)
const wfs = files.filter(f => /^\.github\/workflows\/.+\.ya?ml$/.test(f));
const otherCi = ['.gitlab-ci.yml', 'bitbucket-pipelines.yml', '.circleci/config.yml', 'azure-pipelines.yml'].filter(existsSync);
const ci = [...wfs, ...otherCi].map(f => read(f) || '').join('\n');
let ciPts = 0;
const run = re => new RegExp(`(run|script):[^\\n]*${re}|^\\s*-\\s*[^\\n]*${re}`, 'm').test(ci);
if (!wfs.length && !otherCi.length) finding('CI', 'high', 'No CI: nobody checks lint, types and build before merging', '-', 'Create .github/workflows/ci.yml (skill template)');
else {
  ciPts += 5;
  const steps = { lint: run('(npm run lint|pnpm lint|yarn lint|eslint|biome (check|ci))'), typecheck: run('(typecheck|type-check|tsc\\b)'), build: run('(npm run build|pnpm build|yarn build|next build)'), tests: run('(npm (run )?test|pnpm test|yarn test|vitest|playwright test|test:e2e)') };
  for (const [k, ok] of Object.entries(steps)) { if (ok) ciPts += 2; else finding('CI', k === 'build' ? 'high' : 'medium', `CI does not run ${k}`, [...wfs, ...otherCi].join(', '), `Add the ${k} step`); }
  if (/pull_request|merge_requests|pull-requests/.test(ci)) ciPts += 2; else finding('CI', 'medium', 'CI does not run on pull requests', wfs.join(', '), 'on: pull_request');
  if (/npm install\b(?! -g)/.test(ci) && !/npm ci\b/.test(ci)) finding('CI', 'low', 'CI uses npm install instead of npm ci', wfs.join(', '), 'npm ci (respects the lockfile)');
  const ciNode = ci.match(/node-version:\s*['"]?(\d+)/)?.[1];
  if (ciNode && majors.length && typeof majors[0] === 'number' && Number(ciNode) !== majors[0]) finding('CI', 'medium', `CI uses Node ${ciNode} and the project pins ${majors[0]}`, wfs.join(', '), "node-version-file: '.nvmrc'");
}
check('CI', 15, ciPts, [...wfs, ...otherCi].join(', ') || 'none');

// 8. Dependencies up to date (5 + 5 optional)
const bot = ['.github/dependabot.yml', '.github/dependabot.yaml', 'renovate.json', 'renovate.json5', '.renovaterc', '.renovaterc.json', '.github/renovate.json', '.github/renovate.json5'].filter(existsSync);
if (bot.length || pkg.renovate) check('Automatic updates', 5, 5, bot.join(', ') || 'package.json#renovate');
else { check('Automatic updates', 5, 0, 'none'); finding('Dependencies', 'medium', 'No Dependabot or Renovate: security patches arrive late', '-', 'The skill .github/dependabot.yml template'); }
if (arg('outdated')) {
  let od = {}; try { od = JSON.parse(read(arg('outdated')) || '{}'); } catch {}
  const nodeMajor = majors.find(x => typeof x === 'number');   // @types/node must follow the project's Node version, not the latest
  const behind = Object.entries(od).filter(([k, v]) => major(v.latest) > major(v.current ?? v.wanted) && !(k === '@types/node' && major(v.current) === nodeMajor)).map(([k, v]) => `${k} ${v.current ?? '?'} → ${v.latest}`);
  check('Dependencies up to date', 5, behind.length === 0 ? 5 : behind.length <= 2 ? 3 : 0, `${behind.length} with a pending major version`);
  if (behind.length) finding('Dependencies', behind.some(b => /^(next|react|react-dom) /.test(b)) ? 'medium' : 'low', `${behind.length} dependencies with a pending major version`, behind.slice(0, 8).join('; '), 'Plan the upgrade (do not mix it with other changes)');
}

// 9. Documentation for AI agents (5)
const agents = read('AGENTS.md'), claude = read('CLAUDE.md') ?? read('.claude/CLAUDE.md');
let aPts = 0;
if (agents || claude) aPts += 3;
else finding('Agents', nextMajor >= 16 ? 'medium' : 'low', 'No AGENTS.md or CLAUDE.md', '-', nextMajor >= 16 && nextMinor >= 3 ? 'Run next dev with the agent (it regenerates it) or create AGENTS.md' : 'npx @next/codemod@canary agents-md');
if (agents && claude && !/@AGENTS\.md/.test(claude)) finding('Agents', 'medium', 'CLAUDE.md does not import AGENTS.md: Claude Code only reads CLAUDE.md and will not see the Next rules', 'CLAUDE.md', 'Add the line @AGENTS.md at the top of CLAUDE.md');
else if (agents || claude) aPts += 2;
if (agents && nextMajor >= 16 && !/nextjs-agent-rules|NEXT-AGENTS-MD/.test(agents)) finding('Agents', 'low', 'AGENTS.md without the Next block (docs in node_modules/next/dist/docs)', 'AGENTS.md', 'Run next dev with the agent or npx @next/codemod@canary agents-md');
if (agents && agents.replace(/<!-- BEGIN:nextjs-agent-rules -->[\s\S]*?<!-- END:nextjs-agent-rules -->/g, '').trim().length < 80 && !(claude && claude.replace(/@AGENTS\.md/, '').trim().length > 80))
  finding('Agents', 'low', 'AGENTS.md only has the generic Next block', 'AGENTS.md', 'Add commands, structure, conventions, tokens and what not to touch');
check('AGENTS.md / CLAUDE.md', 5, aPts, [agents && 'AGENTS.md', claude && 'CLAUDE.md'].filter(Boolean).join(' + ') || 'none');

// 10. Storybook (optional, not scored)
const comps = files.filter(f => /^(src\/)?components\/.+\.[jt]sx$/.test(f) && !/\.(test|spec|stories)\./.test(f));
const sb = existsSync('.storybook') || deps.storybook;
if (!sb && comps.length >= 15) finding('Documentation', 'low', `No Storybook with ${comps.length} components`, 'components/', 'Optional: Storybook 10 or an internal /design-system page');

const max = checks.reduce((n, c) => n + c.max, 0), pts = checks.reduce((n, c) => n + c.points, 0);
const score = Math.round(pts / max * 100);
const order = { critical: 0, high: 1, medium: 2, low: 3 };
console.log(JSON.stringify({ score, grade: score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : score >= 30 ? 'D' : 'E',
  next: deps.next, storybook: !!sb, git: !!git, checks, findings: findings.sort((a, b) => order[a.sev] - order[b.sev]) }, null, 1));
```

### How it is scored

| Area | Points | What gives full marks |
|---|---|---|
| README | 15 | Exists, is not the `create-next-app` one and explains requirements, installation, variables, scripts and deployment |
| Node pinned | 10 | `.nvmrc` (or `.node-version`, `.tool-versions`, Volta) and `engines` consistent, on a supported LTS |
| Lockfile | 10 | Only one, committed and from the same manager as `packageManager` |
| npm scripts | 10 | `dev`/`build`/`start`, `lint` (without `next lint`), `typecheck`, `test` |
| `.env.example` | 10 | Documents every variable the code uses (10 if it uses none) |
| Tests | 15 | E2E smoke (8), unit tests with assertions (4), test script (3) |
| CI | 15 | Workflow that runs on PRs with lint, typecheck, build and tests |
| Updates | 5 (+5) | Dependabot or Renovate; +5 if `--outdated` is passed and there are no pending majors |
| AGENTS.md / CLAUDE.md | 5 | Exists and, if both exist, `CLAUDE.md` imports `@AGENTS.md` |

Grade: A ≥ 85 · B ≥ 70 · C ≥ 50 · D ≥ 30 · E < 30. It is a heuristic to compare before and after, not a certification; always explain what is missing. Storybook is not scored: it is optional and only recommended with 15 or more components.

## Step 2. Manual review (what the script does not see)

- **README**: do the commands work as-is on a clean machine? Try `npm ci && npm run build` in a copy if possible. Does it explain where texts are changed (CMS, `lib/data`) and who the technical owner is?
- **Node version**: Node 20 has been unsupported since 30-04-2026; Node 22 is in maintenance until 30-04-2027; Node 24 has been in maintenance LTS since 20-10-2026 (supported until 30-04-2028) and Node 26 becomes active LTS at the end of October 2026 (until 30-04-2029). Pin 24 if the hosting does not offer 26 yet; if it does, 26. The script computes the warnings with the current date.
- **`@types/node`**: `create-next-app` leaves it at `^20`; Vitest 5 requires `@types/node` ≥ 22 as a peer and `npm i` fails with `ERESOLVE`. It must follow the project's Node version (`@types/node@24`).
- **Lockfile**: in CI, `npm ci` (fails if `package.json` and the lockfile do not match) instead of `npm install`.
- **`.env.example`**: keys without real values, with a comment on what each one is for and where to get it. If you find a committed or non-ignored `.env` with secrets, refer to `qa-security`.
- **Tests**: their mere existence is not enough; open them. A useful smoke test loads every key page, checks the HTTP status, a single `h1` and no console errors, and fills in the form without sending anything real.
- **CI**: it must be required for merging (*branch protection*: GitHub → Settings → Branches/Rules → "Require status checks"). A CI nobody looks at protects nothing.
- **AGENTS.md / CLAUDE.md**: Claude Code reads `AGENTS.md` if there is **no** `CLAUDE.md` (since v2.1.277); if there is a `CLAUDE.md`, it only reads that one. So, with both, `CLAUDE.md` must start with `@AGENTS.md`. The `<!-- BEGIN:nextjs-agent-rules -->` block is managed by Next (not edited by hand); the rest of the file should explain commands, structure, conventions, where the tokens are and what not to touch.

## Step 3. Templates (only if the user asks to create them)

Adapt them to the project (key routes, field names, package manager). Install the test tools:

```bash
npm i -D @types/node@24 vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @playwright/test
npx playwright install chromium
npm pkg set engines.node=">=24 <25" scripts.typecheck="next typegen && tsc --noEmit" scripts.test="vitest run" scripts.test:e2e="playwright test"
echo 24 > .nvmrc
```

`.github/workflows/ci.yml` (GitHub Actions; the action versions are kept up to date by Dependabot with the `github-actions` ecosystem):

```yaml
# .github/workflows/ci.yml: lint, types, unit tests, build and E2E smoke on every PR and on main
name: CI
on:
  pull_request:
  push:
    branches: [main]
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
permissions:
  contents: read
jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      NEXT_TELEMETRY_DISABLED: 1
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
          cache: npm
      - uses: actions/cache@v4
        with:
          path: ${{ github.workspace }}/.next/cache
          key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/*.ts', '**/*.tsx') }}
          restore-keys: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-
      - run: npm ci
      - run: npm run lint -- --max-warnings 0
      - run: npm run typecheck
      - run: npm test --if-present
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v6
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

If the build needs variables, add them as repository *secrets* and pass them in the `env:` of the build step; never in the YAML.

`.github/dependabot.yml` (alternative: Renovate with `renovate.json` → `{ "$schema": "https://docs.renovatebot.com/renovate-schema.json", "extends": ["config:recommended"], "minimumReleaseAge": "3 days" }`):

```yaml
# .github/dependabot.yml: grouped weekly PRs; majors separately and with a 30-day wait
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    cooldown:
      default-days: 5
      semver-major-days: 30
    groups:
      minor-and-patch:
        patterns: ["*"]
        update-types: [minor, patch]
    open-pull-requests-limit: 5
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
```

`playwright.config.ts`:

```ts
// playwright.config.ts: E2E smoke tests against the production build (or against BASE_URL if set)
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: BASE_URL, trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // Without BASE_URL it starts `next start` (requires `npm run build` first)
  webServer: process.env.BASE_URL
    ? undefined
    : { command: `npm run start -- -p ${PORT}`, url: BASE_URL, reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
```

`e2e/smoke.spec.ts`:

```ts
// e2e/smoke.spec.ts: every key page loads without errors, with a single h1, and the form can be filled in.
// Adjust PAGES and the form selectors to the project. Nothing is sent to real services.
// Routes, labels and button texts are those of the Spanish site (/servicios, /contacto, "Mensaje", "Enviar").
import { test, expect } from "@playwright/test";

const PAGES = ["/", "/servicios", "/contacto", "/aviso-legal"];

for (const route of PAGES) {
  test(`smoke ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    const res = await page.goto(route);
    expect(res?.status(), "HTTP status").toBeLessThan(400);
    await expect(page.locator("h1"), "a single h1").toHaveCount(1);
    await expect(page).not.toHaveTitle(/Create Next App/i);
    expect(errors, "console errors").toEqual([]);
  });
}

test("contact form: accessible fields and intercepted submission", async ({ page }) => {
  await page.goto("/contacto");
  // Server Actions POST to the route itself: intercepted so nothing real is sent
  await page.route("**/contacto", (route) =>
    route.request().method() === "POST" ? route.fulfill({ status: 200, body: "" }) : route.continue(),
  );
  const email = page.getByLabel(/email/i), message = page.getByLabel(/mensaje/i);
  await expect(email, "email field with <label>").toBeVisible({ timeout: 5_000 });
  await email.fill("qa@example.com");
  await message.fill("Prueba automática");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(page.getByRole("button", { name: /enviar/i })).toBeEnabled();
});

test("custom 404", async ({ page }) => {
  const res = await page.goto("/ruta-que-no-existe-qa");
  expect(res?.status()).toBe(404);
});
```

`vitest.config.mts` (plus an example test in `components/__tests__/Header.test.tsx` with `render` and `screen` from Testing Library):

```ts
// vitest.config.mts: unit tests and synchronous component tests (async Server Components are tested with E2E).
// Vitest 5 uses Vite 8, which resolves tsconfig aliases (@/…) without a plugin.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
});
```

`CLAUDE.md` (if the team uses Claude Code and there is already an `AGENTS.md`):

```markdown
@AGENTS.md

<!-- Claude Code-only instructions, if any -->
```

Minimal README:

```markdown
# <Project> — <client> website
## Requirements
Node.js 24 (`.nvmrc`, `nvm use`) · npm 10+
## Installation
npm ci · cp .env.example .env.local · npm run dev → http://localhost:3000
## Environment variables
| Variable | What for | Where to get it |
## Scripts
dev · build · start · lint · typecheck · test · test:e2e
## Deployment
<Vercel/Netlify/server>: branch → environment, where the variables are configured, how to roll back
## Structure and conventions
app/ routes · components/ UI · lib/ data and utilities · tokens in app/globals.css
## Contact
Technical owner, design studio, Figma file
```

Storybook (optional): `npm create storybook@latest` detects Next and uses `@storybook/nextjs-vite` (Storybook 10, compatible with Next 14–16 and Vite 8). It is only worth it if the design has a component system that will grow; otherwise, an internal non-indexed `/design-system` page is enough.

## Severity

| Level | Examples in this phase |
|---|---|
| **Critical** | Node below Next's minimum (20.9) pinned in the project; the project does not start following the README |
| **High** | Default or missing README; no lockfile or lockfile not committed; `.env*` not ignored in git; no E2E smoke tests; no CI; CI without build; `"lint": "next lint"` with Next 16; unsupported Node (20) |
| **Medium** | Node not pinned or different between files and CI; no `.env.example`; no test script; CI without lint, typecheck or tests, or not running on PRs; no Dependabot/Renovate; `CLAUDE.md` that does not import `AGENTS.md`; several lockfiles; tests without assertions |
| **Low** | Incomplete README; no `typecheck`; no unit tests; undocumented variables; `.gitignore` without `*.tsbuildinfo` or `next-env.d.ts`; `npm install` in CI; pending majors; `AGENTS.md` with only the generic block; no Storybook with many components |

## Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

`qa-maintainability.md` (with `maintainability.json` as an appendix):

```markdown
# Maintainability — <project> — <date> — commit <hash>
Score: NN/100 (grade X) · Next 16.x · Node pinned: 24/no · Manager: npm

## Summary by area
| Area | Points | What is missing |
|---|---|---|
| README | 1/15 | create-next-app template |

## Findings
### MNT-001 · High · No CI
- Evidence: .github/workflows/ does not exist
- Why it matters: nobody checks lint, types or build before publishing; the first warning is the broken website
- Fix: this skill's ci.yml template + branch protection rule

## Plan (recommended order)
1. Reproducible base: .nvmrc + engines, committed lockfile, .env.example, .gitignore (30 min)
2. A real README (1 h)
3. lint/typecheck/test scripts and CI (1 h)
4. E2E smoke of key pages and form (2 h) · Vitest for the project logic
5. Dependabot/Renovate and CLAUDE.md → @AGENTS.md (15 min)
Expected score after the plan: NN/100
```

## False positives and limitations

- README sections are detected by keywords (Spanish and English): a README that says "instalación" (installation) without useful commands scores the same. Read it.
- Environment variables are searched as literal `process.env.X`; it does not see `process.env[name]` with a variable or those only used by the hosting. Test configuration ones (Playwright's `BASE_URL`) do not count.
- CI is evaluated by the YAML text: a commented-out or conditional step (`if:`) counts as present. GitLab, Bitbucket, CircleCI and Azure are detected with the same keywords.
- Without git (downloaded folder), it cannot tell whether the lockfile is committed; the report shows it with `"git": false`.
- `npm outdated` needs `node_modules` installed and network access; without them, that part does not score and does not penalise.

## If the user asks for fixes

1. New branch. Apply the plan in order: each step leaves the project working.
2. After installing the test tools, run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e` locally before pushing the workflow.
3. It is normal for the smoke test to fail at first: on AI-generated websites it usually finds two `h1`, the "Create Next App" title or inputs without `label`. Do not relax the test; note the failures and refer to `qa-technical-seo`, `qa-accessibility` or `qa-functionality`.
4. Run `maintainability.mjs` again and compare the score.

## Sources

- Next.js 16: minimum Node 20.9 (`node_modules/next/dist/docs/01-app/01-getting-started/01-installation.md`), agents and `AGENTS.md` (`…/02-guides/ai-agents.md`, `…/05-config/01-next-config-js/agentRules.md`), tests (`…/02-guides/testing/playwright.md`, `vitest.md`), CI cache (`…/02-guides/ci-build-caching.md`), `next typegen` (`…/03-api-reference/06-cli/next.md`)
- Claude Code and AGENTS.md: https://code.claude.com/docs/en/memory
- actions/setup-node v6 (`node-version-file`, cache): https://github.com/actions/setup-node
- Dependabot: https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference
- Node.js schedule: https://nodejs.org/en/about/previous-releases
