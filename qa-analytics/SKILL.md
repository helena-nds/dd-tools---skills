---
name: qa-analytics
description: Checks that the analytics of a Next.js website measures correctly and is reliable before launch. Reviews the measurement plan (forms, phone, email and WhatsApp clicks, downloads, CTAs, scroll), the implementation (GA4, GTM, Plausible, Umami, Matomo, Fathom, Vercel Analytics), page_view on client-side navigation, Consent Mode, DebugView, internal traffic, key events, Sentry and real Web Vitals. Use it whenever someone asks to review analytics, conversions, events, GA4, pixels, measurement or tracking, even if QA isn't mentioned.
---

# Analytics and measurement QA

The goal is to answer with evidence: **is the data the client is going to look at correct and complete?** In websites generated with AI from Figma, the usual picture is a GA `<Script>` pasted into the layout with a sample ID, no conversion events, duplicated or missing page_views when navigating with `next/link`, and the same analytics also measuring staging. Broken measurement doesn't throw an error: it simply leaves months of useless data.

**Scope.** This skill checks that measurement **works**. Whether it is **legal** (banner, cookies before consent, advanced Consent Mode, exemption for cookieless analytics) is decided by `qa-legal`: here it is only flagged and referred there.

**By default no code is modified**: deliver the report and fix only if the user asks. Don't install anything in the project; the tools go in `/tmp/qa-analytics/`.

## Step 0. Context

Find out before starting:

