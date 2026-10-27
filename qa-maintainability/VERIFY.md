# VERIFY — qa-maintainability (translated from qa-mantenibilidad)

Date: 2026-10-27 · Agent a4 · Node 22, npm 10.

## Renames

`mantenibilidad.mjs` → `maintainability.mjs`, `scripts/plantillas/` → `scripts/templates/`. JSON keys translated (`puntuacion` → `score`, `nota` → `grade`, `hallazgos` → `findings`, `puntos` → `points`, `detalle` → `detail`, `hallazgo/evidencia/correccion` → `finding/evidence/fix`), severities `critico/alto/medio/bajo` → `critical/high/medium/low`, area/check names translated. README keyword regexes keep their Spanish and English alternatives (they read the audited README). Templates: comments, test names, assertion messages, variable names and Playwright project names (`escritorio/movil` → `desktop/mobile`) translated; Spanish routes (`/servicios`, `/contacto`, `/aviso-legal`), `/mensaje/i`, `/enviar/i` and the sample text `"Prueba automática"` kept. CI job `calidad` → `quality`, Dependabot group `menores` → `minor-and-patch`. `ci.yml` and `dependabot.yml` were also extracted to `scripts/templates/.github/` so every embedded block has a tested copy.

## Script comparison (original in `/tmp/qa-mantenibilidad-a4/`, translated in `/tmp/qa-maintainability/`)

Run from each project root, with and without `--outdated` (fake outdated.json: eslint 9→10, typescript 5→7, @types/node 24→26).

| Project (under `/home/claude/work/en-a4/`) | Original | Translated |
|---|---|---|
| `m-app` (fixture as is) | 23/E, 13 findings · 22/E, 14 with --outdated | identical scores, per-check points and severity sequence |
| `m-app2` (`"lint": "next lint"`, CLAUDE.md without @AGENTS.md) | 18/E, 15 · 17/E, 16 | identical |
| `m-ok` (all translated templates applied) | 100/A, 1 · 98/A, 2 | identical |
| `m-git` (git repo, package-lock.json not committed) | 17/E, 14 (Lockfile not committed) · 16/E, 15 | identical |
| `m-misc` (Node 18 + engines 20, pnpm packageManager, 2 lockfiles, partial English README, CI with npm install/Node 20/no build/no PR, empty E2E test) | 42/D, 22 findings incl. critical Node 18 | identical |

Findings matched one to one in order (only the language differs).

## Templates

- `playwright.config.ts` + `e2e/smoke.spec.ts`, original and translated, run with `@playwright/test` 1.63.0 and `BASE_URL=http://localhost:3104` (fixture copy in `/home/claude/work/en-a4/app`): both 10 failed / 2 passed across desktop + mobile, same tests failing for the same reasons ("Create Next App" title on / and /aviso-legal, two h1 on /servicios, console errors on /contacto, email field without label); 404 passes.
- `vitest.config.mts` (translated): `vitest@5` + `@vitejs/plugin-react` + `jsdom` + `@types/node@24`, a test importing via the `@/` alias: 1 passed.
- `ci.yml` and `dependabot.yml`: valid YAML (PyYAML).
- `node --check maintainability.mjs`: OK.
- Code blocks in SKILL.md vs `scripts/` files (maintainability.mjs, ci.yml, dependabot.yml, playwright.config.ts, e2e/smoke.spec.ts, vitest.config.mts, CLAUDE.md): byte-identical.
- `description`: 579 characters, no `<` or `>`. Leftover-Spanish grep: only the allowed literals. Cross-references renamed (qa-code-optimization, qa-security, qa-deployment, qa-ai-generated-code, qa-functionality, qa-technical-seo, qa-accessibility).
- SKILL.md: 512 lines (original 510; +1 explanatory comment in the script, +1 in smoke.spec.ts).

## Not verified

- Real GitHub Actions and Dependabot runs (no GitHub access), same as the original.
- `npm outdated` against the real registry: a hand-written outdated.json was used.
