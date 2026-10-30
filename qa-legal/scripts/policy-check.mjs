// policy-check.mjs: reads the privacy policy (and cookie policy) and checks, per regime, which required items are mentioned.
// Cross-checks the third parties seen in the browser (consent-*.json) against the vendors the policy names.
// Usage: node policy-check.mjs <privacy-policy-url> [--cookies=<cookie-policy-url>] [--regimes=gdpr,uk,us-ca,us,ch,br,ca,qc,au]
//                              [--consent=consent-es-ES.json,consent-en-US.json] [--out=policy.json]
// A keyword match only shows the topic is mentioned, not that it is correct or complete: read the policy for every regime.
// Regimes without an automatic checklist are listed as "manual".
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v = true] = a.slice(2).split('='); return [k, v]; }));
const url = args.find(a => !a.startsWith('--'));
if (!url) { console.error('Usage: node policy-check.mjs <privacy-policy-url> [--cookies=url] [--regimes=gdpr,us-ca] [--consent=consent.json] [--out=policy.json]'); process.exit(1); }
const regimes = (opt.regimes || 'gdpr').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

// Item checklists. Each regex covers English plus the main languages of the regime.
const R = s => new RegExp(s, 'i');
const GDPR = {
  controller: ['Controller identity', R('controller|responsable del tratamiento|responsable du traitement|verantwortlich|titolare del trattamento|controlador|respons[aá]vel pelo tratamento|verwerkingsverantwoordelijke|who (we are|is responsible)|identidad del responsable')],
  contact: ['Controller contact (email)', R('[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+')],
  dpo: ['DPO contact (if appointed)', R('data protection officer|\\bDPO\\b|delegad[oa] de protecci[oó]n de datos|d[eé]l[eé]gu[eé] [aà] la protection|datenschutzbeauftragt|responsabile (della )?protezione dei dati|encarregad[oa]|functionaris gegevensbescherming')],
  purposes: ['Purposes', R('purpose|finalidad|finalit[eé]|zweck|finalit[aà]|finalidade|doeleinde|para qu[eé] (usamos|tratamos)')],
  legalBasis: ['Legal basis per purpose', R('legal basis|lawful basis|art(icle|\\.)\\s?6|base jur[ií]dica|legitimaci[oó]n|base l[eé]gale|fondement juridique|rechtsgrundlage|base giuridica|base legal|grondslag')],
  legitimateInterest: ['Specific legitimate interest (if relied on)', R('legitimate interest|inter[eé]s leg[ií]timo|int[eé]r[eê]t l[eé]gitime|berechtigte[sn]? interesse|legittimo interesse|interesse leg[ií]timo|gerechtvaardigd belang')],
  recipients: ['Recipients and processors', R('recipient|processor|destinatari|encargad[oa]s? del tratamiento|sous-traitant|empf[aä]nger|auftragsverarbeit|responsabil[ei] del trattamento|operador|ontvanger|verwerker|service providers?|proveedores')],
  transfers: ['International transfers', R('third countr|international transfer|outside the (eea|eu|european|uk)|transferencias? internacional|transferts? (de donn[eé]es )?(hors|vers)|drittl[aä]nd|drittstaat|paesi terzi|trasferimento|transfer[eê]ncia internacional|derde landen|united states|estados unidos|[eé]tats-unis|usa\\b')],
  safeguard: ['Transfer safeguard (DPF, adequacy or SCCs)', R('standard contractual clauses|\\bSCCs?\\b|data privacy framework|adequacy|cl[aá]usulas contractuales tipo|clauses contractuelles types|standardvertragsklauseln|clausole contrattuali (standard|tipo)|decisi[oó]n de adecuaci[oó]n|d[eé]cision d.ad[eé]quation|angemessenheitsbeschluss|marco de privacidad de datos|cl[aá]usulas-padr[aã]o')],
  retention: ['Retention period or criteria', R('retention|retain|kept for|conservaci[oó]n|conservar|plazo|dur[eé]e de conservation|speicherdauer|aufbewahr|gespeichert|conservazione|conserva[cç][aã]o|bewaartermijn|bewaren')],
  rights: ['Rights (access, rectification, erasure, objection, portability…)', R('(access|acceso|acc[eè]s|auskunft|accesso|acesso|inzage).{0,80}(rectif|correct|berichtigung|rettific|retific|erasure|delet|supresi|effacement|l[oö]schung|cancellazione|elimina)')],
  withdrawConsent: ['Right to withdraw consent', R('withdraw (your )?consent|retirar (el|su|tu) consentimiento|retirer (votre |son )?consentement|widerruf|revocare (il )?consenso|revogar|intrekken')],
  complaintAuthority: ['Right to complain to a supervisory authority', R('supervisory authority|lodge a complaint|AEPD|CNIL|\\bICO\\b|Garante|Datenschutzbeh[oö]rde|Aufsichtsbeh[oö]rde|autoridad de control|autorit[eé] de contr[oô]le|autorit[aà] di controllo|autoridade de controlo|Autoriteit Persoonsgegevens|CNPD|reclamaci[oó]n|r[eé]clamation|beschwerde|reclamo')],
  mandatoryData: ['Whether data is mandatory and consequences', R('mandatory|obligatori|obligatoire|pflicht|obbligatori|obrigat[oó]ri|verplicht|required (fields|information)|if you do not provide')],
  automatedDecisions: ['Automated decisions / profiling', R('automated decision|profiling|decisiones automatizadas|elaboraci[oó]n de perfiles|d[eé]cision automatis[eé]e|profilage|automatisierte entscheidung|profiling|decisioni automatizzate|decis[oõ]es automatizadas|geautomatiseerde besluit')],
  cookies: ['Cookies / similar technologies explained or linked', R('cookie|t[eé]moins|local ?storage|pixel|tracking technolog')],
};
const CHECKLISTS = {
  gdpr: GDPR,
  uk: { ...GDPR,
    ico: ['ICO named as the complaint authority', R("\\bICO\\b|information commissioner")],
    controllerComplaint: ['Complaint route to the controller (DUAA s.103, from 19 Jun 2026)', R('complain(t)? (to us|directly to us)|make a complaint to us|contact us .{0,60}complain|our complaints (process|procedure)')] },
  'us-ca': {
    categories: ['Categories of personal information', R('categories of (personal )?information')],
    sources: ['Categories of sources', R('sources? (of|from which)|we (collect|obtain) .{0,40}from')],
    saleShare: ['Sale / sharing / targeted ads disclosure', R('(sell|share|sold|shared).{0,40}personal (information|data)|cross[- ]context behavio(u)?ral|targeted advertising')],
    rightsList: ['Rights: know, delete, correct, opt out, limit, non-retaliation', R('right to (know|delete|correct|opt[- ]out)')],
    howToExercise: ['How to exercise rights (methods, verification, agents)', R('authori[sz]ed agent|submit a request|toll[- ]free|verify your (identity|request)')],
    optOutSignals: ['How opt-out preference signals (GPC) are processed', R('global privacy control|\\bGPC\\b|opt[- ]out preference signal')],
    limitSensitive: ['Sensitive personal information use', R('sensitive personal information')],
    under16: ['Knowledge of selling/sharing PI of under-16s', R('under (the age of )?16|minors under 16|younger than 16')],
    doNotTrack: ['Response to Do Not Track (CalOPPA)', R('do not track|\\bDNT\\b')],
    thirdPartyTracking: ['Third parties may track across sites (CalOPPA)', R('third part(y|ies).{0,120}(over time|across (different |other )?(web)?sites|online services)')],
    changes: ['How users are told about changes', R('changes to (this|our) (privacy )?(policy|notice)|we (may )?update this')],
    retention: ['Retention per category', R('retain|retention')],
  },
  us: {
    categories: ['Categories of PII and third parties (CalOPPA)', R('categories of (personal|personally identifiable) information|third part(y|ies)')],
    doNotTrack: ['Response to Do Not Track (CalOPPA)', R('do not track|\\bDNT\\b')],
    thirdPartyTracking: ['Third parties may track across sites (CalOPPA)', R('third part(y|ies).{0,120}(over time|across (different |other )?(web)?sites)')],
    changes: ['How users are told about changes (CalOPPA)', R('changes to (this|our) (privacy )?(policy|notice)')],
    stateRights: ['US state privacy rights section', R('your (state |california |us )?privacy rights|right to (know|delete|correct|opt[- ]out)|appeal')],
    optOutSignals: ['Opt-out preference signals (GPC)', R('global privacy control|\\bGPC\\b|opt[- ]out preference signal')],
  },
  ch: {
    controller: ['Controller identity and contact', R('controller|verantwortlich|responsable du traitement|titolare|verantwortliche stelle')],
    purposes: ['Purposes', R('purpose|zweck|finalit')],
    recipients: ['Recipients or categories', R('recipient|empf[aä]nger|destinataire|destinatari|auftragsbearbeiter|sous-traitant')],
    transferCountries: ['States of transfer named', R('united states|usa\\b|vereinigte staaten|[eé]tats-unis|stati uniti|ausland|abroad|[aà] l.[eé]tranger')],
    transferSafeguard: ['Safeguard or exception for transfers', R('swiss-u\\.?s\\.? data privacy framework|data privacy framework|standard(vertrags)?klauseln|standard contractual clauses|clauses contractuelles types|angemessen')],
    optOut: ['How to refuse cookies / object (TCA art. 45c)', R('refuse|ablehnen|widersprechen|opt[- ]out|refuser|s.opposer|rifiutare|opporsi')],
  },
  br: {
    controlador: ['Controller identity', R('controlador')],
    encarregado: ['Encarregado (DPO) name and contact', R('encarregad[oa]|\\bDPO\\b')],
    finalidades: ['Purposes', R('finalidade')],
    baseLegal: ['Legal basis per purpose', R('base legal|hip[oó]tese')],
    compartilhamento: ['Sharing / recipients', R('compartilh')],
    transferencia: ['International transfer', R('transfer[eê]ncia internacional|exterior|estados unidos')],
    direitos: ['Data subject rights (art. 18)', R('direitos do titular|art\\.? ?18|confirma[cç][aã]o da exist[eê]ncia')],
    retencao: ['Retention', R('reten[cç][aã]o|armazen|prazo')],
    anpd: ['ANPD / complaint', R('ANPD|Autoridade Nacional')],
    cookies: ['Cookies', R('cookie')],
  },
  ca: {
    accountable: ['Accountable person / privacy officer', R('privacy officer|accountable|responsable de la protection')],
    purposes: ['Specific purposes', R('purpose|fins')],
    thirdParties: ['Third parties', R('third part|service provider|tiers')],
    foreign: ['Processing outside Canada', R('outside (of )?canada|united states|[eé]tats-unis|foreign jurisdiction|hors du (canada|qu[eé]bec)')],
    access: ['Access and correction', R('access .{0,40}correct|acc[eè]s .{0,40}rectific')],
    complaint: ['Complaint route (OPC)', R('privacy commissioner|commissariat|complaint|plainte')],
  },
  qc: {
    officer: ['Person in charge: title and contact', R('responsable de la protection des renseignements personnels')],
    fins: ['Purposes (fins)', R('\\bfins\\b|finalit')],
    moyens: ['Means of collection', R('moyens? de collecte|nous recueillons')],
    droits: ['Rights of access and rectification', R("droit d.acc[eè]s|rectification")],
    exterieur: ['Communication outside Quebec', R('ext[eé]rieur du qu[eé]bec|hors du qu[eé]bec')],
    technologies: ['Technologies that identify, locate or profile', R('t[eé]moins|cookies|technologie')],
    plainte: ['Complaint process', R('plainte|commission d.acc[eè]s')],
  },
  au: {
    kinds: ['Kinds of personal information', R('kinds of personal information|types of personal information|personal information we collect')],
    howCollected: ['How it is collected and held', R('how we collect|how (we )?hold|stor(e|age)')],
    purposes: ['Purposes', R('purpose')],
    access: ['Access and correction', R('access .{0,60}correct')],
    complaints: ['Complaints process (and OAIC)', R('complain|OAIC')],
    overseas: ['Overseas disclosure and countries', R('overseas|outside australia|united states')],
  },
};
// Vendor dictionary: hosts seen in the browser → names to look for in the policy
const VENDORS = [
  ['Google', /google|gstatic|doubleclick|youtube|ytimg|googletagmanager|recaptcha/i, /google|youtube|recaptcha/i],
  ['Meta / Facebook', /facebook|fbcdn|instagram/i, /meta|facebook|instagram/i],
  ['LinkedIn', /linkedin|licdn/i, /linkedin/i], ['TikTok', /tiktok/i, /tiktok/i], ['Microsoft (Clarity/Bing)', /clarity\.ms|bing\.com|microsoft/i, /microsoft|clarity|bing/i],
  ['Hotjar', /hotjar/i, /hotjar/i], ['Vercel', /vercel/i, /vercel/i], ['Cloudflare', /cloudflare/i, /cloudflare/i], ['HubSpot', /hubspot|hs-scripts|usemessages/i, /hubspot/i],
  ['Mailchimp', /mailchimp|list-manage|chimpstatic/i, /mailchimp|intuit/i], ['Intercom', /intercom/i, /intercom/i], ['Crisp', /crisp/i, /crisp/i], ['Tawk.to', /tawk/i, /tawk/i],
  ['Zendesk', /zendesk|zdassets/i, /zendesk/i], ['Vimeo', /vimeo/i, /vimeo/i], ['Calendly', /calendly/i, /calendly/i], ['Typeform', /typeform/i, /typeform/i],
  ['Adobe Fonts', /typekit/i, /adobe|typekit/i], ['Pinterest', /pinterest|pinimg/i, /pinterest/i], ['X / Twitter', /twitter|twimg|x\.com/i, /twitter|\bX\b/],
  ['Matomo', /matomo|piwik/i, /matomo|piwik/i], ['Plausible', /plausible/i, /plausible/i], ['PostHog', /posthog/i, /posthog/i], ['Segment', /segment\./i, /segment/i],
  ['Mixpanel', /mixpanel/i, /mixpanel/i], ['FullStory', /fullstory/i, /fullstory/i], ['LogRocket', /logrocket/i, /logrocket/i], ['hCaptcha', /hcaptcha/i, /hcaptcha/i],
  ['Mapbox', /mapbox/i, /mapbox/i], ['Unsplash', /unsplash/i, /unsplash/i], ['jsDelivr', /jsdelivr/i, /jsdelivr/i], ['unpkg', /unpkg/i, /unpkg/i],
];
const COUNTRIES = /united states|\busa\b|\bu\.s\.\b|estados unidos|ee\.?\s?uu|[eé]tats-unis|vereinigte staaten|stati uniti|united kingdom|reino unido|royaume-uni|vereinigtes k[oö]nigreich|switzerland|suiza|suisse|schweiz|canada|canad[aá]|brazil|brasil|india|china|japan|jap[oó]n|singapore|australia|ireland|irlanda|irlande|israel/gi;
const OBSOLETE = /privacy shield|escudo de privacidad|bouclier de protection|safe harbou?r|directiva 95\/46|directive 95\/46|richtlinie 95\/46|lopd 15\/1999|ley org[aá]nica 15\/1999|telemediengesetz|\bttdsg\b|ec\.europa\.eu\/consumers\/odr/gi;
const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  janvier: 1, 'février': 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, 'août': 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, 'décembre': 12, decembre: 12,
  januar: 1, februar: 2, 'märz': 3, maerz: 3, juni: 6, juli: 7, oktober: 10, dezember: 12,
  gennaio: 1, febbraio: 2, aprile: 4, maggio: 5, giugno: 6, luglio: 7, settembre: 9, ottobre: 10, dicembre: 12,
  janeiro: 1, fevereiro: 2, 'março': 3, marco: 3, maio: 5, junho: 6, julho: 7, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };

function lastUpdated(t) {
  const lead = /(last (updated|modified|revised)|effective( date| as of| from)?|updated( on)?|[uú]ltima (actualizaci[oó]n|modificaci[oó]n|atualiza[cç][aã]o|revis[aã]o)|fecha de (actualizaci[oó]n|entrada en vigor)|derni[eè]re mise [aà] jour|mise [aà] jour( le)?|stand|zuletzt (aktualisiert|ge[aä]ndert)|ultimo aggiornamento|aggiornat[ao] (il|al)|vers[aã]o|versi[oó]n|bijgewerkt( op)?|laatst gewijzigd)\s*[:\-–]?\s*/i;
  const m = t.match(new RegExp(lead.source + '(.{0,40})', 'i'));
  if (!m) return null;
  const s = m[m.length - 1];
  let d = s.match(/(\d{4})-(\d{2})-(\d{2})/); if (d) return { text: m[0].trim(), date: `${d[1]}-${d[2]}-${d[3]}` };
  d = s.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/); if (d) return { text: m[0].trim(), date: `${d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}`, note: 'read as day/month/year' };
  d = s.match(/([A-Za-zÀ-ÿ]+)\s+(\d{1,2}),?\s+(\d{4})/); if (d && MONTHS[d[1].toLowerCase()]) return { text: m[0].trim(), date: `${d[3]}-${String(MONTHS[d[1].toLowerCase()]).padStart(2, '0')}-${d[2].padStart(2, '0')}` };
  d = s.match(/(\d{1,2})\.?\s+(?:de\s+)?([A-Za-zÀ-ÿ]+)\s+(?:de\s+)?(\d{4})/); if (d && MONTHS[d[2].toLowerCase()]) return { text: m[0].trim(), date: `${d[3]}-${String(MONTHS[d[2].toLowerCase()]).padStart(2, '0')}-${d[1].padStart(2, '0')}` };
  d = s.match(/([A-Za-zÀ-ÿ]+)\s+(?:de\s+)?(\d{4})/); if (d && MONTHS[d[1].toLowerCase()]) return { text: m[0].trim(), date: `${d[2]}-${String(MONTHS[d[1].toLowerCase()]).padStart(2, '0')}-01`, note: 'month only' };
  return { text: m[0].trim(), date: null };
}

