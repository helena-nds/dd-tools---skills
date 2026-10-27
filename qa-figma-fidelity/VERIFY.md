# VERIFY — qa-figma-fidelity

Date: 2026-10-27 · agent a7b · Node 22.23.4, Playwright 1.63 (Chromium only), pngjs, pixelmatch, culori.
Source: `/home/claude/build/out/figma/SKILL.md` (original scripts `/home/claude/build/figma/*.mjs`).
Status on arrival: SKILL.md and `scripts/` left by a previous agent, never verified. Review found nothing to fix; no file changed.

## Completeness and consistency

- SKILL.md: 376 lines, same as the source; headings and code fences on the same line numbers as the Spanish file. `## Report` contains "Write the report in the user's language."
- Embedded `capture.mjs`, `diff.mjs`, `responsive.mjs` are **byte-identical** (`cmp`) to `scripts/`.
- `diff` original vs translated: only comments, messages and keys (`lectura`→`reading`, `tipo`→`type`, `exceso`→`excess`, `por`→`by`, `ancho`→`width`, `problemas`→`problems`; issue types `scroll-horizontal-pagina`→`page-horizontal-scroll`, `fuera-de-viewport`→`outside-viewport`, `recorte-horizontal-oculto`→`hidden-horizontal-clipping`, `texto-recortado-vertical`→`text-clipped-vertically`, `imagen-deformada`→`distorted-image`, `interactivo-tapado`→`interactive-covered`). The prose refers to `interactive-covered` and `_styles.json` keys consistently. `es-ES` locale and the `#servicios` site selector kept.
- Leftover Spanish grep: only false positives (`el` variable, `×`, `±`). Description: 574 characters, no `<`/`>`.

## Commands (in /tmp/qa-figma-fidelity, orig/ and en/, playwright symlinked from /opt/npm-tools; node --check OK on all 6)

```bash
echo '{ "main": "main", "footer": "footer", "servicios": "#servicios" }' > out/map.json
node $V/capture.mjs http://localhost:3107/ 1440 900 out/map.json out/$V-home-1440 1
node $V/capture.mjs http://localhost:3107/servicios 1440 900 out/map.json out/$V-serv-1440 1
node $V/capture.mjs http://localhost:3107/servicios 390 844 out/map.json out/$V-serv-390 2
node $V/diff.mjs <a.png> <b.png> out/$V-dN        # 4 pairs: structural, identical, different size, 6 % perturbed copy
node $V/responsive.mjs http://localhost:3107{/,/servicios,/contacto} out/$V-resp-<page>
```

## Original vs translated

| Script | Result |
|---|---|
| capture.mjs (3 runs) | All PNGs (`_full`, `main`, `footer`) byte-identical; `_styles.json` identical except `selector no encontrado` → `selector not found` (the missing `#servicios` case was exercised). 9 elements in /servicios main, fonts, `figmaTempUrls: []`, console errors (Google Fonts blocked in sandbox) same in both |
| diff.mjs (4 pairs) | Same `diffPixels`, `diffRatio`, `sizeDelta`; diff and side-by-side PNGs byte-identical; all three readings exercised: `probable structural difference` (0.43, 0.59), `probable noise (antialiasing)` (0), `inspect` (0.039) |
| responsive.mjs (3 pages × 17 widths) | `_responsive.json` identical after key mapping. Home: 1 `distorted-image` per width (next.svg logo); /servicios: 6→0 problems from 320 to 1920 (`page-horizontal-scroll` 16, `outside-viewport` 61, from the seeded `w-[1440px]`); /contacto: 0 |

## Not verified

- Figma MCP part (steps 1, 2, 5 call budget, `get_screenshot`, `download_assets`, `get_design_context`, `get_variable_defs`, `generate_figma_design`): needs a Figma file and connection; not run. `diff.mjs` was tested with web-vs-web PNGs instead of a Figma export.
- WebKit/Firefox not involved (the skill only uses Chromium).
