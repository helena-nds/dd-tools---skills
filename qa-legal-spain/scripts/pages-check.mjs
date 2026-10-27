// pages-check.mjs: legal links in the footer, forms (checkboxes and basic information) and legal notice (aviso legal) details.
// Usage: node pages-check.mjs <base-url> [/contacto /other ...] > pages.json
import { chromium } from 'playwright';

const [SITE, ...extra] = process.argv.slice(2);
const origin = new URL(SITE).origin;
const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'es-ES' });
const out = { site: origin, pages: [] };

for (const p of [new URL(SITE).pathname || '/', ...extra]) {
  await page.goto(origin + p, { waitUntil: 'networkidle' });
  out.pages.push(await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')].map(a => ({ t: a.innerText.trim().toLowerCase(), href: a.getAttribute('href') || '' }));
    const has = re => links.find(l => re.test(l.t) || re.test(l.href));
    const forms = [...document.querySelectorAll('form')].map(f => {
      const ctxText = (f.innerText + ' ' + (f.parentElement?.innerText || '')).slice(0, 4000);
      return {
        action: f.getAttribute('action'),
        checkboxes: [...f.querySelectorAll('input[type=checkbox]')].map(c => ({ name: c.name, preChecked: c.checked, required: c.required,
          label: (c.labels?.[0]?.innerText || c.closest('label')?.innerText || '').trim().slice(0, 200) })),
        basicLayer: { controller: /responsable/i.test(ctxText), purpose: /finalidad/i.test(ctxText), rights: /derechos/i.test(ctxText),
          privacyLink: !!(f.parentElement || f).querySelector('a[href*="privacidad"], a[href*="privacy"]') },
        nearbyText: ctxText.slice(0, 600),
      };
    });
    return {
      route: location.pathname,
      links: { legalNotice: has(/aviso legal|legal notice|aviso-legal/), privacy: has(/privacidad|privacy/), cookies: has(/cookies/),
        cookieSettings: has(/configura|preferencias|gestionar cookies|cookie settings/), whistleblowingChannel: has(/denuncia|canal [eé]tico|whistleblow|informante/),
        obsoleteOdr: has(/ec\.europa\.eu\/consumers\/odr/) },
      forms,
    };
  }));
}
// Look for the art. 10 LSSI details on the legal notice page (if found)
const legal = out.pages[0]?.links?.legalNotice?.href;
if (legal) {
  await page.goto(new URL(legal, origin).href, { waitUntil: 'networkidle' });
  const txt = await page.evaluate(() => document.body.innerText);
  out.legalNotice = {
    url: page.url(),
    nif: (txt.match(/\b[ABCDEFGHJNPQRSUVW][-\s]?\d{7}[-\s]?[0-9A-J]\b|\b\d{8}[-\s]?[A-Z]\b|\b[XYZ]\d{7}[A-Z]\b/) || [null])[0],
    email: (txt.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/) || [null])[0],
    commercialRegistry: /registro mercantil/i.test(txt), volumeFolioSheet: /tomo/i.test(txt) && /folio/i.test(txt),
    address: /(calle|c\/|avda|avenida|plaza|paseo|domicilio)/i.test(txt),
    obsolete: ['Privacy Shield', 'LOPD 15/1999', 'Ley Orgánica 15/1999', 'Directiva 95/46', 'Escudo de Privacidad'].filter(s => txt.toLowerCase().includes(s.toLowerCase())),
  };
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
