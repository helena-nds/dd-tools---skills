// render-check.mjs: compares the served HTML (no JS) with the DOM rendered in Chromium (with JS).
// Detects content, links, title, canonical or robots that only exist after running JavaScript.
// Usage: node render-check.mjs <url1> [url2 ...]   |   node render-check.mjs --pages seo-out/pages.jsonl
// Output: JSON per URL with differences and findings.
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
let urls = args.filter(a => /^https?:/.test(a));
const pi = args.indexOf('--pages');
if (pi >= 0) urls = readFileSync(args[pi + 1], 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(p => p.status === 200 && !p.redirectsTo && /html/.test(p.contentType || '')).map(p => p.url);

const EXTRACT = html => {
  const $ = cheerio.load(html.replace(/></g, '> <'));   // space between tags so words can be counted
  const meta = { title: $('title').first().text().trim(), description: $('meta[name="description"]').attr('content') || '',
    canonical: $('link[rel="canonical"]').attr('href') || '', robots: $('meta[name="robots"]').map((_, e) => $(e).attr('content')).get().join(','),
    h1: $('h1').map((_, e) => $(e).text().trim()).get().join(' | '), links: $('a[href]').length, jsonLd: $('script[type="application/ld+json"]').length };
  $('script,style,noscript,template,svg,title').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return { ...meta, words: text ? text.split(' ').length : 0, text };
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 qa-technical-seo', locale: 'es-ES' });
const out = [];
for (const url of urls) {
  try {
    const raw = EXTRACT(await (await fetch(url, { headers: { 'user-agent': 'qa-technical-seo' } })).text());
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    const ren = EXTRACT(await page.content());
    await page.close();
    const issues = [];
    const onlyJsWords = ren.words - raw.words;
    if (onlyJsWords > 100 && ren.words > raw.words * 1.5) issues.push({ sev: 'High', code: 'content-only-with-js', detail: `${raw.words} words without JS vs ${ren.words} with JS` });
    else if (onlyJsWords > 30) issues.push({ sev: 'Low', code: 'some-content-with-js', detail: `+${onlyJsWords} words after JS` });
    for (const k of ['title', 'canonical', 'robots', 'description', 'h1'])
      if (raw[k] !== ren[k]) issues.push({ sev: ['canonical', 'robots'].includes(k) ? 'High' : 'Medium', code: `${k}-changes-with-js`, detail: `without JS: "${raw[k].slice(0, 80)}" · with JS: "${ren[k].slice(0, 80)}"` });
    if (ren.links > raw.links) issues.push({ sev: 'Medium', code: 'links-only-with-js', detail: `${raw.links} links without JS vs ${ren.links} with JS` });
    if (ren.jsonLd > raw.jsonLd) issues.push({ sev: 'Medium', code: 'jsonld-only-with-js', detail: `${raw.jsonLd} vs ${ren.jsonLd}` });
    // Sentences that only appear with JS (sample)
    const rawSet = new Set(raw.text.split(/(?<=[.!?])\s+/));
    const jsOnly = ren.text.split(/(?<=[.!?])\s+/).filter(s => s.length > 30 && !rawSet.has(s) && !raw.text.includes(s)).slice(0, 3);
    out.push({ url, raw: { words: raw.words, links: raw.links, title: raw.title, h1: raw.h1 }, rendered: { words: ren.words, links: ren.links, title: ren.title, h1: ren.h1 }, jsOnlySample: jsOnly, issues });
  } catch (e) { out.push({ url, error: e.message.split('\n')[0] }); }
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
