# VERIFY — qa-full-website (agent a1)

Source: /home/claude/qa-skills/qa-web-completa/SKILL.md. No scripts: verification is language and consistency only.

- All 17 phase skills referenced with the English names from the brief's mapping table (each name present in the phase table; grep finds no old Spanish skill names).
- Paths/report names translated: `/tmp/qa-web/<fecha>/` → `/tmp/qa-full-website/<date>/`, `00-informe-qa.md` → `00-qa-report.md`, `qa-informes/` → `qa-reports/`, example rows `10-qa-security.md`, `07-qa-figma-fidelity.md`.
- Severity-equivalence table rewritten for the English skills' scales: Critical/High/Medium/Low (capitalised, e.g. qa-technical-seo), critical/high/medium/low/info (scripts, e.g. qa-deployment, qa-design-tokens), P0–P3 (qa-figma-fidelity, verified against /home/claude/skills-en/qa-figma-fidelity/SKILL.md: "P0 · Blocker"), and the qa-legal-spain categories. qa-legal-spain was NOT yet translated when this was written: the table uses "Legal non-compliance" / "Non-compliance", "High risk", "Recommended improvement", "Not assessable" (translations of "Incumplimiento legal", "Riesgo alto", "Mejora recomendada", "No evaluable"). Check they match the final qa-legal-spain wording.
- Verdicts: NO PUBLICAR / PUBLICAR CON RIESGO / LISTO PARA PUBLICAR → DO NOT LAUNCH / LAUNCH WITH RISK / READY TO LAUNCH.
- "Write the report in the user's language." added to Step 4 (the report section).
- Description: 560 chars, no angle brackets; "even if they don't list the phases" trigger added.
- Leftover-Spanish grep: only "comunidad autónoma" (kept as a Spanish legal term with English gloss).
