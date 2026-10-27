// crawl-links.mjs: crawls the site with Playwright (rendered DOM) and checks internal and external links, anchors, tel:, mailto: and downloads.
// Usage: node crawl-links.mjs <baseUrl> [--app-dir=app] [--routes=/,/contacto] [--external] [--max-pages=150] [--out=links.json]
//   --app-dir   adds the static routes from app/**/page.* as seeds (orphan pages are not found by following links)
//   --external  also checks external links (HEAD and, if it fails, GET; 4 in parallel; 10 s timeout)
import { chromium, request as pwRequest } from 'playwright';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [base, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map(a => { const [k, v = true] = a.replace(/^--/, '').split('='); return [k, v]; }));
const B = new URL(base), MAX = +(opt['max-pages'] || 150);
const findings = [], pages = {}, checked = new Map();
const add = (sev, type, pageUrl, href, detail, text) => findings.push({ sev, type, page: pageUrl, href, text: text?.slice(0, 60), detail });

function appRoutes(dir, prefix = '') {                       // static App Router routes
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (/^[@_]|^\[|^api$/.test(e)) continue;               // slots, private, dynamic, API
      out.push(...appRoutes(p, /^\(.*\)$/.test(e) ? prefix : `${prefix}/${e}`));
    } else if (/^page\.(t|j)sx?$|^page\.mdx$/.test(e)) out.push(prefix || '/');
  }
  return out;
}
const seeds = new Set(['/']);
if (opt['app-dir']) appRoutes(opt['app-dir']).forEach(r => seeds.add(r));
if (opt.routes) opt.routes.split(',').forEach(r => seeds.add(r));
const UA = 'Mozilla/5.0 (QA link check) Chrome/140';
const api = await pwRequest.newContext({ timeout: 10000, userAgent: UA });
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy;   // corporate network: external links go through the proxy
const apiExt = PROXY ? await pwRequest.newContext({ timeout: 10000, userAgent: UA, proxy: { server: PROXY } }) : api;
try {                                                         // sitemap.xml if it exists
  const sm = await api.get(new URL('/sitemap.xml', B).href);
  if (sm.ok()) for (const m of (await sm.text()).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) { const u = new URL(m[1]); if (u.host === B.host) seeds.add(u.pathname); }
} catch {}

const browser = await chromium.launch();
const page = await (await browser.newContext({ locale: 'es-ES' })).newPage();
const queue = [...seeds].map(p => new URL(p, B).href);
const norm = u => { const x = new URL(u); x.hash = ''; return x.href; };

async function status(url, external) {                       // status + redirect chain
  if (checked.has(url)) return checked.get(url);
  const chain = []; let cur = url, res, err;
  for (let i = 0; i < 6; i++) {
    try {
      res = external ? await apiExt.head(cur, { maxRedirects: 0 }).catch(() => null) : await api.get(cur, { maxRedirects: 0 });
      if (external && (!res || [403, 405, 501].includes(res.status()))) res = await apiExt.get(cur, { maxRedirects: 0 });   // many servers reject HEAD
    } catch (e) { err = e.message.split('\n')[0]; break; }
    const loc = res.headers()['location'];
    if (res.status() >= 300 && res.status() < 400 && loc) { chain.push(`${res.status()} → ${loc}`); cur = new URL(loc, cur).href; continue; }
    break;
  }
  const r = { status: err ? 0 : res.status(), chain, final: cur, error: err, type: res?.headers()['content-type'], size: +(res?.headers()['content-length'] || 0) };
  checked.set(url, r); return r;
}

