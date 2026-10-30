# United States — legal reference for qa-legal

Covers US rules that affect a website: federal law (FTC Act, CAN-SPAM, TCPA, COPPA, VPPA, ADA, ROSCA, DMCA, DOJ data rules), California (CCPA/CPRA, CalOPPA, CIPA, Unruh, Automatic Renewal Law, SB 478, AI laws), the other state comprehensive privacy laws, and state consumer-health-data laws (WA, NV, CT). Open it when the scope step lists `us`, `us-ca` or a US state. Run it in full when the site **targets US customers** (US address, USD prices, US phone, "serving clients in NYC", English plus US-centric content); run it in light mode when the site is only visible from the US (see the applicability table). The US has **no federal omnibus privacy law and no federal cookie-consent rule**. The model is **notice + opt-out** (sale, sharing, targeted ads), with **opt-in only for sensitive data**. Litigation risk comes mainly from **old wiretap/video statutes** (CIPA, VPPA, ECPA, state wiretap acts) and **ADA Title III**. Dates are day-month-year. Facts checked on 28–30 October 2026 against the linked sources. Items marked UNVERIFIED, and everything in 'Re-check before each audit', must be confirmed before you rely on them. "(secondary)" marks a law-firm, vendor or press source.

## How to use this file
- Open only the sections for regimes listed in the scope step of SKILL.md.
- Check IDs below are the ones to use in the report.
- Start with the applicability table. For a small non-US studio most state laws do not apply; CalOPPA, CAN-SPAM and the litigation-driven checks (pixels, replay, chat, accessibility) usually still matter.
- Run `consent-check.mjs --locale=en-US --tz=America/Los_Angeles --gpc`, then `policy-check.mjs --regimes=us-ca --consent=consent-en-US.json`.
- When revenue, US consumer counts, "sale" status, SBA size, B2C vs B2B or health content are unknown, report the gap as **Not assessable**.
- Severity: **Non-compliance** = covered by a state law (or CalOPPA, CAN-SPAM, TCPA, ARL) **and** a required element is missing or broken. **High risk** = litigation exposure even below thresholds (pixels/replay/chat before any choice; pixel payloads with form or health data; no accessibility basics on a US-targeted transactional site; overlays sold as compliance; fake testimonials). **Improvement** = GPC status message when not covered, WCAG 2.2 AA, AI chat label, DMCA agent if UGC is planned, consent logging, quarterly tracker scans.
- Repo checks (exclude `node_modules`, `.next`):

```bash
rg -n -g '!node_modules' -g '!.next' -i -e 'sec-gpc|globalPrivacyControl|gpp|__gpp|usprivacy|__uspapi|isGpcEnabled|dataProcessingOptions|restricted_data_processing|LDU'   # GPC handling
rg -n -g '!node_modules' -g '!.next' -i -e 'do not sell|privacy choices|opt-out|optout|limit the use'   # opt-out link/route
rg -n -g '!node_modules' -g '!.next' -i -e 'clarity\.ms|hotjar|fullstory|logrocket|mouseflow|smartlook|intercom|drift|crisp|tawk|livechat|zendesk|fbq\(|connect\.facebook\.net|snap\.licdn|_linkedin_partner_id|ttq\.|analytics\.tiktok|maskAllInputs|data-hj-allow|automaticMatching|autoConfig'   # replay/chat/pixels
rg -n -g '!node_modules' -g '!.next' -i -e 'acsbapp|accessibe|userway|audioeye|equalweb'   # overlays
rg -n -g '!node_modules' -e '@axe-core|eslint-plugin-jsx-a11y|pa11y|lighthouse'   # a11y tooling in CI
```
  - `middleware.ts` / `proxy.ts`: does it read `request.headers.get('sec-gpc')` and set an opt-out cookie or pass state to the CMP? If not and pixels exist, GPC depends entirely on the CMP; confirm with `consent.gpc.*`.
  - `next/script` pixels: gated on consent/opt-out state that **also** checks `navigator.globalPrivacyControl`?
  - Form handlers (`app/api/*`, Server Actions): where data goes (CRM, email platform) must match the policy's "categories of third parties" and service-provider list.

## Re-check before each audit
1. CPPA opt-out preference signal (OOPS) rulemaking (started Aug 2026) and "reducing friction" rulemaking (planned Nov 2026): text proposed or adopted? https://cppa.ca.gov/regulations/ccpa_updates.html, https://cppa.ca.gov/announcements/
2. CCPA CPI adjustment of thresholds and fines due 1-01-2027. https://www.cppa.ca.gov/regulations/cpi_adjustment.html
3. SB 690 effect from 1-01-2027; any 2027 bill on CIPA §631/632; *Variety Media* final opinion. https://www.bakerdonelson.com/sb-690-signed-into-law-what-it-means-for-cipa/web-tracking-litigation
4. *Salazar v. Paramount* (VPPA) decision, expected 2027. https://www.scotusblog.com/2026/10/court-appears-likely-to-allow-internet-suit-based-on-decades-old-video-privacy-law-to-go-forward/
5. New state privacy laws (2027 sessions); OK and LA (1-01-2027) and AL (1-05-2027) effective dates; NJ regulations adoption. https://www.bytebacklaw.com/2026/06/u-s-state-privacy-law-landscape-expands-to-24-states-what-the-latest-legislative-wave-means-for-businesses/, https://njconsumeraffairs.gov/ocp/Pages/NJ-Data-Privacy-Law-FAQ.aspx
6. SECURE Data Act (H.R. 8413) and any federal preemption of state privacy or AI laws. https://legiscan.com/US/bill/HB8413/
7. FTC negative option rulemaking after the March 2026 ANPRM. https://www.cov.com/en/news-and-insights/insights/2026/03/ftc-launches-new-rulemaking-on-the-negative-option-rule
8. FCC TCPA "revoke-all" rule effective date (31-01-2027). https://www.consumerfinancialserviceslawmonitor.com/2026/01/fcc-further-extends-effective-date-for-tcpa-revoke-all-rule/
9. Any DOJ Title III web rule (none expected) and the Title II compliance dates. https://www.federalregister.gov/documents/2026/04/20/2026-07663/extension-of-compliance-dates-for-nondiscrimination-on-the-basis-of-disability-accessibility-of-web
10. California AADC (*NetChoice v. Bonta*, back in district court). https://www.cooley.com/news/insight/2026/2026-03-30-netchoice-v-bonta-ninth-circuit-narrows-injunction-against-californias-ageappropriate-design-code-act

## Applicability for a non-US studio

| Law / regime | Small non-US studio, site **merely visible** to US visitors (no US marketing, no USD prices, no US clients targeted) | Studio that **targets US customers** (US office/phone, USD pricing, "we serve US clients", US ad campaigns) |
|---|---|---|
| CCPA/CPRA (business duties) | **No** (needs > $26.6M revenue, or 100k CA consumers, or ≥50% revenue from selling/sharing). Requirements are good practice | Only if a threshold is met. Most studios: **no**. But **CalOPPA still applies** |
| **CalOPPA** | **Technically yes** if it collects any PII from CA residents (contact form). Low enforcement risk | **Yes**: privacy policy with DNT and third-party tracking disclosures |
| VA-model state laws (VA, CO, UT, IA, IN, KY, TN, OR, MT, DE, NH, NJ, MN, MD, RI, OK, LA, AL, VT) | **No** (volume thresholds of 25k–100k residents; LA $25M) | Usually **no** for small studios. Check MT (25k), DE/NH/MD/RI/CT (35k), VT (3k for sensitive data or sale, 2028) |
| **Connecticut (from 1-07-2026)** | Very low practical risk | **Possibly yes regardless of volume** if it "offers personal data for sale" (pixels for valuable consideration count as sale per Foley) or processes sensitive data. Flag **Not assessable / High risk** when ad pixels exist |
| **Texas / Nebraska** | Not "doing business in TX/NE" | Covered unless an SBA small business (almost all studios are). **Small businesses still need consent before selling sensitive data** |
| WA MHMDA / NV SB 370 / CT health | Only if the site collects or infers health data | Same; **no thresholds** in WA; private right of action in WA |
| CIPA §631 / ECPA / state wiretap (pixels, replay, chat) | Low (personal jurisdiction over a foreign micro-business is unlikely) | **Real litigation exposure** if used by Californians, Pennsylvanians etc. §638.51 private suits end 1-01-2027 (SB 690) |
| VPPA | No | Only if selling or delivering video content with pixels |
| COPPA | Only if child-directed or actual knowledge of under-13s | Same |
| CAN-SPAM | **Yes** for any commercial email to US recipients (incl. B2B) | **Yes** |
| TCPA / FL FTSA / OK OTSA | Only if texting or calling US numbers | **Yes** if SMS/phone marketing |
| ADA Title III / Unruh / NY HRL | Low | **Medium–high** if e-commerce or a physical US location/showroom (nexus). Pure portfolio: low–medium |
| FTC Act §5 (policy misstatements, fake testimonials, "ADA compliant" claims) | Low (FTC can act against foreign firms affecting US consumers but rarely does against micro-businesses) | **Yes** |
| FTC Reviews Rule | Low | **Yes** (testimonials page) |
| CA ARL / SB 478 / ROSCA | Only if selling to CA/US consumers | **Yes** if B2C online sales or subscriptions |
| DMCA agent | Only if UGC and safe harbor is wanted | Same |
| AI disclosure (UT, CA SB 1001/243) | Low | Label chatbots; UT on request; SB 243 n/a for support bots |
| DOJ bulk data rule | No | No (100k+ identifiers; countries of concern) |
| DOJ Title II (gov sites) | n/a | Only for public-sector client sites (26-04-2027 / 26-04-2028) |

