---
name: qa-legal-spain
description: Audits the legal compliance of a Spanish corporate website (Next.js/React or other) by reviewing the code and the browser. Covers the aviso legal or legal notice (LSSI art. 10), the privacy policy (RGPD/GDPR art. 13 and LOPDGDD art. 11), the cookie banner and cookie policy according to the AEPD guide, forms, Google Fonts, YouTube, Maps, analytics, reCAPTCHA, transfers to the US and, where applicable, accessibility (Ley 11/2023) and the whistleblowing channel. Use it whenever someone asks to review GDPR/RGPD, cookies, aviso legal, privacy, consent or legal compliance of a website before launch, even if the law isn't cited.
---

# Legal audit of a website (Spain / EU)

The goal is to detect, with technical evidence (file:line, cookie, network request), the most common legal non-compliance issues on a Spanish corporate website, and to explain how to fix them in the code.

**This is not legal advice.** The skill performs a technical review. Legal texts and decisions on the legal basis must be validated by a professional. Say so in the report.

**Regulatory status verified as of 26-10-2026.** Some points change often: step 0 lists which ones to check before each audit.

## Step 0. Check for regulatory updates (web search, 5 minutes)

If you have web search, verify these points and note the date in the report:

1. **AEPD cookie guide** (AEPD: Agencia Española de Protección de Datos, the Spanish Data Protection Agency): is there a version later than the one from May 2024? Also check whether the AEPD has published criteria on Google Consent Mode or reCAPTCHA.
2. **EU–US Data Privacy Framework (DPF)** (Marco de Privacidad de Datos UE–EE. UU.): still in force (the General Court dismissed *Latombe*, T-553/23, on 3-09-2025). The appeal C-703/25 P is pending, and the EDPB (CEPD in Spanish) asked the Commission to review it on 31-07-2026. Check whether there is a suspension, review or ruling.
3. **Digital Omnibus** (COM(2025) 837): it is a **proposal**, not law in force. The Council adopted its position on 21-10-2026 (it keeps cookies in the ePrivacy Directive); Parliament has not voted yet. Include it only as an informative note, unless it has been adopted.
4. **Age of digital consent in Spain**: art. 7 LOPDGDD (Ley Orgánica de Protección de Datos y Garantía de los Derechos Digitales, the Spanish data protection act) says 14 years. There is a draft LO (Ley Orgánica, organic law) on the protection of minors in digital environments that raises it to 16. Check whether it is already in the BOE (Boletín Oficial del Estado, the Official State Gazette).

If you cannot search, state in the report that these points have not been re-verified.

## Step 1. Company details that determine the scope

Ask the user (or mark as "not assessable" if there is no answer):

- Legal form: company registered in the Registro Mercantil (Commercial Registry) or autónomo (self-employed).
- Regulated profession (architecture, engineering, law…): requires giving professional association (colegio profesional) details. Graphic design is not a regulated profession.
- Number of employees and turnover. With **50 or more workers** a canal de denuncias (whistleblowing channel) is mandatory (Ley 2/2023). With **fewer than 10 workers and ≤ €2M**, it is a microempresa (micro-enterprise) for accessibility purposes.
- Does it sell or contract online with consumers (shop, bookings or B2C payments)? If so, the accessibility rules of Ley 11/2023 apply (except for micro-enterprises), as do the terms and conditions of sale.
- Does it have a newsletter? Which third-party services does it use (hosting, forms, CRM, analytics)?
- Comunidad autónoma (autonomous community/region) (for consumer and language rules, if B2C).
- Staging or production URL. If there is none, run `next build && next start` locally.

## Step 2. Prepare tools

```bash
mkdir -p /tmp/qa-legal-spain && cd /tmp/qa-legal-spain && npm init -y >/dev/null \
  && npm i playwright >/dev/null && npx playwright install chromium
```

## Step 3. Code review

**3.1 Third-party services in the code** (from the project root):

