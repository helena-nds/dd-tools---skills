// routes.mjs: static App Router analysis for SEO: routes (page.*), special metadata files,
// metadata exports per page, metadataBase/title.template/lang of the root layout and next.config.
// Usage: node routes.mjs <project-root> [--seeds-out seeds.txt] > routes.json   (seeds = static routes, for crawl.mjs)
import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.argv[2] || '.';
const seedsOut = process.argv.includes('--seeds-out') ? process.argv[process.argv.indexOf('--seeds-out') + 1] : null;
const appDir = ['app', 'src/app'].map(d => join(root, d)).find(existsSync);
if (!appDir) { console.error('No app/ or src/app/: Pages Router? Review pages/ by hand.'); process.exit(1); }
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (!/^(node_modules|\.next)$/.test(f)) walk(p); } else files.push(p); } })(appDir);
const rel = f => relative(root, f), inApp = f => relative(appDir, f).replace(/\\/g, '/');
const lineOf = (src, re) => { const i = src.search(re); return i < 0 ? null : src.slice(0, i).split('\n').length; };
// Public route: strips (groups); ignores _private folders and @slots
const routeOf = f => { const segs = inApp(f).split('/').slice(0, -1); return segs.some(s => /^[_@]/.test(s)) ? null : '/' + segs.filter(s => !/^\(.*\)$/.test(s)).join('/'); };

const SPECIAL = { sitemap: /(^|\/)sitemap\.(xml|js|ts)$/, robots: /^robots\.(txt|js|ts)$/, manifest: /^manifest\.(json|webmanifest|js|ts)$/,
  'opengraph-image': /(^|\/)opengraph-image\.(jpe?g|png|gif|js|ts|tsx)$/, icon: /(^|\/)(icon|apple-icon)\d*\.(ico|jpe?g|png|svg|js|ts|tsx)$/,
  'not-found': /^(global-)?not-found\.(js|jsx|ts|tsx)$/ };
const special = Object.fromEntries(Object.entries(SPECIAL).map(([k, re]) => [k, files.map(inApp).filter(f => re.test(f))]));
for (const f of ['robots.txt', 'sitemap.xml', 'llms.txt']) if (existsSync(join(root, 'public', f))) (special[f.split('.')[0]] ||= []).push(`public/${f}`);

const pages = files.filter(f => /(^|[\\/])page\.(js|jsx|ts|tsx|md|mdx)$/.test(f) && routeOf(f)).map(f => {
  const src = readFileSync(f, 'utf8');
  return { route: routeOf(f), dynamic: /\[/.test(routeOf(f)), file: rel(f), useClient: /^\s*['"]use client['"]/.test(src),
    metadata: /export\s+(const|let)\s+metadata\b|generateMetadata/.test(src), line: lineOf(src, /export\s+(const|let)\s+metadata\b|generateMetadata/),
    description: /\bdescription\s*:/.test(src), canonical: /canonical\s*:/.test(src), h1: (src.match(/<h1[\s>]/g) || []).length };
});
const rootLayout = ['tsx', 'jsx', 'js', 'ts'].map(e => join(appDir, `layout.${e}`)).find(existsSync);
const rl = rootLayout ? readFileSync(rootLayout, 'utf8') : '';
const layout = rootLayout && { file: rel(rootLayout), lang: (rl.match(/<html[^>]*\blang=\{?["'`]?([^"'`}\s]+)/) || [])[1] || null, langLine: lineOf(rl, /<html/),
  metadataBase: /metadataBase\s*:/.test(rl), titleTemplate: /template\s*:\s*['"`][^'"`]*%s/.test(rl),
  title: (rl.match(/title\s*:\s*['"`]([^'"`]+)['"`]/) || [])[1] || null, titleLine: lineOf(rl, /title\s*:/),
  headTags: ((rl.match(/<head>[\s\S]*?<\/head>/) || [''])[0].match(/<(link|meta|title)[^>]*>/g) || []) };
const cfgFile = ['next.config.ts', 'next.config.mjs', 'next.config.js'].map(f => join(root, f)).find(existsSync);
const cfg = cfgFile ? readFileSync(cfgFile, 'utf8') : '';
const config = { file: cfgFile && rel(cfgFile), redirects: /redirects\s*\(|redirects\s*:/.test(cfg), headers: /headers\s*\(/.test(cfg), xRobotsTag: /X-Robots-Tag/i.test(cfg),
  htmlLimitedBots: /htmlLimitedBots/.test(cfg), proxy: ['proxy.ts', 'proxy.js', 'middleware.ts', 'middleware.js', 'src/proxy.ts', 'src/middleware.ts'].filter(f => existsSync(join(root, f))) };

const problems = []; const P = (sev, code, where, detail) => problems.push({ sev, code, where, detail });
if (!special.sitemap.length) P('High', 'missing-sitemap', 'app/', 'no app/sitemap.(ts|xml) and no public/sitemap.xml');
if (!special.robots.length) P('High', 'missing-robots', 'app/', 'no app/robots.(ts|txt) and no public/robots.txt');
if (!special['opengraph-image'].length) P('Medium', 'missing-opengraph-image', 'app/', 'no opengraph-image (check whether metadata has openGraph.images)');
if (!special['not-found'].length) P('Low', 'missing-not-found', 'app/', 'no not-found.tsx: generic Next 404');
if (!special.icon.length) P('Low', 'missing-icon', 'app/', 'no icon/apple-icon (only favicon.ico)');
if (!special.manifest.length) P('Low', 'missing-manifest', 'app/', 'no manifest');
if (layout) {
  if (!layout.metadataBase) P('High', 'no-metadataBase', layout.file, 'relative canonical/OG URLs are not resolved to the domain');
  if (!layout.titleTemplate) P('Medium', 'no-title-template', layout.file, 'no title.template ("%s | Brand")');
  if (layout.lang && !/^es/.test(layout.lang)) P('High', 'root-layout-lang', `${layout.file}:${layout.langLine}`, `lang="${layout.lang}"`);
  if (/create next app/i.test(layout.title || '')) P('Critical', 'template-metadata', `${layout.file}:${layout.titleLine}`, `title "${layout.title}"`);
  if (layout.headTags.length) P('Low', 'manual-head', layout.file, layout.headTags.join(' '));
}
for (const p of pages) {
  if (!p.metadata) { if (p.route !== '/' || !layout?.title) P('High', 'page-without-metadata', p.file, `${p.route}: inherits the layout title/description (duplicates)`); }
  else { if (!p.description) P('Medium', 'metadata-without-description', `${p.file}:${p.line}`, p.route); if (!p.canonical) P('Medium', 'metadata-without-canonical', `${p.file}:${p.line}`, p.route); }
  if (p.useClient && p.metadata) P('High', 'metadata-in-client-component', p.file, 'metadata only works in Server Components');
  if (p.h1 > 1) P('Medium', 'multiple-h1-in-code', p.file, `${p.h1} <h1>`);
}
if (seedsOut) writeFileSync(seedsOut, pages.filter(p => !p.dynamic).map(p => p.route).join('\n') + '\n');
console.log(JSON.stringify({ appDir: rel(appDir), routes: pages.map(p => p.route), pages, rootLayout: layout, special, config, problems }, null, 1));
