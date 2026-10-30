// consent-check.mjs: what the site stores and which third parties it contacts before any choice, after Reject, after Accept
// and (with --gpc) when the browser sends a Global Privacy Control signal. Also measures the banner buttons.
// Usage: node consent-check.mjs <base-url> [/route2 /route3 ...] [--locale=en-US] [--tz=America/New_York] [--gpc] [--wait=2500] [--out=consent.json]
//   Run it once per target market (locale + time zone). Consent tools that switch by IP are not covered by --locale:
//   use the tool's geo override or a VPN for that market and say so in the report.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v = true] = a.slice(2).split('='); return [k, v]; }));
const pos = args.filter(a => !a.startsWith('--'));
const SITE = pos[0];
if (!SITE) { console.error('Usage: node consent-check.mjs <base-url> [/route ...] [--locale=] [--tz=] [--gpc] [--out=]'); process.exit(1); }
const origin = new URL(SITE).origin;
const paths = [new URL(SITE).pathname || '/', ...pos.slice(1)];
const LOCALE = opt.locale || 'en-US', TZ = opt.tz || 'UTC', WAIT = +(opt.wait || 2500);

// Host/path → category. Order matters: the first match wins (reCAPTCHA lives on gstatic, like Google Fonts).
const CATEGORIES = [
  ['captcha', /recaptcha|gstatic\.com\/recaptcha|hcaptcha\.com|challenges\.cloudflare\.com|friendlycaptcha|altcha/i],
  ['maps', /maps\.googleapis|google\.[a-z.]+\/maps|maps\.gstatic|api\.mapbox|tile\.openstreetmap/i],
  ['ads', /doubleclick|googleadservices|googlesyndication|adservice\.google|google\.[a-z.]+\/(pagead|ads)|facebook\.com\/tr|connect\.facebook\.net|px\.ads\.linkedin|snap\.licdn|ads\.linkedin|analytics\.tiktok|business-api\.tiktok|bat\.bing|ads-twitter|criteo|taboola|outbrain|ct\.pinterest|s\.pinimg\.com\/ct|redditstatic|alb\.reddit|quantserve|adnxs|amazon-adsystem|adsrvr|yandex\.ru\/metrika|mc\.yandex/i],
  ['replay', /hotjar|clarity\.ms|fullstory|logrocket|mouseflow|smartlook|luckyorange|contentsquare|inspectlet/i],
  ['chat', /intercom|drift\.com|driftt|crisp\.chat|tawk\.to|zendesk|zdassets|livechatinc|olark|tidio|freshchat|hs-scripts|hubspot|js\.usemessages/i],
  ['video', /youtube|ytimg|youtube-nocookie|vimeo|vimeocdn|wistia|vidyard|jwplayer/i],
  ['social', /facebook\.com\/plugins|platform\.twitter|platform\.linkedin|instagram\.com\/embed|tiktok\.com\/embed|addthis|sharethis/i],
  ['fonts', /fonts\.googleapis|fonts\.gstatic|use\.typekit|p\.typekit|fonts\.bunny|fast\.fonts\.net|cloud\.typography/i],
  ['analytics', /google-analytics|googletagmanager|analytics\.google|region1\.google-analytics|plausible\.io|matomo|piwik|segment\.(io|com)|mixpanel|amplitude|heap(analytics)?\.|posthog|vercel-insights|va\.vercel-scripts|vitals\.vercel|cloudflareinsights|static\.cloudflareinsights|stats\.wp\.com|newrelic|nr-data|sentry/i],
  ['cdn', /jsdelivr|unpkg|cdnjs|images\.unsplash|cloudinary|imgix|ajax\.googleapis/i],
];
const category = url => (CATEGORIES.find(([, re]) => re.test(url)) || ['other'])[0];
const TRACK_COOKIE = /^(_ga|_gid|_gat|_gcl_|_fbp|_fbc|_hj|_clck|_clsk|_uet|MUID|IDE|NID|1P_JAR|li_|bcookie|bscookie|lidc|UserMatchHistory|AnalyticsSyncHistory|_tt_|_ttp|ttwid|hubspotutk|__hs|_pk_|_hjSession|_pin_unauth|_rdt_uuid|_scid|ajs_|mp_|amplitude|ph_|intercom-|crisp-|__tawk|_lc_|YSC|VISITOR_INFO1_LIVE|vuid)/;

