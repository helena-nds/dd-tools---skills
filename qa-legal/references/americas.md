# Canada and Latin America — legal reference for qa-legal

Covers website rules for Canada (federal PIPEDA and CASL, Quebec Law 25 and the Charter of the French Language, Alberta and British Columbia PIPAs, Ontario accessibility, provincial distance-contract rules) and Latin America (Brazil, Mexico, Argentina, Chile, Colombia, Peru, Uruguay, Ecuador, Panama, Costa Rica). Open it when the scope step lists `ca`, `qc` or a Latin American country. Typical targeting signals: `hreflang`/locale `fr-CA`, `pt-BR`, `es-MX`, `es-AR`, `es-CL`, `es-CO`, `es-PE`, `es-UY`; an office address in the country; local currency or phone prefix; a ccTLD (`.ca`, `.com.br`, `.mx`, `.com.ar`, `.cl`, `.co`, `.pe`, `.uy`); or the client's answer. Dates are day-month-year. Facts checked on 28–30 October 2026 against the linked sources. Items marked UNVERIFIED, and everything in 'Re-check before each audit', must be confirmed before you rely on them. "(secondary)" marks a law-firm, vendor or press source. This is a technical reference, not legal advice.

## How to use this file
- Open only the sections for regimes listed in the scope step of SKILL.md.
- Check IDs below are the ones to use in the report.
- Apply a jurisdiction's checks only if the site targets it (signals above). Mere visibility is usually not enough; see each **Applies when** line and the final table.
- Run `consent-check.mjs` once per target market, because CMPs often geo-switch (opt-in in Europe, nothing in the Americas). Suggested pairs: `--locale=fr-CA --tz=America/Toronto`, `--locale=pt-BR --tz=America/Sao_Paulo`, `--locale=es-MX --tz=America/Mexico_City`, and the same pattern for `es-AR`/`America/Argentina/Buenos_Aires`, `es-CL`/`America/Santiago`, `es-CO`/`America/Bogota`, `es-PE`/`America/Lima`, `es-UY`/`America/Montevideo`. Use a proxy or the CMP's geo override if needed. Report "banner absent for BR/QC visitors" as **Non-compliance**.
- `policy.items.<slug>` means the checklist produced by `policy-check.mjs --regimes=<slug>`. Slugs used here: `ca`, `qc`, `br`, `mx`, `ar`, `cl`, `co`, `pe`, `uy`, `ec`. If the script has no checklist for a slug, read the policy manually against the **Privacy notice** line.
- `<html lang>` and the language switcher matter: Quebec needs French, Brazil needs Portuguese, consumer information in Spanish-speaking markets must be in Spanish (see each section).
- Pragmatic default for multi-country sites: one opt-in banner with "Reject all" in the first layer satisfies the strictest regimes here (Brazil, Quebec, Peru, Uruguay) and is also valid where opt-out is enough (federal Canada, Mexico).
- Business facts you usually cannot see (headcount, turnover, assets, database registration, DPO appointment, PIAs, contracts, email templates outside the repo) are **Not assessable**: ask the client.
- Severity labels: **Non-compliance**, **High risk**, **Improvement**, **Not assessable**.

## Re-check before each audit
1. **Chile, Boletín 18.623-07** (postponement of Ley 21.719). Passed the Senate on 28 Oct 2026 with a new date of 15 Oct 2027; now in the Cámara de Diputados; not law, not published. Has the Cámara voted? Any third stage? Published in the Diario Oficial before 1 Dec 2026? Also the Agency council appointment and first guidance. https://tramitacion.senado.cl/wspublico/tramitacion.php?boletin=18623
2. **Canada, Bill C-36** (Protecting Privacy and Consumer Data Act): stage; if Royal Assent, coming-into-force dates. https://www.parl.ca/LegisInfo/en/bill/45-1/C-36
3. **Mexico**: has the Secretaría Anticorrupción y Buen Gobierno published a new LFPDPPP Reglamento or new aviso Lineamientos? https://www.diputados.gob.mx/LeyesBiblio/ref/lfpdppp.htm
4. **Brazil ANPD**: new resolutions, cookie or ECA Digital guidance, revised dosimetry (fine-calculation) rules. https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd
5. **Argentina**: reform bills 3397-D-2026 and 1751-D-2026; any change to Disp. 954/2025. https://www.argentina.gob.ar/normativa/nacional/norma-417152/texto
6. **Alberta PIPA** bill (none as of 3 Mar 2026): https://www.alberta.ca/index%2Ephp/personal-information-protection-act-engagement . **Quebec** CAI cookie-specific guidance (none found): https://www.cai.gouv.qc.ca/protection-renseignements-personnels/information-entreprises-privees/collecte-renseignements-personnels_entreprises
7. **Peru**: adoption of the Libro de Reclamaciones amendment (draft RM 244-2026-PCM, 18 Jul 2026) https://elperuano.pe/noticia/300583-pcm-publica-proyecto-para-modificar-el-reglamento-del-libro-de-reclamaciones ; the medium-company ODP deadline of **30 Nov 2026**; the content of "D.S. 128-2025-PCM" (UNVERIFIED).
8. **Ecuador**: LOPDP primary text (cookie rules, adolescent consent age, extraterritorial article) and SPDP guidance; applicability threshold of the apoderado especial. https://www.telecomunicaciones.gob.ec/wp-content/uploads/2021/06/Ley-Organica-de-Datos-Personales.pdf
9. **Uruguay**: whether the US is on the URCDP adequate list (Res. 4/2019); date and exemptions of the "Cookies y Perfiles" guide; contents of Res. 64/013. https://www.gub.uy/unidad-reguladora-control-datos-personales/sites/unidad-reguladora-control-datos-personales/files/documentos/publicaciones/Guia%2Bcookies%2By%2Bperfiles.pdf
10. **Costa Rica**: Expediente 25.826 progress; any other comprehensive bill. https://delfino.cr/asamblea/proyecto/25826
11. **Colombia**: any SIC cookie guidance (none found as of 30 Oct 2026).
12. Every item marked UNVERIFIED in the section you use.

## Canada — federal (PIPEDA, CASL, provincial consumer and accessibility rules)
**Applies when:**
- PIPEDA Part 1 covers personal information collected, used or disclosed in commercial activities, in all provinces except intra-provincial activity in Quebec, Alberta and BC (substantially similar laws). Interprovincial and international flows stay under PIPEDA. UNVERIFIED
- Foreign organisations are covered if there is a "real and substantial connection" to Canada (*A.T. v. Globe24h.com*, 2017 FC 114). UNVERIFIED. Mere visibility is not enough.
- CASL applies to commercial electronic messages (newsletter, marketing email, SMS) sent to Canadian recipients.

**Privacy notice:**
- PIPEDA Sch. 1 Principle 4.8 (Openness), policy readily available, covering: name/title and address of the accountable person; how to access personal information; types of information held and uses; what is disclosed to related organisations. UNVERIFIED
- OPC "Guidelines for obtaining meaningful consent" — emphasise 4 key elements: what is collected; which third parties receive it; specific purposes (not "service improvement"); risks of harm. Also: layered format; a clear choice for any non-necessary collection; easy withdrawal.
- Express consent is required when the data is sensitive, the use is outside reasonable expectations, or there is a meaningful residual risk of significant harm.

**Cookies and tracking:**
- No cookie statute. Under the OPC online behavioural advertising guidelines, **opt-out consent is acceptable for OBA** only if: clear notice, not buried in the policy (banner or layered); given at or before collection, naming the parties; easy opt-out with immediate and persistent effect; non-sensitive information only; minimal retention.
- Sensitive information always needs opt-in. Avoid tracking children and children's sites.
- Words to look for: "Accept", "Reject all", "Manage cookies"; in French see Quebec.

**Forms and marketing (CASL):**
- Express consent must be **opt-in**. **Pre-checked boxes are not acceptable.** Silence or inaction is not consent. The sender must be able to prove consent. Express consent does not expire until withdrawn.
- Implied consent: purchase or business relationship, 2 years; inquiry or application, **6 months** (s.10(10)); an abandoned cart is not a purchase. A contact-form inquiry therefore gives only 6 months of implied consent; a newsletter needs express opt-in.
- Consent request must state: purpose and the name of the person seeking consent (and on whose behalf) (UNVERIFIED, Electronic Commerce Protection Regulations (CRTC) s.4); mailing address plus phone, email or web address; that consent can be withdrawn. Consent must **not be bundled** with acceptance of general terms of use or sale (CRTC Bulletin 2012-548).
- Every message: sender identification (and on whose behalf); mailing address plus phone, email or website, valid at least 60 days; a simple, free unsubscribe mechanism, processed within **10 business days**, valid at least 60 days.
- B2B exemption: messages between employees or representatives of organisations that have a relationship, about the recipient's activities.

**Identification / imprint:** no general imprint rule. For online sales see below.

**Selling online:**
- Provincial consumer protection acts for distance/Internet contracts (e.g. Quebec CPA s.54.4; Ontario CPA 2002 / O. Reg. 17/05) require before contracting: merchant name and any operating name; address, phone and email; description of the goods; itemised price, total, taxes and shipping; delivery date; currency; cancellation/return policy. Also an express opportunity to accept, decline or correct, and a copy of the contract within 15 days. UNVERIFIED
- Competition Act drip pricing (2022): advertised prices must include all mandatory fixed fees. UNVERIFIED

**Accessibility:**
- Ontario AODA / IASR (O. Reg. 191/11): private businesses and non-profits with **50+ employees** in Ontario; public websites and web content posted after 1 Jan 2012 must meet **WCAG 2.0 AA** since **1 Jan 2021**; exempt: 1.2.4 (live captions) and 1.2.5 (pre-recorded audio description).
- Accessibility compliance reports for 20+ employees every 3 years (UNVERIFIED); penalties up to C$100,000/day for corporations (AODA s.37) (UNVERIFIED).
- Accessible Canada Act: federally regulated entities only (banks, telecoms, airlines); not normally relevant to a design studio. UNVERIFIED
- Manitoba (AMA): customer-service standards; information and communications standard in development. Quebec: public bodies only. UNVERIFIED

**Transfers:**
- A transfer for processing is a "use", not a disclosure; no extra consent if the purpose is the original one.
- The notice must say clearly that data may be processed in a foreign country and be accessible to its courts, law enforcement and national security authorities.
- A contract must provide a "comparable level of protection".

**Officer, representative, registration:** an accountable individual must be designated; title/address in the policy (Principles 4.1, 4.8). No other website publication rule. UNVERIFIED

**Children:** the OPC says under-13s generally cannot give meaningful consent; a parent or guardian must consent.

**Penalties and enforcement:**
- PIPEDA: no AMPs today; limited offences up to C$100,000 (s.28) plus Federal Court damages. UNVERIFIED
- CASL: AMPs up to **C$1M per violation (individual) / C$10M (organisation)**; directors and officers can be liable. The private right of action has never been brought into force (UNVERIFIED).

