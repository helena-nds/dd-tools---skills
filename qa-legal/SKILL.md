---
name: qa-legal
description: Audits the legal compliance of a website (Next.js/React or other) for every country it targets, worldwide. Works out the regimes in scope (EU/EEA and national rules such as Spain's aviso legal or Germany's Impressum, UK, US federal and state laws, Canada and Quebec, Latin America, Switzerland, Asia-Pacific, Middle East, Africa), then checks cookie and tracking consent, Global Privacy Control, privacy notices, imprint/identification, forms and marketing consent, third parties (Google Fonts, YouTube, Maps, pixels, reCAPTCHA), data transfers, consumer-sales rules, accessibility law, AI chatbots and whistleblowing, with code and browser evidence. Use it whenever someone asks to review GDPR, CCPA, cookies, privacy policy, legal notice, consent, terms, legal compliance or "is the site legal" for any country, even if no law is named.
---

# Legal compliance audit of a website (worldwide)

The goal is to answer, with technical evidence (file:line, cookie, network request, screenshot, quoted text): **which countries' rules apply to this website, and where does it break them?** Websites generated from Figma with AI fail in predictable ways: Google Analytics and pixels firing before any choice, a banner with a big "Accept" and a hidden "Reject", Google Fonts loaded from Google, a privacy policy copied from another company, a pre-ticked newsletter box, no legal notice, and nothing for visitors from the US, Canada or Brazil even when the studio sells there.

**This is not legal advice.** The skill is a technical review. Legal texts and decisions (legal basis, whether a law applies to the business) must be validated by a lawyer in each jurisdiction. Say so in the report.

**By default no code is modified.** Deliver the report; fix only if the user asks.

## What is in this skill

- `scripts/scope.mjs`: target markets and site features → suggested regimes.
- `scripts/consent-check.mjs`: cookies, storage and third-party requests before consent, after Reject, after Accept and with Global Privacy Control; banner measurements; pixel payloads.
- `scripts/pages-check.mjs`: legal links on every page, forms, overlays, chat widgets, obsolete legal references, identification data from the legal notice.
- `scripts/policy-check.mjs`: required topics in the privacy and cookie policies per regime; vendors seen in the browser but missing from the policy.
- `references/eu-uk.md`, `references/us.md`, `references/americas.md`, `references/apac-mea.md`: the law per jurisdiction, with check IDs, severities and sources. **Open only the sections for the regimes in scope.** They are long on purpose; do not read them end to end.

## Step 0. Re-check the law that moves (web search, 5–10 minutes)

The reference files were checked on 28–30 October 2026. Before each audit, with web search, re-check:

1. The **"Re-check before each audit"** list at the top of every reference file you will use.
2. These cross-cutting items:
   - EU **Digital Omnibus** (cookie rules, browser signals): still a proposal?
   - **EU–US Data Privacy Framework** (appeal C-703/25 P, Commission review after *Trump v. Slaughter*); the Swiss and UK bridges follow it.
   - **US**: new state privacy laws or effective dates; the California CPPA opt-out-signal rulemaking; CIPA reform (SB 690 applies from 1 Jan 2027).
   - Dated starts around now: **Chile** Ley 21.719 (1 Dec 2026 unless the postponement to 15 Oct 2027 is published), **Egypt** PDPL grace period (ends 31 Oct 2026, enforceable from 1 Nov; check for an extension), **Australia** ADM privacy-policy duty (10 Dec 2026), **India** DPDP consent rules (13 May 2027, or earlier if brought forward), **Peru** DPO phase-in (medium companies 30 Nov 2026).

Note the date and the result in the report. If you cannot search, write "Regulatory updates not re-checked" at the top of the report and keep findings that depend on those items at **High risk** at most.

## Step 1. Scope: who runs the site, and for whom

**1.1 Ask the client (one round of questions).** Mark anything unanswered as *Not assessable*.