**Practical rule:** an EU-compliant site (prior consent for all non-essential trackers) already meets most US **state-law** requirements in substance. For any US-targeted site add: (1) **treat GPC as an opt-out/reject signal**; (2) **the CalOPPA DNT + third-party tracking paragraph**; (3) **a US/state privacy rights section**, plus a "Your Privacy Choices" link if any ad pixels exist; (4) **CAN-SPAM footer elements in newsletters**.

## Federal
**Applies when:** the site targets US consumers, emails or texts US recipients, or has specific features (video, children's content, UGC, sales). CAN-SPAM covers any commercial email to US recipients, including B2B. FTC Act §5 (deception) covers policy misstatements, fake testimonials and "ADA compliant" claims.

**Cookies and tracking:** no prior-consent rule. Google's EU user consent policy expects validated consent signals (Consent Mode v2) for **EEA** traffic only; no US-facing consent-mode requirement was found. Litigation risk:
- **Wiretap Act / ECPA**, PA WESCA, FL FSCA and WA MHMDA are still used against pixels, replay and chat (Baker Donelson, secondary).
- **Article III standing** limits federal suits. *Popa v. Microsoft* (9th Cir., 26-08-2025): Clarity session replay on a pet-store site with masked inputs, no standing; sensitive medical or financial data could change the outcome (Goldman, secondary). *Cook v. GameStop* (3d Cir., 7-08-2025): no standing under WESCA for non-sensitive browsing (KTS, secondary).
- **VPPA (18 U.S.C. §2710):** risk when a "video tape service provider" discloses PII plus the title of a viewed video to a third party (Meta Pixel `ViewContent` with video URL or title) without separate consent. $2,500 per plaintiff. *Salazar v. Paramount Global*, No. 25-459 (cert granted Jan 2026; **argued 14-10-2026**): is a newsletter subscriber a "consumer"? Justices appeared inclined to let the suit proceed; **decision expected 2027**. Low relevance to a portfolio; rises if the site sells or streams video courses/content **and** runs Meta Pixel on video pages.

**Forms and marketing:**
- **CAN-SPAM:** all commercial email, **including B2B**. **No opt-in required.** Required: accurate headers and non-deceptive subject; identification as an advertisement; **a valid physical postal address** (street, USPS PO box or registered private mailbox); **a clear opt-out** working for 30 days after sending, **honored within 10 business days**; no fee and no data beyond an email address to opt out (at most a reply or one web page visit). Check the newsletter form note and a sample email footer.
- **TCPA (SMS, calls to mobiles):** marketing texts by autodialer or prerecorded message need **prior express written consent**: clear, signed (e-sign OK), not a condition of purchase.
  - **FCC "one-to-one consent" rule vacated** by the 11th Cir. (*Insurance Marketing Coalition v. FCC*, **24-01-2025**), before its 27-01-2025 effective date (Fransis, secondary; Reed Smith).
  - **Revocation rules effective 11-04-2025:** revocation by **any reasonable means** (STOP, "unsubscribe", etc.), honored within **10 business days**; one confirmation text within 5 minutes allowed, no marketing (Kelley Drye, secondary).
  - **"Revoke-all" rule** (§64.1200(a)(10)) delayed to **31-01-2027** (CFS Law Monitor, secondary).
  - *McLaughlin Chiropractic v. McKesson* (SCOTUS, 20-06-2025): district courts are **not bound** by FCC TCPA interpretations (Faegre Drinker, secondary, headline only).
  - Website: a form collecting a **phone number with SMS marketing intent** needs a separate **unchecked** SMS checkbox and disclosure (who will text, frequency, consent not a condition of purchase, "msg & data rates may apply", STOP/HELP); keep consent logs (timestamp, IP, form version).

**Identification / imprint:** duties come from specific laws only.
- CAN-SPAM: postal address in every commercial email.
- **DMCA §512** (only if the site hosts UGC): designated agent registered in the Copyright Office directory (**$6** per designation, **expires after 3 years** unless renewed); agent's name, address, phone and email **posted on the site**. **Not needed for a static portfolio.**
- "©" notice not required; image, font and photo licences are a manual check. Terms of use: no general obligation; **browsewrap** is weakly enforceable; for sales use **clickwrap** (UNVERIFIED case law). Section 230: n/a for a studio's own content; the studio is liable for it, including testimonials.

**Selling online:**
- **FTC "Click-to-Cancel":** amended Negative Option Rule **vacated in full by the 8th Cir. on 8-07-2025** (*Custom Communications v. FTC*, procedural grounds; case name UNVERIFIED) (Crowell, secondary). **New ANPRM published 13-03-2026** (comments closed 13-04-2026); no proposed rule (Covington, secondary).
- **ROSCA (15 U.S.C. §8401–8405) still applies** to online negative-option sales: clear terms before billing, express informed consent, simple cancellation.
- **Consumer Reviews and Testimonials Rule (16 CFR 465)**, **effective 21-10-2024**: bans fake or false reviews and testimonials, including on your **own site**; incentives tied to sentiment; **undisclosed insider reviews** (staff or family must disclose); company-controlled "independent" review sites; review suppression; fake social-media indicators. Civil penalties for knowing violations. **Directly relevant to a "testimonials" / "clients say" section.**
- **Unfair or Deceptive Fees Rule (16 CFR 464)**, **effective 12-05-2025**: **only live-event tickets and short-term lodging**.

**Accessibility:**
- **ADA Title III:** **no DOJ technical rule for private websites**; courts split on whether online-only businesses are "places of public accommodation". Plaintiffs ask for **WCAG 2.1 AA** (increasingly 2.2 AA). Remedies: injunction plus attorney's fees (no damages).
- **Volume:** **3,117 federal website suits in 2025 (+27%)**; 2,452 in 2024; 3,255 in 2022. NY 1,021, FL 961, IL 585, CA only 4 (plaintiffs use state court). Website suits = 36% of Title III suits. NY plaintiffs are moving to NY and NJ **state** courts (Seyfarth).
- **DOJ Title II rule** (state/local government only; WCAG 2.1 AA). Interim final rule effective 20-04-2026: population ≥50,000 → **26-04-2027** (was 24-04-2026); under 50,000 and special districts → **26-04-2028** (was 26-04-2027). Relevant only for public-sector client sites.
- **Overlays:** **FTC v. accessiBe**, **final order 22-04-2025, $1M** (complaint Jan 2025): bars claims that the widget makes any site WCAG-compliant; covers undisclosed paid reviews. **Overlays give no safe harbor**; sites with overlays are still sued (UNVERIFIED count).
- DOJ's March 2022 web accessibility guidance may have been withdrawn in 2025 (UNVERIFIED).

**Transfers:** **DOJ bulk sensitive data rule (28 CFR Part 202).** Prohibitions from **8-04-2025**; due diligence, audit and reporting from **6-10-2025** (Debevoise, secondary). Thresholds over 12 months (§202.205): personal identifiers **>100,000 US persons**; precise geolocation >1,000 devices; biometric >1,000; health or financial >10,000; human genomic >100. Restricts data brokerage, vendor, employment and investment agreements with **countries of concern** (China incl. HK/Macau, Russia, Iran, North Korea, Cuba, Venezuela — UNVERIFIED list) or covered persons. **Negligible** for a small studio; flag only for large dataset sales or bulk processing by vendors owned from a country of concern.

**Officer, representative, registration:** none, except DMCA agent (UGC) and California data brokers.

**Children:**
- **COPPA Rule amendments:** announced 16-01-2025, published 22-04-2025, **effective 23-06-2025, compliance date 22-04-2026** (except §312.11(d)(1), (d)(4), (g)). **Separate verifiable parental consent to disclose children's data to third parties, including for targeted ads**; retention only as necessary (no indefinite retention); "personal information" includes biometric and government IDs; "mixed audience" definition; Safe Harbor transparency. Applies to sites **directed to children under 13** or with **actual knowledge**. A studio site is normally not covered.
- *Free Speech Coalition v. Paxton* (SCOTUS, 27-06-2025) upheld Texas age verification for sexually explicit sites (intermediate scrutiny). **Not relevant to a studio site**; flag age rules only if the site has accounts or a community.

**AI and other:** no federal chatbot statute; FTC Act deception applies. **EO 14365** (11-12-2025) set up a DOJ AI Litigation Task Force to challenge state AI laws. The 10-year moratorium in the 2025 reconciliation bill was stripped 99–1. A draft "Great American AI Act" (4-06-2026) was not filed and has stalled. DOJ intervened in an April 2026 challenge to Colorado's SB 205 (per Holland & Knight). **No federal statute preempts state AI laws as of 28-10-2026** (CASRAI, secondary). FTC Health Breach Notification Rule: see "Health data".

**Penalties and enforcement:** CAN-SPAM **up to $53,088 per email**. TCPA $500–$1,500 per message (UNVERIFIED). VPPA $2,500 per plaintiff. accessiBe $1M.

**Pending changes:** **SECURE Data Act, H.R. 8413** (R-Joyce), introduced 21/22-04-2026, would broadly preempt state privacy laws; pending in Energy & Commerce and Judiciary; markup status UNVERIFIED; not law. *Salazar* (2027). FTC negative option rulemaking. FCC revoke-all 31-01-2027. Title II dates.

**Sources:**
https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business ·
https://www.fransis.ai/articles/fcc-one-to-one-consent-rule-status (secondary) ·
https://www.reedsmith.com/our-insights/blogs/technology-law-dispatch/102k2uj/eleventh-circuit-vacates-fcc-one-to-one-consent-rule/ ·
https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/fcc-sets-effective-date-for-tcpa-reasonable-consent-revocation-rules (secondary) ·
https://www.consumerfinancialserviceslawmonitor.com/2026/01/fcc-further-extends-effective-date-for-tcpa-revoke-all-rule/ (secondary) ·
https://www.faegredrinker.com/en/insights/publications/2025/6/supreme-court-decides-mclaughlin-chiropractic-associates-v-mckesson-corp (secondary) ·
https://www.copyright.gov/dmca-directory/faq.html ·
https://www.crowell.com/en/insights/client-alerts/clicking-all-the-right-boxes-ftc-moves-to-revive-click-to-cancel-rule-following-eighth-circuit-vacatur (secondary) ·
https://www.cov.com/en/news-and-insights/insights/2026/03/ftc-launches-new-rulemaking-on-the-negative-option-rule (secondary) ·
https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers ·
https://www.ftc.gov/news-events/news/press-releases/2025/05/ftc-rule-unfair-or-deceptive-fees-take-effect-may-12-2025 (headline only) ·
https://www.adatitleiii.com/2026/03/federal-court-website-accessibility-lawsuit-filings-bounce-back-in-2025/ ·
https://www.federalregister.gov/documents/2026/04/20/2026-07663/extension-of-compliance-dates-for-nondiscrimination-on-the-basis-of-disability-accessibility-of-web ·
https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million ·
https://www.debevoise.com/insights/publications/2025/05/maturing-compliance-with-the-bulk-sensitive-data (secondary) ·
https://www.ecfr.gov/current/title-28/chapter-I/part-202/subpart-B/section-202.205 ·
https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule ·
https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data ·
https://www.scotusblog.com/2025/06/court-allows-texas-law-on-age-verification-for-pornography-sites (secondary, headline only) ·
https://blog.ericgoldman.org/archives/2025/08/ninth-circuit-dismisses-session-replay-lawsuit-popa-v-microsoft.htm (secondary) ·
https://ktslaw.com/blog/classaction/2025/8/third-circuit-affirms-the-dismissal-of-session-replay-class-action-for-lack-of-article-iii-standing (secondary) ·
https://casrai.org/news/federal-ai-moratorium-state-preemption-fight-2026 (secondary) ·
https://legiscan.com/US/bill/HB8413/ · https://iapp.org/news/a/secure-data-act-analysis-of-the-new-federal-privacy-bill ·
https://www.google.com/intl/en_uk/about/company/user-consent-policy-help/

### Checks — Federal
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| US-01 | Commercial emails: postal address, ad identification, working opt-out honored in 10 business days | manual: sample newsletter email | Non-compliance |
| US-02 | Newsletter form links the privacy policy and promises unsubscribe (pre-checked box = Improvement for US) | `pages.forms[].noticeNearby.privacyLink`, `pages.forms[].checkboxes[].preChecked` | Improvement (US federal law only; other regimes in scope usually make this Non-compliance) |
| US-03 | SMS marketing: separate unchecked SMS box + TCPA disclosure; consent logs | `pages.forms[].phoneField`, `pages.forms[].smsConsent`, `pages.forms[].checkboxes[]`; manual: logs | Non-compliance if no written consent at all; else High risk |
| US-04 | VPPA: no video titles/URLs sent to ad pixels from video pages | `scope.signals.video`, `consent.accept.thirdPartyRequests` (ads/social), `consent.pixelLeaks`; manual: does the site sell video? | High risk if it sells video; else Improvement |
| US-05 | Accessibility basics: axe (`wcag2a, wcag2aa, wcag21aa, wcag22aa`) on home, contact, portfolio, checkout; keyboard pass incl. CMP focus trap; labels, alt text, contrast ≥ 4.5:1, visible focus; 0 serious/critical | manual: `@axe-core/playwright` + keyboard | High risk for US-targeted e-commerce or physical-location nexus; else Improvement |
| US-06 | Overlay script present (`acsbapp|accessibe|userway|audioeye|equalweb|max-access|enable\.co\.il`) | `pages.overlays[]` | Improvement; High risk if the site claims "fully ADA compliant" |
| US-07 | Testimonials real; insider/relative reviews disclosed | manual: testimonials section, ask for sources | High risk |
| US-08 | Child-directed content or actual knowledge of under-13s | `scope.signals.kidsTerms`, `scope.signals.accounts` | Not assessable |
| US-09 | ROSCA: terms before billing, express consent, simple cancel | `scope.signals.subscription`, `scope.signals.commerce`; manual: walk checkout | Non-compliance |
| US-10 | DMCA agent designated and posted when UGC exists | `scope.signals.ugc`; manual: Copyright Office directory | Improvement |
| US-11 | Public-sector client site meets WCAG 2.1 AA by Title II dates | manual: ask | Not assessable |
| US-12 | Bulk US data to countries of concern | manual: ask | Not assessable |

## California
**Applies when:**
- **CCPA/CPRA** (1-01-2020; CPRA 1-01-2023; new regs 1-01-2026): gross revenue > **$26,625,000** (CPI-adjusted from 1-01-2025), **or** buys/sells/shares PI of ≥100,000 consumers/households, **or** ≥50% revenue from selling/sharing. Visibility alone does not trigger it.
- **CalOPPA** (Bus. & Prof. Code §§22575–22579): any **operator** of a commercial website collecting PII from **California residents**. **No revenue or volume threshold**; in principle reaches non-US operators. A contact form is enough.
- **CIPA** (Penal Code §§630 ff.): litigation against any site used by Californians running pixels, replay or chat. CA **state** courts do not apply Article III, so state-court suits remain viable (UNVERIFIED as a general statement).
- **Delete Act / DROP:** only **data brokers** (sell PI of consumers they have no direct relationship with). **A design studio is not.**

**Privacy notice:**
- **CalOPPA:** **conspicuously post** a policy; a violation exists only if not posted within **30 days of notice**. §22575(b) contents: (1) categories of PII and of third parties it is shared with; (2) review/correction process, if any; (3) how material changes are notified; (4) **effective date**; (5) **how the site responds to "Do Not Track" or other choice mechanisms**, if it collects PII over time and across third-party sites (a link to the protocol followed suffices); (6) **whether third parties may collect PII about users' activities over time and across sites** (pixels, embeds). "Conspicuous" (§22577): e.g. a homepage link containing "Privacy" in a distinguishable style (UNVERIFIED wording).
- **CCPA §7011** (covered businesses): conspicuous link **containing "privacy"** on the homepage and, from the 2026 amendments, on **any page where PI is collected** (Skadden, secondary); printable and accessible. Contents: categories of PI, sources, purposes; categories sold or shared, recipients and why; categories disclosed for business purposes; whether sensitive PI is used beyond §7027(m) purposes; all rights (know, delete, correct, opt-out of sale/sharing, limit, ADMT, non-retaliation); how to exercise them, verification, authorized agents; **how opt-out preference signals are processed and whether they apply to browser, device, account or offline**; actual knowledge of selling/sharing under-16 PI; contact details (2 request methods unless online-only); **date last updated, at least every 12 months** (Tractor Supply: policy from 2021). Job-applicant notice (Tractor Supply).
- **Notice at collection** (§7012; detail UNVERIFIED): at or before collection, e.g. near the form; categories, purposes, sale/share, retention.

**Cookies and tracking:**
- **Model:** notice + opt-out of sale/sharing. "Sharing" = disclosure for **cross-context behavioral advertising**. **Meta Pixel, LinkedIn Insight Tag and Google Ads remarketing are treated as "sharing"** (Sephora, Healthline, Tractor Supply, PlayOn).
- **"Do Not Sell or Share My Personal Information" (§7013):** **header or footer of the homepage**; opts out immediately or leads to a page that does. **"Limit the Use of My Sensitive Personal Information" (§7014):** only if sensitive PI is used beyond §7027(m). **Alternative Opt-out Link (§7015)** replaces both: **"Your Privacy Choices"** or **"Your California Privacy Choices"** with the official **toggle icon** (about the size of other header/footer icons). **Exemption:** no link needed if the business does **not sell or share** and says so.
- **Opt-out preference signals (§7025):** honor GPC as opt-out of sale/sharing for that browser/device, and the account if known. **From 1-01-2026, §7025(c)(6) and §7026(g) require a way to confirm opt-out status**, including for GPC; CPPA example: **"Opt-Out Request Honored"** plus a toggle shown as opted out. Under-16 PI is sensitive PI (§7027(m)).
- **Symmetry and dark patterns (§7004):** privacy-protective path not longer or harder. **"Accept All" + "More Information"/"Preferences" is not symmetrical; "Accept All" + "Decline All" is.** More prominent "Yes" than "No", or "Yes / Ask me later", is not symmetrical. Closing a pop-up or silence is not consent. No double negatives or confusing toggles, no false urgency, no bundling. Consent via dark patterns is void. **"Opting out must be as easy as opting in."**
- **No verification for opt-outs:** no email confirmation (Ford), no identity verification (Honda, Todd Snyder); minimum information only. **Contracts** with ad-tech, service providers and third parties need CCPA terms (Honda, Healthline, Tractor Supply).
- **AB 566 "California Opt Me Out Act"** (signed 8-10-2025): **browsers operating in CA must offer a built-in opt-out preference signal from January 2027.** Expect GPC traffic to grow sharply.
- **GPC pass criteria** (`gpc` run): no requests to `facebook.com/tr`, `connect.facebook.net`, `px.ads.linkedin.com`, `snap.licdn.com`, `googleads`/`doubleclick`, `analytics.tiktok.com`, `bat.bing.com`; or tags fire with an opt-out flag (`fbq('dataProcessingOptions',['LDU'])`, Google `restricted_data_processing`/`ads_data_redaction`); or CMP shows opt-out (OneTrust `isGpcEnabled=1`, `usprivacy=1YYN`, GPP SaleOptOut=1).
- **CIPA:**
  - **§631** (wiretapping by a third party, incl. aiding): used against Meta/TikTok pixels, **session replay**, **chat widgets** where the vendor "reads" content in transit. **§638.51** (pen register / trap and trace): pixels and beacons capturing IP and device IDs. Both **$5,000 per violation** (§637.2).
  - **SB 690 (Caballero), signed 30-09-2026, effective 1-01-2027:** new §637.2(d): **§638.51 claims arising from conduct on a website or app may be brought only by the Attorney General**; **applies to pending claims in actions commenced on or after 1-01-2025**. The broader "commercial business purpose" exemption was **removed on 2-07-2026**. **§631, §632 and §632.7 claims remain fully available.** About **4,000** pending CIPA suits estimated. The governor asked the Legislature to address other CIPA provisions next year. Chapter number UNVERIFIED (Baker Donelson, Mayer Brown, secondary).
  - *Variety Media v. Superior Court* (Cal. Ct. App. 2d Dist., No. B350578): late-Aug 2026 tentative ruling reads "pen register" technology-neutrally; no final opinion.
  - *Gutierrez v. Converse* (9th Cir., 9-07-2025, unpublished): summary judgment for defendant, no evidence Salesforce read chats in transit; Judge Bybee's concurrence: §631's first clause does not reach internet communications (NatLawReview, secondary).
- **Controls that reduce risk:** no third-party pixels, replay or chat vendors before the user acts; **consent before tags fire** is the strongest §631 defense ("Confirm consent and disclosure occur before tags fire, verify banners actually block the technologies they cover" — Baker Donelson). Replay: mask all inputs (`maskAllInputs`, Clarity "Strict"), exclude form pages, disclose. Chat: notice before the first message ("This chat is recorded and processed by <vendor>…"), vendor disclosed as service provider. Meta Pixel/CAPI: no sensitive page titles or URLs (Healthline); disable automatic advanced matching and "automatic events" on forms. Tracker inventory with **quarterly scans** (Tractor Supply order).

**Selling online:**
- **Automatic Renewal Law** (Bus. & Prof. §17600 ff., AB 2863, **effective 1-07-2025**; Fenwick, secondary): express affirmative consent; **cancel through the same medium (online = online)**; save offers only alongside a visible "click to cancel" button; **annual reminder**; 7–30 days' notice of price changes; consent records kept 3 years.
- **SB 478 (Honest Pricing Law), effective 1-07-2024:** advertised price includes **all mandatory fees** except government taxes and reasonable shipping; B2C goods and services.

**Accessibility:** **Unruh Act** (Civ. Code §51/52): **$4,000 statutory damages per violation.** *Martinez v. Cot'n Wash* (Cal. Ct. App., 1-08-2022): **online-only** business websites are not places of public accommodation; no Unruh liability without intentional discrimination. Risk remains with a **nexus to a physical location** (office, showroom) (Morgan Lewis, secondary).

**Officer, representative, registration:**
- **Data brokers (DROP):** opened to consumers Jan 2026; process deletions **from 1-08-2026 at least every 45 days**, **every 30 days from 1-01-2027 (AB 883)**; register by 31 January yearly, fee $6,000 (rising to $9,500 in 2027 per Alston); $200 per day per unprocessed request or for non-registration. The CPPA fined a **marketing firm for selling "custom audiences" without registering** (3-12-2025).
- **2026 regulations** (adopted 24-07-2025, approved by OAL and filed 22-09-2025, effective 1-01-2026). **Risk assessments** (Art. 10) before selling/sharing PI, processing sensitive PI or certain ADMT; existing processing due by **31-12-2027**; attestation and summary to the CPPA by **1-04-2028**. **Cybersecurity audits** (significant-risk processing only): 1-04-2028 (revenue > $100M), 1-04-2029 ($50–100M), 1-04-2030 (< $50M) (Skadden, secondary).

**Children:** under-16 PI is sensitive PI; higher fine for minors under 16. **AADC (AB 2273):** *NetChoice v. Bonta* (9th Cir., 12-03-2026) partly vacated the injunction; coverage, age-estimation and data-use provisions may take effect; injunction on dark-pattern provisions affirmed; back in district court (Cooley; Loeb, secondary). **AB 1043:** OS-level age signals.

**AI and other:**
- **Bot Disclosure Law (SB 1001, §17940–17943, since 1-07-2019):** disclose a bot used to **incentivize a sale or influence a vote**. UNVERIFIED.
- **SB 243 (companion chatbots):** signed 13-10-2025, **effective 1-01-2026**; **excludes customer-service bots**; must say it is AI where a reasonable person could think it is human; extra duties for known minors; private action: greater of $1,000 per violation or actual damages; annual reports from 1-07-2027 (Jones Walker, secondary). **Not applicable to a studio's support or lead chatbot.**
- **ADMT** for significant decisions: from **1-04-2027**; not relevant to a portfolio.
- For any AI chatbot recommend a visible "You're chatting with an AI assistant" label and vendor/recording disclosure (CIPA §631).

**Penalties and enforcement:** CCPA administrative fine **$2,663 per violation; $7,988 if intentional or involving minors under 16**; breach statutory damages $107–$799 per consumer per incident; adjusted every odd year (next 1-01-2027). No cure period. CCPA private action limited to data breaches. CalOPPA: AG under the UCL, up to $2,500 per violation (UNVERIFIED). On 9-09-2025 **CA, CO and CT announced a joint GPC sweep**.

| Date | Respondent | Enforcer | Amount | Website lesson |
|---|---|---|---|---|
| Aug 2022 | Sephora | CA AG | $1.2M | Trackers = "sale"; GPC ignored |
| 12-03-2025 | American Honda | CPPA | **$632,500** | **Asymmetric privacy-choice tool**; excessive verification for opt-out; authorized-agent friction; no ad-tech contracts; ordered to consult a **UX designer** |
| 6-05-2025 | Todd Snyder | CPPA | **$345,178** | Misconfigured portal: **opt-outs unprocessed for 40 days**; excessive info; ID verification for opt-out |
| 1-07-2025 | Healthline Media | CA AG | **$1.55M** | Trackers kept sending IDs and **article titles** after opt-out via link, **GPC** and banner; purpose limitation (health-revealing titles) |
| 30-09-2025 | Tractor Supply | CPPA | **$1.35M** | **GPC not honored until Jul 2024**; "Do Not Sell" webform did not stop tracker sharing; policy not updated since 2021; no job-applicant notice; **quarterly tracker scans** ordered |
| 11-02-2026 | Disney/ABC | CA AG | **$2.75M** | Opt-outs (toggle, webform, GPC) limited to one device or service |
| Mar 2026 | PlayOn Sports (GoFan) | CPPA | **$1.1M** | **Banner forced acceptance; no reject option**; "Your Privacy Choices" offered only email/phone that did not stop pixels; pointed to NAI/DAA; **OOPS not recognized** |
| Mar 2026 | Ford | CPPA | **$375,703** | **Email-link confirmation required before processing an opt-out** |
| May 2026 | General Motors | AG + DAs + CPPA | $12.75M | Sale of driving/location data (not a web-tag case) |
| 2025 (date UNVERIFIED) | Sling TV | CA AG | $530k | Streaming sweep |

**Pending changes:** **OOPS rulemaking** voted 6/7-08-2026: codify GPC; pseudonymous identifiers (cookie IDs, IP, device IDs); process signals **before** any sale or sharing; no text adopted (Alston, secondary). "Reducing friction" rulemaking planned Nov 2026. CPI adjustment, SB 690, AB 566 and DROP 30-day cycle all from January 2027; ADMT 1-04-2027.

**Sources:**
https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf ·
https://cppa.ca.gov/regulations/ccpa_updates.html ·
https://cppa.ca.gov/regulations/pdf/ccpa_statute_eff_20260101.pdf (consolidated statute; text UNVERIFIED) ·
https://www.cppa.ca.gov/regulations/cpi_adjustment.html ·
https://cppa.ca.gov/pdf/things_to_know_before_2026_updates.pdf ·
https://cppa.ca.gov/announcements/ ·
https://cppa.ca.gov/announcements/2025/20251008_2.html ·
https://www.skadden.com/insights/publications/2025/10/california-finalizes-cppa-regulations (secondary) ·
https://california.public.law/codes/business_and_professions_code_section_22575 ·
https://www.bakerdonelson.com/sb-690-signed-into-law-what-it-means-for-cipa/web-tracking-litigation (secondary) ·
https://www.mayerbrown.com/en/insights/publications/2026/10/california-invalidates-private-lawsuits-for-pen-register-website-claims (secondary) ·
https://natlawreview.com/article/no-wire-no-violation-converses-cipa-win-affirmed-ninth-circuit-court-appeals (secondary) ·
https://www.alston.com/en/insights/publications/2026/08/california-privacy-opt-out-signals-data-brokers (secondary) ·
https://privacy.ca.gov/drop-for-data-brokers/ ·
https://fenwick.com/insights/publications/california-tightens-requirements-for-automatically-renewing-subscriptions (secondary) ·
https://oag.ca.gov/hiddenfees ·
https://www.morganlewis.com/pubs/2022/08/california-appellate-court-holds-web-access-claims-against-web-only-businesses-fail-under-ada-and-unruh-act (secondary) ·
https://www.joneswalker.com/en/insights/blogs/ai-law-blog/ai-regulatory-update-californias-sb-243-mandates-companion-ai-safety-and-accoun.html (secondary) ·
https://www.cooley.com/news/insight/2026/2026-03-30-netchoice-v-bonta-ninth-circuit-narrows-injunction-against-californias-ageappropriate-design-code-act ·
Cases: https://www.reflectiz.com/blog/biggest-ccpa-fines/ (secondary, Sephora) · https://cppa.ca.gov/announcements/2025/20250312.html (Honda) · https://cppa.ca.gov/announcements/2025/20250506.html (Todd Snyder) · https://www.fenwick.com/insights/publications/california-ag-secures-record-1-55m-ccpa-settlement-against-healthline-over-targeted-ads-and-health-data-sharing (secondary, Healthline) · https://www.whitecase.com/insight-alert/california-privacy-protection-agency-issues-record-135-million-fine-against-tractor (secondary, Tractor Supply) · https://oag.ca.gov/news/press-releases/california-wont-let-it-go-attorney-general-bonta-announces-275-million (Disney) · https://sourcepoint.com/blog/ccpa-opt-out-violations-playon-sports-ford-fine/ (secondary, PlayOn, Ford) · https://oag.ca.gov/news/press-releases/when-it-comes-data-privacy-consumers-must-be-driver%E2%80%99s-seat-attorney-general (headline only, GM) · https://www.insideprivacy.com/state-privacy/california-attorney-general-announces-530000-ccpa-settlement-with-sling-tv/ (secondary, Sling TV)

### Checks — California
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| US-CA-01 | Link containing "privacy" on the homepage and every page with a form | `pages.links.privacy`, `pages.forms[]` | Non-compliance (CalOPPA) |
| US-CA-02 | CalOPPA items: PII and third-party categories, change process, effective date, **DNT response**, **third-party tracking** disclosure | `policy.items.us-ca` → `categories`, `doNotTrack`, `thirdPartyTracking`, `lastUpdated`; manual: "changes to this policy" | Non-compliance |
| US-CA-03 | Policy dated and updated within 12 months | `policy.lastUpdated`, `policy.ageDays` | Non-compliance if no date; High risk if > 365 days |
| US-CA-04 | CCPA coverage (revenue, 100k consumers, ≥50% from selling/sharing) | manual: ask | Not assessable |
| US-CA-05 | CCPA policy items: categories, sources, sale/share, rights, OOPS/GPC handling, under-16, two request methods | `policy.items.us-ca` → `categories`, `sources`, `sale/share`, `rightsList`, `optOutSignals`, `under16` | Non-compliance if covered; else Improvement |
| US-CA-06 | "We do not sell or share" while ad pixels run, or detected vendors not named | `policy.items.us-ca.sale/share` vs `consent.accept.thirdPartyRequests` (ads/social); `policy.vendors.missingFromPolicy[]` | Non-compliance (misrepresentation) |
| US-CA-07 | "Do Not Sell or Share" / "Your Privacy Choices" (+ toggle icon) in homepage header/footer when pixels exist | `pages.links.privacyChoices`; manual: icon | Non-compliance if covered; High risk if pixels and US-targeted |
| US-CA-08 | Opt-out works: pixels stop or go restricted; no email confirmation or ID check; not just NAI/DAA | manual: click through, rerun consent-check, compare `thirdPartyRequests` | Non-compliance |
| US-CA-09 | GPC honored (see pass criteria) | `consent.gpc.adRequests[]`, `consent.gpc.optOutState` | Non-compliance if covered by CCPA or a GPC state; else High risk |
| US-CA-10 | Opt-out status confirmed after GPC | `consent.gpc.confirmationText` | Non-compliance if covered; else Improvement |
| US-CA-11 | Banner symmetry ("Accept All" vs "Decline All", same layer/size/colour) | `consent.banner.symmetry`, `consent.banner.rejectSameLayer` | Non-compliance if covered; else High risk |
| US-CA-12 | No forced acceptance or cookie wall for tracking | `consent.banner.reject`; manual: close without consent and browse | Non-compliance if covered |
| US-CA-13 | No pixels, replay or chat vendors before notice or choice | `consent.no-interaction.thirdPartyRequests` (ads, social, replay, chat) | High risk; Improvement for first-party analytics |
| US-CA-14 | Replay masks inputs (canary string typed in contact form not in replay payloads) | category `replay` in `consent.*.thirdPartyRequests`; manual: canary | High risk |
| US-CA-15 | No form data, hashed emails or sensitive titles in pixel payloads (`dl`, `rl`, `cd[...]`, `ud[...]`) | `consent.pixelLeaks[]` | High risk; Non-compliance on sensitive pages |
| US-CA-16 | Chat notice before first message (recorded / vendor / AI) | `pages.chatWidgets[]`, `scope.signals.aiChat`; manual: open widget | High risk; AI label = Improvement |
| US-CA-17 | Notice at collection near forms | `pages.forms[].noticeNearby` | Non-compliance if covered; else Improvement |
| US-CA-18 | Job-applicant notice on a careers form | manual | Non-compliance if covered |
| US-CA-19 | CCPA terms in ad-tech and vendor contracts | manual: ask | Not assessable |
| US-CA-20 | Auto-renewal: consent box, terms near button, online cancel, "click to cancel" next to save offers, annual reminder | `scope.signals.subscription`; manual: walk flow | Non-compliance |
| US-CA-21 | Prices include all mandatory fees (SB 478) | `scope.signals.commerce`; manual: list vs checkout | Non-compliance |
| US-CA-22 | Accessibility failures with a CA physical location | `pages.identification.address` + US-05 | High risk |
| US-CA-23 | Data-broker status (e.g. selling "custom audiences") | manual: ask | Not assessable |

## Other state privacy laws
**Applies when:** the business meets a state's threshold for that state's residents (per calendar year). Visibility alone does not trigger these laws, except no-threshold states (TX, NE, unless SBA small) and any-volume coverage (CT for sensitive data or sale; VT for consumer health data from 2028). **24 states**: about 20 at the start of 2026 plus 4 enacted in 2026 (OK, AL, LA, VT) (ByteBack, secondary). Florida is sometimes left out because its $1B threshold makes it a de-facto big-tech law. Enforcement by the state AG only; **no general private right of action.** Main per-state source: ComplyJet (secondary); GPC cites: ComplyFine (secondary).

| State (law) | In force | Applicability threshold (per calendar year, residents of that state) | Universal opt-out (GPC) must be honored | Cure period |
|---|---|---|---|---|
| **California** (CCPA/CPRA) | 1-01-2020; CPRA 1-01-2023; new regs 1-01-2026 | Gross revenue > **$26,625,000**, **or** buys/sells/shares PI of ≥100,000 consumers/households, **or** ≥50% revenue from selling/sharing | **Yes** (regs §7025; since 2023) | None |
| Virginia (VCDPA) | 1-01-2023 | ≥100,000 consumers, or ≥25,000 + >50% revenue from sales | No | 30 days, permanent |
| **Colorado** (CPA) | 1-07-2023 | ≥100,000, or ≥25,000 + any revenue/discount from sales | **Yes, from 1-07-2024** (GPC named by the AG) | Expired 1-01-2025 |
| **Connecticut** (CTDPA) | 1-07-2023; **SB 1295 amendments 1-07-2026** | **≥35,000** (from 1-07-2026), **or ANY volume if it processes sensitive data or offers personal data for sale** | **Yes, from 1-01-2025** | Mandatory cure ended 31-12-2024 |
| Utah (UCPA) | 31-12-2023 | Revenue > $25M **and** (≥100,000, or ≥25,000 + >50% revenue from sales) | No | 30 days, permanent |
| **Texas** (TDPSA) | 1-07-2024 | **No volume threshold.** Doing business in TX or products consumed by Texans, **except SBA small businesses, which still need consent before selling sensitive data** | **Yes, from 1-01-2025** (authorized-agent route) | 30 days, permanent |
| **Oregon** (OCPA) | 1-07-2024 | ≥100,000, or ≥25,000 + ≥25% revenue from sales | **Yes, from 1-01-2026** | Ended 1-01-2026 |
| Florida (FDBR) | 1-07-2024 | Full duties: >$1B global revenue + platform criteria. Sensitive-data sale notice applies to any for-profit business | No | 45 days, discretionary |
| **Montana** (MCDPA) | 1-10-2024 | **≥25,000**, or ≥15,000 + >25% revenue from sales (lowered in 2025) | **Yes, from 1-01-2025** | Expired (by 1-04-2026) |
| Iowa (ICDPA) | 1-01-2025 | ≥100,000, or ≥25,000 + >50% revenue from sales | No | 90 days |
| **Delaware** (DPDPA) | 1-01-2025 | **≥35,000**, or ≥10,000 + >20% revenue from sales | **Yes, from 1-01-2026** | Mandatory cure ended 31-12-2025 |
| **Nebraska** (NDPA) | 1-01-2025 | **Same as Texas** | **Yes, from 1-01-2025** | 30 days, permanent |
| **New Hampshire** (NHPA) | 1-01-2025 | ≥35,000, or ≥10,000 + >25% revenue from sales | **Yes, from 1-01-2025** | Mandatory cure ended 31-12-2025 |
| **New Jersey** (NJDPA) | 15-01-2025 | ≥100,000, or ≥25,000 + any revenue from sales. Regulations proposed 2025, adoption UNVERIFIED | **Yes, from 15-07-2025** (NJ DCA FAQ) | 30 days until 1-07-2026 |
| Tennessee (TIPA) | 1-07-2025 | Revenue > $25M **and** (≥175,000, or ≥25,000 + >50% revenue from sales) | No | 60 days |
| **Minnesota** (MCDPA) | 31-07-2025 | ≥100,000, or ≥25,000 + >25% revenue from sales. SBA small businesses exempt except selling sensitive data without consent (UNVERIFIED detail) | **Yes, from 31-07-2025** | Ended 31-01-2026 |
| **Maryland** (MODPA) | 1-10-2025 (processing from 1-04-2026) | ≥35,000, or ≥10,000 + >20% revenue from sales | **Yes** (statute ambiguous per one source; treat as required) | Discretionary until 1-04-2027 |
| Indiana (ICDPA) | 1-01-2026 | ≥100,000, or ≥25,000 + >50% revenue from sales | No | 30 days, permanent |
| Kentucky (KCDPA) | 1-01-2026 | ≥100,000, or ≥25,000 + >50% revenue from sales | No | 30 days, permanent |
| Rhode Island (RIDTPPA) | 1-01-2026 | ≥35,000, or ≥10,000 + >20% revenue from sales | No | **None**; up to $10,000 per violation |
| Oklahoma (SB 546) | **1-01-2027** | ≥100,000, or ≥25,000 + >50% revenue from sales | Not in statute (per DWT) | 30 days, permanent |
| Louisiana (SB 386, LDPA) | **1-01-2027** | Revenue > **$25M**, or ≥75,000 consumers/households/devices, or ≥50% revenue from sales | No standalone UOOM; authorized agent via browser or extension allowed | 1-01-2027 to 31-07-2027 only |
| Alabama (HB 351, APDPA) | **1-05-2027** | >25,000, or >25% revenue from sales. **Under 500 employees exempt unless they sell personal data** | **No** (GPC clause removed) | 45 days, permanent; up to $15,000 |
| Vermont (S.71, Act No. 145 (2026), VDPOSA) | **1-01-2028** | In the preceding calendar year: **≥35,000** consumers; **or ≥3,000 consumers' sensitive data**; **or offering for sale the data of ≥3,000 consumers** (§ 2415b; data used solely for payment excluded); consumer health data at any volume | **Yes, from 1-01-2028** (9 V.S.A. § 2415e(d)(2)(C); signal sent with the consumer's consent, **not on by default**) | 60 days (AG), 1-01-2028 to 30-06-2029 |