**Pending changes:**
- Bill C-27 (CPPA, Tribunal, AIDA) died at prorogation, 6 Jan 2025 (secondary: iwebserve).
- **Bill C-36** (Protecting Privacy and Consumer Data Act, amends PIPEDA): first reading **15 Jun 2026**; sponsor: Minister of Artificial Intelligence and Digital Innovation; "at second reading", no activity yet. Proposed (secondary: Gowling): new Digital Safety and Data Protection Commission of Canada, no tribunal; AMPs up to the greater of C$10M or 3% of gross global revenue; offences up to C$25M or 5%; private right of action; child = under 18, children's data sensitive; legitimate interest cannot be used to influence behaviour (targeted ads, personalised pricing), so ad-tech effectively needs consent; inferred data is personal information; PIA before transfers outside Canada; no AI statute.

**Sources:** https://www.parl.ca/LegisInfo/en/bill/45-1/C-36 · https://www.priv.gc.ca/en/privacy-topics/collecting-personal-information/consent/gl_omc_201805/ · https://www.priv.gc.ca/en/privacy-topics/technology/online-privacy-tracking-cookies/tracking-and-ads/gl_ba_1112/ · https://www.priv.gc.ca/en/privacy-topics/airports-and-borders/gl_dab_090127/ · https://crtc.gc.ca/eng/com500/faq500.htm · https://www.crtc.gc.ca/eng/archive/2012/2012-548.htm · https://ised-isde.canada.ca/site/canada-anti-spam-legislation/en/getting-consent-send-email · https://www.ontario.ca/page/how-make-websites-accessible · https://iwebserve.ca/articles/canadian-law/canadian-privacy-law-2026-bill-c36.php (secondary) · https://gowlingwlg.com/en/insights-resources/articles/2026/understanding-bill-c36 (secondary)

### Checks — Canada federal
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| CA-01 | Privacy policy linked from every page and names the accountable person (title + contact) | `pages.links.privacy` on every page; `policy.items.ca`; manual: read for accountable person | Non-compliance if no policy; Improvement if accountable contact missing |
| CA-02 | Policy states foreign processing ("may be processed in the United States and accessible to its authorities") when US processors are detected (GA, Vercel, Formspree, Mailchimp…) | `policy.vendors.detected[]`, `policy.transfers.countriesNamed[]`; manual: repo grep for processors | High risk |
| CA-03 | Purposes specific (not just "improve services"), third parties named by category, layered or easy to read | manual: read policy | Improvement |
| CA-04 | Ad pixels (Meta, LinkedIn, TikTok) load with no banner or notice; federal minimum is clear notice at collection plus immediate, persistent opt-out | `consent.no-interaction.thirdPartyRequests[]` (category `ads`, `social`), `consent.banner.found` | High risk (see QC-03 for Quebec) |
| CA-05 | Newsletter/marketing checkbox not pre-checked, separate from T&C/privacy acceptance; wording states purpose, sender name, mailing address + contact, "you can unsubscribe at any time" | `pages.forms[].checkboxes[].preChecked`, `.label`, `pages.forms[].marketingCheckbox` | Non-compliance (pre-checked or bundled); High risk (missing elements) |
| CA-06 | Contact-form inquiry not used to subscribe the person to a newsletter | manual: Server Action/API code — does contact submit add to Mailchimp/Brevo? | Non-compliance |
| CA-07 | Email templates (e.g. `emails/*.tsx`, Resend/React Email) contain sender ID, mailing address and a working unsubscribe link | manual: grep templates; ask if outside repo | Non-compliance |
| CA-08 | (B2C) Distance-contract disclosures before checkout: merchant name, address, phone, email, itemised price with taxes and shipping, currency, cancellation/return policy, confirmation copy | manual: checkout pages; `signals.commerce` | Non-compliance (basis UNVERIFIED) |
| CA-09 | Ontario organisation with 50+ employees: WCAG 2.0 AA (axe-core/Lighthouse; manual for 1.2.x media) | manual: axe report; ask headcount | Non-compliance if covered and failing; Improvement otherwise; Not assessable if headcount unknown |
| CA-10 | Bill C-36 status noted in the report | manual: LEGISinfo | Improvement |

## Canada — Quebec (Law 25, Charter of the French Language)
**Applies when:** any enterprise holding personal information of people in Quebec; in practice this includes foreign sites targeting Quebec (secondary: iwebserve). Signals: `fr-CA`, Quebec address, French content aimed at Quebec.

**Privacy notice:**
- s.3.2: governance policies and practices published in clear and simple terms on the website.
- s.8 (at collection): purposes; means of collection; rights of access and rectification; right to withdraw consent; where applicable the third party on whose behalf data is collected, names or categories of recipients, and possible communication **outside Quebec**.
- s.8.2: an enterprise collecting through technological means must **publish a privacy policy on its website** in clear and simple terms, and publish amendments the same way. CAI guide (Dec 2023) recommended contents: company name, effective date and last update; collection technologies **including cookies**; third parties collecting on its behalf; identification/location/profiling technology and how to activate it; categories of data and purposes; how to refuse and consequences; who has access and recipients, including **outside Quebec**; rights and complaint process; optionally the person in charge's contact.
- s.12: sensitive information requires express consent. s.14: consent clear, free, informed, requested **separately for each purpose**, in writing presented apart from other information.

**Cookies and tracking:**
- s.8.1: anyone using technology that can **identify, locate or profile** a person must first inform them of the technology and **the means to activate those functions**. CAI: *"vous ne pouvez pas activer ces fonctions par défaut"*; the person must activate them "elle-même, volontairement"; CAI policy guide: *"Elles doivent être désactivées par défaut."*
- Model: **opt-in** for profiling or identifying trackers: Meta/LinkedIn pixels, ad cookies, cross-site analytics, IP geolocation.
- s.9.1 (highest confidentiality by default) **does not apply to browser cookie settings**; s.8.1 still applies to tracking functions.
- Words to look for: "Accepter", "Tout accepter", "Refuser", "Tout refuser", "Continuer sans accepter"; "témoins" (cookies); "politique de confidentialité".

**Forms and marketing:** CASL (see Canada federal) plus separate consent per purpose (s.14). French wording required (see Language).

**Identification / imprint:** no imprint rule; see language and the person in charge.

**Selling online:** Quebec CPA s.54.4 distance-contract disclosures (see CA-08; UNVERIFIED). Contracts of adhesion (online T&C of sale) must be presented in French first (Charter s.55, since 1 Jun 2023). UNVERIFIED

**Language (Charter of the French Language as amended by Law 14 / Bill 96):**
- Commercial publications, including **websites**, must be in French (s.52). Another language is allowed only if a French version of comparable quality is equally accessible.
- Fines since June 2022: C$3,000–30,000 for enterprises, doubled for a first repeat offence and tripled for each further one (secondary: Éducaloi).
- OQLF conviction notice of 4 Sep 2026: Esprit Rafting (whitewater.ca), English-only commercial website content; C$3,000 fine for not complying with an OQLF order.
- If the site targets Quebec, the cookie banner, privacy policy, forms and commercial pages need a French version.

