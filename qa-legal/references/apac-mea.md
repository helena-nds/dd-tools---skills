# Switzerland, Asia-Pacific, Middle East and Africa — legal reference for qa-legal

Covers website rules for Switzerland, Australia, New Zealand, Japan, South Korea, mainland China, Hong Kong, Singapore, Malaysia, Thailand, the Philippines, Vietnam, Indonesia, India, the UAE (federal, DIFC, ADGM), Saudi Arabia, Qatar, Israel, Türkiye, South Africa, Nigeria, Kenya and Egypt. Open it when the scope step of SKILL.md lists one of these regimes, either because the site targets that market or because the operator is established there. In this region a site that is merely visible in a country almost never triggers that country's law; the main exception is Saudi Arabia. Facts checked on 28–30 October 2026 against the linked sources. Items marked UNVERIFIED, and everything in 'Re-check before each audit', must be confirmed before you rely on them. "(secondary)" marks a law-firm, vendor or press source.

## How to use this file
- Open only the sections for regimes listed in the scope step of SKILL.md.
- Check IDs below are the ones to use in the report.
- **Decide target markets first.** Most regimes need *targeting* (offering goods or services to people there, or monitoring their behaviour), *carrying on business* there, or establishment there. Use `scope.hreflang[]`, `scope.pages[].htmlLang`, locale routes (`/ja/ /ko/ /zh/ /th/` …), `scope.signals.currencies[]` (CHF, A$, NZ$, ¥, ₩, RMB, S$, ₹, SAR, AED, ₺, R, ₦), `scope.signals.phonePrefixes[]` (+41 +61 +64 +81 +82 +86 +65 +91 +966 +971 +972 +90 +27 +234), `scope.signals.ccTLD`, `scope.signals.shippingCountries[]` and office addresses. Apply only those regimes plus the regime of the operator's home country.
- **Broad triggers:** Saudi Arabia's PDPL reaches any processing of data of people in the Kingdom. China's PIPL "analysing behaviour" limb may catch analytics that profile visitors in China.
- **Two cookie models:**
  - **Opt-in** (nothing non-essential before consent): Türkiye, Thailand, Vietnam; China for ads, profiling and transfers; India from 13 May 2027; Israel for direct marketing and sensitive data; Qatar for ad-targeting cookies (non-binding guidelines); Nigeria (secondary/vendor sources only, so report as High risk).
  - **Notice plus opt-out:** Switzerland (opt-in only for high-risk profiling or sensitive data), Australia, New Zealand, Japan, Korea for behavioural information (disclosure-based), Hong Kong, Singapore.
  - A banner built to the EU standard (Reject in the first layer, nothing fires before consent) satisfies both models. Recommend it as the global baseline.
- **Run consent-check once per target market,** e.g. `--locale=de-CH --tz=Europe/Zurich`, `ja-JP Asia/Tokyo`, `ko-KR Asia/Seoul`, `zh-CN Asia/Shanghai`, `en-AU Australia/Sydney`, `tr-TR Europe/Istanbul`, `he-IL Asia/Jerusalem`, `ar-SA Asia/Riyadh`. Then `policy-check.mjs --regimes=<codes> --consent=consent-<locale>.json`. Regime codes are the lowercase check prefixes (ch, au, jp, kr…). Where `policy.items.<code>[]` has no checklist, read the policy manually against the **Privacy notice** line.
- **Embeds (Google Fonts, YouTube, Maps, reCAPTCHA):** before consent under an opt-in regime → **High risk**. Under opt-out regimes → disclose as a recipient and a US transfer → **Improvement**.
- **US processors** are acceptable almost everywhere if disclosed. The policy must name recipient countries in Switzerland, Australia ("if practicable"), Korea, China, Japan (information on the foreign system) and Türkiye. China and Japan also need consent for foreign provision unless an exemption or equivalence basis applies.
- **E-commerce imprint rules** exist in Switzerland (UWG), Japan (特定商取引法) and Korea (전자상거래법 art. 10). If the site sells, these are hard failures.
- **Private-site accessibility** is enforceable today in Israel (IS 5568, statutory damages); it is a discrimination risk in Australia (DDA).
- Missing turnover or employee data → **Not assessable** for the AU small business exemption, PH registration, KR representative, NG/KE registration and the IL accessibility exemption. Ask.
- Find the hosting location (DNS → IP geolocation). Only mainland-China hosting triggers the ICP checks.

## Re-check before each audit
1. **Australia:** Children's Online Privacy Code registration (due 10 Dec 2026); ADM disclosure duty from 10 Dec 2026; Tranche 2 bill introduction; Unfair Trading Practices Act assent and the 1 July 2027 start. https://www.oaic.gov.au/privacy/privacy-registers/privacy-codes/childrens-online-privacy-code · https://www.russellkennedy.com.au/insights-events/insights/privacy-reform-tranche-2-arrives-major-changes-proposed-key-reforms-still-missing · https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/bd/bd2526/26bd058
2. **India:** whether MeitY gazetted the proposal to bring dates forward to 13 Nov 2026 (reportedly only for obligations of Significant Data Fiduciaries, not all duties; secondary; not gazetted as of 30 Oct 2026); consent manager registration from 13 Nov 2026. https://chambers.com/articles/meity-plans-to-cut-short-dpdp-compliance-timeline-and-notify-cross-border-restrictions-for-sdfs · https://consentos.in/learn/dpdp-rules-notification-status/
3. **Japan:** Cabinet Order fixing commencement of the 2026 APPI amendment. https://www.ppc.go.jp/personalinfo/legal/r8kaiseihogohou/
4. **Egypt:** any extension announced after the grace period expired on 31 Oct 2026 (enforceable from 1 Nov 2026); procedures and fees on the electronic licensing portal (launched October 2026). https://www.bakermckenzie.com/en/insight/publications/2026/10/egypt-personal-data-protection-law-update · https://cms.law/en/are/legal-updates/egypt-s-pdpl-executive-regulations-issued-one-year-compliance-countdown-begins · https://www.mondaq.com/privacy-protection/1786854/egypt-personal-data-protection-law-new-compliance-developments
5. **UAE federal:** PDPL Executive Regulations and the supervisory authority (no primary confirmation yet). https://business-ciso.com/blog/uae-pdpl-executive-regulations-status · https://www.businessdubai.ae/blogs/uae-pdpl-data-protection
6. **Nigeria:** the GAID primary text (cookie-consent article, DPO duty for non-DCPMIs, registration fees, the ₦2M / 2% figure, direct marketing, NDPA s 2 wording). https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf · https://services.ndpc.gov.ng/
7. **Indonesia:** PDP Agency operational status; GR 33/2026 in force 16 Jan 2027. https://teknologi.bisnis.com/read/20260913/84/2003698/pembentukan-badan-pdp-dipercepat-implementasi-uu-pdp-dinilai-belum-efektif
8. **Switzerland:** FDPIC cookie guide version (v1.1 of 6 Oct 2025); Swiss-US DPF status, which follows the EU appeal C-703/25 P. https://www.edoeb.admin.ch/en/guidelines-on-data-processing-using-cookies · https://www.admin.ch/en/nsb?id=102054
9. **Hong Kong:** any PDPO amendment bill. https://uppersetup.com/en/blog/pdpo-cap-486-in-2026-the-reform-that-never-came-and
10. **Thailand:** s 5, s 37(5) and the PDPC cookie guideline (all UNVERIFIED).
11. **Kenya:** s 4 extraterritorial wording; cookie content of the ODPC Guidance Notes on Consent. https://www.odpc.go.ke/
12. **Qatar, DIFC, ADGM:** NCSA PDPPL Guidelines text; any DIFC/ADGM cookie guidance; ADGM mandatory-DPO list and maximum fine.

---

## Switzerland
**Applies when:** the revised FADP (in force since 1 Sept 2023, UNVERIFIED date; well established) art. 3(1) covers matters "that have an effect in Switzerland, even if they occurred abroad". Accessibility of a site alone is not enough. Assessment is case by case: offering goods or services to people in CH, processing their data.
**Privacy notice:** art. 19 minimum:
- identity and contact details of the controller;
- purposes;
- recipients or categories of recipients;
- for transfers abroad, the **state** and the safeguard or exception used.
- Give it actively, in layers, at collection and before any consent choice (FDPIC cookie guide §3.3.1). No statutory language requirement (UNVERIFIED); use the language of the site.
**Cookies and tracking:**
- **TCA art. 45c:** tell users about the processing, its purpose and that they can refuse. This makes **opt-out mandatory** for non-essential cookies. Fines up to **CHF 5,000** (guide fn. 5).
- **FDPIC Guidelines on cookies and similar technologies** (v1.0 of 22 Jan 2025; **v1.1 of 6 Oct 2025**). Not binding, but they set out FDPIC enforcement practice:
  - strictly necessary cookies need neither consent nor opt-out;
  - most non-essential cookies need opt-out only;
  - **opt-in** for sensitive data, high-risk profiling, and highly intrusive or unexpected processing. Cross-site tracking across many sites or long periods, or enrichment with third-party data, is presumed high risk (§3.10–3.11.3);
  - analytics can rest on overriding interest if anonymised immediately and processed only on the operator's behalf (§3.8.2);
  - accept-only dialogues are not valid consent; refusing must take a few clicks and be clearly shown; dark patterns can invalidate consent; withdrawal as easy as consent; scripts should not activate before consent (two-click solution) (§3.9, 3.12, 3.13);
  - the operator is jointly responsible for embedded third parties (§3.2.2).
- Practical reading: Meta, LinkedIn or TikTok pixels with cross-site profiling → treat as opt-in. GA4 → at least prominent opt-out; opt-in if Google Signals or ads features are on.
**Forms and marketing:** UWG art. 3(1)(o): prior consent for mass e-mail advertising, correct sender identification and a free unsubscribe, with an existing-customer exception (UNVERIFIED text).
**Identification / imprint:** UWG art. 3(1)(s): anyone offering goods, works or services electronically must give clear and complete information on identity, a contact address and an e-mail address. Not for voice telephony or contracts made purely by individual e-mail. In practice the full imprint (company name as registered, street address, e-mail) is expected on every commercial site.
**Selling online:** same article: explain the technical steps to contract, provide means to correct input errors before ordering, confirm the order electronically without delay.
**Accessibility:** BehiG/LHand bars private service providers from discrimination but sets no web standard for private sites (UNVERIFIED).
**Transfers:** the US (for **certified** companies under the Swiss-US DPF) is on the adequacy list since 14 Aug 2024, in force **15 Sept 2024**. Non-certified US vendors: SCCs (UNVERIFIED detail). The policy must name the state(s) and the safeguard.
**Officer, representative, registration:** art. 14 Swiss representative for a foreign private controller only if **all** apply: (a) processing linked to offering goods or services to, or monitoring, people in CH; (b) large-scale; (c) regular; (d) high risk. The **representative's name and address must be published**, e.g. in the privacy policy (art. 14(3)). Notifying the FDPIC is voluntary. A small studio is normally out of scope.
**Children:** no fixed age in the FADP (UNVERIFIED).
**Penalties and enforcement:** criminal fines up to **CHF 250,000 on the responsible natural person**, e.g. intentional breach of the duty to inform or ignoring an FDPIC order (Bär & Karrer, secondary). TCA art. 45c: up to CHF 5,000.
**Pending changes:** Swiss-US DPF status follows the EU appeal C-703/25 P.
**Sources:** https://baerkarrer.ch/en/data-protection/a-is-the-fadp-also-applicable (secondary) · https://edoeb.admin.ch/en/representatives-in-accordance-with-article-14-fadp · https://justement.ch/en/doc/act/ch/235_1/chap_2/sec_2/art_14 · https://www.edoeb.admin.ch/en/guidelines-on-data-processing-using-cookies · [FDPIC guide v1.1 PDF](https://www.edoeb.admin.ch/dam/en/sd-web/brLL9rM3ny9d/Leitfaden%20des%20ED%C3%96B%20betreffend%20Datenbearbeitungen%20mittels%20Cookies%20und%20%C3%A4hnlichen%20Technologien%20V.%201.1%20vom%2006.10.2025_EN.pdf) · https://www.admin.ch/en/nsb?id=102054 · https://www.seco.admin.ch/de/onlinehandel

