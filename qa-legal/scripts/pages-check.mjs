// pages-check.mjs: legal links on every page, forms (checkboxes, notice next to the form, marketing and SMS consent),
// accessibility overlays, chat widgets, obsolete legal references, and the identification data on the legal notice page.
// Usage: node pages-check.mjs <base-url> [/route ...] [--imprint=/legal-notice] [--out=pages.json]
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v = true] = a.slice(2).split('='); return [k, v]; }));
const pos = args.filter(a => !a.startsWith('--'));
if (!pos[0]) { console.error('Usage: node pages-check.mjs <base-url> [/route ...] [--imprint=/path] [--out=pages.json]'); process.exit(1); }
const origin = new URL(pos[0]).origin, routes = [new URL(pos[0]).pathname || '/', ...pos.slice(1)];

// Link text / href patterns (several languages). Matching on text OR href.
const LINKS = {
  privacy: /privacy|privacidad|privacidade|confidentialit|datenschutz|riservatezza|privacybeleid|aviso de privacidad|política de tratamiento|gizlilik|kvkk|プライバシー|個人情報|개인정보|隐私|פרטיות/i,
  cookies: /cookie|témoins|çerez|クッキー|쿠키/i,
  imprint: /impressum|aviso legal|legal notice|mentions l[eé]gales|note legali|colofon|imprint|informaci[oó]n legal|informa[cç][oõ]es legais|legal information|company information|offenlegung/i,
  terms: /terms|t[eé]rminos|condiciones|conditions|\bagb\b|\bcgv\b|\bcgu\b|termini|termos|voorwaarden|利用規約|이용약관|服务条款/i,
  cookieSettings: /cookie (settings|preferences)|manage cookies|configurar cookies|preferencias de cookies|gestionar cookies|param[eè]tres des cookies|g[eé]rer les cookies|cookie-einstellungen|impostazioni (dei )?cookie|prefer[eê]ncias de cookies|cookie-instellingen|privacy (settings|preferences)/i,
  privacyChoices: /do not sell|your (california )?privacy choices|opt[- ]out of (the )?(sale|sharing|targeted)|limit the use of my sensitive/i,
  healthPolicy: /consumer health data/i,
  accessibilityStatement: /accessibility|accesibilidad|accessibilit[eé]|barrierefreiheit|accessibilit[aà]|acessibilidade|toegankelijkheid|נגישות|アクセシビリティ|웹 접근성/i,
  whistleblowing: /whistleblow|canal (de )?denuncia|canal [eé]tico|canal interno|sistema interno de informaci[oó]n|hinweisgeber|lanceur d.alerte|segnalazion|whistleblowing|den[uú]ncia|klokkenluider|speak ?up/i,
  withdrawal: /withdraw from (the )?contract|desistir del contrato|vertrag (hier )?widerrufen|se r[eé]tracter du contrat|recedere dal contratto|desistir do contrato|herroepen|bot[oó]n de arrepentimiento|arrepentimiento/i,
  complaintsBook: /libro de reclamaciones|hojas? de reclamaci|bot[oó]n de baja|reclame aqui/i,
  commerceDisclosure: /特定商取引法|特商法|사업자 ?정보|电子商务|business information/i,
  odrLink: /ec\.europa\.eu\/consumers\/odr/i,
};
const MARKETING = /newsletter|marketing|promotion|promocion|publicidad|comunicaciones comerciales|ofertas|novedades|werbung|publicit[eé]|offres|promozion|novit[aà]|novidades|nieuwsbrief|aanbiedingen|メルマガ|メール配信|광고|마케팅|营销|commercial (emails|communications)|special offers/i;
const SMS = /\bsms\b|text messages?|mensajes de texto|whatsapp|\btexts\b/i;
const NOTICE = {
  controller: /responsable|controller|verantwortlich|titolare|controlador|respons[aá]vel|verwerkingsverantwoordelijke|we (collect|process)|s\.l\.|gmbh|ltd|inc\b/i,
  purpose: /finalidad|purpose|zweck|finalit[eéà]|finalidade|doeleinde|to (answer|respond|reply)|para (responder|atender|gestionar)/i,
  rights: /derechos|rights|rechte|droits|diritti|direitos|rechten|\barco\b/i,
};
const OVERLAYS = /acsbapp|accessibe|userway|audioeye|equalweb|max-access|enable\.co\.il|nagich|accessiblyapp|allyable|purpose ?ai|userway\.org/i;
const CHAT = /intercom|drift|crisp|tawk|zendesk|zdassets|livechat|olark|tidio|freshchat|hs-scripts|usemessages|voiceflow|chatbase|botpress|landbot|manychat|chatling/i;
const OBSOLETE = [
  [/privacy shield|escudo de privacidad|bouclier de protection des donn[eé]es|scudo per la privacy/i, 'Privacy Shield (invalidated 2020)'],
  [/safe harbou?r/i, 'Safe Harbor (invalidated 2015)'],
  [/directiva 95\/46|directive 95\/46|richtlinie 95\/46|direttiva 95\/46/i, 'Directive 95/46 (repealed by the GDPR)'],
  [/lopd 15\/1999|ley org[aá]nica 15\/1999|real decreto 1720\/2007/i, 'Spain LOPD 15/1999 (replaced by LOPDGDD 3/2018)'],
  [/§\s?5 tmg|telemediengesetz|\bttdsg\b/i, 'Germany TMG/TTDSG (now DDG/TDDDG since 14 May 2024)'],
  [/trading disclosures\) regulations 2008/i, 'UK Trading Disclosures Regs 2008 (revoked; now SI 2015/17)'],
  [/\bifai\b|\binai\b/i, 'Mexico IFAI/INAI (authority replaced in 2025)'],
  [/ec\.europa\.eu\/consumers\/odr|plataforma (europea )?de resoluci[oó]n de litigios en l[ií]nea|online[- ]streitbeilegung|odr platform/i, 'EU ODR platform link (duty ended 20 July 2025)'],
  [/ley 19\.628(?![^.]{0,80}21\.719)/i, 'Chile Ley 19.628 without Ley 21.719 (check after 1 Dec 2026)'],
];