1. **Next.js and router**: version in `package.json` (this skill is written for Next 16; in 15 little changes here) and whether it is App Router (`app/`) or Pages (`pages/_app`).
2. **Hosting**: Vercel or other. Vercel Web Analytics and Speed Insights only work when deployed on Vercel (`/_vercel/*` doesn't exist on other hosting or on a local `next start`).
3. **Tools**: GA4 directly, GTM, Plausible, Umami, Matomo, Fathom, Vercel… and the consent management platform (CMP).
4. **Staging URL** and whether the production analytics property is the same as staging's.
5. **Access**: can the user open GA4 (Admin, DebugView, Realtime) or the tool's dashboard? Without access, step 5 stays "not verified".
6. **Measurement plan**: if there is one, ask for it. If not, use the one in step 1 and confirm it.
7. **ripgrep**: the commands use `rg`. If it isn't installed (`rg --version`), `brew install ripgrep`, or replace `rg --files …` with `git ls-files -co --exclude-standard` and `rg -n` with `grep -rnE`.

## Step 1. Measurement plan for a corporate website

Propose (or check against) this table. Every row must end up with evidence in step 4.

| Interaction | Correct trigger | GA4 name | Key event? | Cookieless (Plausible/Umami/Vercel) |
|---|---|---|---|---|
| Page view | Load **and** every client-side route change | `page_view` (automatic) | No | automatic |
| Form submission | **Successful response** from the server, not the click on "Enviar" (Send) | `generate_lead` (recommended) + `form_id` | Yes | custom event ("Contacto enviado") |
| Phone click | `a[href^="tel:"]` | `contact_click` with `method: 'tel'` | Yes | custom event |
| Email click | `a[href^="mailto:"]` | `contact_click` with `method: 'email'` | Yes | custom event |
| WhatsApp | `wa.me` / `api.whatsapp.com` | `contact_click` with `method: 'whatsapp'` | Yes | outbound or custom event |
| Download (dossier, catalogue) | link to `.pdf`, `.zip`… | `file_download` (enhanced measurement) | Optional | "File Download" (Plausible) |
| Main CTA | click on "Pide presupuesto", "Contacta"… (request a quote, contact) | `cta_click` with `cta_id` | No (helps the funnel) | custom event |
| Scroll | 90 % of the page | `scroll` (enhanced measurement) | No | `engagement` (Plausible) |

Why this way: `generate_lead` is Google's recommended event for lead generation and feeds the lead acquisition report; tel/mailto clicks are **not** measured by GA4 enhanced measurement, they have to be sent by hand; and measuring the button click instead of the successful submission counts every failed attempt as a lead. Limit: 30 key events per standard property. Never send personal data (email, phone, message text) as a parameter.

## Step 2. Prepare the tools

```bash
mkdir -p /tmp/qa-analytics && cd /tmp/qa-analytics && npm init -y >/dev/null \
  && npm i playwright >/dev/null && npx playwright install chromium
```

Write `analytics-static.mjs` and `analytics-capture.mjs` there. Tested with Node 22, ripgrep 14 and Playwright 1.64.

## Step 3. Code review

```bash
cd <project> && rg --files --hidden --no-ignore -g '!.git' -g '!node_modules' -g '!.next' -g '!out' . \
  | node /tmp/qa-analytics/analytics-static.mjs > /tmp/qa-analytics/analytics-code.json
```

`analytics-static.mjs`:

```js
// analytics-static.mjs: inventory of analytics in the code (providers, IDs, loading, consent, events, unmeasured interactions, Sentry, Web Vitals, Search Console).
// Usage (from the project root): rg --files --hidden --no-ignore -g '!.git' -g '!node_modules' -g '!.next' -g '!out' . | node analytics-static.mjs > analytics-code.json
import { readFileSync, existsSync } from 'node:fs';

const files = readFileSync(0, 'utf8').split('\n').map(s => s.trim()).filter(f => /\.(m?[jt]sx?|html|mdx|json)$|^\.?\/?\.env/.test(f) || /(^|\/)\.env[\w.]*$/.test(f));
const PROV = {
  'ga4-third-parties': /from\s+['"]@next\/third-parties\/google['"]/, 'gtag-manual': /googletagmanager\.com\/gtag\/js|gtag\(\s*['"]config['"]/,
  gtm: /googletagmanager\.com\/gtm\.js|GoogleTagManager\b|GTM-[A-Z0-9]{4,}/, 'universal-analytics-obsolete': /google-analytics\.com\/analytics\.js|['"]UA-\d+-\d+['"]|react-ga['"]/,
  'vercel-analytics': /@vercel\/analytics/, 'vercel-speed-insights': /@vercel\/speed-insights/, plausible: /plausible\.io\/js|@plausible-analytics\/tracker|next-plausible/,
  umami: /data-website-id|umami\.(?:is|track)|umami/i, matomo: /matomo|_paq\.push|piwik/i, fathom: /usefathom\.com|fathom-client/, posthog: /posthog/,
  'meta-pixel': /connect\.facebook\.net|fbq\(/, clarity: /clarity\.ms/, hotjar: /hotjar/, sentry: /@sentry\/nextjs/,
};
const EVENT_RES = [
  [/gtag(?:\?\.)?\(\s*['"]event['"]\s*,\s*['"]([\w.: -]+)['"]/g, 'gtag'], [/sendGAEvent\(\s*['"]event['"]\s*,\s*['"]([\w.: -]+)['"]/g, 'sendGAEvent'],
  [/sendGAEvent\(\s*\{[^}]*event\s*:\s*['"]([\w.: -]+)['"]/g, 'sendGAEvent'], [/sendGTMEvent\(\s*\{[^}]*event\s*:\s*['"]([\w.: -]+)['"]/g, 'sendGTMEvent'],
  [/dataLayer\.push\(\s*\{[^}]*event\s*:\s*['"]([\w.: -]+)['"]/g, 'dataLayer'], [/\btrack\(\s*['"]([^'"]+)['"]/g, 'track (vercel/plausible)'],
  [/plausible\(\s*['"]([^'"]+)['"]/g, 'plausible'], [/umami\.track\(\s*['"]([^'"]+)['"]/g, 'umami'], [/data-umami-event=["']([^"']+)["']/g, 'umami-attr'],
  [/trackEvent\(\s*['"]([^'"]+)['"]/g, 'fathom'], [/posthog\.capture\(\s*['"]([^'"]+)['"]/g, 'posthog'], [/_paq\.push\(\s*\[\s*['"]trackEvent['"]\s*,\s*['"]([^'"]+)['"]/g, 'matomo'],
];
const INTERACT = { tel: /href=\{?[`'"]tel:/, mailto: /href=\{?[`'"]mailto:/, whatsapp: /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\//, download: /href=\{?[`'"][^'"`]+\.(pdf|zip|docx?|xlsx?|pptx?)\b|\sdownload[\s=>]/, form: /<form\b|onSubmit=|useActionState|action=\{/ };
const ANY_EVENT = /gtag(?:\?\.)?\(|sendGAEvent|sendGTMEvent|dataLayer\.push|\btrack\(|plausible\(|umami\.track|data-umami-event|trackEvent\(|posthog\.capture|_paq\.push/;
const CONSENT = /consent|cookie|cmp|accepted|aceptad|granted|analytics_storage|klaro|cookiebot|onetrust|usercentrics|iubenda|c15t/i;
const ENVGATE = /VERCEL_ENV|NODE_ENV\s*===?\s*['"]production|NEXT_PUBLIC_(?:VERCEL_)?ENV|location\.hostname|window\.location\.host/;

let gtagScript = null, gtagConfig = false;
const out = { providers: {}, ids: [], loading: [], consentMode: [], events: [], interactionsWithoutEventInFile: [], manualPageView: [], sentry: {}, webVitals: [], searchConsole: [], warnings: [] };
const add = (k, v) => { (out.providers[k] ||= []).length < 8 && out.providers[k].push(v); };
for (const file of files) {
  let src; try { src = readFileSync(file, 'utf8'); } catch { continue; }
  const lines = src.split('\n'); const at = i => `${file}:${i + 1}`;
  const isEnv = /\.env/.test(file);
  lines.forEach((l, i) => {
    for (const [k, re] of Object.entries(PROV)) if (re.test(l) && !(k === 'umami' && !/umami/i.test(l))) add(k, at(i));
    for (const m of l.matchAll(/\b(G-[A-Z0-9]{4,12}|GTM-[A-Z0-9]{4,10}|UA-\d{4,10}-\d+)\b/g))
      out.ids.push({ id: m[1], where: at(i), placeholder: /X{4,}|TEST|1234|ABCD/i.test(m[1]) });
    if (isEnv && /^(NEXT_PUBLIC_)?(GA|GTM|GOOGLE|PLAUSIBLE|UMAMI|SENTRY|MATOMO|FATHOM)\w*=/.test(l)) out.ids.push({ env: l.split('=')[0], empty: !l.split('=')[1]?.trim(), where: at(i) });
    if (/<Script\b/.test(l)) { const tagTxt = lines.slice(i, i + 6).join(' ').split('>')[0] + lines.slice(i, i + 6).join(' ');
      if (/gtag|googletagmanager|plausible|umami|matomo|fathom|clarity|hotjar|fbq/i.test(tagTxt)) out.loading.push({ where: at(i), strategy: (tagTxt.match(/strategy=["'{]+(\w+)/) || [, 'afterInteractive (default)'])[1] }); }
    if (/gtag\(\s*['"]consent['"]\s*,\s*['"](default|update)['"]/.test(l)) {
      const blk = lines.slice(i, i + 8).join(' ');
      out.consentMode.push({ where: at(i), type: RegExp.$1, analyticsDefault: (blk.match(/analytics_storage['"]?\s*:\s*['"](\w+)/) || [])[1] || '?', v2: /ad_user_data/.test(blk) && /ad_personalization/.test(blk), waitForUpdate: /wait_for_update/.test(blk) });
    }
    if (/debug_mode|debugMode/.test(l)) out.warnings.push({ where: at(i), warning: 'debug_mode in the code: check it does not reach production (setting it to false does NOT disable it; it must be omitted)' });
    for (const [re, via] of EVENT_RES) for (const m of l.matchAll(re)) if (!(via.startsWith('track') && !/analytics|plausible/.test(src))) out.events.push({ event: m[1], via, where: at(i) });
    if (/useReportWebVitals/.test(l) && !/^import/.test(l.trim())) out.webVitals.push({ where: at(i), consoleOnly: /console\.log\(metric/.test(lines.slice(i, i + 6).join(' ')) });
    if (/verification\s*:\s*\{|google-site-verification/.test(l)) out.searchConsole.push(at(i));
  });
  if (/googletagmanager\.com\/gtag\/js/.test(src) && !gtagScript) gtagScript = file;
  if (/gtag\(\s*['"]config['"]|<GoogleAnalytics\b|GoogleTagManager\b/.test(src)) gtagConfig = true;
  if (/\.(t|j)sx?$/.test(file)) {
    for (const [k, re] of Object.entries(INTERACT)) {
      const idx = lines.findIndex(l => re.test(l));
      if (idx >= 0 && !ANY_EVENT.test(src)) out.interactionsWithoutEventInFile.push({ type: k, where: at(idx) });
    }
    if (/usePathname|useSearchParams/.test(src) && /gtag(?:\?\.)?\(\s*['"](event['"]\s*,\s*['"]page_view|config)|sendGAEvent\([^)]*page_view|plausible\(\s*['"]pageview/.test(src))
      out.manualPageView.push({ where: file, warning: 'manual page_view on route change: if enhanced measurement (browser history) is on, it is duplicated' });
    if (/(googletagmanager|GoogleAnalytics|GoogleTagManager|plausible|umami|matomo|fathom|fbq\()/.test(src) && !/^(app\/)?api\//.test(file)) {
      if (!CONSENT.test(src) && /googletagmanager|GoogleAnalytics|GoogleTagManager|fbq\(|matomo/.test(src)) out.warnings.push({ where: file, warning: 'analytics with cookies and no trace of consent in the file: check in the browser (and see qa-legal)' });
      if (!ENVGATE.test(src) && /googletagmanager|<GoogleAnalytics|<GoogleTagManager|\binit\(\s*\{[^}]*domain|data-website-id|matomo\.js|usefathom\.com\/script|fbq\(\s*['"]init/.test(src)) out.warnings.push({ where: file, warning: 'analytics does not distinguish environment (VERCEL_ENV/NODE_ENV/hostname): previews and staging pollute the data' });
    }
  }
}
for (const f of ['instrumentation-client.ts', 'instrumentation-client.js', 'src/instrumentation-client.ts', 'instrumentation.ts', 'src/instrumentation.ts', 'sentry.server.config.ts', 'sentry.edge.config.ts', 'app/global-error.tsx', 'src/app/global-error.tsx', 'app/error.tsx'])
  if (existsSync(f)) { const t = readFileSync(f, 'utf8'); out.sentry[f] = { sentry: /@sentry\//.test(t), onRequestError: /onRequestError/.test(t), onRouterTransitionStart: /onRouterTransitionStart/.test(t),
    captureException: /captureException/.test(t), replay: /replayIntegration/.test(t), sendDefaultPii: /sendDefaultPii\s*:\s*true/.test(t), traces1: /tracesSampleRate\s*:\s*1(\.0)?\b/.test(t) }; }
for (const f of ['next.config.ts', 'next.config.mjs', 'next.config.js']) if (existsSync(f)) { const t = readFileSync(f, 'utf8');
  if (/withSentryConfig/.test(t)) out.sentry[f] = { withSentryConfig: true, tunnelRoute: /tunnelRoute/.test(t), sourcemaps: /authToken|SENTRY_AUTH_TOKEN/.test(t) }; }
try { const pkg = JSON.parse(readFileSync('package.json', 'utf8')); const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  out.packages = Object.fromEntries(Object.entries(deps).filter(([k]) => /analytics|third-parties|gtag|plausible|umami|matomo|fathom|posthog|sentry|web-vitals|react-ga|speed-insights|cookie|consent/.test(k))); } catch {}
if (gtagScript && !gtagConfig) out.warnings.push({ where: gtagScript, warning: "loads gtag.js but there is no gtag('config', …) in the project: no data is sent" });
const seen = new Set(); out.ids = out.ids.filter(i => { const k = (i.id || i.env) + i.where; return !seen.has(k) && seen.add(k); });
out.summary = { providers: Object.keys(out.providers), distinctEvents: [...new Set(out.events.map(e => e.event))], unmeasuredInteractions: out.interactionsWithoutEventInFile.length,
  placeholderIds: [...new Set(out.ids.filter(i => i.placeholder).map(i => i.id))], consentModeDeclared: out.consentMode.length > 0, sentry: Object.keys(out.sentry).length > 0, webVitals: out.webVitals.length > 0, searchConsoleMeta: out.searchConsole.length > 0 };
console.log(JSON.stringify(out, null, 1));
```

Review the output and note:

- `ids`: a `G-XXXXXXX`, `G-TEST…` or an empty `NEXT_PUBLIC_GA_ID` variable is measurement that goes nowhere. More than one `G-`, or GA4 + GTM with GA inside = double tagging and duplicated data.
- `warnings` with "loads gtag.js but there is no `gtag('config')`": the script downloads and sends nothing.
- `loading`: analytics `<Script>`s go with `afterInteractive` (the default) or `lazyOnload`; `beforeInteractive` only delays the page.
- `consentMode`: if there is a `gtag('consent','default')`, it must come **before** `config`, with the four v2 keys (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`). If the default is `granted`, or if tags load before consent with everything `denied` (advanced mode), refer to `qa-legal`.
- `events` against the plan in step 1: whatever is missing is a finding. `interactionsWithoutEventInFile` is a quick hint (a file with `tel:`/`<form>` and no event), not the proof: the proof is step 4.
- `manualPageView`: a `gtag('event','page_view')` in a `useEffect` with `usePathname` **duplicates** views if enhanced measurement has "page changes based on browser history events" turned on (GA4 already sends page_view on every `pushState`).
- `warnings` "does not distinguish environment": previews, staging and localhost send data to the real property.
- `debug_mode` in the code: `debug_mode: false` does **not** disable it; the parameter must be omitted.

**How it should be done in Next 16 (App Router)**

- `@next/third-parties` (16.4.3, same version as `next`; the official documentation still calls it experimental). `<GoogleAnalytics gaId>` injects `gtag('config')` and `gtag.js` after hydration, **without** consent by default, so with basic Consent Mode it should only render once there is consent. `sendGAEvent` only works if the component is mounted (otherwise it warns in the console and sends nothing). `<GoogleTagManager gtmId>` + `sendGTMEvent` for GTM.
- Page views on client navigation: GA4 sends them on its own with enhanced measurement (browser history). For tools that don't, `instrumentation-client.ts` exports `onRouterTransitionStart(url, navigationType)`, which runs on every App Router navigation.
- `next/script` with an `id` on inline scripts (Next requires it to avoid duplicating them).
- Vercel Web Analytics (`@vercel/analytics` 2.x, `<Analytics />` from `@vercel/analytics/next`): automatic page views, including client transitions; custom events with `track()` only on Pro and Enterprise plans; `beforeSend` to strip personal data from the URL. Since v2 the intake path can be randomised ("Resilient Intake"): the script detects it via `script[data-sdkn]`.

Recommended pattern (GA4 with basic Consent Mode and no measurement outside production):

```tsx
// app/_components/Analytics.tsx
'use client'
import { GoogleAnalytics, sendGAEvent } from '@next/third-parties/google'
import { useConsent } from '@/lib/consent' // the project's CMP state
export function Analytics() {
  const { analytics } = useConsent()
  // NEXT_PUBLIC_VERCEL_ENV only exists on Vercel; on other hosting define NEXT_PUBLIC_APP_ENV=production in the production build
  if ((process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NEXT_PUBLIC_APP_ENV) !== 'production' || !analytics) return null
  return <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />
}
export const measure = (name: string, params?: Record<string, string>) => sendGAEvent('event', name, params ?? {})
// <a href="tel:+34…" onClick={() => measure('contact_click', { method: 'tel' })}>
// Form: measure('generate_lead', { form_id: 'contacto' }) only when the server action returns ok
```

## Step 4. Browser test

The script opens the website in three clean contexts (without touching the banner, after **Reject** and after **Accept**) and in each one: loads the first route, scrolls, navigates to the others **by clicking their links** (so it can tell client navigation from a reload), and clicks every `tel:`, `mailto:`, WhatsApp, download, CTA and two outbound links. External links and downloads are blocked after the analytics listeners have acted. It intercepts hits from GA4 (`/g/collect`, including those batched in the body), Universal Analytics, Plausible (`/api/event`), Umami (`/api/send`), Vercel (`/_vercel/insights/*` or the `data-endpoint` path), Matomo, Fathom, Sentry (`/envelope/`) and custom Web Vitals beacons.

```bash
# In production use BLOCK_HITS=1: hits are captured but don't reach the real property
BLOCK_HITS=1 node /tmp/qa-analytics/analytics-capture.mjs https://staging.example.com/ /servicios /contacto > /tmp/qa-analytics/analytics-network.json
# Real form submission (staging only, warn the user first):
SUBMIT=1 MODES=accept node /tmp/qa-analytics/analytics-capture.mjs https://staging.example.com/ /contacto > /tmp/qa-analytics/analytics-form.json
```

`analytics-capture.mjs`:

```js
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
  for (const h of pre.filter(h => COOKIE_PROV.has(h.prov))) { add('critical', `${h.prov}:${h.event} sent without consent (gcs=${h.gcs ?? '—'})${h.gcs === 'G100' ? ': advanced Consent Mode' : ''}. See qa-legal`); break; }
  if (r.mode === 'reject') for (const h of r.hits.filter(h => h.phase !== 'initial-load' && COOKIE_PROV.has(h.prov) && h.gcs !== 'G100')) { add('critical', `${h.prov} keeps sending after rejecting (${h.phase})`); break; }
  if (r.mode === 'reject' && r.hits.some(h => h.phase !== 'initial-load' && h.gcs === 'G100')) add('high', 'GA4 keeps sending pings after rejecting (gcs=G100, advanced Consent Mode): high risk, see qa-legal');
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
```

**How to read `analytics-network.json`** (each mode comes with `diagnosis` already computed; check it against the data):

- `navigations[].type`: `client` = App Router navigation; `reload` = the link is an `<a>` and reloads the page (slow and, besides, it doesn't test the client case). On each client navigation there must be **exactly one** page view per tool: 0 = lost views; 2 = duplicated (typical: enhanced measurement + manual page_view).
- `actions[].hits` empty on an action from the plan = **key event not measured**. Outbound links are only measured if the tool has outbound tracking enabled.
- `scroll`: `ga4:scroll` (enhanced measurement at 90 %) or `plausible:engagement`.
- `byEvent` and `hits[].tid`: a sample ID or two IDs = data in the bin or duplicated. `hits[].debug` = DebugView active in production.
- `scripts`: an analytics script with a status other than 200 (blocked, 404, `/_vercel/*` outside Vercel) = not measuring.
- `no-interaction` and `reject` modes: GA4/Matomo/pixel hits before consent or after rejecting, or `gcs=G100` (advanced Consent Mode), come out as critical **and are referred** to `qa-legal`. Cookieless tools may keep measuring after rejecting: whether that is allowed is decided by the legal skill.
- `gcs` is Google's consent state: `G1` + ad_storage + analytics_storage (`G111` everything granted, `G101` analytics only, `G100` nothing).
- If the banner doesn't appear (`error: button … not found`), confirm it with a screenshot before rating it: it may have different text or be inside an iframe.

## Step 5. Verification in the tool itself

The network proves the hit goes out; it remains to check that the property receives it and handles it properly. With the user's access:

- **GA4 DebugView** (Admin › DebugView): enable debugging only in your browser with Tag Assistant (tagassistant.google.com), not with `debug_mode` in the code. Repeat the actions from step 4 and check names and parameters. With analytics denied in Consent Mode, events don't appear in DebugView.
- **Key events**: Admin › Events, star `generate_lead` and `contact_click` (or "Create event" › "Mark as key event"). Changes are not retroactive.
- **Internal traffic**: Admin › Data streams › Configure tag settings › Define internal traffic (office IP) and Admin › Data filters: "Internal traffic" and "Developer traffic". Leave them in **Testing**, validate, and switch to **Active**: an active filter deletes that data forever and is not retroactive. For staging, it is better not to load analytics outside production (step 3) than to filter afterwards; as a safety net, check the report by hostname.
- **Plausible**: custom events only appear if the goal is created in the dashboard; downloads and outbound links are enabled in "Default tracking". **Umami**: `data-domains` limits tracking to the production domains. **Matomo**: check `disableCookies` or consent in the configuration. **Fathom**: `data-spa="auto"` for client navigation.
- **Search Console**: domain property verified via **DNS** (verification via GA or GTM fails if the tag only loads after consent). If the HTML tag is used: `export const metadata = { verification: { google: '…' } }` in `app/layout.tsx`, and don't remove it later. Sitemap submitted.

## Step 6. Errors and real Web Vitals

- **Sentry** (`@sentry/nextjs` 11.x, compatible with Next 16): `instrumentation-client.ts` with `Sentry.init` and `export const onRouterTransitionStart = Sentry.captureRouterTransitionStart`; `instrumentation.ts` with `register()` and `export const onRequestError = Sentry.captureRequestError` (server errors); `app/global-error.tsx` with `captureException`; `next.config.ts` with `withSentryConfig` (source maps with `SENTRY_AUTH_TOKEN` outside the repo; `tunnelRoute` against blockers, excluded from the `proxy.ts` matcher). `tracesSampleRate: 1` in production is expensive: 0.1 is usually enough. Session Replay records sessions: run it through `qa-legal`. Verify with a test button that throws an error on staging and check that it reaches Issues **with a readable stack** (source maps).
- **Real Web Vitals (RUM)**: `useReportWebVitals` (from `next/web-vitals`, in a client component mounted in the layout) receives TTFB, FCP, LCP, CLS and INP; if it only does `console.log`, it measures nothing. Send it to GA4 (`sendGAEvent('event', metric.name, { value, metric_id: metric.id })`) or to your own endpoint with `navigator.sendBeacon`. Alternatives: Vercel Speed Insights (Vercel only) or the Core Web Vitals report in Search Console / CrUX (needs enough traffic). Lab measurements belong to `qa-performance-cwv`.

**Cookieless alternatives** (what they measure; the legal part, in `qa-legal`):

| Tool | What it measures | Requirements and notes |
|---|---|---|
| Vercel Web Analytics | Page views (including client navigation), referrers, country, device; events with `track()` | Vercel only; custom events on Pro/Enterprise; visitor = hash of the request, the session is discarded after 24 h |
| Plausible | Page views, goals, outbound, downloads, form submissions, scroll and time (`engagement`) | Paid cloud or self-hosted Community Edition; script or npm package `@plausible-analytics/tracker` |
| Umami | Page views, events (`umami.track`, `data-umami-event`) | Cloud or self-hosted; `data-domains`, `data-before-send` |
| Matomo | Full suite (funnels, goals) | Self-hosted or cloud; cookieless only if configured (`disableCookies`) |
| Fathom | Page views and events (`fathom.trackEvent`) | Paid; `data-spa` for SPAs |

## Severity

| Level | Examples in this phase |
|---|---|
| **Critical** | No hit goes out (sample ID, missing `config`, blocked script); form submission not measured; analytics with cookies before consent or after rejecting (refer to legal) |
| **High** | page_view missing or duplicated on client navigation; tel/mailto/WhatsApp not measured; double tagging; staging and previews measuring in the production property; Vercel Analytics outside Vercel; key events not marked |
| **Medium** | `debug_mode` in production; no internal traffic filter; no error monitoring; `useReportWebVitals` with only `console.log`; internal links with `<a>` that reload |
| **Low** | Non-recommended or inconsistent event names; downloads or scroll not measured; Search Console verified with a fragile method |

## Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

`qa-analytics.md` (with the JSON from steps 3 and 4 as an annex):

```markdown
# Analytics QA — <domain> — <date> — commit <hash>
Tools: GA4 (G-…) via @next/third-parties · Plausible · Sentry ✗ · Consent: <CMP>
Measurement plan: 6/8 interactions measured · Client navigation: page_view OK / duplicated / missing

## Summary
Critical: N · High: N · Medium: N · Low: N · Not verified in the tool: <list>

## Measurement plan vs reality
| Interaction | Expected | Observed (network) | Code | Status |
|---|---|---|---|---|
| Form submission | generate_lead | — | app/contacto/actions.ts with no event | ✗ Critical |

## Findings
### A-001 · High · page_view duplicated on client navigation
- Evidence: /servicios (client navigation) → 2 × ga4:page_view; components/Medicion.tsx:12 sends a manual page_view in useEffect([pathname])
- Why it matters: it inflates page views and skews the engagement rate
- Fix: remove the manual send and keep enhanced measurement (browser history), or disable it and keep only the manual one
```

## Limitations

- The network test proves that the hit **goes out**, not that the property accepts it: complete with step 5. Ad blockers and Brave discard part of the real traffic.
- The static scanner works by regex and per file: a `tel:` in a file that already has another event doesn't show up as "unmeasured". Step 4 decides.
- Forms: without `SUBMIT=1` the submit event is not tested. With `SUBMIT=1` it is really submitted (use staging and warn). Multi-step forms or forms with CAPTCHA: by hand.
- Hits sent when the page closes (`user_engagement`, Plausible's `engagement`) may not appear.
- GTM: the script sees the GA4 hits the container fires, but doesn't audit the container; use GTM's preview mode.
- The hit format of Vercel Analytics and Fathom is not publicly documented: they are identified by path, the parameters are not broken down.

## If the user asks for fixes

Order: 1) hits going out with the real ID (and only in production); 2) consent coordinated with `qa-legal`; 3) page_view on client navigation without duplicates; 4) the plan's events, starting with `generate_lead` on the form's successful response; 5) key events and filters in the tool; 6) Sentry and Web Vitals. After each block, run `analytics-capture.mjs` again and compare `byEvent` with the previous run.

## Sources

- Next.js 16 (docs bundled in `node_modules/next/dist/docs/`): guides *analytics*, *third-party-libraries*, *scripts* and `instrumentation-client`
- Consent Mode: https://developers.google.com/tag-platform/security/concepts/consent-mode · https://developers.google.com/tag-platform/devguides/consent
- GA4: enhanced measurement https://support.google.com/analytics/answer/9216061 · key events https://support.google.com/analytics/answer/13128484 · recommended events https://support.google.com/analytics/answer/9267735 · DebugView https://support.google.com/analytics/answer/7201382 · data filters https://support.google.com/analytics/answer/10108813
- Vercel Web Analytics: https://vercel.com/docs/analytics/privacy-policy · https://vercel.com/docs/analytics/custom-events
- Sentry Next.js: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup
- Umami: https://docs.umami.is/docs/tracker-configuration · Fathom: https://usefathom.com/support/tracking-advanced
- Search Console: https://support.google.com/webmasters/answer/9008080
