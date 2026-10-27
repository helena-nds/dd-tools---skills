# VERIFY — qa-ecodesign (translated from qa-ecodiseno) — agent a2

Test app: fixture copy at /home/claude/work/en-a2/app on port 3102 (next start). Original `peso-co2.mjs` in /tmp/a2-orig-eco, translated `page-weight-co2.mjs` in /tmp/qa-ecodesign. Both use `@tgwf/co2@0.19` (npm) and the Playwright symlink.

## Commands
```bash
node --check page-weight-co2.mjs                                                         # OK
node page-weight-co2.mjs http://localhost:3102 / /servicios /contacto --grid=ESP > eco.json
node peso-co2.mjs        http://localhost:3102 / /servicios /contacto --grid=ESP > eco2.json   # original
```

## Original vs translated (identical numbers and findings)
| Page | kB | requests | repeat kB | g CO2e global (rating) | ESP | issues (sev) |
|---|---|---|---|---|---|---|
| / | 296.4 / 296.4 | 14 / 14 | 1.1 / 1.1 | 0.0439 A / same | 0.0239 / same | low×3 / low×3 |
| /servicios | 290 / 290 | 15 / 15 | 0.9 / 0.9 | 0.0430 A / same | 0.0234 / same | medium + low×5 / same |
| /contacto | 287.9 / 287.9 | 11 / 11 | 0.6 / 0.6 | 0.0427 A / same | 0.0232 / same | low×3 / low×3 |

The average is 291.4 kB in both. The issue messages match one to one (YouTube embed, fonts 141.3 kB, failed third-party requests) and differ only in language.

## Changes beyond plain translation
- Script renamed `peso-co2.mjs` to `page-weight-co2.mjs`. JSON keys are now in English (`transferenciaKB`→`transferKB`, `inicialKB`→`initialKB`, `trasScrollKB`→`afterScrollKB`, `repetidaKB`→`repeatKB`, `co2gPorVisita`→`co2gPerVisit`, `porOrigen`→`byOrigin`, `presupuesto`→`budget`, `mediaKB`→`averageKB`, `(propio)`→`(first-party)`, …). The prose was updated to match.
- Green Web Foundation user agent changed from `qa-ecodiseno` to `qa-ecodesign`.
- Decimal commas in the prose became decimal points (0,055 → 0.055; 2.559 kB → 2,559 kB). The values themselves are unchanged.
- Cross-references updated: qa-performance-cwv, qa-analytics, qa-legal-spain, qa-responsive-browsers. The report is now `ecodesign.md`. Added the "Write the report in the user's language." sentence.

## Byte identity / description / leftovers
- The embedded script is byte-identical to scripts/page-weight-co2.mjs.
- Description is 549 chars with no angle brackets.
- The leftover-Spanish grep found only false positives (× and ·).

## Not verifiable
- Green hosting branch (`--green=auto` on a public host): the fixture is localhost, so the Green Web Foundation API was not called. The code is unchanged apart from message strings.
- Third parties (Google Fonts, GTM, YouTube, Unsplash) fail through the sandbox proxy, so their weight was not measured. The result is the same for the original and the translation.
