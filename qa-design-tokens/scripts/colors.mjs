// colors.mjs: groups near-duplicate colors (ΔE2000) and suggests the nearest token.
// Usage: node colors.mjs findings.jsonl resolved-tokens.json [threshold=2.3]
//   resolved-tokens.json = { "color.text.primary": "#1a1a1a", ... } (values already resolved, one mode)
import { parse, differenceCiede2000, formatHex8, nearest } from 'culori';
import { readFileSync, existsSync } from 'node:fs';

const [findingsPath, tokensPath, thr = '2.3'] = process.argv.slice(2);
const T = Number(thr), de = differenceCiede2000();
const tokens = tokensPath && existsSync(tokensPath) ? JSON.parse(readFileSync(tokensPath, 'utf8')) : {};
const tokenNames = Object.keys(tokens).filter(k => parse(tokens[k]));
const closest = tokenNames.length ? nearest(tokenNames, de, n => tokens[n]) : null;

const occ = new Map();
for (const l of readFileSync(findingsPath, 'utf8').split('\n').filter(Boolean)) {
  const f = JSON.parse(l);
  if (!['hex-color', 'color-function', 'css-raw-value', 'tw-arbitrary-value', 'shadow-token', 'svg-hardcoded-color'].includes(f.rule)) continue;
  const raw = (f.match.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([^)]*\)/) || [])[0];
  const c = raw && parse(raw);
  if (!c) continue;
  const k = formatHex8(c);
  if (!occ.has(k)) occ.set(k, []);
  occ.get(k).push(`${f.file}:${f.line}`);
}

const keys = [...occ.keys()].sort((a, b) => occ.get(b).length - occ.get(a).length);
const seen = new Set(), clusters = [];
for (const a of keys) {
  if (seen.has(a)) continue;
  const g = [a]; seen.add(a);
  for (const b of keys) if (!seen.has(b) && de(a, b) < T) { g.push(b); seen.add(b); }
  if (g.length > 1) clusters.push(g.map(k => ({ color: k, uses: occ.get(k).length, dE_vs_first: +de(a, k).toFixed(2) })));
}
const suggestions = keys.map(k => {
  if (!closest) return { color: k, uses: occ.get(k).length, where: occ.get(k).slice(0, 5) };
  const [name] = closest(k, 1);
  const d = +de(k, tokens[name]).toFixed(2);
  return { color: k, uses: occ.get(k).length, nearestToken: name, dE: d,
    verdict: d < 1 ? 'replace with token' : d < 2.3 ? 'likely drift: review' : 'no token: decide whether to create one',
    where: occ.get(k).slice(0, 5) };
});
console.log(JSON.stringify({ uniqueColors: keys.length, nearDuplicateClusters: clusters, suggestions }, null, 1));
