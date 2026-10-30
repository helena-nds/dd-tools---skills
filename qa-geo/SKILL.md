---
name: qa-geo
description: Audits the visibility of a website (Next.js or other) in AI-powered search engines and assistants, Generative Engine Optimization - Google AI Overviews and AI Mode, Bing Copilot, ChatGPT search, Perplexity and Claude. Reviews robots.txt per AI crawler, CDN/WAF blocks such as Cloudflare, content visible without JavaScript, JSON-LD, NAP and authorship signals, and llms.txt. Use it whenever someone asks about GEO, AEO, LLMO, "showing up in ChatGPT", AI bots, GPTBot, ClaudeBot, llms.txt or structured data, even if "GEO" isn't mentioned.
---

# Visibility in AI search engines (GEO)

The goal is to answer one question with evidence: **can AI search engines and assistants read, understand and cite this website, and do they do so according to what the client has decided?** Websites generated from Figma with AI have three typical faults that can't be seen in the browser: text that only exists after running JavaScript, a robots.txt or CDN that blocks AI search bots without anyone having decided it, and a total absence of data identifying the business (who it is, where it is, how to contact it).

**By default no code is modified.** Deliver the report and fix only if the user asks. The tools go in `/tmp/qa-geo/`, never in the project.

Out of scope: general technical SEO (`qa-technical-seo`: metadata, sitemap, canonical, links), text quality (`qa-content`), speed (`qa-performance-cwv`) and cookies (`qa-legal`).

## What is official and what isn't (as of October 2026)

In the report, always separate what the providers say from what is reasonable but unconfirmed practice. **Don't promise citations**: neither Google nor Bing guarantees them.

**Official and verified**

- **Google** (guide "Optimizing for generative AI features", updated 10 July 2026, and "AI features and your website"): for AI Overviews and AI Mode there are no additional requirements or markup; being indexed and eligible for a snippet is enough. Optimizing for AI "is still SEO". No need for llms.txt, "chunking", rewriting for AI or special schema; structured data must match the visible text. It asks for original, non-generic content, semantic HTML, good JS practices and not blocking crawling at the CDN.
- **Google controls**: `nosnippet`, `data-nosnippet`, `max-snippet` and `noindex` limit what is shown. **Google-Extended** (a token with no user-agent of its own) only decides Gemini training and grounding in the Gemini app and in Vertex AI; it doesn't affect Search or AI Overviews. Since 31 August 2026, Search Console has the **"Search generative AI"** control in Settings to exclude the site from AI Overviews, AI Mode and Discover's AI without leaving normal search, and a generative AI performance report.
- **Bing / Copilot** (Webmaster Guidelines, Feb. 2026): Copilot uses Bing's index (Bingbot). `noarchive` excludes the content from Copilot answers and grounding; `nocache` limits it to URL, title and snippet. They recommend single-topic pages, facts stated directly and the essentials at the top. Bing Webmaster Tools has an **AI Performance** report (citations and grounding queries, in preview).
- **OpenAI**: OAI-SearchBot is ChatGPT search's bot; GPTBot, the training one; ChatGPT-User acts on a user's request and since December 2025 "robots.txt rules may not apply". If the first two are allowed, it may reuse a single crawl. robots.txt changes take about 24 h. To leave ChatGPT search: `noindex` (while allowing crawling). Visits arrive with `utm_source=chatgpt.com`.
- **Anthropic**: ClaudeBot (training), Claude-SearchBot (search) and Claude-User (user requests). They respect robots.txt and `Crawl-delay`, and don't bypass CAPTCHAs. Only the tokens are published, not the full user-agents.
- **Perplexity**: PerplexityBot (search, doesn't train) and Perplexity-User (on a user's request, "generally ignores robots.txt"). Up to 24 h to apply changes.
- **Apple**: Applebot feeds Siri, Spotlight and Safari and may be used for training; **Applebot-Extended** doesn't crawl, it only serves to exclude content from training without affecting search.
- **Meta**: meta-externalagent (training and indexing), meta-webindexer (Meta AI search), meta-externalfetcher (on a user's request, may bypass robots.txt).
- **Common Crawl** (CCBot): open dataset used by many models; respects robots.txt.
- **Cloudflare**: in July 2025 it announced blocking AI crawlers by default. On 1 July 2026 it replaced the "Block AI bots" toggle with three policies (Search, Agent, Training) and, for new domains since 15 September 2026, it blocks Training and Agent on pages with ads and leaves Search allowed. Its "managed robots.txt" (adds `Content-Signal` and `Disallow` for AI bots) is not on by default.
- **llms.txt**: Google Search ignores it (June 2026 docs). No major provider has confirmed using it to search or cite.
- **Structured data in Google**: FAQ rich results disappeared on 7 May 2026; HowTo, the sitelinks search box (Nov. 2024), practice problem (Jan. 2026) and several more (course info, estimated salary, vehicle listing… in 2025) too. Still in force, among others: Organization, LocalBusiness, Breadcrumb, Article, Product and Review snippet.

**Unofficial (mark it as such in the report)**

- That llms.txt improves citations: log studies published in 2026 show that AI search bots barely request it. It is optional and cheap; useful mainly on documentation sites.
- That AI crawlers don't run JavaScript: there is no official documentation, but it's what logs show. Treat it as true for practical purposes: the important text must be in the HTML.
- "Citable content", statistics and quotes, ideal length, E-E-A-T as a factor: reasonable practices consistent with the guidelines, with no confirmed measurable effect. Bytespider: no official documentation; there are reports that it doesn't respect robots.txt.

## Step 0. Context

1. **The client's decision on training**. The default recommendation is to **allow search and user requests** (that's what generates citations and visits) and let the client decide on training. Ask; don't decide it yourself.
2. **CDN/WAF and hosting**: `curl -sI https://domain | grep -iE "server|cf-ray|x-vercel|x-nf"`. With Cloudflare, ask for access to the dashboard or a screenshot of AI Crawl Control and Security › Bots.
3. **Local business?** (address, service area): turn on the LocalBusiness and NAP review, and ask for the Google Business Profile.
4. **Next.js**: version and whether it uses `generateMetadata` with request data (metadata streaming, step 3).

