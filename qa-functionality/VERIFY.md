# VERIFY — qa-functionality (translated from qa-funcionalidad) — agent a2

Test app: copy of /home/claude/fixture-next in /home/claude/work/en-a2/app, `next build` + `next start -p 3102`.
Originals run from /tmp/a2-orig-func (copies of /home/claude/qa-skills/qa-funcionalidad/scripts), translations from /tmp/qa-functionality. Playwright symlinked from /opt/npm-tools.

## Commands
```bash
for f in *.mjs; do node --check $f; done                     # 5/5 OK
B=http://localhost:3102
node crawl-links.mjs $B --app-dir=/home/claude/work/en-a2/app/app --external --out=links.json
node smoke.mjs $B / /servicios /contacto /aviso-legal --out=smoke.json
node nav.mjs $B / --out=nav-home.json
node forms.mjs $B/contacto --out=forms.json
node forms.mjs $B/contacto --mode=staging --out=forms-stg.json
node forms.mjs https://www.example.es/contacto --mode=staging   # production guard
node gen-tests.mjs gen.spec.ts --routes=/,/servicios,/contacto --forms=/contacto
```

## Original vs translated (identical except language)
| Script | Original | Translated |
|---|---|---|
| crawl-links | 4 pages, 7 links; externo-bloquea-bots 5, clicable-no-enlace 1, enlace-interno-roto 1, blank-sin-rel 1 | 4 pages, 7 links; external-blocks-bots 5, clickable-not-link 1, broken-internal-link 1, blank-without-rel 1. Same 8 findings (sev, href, repeat count) after mapping Alto/Medio/Bajo to High/Medium/Low |
| smoke | per route desktop/mobile issues 2/2, 4/4, 2/2, 2/2; hydration 0; no-JS ratio 1; 404 HTTP 404, Next default true, home link false | identical counts per category (console, exceptions, hydration, failedRequests, http4xx5xx), same ratios, same 404 result |
| nav | no header/nav links (desktop and mobile), 0 anchors, history all true | same verdicts, 0 anchors, history all true |
| forms (block) | 1 form, 4 fields, 3 without label; empty→1 request, invalid email→1, double click→2, button not disabled, no antispam | identical |
| forms (staging, localhost) | server with empty data: HTTP 200 | identical |
| forms guard | n/a | non-staging host refused, exit 2 |
| gen-tests | spec with 3 routes, 1 form | same spec; diff only in comments, test titles, mock body text and the made-up 404 probe path |

## Changes beyond plain translation
- JSON keys and finding type ids are in English (e.g. `rutas`→`routes`, `sinJs.ratioTextoSinJs`→`noJs.noJsTextRatio`, `enlace-interno-roto`→`broken-internal-link`, `veces`→`count`, `paginas`→`pageCount` because `pages` already exists). The prose tables were updated to match.
- Made-up 404 probe path `/qa-no-existe-` became `/qa-missing-page-` in smoke.mjs and gen-tests.mjs. It only needs to be a URL that does not exist.
- Unchanged: Spanish site literals (`'Prueba QA'`, `'[QA] Mensaje de prueba automática. Ignorar.'`, `'esto-no-es-un-email'`, `/tel|phone|movil|telefono/`, `/privacidad|acepto|consent|rgpd|terms/`, `aria-label*="men"`), `es-ES` locale, the Spanish routes, and the visitor-facing Spanish text in the Next snippets (English comments added).
- Cross-references: `qa-accesibilidad`→`qa-accessibility`, `auditoria-legal-web-es`→`qa-legal-spain`. Report file is now `qa-functionality.md`. Added the "Write the report in the user's language." sentence.

## Byte identity
All 5 scripts embedded in SKILL.md are byte-identical to scripts/*.mjs: checked with a Python regex extraction. Description is 521 chars with no angle brackets.

## Leftover Spanish
grep for ` el | la | de | que | con |ción|Paso|hallazgo|[áéíóúñ¿]`: only the allowed Spanish literals listed above, plus "Cómo llegar" (glossed).

## Not verifiable
- Did not run the generated spec with `npx playwright test`: @playwright/test is not installed and the brief says not to install it in the project.
- External link checks returned 403 through the sandbox proxy (external-blocks-bots). The 2xx/4xx external branches were not exercised.
- Real email delivery and real-phone checks are manual steps.