while (queue.length && Object.keys(pages).length < MAX) {
  const url = norm(queue.shift());
  if (pages[url]) continue;
  let resp; try { resp = await page.goto(url, { waitUntil: 'load', timeout: 30000 }); await page.waitForTimeout(400); }
  catch (e) { pages[url] = { error: e.message.split('\n')[0] }; add('High', 'page-load-failed', url, url, pages[url].error); continue; }
  if (!/text\/html/.test(resp?.headers()['content-type'] || '')) { pages[url] = { status: resp?.status(), noHtml: true }; continue; }
  const data = await page.evaluate(() => {
    const where = el => el.closest('header') ? 'header' : el.closest('nav') ? 'nav' : el.closest('footer') ? 'footer' : 'main';
    const links = [...document.querySelectorAll('a[href], area[href], a:not([href])')].map(a => ({
      raw: a.getAttribute('href'), abs: a.href, text: (a.innerText || a.getAttribute('aria-label') || a.querySelector('img')?.alt || '').trim(),
      target: a.getAttribute('target'), rel: a.getAttribute('rel') || '', download: a.hasAttribute('download'), where: where(a) }));
    const ids = [...document.querySelectorAll('[id], a[name]')].map(e => e.id || e.getAttribute('name'));
    const fakeLinks = [...document.querySelectorAll('body *')].filter(el => !el.closest('a,button,label,summary,input,select,textarea,[role=button],[role=link],[tabindex]')
      && getComputedStyle(el).cursor === 'pointer' && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
      .map(el => `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 40)}"`);
    return { links, ids, fakeLinks };
  });
  pages[url] = { status: resp.status(), ids: data.ids, links: data.links.length };
  if (resp.status() >= 400) add('High', 'page-error', url, url, `HTTP ${resp.status()}`);
  for (const f of data.fakeLinks) add('High', 'clickable-not-link', url, null, `${f}: cursor:pointer without <a>/<button>; not keyboard-navigable and not crawlable`);
  for (const l of data.links) {
    const raw = (l.raw ?? '').trim();
    if (l.raw === null) { add('Medium', 'a-without-href', url, null, '<a> without href: neither a link nor a keyboard focus target', l.text); continue; }
    if (!raw || raw === '#' || /^javascript:/i.test(raw)) { add('High', 'empty-href', url, raw, 'empty href, "#" or javascript:', l.text); continue; }
    if (l.target === '_blank' && !/noopener|noreferrer/.test(l.rel)) add('Low', 'blank-without-rel', url, raw, 'target=_blank without rel="noopener noreferrer"', l.text);
    if (/^tel:/i.test(raw)) { const d = raw.slice(4).replace(/[\s().-]/g, ''); if (!/^\+?\d{6,15}$/.test(d)) add('High', 'invalid-tel', url, raw, 'tel: with invalid characters', l.text); else if (!d.startsWith('+')) add('Low', 'tel-without-prefix', url, raw, 'use international format +34…', l.text); continue; }
    if (/^mailto:/i.test(raw)) { const m = decodeURIComponent(raw.slice(7).split('?')[0]); if (!/^[^@\s,]+@[^@\s]+\.[a-z]{2,}(,[^@\s,]+@[^@\s]+\.[a-z]{2,})*$/i.test(m)) add('High', 'invalid-mailto', url, raw, 'malformed address', l.text); continue; }
    if (!/^https?:/.test(l.abs)) continue;
    const u = new URL(l.abs), internal = u.host === B.host;
    if (/localhost|127\.0\.0\.1|\.vercel\.app|\.netlify\.app|staging\.|preview\./.test(u.host) && !internal) add('High', 'link-to-non-production', url, raw, u.host, l.text);
    if (B.protocol === 'https:' && u.protocol === 'http:') add('Medium', 'http-link', url, raw, 'http:// link from https', l.text);
    if (!internal && !opt.external) continue;
    const r = await status(norm(l.abs), !internal);
    const isDl = l.download || /\.(pdf|zip|docx?|xlsx?|pptx?|dwg|rar|7z)$/i.test(u.pathname);
    if (r.status === 0) add(internal ? 'High' : 'Medium', 'link-no-response', url, raw, r.error, l.text);
    else if ([401, 403, 429, 999].includes(r.status) && !internal) add('Low', 'external-blocks-bots', url, raw, `HTTP ${r.status}: check manually in a browser`, l.text);
    else if (r.status >= 400) add(internal || isDl ? 'High' : 'Medium', internal ? 'broken-internal-link' : 'broken-external-link', url, raw, `HTTP ${r.status}`, l.text);
    if (r.chain.length) add(internal ? 'Medium' : 'Low', 'redirect', url, raw, r.chain.join(' | '), l.text);
    if (isDl && r.status < 400) add(r.size > 10e6 ? 'Medium' : 'Low', 'download', url, raw, `${r.type || '?'} · ${(r.size / 1e6).toFixed(1)} MB${r.size > 10e6 ? ' (heavy)' : ''}`, l.text);
    if (internal && r.status < 300 && /text\/html/.test(r.type || '') && !pages[norm(r.final)]) queue.push(r.final);
    if (internal && u.hash.length > 1) (pages.__frag ||= []).push({ from: url, target: norm(l.abs), id: decodeURIComponent(u.hash.slice(1)), raw, text: l.text });
  }
}
for (const f of pages.__frag || []) {                         // anchors: the id must exist in the target's rendered DOM
  const t = pages[f.target];
  if (t?.ids && !t.ids.includes(f.id)) add('Medium', 'missing-anchor', f.from, f.raw, `#${f.id} does not exist on ${f.target}`, f.text);
}
delete pages.__frag;
const seen = new Map(), uniq = [];                          // groups repeats (e.g. the same footer link on every page)
for (const f of findings) { const k = [f.type, f.href, f.detail].join('|'); if (seen.has(k)) seen.get(k).count++; else { f.count = 1; seen.set(k, f); uniq.push(f); } }
const byType = uniq.reduce((a, f) => (a[f.type] = (a[f.type] || 0) + 1, a), {});
const report = { base, pageCount: Object.keys(pages).length, linksChecked: checked.size, byType, findings: uniq, pages: Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, { status: v.status, links: v.links, error: v.error }])) };
writeFileSync(opt.out || 'links.json', JSON.stringify(report, null, 1));
console.log(JSON.stringify({ pageCount: report.pageCount, linksChecked: checked.size, byType }, null, 1));
await browser.close(); await api.dispose(); if (apiExt !== api) await apiExt.dispose();