Signing dates: OK 20-03-2026; AL 17-04-2026; LA 29-05-2026; VT 16-06-2026.

**Privacy notice** (Virginia/Connecticut model; UNVERIFIED unless stated): categories of data, purposes, categories of third parties; rights and how to exercise them, **including appeal**; whether data is sold or used for targeted ads, with a clear opt-out method.
- **Connecticut (SB 1295, 1-07-2026; Foley, secondary):** disclose **LLM training** use; reachable via a **homepage link containing "privacy"**; offered in **every language the controller uses** and accessible. Broad "sale": ad-network cookies and tracking pixels given as examples.
- **Texas:** if applicable, the exact notices **"NOTICE: We may sell your sensitive personal data."** and **"NOTICE: We may sell your biometric data."**

**Cookies and tracking:**
- Opt-out of sale, targeted advertising, and profiling with legal or similarly significant effects. GPC mandatory in the "Yes" states.
- **Vermont (Act No. 145 (2026), "An act relating to consumer data privacy and online surveillance", signed 16-06-2026, effective 1-01-2028; enacted text):**
  - **§ 2415e(d)(2)(C):** consumers can opt out of targeted advertising and sale **through an opt-out preference signal sent with the consumer's consent**. The mechanism must (i) not unfairly disadvantage another controller; (ii) **not be on by default**; (iii) be consumer-friendly; (iv) be as consistent as possible with similar federal or state mechanisms; (v) let the controller determine Vermont residency and legitimacy. The signal duty has no separate date.
  - **§ 2415e(d)(3):** honor the signal even if it conflicts with a controller-specific setting or loyalty programme; the controller may notify the consumer and offer to confirm the existing setting.
  - **§ 2415e(d)(2)(B):** a clear and conspicuous opt-out link is also required.
