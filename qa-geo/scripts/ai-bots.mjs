// ai-bots.mjs: requests each page with the user-agents of AI search engines and crawlers and compares with a browser.
// Checks: robots.txt per token (includes tokens with no UA of their own, such as Google-Extended and Applebot-Extended),
// status, CDN/WAF blocks (403/429/503, challenge), size and text without JS, expected sentences, title/h1,
// metadata in <body> (Next streaming for UAs not in htmlLimitedBots) and /llms.txt.
// Usage: node ai-bots.mjs <baseUrl> [/route ...] [--site https://production-domain.es] [--expect "sentence|/route=sentence"] [--bots GPTBot,ClaudeBot]
// Warning: the UA can be spoofed, the IP can't. A CDN that verifies bots by IP/signature may treat the real bot differently.
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const flagVals = new Set(['site', 'expect', 'bots'].flatMap(k => { const i = args.indexOf(`--${k}`); return i >= 0 ? [args[i + 1]] : []; }));
const BASE = new URL(args[0] || 'http://localhost:3000/');
const SITE = opt('site') ? new URL(opt('site')).origin : BASE.origin;
const paths = args.slice(1).filter(a => a.startsWith('/') && !flagVals.has(a));
if (!paths.length) paths.push('/');
// --expect "sentence" (all routes) or "/route=sentence" (that route only), separated by |
const EXPECT_ALL = (opt('expect', '') || '').split('|').map(s => s.trim()).filter(Boolean);
const expectFor = p => EXPECT_ALL.flatMap(e => { const m = e.match(/^(\/[^=]*)=(.+)$/); return m ? (m[1] === p ? [m[2]] : []) : [e]; });
const ONLY = opt('bots') ? new Set(opt('bots').split(',')) : null;

