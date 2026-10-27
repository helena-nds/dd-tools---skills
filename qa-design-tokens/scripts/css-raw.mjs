// css-raw.mjs: AST analysis of CSS. Reports declarations with raw values outside token definitions.
// Usage: TOKEN_SOURCES="app/globals.css" node css-raw.mjs $(rg --files <project> -g '*.css' -g '*.scss')
import postcss from 'postcss';
import { readFileSync } from 'node:fs';

const TOKEN_SOURCES = (process.env.TOKEN_SOURCES || '').split(',').map(s => s.trim()).filter(Boolean);
const RAW = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|\b\d*\.?\d+(?:px|rem|em|ms|s)\b|cubic-bezier\(/i;
const ALLOW = /^(?:0|0px|1px|100%|auto|inherit|initial|unset|none|currentColor|transparent)$/i;

for (const f of process.argv.slice(2)) {
  const tokenSrc = TOKEN_SOURCES.some(t => f.endsWith(t));
  let root;
  try { root = postcss.parse(readFileSync(f, 'utf8'), { from: f }); }
  catch (e) { console.error(`${f}: not parseable (${e.reason || e.message}); review by hand`); continue; }
  root.walkDecls(d => {
    if (d.prop.startsWith('--')) {
      if (!tokenSrc) console.log(JSON.stringify({ rule: 'shadow-token', sev: 'medium', file: f, line: d.source.start.line, match: `${d.prop}: ${d.value}` }));
      return;
    }
    const v = d.value.replace(/var\([^)]*\)/g, '').replace(/(?<![\d.])(?:0|1px)(?![\w.%])/g, '');
    if (RAW.test(v) && !ALLOW.test(d.value.trim()))
      console.log(JSON.stringify({ rule: 'css-raw-value', sev: /#|rgb|hsl|lab|lch|color\(/i.test(v) ? 'critical' : 'medium', file: f, line: d.source.start.line, match: `${d.prop}: ${d.value}` }));
  });
}
