// consent-check.mjs: which cookies, storage and third-party requests exist before consenting, after Reject and after Accept.
// Usage: node consent-check.mjs <base-url> [/route2 /route3 ...] > consent.json
import { chromium } from 'playwright';

const [SITE, ...extra] = process.argv.slice(2);
const origin = new URL(SITE).origin;
const paths = [new URL(SITE).pathname || '/', ...extra];
const TRACK = /google-analytics|googletagmanager|doubleclick|googleadservices|google\.[a-z.]+\/(maps|recaptcha)|maps\.googleapis|gstatic|fonts\.googleapis|youtube|ytimg|vimeo|facebook|fbcdn|licdn|linkedin|tiktok|hotjar|clarity\.ms|bing\.com|hubspot|hs-scripts|hs-analytics|recaptcha\.net|hcaptcha|challenges\.cloudflare|typekit|calendly|intercom|crisp|tawk|segment|mixpanel|vercel-insights|va\.vercel-scripts/i;
const TRACK_COOKIE = /^(_ga|_gid|_gat|_gcl_|_fbp|_fbc|_hj|_clck|_clsk|_uet|MUID|IDE|NID|li_|bcookie|lidc|_tt_|_ttp|hubspotutk|__hs|_pk_|_hjSession)/;
const ACCEPT = /^\s*(aceptar|accept|permitir|allow|de acuerdo|acepto|ok)\b/i;
const REJECT = /^\s*(rechazar|reject|denegar|deny|no acepto|solo (las )?(necesarias|t[eé]cnicas|esenciales)|continuar sin aceptar)/i;

async function run(mode) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  const page = await ctx.newPage();
  let phase = 'before-interaction';
  const requests = [];
  page.on('request', r => {
    let u; try { u = new URL(r.url()); } catch { return; }
    if (!/^https?:$/.test(u.protocol) || u.origin === origin) return;
    requests.push({ phase, host: u.hostname, type: r.resourceType(), tracker: TRACK.test(u.href) });
  });
  const snapshot = async () => ({
    cookies: (await ctx.cookies()).map(c => ({ name: c.name, domain: c.domain,
      durationDays: c.expires > 0 ? Math.round((c.expires * 1000 - Date.now()) / 864e5) : 'session', suspectedTracker: TRACK_COOKIE.test(c.name) })),
    storage: await page.evaluate(async () => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage),
      indexedDB: (await (indexedDB.databases?.() ?? Promise.resolve([]))).map(d => d.name) })),
    thirdPartyIframes: page.frames().map(f => f.url()).filter(u => /^https?:/.test(u) && !u.startsWith(origin)),
  });

  await page.goto(origin + paths[0], { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const buttons = page.locator('button, [role=button], a');
  const find = async re => { for (const b of await buttons.all()) { const t = (await b.innerText().catch(() => '')).trim(); if (t && t.length < 60 && re.test(t) && await b.isVisible()) return b; } return null; };
  const accept = await find(ACCEPT), reject = await find(REJECT);
  const look = b => b && b.evaluate(n => { const s = getComputedStyle(n), r = n.getBoundingClientRect();
    return { text: n.innerText.trim(), bg: s.backgroundColor, color: s.color, fontSize: s.fontSize, fontWeight: s.fontWeight, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }; });
  const banner = { accept: await look(accept), reject: await look(reject) };

  let result;
  if (mode === 'no-interaction') {
    for (const p of paths.slice(1)) { await page.goto(origin + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500); }
    result = await snapshot();
  } else {
    const btn = mode === 'reject' ? reject : accept;
    if (!btn) { await browser.close(); return { mode, banner, error: `"${mode}" button not found in the first layer` }; }
    await btn.click(); await page.waitForTimeout(1000);
    phase = 'after-' + mode;
    for (const p of paths) { await page.goto(origin + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500); }
    result = await snapshot();
  }
  const hosts = {};
  for (const r of requests) { const k = `${r.phase} | ${r.host}`; hosts[k] = hosts[k] || { phase: r.phase, host: r.host, tracker: r.tracker, n: 0 }; hosts[k].n++; }
  await browser.close();
  return { mode, banner, ...result, thirdPartyRequests: Object.values(hosts) };
}

const out = [];
for (const m of ['no-interaction', 'reject', 'accept']) out.push(await run(m));
console.log(JSON.stringify({ site: origin, routes: paths, date: new Date().toISOString(), results: out }, null, 1));
