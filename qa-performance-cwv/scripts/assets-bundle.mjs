// assets-bundle.mjs: inventory of /public weights and first-load JS per route from .next (after next build).
// Usage: node assets-bundle.mjs <project-root> > assets.json
import { readFileSync, readdirSync, statSync, existsSync, openSync, readSync, closeSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';

const ROOT = process.argv[2] || '.';
const kb = n => Math.round(n / 102.4) / 10;
const walk = (d, out = []) => { if (!existsSync(d)) return out; for (const n of readdirSync(d)) { const p = join(d, n);
  try { statSync(p).isDirectory() ? walk(p, out) : out.push(p); } catch {} } return out; };

// 1. /public: size, real type (magic bytes), usage in the code and thresholds
const K = 1024, LIMITS = { image: 200 * K, svg: 50 * K, video: 5 * K * K, font: 100 * K, other: 500 * K }; // indicative, KiB
const kind = e => /\.(jpe?g|png|webp|avif|gif)$/i.test(e) ? 'image' : e === '.svg' ? 'svg' : /\.(mp4|webm|mov|ogv)$/i.test(e) ? 'video' : /\.(woff2?|ttf|otf)$/i.test(e) ? 'font' : 'other';
const magic = p => { const b = Buffer.alloc(16); const fd = openSync(p, 'r'); readSync(fd, b, 0, 16, 0); closeSync(fd);
  const h = b.toString('hex'), a = b.toString('latin1');
  return h.startsWith('ffd8ff') ? 'jpeg' : h.startsWith('89504e47') ? 'png' : a.slice(8, 12) === 'WEBP' ? 'webp' : /ftyp(avif|avis)/.test(a) ? 'avif'
    : a.startsWith('GIF8') ? 'gif' : /ftyp/.test(a) ? 'mp4' : h.startsWith('1a45dfa3') ? 'webm' : a.startsWith('wOF2') ? 'woff2' : a.startsWith('wOFF') ? 'woff' : /^\s*(<\?xml|<svg)/.test(a) ? 'svg' : 'unknown'; };
const srcText = walk(ROOT).filter(p => !/node_modules|\.next|\/public\//.test(p) && /\.(tsx?|jsx?|mdx?|css|json)$/.test(p))
  .map(p => { try { return readFileSync(p, 'utf8'); } catch { return ''; } }).join('\n');
const pub = walk(join(ROOT, 'public')).map(p => { const size = statSync(p).size, e = extname(p).toLowerCase(), k = kind(e), real = magic(p);
  const issues = [];
  if (size > LIMITS[k]) issues.push(`weighs ${kb(size)} KB (> ${kb(LIMITS[k])} KB indicative for ${k})`);
  if (k === 'image' && !['jpeg', 'png', 'webp', 'avif', 'gif'].includes(real)) issues.push(`not a valid image (header: ${real})`);
  if (k === 'image' && /png|jpeg/.test(real) && size > 100 * K) issues.push('legacy format: serve via next/image (WebP/AVIF) or convert');
  if (k === 'svg' && size > 10e3 && /<image|base64/.test(readFileSync(p, 'utf8'))) issues.push('SVG with embedded bitmap');
  const used = srcText.includes(basename(p));
  if (!used) issues.push('not referenced in the code (leftover?)');
  return { file: relative(ROOT, p), kb: kb(size), kind: k, header: real, used, issues, sev: !issues.length ? null : size > K * K || /valid image/.test(issues.join()) ? 'high' : size > LIMITS[k] || /legacy|bitmap/.test(issues.join()) ? 'medium' : 'low' };
}).sort((a, b) => b.kb - a.kb);

// 2. First-load JS per route (Next 16: .next/diagnostics/route-bundle-stats.json, undocumented; otherwise build-manifest)
const NEXT = join(ROOT, '.next');
const comp = {};
const sizeOf = rel => { const p = join(ROOT, rel.startsWith('.next') ? rel : join('.next', rel));
  if (!comp[p]) { try { const b = readFileSync(p); comp[p] = { raw: b.length, gzip: gzipSync(b, { level: 9 }).length, br: brotliCompressSync(b).length }; } catch { comp[p] = { raw: 0, gzip: 0, br: 0 }; } } return comp[p]; };
let routes = [], source = null;
const rbs = join(NEXT, 'diagnostics/route-bundle-stats.json');
if (existsSync(rbs)) { source = rbs; routes = JSON.parse(readFileSync(rbs, 'utf8')).map(r => ({ route: r.route, chunks: r.firstLoadChunkPaths })); }
else if (existsSync(join(NEXT, 'app-build-manifest.json'))) { source = 'app-build-manifest.json';
  routes = Object.entries(JSON.parse(readFileSync(join(NEXT, 'app-build-manifest.json'), 'utf8')).pages).map(([route, ch]) => ({ route, chunks: ch.filter(c => c.endsWith('.js')) })); }
const BUDGET_GZ = Number(process.env.JS_BUDGET_KB || 200);
const byRoute = routes.map(r => { const t = r.chunks.reduce((a, c) => { const s = sizeOf(c); return { raw: a.raw + s.raw, gzip: a.gzip + s.gzip, br: a.br + s.br }; }, { raw: 0, gzip: 0, br: 0 });
  return { route: r.route, chunks: r.chunks.length, jsKB: kb(t.raw), jsGzipKB: kb(t.gzip), jsBrotliKB: kb(t.br), overBudget: kb(t.gzip) > BUDGET_GZ }; }).sort((a, b) => b.jsGzipKB - a.jsGzipKB);
const chunks = walk(join(NEXT, 'static')).filter(p => /\.(js|css)$/.test(p)).map(p => ({ file: relative(ROOT, p), kb: kb(statSync(p).size), gzipKB: kb(gzipSync(readFileSync(p)).length) })).sort((a, b) => b.kb - a.kb);
const media = walk(join(NEXT, 'static/media')).map(p => ({ file: basename(p), kb: kb(statSync(p).size) })).sort((a, b) => b.kb - a.kb);
console.log(JSON.stringify({ public: { totalKB: kb(pub.reduce((a, x) => a + x.kb * 1024, 0)), withIssues: pub.filter(x => x.issues.length), noIssues: pub.filter(x => !x.issues.length).length },
  firstLoadJS: { source, budgetGzipKB: BUDGET_GZ, byRoute }, largestChunks: chunks.slice(0, 10), nextMedia: media.slice(0, 10),
  warning: source ? null : 'No build found: run next build first' }, null, 1));
