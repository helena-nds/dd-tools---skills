# EU/EEA and United Kingdom — legal reference for qa-legal

This file covers the EU/EEA baseline (GDPR, ePrivacy, E-Commerce Directive, consumer law, accessibility, whistleblowing, AI Act), national modules for Spain, Germany, France, Italy, Austria and the Netherlands, and the United Kingdom (UK GDPR, PECR as amended by the Data (Use and Access) Act 2025, company disclosures, DMCC Act). Open it when the scope step of SKILL.md lists any EU/EEA country or the UK: an establishment there, or targeting signals such as an EU/UK language, € or £ prices, EU/UK shipping, phone prefixes or a ccTLD. Facts checked on 28–30 October 2026 against the linked sources. Items marked UNVERIFIED, and everything in 'Re-check before each audit', must be confirmed before you rely on them. Items marked "(UNVERIFIED)" come from stable, well-known legal text whose source was not re-opened; treat them as reliable but cite the URL. "(secondary)" means the source is a law firm, vendor or press page, not the legal text. Items marked "stable text" are long-established EU instruments whose text was not re-opened; they are safe to rely on unless an amendment is announced.

## How to use this file
- Open only the sections for regimes listed in the scope step of SKILL.md.
- Check IDs below are the ones to use in the report.
- For any EU country, run the **EU/EEA baseline** checks first, then the country module. Country modules only add or tighten rules; when you report a baseline finding for a country, cite the national transposition (e.g. LSSI art. 22.2 for Spanish cookies).
- Run `consent-check.mjs` once per target market with that market's locale and timezone (e.g. `--locale=es-ES --tz=Europe/Madrid`, `--locale=de-DE --tz=Europe/Berlin`, `--locale=en-GB --tz=Europe/London`). CMPs may geo-switch.
- Pending proposals (Digital Omnibus, Spanish minors law) are informative notes only. Report them as Improvement at most, never as Non-compliance.

