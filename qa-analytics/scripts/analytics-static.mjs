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
