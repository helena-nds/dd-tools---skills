// config.mjs: reviews the project's quality configuration (tsconfig, next.config, ESLint, Prettier/Biome, scripts)
// and summarizes the outputs of ESLint (JSON), tsc and next build. It runs nothing: it only reads files.
// Usage (from the project root):
//   node /tmp/qa-code-optimization/config.mjs [--eslint eslint.json] [--tsc tsc.txt] [--build build.log] > config.jsonl
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const argv = process.argv.slice(2), arg = k => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : null; };
const out = [], emit = f => { out.push(f); process.stdout.write(JSON.stringify(f) + '\n'); };
const read = f => { try { return readFileSync(f, 'utf8'); } catch { return null; } };
// JSON with comments and trailing commas (tsconfig): strips comments while respecting strings ("@/*" is not a comment)
const json5 = s => JSON.parse(s.replace(/("(?:\\.|[^"\\])*")|\/\*[\s\S]*?\*\/|\/\/.*$/gm, (m, str) => str ?? '').replace(/,(\s*[}\]])/g, '$1'));
const pkg = (() => { try { return JSON.parse(read('package.json')); } catch { return {}; } })();
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const major = v => Number(String(v || '').replace(/^[^\d]*/, '').split('.')[0]) || null;
const nextMajor = major(deps.next);

// 1. TypeScript: strict and recommended options (follows relative "extends")
function loadTs(f, depth = 0) {
  const s = read(f); if (!s || depth > 3) return null;
  let c; try { c = json5(s); } catch (e) { emit({ rule: 'tsconfig-unreadable', sev: 'medium', file: f, match: e.message.slice(0, 80) }); return null; }
  const ext = [c.extends].flat().filter(e => e && e.startsWith('.'));
  const base = ext.map(e => loadTs(join(dirname(f), e.endsWith('.json') ? e : e + '.json'), depth + 1)).filter(Boolean);
  return { ...Object.assign({}, ...base), ...c, compilerOptions: Object.assign({}, ...base.map(b => b.compilerOptions), c.compilerOptions) };
}
const ts = loadTs('tsconfig.json');
if (!ts) emit({ rule: 'no-tsconfig', sev: 'high', file: 'tsconfig.json', match: 'does not exist or cannot be read', note: 'project without TypeScript or without configuration' });
else {
  const o = ts.compilerOptions || {};
  if (o.strict !== true) emit({ rule: 'ts-no-strict', sev: 'high', file: 'tsconfig.json', match: `strict: ${o.strict}`, note: 'enable strict; estimate the cost with tsc --noEmit --strict' });
  for (const k of ['noImplicitAny', 'strictNullChecks']) if (o[k] === false) emit({ rule: 'ts-strict-partially-disabled', sev: 'high', file: 'tsconfig.json', match: `${k}: false` });
  for (const k of ['noUncheckedIndexedAccess', 'noFallthroughCasesInSwitch', 'noImplicitOverride'])
    if (!o[k]) emit({ rule: 'ts-recommended-option', sev: 'low', file: 'tsconfig.json', match: `${k} not enabled` });
  if (o.allowJs && !o.checkJs) emit({ rule: 'ts-allowjs-no-check', sev: 'low', file: 'tsconfig.json', match: 'allowJs without checkJs', note: 'the project\'s .js files are not checked' });
}

// 2. next.config: hidden errors and keys removed in Next 16
const nextCfgFile = ['next.config.ts', 'next.config.mjs', 'next.config.js', 'next.config.cjs', 'next.config.mts'].find(existsSync);
const nc = nextCfgFile ? read(nextCfgFile).replace(/^\s*\/\/.*$/gm, '') : '';
if (/ignoreBuildErrors\s*:\s*true/.test(nc)) emit({ rule: 'next-ignores-ts-errors', sev: 'critical', file: nextCfgFile, match: 'typescript.ignoreBuildErrors: true', note: 'the build passes with type errors' });
if (/ignoreDuringBuilds\s*:\s*true/.test(nc) || /\beslint\s*:\s*\{/.test(nc))
  emit({ rule: 'next-config-eslint', sev: nextMajor >= 16 ? 'medium' : 'high', file: nextCfgFile, match: 'eslint key in next.config', note: nextMajor >= 16 ? 'Next 16 no longer runs the linter in the build: the key is redundant, run eslint separately' : 'the build skips the linter' });
if (/reactStrictMode\s*:\s*false/.test(nc)) emit({ rule: 'react-strict-mode-off', sev: 'low', file: nextCfgFile, match: 'reactStrictMode: false' });

// 3. Scripts and linter
const scripts = pkg.scripts || {};
for (const [k, v] of Object.entries(scripts)) if (/\bnext lint\b/.test(v))
  emit({ rule: 'script-next-lint', sev: nextMajor >= 16 ? 'high' : 'medium', file: 'package.json', match: `${k}: ${v}`, note: nextMajor >= 16 ? 'next lint does not exist in Next 16: the script fails. Codemod next-lint-to-eslint-cli' : 'deprecated in Next 15.5, removed in 16' });
if (!scripts.lint) emit({ rule: 'no-lint-script', sev: 'medium', file: 'package.json', match: 'there is no "lint" script' });
if (!Object.values(scripts).some(v => /\btsc\b.*--noEmit|\bnext typegen\b/.test(v))) emit({ rule: 'no-typecheck-script', sev: 'low', file: 'package.json', match: 'there is no typecheck script', note: '"typecheck": "next typegen && tsc --noEmit"' });
const flat = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts'].find(existsSync);
const legacy = readdirSync('.').find(f => /^\.eslintrc(\.(js|cjs|json|ya?ml))?$/.test(f));
const biome = ['biome.json', 'biome.jsonc'].find(existsSync);
if (!flat && !legacy && !biome) emit({ rule: 'no-linter', sev: 'high', file: '.', match: 'no ESLint or Biome configuration' });
if (legacy) emit({ rule: 'eslintrc-legacy', sev: 'medium', file: legacy, match: legacy, note: 'ESLint 9+ uses flat config (eslint.config.mjs); ESLint 10 no longer supports eslintrc' });
if (flat) {
  const ec = read(flat);
  if (deps.next && !/eslint-config-next|@next\/eslint-plugin-next/.test(ec)) emit({ rule: 'eslint-no-next-rules', sev: 'medium', file: flat, match: 'does not load eslint-config-next', note: 'Next rules are missing (no-img-element, no-html-link-for-pages…)' });
  if (/eslint-config-next/.test(ec) && !/core-web-vitals/.test(ec)) emit({ rule: 'eslint-no-core-web-vitals', sev: 'low', file: flat, match: 'without eslint-config-next/core-web-vitals', note: 'it turns the rules that affect CWV into errors' });
  if (/FlatCompat|extends\s*:\s*\[/.test(ec)) emit({ rule: 'eslint-flatcompat', sev: 'low', file: flat, match: 'FlatCompat', note: 'eslint-config-next 16 exports native flat config: import eslint-config-next/core-web-vitals' });
}
if (deps['eslint-config-next'] && nextMajor && major(deps['eslint-config-next']) !== nextMajor)
  emit({ rule: 'eslint-config-next-mismatch', sev: 'medium', file: 'package.json', match: `next ${deps.next} · eslint-config-next ${deps['eslint-config-next']}`, note: 'use the same version as next' });
const prettier = existsSync('.prettierrc') || readdirSync('.').some(f => /^(\.prettierrc\..+|prettier\.config\..+)$/.test(f)) || pkg.prettier || deps.prettier;
if (!prettier && !biome) emit({ rule: 'no-formatter', sev: 'low', file: '.', match: 'no Prettier or Biome', note: 'formatting depends on each editor/agent' });
if (pkg.type !== 'module' && flat === 'eslint.config.js') emit({ rule: 'eslint-config-cjs', sev: 'low', file: flat, match: 'eslint.config.js without "type": "module"', note: 'rename to .mjs if it uses import' });

// 4. ESLint summary (eslint . -f json -o eslint.json)
if (arg('eslint')) {
  try {
    const res = JSON.parse(read(arg('eslint'))), byRule = {};
    for (const f of res) for (const m of f.messages) {
      const k = m.ruleId || (m.fatal ? 'parse-error' : 'no-rule');
      (byRule[k] ??= { rule: k, errors: 0, warnings: 0, examples: [] })[m.severity === 2 ? 'errors' : 'warnings']++;
      if (byRule[k].examples.length < 3) byRule[k].examples.push(`${f.filePath.replace(process.cwd() + '/', '')}:${m.line}`);
    }
    for (const r of Object.values(byRule)) emit({ rule: 'eslint', sev: r.errors ? 'high' : 'medium', file: r.examples[0].split(':')[0], match: `${r.rule}: ${r.errors} errors, ${r.warnings} warnings`, examples: r.examples });
    const sup = res.reduce((n, f) => n + (f.suppressedMessages?.length || 0), 0);
    if (sup) emit({ rule: 'eslint-suppressed', sev: 'low', file: '.', match: `${sup} warnings silenced with eslint-disable`, note: 'check that each one is justified' });
  } catch (e) { emit({ rule: 'eslint-json-unreadable', sev: 'info', file: arg('eslint'), match: e.message.slice(0, 80) }); }
}
// 5. tsc --noEmit --pretty false > tsc.txt
if (arg('tsc')) {
  const errs = (read(arg('tsc')) || '').split('\n').filter(l => /error TS\d+/.test(l)), byCode = {};
  for (const l of errs) { const c = l.match(/error (TS\d+)/)[1]; (byCode[c] ??= []).push(l.split('(')[0]); }
  for (const [c, l] of Object.entries(byCode)) emit({ rule: 'tsc', sev: 'high', file: l[0], match: `${c}: ${l.length} errors`, examples: [...new Set(l)].slice(0, 3) });
}
// 6. next build > build.log 2>&1 (Next 16: warnings with ⚠, errors with ⨯ or "Failed to compile")
if (arg('build')) {
  const log = read(arg('build')) || '', lines = log.split('\n');
  const exit = log.match(/^exit=(\d+)\s*$/m)?.[1];               // the skill appends "exit=$?" at the end of the log
  const failRe = /Failed to (?:compile|type check)|Build error occurred|^\s*⨯ |Error occurred prerendering|Type error:|error TS\d+/;
  if (exit ? exit !== '0' : lines.some(l => failRe.test(l)) && !lines.some(l => /^[┌├└]\s/.test(l)))
    emit({ rule: 'build-fails', sev: 'critical', file: arg('build'), match: (lines.find(l => failRe.test(l)) || `exit=${exit}`).trim().slice(0, 160),
      errors: lines.filter(l => failRe.test(l)).map(l => l.trim()).slice(0, 10) });
  // Groups warnings: joins continuation lines (indented ⚠ or "See more info") and normalizes the route
  const warns = [];
  for (const l of lines) {
    if (!/^\s*⚠|\bwarn(ing)?\b[: -]/i.test(l) || /Partial Prefetching|Cache Components|Environments:|npm warn/.test(l)) continue;
    const t = l.trim().replace(/^⚠\s?/, '');
    if (warns.length && (/^\s{2,}/.test(t) || /^See more info/.test(t))) { warns.at(-1).push(t.trim()); continue; }
    warns.push([t]);
  }
  const grouped = {};
  for (const w of warns) { const msg = w.join(' · '), key = msg.replace(/ in (\/[^\s.]*)/g, ' in <route>');
    (grouped[key] ??= { n: 0, routes: [] }).n++; const r = msg.match(/ in (\/[^\s.]*)/); if (r && !grouped[key].routes.includes(r[1])) grouped[key].routes.push(r[1]); }
  for (const [k, g] of Object.entries(grouped)) emit({ rule: 'build-warning', sev: 'high', file: arg('build'), match: k.slice(0, 200), count: g.n, ...(g.routes.length && { routes: g.routes }), note: 'the build must come out clean; lower to medium if it is informational' });
  const routes = lines.filter(l => /^[┌├└]\s/.test(l));
  emit({ rule: 'build-summary', sev: 'info', file: arg('build'), match: `${routes.length} routes, ${Object.keys(grouped).length} distinct warnings`, routes: routes.map(l => l.replace(/^[┌├└]\s*/, '').trim()) });
}
console.error(JSON.stringify({ next: deps.next, typescript: deps.typescript, eslint: deps.eslint, 'eslint-config-next': deps['eslint-config-next'],
  flatConfig: flat || null, eslintrc: legacy || null, biome: biome || null, prettier: !!prettier, findings: out.filter(f => f.sev !== 'info').length }, null, 1));
