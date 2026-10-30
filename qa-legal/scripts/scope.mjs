// scope.mjs: works out which markets a site targets (languages, hreflang, currencies, phone prefixes, ccTLD, countries,
// shipping lists) and what features change the legal checks (shop, subscriptions, accounts, user content, chat, AI, video,
// health or children's content). Suggests regimes; the auditor confirms them with the client.
// Usage: node scope.mjs <base-url> [/route ...] [--out=scope.json]
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v = true] = a.slice(2).split('='); return [k, v]; }));
const pos = args.filter(a => !a.startsWith('--'));
if (!pos[0]) { console.error('Usage: node scope.mjs <base-url> [/route ...] [--out=scope.json]'); process.exit(1); }
const base = new URL(pos[0]), routes = [base.pathname || '/', ...pos.slice(1)];

const EU = 'AT BE BG HR CY CZ DK EE FI FR DE GR IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' ');
const EEA = ['IS', 'LI', 'NO'];
// Regime code → reference file
const FILE = { eu: 'eu-uk.md', uk: 'eu-uk.md', us: 'us.md', ca: 'americas.md', qc: 'americas.md', br: 'americas.md', mx: 'americas.md', ar: 'americas.md', cl: 'americas.md', co: 'americas.md', pe: 'americas.md', uy: 'americas.md', ec: 'americas.md', pa: 'americas.md', cr: 'americas.md' };
const regimeOf = cc => { cc = cc.toUpperCase(); if (EU.includes(cc) || EEA.includes(cc)) return `eu:${cc.toLowerCase()}`; if (cc === 'GB' || cc === 'UK') return 'uk'; return cc.toLowerCase(); };
const fileOf = r => FILE[r.split(':')[0]] || 'apac-mea.md';

const PHONE = { 1: 'US/CA', 20: 'EG', 27: 'ZA', 30: 'GR', 31: 'NL', 32: 'BE', 33: 'FR', 34: 'ES', 351: 'PT', 352: 'LU', 353: 'IE', 354: 'IS', 356: 'MT', 357: 'CY', 358: 'FI', 359: 'BG', 36: 'HU', 370: 'LT', 371: 'LV', 372: 'EE', 385: 'HR', 386: 'SI', 39: 'IT', 40: 'RO', 41: 'CH', 420: 'CZ', 421: 'SK', 423: 'LI', 43: 'AT', 44: 'GB', 45: 'DK', 46: 'SE', 47: 'NO', 48: 'PL', 49: 'DE',
  51: 'PE', 52: 'MX', 54: 'AR', 55: 'BR', 56: 'CL', 57: 'CO', 593: 'EC', 598: 'UY', 506: 'CR', 507: 'PA', 60: 'MY', 61: 'AU', 62: 'ID', 63: 'PH', 64: 'NZ', 65: 'SG', 66: 'TH', 81: 'JP', 82: 'KR', 84: 'VN', 852: 'HK', 86: 'CN', 90: 'TR', 91: 'IN', 234: 'NG', 254: 'KE', 971: 'AE', 966: 'SA', 974: 'QA', 972: 'IL' };
const CURRENCY = [[/R\$\s?\d|\bBRL\b/, 'BR'], [/C\$\s?\d|CA\$|\bCAD\b/, 'CA'], [/A\$\s?\d|AU\$|\bAUD\b/, 'AU'], [/NZ\$|\bNZD\b/, 'NZ'], [/MX\$|\bMXN\b/, 'MX'], [/S\$\s?\d|\bSGD\b/, 'SG'], [/HK\$|\bHKD\b/, 'HK'], [/US\$|\bUSD\b|(?<![A-Z]\$?)\$\s?\d/, 'US'],
  [/€\s?\d|\d\s?€|\bEUR\b/, 'EU'], [/£\s?\d|\bGBP\b/, 'GB'], [/\bCHF\b|Fr\.\s?\d/, 'CH'], [/₩|\bKRW\b/, 'KR'], [/₹|\bINR\b|\bRs\.?\s?\d/, 'IN'], [/\bJPY\b|¥\s?\d|\d\s?円/, 'JP'], [/\bCNY\b|\bRMB\b|\d\s?元/, 'CN'], [/₺|\bTRY\b/, 'TR'], [/\bZAR\b|\bR\s\d{2,}/, 'ZA'], [/₦|\bNGN\b/, 'NG'], [/\bKES\b|\bKSh/, 'KE'], [/\bAED\b|د\.إ/, 'AE'], [/\bSAR\b|ر\.س/, 'SA'], [/\bQAR\b/, 'QA'], [/₪|\bILS\b|\bNIS\b/, 'IL'], [/\bCOP\b/, 'CO'], [/\bCLP\b/, 'CL'], [/\bARS\b/, 'AR'], [/S\/\s?\d|\bPEN\b/, 'PE'], [/\bUYU\b/, 'UY']];