## Step 1. Prepare the tools

```bash
mkdir -p /tmp/qa-geo && cd /tmp/qa-geo && npm init -y >/dev/null && npm i cheerio robots-parser >/dev/null
```

Tested with Node 22, cheerio 1.2 and robots-parser 3.0 against Next 16.4.

## Step 2. robots.txt, CDN and response per user-agent

Run it against production (or staging with the same CDN) and against local, with the key pages and one sentence from each that must be citable:

```bash
node /tmp/qa-geo/ai-bots.mjs https://www.cliente.es/ / /servicios /contacto \
  --expect "/servicios=Diseño web a medida|/contacto=Calle Mayor" > /tmp/qa-geo/ai-bots.json
```

For each bot it evaluates robots.txt with its token (including Google-Extended and Applebot-Extended), requests the page with its user-agent and compares it with a Chrome: status, CDN block or challenge, words without JS, text similarity, expected sentences, `noindex` and whether the `<title>` arrives outside `<head>`. It also checks `/llms.txt`.

`ai-bots.mjs`:

```js
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
```

How to interpret it:

- **`robots-blocks-search-engine`** (OAI-SearchBot, Claude-SearchBot, PerplexityBot, Bingbot, Googlebot…): the website will not appear, or will appear without detail, in that search engine. It usually comes from copying a "block all AI bots" list that mixes training and search.
- **`server-cdn-block`** with "robots.txt allows it": the block is set by the CDN/WAF or a `proxy.ts`/middleware, not by robots.txt. This is the typical Cloudflare case.
- **Important limit**: the script only changes the user-agent. Cloudflare and others verify bots by IP or signature (Web Bot Auth), so a spoofed UA may be treated differently from the real bot (in both directions). A 200 here doesn't guarantee that the real bot gets through. Confirm it in the server or CDN logs, checking the IP against the official lists (`openai.com/searchbot.json`, `perplexity.com/perplexitybot.json`, `claude.com/crawling/bots.json`, `index.commoncrawl.org/ccbot.json`).
- **Type `user`** (ChatGPT-User, Claude-User, Perplexity-User, meta-externalfetcher): blocking them in robots.txt may have no effect; if the client wants to prevent it, it has to be done at the CDN.
- **`trainingDecision`** in the JSON is not a fault: it's the current policy, for the client to confirm.

## Step 3. Content without JavaScript and streamed metadata