```bash
rg -n -g '!node_modules' -g '!.next' -i -e 'googletagmanager|gtag\(|google-analytics|@next/third-parties|react-ga|connect\.facebook\.net|fbq\(|snap\.licdn|analytics\.tiktok|fonts\.googleapis|fonts\.gstatic|use\.typekit|youtube\.com/embed|youtube-nocookie|ytimg|player\.vimeo|google\.com/maps|maps\.googleapis|recaptcha|hcaptcha|turnstile|challenges\.cloudflare|hotjar|clarity\.ms|@vercel/analytics|@vercel/speed-insights|hubspot|hs-scripts|mailchimp|brevo|formspree|getform|resend|sendgrid|calendly|typeform|intercom|crisp|tawk|cdn\.jsdelivr|unpkg|images\.unsplash'
```

Also review:

- `package.json`: analytics, CMP (consent management platform), forms and CMS dependencies.
- `app/layout.tsx` and the components: are the `next/script` `<Script>` tags and the `<iframe>`s **conditional on consent** or do they always load?
- `<link rel="preconnect" href="https://fonts.gstatic.com">` or `@import url(https://fonts.googleapis.com…)` in CSS.
- `next.config.*`: `images.remotePatterns`, `unoptimized`, `headers()` (CSP).
- `middleware.ts` (or `proxy.ts`): first-party cookies, such as A/B testing or geolocation.
- Server Actions and `app/api/*`: **which service the forms are sent to**. Those services are encargados del tratamiento (data processors) and must appear in the privacy policy.
- `vercel.json` / project settings: `regions`. Functions may run in the US if no other region is configured.
- Consent Mode: `gtag('consent','default', {…: 'granted'})` by default, or tags that always load and are "denied" afterwards (= **advanced mode**).

**3.2 Legal pages**: check that they exist (`aviso-legal`, `politica-privacidad`, `politica-cookies` or equivalents: aviso legal = legal notice, política de privacidad = privacy policy, política de cookies = cookie policy) and read their full content with the criteria in step 5. Look for obsolete mentions: "Privacy Shield", "LOPD 15/1999", "Directiva 95/46", a link to the ODR platform (`ec.europa.eu/consumers/odr`, repealed since 20-07-2025).

## Step 4. Browser review

**4.1 Consent: what happens before consenting, after Reject and after Accept.** Use three clean contexts. Cover the home page and the risky pages: contact (form or map), pages with video and portfolio.

```bash
node /tmp/qa-legal-spain/consent-check.mjs https://staging.ejemplo.com/ /contacto /proyectos > consent.json
```

`consent-check.mjs`:

```js
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
```

**How to read the result**