### Checks — Switzerland
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| CH-01 | Switzerland targeted (CHF, +41, .ch, de-CH/fr-CH/it-CH, Swiss address) or operator in CH | `scope.signals.currencies[]`, `.phonePrefixes[]`, `.ccTLD`, `scope.hreflang[]`; manual: ask | Not assessable if unclear |
| CH-02 | Policy gives controller identity and contact, purposes, recipients | `policy.items.ch[]`; manual: read policy | Non-compliance |
| CH-03 | Policy names each transfer state and the safeguard ("USA – Swiss-US DPF certified" or "SCC"); DPF certification real | `policy.transfers.countriesNamed[]`, `policy.vendors.detected[]`; manual: dataprivacyframework.gov | Non-compliance |
| CH-04 | Non-essential cookies (e.g. GA4) run with no visible banner or opt-out mechanism | `consent.no-interaction.banner.found`, `consent.no-interaction.thirdPartyRequests` (analytics) | Non-compliance (TCA art. 45c) |
| CH-05 | Meta, LinkedIn, TikTok or Google Ads remarketing tags fire before consent or after Reject | `consent.no-interaction.thirdPartyRequests`, `consent.reject.thirdPartyRequests` (ads, social) | High risk (presumed high-risk profiling → opt-in) |
| CH-06 | Where consent is used: Reject present and visible (no accept-only dialogue); no pre-ticked purposes | `consent.*.banner.symmetry`, `banner.reject`; manual: second layer toggles | Non-compliance where consent is needed |
| CH-07 | Persistent "cookie settings" link to withdraw | `pages.links.cookieSettings` | Non-compliance |
| CH-08 | YouTube, Maps, Fonts, reCAPTCHA disclosed as recipients and US transfer; two-click embeds | `consent.no-interaction.thirdPartyIframes[]`, `thirdPartyRequests` (video, maps, fonts, captcha); `policy.vendors.missingFromPolicy[]` | Improvement |
| CH-09 | Imprint: registered company name, street address, e-mail | `pages.identification.address`, `.email`, `pages.links.imprint` | Non-compliance if the site sells, quotes prices or takes orders; else Improvement |
| CH-10 | Order steps explained, correction before submit, electronic order confirmation | manual: walk the checkout; ask for confirmation e-mail | Non-compliance if selling |
| CH-11 | Newsletter: unticked opt-in, sender identified, free unsubscribe | `pages.forms[].marketingCheckbox`, `.checkboxes[].preChecked`; manual: e-mail template | Non-compliance (UWG 3(1)(o), text UNVERIFIED) |
| CH-12 | Art. 14 representative named with address when all four criteria are met | manual: ask volume and risk | Not assessable |
| CH-13 | No "Swiss-US Privacy Shield" or "Privacy Shield" as transfer basis | `policy.obsoleteRefs[]`, `pages.obsoleteRefs[]` | Non-compliance |
| CH-14 | WCAG gaps | manual: axe-core run | Improvement |

## Australia
**Applies when:** a foreign organisation has an "Australian link" if it **carries on business in Australia** (s 5B(3)(b)). Since 13 Dec 2022 data no longer has to be collected or held in Australia. OAIC factors: the site offers goods or services to Australia, Australia appears in country drop-downs, orders are handled in AU, AU trademarks. An entity generally does **not** carry on business in AU **solely** because its site can be accessed or orders placed from AU.
- **Small business exemption (still in force):** annual turnover ≤ **A$3M** is exempt. A business that exceeded A$3M in any year since 2002 stays covered. Covered regardless of turnover if it provides health services, trades in personal information, is a Commonwealth contractor, is related to a covered body corporate, or has opted in, among other cases. Ask turnover. Under A$3M a privacy policy is still best practice and often required by platforms.
- The **statutory tort for serious invasions of privacy** (from **10 June 2025**: intrusion upon seclusion, misuse of information) applies to anyone, so the exemption does not help.
**Privacy notice:** APP 1.4 policy covers:
- kinds of personal information collected and held;
- how it is collected and held;
- purposes;
- how to access and correct it;
- how to complain and how complaints are handled;
- whether it is likely to be disclosed overseas and, if practicable, **the countries**.
- Free, in an appropriate form, generally **on the website** (APP 1.5).
- **Automated decisions (APP 1.7–1.9), from 10 Dec 2026:** if a computer program makes, or substantially and directly contributes to, decisions that could significantly affect individuals, state the kinds of personal information used and the kinds of decisions. OAIC final guidance and APP 1 Guidelines v2.0 published 30 Sept 2026. Flag only for automated lead scoring, credit or eligibility checks.
**Cookies and tracking:** no cookie-specific consent rule. The APP 5 collection notice and APP 1 policy apply if cookies or pixels collect personal information. OAIC tracking-pixel guidance exists (UNVERIFIED).
**Forms and marketing:** Spam Act 2003: consent (express or inferred), sender identification, functional unsubscribe (UNVERIFIED section numbers). Telstra paid **A$626,000** after an unsubscribe that required personal details and messages sent without consent (MR 04/2025).
**Selling online:** Competition and Consumer Amendment (Unfair Trading Practices) Bill 2026, introduced 1 Apr 2026, reportedly passed (secondary). Commencement **1 July 2027**:
- general ban on manipulative or decision-distorting conduct (dark patterns);
- **drip pricing:** mandatory transaction-based fees shown alongside the base price;
- subscription-trap rules;
- penalties up to the greater of A$100M, 3× the benefit or 30% of turnover.
**Accessibility:** DDA 1992 s 24 (goods and services) applies to private websites. AHRC Advisory Notes point to WCAG; complaint-based (UNVERIFIED content).
**Transfers:** disclose overseas disclosure and, if practicable, countries (APP 1.4).
**Officer, representative, registration:** none (no DPO duty).
**Children:**
- **Children's Online Privacy Code:** draft consulted 31 Mar–5 Jun 2026; must be registered by **10 Dec 2026**; not registered as of the OAIC page update of 5 Aug 2026. Applies to APP entities providing social media, "relevant electronic" or "designated internet" services (Online Safety Act definitions) likely to be accessed by children. A studio site is probably out of scope unless aimed at children.
- **Social media minimum age (16)** from **10 Dec 2025**: only age-restricted social media platforms. Not relevant to a corporate site without user posting.
**Penalties and enforcement:** POLA Act 2024 (Royal Assent 10 Dec 2024): serious interference up to A$50M, 3× the benefit or 30% of adjusted turnover; mid-tier up to A$3.3M; low tier up to A$330k. OAIC **infringement notices**, e.g. for a policy not meeting APP 1.4: A$19,800 per contravention (body corporate), A$66,000 (listed company) (JWS, secondary).
**Pending changes:** **Tranche 2** (Privacy Amendment (Personal Data Protection) Bill 2026; exposure draft 31 Aug 2026; submissions closed 18 Sept 2026; not introduced) does **not** remove the exemption. It proposes a "fair and reasonable" test, consent for sensitive data and trading, a 72-hour breach notice, and erasure only for large platforms (Russell Kennedy, secondary). Also: ADM disclosure 10 Dec 2026, Children's Code 10 Dec 2026, UTP rules 1 July 2027 (above).
**Sources:** https://www.oaic.gov.au/__data/assets/pdf_file/0016/40705/Chapter-B-v1.4-December-2022.pdf · https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/small-business · https://www.russellkennedy.com.au/insights-events/insights/privacy-reform-tranche-2-arrives-major-changes-proposed-key-reforms-still-missing (secondary) · https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-1-app-1-open-and-transparent-management-of-personal-information · https://www.allens.com.au/insights-news/insights/2026/10/mandatory-automated-decision-making-disclosure-requirements-are-coming-key-takeaways-from-the-oaic-guidance/ (secondary) · https://jws.com.au/what-we-think/changes-to-australian-privacy-laws-now-in-force/ (secondary) · https://www.oaic.gov.au/privacy/your-privacy-rights/more-privacy-rights/statutory-tort-for-serious-invasions-of-privacy · https://www.oaic.gov.au/privacy/privacy-registers/privacy-codes/childrens-online-privacy-code · https://ministers.ag.gov.au/media-centre/draft-childrens-online-privacy-code-released-31-03-2026 · https://www.esafety.gov.au/node/2109 · https://www.acma.gov.au/articles/2025-03/telstra-penalised-spam-breaches · https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/bd/bd2526/26bd058 · https://mccullough.com.au/2026/07/03/unfair-trading-practices-laws-australia-2027/ (secondary) · https://www.humanrights.gov.au/our-work/disability-rights/world-wide-web-access-disability-discrimination-act-advisory-notes

