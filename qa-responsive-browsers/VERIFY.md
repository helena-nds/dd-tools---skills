# VERIFY — qa-responsive-browsers

Date: 2026-10-27 · agent a7b · Node 22.23.4, Playwright 1.63 (from /opt/npm-tools), browserslist 4.29.4, web-features 3.44.0, postcss 8.
Source: `/home/claude/qa-skills/qa-responsive-navegadores/SKILL.md` + `scripts/matriz.mjs`, `scripts/css-baseline.mjs` (embedded copies in the source verified byte-identical to its `scripts/`). Translated from scratch.

## Translation

- SKILL.md: 403 lines, same as the source; headings, code fences and table rows on the same line numbers (`diff` of `grep -n '^#\|^```\|^|'`). Description 552 characters, no `<`/`>`. `## Report` has "Write the report in the user's language."
- Cross-references: `qa-fidelidad-figma` → `qa-figma-fidelity`, `qa-accesibilidad` → `qa-accessibility`, `auditoria-design-tokens` → `qa-design-tokens`; tool dir `/tmp/qa-responsive-browsers/`.
- Script renamed `matriz.mjs` → `matrix.mjs`; output `_matriz.json` → `_matrix.json`. `css-baseline.mjs` keeps its name.
- Keys/values renamed in the code and in the prose: `navegador/variante/ancho/ruta/problemas` → `browser/variant/width/route/problems`; `tipo` → `type`, `exceso` → `excess`, `texto` → `text`, `por` → `by`, `usos` → `uses`, `ocultos` → `hidden`, `conInteractivos` → `withInteractive`, `soloHover` → `hoverOnly`; severities `critico/alto/medio` → `critical/high/medium`; variant suffixes `_horizontal` → `_landscape`, `_oscuro` → `_dark`; issue types `scroll-horizontal` → `horizontal-scroll`, `fuera-de-viewport` → `outside-viewport`, `texto-sin-cortes-desborda` → `unbroken-text-overflow`, `texto-recortado` → `clipped-text`, `solape-de-texto` → `text-overlap`, `interactivo-tapado` → `interactive-covered`, `texto-casi-invisible` → `near-invisible-text`, `input-menor-16px-zoom-ios` → `input-under-16px-ios-zoom`, `texto-menor-12px` → `text-under-12px`, `imagen-deformada` → `distorted-image`; summary lines `100vh without dvh/svh`, `hover-only content`. css-baseline: `riesgosIOS` → `iosRisks` (`risk`, `rule`), `minimos` → `minimums`, `featuresUsadas` → `featuresUsed`, `nombre/veces/sinSupports/objetivosSinSoporte/ejemplos` → `name/count/withoutSupports/unsupportedTargets/examples`, `(desde X)/(sin soporte)` → `(since X)/(no support)`.
- Kept: `locale: 'es-ES'`, site routes `/servicios`, `/contacto`, the pseudo-localisation string, all thresholds, versions, URLs and commands.
- Leftover Spanish grep (`" el | la | de | que | con | para | por | sin |ción|Paso|hallazgo|navegador|ancho|ruta|tipo|oscuro|[áéíóúñ¿¡]"`): only the `el` variable, `×`/`±` and the PSEUDO accent map.
- Embedded scripts in SKILL.md are **byte-identical** (`cmp`) to `scripts/matrix.mjs` and `scripts/css-baseline.mjs` (SKILL.md is assembled from those files). `node --check` OK on original and translated.

## Test setup

- App: my copy `/home/claude/work/en-a7b/app` (`next start -p 3107`) plus two control routes that exist **only in my copy**: `/qa-control` (code from `qa-skills/qa-accesibilidad/scripts/qa-control.page.tsx.txt`: `h-screen`, `text-sm` input, long unbroken word, hover-only link, `field-sizing-content`, `interpolate-size`) and `/qa-control2` (fixed-height `overflow-hidden` text, `next.svg` forced to 300×300, two absolutely positioned overlapping paragraphs, a button under an `absolute inset-0` layer, a fixed bottom bar).
- Scripts: `/tmp/qa-responsive-browsers/{orig,en}/`, comparison helpers in `/home/claude/work/en-a7b/tools/` (`cmp-matrix.cjs`, `cmp-baseline.cjs` map the Spanish keys/values to English and compare the full JSON).

## Commands and results

```bash
DARK=1 PSEUDO=1 node orig/matriz.mjs http://localhost:3107 /,/servicios,/contacto,/aviso-legal,/qa-control out/orig   # 2 min 35 s
DARK=1 PSEUDO=1 node en/matrix.mjs   http://localhost:3107 /,/servicios,/contacto,/aviso-legal,/qa-control out/en     # 2 min 27 s
BROWSERS=chromium WIDTHS=375,1280 DEVICES="iPhone 15" node {orig/matriz,en/matrix}.mjs http://localhost:3107 /qa-control2,/qa-control out/{orig,en}-c2
node {orig,en}/css-baseline.mjs <compiled css>   # 4 runs: default targets, TARGETS Tailwind v4 minimums, TARGETS="baseline widely available", IGNORE= ; plus a hand-written CSS file
```

| Check | Original | Translated |
|---|---|---|
| Full matrix (27 variants × 5 routes) | 137 rows (135 chromium + 2 webkit/firefox "no disponible"), 135 screenshots | 137 rows, 135 screenshots (same names with `_landscape`/`_dark`); `_matrix.json` **identical** to `_matriz.json` after key mapping; console summary identical line by line |
| Issue counts (translated names) | — | horizontal-scroll critical 36, outside-viewport high 37, text-under-12px medium 18, unbroken-text-overflow high 10, input-under-16px-ios-zoom medium 18, near-invisible-text high 21, plus `100vh without dvh/svh (.h-screen)` and `hover-only content (.group-hover…)` on /qa-control |
| /qa-control2 run | 8 rows | identical after mapping; adds clipped-text 4, distorted-image 4, interactive-covered 3, text-overlap 4 — so all 10 invariant types and both CSSOM checks were exercised |
| css-baseline, compiled CSS (79 features) | — | identical after mapping in all 4 runs: `registered-custom-properties` fails Firefox 111 and disappears with Firefox 128; `field-sizing` and `interpolate-size` without `@supports`; iosRisks `.h-screen` 100vh; with `IGNORE=` also `cursor`, `resize`, `font-family-ui` |
| css-baseline, hand-written CSS | — | identical: `position: fixed + bottom` risk (not reachable with Tailwind utilities, which split `fixed`/`bottom-0` into separate rules), `min-height: 100vh`, `field-sizing` inside `@supports` → `withoutSupports: 0`, anchor-positioning limited |

The seeded fixture problems are found: `w-[1440px]` header on /servicios (scroll at every width < 1440), 11 px text, low-contrast `#aaa` footer / `#999` text at w1280.

## Not verified

- **WebKit and Firefox**: not installed in `/opt/pw-browsers` and `playwright install webkit` fails (download error). Both scripts report them as not available and continue with Chromium; no screenshots or invariants in those engines, and Firefox without `isMobile` is untested.
- Real iOS Safari / Android (keyboard, dynamic bar, safe area) and paid device clouds: require hardware/accounts.
- `@eslint/css`, `stylelint-plugin-use-baseline`, `eslint-plugin-baseline-js`, `doiuse`: mentioned only, not run.