// Banner wording in the main languages. Extend for other markets (the reference files list local words).
const ACCEPT = /^\s*(accept(ar|er|eren|eer)?|accept all|aceptar( todo| todas| todas las cookies)?|acepto|permitir( todo| todas)?|allow( all)?( cookies)?|agree|i agree|ok|okay|got it|entendido|de acuerdo|tout accepter|j'accepte|accepter et fermer|alle akzeptieren|akzeptieren|zustimmen|einverstanden|alle cookies akzeptieren|accetta( tutto| tutti)?|accetto|aceitar( todos| tudo)?|concordo|alles accepteren|akkoord|akceptuj|godkänn( alla)?|acceptér|tümünü kabul et|kabul et|同意する|すべて同意|すべて許可|동의|모두 동의|接受|全部接受|同意)\b/i;
const REJECT = /^\s*(reject( all)?( cookies)?|decline( all)?|deny|refuse|disagree|necessary( cookies)? only|only (strictly )?necessary|essential( cookies)? only|use necessary cookies only|do not accept|rechazar( todo| todas| todas las cookies)?|denegar|no acepto|solo (las )?(necesarias|t[eé]cnicas|esenciales)|continuar sin aceptar|refuser( tout)?|tout refuser|continuer sans accepter|ablehnen|alle ablehnen|nur (notwendige|essenzielle|erforderliche)( cookies)?|rifiuta( tutto| tutti)?|solo necessari|rejeitar( todos| tudo)?|recusar|somente (os )?necess[aá]rios|apenas necess[aá]rios|weigeren|alles weigeren|alleen noodzakelijk|odrzuć|avvisa|afvis|reddet|tümünü reddet|拒否|すべて拒否|거부|모두 거부|拒绝|全部拒绝)\b/i;
const SETTINGS = /(settings|preferences|customi[sz]e|manage( cookies| options| preferences)?|configur|personali[sz]|more options|préférences|paramétrer|personnaliser|einstellungen|anpassen|impostazioni|personalizza|preferências|configurações|instellingen|設定|설정|设置)/i;
const GPC_TEXT = /opt-?out (request )?(honou?red|processed|confirmed)|(gpc|global privacy control)( signal)? (detected|honou?red|respected|received)|we (have )?(detected|honou?red) your (gpc|global privacy control)/i;

async function findButtons(page) {
  // Looks in the page and in consent-tool iframes. Returns the first visible accept, reject and settings controls.
  const out = { accept: null, reject: null, settings: null };
  for (const frame of page.frames()) {
    const els = frame.locator('button, [role=button], a, input[type=button], input[type=submit]');
    let n = 0; try { n = await els.count(); } catch { continue; }
    for (let i = 0; i < Math.min(n, 400); i++) {
      const el = els.nth(i);
      let t = '';
      try { if (!(await el.isVisible())) continue; t = ((await el.innerText().catch(() => '')) || (await el.getAttribute('value')) || (await el.getAttribute('aria-label')) || '').trim(); } catch { continue; }
      if (!t || t.length > 60) continue;
      if (!out.reject && REJECT.test(t)) out.reject = el;
      else if (!out.accept && ACCEPT.test(t)) out.accept = el;
      else if (!out.settings && SETTINGS.test(t) && /cookie|privac|consent|setting|preferen|configur|einstellung|impostazion|设置|設定|설정/i.test(t + ' ' + (await el.evaluate(n => n.closest('[class*=cookie],[id*=cookie],[class*=consent],[id*=consent],[class*=cmp],[id*=cmp],[class*=banner],[role=dialog]') ? 'cookie' : '').catch(() => '')))) out.settings = el;
    }
  }
  return out;
}

// Computed style + contrast of a control. Colors are normalised through a canvas (works for oklch/lab from Tailwind v4).
const LOOK = n => {
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgba = c => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data]; };
  const lum = ([r, g, b]) => [r, g, b].map(v => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  const s = getComputedStyle(n), r = n.getBoundingClientRect();
  let bg = null; for (let p = n; p; p = p.parentElement) { const c = rgba(getComputedStyle(p).backgroundColor); if (c[3] > 200) { bg = c; break; } }
  bg = bg || [255, 255, 255, 255];
  const fg = rgba(s.color), L1 = lum(fg), L2 = lum(bg);
  return { tag: n.tagName.toLowerCase(), text: (n.innerText || n.value || '').trim().slice(0, 60), bg: s.backgroundColor, color: s.color, fontSize: parseFloat(s.fontSize), fontWeight: s.fontWeight,
    w: Math.round(r.width), h: Math.round(r.height), contrast: +((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2),
    filled: rgba(s.backgroundColor)[3] > 200, underline: s.textDecorationLine.includes('underline') };
};

function symmetry(a, r) {
  if (!r) return 'reject-missing';
  if (!a) return 'ok';
  if (a.filled && !r.filled && (r.tag === 'a' || r.underline)) return 'reject-is-link';
  if (r.w * r.h < 0.6 * a.w * a.h || r.fontSize < 0.85 * a.fontSize) return 'reject-smaller';
  if (r.contrast < 3 && a.contrast >= 4.5) return 'reject-low-contrast';
  return 'ok';
}

const LEAK_PARAMS = /^(ud\[|udff\[|em$|ph$|fn$|ln$|external_id$|user_data|cd\[|ec\d*$|eid$|email|phone|first_?name|last_?name)/i;

async function run(mode) {
  const browser = await chromium.launch();
  const ctxOpts = { locale: LOCALE, timezoneId: TZ };
  if (mode === 'gpc') ctxOpts.extraHTTPHeaders = { 'Sec-GPC': '1' };
  const ctx = await browser.newContext(ctxOpts);
  if (mode === 'gpc') await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true, configurable: true }));
  const page = await ctx.newPage();
  let phase = mode === 'gpc' ? 'gpc' : 'before-interaction';
  const requests = [], leaks = [];
  page.on('request', r => {
    let u; try { u = new URL(r.url()); } catch { return; }
    if (!/^https?:$/.test(u.protocol) || u.origin === origin) return;
    const cat = category(u.href);
    requests.push({ phase, host: u.hostname, category: cat });
    if (cat === 'ads' || cat === 'analytics') {
      const params = [...u.searchParams.keys(), ...(() => { try { return [...new URLSearchParams(r.postData() || '').keys()]; } catch { return []; } })()].filter(k => LEAK_PARAMS.test(k));
      if (params.length) leaks.push({ phase, host: u.hostname, path: u.pathname.slice(0, 60), params: [...new Set(params)].slice(0, 12) });
    }
  });
  const snapshot = async () => ({
    cookies: (await ctx.cookies()).map(c => ({ name: c.name, domain: c.domain,
      durationDays: c.expires > 0 ? Math.round((c.expires * 1000 - Date.now()) / 864e5) : 'session', suspectedTracker: TRACK_COOKIE.test(c.name) })),
    storage: await page.evaluate(async () => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage),
      indexedDB: (await (indexedDB.databases?.() ?? Promise.resolve([]))).map(d => d.name) })).catch(() => ({})),
    thirdPartyIframes: page.frames().map(f => f.url()).filter(u => /^https?:/.test(u) && !u.startsWith(origin)),
  });
  const visit = async p => { await page.goto(origin + p, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {}); await page.waitForTimeout(WAIT); };

  await visit(paths[0]);
  const btn = await findButtons(page);
  const look = async b => b ? await b.evaluate(LOOK).catch(() => null) : null;
  const banner = { found: !!(btn.accept || btn.reject || btn.settings), accept: await look(btn.accept), reject: await look(btn.reject), settings: await look(btn.settings) };
  banner.rejectSameLayer = !!btn.reject;
  banner.symmetry = banner.found ? symmetry(banner.accept, banner.reject) : 'no-banner';

  let result, extra = {};
  if (mode === 'no-interaction' || mode === 'gpc') {
    const gpcSeen = [];
    const readGpc = async p => { const m = (await page.evaluate(() => document.body.innerText).catch(() => '')).match(GPC_TEXT); if (m) gpcSeen.push(`${p}: ${m[0]}`); };
    if (mode === 'gpc') await readGpc(paths[0]);
    for (const p of paths.slice(1)) { await visit(p); if (mode === 'gpc') await readGpc(p); }
    result = await snapshot();
    if (mode === 'gpc') {
      const m = gpcSeen.length ? [gpcSeen.join(' | ')] : null;
      const ck = (await ctx.cookies()).filter(c => /usprivacy|gpp|OptanonConsent|OTGPPConsent|euconsent|consent/i.test(c.name)).map(c => `${c.name}=${decodeURIComponent(c.value).slice(0, 80)}`);
      extra = { adRequests: [...new Set(requests.filter(r => ['ads', 'social', 'replay'].includes(r.category)).map(r => r.host))],
        confirmationText: m ? m[0] : null, optOutState: ck, navigatorSignal: await page.evaluate(() => navigator.globalPrivacyControl).catch(() => null) };
    }
  } else {
    let b = mode === 'reject' ? btn.reject : btn.accept;
    if (!b && mode === 'reject' && btn.settings) {           // reject only in the second layer
      await btn.settings.click().catch(() => {}); await page.waitForTimeout(1000);
      b = (await findButtons(page)).reject; banner.rejectInSecondLayer = !!b;
    }
    if (!b) { await browser.close(); return { mode, banner, error: `"${mode}" button not found (check a screenshot: icon-only buttons and unusual wording are missed)` }; }
    await b.click().catch(() => {}); await page.waitForTimeout(1200);
    phase = 'after-' + mode;
    for (const p of paths) await visit(p);
    result = await snapshot();
  }
  const hosts = {};
  for (const r of requests) { const k = `${r.phase}|${r.host}`; (hosts[k] ||= { phase: r.phase, host: r.host, category: r.category, n: 0 }).n++; }
  if (mode === 'no-interaction') await page.screenshot({ path: (opt.out || 'consent.json').replace(/\.json$/, '') + '-banner.png' }).catch(() => {});
  await browser.close();
  const seenLeak = new Set(), uniqLeaks = leaks.filter(l => { const k = JSON.stringify(l); return !seenLeak.has(k) && seenLeak.add(k); });
  return { mode, banner, ...result, thirdPartyRequests: Object.values(hosts), pixelLeaks: uniqLeaks, ...extra };
}