- **Opt-in consent for sensitive data** in every state except CA (CA uses "limit") (Koley Jessen, DWT; secondary). Sensitive usually = health, sexual orientation, religion, race/ethnicity, citizenship/immigration, genetic/biometric, precise geolocation, children's data. **Maryland bans sale of sensitive data outright.** **Oregon (1-01-2026) and Virginia (SB 338, 1-07-2026) ban sale of precise geolocation** (Baker Data Counsel, secondary).
- Dark patterns do not produce valid consent (CO, CT and others). **Data protection assessment** for targeted ads, sale and sensitive data.

**Forms and marketing:** state mini-TCPAs.
- **Florida FTSA** (HB 761, effective 25-05-2023; Manatt, secondary): autodialer = "select **and** dial"; only "unsolicited" calls; **for texts the consumer must first reply STOP, and the sender has a 15-day safe harbor before suit.**
- **Oklahoma OTSA (2022):** FTSA clone; prior express written consent for automated marketing calls/texts; private right of action. UNVERIFIED.
- Others (MD "Stop the Spam Calls Act", WA, NJ). UNVERIFIED.

**Selling online:** other state automatic-renewal laws (NY, CO, VA, MN, etc.). UNVERIFIED.

**Accessibility:** **New York** NYSHRL/NYCHRL used in state court with compensatory damages; NY courts more receptive to standalone websites. UNVERIFIED.

