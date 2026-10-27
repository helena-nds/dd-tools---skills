# VERIFY — qa-performance-cwv (translation of qa-rendimiento-cwv) — 2026-10-27, agent a5b

## Status of the inherited SKILL.md
The previous agent's `SKILL.md` was complete (522 lines, same as the source). Compared section by section with `/home/claude/qa-skills/qa-rendimiento-cwv/SKILL.md`: 23/23 headings, 29/29 table rows, 30/30 code fences at the same line numbers, 36/36 list items. No content changes were needed; it already had the "Write the report in the user's language." sentence and the renamed cross-references (`qa-ecodesign`, `qa-responsive-browsers`, `qa-analytics`, `qa-legal-spain`, `qa-technical-seo`, `qa-code-optimization`). Report ID prefix `R-001` → `PERF-001`; report file `rendimiento-cwv.md` → `performance-cwv.md`.

## Scripts
Extracted from `SKILL.md` into `scripts/`: `lh-multi.mjs`, `vitals-pw.mjs`, `scan-code.mjs`, `assets-bundle.mjs`, `bundle-graph.mjs` (`lighthouserc.js` is a proposal snippet, not extracted). `node --check`: all OK.
Byte-identical: block in `SKILL.md` == `scripts/` == copy run in `/tmp/qa-performance-cwv/` (checked with `cmp`).
Word-level diff against the originals (`git diff --no-index --word-diff`): only comments, message strings, JSON keys, rule IDs and status values changed; no logic changed. Changed literals used in logic were kept consistent: `assets-bundle.mjs` severity regexes `/válida/` → `/valid image/` and `/antiguo/` → `/legacy/` match the new issue texts.

Main renames: statuses `bueno/mejorable/malo` → `good/needs-improvement/poor`; rule IDs `*-sin-*` → `*-no-*` (`img-not-next-image`, `script-not-next-script`, `image-priority-deprecated`, `script-third-party-early`, `iframe-video-no-facade`, `use-client-unnecessary`, `use-client-for-navigation`, `heavy-import(-client)`, `layout-dynamic`, `use-cache-no-cachelife`, `images-no-avif`…); JSON keys (`metricas`→`metrics`, `lcpElemento`→`lcpElement`, `peticionesFallidas`→`failedRequests`, `atribucion`→`attribution`, `mayorDesplazamiento`→`largestShift`, `proceso`→`processing`, `primeraCargaJS`→`firstLoadJS`, `porRuta`→`byRoute`, `paquetes`→`packages`, `pesado`→`heavy`, `modulosPropiosEnCliente`→`ownModulesInClient`…). The prose refers to the new names.

## Test setup
- App: copy of the fixture in `/home/claude/work/en-a5b/app`, `next build` (exit 0; all routes `○` except `/api/contact` `ƒ`), `next start -p 3105`.
- Originals in `/tmp/a5b-perf-orig/`, translations in `/tmp/qa-performance-cwv/` (same node_modules: lighthouse 13.5.0, web-vitals 6.2.3, chrome-launcher; Playwright symlinked from `/opt/npm-tools`, Chromium 1243). Outputs in `/home/claude/work/en-a5b/out/`.

## Original vs translated
| Script | Input | Result |
|---|---|---|
| scan-code.mjs | app | 10 vs 10 findings, same sev/file/line in the same order; 8 rules map 1:1 (google-fonts-link, script-third-party-early, image-priority-deprecated, img-not-next-image ×3, iframe-video-no-facade, use-client-for-navigation, use-client-unnecessary, images-no-avif) |
| scan-code.mjs | `/home/claude/work/perf/synthetic` | 12 vs 12, same sev/file/line; image-fill/responsive-no-sizes, image-preload-multiple, iframe-no-lazy, video-autoplay/no-poster/preload, layout-dynamic, segment-config, heavy-import-client ×2 |
| assets-bundle.mjs | app (after build) | identical: 5 /public files with issues (foto-sin-optimizar.jpg high, header `unknown`; 4 unreferenced SVG low), 2 without; first-load JS per route identical (/ 139.3 KB gzip … 133.6), same largest chunks and media |
| assets-bundle.mjs | synthetic /public (invalid PNG, 150 KB PNG, SVG with base64 bitmap, no build) | same severities (high / medium / medium) and same "no build" warning branch |
| bundle-graph.mjs | graph exported from my app (`next analyze --output --snapshot qa` + `export`), plus `/tmp/perf-graph.jsonl` and `/tmp/perf-graph2.jsonl` | identical numbers per route; heavy branch confirmed on graph2: `/servicios` lodash 24.4 KB and moment 18.9 KB flagged `heavy` in both |
| lh-multi.mjs | `/ /servicios --runs=3` (mobile) | same structure and keys; medians 92/90 (orig) vs 90/89 (en), LCP 3.2/3.3 s vs 3.1/3.3 s "needs improvement" in both, same LCP element, same failed requests (2 / 4: Google Fonts, GA, Unsplash, YouTube), same unsized images (2 on /servicios), same opportunities apart from run variance |
| lh-multi.mjs | `/contacto --desktop --runs=1` | 99 vs 100 |
| vitals-pw.mjs | `/ /servicios --click=h1 --runs=3` | same LCP element and statuses, CLS 0.047 on the same button block in both, INP good in both, same failed requests |
| vitals-pw.mjs | static synthetic page (`/home/claude/work/perf/static`, python http.server on 3105) `--click="#b"` | INP 376 ms "mejorable"/"needs-improvement", target `#b`, processing 363/366 ms; CLS 0.032 attributed to `html>body>p` in both |

## Leftover Spanish
`grep` for Spanish function words, accents, `ción`, `Paso`, `hallazgo` and other common words: only allowed literals remain — the audited site's routes (`/servicios`, `/contacto`), the placeholder origin `https://www.ejemplo.es` in the CrUX example and the sample `import foto from './foto.jpg'`.

## Not verifiable here
- CrUX API / PageSpeed Insights API (need an API key, a public URL with traffic and Internet access).
- Real weight and effect of third parties (Google Fonts, GA, YouTube, Unsplash): blocked by the sandbox, as in the original test.
- Lighthouse CI (`lighthouserc.js`): not run, same as the original.
