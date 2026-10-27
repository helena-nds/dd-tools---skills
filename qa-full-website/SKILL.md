---
name: qa-full-website
description: Orchestrates the full QA of a Next.js website (generated from Figma with AI) before launch. Runs the 17 phase skills in order (code, performance, SEO, GEO, accessibility, tokens, Figma fidelity, responsive, functionality, security, legal, content, analytics, deployment, maintainability, AI-generated code and ecodesign), unifies severities and delivers an executive report with a launch verdict. Use it whenever someone asks for a full QA, a general audit, a "once-over before launch" or a review of several phases at once, even if they don't list the phases.
---

# Full QA of a Next.js website

The goal is to answer one question: **can this website be launched, and what has to be fixed first?** This skill doesn't audit anything by itself. It coordinates the skills for each phase, shares the setup between them (build, server, context data) so it isn't repeated 17 times, unifies the severities and delivers a single prioritized report.

**By default, no code is modified and nothing is installed in the project.** Each phase delivers its report; fixes are only applied if the user asks, and the affected phases are then run again.

## The 17 phases and their skills

| # | Phase | Skill | Needs a server | Needs anything else |
|---|---|---|---|---|
| 1 | Code optimization and organization | `qa-code-optimization` | No | — |
| 2 | Performance / Core Web Vitals | `qa-performance-cwv` | Yes | Public URL for field data (optional) |
| 3 | Technical SEO | `qa-technical-seo` | Yes | — |
| 4 | GEO (AI search engines) | `qa-geo` | Yes | Public URL to test CDN/WAF (optional) |
| 5 | Accessibility | `qa-accessibility` | Yes | — |
| 6 | Design tokens | `qa-design-tokens` | No | Figma URL (optional) |
| 7 | Figma fidelity | `qa-figma-fidelity` | Yes | Figma URL and Figma MCP server |
| 8 | Responsive and browsers | `qa-responsive-browsers` | Yes | — |
| 9 | Functionality | `qa-functionality` | Yes | Test environment for forms |
| 10 | Security | `qa-security` | Yes | — |
| 11 | Legal (Spain/EU) | `qa-legal-spain` | Yes | Company data (headcount, B2C…) |
| 12 | Content | `qa-content` | Yes | — |
| 13 | Analytics | `qa-analytics` | Yes | Analytics tool in use |
| 14 | Deployment | `qa-deployment` | Build + deployed URL | Staging/production URL |
| 15 | Maintainability | `qa-maintainability` | No | — |
| 16 | AI-generated code | `qa-ai-generated-code` | No | — |
| 17 | Ecodesign | `qa-ecodesign` | Yes | — |

If a skill isn't installed, say so at the start, mark that phase as "not evaluated" and carry on with the rest. Don't improvise it without the skill.

## Step 0. Scope and data (a single round of questions)

Ask everything at once, so you don't interrupt at every phase:

1. **Which phases**: all (default) or a subset. A full QA is long and uses a lot of resources: if the user is in a hurry, suggest starting with the ones that block launch (security, legal, functionality, accessibility, technical SEO, deployment).
2. **Figma URL** (phases 6 and 7) and whether there is a seat with access to the Figma MCP server.
3. **Staging or production URL** (phases 2, 4 and 14). If there is only a local build, those phases run locally and the limitation is noted.
4. **Company data** for the legal phase: legal form, number of employees, whether it sells online to consumers, regulated profession, autonomous community (comunidad autónoma, Spanish region).
5. **Analytics** in use (GA4, Plausible, Vercel Analytics…) and whether there is a test environment to submit forms without reaching production.
6. **Where to save the reports**. By default in `/tmp/qa-full-website/<date>/`, outside the repo; if the user wants them in the project, suggest a `qa-reports/` folder and adding it to `.gitignore` (with their permission).

If you are working without the user present, use the defaults, note the assumptions at the top of the report and mark as "not assessable" whatever depends on missing data.

## Step 1. Shared setup

Do it once and reuse it in every phase:

1. **Technical context**: Next version (`package.json`), App/Pages Router, Tailwind v3/v4, `cacheComponents`, package manager, hosting, current commit (`git rev-parse --short HEAD`). Pass it to each phase so it doesn't have to work it out again.
2. **Production build**: `next build` (warn that it regenerates `.next`). Save the full output to `/tmp/qa-full-website/<date>/build.log`: optimization, performance and deployment use it.
3. **Server**: start `next start` on a free port in the background and note the base URL. Every phase that needs a server uses the same one. Never use `next dev` for auditing: it adds overlays and doesn't reproduce production caching.
4. **Route map**: list the routes from `app/**/page.*` and those in the sitemap if there is one. Pass it to the phases that walk the site (SEO, accessibility, functionality, content, responsive, ecodesign), so they all cover the same pages.

## Step 2. Run the phases

**Recommended order**: first the static, fast phases that need no server; then the browser phases; finally those that depend on deployment or third parties.

