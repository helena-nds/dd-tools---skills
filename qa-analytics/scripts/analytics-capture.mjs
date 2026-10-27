// analytics-capture.mjs: intercepts analytics hits (GA4, UA, Plausible, Umami, Vercel, Matomo, Fathom, Sentry, custom Web Vitals)
// on load, when navigating between routes (detects whether navigation is client-side or a reload) and when performing the key actions, in three consent modes.
// Usage: node analytics-capture.mjs <base-url> [/route2 /route3 ...] > analytics-network.json
// Variables: MODES=no-interaction,reject,accept · BLOCK_HITS=1 (responds 204 and the hits don't reach the real property)
//            SUBMIT=1 (fills in and really submits the first form: staging only) · STUB='regex=file.js;…' (offline tests only)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const [SITE, ...extra] = process.argv.slice(2);
const origin = new URL(SITE).origin, start = new URL(SITE).pathname || '/';
const MODES = (process.env.MODES || 'no-interaction,reject,accept').split(',');
const ACCEPT = /^\s*(aceptar|accept|permitir|allow|de acuerdo|acepto|ok)\b/i;
const REJECT = /^\s*(rechazar|reject|denegar|deny|no acepto|solo (las )?(necesarias|t[eé]cnicas|esenciales)|continuar sin aceptar)/i;
const HIT_RE = /\/g\/collect|\/j\/collect|google-analytics\.com\/collect|\/api\/event$|\/api\/send$|matomo\.php|piwik\.php|_vercel\/insights\/(view|event|session)|speed-insights\/vitals|usefathom\.com\/\?|\/envelope\/?$/;
const SCRIPT_RE = /gtag\/js|gtm\.js|plausible|umami|matomo\.js|piwik\.js|usefathom|_vercel\/(insights|speed-insights)|vercel-scripts|sentry|clarity|hotjar|fbevents/;
const COOKIE_PROV = new Set(['ga4', 'universal-analytics', 'matomo', 'other-tracker']);

function parseHits(url, body = '', vercel = []) {
  let u; try { u = new URL(url); } catch { return []; }
  const p = u.pathname, q = u.searchParams, json = () => { try { return JSON.parse(body); } catch { return {}; } };
  if (/\/g\/collect$/.test(p) && q.get('v') === '2') {
    const lines = body.split('\n').filter(Boolean);                     // gtag batches events: one per line in the body
    return (lines.length ? lines : ['']).map(l => { const h = { ...Object.fromEntries(q), ...Object.fromEntries(new URLSearchParams(l)) };
      return { prov: 'ga4', event: h.en, tid: h.tid, gcs: h.gcs, dl: h.dl, debug: !!(h._dbg || h['ep.debug_mode']), internal: h.tt || h['ep.traffic_type'],
        params: Object.fromEntries(Object.entries(h).filter(([k]) => /^epn?\./.test(k))) }; });
  }
  if (/\/(j\/)?collect$/.test(p) && q.get('v') === '1') return [{ prov: 'universal-analytics', event: q.get('t'), tid: q.get('tid') }];
  if (/\/api\/event$/.test(p)) { const j = json(); return j.n ? [{ prov: 'plausible', event: j.n, dl: j.u, params: j.p }] : []; }
  if (/\/api\/send$/.test(p)) { const j = json(); return j.payload?.website ? [{ prov: 'umami', event: j.payload.name || 'pageview', dl: j.payload.url, params: j.payload.data }] : []; }
  if (/(matomo|piwik)\.php$/.test(p) || (q.has('idsite') && q.has('rec'))) return [{ prov: 'matomo', event: q.get('e_a') ? `${q.get('e_c')}/${q.get('e_a')}` : 'pageview', dl: q.get('url') }];
  if (/usefathom\.com$/.test(u.hostname) && !/\.js$/.test(p)) return [{ prov: 'fathom', event: q.get('name') || 'pageview', dl: q.get('p') }];
  if ((/_vercel\/insights\/(view|event)/.test(p) || vercel.some(v => url.startsWith(v))) && !/\.js$/.test(p)) {
    const j = json(); return [{ prov: 'vercel-analytics', event: /event$/.test(p) ? (j.en || j.name || 'event') : 'pageview', dl: j.o }];
  }
  if (/speed-insights\/vitals/.test(p)) return [{ prov: 'vercel-speed-insights', event: 'vitals' }];
  if (/\/api\/\d+\/envelope\/?$/.test(p) || /"dsn":"https?:\/\/[^"]*sentry/.test(body)) return [{ prov: 'sentry', event: (body.match(/"type":"(\w+)"/) || [])[1] || 'envelope' }];
  const wv = body.match(/"name":"(LCP|CLS|INP|FCP|TTFB)"/); if (wv) return [{ prov: 'custom-web-vitals', event: wv[1] }];
  if (/facebook\.com\/tr|px\.ads\.linkedin|clarity\.ms\/collect|analytics\.tiktok|hotjar\.com/.test(url)) return [{ prov: 'other-tracker', event: u.hostname }];
  return [];
}

