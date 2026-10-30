// scan-code.mjs: code patterns that worsen LCP/CLS/INP or the bundle in Next.js (App Router).
// Usage: node scan-code.mjs <project-root> > code.jsonl   (summary on stderr)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.argv[2] || '.';
const SKIP = /^(node_modules|\.next|\.git|out|dist|build|coverage|\.turbo|\.vercel)$/;
const CC = ['next.config.ts', 'next.config.mjs', 'next.config.js'].some(n => { try { return /cacheComponents\s*:\s*true/.test(readFileSync(join(ROOT, n), 'utf8')); } catch { return false; } });
const files = [];
(function walk(d) { for (const n of readdirSync(d)) { if (SKIP.test(n)) continue; const p = join(d, n);
  try { const s = statSync(p); if (s.isDirectory()) walk(p); else if (/\.(tsx|jsx|ts|js|mjs|css)$/.test(n) && !/\.(test|spec|stories|d)\./.test(n)) files.push(p); } catch {} } })(ROOT);

const HEAVY = /^(moment|lodash|chart\.js|three|@mui\/icons-material|xlsx|pdfjs-dist|highlight\.js|prismjs|swiper|gsap|@fortawesome\/fontawesome-free)$/;
const THIRD = /googletagmanager|google-analytics|gtag|facebook\.net|connect\.facebook|hotjar|clarity\.ms|hs-scripts|hubspot|intercom|tiktok|linkedin|doubleclick|cookiebot|onetrust/;
const counts = {};
const emit = (rule, sev, file, line, match, fix) => { counts[rule] = (counts[rule] || 0) + 1;
  process.stdout.write(JSON.stringify({ rule, sev, file: relative(ROOT, file), line, match: String(match).replace(/\s+/g, ' ').slice(0, 140), fix }) + '\n'); };
const lineOf = (src, i) => src.slice(0, i).split('\n').length;
// Extracts complete (multi-line) JSX tags of one kind: <Image ... />, <img ...>, etc.
const tags = (src, name) => [...src.matchAll(new RegExp(`<${name}\\b([^>]|=>|\\{[^}]*\\})*?\\/?>`, 'g'))];

