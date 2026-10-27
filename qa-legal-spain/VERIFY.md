# VERIFY — qa-legal-spain (translated from auditoria-legal-web-es, /home/claude/build/out/legal/SKILL.md) — agent a2

Originals: /home/claude/build/legal/consent-check.mjs and pages-check.mjs, copied to /tmp/a2-orig-legal. Translations are in /tmp/qa-legal-spain.

## Commands
```bash
node --check consent-check.mjs && node --check pages-check.mjs                       # OK
# 1) fixture (next start on 3102)
node consent-check.mjs http://localhost:3102/ /contacto /servicios > consent.json
node pages-check.mjs  http://localhost:3102/ /contacto > pages.json
# 2) a static test site I wrote with a cookie banner, to exercise the accept/reject branches the fixture lacks
#    (/home/claude/work/en-a2/banner-site, served with python http.server on 3102 after stopping next)
node consent-check.mjs http://localhost:3102/ /contacto/ > consent-banner.json
node pages-check.mjs  http://localhost:3102/ /contacto/ > pages-banner.json
```
The same commands were run with the original scripts.

## Original vs translated (identical except language)
- Fixture, consent:
  - no-interaction: 0 cookies; third-party requests fonts.googleapis.com (tracker, 3), www.googletagmanager.com (tracker, 3), images.unsplash.com (1) and www.youtube.com (tracker, 1), all in the before-interaction phase. Identical in both.
  - reject/accept: no banner. Both versions report "button not found in the first layer".
- Fixture, pages: legal-notice link found. /contacto has a pre-checked `privacidad` checkbox and no basic layer. The aviso legal has no NIF, email, registry or address, and its obsolete list is ["Privacy Shield"]. Identical in both.
- Banner site, consent:
  - Same accept/reject button styles in both.
  - reject: only the `consent` cookie (400 days).
  - accept: `consent` plus `_ga`, flagged as a suspected tracker, and the localStorage key `_hjTrack`. Identical in both.
- Banner site, pages: all 4 footer links found; checkboxes `privacidad` (required) and `newsletter` (pre-checked); basic layer complete; NIF B12345678, email, registry, volume/folio and address detected; obsolete list ["LOPD 15/1999"]. Identical in both.

## Changes beyond plain translation
- JSON keys and mode/phase values are in English: `sin-interaccion/rechazar/aceptar`→`no-interaction/reject/accept`, `antes-de-interactuar`→`before-interaction`, `despues-de-*`→`after-*`, `sospechosaDeSeguimiento`→`suspectedTracker`, `duracionDias`→`durationDays`, `iframesTerceros`→`thirdPartyIframes`, `peticionesTerceros`→`thirdPartyRequests`, `paginas`→`pages`, `casillas.premarcada`→`checkboxes.preChecked`, `capaBasica`→`basicLayer`, `textoCercano`→`nearbyText`, `avisoLegal`→`legalNotice`, …). The prose was updated to match.
- Output file `paginas.json` became `pages.json`. The tool dir became /tmp/qa-legal-spain and the report is now `qa-legal-spain.md`.
- Unchanged:
  - the ACCEPT/REJECT regexes;
  - the regexes matching Spanish page text (responsable, finalidad, derechos, privacidad, aviso legal, denuncia, registro mercantil, tomo/folio, calle/avda…);
  - the obsolete-term list;
  - es-ES/Europe/Madrid.
- Spanish legal terms are kept with an English gloss on first use. The closing disclaimer is given in English and in the original Spanish. Added the "Write the report in the user's language." sentence.

## Byte identity / description / leftovers
- Both embedded scripts are byte-identical to scripts/*.mjs.
- Description is 629 chars with no angle brackets.
- Remaining Spanish: only the glossed legal terms, quoted AEPD wording and regex/string literals.

## Not verifiable
- No real CMP was tested (Cookiebot, OneTrust, iframe-rendered banners), and neither was the withdrawal flow in 4.2 (it is manual).
- Step 0 web checks on regulatory news are a runtime task for whoever runs the skill. The legal content was translated, not re-verified.