const browser = await chromium.launch(), page = await browser.newPage();
const read = async u => { await page.goto(u, { waitUntil: 'networkidle', timeout: 45000 }); return { text: await page.evaluate(() => document.body.innerText), lang: await page.evaluate(() => document.documentElement.lang) }; };
let policy; try { policy = await read(new URL(url).href); } catch (e) { console.error(`Could not load ${url}: ${e.message.split('\n')[0]}`); process.exit(2); }
let cookieText = '';
if (opt.cookies) { try { cookieText = (await read(new URL(opt.cookies, url).href)).text; } catch {} }
await browser.close();
const text = policy.text + '\n' + cookieText;

const out = { policyUrl: url, cookiePolicyUrl: opt.cookies || null, lang: policy.lang, chars: policy.text.length, date: new Date().toISOString() };
const lu = lastUpdated(policy.text);
out.lastUpdated = lu; out.ageDays = lu?.date ? Math.round((Date.now() - Date.parse(lu.date)) / 864e5) : null;
out.items = {};
for (const reg of regimes) {
  const list = CHECKLISTS[reg];
  if (!list) { out.items[reg] = 'manual: no automatic checklist for this regime; read the policy against the reference file'; continue; }
  out.items[reg] = Object.entries(list).map(([id, [label, re]]) => {
    const m = text.match(re); const i = m ? m.index : -1;
    return { id, label, found: !!m, evidence: m ? text.slice(Math.max(0, i - 50), i + 90).replace(/\s+/g, ' ').trim() : null };
  });
}
// Vendors seen in the browser vs vendors named in the policy
const hosts = new Set();
for (const f of (opt.consent ? String(opt.consent).split(',') : [])) {
  if (!existsSync(f)) { console.error(`(skipping ${f}: not found)`); continue; }
  const c = JSON.parse(readFileSync(f, 'utf8'));
  for (const mode of ['no-interaction', 'reject', 'accept', 'gpc']) for (const r of c[mode]?.thirdPartyRequests || []) hosts.add(r.host);
}
const detected = VENDORS.filter(([, hostRe]) => [...hosts].some(h => hostRe.test(h)));
out.vendors = { hostsSeen: [...hosts], detected: detected.map(v => v[0]), named: VENDORS.filter(([, , nameRe]) => nameRe.test(text)).map(v => v[0]),
  missingFromPolicy: detected.filter(([, , nameRe]) => !nameRe.test(text)).map(v => v[0]),
  unknownHosts: [...hosts].filter(h => !VENDORS.some(([, hostRe]) => hostRe.test(h))) };
out.transfers = { countriesNamed: [...new Set((text.match(COUNTRIES) || []).map(s => s.toLowerCase()))] };
out.obsoleteRefs = [...new Set((text.match(OBSOLETE) || []).map(s => s.toLowerCase()))];
const file = opt.out || 'policy.json';
writeFileSync(file, JSON.stringify(out, null, 1));

console.log(`${url} · lang ${out.lang || '?'} · ${out.chars} chars · last updated ${lu?.date || 'not found'}${out.ageDays != null ? ` (${out.ageDays} days ago)` : ''} → ${file}`);
for (const [reg, items] of Object.entries(out.items)) {
  if (typeof items === 'string') { console.log(`  ${reg}: ${items}`); continue; }
  const miss = items.filter(i => !i.found).map(i => i.id);
  console.log(`  ${reg}: ${items.length - miss.length}/${items.length} topics mentioned${miss.length ? ` · not found: ${miss.join(', ')}` : ''}`);
}
if (out.vendors.missingFromPolicy.length) console.log(`  vendors seen but not named: ${out.vendors.missingFromPolicy.join(', ')}`);
if (out.obsoleteRefs.length) console.log(`  obsolete references: ${out.obsoleteRefs.join(', ')}`);
