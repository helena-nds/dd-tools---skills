// vitals-pw.mjs: LCP, CLS, INP, FCP and TTFB with the web-vitals library (attribution build) in Chromium via Playwright,
// emulating a mobile device with CPU x4 and slow 4G network. Lab: INP depends on the interactions that are simulated.
// Usage: node vitals-pw.mjs http://localhost:3000 / /servicios [--click="button.menu"] [--runs=3] [--no-throttle] > vitals.json
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
// The IIFE is not in "exports": it is located from the script's directory (/tmp/qa-performance-cwv/node_modules)
const WV = fileURLToPath(new URL('./node_modules/web-vitals/dist/web-vitals.attribution.iife.js', import.meta.url));

// A single init script: Playwright wraps each script in its own scope, so the library and the registration go together.
const INIT = readFileSync(WV, 'utf8') + `;window.__v = {}; const keep = m => { window.__v[m.name] = { value: m.value, a: m.attribution }; };
  for (const f of ['onLCP', 'onCLS', 'onINP', 'onFCP', 'onTTFB']) webVitals[f](keep, { reportAllChanges: true });`;
const args = process.argv.slice(2), flag = n => args.find(a => a.startsWith(`--${n}`));
const [base, ...paths] = args.filter(a => !a.startsWith('--'));
const clicks = args.filter(a => a.startsWith('--click=')).map(a => a.slice(8));
const RUNS = Number(flag('runs=')?.split('=')[1] || 3), throttle = !flag('no-throttle');
const THR = { LCP: [2500, 4000], CLS: [0.1, 0.25], INP: [200, 500], FCP: [1800, 3000], TTFB: [800, 1800] };
const median = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

const browser = await chromium.launch();
const out = [];
for (const path of (paths.length ? paths : ['/'])) {
  const url = new URL(path, base).href, runs = [];
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36' });
    const page = await ctx.newPage();
    if (throttle) { const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 }); }
    await page.addInitScript(INIT);
    const errors = [];
    page.on('requestfailed', r => errors.push(r.url().slice(0, 100)));
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(1500);
      for (let y = 0; y < 6; y++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(300); }   // triggers lazy-load and late shifts
      const targets = clicks.length ? clicks : ['h1'];                                                   // by default, a harmless click
      for (const sel of targets) { const el = page.locator(sel).first();
        if (await el.count()) { await el.scrollIntoViewIfNeeded().catch(() => {}); await el.click({ timeout: 5000, noWaitAfter: true }).catch(e => errors.push(`click ${sel}: ${e.message.split('\n')[0]}`)); await page.waitForTimeout(800); } }
      await page.keyboard.press('Tab'); await page.waitForTimeout(500);
      const v = await page.evaluate(() => { const s = x => x && JSON.parse(JSON.stringify(x, (k, val) => val instanceof Node || /Entry|entries|Entries$/.test(k) ? undefined : val)); return Object.fromEntries(Object.entries(window.__v).map(([k, m]) => [k, { value: m.value, a: s(m.a) }])); });
      runs.push({ v, errors });
    } catch (e) { runs.push({ error: e.message.split('\n')[0] }); }
    await ctx.close();
  }
  const ok = runs.filter(r => r.v);
  const metric = n => { const val = median(ok.map(r => r.v[n]?.value)); if (val == null) return { value: null, note: n === 'INP' ? 'no measurable interaction' : 'not reported' };
    const r = ok.find(x => x.v[n]?.value === val)?.v[n]?.a || {};
    const status = val <= THR[n][0] ? 'good' : val <= THR[n][1] ? 'needs-improvement' : 'poor';
    const attr = n === 'LCP' ? { element: r.target, url: r.url, ttfb: Math.round(r.timeToFirstByte), loadDelay: Math.round(r.resourceLoadDelay), loadDuration: Math.round(r.resourceLoadDuration), renderDelay: Math.round(r.elementRenderDelay) }
      : n === 'CLS' ? { largestShift: r.largestShiftTarget, value: r.largestShiftValue }
      : n === 'INP' ? { target: r.interactionTarget, type: r.interactionType, inputDelay: Math.round(r.inputDelay), processing: Math.round(r.processingDuration), presentation: Math.round(r.presentationDelay) } : undefined;
    return { value: n === 'CLS' ? +val.toFixed(3) : Math.round(val), status, ...(attr && { attribution: attr }) }; };
  out.push({ url, passes: ok.length, LCP: metric('LCP'), CLS: metric('CLS'), INP: metric('INP'), FCP: metric('FCP'), TTFB: metric('TTFB'),
    failedRequests: [...new Set(ok.flatMap(r => r.errors))], errors: runs.filter(r => r.error).map(r => r.error) });
}
await browser.close();
console.log(JSON.stringify({ conditions: throttle ? 'mobile 412x823, CPU x4, 150 ms RTT, 1.6 Mbps' : 'no throttling', results: out }, null, 1));
