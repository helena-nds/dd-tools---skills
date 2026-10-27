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