const modes = ['no-interaction', 'reject', 'accept', ...(opt.gpc ? ['gpc'] : [])];
const results = {};
for (const m of modes) results[m] = await run(m);
const out = { site: origin, routes: paths, locale: LOCALE, timezone: TZ, date: new Date().toISOString(), banner: results['no-interaction'].banner, ...results,
  pixelLeaks: modes.flatMap(m => (results[m].pixelLeaks || []).map(l => ({ mode: m, ...l }))) };
for (const m of modes) if (m !== 'no-interaction') delete results[m].banner;
const file = opt.out || 'consent.json';
writeFileSync(file, JSON.stringify(out, null, 1));
const summary = m => { const r = results[m]; if (r.error) return `${m}: ${r.error}`;
  const phase = { 'no-interaction': 'before-interaction', reject: 'after-reject', accept: 'after-accept', gpc: 'gpc' }[m];
  const cats = {}; for (const q of r.thirdPartyRequests.filter(q => q.phase === phase)) cats[q.category] = (cats[q.category] || 0) + q.n;
  return `${m}: ${r.cookies.filter(c => c.suspectedTracker).length} tracker cookies · third-party requests (${phase}) ${JSON.stringify(cats)}`; };
console.log(`${origin} [${LOCALE}, ${TZ}] banner: ${out.banner.found ? out.banner.symmetry : 'none'} → ${file}`);
for (const m of modes) console.log('  ' + summary(m));
if (results.gpc && !results.gpc.error) console.log(`  gpc: ad/social/replay hosts ${JSON.stringify(results.gpc.adRequests)} · confirmation: ${results.gpc.confirmationText || 'none'}`);
if (out.pixelLeaks.length) console.log(`  pixel payloads with personal fields: ${out.pixelLeaks.length}`);
