# VERIFY — qa-geo (agent a6b, port 3106)

Source: /home/claude/qa-skills/qa-geo/SKILL.md (embedded scripts identical to its scripts/). I translated it from scratch. The skill name is unchanged.
Tools dir: /tmp/qa-geo (es/ original, en/ translated; cheerio 1.2.0 and robots-parser 3.0.1 installed from npm).
Test servers, each run on port 3106 one at a time:
- /home/claude/work/en-a6b/app: fixture copy.
- /home/claude/work/en-a6b/app2: copy of the original tester's variant. Its robots.ts blocks GPTBot, OAI-SearchBot and CCBot. Its proxy.ts returns 403 to ClaudeBot, Claude-SearchBot and Bytespider. /blog is painted in useEffect and has streamed metadata. It has JSON-LD with a relative logo, a phone different from the footer, an invisible FAQ and an address with no postalCode, plus llms.txt.
- /home/claude/work/en-a6b/app3: the same as app2 plus `htmlLimitedBots`.
- /home/claude/work/en-a6b/mini-server.mjs: the tester's minimal server with the port changed to 3106. It has Disallow: /, X-Robots-Tag noindex, and an HTML llms.txt.

## Commands
- Extracted ai-bots.mjs and jsonld.mjs into scripts/ and ran `node --check`: OK. Re-extracted and ran `diff -r` against scripts/: byte-identical. scripts/ is also identical to the tested en/ copies.
- The `normTxt` line, with its combining-diacritics range, is byte-identical to the original.
- Token diff (comments removed): only strings changed, plus renames.
  - Severities `Crítico/Alto/Medio/Bajo` → `Critical/High/Medium/Low`, and the `order` maps were updated to match.
  - Bot fields `tipo/nota/ignora` → `type/note/ignores`.
  - robots matrix `grupoPropio/rutas/permitido/bloqueado` → `ownGroup/routes/allowed/blocked`. Output keys `decisionEntrenamiento/matriz/paginas` → `trainingDecision/matrix/pages`.
  - jsonld `paginas/bloques/tipos/valor` → `pages/blocks/types/value`. `bloque N` → `block N`, `sitio` → `site`.
  - All issue codes are now in English (e.g. `robots-bloquea-buscador` → `robots-blocks-search-engine`, `frase-ausente-sin-js` → `phrase-missing-without-js`, `nap-telefono-no-visible` → `nap-phone-not-visible`). The prose was updated to match.
- Kept untouched: `accept-language: es-ES`, the `^34` phone normalisation, the sample `--expect` Spanish phrases, and the Spanish site data in the robots.ts/JSON-LD examples (`cliente.es`, `Calle Mayor 1`, `#negocio`).
- jsonld `--pages` reads `url/status/redirectsTo/contentType`. I checked that the English qa-technical-seo crawler still writes those fields to `/tmp/qa-technical-seo/out/pages.jsonl`.

## Original vs translated
Comparison: sev + code (mapped) + where + grouped URLs, in order. For ai-bots, also the robots matrix, the per-bot status/words/similarity and llms.

| Run | ES | EN | Result |
|---|---|---|---|
| ai-bots, fixture `/ /servicios /contacto` | 1 (Medium no-robots); 16 UAs 200 with the same content | 1 | identical |
| jsonld, fixture (4 URLs) | 3 (no-jsonld, home-no-organization, home-no-website) | 3 | identical |
| ai-bots, app2 with --site and --expect | 12: OAI-SearchBot robots High; server-cdn-block High ×3 and Medium ×6; phrase-missing-without-js High; title-outside-head Medium | 12 | identical |
| jsonld, app2 (5 URLs) | 9: faq-not-visible High; relative logo; nap-phone-not-visible ×2; incomplete address; recommended ×3; faq-no-rich-result | 9 | identical |
| ai-bots, app3 (htmlLimitedBots) | 4; title-outside-head disappears | 4 | identical |
| ai-bots, mini server | 14: Googlebot/Bingbot Critical; AI search High ×5; noindex Critical; user bots Medium ×1 and Low ×3; robots-no-ai-decision; llms-txt-html | 14 | identical |

## Not verifiable here
- Real Cloudflare or other CDN bot verification by IP or signature (the block was simulated with proxy.ts, as in the source tests).
- Rich Results Test and validator.schema.org (manual steps).
- Search Console and Bing AI Performance (they need accounts).
