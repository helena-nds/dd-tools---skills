// bundle-graph.mjs: summarises the Turbopack analyzer graph (Next >= 16.4) per route: client JS per package and the project's own modules.
// Usage: npx next analyze --output --snapshot qa && npx next analyze export --snapshot qa > graph.jsonl
//        node bundle-graph.mjs graph.jsonl [top=8] > bundle.json
import { readFileSync } from 'node:fs';
const [file, topArg = '8'] = process.argv.slice(2), TOP = Number(topArg);
const kb = n => Math.round(n / 102.4) / 10;
const routes = {};
const R = r => (routes[r] ??= { initial: new Set(), parts: [] });
for (const line of readFileSync(file, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let o; try { o = JSON.parse(line); } catch { continue; }
  if (o.type === 'group') for (const out of o.outputs || []) R(o.route).initial.add(out);   // groups loaded when the route renders
  else if (o.type === 'part' && o.filename?.startsWith('[client-fs]')) R(o.route).parts.push(o);
}
const pkgOf = p => { const m = p.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/); return m ? m[1] : p.startsWith('[project]/') ? '(project)' : '(other)'; };
const HEAVY = /^(moment|lodash|chart\.js|three|@mui\/|xlsx|pdfjs-dist|highlight\.js|prismjs|swiper|gsap|framer-motion|motion|@fortawesome|date-fns|recharts|d3|mapbox-gl|leaflet)/;
const out = [];
for (const [route, { initial, parts }] of Object.entries(routes)) {
  if (!parts.length) continue;
  const seen = new Set(), byPkg = {}, own = {}; let ini = 0, asyncB = 0, css = 0, media = 0;
  for (const p of parts) {
    const k = p.filename + '|' + p.source_path; if (seen.has(k)) continue; seen.add(k);
    const c = p.compressed_size ?? p.size ?? 0, isInitial = initial.has(p.filename);
    if (p.filename.endsWith('.css')) { css += c; continue; }
    if (!p.filename.endsWith('.js')) { media += c; continue; }                 // fonts, icons…
    if (/polyfill-nomodule/.test(p.source_path)) continue;                    // only for browsers without ES modules
    if (!isInitial) { asyncB += c; continue; }                                // dynamic()/import() and deferred chunks
    ini += c; const pkg = pkgOf(p.source_path); byPkg[pkg] = (byPkg[pkg] || 0) + c;
    if (pkg === '(project)') own[p.source_path.replace('[project]/', '')] = (own[p.source_path.replace('[project]/', '')] || 0) + c;
  }
  const packages = Object.entries(byPkg).sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([pkg, b]) => ({ pkg, compressedKB: kb(b), heavy: HEAVY.test(pkg) || undefined }));
  out.push({ route, initialJsCompressedKB: kb(ini), asyncJsKB: kb(asyncB), cssKB: kb(css), fontsAndMediaKB: kb(media), packages,
    ownModulesInClient: Object.entries(own).sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([m, b]) => ({ module: m, kb: kb(b) })) });
}
out.sort((a, b) => b.initialJsCompressedKB - a.initialJsCompressedKB);
console.log(JSON.stringify({ note: 'compressed_size from the analyzer, summed per module: somewhat overestimates the real gzip of the chunk; use it to compare. "next" includes react-dom (it is compiled inside next).', routes: out }, null, 1));
