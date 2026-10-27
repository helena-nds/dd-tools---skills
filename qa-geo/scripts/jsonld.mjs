// jsonld.mjs: extracts and validates JSON-LD from the served HTML (no JS). Checks syntax, @context, properties per type
// (Organization, LocalBusiness and subtypes, WebSite, Service, FAQPage, BreadcrumbList, Article, Person), absolute URLs,
// that what is marked up is visible on the page, and NAP consistency (name, address, phone) across pages and with the visible text.
// Usage: node jsonld.mjs <url1> [url2 ...]   |   node jsonld.mjs --pages seo-out/pages.jsonl   [--home https://.../]
// Output: JSON { pages, nap, issues }.
import * as cheerio from 'cheerio';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
let urls = args.filter(a => /^https?:/.test(a) && args[args.indexOf(a) - 1] !== '--home');
const pi = args.indexOf('--pages');
if (pi >= 0) urls = readFileSync(args[pi + 1], 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(p => p.status === 200 && !p.redirectsTo && /html/.test(p.contentType || '')).map(p => p.url);
const HOME = args.includes('--home') ? args[args.indexOf('--home') + 1] : urls[0];

const LOCAL = /^(LocalBusiness|ProfessionalService|Store|Restaurant|FoodEstablishment|HomeAndConstructionBusiness|LegalService|MedicalBusiness|HealthAndBeautyBusiness|AutomotiveBusiness|FinancialService|RealEstateAgent|TravelAgency|EntertainmentBusiness|SportsActivityLocation|LodgingBusiness|EmploymentAgency|AccountingService|Dentist|Physician|Attorney|Notary|Electrician|Plumber|HVACBusiness|RoofingContractor|GeneralContractor|HousePainter|Locksmith|MovingCompany)$/;
// req = Google requires it for its rich result (or without it the node is useless); rec = recommended (Google or schema.org)
const RULES = {
  Organization: { req: ['name'], rec: ['url', 'logo', 'sameAs', 'description', 'address', 'telephone|contactPoint', '@id'] },
  LocalBusiness: { req: ['name', 'address'], rec: ['telephone', 'url', 'geo', 'openingHoursSpecification|openingHours', 'image', 'priceRange', 'areaServed', '@id'] },
  WebSite: { req: ['name', 'url'], rec: ['publisher|author', 'inLanguage'] },
  Service: { req: ['name'], rec: ['provider', 'areaServed', 'serviceType|description', 'offers'] },
  FAQPage: { req: ['mainEntity'], rec: [] },
  BreadcrumbList: { req: ['itemListElement'], rec: [] },
  Article: { req: ['headline'], rec: ['author', 'datePublished', 'dateModified', 'image', 'publisher'] },
  Person: { req: ['name'], rec: ['jobTitle', 'worksFor|affiliation', 'sameAs', 'url'] },
};
const typesOf = n => [].concat(n['@type'] || []).map(String);
const has = (n, spec) => spec.split('|').some(k => n[k] !== undefined && n[k] !== '' && !(Array.isArray(n[k]) && !n[k].length));
const normTxt = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const digits = s => String(s || '').replace(/\D/g, '').replace(/^34(?=\d{9}$)/, '');

const issues = []; const add = (sev, code, where, detail) => issues.push({ sev, code, where, detail });
const nap = { name: new Map(), telephone: new Map(), address: new Map() };
const note = (k, v, url) => { if (!v) return; const key = k === 'telephone' ? digits(v) : normTxt(typeof v === 'object' ? [v.streetAddress, v.postalCode, v.addressLocality].join(' ') : v); if (!key) return; if (!nap[k].has(key)) nap[k].set(key, { raw: v, urls: new Set() }); nap[k].get(key).urls.add(url); };
const pages = [];
const allIds = new Map();
const TOP = new WeakSet();

for (const url of urls) {
  let html;
  try { html = await (await fetch(url, { headers: { 'user-agent': 'qa-geo/1.0' }, signal: AbortSignal.timeout(20000) })).text(); }
  catch (e) { add('High', 'not-accessible', url, e.message); continue; }
  const $ = cheerio.load(html);
  const blocks = $('script[type="application/ld+json"]').map((_, e) => $(e).html()).get();
  const microdata = $('[itemscope]').length, rdfa = $('[typeof][vocab], [property^="schema:"]').length;
  const $v = cheerio.load(html.replace(/></g, '> <')); $v('script,style,noscript,template').remove();
  const visible = normTxt($v('body').text()); const visibleDigits = $v('body').text().replace(/\D/g, '');
  const nodes = [];
  blocks.forEach((raw, i) => {
    let data;
    try { data = JSON.parse(raw.replace(/^\s*<!--|-->\s*$/g, '').replace(/^\s*\/\/<!\[CDATA\[|\/\/\]\]>\s*$/g, '')); }
    catch (e) { add('High', 'jsonld-syntax', `${url} · block ${i + 1}`, e.message.slice(0, 120)); return; }
    for (const d of [].concat(data)) {
      const ctx = JSON.stringify(d['@context'] || '');
      if (!/schema\.org/.test(ctx)) add('High', 'jsonld-no-context', `${url} · block ${i + 1}`, `@context ${ctx || 'missing'}`);
      // top = root or @graph node; nested ones are only validated if they are not mere references ({@type, name} or {@id})
      const walk = (n, top) => { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(x => walk(x, top)); if (n['@type']) { if (top) TOP.add(n); nodes.push(n); } for (const [k, v] of Object.entries(n)) if (k !== '@context' && typeof v === 'object') walk(v, false); };
      walk(d['@graph'] || d, true);
    }
  });
  const types = [...new Set(nodes.flatMap(typesOf))];
  for (const n of nodes) {
    for (const t of typesOf(n)) {
      const rule = RULES[t] || (LOCAL.test(t) ? RULES.LocalBusiness : /^(BlogPosting|NewsArticle)$/.test(t) ? RULES.Article : null);
      const isRef = Object.keys(n).filter(k => k !== '@type').length <= 2;
      if (!rule || (!TOP.has(n) && (isRef || !['Organization', 'Person', 'Service'].includes(t) && !LOCAL.test(t)))) continue;
      const where = `${url} · ${t}${n['@id'] ? ' ' + n['@id'] : ''}`;
      for (const r of rule.req) if (!has(n, r)) add(t === 'Person' ? 'Medium' : 'High', 'jsonld-missing-required', where, r);
      const missRec = rule.rec.filter(r => !has(n, r));
      if (missRec.length) add('Low', 'jsonld-missing-recommended', where, missRec.join(', '));
      for (const k of ['url', 'logo', 'image', 'item', '@id', 'sameAs']) for (const v of [].concat(n[k] || [])) {
        const s = typeof v === 'object' ? v.url || v['@id'] : v;
        if (typeof s === 'string' && s && !/^https?:\/\//.test(s) && !(k === '@id' && s.startsWith('#'))) add('Medium', 'jsonld-relative-url', where, `${k}: ${s}`);
        if (typeof s === 'string' && /localhost|127\.0\.0\.1|vercel\.app|staging|preview/.test(s) && k !== '@id') add('High', 'jsonld-non-production-url', where, `${k}: ${s}`);
      }
      if (n['@id']) { const prev = allIds.get(n['@id']); if (prev && prev.t !== t) add('Medium', 'jsonld-inconsistent-id', n['@id'], `${prev.t} on ${prev.url} vs ${t} on ${url}`); allIds.set(n['@id'], { t, url }); }
      if (t === 'Organization' || LOCAL.test(t)) {
        note('name', n.name, url); note('telephone', n.telephone, url); if (typeof n.address === 'object') note('address', n.address, url);
        if (n.telephone && !visibleDigits.includes(digits(n.telephone))) add('Medium', 'nap-phone-not-visible', where, `${n.telephone} does not appear in the page text`);
        if (n.name && !visible.includes(normTxt(n.name))) add('Low', 'nap-name-not-visible', where, `"${n.name}" does not appear in the text`);
        if (LOCAL.test(t) && typeof n.address === 'object') for (const k of ['streetAddress', 'addressLocality', 'postalCode', 'addressCountry']) if (!n.address[k]) add('Medium', 'jsonld-incomplete-address', where, k);
        if (LOCAL.test(t) && typeof n.address === 'string') add('Medium', 'jsonld-address-as-text', where, 'address as text: use PostalAddress');
      }
      if (t === 'FAQPage') {
        add('Low', 'faq-no-rich-result', where, 'Google stopped showing FAQ rich results (7 May 2026). Only useful as markup of visible content.');
        for (const q of [].concat(n.mainEntity || [])) {
          if (!q.name || !q.acceptedAnswer?.text) add('High', 'faq-incomplete-question', where, JSON.stringify(q).slice(0, 100));
          else if (!visible.includes(normTxt(q.name).slice(0, 60))) add('High', 'faq-not-visible', where, `"${q.name}" is not visible on the page (structured data must reflect visible content)`);
        }
      }
      if (t === 'BreadcrumbList') [].concat(n.itemListElement || []).forEach((li, i, arr) => {
        if (li.position === undefined || !li.name && !li.item?.name) add('Medium', 'breadcrumb-incomplete-item', where, `position ${i + 1}`);
        if (!li.item && i < arr.length - 1) add('Medium', 'breadcrumb-missing-item', where, `position ${i + 1}`);
      });
      if (t === 'HowTo') add('Low', 'howto-no-rich-result', where, 'HowTo no longer generates rich results in Google');
      if (t === 'WebSite' && n.potentialAction) add('Low', 'website-searchaction', where, 'the sitelinks search box was retired in Nov 2024: SearchAction adds nothing in Google');
    }
  }
  pages.push({ url, blocks: blocks.length, types, microdata, rdfa });
}

// Minimum expected coverage on the home page and NAP consistency
const home = pages.find(p => p.url === HOME);
if (home && !home.types.some(t => t === 'Organization' || LOCAL.test(t))) add('Medium', 'home-no-organization', HOME, 'no Organization/LocalBusiness: describe who is behind it (name, logo, contact, sameAs)');
if (home && !home.types.includes('WebSite')) add('Low', 'home-no-website', HOME, 'WebSite (name, url) helps Google choose the site name');
if (!pages.some(p => p.blocks)) add('Medium', 'no-jsonld', 'site', 'no page has JSON-LD (not a requirement for AI, but it helps understand the entity and gives rich results)');
const napOut = {};
for (const [k, m] of Object.entries(nap)) { napOut[k] = [...m.values()].map(v => ({ value: v.raw, urls: [...v.urls] })); if (m.size > 1) add('Medium', 'nap-inconsistent', k, napOut[k].map(v => JSON.stringify(v.value)).join(' vs ')); }
// Group repeated findings (the layout's JSON-LD repeats on every page)
const grouped = new Map();
for (const i of issues) {
  const [u, ...rest] = i.where.split(' · '); const k = `${i.sev}|${i.code}|${rest.join(' · ')}|${i.detail}`;
  if (!grouped.has(k)) grouped.set(k, { sev: i.sev, code: i.code, where: rest.join(' · ') || u, detail: i.detail, urls: [] });
  if (rest.length) grouped.get(k).urls.push(u);
}
const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const out = [...grouped.values()].sort((a, b) => order[a.sev] - order[b.sev]);
console.log(JSON.stringify({ pages, nap: napOut, issues: out }, null, 1));
for (const i of out) console.error(`[${i.sev}] ${i.code} · ${i.where} · ${i.detail}${i.urls.length ? ` · ${i.urls.length} URL(s): ${i.urls.slice(0, 3).join(', ')}` : ''}`);
