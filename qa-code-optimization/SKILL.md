---
name: qa-code-optimization
description: Audits the tidiness and optimization of the code of a Next.js 15/16 website generated from Figma with AI - structure and conventions, near-duplicate components (jscpd), dead code, unused files and dependencies (knip), TypeScript strict, any and ts-ignore, ESLint flat config, next build without warnings, console.log, TODO, commented-out code, hardcoded data, unnecessary use client and heavy imports, with a refactor plan. Use it whenever someone asks to review code quality, cleanliness, technical debt or a refactor, even if optimization is not mentioned.
---

# Code optimization and tidiness

The goal is to answer with evidence: **is the code tidy, free of leftovers and ready for another person (or agent) to maintain, and does the build come out clean?** When an agent turns Figma screens into code, each screen is usually generated separately: near-identical components appear (`Header` and `HeaderCopy`), dependencies installed "just in case", `"use client"` on components that don't need it (more JavaScript in the browser), `any` to get by and sample data written inside the JSX. None of that breaks the site today, but it makes every change more expensive.

**By default no code is modified**: the report and the refactor plan are delivered; fixes are applied only if the user asks. Tools go in `/tmp/qa-code-optimization/`, never in the project. `next build` writes to `.next/` (it is an artifact, not code); in Next 16 `next dev` uses `.next/dev`, so you can build with the dev server running.

