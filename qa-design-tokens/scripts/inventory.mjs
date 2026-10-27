// inventory.mjs: builds the token inventory (name → resolved value) from CSS (@theme/:root) and/or JSON (DTCG or Tokens Studio).
// Usage: node inventory.mjs app/globals.css tokens/design.tokens.json ... > resolved-tokens.json
import postcss from 'postcss';
import { formatHex8, parse } from 'culori';
import { readFileSync } from 'node:fs';

const out = {}, raw = {};
for (const f of process.argv.slice(2)) {
  const src = readFileSync(f, 'utf8');
  if (/\.json$/.test(f)) walkJson(JSON.parse(src), []);
  else postcss.parse(src, { from: f }).walkDecls(/^--/, d => {
    const scope = d.parent?.type === 'atrule' ? `@${d.parent.name} ${d.parent.params}`.trim() : d.parent?.selector || '';
    // Wrapping at-rules that create a mode (@media dark, @supports…). @theme and @layer don't count.
    const wrappers = []; for (let p = d.parent?.parent; p && p.type !== 'root'; p = p.parent)
      if (p.type === 'atrule' && !/^(theme|layer)$/.test(p.name)) wrappers.unshift(`@${p.name} ${p.params}`.trim());
    // Default mode only (@theme, :root). Modes (.dark, [data-theme], @media…) are listed separately.
    const key = /^(@theme|:root|html)/.test(scope) && !wrappers.length ? d.prop : `${d.prop} [${[...wrappers, scope].join(' ')}]`;
    raw[key] = d.value.trim();
  });
}
function walkJson(node, path) {
  if (node && typeof node === 'object' && '$value' in node || node && typeof node === 'object' && 'value' in node && !Array.isArray(node) && typeof node.value !== 'object') {
    let v = node.$value ?? node.value;
    if (v && typeof v === 'object' && v.colorSpace) v = v.hex || `color(${v.colorSpace} ${v.components.join(' ')} / ${v.alpha ?? 1})`;
    if (v && typeof v === 'object' && 'value' in v && 'unit' in v) v = `${v.value}${v.unit}`;
    raw[path.join('.')] = typeof v === 'string' ? v : JSON.stringify(v);
    return;
  }
  if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walkJson(v, [...path, k]);
}
// Resolve aliases: var(--x) and {group.token}
const resolve = (v, depth = 0) => depth > 10 ? v : v
  .replace(/var\((--[\w-]+)(?:,[^)]*)?\)/g, (m, n) => raw[n] !== undefined ? resolve(raw[n], depth + 1) : m)
  .replace(/\{([\w.-]+)\}/g, (m, n) => raw[n] !== undefined ? resolve(raw[n], depth + 1) : m);
for (const [k, v] of Object.entries(raw)) {
  const r = resolve(v); const c = parse(r);
  out[k] = c && !/^\d/.test(r) ? formatHex8(c) : r;
}
console.log(JSON.stringify(out, null, 1));