- Legal entity, country of establishment and offices.
- **Target markets**: countries where they look for clients, sell, ship, advertise or have staff. Being reachable from a country is usually not enough; targeting is.
- Headcount and turnover (EU micro-enterprise accessibility exemption, whistleblowing channel from 50 workers, US state thresholds, Australia's A$3M exemption, registration duties in some countries).
- Online sales to consumers? Subscriptions? Regulated profession (architects, engineers, lawyers…)?
- Newsletter, SMS or WhatsApp marketing? Which tools (email platform, CRM, form service)?
- Analytics, ads and retargeting tools; consent tool (CMP) and whether it is configured per region.
- User accounts, comments, reviews or uploads? Chatbot (own build on an AI API, or a vendor widget)?
- Health-related content, products or bookings? Content aimed at children?
- Hosting and region (e.g. Vercel functions region), and who receives form submissions.
- Staging or production URL. If none, run `next build && next start` locally (never `next dev`).

**1.2 Run the scope script** (after step 2) and compare its suggestions with the answers:

```bash
node /tmp/qa-legal/scope.mjs https://staging.example.com/ /contact /services --out=scope.json
```

`scope.json` gives `suggestedRegimes[]` with the reason (hreflang, `<html lang>`, currencies, phone prefixes, ccTLD, countries mentioned, shipping lists) and `signals` (commerce, subscription, accounts, user content, chat widgets, AI chat, video, health and children's terms).

**1.3 Decide the regimes in scope** and write them at the top of the report with the reason for each:

- Always: the **operator's home country** (and the EU baseline if it is in the EU/EEA).
- Each **targeted market**.
- Visibility alone rarely triggers a foreign law. Exceptions to keep in mind: Saudi Arabia (any processing of data of people in the Kingdom); China if analytics profiles visitors in China; California's CalOPPA reaches any commercial site collecting personal data from California residents (low enforcement risk for a foreign micro-business).
- When unsure, list the regime as *Not assessable* with the question to ask.

If the user is present, confirm the list before continuing. If you are working unattended, use the home country plus the scope suggestions and state the assumption.

**1.4 Map regimes to reference sections:**

| Regime | File → section |
|---|---|
| Any EU/EEA country | `eu-uk.md` → EU/EEA baseline, then the country section (Spain, Germany, France, Italy, Austria, Netherlands); other EU countries use the baseline and their national authority's guidance |
| United Kingdom | `eu-uk.md` → United Kingdom |
| United States | `us.md` → applicability table first, then Federal, California, Other state privacy laws, Health data |
| Canada, Quebec, Latin America | `americas.md` → country section |
| Switzerland, Asia-Pacific, Middle East, Africa | `apac-mea.md` → country section |
| A country with no section | Use the global baseline (step 8), flag the gap as *Not assessable*, recommend local counsel |

## Step 2. Tools (outside the project)

```bash
mkdir -p /tmp/qa-legal && cp <this skill>/scripts/*.mjs /tmp/qa-legal/ && cd /tmp/qa-legal \
  && npm init -y >/dev/null && npm i playwright >/dev/null && npx playwright install chromium
```

Tested with Node 22 and Playwright 1.63. Run the scripts from `/tmp/qa-legal` (they import `playwright` from there) and keep their JSON output there.

## Step 3. Code review

**3.1 Third parties, tracking and signals** (from the project root):

```bash
rg -n -g '!node_modules' -g '!.next' -i -e 'googletagmanager|gtag\(|google-analytics|@next/third-parties|react-ga|connect\.facebook\.net|fbq\(|snap\.licdn|_linkedin_partner_id|analytics\.tiktok|ttq\.|bat\.bing|fonts\.googleapis|fonts\.gstatic|use\.typekit|youtube\.com/embed|youtube-nocookie|player\.vimeo|google\.com/maps|maps\.googleapis|recaptcha|hcaptcha|turnstile|hotjar|clarity\.ms|fullstory|logrocket|mouseflow|intercom|drift|crisp|tawk|zendesk|livechat|hubspot|hs-scripts|mailchimp|brevo|klaviyo|formspree|getform|resend|sendgrid|calendly|typeform|@vercel/analytics|@vercel/speed-insights|plausible|posthog|cdn\.jsdelivr|unpkg|images\.unsplash'
rg -n -g '!node_modules' -g '!.next' -i -e "consent'?,\s*'(default|update)'|ad_user_data|ad_personalization|ads_data_redaction|sec-gpc|globalPrivacyControl|__gpp|usprivacy|dataProcessingOptions|LDU|maskAllInputs|automaticMatching"
rg -n -g '!node_modules' -g '!.next' -i -e 'acsbapp|accessibe|userway|audioeye|equalweb|max-access'
```

Then read:

- `app/layout.tsx` and components: are `next/script` tags, pixels and `<iframe>`s **conditional on consent** (and on GPC for US visitors), or do they always load?
- Google Consent Mode: `gtag('consent','default', …)` set to `granted`, or tags that load and are "denied" afterwards (advanced mode: pings before consent).
- CSS `@import url(https://fonts.googleapis.com…)` or `<link rel=preconnect href=https://fonts.gstatic.com>`.
- `next.config.*` (`images.remotePatterns`, `unoptimized`, `headers()`), `proxy.ts`/`middleware.ts` (cookies set server-side, any `sec-gpc` handling), `vercel.json` `regions` (functions may run in the US).
- Form handlers (Server Actions, `app/api/*`): **where the data goes** (email service, CRM, sheet). Each is a processor/service provider the policy must name, and often a transfer abroad.
- Email templates in the repo (`emails/*.tsx`): sender identity, postal address, working unsubscribe.
- The legal pages themselves (`aviso-legal`, `impressum`, `privacy`, `cookies`, `terms`): are they real text for this company, or a template from another company or country?

## Step 4. Browser: consent and tracking, per target market

Run `consent-check.mjs` once for each market in scope. Consent tools often switch behaviour by region, so a site can be compliant for Spain and silent for Brazil.

```bash
node consent-check.mjs https://staging.example.com/ /contact /projects --locale=es-ES --tz=Europe/Madrid --out=consent-es-ES.json
node consent-check.mjs https://staging.example.com/ /contact --locale=en-US --tz=America/Los_Angeles --gpc --out=consent-en-US.json
node consent-check.mjs https://staging.example.com/ --locale=pt-BR --tz=America/Sao_Paulo --out=consent-pt-BR.json
```

Common pairs: `de-DE Europe/Berlin`, `fr-FR Europe/Paris`, `it-IT Europe/Rome`, `en-GB Europe/London`, `fr-CA America/Toronto`, `es-MX America/Mexico_City`, `de-CH Europe/Zurich`, `en-AU Australia/Sydney`, `ja-JP Asia/Tokyo`, `ko-KR Asia/Seoul`, `tr-TR Europe/Istanbul`, `en-IN Asia/Kolkata`. Locale and time zone do not change the visitor's IP: if the CMP decides by IP, use its geo override or a VPN in that country and say which you used. Cover the home page and the risky pages (contact form, maps, videos, portfolio, checkout).

**How to read `consent-*.json`**

- **`no-interaction` and `reject`**: in an **opt-in** market, no request with category `ads`, `analytics`, `replay`, `social`, `video`, `maps`, `fonts` or `captcha`, no `suspectedTracker` cookies and no third-party storage keys. Anything there is a finding. The categories and the exemptions (e.g. UK statistics exception, CNIL/AEPD audience measurement, Swiss opt-out default) are in the reference file for that market.
  - Opt-in markets with a binding, checked rule (non-essential tracking needs prior consent): EU/EEA, UK (with narrow analytics/appearance exceptions), Quebec (identifying, locating or profiling technology off by default), Brazil, Türkiye, Uruguay, China for ads and profiling, India from 13 May 2027.
  - Opt-in expected but the basis is guidance, inferred or unverified, so report at **High risk** unless step 0 confirms it: Nigeria, Qatar (ad cookies, non-binding guidelines), Peru (inferred from express consent), Thailand, Vietnam, Israel (direct marketing and sensitive data), Switzerland for high-risk profiling (cross-site pixels).
  - Notice/opt-out markets: US (but see GPC and the litigation risk below), federal Canada, Mexico, Switzerland (default), Australia, New Zealand, Japan, South Korea (disclosure), Hong Kong, Singapore.
  - Pixels, session replay and chat widgets firing before any notice are **High risk** in the US too (wiretap/CIPA litigation).
- **`banner.symmetry`**: `reject-missing`, `reject-is-link`, `reject-smaller` or `reject-low-contrast` where consent is required is a finding (EU, UK, Brazil, Türkiye, Switzerland for consent cases, and California's symmetry rule for covered businesses). If `reject` is `null`, **look at `consent-*-banner.png`** before concluding: icon-only buttons, iframes and unusual wording can be missed; `banner.rejectInSecondLayer` tells you it exists only behind "Settings".
- **`gpc` mode** (US): with `Sec-GPC: 1`, `gpc.adRequests` should be empty (or the tags should carry an opt-out flag) and, for California-covered businesses, `gpc.confirmationText` should show something like "Opt-Out Request Honored".
- **`pixelLeaks`**: ad or analytics requests carrying email, phone, name or custom form fields. High risk anywhere; Non-compliance where the data is sensitive (health) or sent before consent in an opt-in market.
- **Cookie lifetimes**: compare `durationDays` with the market's rule (e.g. France: the CNIL treats about 6 months of consent validity as adequate and exempt audience-measurement trackers ≤ 13 months; Spain: consent ≤ 24 months).
- **Limits**: storage written inside third-party iframes (e.g. YouTube's `localStorage`) is not captured; use `thirdPartyIframes` and `thirdPartyRequests` as evidence.

**Withdrawal (manual, every opt-in market):** accept → reopen the settings from the permanent footer link or icon → reject. Tracking cookies must be deleted and requests must stop. Withdrawing must be as easy as giving consent.

## Step 5. Pages, forms and identification

```bash
node pages-check.mjs https://staging.example.com/ /contact /services /legal-notice --out=pages.json
```

- **`links`** on every page: privacy policy, cookie policy, legal notice/imprint, terms, a permanent cookie-settings link, and where relevant "Your Privacy Choices"/"Do Not Sell or Share" (US), a consumer health data policy (Washington), an accessibility statement, the whistleblowing channel, the EU "withdraw from contract here" function, a complaints book (Peru's Libro de Reclamaciones), Argentina's withdrawal and cancellation buttons ("botón de arrepentimiento", "botón de baja"), Japan's 特定商取引法に基づく表記. Which ones are mandatory depends on the regime: see the reference file.
- **`forms`**: `checkboxes[].preChecked` on consent or marketing boxes is a finding almost everywhere; `marketingCheckbox` missing while the form subscribes people to a newsletter (check the handler) is a finding; `smsConsent` must exist and be unticked when the form collects a phone number for marketing texts (US TCPA); `noticeNearby` shows whether the short notice (who, why, rights, link) sits next to the form. Read `nearbyText`: the notice may be outside the `<form>`.
- **`overlays`**: accessibility overlay widgets are not a compliance measure (US FTC order against accessiBe); they do not replace an accessible build anywhere.
- **`obsoleteRefs`**: Privacy Shield, Safe Harbor, Directive 95/46, Spain's LOPD 15/1999, Germany's TMG/TTDSG, the UK 2008 trading-disclosure regulations, Mexico's INAI as the current authority, the EU ODR link. Citing a dead legal basis is wrong information to users.
- **`identification`**: email, phone, address, company identifiers (EU VAT, Spanish NIF, German HRB/USt-IdNr, French SIREN/RCS, Italian P.IVA, UK company number and "registered in…", ABN, CNPJ, CUIT, RUT, NIT, RUC, Korean business number, Chinese ICP), commercial register, publication director and host (France), share capital, legal representative. Compare with the country's required list in the reference file.

## Step 6. Privacy and cookie policy content

```bash
node policy-check.mjs https://staging.example.com/privacy --cookies=https://staging.example.com/cookies \
  --regimes=gdpr,us-ca --consent=consent-es-ES.json,consent-en-US.json --out=policy.json
```

Automatic checklists exist for `gdpr` (EU/EEA), `uk`, `us-ca` (CCPA + CalOPPA), `us` (CalOPPA baseline), `ch`, `br`, `ca`, `qc` and `au`. Other regimes come out as "manual": when a reference check cites `policy.items.<code>` for one of them, read the policy by hand against that check. A keyword match only shows the topic is mentioned; **read the policy** against the reference file for every regime in scope. Also check:

- `lastUpdated` / `ageDays`: a policy older than 12 months is a finding in California and a warning sign everywhere.
- `vendors.missingFromPolicy`: third parties the browser contacted that the policy never names (processors, joint controllers such as Meta for pixels, transfer recipients).
- `transfers.countriesNamed`: several regimes require naming the destination countries and the safeguard (EU/UK, Switzerland, Brazil, Korea, China, Japan, Australia "if practicable", Quebec).
- **Language**: the notice must be in a language the audience understands, and some markets require theirs (Quebec French, Brazil Portuguese, consumer information in Spanish in Spanish-speaking markets, Arabic in Egypt). An English-only policy on a site aimed at France was part of a CNIL sanction.
- Whether the policy describes **this** company and **these** tools, or was copied.

## Step 7. Regional checks

For each regime in scope, open its section in the reference file and go through its **Checks** table. Use the check IDs (e.g. `ES-04`, `US-CA-07`, `BR-03`) in the report. Most rows tell you which script field gives the evidence; the rest are manual reads or questions for the client. Typical regional items that the scripts do not decide on their own:

- Identification/imprint lists (Spain LSSI art. 10, Germany DDG §5, France LCEN, Italy P.IVA on the home page, UK company details, Switzerland UWG, Japan 特定商取引法, Korea business information, Brazil CNPJ for sellers).
- Officer/representative publication or registration (Quebec person in charge, Brazil encarregado, Singapore DPO contact, South Africa Information Officer, Nigeria/Kenya/Egypt registration, EU/UK art. 27 representative for non-EU operators).
- Consumer sales (EU withdrawal button from 19 June 2026, 30-day prior price, "order with obligation to pay" button; UK drip pricing; California auto-renewal and all-in pricing; Argentina withdrawal and cancellation buttons; Peru complaints book).
- Marketing consent (EU/UK soft opt-in, Germany double opt-in, Canada CASL express consent and 6-month inquiry window, US CAN-SPAM postal address and opt-out, TCPA written consent for SMS, Korea "광고" consent wording, Colombia contact hours).
- Accessibility (EU Accessibility Act for consumer e-commerce, US ADA litigation, Israel IS 5568, Ontario AODA, Brazil LBI). Run `qa-accessibility` for the technical audit; here you only decide which law applies and whether a statement is required.
- AI chatbots (EU AI Act art. 50 disclosure; Utah on request; California bot law for sales), whistleblowing channel (EU, 50+ workers; Spain on the home page).

## Step 8. Global baseline: one setup that passes nearly everywhere

When the site targets many markets, recommend this baseline and then add the local extras from each reference file:

1. One consent banner for all visitors: nothing non-essential before consent, **Reject all** in the first layer and as prominent as Accept all, granular settings, a permanent "Cookie settings" link, withdrawal that deletes cookies. Treat a **GPC signal** as a Reject/opt-out and show that it was honoured.
2. Self-hosted fonts (`next/font`), click-to-load facades for YouTube, Vimeo and Maps, no reCAPTCHA before consent (honeypot + server-side rate limit, or a privacy-friendly CAPTCHA declared as a processor).
3. Pixels, session replay and chat widgets only after consent; inputs masked; no form data or sensitive page titles in pixel payloads.
4. One privacy policy that covers the union of items (controller and contacts, officer contacts where required, purposes and legal bases, recipients by name, countries and transfer safeguards, retention, rights and how to use them, complaint authorities, cookies and how to refuse, GPC/Do Not Track, children, changes and a "last updated" date), with country annexes (California rights, Quebec, Brazil…) and the required languages.
5. A legal notice with the union of identification items; a short notice next to every form; marketing checkboxes unticked and separate; unsubscribe and postal address in every marketing email.
6. A footer with: Legal notice · Privacy · Cookies · Cookie settings · (Your Privacy Choices, if any ad pixels and US targeting) · Accessibility statement (if required) · Whistleblowing channel (if required).

## Severity

Use these four labels in every regime:

1. **Non-compliance**: a required element is missing or broken for a regime in scope. Examples: trackers before consent or after Reject in an opt-in market with a binding rule; no Reject in the first layer where consent is required; pre-ticked boxes; missing mandatory imprint items; no privacy policy or one missing required items; GPC ignored by a covered US business; CalOPPA Do-Not-Track paragraph missing on a site that lets third parties track Californians across sites (after the 30-day notice); Privacy Shield cited as the transfer basis; observed cookies not declared; no French version for Quebec; no withdrawal button on an EU shop.
2. **High risk**: likely violation, disputed practice regulators target, or litigation exposure. Examples: remote Google Fonts or YouTube/Maps without a facade in the EU; Consent Mode in advanced mode; pixels, session replay or chat before notice for US visitors; form data in pixel payloads; overlay widget sold as "ADA compliant"; processors not named outside the EU/UK (under GDPR and UK GDPR a missing recipient is Non-compliance).
3. **Improvement**: good practice, upcoming rules, or low-risk gaps. Examples: double opt-in outside Germany; cookie table; accessibility ahead of a future deadline; consent logging; obsolete but harmless references.
4. **Not assessable**: depends on business facts you don't have (headcount, turnover, consumer sales, number of residents' records, registrations, contracts, data protection impact assessments).

A pending law or proposal is never Non-compliance; report it as Improvement with its date. When `qa-full-website` merges severities: Non-compliance → Critical, High risk → High, Improvement → Low, Not assessable → Not evaluated.

## Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

Save it as `qa-legal.md`, with the scripts' JSON files and banner screenshots next to it.

```markdown
# Website legal audit — <domain> — <date> — commit <hash>
Regulatory update check: <yes, date / not re-checked> · Reference files checked: 28–30 October 2026
Operator: <entity, country> · Business facts: <employees, turnover, B2C yes/no, regulated profession…>

## Scope
| Regime | Why it applies | Reference | Confidence |
|---|---|---|---|
| EU/EEA + Spain | Established in Spain | eu-uk.md → Spain | Certain |
| United States (California) | Prices in USD, "US clients" page; CCPA thresholds not met → CalOPPA, CAN-SPAM, litigation checks | us.md | Client to confirm |
| Brazil | hreflang pt-BR | americas.md → Brazil | Client to confirm |

## Summary
Non-compliance: N · High risk: N · Improvements: N · Not assessable: N
Fixes that solve the most at once: <e.g. one banner with Reject all + GPC; next/font; YouTube facade; rewrite the policy>

## Findings
### EU-04 · Non-compliance · Google Analytics loads before consent (Spain: LSSI art. 22.2; also BR-04)
- Evidence: request to www.google-analytics.com in phase "before-interaction" (consent-es-ES.json); _ga cookie (400 days); app/layout.tsx:31
- Rule: art. 22.2 LSSI; AEPD cookie guide §3.2 (also LGPD/ANPD cookie guide for Brazil)
- Risk: <why it matters, enforcement examples>
- Fix: render the <Script> only after analytics consent (see "If the user asks for fixes")

## Not assessable and questions for the client
## Pending law that may change these findings
```

- Group one technical cause under one finding and list every regime it breaks (one pre-consent pixel can be ES, FR, BR and QC findings at once).
- Each finding carries **evidence**, **the rule with its article**, the **risk** and the **fix**.
- Close with this notice: *"This report is an automated technical review and does not constitute legal advice. Laws and regulators' positions change often and differ by country. Consult a qualified lawyer in each jurisdiction before making decisions."*

## Limits

- The scripts recognise banner wording in the main European and Asian languages. A banner with only icons, unusual wording or a shadow-DOM widget may be missed: check the screenshot.
- Locale and time zone don't move the visitor's IP. CMPs that geolocate by IP need their own override or a VPN.
- `policy-check.mjs` finds topics, not quality or truth. It cannot tell whether the stated legal basis is right.
- Business facts, contracts with processors, registrations and data protection impact assessments are outside what a website can show.
- Sections and facts marked UNVERIFIED in the reference files must be confirmed (step 0) before you rely on them.

## If the user asks for fixes

Fix by technical cause, not by country: one change usually closes findings in several regimes. Order: (1) trackers before consent and the banner, (2) GPC, (3) fonts and embeds, (4) forms, (5) legal pages and identification, (6) regional extras. Rerun the scripts after each block. Legal texts written by you are drafts for a lawyer to review.

Consent-gated scripts (adapt `useConsent` to the CMP in use):

```tsx
// components/Trackers.tsx
"use client";
import Script from "next/script";
import { useEffect, useState } from "react";
import { useConsent } from "@/lib/consent"; // returns { analytics: boolean, ads: boolean } from the CMP

export function Trackers() {
  const { analytics, ads } = useConsent();
  const [gpc, setGpc] = useState(false);
  useEffect(() => setGpc(Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl)), []);
  return (
    <>
      {analytics && <Script src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX" strategy="afterInteractive" />}
      {ads && !gpc && <Script id="meta-pixel" strategy="afterInteractive">{`/* Meta Pixel base code */`}</Script>}
    </>
  );
}
```

GPC on the server, so pages can render the right state (Next 16 `proxy.ts`; `middleware.ts` in Next 15):

```ts
// proxy.ts
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (request.headers.get("sec-gpc") === "1") response.cookies.set("gpc_opt_out", "1", { path: "/", sameSite: "lax" });
  return response;
}
```

- Fonts: replace `<link href="https://fonts.googleapis.com/…">` and CSS `@import` with `next/font/google` (downloaded at build time and served from the site's own domain) or `next/font/local`.
- YouTube/Vimeo/Maps: show a local thumbnail with a "Load video (YouTube will receive your data)" button; insert the iframe only after the click or after consent for that category.
- Footer: one `LegalLinks` component used on every page, with the links required by the regimes in scope.
- Identification and contact data: one module (`lib/site.ts`) used by the footer, legal notice, contact page and JSON-LD, so the details never diverge.
