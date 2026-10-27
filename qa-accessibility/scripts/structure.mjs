// structure.mjs: accessibility tree (ariaSnapshot) per route → landmarks, headings, accessible names,
// language, unique titles (used by the Next route announcer) and client navigation with next/link (focus and announcement).
// Usage: node structure.mjs <baseUrl> <route1,route2,...> <outDir> [expectedLang=es]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const [base, routes = '/', outDir = '.', lang = 'es'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'es-ES' });
const report = [], titles = {};
const ES = /\b(el|la|los|las|de|del|que|y|en|para|con|por|una?|nuestr[oa]s?)\b/gi, EN = /\b(the|and|of|to|for|with|your|our|is|are)\b/gi;

for (const route of routes.split(',')) {
  const r = { route, issues: [] }, P = (type, sc, detail) => r.issues.push({ type, sc, detail });
  try {
    const resp = await page.goto(new URL(route, base).href, { waitUntil: 'networkidle' });
    r.status = resp?.status();
    const snap = await page.locator('body').ariaSnapshot();
    writeFileSync(`${outDir}/aria${route === '/' ? '_home' : route.replaceAll('/', '_')}.yml`, snap);
    const L = snap.split('\n');
    const heads = L.map(l => l.match(/- heading "(.*)" \[level=(\d)\]/)).filter(Boolean).map(m => ({ text: m[1], level: +m[2] }));
    const lm = role => L.filter(l => new RegExp(`^\\s*- ${role}\\b`).test(l)).length;
    r.landmarks = { banner: lm('banner'), navigation: lm('navigation'), main: lm('main'), contentinfo: lm('contentinfo'), region: lm('region'), search: lm('search') };
    r.headings = heads.map(h => `${'  '.repeat(h.level - 1)}h${h.level} ${h.text}`);
    if (r.landmarks.main !== 1) P('main-not-unique', '1.3.1', `main: ${r.landmarks.main}`);
    if (!r.landmarks.banner) P('no-banner', '1.3.1 (best practice)', 'no top-level <header>');
    if (!r.landmarks.navigation) P('no-nav', '1.3.1 (best practice)', 'no <nav>');
    if (!r.landmarks.contentinfo) P('no-contentinfo', '1.3.1 (best practice)', 'no top-level <footer>');
    const h1 = heads.filter(h => h.level === 1).length;
    if (h1 !== 1) P('h1-not-unique', '1.3.1/2.4.6', `${h1} h1: ${heads.filter(h => h.level === 1).map(h => h.text).join(' | ')}`);
    heads.forEach((h, i) => { if (i && h.level > heads[i - 1].level + 1) P('heading-level-skip', '1.3.1', `h${heads[i - 1].level} → h${h.level} "${h.text}"`); });
    // Empty accessible names that axe does not always flag (e.g. role=img with no name inside a link)
    for (const l of L) if (/^\s*- (link|button|img|textbox|checkbox|combobox)(:|$| \[)/.test(l)) P('no-accessible-name', '4.1.2/1.1.1', l.trim());
    const dom = await page.evaluate(() => ({
      lang: document.documentElement.lang, title: document.title,
      text: document.body.innerText.slice(0, 4000),
      placeholderOnly: [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]),textarea,select')]
        .filter(e => e.placeholder && !e.labels?.length && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.title)
        .map(e => `${e.tagName.toLowerCase()}[name=${e.name}] placeholder="${e.placeholder}"`),
      imgWithoutAlt: [...document.images].filter(i => !i.hasAttribute('alt')).map(i => i.getAttribute('src')?.slice(0, 80)),
      viewport: document.querySelector('meta[name=viewport]')?.content || null,
      announcer: !!document.querySelector('next-route-announcer'),
    }));
    r.lang = dom.lang; r.title = dom.title; r.nextAnnouncer = dom.announcer;
    (titles[dom.title] ||= []).push(route);
    const es = (dom.text.match(ES) || []).length, en = (dom.text.match(EN) || []).length;
    if (!dom.lang) P('no-lang', '3.1.1', '<html> without lang');
    else if (!dom.lang.toLowerCase().startsWith(lang)) P('wrong-lang', '3.1.1', `lang="${dom.lang}" but "${lang}" was expected (es/en words in the text: ${es}/${en})`);
    if (/create next app|untitled|^$/i.test(dom.title)) P('default-title', '2.4.2', `"${dom.title}"`);
    for (const c of dom.placeholderOnly) P('placeholder-as-label', '3.3.2/1.3.1', c);
    for (const s of dom.imgWithoutAlt) P('img-without-alt', '1.1.1', s);
    if (/maximum-scale=(0?\.\d|1(\.0)?)\b|user-scalable=(no|0)/.test(dom.viewport || '')) P('zoom-blocked', '1.4.4', dom.viewport);
  } catch (e) { r.error = e.message.split('\n')[0]; }
  report.push(r);
}
const duplicates = Object.entries(titles).filter(([, v]) => v.length > 1);
for (const [t, rs] of duplicates) report.find(r => r.route === rs[0]).issues.push({ type: 'duplicate-title', sc: '2.4.2', detail: `"${t}" on ${rs.join(', ')}: the Next route announcer does not announce the page change` });

// Client navigation (next/link): where does focus end up and what is announced? window is marked to tell it apart from a full reload.
const nav = [];
const firstRoute = routes.split(',')[0];
await page.goto(new URL(firstRoute, base).href, { waitUntil: 'networkidle' });
// next/link renders a normal <a>: internal links are tried one by one (max. 6) to see which navigate without reloading.
const SEL = 'a[href^="/"]:not([href^="//"])';
const total = Math.min(6, await page.locator(SEL).count());
for (let i = 0; i < total; i++) {
  await page.goto(new URL(firstRoute, base).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => { window.__qaMark = 1; });
  const a = page.locator(SEL).nth(i), href = await a.getAttribute('href');
  if (href === firstRoute) continue;
  await a.focus(); await page.keyboard.press('Enter');
  await page.waitForURL(u => u.pathname !== new URL(firstRoute, base).pathname, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  nav.push(await page.evaluate(href => {
    const el = document.activeElement, r = el?.getBoundingClientRect();
    const ann = document.querySelector('next-route-announcer')?.shadowRoot?.textContent || '';
    return { href, url: location.pathname, client: window.__qaMark === 1, focusOn: el === document.body ? 'body' : el?.tagName.toLowerCase() + (el?.getAttribute('href') ? `[href="${el.getAttribute('href')}"]` : ''),
      focusVisible: !!r && r.width > 0 && r.height > 0, announced: ann, title: document.title };
  }, href));
}
for (const n of nav.filter(n => n.client)) {
  const r = report.find(x => x.route === firstRoute);
  if (!n.announced) r.issues.push({ type: 'client-navigation-not-announced', sc: '4.1.3', detail: `${n.href}: the announcer said nothing (same title?)` });
  if (!n.focusVisible || n.focusOn === 'body') r.issues.push({ type: 'focus-lost-after-navigation', sc: '2.4.3', detail: `${n.href}: focus on ${n.focusOn} (visible: ${n.focusVisible})` });
}
writeFileSync(`${outDir}/structure.json`, JSON.stringify({ routes: report, clientNavigation: nav }, null, 1));
for (const r of report) console.log(`${r.route} [${r.status}] lang=${r.lang} title="${r.title}" landmarks=${JSON.stringify(r.landmarks)}\n  ${(r.headings || []).join('\n  ')}\n  issues: ${r.issues.map(p => p.type).join(', ') || 'none'}`);
console.log('navigation:', JSON.stringify(nav));
await browser.close();