// type: search = index for answers with links · user = request initiated by a person · train = training · control = token with no UA of its own
// robots: what the official docs say about robots.txt (verified 2026-10)
const BOTS = [
  { token: 'Chrome', type: 'baseline', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' },
  { token: 'Googlebot', type: 'search', ua: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', note: 'Search, AI Overviews and AI Mode' },
  { token: 'Bingbot', type: 'search', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/141.0.0.0 Safari/537.36', note: 'Bing and Copilot' },
  { token: 'OAI-SearchBot', type: 'search', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot', note: 'ChatGPT search' },
  { token: 'ChatGPT-User', type: 'user', ignores: true, ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot', note: 'robots.txt may not apply' },
  { token: 'GPTBot', type: 'train', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.4; +https://openai.com/gptbot' },
  { token: 'Claude-SearchBot', type: 'search', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +https://www.anthropic.com)', note: 'approximate UA: Anthropic only publishes the token' },
  { token: 'Claude-User', type: 'user', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +https://www.anthropic.com)', note: 'approximate UA' },
  { token: 'ClaudeBot', type: 'train', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)', note: 'approximate UA' },
  { token: 'PerplexityBot', type: 'search', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)' },
  { token: 'Perplexity-User', type: 'user', ignores: true, ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)', note: 'ignores robots.txt (official docs)' },
  { token: 'Applebot', type: 'search', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)', note: 'Siri/Spotlight/Safari; may also train' },
  { token: 'meta-webindexer', type: 'search', ua: 'meta-webindexer/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)', note: 'Meta AI search' },
  { token: 'meta-externalagent', type: 'train', ua: 'meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)' },
  { token: 'meta-externalfetcher', type: 'user', ignores: true, ua: 'meta-externalfetcher/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)', note: 'may ignore robots.txt' },
  { token: 'CCBot', type: 'train', ua: 'CCBot/2.0 (https://commoncrawl.org/faq/)', note: 'Common Crawl: open dataset used by many models' },
  { token: 'Bytespider', type: 'train', ua: 'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)', note: 'no official docs; reported not to respect robots.txt' },
  { token: 'Google-Extended', type: 'control', note: 'no UA: Gemini training and grounding in Gemini/Vertex; does not affect Search or AI Overviews' },
  { token: 'Applebot-Extended', type: 'control', note: 'no UA: training of Apple models; does not affect search' },
].filter(b => !ONLY || b.type === 'baseline' || ONLY.has(b.token));

async function get(url, ua) {
  let cur = url; const chain = [];
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(cur, { redirect: 'manual', headers: { 'user-agent': ua, accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'accept-language': 'es-ES,es;q=0.9' }, signal: AbortSignal.timeout(20000) });
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { chain.push(r.status); cur = new URL(r.headers.get('location'), cur).href; continue; }
      return { status: r.status, chain, headers: Object.fromEntries(r.headers), body: await r.text() };
    } catch (e) { return { status: 0, chain, error: String(e.cause?.code || e.message), headers: {}, body: '' }; }
  }
  return { status: 0, chain, error: 'too many redirects', headers: {}, body: '' };
}
const CHALLENGE = /just a moment|cf-chl|challenge-platform|captcha|are you a robot|verify you are human/i;
const BLOCKPAGE = /access denied|request blocked|attention required|forbidden|bot detected|not allowed/i;
function analyze(r) {
  const $ = cheerio.load((r.body || '').replace(/></g, '> <'));   // space between tags to count words
  const headTitle = $('head title').first().text().trim(), bodyTitle = $('body title').first().text().trim();
  const metaInBody = $('body meta[name="description"], body link[rel="canonical"], body meta[property^="og:"], body title').length;
  const jsonLd = $('script[type="application/ld+json"]').length;
  $('script,style,noscript,template,svg,title').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return { headTitle, bodyTitle, metaInBody, jsonLd, h1: $('h1').first().text().trim().slice(0, 80), words: text ? text.split(' ').length : 0, text,
    robots: [cheerio.load(r.body || '')('meta[name="robots"]').attr('content'), r.headers['x-robots-tag']].filter(Boolean).join(' | ') };
}
const jaccard = (a, b) => { const A = new Set(a.toLowerCase().split(/\W+/)), B = new Set(b.toLowerCase().split(/\W+/)); const i = [...A].filter(x => B.has(x)).length; return +(i / (A.size + B.size - i || 1)).toFixed(2); };

const issues = []; const add = (sev, code, where, detail) => issues.push({ sev, code, where, detail });

// ---------- robots.txt ----------
const rr = await get(new URL('/robots.txt', BASE).href, BOTS[0].ua);
const robotsTxt = rr.status === 200 ? rr.body : '';
const parser = robotsParser(new URL('/robots.txt', SITE).href, robotsTxt);
const contentSignals = robotsTxt.split('\n').filter(l => /^\s*content-signal\s*:/i.test(l)).map(l => l.trim());
const explicit = new Set([...robotsTxt.matchAll(/^\s*user-agent\s*:\s*(.+)$/gim)].map(m => m[1].trim().toLowerCase()));
const robotsMatrix = {};
for (const b of BOTS.filter(b => b.type !== 'baseline')) {
  robotsMatrix[b.token] = { type: b.type, ownGroup: explicit.has(b.token.toLowerCase()),
    routes: Object.fromEntries(paths.map(p => [p, parser.isAllowed(new URL(p, SITE).href, b.token) !== false ? 'allowed' : 'blocked'])) };
  const blocked = Object.entries(robotsMatrix[b.token].routes).filter(([, v]) => v === 'blocked').map(([p]) => p);
  if (blocked.length && b.type === 'search') add(['Googlebot', 'Bingbot'].includes(b.token) ? 'Critical' : 'High', 'robots-blocks-search-engine', b.token, `${b.note ? b.note + ' · ' : ''}blocked on ${blocked.join(', ')}: it will not appear (or will appear with less detail) in that search engine`);
  if (blocked.length && b.type === 'user') add(b.ignores ? 'Low' : 'Medium', 'robots-blocks-user-bot', b.token, b.ignores ? 'blocked in robots.txt, but this bot may ignore it (official docs): to block it, it has to be done at the CDN'
    : 'blocked in robots.txt and it respects it: the assistant will not be able to open the page when a user asks for it');
}
const trainDecision = BOTS.filter(b => ['train', 'control'].includes(b.type)).map(b => `${b.token}: ${Object.values(robotsMatrix[b.token].routes).includes('blocked') ? 'blocked' : 'allowed'}${robotsMatrix[b.token].ownGroup ? '' : ' (implicit, no own group)'}`);
if (rr.status !== 200) add('Medium', 'no-robots', '/robots.txt', `status ${rr.status}: no explicit decision about AI bots`);
else if (!BOTS.some(b => b.type !== 'baseline' && robotsMatrix[b.token].ownGroup)) add('Low', 'robots-no-ai-decision', '/robots.txt', 'no group for AI bots: everything inherited from User-agent: *');

// ---------- Pages × user-agents ----------
const results = [];
for (const p of paths) {
  const url = new URL(p, BASE).href;
  const base = await get(url, BOTS[0].ua); const ba = analyze(base);
  const row = { path: p, baseline: { status: base.status, bytes: base.body.length, words: ba.words, title: ba.headTitle, h1: ba.h1, jsonLd: ba.jsonLd, metaInBody: ba.metaInBody }, bots: {} };
  const EXPECT = expectFor(p);
  for (const e of EXPECT) if (!ba.text.includes(e)) add('High', 'phrase-missing-without-js', p, `"${e}" is not in the served HTML (it is painted on the client: AI crawlers don't run JS)`);
  for (const b of BOTS.filter(b => b.ua && b.type !== 'baseline')) {
    const r = await get(url, b.ua); const a = analyze(r);
    const challenged = r.headers['cf-mitigated'] === 'challenge' || (r.status >= 400 && CHALLENGE.test(r.body));
    const blockPage = r.status >= 400 && !challenged && BLOCKPAGE.test(r.body.slice(0, 5000));
    const sim = jaccard(ba.text, a.text);
    const rec = { type: b.type, status: r.status, chain: r.chain.join('→') || undefined, bytes: r.body.length, words: a.words, sim, title: a.headTitle || (a.bodyTitle ? `(in body) ${a.bodyTitle}` : ''), metaInBody: a.metaInBody, robots: a.robots || undefined, challenged: challenged || undefined, server: r.headers.server };
    row.bots[b.token] = rec;
    if (r.status !== base.status || challenged || [401, 403, 429, 503].includes(r.status)) {
      const sev = ['Googlebot', 'Bingbot'].includes(b.token) ? 'Critical' : b.type === 'search' || b.type === 'user' ? 'High' : 'Medium';
      const allowed = robotsMatrix[b.token] && !Object.values(robotsMatrix[b.token].routes).includes('blocked');
      add(sev, 'server-cdn-block', `${p} · ${b.token}`, `status ${r.status} (browser ${base.status})${challenged ? ' · challenge' : blockPage ? ' · block page' : ''}${r.headers.server ? ' · server: ' + r.headers.server : ''}${r.headers['cf-ray'] ? ' · Cloudflare' : ''}${allowed ? ' · robots.txt allows it: the block comes from the server/CDN/WAF' : ''}`);
    }
    else {
      if (a.words < ba.words * 0.5 || sim < 0.6) add(b.type === 'train' ? 'Low' : 'High', 'different-content', `${p} · ${b.token}`, `${a.words} words vs ${ba.words} (similarity ${sim})`);
      if (a.metaInBody && !ba.metaInBody) add('Low', 'metadata-in-body-for-bot', `${p} · ${b.token}`, `${a.metaInBody} tags (title/description/canonical/og) arrive in <body> via streaming; the browser has them in head`);
      if (!a.headTitle && a.bodyTitle && b.token !== 'Googlebot') (row.titleInBody ||= []).push(b.token);   // Googlebot renders: Next considers it correct
      for (const e of EXPECT) if (ba.text.includes(e) && !a.text.includes(e)) add('High', 'phrase-missing-for-bot', `${p} · ${b.token}`, `"${e}"`);
      if (/noindex|none/i.test(a.robots) && b.type === 'search') (row.noindex ||= []).push(b.token);
    }
  }
  if (row.noindex) add(row.noindex.some(t => ['Googlebot', 'Bingbot'].includes(t)) ? 'Critical' : 'High', 'noindex-for-search-engines', p, `noindex (meta or X-Robots-Tag) for: ${row.noindex.join(', ')}`);
  if (row.titleInBody) add('Medium', 'title-outside-head', p, `title/description/canonical arrive in <body> (generateMetadata streaming) for: ${row.titleInBody.join(', ')}. Bots that don't run JS may not read them: add them to htmlLimitedBots`);
  results.push(row);
}

// ---------- llms.txt (optional: no major search engine confirms using it) ----------
const lt = await get(new URL('/llms.txt', BASE).href, BOTS[0].ua);
const llms = { status: lt.status, contentType: lt.headers['content-type'], bytes: lt.body.length };
if (lt.status === 200) {
  llms.h1 = /^#\s+\S/.test(lt.body.trimStart()); llms.links = (lt.body.match(/\]\((https?:\/\/[^)]+)\)/g) || []).length;
  if (/text\/html/.test(lt.headers['content-type'] || '')) add('Low', 'llms-txt-html', '/llms.txt', 'returns HTML (soft 404?)');
  else if (!llms.h1) add('Low', 'llms-txt-format', '/llms.txt', 'the llmstxt.org proposal starts with "# Name"');
}

const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
issues.sort((a, b) => order[a.sev] - order[b.sev]);
console.log(JSON.stringify({ base: BASE.href, robots: { status: rr.status, contentSignals, trainingDecision: trainDecision, matrix: robotsMatrix }, pages: results, llms, issues }, null, 1));
console.error('\nSummary');
for (const r of results) console.error(`${r.path}: browser ${r.baseline.status}/${r.baseline.words}w · ` + Object.entries(r.bots).map(([k, v]) => `${k} ${v.status}${v.challenged ? '!' : ''}/${v.words}w`).join(' · '));
for (const i of issues) console.error(`[${i.sev}] ${i.code} · ${i.where} · ${i.detail}`);