**Children** (Loeb, secondary): **CT** no targeted ads or sale for ages 13–17 (from 1-07-2026). **Maryland Kids Code** effective 1-10-2024, challenged, **not enjoined**. **Vermont AADC (S 69)** effective 1-01-2027, **no business threshold**, reportedly triggered at about 2% of audience under 18. **Nebraska AADC (LB 504)** effective 1-01-2026, broadened by LB 838 (17-07-2026). App-store acts: TX (injunction stayed by 5th Cir. 28-05-2026), UT (main parts 6-05-2027), LA (delayed to 1-07-2027). Social-media minor laws in mixed litigation. Flag only with accounts or a community.

**AI and other:**
- **Utah AI Policy Act** (SB 226, 2025; FPF): **disclose generative AI when the consumer clearly asks**, or proactively in "high-risk" interactions (sensitive data + significant decisions in financial, legal, medical, mental-health contexts). Safe harbor for upfront disclosure. **SB 332 extends it to July 2027.**
- **Colorado:** SB 24-205 **repealed and replaced by SB 26-189** (signed 14-05-2026, **effective 1-01-2027**): ADMT in consequential decisions (education, employment, housing, finance, insurance, healthcare, government services). **Inform/generate-only chat tools excluded**; no general chatbot disclosure duty. AG only, 60-day cure (Holland & Knight, secondary; Davis+Gilbert).