- **`phrase-missing-without-js`**: the sentence is not in the served HTML; it is painted on the client (`"use client"` + `useEffect`, fetch in the browser, text in a carousel that mounts late). For an AI crawler that text doesn't exist. For the full diagnosis of the whole website, use `render-check.mjs` from the `qa-technical-seo` skill or compare `curl -s URL | grep -c "sentence"` with what you see in the browser.
- **`title-outside-head`**: with metadata streaming (Next ≥ 15.2; with `cacheComponents` when `generateMetadata` reads request data), Next sends title, description and canonical inside `<body>` to every user-agent not in `htmlLimitedBots`. The default list in Next 16.4 includes Bingbot and Applebot, but **not** GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot or PerplexityBot (checked in `next/dist/shared/lib/router/utils/html-bots.js`). Google processes it fine; for the rest, add them to `htmlLimitedBots` (see "If the user asks for fixes").
- **`different-content`**: the bot receives another version (geolocation, A/B, unintended cloaking). Review it: serving different content to bots violates Google's and Bing's guidelines.

## Step 4. Structured data (JSON-LD)

```bash
node /tmp/qa-geo/jsonld.mjs https://www.cliente.es/ https://www.cliente.es/servicios https://www.cliente.es/contacto > /tmp/qa-geo/jsonld.json
# or, if you have crawled with qa-technical-seo: --pages /tmp/qa-technical-seo/out/pages.jsonl
```

`jsonld.mjs`:

```js
// jsonld.mjs: extracts and validates JSON-LD from the served HTML (no JS). Checks syntax, @context, properties per type
// (Organization, LocalBusiness and subtypes, WebSite, Service, FAQPage, BreadcrumbList, Article, Person), absolute URLs,
// that what is marked up is visible on the page, and NAP consistency (name, address, phone) across pages and with the visible text.
// Usage: node jsonld.mjs <url1> [url2 ...]   |   node jsonld.mjs --pages seo-out/pages.jsonl   [--home https://.../]
// Output: JSON { pages, nap, issues }.
import * as cheerio from 'cheerio';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
let urls = args.filter(a => /^https?:/.test(a) && args[args.indexOf(a) - 1] !== '--home');
const pi = args.indexOf('--pages');
if (pi >= 0) urls = readFileSync(args[pi + 1], 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(p => p.status === 200 && !p.redirectsTo && /html/.test(p.contentType || '')).map(p => p.url);
const HOME = args.includes('--home') ? args[args.indexOf('--home') + 1] : urls[0];

const LOCAL = /^(LocalBusiness|ProfessionalService|Store|Restaurant|FoodEstablishment|HomeAndConstructionBusiness|LegalService|MedicalBusiness|HealthAndBeautyBusiness|AutomotiveBusiness|FinancialService|RealEstateAgent|TravelAgency|EntertainmentBusiness|SportsActivityLocation|LodgingBusiness|EmploymentAgency|AccountingService|Dentist|Physician|Attorney|Notary|Electrician|Plumber|HVACBusiness|RoofingContractor|GeneralContractor|HousePainter|Locksmith|MovingCompany)$/;
// req = Google requires it for its rich result (or without it the node is useless); rec = recommended (Google or schema.org)
const RULES = {
  Organization: { req: ['name'], rec: ['url', 'logo', 'sameAs', 'description', 'address', 'telephone|contactPoint', '@id'] },
  LocalBusiness: { req: ['name', 'address'], rec: ['telephone', 'url', 'geo', 'openingHoursSpecification|openingHours', 'image', 'priceRange', 'areaServed', '@id'] },
  WebSite: { req: ['name', 'url'], rec: ['publisher|author', 'inLanguage'] },
  Service: { req: ['name'], rec: ['provider', 'areaServed', 'serviceType|description', 'offers'] },
  FAQPage: { req: ['mainEntity'], rec: [] },
  BreadcrumbList: { req: ['itemListElement'], rec: [] },
  Article: { req: ['headline'], rec: ['author', 'datePublished', 'dateModified', 'image', 'publisher'] },
  Person: { req: ['name'], rec: ['jobTitle', 'worksFor|affiliation', 'sameAs', 'url'] },
};
const typesOf = n => [].concat(n['@type'] || []).map(String);
const has = (n, spec) => spec.split('|').some(k => n[k] !== undefined && n[k] !== '' && !(Array.isArray(n[k]) && !n[k].length));
const normTxt = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const digits = s => String(s || '').replace(/\D/g, '').replace(/^34(?=\d{9}$)/, '');

const issues = []; const add = (sev, code, where, detail) => issues.push({ sev, code, where, detail });
const nap = { name: new Map(), telephone: new Map(), address: new Map() };
const note = (k, v, url) => { if (!v) return; const key = k === 'telephone' ? digits(v) : normTxt(typeof v === 'object' ? [v.streetAddress, v.postalCode, v.addressLocality].join(' ') : v); if (!key) return; if (!nap[k].has(key)) nap[k].set(key, { raw: v, urls: new Set() }); nap[k].get(key).urls.add(url); };
const pages = [];
const allIds = new Map();
const TOP = new WeakSet();

for (const url of urls) {
  let html;
  try { html = await (await fetch(url, { headers: { 'user-agent': 'qa-geo/1.0' }, signal: AbortSignal.timeout(20000) })).text(); }
  catch (e) { add('High', 'not-accessible', url, e.message); continue; }
  const $ = cheerio.load(html);
  const blocks = $('script[type="application/ld+json"]').map((_, e) => $(e).html()).get();
  const microdata = $('[itemscope]').length, rdfa = $('[typeof][vocab], [property^="schema:"]').length;
  const $v = cheerio.load(html.replace(/></g, '> <')); $v('script,style,noscript,template').remove();
  const visible = normTxt($v('body').text()); const visibleDigits = $v('body').text().replace(/\D/g, '');
  const nodes = [];
  blocks.forEach((raw, i) => {
    let data;
    try { data = JSON.parse(raw.replace(/^\s*<!--|-->\s*$/g, '').replace(/^\s*\/\/<!\[CDATA\[|\/\/\]\]>\s*$/g, '')); }
    catch (e) { add('High', 'jsonld-syntax', `${url} · block ${i + 1}`, e.message.slice(0, 120)); return; }
    for (const d of [].concat(data)) {
      const ctx = JSON.stringify(d['@context'] || '');
      if (!/schema\.org/.test(ctx)) add('High', 'jsonld-no-context', `${url} · block ${i + 1}`, `@context ${ctx || 'missing'}`);
      // top = root or @graph node; nested ones are only validated if they are not mere references ({@type, name} or {@id})
      const walk = (n, top) => { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(x => walk(x, top)); if (n['@type']) { if (top) TOP.add(n); nodes.push(n); } for (const [k, v] of Object.entries(n)) if (k !== '@context' && typeof v === 'object') walk(v, false); };
      walk(d['@graph'] || d, true);
    }
  });
  const types = [...new Set(nodes.flatMap(typesOf))];
  for (const n of nodes) {
    for (const t of typesOf(n)) {
      const rule = RULES[t] || (LOCAL.test(t) ? RULES.LocalBusiness : /^(BlogPosting|NewsArticle)$/.test(t) ? RULES.Article : null);
      const isRef = Object.keys(n).filter(k => k !== '@type').length <= 2;
      if (!rule || (!TOP.has(n) && (isRef || !['Organization', 'Person', 'Service'].includes(t) && !LOCAL.test(t)))) continue;
      const where = `${url} · ${t}${n['@id'] ? ' ' + n['@id'] : ''}`;
      for (const r of rule.req) if (!has(n, r)) add(t === 'Person' ? 'Medium' : 'High', 'jsonld-missing-required', where, r);
      const missRec = rule.rec.filter(r => !has(n, r));
      if (missRec.length) add('Low', 'jsonld-missing-recommended', where, missRec.join(', '));
      for (const k of ['url', 'logo', 'image', 'item', '@id', 'sameAs']) for (const v of [].concat(n[k] || [])) {
        const s = typeof v === 'object' ? v.url || v['@id'] : v;
        if (typeof s === 'string' && s && !/^https?:\/\//.test(s) && !(k === '@id' && s.startsWith('#'))) add('Medium', 'jsonld-relative-url', where, `${k}: ${s}`);
        if (typeof s === 'string' && /localhost|127\.0\.0\.1|vercel\.app|staging|preview/.test(s) && k !== '@id') add('High', 'jsonld-non-production-url', where, `${k}: ${s}`);
      }
      if (n['@id']) { const prev = allIds.get(n['@id']); if (prev && prev.t !== t) add('Medium', 'jsonld-inconsistent-id', n['@id'], `${prev.t} on ${prev.url} vs ${t} on ${url}`); allIds.set(n['@id'], { t, url }); }
      if (t === 'Organization' || LOCAL.test(t)) {
        note('name', n.name, url); note('telephone', n.telephone, url); if (typeof n.address === 'object') note('address', n.address, url);
        if (n.telephone && !visibleDigits.includes(digits(n.telephone))) add('Medium', 'nap-phone-not-visible', where, `${n.telephone} does not appear in the page text`);
        if (n.name && !visible.includes(normTxt(n.name))) add('Low', 'nap-name-not-visible', where, `"${n.name}" does not appear in the text`);
        if (LOCAL.test(t) && typeof n.address === 'object') for (const k of ['streetAddress', 'addressLocality', 'postalCode', 'addressCountry']) if (!n.address[k]) add('Medium', 'jsonld-incomplete-address', where, k);
        if (LOCAL.test(t) && typeof n.address === 'string') add('Medium', 'jsonld-address-as-text', where, 'address as text: use PostalAddress');
      }
      if (t === 'FAQPage') {
        add('Low', 'faq-no-rich-result', where, 'Google stopped showing FAQ rich results (7 May 2026). Only useful as markup of visible content.');
        for (const q of [].concat(n.mainEntity || [])) {
          if (!q.name || !q.acceptedAnswer?.text) add('High', 'faq-incomplete-question', where, JSON.stringify(q).slice(0, 100));
          else if (!visible.includes(normTxt(q.name).slice(0, 60))) add('High', 'faq-not-visible', where, `"${q.name}" is not visible on the page (structured data must reflect visible content)`);
        }
      }
      if (t === 'BreadcrumbList') [].concat(n.itemListElement || []).forEach((li, i, arr) => {
        if (li.position === undefined || !li.name && !li.item?.name) add('Medium', 'breadcrumb-incomplete-item', where, `position ${i + 1}`);
        if (!li.item && i < arr.length - 1) add('Medium', 'breadcrumb-missing-item', where, `position ${i + 1}`);
      });
      if (t === 'HowTo') add('Low', 'howto-no-rich-result', where, 'HowTo no longer generates rich results in Google');
      if (t === 'WebSite' && n.potentialAction) add('Low', 'website-searchaction', where, 'the sitelinks search box was retired in Nov 2024: SearchAction adds nothing in Google');
    }
  }
  pages.push({ url, blocks: blocks.length, types, microdata, rdfa });
}

// Minimum expected coverage on the home page and NAP consistency
const home = pages.find(p => p.url === HOME);
if (home && !home.types.some(t => t === 'Organization' || LOCAL.test(t))) add('Medium', 'home-no-organization', HOME, 'no Organization/LocalBusiness: describe who is behind it (name, logo, contact, sameAs)');
if (home && !home.types.includes('WebSite')) add('Low', 'home-no-website', HOME, 'WebSite (name, url) helps Google choose the site name');
if (!pages.some(p => p.blocks)) add('Medium', 'no-jsonld', 'site', 'no page has JSON-LD (not a requirement for AI, but it helps understand the entity and gives rich results)');
const napOut = {};
for (const [k, m] of Object.entries(nap)) { napOut[k] = [...m.values()].map(v => ({ value: v.raw, urls: [...v.urls] })); if (m.size > 1) add('Medium', 'nap-inconsistent', k, napOut[k].map(v => JSON.stringify(v.value)).join(' vs ')); }
// Group repeated findings (the layout's JSON-LD repeats on every page)
const grouped = new Map();
for (const i of issues) {
  const [u, ...rest] = i.where.split(' · '); const k = `${i.sev}|${i.code}|${rest.join(' · ')}|${i.detail}`;
  if (!grouped.has(k)) grouped.set(k, { sev: i.sev, code: i.code, where: rest.join(' · ') || u, detail: i.detail, urls: [] });
  if (rest.length) grouped.get(k).urls.push(u);
}
const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const out = [...grouped.values()].sort((a, b) => order[a.sev] - order[b.sev]);
console.log(JSON.stringify({ pages, nap: napOut, issues: out }, null, 1));
for (const i of out) console.error(`[${i.sev}] ${i.code} · ${i.where} · ${i.detail}${i.urls.length ? ` · ${i.urls.length} URL(s): ${i.urls.slice(0, 3).join(', ')}` : ''}`);
```

