// axe.mjs: axe-core per route with the WCAG 2.0/2.1/2.2 A and AA tags (+ best-practice separately).
// Usage: node axe.mjs <baseUrl> <route1,route2,...> <outDir> [width=1280]
//   → <outDir>/axe.jsonl (one line per failed rule and route) and a console summary
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const [base, routes = '/', outDir = '.', width = '1280'] = process.argv.slice(2);
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: +width, height: 900 }, locale: 'es-ES', reducedMotion: 'reduce' });
const lines = [], summary = [];
for (const route of routes.split(',')) {
  const page = await ctx.newPage();
  const url = new URL(route, base).href;
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    // Two passes: WCAG (normative) and best-practice (recommendation). The Next dev overlay is excluded.
    for (const [group, tags] of [['wcag', WCAG], ['best-practice', ['best-practice']]]) {
      const r = await new AxeBuilder({ page }).withTags(tags).exclude('nextjs-portal').analyze();
      for (const v of r.violations) lines.push({
        route, status: resp?.status(), group, rule: v.id, impact: v.impact,
        wcag: v.tags.filter(t => /^wcag\d{3,4}$/.test(t)).map(t => t.replace(/^wcag(\d)(\d)(\d+)$/, '$1.$2.$3')),
        help: v.help, url: v.helpUrl, nodes: v.nodes.length,
        examples: v.nodes.slice(0, 5).map(n => ({ selector: n.target.join(' '), html: n.html.slice(0, 160), summary: n.failureSummary?.split('\n').slice(0, 3).join(' | ') })) });
      if (group === 'wcag') summary.push({ route, violations: r.violations.length, nodes: r.violations.reduce((a, v) => a + v.nodes.length, 0),
        reviewManually: r.incomplete.map(i => `${i.id}(${i.nodes.length})`), rulesPassed: r.passes.length });
    }
  } catch (e) { summary.push({ route, error: e.message.split('\n')[0] }); }
  await page.close();
}
writeFileSync(`${outDir}/axe.jsonl`, lines.map(l => JSON.stringify(l)).join('\n') + '\n');
console.log(JSON.stringify({ width: +width, summary, byRule: Object.entries(lines.reduce((a, l) => ((a[`${l.group}:${l.rule}`] = (a[`${l.group}:${l.rule}`] || 0) + l.nodes), a), {})) }, null, 1));
await browser.close();