Overlaps (refer, don't repeat): invented packages, obsolete Next APIs, div soup and agent comments → `qa-ai-generated-code`; secrets (`sk_live_…`, `NEXT_PUBLIC_` with secrets, exposed `process.env`) → `qa-security`; hex and arbitrary Tailwind values → `qa-design-tokens`; real bundle weight per route → `qa-performance-cwv`; `<img>` without alt and `div onClick` → `qa-accessibility`; lorem ipsum and TODO visible on screen → `qa-content`; README, CI and tests → `qa-maintainability`.

## Step 0. Context

1. **Next version** (`package.json`). In Next 16: `next lint` no longer exists and `next build` no longer runs the linter (ESLint has to be run separately); Turbopack is the default bundler; `next typegen` generates route types without building; `next build` checks types with the local `tsc` (supports TypeScript 7). In Next 15.5, `next lint` works but is deprecated.
2. **Structure**: App Router (`app/`), Pages (`pages/`) or both; with or without `src/`; monorepo (knip needs `--workspace`).
3. **Package manager and lockfile** (`package-lock.json`, `pnpm-lock.yaml`…): use the same one to run things (`npx`, `pnpm exec`).
4. **TypeScript**: version (5, 6 or 7) and whether `tsconfig.json` exists.
5. **Linter**: `eslint.config.*` (flat), `.eslintrc*` (legacy) or `biome.json`.
6. **Git state**: `git status --short` and `git rev-parse --short HEAD` to date the report. If there are uncommitted changes, mention it.
7. **ripgrep**: the `rg` commands need ripgrep on the PATH (`command -v rg`); macOS doesn't ship it and Claude Code's bundled one is usually not accessible. If it's missing, install it only with permission (`brew install ripgrep`) or, in a git repo, use `git ls-files -co --exclude-standard` as the file list (e.g. `git ls-files -co --exclude-standard -- '*.tsx' | xargs grep -n "pattern"`).

## Step 1. Prepare the tools

```bash
mkdir -p /tmp/qa-code-optimization && cd /tmp/qa-code-optimization && npm init -y >/dev/null \
  && npm i oxc-parser@0 knip@6 jscpd@5 >/dev/null
```

Write `scan.mjs` and `config.mjs` (below) there. Tested with Node 22, ripgrep 14, oxc-parser 0.155, knip 6.43 and jscpd 5.4 (Rust engine installed as a per-platform binary). knip 6 requires Node ≥ 20.19 or ≥ 22.12. Run everything **from the project root**. ESLint and TypeScript are the project's own (`npx eslint`, `npx tsc`) so that its configuration is respected.

## Step 2. Structure and conventions

Quick view of folders and number of files:

```bash
rg --files -g '!node_modules' -g '!.next' -g '!public' | awk -F/ '{print (NF>2 ? $1"/"$2 : $1)}' | sort | uniq -c | sort -rn | head -30
```

Check and note down:

- Expected folders: `app/` (routes), `components/` (UI), `lib/` (utilities, data, config), `public/`; `hooks/` and `types/` if needed. Mixing `src/app` with `components/` at the root, or having components inside `app/` without a private folder (`_components/`), is tidiness debt.
- One component per file, file name = component name. `scan.mjs` flags mixed styles (PascalCase and kebab-case), mixed exports (`default` and named) and iteration names (`HeaderCopy`, `CardOld`, `HeroV2`, `final`).
- Components over 300 lines or 120 JSX elements (`large-component`): usually a whole Figma screen pasted in. Split them by section.
- Props: the same words for the same thing (`variant`/`size` across the whole project, not `type`, `kind` and `mode` depending on the component).

## Step 3. Dead code and unused dependencies (knip)

knip builds the import graph from Next's entry points (its plugin includes `page`, `layout`, `route`, `proxy`, `instrumentation`, `sitemap`, `opengraph-image`… and reads `next.config` for Turbopack loaders) and lists what nobody uses:

```bash
/tmp/qa-code-optimization/node_modules/.bin/knip --reporter json > /tmp/qa-code-optimization/knip.json
/tmp/qa-code-optimization/node_modules/.bin/knip                 # same information, human-readable
/tmp/qa-code-optimization/node_modules/.bin/knip --production    # production code only (no tests or devDependencies)
```

| knip type | What it means | Severity |
|---|---|---|
| `files` | File nobody imports (`components/Unused.tsx`) | Medium |
| `dependencies` | In `package.json` and not imported (`lodash`, `moment`, `axios`): more install time, more attack surface | Medium |
| `unlisted` | Imported but not in `package.json`: works by accident | High |
| `unresolved` | Import that doesn't resolve | High |
| `exports`, `types` | Export not used outside the file | Low |
| `devDependencies`, `binaries` | Tool declared and not used | Low |

If knip gives false positives (files loaded by a convention it doesn't know, such as `mdx-components.tsx`), don't edit the project: create the configuration in `/tmp` and pass it with `--config`:

```json
{ "$schema": "https://unpkg.com/knip@6/schema.json", "entry": ["mdx-components.tsx"], "ignoreDependencies": ["@tailwindcss/postcss"] }
```

Don't use `knip --fix` without permission: it deletes exports and files.

## Step 4. Duplicate or near-duplicate components (jscpd)

```bash
J=/tmp/qa-code-optimization/node_modules/.bin/jscpd
IGN="**/node_modules/**,**/.next/**,**/public/**,**/*.d.ts,**/*.json,**/*.lock"
# 1) Literal copies of large blocks (defaults: 50 tokens, 5 lines)
$J . -i "$IGN" --no-tips -r console
# 2) Near duplicates: same skeleton with other names or texts (useful for small Figma components)
$J . -i "$IGN" --min-tokens 25 --min-lines 3 --ignore-identifiers --ignore-literals --no-tips --no-colors \
   -r json,silent -o /tmp/qa-code-optimization/jscpd
node -e "const d=require('/tmp/qa-code-optimization/jscpd/jscpd-report.json');console.log(d.statistics.total.percentage.toFixed(1)+' % duplicated');
for(const c of d.duplicates)console.log(c.kind,c.lines+' lines',c.firstFile.name+':'+c.firstFile.start,'≈',c.secondFile.name+':'+c.secondFile.start)"
```

Optional, slower: `--similarity=0.8` compares the structure of functions (normalized syntax tree) and finds components rewritten in a different order. Ignore `--semantic`: it downloads a 548 MB model.

How to interpret it: `renamed` between two components with similar names (`Header.tsx` ≈ `HeaderCopy.tsx`) is the typical AI case and is solved with **one component with variants** (props `variant`, `showNav`…), not by deleting blindly: first check with knip which one is used. A global percentage > 5 % is Medium; below that, review only the component pairs.

## Step 5. TypeScript

```bash
npx next typegen 2>/dev/null; npx tsc --noEmit --pretty false > /tmp/qa-code-optimization/tsc.txt; echo "exit=$?"
```

`next typegen` generates the route types (`PageProps`, `LayoutProps`) that `tsc` needs outside the build. If `strict` is disabled, estimate the cost of enabling it without touching anything:

```bash
npx tsc --noEmit --strict --pretty false | grep -c 'error TS'
```

Also review (counted by `scan.mjs` and by the `@typescript-eslint/no-explicit-any` rule): every `any`, `@ts-ignore` and `@ts-nocheck`. An `any` on data coming from outside (forms, APIs, CMS) is more serious than on an internal type: there the right thing is to validate (for example with Zod) and derive the type. `@ts-expect-error` with an explanation is acceptable; `@ts-ignore` is not, because it keeps silencing the error once it no longer exists.

## Step 6. ESLint and formatting

In Next 16 the linter is run separately. With the project's configuration:

```bash
npx eslint . -f json -o /tmp/qa-code-optimization/eslint.json; echo "exit=$?"
```

If the project has no ESLint or Biome configuration, don't create one inside it: it is a finding (`no-linter`). Next 16's reference configuration (the one `create-next-app` generates, native flat config; `eslint-config-next` ≥ 16.4 supports ESLint 9 and 10, and ESLint 10 no longer reads `.eslintrc`):

```js
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([...nextVitals, ...nextTs, globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"])]);
```

With the script `"lint": "eslint"` and, if there is `next lint` in `package.json` or in CI, the codemod `npx @next/codemod@latest next-lint-to-eslint-cli .`. For formatting, Prettier or Biome with a `format` script is enough; what matters is that it exists and that CI checks it.

## Step 7. `next build` without errors or warnings

```bash
npx next build > /tmp/qa-code-optimization/build.log 2>&1; echo "exit=$?" >> /tmp/qa-code-optimization/build.log
```

If it fails because of missing environment variables, don't invent them: note it (it is a `qa-maintainability` finding, `.env.example` is missing) and ask for the staging values. In Next 16 warnings come out with `⚠` (for example `Unsupported metadata themeColor…`, `` `eslint` configuration in next.config.ts is no longer supported``); `config.mjs` groups them by message and lists the affected routes. A build that only passes with `typescript.ignoreBuildErrors: true` is Critical: it hides real errors.

## Step 8. Code scan (scan.mjs)

```bash
rg --files -g '*.{ts,tsx,js,jsx,mjs}' -g '!node_modules' -g '!.next' -g '!**/*.d.ts' -g '!*.config.*' -g '!**/*.{test,spec,stories}.*' -g '!e2e' -g '!public' \
  | node /tmp/qa-code-optimization/scan.mjs > /tmp/qa-code-optimization/scan.jsonl
```

The exclusion globs are needed: ripgrep only respects `.gitignore` inside a git repository. Without `rg` (step 0), in a git repo this works: `git ls-files -co --exclude-standard -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' | grep -vE '\.d\.ts$|\.config\.|\.(test|spec|stories)\.|^(e2e|public)/' | node /tmp/qa-code-optimization/scan.mjs > /tmp/qa-code-optimization/scan.jsonl`.

`scan.mjs`:

```js
// scan.mjs: static analysis (AST with oxc-parser) of code tidiness and optimization in a Next.js project.
// Detects unnecessary "use client", heavy imports (and whether they reach the client), console/debugger, TODO, any/@ts-ignore,
// commented-out code, hardcoded data and URLs, large components, suspicious names (Copy, Old, v2…) and mixed conventions.
// Usage (from the project root):
//   rg --files -g '*.{ts,tsx,js,jsx,mjs}' -g '!node_modules' -g '!.next' -g '!**/*.d.ts' -g '!*.config.*' -g '!**/*.{test,spec,stories}.*' -g '!e2e' -g '!public' \
//     | node /tmp/qa-code-optimization/scan.mjs > /tmp/qa-code-optimization/scan.jsonl   (JSON summary on stderr)
import { parseSync } from 'oxc-parser';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, basename, normalize } from 'node:path';

const HEAVY = { // package → suggested alternative
  moment: 'Intl.DateTimeFormat, date-fns or dayjs', lodash: 'native methods or lodash-es (per-function import)',
  axios: 'native fetch (Next extends it on the server)', jquery: 'DOM APIs / React', 'chart.js': 'deferred loading with next/dynamic',
  three: 'next/dynamic with ssr:false only where it is used', firebase: 'modular imports (firebase/auth…) and only on the client if needed',
  'aws-sdk': '@aws-sdk/client-* (v3, modular) and only on the server', 'framer-motion': 'motion/react with LazyMotion + m', 'motion': 'LazyMotion + m',
  'highlight.js': 'highlight on the server (shiki) or import only the languages used', 'react-icons': 'named imports ({ FaBeer } from "react-icons/fa"), never import *',
  xlsx: 'load with import() on click', 'mapbox-gl': 'next/dynamic', leaflet: 'next/dynamic with ssr:false', 'lottie-web': 'lottie-light or video/SVG', gsap: 'import only the plugins used',
};
const BROWSER = new Set(['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'matchMedia', 'IntersectionObserver',
  'ResizeObserver', 'MutationObserver', 'requestAnimationFrame', 'history', 'location', 'alert', 'confirm', 'customElements']);
const ROUTE_FILE = /(^|\/)(page|layout|template|default|not-found|error|loading)\.[jt]sx?$/;
const DATA_DIR = /(^|\/)(data|content|constants|config|fixtures|mocks?|i18n|messages|locales)(\/|\.)/i;
const files = readFileSync(0, 'utf8').split('\n').map(s => s.trim().replace(/^\.\//, '')).filter(Boolean);
const tsconfig = (() => { try { return JSON.parse(readFileSync('tsconfig.json', 'utf8').replace(/("(?:\\.|[^"\\])*")|\/\*[\s\S]*?\*\/|\/\/.*$/gm, (m, str) => str ?? '').replace(/,(\s*[}\]])/g, '$1')); } catch { return {}; } })();
const aliases = Object.entries(tsconfig.compilerOptions?.paths || { '@/*': ['./*'] }).map(([k, v]) => [k.replace('*', ''), v[0].replace('*', '').replace(/^\.\//, '')]);
const counts = {}, info = {}, importers = {};
const emit = f => { counts[f.rule] = (counts[f.rule] || 0) + 1; process.stdout.write(JSON.stringify(f) + '\n'); };

function resolve(from, spec) {
  let base = null;
  if (spec.startsWith('.')) base = join(dirname(from), spec);
  else for (const [a, t] of aliases) if (spec.startsWith(a)) { base = join(t, spec.slice(a.length)); break; }
  if (base === null) return null;
  for (const ext of ['', '.tsx', '.ts', '.jsx', '.js', '.mjs', '/index.tsx', '/index.ts', '/index.js'])
    if (existsSync(base + ext) && statSync(base + ext).isFile()) return normalize(base + ext);
  return null;
}
function walk(node, parent, key, visit) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent, key);
  for (const k in node) { const v = node[k]; if (k === 'start' || k === 'end') continue;
    if (Array.isArray(v)) v.forEach(c => c && typeof c === 'object' && walk(c, node, k, visit));
    else if (v && typeof v === 'object' && typeof v.type === 'string') walk(v, node, k, visit); }
}
const looksLikeCode = t => /[(){};=<>]/.test(t) && !/^\s*(eslint|@ts-|prettier|istanbul|c8|webpack|@type|@param|@returns|https?:)/.test(t)
  && [t, `function _() {\n${t}\n}`].some(code => { try {   // the wrapper allows bare return/await
    const r = parseSync('c.tsx', code), body = code === t ? r.program.body : r.program.body[0]?.body?.body || [];
    return !r.errors.length && body.length > 0 && !body.every(s => s.type === 'ExpressionStatement' && /^(Identifier|Literal|BinaryExpression)$/.test(s.expression.type));
  } catch { return false; } });

for (const file of files) {
  let src; try { src = readFileSync(file, 'utf8'); } catch { continue; }
  const lineOf = pos => src.slice(0, pos).split('\n').length;
  let r; try { r = parseSync(file, src); } catch (e) { emit({ rule: 'parse-error', sev: 'info', file, line: 1, match: String(e.message).slice(0, 120) }); continue; }
  const dirs = r.program.body.filter(s => s.directive).map(s => s.directive);
  const f = info[file] = { defaultExport: r.module.staticExports.some(e => e.entries.some(x => x.exportName.kind === 'Default')),
    nav: /\b(?:location\.(?:href\s*=|assign\(|replace\()|router\.(?:push|replace)\()/.test(src), client: dirs.includes('use client'), hooks: new Set(), events: new Set(), browser: new Set(), other: [], imports: [], lines: src.split('\n').length, jsx: 0 };
  for (const im of r.module.staticImports) {
    const spec = im.moduleRequest.value, typeOnly = im.entries.length > 0 && im.entries.every(e => e.isType);
    const target = resolve(file, spec); if (target && !typeOnly) { f.imports.push(target); (importers[target] ??= []).push(file); }
    const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    if (!target && !/^(react|react-dom|next|node:|server-only|client-only)$/.test(pkg) && !spec.startsWith('.')) f.other.push(spec);
    const star = im.entries.some(e => e.importName.kind === 'NamespaceObject');
    if (HEAVY[pkg] && !typeOnly && (pkg !== 'react-icons' || star)) f.heavy = [...(f.heavy || []), { pkg, spec, line: lineOf(im.start), star }];
  }
  for (const ex of r.module.dynamicImports || []) { const s = src.slice(ex.moduleRequest.start, ex.moduleRequest.end).replace(/['"`]/g, ''); const t = resolve(file, s); if (t) (importers[t] ??= []).push(file); }
  const flaggedArrays = [];
  walk(r.program, null, null, (n, p, key) => {
    const line = () => lineOf(n.start);
    if (n.type === 'CallExpression') {
      const c = n.callee, name = c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' && !c.computed ? c.property.name : '';
      if (/^use([A-Z0-9]|$)/.test(name)) f.hooks.add(name);
      if (name === 'createContext') f.hooks.add('createContext');
      const arg0 = n.arguments?.[0];
      if (/^(fetch|get|post|put|patch|delete|request)$/.test(name) && arg0?.type === 'Literal' && /^https?:\/\//.test(arg0.value) && !/^https?:\/\/(localhost|127\.|0\.0\.0\.0)/.test(arg0.value))
        emit({ rule: 'hardcoded-api-url', sev: 'low', file, line: line(), match: arg0.value.slice(0, 80), note: 'move the base URL to an environment variable or lib/config' });
      if (c.type === 'MemberExpression' && c.object.type === 'Identifier' && c.object.name === 'console')
        emit({ rule: 'console', sev: /^(warn|error)$/.test(name) ? 'low' : 'medium', file, line: line(), match: src.slice(n.start, n.end).slice(0, 80) });
    }
    if (n.type === 'DebuggerStatement') emit({ rule: 'debugger', sev: 'high', file, line: line(), match: 'debugger' });
    if (n.type === 'JSXAttribute' && n.name.type === 'JSXIdentifier' && /^on[A-Z]/.test(n.name.name)) f.events.add(n.name.name);
    if (n.type === 'JSXElement') f.jsx++;
    if (n.type === 'Identifier' && BROWSER.has(n.name) && !(p?.type === 'MemberExpression' && key === 'property' && !p.computed)
      && !(p?.type === 'Property' && key === 'key') && !/^(ImportSpecifier|TSPropertySignature|VariableDeclarator)$/.test(p?.type)) f.browser.add(n.name);
    if (n.type === 'ClassDeclaration' && n.superClass && /Component$/.test(src.slice(n.superClass.start, n.superClass.end))) f.hooks.add('class component');
    if (n.type === 'TSAnyKeyword') emit({ rule: 'ts-any', sev: 'medium', file, line: line(), match: src.split('\n')[line() - 1].trim().slice(0, 100) });
    if (n.type === 'ArrayExpression' && /\.[jt]sx$/.test(file) && !DATA_DIR.test(file) && !flaggedArrays.some(([s, e]) => n.start >= s && n.end <= e)) {
      const objs = n.elements.filter(e => e?.type === 'ObjectExpression' && e.properties.filter(q => q.value?.type === 'Literal' || q.value?.type === 'TemplateLiteral').length >= 2);
      if (objs.length >= 3) { flaggedArrays.push([n.start, n.end]); emit({ rule: 'inline-data', sev: 'medium', file, line: line(), match: `array of ${objs.length} object literals`, note: 'move to lib/data, constants or a CMS' }); }
    }
    if (n.type === 'Literal' && typeof n.value === 'string' && /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)\b/.test(n.value))
      emit({ rule: 'localhost-url', sev: 'high', file, line: line(), match: n.value.slice(0, 80), note: 'fails in production: use a relative path or an environment variable' });
    const text = n.type === 'JSXText' ? n.value : n.type === 'Literal' && typeof n.value === 'string' ? n.value : null;
    if (text && /\.[jt]sx$/.test(file)) {
      const m = text.match(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d\d)/i);
      if (m) emit({ rule: 'hardcoded-year', sev: 'low', file, line: line(), match: m[0], note: 'use new Date().getFullYear() or a config value' });
      if (n.type === 'JSXText') for (const c of text.matchAll(/[\w.+-]+@[\w-]+\.[\w.]{2,}|(?:\+34[\s.]?)?[6789]\d{2}[\s.]?\d{2,3}[\s.]?\d{2,3}[\s.]?\d{0,3}\b/g))
        if (c[0].includes('@') || c[0].replace(/\D/g, '').length >= 9) emit({ rule: 'hardcoded-contact-data', sev: 'low', file, line: line(), match: c[0].trim(), note: 'centralize in lib/site.ts (repeated in footer, contact page, JSON-LD)' });
    }
  });
  for (const c of r.comments) {
    const t = c.value.replace(/^\*+/, '').trim(), line = lineOf(c.start);
    const todo = t.match(/\b(TODO|FIXME|HACK|XXX)\b/);
    if (todo) emit({ rule: 'todo', sev: todo[1] === 'TODO' ? 'low' : 'medium', file, line, match: t.slice(0, 100) });
    if (/@ts-nocheck/.test(t)) emit({ rule: 'ts-nocheck', sev: 'high', file, line, match: t.slice(0, 80) });
    if (/@ts-ignore/.test(t)) emit({ rule: 'ts-ignore', sev: 'medium', file, line, match: t.slice(0, 80) });
    if (/@ts-expect-error\s*$/.test(t)) emit({ rule: 'ts-expect-error-no-reason', sev: 'low', file, line, match: t });
    if (/^eslint-disable(?!-next-line|-line)\s*$/.test(t)) emit({ rule: 'eslint-disable-global', sev: 'medium', file, line, match: t });
  }
  // Commented-out code: groups consecutive line comments and tries to parse them
  const groups = []; for (const c of r.comments) {
    const l = lineOf(c.start), g = groups.at(-1);
    if (c.type === 'Line' && g && g.type === 'Line' && g.last === l - 1) { g.text += '\n' + c.value; g.last = l; }
    else groups.push({ type: c.type, text: c.value.replace(/^\s*\*.*$/gm, m => c.type === 'Block' && /^\s*\*\s*@/.test(m) ? '' : m), first: l, last: l, jsdoc: c.type === 'Block' && c.value.startsWith('*') });
  }
  for (const g of groups) if (!g.jsdoc && looksLikeCode(g.text)) emit({ rule: 'commented-out-code', sev: 'low', file, line: g.first, match: g.text.trim().split('\n')[0].slice(0, 80), note: `${g.last - g.first + 1} lines` });
  const base = basename(file).replace(/\.[^.]+$/, '');
  if (/(copy|copia|old|new|backup|bak|final|temp|tmp|test|v\d+|\d+)$/i.test(base) && !/^\[|^(page|layout|route|v\d+)$/.test(base) && !/\.(test|spec)\./.test(file))
    emit({ rule: 'suspicious-name', sev: 'medium', file, line: 1, match: basename(file), note: 'possible duplicate or abandoned version' });
  if (/\.[jt]sx$/.test(file) && (f.lines > 300 || f.jsx > 120)) emit({ rule: 'large-component', sev: 'medium', file, line: 1, match: `${f.lines} lines, ${f.jsx} JSX elements`, note: 'split by responsibility' });
}
// Client graph: everything imported (transitively) from a "use client" file ends up in the browser bundle
const clientGraph = new Set(), queue = Object.keys(info).filter(k => info[k].client);
while (queue.length) { const k = queue.pop(); if (clientGraph.has(k)) continue; clientGraph.add(k); queue.push(...(info[k]?.imports || [])); }
for (const [file, f] of Object.entries(info)) {
  if (f.client) {
    const signals = [...f.hooks, ...f.events, ...f.browser];
    const route = ROUTE_FILE.test(file);
    const onlyNav = f.nav && f.events.size && [...f.hooks].every(h => h === 'useRouter') && [...f.browser].every(b => /^(window|location)$/.test(b));
    if (onlyNav) emit({ rule: 'use-client-for-navigation', sev: 'medium', file, line: 1, match: [...f.events, ...f.hooks].join(', '),
      note: 'the client boundary only exists to navigate (location.href / router.push): with <Link> or <a> it can be a Server Component' });
    else if (!signals.length) emit({ rule: 'use-client-unnecessary', sev: route ? 'high' : f.other.length ? 'low' : 'medium', file, line: 1, match: '"use client"',
      note: f.other.length ? `no hooks/events/browser APIs; check whether it wraps a client library: ${f.other.slice(0, 3).join(', ')}` : 'no hooks, events or browser APIs: it can be a Server Component', importedBy: importers[file] || [] });
    else if (route) emit({ rule: 'use-client-in-route', sev: 'medium', file, line: 1, match: signals.slice(0, 4).join(', '), note: 'the whole route goes to the client and cannot export metadata: push the boundary down to a leaf component' });
  }
  for (const h of f.heavy || []) emit({ rule: 'heavy-import', sev: clientGraph.has(file) ? 'high' : 'medium', file, line: h.line, match: h.spec, inClient: clientGraph.has(file), note: `alternative: ${HEAVY[h.pkg]}${h.star ? ' (import * prevents tree-shaking)' : ''}` });
}
const comps = Object.keys(info).filter(k => /\.[jt]sx$/.test(k));
// Conventions: file naming style and export type in components (not Next route files, which have fixed names)
const style = b => /^[A-Z][A-Za-z0-9]*$/.test(b) ? 'PascalCase' : /^[a-z0-9]+(-[a-z0-9]+)+$/.test(b) ? 'kebab-case' : /^[a-z][a-z0-9]*[A-Z]/.test(b) ? 'camelCase' : /^[a-z0-9]+$/.test(b) ? 'lowercase' : 'other';
const own = comps.filter(k => !ROUTE_FILE.test(k) && !/(^|\/)(route|proxy|middleware|instrumentation[-\w]*|opengraph-image|twitter-image|icon|apple-icon|sitemap|robots|manifest)\.[jt]sx?$/.test(k));
const byStyle = {}; for (const k of own) { const s = style(basename(k).replace(/\.[^.]+$/, '').replace(/\.(test|spec|stories)$/, '')); if (s !== 'lowercase') (byStyle[s] ??= []).push(k); }
const styles = Object.entries(byStyle).sort((a, b) => b[1].length - a[1].length);
if (styles.length > 1) emit({ rule: 'mixed-naming-convention', sev: 'low', file: styles[1][1][0], line: 1, match: styles.map(([s, l]) => `${s}: ${l.length}`).join(' · '),
  note: `majority ${styles[0][0]}; outside the convention: ${styles.slice(1).flatMap(([, l]) => l).slice(0, 6).join(', ')}` });