const browser = await chromium.launch(), page = await browser.newPage({ locale: 'en-US' });
const out = { site: origin, date: new Date().toISOString(), pages: [] };
let imprintHref = opt.imprint ? new URL(opt.imprint, origin).href : null;

for (const r of routes) {
  try { await page.goto(new URL(r, origin).href, { waitUntil: 'networkidle', timeout: 45000 }); } catch (e) { out.pages.push({ route: r, error: e.message.split('\n')[0] }); continue; }
  const d = await page.evaluate(({ NOTICE_SRC }) => {
    const NOTICE = Object.fromEntries(Object.entries(NOTICE_SRC).map(([k, v]) => [k, new RegExp(v, 'i')]));
    const links = [...document.querySelectorAll('a[href]')].map(a => ({ text: (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 80), href: a.href, inFooter: !!a.closest('footer') }));
    const forms = [...document.querySelectorAll('form')].map(f => {
      const scope = f.parentElement || f;
      const nearby = (f.innerText + ' ' + scope.innerText).slice(0, 4000);
      const checkboxes = [...f.querySelectorAll('input[type=checkbox]')].map(c => ({ name: c.name, preChecked: c.checked, required: c.required,
        label: (c.labels?.[0]?.innerText || c.closest('label')?.innerText || c.getAttribute('aria-label') || '').trim().slice(0, 200) }));
      return { action: f.getAttribute('action'), checkboxes,
        phoneField: !!f.querySelector('input[type=tel], input[name*=phone i], input[name*=tel i], input[name*=movil i], input[name*=telefono i]'),
        noticeNearby: { controller: NOTICE.controller.test(nearby), purpose: NOTICE.purpose.test(nearby), rights: NOTICE.rights.test(nearby),
          privacyLink: !!scope.querySelector('a[href*=privac], a[href*=datenschutz], a[href*=confidential], a[href*=privacidad]') },
        nearbyText: nearby.replace(/\s+/g, ' ').slice(0, 600) };
    });
    return { links, forms, scripts: [...document.scripts].map(s => s.src).filter(Boolean), text: document.body.innerText, lang: document.documentElement.lang };
  }, { NOTICE_SRC: Object.fromEntries(Object.entries(NOTICE).map(([k, v]) => [k, v.source])) });
  const found = {};
  for (const [k, re] of Object.entries(LINKS)) { const l = d.links.find(l => re.test(l.text) || re.test(l.href)); found[k] = l ? { text: l.text, href: l.href, inFooter: l.inFooter } : null; }
  if (!imprintHref && found.imprint) imprintHref = found.imprint.href;
  const forms = d.forms.map(f => ({ ...f,
    marketingCheckbox: f.checkboxes.find(c => MARKETING.test(c.label)) || null,
    smsConsent: f.checkboxes.find(c => SMS.test(c.label)) || null,
    smsWording: SMS.test(f.nearbyText) }));
  out.pages.push({ route: r, lang: d.lang, links: found, forms,
    overlays: [...new Set(d.scripts.filter(s => OVERLAYS.test(s)).map(s => new URL(s).hostname))],
    chatWidgets: [...new Set(d.scripts.filter(s => CHAT.test(s)).map(s => new URL(s).hostname))],
    obsoleteRefs: OBSOLETE.filter(([re]) => re.test(d.text) || d.links.some(l => re.test(l.href))).map(([, label]) => label) });
}

