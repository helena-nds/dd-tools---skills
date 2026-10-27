// page-weight-co2.mjs: measures per page the real transfer (bytes on the wire, empty cache and repeat visit), requests by type and
// by origin, oversized media, autoplay and fonts; estimates CO2e with CO2.js (Sustainable Web Design v4).
// Usage: node page-weight-co2.mjs https://staging.ejemplo.es / /servicios [--grid=ESP] [--green=auto|true|false] [--no-scroll] > eco.json
import { chromium } from 'playwright';
import { co2, averageIntensity } from '@tgwf/co2';
import { check as greenCheck } from '@tgwf/co2/hosting';

const args = process.argv.slice(2), opt = (n, d) => (args.find(a => a.startsWith(`--${n}=`)) || `=${d}`).split('=')[1];
const [base, ...paths] = args.filter(a => !a.startsWith('--'));
const GRID = opt('grid', 'ESP'), GREEN = opt('green', 'auto'), SCROLL = !args.includes('--no-scroll');
const BUDGET = { targetKB: 975, idealKB: 530, requests: 40, thirdParties: 5 };   // see SKILL.md: 530 kB ≈ rating A, 975 kB ≈ B limit
const host = new URL(base).hostname, site = h => h.split('.').slice(-2).join('.');
const kB = b => Math.round(b / 100) / 10;                                         // decimal kB (the SWD model uses GB = 1e9 bytes)

let green = GREEN === 'true', greenInfo = GREEN === 'auto' ? 'not checked' : `forced by parameter (${GREEN})`;
if (GREEN === 'auto' && !/^(localhost|127\.|192\.168\.|10\.)/.test(host)) {
  try { const r = await Promise.race([greenCheck(host, { verbose: true, userAgentIdentifier: 'qa-ecodesign' }), new Promise((_, j) => setTimeout(() => j(new Error('timeout')), 8000))]);
    green = !!r.green; greenInfo = r.green ? `green (${r.hosted_by || 'verified provider'})` : 'not verified as green by Green Web Foundation'; }
  catch (e) { greenInfo = `could not query the Green Web Foundation API (${e.message})`; } }

const swd = new co2({ model: 'swd', version: 4, rating: true });
const gi = averageIntensity.data[GRID];
const visitOpts = { dataReloadRatio: 0, firstVisitPercentage: 1, returnVisitPercentage: 0 };     // first visit, empty cache
const estimate = bytes => ({ global: swd.perVisit(bytes, green),                                 // comparable with Website Carbon and the A+–F scale
  [GRID]: gi ? +swd.perVisitTrace(bytes, green, { ...visitOpts, gridIntensity: { device: { country: GRID }, dataCenter: { country: GRID }, network: { country: GRID } } }).co2.total.toFixed(4) : 'unknown country code' });

