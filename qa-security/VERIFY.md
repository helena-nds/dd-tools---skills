# VERIFY — qa-security (from qa-seguridad)

Agent a3b · 2026-10-27 · Node 22.23.4 · port 3103 · app copy: `/home/claude/work/en-a3b/app` (fixture, `next build` OK).

## SKILL.md

A previous agent had already translated the whole file. I checked it section by section against the source: every heading, table, list and code block is there (674 lines vs 672: one extra English comment in the `actions.ts` snippet, plus "Write the report in the user's language." in `## Report`). Cross-references: `qa-legal-spain`, `qa-deployment`, `qa-maintainability`. Paths: `/tmp/qa-security/`. Severities: Critical/High/Medium/Low. I made no text changes.

## Commands

```bash
node tools/extract.mjs skills-en/qa-security/SKILL.md skills-en/qa-security/scripts   # 5 scripts
node --check scripts/*.mjs                                                              # all OK
# against the fixture copy (after next build), original vs translated:
node <dir>/{versions,supplychain,secrets,endpoints}.mjs .
node <dir>/headers.mjs http://localhost:3103 /contacto /api/contact
# synthetic mini-project (work/en-a3b/mini) for the code paths the fixture does not trigger:
#   next 15.4.0 + sharp 0.34.1 in node_modules, middleware.ts with auth + nonce, a "use client" component importing lib with process.env,
#   dangerouslySetInnerHTML, NEXT_PUBLIC_*_TOKEN in .env, remotePatterns '**', source maps, git dep, no build
# throwaway HTTP server on 3103 with a static CSP nonce, a session cookie, X-Powered-By, Server version, CORS *, public .map, 404 with a stack trace
```

Comparison: `tools/cmpjson.mjs` walks both JSON outputs in parallel and requires the same shape, the same array lengths, identical numbers/booleans and identical `sev`/`id`/`rule`/`file`/`package`/`version`/`url`/`status` values. Only key names and free-text messages may differ.

## Results (original = translated, only the language differs)

| Script | Fixture findings | Extra coverage | Differences |
|---|---|---|---|
| versions.mjs | 0 table findings, live npm query OK (0 advisories for 16.4.3) | mini: next 15.4.0 → critical "unpatched branch", sharp 0.34.1 → critical; live query returned 40 advisories | keys only (`tableVerified`, `liveAdvisories`, `bySeverity`…) |
| supplychain.mjs | medium scripts-policy, low no-release-age, info install-scripts | mini: non-registry-dep, no-lockfile | keys only (`origins`, `findings`, `evidence`) |
| secrets.mjs | 4 critical (stripe-secret-live, next-public-secret-name ×3) + .env.local high | mini: `no-build` (Spanish id was `sin-build`) | keys only + that rule id |
| endpoints.mjs | 12 findings (critical env-dump … low powered-by) | mini: proxy convention, sanitized, client-imports-secret, remote-patterns-wildcard, source-maps | keys only (`signals`, `convention`, `sanitized`, `imports`, `source`, `headersDefined`) |
| headers.mjs | 7 findings (high csp-missing … info no-https) | mock: 16 findings incl. csp-nonce-static, csp-nonce-missing-in-html, cookie-flags, error-leak, source-maps-public | keys only + label of the 404 probe ("404 de prueba" → "test 404") |

Leftover-Spanish grep: only allowed literals remain (`'Mensaje para el usuario'`, `'Revisa los campos marcados'`, Spanish form field names, `staging.ejemplo.es`, `mensaje` in the logPII regex). Embedded scripts are byte-identical to `scripts/` (re-extracted and `diff -r`).

## Not verifiable

- `npm audit signatures` and OSV-Scanner / gitleaks / trufflehog were not run (they are recommendations in the text, not scripts in this skill).
- HSTS/HTTPS checks of `headers.mjs` against a real HTTPS deployment (only local HTTP and a mock).
- git-dependent branches of `secrets.mjs` (`inGit`, `envHistory`): the fixture is not a git repo.
