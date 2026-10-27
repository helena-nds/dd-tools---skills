# VERIFY — qa-technical-seo (agent a1, port 3101)

Source: /home/claude/qa-skills/qa-seo-tecnico/SKILL.md (embedded scripts identical to its scripts/).
Test app: copy of /home/claude/fixture-next in /home/claude/work/en-a1/app, `next build` OK, `next start -p 3101`.
Tools dir: /tmp/qa-technical-seo (cheerio + robots-parser via npm, Playwright symlinked from /opt/npm-tools). Original scripts in es/, translated in en/.

## Commands
- `python3 -I extract.py SKILL.md scripts/` (code blocks starting with `// <name>.mjs:`), then `node --check` on the 4 .mjs: OK.
- Per version (es, en):
  - `node routes.mjs <app> --seeds-out seeds.txt > routes.json`
  - `node crawl.mjs http://localhost:3101/ --site https://www.cliente.es --lang es --seeds seeds.txt --out out`
  - `node robots-sitemap.mjs http://localhost:3101/ --site https://www.cliente.es --pages out/pages.jsonl`
  - `node render-check.mjs --pages out/pages.jsonl`
  - also `crawl.mjs --mode staging` and `robots-sitemap.mjs --mode staging`.
- Structural diff (lines compared after stripping string literals and // comments): routes 0, render-check 0, crawl 1, robots-sitemap 1 (the `order` map `{ 'Crítico': 0, Alto: 1, … }` → `{ Critical: 0, High: 1, … }`, expected).
- Embedded scripts in SKILL.md re-extracted and `cmp` against scripts/: byte-identical.

## Original vs translated (only language differs)
| Script | ES findings | EN findings | Result |
|---|---|---|---|
| routes.mjs | 16 (1 Crítico, 6 Alto, 5 Medio, 4 Bajo) | 16 (1 Critical, 6 High, 5 Medium, 4 Low) | same sev+location, codes translated 1:1 |
| crawl.mjs (prod) | 37 (7/6/13/11) | 37 (7/6/13/11) | same sev+URL, same order, 16 codes mapped 1:1 |
| crawl.mjs (staging) | 41 (7/10/13/11) | 41 (7/10/13/11) | same |
| robots-sitemap.mjs (prod, staging) | 2 Alto | 2 High | same (missing-robots, sitemap-unreachable) |
| render-check.mjs | 4 URLs, 0 issues | 4 URLs, 0 issues | same word/link counts |

Seeded problems detected by both: "Create Next App" title/description, lang="en", missing sitemap/robots/not-found/opengraph-image, page without metadata, two h1, h1→h3 jump, broken /servicioss link, img without alt, Next default 404, no metadataBase.

## Not verifiable here
- render-check: the fixture renders all content on the server, so the "content only with JS" branches did not fire (no difference in either version).
- hreflang, sitemap content checks, redirects and --external: the fixture has no sitemap, hreflang or redirects; those branches were only syntax-checked and structurally compared.
- Production/staging headers on a real hosting (Vercel/Cloudflare): no deployed URL.

## Notes
- Finding codes, severities, messages, comments and the user agent (`qa-technical-seo/1.0`) are translated; JSON keys were already English.
- next.config `headers()` noindex snippet (VERCEL_ENV / NOINDEX): code unchanged, only its two comments translated.
- Spanish site copy kept in the layout.tsx example (with English comments), plus `/servicios-antiguos`, `cliente.es`, `lang="es"`, `es-ES`, `es_ES`.
