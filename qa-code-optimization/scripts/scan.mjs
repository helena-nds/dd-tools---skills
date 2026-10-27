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
