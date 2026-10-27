# VERIFY — qa-code-optimization (translation of qa-optimizacion-codigo) — 2026-10-27, agent a5b

## Translation
New `SKILL.md` translated from `/home/claude/qa-skills/qa-optimizacion-codigo/SKILL.md`: 514/514 lines, 24/24 headings, 36/36 table rows, 30/30 code fences at the same line numbers. Description 558 characters, no angle brackets. Cross-references renamed (`qa-ai-generated-code`, `qa-security`, `qa-design-tokens`, `qa-performance-cwv`, `qa-accessibility`, `qa-content`, `qa-maintainability`, `qa-figma-fidelity`); tool dir `/tmp/qa-code-optimization/`; report `qa-code-optimization.md` (+ optional `.json` with `{ summary, findings: [{ id, sev, rule, file, line, evidence, fix }] }`); "Write the report in the user's language." added to `## Report`. Kept as Spanish-site literals: the `+34` phone regex, the `copia` file-name pattern, the `©` year regex.

## Scripts
Extracted into `scripts/`: `scan.mjs`, `config.mjs` (the `eslint.config.mjs` block is a reference config for the project, not a skill script; it passes `node --check` but is not in `scripts/`, as in the original). `node --check`: OK.
Byte-identical: block in `SKILL.md` == `scripts/` == copy run in `/tmp/qa-code-optimization/` (`cmp`).
Word-level diff against the originals: only comments, messages, JSON keys, rule IDs and severities changed (`critico/alto/medio/bajo` → `critical/high/medium/low`; `info` unchanged). Renamed keys: `nota`→`note`, `importadoPor`→`importedBy`, `enCliente`→`inClient`, `errores/avisos/ejemplos`→`errors/warnings/examples`, `veces`→`count`, `rutas`→`routes`, summary `archivos/porRegla/componentesTsx/conUseClient/enGrafoCliente/hallazgos` → `files/byRule/tsxComponents/withUseClient/inClientGraph/findings`; naming styles `minúsculas/otro` → `lowercase/other` (also in the comparison that skips lowercase names).

Rule IDs: `use-client-unnecessary`, `use-client-for-navigation`, `use-client-in-route`, `heavy-import`, `inline-data`, `localhost-url`, `hardcoded-api-url`, `hardcoded-contact-data`, `hardcoded-year`, `commented-out-code`, `suspicious-name`, `large-component`, `mixed-naming-convention`, `mixed-exports`, `ts-expect-error-no-reason`; config: `tsconfig-unreadable`, `no-tsconfig`, `ts-strict-partially-disabled`, `ts-recommended-option`, `ts-allowjs-no-check`, `next-ignores-ts-errors`, `no-lint-script`, `no-typecheck-script`, `no-linter`, `eslint-no-next-rules`, `eslint-no-core-web-vitals`, `eslint-config-next-mismatch`, `no-formatter`, `eslint-suppressed`, `eslint-json-unreadable`, `build-fails`, `build-warning`, `build-summary` (unchanged: `console`, `debugger`, `ts-any`, `ts-ignore`, `ts-nocheck`, `todo`, `eslint-disable-global`, `parse-error`, `ts-no-strict`, `next-config-eslint`, `react-strict-mode-off`, `script-next-lint`, `eslintrc-legacy`, `eslint-flatcompat`, `eslint-config-cjs`, `eslint`, `tsc`).

## Test setup
Originals in `/tmp/a5b-opt-orig/`, translations in `/tmp/qa-code-optimization/` (same node_modules: oxc-parser 0.155, knip 6.43.0, jscpd 5.4.2); ripgrep 14 at `/usr/bin/rg`. App copy `/home/claude/work/en-a5b/app` (Next 16.4.3). Outputs in `/home/claude/work/en-a5b/out/`. Comparison with `tools/cmp-jsonl.js`: same number of findings, same severity (mapped), file, line and number of keys, sorted (ripgrep's file order is not deterministic).

## Original vs translated
| Script | Input | Result |
|---|---|---|
| scan.mjs | app (11 files) | 11 vs 11 identical: ts-any ×2, console ×2, todo, hardcoded-year ×2, hardcoded-api-url, suspicious-name (HeaderCopy.tsx), use-client-for-navigation (Header.tsx), use-client-unnecessary (HeaderCopy.tsx) — same as the original TEST.md |
| scan.mjs | `/home/claude/work/optim/corpus` (original test corpus, read-only) | 19 vs 19 identical, all 16 rules map 1:1 (use-client-in-route, heavy-import high/medium ×2, use-client-for-navigation, use-client-unnecessary, commented-out-code, inline-data, debugger, localhost-url, hardcoded-contact-data ×2, ts-ignore, ts-nocheck, eslint-disable-global, large-component, mixed-naming-convention, mixed-exports, hardcoded-year) |
| scan.mjs | own mini corpus (`/home/claude/work/en-a5b/corpus2`) | 5 vs 5: use-client-unnecessary low (wrapper of a client library) and high (route), FIXME → medium, console.warn → low, ts-expect-error-no-reason |
| config.mjs | app + its `eslint.json`, `tsc.txt`, `build.log` (exit=0) | 12 vs 12 identical; summary `findings: 11` in both |
| config.mjs | `/home/claude/work/optim/app2` (read-only) with original `build2.log` (warnings) and `build3.log` (failed type check) | 13 vs 13 each: next-config-eslint, script-next-lint, eslintrc-legacy, build-warning (3 grouped warnings, themeColor ×10 in 5 routes), build-fails critical |
| config.mjs | own mini projects (`/home/claude/work/en-a5b/cfg-mini/a,b,c`) | 21/21, 8/8, 7/7 identical: covers ts-no-strict, ts-strict-partially-disabled (via `extends`), next-ignores-ts-errors (critical), react-strict-mode-off, no-lint-script, eslint-no-next-rules, eslint-flatcompat, eslint-config-next-mismatch, eslint-config-cjs, eslint-suppressed, tsc, tsconfig-unreadable, no-tsconfig, no-linter, eslint-json-unreadable, eslint-no-core-web-vitals, `no-rule` |

Also run as written in the English skill (from the app root): `knip --reporter json` → HeaderCopy.tsx, Unused.tsx, lib/config.ts unused; axios, lodash, moment unused. jscpd default → 0 clones; near-duplicate pass + the `node -e` summary → `renamed 6 lines components/Header.tsx:1 ≈ components/HeaderCopy.tsx:1` (2.2 % duplicated; the original TEST.md reported 3.1 % on its copy — the same tool and flags, the total depends on the files present in the copy).

## Leftover Spanish
`grep` for Spanish function words, accents, `ción`, `Paso`, `hallazgo` and common words: only the allowed `copia` file-name pattern remains (plus `©` in the year regex).

## Not verifiable here
- TypeScript 7 (native CLI only) and Biome projects; knip in monorepos (`--workspace`) — not tested, same as the original.
- `jscpd --similarity` not re-run (the original reported no extra pairs on this app).