const browser = await chromium.launch();
const pages = [];
for (const path of (paths.length ? paths : ['/'])) {
  const url = new URL(path, base).href;
  const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  const req = new Map(); let phase = 'initial';
  cdp.on('Network.requestWillBeSent', e => { if (!req.has(e.requestId)) req.set(e.requestId, { url: e.request.url, type: e.type, phase, bytes: 0 }); });
  cdp.on('Network.responseReceived', e => { const r = req.get(e.requestId); if (r) { r.status = e.response.status; r.mime = e.response.mimeType; r.type = e.type || r.type; } });
  cdp.on('Network.loadingFinished', e => { const r = req.get(e.requestId); if (r) r.bytes = e.encodedDataLength; });
  cdp.on('Network.loadingFailed', e => { const r = req.get(e.requestId); if (r) r.failed = e.errorText; });
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    if (SCROLL) { phase = 'scroll';
      for (let i = 0; i < 15; i++) { await page.mouse.wheel(0, 800); await page.waitForTimeout(250); }
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(2000); }   // autoplay, lazy-load, deferred third parties
    const dom = await page.evaluate(() => ({
      imgs: [...document.images].filter(i => i.currentSrc && i.naturalWidth).map(i => ({ src: i.currentSrc.slice(0, 120), natural: `${i.naturalWidth}x${i.naturalHeight}`, displayed: `${Math.round(i.clientWidth)}x${Math.round(i.clientHeight)}`,
        ratio: i.clientWidth ? +(i.naturalWidth / (i.clientWidth * devicePixelRatio)).toFixed(1) : null, lazy: i.loading === 'lazy' })),
      videos: [...document.querySelectorAll('video')].map(v => ({ src: (v.currentSrc || v.src || '').slice(0, 120), autoplay: v.autoplay, muted: v.muted, poster: !!v.poster, preload: v.preload, loop: v.loop })),
      iframes: [...document.querySelectorAll('iframe')].map(f => ({ src: f.src.slice(0, 120), lazy: f.loading === 'lazy' })),
      fonts: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family} ${f.weight} ${f.style}`))],
      prefersDark: !![...document.styleSheets].find(s => { try { return [...s.cssRules].some(r => /prefers-color-scheme/.test(r.conditionText || r.media?.mediaText || '')); } catch { return false; } }) }));
    const all = [...req.values()].filter(r => !r.url.startsWith('data:'));
    const total = all.reduce((a, r) => a + r.bytes, 0), initial = all.filter(r => r.phase === 'initial').reduce((a, r) => a + r.bytes, 0);
    const byType = {}, byOrigin = {};
    for (const r of all) { const t = (r.type || 'Other'); byType[t] = byType[t] || { n: 0, kB: 0 }; byType[t].n++; byType[t].kB = kB(byType[t].kB * 1000 + r.bytes);
      let h; try { h = new URL(r.url).hostname; } catch { h = '?'; } const o = site(h) === site(host) ? '(first-party)' : h;
      byOrigin[o] = byOrigin[o] || { n: 0, kB: 0 }; byOrigin[o].n++; byOrigin[o].kB = kB(byOrigin[o].kB * 1000 + r.bytes); }
    // Repeat visit: same session, the HTTP cache should avoid almost everything
    for (const r of req.values()) r.repeat = false; phase = 'repeat'; const before = new Set(req.keys());
    await page.goto(url, { waitUntil: 'load', timeout: 60000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const repeat = [...req.entries()].filter(([id]) => !before.has(id)).map(([, r]) => r);
    const repeatBytes = repeat.reduce((a, r) => a + r.bytes, 0);
    const thirdParties = Object.keys(byOrigin).filter(o => o !== '(first-party)');
    const issues = [];
    if (total > BUDGET.targetKB * 1000) issues.push({ sev: total > 2.4e6 ? 'high' : 'medium', msg: `weight ${kB(total)} kB > ${BUDGET.targetKB} kB` });
    if (all.length > BUDGET.requests) issues.push({ sev: 'medium', msg: `${all.length} requests > ${BUDGET.requests}` });
    if (thirdParties.length > BUDGET.thirdParties) issues.push({ sev: 'medium', msg: `${thirdParties.length} third-party domains` });
    for (const i of dom.imgs.filter(i => i.ratio > 1.5 && !/\.svg(\?|$)|^data:image\/svg/.test(i.src)))   // SVG: scales at no cost
      issues.push({ sev: i.ratio > 3 ? 'high' : 'medium', msg: `image ${i.ratio}x larger than needed (${i.natural} for ${i.displayed} css px): ${i.src}` });
    for (const v of dom.videos.filter(v => v.autoplay)) issues.push({ sev: 'medium', msg: `autoplay video${v.loop ? ' in a loop' : ''}${v.poster ? '' : ' without poster'}: ${v.src}` });
    for (const f of dom.iframes.filter(f => /youtube|vimeo|google\.com\/maps/.test(f.src))) issues.push({ sev: 'medium', msg: `third-party embed loaded without interaction: ${f.src}` });
    const fontB = all.filter(r => r.type === 'Font').reduce((a, r) => a + r.bytes, 0);
    if (fontB > 100e3) issues.push({ sev: 'low', msg: `fonts: ${kB(fontB)} kB in ${all.filter(r => r.type === 'Font').length} files (subset, fewer weights/families, woff2)` });
    if (new Set(dom.fonts.map(f => f.split(' ')[0])).size > 2) issues.push({ sev: 'low', msg: `${new Set(dom.fonts.map(f => f.split(' ')[0])).size} font families loaded` });
    if (repeatBytes > total * 0.2) issues.push({ sev: 'medium', msg: `the repeat visit downloads ${kB(repeatBytes)} kB (${Math.round(repeatBytes / total * 100)} %): review Cache-Control` });
    for (const r of all.filter(r => r.failed || r.status >= 400)) issues.push({ sev: 'low', msg: `failed request (${r.failed || r.status}): ${r.url.slice(0, 100)}` });
    pages.push({ url, transferKB: kB(total), initialKB: kB(initial), afterScrollKB: kB(total - initial), requests: all.length, repeatKB: kB(repeatBytes),
      co2gPerVisit: estimate(total), byType, byOrigin, largest: all.sort((a, b) => b.bytes - a.bytes).slice(0, 8).map(r => ({ kB: kB(r.bytes), type: r.type, url: r.url.slice(0, 110) })),
      images: dom.imgs.length, videos: dom.videos, fonts: dom.fonts, darkModeCSS: dom.prefersDark, issues });
  } catch (e) { pages.push({ url, error: e.message.split('\n')[0] }); }
  await ctx.close();
}
await browser.close();
const ok = pages.filter(p => !p.error);
console.log(JSON.stringify({ model: 'Sustainable Web Design v4 (CO2.js), g CO2e per new visit', hosting: { host, green, info: greenInfo },
  intensity: { global: 494, [GRID]: gi ?? null, unit: 'g CO2e/kWh' }, budget: BUDGET,
  averageKB: ok.length ? kB(ok.reduce((a, p) => a + p.transferKB * 1000, 0) / ok.length) : null, pages }, null, 1));