const defs = own.filter(k => info[k].defaultExport).length;
if (defs && defs < own.length && own.length >= 4) emit({ rule: 'mixed-exports', sev: 'low', file: own.find(k => !info[k].defaultExport), line: 1,
  match: `${defs} with export default, ${own.length - defs} with named exports only`, note: 'pick one style for components (Next only requires default in page/layout)' });
console.error(JSON.stringify({ files: files.length, byRule: counts, tsxComponents: comps.length,
  withUseClient: Object.values(info).filter(f => f.client).length, inClientGraph: comps.filter(k => clientGraph.has(k)).length }, null, 1));
```

| Rule | What it detects and why it matters | Severity |
|---|---|---|
| `use-client-unnecessary` | `"use client"` without hooks, events or browser APIs: everything it imports goes into the bundle and hydrates for no reason. On a route (`page.tsx`) it is High | Medium |
| `use-client-for-navigation` | The only reason for the client boundary is navigating (`location.href =`, `router.push`) in an `onClick`: with `<Link>` it is a Server Component | Medium |
| `use-client-in-route` | Whole `page`/`layout` on the client: it cannot export `metadata`; push the boundary down to a leaf component | Medium |
| `heavy-import` | `moment`, full `lodash`, `import *` from `react-icons`, `chart.js`… High if the file is in the client graph (`inClient`) | Medium/High |
| `debugger`, `ts-nocheck` | Leftovers that must not reach production / file without type checking | High |
| `console` | `console.log`/`debug` (`warn`/`error` are Low). In Server Actions it can dump personal data into the logs | Medium |
| `ts-any`, `ts-ignore`, `eslint-disable-global` | Types and rules disabled | Medium |
| `inline-data` | Arrays of 3+ object literals inside components (services, testimonials, menu): they belong in `lib/data` or the CMS | Medium |
| `localhost-url` | `http://localhost…` in the code: fails in production | High |
| `hardcoded-api-url`, `hardcoded-contact-data`, `hardcoded-year` | API URL, phone or email repeated in JSX, `© 2023`: centralize in `lib/site.ts` or environment variables | Low |
| `commented-out-code`, `todo` | Comment blocks that parse as code; TODO/FIXME (FIXME and HACK are Medium) | Low |
| `suspicious-name`, `large-component` | Iteration copies; components that mix responsibilities | Medium |
| `mixed-naming-convention`, `mixed-exports` | Different naming or export styles across components | Low |