1. Static: 1 optimization → 16 AI-generated code → 15 maintainability → 6 tokens → 10 security (the code part).
2. Browser: 9 functionality → 5 accessibility → 8 responsive → 3 SEO → 4 GEO → 12 content → 2 performance → 17 ecodesign → 13 analytics → 11 legal → 7 Figma fidelity (last: it uses Figma quota).
3. Deployment: 14 deployment and the headers part of 10 security against the deployed URL.

For each phase:

- Load the skill and follow its steps. Use the shared context, server and route map.
- Save its report to `/tmp/qa-full-website/<date>/<nn>-<skill>.md` (with the JSON files next to it), even if the skill suggests another name.
- If a phase fails or gets blocked (missing data, Figma limit, network), note it and move on to the next. Don't stop the whole QA.
- If you have subagents available and the user hasn't said otherwise, the static phases can run in parallel. The browser phases share the server: at most 2–3 in parallel.

**Overlaps** (don't count the same problem twice; assign it to one phase and cite it in the others):

| Problem | Owner phase | Also seen by |
|---|---|---|
| Unnecessary `"use client"`, heavy imports | 1 optimization | 2 performance, 16 AI-generated code |
| Duplicate components, unused files | 1 optimization | 16 AI-generated code |
| Hardcoded colors and sizes | 6 tokens | 7 Figma, 16 AI-generated code |
| Secrets, CVEs, headers | 10 security | 14 deployment, 16 AI-generated code |
| Google Fonts, GA, YouTube and Maps before consent | 11 legal | 2 performance, 13 analytics, 9 functionality |
| `lang`, duplicate h1, images without alt | 5 accessibility | 3 SEO, 12 content |
| Horizontal overflow on mobile | 8 responsive | 7 Figma, 5 accessibility (reflow) |
| Broken links | 9 functionality | 3 SEO |
| Default metadata, template text | 12 content | 3 SEO |
| `noindex` and robots | 3 SEO | 14 deployment, 4 GEO |

## Step 3. Unify severities

The skills use different scales. Convert them all to this one:

| Unified | Equivalents |
|---|---|
| **Critical** (blocks launch) | Critical · critical · P0 (Blocker, `qa-figma-fidelity`) · "Legal non-compliance" / "Non-compliance" (`qa-legal-spain`) |
| **High** (fix before launch if possible) | High · high · P1 · "High risk" (`qa-legal-spain`) |
| **Medium** (plan it) | Medium · medium · P2 |
| **Low** (polish) | Low · low · info · P3 · "Recommended improvement" (`qa-legal-spain`) |
| **Not evaluated** | "Not assessable" (`qa-legal-spain`), blocked phases or phases without a skill |

**Launch verdict**:

- **DO NOT LAUNCH**: there is at least one Critical.
- **LAUNCH WITH RISK**: no Criticals, but open Highs. List them with who decides to accept them.
- **READY TO LAUNCH**: no Criticals or Highs.

A "Not evaluated" in security, legal or functionality rules out "READY": at most "LAUNCH WITH RISK", explaining what's missing.

## Step 4. Consolidated report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

Write the report in the user's language.

Save it as `/tmp/qa-full-website/<date>/00-qa-report.md`:

```markdown
# Full QA — <project> — <date> — commit <hash>
Verdict: DO NOT LAUNCH · Critical: 3 · High: 11 · Medium: 24 · Low: 30 · Not evaluated: 1 phase
Environment: Next 16.x · Tailwind v4 · local next start + staging <url> · Figma <url>
Assumptions: …

## Summary by phase
| # | Phase | Status | Crit. | High | Medium | Low | Report |
|---|---|---|---|---|---|---|---|
| 10 | Security | ✗ | 1 | 2 | 3 | 1 | 10-qa-security.md |
| 7 | Figma fidelity | Blocked (call limit) | – | – | – | – | 07-qa-figma-fidelity.md |

## Launch blockers (Critical)
| ID | Phase | Finding | Evidence | Fix | Effort |
|---|---|---|---|---|---|
| SEC-001 | Security | /api/contact returns every environment variable | app/api/contact/route.ts:3 | Return only `{ ok: true }` | 5 min |

## Fix before launch (High)
## Plan by blocks
1. Quick wins (< 1 h in total): …
2. Before launch: …
3. Next iteration: …
## Not evaluated and why
## Appendices: report for each phase
```

- Sort Criticals and Highs by **impact ÷ effort**: serious and quick first.
- Group fixes that touch the same file, even if they come from different phases: the layout usually piles up findings from legal, SEO, accessibility and performance at once.
- Keep the executive report short (1–2 screens). The detail lives in each phase's report.

When you finish, stop the server you started and tell the user where the reports are. If they want them in their folder, copy them with their permission.

## If the user asks for fixes

1. Fix by plan blocks, starting with the Criticals.
2. After each block, rebuild and run **only the phases affected** by the files touched.
3. Update the consolidated report with a "History" section: finding → change → result of the new verification.
4. Don't mark a finding as resolved without verifying it with the same check that detected it.