async function run(mode) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid', viewport: { width: 1280, height: 800 }, acceptDownloads: false, serviceWorkers: 'block' });
  for (const s of (process.env.STUB || '').split(';').filter(Boolean)) { const [re, f] = s.split('='); await ctx.route(new RegExp(re), r => r.fulfill({ contentType: 'application/javascript', body: readFileSync(f, 'utf8') })); }
  if (process.env.BLOCK_HITS) await ctx.route(HIT_RE, r => r.request().resourceType() === 'script' ? r.continue() : r.fulfill({ status: 204 }));
  if (!process.env.SUBMIT) await ctx.route('**/*', r => { const q = r.request(); return /^(POST|PUT|PATCH|DELETE)$/.test(q.method()) && !HIT_RE.test(q.url()) && q.resourceType() !== 'ping' ? r.fulfill({ status: 204 }) : r.fallback(); });   // no form submission goes out without SUBMIT=1
  const page = await ctx.newPage();
  let phase = 'initial-load'; const hits = [], scripts = {}, vercel = [], errors = [];
  page.on('request', r => { const url = r.url(); if (!/^https?:/.test(url)) return;
    for (const h of parseHits(url, r.postData() || '', vercel)) hits.push({ phase, ...h });
    if (r.resourceType() === 'script' && SCRIPT_RE.test(url)) scripts[url.split('?')[0]] ||= { phase, status: 'pending' }; });
  page.on('response', r => { const k = r.url().split('?')[0]; if (scripts[k]) scripts[k].status = r.status(); });
  page.on('requestfailed', r => { const k = r.url().split('?')[0]; if (scripts[k]) scripts[k].status = 'failed: ' + r.failure()?.errorText; });
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  const settle = (ms = 1500) => page.waitForTimeout(ms);
  const learnVercel = async () => { for (const s of await page.evaluate(() => [...document.querySelectorAll('script[data-sdkn^="@vercel/"]')].map(e => [e.src, e.dataset.endpoint || '']))) {
    const base = s[1] ? new URL(s[1], origin).href : s[0].replace(/[^/]+$/, ''); if (base && !vercel.includes(base)) vercel.push(base); } };
  // Blocks navigation of external links, tel/mailto and downloads AFTER the analytics listeners have acted (bubble phase on window).
  await page.addInitScript(() => addEventListener('click', e => { const a = e.target.closest?.('a[href]'); if (!a || !window.__qaBlock) return;
    if (a.origin !== location.origin || a.hasAttribute('download') || /\.(pdf|zip|docx?|xlsx?|pptx?|csv|mp4)$/i.test(a.pathname)) e.preventDefault(); }));

  await page.goto(origin + start, { waitUntil: 'networkidle' }); await settle(2500); await learnVercel();
  const btns = page.locator('button, [role=button], a');
  const find = async re => { for (const b of await btns.all()) { const t = (await b.innerText().catch(() => '')).trim(); if (t && t.length < 60 && re.test(t) && await b.isVisible().catch(() => false)) return b; } return null; };
  const res = { mode, banner: { accept: !!(await find(ACCEPT)), reject: !!(await find(REJECT)) }, navigations: [], actions: [] };
  if (mode !== 'no-interaction') {
    const b = await find(mode === 'reject' ? REJECT : ACCEPT);
    if (!b) { await browser.close(); return { ...res, error: `button "${mode}" not found in the first layer` }; }
    phase = 'after-' + mode; await b.click(); await settle(2500); await learnVercel();
  }
  const done = new Set();
  for (const route of [start, ...extra]) {
    if (route !== start) {
      phase = 'nav:' + route; await page.evaluate(() => { window.__qaMarker = 1; });
      const link = page.locator(`a[href="${route}"], a[href="${origin}${route}"]`).first();
      const via = await link.count() && await link.isVisible().catch(() => false) ? 'click' : 'goto';
      if (via === 'click') { await link.click(); await page.waitForURL(u => new URL(u).pathname === route, { timeout: 8000 }).catch(() => {}); }
      else await page.goto(origin + route, { waitUntil: 'networkidle' });
      await settle(2000); await learnVercel();
      const type = await page.evaluate(() => window.__qaMarker === 1 ? 'client' : 'reload');
      const pv = hits.filter(h => h.phase === phase && /^(page_view|pageview)$/.test(h.event));
      res.navigations.push({ route, via, type, pageViews: Object.fromEntries([...new Set(pv.map(h => h.prov))].map(p => [p, pv.filter(h => h.prov === p).length])) });
    }
    if (route === start) { phase = 'scroll'; for (let y = 0; y < 20; y++) { await page.mouse.wheel(0, 600); await page.waitForTimeout(150); } await settle();
      res.scroll = hits.filter(h => h.phase === 'scroll').map(h => `${h.prov}:${h.event}`); await page.evaluate(() => scrollTo(0, 0)); }
    const here = page.url();
    const tag = () => page.evaluate(() => (document.querySelectorAll('[data-qa-i]').forEach(e => e.removeAttribute('data-qa-i')), [...document.querySelectorAll('a[href], button, [data-cta], form')]).filter(e => e.getBoundingClientRect().width).map((e, i) => {
      const h = e.getAttribute('href') || '', t = (e.innerText || '').trim().slice(0, 40);
      const type = e.tagName === 'FORM' ? 'form' : /^tel:/.test(h) ? 'tel' : /^mailto:/.test(h) ? 'mailto' : /wa\.me|whatsapp/.test(h) ? 'whatsapp'
        : (/\.(pdf|zip|docx?|xlsx?|pptx?|csv)$/i.test(h.split('?')[0]) || e.hasAttribute('download')) ? 'download'
        : (e.dataset.cta !== undefined || /presupuesto|contact|llam|reserv|empez|solicit|cita|demo|comprar/i.test(t)) && e.tagName !== 'FORM' ? 'cta'
        : /^https?:/.test(h) && !h.startsWith(location.origin) ? 'outbound' : null;
      e.setAttribute('data-qa-i', i); return type && { i, type, href: h.slice(0, 80), text: t };
    }).filter(Boolean));
    const targets = await tag();
    for (const t of targets) {
      const key = `${t.type}|${t.href}|${t.text}`; if (done.has(key) || (t.type === 'outbound' && [...done].filter(k => k.startsWith('outbound')).length >= 2)) continue; done.add(key);
      phase = `action${done.size}:${t.type}:${t.href || t.text}`; let note = '';
      await page.evaluate(() => { window.__qaBlock = true; });
      const el = page.locator(`[data-qa-i="${t.i}"]`);
      try {
        if (t.type === 'form') {
          if (!process.env.SUBMIT) { res.actions.push({ ...t, note: 'not submitted: use SUBMIT=1 on staging to test the submit event' }); continue; }
          await el.evaluate(f => { for (const i of f.querySelectorAll('input, textarea, select')) {
            if (i.type === 'checkbox' && i.required) i.checked = true; else if (i.type === 'email') i.value = 'qa+analitica@example.com';
            else if (/text|tel|search|^$/.test(i.type) || i.tagName === 'TEXTAREA') i.value = i.type === 'tel' ? '600000000' : 'Prueba QA analítica (ignorar)'; }
            f.requestSubmit(); });
        } else await el.click({ timeout: 3000 });
      } catch (e) { note = 'could not click: ' + e.message.split('\n')[0]; }
      await settle(1800);
      const hAct = hits.filter(h => h.phase === phase).map(h => `${h.prov}:${h.event}`);
      if (page.url() !== here) { note += ` navigated to ${page.url()}`; await page.goto(here, { waitUntil: 'networkidle' }).catch(() => {}); await settle(800); await tag(); }
      await page.evaluate(() => { window.__qaBlock = false; }).catch(() => {});
      res.actions.push({ ...t, hits: hAct, ...(note && { note: note.trim() }) });
    }
  }
  await browser.close();
  const byEvent = {}; for (const h of hits) { const k = `${h.prov}:${h.event}`; byEvent[k] = (byEvent[k] || 0) + 1; }
  return { ...res, scripts, byEvent, hits, jsErrors: errors };
}

