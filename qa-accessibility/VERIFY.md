# VERIFY — qa-accessibility (translated from qa-accesibilidad)

Date: 2026-10-27 · Agent a4 · Node 22, Playwright 1.63.0, @axe-core/playwright 4.14.0, ESLint 9 + eslint-plugin-jsx-a11y from the fixture.

## Test app

Copy of `/home/claude/fixture-next` in `/home/claude/work/en-a4/app` plus the `/qa-control` route (`scripts/qa-control.page.tsx.txt`, the same control page the original TEST used: sticky header, off-canvas menu, `outline-none`, small targets, infinite animation, long word, `next/link`). `next build` + `next start -p 3104`.
Original scripts copied to `/tmp/qa-accesibilidad-a4/`, translated ones to `/tmp/qa-accessibility/` (playwright symlinked from `/opt/npm-tools`, `@axe-core/playwright@4.14.0` installed).

## Script renames

`teclado.mjs` → `keyboard.mjs`, `estructura.mjs` → `structure.mjs`, `objetivos.mjs` → `targets.mjs`, `reflow-movimiento.mjs` → `reflow-motion.mjs` (`axe.mjs`, `eslint.a11y.mjs` unchanged). Output files, JSON keys and issue types translated (e.g. `foco-no-visible` → `focus-not-visible`, `clicable-sin-teclado` → `clickable-without-keyboard`, `title-repetido` → `duplicate-title`, `FALLA 2.5.8` → `FAILS 2.5.8`); the prose uses the new names.
Kept on purpose (they match Spanish site content): `/salt|skip|ir al contenido/i`, the Spanish/English stop-word regexes, `locale: 'es-ES'`, default `es` language, `/create next app|untitled|^$/i`, Spanish routes in examples.

## Commands and comparison (original vs translated)

| Script | Command | Result |
|---|---|---|
| eslint.a11y.mjs | `npx eslint -c <cfg> app components -f json` (from the app) | Same 6 jsx-a11y messages (Header.tsx alt-text, click-events-have-key-events, no-static-element-interactions; HeaderCopy alt-text; servicios iframe-has-title, alt-text). Sorted lists diff: identical |
| axe.mjs | `/,/servicios,/contacto,/aviso-legal,/qa-control` at 1280 and 390 | Identical per rule: color-contrast 11, image-alt 2, frame-title 1, label 1, target-size 3, best-practice heading-order 1; identical per-route violations/nodes/incomplete |
| keyboard.mjs | `/`, `/servicios`, `/contacto`, `/qa-control` (1280) and `/qa-control` 390×844 | Same focus order (sel, name, obscured, visualChange, invisible) and same issue counts per type: e.g. /qa-control no-skip-link 1, focus-not-visible 1, focus-on-invisible-element 3, focus-obscured-minimal-scroll 4; /servicios no-skip-link, focus-not-visible (iframe), clickable-without-keyboard |
| structure.mjs | `/qa-control,/,/servicios,/contacto,/aviso-legal` | Same issues per route (only names translated), same landmarks and headings, byte-identical `aria_*.yml`, same client navigation (next/link to /contacto: client=true, focus on body, announced "Contacto") |
| targets.mjs | `/`, `/contacto`, `/qa-control`, `/servicios` at 390 | Same targets, sizes and verdicts (3× FAILS 2.5.8 on /qa-control, native checkbox 13×13, inline and spacing exceptions) |
| reflow-motion.mjs | `/`, `/servicios`, `/contacto`, `/aviso-legal`, `/qa-control` | Same issues and counts: /servicios reflow-320 (2 culprits: `w-[1440px]` header, iframe), zoom-200, fixed-px-text; /qa-control reflow-320 (long word), zoom-200, text-spacing, animation-ignores-reduced-motion; others none |

Note: against today's build the original also gives 3 (not 2, as its TEST.md says) `focus-on-invisible-element` on /qa-control; original and translated agree.

## Other checks

- `node --check` on all 6 `.mjs`: OK.
- Code blocks in SKILL.md vs `scripts/`: byte-identical (SKILL.md assembled from a template with literal inclusion, then each block compared with the file).
- `description`: 509 characters, no `<` or `>`.
- Leftover-Spanish grep: only allowed literals ("Leer más" example with gloss, regexes, Spanish routes/texts).
- Cross-references renamed: qa-design-tokens, qa-figma-fidelity, qa-responsive-browsers, qa-legal-spain.
- SKILL.md: 613 lines (original 613).

## Not verified

- WebKit/Firefox (not installed in the sandbox) and VoiceOver/NVDA manual guide: same limitation as the original.
- Pa11y, `eslint-plugin-jsx-a11y-x` with ESLint 10: mentioned only, not run (same as the original).
