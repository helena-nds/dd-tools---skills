# VERIFY — qa-ai-generated-code (agent a6b, port 3106)

Source: /home/claude/qa-skills/qa-codigo-ia/SKILL.md (its embedded scripts are identical to its scripts/).
A previous agent had left a full translation of SKILL.md. I compared it section by section with the source: nothing was missing or truncated, and the "Write the report in the user's language." line was already there. I made no changes to SKILL.md.
Test app: /home/claude/work/en-a6b/app (fixture copy). The scripts don't need the server.
Tools dir: /tmp/qa-ai-generated-code (es/ original, en/ translated; typescript@5 installed there).

## Commands
- Extracted the 4 scripts from SKILL.md into scripts/ and ran `node --check` on each: OK. Re-extracted at the end and ran `diff -r` against scripts/: byte-identical. The scripts/ files are also identical to the en/ copies that were tested.
- Token diff (comments removed): only strings changed, plus these renames.
  - JSON keys and variables: `paquete/hallazgos/descargasSemana/fuenteDescargas/ultima/creado/repositorio/diasDesdeCreacion/duplicidades/resueltosFueraDelRegistro/dependencias/resumen/conHallazgos/fecha` → `package/findings/weeklyDownloads/downloadsSource/latest/created/repository/daysSinceCreated/samePurpose/resolvedOutsideRegistry/dependencies/summary/withFindings/date`.
  - `regla/archivo/linea/texto/por` → `rule/file/line/text/why`.
  - structure keys → `orphans/usedOnlyByTests/iterationNames/exactDuplicates/nearDuplicates/containment/sameComponentName`.
  - markup keys → `intrinsic/semantic/maxDivDepth/divRatio/divSpanRatio/absoluteWithCoordinates/filesWithFindings/rest`.
  - Rule ids are now in English (e.g. `comentario-del-agente` → `agent-comment`, `catch-vacio` → `empty-catch`).
  - Output files: `patrones.jsonl` → `patterns.jsonl`, `estructura.json` → `structure.json`.
- Logic check: the comment-line filter regex `/comentario|todo|ts-ignore|eslint|codemod/` became `/comment|todo|ts-ignore|eslint|codemod/`. It still matches the same rule set (`agent-comment`, `todo`, `ts-ignore`, `eslint-disable-global`, `pending-codemod`).
- The agent-comment regex keeps both its English and Spanish alternatives (`en una app real`, `sustituye esto`, `aquí va`…). The placeholder regex still includes `Tu empresa`.

## Original vs translated
| Run | ES | EN | Result |
|---|---|---|---|
| patterns (fixture) | 14 findings (todo 1, secret 2, any 2, console-log 2, placeholder 2, img 3, empty catch 1, use-client 1) | 14 | identical sev/file/line/text |
| structure (fixture) | orphans: lib/config.ts, Unused.tsx, HeaderCopy.tsx; near duplicate Header/HeaderCopy (containment 0.77) | same | identical after key mapping |
| markup (fixture) | 3 (w-[1440px] ×2 high, clickable div high) | 3 | identical |
| patterns (synthetic project, 33 rules exercised) | 39 | 39 | identical. It includes all 3 agent comments: English "rest of the code", "You can add…" and Spanish "En una app real, aquí…" |
| structure (synthetic) | orphans + CardV2 iteration name | same | identical |
| markup (synthetic) | 14 (absolute coords ×2, fixed size, figma decimals, wrappers, nesting, clickable div) | 14 | identical |
| deps-check (fixture, real npm registry) | 5 (lodash/axios/moment unused + notes) | 5 | identical |
| deps-check (synthetic: hallucinated name, `lodahs`, `react-codeshift`, github dep, `request`, duplicates, no lockfile) | 20 findings incl. critical "does not exist" and critical "security holding package" | 20 | identical; 2 same-purpose groups each |

The synthetic project is in /home/claude/work/en-a6b/synth-ai. Outputs are in /tmp/qa-ai-generated-code/{es,en}-*.

## Not verifiable here
- `api.npmjs.org` is blocked by the sandbox proxy (403), so weekly downloads came from the registry-search fallback (`downloadsSource: "registry search"`). This is the documented fallback path. The api.npmjs.org path was not exercised.
- `npm audit signatures`, Socket CLI, `tsc`/`eslint` confirmation steps: manual, not run.
