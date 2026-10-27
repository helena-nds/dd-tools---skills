# VERIFY — qa-content (from qa-contenido)

Agent a3b · 2026-10-27 · Node 22.23.4 · Playwright 1.63 (symlink) · cspell 10.4.0 + @cspell/dict-es-es 3.0.9 in `/tmp/qa-content` · port 3103.

## Translation choices

- Kept as is: every Spanish-detection regex and word list (`PLACEHOLDER`, `ES`/`EN` function words, `GENERIC_LINK`, `GENERIC_ALT`, `Captura`, Spanish address and +34 phone regexes), `locale: 'es-ES'`, cspell `language: 'es,es-ES'` + `@cspell/dict-es-es`, LanguageTool `language: 'es'`, the Spanish `rg` patterns, Spanish example copy, the `Copyright` snippet.
- Translated: comments, console/finding messages, severities (`Crítico/Alto/Medio/Bajo` → `Critical/High/Medium/Low`), JSON keys (`tipo→type`, `pagina(s)→page(s)`, `evidencia→evidence`, `detalle→detail`, `contacto→contact`, `telefonos/direcciones→phones/addresses`, `fecha→date`; spellcheck: `porPalabra→byWord`, `problemas→issues`, `veces→count`, `sugerencias→suggestions`, `regla→rule`, `categoria→category`, `mensaje→message`, `contexto→context`, `texto→text`), finding types (e.g. `resto-de-template→template-leftover`, `ingles-residual→leftover-english`, `title-case-ingles→english-title-case`, `contacto-incoherente-*→inconsistent-contact-*`), output files (`contenido.json→content.json`, `ortografia.json→spelling.json`, default dir `contenido→content`, home page slug `inicio→home`), skill cross-references and `/tmp/qa-content/`.
- Spanish rules (¿, "100 €", sentence-case titles, lowercase months/days, accented capitals, *tú*/*usted*, Spanish number/date formats, haber/a ver) are explained in English with glosses. "Write the report in the user's language." is in `## Report`.

## Commands

```bash
node tools/extract.mjs skills-en/qa-content/SKILL.md skills-en/qa-content/scripts; node --check scripts/*.mjs   # OK
# app copy work/en-a3b/app + app/qa-extra seeded like the original TEST.md (Your text here, Get started by editing, TODO,
#   diseno/aplicacion/Contactanos/haber si, title case, EQUIPO, click aquí, Leer más, "Hablamos de tu proyecto?", "€100",
#   alt IMG_2034.jpg / imagen / Imagen de… / English alt / repeated ×3 / 200 chars, 2 phones + tel: mismatch, 2 emails + bad mailto, 2 addresses, © 2024, <Copyright> "use cache")
node extract-content.mjs http://localhost:3103 / /servicios /contacto /aviso-legal /qa-extra --out=out      # original (orig/) and translated
node spellcheck.mjs out --words=Nacar                                                                     # cspell, both
LT_URL=http://localhost:3103/v2/check node spellcheck.mjs out --engine=languagetool --words=Nacar          # original lt-mock.mjs moved to port 3103
# edge cases on a throwaway server on 3103: page without lang + "TODO", same with --ignore-words=TODO, unreachable base URL
```

`tools/cmpcontent.mjs` maps Spanish types/severities to English and requires the same findings in the same order with identical evidence, pages, contact data and byType.

## Results (original = translated, only the language differs)

| Run | Original | Translated |
|---|---|---|
| extract-content, 5 routes | 37 findings, 22 types | 37 findings, same order/evidence/pages; contact data identical; `.txt` files byte-identical |
| no-lang page | 2 (placeholder, sin-lang) | 2 (placeholder, missing-lang) |
| `--ignore-words=TODO` | 1 | 1 |
| unreachable URL | 1 pagina-no-carga | 1 page-not-loading |
| spellcheck cspell | 31 words (diseno, aplicacion, Contactanos…; Nacar allowlisted) | same 31 words, counts, pages and suggestions |
| spellcheck LanguageTool (mock) | diseno (TYPOS) + "haber si" (CONFUSED_WORDS) | same |

All 24 finding types of `extract-content.mjs` were triggered at least once. Leftover-Spanish grep: only the allowed literals (regexes, word lists, Spanish example copy and glossed terms). Embedded scripts are byte-identical to `scripts/` (re-extracted and `diff -r`).

## Not verifiable

- Real LanguageTool (public API blocked by the sandbox proxy, no Java for a local server): only tested against the mock from the original skill's `scripts/test/lt-mock.mjs` (moved to my port); that mock is not copied into `scripts/`.
- hunspell (not installed), reverse image search and licenses (manual by definition), text behind interactions (accordions, modals, form errors).