- **Phase `before-interaction`** and **mode `reject`**: there must be no requests to analytics or advertising domains (`tracker: true`), no `suspectedTracker` cookies, and no third-party `localStorage`/`sessionStorage`/IndexedDB keys. If there are, it is **non-compliance with art. 22.2 LSSI** (LSSI: Ley de Servicios de la Sociedad de la Información, the Spanish Information Society Services Act): it is the pattern the AEPD sanctions most. EDPB Guidelines 2/2023 include pixels, URLs with identifiers, `localStorage` and JS that instructs the sending of data within scope, not just cookies.
- Requests to `fonts.googleapis/gstatic`, YouTube, Maps or reCAPTCHA before consent: **high risk**. The IP is sent to the third party and there may be access to the terminal.
- Script limitation: storage written **inside third-party iframes** (e.g. YouTube's `localStorage`) is not captured, because it lives in the iframe's origin. For those cases, use `thirdPartyIframes` and `thirdPartyRequests` as evidence.
- Any other third-party host: check what it is and whether it is necessary for the requested service.
- **Banner**: the reject option must be "en la misma capa y al mismo nivel que la opción para aceptarlas" ("in the same layer and at the same level as the option to accept them", AEPD guide §3.2.1). Compare `bg`, `color`, `fontSize`, `w` and `h` of the two buttons: the AEPD considers a Reject button with a misleading design invalid, for example one that is barely visible or low-contrast. If `reject` is `null`, **confirm it with a screenshot or by looking at the banner** before rating it: the CMP may render it inside an iframe or with different text ("No, gracias", an icon). Once confirmed that it does not exist in the first layer: **non-compliance**.
- **Duration**: the AEPD recommends that consent last at most 24 months (check `durationDays` of the CMP cookie). For exempt analytics, about 13 months.

**4.2 Withdrawal**: accept → reopen the panel from the permanent link or button → reject. Check that the `_ga*`, `_fbp`, etc. cookies are **deleted** and that requests stop. Withdrawing consent must be as easy as giving it.

**4.3 Legal links, forms and legal notice details**:

```bash
node /tmp/qa-legal-spain/pages-check.mjs https://staging.ejemplo.com/ /contacto > pages.json
```

`pages-check.mjs`:

```js
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
```

Go through `pages.json` with these criteria:

- Links to the aviso legal, privacy policy and cookie policy **on every page** (usually in the footer), reachable in two clicks at most, and a **permanent** mechanism to reopen the cookie settings.
- Forms:
  - `preChecked: true` consent or marketing checkboxes: **non-compliance**;
  - the information next to the form is missing: **non-compliance** with art. 13 RGPD (Spanish acronym for the GDPR; duty to inform at the time of collection). If the layered format of art. 11 LOPDGDD is used, the first layer must include at least the controller (responsable), the purpose (finalidad), how to exercise the rights of arts. 15–22 (derechos) and, if there is profiling, that fact, with a link to the full information;
  - the commercial communications checkbox is not separate: **non-compliance** with art. 21 LSSI.
- Also read `nearbyText`: the basic layer may be outside the `<form>`.

## Step 5. Content of the legal texts

**Aviso legal / legal notice (art. 10 LSSI)**, accessible permanently, easily, directly and free of charge:

- [ ] Company name (or the autónomo's name), registered address, email and another means of direct contact
- [ ] NIF (tax ID)
- [ ] Registration details (Registro Mercantil: tomo, folio, hoja e inscripción, i.e. volume, folio, sheet and entry), if it is a company
- [ ] If it is a regulated profession: colegio (professional association), membership number, qualification and professional rules
- [ ] Administrative authorisation, if the activity requires it
- [ ] Prices including taxes and shipping costs, if prices are published
- [ ] Codes of conduct, if it adheres to any

Penalties: a significant failure regarding letters a) (identification and contact) or f) (prices) is **serious** (grave, art. 38.3.b, from €30,001 to €150,000). Missing NIF, registry, professional association, authorisation or codes of conduct is **minor** (leve, art. 38.4.b, up to €30,000). Cookies without consent are a minor infringement (art. 38.4.g), and the AEPD sanctions them.

**Política de privacidad / privacy policy (art. 13 RGPD)**:

- [ ] Controller and contact (and DPO if there is one; for a small studio it is not usually mandatory)
- [ ] Purposes and **the legal basis (base jurídica) of each one**. If it is legitimate interest (interés legítimo), which one specifically: "legitimate interest" alone is not enough.
- [ ] Recipients and **processors** (hosting, form delivery, email marketing, analytics, CMS, CAPTCHA), consistent with what was found in step 3
- [ ] International transfers and safeguard: "Marco de Privacidad de Datos UE–EE. UU." (EU–US Data Privacy Framework) if the provider is certified (dataprivacyframework.gov); otherwise, cláusulas contractuales tipo (standard contractual clauses, art. 46.2.c). Citing "Privacy Shield" is wrong information: **non-compliance**.
- [ ] Specific retention periods (not "mientras exista interés mutuo", "as long as there is mutual interest")
- [ ] Rights of arts. 15–22, how to exercise them and the right to withdraw consent
- [ ] Right to lodge a complaint with the AEPD
- [ ] Whether the data are mandatory and what happens if they are not provided
- [ ] Automated decisions or profiling, if any

**Legal basis of the forms.** To answer an enquiry or a quote request, the usual basis is art. 6.1.b (pre-contractual measures) or 6.1.f. With those bases **no consent checkbox is needed**, but the information layer is. "He leído y acepto la política" ("I have read and accept the policy") is not valid consent in itself. If the basis is consent, the checkbox must be specific, not pre-checked (CJEU *Planet49*, C-673/17) and separate per purpose. Newsletter double opt-in is not mandatory, but it helps demonstrate consent (art. 7.1): recommended improvement.

**Política de cookies / cookie policy (AEPD guide, May 2024)**:

- [ ] What cookies are, types and purposes
- [ ] First-party or third-party, identifying the third party
- [ ] How to accept, reject and withdraw (without relying only on browser settings)
- [ ] Duration
- [ ] International transfers
- [ ] Profiling, if any
- [ ] A table (name, provider, purpose, duration, type) is the usual practice. If the table is missing, it is a recommended improvement; if the information is missing, non-compliance.
- [ ] What is declared matches what is **observed** in step 4. Every cookie or storage item observed must be declared.