## Step 9. Configuration and summary (config.mjs)

Reads `tsconfig.json` (follows relative `extends`), `next.config.*`, `package.json` and the linter configuration, and summarizes the outputs of steps 5–7:

```bash
node /tmp/qa-code-optimization/config.mjs --eslint /tmp/qa-code-optimization/eslint.json \
  --tsc /tmp/qa-code-optimization/tsc.txt --build /tmp/qa-code-optimization/build.log > /tmp/qa-code-optimization/config.jsonl
```

`config.mjs`:

```js
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
```

## Step 10. Heavy imports: from warning to measurement

`scan.mjs` says **which** heavy package is imported and whether it reaches the client; knip, whether it is unused. The real weight per route is measured by `qa-performance-cwv` with the Turbopack analyzer (`npx next analyze --output`; in 16.1 it was called `next experimental-analyze`; JSONL export with `next analyze export` since 16.4). If that skill isn't going to be run, opening `npx next analyze` (browser UI) and looking for the flagged package is enough. Usual alternatives: `Intl.DateTimeFormat` instead of `moment`, native methods instead of `lodash`, `fetch` instead of `axios`, `next/dynamic` for maps, charts and carousels that aren't on the first screen.

## Severity

| Level | Examples in this phase |
|---|---|
| **Critical** | `next build` fails; build that only passes with `ignoreBuildErrors`; `@ts-nocheck` in code that processes forms or payments |
| **High** | Warnings in `next build`; `strict: false`; ESLint or `tsc` errors; `next lint` in scripts with Next 16 (the script fails); no linter; `unlisted`/`unresolved` dependencies; unnecessary `"use client"` on a route; heavy import in the client graph; `debugger`; URL pointing to `localhost` |
| **Medium** | Unused files and dependencies; near-duplicate components or > 5 % duplication; `any`, `@ts-ignore`; unnecessary `"use client"` on components; `console.log`; inline data; large components; legacy `.eslintrc` |
| **Low** | Unused exports; TODO; commented-out code; hand-written year, phone or API URL; mixed conventions; extra TypeScript strictness options; no Prettier/Biome |

## Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

Save `qa-code-optimization.md` and attach `knip.json`, `jscpd-report.json`, `scan.jsonl`, `config.jsonl` and `build.log`. Write the report in the user's language.

```markdown
# Code optimization and tidiness — <project> — <date> — commit <hash>
Next 16.x · React 19.x · TypeScript 5.x (strict: yes/no) · ESLint 9/10 flat · Turbopack

## Summary
Critical: N · High: N · Medium: N · Low: N
Build: OK/fails, N warnings · tsc: N errors · ESLint: N errors, N warnings
Unused: N files, N dependencies, N exports · Duplication: N.N % (N component pairs)
"use client": N files, N unnecessary · any: N · ts-ignore: N · console: N

## Findings
### OPT-001 · Medium · Header.tsx and HeaderCopy.tsx are the same component
- Evidence: jscpd `renamed` components/Header.tsx:1-6 ≈ components/HeaderCopy.tsx:1-6; knip: HeaderCopy.tsx unused
- Why it matters: any header change has to be made twice and they end up diverging
- Fix: delete HeaderCopy.tsx; if the version without the menu was needed, use a prop:
  export default function Header({ withMenu = true }: { withMenu?: boolean }) { … }

## Refactor plan
| Phase | What | Risk | Effort | Verification |
|---|---|---|---|---|
| 1. Safe cleanup | Delete unused files and dependencies, console.log, debugger, commented-out code | Low | 1 h | build + lint + smoke |
| 2. Build and types | Build warnings, `strict`, `any` on external data, `@ts-ignore` | Medium | … | tsc 0 errors |
| 3. Client boundary | Remove unnecessary `"use client"`, `<Link>` instead of `router.push`, heavy imports | Medium | … | next analyze before/after |
| 4. Unify | Near-duplicate components → variants; data to `lib/data` | Medium | … | visual review (qa-figma-fidelity) |
| 5. Prevention | ESLint in CI with `--max-warnings 0`, knip and jscpd `--threshold` in CI | Low | … | green CI |
```