### Checks — Australia
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| AU-01 | Carries on business in AU and is covered (turnover > A$3M, or an exception applies) | `scope.signals.currencies[]`, `.shippingCountries[]`, `.phonePrefixes[]`, `pages.identification.ids.abnAU`; manual: ask turnover | Not assessable |
| AU-02 | Privacy policy on the website with all APP 1.4 items | `pages.links.privacy`, `policy.items.au[]` | Non-compliance if covered; Improvement if exempt |
| AU-03 | Policy says whether data goes overseas; names countries | `policy.items.au[]`, `policy.transfers.countriesNamed[]` vs `policy.vendors.detected[]` | Statement missing: Non-compliance if covered; countries missing: High risk |
| AU-04 | ADM section (kinds of information, kinds of decisions) if automated decisions are used | manual: ask about lead scoring, eligibility or credit checks | Non-compliance from 10 Dec 2026 if ADM used; Improvement before |
| AU-05 | Every pixel and tag disclosed in the policy | `policy.vendors.missingFromPolicy[]` | High risk |
| AU-06 | Newsletter consent not pre-ticked or bundled | `pages.forms[].marketingCheckbox`, `.checkboxes[].preChecked` | Non-compliance (Spam Act applies regardless of the exemption) |
| AU-07 | Marketing e-mails identify the sender and have a functional unsubscribe that asks for no personal details | manual: e-mail template in repo or sample | Non-compliance |
| AU-08 | Checkout shows mandatory transaction fees alongside the headline price; no manipulative patterns or subscription traps | manual: walk the checkout | Improvement before 1 July 2027; Non-compliance after |
| AU-09 | WCAG 2.x AA gaps | manual: axe-core run | High risk (DDA complaints) |
| AU-10 | Site aimed at children and an in-scope online service | `scope.signals.kidsTerms`, `.ugc`; manual | Not assessable (watch the Children's Code) |

## New Zealand
**Applies when:** s 4(1)(b) covers an overseas agency for actions "in the course of carrying on business in New Zealand". It need not have a place of business in NZ, receive payment or intend to profit (s 4(3)).
**Privacy notice:** IPP 3, reasonable steps before collection, telling the person:
- that information is being collected;
- the purpose;
- intended recipients;
- name and address of the collecting and holding agencies;
- whether supply is voluntary or mandatory, and the consequences of not supplying;
- rights of access and correction.
- **IPP 3A (indirect collection)** from **1 May 2026** (Privacy Amendment Act 2025): for information collected from someone other than the individual (lead lists, referrals, LinkedIn scraping). Notice as soon as reasonably practicable after collection. Exceptions include publicly available information and cases where the original collector already told the person. Not for information collected before 1 May 2026 (s 25A). OPC guidance (UNVERIFIED): https://www.privacy.org.nz/assets/DOCUMENTS/251104-IPP3A-guidance-A1128460.pdf
**Cookies and tracking:** no specific rule; IPP 3 applies.
**Forms and marketing:** Unsolicited Electronic Messages Act 2007:
- consent express, inferred, or deemed (business address published without a no-spam statement, message relevant to the role) (s 4);
- unsubscribe takes effect within 5 working days (s 9);
- accurate sender identification with contact details valid for 30 days (s 10);
- functional, free unsubscribe in the same medium (s 11).
**Transfers:** IPP 12: disclosure abroad allowed if the recipient is subject to the NZ Act (carrying on business in NZ), comparable laws, a prescribed binding scheme or a prescribed country, or comparable safeguards by agreement. Otherwise the individual must authorise it after being told protection may be weaker.
**Officer, representative, registration:** privacy officer required by s 201 (UNVERIFIED).
**Penalties and enforcement:** s 212 offence fine up to NZ$10,000 (UNVERIFIED). UEMA maximum for organisations NZ$500,000 (s 45).
**Sources:** https://legislation.govt.nz/act/public/2020/31/en/latest/ · https://www.justice.govt.nz/about/news-and-media/news/new-privacy-information-principle-in/ · https://www.legislation.govt.nz/act/public/2007/7/en/latest/

### Checks — New Zealand
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| NZ-01 | Carrying on business in NZ (NZ$, +64, .nz, NZ clients) | `scope.signals.*`; manual: ask | Not assessable if unclear |
| NZ-02 | IPP 3 items in the policy and near forms | `policy.items.nz[]`, `pages.forms[].noticeNearby` | Non-compliance |
| NZ-03 | Indirect lead sourcing has an IPP 3A notice process | manual: ask about lead lists, referrals, scraping | High risk if absent |
| NZ-04 | Overseas disclosures and their IPP 12 basis stated | `policy.transfers.countriesNamed[]` | Improvement |
| NZ-05 | Every pixel and tag disclosed in the policy | `policy.vendors.missingFromPolicy[]` | High risk |
| NZ-06 | Newsletter consent not pre-ticked or bundled | `pages.forms[].marketingCheckbox`, `.checkboxes[].preChecked` | Non-compliance |
| NZ-07 | Marketing e-mails: accurate sender, contact valid 30 days, free unsubscribe honoured within 5 working days | manual: e-mail template | Non-compliance |
| NZ-08 | Privacy officer contact given | `policy.items.nz[]`; manual | Improvement (s 201 UNVERIFIED) |

## Japan
**Applies when:** APPI (個人情報保護法) art. 171 applies to handling personal information of persons in Japan in connection with supplying goods or services (UNVERIFIED text).
**Privacy notice:**
- **Purpose (art. 21):** promptly notify or publish it. For direct collection in writing (including web forms), state the purpose clearly in advance.
- **Publication (art. 32):** business name and address (and representative), purposes of retained personal data, procedures for requests, plus Cabinet Order matters: security control measures and complaint contact (UNVERIFIED detail of the order).
**Cookies and tracking:**
- **Personally referable information (art. 31; cookie IDs etc.):** do not give it to a recipient that will link it to personal data unless you confirm the person consented. Relevant for Meta/LinkedIn pixels that match IDs to accounts.
- **External transmission rule (外部送信規律, Telecommunications Business Act), in force 16 June 2023:**
  - Covered: browser or app telecommunications services (messaging, SNS, search, online information services such as news or aggregator sites) that make the user's terminal send user information to third parties.
  - **Not covered:** online sales of one's own products and corporate or personal homepages. A studio's corporate or portfolio site is generally **out of scope**. Check MIC's flowchart if the site runs a blog or news service for others or a platform.
  - If covered: before sending, notify or make easily knowable (1) what is sent, (2) who receives it, (3) the purpose. Plain Japanese, readable size, same page or one link away.
  - Exempt: information necessary for the service, first-party IDs, information covered by an opt-out the user has not exercised.
  - Recommend a 外部送信 disclosure table for any JP-targeted site (low cost).
**Forms and marketing:** Specified Electronic Mail Act (特定電子メール法):
- **opt-in**, sender clearly identified at consent time; buried consent is invalid; unticked boxes recommended, pre-ticked discouraged;
- keep **records of consent**;
- each e-mail shows the sender's full legal name, an opt-out address or URL with a statement that opt-out is possible, postal address, and a complaints contact;
- exceptions: address given in writing, existing business relationship, publicly posted business address.
**Identification / imprint:** art. 32 items above. Sellers also need the 特商法 page below.
**Selling online:** Act on Specified Commercial Transactions (特定商取引法), mail-order:
- **Ads (art. 11):** price including shipping; other charges; payment timing and method; delivery timing; cancellation and returns terms (返品特約); business name, address and phone; for corporations the representative or person responsible; for foreign businesses with a domestic office its address and phone; liability for non-conformity; software operating environment; subscription conditions; e-mail address (for e-mail ads). Some items may be omitted if provided promptly on request.
- **Final confirmation screen (art. 12-6):** quantity, price incl. shipping, payment, delivery timing, application period, cancellation terms. Misleading or omitted items allow cancellation (art. 15-4).
- Usual implementation: a page 「特定商取引法に基づく表記」 linked in the footer.
**Accessibility:** the amended Act for Eliminating Discrimination against Persons with Disabilities made **reasonable accommodation mandatory for private businesses from 1 Apr 2024**. Web accessibility (環境の整備) stays a **best-effort** duty (JIS X 8341-3) (secondary).
**Transfers:**
- **Third-party provision (art. 27):** prior consent; opt-out possible with a PPC filing except for sensitive data. Processors (entrusted processing) are not third-party provision.
- **Foreign provision (art. 28):** consent, after informing the person about the foreign country's data protection system and the recipient's measures. Not needed if the country is PPC-recognised (EU/UK) or the recipient has a system meeting PPC standards (e.g. a contract); then keep the system running and provide information on request.
**Children:** under-16 parental consent comes with the 2026 amendment (not yet in force).
**Penalties and enforcement:** Specified E-mail Act penalty amounts UNVERIFIED. Administrative surcharges (課徴金) come with the 2026 amendment.
**Pending changes:** APPI amendment enacted **10 July 2026**, promulgated **17 July 2026**: surcharges; parental consent for **under-16s**; relaxed consent for AI and statistics; breach-notice relief. In force by Cabinet Order within 2 years (by about July 2028); rules still being drafted Aug–Oct 2026.
**Sources:** https://www.japaneselawtranslation.go.jp/ja/laws/view/4241/en · https://www.ppc.go.jp/personalinfo/legal/r8kaiseihogohou/ · https://www.josis365.com/blog/privacy-law-amendment-2026-lower-house-passage/ (secondary) · https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu.html · https://www.shouhiseikatu.metro.tokyo.lg.jp/center/kyoiku/web/kou05/assets/data/kaisetsu_4.pdf · https://www.soumu.go.jp/main_content/000127185.pdf · https://www.businesslawyers.jp/articles/1361 (secondary)

### Checks — Japan
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| JP-01 | Japan targeted (ja, ¥/JPY, +81, .jp, JP shipping) | `scope.hreflang[]`, `scope.pages[].htmlLang`, `scope.signals.*` | Not assessable if unclear |
| JP-02 | Policy publishes art. 32 items: name, address, representative, purposes, request procedure, security measures, complaints contact | `policy.items.jp[]`; manual | Non-compliance |
| JP-03 | Purpose stated at each form before submission (art. 21) | `pages.forms[].noticeNearby.purpose`, `.privacyLink` | Non-compliance |
| JP-04 | US/foreign vendors: art. 28 consent with foreign-system information, or a contract basis stated | `policy.transfers.countriesNamed[]`, `policy.vendors.detected[]` | High risk |
| JP-05 | Meta/LinkedIn pixels (ID matching) disclosed; art. 31 consent confirmed | `consent.no-interaction.thirdPartyRequests` (ads, social), `policy.vendors.missingFromPolicy[]` | High risk |
| JP-06 | 外部送信 disclosure (data, recipient, purpose) on the page or one link away | manual: search site for 外部送信; decide if the site is an online information service | Non-compliance if a covered service; else Improvement |
| JP-07 | Newsletter: unticked opt-in naming the sender | `pages.forms[].marketingCheckbox`, `.checkboxes[].preChecked`, `.label` | Non-compliance |
| JP-08 | Consent records kept (timestamp, double opt-in) | manual: grep form handlers / ESP settings | Non-compliance if no record; Improvement if records but no double opt-in |
| JP-09 | Marketing e-mail: full legal name, opt-out link and statement, postal address, complaints contact | manual: e-mail template | Non-compliance |
| JP-10 | 「特定商取引法に基づく表記」 page with all art. 11 items | `pages.links.commerceDisclosure`; manual: read page | Non-compliance if selling |
| JP-11 | Final confirmation screen with quantity, total incl. shipping, payment, delivery, period, cancellation | manual: walk the checkout | Non-compliance if selling |
| JP-12 | JIS X 8341-3 / WCAG gaps | manual: axe-core run | Improvement (unless a user asked for accommodation) |

## South Korea
**Applies when:** PIPC Guidelines of **4 Apr 2024** on foreign operators give three triggers: goods or services provided to data subjects in Korea, judged holistically (Korean language, KRW, .kr domain); processing with a direct and substantial impact on Koreans; a Korean local entity processes data (Baker McKenzie, secondary).
**Privacy notice:** 개인정보 처리방침 (PIPA art. 30), mandatory and published on the website. Foreign operators must include the overseas country and recipient name. Korean for Korean users (UNVERIFIED as a legal mandate). Often shown in **bold or a distinct colour** in the footer by PIPC practice (UNVERIFIED). Typical items:
- purposes; items collected; retention;
- third-party provision; entrustment (위탁, processors);
- overseas transfer (country, recipient, timing, method, items);
- destruction; rights; safety measures;
- privacy officer (개인정보 보호책임자) contact;
- automatic collection devices (cookies) and how to refuse.
- 2023 amendments: consent no longer needed where processing is necessary for a contract (UNVERIFIED).
**Cookies and tracking:** behavioural information (행태정보) for customised ads (PIPC, 31 Jan 2024):
- from Mar 2024, **disclose in the privacy policy** any third-party collection tools (pixels, SDKs) placed for ad purposes;
- no ad tracking on services mainly used by **under-14s**; combining behavioural information with identifiers for under-14s needs guardian consent.
- Practical model: disclosure plus opt-out for non-identified behavioural data; consent where identified.
**Forms and marketing:** Information and Communications Network Act art. 50:
- explicit prior opt-in for advertising messages;
- vague labels such as "benefit alerts" (혜택 알림) or "information provision" are not valid consent;
- easy app-push opt-out (KISA / Korea Media and Communications Commission spam guide revised 4 Mar 2026).
- `(광고)` subject prefix, sender information, free opt-out, separate consent for 21:00–08:00 sending, 2-yearly reconfirmation of consent: UNVERIFIED (long-standing rules).
**Identification / imprint:** E-commerce Act art. 10 (cyber mall operators), **on the initial screen**: company name, representative, address (including complaints address), phone, e-mail, business registration number, **hosting provider name** (Decree), **mail-order business report number** (UNVERIFIED in source), and a **link to the KFTC business-information page**. Terms of use may sit on a linked page.
**Selling online:** art. 10 above applies to any online shop. KFTC decision 2019전자0694 (22 Oct 2020) fined KRW 6M.
**Accessibility:** the Disability Discrimination Act requires web accessibility of legal entities (UNVERIFIED).
**Transfers:** list country, recipient, timing, method and items in the policy.
**Officer, representative, registration:** privacy officer contact in the policy. Domestic representative only for large overseas operators (thresholds such as total revenue ≥ KRW 1 trillion or ≥ 1M daily Korean users: UNVERIFIED). Since **2 Oct 2025** the representative must be a Korean-established company or a Korean company under dominant influence. Not relevant to a small studio.
**Children:** under 14 needs legal guardian consent (PIPA art. 22-2; UNVERIFIED article number).
**Penalties and enforcement:** penalty surcharges up to 3% of total revenue (UNVERIFIED). KRW 6M KFTC fine above.
**Sources:** https://connectontech.bakermckenzie.com/south-korea-issues-guidelines-on-applying-the-personal-information-protection-act-to-foreign-business-operators/ (secondary) · https://byline.network/2025/09/16-554/ (secondary) · https://zdnet.co.kr/view/?no=20240131084835 (press) · http://www.boannews.com/news/articleView.html?idxno=142460 (press) · https://www.law.go.kr/LSW/ftcInfoP.do?ftcSeq=763

### Checks — South Korea
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| KR-01 | Korea targeted (ko, KRW/₩, +82, .kr) | `scope.hreflang[]`, `scope.signals.*` | Not assessable if unclear |
| KR-02 | Korean-language 개인정보 처리방침 linked in the footer | `pages.links.privacy`, `policy.lang` | Non-compliance |
| KR-03 | Footer link in bold or distinct colour | manual: inspect footer | Improvement (UNVERIFIED practice) |
| KR-04 | Policy covers 위탁 (processors), overseas transfer (country, recipient, items, method, timing), 개인정보 보호책임자 contact, cookies and how to refuse | `policy.items.kr[]`, `policy.transfers.countriesNamed[]` | Non-compliance |
| KR-05 | Every third-party ad pixel or SDK listed in the behavioural-information section | `policy.vendors.missingFromPolicy[]` vs `consent.accept.thirdPartyRequests` (ads, social) | Non-compliance |
| KR-06 | No ad pixels on pages aimed at children | `scope.signals.kidsTerms`, `consent.*.thirdPartyRequests` (ads) | Non-compliance |
| KR-07 | Separate, optional, unticked "광고성 정보 수신 동의"; no vague "혜택 알림" wording | `pages.forms[].marketingCheckbox`, `.checkboxes[].label`, `.preChecked` | Non-compliance |
| KR-08 | Marketing e-mail: `(광고)` prefix, sender information, free opt-out | manual: e-mail template | Non-compliance (prefix rule UNVERIFIED) |
| KR-09 | Initial screen shows name, representative, address, phone, e-mail, business registration number, mail-order report number, hosting provider | `pages.identification.*`, `.ids.businessRegKR`, `.hostingProvider` | Non-compliance if selling |
| KR-10 | Link to the KFTC business-information page | manual: footer links | Non-compliance if selling |
| KR-11 | Accessibility gaps | manual: axe-core run | High risk (legal basis UNVERIFIED) |
| KR-12 | Domestic representative | manual: ask revenue and Korean user numbers | Not assessable |

## China (mainland)
**Applies when:** PIPL art. 3 covers processing in China, and processing abroad for **providing products or services to persons in China** or **analysing or evaluating their behaviour**. A foreign site merely accessible from China is outside scope unless it targets China. Risk: behavioural analytics or ad pixels aimed at Chinese visitors could be read as "analysing behaviour".
**Privacy notice:**
- art. 17: name and contact, purposes, methods, data types, retention, how to exercise rights; rules easy to access and save.
- Network Data Security Management Regulations (from 1 Jan 2025): rules clear and prominent, listing name and contact, purposes, methods, types, sensitive data, retention and disposal, how to exercise rights. Also apply to processing abroad that offers products or services to people in China (China Briefing, secondary).
**Cookies and tracking:** consent (art. 14) must be informed, voluntary and explicit. Treat ads and profiling tags as opt-in. **Separate consent** for:
- sensitive personal information (art. 29);
- **cross-border provision** (art. 39);
- provision to other processors and public disclosure (UNVERIFIED article numbers).
**Forms and marketing:** separate consent for marketing (specifics UNVERIFIED).
**Identification / imprint:** **ICP filing (备案)** is required **before going live** for sites hosted on mainland-China servers; not for Hong Kong or overseas hosting. Show the **ICP number in the footer, linked to beian.miit.gov.cn**. Public-security filing (公安备案) within 30 days, with its icon and link (Alibaba Cloud documentation, secondary). Look for `京ICP备…` / `beian.miit.gov.cn` only if the host IP is in mainland China. Vercel or Netlify outside China do not need it.
**Accessibility:** Barrier-free Environment Construction Law, effective 1 Sept 2023 (UNVERIFIED application to private sites).
**Transfers:**
- art. 39 notice: recipient name and contact, purpose, method, types, how to exercise rights against the recipient; plus separate consent.
- Provisions on Promoting and Regulating Cross-Border Data Flows (from **22 Mar 2024**). Exempt from security assessment, standard contract and certification: transfers necessary to conclude or perform a contract with the individual (cross-border shopping, payment, booking); HR; emergencies; non-CIIOs sending fewer than **100,000** individuals' non-sensitive data per year. Standard contract or certification: 100k–1M non-sensitive, or fewer than 10k sensitive. CAC security assessment: more than 1M non-sensitive or more than 10k sensitive.
- The art. 39 notice and separate consent still apply where filing is exempt.
- Certification route: Measures for Personal Information Outbound Certification (CAC + SAMR), issued Oct 2025, effective **1 Jan 2026**; certificates last 3 years.
**Officer, representative, registration:** processors caught by art. 3(2) must set up a dedicated entity or appoint a **representative in China** and report name and contact (art. 53). Compliance audit Measures (from **1 May 2025**): processors handling more than 10M individuals audit at least every 2 years; regulators can order audits.
**Children:** all data of under-14s is sensitive; parent consent and dedicated rules (arts. 28, 31).
**AI and other:** Cybersecurity Law amendment adopted 28 Oct 2025, effective **1 Jan 2026**: higher fines, AI provisions, alignment with PIPL.
**Penalties and enforcement:** art. 66: up to RMB 1M (uncorrected); serious cases up to **RMB 50M or 5% of prior-year turnover**, plus suspension and personal liability.
**Sources:** https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm · https://www.chinalawtranslate.com/en/Provisions-on-Promoting-and-Regulating-the-Cross--Border-Flow-of-Data/ · https://www.cac.gov.cn/2025-10/17/c_1762449728518762.htm · https://www.cac.gov.cn/2025-02/14/c_1741232791991016.htm · https://www.china-briefing.com/news/china-issues-new-regulations-on-network-data-security-management-effective-january-1-2025 (secondary) · https://www.news.cn/politics/20251028/b3400522666a4b3f8c844b9fa6c31131/c.html · https://help.aliyun.com/zh/dws/icp-filing (secondary)

### Checks — China
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| CN-01 | China targeted (zh-CN, RMB/¥, +86, .cn, CN shipping); host IP location | `scope.signals.*`, `scope.hreflang[]`; manual: DNS → IP geolocation | Not assessable if unclear |
| CN-02 | Processing rules with art. 17 items, easy to access and save | `policy.items.cn[]`; manual | Non-compliance if China targeted |
| CN-03 | Cross-border recipient name and contact listed; **separate** consent control for transfer and sensitive data | `policy.vendors.detected[]`, `policy.transfers.countriesNamed[]`; `pages.forms[].checkboxes[]` | Non-compliance if China targeted |
| CN-04 | Ads or profiling trackers before consent or after Reject | `consent.no-interaction.thirdPartyRequests`, `consent.reject.thirdPartyRequests` (ads, social, replay) | Non-compliance if China targeted |
| CN-05 | Fonts, YouTube, Maps, reCAPTCHA before consent | `consent.no-interaction.thirdPartyRequests` (fonts, video, maps, captcha) | High risk |
| CN-06 | Marketing consent separate and unticked | `pages.forms[].marketingCheckbox`, `.preChecked` | Non-compliance |
| CN-07 | Mainland-hosted: ICP number in footer linked to beian.miit.gov.cn, plus 公安备案 badge | `pages.identification.ids.icpCN`; manual: footer links | Non-compliance if hosted in mainland China |
| CN-08 | Art. 53 representative in China | manual: ask | Not assessable |

## Hong Kong
Mostly UNVERIFIED. Verify the PDPO text before relying on these items.
**Applies when:** data users controlling data in or from HK (UNVERIFIED wording). No targeting-based extraterritorial clause.
**Privacy notice:** DPP1(3) Personal Information Collection Statement (PICS) on or before collection: purposes, transferee classes, whether supply is obligatory, access and correction rights, contact point. A Privacy Policy Statement under DPP5. Both UNVERIFIED.
**Cookies and tracking:** no cookie-specific law (UNVERIFIED). Disclose tags.
**Forms and marketing:** Part 6A: consent before using or providing data for direct marketing (an "indication of no objection" suffices), with a prescribed information notice and opt-out. Offences up to HK$500k–1M and imprisonment (UNVERIFIED).
**Pending changes:** reform proposals (mandatory breach notification, administrative fines, processor regulation) date from 2020. No bill or timetable in Jan 2025 (LCQ2, 22 Jan 2025, UNVERIFIED: https://www.info.gov.hk/gia/general/202501/22/P2025012200305.htm). Still no bill as of Aug–Sept 2026 (secondary).
**Sources:** https://uppersetup.com/en/blog/pdpo-cap-486-in-2026-the-reform-that-never-came-and (secondary)

### Checks — Hong Kong
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| HK-01 | PICS at or before each form | `pages.forms[].noticeNearby` | High risk (DPP1(3) UNVERIFIED) |
| HK-02 | Privacy Policy Statement published | `pages.links.privacy`, `policy.items.hk[]` | High risk (DPP5 UNVERIFIED) |
| HK-03 | Every pixel and tag disclosed | `policy.vendors.missingFromPolicy[]` | High risk |
| HK-04 | Direct marketing: consent or no-objection, prescribed notice, opt-out | `pages.forms[].marketingCheckbox`; manual: e-mail template | High risk (UNVERIFIED) |

## Singapore
**Applies when:** organisations collecting, using or disclosing personal data in Singapore, whether or not formed or resident there (UNVERIFIED wording). **Business contact information (BCI)** is outside the data protection obligations, so B2B marketing to business addresses is not covered (Baker McKenzie, secondary).
**Cookies and tracking:** no cookie-specific rule. Consent (including deemed consent) under PDPA principles. Online behavioural advertising is treated as opt-in in practice (secondary).
**Forms and marketing:**
- Do Not Call registry covers phone calls, SMS and fax only, not e-mail (UNVERIFIED).
- **Spam Control Act 2007:** messages with a **Singapore link**, including a recipient present in SG. "Bulk" = more than 100 similar messages in 24h, more than 1,000 in 30 days, or more than 10,000 in a year. Unsubscribe takes effect after 10 business days (s 5(3)). Second Schedule items (`<ADV>` label, unsubscribe facility, accurate headers): UNVERIFIED.
**Officer, representative, registration:** DPO appointment required (s 11(3)). **The DPO's business contact information must be publicly available (s 11(5))**, deemed satisfied on a readily accessible part of the **official website** or on **ACRA**. PDPC expects the site to be accessible from SG and phone numbers to be Singapore numbers (Advisory Guidelines para 21.7).
**Penalties and enforcement:** from 1 Oct 2022, up to **10% of Singapore annual turnover** (if turnover > S$10M) or **S$1M**.
**Sources:** https://resourcehub.bakermckenzie.com/en/resources/global-data-and-cyber-handbook/asia-pacific/singapore/topics/cookies-online-tracking-and-direct-marketing (secondary) · https://www.scl.org/12469-singapore-latest-updates-to-data-protection-legislation-and-guides/ (secondary) · https://pdpc.gov.sg/dpo · https://sso.agc.gov.sg/Act/SCA2007 · https://www.pdpc.gov.sg/news-and-events/announcements/2022/09/amendments-to-enforcement-under-the-personal-data-protection-act-in-updated-advisory-guidelines-and-guide

### Checks — Singapore
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| SG-01 | DPO business contact on the website (or ACRA record); SG phone number | `policy.items.sg[]`, `pages.identification.phone`; manual: ACRA | Non-compliance |
| SG-02 | Every pixel and tag disclosed | `policy.vendors.missingFromPolicy[]` | High risk |
| SG-03 | Behavioural-ad pixels fire without consent | `consent.no-interaction.thirdPartyRequests` (ads, social) | Improvement (opt-in in practice) |
| SG-04 | Bulk e-mail: working unsubscribe honoured within 10 business days; `<ADV>` label | manual: e-mail template, ESP settings | Non-compliance (label UNVERIFIED) |
| SG-05 | Foreign recipients disclosed | `policy.transfers.countriesNamed[]` | Improvement |

## Malaysia
**Applies when:** processing in respect of **commercial transactions** by persons established in Malaysia or using equipment in Malaysia. No targeting clause (UNVERIFIED). PDPA 2010 as amended by the Personal Data Protection (Amendment) Act 2024, in force in phases:
- **1 Jan 2025:** miscellaneous provisions;
- **1 Apr 2025:** "data controller" terminology, biometric data made sensitive, **higher penalties**, Security Principle extended to processors, **whitelist removed** for transfers;
- **1 Jun 2025:** **DPO appointment** for controllers and processors, **mandatory breach notification**, data portability.
**Privacy notice:** s 7 notice in **Malay and English** (UNVERIFIED).
**Forms and marketing:** s 43 right to stop direct marketing (UNVERIFIED).
**Transfers:** the **whitelist was removed** from 1 Apr 2025.
**Officer, representative, registration:** **DPO appointment** for controllers and processors from **1 Jun 2025**.
**Penalties and enforcement:** higher penalties from 1 Apr 2025; new maximum RM1M / 3 years UNVERIFIED.
**Sources:** https://www.rajahtannasia.com/?p=161886 (secondary)

### Checks — Malaysia
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| MY-01 | Established in Malaysia or using equipment there | manual: ask | Not assessable |
| MY-02 | Notice in Malay and English | `policy.lang`, `scope.hreflang[]` | High risk (UNVERIFIED) |
| MY-03 | No "Malaysia whitelist" as transfer basis | `policy.obsoleteRefs[]` | Non-compliance |
| MY-04 | DPO appointed (from 1 Jun 2025); contact in notice | manual: ask; `policy.items.my[]` | Not assessable; contact missing: Improvement |
| MY-05 | Way to stop direct marketing | manual: e-mail template | Improvement (UNVERIFIED) |

## Thailand
Mostly UNVERIFIED. Verify before relying on these items.
**Applies when:** controllers outside Thailand offering goods or services to, or monitoring, persons in Thailand (s 5) (UNVERIFIED).
**Cookies and tracking:** opt-in for non-essential cookies by practice and industry guidance. PDPC guideline name and date UNVERIFIED.
**Officer, representative, registration:** foreign controllers in scope must appoint a **representative in Thailand** (s 37(5)) (UNVERIFIED). DPO where required (a "no DPO" finding was part of a fine below).
**Penalties and enforcement:** on 1 Aug 2025 the PDPC announced eight fines, including **THB 7M** against an IT retailer (security failures, no breach report, **no DPO**) and THB 2.5M against a cosmetics firm (Tilleke & Gibbins, secondary). Administrative maximum THB 5M per violation (UNVERIFIED).
**Sources:** https://www.tilleke.com/insights/more-than-a-warning-eight-serious-fines-imposed-in-thai-data-protection-cases (secondary)

### Checks — Thailand
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| TH-01 | Thailand targeted (th, THB, +66, .th) | `scope.*` | Not assessable if unclear |
| TH-02 | Trackers or non-essential cookies before interaction or after Reject | `consent.no-interaction.*`, `consent.reject.thirdPartyRequests`, `.cookies[].suspectedTracker` | High risk (basis UNVERIFIED) |
| TH-03 | Reject as prominent as Accept; no pre-ticked purposes | `consent.*.banner.symmetry` | High risk |
| TH-04 | Fonts, YouTube, Maps, reCAPTCHA before consent | `consent.no-interaction.thirdPartyRequests` (fonts, video, maps, captcha) | High risk |
| TH-05 | Thai representative and DPO | manual: ask | Not assessable |
| TH-06 | Thai-language notice | `policy.lang` | Improvement (UNVERIFIED) |

## Philippines
**Applies when:** extraterritorial reach (s 6, link to the Philippines): UNVERIFIED.
**Officer, representative, registration:** NPC Circular 2022-04: personal information controllers and processors register their data processing systems and DPO with the NPC if any applies:
- **≥ 250 employees**;
- **sensitive information of ≥ 1,000 individuals**;
- risky processing;
- any automated decision-making or profiling, regardless of size.
- Self-employed professionals register and act as their own DPO. New systems within 20 days; changes within 10 days.
- Publishing DPO contact in the privacy notice is expected (UNVERIFIED as a legal requirement).
**Sources:** https://privacy.gov.ph/?p=43514 · https://privacy.gov.ph/wp-content/uploads/2023/05/Circular-2022-04.pdf

### Checks — Philippines
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| PH-01 | NPC registration if a threshold is met (incl. any ADM or profiling, e.g. lead scoring, ad profiling) | manual: ask headcount, sensitive data, ADM | Not assessable; Non-compliance if a threshold is met and not registered |
| PH-02 | DPO contact in the privacy notice | `policy.items.ph[]` | Improvement |

## Vietnam
**Applies when:** foreign organisations directly involved in processing personal data of Vietnamese citizens. Law on Personal Data Protection **No. 91/2025/QH15** (adopted 26 Jun 2025, effective **1 Jan 2026**) and **Decree 356/2025/ND-CP** (31 Dec 2025, effective 1 Jan 2026) replace Decree 13/2023 in substance.
**Privacy notice:** Vietnamese-language notice: UNVERIFIED.
**Cookies and tracking:** consent-centric, strict on formality, with new exemptions (contract performance etc.). Cookies and pre-ticked boxes treated as requiring explicit opt-in (UNVERIFIED specific provision).
**Transfers:** cross-border transfer impact assessment (TIA) filed with A05; update it when anything changes.
**Officer, representative, registration:** a data protection department or personnel, or an external provider. SMEs and start-ups have **5 years** of grace for the DPO and DPIA. Micro and household businesses are exempt unless they process sensitive or large-scale data.
**Penalties and enforcement:** cross-border violations up to **5% of prior-year revenue**; other violations up to VND 3bn; illegal data trading up to 10× the revenue gained.
**Sources:** https://www.tilleke.com/insights/vietnams-new-personal-data-protection-law-a-closer-look/2/ (secondary)

### Checks — Vietnam
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| VN-01 | Vietnam targeted (vi, VND, +84, .vn) | `scope.*` | Not assessable if unclear |
| VN-02 | Trackers before interaction or after Reject | `consent.no-interaction.*`, `consent.reject.thirdPartyRequests` | High risk (basis secondary) |
| VN-03 | Pre-ticked consent boxes | `pages.forms[].checkboxes[].preChecked`, banner toggles | Non-compliance |
| VN-04 | Fonts, YouTube, Maps, reCAPTCHA before consent | `consent.no-interaction.thirdPartyRequests` (fonts, video, maps, captcha) | High risk |
| VN-05 | Policy cites Decree 13/2023 as the only basis | `policy.obsoleteRefs[]`; manual | Non-compliance |
| VN-06 | TIA filed with A05 for foreign processors | manual: ask | Not assessable |
| VN-07 | Vietnamese-language notice | `policy.lang` | Improvement (UNVERIFIED) |

## Indonesia
**Applies when:** UU PDP No. 27/2022, fully applicable since 17 Oct 2024 (UNVERIFIED date). Extraterritorial reach UNVERIFIED.
**Privacy notice:** GR 33/2026 (signed **16 Jul 2026**, effective **16 Jan 2027**): pre-consent notice of lawful basis, purpose, data types, retention and rights; indirect-collection notice within 30 business days; no liability-exclusion clauses.
**Cookies and tracking:** consent must be free, informed, specific and unambiguous; deceptive mechanisms banned. Legitimate interest needs a balancing test.
**Transfers:** adequacy or SCC/BCR depend on the authority; consent-based transfers limited to non-recurring cases.
**Officer, representative, registration:** DPO triggers are **alternative** (Constitutional Court 151/2024).
**Penalties and enforcement:** fines up to **2% of annual gross revenue**. The PDP Agency is **not operational**: a Perpres went for signature on 20 May 2026 (reportedly signed); Komdigi oversees in the interim; possibly effective in 2028.
**Sources:** https://www.nusantaradfdl.com/insights/indonesia-personal-data-protection-law-gr-33-2026/ (secondary) · https://teknologi.bisnis.com/read/20260913/84/2003698/pembentukan-badan-pdp-dipercepat-implementasi-uu-pdp-dinilai-belum-efektif (press)

### Checks — Indonesia
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| ID-01 | Pre-consent notice: lawful basis, purpose, data types, retention, rights | `policy.items.id[]`, `pages.forms[].noticeNearby` | Improvement before 16 Jan 2027; Non-compliance after |
| ID-02 | No deceptive consent design (Reject available, no pre-ticks) | `consent.*.banner.symmetry`, `pages.forms[].checkboxes[].preChecked` | Improvement before 16 Jan 2027; High risk after |
| ID-03 | No liability-exclusion clauses in policy or terms | manual: read policy and terms | Improvement before 16 Jan 2027; Non-compliance after |
| ID-04 | DPO where a trigger applies | manual: ask | Not assessable |
| ID-05 | Indonesian-language notice | `policy.lang` | Improvement (UNVERIFIED) |

## India
**Applies when:** processing outside India in connection with offering goods or services to data principals in India (s 3(b); UNVERIFIED).
- DPDP Rules notified **13 Nov 2025** (G.S.R. 846(E); Act commencement G.S.R. 843(E)); corrigendum 10 Dec 2025 left dates unchanged.
- **13 Nov 2025:** definitions, Data Protection Board, Rules 1, 2, 17–21.
- **13 Nov 2026:** consent manager registration (Rule 4, s 6(9)).
- **13 May 2027:** all substantive duties: notice (Rule 3), consent (ss 4–6), security, breach notice, children's verifiable parental consent (s 9, Rule 10), rights, cross-border, penalties (ss 28–34).
**Privacy notice:** standalone, clear consent notice with itemised data and specific purposes. Accessible in English or any Eighth Schedule language (s 5(3); UNVERIFIED).
**Cookies and tracking:** from May 2027 analytics and ads cookies are in practice consent-based under the DPDP consent standard (inference; no cookie-specific rule).
**Officer, representative, registration:** consent managers must be India-incorporated.
**Children:** under-18s need verifiable parental consent, except health, education and safety carve-outs.
**Penalties and enforcement:** up to **₹250 crore** (security safeguards); ₹200 crore (breach notice or children); ₹50 crore (other).
**Pending changes:** a MeitY proposal (Jan 2026) to bring dates forward to 13 Nov 2026 reportedly concerns the obligations of **Significant Data Fiduciaries**, not all duties (secondary: https://consentos.in/learn/dpdp-rules-notification-status/); **not gazetted** as of 30 Oct 2026. Re-check.
**Sources:** https://consentos.in/learn/dpdp-rules-notification-status/ (secondary) · https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf · https://chambers.com/articles/meity-plans-to-cut-short-dpdp-compliance-timeline-and-notify-cross-border-restrictions-for-sdfs (secondary)

### Checks — India
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| IN-01 | India targeted (₹/INR, +91, .in, Indian clients) | `scope.signals.*` | Not assessable if unclear |
| IN-02 | Standalone consent notice at each form: itemised data, purposes, withdrawal link, Board complaint route | `pages.forms[].noticeNearby`, `policy.items.in[]` | Improvement before 13 May 2027; Non-compliance after (the 13 Nov 2026 proposal reportedly covers only Significant Data Fiduciaries and is not gazetted) |
| IN-03 | Trackers before consent or after Reject | `consent.no-interaction.*`, `consent.reject.thirdPartyRequests` | Improvement now; Non-compliance from 13 May 2027 |
| IN-04 | Notice available in English or an Eighth Schedule language | `policy.lang` | Improvement (UNVERIFIED) |
| IN-05 | Under-18 users: verifiable parental consent flow | `scope.signals.kidsTerms`, `.accounts` | Not assessable; Improvement before 13 May 2027 |

## UAE — federal PDPL
**Applies when:** Decree-Law 45/2021. Extraterritorial reach to data subjects in the UAE (art. 2): UNVERIFIED.
**Officer, representative, registration:** none operational. On 14 Jun 2026 a **Federal Authority for AI and Data** was created, absorbing the Emirates Data Office. No private-sector PDPL supervisor has been clearly designated.
**Penalties and enforcement:** **Executive Regulations still not issued** as of 30 Oct 2026 (secondary sources only; no Official Gazette or Cabinet confirmation: UNVERIFIED). Low enforcement risk today. Recommend a GDPR-style notice.
**Sources:** https://www.morganlewis.com/pubs/2026/06/uae-establishes-federal-authority-for-artificial-intelligence-and-data (secondary) · https://business-ciso.com/blog/uae-pdpl-executive-regulations-status (vendor, secondary) · https://www.businessdubai.ae/blogs/uae-pdpl-data-protection (secondary)

## UAE — DIFC (DP Law No. 5 of 2020)
**Applies when:** entities established in the DIFC (scope, including processing in the DIFC "as part of stable arrangements": UNVERIFIED). Out of scope unless the studio or client is there.
**Privacy notice:** information at collection (arts. 29–30). At least one **free, account-free website channel** for exercising rights (art. 40). Online platforms must use privacy-protective **default settings** (art. 14(4)).
**Cookies and tracking:** no DIFC cookie-specific guidance found (UNVERIFIED).
**Forms and marketing:** before first use for direct marketing, inform the individual and expressly offer the right to object; they can object at any time (art. 34).
**Officer, representative, registration:**
- **Notification** to the Commissioner, shown on a public register (art. 14(7)).
- **DPO (art. 16)** mandatory for **DIFC Bodies** and controllers or processors doing **High Risk Processing on a systematic or regular basis**; the Commissioner may also require one. The DPO generally must reside in the UAE. Without a mandatory DPO, still assign compliance responsibility and tell the Commissioner who it is.
**Penalties and enforcement:** Schedule 2 fines of **USD 10,000–100,000 per contravention**, plus general fines.
**Sources:** https://dlapiperdataprotection.com/countries/uae-dubai-difc/law.html (secondary)

## UAE — ADGM (DP Regulations 2021)
**Applies when:** entities **established in ADGM** only.
**Privacy notice:** clear, concise language; **DPO contact details "should be included in all of your privacy notices"** (ODP Guidance Part 3, paras 2.6, 5.8).
**Cookies and tracking:** no ADGM cookie-specific guidance found in Part 3 (UNVERIFIED).
**Forms and marketing:** the right to object to **marketing is absolute**.
**Officer, representative, registration:** DPO mandatory "for certain entity types" (list UNVERIFIED). A **data protection fee** is payable to the Commissioner.
**Penalties and enforcement:** maximum fine UNVERIFIED.
**Sources:** https://assets.adgm.com/download/assets/Overview+of+the+ADGM+Data+Protection+Regulations+2021+Brochure.pdf/b131764858a111efb6605e7c57113ad4 · https://assets.adgm.com/download/assets/ADGM+DPR+2021+Guidance+Part+3.pdf/12ba12da595611ef894152361f6b9c5e

### Checks — UAE (federal, DIFC, ADGM)
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| AE-01 | Operator or client established in the DIFC or ADGM | `pages.identification.address`; manual: ask | Not assessable |
| AE-02 | UAE-targeted site has a GDPR-style privacy notice | `pages.links.privacy`, `policy.items.gdpr[]` | Improvement (federal regulations not issued) |
| AE-03 | DIFC: notice at collection (arts. 29–30) | `pages.forms[].noticeNearby`, `policy.items.ae[]` | Non-compliance if DIFC-established |
| AE-04 | DIFC: free, account-free website channel for rights requests (e-mail or open form) | `policy.items.ae[]`; manual: rights section | Non-compliance if DIFC-established |
| AE-05 | DIFC: right to object to direct marketing offered before first use; objection honoured | `pages.forms[].marketingCheckbox`, `.nearbyText`; manual: e-mail template | Non-compliance if DIFC-established |
| AE-06 | DIFC: notification on the public register; DPO or named compliance owner | manual: DIFC register; ask | Not assessable |
| AE-07 | ADGM: DPO contact in every privacy notice | `policy.items.ae[]` | High risk if ADGM-established and a DPO exists |
| AE-08 | ADGM: unconditional marketing opt-out in every message | manual: e-mail template | Non-compliance if ADGM-established |
| AE-09 | ADGM: data protection fee paid; DPO if the entity type requires it | manual: ask | Not assessable |

## Saudi Arabia
**Applies when:** PDPL **enforceable since 14 Sep 2024** after a one-year grace period; amended by Royal Decree M/148. It applies to processing outside the Kingdom of data of people in the Kingdom. This is the **broadest trigger in the region**: mere visibility can be enough once Saudi residents submit data.
**Privacy notice:** SDAIA guidance on privacy policies exists. Arabic-language requirement UNVERIFIED.
**Cookies and tracking:** cookie-specific guidance UNVERIFIED. Use the global baseline banner.
**Forms and marketing:** direct marketing requires consent and an opt-out (UNVERIFIED article).
**Transfers:** the Transfer Regulation includes SDAIA SCCs, plus a risk assessment where SCCs are used.
**Officer, representative, registration:** registration on the **National Data Governance Platform** for public entities, controllers whose main activity is processing, and controllers of sensitive data. SDAIA guidance on DPO appointment exists.
**Penalties and enforcement:** fines up to **SAR 5M** (doubled for repeat offences); up to 2 years' prison for sensitive-data disclosure.
**Sources:** https://cms.law/en/are/legal-updates/one-year-anniversary-saudi-personal-data-protection-law (secondary)

### Checks — Saudi Arabia
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| SA-01 | Site collects data from people in the Kingdom (ar, SAR, +966, .sa, Saudi clients) | `scope.signals.*`; manual: ask | Not assessable if unclear |
| SA-02 | Privacy policy published and covering SDAIA guidance items | `pages.links.privacy`, `policy.items.sa[]`; manual | Non-compliance if missing |
| SA-03 | Arabic version of the notice | `policy.lang`, `scope.hreflang[]` | Improvement (UNVERIFIED) |
| SA-04 | Foreign processors: SDAIA SCCs plus risk assessment | `policy.vendors.detected[]`; manual: ask | Not assessable |
| SA-05 | National Data Governance Platform registration (sensitive data or main activity) | manual: ask | Not assessable |
| SA-06 | Marketing consent and opt-out | `pages.forms[].marketingCheckbox`, `.preChecked` | High risk (UNVERIFIED article) |
| SA-07 | Non-essential trackers before consent | `consent.no-interaction.thirdPartyRequests` | Improvement (cookie rule UNVERIFIED) |

## Qatar
**Applies when:** PDPPL (Law 13/2016) applies to processing in Qatar. **No explicit extraterritorial provision** (Chambers, secondary). Out of scope for a foreign site unless processing happens in Qatar.
**Cookies and tracking:** under the NCSA's (non-binding) **PDPPL Guidelines**, **cookies used to target direct advertising may be set only after opt-in** (Chambers, secondary; guideline text UNVERIFIED).
**Forms and marketing:**
- **Electronic marketing (art. 22):** prior **"explicit and unambiguous" consent**; implied consent not recognised. Messages identify the sender, say they are direct marketing, give a reachable address and allow withdrawal.
- Websites collecting e-mail addresses must state that submitting the address means consent to marketing e-mail until withdrawn (guidelines).
**Officer, representative, registration:** **no general DPO duty** and **no controller registration**. Regulator: National Cyber Governance and Assurance Affairs department of the **National Cyber Security Agency (NCSA)**.
**Children:** websites directed at children must post a notice on use of children's data, get express parental or guardian approval, and give parents access and deletion (article number art. 17 UNVERIFIED).
**Penalties and enforcement:** fines up to **QAR 5M** (source says "5 million", ≈ USD 1.4M).
**Sources:** https://www.dlapiperdataprotection.com/guide.pdf?c=QA (secondary) · https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/qatar (secondary)

### Checks — Qatar
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| QA-01 | Processing happens in Qatar (operator, servers or staff there) | manual: ask | Not assessable |
| QA-02 | Ad-targeting cookies before opt-in | `consent.no-interaction.thirdPartyRequests`, `consent.reject.thirdPartyRequests` (ads) | High risk (non-binding guidelines) |
| QA-03 | Marketing consent explicit (unticked, separate) | `pages.forms[].marketingCheckbox`, `.preChecked` | Non-compliance |
| QA-04 | E-mail capture forms state that submitting means consent to marketing until withdrawn | `pages.forms[].nearbyText` | High risk |
| QA-05 | Marketing messages identify the sender, say "direct marketing", give an address, allow withdrawal | manual: e-mail template | Non-compliance |
| QA-06 | Child-directed site: children's data notice, parental approval, parental access and deletion | `scope.signals.kidsTerms` | Non-compliance if child-directed |

## Israel
**Applies when:** Privacy Protection Law, **Amendment 13 in force 14 Aug 2025**; the PPA published its guide the same day (Digital Policy Alert, secondary). Territorial trigger not verified. Accessibility regulations apply to every service offered to the public.
**Privacy notice:** notice at collection: whether supply is mandatory or voluntary, consequences of refusal, controller, rights.
**Cookies and tracking:** consent for direct marketing and sensitive data; notice at collection otherwise.
**Forms and marketing:** Communications Law s 30A ("spam law"): prior written consent and the word "פרסומת" (advertisement) (UNVERIFIED).
**Accessibility:** Equal Rights for Persons with Disabilities (Service Accessibility Adjustments) Regulations 2013 apply to private businesses. Sites must meet **IS 5568 (WCAG 2.0-based)**. A breach is a civil wrong with statutory damages up to **NIS 50,000**; class actions are common. The accessibility statement (הצהרת נגישות) duty, the AA level and small-business exemptions are UNVERIFIED.
**Officer, representative, registration:** DPO for public bodies, data brokers, large-scale sensitive processing and systematic monitoring (enforcement grace ended 31 Oct 2025). Database registration narrowed to public bodies and data brokers with more than 10k records. Treat thresholds as secondary.
**Penalties and enforcement:** statutory damages up to **₪100k** without proof of harm; administrative fines in the millions (secondary).
**Sources:** https://www.pearlcohen.com/israel-significant-amendment-to-the-privacy-law-takes-effect/ (secondary) · https://www.mineos.ai/articles/israels-amendment-13-a-new-era-for-privacy (secondary) · https://www.law.co.il/en/news/2013/11/13/New-website-accessibility-regulations-enacted/

### Checks — Israel
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| IL-01 | Israel targeted (he, ₪/ILS, +972, .il) | `scope.*` | Not assessable if unclear |
| IL-02 | Notice at each form: mandatory/voluntary, consequences, controller, rights | `pages.forms[].noticeNearby`, `.nearbyText` | Non-compliance |
| IL-03 | IS 5568 / WCAG failures | manual: axe-core run | Non-compliance |
| IL-04 | Accessibility statement (הצהרת נגישות) page | `pages.links.accessibilityStatement` | Non-compliance (duty details UNVERIFIED) |
| IL-05 | Marketing: prior consent, unticked; "פרסומת" in messages | `pages.forms[].marketingCheckbox`; manual: e-mail template | High risk (UNVERIFIED) |
| IL-06 | DPO or database registration (monitoring, sensitive data, broker) | manual: ask | Not assessable |
| IL-07 | Small-business accessibility exemption | manual: ask turnover and headcount | Not assessable |

## Türkiye
**Applies when:** KVKK (Law 6698). Targeting trigger UNVERIFIED.
**Privacy notice:** the **aydınlatma** (information notice) must be **separate from consent**. For cookies, list name, purpose, duration and first/third party.
**Cookies and tracking:** KVKK cookie guide (Çerez Uygulamaları Hakkında Rehber; first edition 2022; current edition date UNVERIFIED):
- strictly necessary cookies (Criterion A: communication; Criterion B: a service the user explicitly requested) need no consent: session, auth, security, cart, language, and first-party analytics used only for site operation with IP masking and no cross-site tracking;
- **behavioural advertising cookies and third-party social plugins need explicit consent (açık rıza)**;
- **opt-in only**: no pre-ticked boxes or browse-wrap; Accept, Reject and Preferences equally prominent; non-essential off by default; easy withdrawal;
- consent cannot be bundled with the terms or the notice; cookie walls may invalidate consent;
- third-party foreign cookies are **cross-border transfers** under art. 9 and the 2024 transfer regulation.
**Forms and marketing:** commercial electronic messages need prior consent and İYS registration under Law 6563 (UNVERIFIED).
**Transfers:** art. 9 amended by Law 7499 (2024); effective date 1 Jun 2024 UNVERIFIED. **Standard contracts must be notified to the Authority within 5 business days** of signing (announcement 25 Oct 2024).
**Officer, representative, registration:** VERBIS exemption for < 50 employees and annual balance sheet below the threshold (UNVERIFIED).
**Penalties and enforcement:** Board decision 2022/1358 (23 Dec 2022): a site with advertising, marketing and performance cookies without explicit consent and no cookie notice was fined **TRY 300,000** and ordered to add compliant notices.
**Sources:** https://www.kvkk.gov.tr/SharedFolderServer/CMSFiles/fb193dbb-b159-4221-8a7b-3addc083d33f.pdf · https://www.kvkk.gov.tr/Icerik/7595/2022-1358 · https://www.kvkk.gov.tr/Icerik/8043/Standart-Sozlesme-Bildirim-Modulu-Hakkinda-Kamuoyu-Duyurusu

### Checks — Türkiye
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| TR-01 | Türkiye targeted (tr, ₺/TRY, +90, .tr) | `scope.*` | Not assessable if unclear |
| TR-02 | Ads, social plugins or non-essential cookies before interaction or after Reject | `consent.no-interaction.*`, `consent.reject.thirdPartyRequests`, `.cookies[].suspectedTracker` | Non-compliance |
| TR-03 | Accept, Reject, Preferences equally prominent in the first layer | `consent.no-interaction.banner.symmetry`, `.rejectSameLayer` | Non-compliance |
| TR-04 | No pre-ticked purposes; consent not bundled with terms or notice; no cookie wall | manual: banner layers; `pages.forms[].checkboxes[]` | Non-compliance (cookie wall: High risk) |
| TR-05 | Separate cookie aydınlatma metni listing name, purpose, duration, party | `pages.links.cookies`, `policy.items.tr[]` | Non-compliance |
| TR-06 | Persistent cookie settings link | `pages.links.cookieSettings` | Non-compliance |
| TR-07 | Fonts, YouTube, Maps, reCAPTCHA before consent | `consent.no-interaction.thirdPartyRequests` (fonts, video, maps, captcha) | High risk |
| TR-08 | Foreign processors with no transfer basis stated | `policy.vendors.detected[]`, `policy.transfers.countriesNamed[]` | High risk; remind of 5-business-day standard-contract notification |
| TR-09 | Marketing: separate explicit consent, İYS | `pages.forms[].marketingCheckbox`, `.preChecked`; manual: ask about İYS | Non-compliance |
| TR-10 | VERBIS registration | manual: ask headcount and balance sheet | Not assessable |

## South Africa
**Applies when:** POPIA applies to responsible parties domiciled in SA or using means in SA (s 3; UNVERIFIED).
**Privacy notice:** s 18 notice applies (UNVERIFIED). A **PAIA manual** must be publicly available, typically on the website; the small private-body exemption is UNVERIFIED.
**Cookies and tracking:** no cookie-specific rule; s 18 notice (UNVERIFIED).
**Forms and marketing:** s 69 and Guidance Note on direct marketing (2024):
- electronic direct marketing only with **consent** or to **existing customers** (similar products, opt-out at collection and in every message);
- non-customers may be approached **once** for consent, using **Form 4** or a substantially similar form; "Silence cannot mean consent";
- **phone calls count as electronic communication**;
- every message identifies the sender and gives an opt-out contact.
**Transfers:** s 72 (UNVERIFIED).
**Officer, representative, registration:** the **Information Officer must be registered** with the Regulator before taking up duties (s 55), via the eServices portal.
**Penalties and enforcement:** enforcement notices include FT Rams Consulting (21 Feb 2024; direct marketing, UNVERIFIED subject), Dis-Chem (5 Feb 2024), WhatsApp (16 Apr 2025) and FNB (23 Oct 2026). **Infringement notices** under s 109 against FNB and Central Johannesburg TVET College (23 Oct 2026). Administrative fines up to R10M (UNVERIFIED).
**Sources:** https://inforegulator.org.za/ · https://inforegulator.org.za/wp-content/uploads/2020/07/GUIDANCE-NOTE-ON-DIRECT-MARKETING-IN-TERMS-OF-THE-PROTECTION-OF-PERSONAL-INFORMATION-ACT-4-OF-2013-POPIA.pdf · https://inforegulator.org.za/wp-content/uploads/2020/07/FORM-4-APPLICATION-FOR-THE-CONSENT-OF-A-DATA-SUBJECT-FOR-THE-PROCESSING-OF.pdf · https://inforegulator.org.za/paia/ · https://inforegulator.org.za/enforcement-notices/

### Checks — South Africa
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| ZA-01 | Domiciled in SA or using means there (R/ZAR, +27, .za) | `scope.*`; manual: ask | Not assessable if unclear |
| ZA-02 | Information Officer contact in the policy | `policy.items.za[]` | Improvement |
| ZA-03 | Information Officer registered with the Regulator | manual: ask | Not assessable; Non-compliance if not registered |
| ZA-04 | PAIA manual published and linked | manual: search site for "PAIA" | Improvement to Non-compliance by body size (exemption UNVERIFIED) |
| ZA-05 | Newsletter consent: unticked, Form 4-style wording, not bundled | `pages.forms[].marketingCheckbox`, `.label`, `.preChecked` | Non-compliance |
| ZA-06 | Existing-customer marketing offers opt-out at collection | `pages.forms[].nearbyText`; manual: checkout | Non-compliance |
| ZA-07 | Every message identifies the sender and gives an opt-out contact | manual: e-mail template | Non-compliance |
| ZA-08 | s 18 notice at forms | `pages.forms[].noticeNearby` | High risk (UNVERIFIED) |

## Nigeria
**Applies when:** NDPA 2023 plus the **GAID 2025** (issued **20 Mar 2025**, effective **19 Sep 2025** after a six-month transition; the NDPR 2019 and its 2020 Implementation Framework stopped applying then). NDPA s 2 reach to non-Nigerian controllers processing data of subjects in Nigeria: UNVERIFIED.
**Privacy notice:** GAID art. 7(viii): privacy policies easily accessible, transparent and periodically reviewed; "display the privacy notices and cookie notices on the homepage of its website" (secondary).
**Cookies and tracking:** non-essential cookies need prior opt-in; pre-ticked boxes and continued browsing invalid; declining as easy as accepting. Stated only by a compliance vendor without article numbers; the GAID cookie article is **UNVERIFIED**. NDPA s 35 (withdrawal as easy as consent) cited by the same vendor (UNVERIFIED). Report as High risk pending the primary text.
**Forms and marketing:** GAID direct-marketing rules UNVERIFIED.
**Officer, representative, registration:**
- **DPO (GAID art. 7(vii)):** organisations must appoint a DPO (plus associate DPOs or privacy champions where needed) (secondary). Whether non-DCPMIs must appoint one is UNVERIFIED.
- **Registration (GAID art. 7(i))** as a data controller or processor of major importance (**DCPMI**). Tiers **UHL, EHL, OHL**. Triggers (Templars, Jan 2026): **UHL** includes banks, telecoms, insurers, multinationals, social media/e-mail apps, payment gateways and fintechs, **or anyone processing data of > 5,000 data subjects within 6 months**; **EHL** includes MDAs, microfinance banks, universities and hospitals, **or 1,000–5,000 data subjects within 6 months**. Registration fees UNVERIFIED.
- **Compliance Audit Return (CAR):** annually **by 31 March** for UHL and EHL, through a licensed DPCO on the NDPC portal. New DCPMIs file within 15 months of starting business. OHL need not use a DPCO. Filing fees: UHL ₦1,000,000 / ₦750,000 / ₦500,000 by volume; EHL ₦250,000 / ₦200,000 / ₦100,000. Late filing: up to **50%** surcharge.
- DCPMIs' DPOs file internal compliance reports every six months, pass an Annual Credential Assessment, earn at least 4 CPD credits a year and pass a certification exam (Banwo & Ighodalo, secondary).
**Penalties and enforcement:** non-filing of the CAR: up to **the greater of ₦10M or 2% of prior-year gross revenue**. The ₦2M / 2% figure for non-DCPMIs is UNVERIFIED.
**Sources:** https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf (primary; contents UNVERIFIED) · https://services.ndpc.gov.ng/ · https://privacymatters.dlapiper.com/2025/06/nigeria-ndpc-issues-gaid-key-compliance-insights/ (secondary) · https://www.banwo-ighodalo.com/media-files/2025/08/Are-you-GAID-Ready.pdf (secondary) · https://tundeadisa.com/wp-content/uploads/2025/06/Compliance-Made-Easy-A-Review-of-the-Nigeria-Data-Protection-Commission-NDPC-General-Application-and-Implementation-Directive-GAID-1.pdf (secondary) · https://ndprtoolkit.com.ng/blog/gaid-2025-cookie-consent-nigeria-website/ (secondary, vendor) · https://www.templars-law.com/app/uploads/2026/01/Client-Alert-Data-Protection-Compliance-in-Nigeria.pdf (secondary)

### Checks — Nigeria
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| NG-01 | Nigeria targeted (₦/NGN, +234, .ng) | `scope.*` | Not assessable if unclear |
| NG-02 | Privacy notice and cookie notice reachable from the homepage | `pages.links.privacy`, `pages.links.cookies` on the home page | High risk (GAID art. 7(viii), secondary) |
| NG-03 | Non-essential trackers before consent or after Reject; Reject as easy as Accept | `consent.no-interaction.*`, `consent.reject.thirdPartyRequests`, `banner.symmetry` | High risk (cookie article UNVERIFIED) |
| NG-04 | DCPMI registration: more than 1,000 Nigerian data subjects in 6 months, or a listed sector | manual: ask volumes (newsletter, CRM) | Not assessable; Non-compliance if a trigger is met and not registered |
| NG-05 | CAR filed by 31 March (UHL/EHL) | manual: ask | Not assessable |
| NG-06 | DPO appointed | manual: ask | Not assessable |

## Kenya
**Applies when:** DPA 2019. s 4 reach to data subjects located in Kenya: UNVERIFIED.
**Cookies and tracking:** consent must be express; no implied consent. ODPC **Guidance Notes on Consent** adopted 30 Nov 2023 (their cookie content UNVERIFIED). No ODPC cookie guidance or website cookie enforcement found.
**Forms and marketing:** direct marketing requires consent and an opt-out. "Consent for payment processing does not equal consent for marketing" (ODPC, Pepinos Pizza Inn; DPA s 37, commercial use).
**Officer, representative, registration:** ODPC compliance card:
- **mandatory registration for 10+ employees or annual turnover ≥ KES 5M**, and for public entities and NGOs;
- registration **regardless of size** for listed sectors: political canvassing, gambling, crime prevention/CCTV, education, health, hospitality, property management, financial services, telecoms, **direct marketing**, transport;
- certificates valid **2 years**; changes notified within 14 days;
- **DPO designation is optional**;
- breaches reported to the ODPC **within 72 hours**.
**Penalties and enforcement:**
- cap (s 63): up to **KES 5M or 1% of the preceding year's annual turnover, whichever is lower** (secondary).
- Penalty notices of 26 Sep 2023 totalled KES 9.375M: a digital lender contacting third parties (KES 2.975M), a restaurant posting guests' photos (KES 1.85M), a school posting a minor's photo (KES 4.55M).
- **Platinum Credit** fined KES 400,000 for marketing SMS without consent; **Pepinos Pizza Inn** fined KES 250,000; **CJ's** restaurant ordered to pay **KES 75,000** compensation for promotional SMS without consent (reported 9 Mar 2026).
**Sources:** https://www.odpc.go.ke/ · https://www.odpc.go.ke/wp-content/uploads/2025/07/Data-Controllers-360-Degrees-Compliance-Requirements.-Z-Card.pdf · https://www.oraro.co.ke/wp-content/uploads/2022/08/Accept-all-Cookies-Compliance-and-Enforcement-Mechanisms-Under-the-Data-Protection-Act-2019-1.pdf (secondary) · https://cms.law/en/ken/news-information/consent-consequences-of-non-compliance201 (secondary) · https://techweez.com/2026/01/02/marketing-sms-without-consent-fines-kenya/ (secondary) · https://www.businessdailyafrica.com/bd/corporate/companies/why-unsolicited-texts-cost-cj-s-sh75-000-5385412 (secondary) · https://digitalpolicyalert.org/change/12410-odpc-guidance-notes-on-consent (secondary)

### Checks — Kenya
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| KE-01 | Kenya targeted (KES, +254, .ke) | `scope.*` | Not assessable if unclear |
| KE-02 | ODPC registration (≥ 10 staff or ≥ KES 5M, or a listed sector such as direct marketing, education, health, hospitality) | manual: ask | Not assessable; Non-compliance if required and absent |
| KE-03 | Marketing consent separate from order or payment consent; unticked | `pages.forms[].marketingCheckbox`, `.preChecked`, `.checkboxes[].label` | Non-compliance |
| KE-04 | Opt-out in every marketing SMS or e-mail | manual: templates | Non-compliance |
| KE-05 | Identifiable people (guests, clients, minors) in portfolio or event photos without consent | manual: review portfolio and news pages; ask for releases | High risk |
| KE-06 | Non-essential trackers before consent | `consent.no-interaction.thirdPartyRequests` | Improvement (no cookie guidance found) |

## Egypt
**Applies when:** PDPL 151/2020. Extraterritorial reach UNVERIFIED. **Executive Regulations issued** as **Ministerial Decision No. 816 of 2025** (Minister of Communications and IT), dated **1 Nov 2025**, in force **2 Nov 2025**, made public 25 Dec 2025. The **one-year grace period expires 31 Oct 2026**; the law is **enforceable from 1 Nov 2026** (Baker McKenzie, secondary). Any later extension is UNVERIFIED.
**Privacy notice:** **in Arabic**, concise and visible, with controller and DPO details, purposes, lawful bases, retention, rights and transfers.
**Cookies and tracking:** cookie rules UNVERIFIED. Use the global baseline banner.
**Forms and marketing:** **e-marketing** needs prior consent, sender identification and a free, simple opt-out. A **supplementary permit** is needed for electronic direct marketing.
**Transfers:** a **supplementary permit** is needed for cross-border transfers.
**Officer, representative, registration:**
- **DPO mandatory for legal entities**, registered with the PDPC.
- Controllers and processors need a **general licence** (usually 3 years). Supplementary permits for cross-border transfers, electronic direct marketing and visual surveillance. PDPC reviews applications in 90 working days; fees depend on activity and volume. The electronic licensing portal **launched in October 2026** (Baker McKenzie, secondary).
**Penalties and enforcement:** amounts UNVERIFIED.
**Sources:** https://www.bakermckenzie.com/en/insight/publications/2026/10/egypt-personal-data-protection-law-update (secondary) · https://digitalpolicyalert.org/event/36521-executive-regulations-of-the-personal-data-protection-law-decision-no-816-of-2025-including-operational-license-requirement-entered-into-force (secondary) · https://cms.law/en/are/legal-updates/egypt-s-pdpl-executive-regulations-issued-one-year-compliance-countdown-begins (secondary) · https://www.mondaq.com/privacy-protection/1786854/egypt-personal-data-protection-law-new-compliance-developments (secondary)

### Checks — Egypt
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| EG-01 | Egypt targeted (ar, EGP, +20, .eg) or operator in Egypt | `scope.*`; manual: ask | Not assessable if unclear |
| EG-02 | Privacy notice in Arabic | `policy.lang`, `scope.hreflang[]` | Non-compliance from 1 Nov 2026 (High risk before) |
| EG-03 | Notice gives controller and DPO details, purposes, lawful bases, retention, rights, transfers | `policy.items.eg[]`; manual | Non-compliance from 1 Nov 2026 |
| EG-04 | Marketing: prior consent (unticked), sender identified, free simple opt-out | `pages.forms[].marketingCheckbox`, `.preChecked`; manual: template | Non-compliance from 1 Nov 2026 |
| EG-05 | General licence, transfer permit, e-marketing permit, registered DPO | manual: ask | Not assessable |
| EG-06 | Non-essential trackers before consent | `consent.no-interaction.thirdPartyRequests` | Improvement (cookie rules UNVERIFIED) |

---

## Comparison table — Switzerland, Asia-Pacific, Middle East, Africa

| Jurisdiction | Mere visibility triggers? (test) | Cookie / tracking model | Officer / representative / registration | Marketing consent | Notice language |
|---|---|---|---|---|---|
| Switzerland | No; effects doctrine, case by case | Notice + opt-out (TCA 45c); opt-in for high-risk profiling or sensitive data (FDPIC 2025) | Representative only if all 4 art. 14 criteria; publish name and address | Opt-in, customer exception (UWG 3(1)(o), UNVERIFIED) | None mandated (UNVERIFIED) |
| Australia | No; carries on business in AU; ≤ A$3M exempt | Notice (APP 1/5) | None | Consent + identify + unsubscribe (Spam Act) | None mandated |
| New Zealand | No; carrying on business in NZ (no presence needed) | Notice (IPP 3/3A) | Privacy officer (UNVERIFIED) | Express, inferred or deemed (UEMA) | None mandated |
| Japan | No; supplying to persons in JP (art. 171, UNVERIFIED) | Notice; consent for foreign provision and art. 31 linking; 外部送信 for covered services | None | Opt-in + records (特定電子メール法) | Japanese in practice ("plain Japanese" for 外部送信) |
| South Korea | No; targeting / direct impact (PIPC 2024) | Policy disclosure of behavioural tools; guardian consent under 14 | Privacy officer in policy; representative for large firms only | Explicit opt-in (ICNA art. 50) | Korean (practice; UNVERIFIED as mandate) |
| China | No; targeting or behaviour analysis (art. 3) | Consent; **separate** consent for transfer and sensitive data | Representative (art. 53); ICP if hosted in CN | Consent (specifics UNVERIFIED) | Chinese (practice; UNVERIFIED) |
| Hong Kong | No; data user in or from HK (UNVERIFIED) | Notice (PICS) | None | Consent / no objection (Part 6A) | UNVERIFIED |
| Singapore | No; activity in SG (UNVERIFIED wording) | Consent incl. deemed; behavioural ads opt-in in practice | **Publish DPO business contact** (s 11(5)) | Spam Control Act unsubscribe; DNC for phone/SMS | None mandated |
| Malaysia | No; established or equipment in MY | Notice; consent (UNVERIFIED) | DPO from 1 Jun 2025 | Right to stop (UNVERIFIED) | Malay + English (UNVERIFIED) |
| Thailand | No; offering to / monitoring persons in TH (UNVERIFIED) | Opt-in (practice; UNVERIFIED guidance) | DPO where required; representative (UNVERIFIED) | Consent | Thai (UNVERIFIED) |
| Philippines | Link to PH (UNVERIFIED) | Consent (UNVERIFIED) | NPC registration if ≥ 250 staff / ≥ 1k sensitive / ADM | Consent (UNVERIFIED) | Not verified |
| Vietnam | Processing Vietnamese citizens' data | Strict consent formalities (opt-in) | Data protection personnel (SMEs: 5-year grace); TIA filing | Consent | Vietnamese (UNVERIFIED) |
| Indonesia | UNVERIFIED | Consent or legitimate interest (GR 33/2026 from 16 Jan 2027) | DPO (alternative triggers) | Consent (UNVERIFIED) | Indonesian (UNVERIFIED) |
| India | No; offering goods or services in India (UNVERIFIED) | Consent from 13 May 2027 | Consent managers India-incorporated | Consent from 2027 | English or an Eighth Schedule language (UNVERIFIED) |
| UAE federal | Data subjects in UAE (UNVERIFIED); regulations not issued | GDPR-like consent; unenforced | None operational | Consent (UNVERIFIED) | Not verified |
| DIFC | No; DIFC establishment | No cookie guidance found | Notification + public register; DPO for High Risk Processing | Right to object before first use (art. 34) | Not verified |
| ADGM | No; ADGM establishment | No cookie guidance found | Data protection fee; DPO for certain entities; DPO contact in notices | Absolute right to object | Clear, concise (language not verified) |
| Saudi Arabia | **Yes in practice**: any processing of data of people in KSA | Consent / notice (cookie guidance UNVERIFIED) | National Data Governance Platform if sensitive data or main activity; DPO guidance | Consent + opt-out (UNVERIFIED) | Arabic (UNVERIFIED) |
| Qatar | No; no extraterritorial provision | Opt-in for ad-targeting cookies (non-binding guidelines) | No DPO duty, no registration | Explicit prior consent (art. 22) | Not verified |
| Israel | Not verified | Consent for direct marketing and sensitive data; notice at collection | DPO for monitoring, sensitive, brokers; registration for brokers | Prior consent, "פרסומת" (UNVERIFIED) | Hebrew (UNVERIFIED) |
| Türkiye | Targeting (UNVERIFIED) | **Opt-in** (KVKK cookie guide) | VERBIS (thresholds UNVERIFIED); SCC notification in 5 business days | Prior consent + İYS (UNVERIFIED) | Turkish (practice) |
| South Africa | Domicile or means in SA (UNVERIFIED) | Notice (s 18) | **Information Officer registration** | Opt-in, one approach (Form 4), customer exception | Not verified |
| Nigeria | Subjects in Nigeria (UNVERIFIED) | Opt-in per vendor source (High risk); notices on homepage | DCPMI registration (UHL/EHL/OHL) + CAR by 31 Mar; DPO | UNVERIFIED | Not verified |
| Kenya | Subjects in Kenya (UNVERIFIED) | Express consent generally; no cookie guidance | ODPC registration (≥ 10 staff or ≥ KES 5M, or listed sector incl. direct marketing); DPO optional | Consent + opt-out (enforced) | Not verified |
| Egypt | UNVERIFIED | UNVERIFIED | General licence + permits (transfers, e-marketing); DPO for legal entities | Prior consent + opt-out (needs permit) | **Arabic** |