**Penalties and enforcement:** TX up to $7,500 per violation after 30-day cure (Texas AG). RI up to $10,000, no cure. AL up to $15,000. VT: **no private right of action** (§ 2415j(a)); AG notice-and-cure (60 days) 1-01-2028 to 30-06-2029. **Consortium of Privacy Regulators** formed 16-04-2025; MN and NH joined 8-10-2025. CA/CO/CT GPC sweep 9-09-2025.

**Pending changes:** OK and LA 1-01-2027; AL 1-05-2027; VT 1-01-2028; VT AADC and Colorado AI Act 1-01-2027; Utah AI Act to July 2027; NJ regulations; SECURE Data Act preemption (see "Federal").

**Sources:**
https://www.bytebacklaw.com/2026/06/u-s-state-privacy-law-landscape-expands-to-24-states-what-the-latest-legislative-wave-means-for-businesses/ (secondary) ·
https://www.complyjet.com/blog/us-state-privacy-laws-list (secondary) ·
https://www.complyfine.com/us-privacy-laws/universal-opt-out-signals-by-state (secondary) ·
https://njconsumeraffairs.gov/ocp/Pages/NJ-Data-Privacy-Law-FAQ.aspx ·
https://www.koleyjessen.com/insights/publications/new-state-privacy-laws-effective-january-1-2026-indiana-kentucky-and-rhode-island (secondary; IN, KY, RI) ·
https://www.dwt.com/blogs/privacy--security-law-blog/2026/03/oklahoma-privacy-law-sb-546 (secondary; OK) ·
https://www.hunton.com/privacy-and-cybersecurity-law-blog/alabama-becomes-21st-state-with-comprehensive-consumer-privacy-law (secondary; AL) ·
https://www.dwt.com/blogs/privacy--security-law-blog/2026/05/alabama-personal-data-protection-act-key-takeaways (secondary; AL) ·
https://www.dwt.com/blogs/privacy--security-law-blog/2026/06/louisiana-data-privacy-act-sb-386 (secondary; LA) ·
https://www.cooley.com/news/insight/2026/2026-06-29-small-state-big-bite-what-sets-vermonts-new-privacy-law-apart (secondary; VT) ·
https://www.mayerbrown.com/en/insights/publications/2026/06/vermont-enacts-comprehensive-consumer-privacy-law (secondary; VT) ·
https://legislature.vermont.gov/Documents/2026/Docs/ACTS/ACT145/ACT145%20As%20Enacted.pdf (VT Act 145 as enacted) ·
https://www.foley.com/insights/publications/2026/07/connecticut-dramatically-expands-its-data-privacy-act-what-businesses-need-to-know-now/ (secondary; CT) ·
https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-privacy-rights/texas-data-privacy-and-security-act ·
https://www.bakerdatacounsel.com/blogs/state-privacy-in-brief-q1-2026/ (secondary) ·
https://cppa.ca.gov/announcements/ ·
https://manatt.com/Insights/Newsletters/TCPA-Connect/Florida-Amends-FTSA (secondary) ·
https://www.loeb.com/en/insights/publications/2026/06/childrens-online-privacy-2026-state-app-store-design-code-and-social-media-laws (secondary) ·
https://fpf.org/blog/chatbots-in-check-utahs-latest-ai-legislation/ ·
https://www.hklaw.com/en/insights/publications/2026/05/colorado-governor-signs-sb-189 (secondary) ·
https://www.dglaw.com/what-to-know-about-colorados-repeal-and-replacement-of-its-landmark-ai-act/

