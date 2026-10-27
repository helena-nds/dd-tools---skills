// scan.mjs: detects hand-written style values.
// Usage: rg --files <project> [globs] | TOKEN_SOURCES="app/globals.css,tokens/x.json" node scan.mjs > findings.jsonl
import { readFileSync } from 'node:fs';

const TOKEN_SOURCES = (process.env.TOKEN_SOURCES || '').split(',').map(s => s.trim()).filter(Boolean);
const isTokenSource = f => TOKEN_SOURCES.some(t => f.endsWith(t));
const SCALE = new Set([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96]);
const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|mauve|olive|mist|taupe';

const RULES = [
  { id: 'hex-color', sev: 'critical',
    re: /(?<![\w&\/=-])(?<!href=["'])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])(?!\s*[{,.\[>+~])/g },
  { id: 'color-function', sev: 'critical',
    re: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*[^)]*\)/g },
  { id: 'tw-arbitrary-value', sev: 'high',
    re: /(?<![\w-])(?:[a-z0-9-]+:)*-?[a-z][a-z0-9-]*-\[(?!&)[^\]\s"'`]+\]/g },
  { id: 'tw-default-palette', sev: 'high',
    re: new RegExp(`(?<![\\w-])(?:[a-z0-9-]+:)*(?:bg|text|border(?:-[trblxy])?|ring|ring-offset|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent|shadow)-(?:${PALETTE})-(?:50|[1-9]00|950)(?:\\/\\d+)?\\b`, 'g') },
  { id: 'tw-var-shorthand', sev: 'info',
    re: /(?<![\w-])(?:[a-z0-9-]+:)*-?[a-z][a-z0-9-]*-\((?:[a-z-]+:)?--[\w-]+\)/g },
  { id: 'tw-off-scale', sev: 'medium', check: m => !SCALE.has(Number(m[1])),
    re: /(?<![\w-])-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy]|w|h|size|min-[wh]|max-[wh]|inset(?:-[xy])?|top|left|right|bottom|translate-[xy])-(\d+(?:\.\d+)?)(?![\w.\/-])/g },
  { id: 'inline-style-literal', sev: 'high', check: m => /#[0-9a-f]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em)?\b/i.test(m[1].replace(/var\([^)]*\)/g, '')),
    re: /style=\{\{([^}]*)\}\}/g },
  { id: 'svg-hardcoded-color', sev: 'medium',
    re: /\b(?:fill|stroke|stop-color|stopColor|flood-color|floodColor)=["'](?!none|currentColor|url\(|var\()[^"']+["']/g },
  { id: 'css-px-literal', sev: 'medium', ext: /\.(?:css|scss|sass|less)$/,
    re: /(?<![-\w.])(?:[2-9]|[1-9]\d+|\d*\.\d+)px\b/g },
  { id: 'motion-literal', sev: 'medium', ext: /\.[cm]?[jt]sx?$/,
    re: /\b(?:duration|delay|stiffness|damping|mass)\s*:\s*[\d.]+/g },
];

const files = readFileSync(0, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const counts = {};
for (const file of files) {
  let src; try { src = readFileSync(file, 'utf8'); } catch { continue; }
  const tokenSrc = isTokenSource(file);
  const plainCss = /\.css$/.test(file);                               // .css files are analysed by css-raw.mjs (AST)
  src.split('\n').forEach((line, i) => {
    const t = line.trim();
    if (/^(\/\/|\/\*|\*|\{\/\*)/.test(t)) return;                    // comments
    if (plainCss) {                                                   // in .css we only look for arbitrary classes in @apply
      if (/@apply/.test(t)) for (const m of t.matchAll(RULES[2].re)) emit({ rule: 'tw-arbitrary-value', sev: 'high', file, line: i + 1, match: m[0] });
      return;
    }
    if (/^--[\w-]+\s*:/.test(t)) {                                    // custom property declaration
      if (tokenSrc) return;                                           // legitimate token definition
      emit({ rule: 'shadow-token', sev: 'medium', file, line: i + 1, match: t.slice(0, 120) });
      return;
    }
    for (const r of RULES) {
      if (r.ext && !r.ext.test(file)) continue;
      if (tokenSrc && r.id !== 'tw-arbitrary-value') continue;        // in the token source we only care about what isn't a definition
      for (const m of line.matchAll(r.re)) {
        if (r.check && !r.check(m)) continue;
        const lowConf = r.id === 'hex-color' && /^#\d{3,4}$/.test(m[0]);   // e.g. "issue #123"
        emit({ rule: r.id, sev: lowConf ? 'low' : r.sev, file, line: i + 1, match: m[0].slice(0, 120), ...(lowConf && { note: 'possible false positive' }) });
      }
    }
  });
}
function emit(f) { counts[f.rule] = (counts[f.rule] || 0) + 1; process.stdout.write(JSON.stringify(f) + '\n'); }
console.error(JSON.stringify({ filesScanned: files.length, byRule: counts }, null, 1));