What to expect on a studio or small-business website:

| Type | Where | Why |
|---|---|---|
| `Organization` (or a `LocalBusiness` subtype, e.g. `ProfessionalService`) with `@id`, `name`, `url`, absolute `logo`, `sameAs`, contact | Home (or layout) | Identifies the entity; Google uses it for the company panel and the logo |
| `LocalBusiness` with a complete `PostalAddress`, `telephone`, `geo`, `openingHoursSpecification`, `areaServed` | Home or contact, if there are premises or a service area | Local rich result in Google; NAP consistency |
| `WebSite` (`name`, `url`) | Home | Site name in Google. `SearchAction` no longer adds anything |
| `BreadcrumbList` | Inner pages | Rich result still in force |
| `Service` (`name`, `provider` → `@id` of the Organization, `areaServed`) | Each service | No rich result in Google; describes the offer. Optional |
| `Article`/`BlogPosting` with `author` (`Person`), dates | Blog | Visible authorship and dates |
| `FAQPage` | Only if the questions are visible on the page | No rich result in Google since May 2026; it does no harm, but don't sell it as an improvement |

Also validate by hand in the [Rich Results Test](https://search.google.com/test/rich-results) (types with a rich result) and in the [Schema Markup Validator](https://validator.schema.org/) (all of schema.org). The script doesn't replace those tools: it checks what AI-generated websites usually break (invalid JSON, relative or staging URLs, markup that isn't visible on the page, different phone numbers in each place).

## Step 5. Entity, NAP and citable content (manual review)

Review with the browser and the code; anything about writing quality, hand over to `qa-content`.

- **NAP**: name, address and phone identical in the footer, the contact page, the JSON-LD, Google Business Profile and the main directories. The script compares JSON-LD with the visible text; the rest, by hand.
- **Who is behind it** (the verifiable part of E-E-A-T): an "About us" page with real people, track record, case studies with results, physical address, NIF (tax ID) in the aviso legal (legal notice), links to profiles (`sameAs`). AI-generated websites often have invented testimonials or figures: flag them.
- **Citable content** (reasonable practice, no guarantee): one page per service with a clear topic (Bing asks for it); the main answer in the first lines; concrete data (indicative prices, timelines, area, what's included) in HTML text, not in images; titles and `<h2>`s that describe the content; real, visible FAQs; update dates. Google insists on original content, not summaries of what already exists.
- **Content in images or PDFs**: text inside images is not cited. Price tables or service lists exported from Figma as an image are a High finding.

## Step 6. llms.txt (optional)

If it exists, the script checks that it responds 200 as text (not HTML) and starts with `# Name`, following the llmstxt.org proposal. If it doesn't exist, it is not a fault: at most a Low recommendation, explaining that today no major search engine confirms using it.

## Step 7. Measurement (if there is access)

- Search Console: generative AI performance report and the state of the "Search generative AI" control (that it isn't turned off by mistake).
- Bing Webmaster Tools: AI Performance (citations, cited pages, grounding queries).
- Analytics: visits with `utm_source=chatgpt.com` and referrers `perplexity.ai`, `copilot.microsoft.com`, `gemini.google.com`, `claude.ai`.
- Server or CDN logs: requests from each bot, with IP verification.

## Severity

| Level | Examples in this phase |
|---|---|
| **Critical** | Googlebot or Bingbot blocked by robots.txt or by the CDN; `noindex` for search engines in production; "Search generative AI" control turned off without the client knowing |
| **High** | AI search bots (OAI-SearchBot, Claude-SearchBot, PerplexityBot) blocked without the client's decision; main content only with JS; key sentences missing for a bot; JSON-LD with invalid syntax or describing content that isn't visible; key data (prices, services, address) only in images |
| **Medium** | No robots.txt or no explicit decision about AI; no Organization/LocalBusiness; inconsistent NAP; relative URLs in JSON-LD; incomplete address; metadata in `<body>` for AI bots; training bots blocked at the CDN without the client's decision |
| **Low** | Missing recommended properties; FAQPage or HowTo presented as an improvement; malformed llms.txt; user bots blocked only in robots.txt |

## Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

Save `geo.md` (and `geo.json` with `ai-bots.json` and `jsonld.json`):

```markdown
# GEO / AI visibility — <project> — <date>
Environment: <URL> · CDN: <Cloudflare/Vercel/…> · Training policy decided by the client: <yes/no/pending>
Summary: X critical · Y high · Z medium · W low

## Access matrix per bot
| Bot | Type | robots.txt | Server response | Content without JS | Client's decision |
|---|---|---|---|---|---|
| OAI-SearchBot | search | blocked (robots.ts:6) | 200 | 100 % | — |

## Findings (evidence · why it matters · fix)
## Structured data (types per page, errors, NAP)
## Entity and citable content (manual)
## What is official and what is our own recommendation
## Pending / not verifiable without access (CDN dashboard, Search Console, Bing, logs)
```

## False positives and limitations

- The user-agent test doesn't reproduce the CDNs' IP verification (see step 2).
- `robots-parser` follows the standard (RFC 9309); each provider may interpret edge cases its own way. Anthropic's full user-agents are approximate; what counts in robots.txt is the token.
- `nap-phone-not-visible` only compares digits: a phone number written in an image or with letters is not found.
- The script validates the HTML without JS. If the JSON-LD is injected on the client, it shows up as missing: flagging it is correct, because AI crawlers won't see it.
- The list of bots changes often: review the sources before each audit and update `BOTS`.

## If the user asks for fixes

Order: unblock search engines (robots.txt and CDN) → content in the server HTML → the entity's JSON-LD → NAP → the rest. After each change, `next build`, start it and run both scripts again.

```ts
// app/robots.ts: search and user bots allowed; training as the client decides (here, blocked)
import type { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: '/api/' },
      { userAgent: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'meta-externalagent', 'CCBot', 'Bytespider'], disallow: '/' },
    ],
    sitemap: 'https://www.cliente.es/sitemap.xml',
  }
}
```

```tsx
// app/layout.tsx: the entity's JSON-LD, in the server HTML (not with next/script)
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'ProfessionalService', '@id': 'https://www.cliente.es/#negocio', name: 'Cliente', url: 'https://www.cliente.es',
      logo: 'https://www.cliente.es/logo.png', telephone: '+34 600 000 000',
      address: { '@type': 'PostalAddress', streetAddress: 'Calle Mayor 1', postalCode: '28013', addressLocality: 'Madrid', addressCountry: 'ES' },
      areaServed: 'ES', sameAs: ['https://www.linkedin.com/company/cliente'] },
    { '@type': 'WebSite', name: 'Cliente', url: 'https://www.cliente.es', publisher: { '@id': 'https://www.cliente.es/#negocio' } },
  ],
}
// inside <body>: <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
```

For streamed metadata, add to `next.config.ts` the default list plus the AI bots (`htmlLimitedBots` replaces the list; the full block is in the `qa-technical-seo` skill). Checked on Next 16.4: after the change, GPTBot receives the `<title>` in `<head>`.

On Cloudflare (changed by whoever manages the account): in the AI bot policies, Search allowed; Agent and Training according to the client's decision; review custom WAF rules that block by user-agent.

## Sources

- Google: [Optimizing for generative AI](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) · [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) · [Search generative AI control](https://support.google.com/webmasters/answer/16908024) · [common crawlers and Google-Extended](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) · [documentation updates](https://developers.google.com/search/updates)
- Bing: [Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)
- OpenAI: [bots](https://developers.openai.com/api/docs/bots) · [Publishers FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
- Anthropic: [crawlers](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) · Perplexity: [bots](https://docs.perplexity.ai/guides/bots) · Apple: [Applebot](https://support.apple.com/en-us/119829) · Meta: [crawlers](https://developers.facebook.com/docs/sharing/webmasters/web-crawlers) · [CCBot](https://commoncrawl.org/ccbot)
- Cloudflare: [changelog AI traffic 2026-07-01](https://developers.cloudflare.com/changelog/post/2026-07-01-ai-traffic-options/) · [managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt)
- Next.js 16: `node_modules/next/dist/docs/` (json-ld, generate-metadata#streaming-metadata, htmlLimitedBots)