for (const f of files) {
  let src; try { src = readFileSync(f, 'utf8'); } catch { continue; }
  const code = src.replace(/\{\/\*[\s\S]*?\*\/\}|\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')); // without comments, same lines
  if (/\.css$/.test(f)) {
    for (const m of code.matchAll(/@import\s+url\(["']?https?:\/\/fonts\.(googleapis|gstatic)[^)]*\)/g)) emit('google-fonts-css', 'high', f, lineOf(code, m.index), m[0], 'next/font/google or next/font/local');
    for (const m of code.matchAll(/@font-face\s*\{[^}]*\}/g)) if (!/font-display/.test(m[0])) emit('font-face-no-display', 'low', f, lineOf(code, m.index), m[0], 'font-display: swap (or next/font)');
    continue;
  }
  if (/next\.config\./.test(f)) {
    if (/unoptimized\s*:\s*true/.test(code)) emit('images-unoptimized-global', 'high', f, lineOf(code, code.search(/unoptimized\s*:\s*true/)), 'images.unoptimized: true', 'remove it unless it is a static export with its own loader');
    if (!/image\/avif/.test(code)) emit('images-no-avif', 'low', f, 1, 'images.formats defaults to [image/webp]', "images: { formats: ['image/avif', 'image/webp'] } (more CPU to encode)");
    continue;
  }
  const isJsx = /\.(tsx|jsx)$/.test(f);
  const useClient = /^\s*(['"])use client\1/.test(code);
  if (isJsx) {
    for (const m of tags(code, 'img')) emit('img-not-next-image', /\.svg/.test(m[0]) ? 'medium' : 'high', f, lineOf(code, m.index), m[0], 'next/image with width/height or fill + sizes' + (/\bwidth=/.test(m[0]) && /\bheight=/.test(m[0]) ? '' : ' (currently without width/height: CLS risk)'));
    let preloads = 0;
    for (const m of tags(code, 'Image')) {
      const t = m[0], l = lineOf(code, m.index);
      if (/\bfill\b/.test(t) && !/\bsizes=/.test(t)) emit('image-fill-no-sizes', 'high', f, l, t, 'add a real sizes, e.g. sizes="(max-width: 768px) 100vw, 50vw"');
      else if (!/\bsizes=/.test(t) && /w-full|w-screen|100vw|width:\s*['"]?100%/.test(t)) emit('image-responsive-no-sizes', 'medium', f, l, t, 'add sizes matching the layout');
      if (/\bpriority\b/.test(t)) emit('image-priority-deprecated', 'low', f, l, t, 'Next 16: preload, or better loading="eager"/fetchPriority="high" on the LCP image');
      if (/\b(priority|preload)\b(?!=\{false\})/.test(t)) preloads++;
      if (/\bunoptimized\b(?!=\{false\})/.test(t) && !/\.svg/.test(t)) emit('image-unoptimized', 'medium', f, l, t, 'remove unoptimized except for SVG/GIF');
    }
    if (preloads > 1) emit('image-preload-multiple', 'medium', f, 1, `${preloads} images with priority/preload`, 'only the LCP image');
    for (const m of tags(code, 'link')) if (/fonts\.(googleapis|gstatic)/.test(m[0])) emit('google-fonts-link', 'high', f, lineOf(code, m.index), m[0], 'next/font: self-hosted, no external request or blocking CSS');
    for (const m of tags(code, 'script')) if (/\bsrc=/.test(m[0])) emit('script-not-next-script', 'medium', f, lineOf(code, m.index), m[0], 'next/script with a suitable strategy');
    for (const m of tags(code, 'Script')) {
      const t = m[0], l = lineOf(code, m.index), strat = (t.match(/strategy=["'](\w+)/) || [, 'afterInteractive'])[1];
      if (strat === 'beforeInteractive') emit('script-before-interactive', 'medium', f, l, t, 'only for critical scripts (consent manager, polyfills)');
      else if (THIRD.test(t) && strat === 'afterInteractive') emit('script-third-party-early', 'medium', f, l, t, 'lazyOnload or @next/third-parties; consent: see qa-analytics / qa-legal');
    }
    for (const m of tags(code, 'iframe')) {
      const t = m[0], l = lineOf(code, m.index);
      if (/youtube\.com|youtu\.be|vimeo\.com/.test(t)) emit('iframe-video-no-facade', 'medium', f, l, t, 'YouTubeEmbed from @next/third-parties or a facade (thumbnail + click)');
      else if (!/loading=["']lazy/.test(t)) emit('iframe-no-lazy', 'low', f, l, t, 'loading="lazy" if it is below the fold');
    }
    for (const m of tags(code, 'video')) {
      const t = m[0], l = lineOf(code, m.index);
      if (/\bautoPlay\b/.test(t)) emit('video-autoplay', 'medium', f, l, t, 'avoid autoplay on mobile or use a short, muted, playsInline video with a poster');
      if (!/\bposter=/.test(t)) emit('video-no-poster', 'medium', f, l, t, 'poster= (avoids an empty gap and improves perceived LCP)');
      if (!/preload=["'](none|metadata)/.test(t)) emit('video-preload', 'low', f, l, t, 'preload="none" or "metadata"');
    }
  }
  if (useClient) {
    const hooks = /\buse(State|Effect|LayoutEffect|Reducer|Ref|Context|Transition|Optimistic|ActionState|FormStatus|Router|Pathname|SearchParams|[A-Z]\w*)\s*\(/.test(code);
    const browser = /\b(window|document|localStorage|sessionStorage|navigator)\./.test(code) && !/onClick=\{\(\)\s*=>\s*\(?window\.location/.test(code);
    const handlers = [...code.matchAll(/\bon[A-Z]\w+=\{/g)].length;
    const navOnly = /onClick=\{\(\)\s*=>\s*\(?(window\.location(\.href)?\s*=|router\.push\()/.test(code);
    if (!hooks && !browser && !handlers) emit('use-client-unnecessary', 'medium', f, 1, '"use client" without hooks, events or browser APIs', 'remove "use client": it becomes a Server Component (0 KB of JS)');
    else if (!hooks && !browser && navOnly && handlers === 1) emit('use-client-for-navigation', 'medium', f, 1, 'client only because of an onClick that navigates', 'use <Link href> and remove "use client"');
  }
  for (const m of code.matchAll(/import\s+(?:[\w*{}\s,]+from\s+)?["']([^"']+)["']/g)) {
    const pkg = m[1].startsWith('@') ? m[1].split('/').slice(0, 2).join('/') : m[1].split('/')[0];
    if (HEAVY.test(m[1]) || (HEAVY.test(pkg) && m[1] === pkg)) emit(useClient ? 'heavy-import-client' : 'heavy-import', useClient ? 'high' : 'low', f, lineOf(code, m.index), m[0], useClient ? 'move to a Server Component, per-function import or dynamic()' : 'on the server it does not weigh on the bundle; check whether it is used');
  }
  if (/\/layout\.(t|j)sx?$/.test(f) && /\b(cookies|headers|draftMode)\(\)/.test(code)) emit('layout-dynamic', 'medium', f, lineOf(code, code.search(/\b(cookies|headers|draftMode)\(\)/)), 'request API in a layout', 'isolate it in a component inside <Suspense>');
  for (const m of code.matchAll(/export\s+const\s+(dynamic|revalidate|fetchCache)\s*=\s*([^;\n]+)/g)) emit('segment-config', CC || /force-dynamic|=\s*0/.test(m[0]) ? 'medium' : 'low', f, lineOf(code, m.index), m[0], CC ? "with cacheComponents these no longer exist: use 'use cache' + cacheLife or <Suspense>" : 'valid without cacheComponents; force-dynamic or revalidate = 0 make the route dynamic: check whether it is needed');
  if (/(['"])use cache(: \w+)?\1/.test(code) && !/cacheLife\(/.test(code)) emit('use-cache-no-cachelife', 'low', f, lineOf(code, code.search(/use cache/)), "'use cache' without cacheLife", 'add an explicit cacheLife(...)');
}
console.error(JSON.stringify({ files: files.length, byRule: counts }, null, 1));