function diagnose(r) {
  if (r.error) return [{ sev: 'high', msg: r.error + ' (no banner or different text: confirm with a screenshot)' }];
  const d = [], pre = r.mode === 'no-interaction' ? r.hits : r.hits.filter(h => h.phase === 'initial-load');
  const add = (sev, msg) => d.push({ sev, msg });
  for (const h of pre.filter(h => COOKIE_PROV.has(h.prov))) { add('critical', `${h.prov}:${h.event} sent without consent (gcs=${h.gcs ?? '—'})${h.gcs === 'G100' ? ': advanced Consent Mode' : ''}. See qa-legal-spain`); break; }
  if (r.mode === 'reject') for (const h of r.hits.filter(h => h.phase !== 'initial-load' && COOKIE_PROV.has(h.prov) && h.gcs !== 'G100')) { add('critical', `${h.prov} keeps sending after rejecting (${h.phase})`); break; }
  if (r.mode === 'reject' && r.hits.some(h => h.phase !== 'initial-load' && h.gcs === 'G100')) add('high', 'GA4 keeps sending pings after rejecting (gcs=G100, advanced Consent Mode): high risk, see qa-legal-spain');
  if (r.mode === 'reject' || (r.mode === 'no-interaction' && r.banner.accept)) return d;   // measurement quality is assessed with consent
  const failed = Object.entries(r.scripts).filter(([, s]) => s.status !== 200 && s.status !== 304);
  for (const [u, s] of failed) add('high', `analytics script does not load: ${u} (${s.status})${/_vercel\//.test(u) ? ': /_vercel/* only exists when deployed on Vercel (on other hosting it measures nothing)' : ''}`);
  if (Object.keys(r.scripts).length && !r.hits.length) add('critical', 'there are analytics scripts but no hit goes out: measurement does not work');
  for (const n of r.navigations) {
    if (n.via === 'goto') add('low', `${n.route}: no visible link from the previous page; loaded with goto (does not test client navigation)`);
    else if (n.type === 'reload') add('medium', `${n.route}: the link causes a full reload (<a> instead of next/link)`);
    for (const [p, c] of Object.entries(n.pageViews)) if (c > 1) add('high', `${n.route}: ${c} page_view from ${p} in a single navigation (duplicated)`);
    for (const p of new Set(r.hits.filter(h => /^(page_view|pageview)$/.test(h.event)).map(h => h.prov))) if (!n.pageViews[p]) add('high', `${n.route}: ${p} does not record page_view on ${n.type} navigation`);
  }
  for (const a of r.actions.filter(a => a.hits && !a.hits.length && a.type !== 'outbound')) add('high', `key action not measured: ${a.type} "${a.text || a.href}"`);
  const tids = [...new Set(r.hits.filter(h => h.tid).map(h => h.tid))];
  if (tids.length > 1) add('high', `several measurement IDs at once: ${tids.join(', ')} (double tagging)`);
  if (tids.some(t => /X{4,}|TEST|1234/i.test(t))) add('high', `sample measurement ID: ${tids.join(', ')}`);
  if (r.hits.some(h => h.debug)) add('medium', 'hits with debug_mode/_dbg: the traffic goes to DebugView; remove it in production');
  if (!r.hits.some(h => h.prov === 'sentry')) add('low', 'no Sentry or other error monitor observed (it may only send on failure: check the code)');
  return d;
}

const out = { site: origin, routes: [start, ...extra], date: new Date().toISOString(), results: [] };
for (const m of MODES) { const r = await run(m); out.results.push({ ...r, diagnosis: diagnose(r) }); }
console.log(JSON.stringify(out, null, 1));
