// smoke.mjs: per-route smoke test. Console errors, exceptions, hydration errors, failed requests and 4xx/5xx,
// content without JavaScript and 404 page. Desktop and mobile.
// Usage: node smoke.mjs <baseUrl> <route> [<route>...] [--out=smoke.json] [--ignore=regex]
//   --ignore  regex of URLs/messages not to report (e.g. "googletagmanager|clarity" if they are reviewed separately)
import { chromium, devices } from 'playwright';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2), base = args[0];
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v = true] = a.slice(2).split('='); return [k, v]; }));
const routes = args.slice(1).filter(a => !a.startsWith('--'));
const IGN = opt.ignore ? new RegExp(opt.ignore) : null;
const HYDRATION = /hydrat|did not match|didn't match|server rendered (html|text)|Minified React error #(418|419|421|422|423|425)\b/i;
const browser = await chromium.launch();
const out = { base, routes: {}, notFound: null };

async function run(route, profile) {
  const ctx = await browser.newContext(profile === 'mobile' ? { ...devices['iPhone 13'], locale: 'es-ES' } : { viewport: { width: 1366, height: 900 }, locale: 'es-ES' });
  const page = await ctx.newPage(), r = { console: [], exceptions: [], hydration: [], failedRequests: [], http4xx5xx: [] };
  const skip = s => IGN && IGN.test(s);
  page.on('console', m => {
    if (!['error', 'warning'].includes(m.type()) || skip(m.text()) || /^Failed to load resource/.test(m.text())) return;   // already reported as requests
    const t = m.text().slice(0, 300);
    (HYDRATION.test(t) ? r.hydration : r.console).push({ type: m.type(), text: t, source: m.location()?.url?.slice(0, 120) });
  });
  page.on('pageerror', e => { const t = String(e.message).slice(0, 300); (HYDRATION.test(t) ? r.hydration : r.exceptions).push(t); });
  page.on('requestfailed', q => {
    const f = q.failure()?.errorText || '';
    if (f === 'net::ERR_ABORTED' && /_rsc=|\.txt\?/.test(q.url())) return;   // prefetch cancelled by navigation: noise
    if (!skip(q.url())) r.failedRequests.push({ url: q.url().slice(0, 160), type: q.resourceType(), error: f });
  });
  page.on('response', s => { if (s.status() >= 400 && !skip(s.url())) r.http4xx5xx.push({ url: s.url().slice(0, 160), status: s.status(), type: s.request().resourceType() }); });
  try {
    const resp = await page.goto(new URL(route, base).href, { waitUntil: 'load', timeout: 30000 });
    r.status = resp?.status(); r.finalUrl = page.url();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(z => setTimeout(z, 80)); } });
    await page.waitForTimeout(800);
    Object.assign(r, await page.evaluate(() => ({
      visibleText: document.body.innerText.replace(/\s+/g, ' ').length, h1: document.querySelectorAll('h1').length,
      horizontalScroll: document.documentElement.scrollWidth > innerWidth + 1, nextDevOverlay: !!document.querySelector('nextjs-portal') })));
  } catch (e) { r.loadError = e.message.split('\n')[0]; }
  await ctx.close();
  return r;
}

async function noJs(route) {                                   // what a crawler without JS sees, or a user if the bundle fails
  const ctx = await browser.newContext({ javaScriptEnabled: false, locale: 'es-ES' }), page = await ctx.newPage();
  try {
    await page.goto(new URL(route, base).href, { waitUntil: 'load', timeout: 30000 });
    return await page.evaluate(() => ({
      visibleText: document.body.innerText.replace(/\s+/g, ' ').length,
      h1: [...document.querySelectorAll('h1')].map(h => h.innerText.trim().slice(0, 60)),
      navLinks: document.querySelectorAll('header a[href], nav a[href]').length,
      // Motion/Framer and "reveal" animations leave opacity:0 in the server HTML: without JS that text is not visible
      hiddenUntilJs: [...document.querySelectorAll('[style*="opacity:0"], [style*="opacity: 0"], [style*="visibility:hidden"]')]
        .filter(e => e.textContent.trim()).map(e => `${e.tagName.toLowerCase()} "${e.textContent.trim().slice(0, 40)}"`).slice(0, 10),
      noscript: document.querySelectorAll('noscript').length }));
  } catch (e) { return { error: e.message.split('\n')[0] }; } finally { await ctx.close(); }
}

for (const route of routes) {
  const desktop = await run(route, 'desktop'), mobile = await run(route, 'mobile'), withoutJs = await noJs(route);
  const ratio = desktop.visibleText ? +(withoutJs.visibleText / desktop.visibleText).toFixed(2) : null;
  out.routes[route] = { desktop, mobile, noJs: { ...withoutJs, noJsTextRatio: ratio } };
  const n = x => x.console.length + x.exceptions.length + x.hydration.length + x.failedRequests.length + x.http4xx5xx.length;
  console.log(`${route}: HTTP ${desktop.status} · desktop ${n(desktop)} issues · mobile ${n(mobile)} · hydration ${desktop.hydration.length + mobile.hydration.length} · text without JS ${ratio}`);
}

// 404: a made-up URL must return a real 404 with a custom page (not the Next default) and a link to home
const ctx = await browser.newContext(), page = await ctx.newPage();
const resp = await page.goto(new URL(`/qa-missing-page-${Date.now()}`, base).href);
out.notFound = { status: resp.status(), ...(await page.evaluate(() => ({
  nextDefault: /This page could not be found/i.test(document.body.innerText),
  title: document.title, homeLink: !!document.querySelector('a[href="/"]'), robots: document.querySelector('meta[name=robots]')?.content }))) };
console.log(`404: HTTP ${out.notFound.status} · Next default page: ${out.notFound.nextDefault} · link to home: ${out.notFound.homeLink}`);
writeFileSync(opt.out || 'smoke.json', JSON.stringify(out, null, 1));
await browser.close();