**Banner requirements (AEPD guide)**:

- It appears before non-exempt cookies are used.
- First layer: publisher, purposes, first-party or third-party, and Accept, Reject and Configure buttons.
- No pre-checked boxes. Continuing to browse or scrolling is not consent.
- Granular settings panel by purpose.
- Cookie walls are prohibited unless there is a genuinely equivalent alternative.

**Cookies exempt from consent**: user input, session or authentication, security, media player during the session, load balancing, user-chosen customisation (language), certain social plug-ins with a logged-in session, and the one that stores the consent choice itself. **Analytics is not exempt** as a general rule. Only audience measurement that meets **all** the conditions of the AEPD guide of January 2024 is: only for the publisher, anonymous statistics, no data cross-referencing or sharing with third parties, no cross-site tracking, a provider that does not reuse the data, a cookie of about 13 months with no renewal, retention ≤ 25 months, a processing agreement and information to the user. **GA4 in its standard configuration does not fit.**

## Step 6. Assessment of common third parties in Next.js

| Resource | Assessment | Fix |
|---|---|---|
| Google Fonts with `<link>` or `@import` to `fonts.googleapis.com` | High risk: IP sent to Google without consent (LG München, 20-01-2022) | `next/font/google`: downloads the fonts at build time and serves them from the site's own domain, with no requests to Google from the browser |
| Adobe Fonts (`use.typekit.net`) | High risk, same reason | Cannot be self-hosted with `next/font` and the licence normally forbids it: load after consent or replace with a font whose licence allows self-hosting via `next/font/local` |
| YouTube (also `youtube-nocookie`) | High risk: writes to `localStorage` on load | Facade (local thumbnail + load the iframe on click, after informing) or loading conditional on consent. Check in the browser what `@next/third-parties` `YouTubeEmbed` does |
| Google Maps (iframe or API) | High risk | Local static image with a link to Maps, or load after consent |
| Vimeo (`dnt=1` included) | Check in the browser | Facade recommended |
| reCAPTCHA | Risk: Google calls it "necessary", but the AEPD has not ruled on it (the CNIL sanctioned its use without consent in 2023) | Honeypot + server-side rate limiting, or Turnstile/hCaptcha/Friendly Captcha, declared as processors |
| GA4 + **basic** Consent Mode | Compatible if nothing loads until acceptance | — |
| GA4 + **advanced** Consent Mode | High risk: sends "pings" with data even if the user rejects. No authority has validated it | Switch to basic mode |
| Meta Pixel, LinkedIn Insight, TikTok | Prior consent always. The site is a joint controller (CJEU *Fashion ID*, C-40/17) | Block until acceptance |
| Vercel Web Analytics / Speed Insights | Low risk: no cookies, daily hash. Candidate for the audience measurement exemption if the conditions are met | Declare it in the policy. Recommended improvement, not non-compliance |
| Hotjar / Microsoft Clarity | Prior consent. Clarity requires a consent signal for the EEA since 31-10-2025 | Block until acceptance |
| Remote images (`<img src="https://…">`, `unoptimized`, external loader) | The browser contacts the third party | Serve with `next/image` from the site's own domain |

## Step 7. Other obligations (depending on step 1)

- **Canal de denuncias / whistleblowing channel (Ley 2/2023)**: mandatory with 50 or more workers (and in certain regulated sectors regardless of size). If there is a website, the information must be on the **home page, in a separate and easily identifiable section** (art. 25). Check that there is a visible link from the home page.
- **Accessibility (Ley 11/2023, transposes the EAA)**: applies since 28-06-2025 to **e-commerce with consumers** and other specific services (banking, transport, telecommunications…). A corporate or portfolio website without online contracting with consumers **is not covered**. Service micro-enterprises are exempt (the Directive establishes this in its art. 4.5; check the article in Ley 11/2023). If it is covered, it must publish information on how it complies (WCAG 2.1 AA via EN 301 549).
  - For private websites in general, RD 193/2023 (RD: Real Decreto, Royal Decree; art. 14.2 and sixth final provision, disposición final 6.ª) will require the criteria of RD 1112/2018: for new websites from 1-01-2029, and for existing ones reasonable adjustments before 1-01-2030. Today it is a **recommended improvement**, except for companies of "especial trascendencia económica" ("special economic significance", Ley 56/2007), which art. 14.3 already obliges.