const COUNTRY_WORDS = { US: /united states|\busa\b|estados unidos|états-unis|new york|california|texas/i, GB: /united kingdom|\buk\b|england|london|reino unido/i, CA: /\bcanada\b|toronto|montr[eé]al|vancouver|qu[eé]bec/i, BR: /\bbrasil\b|\bbrazil\b|são paulo|rio de janeiro/i, MX: /m[eé]xico|ciudad de m[eé]xico|cdmx/i, AR: /argentina|buenos aires/i, CL: /\bchile\b|santiago de chile/i, CO: /colombia|bogot[aá]|medell[ií]n/i, PE: /\bper[uú]\b|\blima\b/i,
  ES: /españa|\bspain\b|madrid|barcelona|valencia|sevilla|bilbao/i, DE: /deutschland|germany|berlin|münchen|munich|hamburg/i, FR: /\bfrance\b|paris|lyon/i, IT: /\bitalia\b|\bitaly\b|milano|roma\b/i, PT: /portugal|lisboa|porto\b/i, NL: /nederland|netherlands|amsterdam/i, CH: /schweiz|suisse|svizzera|switzerland|zürich|zurich|genève|geneva/i, AT: /österreich|austria|wien|vienna/i,
  AU: /australia|sydney|melbourne/i, NZ: /new zealand|auckland/i, JP: /japan|日本|東京|tokyo/i, KR: /korea|대한민국|서울|seoul/i, CN: /中国|china\b|上海|北京|shanghai|beijing/i, SG: /singapore/i, IN: /\bindia\b|mumbai|bangalore|bengaluru|delhi/i, AE: /dubai|abu dhabi|united arab emirates|\buae\b/i, SA: /saudi|riyadh|jeddah/i, IL: /israel|tel aviv/i, TR: /türkiye|turkey|istanbul|ankara/i, ZA: /south africa|cape town|johannesburg/i, NG: /nigeria|lagos|abuja/i, KE: /kenya|nairobi/i };
const LANG_REGION = { 'pt-br': 'BR', 'fr-ca': 'QC', 'en-ca': 'CA', 'en-us': 'US', 'en-gb': 'GB', 'es-mx': 'MX', 'es-ar': 'AR', 'es-cl': 'CL', 'es-co': 'CO', 'es-pe': 'PE', 'es-uy': 'UY', 'es-ec': 'EC', 'en-au': 'AU', 'en-nz': 'NZ', 'en-in': 'IN', 'en-sg': 'SG', 'zh-cn': 'CN', 'zh-hk': 'HK', 'zh-tw': 'TW', ja: 'JP', ko: 'KR', tr: 'TR', he: 'IL', th: 'TH', vi: 'VN', id: 'ID', ms: 'MY' };
const CCTLD = { br: 'BR', mx: 'MX', ar: 'AR', cl: 'CL', co: 'CO', pe: 'PE', uy: 'UY', ec: 'EC', ca: 'CA', us: 'US', uk: 'GB', au: 'AU', nz: 'NZ', jp: 'JP', kr: 'KR', cn: 'CN', hk: 'HK', sg: 'SG', in: 'IN', ae: 'AE', sa: 'SA', qa: 'QA', il: 'IL', tr: 'TR', za: 'ZA', ng: 'NG', ke: 'KE', eg: 'EG', ch: 'CH', my: 'MY', th: 'TH', ph: 'PH', vn: 'VN', id: 'ID', pa: 'PA', cr: 'CR' };

const browser = await chromium.launch(), page = await browser.newPage();
const out = { site: base.origin, date: new Date().toISOString(), pages: [], hreflang: [], languageLinks: [], signals: {}, suggestedRegimes: [] };
const S = { currencies: new Set(), phonePrefixes: new Set(), countriesMentioned: new Set(), shippingCountries: new Set(), chatWidgets: new Set(),
  commerce: [], subscription: [], accounts: [], ugc: [], aiChat: [], video: [], healthTerms: [], kidsTerms: [] };
