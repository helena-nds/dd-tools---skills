// nav.mjs: navigation. Menu on desktop and mobile, in-page anchors (target visible and not hidden under a fixed header),
// back/forward button and scroll restoration.
// Usage: node nav.mjs <baseUrl> [route=/] [--out=nav.json]
import { chromium, devices } from 'playwright';
import { writeFileSync } from 'node:fs';

const [base, route = '/', ...rest] = process.argv.slice(2);
const outFile = (rest.find(a => a.startsWith('--out=')) || '--out=nav.json').slice(6);
const url = new URL(route, base).href, browser = await chromium.launch(), out = { url };
const navLinks = () => [...document.querySelectorAll('header a[href], nav a[href]')].map(a => {
  const r = a.getBoundingClientRect(), cs = getComputedStyle(a);
  return { href: a.getAttribute('href'), text: a.innerText.trim().slice(0, 30), visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && r.bottom > 0 && r.right > 0 && r.left < innerWidth };
});

// 1. Menu: on desktop the header links are visible; on mobile they are either visible or there is a button that shows them
for (const [name, ctxOpt] of [['desktop', { viewport: { width: 1366, height: 900 } }], ['mobile', devices['iPhone 13']]]) {
  const ctx = await browser.newContext({ ...ctxOpt, locale: 'es-ES' }), page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const r = { links: await page.evaluate(navLinks), horizontalScroll: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1) };
  const toggle = page.locator('header button[aria-expanded], header button[aria-controls], button[aria-label*="men" i], header [role=button][aria-expanded]').first();
  if (await toggle.count() && await toggle.isVisible()) {
    r.toggle = { ariaLabel: await toggle.getAttribute('aria-label'), text: (await toggle.innerText()).trim(), expandedBefore: await toggle.getAttribute('aria-expanded') };
    await toggle.click(); await page.waitForTimeout(500);
    r.toggle.expandedAfter = await toggle.getAttribute('aria-expanded');
    r.toggle.visibleLinksWhenOpen = (await page.evaluate(navLinks)).filter(l => l.visible).length;
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    r.toggle.closesWithEscape = (await toggle.getAttribute('aria-expanded')) === 'false';
    r.toggle.focusOnToggleAfterEscape = await toggle.evaluate(t => document.activeElement === t);
  }
  r.verdict = !r.links.length ? 'no <header>/<nav> with links: navigation is not semantic or does not exist'
    : r.links.some(l => l.visible) ? 'ok' : r.toggle?.visibleLinksWhenOpen ? 'ok (dropdown menu)' : 'links hidden and no usable menu button';
  out[name] = r; await ctx.close();
}

// 2. In-page anchors: after the click, the target must be on screen and not under a fixed header (missing scroll-margin-top)
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'es-ES' }), page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
const anchors = await page.evaluate(() => [...document.querySelectorAll('a[href*="#"]')].map(a => a.getAttribute('href'))
  .filter(h => { const u = new URL(h, location.href); return u.pathname === location.pathname && u.hash.length > 1; }).filter((v, i, a) => a.indexOf(v) === i));
out.anchors = [];
for (const href of anchors.slice(0, 20)) {
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(200);
  const link = page.locator(`a[href="${href}"]`).first();
  if (!(await link.isVisible())) { out.anchors.push({ href, result: 'link not visible on desktop' }); continue; }
  await link.click(); await page.waitForTimeout(1200);
  out.anchors.push({ href, ...(await page.evaluate(id => {
    const t = document.getElementById(decodeURIComponent(id));
    if (!t) return { result: 'target does not exist' };
    const top = t.getBoundingClientRect().top;
    const fixed = [...document.querySelectorAll('header, nav, [class*=sticky], [class*=fixed]')].filter(e => /fixed|sticky/.test(getComputedStyle(e).position))
      .reduce((m, e) => Math.max(m, e.getBoundingClientRect().bottom), 0);
    return { top: Math.round(top), fixedHeaderHeight: Math.round(fixed), hashInUrl: location.hash,
      result: top < -2 || top > innerHeight ? 'target off screen' : top < fixed - 2 ? 'hidden under the fixed header (add scroll-margin-top)' : 'ok' };
  }, new URL(href, url).hash.slice(1))) });
}

// 3. Back/forward and scroll: scroll down, go to another internal page, go back and check URL and position
await page.goto(url, { waitUntil: 'networkidle' });
const target = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.href)
  .find(h => { const u = new URL(h); return u.origin === location.origin && u.pathname !== location.pathname && !/\.(pdf|zip|jpe?g|png)$/i.test(u.pathname); }));
if (target) {
  const y = await page.evaluate(() => { const y = Math.round((document.body.scrollHeight - innerHeight) * 0.6); scrollTo(0, y); return Math.round(scrollY); });
  await page.waitForTimeout(300);
  await page.evaluate(t => [...document.querySelectorAll('a[href]')].find(a => a.href === t)?.click(), target);   // real click: next/link does client-side navigation
  await page.waitForURL(u => u.href !== url, { timeout: 8000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
  const destination = page.url(), yDestination = await page.evaluate(() => Math.round(scrollY));
  await page.goBack(); await page.waitForTimeout(1200);
  const yBack = await page.evaluate(() => Math.round(scrollY)), urlBack = page.url();
  await page.goForward(); await page.waitForTimeout(800);
  out.history = { from: url, scrollBefore: y, destination, scrollOnArrival: yDestination, urlAfterBack: urlBack, scrollAfterBack: yBack,
    backOk: urlBack === url, forwardOk: page.url() === destination, scrollRestored: Math.abs(yBack - y) <= 60, destinationStartsAtTop: yDestination <= 5 };
}
await ctx.close(); await browser.close();
writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ desktop: out.desktop.verdict, mobile: out.mobile.verdict, toggle: out.mobile.toggle, anchors: out.anchors.map(a => `${a.href}: ${a.result}`), history: out.history }, null, 1));
