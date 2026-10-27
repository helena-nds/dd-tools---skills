// spellcheck.mjs: Spanish spelling and grammar on the .txt files from extract-content.mjs.
// Usage: node spellcheck.mjs <txt-dir> [--engine=cspell|languagetool] [--words=Nacar,Figma] [--out=spelling.json]
//   cspell (default): local and private, spelling only (es-ES dictionary). Requires `npm i cspell @cspell/dict-es-es` in this directory.
//   languagetool: spelling + grammar + style. LT_URL=http://localhost:8081/v2/check (own server) or the public API
//     (https://api.languagetool.org/v2/check: max. 20 requests/min, 75 KB/min and 20 KB per request; the text goes to a third party).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [dir, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map(a => { const [k, v = ''] = a.slice(2).split('='); return [k, v]; }));
const engine = opt.engine || 'cspell', words = (opt.words || '').split(',').filter(Boolean);
const files = readdirSync(dir).filter(f => f.endsWith('.txt')).map(f => join(dir, f));
const here = dirname(fileURLToPath(import.meta.url)), out = { engine, byWord: {}, issues: [] };

if (engine === 'cspell') {
  const cfg = join(here, 'cspell.qa.json');
  writeFileSync(cfg, JSON.stringify({ version: '0.2', language: 'es,es-ES', import: ['@cspell/dict-es-es/cspell-ext.json'], words: words.flatMap(w => [w, w.toLowerCase()]),
    ignoreRegExpList: ['Urls', 'Email', '/\\b[A-Z0-9]{2,}\\b/g', '/\\+?\\d[\\d .-]{6,}/g'], minWordLength: 3 }));
  let txt = '';
  try { txt = execFileSync(join(here, 'node_modules/.bin/cspell'), ['lint', '--no-progress', '--no-summary', '--show-suggestions', '--no-must-find-files', '-c', cfg, ...files], { encoding: 'utf8', cwd: here }); }
  catch (e) { txt = e.stdout || ''; if (!txt) { console.error(e.message); process.exit(1); } }   // cspell exits with code 1 when it finds errors
  for (const l of txt.split('\n')) {
    const m = l.match(/^(.+?):(\d+):(\d+) - Unknown word \((.+?)\)(?: Suggestions: \[(.*)\])?/);
    if (!m) continue;
    const w = m[4], page = m[1].split('/').pop().replace(/\.txt$/, '');
    const e = (out.byWord[w] ||= { count: 0, pages: [], suggestions: (m[5] || '').split(', ').filter(Boolean).slice(0, 3) });
    e.count++; if (!e.pages.includes(page)) e.pages.push(page);
  }
} else {
  const LT = process.env.LT_URL || 'https://api.languagetool.org/v2/check', pub = /api\.languagetool\.org/.test(LT);
  if (pub) console.error('Warning: the text is sent to the public LanguageTool API. Do not use confidential content without permission.');
  let sent = 0;
  for (const f of files) {
    const page = f.split('/').pop().replace(/\.txt$/, ''), text = readFileSync(f, 'utf8');
    const chunks = []; let cur = '';                                  // chunks of ≤ 15 KB, split on line boundaries
    for (const line of text.split('\n')) { if (Buffer.byteLength(cur + line) > 15000) { chunks.push(cur); cur = ''; } cur += line + '\n'; }
    if (cur.trim()) chunks.push(cur);
    for (const c of chunks) {
      if (pub && sent++) await new Promise(z => setTimeout(z, 13000));   // ≈ 4 requests/min × 15 KB < 75 KB/min
      const body = new URLSearchParams({ text: c, language: 'es', disabledRules: 'WHITESPACE_RULE,UPPERCASE_SENTENCE_START' });
      let j; try { const r = await fetch(LT, { method: 'POST', body }); if (!r.ok) throw new Error(`HTTP ${r.status}`); j = await r.json(); }
      catch (e) { out.issues.push({ page, error: e.message }); continue; }
      for (const m of j.matches || []) {
        const w = c.substr(m.offset, m.length);
        if (words.some(x => x.toLowerCase() === w.toLowerCase())) continue;
        out.issues.push({ page, text: w, context: m.context?.text, message: m.message, rule: m.rule?.id, category: m.rule?.category?.id,
          suggestions: (m.replacements || []).slice(0, 3).map(r => r.value) });
      }
    }
  }
  for (const p of out.issues) if (p.category === 'TYPOS') { const e = (out.byWord[p.text] ||= { count: 0, pages: [], suggestions: p.suggestions }); e.count++; if (!e.pages.includes(p.page)) e.pages.push(p.page); }
}
// A word repeated across many pages is usually a proper noun or a brand term: candidate for the allowlist
const ranked = Object.entries(out.byWord).sort((a, b) => b[1].pages.length - a[1].pages.length || b[1].count - a[1].count);
out.byWord = Object.fromEntries(ranked);
writeFileSync(opt.out || 'spelling.json', JSON.stringify(out, null, 1));
for (const [w, e] of ranked) console.log(`${w} ×${e.count} [${e.pages.join(', ')}] → ${e.suggestions.join(' / ') || '?'}${e.pages.length >= 3 ? '  (proper noun? add it to --words)' : ''}`);
for (const p of out.issues.filter(p => p.category !== 'TYPOS')) console.log(`[${p.category || 'ERROR'}] ${p.page}: "${p.text ?? ''}" ${p.message ?? p.error} → ${(p.suggestions || []).join(' / ')}`);