**Transfers:** s.17: before communicating information **outside Quebec** (including entrusting it to US processors), do a **privacy impact assessment** (sensitivity, purposes, safeguards, destination's legal regime) and have a written agreement. The policy must mention possible communication outside Quebec.

**Officer, representative, registration:** s.3.1: the person in charge of the protection of personal information is by default the person with the highest authority; may be delegated in writing; **title and contact information must be published on the website.**
- Words to look for: "responsable de la protection des renseignements personnels", "privacy officer".

**Children:** under 14, consent by the holder of parental authority or tutor; from 14, the minor or the parent (s.14).

**Penalties and enforcement:**
- AMPs up to **C$10M or 2% of worldwide turnover** (s.90.12; natural persons C$50,000).
- Penal fines up to C$25M or 4% (s.91). UNVERIFIED
- Punitive damages (s.93.1). UNVERIFIED
- Phase-in: Sept 2022, Sept 2023; portability from 22 Sep 2024.

**Pending changes:** none found. No CAI cookie-specific guidance as of 28 Oct 2026.

**Sources:** https://www.legisquebec.gouv.qc.ca/en/document/cs/p-39.1 · https://www.legisquebec.gouv.qc.ca/en/pdf/cs/P-39.1.pdf · https://www.cai.gouv.qc.ca/protection-renseignements-personnels/information-entreprises-privees/collecte-renseignements-personnels_entreprises · https://www.cai.gouv.qc.ca/uploads/pdfs/CAI_GU_POL_Confidentialite.pdf · https://www.cai.gouv.qc.ca/protection-renseignements-personnels/sujets-et-domaines-dinteret/principaux-changements-loi-25 · https://educaloi.qc.ca/decryptage/droits-linguistiques-votre-site-web-est-il-conforme-a-la-loi (secondary) · https://www.quebec.ca/nouvelles/actualites/details/infraction-a-la-charte-de-la-langue-francaise-le-site-web-de-lentreprise-esprit-rafting-adventures-inc-72388 · https://iwebserve.ca/articles/canadian-law/canadian-privacy-law-2026-bill-c36.php (secondary)

### Checks — Quebec
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| QC-01 | Title and contact of the person in charge of the protection of personal information published on the website (s.3.1) | `policy.items.qc`; manual: text search "responsable de la protection des renseignements personnels", "privacy officer" | Non-compliance |
| QC-02 | Privacy policy in clear terms, **in French**, with effective and update dates, cookies section, technologies used, who has access, communication **outside Quebec**, rights, complaint process (s.8, s.8.2, CAI guide) | `policy.lang`, `policy.lastUpdated`, `policy.items.qc`, `policy.transfers.countriesNamed[]` | Non-compliance (missing / no French); High risk (incomplete) |
| QC-03 | Identifying, locating or profiling technologies OFF by default: no Meta/LinkedIn/TikTok pixel, ad cookies, cross-site analytics or IP-geolocation calls before activation or after refusal | `consent.no-interaction.thirdPartyRequests[]`, `consent.reject.thirdPartyRequests[]`, `consent.no-interaction.cookies[].suspectedTracker` (run with `--locale=fr-CA`) | Non-compliance |
| QC-04 | User told **before collection** about the technology and how to activate it (banner text) | `consent.banner.found`, banner text | Non-compliance |
| QC-05 | Consent requested per purpose (granular categories, not one bundle) | `consent.banner.settings`; manual: second layer | High risk |
| QC-06 | French version of commercial content (home, services, banner, forms, T&C) at least equivalent to other languages (s.52; T&C in French first) | `pages[].htmlLang`, `hreflang[]`, `languageLinks[]`; manual: compare `/fr` vs `/en` | Non-compliance |
| QC-07 | Written PIA and agreement for processors outside Quebec (s.17) | manual: ask the client | Not assessable |

## Canada — Alberta and British Columbia (PIPAs)
**Applies when:** intra-provincial commercial activity in Alberta or BC (substantially similar private-sector laws). Interprovincial and international flows stay under PIPEDA. UNVERIFIED

**Privacy notice:** reasonable-person test for consent; notice of purposes and a contact for questions. UNVERIFIED

**Cookies and tracking:** **opt-out (deemed) consent** with notice is allowed. UNVERIFIED

**Forms and marketing:** CASL (see Canada federal).

**Children:** no fixed age of consent; the test is capacity to understand.

**Pending changes:**
- Alberta: online survey on PIPA updates ran 2–17 Feb 2026; OIPC engagement planned for spring 2026; **no bill** as of the page's last update (3 Mar 2026); a legislative committee made 12 recommendations in Feb 2025.
- BC: no 2025–2026 reform known. UNVERIFIED

**Sources:** https://www.alberta.ca/index%2Ephp/personal-information-protection-act-engagement · https://www.priv.gc.ca/en/privacy-topics/collecting-personal-information/consent/gl_omc_201805/

### Checks — Alberta / BC
No province-specific checks. Apply CA-01 to CA-08 and report them under the CA- IDs, noting the province.

## Brazil
**Applies when:** LGPD art. 3 applies regardless of the company's seat or data location if processing happens in Brazil; or the purpose is offering goods or services to people in Brazil or processing their data; or the data was collected in Brazil (the data subject was in Brazil at collection). Marco Civil art. 11 also applies when any collection or processing act occurs in Brazil. A form or tracker collecting data from visitors in Brazil can trigger it; treat `pt-BR`, BRL prices or a Brazilian address as targeting.
- Laws: LGPD (Lei 13.709/2018), Marco Civil da Internet (Lei 12.965/2014), CDC (Lei 8.078/1990), Decreto 7.962/2013, LBI (Lei 13.146/2015), ECA Digital (Lei 15.211/2025).

**Privacy notice:**
- LGPD art. 9 (clear, adequate, ostensive): specific purpose; form and duration of processing; controller identity and contact; shared use and its purpose; responsibilities of the agents; art. 18 rights. Consent is void if the information was misleading, abusive or not transparent (§1).
- Legal basis per purpose (arts. 7, 11). UNVERIFIED (standard practice)
- Marco Civil art. 7 VIII–IX: clear and complete information on collection and use; **express consent highlighted separately** from other contract clauses.
- Language: CDC art. 31 requires offer and presentation information **"em língua portuguesa"**. The ANPD cookie guide lists a policy only in a foreign language as bad practice.

**Cookies and tracking (ANPD "Guia orientativo – Cookies e proteção de dados pessoais", Oct 2022, file modified 23 Jan 2025):**
- Strictly necessary: legitimate interest. **Non-necessary (advertising, and as a rule analytics/performance): consent.** Legitimate interest may cover analytics only in certain contexts (aggregated data, no profiling, no cross-combination). For third-party advertising or profiling cookies legitimate interest "dificilmente será a hipótese legal mais apropriada".
- First layer: a **"reject all" button for non-necessary cookies, as visible as Accept**; a link to exercise data-subject rights.
- Second layer: categories with plain descriptions; consent per category; non-consent cookies **off by default**; browser guidance only as a complement.
- Invalid: pre-ticked boxes; continued browsing as consent; an "Aceitar"-only or "Estou de acordo"-only banner; Accept emphasised over Reject; cookie walls without effective options; policy only in a foreign language.
- Cookie policy: purposes, retention, third-party sharing, art. 9 items; may be a separate page, part of the privacy notice, or inside the banner.
- Model: **opt-in for non-necessary cookies**, Reject All in the first layer (close to the Spanish AEPD model).
- Words to look for: "Aceitar", "Aceitar todos", "Rejeitar", "Rejeitar todos", "Recusar", "Somente necessários"; red flags "Estou de acordo", "Entendi" as the only button; links "Política de Privacidade", "Aviso de Privacidade", "Política de Cookies", "Encarregado", "CNPJ", "acessibilidade".

**Forms and marketing:**
- No specific anti-spam statute; basis is LGPD consent or legitimate interest, opt-out in each message as best practice (CAPEM self-regulatory code). UNVERIFIED
- Pre-ticked boxes are not valid consent (ANPD cookie guide reasoning).

**Identification / imprint:** see Selling online (Decreto 7.962 art. 2). No general imprint rule outside e-commerce.

**Selling online (Decreto 7.962/2013):**
- art. 2, prominently on the site: business name and **CNPJ/CPF**; physical and electronic address and contact; essential characteristics and risks; extra costs (delivery, insurance) itemised; full offer conditions (payment, availability, delivery time); restrictions.
- art. 4: contract summary before purchase; tools to correct errors; immediate confirmation; contract available to save; effective electronic customer-service channel with replies within 5 days; secure payment.
- art. 5: clearly shown means to exercise withdrawal, usable through the same channel used to buy. CDC art. 49: 7-day withdrawal for off-premises purchases.
- Marco Civil art. 15: application providers that are legal entities acting professionally for profit must keep **access logs for 6 months**, confidentially. Relevant with user accounts; a static site's hosting logs are a grey area (UNVERIFIED).

**Accessibility:** LBI art. 63: accessibility mandatory on websites of **companies headquartered or with commercial representation in Brazil**, following international best practices; §1 requires an accessibility symbol displayed prominently. No WCAG level fixed by law; eMAG mandatory for the federal government only; WCAG 2.x AA is the de-facto benchmark (UNVERIFIED). Enforcement mostly via the Ministério Público or civil suits (UNVERIFIED).

**Transfers:**
- Resolução CD/ANPD 19/2024 (23 Aug 2024) (secondary: Demarest; in force per the ANPD page, corrected 18 Aug 2025): SCCs must be adopted **verbatim**; contracts had until **23 Aug 2025**; clauses available to data subjects on request within 15 days; the controller must **publish on its website a Portuguese-language page** on the transfer: form, duration and purpose; destination country; controller identity and contact; shared use; responsibilities and security; rights and how to exercise them, including a petition to the ANPD. Exact article number for the publication duty: UNVERIFIED.
- Res. CD/ANPD 32 (26 Jan 2026): **EU adequate**. No US adequacy: US processors (Google, Vercel, Meta) need SCCs or another art. 33 mechanism. Big providers' DPAs typically include Brazilian SCCs (UNVERIFIED; check each vendor).

**Officer, representative, registration:**
- LGPD art. 41 §1: appoint an encarregado and publish identity and contact "de forma clara e objetiva", preferably on the website.
- Resolução CD/ANPD 18/2024 (16 Jul 2024), arts. 8–9: publish **on the website, in a prominent, easily accessible place**: natural person, **full name**; legal person, corporate name **plus the full name of the responsible natural person**; contact channels for data subjects and the ANPD. art. 3 §3: **agentes de pequeno porte** (Res. 2/2022) are exempt from appointing one but must provide a communication channel. art. 13: the encarregado communicates in Portuguese.
- A small studio is likely a small agent: minimum is a visible data-subject channel; if an encarregado is appointed, publish name plus contact.

**Children:**
- LGPD art. 14: best interest; children's data needs **specific and highlighted consent from at least one parent**. Child = under 12, adolescent = 12–17 (ECA art. 2) (UNVERIFIED).
- **ECA Digital (Lei 15.211, 17 Sep 2025), in force since 17 Mar 2026** (art. 41-A, added by Lei 15.352/2026): IT products/services **directed to or likely accessed by** children and adolescents in Brazil, wherever the provider is (art. 1); most protective settings by default (art. 7); **ban on profiling for targeted commercial advertising to minors** (arts. 22, 26); age assurance for restricted content, self-declaration banned (art. 9); fines up to 10% of Brazilian revenue, capped at R$50M per infraction (art. 35). ANPD enforcement focus on verification from Jan 2027 (secondary). A studio portfolio is normally not "likely accessed by children"; flag only for kids' brands.

**Penalties and enforcement:**
- LGPD art. 52 II: up to **2% of Brazilian revenue, capped at R$50M per infraction**; also warnings, publicisation, blocking or deletion. Dosimetry: Res. 4/2023.
- Record fine: **TikTok, R$153.7M** (25 Aug 2026) for processing children's and adolescents' data without a valid legal basis (secondary).
- The ANPD now operates as a regulatory agency (Agência Nacional de Proteção de Dados) with ECA Digital and Marco Civil powers (secondary); statute number UNVERIFIED.

**Pending changes:** priority themes 2026–2027 (Res. 30/2025); regulatory agenda 2025–2026 (Res. 23/2024 as amended by Res. 31/2025); revision of fine-calculation and enforcement rules.

**Sources:** https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm · https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm · https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm · https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm · https://www.planalto.gov.br/ccivil_03/_Ato2023-2026/2025/Lei/L15211.htm · https://legis.senado.leg.br/sdleg-getter/documento?dm=9134365 (LBI) · https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd · https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@display-file/file · https://www.lgpd.ms.gov.br/wp-content/uploads/2025/07/RESOLUCAO-CD_ANPD-No-18-DE-16-DE-JULHO-DE-2024-Aprova-o-Regulamento-sobre-a-atuacao-do-encarregado-pelo-tratamento-de-dados-pessoais.pdf · https://www.demarest.com.br/anpd-aprova-o-regulamento-de-transferencia-internacional-de-dados/ (secondary) · https://www.correiobraziliense.com.br/cbradar/lei-15-211-o-eca-digital-preve-multa-de-ate-10-do-faturamento-no-brasil-limitada-a-r-50-milhoes-por-infracao-e-a-anpd-marca-janeiro-de-2027-para-comecar-as-acoes-de-fiscalizacao-com-foco-na-veri/ (secondary) · https://diariodonordeste.verdesmares.com.br/ultima-hora/tecnologia/anpd-multa-tiktok-em-r-153-milhoes-por-falhas-no-tratamento-de-dados-de-criancas-e-adolescentes-1.3786714 (secondary) · https://araujopolicastro.com.br/anpd-maior-multa-dados-menores/ (secondary) · https://dnalaw.law/2026/09/29/anpd-amplia-sua-atuacao-o-que-pode-mudar-na-fiscalizacao-das-empresas/ (secondary)

### Checks — Brazil
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| BR-01 | Privacy notice ("Política de Privacidade" / "Aviso de Privacidade") in **Portuguese**, linked on every page, with art. 9 items: purposes, legal basis per purpose, retention, controller ID and contact, sharing and recipients, art. 18 rights | `pages.links.privacy`; `policy.lang`; `policy.items.br` | Non-compliance |
| BR-02 | Encarregado identity and contact published prominently (full name, or company name + full name of responsible person, plus channel); small agent: at least a data-subject channel | `policy.items.br` (dpo); manual: search "encarregado", "DPO" | Non-compliance (no channel); High risk (no encarregado name when not a small agent) |
| BR-03 | Banner first layer: "Rejeitar todos" as prominent as "Aceitar", plus a link to exercise rights; no Accept-only / "Estou de acordo" / "Entendi" banner | `consent.banner.symmetry`, `consent.banner.reject`, `consent.banner.rejectSameLayer` (run `--locale=pt-BR`) | Non-compliance |
| BR-04 | Non-necessary trackers (GA, pixels, Hotjar, YouTube, Maps, remote Google Fonts) do not load before consent or after rejection | `consent.no-interaction.thirdPartyRequests[]`, `consent.reject.thirdPartyRequests[]`, `.cookies[]` | Non-compliance (ads/pixels); High risk (analytics, fonts, embeds) |
| BR-05 | Granular second layer by category, non-necessary off by default, permanent link to reopen settings | `consent.banner.settings`, `pages.links.cookieSettings`; manual: second layer | High risk |
| BR-06 | Cookie policy in Portuguese: purposes, retention, third parties, transfers | `pages.links.cookies`, `policy.lang`, `policy.vendors.missingFromPolicy[]` | High risk |
| BR-07 | International transfer page in Portuguese (Res. 19/2024) when US or other non-EU processors are detected | `policy.vendors.detected[]`, `policy.transfers.countriesNamed[]`; manual: look for the transfer page | High risk |
| BR-08 | Newsletter consent not pre-ticked, separate and highlighted (Marco Civil art. 7 IX); unsubscribe in templates | `pages.forms[].checkboxes[].preChecked`, `.marketingCheckbox`; manual: templates | Non-compliance (pre-ticked); Improvement (no unsubscribe) |
| BR-09 | (B2C) Decreto 7.962: business name + **CNPJ**, physical and electronic address, itemised extra costs, offer conditions; contract summary, error correction, confirmation, downloadable contract, customer-service channel; withdrawal means shown clearly (7 days) | `pages.identification.ids.cnpjBR` (pattern `\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}`), `.address`, `.email`; `pages.links.withdrawal`; manual: checkout | Non-compliance |
| BR-10 | LBI art. 63: axe-core (WCAG 2.1 AA as benchmark); accessibility symbol or statement | `pages.links.accessibilityStatement`; manual: axe, search "acessibilidade" | High risk |
| BR-11 | Kids' brand only: no ad profiling or pixels (ECA Digital arts. 22, 26), most protective defaults | `signals.kidsTerms`; `consent.no-interaction.thirdPartyRequests[]` | Non-compliance if applicable; otherwise skip |

## Mexico
**Applies when:** private parties processing personal data. The new law has no express extraterritorial article; the old Reglamento art. 4 covered foreign controllers using means in Mexico (UNVERIFIED). The new definition of "responsable" is broad (secondary: HLC). Treat `es-MX`, MXN prices or a Mexican address as targeting.
- **New LFPDPPP**: DOF **20 Mar 2025**, in force **21 Mar 2025**; abrogates the 2010 law; last reform DOF 14 Nov 2025 (procedural harmonisation).
- Authority: the INAI was dissolved. Regulator: **Secretaría Anticorrupción y Buen Gobierno** (Dirección General de Datos Personales en el Sector Privado). Challenges via amparo instead of the TFJA (secondary: IAPP).

**Privacy notice (aviso de privacidad):**
- art. 15, integral notice: (1) identity and address of the controller; (2) personal data processed, **flagging sensitive data**; (3) purposes, **distinguishing those requiring consent**; (4) options and means to limit use or disclosure; (5) means to exercise ARCO rights; (6) how changes will be communicated. The duty to list transfers was dropped; lawyers recommend keeping it (secondary).
- art. 16 II: electronic collection (web forms) may use a **simplified notice** with items I–IV and where to find the integral notice. Formats went from three (integral/simplificado/corto) to two (secondary: Garrigues, HLC).
- Consent (arts. 7–8): express or **tacit** (valid if the notice was available and the person does not object, unless express consent is required); financial or asset data, express; **sensitive data, express written consent** (signature or authentication); revocable at any time, and the notice must say how.
- Language: the LFPC requires Spanish for consumer information. UNVERIFIED

**Cookies and tracking:**
- The new law does not regulate cookies or web beacons expressly. The 2011 Reglamento (art. 14) and 2013 Lineamientos del Aviso de Privacidad required the notice to disclose cookies, web beacons and similar tools, the data collected and how to disable them. Whether they survive the 2025 law is UNVERIFIED; Garrigues implies the Reglamento still applies where not contrary to the law.
- Model: **notice plus opt-out** (tacit consent) for non-sensitive data. Include a "Uso de cookies y tecnologías de rastreo" section in the aviso with disable instructions.
- Words to look for: "Aviso de privacidad", "Aviso de privacidad simplificado", "Derechos ARCO", "Aceptar", "Rechazar todo", "Solo necesarias", "No deseo recibir publicidad".

**Forms and marketing:**
- LFPC art. 76 bis VI: in e-commerce the supplier must respect the consumer's decision **not to receive commercial notices**.
- Profeco **REPEP** do-not-call registry (LFPC art. 18). UNVERIFIED
- Marketing is a secondary purpose; the aviso must offer a way to refuse it (opt-out). UNVERIFIED

**Selling online (LFPC art. 76 bis):** confidentiality; security, with its characteristics disclosed; **before the transaction, physical address, phone numbers and other complaint channels**; no deceptive practices; terms, conditions, costs, extra charges and payment methods; respect choices including no ads; care with vulnerable audiences. NMX-COE-001-SCFI-2018 (e-commerce) is voluntary (UNVERIFIED). NOM-151-SCFI-2016 governs data-message preservation, not website disclosure (UNVERIFIED).

**Accessibility:** no binding WCAG duty for private websites. UNVERIFIED

**Transfers:** communication to third parties inside or outside Mexico requires the aviso and generally consent unless exempt; sending data to processors ("remisión") needs no consent (secondary: Garrigues; partly UNVERIFIED).

**Officer, representative, registration:** art. 29: a designated **person or department** for data protection and ARCO requests. No website publication duty, but the ARCO contact must be in the aviso.

**Children:** no specific age in the LFPDPPP; minors (under 18) act through legal representatives under civil law. UNVERIFIED

**Penalties and enforcement (art. 59):** 100–160,000 UMA (art. 58 II–VII); 200–320,000 UMA (art. 58 VIII–XVIII); repeat offences an additional 100–320,000 UMA; sensitive data up to double.

**Pending changes:** new Reglamento or Lineamientos not found. Two Chamber bills (Sept and Oct 2026) propose LFPC reforms; content UNVERIFIED.

**Sources:** https://www.diputados.gob.mx/LeyesBiblio/ref/lfpdppp.htm · https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf · https://www.gob.mx/cms/uploads/attachment/file/589920/COMERCIO_ELECTRONICO_P.SE_141020.pdf · https://www.garrigues.com/es_ES/noticia/mexico-nueva-ley-federal-proteccion-datos-personales-posesion-particulares-introduce (secondary) · https://iapp.org/news/a/entendiendo-la-ley-federal-de-protecci-n-de-datos-personales-en-posesi-n-de-los-particulares-en-mexico (secondary) · https://www.hlc.com/es/publications/mexicos-new-federal-data-protection-law-what-it-means-for-companies (secondary)

### Checks — Mexico
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| MX-01 | Aviso de privacidad integral in Spanish, linked on every page, with art. 15 items (controller identity and **address**, data with sensitive flagged, purposes split by consent need, means to limit use, **ARCO** procedure, how changes are notified) | `pages.links.privacy`; `policy.lang`; `policy.items.mx`; manual: search "ARCO" | Non-compliance |
| MX-02 | Simplified notice at each form (art. 16 II): identity and address, data, purposes, limitation means, link to the integral notice | `pages.forms[].noticeNearby`, `.nearbyText` | Non-compliance |
| MX-03 | Cookies, web beacons and trackers disclosed in the aviso with how to disable them | `policy.vendors.missingFromPolicy[]`; manual: cookie section | High risk (basis UNVERIFIED after the 2025 law) |
| MX-04 | Marketing as a secondary purpose with an opt-out (e.g. checkbox "No deseo recibir publicidad") | `pages.forms[].checkboxes[].label`; manual: aviso text | High risk |
| MX-05 | Sensitive data in forms (health, etc.) has express written consent (signature or authentication) | `pages.forms[]`, `signals.healthTerms`; manual: field review | Non-compliance |
| MX-06 | Obsolete references: "INAI", "IFAI", "Ley … 2010" as current authority or law | `pages.obsoleteRefs[]`, `policy.obsoleteRefs[]`; manual: text search | Improvement (Non-compliance if the rights or complaint route is wrong) |
| MX-07 | (B2C) LFPC art. 76 bis: physical address, phone numbers and complaint channels before the transaction; T&C, costs, payment methods; opt-out from commercial notices | `pages.identification.address`, `.phone`; `signals.commerce`; manual: checkout | Non-compliance |

## Argentina
**Applies when:** Ley 25.326 (2000) is in force; extraterritorial scope UNVERIFIED. Treat `es-AR`, ARS prices, an Argentine address or CUIT as targeting. Authority: **AAIP** (Agencia de Acceso a la Información Pública) and its Dirección Nacional de Protección de Datos Personales. EU adequacy (2003) (UNVERIFIED). Convention 108+ ratified by Ley 27.699 (UNVERIFIED).

**Privacy notice:**
- Ley 25.326 art. 6: purpose, recipients, database/controller, whether answers are mandatory, consequences, rights. UNVERIFIED
- **Disposición DNPDP 10/2008**: **two legends** displayed prominently on the website, in communications and especially **on data-collection forms**: (1) the right of free access at intervals of no less than 6 months (art. 14.3): *"El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita…"*; (2) the control authority "tiene la atribución de atender las denuncias y reclamos" — now name the **AAIP** (secondary: ligadelconsorcista.org).
- Language: Ley 24.240 requires consumer information in Spanish. UNVERIFIED

**Cookies and tracking:** no specific rule. Art. 5 requires free, express, informed consent (written or equivalent) unless an exception applies. In practice: banner plus policy, consent for tracking. UNVERIFIED
- Words to look for: "Aceptar", "Rechazar todo", "Solo necesarias"; "Botón de arrepentimiento" (withdrawal button), "Botón de baja de servicio"; "en forma gratuita a intervalos no inferiores a seis meses"; "Agencia de Acceso a la Información Pública"; "CUIT".

**Forms and marketing:**
- **Ley 26.951 "No Llame"** covers telephone in all forms; advertisers must check the registry at least every 30 days (Res. AAIP 126/2024 Annex V) (secondary: Beccar Varela).
- Email marketing: opt-out in each message (Decreto 1558/2001, art. 27). UNVERIFIED

**Selling online (Disposición 954/2025, Subsecretaría de Defensa del Consumidor, BO 4 Sep 2025, in force the same day; repeals Res. 424/2020 and Res. 316/2018):**
- **"BOTÓN DE ARREPENTIMIENTO" (withdrawal button: lets the consumer cancel a purchase within the withdrawal period) link on the first page, prominent**, with no registration or extra steps (art. 1). It is not a complaints book.
- **"BOTÓN DE BAJA DE SERVICIO"** with the same placement if services are contracted (art. 4; 60-day adaptation, so early Nov 2025).
- Tracking code within 24 hours (art. 5).
- Published phone or other complaint channel, available at least 8 hours on weekdays if remote-only (art. 6).
- Ley 24.240 art. 34 and CCyC art. 1110: 10-day withdrawal right.

**Accessibility:** Ley 26.653 covers the public sector and companies linked to the state (concessionaires, contractors, subsidised entities), not general private sites. UNVERIFIED

**Transfers:** **the US is not adequate.** Adequate list (Disp. 60/2016, Res. 34/2019): EU/EEA, UK, Switzerland, Guernsey, Jersey, Isle of Man, Faroe Islands, Andorra, New Zealand, Uruguay, Canada (private sector), Israel (automated processing). Mechanisms: **AAIP model clauses (Res. 198/2023)**, BCRs (Res. 159/2018), or express consent. Non-model contracts must be filed with the AAIP within 30 days.

**Officer, representative, registration:** databases must be registered in the Registro Nacional de Bases de Datos (art. 21) (duty UNVERIFIED); the AAIP uses the registry for "No Llame" consultations (secondary). Not testable on a website.

**Children:** no specific data age. Bills propose 13 or 16 (secondary). Civil Code art. 26 (adolescent from 13) (UNVERIFIED).

**Penalties and enforcement:** Res. AAIP 126/2024 (from 1 Jun 2024): infractions minor, serious, very serious; caps on accumulated identical fines AR$40M / 45M / 50M; 50% discount for payment within 20 business days; a register of violators (secondary).

**Pending changes:**
- **3397-D-2026**, filed 16 Jul 2026, early stage; reproduces the 2023 executive bill; adolescents 16+ could consent (secondary: Allende).
- **1751-D-2026** (Yeza), in committee: DPO only at the "advanced" tier; fine cap 3% of Argentine turnover; consent age 13 (secondary).

**Sources:** https://www.argentina.gob.ar/transferencias-internacionales · https://www.argentina.gob.ar/normativa/nacional/norma-417152/texto · https://ligadelconsorcista.org/legislacion/informaci-n-en-la-p-ginas-web-el-acceso-los-datos-personales-disposic-102008-dir-nac (secondary) · https://beccarvarela.com/en/novedades/data-protection-law-and-do-not-call-law-modifications-to-the-sanctioning-regime/ (secondary) · https://abogados.com.ar/resolucion-1262024-aaip-cambios-en-la-clasificacion-de-infracciones-a-las-leyes-nro-25326-y-26951-y-en-el-regimen-de-graduacion-de-sanciones/34897 (secondary) · https://allende.com/privacidad-y-ciberseguridad/se-reintroduce-en-el-congreso-el-proyecto-de-reforma-integral-del-regimen-argentino-de-proteccion-de-datos-personales-08-12-2026/ (secondary) · https://leydedatospersonales.tech/ (secondary)

### Checks — Argentina
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| AR-01 | Privacy policy in Spanish with art. 6 information (purpose, recipients, controller, mandatory answers, consequences, rights) | `pages.links.privacy`; `policy.lang`; `policy.items.ar` | Non-compliance |
| AR-02 | Disp. 10/2008 legends (free access every 6 months; AAIP as complaints body) on forms and the site | `pages.forms[].nearbyText`; manual: search "en forma gratuita a intervalos no inferiores a seis meses", "AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA" | Non-compliance (formal, low enforcement) |
| AR-03 | Legend still names "Dirección Nacional de Protección de Datos Personales" as an independent authority instead of the AAIP | `pages.obsoleteRefs[]`, `policy.obsoleteRefs[]`; manual: text | Improvement |
| AR-04 | Banner present; express consent for tracking cookies | `consent.banner.found`, `consent.no-interaction.thirdPartyRequests[]` (run `--locale=es-AR`) | High risk |
| AR-05 | US processors: policy mentions the transfer and its safeguard (AAIP model clauses, Res. 198/2023) or consent | `policy.vendors.detected[]`, `policy.transfers.countriesNamed[]` | High risk |
| AR-06 | (B2C) "Botón de arrepentimiento" (withdrawal button) link prominent on the first page, no login; "Botón de baja de servicio" (service cancellation) if services are sold; published complaint channel (Disp. 954/2025) | `pages.links.withdrawal`; manual: link text `arrepentimiento`, `baja`; complaint phone or channel | Non-compliance |
| AR-07 | Database registered in the national registry | manual: ask the client | Not assessable |

## Chile
**Applies when (Ley 21.719, art. 1 bis):** controller or processor established in Chile; a processor working for a Chilean controller; a foreign controller **offering goods or services to people in Chile or monitoring their behaviour in Chile**; Chilean law applies by contract or international law. Visibility alone is not enough.
- **Ley 21.719** (Diario Oficial **13 Dec 2024**) rewrites Ley 19.628. **Enters into force 1 Dec 2026** (secondary: sglegal, califix).
- **Postponement (Boletín 18.623-07):** Mensaje of Aug 2026; entered the Senate 1 Sep 2026; "discusión inmediata" from 21 Oct 2026. On 27 Oct 2026 the Senate Constitution Committee approved a new date of **15 Oct 2027** (the Executive proposed 1 Dec 2027) and enlarged the Agency council from 3 to 5 members (secondary: Diario Estrategia). On **28 Oct 2026** the Senate floor approved the bill in general and in particular (session 75/374), 33 in favour, 6 against (secondary: DF, Ciberlatam), with the 15 Oct 2027 date; "discusión inmediata" renewed. It is now at "Oficio de ley a Cámara Revisora" (second stage, Cámara de Diputados). **It is not law and has not been published**: no law number, no Diario Oficial date. Whether the Cámara has voted is UNVERIFIED.
- **Report rule:** "Ley 21.719 applies from 1 Dec 2026 unless the postponement is published before then."
- Authority: **Agencia de Protección de Datos Personales**, autonomous; council appointed with 2/3 Senate approval; the Senate rejected the first slate on 20 May 2026 (secondary: parlamento.ai).

**Privacy notice (art. 14 ter, published permanently on the website):** privacy policy **with date and version**; controller identity, **legal representative** and any prevention officer; contact channel; data categories, data subjects, recipients, purposes, legal basis and any legitimate interests; security measures; rights (access, rectification, erasure, objection, portability) and the right to complain to the Agency; international transfers and their protection level; retention periods and data sources; right to withdraw consent; automated decisions and profiling with meaningful information about the logic.
- Legal bases (art. 13): consent; legal obligation; contract or pre-contract; **legitimate interest** (the data subject can always ask what it is); legal claims.

**Cookies and tracking:** no cookie-specific article. Trackers processing personal data need a legal basis; consent (free, informed, specific, unequivocal) is the safe route for advertising and profiling; legitimate interest may cover first-party analytics. Expect Agency guidance. UNVERIFIED
- Words to look for: "Aceptar", "Rechazar todo", "Solo necesarias"; "Política de privacidad", "versión", "representante legal", "Agencia de Protección de Datos Personales", "RUT".

**Forms and marketing:** Ley 19.496 art. 28 B: promotional emails must state the subject and sender identity and include a valid address to request suspension; after a request, further sending is banned. Amended by Ley 21.398 (2021). UNVERIFIED

**Selling online:** Ley 19.496 art. 12 A (withdrawal and terms for electronic contracts) and art. 3 bis (10-day withdrawal for remote purchases unless the seller excludes it); show the seller's identity and contact. UNVERIFIED

**Accessibility:** no binding WCAG duty for private websites (Ley 20.422 is general). UNVERIFIED

**Transfers (arts. 27–28):** to adequate countries (list to be published by the Agency) or with safeguards: contractual clauses (Agency model clauses), BCRs or certification; otherwise only one-off exceptions such as express consent. The exporter bears the burden of proof. For US tools use providers' DPAs/SCCs and update to Agency model clauses once published.

**Officer, representative, registration:** **voluntary** delegado de protección de datos within an infraction-prevention (compliance) model; the Agency can certify such models, mitigating sanctions (UNVERIFIED). The Agency supervises compliance models (art. 30 bis m). The policy must name the **legal representative**.

**Children (art. 16 quáter):** under 14, consent from a parent or guardian; 14–17 follow adult rules, **except sensitive data under 16** (parental consent).

**Penalties and enforcement:** minor up to 5,000 UTM; serious up to 10,000 UTM; very serious up to 20,000 UTM; repeat offences up to triple, or a percentage of annual revenue for non-small companies (secondary: Diario Constitucional; exact 2% / 4% UNVERIFIED). National register of sanctions (art. 30 bis m).

**Pending changes:** Boletín 18.623-07 (above); Agency council appointment; first Agency guidance and model clauses.

**Sources:** https://www.diariooficial.interior.gob.cl/publicaciones/2024/12/13/44023/01/2583630.pdf · https://tramitacion.senado.cl/wspublico/tramitacion.php?boletin=18623 · https://www.df.cl/senado-aprueba-modificaciones-al-proyecto-que-posterga-la-entrada-en (secondary) · https://ciberlatam.com/en/news/chile-delays-data-protection-law (secondary) · https://www.diarioestrategia.cl/texto-diario/mostrar/6067501/proteccion-datos-personales-comision-aprueba-ley-entre-vigencia-15-octubre-2027 (secondary) · https://parlamento.ai/r/proteccion-datos-18623-implementacion-2026 (secondary) · https://www.datos.sglegal.cl/ (secondary) · https://www.califix.cl/blog/ley-21719-datos-personales-encargados-contratistas (secondary) · https://www.diarioconstitucional.cl/temas-civicos/la-nueva-ley-que-protege-tus-datos-personales-n-21-719/ (secondary)

### Checks — Chile
Severity column applies from 1 Dec 2026 unless the postponement is published; before that date, report Ley 21.719 items as **Improvement** with the date.

| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| CL-01 | Privacy policy with **date and version**, controller ID **and legal representative**, contact, categories, recipients, purposes, **legal basis and legitimate interests**, security measures, rights incl. **portability**, complaint to the **Agencia**, transfers, retention, sources, withdrawal of consent, automated decisions (art. 14 ter) | `policy.items.cl`, `policy.lastUpdated`; manual: version and legal representative | Non-compliance |
| CL-02 | Profiling or advertising trackers only after consent | `consent.no-interaction.thirdPartyRequests[]` (category `ads`, `social`), `consent.reject.*` (run `--locale=es-CL`) | High risk |
| CL-03 | Promotional emails: subject, sender identity, working address to request suspension (Ley 19.496 art. 28 B) | manual: templates | High risk (basis UNVERIFIED) |
| CL-04 | "Ley 19.628" cited without the Ley 21.719 amendments | `policy.obsoleteRefs[]`; manual: text | Improvement |

## Colombia
**Applies when:** Ley Estatutaria 1581/2012 art. 2: processing in Colombia, plus foreign controllers or processors when Colombian law applies under treaties. SIC practice applies the law to foreign platforms collecting data from devices in Colombia (UNVERIFIED). Authority: **SIC** (Superintendencia de Industria y Comercio). Regulation: Decreto 1377/2013 (compiled in Decreto 1074/2015).

**Privacy notice:**
- Authorisation (Ley 1581 art. 9): **prior and informed**, verifiable later. Decreto 1377 art. 7: valid in writing, orally, or by **unequivocal conduct**; "En ningún caso el silencio podrá asimilarse a una conducta inequívoca."
- At authorisation (Ley 1581 art. 12): the processing and its purpose; that answering about sensitive or children's data is optional; rights; controller identity, address or email, and phone. Keep proof.
- **Política de Tratamiento de la Información** (Decreto 1377 art. 13): (1) controller name or company name, domicile, address, email, phone; (2) processing and purposes (if not in the aviso); (3) rights; (4) **the person or area** handling requests and complaints; (5) procedure to know, update, rectify, delete and revoke; (6) **policy effective date and database validity period**. Clear, simple language; substantial changes communicated before they apply. The NIT is not an art. 13 item (it comes from Ley 1480 art. 50, B2C only).
- **Aviso de privacidad** (arts. 14–15): used when the policy cannot be made available; announces the policy and how to access it, at the latest at collection. Minimum: controller name and contact; processing and purpose; rights; how to access the policy and its changes; if sensitive data, that answering is optional. Does not replace the policy.
- Language: minimum consumer information "en castellano" (Ley 1480 art. 23); prices in COP including taxes (art. 26).

**Cookies and tracking:** no statute and no SIC cookie guide, circular or resolution found. Secondary commentary: Ley 1581 applies when cookies collect personal data, so **prior, express, informed** authorisation is needed (secondary: Asuntos Legales, 2 Jun 2022). SIC-specific cookie criteria UNVERIFIED. Use an opt-in banner with a link to the policy.
- Words to look for: "Aceptar", "Rechazar todo", "Solo necesarias"; "Política de Tratamiento de la Información", "Aviso de privacidad", "Autorizo el tratamiento de mis datos", "NIT", "Superintendencia de Industria y Comercio".

**Forms and marketing:**
- Authorisation under Ley 1581. UNVERIFIED
- **Ley 2300/2023 ("Dejen de fregar")**, 10 Jul 2023 (Diario Oficial 52.452), in force 10 Oct 2023 (art. 10). Art. 3: contact **Mon–Fri 7:00–19:00 and Sat 8:00–15:00**, none on Sundays or holidays; once contacted, not "mediante varios canales dentro de una misma semana ni en más de una ocasión durante el mismo día". **Art. 5** extends this to advertising by SMS, app or web messaging, **email** and commercial calls; par. 3: advertising only within those hours. Par. 2: commercial messages cannot be a condition of purchase or entry; **promotions to feed databases need explicit acceptance**; an **agile, simple mechanism to stop messages and emails at any time**.

**Identification / imprint / Selling online (Ley 1480/2011 art. 50):** **name or company name, NIT, address for notifications, phone, email**; product information; payment methods, delivery time, **right of withdrawal and how to use it**, total price including taxes, shipping shown separately; **downloadable T&Cs**; **order summary** with correction before payment; express acceptance; confirmation by the next calendar day; records and security; complaint channel issuing a case number; delivery within 30 days by default; **a link to the SIC website**; silence is never acceptance. Withdrawal: 5 business days, refund within 15 calendar days (art. 47). Payment reversal (art. 51).

**Accessibility:** Ley 1618/2013 and MinTIC Resolución 1519/2020 (WCAG 2.1 AA) apply to public entities, not general private sites. UNVERIFIED

**Transfers (Ley 1581 art. 26):** transfers to non-adequate countries prohibited unless express consent, an exception, or an SIC declaration of conformity. The SIC adequate list (Circular Externa 005/2017) **includes the USA** (UNVERIFIED). Transmission to processors needs a transmission contract (Decreto 1377 art. 25) (UNVERIFIED).

**Officer, representative, registration:**
- Decreto 1377 art. 23: "designar a una persona o área que asuma la función de protección de datos personales". The "oficial de protección de datos" label comes from SIC accountability guidance (UNVERIFIED). Name it in the policy.
- **RNBD** (Ley 1581 art. 25; Decreto 090/2018 amending Decreto 1074/2015 art. 2.2.2.26.1.2): mandatory for **companies and non-profits with total assets above 100,000 UVT** and public legal persons; natural persons excluded; new databases registered **within 2 months of creation**.

**Children (Decreto 1377 art. 12; Ley 1581 art. 7):** processing prohibited except public-nature data; where allowed, respect the minor's best interests, and the legal representative authorises after the minor is heard (Constitutional Court C-748/11).

**Penalties and enforcement (Ley 1581 art. 23):** up to **2,000 SMMLV**, repeatable while the violation continues; suspension up to 6 months; closure.

**Sources:** https://www.secretariasenado.gov.co/senado/basedoc/ley_1581_2012.html · https://www.funcionpublica.gov.co/eva/gestornormativo/norma_pdf.php?i=53646 · https://www.funcionpublica.gov.co/eva/gestornormativo/norma_pdf.php?i=85039 · https://normograma.com/documentospdf/PruebaMintic/docs/ley_2300_2023.htm · https://www.secretariasenado.gov.co/senado/basedoc/ley_1480_2011_pr001.html · https://www.secretariasenado.gov.co/senado/basedoc/ley_1480_2011.html · https://www.asuntoslegales.com.co/consumidor/conozca-los-aspectos-legales-que-debe-tener-en-cuenta-al-usar-cookies-en-sitios-web-3375211 (secondary)

### Checks — Colombia
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| CO-01 | Política de Tratamiento published with art. 13 items: controller name, domicile, address, email, phone; purposes; rights; person or area handling requests; procedure; effective date and database validity | `pages.links.privacy`; `policy.items.co`; manual: effective date | Non-compliance |
| CO-02 | Forms collect prior, express, informed authorisation (not pre-ticked, or unequivocal action) with art. 12 information | `pages.forms[].checkboxes[].preChecked`, `.label`, `pages.forms[].noticeNearby` | Non-compliance |
| CO-03 | Trackers collecting personal data load only after authorisation | `consent.no-interaction.thirdPartyRequests[]`, `consent.reject.*` (run `--locale=es-CO`) | High risk |
| CO-04 | (B2C) Ley 1480 art. 50: name, **NIT**, address, phone, email; prices in COP incl. taxes; downloadable T&C; order summary; withdrawal info; **link to the SIC website** | `pages.identification.ids.nitCO`, `.address`, `.phone`, `.email`; `signals.currencies[]`; manual: checkout, SIC link | Non-compliance |
| CO-05 | Newsletter: working unsubscribe link in templates; sign-up incentives (promotions to feed databases) use explicit opt-in (Ley 2300 art. 5 par. 2) | `pages.forms[].marketingCheckbox`, `.checkboxes[].preChecked`; manual: templates | High risk |
| CO-06 | Advertising contact hours (Mon–Fri 7–19, Sat 8–15) and frequency (no several channels in one week, no more than one contact per day) | manual: ask the client about sending schedules | Not assessable |
| CO-07 | RNBD registration (if assets above 100,000 UVT) | manual: ask the client | Not assessable |

## Peru
**Applies when:** Ley 29733 (2011) and the **Reglamento D.S. 016-2024-JUS** (El Peruano **30 Nov 2024**; in force 120 calendar days later, about **30 Mar 2025** (secondary: CMS says 29 Mar 2025, kom.pe 30 Mar 2025); exact final-provision wording UNVERIFIED). It replaces D.S. 003-2013-JUS. Reglamento art. VI applies to: an establishment in Peru; a processor for a Peru-based controller; a non-Peru controller using means in Peru, **including offering goods or services to people in Peru, or profiling or analysing their behaviour**; cases under contract or international law.
- Authority: the ANPD within MINJUSDH, acting through the DGTAIPD. The Ley 29733 copy still shows the original art. 32 wording ("Dirección Nacional de Justicia"); read it with the later reorganisation. The "Yo Cuido Mis Datos Personales" complaints platform was created by the Reglamento (secondary: CMS).

**Privacy notice:**
- Ley 29733 art. 18: detailed, simple, express, unequivocal, before collection. Online, the duty can be met by publishing easy-to-find privacy policies.
- Reglamento art. 6.1, ten minimum items for direct collection: (1) controller identity and address (and representative); (2) purposes; (3) recipients; (4) existence and identification of the database; (5) whether answers are mandatory; (6) consequences of providing or refusing data; (7) national and international transfers; (8) automated decisions, including profiling; (9) retention period; (10) how to exercise rights.
- Art. 7: a published privacy policy is "una forma de cumplimiento del deber de información" but does not replace consent.
- Consent (art. 5): free, prior, express, informed and unequivocal. Art. 5.1(3): clicking ("hacer clic", "cliquear") is express consent; art. 5.2: unequivocal means "aceptación indubitable"; art. 5.3: expressing will does not waive the free, prior and informed requirements.
- Language: Spanish. UNVERIFIED

**Cookies and tracking:** "cookies" does not appear in Reglamento arts. I–77; pre-ticked boxes and browsing are not addressed. Online identifiers are personal data (art. III.4: "identificadores en línea"). "Pre-ticked boxes and continued browsing are invalid" is an inference from the express, unequivocal consent standard, not express text (UNVERIFIED as a textual rule). No ANPD cookie guidance found (UNVERIFIED). Safe reading: **opt-in for non-necessary cookies**.
- Words to look for: "Aceptar", "Rechazar todo", "Solo necesarias"; "Libro de Reclamaciones", "Política de privacidad", "Oficial de Datos Personales", "derechos ARCO", "RUC".

**Forms and marketing:**
- Reglamento art. 26: marketing lawful with consent obtained directly (26.1); one first contact to request consent is allowed, no new contact after refusal (26.2); opt-out no harder than giving consent, response within 10 days (26.5).
- **Código de Protección y Defensa del Consumidor art. 58.1(e)**, as amended by **Ley 32323** (El Peruano **9 May 2025**) (secondary: LP Derecho reproduction): no call centres, automated calls, mass SMS, mass email or telemarketing to promote products or services. **Only exception:** a consumer who contacts the supplier **on their own initiative** and gives free, prior, informed, express and unequivocal consent. Revocable at any time with immediate effect. Breach is an **infracción muy grave**. Effective the day after publication (~10 May 2025) per Constitution art. 109 — not stated in the source, UNVERIFIED.
- CMS reads Ley 32323 as **banning even an unsolicited first contact**; this conflicts with Reglamento art. 26.2 and the law prevails for INDECOPI enforcement (secondary). Muy grave consumer fines up to **450 UIT** (secondary).
- Treat marketing email as allowed only when the consumer initiated contact and opted in.

**Identification / imprint / Selling online:**
- Ley 29571: supplier identification (name or company name, RUC, address), prices in soles including taxes. UNVERIFIED
- **Libro de Reclamaciones virtual**: the Code and D.S. 011-2011-PCM already required suppliers selling remotely or online to have one and display the notice. **Ley 32495** (El Peruano **11 Nov 2025**) amended Code arts. 150–151: **digital e-commerce platforms** must have a virtual libro and show the link **permanently, in a visible and easily accessible place**. INDECOPI Res. 1989-2024/SPC-INDECOPI extended the duty to sites that only advertise products or services (secondary: client memo). Whether the link must be on the home page is UNVERIFIED.

**Transfers:** art. 21.2: cross-border data flows must be reported to the Dirección General. Transfers must also be in the notice (art. 6.1(7)).

**Officer, representative, registration:**
- **Oficial de Datos Personales** (Reglamento art. 37.1), mandatory where: a public entity processes data; processing is large-scale, affects many people, involves sensitive data, or evidently harms other rights; core activities involve sensitive data. Notify the ANPD within 15 business days of designation (art. 37.5) (secondary: CMS).
- **RD 100-2025-JUS/DGTAIPD** (El Peruano 31 Dec 2025), Directiva M6.DGTAIPD.DI.001: "large volume" scored on determinant criteria (A) data subjects **≥ 50,000 = high**, (B) sensitive data **> 5,000 processings = high**, (C) purpose and risk; modulating criteria (D) frequency and duration, (E) location (stored or accessed abroad = high). One determinant criterion at "high" triggers designation; sensitive data as core activity is an autonomous trigger. Profile: 2 years' general and 1 year's specific experience, plus a 90-hour certificate or 120-hour diploma.
- Phase-in by company size (secondary: CMS): large (sales > 2,300 UIT) from **30 Nov 2025**; medium (1,700–2,300 UIT) **30 Nov 2026**; small (150–1,700 UIT) **30 Nov 2027**; micro about 30 Nov 2028. Size alone does not trigger the duty; art. 37.1 criteria must also apply.
- Registration with the Registro Nacional de Protección de Datos Personales (art. 42.1). Breach notification to the ANPD **within 48 hours** (art. 34.1). Portability (art. 76).

**Children (Reglamento arts. 22.2, 25.3):** 14–17 may consent if the information is in language they understand; digital services aimed at under-14s need parental or guardian consent.

**Penalties and enforcement (Ley 29733 art. 39):** leve 0.5–5 UIT; grave > 5 to 50 UIT; muy grave > 50 to **100 UIT**; no fine above 10% of the infringer's prior-year gross annual income. Consumer-code muy grave: up to 450 UIT (secondary).

**Pending changes:** draft amendment to the Reglamento del Libro de Reclamaciones implementing Ley 32495 (RM 244-2026-PCM, 18 Jul 2026, 15-day comment period); adoption UNVERIFIED. "D.S. 128-2025-PCM": content UNVERIFIED. Medium-company ODP deadline 30 Nov 2026.

**Sources:** https://www.smv.gob.pe/Uploads/DS016_2024_JUS.pdf · https://www.smv.gob.pe/Uploads/Ley_29733_vigente_2025.pdf · https://busquedas.elperuano.pe/dispositivo/SE/2349653-1 · https://busquedas.elperuano.pe/dispositivo/NL/2472949-1 · https://www.sat.gob.pe/TransparenciaV3/Portals/0/Docs/NormasOtrasEntidades/ResolucionDirectoral100-2025-JUS_V01.pdf · https://elperuano.pe/noticia/300583-pcm-publica-proyecto-para-modificar-el-reglamento-del-libro-de-reclamaciones · https://cms.law/en/per/publication/aprueban-nuevo-reglamento-de-la-ley-de-proteccion-de-datos-personales (secondary) · https://cms.law/en/per/publication/designacion-del-oficial-de-proteccion-de-datos-obligacion-inicia-el-30-de-noviembre-del-2025 (secondary) · https://cms.law/en/per/publication/promulgan-ley-contra-llamadas-y-mensajes-spam (secondary) · https://kom.pe/reglamento-ds-016-2024-jus-datos-personales/ (secondary) · https://img.lpderecho.pe/wp-content/uploads/2025/05/LEY-32323-LpDrecho.pdf (secondary) · https://prcp-r2-prd.postedin.com/Client-memo-Plataformas-digitales-de-comercio-electronico-se-encuentran-obligadas-a-contar-con-un-Libro-de-Reclamaciones-2.pdf (secondary)

### Checks — Peru
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| PE-01 | Privacy policy in Spanish with Reglamento art. 6.1 items (identity and address, purposes, recipients, database, mandatory answers, consequences, transfers, automated decisions/profiling, retention, rights) | `pages.links.privacy`; `policy.lang`; `policy.items.pe` | Non-compliance |
| PE-02 | Opt-in banner: no non-necessary trackers before consent or after rejection; no pre-ticked categories | `consent.no-interaction.thirdPartyRequests[]`, `consent.reject.*`, `consent.banner.reject` (run `--locale=es-PE`) | High risk (basis inferred: opt-in is the safe reading; "browsing is not consent" is not express text) |
| PE-03 | Marketing email only to consumers who initiated contact and opted in (Code art. 58.1(e) as amended by Ley 32323); newsletter opt-in not pre-ticked; opt-out as easy as opt-in | `pages.forms[].marketingCheckbox`, `.checkboxes[].preChecked`; manual: list sources, templates | Non-compliance |
| PE-04 | **Libro de Reclamaciones virtual** link permanent and visible (sales or product/service advertising); RUC and company name; prices in soles incl. taxes | `pages.links.complaintsBook`; `pages.identification.ids.rucPE`; `signals.currencies[]` | Non-compliance |
| PE-05 | Oficial de Datos Personales contact in the policy where art. 37.1 criteria apply and the company is large (from 30 Nov 2025) or medium (from 30 Nov 2026) | `policy.items.pe` (dpo); manual: ask size and volumes | High risk (Not assessable if facts unknown) |
| PE-06 | Database registration and cross-border flow communication to the authority | manual: ask the client | Not assessable |

## Uruguay
**Applies when:** Ley 18.331 (2008), amended by Ley 19.670 (2018). Decreto 64/020 art. 1 (regulating Ley 19.670 art. 37; promulgated 17 Feb 2020, published 21 Feb 2020): applies without an establishment when processing relates to offering goods or services "dirigidos a habitantes de la República" (indicators: language, payment in national currency); analysing inhabitants' behaviour, including profiling; international law or contract; use of means in Uruguay. Authority: **URCDP**. Uruguay and Argentina remain on the EU adequacy list (Decision 2012/484/EU; review of 11 pre-GDPR decisions concluded 15 Jan 2024). Uruguay is on Argentina's adequate list.

**Privacy notice:**
- Consent (art. 9): free, prior, express, informed and documented.
- Before collection (art. 13): purpose and recipients; database and controller; whether answers are mandatory and consequences; rights; **international transfers**; automated processing logic.
- Proactive responsibility (art. 12 as amended): privacy by design and by default; impact assessments.
- Foreign controllers must **publish a website privacy policy under Resolución 64/013 (16 May 2013)** (URCDP guide; guide date and Res. 64/013 contents UNVERIFIED).
- Language: Spanish. UNVERIFIED

**Cookies and tracking:** URCDP guide **"Cookies y Perfiles"**: "la utilización de cookies debe ser previamente autorizada por el titular de los datos" (Ley 18.331 art. 9). Tell users clearly that the technology is used, who is responsible, the purpose, and that their online activity will be tracked. Guide date, technical-cookie exemption and banner design rules UNVERIFIED. Model: **prior consent for non-essential cookies**.
- Words to look for: "Aceptar", "Rechazar todo", "Solo necesarias"; "Política de privacidad", "cookies", "URCDP".

**Forms and marketing (art. 21):** data suitable for promotional profiles may be processed when public or provided with consent; the data subject may ask for removal or blocking at any time (opt-out).

**Transfers (art. 23):** prohibited to non-adequate countries unless an exception applies or the URCDP authorises it (e.g. contractual clauses). Whether the US is on the URCDP adequate list (Res. 4/2019) is UNVERIFIED. The notice must mention international transfers (art. 13).

**Officer, representative, registration:**
- DPO (Decreto 64/020 art. 10, regulating Ley 19.670 art. 40): public entities (state or non-state, and private entities wholly or partly state-owned); private entities processing **sensitive data as their main business**; private entities processing **personal data of more than 35,000 people**; or when the URCDP rules so.
- Every public or private database must be registered with the URCDP (arts. 28–29). Foreign controllers must register databases online, appoint and notify a DPO "si corresponde" (Decreto 64/020 arts. 10–15), and report breaches affecting people in Uruguay (Ley 19.670 art. 38).

**Penalties and enforcement (art. 35):** observation, warning, **fine up to 500,000 UI**, 5-day database suspension, or judicial closure.

**Sources:** https://www.impo.com.uy/bases/leyes/18331-2008 · https://www.impo.com.uy/bases/decretos/64-2020/1 · https://www.impo.com.uy/bases/decretos/64-2020/10 · https://www.gub.uy/unidad-reguladora-control-datos-personales/comunicacion/publicaciones/guia-para-cumplimiento-obligaciones-entidades-extranjeras/guia-para-2 · https://www.gub.uy/unidad-reguladora-control-datos-personales/sites/unidad-reguladora-control-datos-personales/files/documentos/publicaciones/Guia%2Bcookies%2By%2Bperfiles.pdf · https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en · https://ec.europa.eu/commission/presscorner/detail/pl/ip_24_161

### Checks — Uruguay
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| UY-01 | Information at collection per art. 13 (incl. transfers abroad) and express, documented consent on forms | `pages.forms[].noticeNearby`, `.checkboxes[]`; `policy.items.uy`; `policy.transfers.countriesNamed[]` | Non-compliance |
| UY-02 | Prior consent before non-essential cookies (URCDP "Cookies y Perfiles" guide) | `consent.no-interaction.thirdPartyRequests[]`, `.cookies[]`, `consent.banner.found` (run `--locale=es-UY`) | Non-compliance (explicit regulator guide) |
| UY-03 | Database registration; DPO if sensitive data is the main business or more than 35,000 people | manual: ask the client | Not assessable |

## Ecuador
**Applies when:** LOPDP, Registro Oficial 5th Supplement No. 459, **26 May 2021**. Sanctions regime since May 2023; Reglamento Nov 2023; authority: Superintendencia de Protección de Datos Personales (SPDP). Extraterritorial for targeting or monitoring people in Ecuador (UNVERIFIED; exact article UNVERIFIED). Primary LOPDP text UNVERIFIED; most items below are UNVERIFIED or secondary.

**Privacy notice:** GDPR-like transparency. UNVERIFIED

**Cookies and tracking:** consent for non-essential cookies. UNVERIFIED (no SPDP cookie guidance found)
- Words to look for: "Aceptar", "Rechazar todo", "Solo necesarias"; "delegado de protección de datos", "apoderado especial".

**Forms and marketing:** consent. UNVERIFIED

**Officer, representative, registration:**
- **Resolución SPDP-SPD-2025-0028-R (30 Jul 2025)** (secondary: Lexis, G-Talent): DPO required for public and private controllers and processors in listed cases, including education, finance, insurance, health, telecoms, private security, and entities handling special categories or **minors' data**; a later SPDP consultation adds IT services and AI. Register the appointment with the SPDP **within 15 days**; private-sector registration window was **1 Nov–31 Dec 2025**. The SPDP-approved professional programme becomes mandatory for DPOs **from 1 Jan 2029**.
- **Resolución SPDP-SPDP-2024-0002-R** (RO 2nd Supp. No. 640, 10 Sep 2024), "Guía Técnica obligatoria": foreign controllers and processors processing data in Ecuador must appoint and register an **apoderado especial** (special representative) in Ecuador (secondary: ECIJA). Threshold UNVERIFIED.

**Children:** adolescents 15+ can consent. UNVERIFIED

**Penalties and enforcement:** **Resolución SPDP-SPD-2025-0022-R** (effective 16 Jul 2025): private-sector fines **0.1%–0.7%** of volumen de negocio for minor infractions, **0.7%–1%** for serious ones (secondary: Lexis).

**Sources:** https://www.telecomunicaciones.gob.ec/wp-content/uploads/2021/06/Ley-Organica-de-Datos-Personales.pdf · https://www.lexis.com.ec/noticias/reglamento-del-delegado-de-proteccion-de-datos-personales-entra-en-vigencia-en-ecuador (secondary) · https://www.g-talent.net/blogs/tecnologia/delegado-proteccion-datos-ecuador-2026-obligados-requisitos (secondary) · https://www.lexis.com.ec/noticias/superintendencia-de-proteccion-de-datos-personales-expide-reglamento-para-calculo-de-multas-por-infracciones-a-la-ley-de-proteccion-de-datos (secondary) · https://www.ecija.com/actualidad-insights/guia-tecnica-obligatoria-dirigida-a-responsables-y-encargados-extranjeros-que-tratan-datos-personales-en-ecuador/ (secondary)

### Checks — Ecuador
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| EC-01 | GDPR-style privacy policy in Spanish, with DPO contact where mandatory | `pages.links.privacy`; `policy.items.ec` | High risk (basis UNVERIFIED) |
| EC-02 | Consent before non-essential cookies | `consent.no-interaction.thirdPartyRequests[]`, `consent.banner.found` | High risk (basis UNVERIFIED) |
| EC-03 | DPO appointed and registered with the SPDP if the sector or data type is listed; foreign controller has an apoderado especial | manual: ask the client | Not assessable |

## Panama
**Applies when:** Ley 81/2019 (Gaceta Oficial **29 Mar 2019**) and Decreto Ejecutivo 285 (**28 May 2021**); in force since Mar 2021 (UNVERIFIED). Authority: ANTAI. Extraterritorial rule UNVERIFIED; treat a Panamanian address, `es-PA` or local targeting as the trigger.

**Privacy notice:** consent prior, unequivocal, informed and traceable (Ley 81 art. 6; DE 285 arts. 17–19). Notice clear and simple (DE 285 art. 14): controller identity and contact, purposes, legal basis, recipients, retention, rights (ARCO), automated decisions.

**Cookies and tracking:** the ANTAI guide lists cookies among website collection tools but sets no cookie-specific rule. A consent banner is recommended because consent is the main basis.

**Transfers:** Ley 81 art. 33 and DE 285 arts. 51–53: equivalent level of protection or added guarantees (or consent).

**Officer, representative, registration:** **no legal obligation** for private entities to appoint a DPO; voluntary unless a sector regulator (e.g. the Superintendencia de Bancos) requires it.

**Penalties and enforcement:** **B/. 1,000 to B/. 10,000** (balboa at par with USD), classified leve, grave or muy grave; also closing the database and suspending processing.

**Sources:** https://www.antai.gob.pa/wp-content/uploads/2024/01/GUIA-SECTOR-PRIVADO-1.pdf (ANTAI private-sector guide, June 2023)

### Checks — Panama
No dedicated prefix exists for Panama. Report findings under the global baseline in SKILL.md (step 8), citing Ley 81/2019 and DE 285 art. 14, and note that the cookie basis is a recommendation (High risk at most; Improvement for a missing banner on a site without trackers).

## Costa Rica
**Applies when:** Ley 8968 (2011) plus Reglamento (2016). Authority: PRODHAB. Extraterritorial rule UNVERIFIED. Mostly UNVERIFIED.

**Privacy notice:** express informed consent. UNVERIFIED

**Officer, representative, registration:** database registration for commercial databases (fee-based). UNVERIFIED (fees UNVERIFIED)

**Cookies and tracking:** no guidance found. UNVERIFIED

**Pending changes:**
- **Expediente 22.388** (comprehensive reform, filed 28 Jan 2021) is **archived**: unanimous favourable committee report of 27 Oct 2021, no floor vote.
- **Expediente 25.826**, "Ley para proteger a las personas frente a la filtración de sus datos", filed **5 Oct 2026**: amends Ley 8968 arts. 10, 28, 30 and 31 and adds art. 10 bis; in the Comisión de Asuntos Jurídicos.
- Whether any other comprehensive bill is active: UNVERIFIED.

**Sources:** https://delfino.cr/asamblea/proyecto/22388 · https://delfino.cr/asamblea/proyecto/25826

### Checks — Costa Rica
No dedicated prefix exists for Costa Rica. Verify Ley 8968 consent and registration rules first; until then report gaps as **Not assessable** under the global baseline in SKILL.md (step 8).

## Other Latin American countries not yet covered
Paraguay (Ley 7593/2025 on personal data; entry into force UNVERIFIED), Dominican Republic, El Salvador (2024 law), Guatemala, Bolivia. All UNVERIFIED. If the site targets one of them, report "jurisdiction not covered by this reference" as **Not assessable** and apply the global baseline in SKILL.md (step 8).

## Comparison table
| Jurisdiction | Mere visibility triggers? | Cookie / tracking model | Officer / registration | Marketing email consent | Notice language |
|---|---|---|---|---|---|
| Canada federal (PIPEDA, CASL) | No: "real and substantial connection" (UNVERIFIED); CASL by recipient | **Opt-out acceptable** for non-sensitive OBA with clear upfront notice; opt-in for sensitive | Accountable person, title + address in policy (UNVERIFIED) | **CASL opt-in**, or implied (inquiry 6 months, purchase 2 years); no pre-checked; unsubscribe within 10 business days | English or French (no federal rule for private sites) |
| Quebec (Law 25) | No: people in Quebec, targeting (secondary) | **Opt-in**: identify/locate/profile functions off by default (s.8.1) | **Person in charge: title + contact on website** (s.3.1); PIA for transfers | CASL + separate consent per purpose | **French required** (Charter s.52) |
| Alberta / BC (PIPA) | Intra-provincial only | Notice + opt-out (UNVERIFIED) | Contact for questions (UNVERIFIED) | CASL | — |
| Brazil (LGPD) | Collection from people in Brazil can trigger (art. 3) | **Opt-in**, Reject All in first layer (ANPD guide) | **Encarregado name + contact prominent** (Res. 18/2024); small agents: a channel | Consent or legitimate interest; no pre-ticked; no anti-spam statute (UNVERIFIED) | **Portuguese** (CDC art. 31; ANPD) |
| Mexico (LFPDPPP 2025) | No express rule (UNVERIFIED) | **Notice + opt-out** (tacit consent); cookies disclosed in aviso (UNVERIFIED) | Internal person/department (art. 29); ARCO contact in aviso | Opt-out (secondary purpose; LFPC 76 bis VI) | Spanish (UNVERIFIED) |
| Argentina (Ley 25.326) | Not stated | Express consent where personal data is involved (UNVERIFIED) | Disp. 10/2008 legends; database registration (UNVERIFIED) | Opt-out per message (UNVERIFIED); "No Llame" for phone | Spanish (UNVERIFIED) |
| Chile (Ley 21.719, from 1 Dec 2026 unless postponed) | No: offering to or monitoring people in Chile | Consent for profiling/ads; legitimate interest possible for analytics (UNVERIFIED) | Policy names **legal representative**; DPO voluntary (UNVERIFIED) | Opt-out with suspension address (art. 28 B, UNVERIFIED) | Spanish (not specified) |
| Colombia (Ley 1581) | Processing in Colombia; SIC applies to devices in Colombia (UNVERIFIED) | Prior authorisation for trackers collecting personal data (secondary) | Person or area for requests; **RNBD if assets > 100,000 UVT** | Explicit acceptance for promotions; unsubscribe; Ley 2300 hours | **Castellano** (Ley 1480 art. 23) |
| Peru (Ley 29733 + DS 016-2024-JUS) | No: offering to or profiling people in Peru | **Opt-in** (inferred) | **ODP** if art. 37.1 criteria (large from 30 Nov 2025, medium 30 Nov 2026); database registration | **Opt-in, consumer-initiated only** (art. 58.1(e), Ley 32323) | Spanish (UNVERIFIED) |
| Uruguay (Ley 18.331) | No: goods/services directed to inhabitants (language, currency) or profiling | **Prior consent** (URCDP cookie guide) | DPO if sensitive core or > 35,000 people; database registration | Opt-out (art. 21) | Spanish (UNVERIFIED) |
| Ecuador (LOPDP) | Targeting or monitoring (UNVERIFIED) | Consent for non-essential (UNVERIFIED) | DPO in listed sectors, registered within 15 days; foreign: apoderado especial (secondary) | Consent (UNVERIFIED) | Spanish (UNVERIFIED) |
| Panama (Ley 81/2019) | Not stated | No cookie rule; banner recommended | DPO voluntary | Consent (main basis) | Spanish (not specified) |
| Costa Rica (Ley 8968) | Not stated | No guidance (UNVERIFIED) | Commercial database registration (UNVERIFIED) | Express consent (UNVERIFIED) | Spanish (not specified) |