for (const r of routes) {
  try { await page.goto(new URL(r, base).href, { waitUntil: 'networkidle', timeout: 45000 }); } catch (e) { out.pages.push({ route: r, error: e.message.split('\n')[0] }); continue; }
  const d = await page.evaluate(() => ({
    htmlLang: document.documentElement.lang || null, title: document.title,
    hreflang: [...document.querySelectorAll('link[rel=alternate][hreflang]')].map(l => ({ lang: l.hreflang, href: l.href })),
    langLinks: [...document.querySelectorAll('a[hreflang], a[lang], [class*=lang] a, [id*=lang] a, nav a')].map(a => ({ text: a.innerText.trim().slice(0, 20), href: a.getAttribute('href'), hreflang: a.hreflang || a.lang || '' }))
      .filter(a => a.hreflang || /^(en|es|fr|de|it|pt|nl|ca|eu|gl|ja|ko|zh|ar|he|tr|english|español|français|deutsch|italiano|português|català|日本語|한국어|中文)$/i.test(a.text)),
    text: document.body.innerText,
    selects: [...document.querySelectorAll('select')].map(s => ({ name: s.name || s.id, options: [...s.options].map(o => o.text.trim()).slice(0, 300) })),
    scripts: [...document.scripts].map(s => s.src).filter(Boolean),
    iframes: [...document.querySelectorAll('iframe')].map(f => f.src),
    hasPassword: !!document.querySelector('input[type=password]'), hasVideo: !!document.querySelector('video'),
    textareas: [...document.querySelectorAll('textarea')].map(t => t.name || t.id || t.placeholder || ''),
  }));
  out.pages.push({ route: r, htmlLang: d.htmlLang, title: d.title });
  for (const h of d.hreflang) if (!out.hreflang.some(x => x.lang === h.lang)) out.hreflang.push(h);
  for (const l of d.langLinks) if (!out.languageLinks.some(x => x.href === l.href)) out.languageLinks.push(l);
  const t = d.text;
  for (const [re, cc] of CURRENCY) if (re.test(t)) S.currencies.add(cc);
  for (const m of t.matchAll(/(?:\+|00)\s?(\d{1,3})[\s.\-()]*\d{2,}/g)) {
    const digits = m[1]; const k = [digits.slice(0, 3), digits.slice(0, 2), digits.slice(0, 1)].find(p => PHONE[p]); if (k) S.phonePrefixes.add(`+${k} ${PHONE[k]}`);
  }
  for (const [cc, re] of Object.entries(COUNTRY_WORDS)) if (re.test(t)) S.countriesMentioned.add(cc);
  for (const s of d.selects) if (s.options.length > 20 && s.options.some(o => /spain|españa|germany|united states|france|brasil|canada/i.test(o))) s.options.forEach(o => S.shippingCountries.add(o));
  const flag = (bucket, re, src = t) => { const m = src.match(re); if (m && S[bucket].length < 5) S[bucket].push(`${r}: "${m[0].slice(0, 50)}"`); };
  flag('commerce', /add to (cart|bag|basket)|añadir al carrito|comprar ahora|buy now|checkout|finalizar compra|pagar ahora|in den warenkorb|ajouter au panier|aggiungi al carrello|adicionar ao carrinho|カートに入れる|장바구니|加入购物车/i);
  flag('commerce', /\/(cart|checkout|carrito|warenkorb|panier|carrello|carrinho|shop|tienda)\b/i, d.scripts.join(' ') + ' ' + d.langLinks.map(l => l.href).join(' '));
  flag('subscription', /per month|\/month|\/mo\b|al mes|\/mes|mensual|monthly plan|subscription|suscripción|abonnement|abonnieren|abbonamento|assinatura|月額|구독/i);
  if (d.hasPassword) S.accounts.push(`${r}: password field`); else flag('accounts', /\b(log ?in|sign ?in|sign ?up|create account|iniciar sesión|registrarse|mi cuenta|my account|anmelden|connexion|accedi|entrar|ログイン|로그인|登录)\b/i);
  flag('ugc', /leave a (comment|review)|write a review|deja (un|tu) comentario|escribe una reseña|kommentar schreiben|laisser un commentaire|lascia un commento|deixe um comentário|upload (your|a) (file|photo)/i);
  if (d.textareas.some(n => /comment|review|reseña|comentario/i.test(n))) S.ugc.push(`${r}: comment/review field`);
  for (const s of [...d.scripts, ...d.iframes]) { const m = s.match(/intercom|drift|crisp|tawk|zendesk|zdassets|livechat|olark|tidio|freshchat|hubspot|usemessages|voiceflow|chatbase|botpress|landbot|manychat|chatling|dante-ai|openai|anthropic/i); if (m) S.chatWidgets.add(m[0].toLowerCase()); }
  flag('aiChat', /\b(ai assistant|ai chat|chatbot|asistente virtual|asistente (de )?ia|assistant (virtuel|ia)|ki-assistent|assistente (virtuale|ia)|ask our ai|powered by (gpt|openai|claude|anthropic))\b/i);
  if (d.hasVideo || d.iframes.some(s => /youtube|vimeo|wistia/.test(s))) S.video.push(`${r}: video player`);
  flag('healthTerms', /\b(clinic|clínica|clinique|klinik|therapy|terapia|thérapie|therapie|patient|paciente|health|salud|santé|gesundheit|salute|saúde|pregnan|embarazo|mental health|salud mental|dentist|dentista|fertility|fertilidad|psycholog|psicólog|medical|médic)/i);
  flag('kidsTerms', /\b(kids|children|niños|niñas|infantil|enfants|kinder|bambini|crianças|teen|teens|adolescentes|toys|juguetes|school|colegio|escuela)\b/i);
}
await browser.close();

