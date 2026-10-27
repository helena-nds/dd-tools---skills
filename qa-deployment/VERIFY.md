# VERIFY — qa-deployment (agent a1, port 3101)

Source: /home/claude/qa-skills/qa-despliegue/SKILL.md (embedded scripts identical to its scripts/).
Test app: /home/claude/work/en-a1/app (fixture copy), `next build` log saved to /home/claude/work/en-a1/build.log, `next start -p 3101`.
Tools dir: /tmp/qa-deployment (es/ original, en/ translated; no dependencies).

## Commands
- Extract scripts from SKILL.md, `node --check` both: OK. Re-extracted and `cmp`: byte-identical to scripts/.
- Structural diff (strings/comments stripped): only renamed JSON keys/variables:
  build-routes `rutas/resumen/hallazgos/tipo/simbolo/ruta/generada/masRutas/headersReglas/archivos` → `routes/summary/findings/type/symbol/route/generated/morePaths/headerRules/files`;
  deploy-check `entorno/comprobaciones/hallazgos/evidencia/principal/protegido/hostAlternativo/indexacion/emisor/caduca/diasRestantes/cacheImagen/generico/plataforma/tiempos/mediana` → `environment/checks/findings/evidence/main/protected/alternateHost/indexing/issuer/expires/daysLeft/cacheImage/generic/platform/timings/median`. Output file `rutas.json` → `routes.json`.
- Runs (es and en):
  - `node build-routes.mjs build.log <app>` against the fixture build.
  - `node deploy-check.mjs http://localhost:3101/` and `… --staging` against the fixture.
  - Synthetic coverage: a small local HTTP server on 3101 (302→307 chain, X-Robots-Tag noindex, robots Disallow: /, /_next/static without immutable cache, /_next/image 500, soft 404, X-Powered-By) and a synthetic Next 16 build log (◐ route with 30s revalidate, ƒ /aviso-legal, generated paths, Proxy row). Also the "unreachable" branch with the port closed.

## Original vs translated (severity + id, same order)
| Run | ES | EN | Result |
|---|---|---|---|
| build-routes (fixture) | 5 (6 routes: 5 static, 1 dynamic) | 5 (same routes) | identical |
| deploy-check prod (fixture) | 3: default-404, no-robots, x-powered-by | 3 | identical |
| deploy-check staging (fixture) | 3: staging-indexable (critical), default-404, x-powered-by | 3 | identical |
| deploy-check prod (synthetic) | 9 | 9 | identical |
| deploy-check staging (synthetic) | 8 | 8 | identical |
| build-routes (synthetic log) | 8 incl. dynamic-content-page, short-revalidate, partial | 8 | identical |
| unreachable | 1 critical | 1 critical | identical |

## Not verifiable here
- HTTPS, TLS certificate expiry, HSTS, http→https and www/apex redirects (no deployed HTTPS URL; these branches are skipped on http://localhost by design). Syntax and structure checked only.
- Vercel region/x-vercel-id, real CDN cache headers, `vercel env ls`, monitoring/rollback/backups (manual steps).