Group repeated items ("`console.log` in 6 files") and leave the detail in the attachments. Optionally, `qa-code-optimization.json` with `{ summary, findings: [{ id, sev, rule, file, line, evidence, fix }] }`.

## False positives and limitations

- `use-client-unnecessary`: a `"use client"` file that only re-exports a client library (carousel, map) to use it from a Server Component is correct; the script flags it as Low and names the library. Components that receive functions as props (`onClick` from a client parent) must be client components too.
- `use-client-for-navigation` and `use-client-unnecessary` don't see hooks that arrive through another module under a name that doesn't start with `use`.
- The client graph follows relative imports and `tsconfig` aliases; it doesn't resolve `next/dynamic` with computed paths or bundler aliases.
- `commented-out-code` can flag comments that look like code (`// see(below)`); review them.
- knip doesn't know about loading by dynamic name (`import(\`./${x}\`)`) or files only used by the CMS: confirm with the build before proposing deletions.
- jscpd compares text and structure, not behaviour: two different components with the same layout can come out as duplicates. Decide with the design.

## If the user asks for fixes

1. New branch. Phase 1 of the plan: `npm uninstall <unused deps>`, delete the files that knip and the build confirm, remove `console.log` and `debugger`.
2. After **each** phase: `npx eslint .`, `npx next typegen && npx tsc --noEmit`, `npx next build` and, if they exist, the tests (`qa-maintainability`).
3. Before removing a `"use client"`, check that nothing in the file or in what it imports uses state, effects, events or `window`; the build will fail if you get it wrong, but the message is clear.
4. Duplicate components: unify into one with variants, replace the imports and visually check the affected screens.
5. `next lint` → `npx @next/codemod@latest next-lint-to-eslint-cli .`; `.eslintrc` → the flat config from step 6.
6. Run steps 3–9 again and compare counts with the initial report.

To keep it from happening again, propose adding to CI: `eslint --max-warnings 0`, `tsc --noEmit`, `knip` (fails if there are findings) and `jscpd --threshold 5`.

## Sources

- Next.js 16, upgrade guide (removal of `next lint`, build without linter, `.next/dev`): `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` · https://nextjs.org/blog/next-15-5
- `next typegen`, `next analyze`: `node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md` · TypeScript 7 and `useTypeScriptCli`: `…/05-config/01-next-config-js/useTypeScriptCli.md`
- ESLint with Next: `…/03-api-reference/05-config/03-eslint.md` · ESLint 10: https://eslint.org/blog/2026/02/eslint-v10.0.0-released/
- knip, Next plugin: https://knip.dev/reference/plugins/next · jscpd 5: https://unpkg.com/jscpd@5.4.1/README.md
- Server and Client Components: `…/02-guides/server-and-client-boundary.md` · Bundle: `…/02-guides/package-bundling.md`
