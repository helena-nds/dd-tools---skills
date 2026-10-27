# VERIFY — qa-design-tokens

Date: 2026-10-27 · agent a7b · Node 22.23.4, ripgrep 14, culori 4, postcss 8.
Source: `/home/claude/build/out/tokens/SKILL.md` (original scripts `/home/claude/build/tokens/*.mjs`).
Status on arrival: SKILL.md and `scripts/` left by a previous agent, never verified. Review found nothing to fix; no file changed.

## Completeness and consistency

- SKILL.md: 384 lines, same as the source; every heading and code fence sits on the same line number as in the Spanish file (`diff` of `grep -n '^#\|^```'`, headings differ only in language). `## Step 8. Report` contains "Write the report in the user's language."
- Embedded scripts extracted from SKILL.md (`inventory.mjs`, `scan.mjs`, `css-raw.mjs`, `colors.mjs`) are **byte-identical** (`cmp`) to `scripts/`. `eslint.config.mjs` is a config example, not a script: not in `scripts/`.
- `diff` original vs translated script: only comments, messages and output keys change (`nota`→`note`, `usos`→`uses`, `donde`→`where`, `tokenMasCercano`→`nearestToken`, `veredicto`→`verdict`, `coloresUnicos`→`uniqueColors`, `clustersCasiDuplicados`→`nearDuplicateClusters`, `sugerencias`→`suggestions`, `dE_vs_primero`→`dE_vs_first`). Logic, regexes and thresholds unchanged. Severities were already English in the original.
- Leftover Spanish: `grep -nE " el | la | de | que | con | para | por |ción|Paso|hallazgo|[áéíóúñ¿¡]"` → only false positives (`de = differenceCiede2000()`, `×`/`±` symbols).
- Description: 552 characters, no `<`/`>`.

## Commands

```bash
# originals in /tmp/qa-design-tokens/orig, translated in /tmp/qa-design-tokens/en (node --check OK on all 8)
/home/claude/work/en-a7b/tools/run-tokens.sh orig   # and: run-tokens.sh en
# runs, against /home/claude/work/en-a7b/app (fixture copy) and a mini fixture (/home/claude/work/en-a7b/mini:
# DTCG JSON tokens with alias, .module.css with shadow token, broken CSS, TSX with inline style, svg fill, motion, "issue #123"):
#   inventory.mjs → tokens.json; rg --files … | scan.mjs → findings.jsonl; css-raw.mjs >> findings.jsonl; colors.mjs → colors.json
```

## Original vs translated

| Output | Original | Translated |
|---|---|---|
| fixture `scan.mjs` stderr | 14 files; hex-color 7, tw-arbitrary-value 15, tw-default-palette 8, inline-style-literal 1 | identical |
| fixture findings (31) | hex-color critical 6 + low 1, tw-arbitrary-value high 15, tw-default-palette high 8, inline-style-literal high 1 | identical once sorted (rg file order varies between runs); only `nota: posible falso positivo` → `note: possible false positive` |
| fixture `tokens.json` | — | byte-identical |
| fixture `colors.json` | 7 unique colors, 1 cluster (#0b7dff/#0b7cff, ΔE 0.36) | same suggestions/verdicts/cluster after key mapping |
| mini findings (16) | 12 rule/severity kinds incl. css-raw-value critical+medium, shadow-token, tw-off-scale, tw-var-shorthand, svg, motion, low #123 | identical except the `note` key |
| mini `colors.json`, `tokens.json` | — | identical after key mapping / byte-identical |
| broken CSS | `no parseable (…); revisar a mano` | `not parseable (…); review by hand` |

The seeded fixture problems are detected (hex colours in Header.tsx, `w-[1440px]`, `bg-[#0B7DFF]`, `text-[#aaa]` in layout.tsx, 11 px grey text in servicios).

## Not verified

- Step 6 (Figma variables via MCP / REST API / "Export modes"): needs a Figma file and account; not run.
- ESLint (`eslint-plugin-better-tailwindcss`) and stylelint configs are examples: not installed or run.