## Re-check before each audit
1. **Digital Omnibus 2025/0360(COD)**: EP committee vote, trilogues, adoption. Key open points: cookies moved to the GDPR or kept in ePrivacy; browser-signal duty; re-ask wait of 4 vs 6 months. https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025%2F0360%28COD%29
2. **EU–US Data Privacy Framework**: hearing or judgment in appeal C-703/25 P; any noyb annulment action; the Commission's response to the EDPB letter of 31-07-2026. https://www.edpb.europa.eu/documents/edpb-correspondence/edpb-letter-to-the-european-commission-on-us-supreme-court-judgment_en and the vendor list at dataprivacyframework.gov.
3. **UK–US data bridge**: any review after *Trump v. Slaughter* (UNVERIFIED). https://www.legislation.gov.uk/uksi/2023/1028/contents/made
4. **Spain, minors' digital protection organic law (121/000052)**: BOE publication raising the art. 7 LOPDGDD age from 14 to 16. https://www.congreso.es/public_oficiales/L15/CONG/BOCG/A/BOCG-15-A-52-1.PDF
5. **AEPD**: cookie guide newer than May 2024 (current version UNVERIFIED) (https://www.aepd.es/guias/guia-cookies.pdf); any AEPD criteria on Google Consent Mode or reCAPTCHA.
6. **CNIL** audience-measurement page newer than 4 Jul 2025: https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience
7. **ICO**: any PECR cookie fine under the new £17.5m regime; any new reg. 6A exceptions (e.g. advertising). https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/
8. **Google IP-based ads measurement and personalisation in the EEA, UK and Switzerland** (planned for August 2026): whether it launched and what it sends before consent (UNVERIFIED). https://www.google.com/intl/en_uk/about/company/user-consent-policy-help/
9. **European Accessibility Act**: first fines (NL ACM, SE PTS, DE MLBF); appeals in the Carrefour (Caen) and Auchan (Lille) cases. https://www.acm.nl/nl/publicaties/acm-klant-met-beperking-kan-bij-merendeel-grote-webwinkels-niet-terecht and https://statutus.ch/en/guides/european-accessibility-act-enforcement-so-far/ (secondary)
10. **AI Act art. 50**: Commission guidelines and code of practice on marking AI content. https://digital-strategy.ec.europa.eu/en/policies/guidelines-transparency-ai-generated-content
11. **EU withdrawal function**: national transpositions and the official label in each language. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32023L2673
12. **UK DMCC Act subscription-contracts regime**: commencement date (UNVERIFIED). https://www.legislation.gov.uk/ukpga/2024/13/schedule/20

The EU adequacy decision for the UK was renewed until 27 Dec 2031 (see United Kingdom, Transfers); it does not need re-checking until its review, due at least 4 years after adoption (about 2029).

---

## EU/EEA baseline

**Applies when:**
- **GDPR art. 3(1)**: processing in the context of an EU establishment, wherever the processing happens.
- **GDPR art. 3(2)** (non-EU controllers): (a) offering goods or services to people in the EU, paid or free; or (b) monitoring their behaviour in the EU. Analytics or tracking pixels on EU visitors count as monitoring.
- **Targeting indicators** (EDPB Guidelines 3/2018): EU language or currency, EU shipping, EU phone numbers, a ccTLD, references to EU customers. **Mere accessibility from the EU is not enough.** https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-32018-territorial-scope-gdpr-article-3-version_en (UNVERIFIED)
- **ePrivacy Directive 2002/58/EC art. 5(3)** (cookies) applies to storage or access on terminal equipment located in the EU, through national laws. Several DPAs (e.g. CNIL) apply it to non-EU publishers that target their residents (UNVERIFIED).

**Privacy notice:** GDPR arts. 13–14 (https://eur-lex.europa.eu/eli/reg/2016/679/oj, stable text). At the time of collection:
- 13(1): (a) controller identity and contact; EU representative if any; (b) DPO contact if a DPO is designated; (c) purposes and the legal basis **for each purpose**; (d) the specific legitimate interest where art. 6(1)(f) is used ("legitimate interest" alone is not enough); (e) recipients or categories, including processors; (f) third-country transfers, the adequacy decision or safeguard, and how to get a copy.
- 13(2): (a) retention period or criteria (not "as long as there is mutual interest"); (b) access, rectification, erasure, restriction, objection, portability; (c) right to withdraw consent; (d) right to complain to a supervisory authority; (e) whether data is statutory/contractual/mandatory and the consequences of not giving it; (f) automated decisions and profiling: logic, significance, consequences.
- Art. 14 (data not obtained from the person): adds categories and source.
- Art. 12: concise, transparent, intelligible, easily accessible, clear and plain language. Layered notices are acceptable.

**Cookies and tracking:** prior opt-in consent.
- **ePrivacy art. 5(3)**: storage or access needs prior consent to the GDPR standard, except (i) solely to transmit a communication, or (ii) strictly necessary for a service the user explicitly requested.
- **National laws**: ES LSSI art. 22.2; DE TDDDG §25 (TTDSG renamed TDDDG on 14-05-2024); FR Loi 78-17 art. 82; IT Codice privacy art. 122; NL Telecommunicatiewet art. 11.7a; AT TKG 2021 §165 (all UNVERIFIED).
- **Technical scope (EDPB Guidelines 2/2023, v2.0, 7 Oct 2024)**: cookies, localStorage, SDKs, JavaScript that makes the device send data back, URL/pixel tracking, unique identifiers (hashed too), IP-only tracking unless the IP cannot originate from the user's device. Local processing only if the result leaves the device. https://edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf
- **Consent standard**: GDPR arts. 4(11) and 7 (freely given, specific, informed, unambiguous, affirmative action; as easy to withdraw as to give). CJEU *Planet49* C-673/17, 1-10-2019: pre-ticked boxes are invalid (UNVERIFIED).
- **EDPB Cookie Banner Taskforce report (17 Jan 2023)**, common positions: no reject option on any layer = infringement (vast majority of DPAs); pre-ticked boxes invalid; a link instead of a button as the only refusal, especially hidden in text, invalid; colour/contrast case by case, but a practically unreadable reject is manifestly misleading; legitimate interest cannot be the basis for cookies; non-essential cookies must not be labelled "essential", keep a cookie list; withdrawal easy and permanently available (icon or link in a standard place). https://www.edpb.europa.eu/system/files/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf
- **Cross-DPA banner consensus**: Reject at the same level as Accept (AEPD guide §3.2.1; CNIL; ICO); granular by purpose; no cookie wall without a genuine alternative (DPA-specific); scrolling or continued browsing is not consent; persistent withdrawal mechanism.
- **Audience-measurement exemption** exists only in national DPA guidance (CNIL, AEPD; see the country modules). **Standard GA4 never qualifies** (Google reuses data; cross-site identifiers).
- **Common third parties**:

| Item | Rule / decision | Source |
|---|---|---|
| Google Fonts loaded remotely | **LG München I, 20-01-2022, 3 O 17493/20**: passing the dynamic IP to Google without consent infringed personality rights; legitimate interest rejected because fonts can be self-hosted; injunction plus **€100 damages** (art. 82 GDPR). Triggered mass warning letters in DE in 2022. | https://www.gesetze-bayern.de/Content/Document/Y-300-Z-BECKRS-B-2022-N-612 |
| Google Analytics transfers | Austrian DSB: GA unlawful (US transfers), noyb model complaint, announced 13-01-2022. CNIL: formal notices, February 2022 (date UNVERIFIED). Garante, 23-06-2022 (Caffeina Media): unlawful transfer; truncated IP still personal data; 90 days to comply. All pre-date the DPF (10-07-2023). Transfers to DPF-certified Google LLC are now covered by adequacy, but **art. 5(3) consent is still required**. | https://noyb.eu/en/austrian-dsb-eu-us-data-transfers-google-analytics-illegal; https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9782874; https://www.cnil.fr/en/use-google-analytics-and-data-transfers-united-states-cnil-orders-website-manageroperator-comply |
| Google Consent Mode | **Basic** (no tags until consent): compatible. **Advanced**: cookieless pings before or after refusal; no EU/UK DPA has validated it, and EDPB Gl. 2/2023 (URL/pixel, IP tracking) points to art. 5(3) applying. No DPA decision found: UNVERIFIED. | EDPB Gl. 2/2023 |
| Google Consent Mode v2 (Google's own policy) | Google's EU user consent policy covers end users in the **EEA, UK and Switzerland** (Switzerland added July 2024). **Advertisers with EEA traffic must send validated consent signals using the latest consent mode or TCF**; for UK or Swiss traffic Google has "no expectation" of verified signals, but consent is still required where the law requires it. Google Ads: to keep measurement, personalisation and remarketing for EEA users, collect consent and pass `ad_user_data` and `ad_personalization` through consent mode; otherwise ad capabilities are lost. No 2026 change found (developer page updated 2026-10-13). The March 2024 deadline applies only to Customer Match and DMA data-linking choices. **New**: Google planned "IP-based ads measurement and personalisation" in the EEA, UK and Switzerland for **August 2026**; launch and consent implications UNVERIFIED. IP-based pings before consent would be a further art. 5(3) / EDPB Gl. 2/2023 issue. This is a platform requirement, not law. | https://www.google.com/intl/en_uk/about/company/user-consent-policy-help/; https://support.google.com/google-ads/answer/13695607?hl=en; https://support.google.com/google-ads/answer/14625550?hl=en; https://developers.google.com/tag-platform/security/guides/consent; https://business.safety.google/privacy/google-services/ |
| reCAPTCHA | Sends device and behavioural data to Google. **CNIL, NS Cards France, 29 Dec 2023 (SAN-2023-023), €105,000 total**: the Loi 78-17 art. 82 breach covered Google Analytics cookies without consent and **reCAPTCHA at account creation and login without information or prior consent** (it collected hardware and software data and sent it to Google; about 700,000 account holders). | https://cnil.fr/en/node/164774 (deliberation number per Légifrance) |
| YouTube / Vimeo / Maps iframes | Set cookies or localStorage on load (`youtube-nocookie` still uses localStorage). Consent or a click-to-load facade needed. | EDPB Gl. 2/2023 |
| Meta Pixel / LinkedIn Insight / social plugins | CJEU **Fashion ID, C-40/17, 29-07-2019** (ECLI:EU:C:2019:629): the site is a **joint controller** for collection and transmission; must inform and obtain consent for that stage (UNVERIFIED). | — |
| Microsoft Clarity | From **31 Oct 2025** Clarity enforces consent signals for visits from the **EEA, UK and Switzerland**. Without granted consent it runs in no-consent mode: no first- or third-party cookies, a unique ID per page view. API: `window.clarity('consentv2', {ad_Storage: 'granted'\|'denied', analytics_Storage: 'granted'\|'denied'})`; the old `clarity('consent')` API is planned for deprecation. Still needs prior consent under art. 5(3) for non-exempt use. | https://learn.microsoft.com/en-ca/clarity/clarity-consent-api-v2 |

**Forms and marketing:**
- **ePrivacy art. 13(1)**: email marketing needs prior consent. **13(2) soft opt-in**: own similar products/services, contact obtained in a sale, opt-out at collection and in every message. National laws: ES LSSI art. 21; DE UWG §7(2)–(3); FR CPCE L.34-5 (UNVERIFIED). B2B treatment varies by Member State.
- **Double opt-in**: no statute requires it. De facto standard in Germany (see DE). Elsewhere best practice for art. 7(1) accountability.
- **Forms**: art. 13 information at collection; marketing checkbox separate and unticked (*Planet49*); "I accept the privacy policy" is not consent. Basis for answering enquiries: art. 6(1)(b) or (f), so no consent checkbox is needed for that purpose, but the information is.

**Identification / imprint:** E-Commerce Directive 2000/31/EC art. 5(1), "easily, directly and permanently accessible" (stable text):
- (a) name; (b) geographic address; (c) rapid, direct contact including email; (d) trade register and number; (e) supervisory authority if the activity needs authorisation; (f) regulated professions: professional body, title and granting state, professional rules and access to them; (g) VAT number.
- Art. 5(2): prices clear, stating whether tax and delivery are included.
- CJEU C-298/07 (2008): email plus a second rapid means, which may be an electronic contact form; a phone number is not mandatory (UNVERIFIED).

**Selling online:** only if the site contracts with consumers.
- **Consumer Rights Directive 2011/83/EU** (stable text): art. 6 pre-contract information (trader identity and address, main characteristics, total price incl. taxes and delivery, payment and delivery, withdrawal right and model form, guarantees, duration); art. 8(2) button "**order with obligation to pay**" or equivalent; 14-day withdrawal.
- **Withdrawal function, Directive (EU) 2023/2673, new CRD art. 11a**, applies since **19-06-2026** (transposition due 19-12-2025): for distance contracts through an online interface, a function labelled "**withdraw from contract here**" or an unambiguous equivalent, **continuously available** during the withdrawal period, **prominently displayed and easily accessible**. The consumer gives or confirms name, contract identification and confirmation channel; then a "**confirm withdrawal**" function; the trader sends an **acknowledgement on a durable medium** without undue delay. Amended art. 6(1)(h): pre-contract information covers the function's existence and placement. The directive also adds art. 16e (anti-dark-pattern, financial-services contracts) and repeals Directive 2002/65/EC from 19-06-2026. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32023L2673
- **ODR platform**: Regulation (EU) 2024/3228 repealed Reg. 524/2013; the platform stopped taking complaints on 20-03-2025; **the link obligation ended 20-07-2025**. Any ODR link (`ec.europa.eu/consumers/odr`) is obsolete. National ADR information duties remain (e.g. DE VSBG §36). https://eur-lex.europa.eu/eli/reg/2024/3228/oj/eng; https://www.caspers-mock.de/publikationen/pflichten_os_plattform_webseite_entfallen_7_2025.htm?lang=en; https://cm.twobirds.com/en/insights/2025/global/the-end-of-the-european-online-dispute-resolution-platform (secondary)
- **Omnibus Directive 2019/2161** (applies from 28-05-2022; stable text): price reductions show the **prior price = lowest price in the last 30 days** (Price Indication Directive art. 6a); review authenticity disclosure (UCPD art. 7(6), Annex I pts 23b–c); personalised pricing disclosure (CRD art. 6(1)(ea)); fines for widespread infringements up to 4% of turnover or €2m.
- **DSA, Regulation (EU) 2022/2065** (fully applicable 17-02-2024; stable text): a plain corporate site is not an intermediary service. If the site **hosts user content** (comments, uploads, marketplace), hosting duties apply even to small firms: arts. 11–12 contact points, art. 14 T&Cs, **art. 16 notice-and-action**, art. 17 statement of reasons. Micro and small enterprises are exempt from online-platform extras (arts. 19+).
- **Geo-blocking Regulation (EU) 2018/302** (stable text): no blocking or automatic redirection by nationality or residence without consent; no discrimination in access to general conditions.

**Accessibility:** European Accessibility Act, Directive (EU) 2019/882. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L0882
- National measures apply from **28-06-2025** (art. 31(2)).
- Scope (art. 2(2)): services to consumers, including **(f) e-commerce services** (art. 3: at a distance, through websites or apps, by electronic means, at the consumer's request, with a view to a consumer contract); also banking, e-books, transport ticketing, electronic communications. **A corporate or portfolio site without B2C contracting is not in scope.**
- **Microenterprise exemption** (art. 4(5)) for service providers. Art. 3(23): fewer than 10 persons **and** annual turnover **or** balance-sheet total ≤ €2m.
- Transitional (art. 32(1)): products lawfully used before 28-06-2025 may keep being used until **28-06-2030**; earlier contracts run to expiry, max 5 years.
- **Art. 13(2) + Annex V**: publish how the service meets the requirements (accessibility statement in the T&Cs or equivalent) for as long as the service runs.
- Standard: EN 301 549, i.e. WCAG 2.1 AA (harmonised standard; check the current EN version).
- Max fines are national, from about €60k (IE) to about €900k (SE) (secondary; per-country amounts UNVERIFIED). Sweden, PTS: e-commerce supervision opened 15-10-2025, 17 cases in 2025 (secondary). No EAA fine against an online shop found as of 28-10-2026.

**Transfers:**
- **EU–US DPF**: adequacy decision of 10-07-2023 **in force**. General Court T-553/23 *Latombe* dismissed 3-09-2025; **appeal C-703/25 P** lodged 31-10-2025, pending, no hearing reported as of July–September 2026 (https://secureprivacy.ai/blog/is-the-eu-us-data-privacy-framework-at-risk-the-ftc-ruling-explained-2026; https://www.faegredrinker.com/en/insights/publications/2026/9/trump-v-slaughter-implications-of-the-us-supreme-court-ruling-for-eu-us-data-transfers-and-the-data-privacy-framework; secondary).
- **US Supreme Court, *Trump v. Slaughter*, 29-06-2026**: the President may remove FTC commissioners at will; the DPF relies on FTC independence. noyb letter of 30-06-2026 asked for an "orderly withdrawal" and threatened an annulment action (no filing confirmed as of mid-September 2026). **EDPB letter of 31-07-2026** asked the Commission to examine the impact. The Commission "has taken note" and is analysing; no formal conclusion (Faegre Drinker, 17-09-2026; secondary).
- **What the notice must say**: name the third country and the mechanism. Rely on the DPF only if the vendor is listed on dataprivacyframework.gov; otherwise SCCs (Decision 2021/914, art. 46(2)(c)). Keep SCCs as a fallback in processor contracts. Citing "**Privacy Shield**" is wrong information.
- **Other adequacy decisions** (Commission list, https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en): the **UK** is adequate until **27 Dec 2031** (renewed 19 Dec 2025; see United Kingdom). **Brazil**: adequacy decision dated 26 Jan 2026 (mutual with Brazil). Latest dated item: Republic of Korea first-review finding, 23 Jul 2026.

**Officer, representative, registration:**
- DPO contact in the notice only if a DPO is designated (not usually mandatory for a small studio).
- **Art. 27**: non-EU controllers caught by art. 3(2) must designate an EU representative, unless processing is occasional, low-risk and without large-scale special categories.

**Children:** GDPR art. 8 digital age of consent (https://gdprlocal.com/digital-age-of-consent-under-the-gdpr/, secondary; Slovenia per https://www.k-p.si/en/zvop-2-eng/):

| Age | Countries |
|---|---|
| 13 | Belgium, Denmark, Estonia, Finland, Latvia, Malta, Portugal, Sweden; Norway and Iceland (EEA, UNVERIFIED) |
| 14 | Austria, Bulgaria, Cyprus, Italy, Lithuania, Spain |
| 15 | Czech Republic, France, Greece, Slovenia (ZVOP-2, from 26-01-2023; some tables wrongly show 16) |
| 16 | Croatia, Germany (GDPR default), Hungary, Ireland, Luxembourg, Netherlands, Poland, Romania, Slovakia; Liechtenstein (UNVERIFIED) |

**AI and other:**
- **AI Act, Regulation (EU) 2024/1689, art. 50** has applied since **2-08-2026**: 50(1) providers must tell people they are interacting with AI; 50(2) providers mark synthetic content in machine-readable form; 50(3) deployers disclose emotion recognition or biometric categorisation; 50(4) deployers disclose deepfakes, and AI-generated or manipulated text published to inform the public on matters of public interest unless there was human editorial review.
- **Digital Omnibus on AI, Regulation (EU) 2026/1744** (dated 8-07-2026, OJ 24-07-2026, in force 27-07-2026) postponed high-risk duties to 2-12-2027 (Annex III) and 2-08-2028 (Annex I). It did not postpone art. 50 generally. The **50(2) marking duty** applies from **2-12-2026** to systems placed on the market before 2-08-2026. Paragraph mapping of the amended art. 50 is partially UNVERIFIED. https://eur-lex.europa.eu/eli/reg/2026/1744/oj?locale=en; https://www.whitecase.com/insight-alert/eu-ai-omnibus-enters-force-amending-ai-act; https://fpf.org/blog/the-ai-act-implementation-timeline-what-changes-under-the-ai-omnibus/ (secondary)
- **For websites**: a chatbot widget needs a clear "you are chatting with an AI" notice. Legally the provider's duty, but a site that builds its own chatbot on an API and runs it under its own name may be the provider. Photoreal AI images or video of real people, places or events need disclosure by the deployer.
- **Whistleblowing, Directive (EU) 2019/1937**: internal channels mandatory for private entities with **50 or more workers** (art. 8(3)); Member States may go below 50 after a risk assessment (art. 8(7)); some financial-sector entities regardless of size (art. 8(4)). Art. 9(1)(g): "clear and easily accessible information" on external reporting. No EU-level website rule; Spain has one (see ES). https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L1937

**Penalties and enforcement:** CNIL fines small sites (€2k–€20k) as well as large ones (see FR). AEPD sanctions cookies regularly (see ES). LG München font damages spawned mass claims in DE. EAA: Caen order against Carrefour, €500/day penalty (see FR); NL ACM sweep (see NL).

**Pending changes:**
- **Digital Omnibus, COM(2025) 837, 2025/0360(COD)**. Commission proposal (19-11-2025): cookie rules for personal data move into the GDPR (new **art. 88a**); new exemptions for aggregated own-purpose audience measurement and security; single-click refusal; no re-asking for **6 months** after refusal; new **art. 88b** duty to honour automated browser/OS consent signals (24 months to implement; media services exempt) (https://www.heuking.de/en/news-events/newsletter-articles/detail/cookie-consent-under-the-digital-omnibus-planned-changes-and-technical-implementation.html, secondary).
- **Council mandate, 21-10-2026** (Coreper): keeps cookies in **ePrivacy art. 5(3)**; **deletes the browser-signal duty**; extends the audience-measurement exemption to commissioned third parties if data is aggregated and anonymised; adds a contextual-advertising exemption (incl. frequency capping); re-ask wait **4 months**, earlier if the purpose changes or cookies are deleted; GDPR supervisory authorities oversee cookies (Heuking; https://www.nicfab.eu/en/posts/digital-omnibus-council/; secondary). Council press release: primary text UNVERIFIED.
- **Parliament**: no position. ITRE (rapporteur Aura Salla) jointly with LIBE (Marina Kaljurand); draft report PE786.818 of 22-06-2026; amendments 27-07-2026; status "Awaiting committee decision"; vote expected early 2027; no trilogues. Current ePrivacy rules apply until adoption, not expected before 2027.

**Sources:** URLs above; GDPR https://eur-lex.europa.eu/eli/reg/2016/679/oj

### Checks — EU/EEA baseline
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| EU-01 | Which regimes apply (EU establishment or targeting) | `scope.suggestedRegimes[]`, `scope.signals.currencies[]`, `.shippingCountries[]`, `.phonePrefixes[]`, `.ccTLD`, `hreflang[]`; manual: ask for the establishment country | Not assessable if unknown |
| EU-02 | Non-EU controller targeting the EU names an art. 27 representative | manual: read the privacy notice; `policy.items.gdpr[]` controller/contact evidence | Non-compliance |
| EU-03 | Business facts: B2C sales, headcount, turnover, user content, chatbot | `scope.signals.commerce`, `.ugc`, `.aiChat`; manual: ask headcount and turnover | Not assessable |
| EU-04 | No non-exempt storage or requests before consent | `consent.no-interaction.thirdPartyRequests[]` (phase `before-interaction`, category analytics/ads/social/replay/chat/fonts/video/maps/captcha), `.cookies[].suspectedTracker`, `.storage`, `pixelLeaks[]` | Non-compliance |
| EU-05 | After Reject nothing non-exempt loads or stays stored | `consent.reject.thirdPartyRequests[]`, `.cookies[]`, `.storage` | Non-compliance |
| EU-06 | Reject on the first layer with the same prominence as Accept | `consent.banner.rejectSameLayer`, `consent.banner.symmetry`; confirm `reject-missing` with a screenshot (CMP may use an iframe, an icon or other wording) | Non-compliance if missing; High risk if `reject-smaller`, `reject-low-contrast` or `reject-is-link` |
| EU-07 | No pre-ticked purposes, no "by continuing you accept", no legitimate-interest toggles for cookies | manual: open the settings layer; grep the CMP config for `legitimateInterest` | Non-compliance |
| EU-08 | Granular per-purpose choices; third parties named | `consent.banner.settings`; manual: settings layer | Non-compliance |
| EU-09 | Permanent withdrawal link/icon; withdrawing deletes cookies and stops requests | `pages.links.cookieSettings`; manual: accept → reopen → reject → diff cookies and requests | Non-compliance |
| EU-10 | Consent cookie lifetime and re-ask interval | `consent.accept.cookies[].durationDays` for the CMP cookie. France: the CNIL treats about **6 months** of consent validity as adequate practice (https://www.osborneclarke.com/fr/insights/la-cnil-adopte-ses-lignes-directrices-definitives-sur-les-cookies, secondary); exempt audience-measurement trackers ≤ 13 months. Spain: ≤ 24 months (AEPD). Re-ask after refusal ≥ about 6 months | Improvement |
| EU-11 | "Essential" category holds only strictly necessary items | manual: compare the CMP category list with `consent.no-interaction.cookies[]` | Non-compliance |
| EU-12 | Cookie policy declares every observed cookie/storage item (name, provider, purpose, duration, 1st/3rd party, transfers) | `policy.vendors.missingFromPolicy[]` (run with `--consent`); manual table diff | Non-compliance if undeclared items |
| EU-13 | Analytics running pre-consent meets a national exemption (CNIL/AEPD) | category `analytics` in `consent.no-interaction.thirdPartyRequests[]`; manual: no cross-site ID, no provider reuse, lifetime ≤ 13 months, retention ≤ 25 months, user informed, opt-out. GA4 never qualifies | High risk if conditions unclear; Non-compliance for GA4 |
| EU-14 | Google Consent Mode advanced (pings before or after refusal); also watch for IP-based Google ads measurement pings before consent (planned August 2026, UNVERIFIED) | `consent.no-interaction` / `consent.reject` requests to Google hosts carrying `gcs=`/`gcd=`; manual: read `gtag('consent','default',…)` and check that `ad_user_data` / `ad_personalization` are passed after Accept (Google policy for EEA traffic) | High risk |
| EU-15 | Remote Google Fonts / Adobe Fonts | category `fonts` before consent; grep `fonts.googleapis`, `fonts.gstatic`, `use.typekit` | High risk |
| EU-16 | YouTube/Vimeo/Maps iframes load before consent | `consent.no-interaction.thirdPartyIframes[]`, categories `video`, `maps`; check for a facade | High risk |
| EU-17 | reCAPTCHA loads before consent without information (CNIL, NS Cards France) | category `captcha` before consent; grep `recaptcha`; manual: privacy notice mentions it | High risk |
| EU-18 | Ad/social pixels before consent; notice explains joint controllership (*Fashion ID*) | categories `ads`, `social` before consent; `pixelLeaks[]`; manual notice read | Non-compliance |
| EU-19 | Remote images/CDNs exposing IPs (unpkg, jsdelivr, Unsplash hotlinks) | categories `cdn`, `other`; grep | Improvement (High risk if identifiers are set) |
| EU-20 | Privacy notice exists and is linked from every page and from each form | `pages.links.privacy` on every page; `pages.forms[].noticeNearby.privacyLink` | Non-compliance |
| EU-21 | All art. 13 items present | `policy.items.gdpr[]`: controller, contact, dpo, purposes, legalBasis, legitimateInterest, recipients, transfers, safeguard, retention, rights, withdrawConsent, complaintAuthority, mandatoryData, automatedDecisions; recipients must match `policy.vendors.detected[]` | Non-compliance per missing item |
| EU-22 | Transfers: country and mechanism named; DPF only for listed vendors | `policy.transfers.countriesNamed[]`, `policy.items.gdpr[]` transfers/safeguard; manual: dataprivacyframework.gov | Non-compliance if Privacy Shield cited or no mechanism; Improvement for an SCC fallback |
| EU-23 | Forms: no pre-ticked boxes; marketing consent separate and optional; information at collection; "I accept the privacy policy" not used as consent | `pages.forms[].checkboxes[].preChecked`, `.label`, `.marketingCheckbox`, `.noticeNearby`, `.nearbyText` | Non-compliance |
| EU-24 | Newsletter: consent or valid soft opt-in; unsubscribe in every email | `pages.forms[].marketingCheckbox`; manual: ask for email templates | Non-compliance if no basis |
| EU-25 | Obsolete references ("Privacy Shield", "Directive 95/46", ODR link) | `pages.obsoleteRefs[]`, `policy.obsoleteRefs[]`, `pages.links.odrLink` | Improvement (Non-compliance for Privacy Shield) |
| EU-26 | Imprint/legal notice reachable from every page (≤ 2 clicks) | `pages.links.imprint` | Non-compliance |
| EU-27 | ECD art. 5(1) items: name, address, email, register and number, authority, profession details, VAT | `pages.identification.email`, `.address`, `.ids.vatEU`; manual for register, authority, profession | Non-compliance per missing item |
| EU-28 | Contact: email plus a second rapid means (form or phone) | `pages.identification.email`, `.phone`, `pages.forms[]` | Non-compliance if no email |
| EU-29 | Regulated profession (architects, engineers): body, title, granting state, rules | manual: ask profession; read imprint | Non-compliance if applicable and missing |
| EU-30 | B2C: withdrawal function "withdraw from contract here" (or local equivalent), available all period, "confirm withdrawal" step, durable-medium acknowledgement; pre-contract info mentions it | `pages.links.withdrawal`; manual: account/order pages | Non-compliance |
| EU-31 | B2C: order button "order with obligation to pay" or equivalent | manual: walk to checkout | Non-compliance |
| EU-32 | B2C: pre-contract information and T&Cs (identity, total price incl. taxes and delivery, withdrawal right and model form, guarantees) | `pages.links.terms`; manual read | Non-compliance |
| EU-33 | B2C: price reductions show the lowest price of the prior 30 days | manual: sale pages | Non-compliance |
| EU-34 | Reviews: authenticity statement | `scope.signals.ugc`; manual: review widgets and policy | High risk |
| EU-35 | ODR link removed; national ADR information where required | `pages.links.odrLink` | Improvement |
| EU-36 | No automatic redirect or blocking by country without consent | run `consent-check.mjs` with different EU locales; manual | High risk |
| EU-37 | Hosting user content: DSA contact points and notice-and-action mechanism | `scope.signals.ugc`; manual | Non-compliance if hosting and missing |
| EU-38 | EAA scope: B2C e-commerce and not a microenterprise | `scope.signals.commerce`; manual: ask headcount/turnover | Not assessable |
| EU-39 | In EAA scope: WCAG 2.1 AA on the purchase path (keyboard-reachable order button, labelled fields, no inaccessible CAPTCHA, contrast) | manual: axe-core plus a keyboard pass; note `pages.overlays[]` | Non-compliance for purchase-path blockers |
| EU-40 | In EAA scope: accessibility statement (Annex V) published | `pages.links.accessibilityStatement` | Non-compliance |
| EU-41 | Not in EAA scope: run axe anyway | manual: axe-core | Improvement |
| EU-42 | 50+ workers: visible link to the whistleblowing channel | `pages.links.whistleblowing`; manual: ask headcount | Non-compliance if in scope and missing |
| EU-43 | AI chatbot discloses it is AI before or at first interaction (art. 50(1)) | `scope.signals.aiChat`, `pages.chatWidgets[]`; manual: open the widget | Non-compliance |
| EU-44 | AI imagery: photoreal depictions of real people/places/events labelled (50(4)) | manual: ask; inspect images | Non-compliance for undisclosed deepfakes; Improvement for generic AI illustrations |
| EU-45 | Children: consent relied on for minors' data → national age (table above) | `scope.signals.kidsTerms`; manual | Not assessable / High risk |
| EU-46 | Microsoft Clarity: no `_clarity` / `_clck` / `_clsk` cookies before consent; `consentv2` called after Accept | `consent.no-interaction.cookies[]`, category `replay`; grep `clarity(` and `consentv2` | Non-compliance if cookies before consent; Improvement if loaded without a `consentv2` call (broken integration) |

---

## Spain

**Applies when:** Spanish establishment, or the site targets Spain (Spanish language for Spain, `.es`, +34 numbers, € prices with shipping to Spain). Visibility alone does not trigger it. Main national laws: LSSI-CE, LOPDGDD, Ley 2/2023, Ley 11/2023.

**Privacy notice:** GDPR art. 13 plus:
- **LOPDGDD art. 11 (layered notice)**: the first layer, next to the form, must include at least the controller (responsable), the purpose (finalidad), how to exercise the rights of arts. 15–22 (derechos) and, if there is profiling, that fact, with a link to the full information (UNVERIFIED). The layer may sit outside the `<form>` element.
- Name the **AEPD** as the complaint authority.
- Transfers: "Marco de Privacidad de Datos UE–EE. UU." if the provider is certified; otherwise cláusulas contractuales tipo (art. 46.2.c).
- Processors to list: hosting, form delivery, email marketing, analytics, CMS, CAPTCHA, matching what the code uses (Server Actions and `app/api/*` show where forms are sent).
- DPO: not usually mandatory for a small studio.

**Cookies and tracking:** opt-in, **LSSI art. 22.2**; AEPD cookie guide (May 2024) https://www.aepd.es/guias/guia-cookies.pdf
- Banner appears before any non-exempt cookie is used.
- **First layer**: publisher, purposes, first- or third-party, and **Accept, Reject and Configure** buttons. Reject "en la misma capa y al mismo nivel que la opción para aceptarlas" (§3.2.1). A misleading Reject (barely visible, low contrast) is invalid.
- No pre-checked boxes; scrolling or continued browsing is not consent; granular settings panel by purpose; **cookie walls prohibited** unless there is a genuinely equivalent alternative.
- Consent duration: AEPD recommends **at most 24 months**; about 13 months for exempt analytics.
- **Exempt cookies**: user input, session or authentication, security, media player during the session, load balancing, user-chosen customisation (e.g. language), certain social plug-ins for logged-in users, and the cookie that stores the consent choice.
- **Analytics is not exempt** in general. Exempt only if **all** conditions of the AEPD guide on external analytics cookies (January 2024, https://www.aepd.es/guias/guia-cookies-analiticas-externas.pdf) are met: publisher-only purpose; anonymous statistics; no cross-referencing or sharing with third parties; no cross-site tracking; provider does not reuse data (providers that reuse are excluded); cookie about 13 months, no renewal; retention ≤ 25 months; processing agreement; user informed. Allowed metrics: page audience, referrers, device/browser/screen, load time, time on page/bounce/scroll, clicks, geographic origin. **Standard GA4 does not fit.**
- **Cookie policy content**: what cookies are, types and purposes; first or third party and who the third party is; how to accept, reject and withdraw (not only via browser settings); duration; international transfers; profiling if any. A table (name, provider, purpose, duration, type) is usual practice. Every observed cookie or storage item must be declared.
- **Common third parties (AEPD/LSSI view, with Next.js fixes):**

| Resource | Assessment | Fix |
|---|---|---|
| Google Fonts via `<link>` or `@import` to `fonts.googleapis.com` | High risk: IP sent to Google without consent (LG München, 20-01-2022) | `next/font/google` downloads fonts at build time and serves them from the site's domain (https://nextjs.org/docs/app/api-reference/components/font) |
| Adobe Fonts (`use.typekit.net`) | High risk, same reason | Cannot be self-hosted with `next/font` and the licence normally forbids it: load after consent, or switch to a font whose licence allows self-hosting via `next/font/local` |
| YouTube (also `youtube-nocookie`) | High risk: writes localStorage on load | Facade (local thumbnail, load iframe on click after informing) or load on consent. Check what `@next/third-parties` `YouTubeEmbed` does in the browser |
| Google Maps (iframe or API) | High risk | Local static image linking to Maps, or load after consent |
| Vimeo (even with `dnt=1`) | Check in the browser | Facade recommended |
| reCAPTCHA | Risk: Google calls it "necessary"; the AEPD has not ruled; the CNIL sanctioned reCAPTCHA without information or consent (NS Cards France, 29 Dec 2023) | Honeypot plus server-side rate limiting, or Turnstile/hCaptcha/Friendly Captcha declared as processors |
| GA4 + basic Consent Mode | Compatible if nothing loads until Accept | — |
| GA4 + advanced Consent Mode | High risk: pings even after Reject; no authority has validated it | Switch to basic mode |
| Meta Pixel, LinkedIn Insight, TikTok | Prior consent always; joint controller (*Fashion ID*) | Block until Accept |
| Vercel Web Analytics / Speed Insights | Low risk: no cookies, daily hash; candidate for the audience-measurement exemption if conditions are met | Declare in the policy (Improvement, not Non-compliance) |
| Hotjar / Microsoft Clarity | Prior consent. Clarity enforces consent signals for the EEA since 31 Oct 2025 | Block until Accept; for Clarity call `window.clarity('consentv2', …)` with the CMP state |
| Remote images (`<img src="https://…">`, `unoptimized`, external loader) | The browser contacts the third party | Serve with `next/image` from the site's domain |

- Note: storage written inside third-party iframes (e.g. YouTube localStorage) is not visible to the page; use `thirdPartyIframes[]` and `thirdPartyRequests[]` as evidence.

**Forms and marketing:**
- Enquiries and quote requests: basis art. 6.1.b (pre-contractual) or 6.1.f. **No consent checkbox needed**, but the information layer is.
- "He leído y acepto la política de privacidad" is not valid consent in itself.
- If the basis is consent: specific checkbox, not pre-checked (*Planet49*), separate per purpose.
- **LSSI art. 21**: commercial communications need consent (or soft opt-in); the marketing checkbox must be separate.
- Newsletter double opt-in is not mandatory but helps prove consent (art. 7.1): Improvement.

**Identification / imprint:** "Aviso legal", **LSSI art. 10**, accessible permanently, easily, directly and free of charge (https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758, UNVERIFIED):
- name or company name (or the autónomo's name), address, email and another means of direct contact
- **NIF**
- Registro Mercantil details: **tomo, folio, hoja, inscripción** (companies)
- regulated profession: colegio, membership number, qualification, professional rules
- administrative authorisation, if required
- prices including taxes and shipping, if prices are shown
- codes of conduct, if adhered to
- Graphic design is not a regulated profession; architecture, engineering and law are.

**Selling online:**
- EU baseline consumer checks; Spanish withdrawal label example: "Desistir del contrato aquí" (check the official transposed wording).
- **TRLGDCU** terms and conditions of sale, right of withdrawal, and **hojas de reclamaciones** (official complaint forms) according to the comunidad autónoma. Outside the basic technical scope: mark as not assessed and recommend a review.
- **Ley 10/2025 on customer service** (atención a la clientela): only basic services and large companies. Does not normally apply to a small studio.

**Accessibility:**
- **Ley 11/2023** (transposes the EAA; https://www.boe.es/buscar/act.php?id=BOE-A-2023-11022): since 28-06-2025 for **B2C e-commerce** and other listed services (banking, transport, telecoms). Corporate or portfolio sites without online consumer contracting are not covered. Service microenterprises are exempt (EAA art. 4(5); matching article of Ley 11/2023 UNVERIFIED). If covered: publish how it complies (WCAG 2.1 AA via EN 301 549).
- **RD 193/2023** (art. 14.2 and sixth final provision; https://www.boe.es/buscar/act.php?id=BOE-A-2023-7417): private websites in general will need the RD 1112/2018 criteria: **new websites from 1-01-2029**; existing ones need reasonable adjustments **before 1-01-2030**. Today an Improvement, except companies of "especial trascendencia económica" (Ley 56/2007), which **art. 14.3 already obliges**.

**Transfers:** as baseline. Also check `vercel.json` / project settings `regions`: functions may run in the US if no other region is set; declare the transfer.

**Officer, representative, registration:** DPO only if designated or required; no Spain-specific website registration recorded.

**Children:** **art. 7 LOPDGDD = 14** (in force). The draft organic law on minors in digital environments (121/000052; BOCG 11-04-2025) would raise it to **16** (explanatory statement §X). Still in Congreso: amendments approved in Ponencia 24-06-2026; **no BOE publication** as of 28-10-2026; final status UNVERIFIED. https://www.congreso.es/public_oficiales/L15/CONG/BOCG/A/BOCG-15-A-52-1.PDF; https://www.congreso.es/enmiendas/comisiones/15_303_121_000052/121-52_Enm_in_voce_aprobadas_en_Ponencia_24-06-2026.pdf

**AI and other:**
- **Whistleblowing, Ley 2/2023** (https://www.boe.es/buscar/act.php?id=BOE-A-2023-4513): mandatory with **50 or more workers** (art. 10.1.a) and in certain regulated sectors regardless of size. **Art. 25**: "En caso de contar con una página web, dicha información deberá constar en la página de inicio", in a **separate and easily identifiable section**. The information covers the use of the internal channel and the essential principles of the procedure. Text of art. 25: https://papelea.com/es/leyes/ley-de-proteccion-de-informantes/titulo-iv (secondary); BOE wording of art. 25 UNVERIFIED.
- **Intellectual property and image rights**: no duty to publish a copyright notice. Licences for images, typefaces and project photos should be documented, plus authorisation from identifiable people (LO 1/1982). Manual; Improvement.
- AI Act art. 50 as baseline.

**Penalties and enforcement:** LSSI art. 38:
- **Serious** (grave, art. 38.3.b, €30,001–€150,000): significant failure on art. 10 letter a) (identification and contact) or f) (prices).
- **Minor** (leve, art. 38.4.b, up to €30,000): missing NIF, registry, colegio, authorisation or codes of conduct.
- **Cookies without consent**: minor, art. 38.4.g. The AEPD sanctions them often, typically €3k–€30k, often reduced by voluntary payment. Trackers before consent or after Reject is the pattern it sanctions most.
- **2025 AEPD cookie sanctions** (https://lawwwing.com/aepd-sanciones-2025/, secondary; AEPD procedure numbers and resolution URLs UNVERIFIED):
  - **Wallapop**, €3,000: LSSI art. 22; non-technical cookies without consent and an ineffective "Rechazar todo" button.
  - **Ediciones Católicos y Vida Pública, S.L.U. (El Debate)**, €3,000: LSSI art. 22.2; non-technical cookies without consent; cookies that stayed after rejection or withdrawal.
  - **MaxPower**, €1,600: cookies without consent, no granularity, incomplete cookie policy.
  - No 2026 case found.

**Pending changes:** age of consent 14 → 16 (above); possible new AEPD cookie guide; Digital Omnibus (baseline).

**Sources:** LSSI https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758 · LOPDGDD https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673 · AEPD cookie guide https://www.aepd.es/guias/guia-cookies.pdf · AEPD analytics guide https://www.aepd.es/guias/guia-cookies-analiticas-externas.pdf · Ley 2/2023 https://www.boe.es/buscar/act.php?id=BOE-A-2023-4513 · Ley 11/2023 https://www.boe.es/buscar/act.php?id=BOE-A-2023-11022 · RD 193/2023 https://www.boe.es/buscar/act.php?id=BOE-A-2023-7417

### Checks — Spain
Report baseline cookie findings (EU-04 to EU-19) citing LSSI art. 22.2 and the AEPD guide.

| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| ES-01 | Aviso legal, privacy policy and cookie policy linked on every page (≤ 2 clicks) | `pages.links.imprint`, `.privacy`, `.cookies` per page | Non-compliance |
| ES-02 | LSSI art. 10 items: name, address, email plus another contact means, NIF, Registro Mercantil (tomo, folio, hoja, inscripción), colegio if regulated, authorisation, prices with taxes and shipping, codes of conduct | `pages.identification.ids.nifES`, `.email`, `.phone`, `.address`; manual: registry details and regulated-profession status | Non-compliance per missing item |
| ES-03 | Banner first layer shows publisher, purposes, 1st/3rd party, and Accept, Reject, Configure | `consent.banner.accept`, `.reject`, `.settings` (text); screenshot | Non-compliance |
| ES-04 | Consent cookie ≤ 24 months (≈ 13 months for exempt analytics) | `consent.accept.cookies[].durationDays` for the CMP cookie | Improvement |
| ES-05 | Pre-consent analytics meets every AEPD January 2024 condition (incl. processing agreement) | category `analytics` in `consent.no-interaction.thirdPartyRequests[]`; manual: vendor terms | High risk if unclear; Non-compliance for GA4 |
| ES-06 | Cookie policy content (types, purposes, 1st/3rd party, how to accept/reject/withdraw, duration, transfers, profiling) | manual: read the cookie policy; `policy.vendors.missingFromPolicy[]` | Non-compliance if information missing; Improvement if only the table is missing |
| ES-07 | First-layer notice next to each form (controller, purpose, rights, profiling, link) per LOPDGDD art. 11 | `pages.forms[].noticeNearby` {controller, purpose, rights, privacyLink}, `.nearbyText` | Non-compliance |
| ES-08 | Commercial communications checkbox separate and unticked (LSSI art. 21) | `pages.forms[].marketingCheckbox`, `.checkboxes[].preChecked` | Non-compliance |
| ES-09 | "He leído y acepto…" not used as the consent for marketing | `pages.forms[].checkboxes[].label` | Non-compliance if relied on as consent |
| ES-10 | Privacy policy names the AEPD and specific retention periods | `policy.items.gdpr[]` complaintAuthority, retention | Non-compliance |
| ES-11 | Transfers: DPF ("Marco de Privacidad de Datos UE–EE. UU.") for listed vendors or SCCs; Vercel/hosting region declared | `policy.transfers.countriesNamed[]`; manual: `vercel.json` `regions` | Non-compliance if no mechanism; Improvement for SCC fallback |
| ES-12 | 50+ workers or regulated sector: whistleblowing information on the home page in a separate, identifiable section (Ley 2/2023 art. 25) | `pages.links.whistleblowing` on the home page; manual: ask headcount | Non-compliance if in scope and missing |
| ES-13 | Accessibility: B2C → Ley 11/2023 (EU-38 to EU-40); others → RD 193/2023 timetable | `scope.signals.commerce`; manual: ask whether "especial trascendencia económica" | Improvement (Non-compliance if art. 14.3 already applies) |
| ES-14 | B2C: TRLGDCU T&Cs, withdrawal, hojas de reclamaciones per comunidad autónoma | `pages.links.terms`, `.complaintsBook`, `.withdrawal`; manual: ask region | Not assessable (recommend review) |
| ES-15 | Ley 10/2025 customer service duties | manual: ask sector and size | Not assessable |
| ES-16 | Obsolete references: "LOPD 15/1999", "Ley Orgánica 15/1999", "Directiva 95/46", "Escudo de Privacidad", ODR link | `pages.obsoleteRefs[]`, `policy.obsoleteRefs[]` | Improvement (Non-compliance for Privacy Shield / Escudo de Privacidad) |
| ES-17 | Consent from minors uses 14 (not yet 16) | `scope.signals.kidsTerms`; manual | Not assessable |
| ES-18 | Image, typeface and photo licences and image-rights authorisations documented | manual: ask | Improvement |

---

## Germany

**Applies when:** German establishment or targeting Germany (German language for DE, `.de`, +49, shipping to DE).

**Privacy notice:** GDPR only; no website-specific add-on (UNVERIFIED).

**Cookies and tracking:** opt-in under **TDDDG §25** (formerly TTDSG, renamed 14-05-2024; UNVERIFIED). Remote Google Fonts carry special exposure: LG München I (20-01-2022) awarded €100 damages and triggered mass warning letters.

**Forms and marketing:** **UWG §7(2)–(3)**. **Double opt-in** is the de facto standard for proving email consent (BGH I ZR 164/09, 2011, "Double-opt-in-Verfahren"); the confirmation email must contain **no advertising** (UNVERIFIED).

**Identification / imprint:** **DDG §5** (replaced TMG §5 on 14-05-2024), "leicht erkennbar, unmittelbar erreichbar und ständig verfügbar". https://www.gesetze-im-internet.de/ddg/__5.html
1. name and address of establishment; for legal entities also legal form, authorised representative(s) and, if capital is stated, share or base capital (plus outstanding contributions if not fully paid in)
2. rapid electronic contact, including email
3. supervisory authority, for licensed activities
4. commercial, partnership, association or cooperative register and number
5. regulated professions: chamber, statutory title and granting state, professional rules and access
6. USt-IdNr. (VAT ID) or Wirtschafts-Identifikationsnummer, if any
7. AG, KGaA, GmbH in liquidation or winding-up: a statement to that effect
8. audiovisual media services: seat Member State and competent authorities
- **§18(2) MStV**: journalistic-editorial content (blogs, news) needs a responsible person with name and address (UNVERIFIED).

**Selling online:** EU baseline; withdrawal label example "Vertrag hier widerrufen". ADR information under **VSBG §36** still applies after the ODR link ended.

**Children:** 16 (GDPR default).

**Penalties and enforcement:** missing imprint: fine up to €50,000 (DDG §33; amount UNVERIFIED) plus competitor warning letters (Abmahnungen) under the UWG. DPA fines for website tracking: UNVERIFIED.

**Sources:** https://www.gesetze-im-internet.de/ddg/__5.html · https://www.gesetze-bayern.de/Content/Document/Y-300-Z-BECKRS-B-2022-N-612

### Checks — Germany
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| DE-01 | "Impressum" reachable from every page (≤ 2 clicks) | `pages.links.imprint` | Non-compliance |
| DE-02 | DDG §5 items: name, address, legal form and representative, email, register and number, USt-IdNr., chamber/authority if applicable, capital rules | `pages.identification.address`, `.email`, `.ids.handelsregisterDE`, `.ids.ustIdDE`, `.shareCapital`; manual: representative, legal form | Non-compliance per missing item |
| DE-03 | Blog/news content names a responsible person (MStV §18(2)) | manual: check for editorial content | Non-compliance if applicable and missing |
| DE-04 | Remote Google Fonts (report EU-15 citing LG München) | category `fonts` before consent | High risk |
| DE-05 | Newsletter double opt-in; no advertising in the confirmation email | manual: subscribe and read the confirmation | High risk if no double opt-in |
| DE-06 | Obsolete "TMG §5" or "TTDSG" references | `pages.obsoleteRefs[]`, `policy.obsoleteRefs[]` | Improvement |
| DE-07 | B2C: VSBG §36 ADR information | manual: imprint/T&Cs | Improvement |

---

## France

**Applies when:** French establishment or targeting France (French language for FR, `.fr`, +33, shipping to FR). The CNIL applies cookie rules to non-EU publishers that target French residents (UNVERIFIED).

**Privacy notice:** GDPR plus the right to give **post-mortem directives** (Loi Informatique et Libertés art. 85; UNVERIFIED).

**Cookies and tracking:** opt-in, **Loi 78-17 art. 82**.
- "Le refus doit être aussi simple que l'acceptation". If consent is stored for a period, the refusal should be stored for the same period. https://entreprendre.service-public.gouv.fr/vosdroits/F31228
- **Audience-measurement exemption** (CNIL, version of 4 Jul 2025): sole purpose audience measurement for the publisher's exclusive account; anonymous statistics only; no combination with other processing and no transfer to third parties in identifiable form; no cross-site tracking; users informed; tracker lifetime **≤ 13 months**, not extended automatically; retention **≤ 25 months**; a processor serving several publishers keeps each publisher's data separate. The CNIL does not certify tools; vendors self-assess. https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience

**Forms and marketing:** CPCE L.34-5 (UNVERIFIED).

**Identification / imprint:** **LCEN** (restructured by Loi SREN 2024), arts. 1-1, 1-2 and 19. https://entreprendre.service-public.gouv.fr/vosdroits/F37351
- Company: dénomination, legal form, **share capital**; registered office address, email and **phone**; **RCS and/or RNE** number; intra-EU VAT number where applicable; **hosting provider's name, address and phone**.
- Sole trader: name with "EI"; address, email, phone; same identifiers.
- Online public communication service: **directeur de la publication** and hosting provider.
- Regulated activity: authorising authority. Regulated profession: title, rules, granting state, professional body.

**Selling online:** EU baseline; withdrawal label example "Se rétracter du contrat ici".

**Accessibility:** **Tribunal judiciaire de Caen, 4-06-2026 (25/00691)**, associations v. **Carrefour**: site and app to be made accessible within 6 months, then **€500/day**; 71% RGAA conformity held insufficient (https://www.interetaagir.org/wp-content/uploads/2026/06/TJ-de-Caen-ord.-4-juin-2026_API-DV-et-DROIT-PLURIEL-c.-CARREFOUR.pdf, summarised by https://statutus.ch/en/guides/european-accessibility-act-enforcement-so-far/ and https://li.solutions/blog/eaa-enforcement-2026/; secondary). Lille, 5-05-2026: interim relief against Auchan **refused**.

**Children:** 15.

**Penalties and enforcement:**
- LCEN imprint: €75,000 (natural person) / €375,000 (legal person). One year's imprisonment (LCEN art. 1-2): UNVERIFIED.
- **CNIL sanctions** (https://www.cnil.fr/fr/les-sanctions-prononcees-par-la-cnil): 01-09-2025 Google €325m (cookie information and consent plus Gmail ad emails); 01-09-2025 Shein €150m (cookies); 03-07-2025 furniture e-retailer €600k; 20-11-2025 magazine publisher €750k; 27-11-2025 card issuer €1.5m and mail-order company €500k; 30-12-2025 €3.5m (several breaches incl. cookie consent). **Small sites are fined** under the simplified procedure, €2k–€20k in 2025–2026: travel agency €2k, footwear retailer €5k, performing-arts company €5k, ticketing company €15k plus injunction (26-03-2026).
- **NS Cards France, 29 Dec 2023 (SAN-2023-023), €105,000**: GDPR art. 5(1)(e); arts. 12–13 (privacy policy incomplete, outdated and **English-only for a mainly French audience**); art. 32; Loi 78-17 art. 82 (Google Analytics cookies without consent; reCAPTCHA at account creation and login without information or prior consent). https://cnil.fr/en/node/164774
- Google Analytics formal notices, February 2022 (date UNVERIFIED).

**Sources:** URLs above.

### Checks — France
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| FR-01 | "Mentions légales" reachable from every page | `pages.links.imprint` | Non-compliance |
| FR-02 | LCEN items: name/legal form, share capital, address, email, phone, RCS/RNE, VAT, directeur de la publication, hosting provider name/address/phone | `pages.identification.ids.sirenFR`, `.ids.rcsFR`, `.ids.vatEU`, `.shareCapital`, `.phone`, `.email`, `.directorOfPublication`, `.hostingProvider` | Non-compliance per missing item |
| FR-03 | Refusal as simple as acceptance; refusal remembered as long as consent | `consent.banner.symmetry`; manual: reject, reload, check the banner does not return early | Non-compliance if no equal refusal; Improvement for refusal storage |
| FR-04 | Pre-consent analytics meets every CNIL exemption condition | category `analytics` in `consent.no-interaction.thirdPartyRequests[]`, cookie `durationDays` ≤ 13 months; manual: retention, vendor terms | High risk if unclear |
| FR-05 | Privacy notice mentions post-mortem directives | manual: read the privacy notice | Non-compliance |
| FR-06 | Site targets a French audience but the privacy notice is only in English (NS Cards) | `policy.lang` vs `scope.pages[].htmlLang` / `hreflang[]` | High risk |

---

## Italy

All Italian legal texts below are UNVERIFIED. Confirm before relying on them.

**Applies when:** Italian establishment or targeting Italy.

**Cookies and tracking:** opt-in, **Codice privacy art. 122**. Garante cookie guidelines of 10-06-2021: closing the banner with "X" counts as **refusal**; do not re-prompt for **6 months** (UNVERIFIED).

**Identification / imprint:**
- **D.Lgs. 70/2003 art. 7**: mirrors ECD art. 5.
- **DPR 633/1972 art. 35**: the **Partita IVA must appear on the home page** of a business website.
- **Codice civile art. 2250**: companies state on their website the registered office, the Registro Imprese office and number, **share capital actually paid up**, sole-shareholder status if any, and whether in liquidation.

**Accessibility:** AgID supervision and sanctions regulation published 29-05-2026 (secondary).

**Children:** 14.

**Penalties and enforcement:** Garante, 23-06-2022 (Caffeina Media): Google Analytics transfer unlawful; truncated IP still personal data; 90 days to comply. https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9782874

### Checks — Italy
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| IT-01 | Partita IVA on the home page | `pages.identification.ids.pivaIT` (home page footer) | Non-compliance |
| IT-02 | Registered office, Registro Imprese office and number, paid-up capital, sole shareholder, liquidation status | `pages.identification.address`, `.shareCapital`; manual | Non-compliance per missing item |
| IT-03 | Closing the banner with "X" acts as refusal | manual: close with X, then compare requests with `consent.reject` | Non-compliance if trackers load |
| IT-04 | No re-prompt within 6 months after refusal | manual: CMP config | Improvement |

---

## Austria

All Austrian legal texts below are UNVERIFIED. https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20001703

**Applies when:** Austrian establishment or targeting Austria.

**Cookies and tracking:** opt-in, **TKG 2021 §165**.

**Identification / imprint:**
- **ECG §5**: name/firm; geographic address; contact details incl. email; Firmenbuch number and court; supervisory authority; chamber or professional association membership; professional title, granting state and rules; UID number (VAT).
- **UGB §14**: firm name, legal form, seat, Firmenbuch number and court on websites.
- **MedienG §25 (Offenlegung)**: for a "small website" with no content beyond presenting the owner: name/firm, Unternehmensgegenstand (business purpose) and residence or seat.

**Children:** 14.

**Penalties and enforcement:** DSB: Google Analytics unlawful (US transfers), noyb model complaint, announced 13-01-2022. https://noyb.eu/en/austrian-dsb-eu-us-data-transfers-google-analytics-illegal

### Checks — Austria
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| AT-01 | Imprint reachable from every page | `pages.links.imprint` | Non-compliance |
| AT-02 | ECG §5 + UGB §14 items (incl. Firmenbuch number and court, UID, chamber) | `pages.identification.address`, `.email`, `.ids.vatEU`; manual: Firmenbuch, chamber | Non-compliance per missing item |
| AT-03 | MedienG §25 Offenlegung (business purpose, seat) | manual: read imprint | Non-compliance |

---

## Netherlands

Only cookies, children and accessibility enforcement are recorded. No Dutch-specific imprint, notice or marketing rule is recorded; apply the EU baseline and verify Dutch law before adding national items.

**Cookies and tracking:** opt-in, **Telecommunicatiewet art. 11.7a** (UNVERIFIED).

**Accessibility:** **ACM, 24-03-2026**: tested about 100 large webshops plus telecom and energy providers; 61% did not let users with a disability order, 33% had serious problems; worst performers to be named; enforcement to follow. ACM states the rules apply to companies with 10 or more employees and/or turnover above €2m. https://www.acm.nl/nl/publicaties/acm-klant-met-beperking-kan-bij-merendeel-grote-webwinkels-niet-terecht

**Children:** 16.

### Checks — Netherlands
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| NL-01 | B2C webshop: a user relying on keyboard/screen reader can complete an order (ACM focus) | manual: axe-core plus keyboard pass through checkout | Non-compliance for blockers |
| NL-02 | National imprint/notice items beyond the EU baseline | manual: verify Dutch law | Not assessable |

---

## United Kingdom

**Applies when:**
- **UK GDPR art. 3(2)** mirrors the EU rule for UK data subjects: offering goods or services, or monitoring behaviour in the UK. https://www.legislation.gov.uk/eur/2016/679/article/3
- **PECR reg. 6** applies to storage or access on UK users' terminal equipment.
- Same targeting logic as the EU (English for UK, £, `.uk`, +44, UK shipping); mere accessibility is not enough.

**Privacy notice:**
- UK GDPR arts. 13–14 (same items as the EU); the **ICO** is the complaint authority.
- **Data (Use and Access) Act 2025 s.103**, in force **19-06-2026** (SI 2026/82): controllers must facilitate complaints to the controller itself, e.g. with an electronic complaint form. The notice should explain how to complain to the controller as well as to the ICO. https://www.legislation.gov.uk/uksi/2026/82/made

**Cookies and tracking:** opt-in, with statistical and appearance exceptions that work as opt-out (objection).
- **New PECR reg. 6** (DUAA s.112), in force **5 Feb 2026** (SI 2026/82): prohibits storage of or access to information in terminal equipment, subject to Schedule A1; covers "instigating" storage/access and collecting information the device emits automatically. Reg. 6A lets the Secretary of State add exceptions. https://www.legislation.gov.uk/ukpga/2025/18/section/112
- **Schedule A1 exceptions** (DUAA Sch. 12; https://www.legislation.gov.uk/ukpga/2025/18/schedule/12):
  - strictly necessary (security, fraud prevention, fault detection, authentication);
  - **statistical purposes (para 5)**: sole purpose is statistics on use of the service/site to improve it; shared only with someone who helps make the improvements; users get clear and comprehensive information and **a simple, free means of objecting**, and have not objected;
  - **appearance/functionality (para 6)**: adapting look or function to the user's preferences; same information and objection conditions;
  - emergency assistance (location data, narrow).
- **ICO guidance on storage and access technologies**, finalised **29 Apr 2026** (first published 20-12-2024). Exceptions chapter (https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/):
  - third-party analytics qualifies only if the provider is a **processor** (not joint controller), uses data only to help improve your service and does not link it with other data; own-purpose use (e.g. linking visits to ads) needs consent;
  - "simple means of objecting": e.g. a toggle **on by default** in the consent tool; browser settings alone are not enough; after objection, storage and access must stop;
  - **external font libraries** may fall under the appearance exception if the provider uses data only to serve fonts; if it collects IPs, say so and offer objection; self-hosting is an option;
  - advertising purposes never qualify.
- Consent chapter: refusing as easy as accepting; "accept all" and "reject all" equally prominent; non-exempt toggles off by default; no "by continuing" notices; no reliance on browser settings; granular by purpose; third parties identified; withdrawal as easy as consent and already-set technologies removed; mixing legitimate-interest toggles with consent toggles is bad practice; no statutory consent duration, about **6 months** suggested before re-asking someone who refused.
- Google Consent Mode advanced: High risk unless the pings fit the statistical exception. Google's own policy has "no expectation" of verified consent signals for UK traffic, but PECR consent still applies. Microsoft Clarity enforces consent signals for UK visits since 31 Oct 2025 (see EU baseline table).

**Forms and marketing:** **PECR reg. 22** (https://www.legislation.gov.uk/uksi/2003/2426/regulation/22):
- consent, or the soft opt-in (22(3)): sale or negotiation for a sale, similar products, simple free refusal at collection and in every message;
- **new 22(3A)** (DUAA s.114, in force 5-02-2026): charity soft opt-in where details were collected when the person expressed interest in or supported the charity's purposes.
- Forms: same rules as the EU (separate unticked marketing box; information at collection).

**Identification / imprint:**
- **Companies (Trading Disclosures) Regulations 2008 (SI 2008/495) are revoked** by SI 2015/17, Sch. 6 para 1 (https://www.legislation.gov.uk/uksi/2015/17/schedule/6/made). SI 2015/17 in force since 31-01-2015 (UNVERIFIED).
  - **Reg. 24(2)**: registered name on the company's websites.
  - **Reg. 25**: part of the UK where registered (e.g. "England and Wales"), registered number, registered office address. Where relevant: "limited company" status if exempt from "Ltd"; CIC or investment-company status; if share capital is mentioned, the paid-up capital. https://www.legislation.gov.uk/uksi/2015/17/part/6
  - LLPs: same regime via the LLP provisions (UNVERIFIED).
- **Electronic Commerce (EC Directive) Regulations 2002, reg. 6(1)**: name; geographic address; contact details incl. email; trade register and number; supervisory authority; regulated profession details; VAT number. **Reg. 6(2)**: prices clear, with tax and delivery indicated. https://www.legislation.gov.uk/uksi/2002/2013/regulation/6

**Selling online:**
- **DMCC Act 2024**, unfair commercial practices regime in force **6-04-2025** (SI 2025/272): **Sch. 20 para 13** bans fake or concealed-incentivised reviews, misleading review display, and failing to take reasonable steps to prevent or remove fake reviews; **s.230(4) drip pricing**: the invitation-to-purchase price includes all mandatory fees, taxes and charges; also banned: false urgency (para 7) and misleading "free" claims (para 23). CMA direct fines up to 10% of global turnover (UNVERIFIED). Subscription-contracts commencement UNVERIFIED. https://www.legislation.gov.uk/ukpga/2024/13/schedule/20; https://www.legislation.gov.uk/ukpga/2024/13/section/230
- **Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013**: pre-contract information, "order with obligation to pay" button, 14-day cancellation (UNVERIFIED).
- **No** equivalent of the EU withdrawal button.

**Accessibility:** no private-sector web accessibility statute. **Equality Act 2010 s.29**: service providers must not discriminate; s.29(7) applies the reasonable-adjustments duty, anticipatory for services (Sch. 2; anticipatory nature UNVERIFIED). WCAG 2.2 AA is the practical benchmark. Public Sector Bodies Accessibility Regulations 2018 apply only to public bodies. https://www.legislation.gov.uk/ukpga/2010/15/section/29

**Transfers:** UK–US "data bridge" (UK Extension to the DPF): SI 2023/1028, shown "as made" with no amendments (in-force date 12-10-2023 UNVERIFIED; post-*Slaughter* review UNVERIFIED). https://www.legislation.gov.uk/uksi/2023/1028/contents/made.
- **EU adequacy for the UK**: the Commission **renewed both decisions on 19 Dec 2025** (GDPR: C(2025) 8771; LED: C(2025) 8782), **valid until 27 Dec 2031** (sunset clause), with a review at least 4 years after adoption. The 2021 decision had been extended by Implementing Decision (EU) 2025/1226 to 27 Dec 2025. Recital (7): the UK "continues to ensure an adequate level of protection". EU → UK transfers need no other mechanism. https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en; https://commission.europa.eu/document/download/b36eedab-43b8-46eb-ac30-a8d1e6e69f51_en?filename=Renewal+UK+adequacy+GDPR.pdf (recitals); expiry date via https://eucrim.eu/news/commission-renewed-adequacy-decisions-for-data-transfers-to-the-uk/ and https://www.freeths.co.uk/insights-events/legal-articles/2026/european-commission-renews-uk-adequacy-decisions-until-27-december-2031/ (secondary).

**Officer, representative, registration:** non-UK controllers caught by UK GDPR art. 3(2) need a **UK representative** (art. 27).

**Children:** age of consent **13** (DPA 2018 s.9). **Age Appropriate Design Code** (Children's code): applies to information society services likely to be accessed by under-18s; 15 standards (best interests, DPIA, age-appropriate application, transparency, detrimental use, policies, **high-privacy defaults**, data minimisation, data sharing, **geolocation off by default**, parental controls, **profiling off by default**, **nudge techniques**, connected toys, online tools). In force 2-09-2020 with a 12-month transition (dates UNVERIFIED). A studio portfolio site is normally **not** likely to be accessed by children. https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/

**AI and other:** no AI-specific website transparency law (UNVERIFIED). No statutory whistleblowing channel duty; PIDA 1998 only protects whistleblowers (UNVERIFIED).

**Penalties and enforcement:**
- DUAA s.115 and Sch. 13 apply the DPA 2018 penalty regime to PECR from **5 Feb 2026**. Reg. 6 (cookie) breaches: "higher maximum amount", **£17.5m or 4% of worldwide turnover**. A separate £8.7m / 2% tier for other PECR breaches (incl. reg. 22) is UNVERIFIED: secondary sources apply £17.5m / 4% to direct-marketing breaches as well (https://ipandcommercial.howardkennedy.com/post/102kpuv/unlocking-new-privacy-standards-higher-fines-for-direct-marketing-and-cookie-bre, secondary). Previous cap £500k. Conduct before 5-02-2026 falls under the old regime (SI 2026/82 reg. 11). https://www.legislation.gov.uk/ukpga/2025/18/schedule/13; £ figures (DPA 2018 s.157) via https://www.policypros.co.uk/cookie-consent-changes-duaa-guide/ and https://www.zwillgen.com/eu-uk/ico-cookie-crackdown-2-icos-new-storage-access-technologies-guidance/ (secondary).
- ICO reviewed the top 1,000 UK websites; about 99% reportedly passed by April 2026; periodic testing continues (ZwillGen, secondary). No ICO cookie fine found yet.

**Pending changes:** further reg. 6A exceptions by statutory instrument; DMCC subscription-contracts commencement; any review of the UK–US data bridge; review of the EU adequacy decision for the UK (at least 4 years after 19 Dec 2025).

**Sources:** URLs above.

### Checks — United Kingdom
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| UK-01 | UK establishment or targeting | `scope.suggestedRegimes[]`, `scope.signals.currencies[]` (£), `.ccTLD`, `.phonePrefixes[]`, `hreflang[]` | Not assessable if unknown |
| UK-02 | Non-UK controller targeting the UK names a UK representative | manual: read the privacy notice | Non-compliance |
| UK-03 | No non-exempt storage or requests before consent (run with `--locale=en-GB --tz=Europe/London`) | `consent.no-interaction.thirdPartyRequests[]`, `.cookies[]`, `.storage`, `pixelLeaks[]` | Non-compliance |
| UK-04 | "Accept all" and "Reject all" equally prominent | `consent.banner.symmetry`, `.rejectSameLayer` | Non-compliance if missing; High risk if disadvantaged |
| UK-05 | Non-exempt toggles off by default; no "by continuing"; no reliance on browser settings | manual: settings layer and banner text | Non-compliance |
| UK-06 | Legitimate-interest toggles mixed with consent toggles | manual: settings layer | Improvement |
| UK-07 | Granular by purpose; third parties identified | `consent.banner.settings`; manual | Non-compliance |
| UK-08 | Withdrawal as easy as consent; set technologies removed | `pages.links.cookieSettings`; manual: accept → reopen → reject → diff | Non-compliance |
| UK-09 | Analytics before consent fits the statistical exception: processor only, clear information, simple free objection toggle (on by default) that stops collection | category `analytics` in `consent.no-interaction.thirdPartyRequests[]`; manual: toggle off, then confirm no further requests | Non-compliance if no objection mechanism; High risk if the provider reuses data |
| UK-10 | Remote fonts: informed plus objection (appearance exception), or self-hosted | category `fonts` before consent; manual: policy text | Improvement if informed with objection; otherwise High risk |
| UK-11 | Google Consent Mode advanced | requests carrying `gcs=`/`gcd=` in `consent.no-interaction` / `consent.reject` | High risk unless it fits the statistical exception |
| UK-12 | Re-ask after refusal not sooner than about 6 months | manual: CMP config | Improvement |
| UK-13 | Privacy notice art. 13 items; ICO named | `policy.items.uk[]` (complaintAuthority = ICO) | Non-compliance per missing item |
| UK-14 | Notice explains how to complain to the controller (DUAA s.103) | manual: read the notice for a complaint route or form | High risk |
| UK-15 | Transfers: US vendors in the DPF UK Extension or another mechanism; no "Privacy Shield" | `policy.transfers.countriesNamed[]`, `policy.obsoleteRefs[]`; manual: dataprivacyframework.gov | Non-compliance for Privacy Shield; Improvement for fallback |
| UK-16 | Company disclosures: registered name, part of the UK registered in, company number, registered office; paid-up capital if capital is mentioned | `pages.identification.ids.companyNumberUK`, `.ids.ukRegisteredIn`, `.address`, `.shareCapital` | Non-compliance per missing item |
| UK-17 | E-Commerce Regs reg. 6: email, VAT number, register, authority/profession if applicable | `pages.identification.email`, `.ids.vatEU`; manual | Non-compliance per missing item |
| UK-18 | Obsolete "Companies (Trading Disclosures) Regulations 2008" reference | `pages.obsoleteRefs[]` | Improvement |
| UK-19 | Marketing: consent or soft opt-in (charities 22(3A)); refusal at collection and in every message | `pages.forms[].marketingCheckbox`, `.checkboxes[].preChecked`; manual: email templates | Non-compliance |
| UK-20 | Drip pricing: headline price includes all mandatory fees (DMCC s.230) | manual: product → checkout price diff | Non-compliance |
| UK-21 | Fake-review prevention steps; no false urgency or misleading "free" | `scope.signals.ugc`; manual: review widgets, timers, "free" claims | High risk |
| UK-22 | Consumer Contracts Regs 2013: pre-contract info, order button wording, 14-day cancellation | `pages.links.terms`; manual: checkout | Non-compliance |
| UK-23 | Accessibility: WCAG 2.2 AA as the reasonable-adjustments benchmark | manual: axe-core plus keyboard pass | Improvement |
| UK-24 | Children's code: service likely to be accessed by under-18s → high-privacy defaults, geolocation and profiling off, no nudges | `scope.signals.kidsTerms`; manual | Not assessable / High risk |

---

## Comparison — EU/EEA and UK

| Jurisdiction | Mere visibility triggers? | Cookie model | Officer / registration | Marketing email consent | Notice language rule |
|---|---|---|---|---|---|
| EU/EEA baseline | No: establishment, offering, or monitoring (analytics counts) | Opt-in (ePrivacy art. 5(3)); strictly necessary exempt | DPO contact if designated; art. 27 EU representative for non-EU controllers | Opt-in; soft opt-in for own similar products | None recorded beyond art. 12 clear and plain language |
| Spain | No: targeting needed | Opt-in (LSSI 22.2); Reject same layer/level; AEPD analytics exemption; consent ≤ 24 months | No website registration recorded; whistleblowing channel on home page at 50+ workers | Opt-in or soft opt-in (LSSI 21); separate checkbox | None recorded; first-layer notice at forms (LOPDGDD art. 11) |
| Germany | No | Opt-in (TDDDG §25); remote fonts high risk | Impressum (DDG §5); MStV responsible person for editorial content | Opt-in; double opt-in de facto (UWG §7) | None recorded |
| France | No (CNIL applies to non-EU sites targeting FR) | Opt-in (art. 82); CNIL audience-measurement exemption | Mentions légales incl. directeur de la publication and host | Opt-in (CPCE L.34-5) | English-only notice for a mainly French audience breached arts. 12–13 (CNIL, NS Cards 2023) |
| Italy | No | Opt-in (art. 122); "X" = refusal; 6-month re-prompt gap | P.IVA on home page (UNVERIFIED) | EU baseline | None recorded |
| Austria | No | Opt-in (TKG 2021 §165) | ECG §5, UGB §14, MedienG §25 (UNVERIFIED) | EU baseline | None recorded |
| Netherlands | No | Opt-in (Telecommunicatiewet 11.7a) | Not recorded | EU baseline | None recorded |
| United Kingdom | No: establishment, offering, or monitoring | Opt-in, plus statistical and appearance exceptions with a free objection toggle | UK representative (art. 27) for non-UK controllers | Consent or soft opt-in; charity soft opt-in (22(3A)) | None recorded |