### Checks — Other state privacy laws
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| US-ST-01 | Coverage per state (resident counts, revenue share from sales, SBA size, AL headcount) | manual: ask | Not assessable |
| US-ST-02 | GPC honored for GPC states | as US-CA-09 | Non-compliance if covered; else High risk |
| US-ST-03 | Rights section incl. **appeal**; sale/targeted-ads disclosure with opt-out method | `policy.items.us-ca.rightsList`, `policy.items.us-ca.sale/share`; manual: "appeal" | Non-compliance if covered; else Improvement |
| US-ST-04 | CT: homepage "privacy" link; policy in every site language; LLM-training disclosure | `pages.links.privacy`; `scope.pages[].htmlLang`, `scope.hreflang[]` vs `policy.lang`; manual: ask about training | Non-compliance if CT-covered |
| US-ST-05 | CT any-volume coverage when ad pixels exist | `consent.accept.thirdPartyRequests` (ads/social) | Not assessable / High risk |
| US-ST-06 | Sensitive data only with opt-in; no sensitive-data sale in MD; no precise-geolocation sale in OR/VA | `scope.signals.healthTerms`, `pages.forms[]`; manual: ask | Not assessable |
| US-ST-07 | Texas "NOTICE: We may sell…" strings if selling sensitive/biometric data | manual: policy text | Non-compliance if applicable |
| US-ST-08 | FL/OK SMS programs | `pages.forms[].smsConsent`; manual: ask | High risk |
| US-ST-09 | AI chatbot discloses AI on request (UT) | `scope.signals.aiChat`; manual: ask the bot "Am I talking to a human?" | Improvement |
| US-ST-10 | Kids codes (MD, VT, NE, CT 13–17) with accounts or minor audience | `scope.signals.kidsTerms`, `scope.signals.accounts` | Not assessable |
| US-ST-11 | Data protection assessment for targeted ads, sale or sensitive data | manual: ask | Not assessable |

