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