- **B2C online sales**: terms and conditions of sale (TRLGDCU, the Spanish consumer protection law), right of withdrawal and hojas de reclamaciones (official complaint forms) according to the autonomous community. Outside the basic scope: mark it as "not assessed" and recommend it.
- **Ley 10/2025 on customer service** (atención a la clientela): only basic services and large companies. It does not normally apply to a small studio.
- **Intellectual property and image rights**: there is no obligation to publish a copyright notice. Licences for images, typefaces and project photos must be documented, as well as authorisation from identifiable people (LO 1/1982). Manual review, recommended improvement.

## Severity

1. **Non-compliance (incumplimiento legal)**: third-party cookies, storage or tags before consent or after rejecting; no Reject in the first layer or a clearly disadvantaged Reject; pre-checked boxes; missing art. 10 LSSI details; no privacy policy or one lacking art. 13 content; marketing without consent; no whistleblowing channel with 50 or more employees; citing Privacy Shield; observed cookies that are not declared.
2. **High risk (riesgo alto)**: remote Google Fonts; YouTube or Maps iframes without a facade; advanced Consent Mode; reCAPTCHA without informing; undeclared US processors.
3. **Recommended improvement (mejora recomendada)**: double opt-in; cookie table; obsolete ODR link; accessibility ahead of 2029; image licences; fallback standard contractual clauses given the uncertainty around the DPF.
4. **Not assessable / missing information (no evaluable)**: headcount, turnover, B2C sales, autonomous community.

## Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

`qa-legal-spain.md`. Write the report in the user's language.

```markdown
# Website legal audit — <domain> — <date> — commit <hash>
Sources: AEPD cookie guide (May 2024) · consolidated LSSI · consolidated LOPDGDD · regulatory update check: <yes/no, date>
Scope details: <legal form, employees, B2C yes/no, regulated profession…>

## Summary
Non-compliance: N · High risk: N · Improvements: N · Not assessable: N

## Findings
### L-001 · Non-compliance · Google Analytics loads before consent
- Evidence: request to www.googletagmanager.com in phase "before-interaction"; _ga cookie (400 days); app/layout.tsx:31 `<Script src="https://www.googletagmanager.com/gtag/js?id=…" strategy="afterInteractive" />`
- Rule: art. 22.2 LSSI; AEPD cookie guide §3.2
- Risk: it is the pattern the AEPD sanctions most
- Fix: render the `<Script>` only if `consent.analytics === true` (CMP state), or basic Consent Mode
```

Each finding carries **evidence** (file:line, or request/cookie and phase), **the rule with its article**, risk and **fix** (with a Next.js code snippet where relevant).

Always close with this notice (in the report's language): *"This report is an automated technical review and does not constitute legal advice. Regulations and the authorities' criteria change (Digital Omnibus in progress, appeal C-703/25 P on the DPF, reform of the age of consent in Spain). Consult a legal professional before making decisions."* In Spanish: *"Este informe es una revisión técnica automatizada y no constituye asesoramiento jurídico. La normativa y los criterios de las autoridades cambian (Digital Omnibus en tramitación, recurso C-703/25 P sobre el DPF, reforma de la edad de consentimiento en España). Consulte con un profesional del derecho antes de tomar decisiones."*

## Reference sources

- LSSI-CE: https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758
- LOPDGDD: https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673
- RGPD (GDPR): https://eur-lex.europa.eu/eli/reg/2016/679/oj
- AEPD cookie guide: https://www.aepd.es/guias/guia-cookies.pdf
- AEPD guide on audience measurement cookies (January 2024): https://www.aepd.es/guias/guia-cookies-analiticas-externas.pdf
- EDPB Guidelines 2/2023 (technical scope of art. 5.3 ePrivacy): https://edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf
- Ley 2/2023 (whistleblowing channel): https://www.boe.es/buscar/act.php?id=BOE-A-2023-4513
- Ley 11/2023 (accessibility): https://www.boe.es/buscar/act.php?id=BOE-A-2023-11022
- RD 193/2023: https://www.boe.es/buscar/act.php?id=BOE-A-2023-7417
- `next/font`: https://nextjs.org/docs/app/api-reference/components/font