## Health data (WA, NV, CT)
**Applies when:** the site collects or infers consumer health data. Low relevance to a studio's own site **unless** it offers health-related content, booking or products; the audit may also cover a **client** site (clinic, wellness). **Flag pixels on health-related pages as High risk.**
- **Washington My Health My Data Act (RCW 19.373):** **no thresholds**, small businesses included. Core duties from **31-03-2024** (small businesses **30-06-2024**); geofencing ban since 23-07-2023. "Consumer health data" includes **inferences** (e.g. browsing a therapy page or a pregnancy-related product).
- **Nevada SB 370 (NRS 603A):** effective **31-03-2024**; entities doing business in NV or targeting NV consumers (McDermott, secondary).
- **Connecticut (SB 3, 2023):** health data provisions effective **1-07-2023**; after SB 1295, any controller processing sensitive data is covered regardless of volume.
- **FTC Health Breach Notification Rule (16 CFR 318):** amended 26-04-2024; **non-HIPAA health apps and similar technologies** (vendors of personal health records). Effective 29-07-2024 (UNVERIFIED).

**Privacy notice:** WA: **separate "Consumer Health Data Privacy Policy" linked prominently from the homepage.** NV: consumer health data privacy policy.

**Cookies and tracking:**
- WA: **separate consent** to collect and to share; selling requires a signed authorization.
- NV: consent to collect and share; selling requires written authorization.
- CT: consent to sell; **geofence ban within 1,750 ft** of mental, reproductive or sexual health facilities.
- FTC HBNR: **"breach of security" includes unauthorized disclosure**, e.g. to ad platforms via pixels or SDKs (GoodRx, Premom); notice to the FTC within 60 days for 500+ people. The 2021 policy statement was withdrawn as obsolete 9-09-2026.

**Penalties and enforcement:** WA **private right of action** via the Consumer Protection Act; first class action *Maxwell v. Amazon* (filed 10-02-2025, Amazon Ads SDK), early motion practice (Enzuzo, secondary). NV: **no private right of action.** Healthline ($1.55M, CCPA): health-revealing titles sent to trackers.

**Pending changes:** **New York Health Information Privacy Act (S.929) vetoed 19-12-2025** (UNVERIFIED; EBG, secondary). Vermont covers consumer health data at any volume from 1-01-2028.

**Sources:**
https://app.leg.wa.gov/RCW/default.aspx?cite=19.373.020 ·
https://www.enzuzo.com/blog/washington-mhmda (secondary) ·
https://www.mcdermottlaw.com/insights/nevada-and-connecticut-pass-consumer-health-data-laws/ (secondary) ·
https://www.foley.com/insights/publications/2026/07/connecticut-dramatically-expands-its-data-privacy-act-what-businesses-need-to-know-now/ (secondary) ·
https://www.ebglaw.com/health-law-advisor/new-yorks-health-information-privacy-act-poised-to-become-the-latest-in-a-growing-trend-of-state-data-privacy-laws (secondary) ·
https://www.ftc.gov/news-events/news/press-releases/2024/04/ftc-finalizes-changes-health-breach-notification-rule ·
https://www.ftc.gov/news-events/news/press-releases/2026/09/ftc-withdraws-obsolete-policy-statement

### Checks — Health data
| ID | Check | How (script field or manual) | Severity |
|---|---|---|---|
| US-WA-01 | Health-related content, booking or products present | `scope.signals.healthTerms`; manual: ask | Not assessable |
| US-WA-02 | Separate "Consumer Health Data Privacy Policy" linked from the homepage | `pages.links.healthPolicy` | Non-compliance if health data is collected or inferred |
| US-WA-03 | No ad pixels or sharing on health pages before separate consent | `consent.no-interaction.thirdPartyRequests`, `consent.reject.thirdPartyRequests` (ads/social/replay) on health pages | Non-compliance if health data collected or inferred; else High risk |
| US-WA-04 | No health-revealing titles, URLs or fields in pixel payloads | `consent.pixelLeaks[]` | Non-compliance |
| US-WA-05 | Health data sold only with signed authorization | manual: ask | Not assessable |
| US-NV-01 | NV: health data policy and consent when targeting NV | `pages.links.healthPolicy`; manual: consent flow | Non-compliance if applicable |
| US-CT-01 | CT: consent before selling health data; no geofencing near facilities | manual: ask | Not assessable |

## Comparison table — United States

| Jurisdiction | Mere visibility triggers? | Cookie / tracking model | Officer / registration | Marketing consent | Notice language |
|---|---|---|---|---|---|
| Federal | CAN-SPAM for any commercial email to US recipients; else feature-driven | No cookie rule; wiretap/VPPA litigation | DMCA agent if UGC | Email opt-out (CAN-SPAM); SMS prior express written consent (TCPA) | Not specified |
| California | CalOPPA yes if PII from CA residents; CCPA no (thresholds) | Notice + opt-out of sale/sharing; GPC + status confirmation; symmetric choices; CIPA favors consent before tags fire | Data brokers register; risk assessments, cyber audits if covered | Federal rules | Not specified; policy accessible |
| VA-model states | No (thresholds) | Opt-out of sale/ads/profiling; GPC in CO, OR, MT, DE, NH, NJ, MN, MD (VT 2028); opt-in for sensitive | Data protection assessments | Federal rules; FL/OK mini-TCPAs | Not specified |
| Connecticut | Any volume if sensitive data or sale (pixels) | Opt-out + GPC; opt-in sensitive; no ads to 13–17 | Data protection assessments | Federal rules | Every language the controller uses |
| Texas / Nebraska | Doing business there, unless SBA small | Opt-out + GPC; consent to sell sensitive data even if small | Data protection assessments | Federal rules | Not specified; TX fixed "NOTICE" strings |
| Washington (MHMDA) | Yes if health data collected/inferred | Separate consent to collect and share; signed authorization to sell | None | Federal rules | Not specified |
| Nevada (SB 370) | Doing business in or targeting NV with health data | Consent to collect/share; written authorization to sell | None | Federal rules | Not specified |
