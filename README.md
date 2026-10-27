# QA skills for Next.js websites (English version)

These are 18 Claude skills for running QA on Next.js websites generated from Figma with AI. They are translated from the Spanish originals. Each `.md` file is a complete `SKILL.md`: the instructions and the scripts it runs are inside the file.

The skills still audit **Spanish-language websites in Spain**. Some text deliberately stays in Spanish:

- Spanish legal terms, which get an English gloss the first time they appear.
- Patterns that detect Spanish text on the site.
- Code snippets meant for Spanish visitors.

Each skill asks for the report to be written in the user's language.

## How to install

Every file must be saved as `SKILL.md` in a folder named after the skill. For example, `qa-security.md` becomes `~/.claude/skills/qa-security/SKILL.md` for Claude Code (or upload it as a skill in Claude). Install them all if you want to use `qa-full-website`, because it calls the other 17.

## Skills

| # | Skill | Phase | Former Spanish name |
|---|---|---|---|
| — | `qa-full-website` | Orchestrator: runs every phase in order, merges the severities and gives a launch verdict | qa-web-completa |
| 1 | `qa-code-optimization` | Code tidiness and optimization | qa-optimizacion-codigo |
| 2 | `qa-performance-cwv` | Performance and Core Web Vitals | qa-rendimiento-cwv |
| 3 | `qa-technical-seo` | Technical SEO | qa-seo-tecnico |
| 4 | `qa-geo` | Visibility in AI search (GEO) | qa-geo |
| 5 | `qa-accessibility` | Accessibility (WCAG 2.2 AA) | qa-accesibilidad |
| 6 | `qa-design-tokens` | Design tokens | auditoria-design-tokens |
| 7 | `qa-figma-fidelity` | Fidelity to the Figma design | qa-fidelidad-figma |
| 8 | `qa-responsive-browsers` | Responsive layout and cross-browser | qa-responsive-navegadores |
| 9 | `qa-functionality` | Functional testing | qa-funcionalidad |
| 10 | `qa-security` | Security (configuration and code) | qa-seguridad |
| 11 | `qa-legal-spain` | Legal compliance (Spain/EU) | auditoria-legal-web-es |
| 12 | `qa-content` | Content and copy | qa-contenido |
| 13 | `qa-analytics` | Analytics and measurement | qa-analitica |
| 14 | `qa-deployment` | Deployment and infrastructure | qa-despliegue |
| 15 | `qa-maintainability` | Maintainability (score from 0 to 100) | qa-mantenibilidad |
| 16 | `qa-ai-generated-code` | Patterns typical of AI-generated code | qa-codigo-ia |
| 17 | `qa-ecodesign` | Ecodesign and carbon footprint | qa-ecodiseno |

## How the translation was checked

I extracted each skill's scripts from the English file and ran them next to the Spanish originals against a test Next.js 16 app with planted bugs. In every case they gave the same findings; only the language differed.

These parts could not be tested here and should be checked on the first real project:

- WebKit and Firefox, and real iPhone and Android devices.
- VoiceOver and NVDA screen readers.
- CrUX and Search Console data, GA4 with real traffic, and Vercel deployments over HTTPS.
- LanguageTool, a real cookie-consent platform, GitHub Actions, and the Figma MCP steps.

The minimum safe versions table in `qa-security` was checked on 26 October 2026. Recheck it on every run; the skill says how.
