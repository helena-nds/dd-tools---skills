// structure.mjs: orphaned files (not reachable from Next routes), iteration names (Old, Copy, v2, final…),
// duplicated or near-duplicated files (shingles + Jaccard) and components with the same name in several files.
// Usage (from the root): rg --files -g '!node_modules' -g '!.next' -g '!out' -g '!public' . | node structure.mjs [jaccardThreshold=0.5] > structure.json
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, normalize, basename } from 'node:path';
import { createHash } from 'node:crypto';

const THR = Number(process.argv[2] || 0.5), CONT = 0.75;   // Jaccard or containment (the small file fits almost entirely in the big one)
const all = readFileSync(0, 'utf8').split('\n').map(s => normalize(s.trim())).filter(f => f && f !== '.');
const code = all.filter(f => /\.(m?[jt]sx?|cjs)$/.test(f) && !/\.d\.ts$/.test(f));
const TEST = /\.(test|spec|stories)\.[jt]sx?$|__tests__\/|(^|\/)(e2e|tests?)\//;
const ENTRY = /(^|\/)(src\/)?app\/.*(page|layout|template|loading|error|global-error|not-found|forbidden|unauthorized|default|route|opengraph-image|twitter-image|icon|apple-icon|sitemap|robots|manifest)\.[jt]sx?$|(^|\/)(src\/)?pages\/|^(src\/)?(proxy|middleware|instrumentation|instrumentation-client|mdx-components)\.[jt]s$|(^|\/)[\w.-]+\.config\.[cm]?[jt]s$/;

// tsconfig/jsconfig aliases ("@/*": ["./*"])
let paths = { '@/*': ['./*'] };
for (const c of ['tsconfig.json', 'jsconfig.json']) if (existsSync(c)) try {
  const j = JSON.parse(readFileSync(c, 'utf8').replace(/\/\*[\s\S]*?\*\/|(?<![:"'])\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1'));
  if (j.compilerOptions?.paths) paths = j.compilerOptions.paths; } catch {}
const EXT = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
const set = new Set(code);
const resolve = (from, spec) => {
  let bases = [];
  if (spec.startsWith('.')) bases = [join(dirname(from), spec)];
  else for (const [a, targets] of Object.entries(paths)) { const pre = a.replace(/\*$/, ''); if (spec.startsWith(pre)) bases.push(...targets.map(t => join(t.replace(/\*$/, ''), spec.slice(pre.length)))); }
  for (const b of bases) for (const e of EXT) { const p = normalize(b + e); if (set.has(p)) return p; }
  return null;
};
const src = Object.fromEntries(code.map(f => { try { return [f, readFileSync(f, 'utf8')]; } catch { return [f, '']; } }));
const imports = f => [...src[f].matchAll(/(?:from\s+|import\s*\(\s*|require\(\s*|import\s+)['"]([^'"]+)['"]/g)].map(m => resolve(f, m[1])).filter(Boolean);

const walk = starts => { const seen = new Set(), stack = [...starts]; while (stack.length) { const f = stack.pop(); if (seen.has(f)) continue; seen.add(f); stack.push(...imports(f)); } return seen; };
const prod = walk(code.filter(f => ENTRY.test(f))), withTests = walk(code.filter(f => ENTRY.test(f) || TEST.test(f)));
const orphans = code.filter(f => !withTests.has(f) && !TEST.test(f) && !/(^|\/)scripts?\//.test(f));
const testsOnly = code.filter(f => withTests.has(f) && !prod.has(f) && !TEST.test(f));

const ITER = /(?:^|[-_.\s])(old|copy|backup|bak|new|final|temp|tmp|orig|draft|unused|deprecated|v\d+|\d)$|(?:Old|Copy|Backup|Bak|New|Final|Temp|Tmp|Orig|Draft|Unused|V\d+|\d)$|\s\(\d+\)$/;
const iterations = all.filter(f => ITER.test(basename(f).replace(/\.[^.]+$/, '').replace(/\.(test|spec|module)$/, '')) && !/^(page|layout|route)$/.test(basename(f).split('.')[0]));

// Duplicates: exact hash and normalized 4-token shingles (no comments; hex, numbers and the component's own name neutralized)
const tok = s => { const n = (s.match(/export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/) || [])[1];
  let t = s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').replace(/#[0-9a-fA-F]{3,8}\b/g, '#H').replace(/\d+(\.\d+)?/g, 'N'); if (n) t = t.split(n).join('COMP');
  return t.split(/[^\w#[\]-]+/).filter(Boolean); };
const sh = f => { const t = tok(src[f]), out = new Set(); for (let i = 0; i + 4 <= t.length; i++) out.add(t.slice(i, i + 4).join(' ')); return out; };
const cands = code.filter(f => /\.[jt]sx?$/.test(f) && !TEST.test(f) && tok(src[f]).length >= 15).slice(0, 600);
const S = Object.fromEntries(cands.map(f => [f, sh(f)])), H = {};
for (const f of cands) (H[createHash('sha1').update(tok(src[f]).join(' ')).digest('hex')] ||= []).push(f);
const duplicates = [];
for (let i = 0; i < cands.length; i++) for (let j = i + 1; j < cands.length; j++) {
  const a = S[cands[i]], b = S[cands[j]]; if (a.size < 10 || b.size < 10) continue;
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  const jac = inter / (a.size + b.size - inter), cont = inter / Math.min(a.size, b.size);
  if (jac >= THR || cont >= CONT) duplicates.push({ a: cands[i], b: cands[j], jaccard: +jac.toFixed(2), containment: +cont.toFixed(2) });
}
const names = {}; for (const f of code) for (const m of src[f].matchAll(/export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Z]\w*)|export\s+const\s+([A-Z]\w*)\s*=\s*\(/g)) (names[m[1] || m[2]] ||= []).push(f);
const sameName = Object.entries(names).filter(([n, l]) => new Set(l).size > 1 && !/^(Page|Layout|RootLayout|Home|Loading|Error|NotFound|Template|Default|GET|POST)$/.test(n)).map(([name, files]) => ({ name, files }));

console.log(JSON.stringify({ codeFiles: code.length, orphans, usedOnlyByTests: testsOnly, iterationNames: iterations,
  exactDuplicates: Object.values(H).filter(l => l.length > 1), nearDuplicates: duplicates.sort((x, y) => y.containment - x.containment), sameComponentName: sameName }, null, 1));
