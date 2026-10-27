// robots-sitemap.mjs: validates robots.txt and sitemap.xml (including sitemap indexes) and cross-checks them with the crawl.
// Usage: node robots-sitemap.mjs <baseUrl> [--site https://production-domain.es] [--pages seo-out/pages.jsonl] [--mode prod|staging] [--max 500]
//   --site: production origin. If the <loc> entries use that domain and you are auditing locally/on staging, they are requested against <baseUrl>.
// Output: JSON on stdout { robots, sitemaps, issues }.
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import { readFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const BASE = new URL(args[0] || 'http://localhost:3000/');
const SITE = opt('site') ? new URL(opt('site')).origin : BASE.origin;
const MODE = opt('mode', 'prod'), MAX = Number(opt('max', 500));
const pagesFile = opt('pages');
const UA = 'Mozilla/5.0 (compatible; qa-technical-seo/1.0)';
const issues = []; const add = (sev, code, where, detail) => issues.push({ sev, code, where, detail });
const toLocal = u => { try { const x = new URL(u); return x.origin === SITE ? BASE.origin + x.pathname + x.search : u; } catch { return u; } };
async function get(url, redirect = 'manual') {
  try { const r = await fetch(url, { redirect, headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
    return { status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() }; }
  catch (e) { return { status: 0, error: String(e.cause?.code || e.message), body: '' }; }
}

// ---------- robots.txt ----------
const robotsUrl = new URL('/robots.txt', BASE).href;
const rr = await get(robotsUrl, 'follow');
const robots = { url: robotsUrl, status: rr.status, contentType: rr.headers?.['content-type'], bytes: Buffer.byteLength(rr.body || '') };
let parser = null;
if (rr.status === 200) {
  parser = robotsParser(new URL('/robots.txt', SITE).href, rr.body);
  robots.text = rr.body.slice(0, 4000);
  robots.sitemaps = parser.getSitemaps();
  const lines = rr.body.split(/\r?\n/).map(l => l.replace(/#.*/, '').trim()).filter(Boolean);
  robots.groups = []; let g = null;
  for (const l of lines) {
    const [k, ...v] = l.split(':'); const key = k.trim().toLowerCase(), val = v.join(':').trim();
    if (key === 'user-agent') { if (!g || g.rules.length) robots.groups.push(g = { agents: [], rules: [] }); g.agents.push(val); }
    else if (g && /^(allow|disallow|crawl-delay|content-signal)$/.test(key)) g.rules.push(`${key}: ${val}`);
    else if (/^(noindex|nofollow)$/.test(key)) add('Medium', 'robots-unsupported-directive', robotsUrl, `"${l}": Google does not support noindex in robots.txt`);
  }
  if (!/text\/plain/.test(robots.contentType || '')) add('Medium', 'robots-content-type', robotsUrl, robots.contentType);
  if (robots.bytes > 500 * 1024) add('Medium', 'robots-too-large', robotsUrl, `${robots.bytes} bytes (Google reads 500 KiB)`);
  const blocksAll = parser.isDisallowed(new URL('/', SITE).href, 'Googlebot');
  if (MODE === 'prod' && blocksAll) add('Critical', 'robots-blocks-all', robotsUrl, 'Googlebot cannot crawl "/" (staging robots in production?)');
  if (MODE === 'staging' && !blocksAll) add('Medium', 'staging-robots-open', robotsUrl, 'on staging the right approach is auth or noindex (X-Robots-Tag); robots.txt alone is not enough');
  if (parser.isDisallowed(new URL('/_next/static/chunks/x.js', SITE).href, 'Googlebot')) add('High', 'robots-blocks-next-static', robotsUrl, 'blocks /_next/: Google cannot render CSS/JS');
  if (!robots.sitemaps.length) add('Low', 'robots-missing-sitemap', robotsUrl, 'no Sitemap: line');
  for (const s of robots.sitemaps) if (!/^https?:\/\//.test(s)) add('High', 'robots-relative-sitemap', robotsUrl, s);
    else if (new URL(s).origin !== SITE) add('High', 'robots-sitemap-other-domain', robotsUrl, `${s} (expected ${SITE})`);
} else if (rr.status === 404) add('High', 'missing-robots', robotsUrl, '404: everything is crawled, but there is no Sitemap: line and no decisions about bots (create app/robots.ts)');
else if (rr.status >= 500 || rr.status === 0) add('Critical', 'robots-5xx', robotsUrl, `status ${rr.status}${rr.error ? ' ' + rr.error : ''}: Google stops crawling the site while it lasts`);
else add('Medium', 'robots-status', robotsUrl, `status ${rr.status}`);

// ---------- sitemaps ----------
const queue = [...new Set([...(robots.sitemaps || []).map(s => new URL(s, SITE).href), new URL('/sitemap.xml', SITE).href])];
const sitemaps = []; const locs = new Map(); const seen = new Set();
while (queue.length) {
  const sm = queue.shift(); if (seen.has(sm)) continue; seen.add(sm);
  const r = await get(toLocal(sm), 'follow');
  const info = { url: sm, status: r.status, contentType: r.headers?.['content-type'], bytes: Buffer.byteLength(r.body || '') };
  sitemaps.push(info);
  if (r.status !== 200) { add(sm.endsWith('/sitemap.xml') && !(robots.sitemaps || []).includes(sm) ? ((robots.sitemaps || []).length ? 'Low' : 'High') : 'Critical', 'sitemap-unreachable', sm, `status ${r.status}`); continue; }
  const $ = cheerio.load(r.body, { xml: true });
  const rootTag = $.root().children().first().prop('tagName')?.toLowerCase();
  info.type = rootTag;
  if (!/^(urlset|sitemapindex)$/.test(rootTag || '')) { add('Critical', 'sitemap-invalid-xml', sm, `root <${rootTag}>`); continue; }
  if (!/sitemaps\.org\/schemas\/sitemap\/0\.9/.test(r.body)) add('High', 'sitemap-missing-namespace', sm, 'missing xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  if (info.bytes > 50 * 1024 * 1024) add('High', 'sitemap-too-large', sm, `${info.bytes} bytes (max. 50 MB uncompressed)`);
  if (rootTag === 'sitemapindex') { $('sitemap > loc').each((_, e) => queue.push($(e).text().trim())); continue; }
  const urls = $('url');
  info.urls = urls.length;
  if (urls.length > 50000) add('High', 'sitemap-too-many-urls', sm, `${urls.length} (max. 50,000)`);
  const lastmods = [];
  urls.each((_, e) => {
    const loc = $(e).find('loc').first().text().trim(), lm = $(e).find('lastmod').first().text().trim();
    if (lm) lastmods.push(lm);
    if (!/^https?:\/\//.test(loc)) add('High', 'sitemap-relative-loc', sm, loc);
    else if (new URL(loc).origin !== SITE) add('High', 'sitemap-loc-other-domain', sm, `${loc} (expected ${SITE})`);
    if (lm && (isNaN(Date.parse(lm)) || !/^\d{4}-\d{2}-\d{2}/.test(lm))) add('Medium', 'sitemap-invalid-lastmod', loc, lm);
    else if (lm && Date.parse(lm) > Date.now() + 86400000) add('Medium', 'sitemap-future-lastmod', loc, lm);
    if (locs.has(loc)) add('Low', 'sitemap-duplicate-url', loc, sm);
    locs.set(loc, { sitemap: sm, lastmod: lm || null });
  });
  if (lastmods.length > 3 && new Set(lastmods.map(l => l.slice(0, 16))).size === 1) add('Low', 'sitemap-identical-lastmod', sm, `every URL has lastmod ${lastmods[0]} (new Date() at build time?): Google ignores it if it is not reliable`);
}

// ---------- Each sitemap URL: 200, indexable, canonical ----------
const crawled = new Map();
if (pagesFile && existsSync(pagesFile)) for (const l of readFileSync(pagesFile, 'utf8').split('\n').filter(Boolean)) { const p = JSON.parse(l); crawled.set(p.url, p); }
let checked = 0;
for (const loc of locs.keys()) {
  if (checked++ >= MAX) { add('Low', 'sitemap-not-fully-checked', '', `only ${MAX} URLs were checked`); break; }
  const local = toLocal(new URL(loc, SITE).href);
  const r = await get(local);
  if (r.status >= 300 && r.status < 400) { add('High', 'sitemap-url-redirects', loc, `${r.status} → ${r.headers.location}`); continue; }
  if (r.status !== 200) { add('High', 'sitemap-url-not-200', loc, `status ${r.status}`); continue; }
  const $ = cheerio.load(r.body);
  const robotsMeta = $('meta[name="robots" i]').attr('content') || '';
  if (/noindex/i.test(robotsMeta + (r.headers['x-robots-tag'] || ''))) add('High', 'sitemap-url-noindex', loc, 'noindex URL inside the sitemap');
  const canon = $('head link[rel="canonical"]').attr('href');
  if (canon && canon.replace(/\/$/, '') !== loc.replace(/\/$/, '')) add('Medium', 'sitemap-url-not-canonical', loc, `canonical → ${canon}`);
  if (parser?.isDisallowed(loc, 'Googlebot')) add('High', 'sitemap-url-blocked-by-robots', loc, 'in the sitemap but blocked in robots.txt');
}
// Cross-check with the crawl: indexable pages missing from the sitemap
if (crawled.size && locs.size) {
  const inSitemap = new Set([...locs.keys()].map(l => toLocal(l).replace(/\/$/, '')));
  for (const p of crawled.values()) {
    if (p.status !== 200 || !/html/.test(p.contentType || '') || /noindex/i.test(`${p.robotsMeta} ${p.xRobotsTag}`)) continue;
    if (!inSitemap.has(p.url.replace(/\/$/, ''))) add('Medium', 'page-missing-from-sitemap', p.url, 'indexable and linked, but not in the sitemap');
  }
}
if (crawled.size && parser) for (const p of crawled.values())
  if (p.status === 200 && parser.isDisallowed(p.url.replace(BASE.origin, SITE), 'Googlebot')) add('High', 'page-blocked-by-robots', p.url, `robots.txt line ${parser.getMatchingLineNumber(p.url.replace(BASE.origin, SITE), 'Googlebot')}`);

const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
issues.sort((a, b) => order[a.sev] - order[b.sev]);
console.log(JSON.stringify({ base: BASE.href, site: SITE, robots, sitemaps, sitemapUrls: locs.size, issues }, null, 1));