// Suggested regimes with reasons
const why = {}; const add = (cc, reason) => { const r = regimeOf(cc); (why[r] ||= new Set()).add(reason); };
const tld = base.hostname.split('.').pop(); const tldCC = CCTLD[tld] || (EU.includes(tld.toUpperCase()) ? tld.toUpperCase() : null);
if (tldCC) add(tldCC, `ccTLD .${tld}`);
for (const h of out.hreflang) { const l = h.lang.toLowerCase(); if (l === 'x-default') continue; const cc = LANG_REGION[l] || (l.includes('-') ? l.split('-')[1].toUpperCase() : LANG_REGION[l]); if (cc) add(cc, `hreflang ${h.lang}`); }
for (const p of out.pages) { const l = (p.htmlLang || '').toLowerCase(); const cc = LANG_REGION[l] || (l.includes('-') ? l.split('-')[1].toUpperCase() : null); if (cc) add(cc, `html lang ${p.htmlLang}`); }
for (const c of S.currencies) if (c !== 'EU') add(c, `prices in ${c} currency`);
if (S.currencies.has('EU')) why['eu'] = new Set([...(why['eu'] || []), 'prices in euro (which EU countries? check shipping/contact)']);
for (const p of S.phonePrefixes) { const cc = p.split(' ')[1]; if (cc === 'US/CA') { add('US', `phone ${p}`); } else add(cc, `phone ${p}`); }
for (const c of S.countriesMentioned) add(c, `mentions ${c} (office, clients or address?)`);
out.signals = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, [...v]]));
out.signals.ccTLD = tld;
out.suggestedRegimes = Object.entries(why).map(([regime, reasons]) => ({ regime, reference: regime === 'eu' ? 'eu-uk.md' : fileOf(regime), reason: [...reasons].join('; ') }))
  .sort((a, b) => b.reason.split(';').length - a.reason.split(';').length);
out.note = 'Suggestions only. Being reachable from a country is usually not enough; targeting is (language, currency, shipping, local contact, ads). Add the operator\'s home country and confirm the list with the client.';
const file = opt.out || 'scope.json';
writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`Suggested regimes → ${file}`);
for (const r of out.suggestedRegimes) console.log(`  ${r.regime.padEnd(6)} (${r.reference}): ${r.reason}`);
if (!out.suggestedRegimes.length) console.log('  no market signals found: rely on the client\'s answers (home country + target markets)');
console.log(`Features: commerce ${S.commerce.length ? 'yes' : 'no'} · subscription ${S.subscription.length ? 'yes' : 'no'} · accounts ${S.accounts.length ? 'yes' : 'no'} · user content ${S.ugc.length ? 'yes' : 'no'} · chat ${[...S.chatWidgets].join(',') || 'no'} · AI chat ${S.aiChat.length ? 'yes' : 'no'} · video ${S.video.length ? 'yes' : 'no'} · health terms ${S.healthTerms.length ? 'yes' : 'no'} · children terms ${S.kidsTerms.length ? 'yes' : 'no'}`);
