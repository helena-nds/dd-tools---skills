// lh-multi.mjs: Lighthouse (mobile, simulated throttling) on several routes, N runs, median and summary of opportunities.
// Usage: CHROME_PATH=/path/chrome node lh-multi.mjs http://localhost:3000 / /servicios /contacto [--runs=3] [--desktop] > lighthouse.json
// Full reports are saved in ./lh/<route>-<n>.json to open them in https://googlechrome.github.io/lighthouse/viewer/
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2), flags = args.filter(a => a.startsWith('--')), pos = args.filter(a => !a.startsWith('--'));
const base = pos[0], paths = pos.slice(1).length ? pos.slice(1) : ['/'];
const RUNS = Number((flags.find(f => f.startsWith('--runs=')) || '--runs=3').split('=')[1]);
const desktop = flags.includes('--desktop');
mkdirSync('lh', { recursive: true });
const median = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const KEYS = { LCP: 'largest-contentful-paint', CLS: 'cumulative-layout-shift', TBT: 'total-blocking-time', FCP: 'first-contentful-paint', SI: 'speed-index' };
const THR = { LCP: [2500, 4000], CLS: [0.1, 0.25], TBT: [200, 600], FCP: [1800, 3000] };   // TBT: Lighthouse thresholds, INP proxy in the lab
const rate = (k, v) => !THR[k] ? undefined : v <= THR[k][0] ? 'good' : v <= THR[k][1] ? 'needs-improvement' : 'poor';

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
const results = [];
for (const path of paths) {
  const url = new URL(path, base).href, runs = [];
  for (let i = 0; i < RUNS; i++) {
    try {
      const r = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance'], ...(desktop && { preset: 'desktop' }) },
        desktop ? (await import('lighthouse/core/config/desktop-config.js')).default : undefined);
      const lhr = r.lhr; writeFileSync(`lh/${path.replace(/\W+/g, '_') || 'home'}-${i}.json`, r.report);
      if (lhr.runtimeError) { runs.push({ error: lhr.runtimeError.message }); continue; }
      runs.push({ lhr, score: Math.round(lhr.categories.performance.score * 100) });
    } catch (e) { runs.push({ error: e.message }); }
  }
  const ok = runs.filter(r => r.lhr);
  if (!ok.length) { results.push({ url, error: runs.map(r => r.error) }); continue; }
  const med = ok.find(r => r.score === median(ok.map(x => x.score)));                      // median run by score
  const A = med.lhr.audits;
  const metrics = Object.fromEntries(Object.entries(KEYS).map(([k, id]) => { const v = median(ok.map(r => r.lhr.audits[id]?.numericValue ?? NaN));
    return [k, { value: k === 'CLS' ? +v.toFixed(3) : Math.round(v), status: rate(k, v) }]; }));
  const items = id => A[id]?.details?.items || [];
  const lcpEl = A['lcp-breakdown-insight']?.details?.items?.find(i => i.type === 'node');
  const phases = A['lcp-breakdown-insight']?.details?.items?.find(i => i.type === 'table')?.items?.map(i => `${i.subpart}: ${Math.round(i.duration)} ms`);
  const opportunities = Object.values(A).filter(a => a.score !== null && a.score < 0.9 && !Object.values(KEYS).includes(a.id) && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable')
    .map(a => ({ id: a.id, title: a.title, value: a.displayValue || undefined, savingsMs: a.metricSavings?.LCP || a.metricSavings?.FCP || undefined, score: a.score }))
    .sort((a, b) => (a.score ?? 1) - (b.score ?? 1)).slice(0, 12);
  const reqs = items('network-requests');
  results.push({ url, passes: ok.length, scores: ok.map(r => r.score), medianScore: med.score, metrics,
    lcpElement: lcpEl ? { selector: lcpEl.selector, snippet: lcpEl.snippet } : undefined, lcpPhases: phases,
    totalWeightKB: Math.round((A['total-byte-weight']?.numericValue || 0) / 1024), requests: reqs.length,
    failedRequests: reqs.filter(r => r.statusCode >= 400 || r.statusCode === -1 || r.failed).map(r => r.url.slice(0, 100)),
    thirdParties: items('third-parties-insight').map(i => ({ entity: i.entity?.text || i.entity, kb: Math.round((i.transferSize || 0) / 1024), mainThreadMs: Math.round(i.mainThreadTime || 0) })),
    unsizedImages: items('unsized-images').map(i => i.url || i.node?.snippet),
    opportunities, benchmarkIndex: med.lhr.environment?.benchmarkIndex, lighthouse: med.lhr.lighthouseVersion,
    warnings: med.lhr.runWarnings?.length ? med.lhr.runWarnings : undefined });
}
await chrome.kill();
console.log(JSON.stringify({ mode: desktop ? 'desktop' : 'mobile (simulated Moto G Power, simulated slow 4G)', runs: RUNS, results }, null, 1));
