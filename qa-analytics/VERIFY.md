# VERIFY — qa-analytics (agent a6b, port 3106)

Source: /home/claude/qa-skills/qa-analitica/SKILL.md (embedded scripts identical to its scripts/). I translated it from scratch.
Tools dir: /tmp/qa-analytics (es/ original, en/ translated, Playwright symlinked from /opt/npm-tools). I used `gtag-stub.js` copied from the original scripts/test/.
Test apps, each served on port 3106 one at a time:
- /home/claude/work/en-a6b/app: fixture copy.
- /home/claude/work/en-a6b/medida: copy of the original tester's variant. It has a banner, GA4 with Consent Mode, Plausible, Vercel Analytics, next/link, tel/mailto/WhatsApp/PDF, and a form with generate_lead. Seeded faults: manual page_view, mailto without an event, G-TEST123456.
- /home/claude/work/en-a6b/avanzado/index.html, served with `python3 -m http.server`: advanced Consent Mode.

## Commands
- Extracted the 2 scripts into scripts/ and ran `node --check`: OK. Re-extracted and ran `diff -r` against scripts/: byte-identical. scripts/ is also identical to the tested en/ copies.
- Token diff (comments removed): only strings changed, plus renames.
  - analytics-static: keys `proveedores/carga/eventos/interaccionesSinEventoEnArchivo/pageViewManual/avisos/paquetes/resumen/donde/vacia/tipo/aviso/evento/soloConsole/...` → `providers/loading/events/interactionsWithoutEventInFile/manualPageView/warnings/packages/summary/where/empty/type/warning/event/consoleOnly/...`.
  - Interaction types `descarga/formulario` → `download/form`.
  - analytics-capture: env `MODOS` → `MODES`. Mode values `sin-interaccion/rechazar/aceptar` → `no-interaction/reject/accept`.
  - Phases `carga-inicial/tras-*/accion*` → `initial-load/after-*/action*`. Action types `formulario/descarga/saliente` → `form/download/outbound`. Navigation `clic/cliente/recarga` → `click/client/reload`. Script status `pendiente/fallo` → `pending/failed`.
  - Providers `otro-tracker/web-vitals-propio` → `other-tracker/custom-web-vitals`. `COOKIE_PROV` was updated to match.
  - Output keys `navegaciones/acciones/porEvento/erroresJS/rutas/fecha/resultados/diagnostico` → `navigations/actions/byEvent/jsErrors/routes/date/results/diagnosis`.
  - Output files: `analitica-codigo.json/analitica-red.json/analitica-form.json` → `analytics-code.json/analytics-network.json/analytics-form.json`.
- Kept untouched: the ACCEPT/REJECT banner regexes (Spanish + English), the CTA text regex (`presupuesto|contact|llam|…`), the CONSENT regex (`aceptad`), the form sample data (`qa+analitica@example.com`, `Prueba QA analítica (ignorar)`) and `locale: 'es-ES'`.

## Original vs translated
| Run | ES | EN | Result |
|---|---|---|---|
| static, fixture | gtag-manual, G-XXXXXXX placeholder, 3 warnings (no consent, no env gate, gtag.js without config), form without event | same | identical after key mapping (sorted file list) |
| static, medida | 3 providers, 4 events, Consent Mode v2 default denied, manual page_view, G-TEST123456 | same | identical |
| capture, fixture, 3 modes | no-interaction: high (gtag/js fails), critical (no hits), low ×3; reject/accept: high "button not found" | same | identical |
| capture, medida + STUB + BLOCK_HITS, 3 modes | no-interaction/reject: 0 diagnosis items, Plausible only; accept: high ×5 (_vercel script, 2× duplicated page_view, mailto unmeasured, sample ID) + low | same | identical (navigations, actions, byEvent, banner) |
| capture, medida, accept + SUBMIT=1 | same + `ga4:generate_lead` on the form | same | same diagnosis and byEvent. One difference is ordering only: in the tel action the hit list order differs (`ga4:scroll` landed before vs after `ga4:click_tel`). That is timing, not language. |
| capture, avanzado, no-interaction + reject | critical "ga4:page_view sent without consent (gcs=G100): advanced Consent Mode" in both | same | identical |

## Not verifiable here
- Real gtag.js, GTM, Umami, Matomo, Fathom and Vercel Analytics: their CDNs are blocked or they only work on Vercel. GA4 was emulated with the original tester's stub, as in the source TEST.md.
- Sentry is checked by code and `/envelope/` only. Step 5 (DebugView, key events, filters, Search Console) needs accounts.