// Identification data: legal notice page if found, otherwise the footer of the first page
const ID = {
  vatEU: /\b(ATU\d{8}|BE0?\d{9}|BG\d{9,10}|CY\d{8}[A-Z]|CZ\d{8,10}|DE\d{9}|DK\d{8}|EE\d{9}|EL\d{9}|ES[A-Z0-9]\d{7}[A-Z0-9]|FI\d{8}|FR[A-Z0-9]{2}\d{9}|HR\d{11}|HU\d{8}|IE\d{7}[A-Z]{1,2}|IT\d{11}|LT\d{9,12}|LU\d{8}|LV\d{11}|MT\d{8}|NL\d{9}B\d{2}|PL\d{10}|PT\d{9}|RO\d{2,10}|SE\d{12}|SI\d{8}|SK\d{10}|GB\d{9}|CHE[\d.]{11,15})\b/,
  nifES: /\b(NIF|CIF|N\.I\.F\.|C\.I\.F\.)[:\s]*([ABCDEFGHJNPQRSUVW][-\s]?\d{7}[-\s]?[0-9A-J]|\d{8}[-\s]?[A-Z]|[XYZ]\d{7}[A-Z])\b/i,
  handelsregisterDE: /\b(HRB|HRA|GnR|PR|VR)\s?\d{2,7}\b/,
  ustIdDE: /USt\.?-?Id(Nr)?\.?[^A-Z0-9]{0,6}DE\s?\d{9}/i,
  sirenFR: /\b(SIREN|SIRET)\b[^\d]{0,10}(\d{3}\s?\d{3}\s?\d{3}(\s?\d{5})?)/i,
  rcsFR: /\bRCS\s+[A-Za-zÀ-ÿ' -]{2,30}\s*(B|A)?\s*\d{3}\s?\d{3}\s?\d{3}/,
  pivaIT: /(P\.?\s?IVA|Partita IVA)[^\d]{0,10}(IT)?\s?\d{11}/i,
  companyNumberUK: /(company (registration )?(no\.?|number)|registered number|company reg\.? no\.?)[^\dA-Z]{0,10}([A-Z]{2}\d{6}|\d{8})/i,
  ukRegisteredIn: /registered in (england( and| &) wales|scotland|northern ireland|england)/i,
  abnAU: /\bABN[^\d]{0,5}\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/,
  cnpjBR: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/,
  cuitAR: /CUIT[^\d]{0,5}(20|23|24|27|30|33|34)-?\d{8}-?\d/i,
  rutCL: /\bRUT[^\d]{0,5}\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]/i,
  nitCO: /\bNIT[^\d]{0,5}\d{3}\.?\d{3}\.?\d{3}-?\d?/,
  rucPE: /\bRUC[^\d]{0,5}(10|15|17|20)\d{9}\b/,
  businessRegKR: /사업자\s?등록\s?번호[^\d]{0,5}\d{3}-\d{2}-\d{5}/,
  icpCN: /[京沪津渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼]ICP[备证]\d+/,
};
let idText = '', idSource = null;
if (imprintHref) { try { await page.goto(imprintHref, { waitUntil: 'networkidle', timeout: 45000 }); idText = await page.evaluate(() => document.body.innerText); idSource = imprintHref; } catch {} }
if (!idText) { await page.goto(new URL(routes[0], origin).href, { waitUntil: 'networkidle' }).catch(() => {}); idText = await page.evaluate(() => (document.querySelector('footer') || document.body).innerText).catch(() => ''); idSource = 'footer of ' + routes[0]; }
const m = re => (idText.match(re) || [null])[0];
out.identification = {
  source: idSource,
  email: m(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/), phone: m(/(?:\+|00)\s?\d{1,3}[\s.\-()]*\d[\d\s.\-()]{6,}\d/) || m(/\b\d{3}[\s.-]?\d{3}[\s.-]?\d{3,4}\b/),
  address: m(/(calle|c\/|avda\.?|avenida|plaza|paseo|carrer|stra(ss|ß)e|str\.|platz|weg\b|rue|avenue|boulevard|via|viale|piazza|rua|street|st\.|road|rd\.|lane|suite|\d{4,5}\s[A-ZÀ-Ý][a-zà-ÿ]+)[^\n]{0,80}/i),
  ids: Object.fromEntries(Object.entries(ID).map(([k, re]) => [k, m(re)]).filter(([, v]) => v)),
  commercialRegister: m(/registro mercantil[^\n]{0,120}|handelsregister[^\n]{0,80}|registergericht[^\n]{0,80}|amtsgericht[^\n]{0,60}|registro (delle )?imprese[^\n]{0,80}|companies house[^\n]{0,60}|firmenbuch[^\n]{0,60}|\bkvk\b[^\n]{0,40}|\brcs\b[^\n]{0,60}/i),
  directorOfPublication: m(/directeur (de la )?publication[^\n]{0,80}/i),
  hostingProvider: m(/(h[eé]bergeur|h[eé]bergement|hosted by|hosting provider|alojamiento web|servidor)[^\n]{0,120}/i),
  shareCapital: m(/(capital social|share capital|stammkapital|grundkapital|capitale sociale)[^\n]{0,60}/i),
  responsiblePerson: m(/(vertreten durch|gesch[aä]ftsf[uü]hrer|managing director|representante legal|administrador|g[eé]rant)[^\n]{0,80}/i),
  obsoleteRefs: OBSOLETE.filter(([re]) => re.test(idText)).map(([, label]) => label),
};
await browser.close();
const file = opt.out || 'pages.json';
writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`→ ${file}`);
for (const p of out.pages) {
  if (p.error) { console.log(`${p.route}: ${p.error}`); continue; }
  const missing = ['privacy', 'cookies', 'imprint', 'cookieSettings'].filter(k => !p.links[k]);
  const pre = p.forms.flatMap(f => f.checkboxes.filter(c => c.preChecked).map(c => c.name || c.label.slice(0, 30)));
  console.log(`${p.route}: missing links [${missing.join(', ')}] · forms ${p.forms.length}${pre.length ? ` · PRE-CHECKED: ${pre.join(', ')}` : ''}${p.overlays.length ? ` · overlay ${p.overlays}` : ''}${p.obsoleteRefs.length ? ` · obsolete: ${p.obsoleteRefs.join('; ')}` : ''}`);
}
console.log(`identification (${out.identification.source}): email ${out.identification.email || '—'} · ids ${JSON.stringify(out.identification.ids)}${out.identification.obsoleteRefs.length ? ` · obsolete: ${out.identification.obsoleteRefs.join('; ')}` : ''}`);
