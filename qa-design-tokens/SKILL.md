---
name: qa-design-tokens
description: Audits whether every color, typeface, spacing value and other style in a website (Next.js, React, Tailwind v3/v4, CSS Modules) comes from a single source of design tokens (DTCG JSON, @theme or tailwind.config) instead of being written by hand. Detects loose hex/rgb values, Tailwind arbitrary values, near-duplicate colors and mismatches with the Figma variables. Use it whenever someone asks to review tokens, centralised styles, hardcoded colors, design system consistency or style debt in code generated from Figma, even if "tokens" isn't mentioned.
---

# Design token audit

The goal is to answer one question with evidence: **do all the design values in the code come from a single source of tokens?** In projects generated from Figma by an AI agent, it is common to find colors and sizes copied verbatim from the design (`bg-[#0B7DFF]`, `p-[13px]`), small variations of the same color (`#1A1A1A`, `#1B1B1B`) and defined tokens that nobody uses. This report is for cleaning up that debt and stopping it from coming back.

**By default, the audit does not modify code.** The report is delivered first; fixes are only applied if the user asks for them.

## Step 0. Project context

Before scanning, find out:

1. **Styling stack**: read `package.json`. Note `tailwindcss` (v3 or v4: it changes where tokens live and which classes are valid), CSS Modules, Sass, CSS-in-JS and `motion`/`framer-motion`.
2. **Token source(s)**. Look in this order:
   - `**/*.tokens.json`, `tokens/**`, `design-tokens/**`, `style-dictionary.config.*`, `terrazzo.config.*`;
   - `@theme` and `:root { --… }` blocks in `app/globals.css` (Tailwind v4);
   - `theme`/`theme.extend` in `tailwind.config.{js,ts}` (Tailwind v3);
   - objects like `COLORS = {`, `theme = {` in `.ts` files. If they exist in addition to the above, they are a **parallel source** and go in the report.
3. **One source or several?** Having several disconnected sources (a JSON that doesn't generate the CSS, plus a hand-written `@theme`) is already the first finding.
4. **Figma (optional)**: if the user gives the file URL, the comparison in step 6 can be done.

## Step 1. Set up the tools (outside the project)

The scripts go in a temporary directory so the repo stays clean:

```bash
mkdir -p /tmp/qa-design-tokens && cd /tmp/qa-design-tokens && npm init -y >/dev/null && npm i culori postcss >/dev/null
```

Write the four scripts in this document there (`inventory.mjs`, `scan.mjs`, `css-raw.mjs`, `colors.mjs`). They are tested with Node 22, ripgrep 14, culori 4 and postcss 8. Run them from the project root, passing absolute paths to the scripts.

## Step 2. Token inventory

Build the name → resolved value map (`var(--x)` and `{group.token}` aliases are resolved):

```bash
node /tmp/qa-design-tokens/inventory.mjs app/globals.css tokens/*.tokens.json > /tmp/qa-design-tokens/tokens.json
```

`inventory.mjs`:

```js
// inventory.mjs: builds the token inventory (name → resolved value) from CSS (@theme/:root) and/or JSON (DTCG or Tokens Studio).
// Usage: node inventory.mjs app/globals.css tokens/design.tokens.json ... > resolved-tokens.json
import postcss from 'postcss';
import { formatHex8, parse } from 'culori';
import { readFileSync } from 'node:fs';

const out = {}, raw = {};
for (const f of process.argv.slice(2)) {
  const src = readFileSync(f, 'utf8');
  if (/\.json$/.test(f)) walkJson(JSON.parse(src), []);
  else postcss.parse(src, { from: f }).walkDecls(/^--/, d => {
    const scope = d.parent?.type === 'atrule' ? `@${d.parent.name} ${d.parent.params}`.trim() : d.parent?.selector || '';
    // Wrapping at-rules that create a mode (@media dark, @supports…). @theme and @layer don't count.
    const wrappers = []; for (let p = d.parent?.parent; p && p.type !== 'root'; p = p.parent)
      if (p.type === 'atrule' && !/^(theme|layer)$/.test(p.name)) wrappers.unshift(`@${p.name} ${p.params}`.trim());
    // Default mode only (@theme, :root). Modes (.dark, [data-theme], @media…) are listed separately.
    const key = /^(@theme|:root|html)/.test(scope) && !wrappers.length ? d.prop : `${d.prop} [${[...wrappers, scope].join(' ')}]`;
    raw[key] = d.value.trim();
  });
}
function walkJson(node, path) {
  if (node && typeof node === 'object' && '$value' in node || node && typeof node === 'object' && 'value' in node && !Array.isArray(node) && typeof node.value !== 'object') {
    let v = node.$value ?? node.value;
    if (v && typeof v === 'object' && v.colorSpace) v = v.hex || `color(${v.colorSpace} ${v.components.join(' ')} / ${v.alpha ?? 1})`;
    if (v && typeof v === 'object' && 'value' in v && 'unit' in v) v = `${v.value}${v.unit}`;
    raw[path.join('.')] = typeof v === 'string' ? v : JSON.stringify(v);
    return;
  }
  if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walkJson(v, [...path, k]);
}
// Resolve aliases: var(--x) and {group.token}
const resolve = (v, depth = 0) => depth > 10 ? v : v
  .replace(/var\((--[\w-]+)(?:,[^)]*)?\)/g, (m, n) => raw[n] !== undefined ? resolve(raw[n], depth + 1) : m)
  .replace(/\{([\w.-]+)\}/g, (m, n) => raw[n] !== undefined ? resolve(raw[n], depth + 1) : m);
for (const [k, v] of Object.entries(raw)) {
  const r = resolve(v); const c = parse(r);
  out[k] = c && !/^\d/.test(r) ? formatHex8(c) : r;
}
console.log(JSON.stringify(out, null, 1));
```

Review the inventory and note:

- **Format**: the stable DTCG (version 2025.10, published on 2025-10-28) expresses colors as an object `{colorSpace, components, alpha?, hex?}` and dimensions as `{value, unit}`. Tokens Studio and many exports still use strings (`"#0a7cff"`, `"16px"`). The script accepts both. If formats are mixed within the project, mention it.
- **Architecture**: are there primitives (`color.blue.500`) **and** semantic tokens (`color.text.primary` → alias to the primitive)? Components should consume semantic tokens. Without a semantic layer, dark mode or a rebrand forces you to touch every component.
- **Coverage by category**: color, typography (family, size, weight, line-height, letter-spacing), spacing, radii, borders, shadows, z-index, breakpoints, containers, durations, easing, opacity. Missing categories go in the report.
- **Modes**: if there is `.dark` or `[data-theme]`, check that every semantic token has a value in every mode.
- **Tailwind v4**: if `--color-*: initial;` doesn't appear in `@theme`, the default palette (`blue-500`, `gray-900`…) is still available and can easily slip in instead of the tokens.

## Step 3. Scan for hand-written values

List the files with ripgrep (it respects `.gitignore`) and pipe them to the scanner. `TOKEN_SOURCES` says which files are legitimate token sources: in them, `--x: value` definitions don't count as leaks.

```bash
rg --files . --type-add 'web:*.{ts,tsx,js,jsx,mjs,cjs,css,scss,sass,less,mdx}' -t web \
  -g '!node_modules' -g '!.next' -g '!out' -g '!dist' -g '!build' -g '!coverage' \
  -g '!**/*.min.*' -g '!**/*.d.ts' -g '!**/*.{test,spec,stories}.*' \
| TOKEN_SOURCES="app/globals.css" node /tmp/qa-design-tokens/scan.mjs > /tmp/qa-design-tokens/findings.jsonl

TOKEN_SOURCES="app/globals.css" node /tmp/qa-design-tokens/css-raw.mjs $(rg --files . -g '*.css' -g '!node_modules' -g '!.next') >> /tmp/qa-design-tokens/findings.jsonl
```

`scan.mjs`:

```js
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
```

`css-raw.mjs` analyses `.css` files with a parser (postcss) instead of regexes. That way it can tell a token definition (`--color-brand: #0a7cff` inside `@theme`) from a raw value in a rule (`.card { color: #1b1b1b }`), which a regex cannot know:

`css-raw.mjs`:

```js
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
```

**What each rule detects and why it matters**

| Rule | Example | Severity |
|---|---|---|
| `hex-color`, `color-function`, `css-raw-value` (color) | `#1B1B1B`, `rgb(26 26 26)`, `color: #fff` in a component | critical |
| `tw-arbitrary-value` | `bg-[#0B7DFF]`, `text-[17px]`, `p-[13px]`, `rounded-[7px]`, `shadow-[…]` | high |
| `tw-default-palette` | `text-red-600`, `hover:bg-blue-500` instead of a semantic token | high |
| `inline-style-literal` | `style={{ color: '#191919', marginTop: 24 }}` | high |
| `tw-off-scale` | `mt-17`, `p-3.25`: in v4 they are valid without brackets and no "arbitrary values" linter sees them. Compared against Tailwind's default scale: if the project uses another one, adjust `SCALE` in the script. Does not cover the v4.2 logical utilities (`pbs-*`, `mbe-*`, `inset-s-*`…) | medium |
| `shadow-token` | `--local: #123456` in a `.module.css`: a parallel token outside the source | medium |
| `svg-hardcoded-color` | `fill="#FF0000"`: the icon doesn't inherit color (it should be `currentColor`) | medium |
| `css-px-literal`, `css-raw-value` (size) | `gap: 16px`, `transition: 200ms cubic-bezier(…)` | medium |
| `motion-literal` | `duration: 0.35` in Motion | medium |
| `tw-var-shorthand` | `bg-(--color-brand-500)`: it works, but it isn't the canonical class (`bg-brand-500`) | info |

**Known limitations** (review them by hand):

- `inline-style-literal` only sees single-line `style={{…}}`. Also look for multi-line blocks with `rg -n -U 'style=\{\{[^}]*\n' -g '*.{tsx,jsx}'`.
- A `#123` in text ("issue #123") comes out with severity `low` and the note "possible false positive".
- Places the global CSS doesn't reach, where literals are normal, although they should import a generated `tokens.ts`: `opengraph-image.tsx`, `icon.tsx` and `apple-icon.tsx` (Satori/`ImageResponse`), `manifest.ts` (`theme_color`) and `export const viewport = { themeColor }`. Severity low.
- SVGs in `public/`: info. Third-party logos and embeds: not a finding.
- Acceptable values: `0`, `1px` (hairlines), `100%`, `auto`, `currentColor`, `transparent`, `inherit`, and `calc()`/`clamp()` combining tokens.

## Step 4. Near-duplicate colors and nearest token

```bash
node /tmp/qa-design-tokens/colors.mjs /tmp/qa-design-tokens/findings.jsonl /tmp/qa-design-tokens/tokens.json 2.3
```

`colors.mjs`:

```js
// colors.mjs: groups near-duplicate colors (ΔE2000) and suggests the nearest token.
// Usage: node colors.mjs findings.jsonl resolved-tokens.json [threshold=2.3]
//   resolved-tokens.json = { "color.text.primary": "#1a1a1a", ... } (values already resolved, one mode)
import { parse, differenceCiede2000, formatHex8, nearest } from 'culori';
import { readFileSync, existsSync } from 'node:fs';

const [findingsPath, tokensPath, thr = '2.3'] = process.argv.slice(2);
const T = Number(thr), de = differenceCiede2000();
const tokens = tokensPath && existsSync(tokensPath) ? JSON.parse(readFileSync(tokensPath, 'utf8')) : {};
const tokenNames = Object.keys(tokens).filter(k => parse(tokens[k]));
const closest = tokenNames.length ? nearest(tokenNames, de, n => tokens[n]) : null;

const occ = new Map();
for (const l of readFileSync(findingsPath, 'utf8').split('\n').filter(Boolean)) {
  const f = JSON.parse(l);
  if (!['hex-color', 'color-function', 'css-raw-value', 'tw-arbitrary-value', 'shadow-token', 'svg-hardcoded-color'].includes(f.rule)) continue;
  const raw = (f.match.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([^)]*\)/) || [])[0];
  const c = raw && parse(raw);
  if (!c) continue;
  const k = formatHex8(c);
  if (!occ.has(k)) occ.set(k, []);
  occ.get(k).push(`${f.file}:${f.line}`);
}

const keys = [...occ.keys()].sort((a, b) => occ.get(b).length - occ.get(a).length);
const seen = new Set(), clusters = [];
for (const a of keys) {
  if (seen.has(a)) continue;
  const g = [a]; seen.add(a);
  for (const b of keys) if (!seen.has(b) && de(a, b) < T) { g.push(b); seen.add(b); }
  if (g.length > 1) clusters.push(g.map(k => ({ color: k, uses: occ.get(k).length, dE_vs_first: +de(a, k).toFixed(2) })));
}
const suggestions = keys.map(k => {
  if (!closest) return { color: k, uses: occ.get(k).length, where: occ.get(k).slice(0, 5) };
  const [name] = closest(k, 1);
  const d = +de(k, tokens[name]).toFixed(2);
  return { color: k, uses: occ.get(k).length, nearestToken: name, dE: d,
    verdict: d < 1 ? 'replace with token' : d < 2.3 ? 'likely drift: review' : 'no token: decide whether to create one',
    where: occ.get(k).slice(0, 5) };
});
console.log(JSON.stringify({ uniqueColors: keys.length, nearDuplicateClusters: clusters, suggestions }, null, 1));
```

Rough thresholds using the CIEDE2000 color difference (ΔE00). They are a heuristic, not a standard: around 1 can already be noticeable side by side.

- **ΔE00 < 1**: it is the same color. Replace it with the token, no discussion.
- **1 ≤ ΔE00 < 2.3**: likely drift when copying from Figma. Propose the token and ask for confirmation.
- **ΔE00 ≥ 2.3 with no token**: decide whether it is a new system color (create the token **first in Figma/the source** and regenerate) or a generation error.

Do the same with sizes: normalise to px (rem × 16; in Tailwind v4, the multiplier × `--spacing`, usually 4 px) and flag whatever doesn't fall on the scale (multiples of 4 or 8, depending on the system). Propose the nearest value with its difference, for example `13px → 12px (space-3), Δ1px`. Repeat with font-size (against the type scale), radii, z-index (against a closed list) and durations.

## Step 5. Unused tokens

For each token in the inventory, check whether it is used: `rg -c -- "--color-brand-500|brand-500"`. In Tailwind v4, `--color-brand-500` generates `bg-brand-500`, `text-brand-500`…, so search for the suffix after the namespace (`--color-`, `--spacing-`, `--radius-`, `--text-`, `--font-`, `--shadow-`…). Unused tokens are not a serious error, but they are noise: the code may be using a literal where that token should go. Cross-check them with the suggestions from step 4.

## Step 6. Comparison with Figma (if there is a file URL)

There are three routes, from most to least complete:

1. **Figma native export**: right-click a variable collection → "Export modes" generates one DTCG JSON per mode. It launched at the end of 2025 with a gradual rollout, on plans with modes (Professional, Organization, Enterprise, Education); if the option doesn't appear, use route 2. Ask the user to export it and drop it in the project: it is the complete inventory, with no calls spent.
2. **Figma MCP**: `get_variable_defs(fileKey, nodeId)` returns only the variables **used in that node**, as a flat map (`{'color/text/primary': '#1a1a1a'}`). It is useful for auditing screen by screen. A variable not appearing doesn't mean it is missing from the code. `search_design_system` (remote server) answers "is there a variable for this?". With the remote server, call `create_session` first.
   - **Usage limits**: with a View/Collab seat, 20 calls per month. With Full/Dev, 200 per day (10–15 per minute) on Professional/Organization and 600 per day on Enterprise. Save every response to disk and don't repeat calls. If you get a 429, stop and tell the user; don't retry in a loop.
3. **REST Variables API**: Enterprise only.

**Name normalisation**: if the variable has `codeSyntax.WEB`, use that name. Otherwise `Color/Text/Primary` → lowercase → `.` in JSON and `-` in CSS (`--color-text-primary`).

**Pitfalls when comparing values**:

- Letter-spacing in %: 2 % equals `0.02em`. Dev Mode shows it in fixed px/rem, which don't scale.
- Line-height in %: 140 % equals unitless `1.4`. A `line-height: 22px` in the code is usually a percentage converted to px.
- Weights: "SemiBold"/"Demi Bold" = 600, "Medium" = 500, etc.
- Colors: Figma uses RGBA 0–1 with opacity separate. Compare with ΔE00 after compositing the alpha, never as strings.
- Figma numeric variables have no unit. Convert rem↔px with base 16.

Result: a table with four states per token: **matches**, **different value (ΔE or Δpx)**, **Figma only** and **code only**.

## Step 7. Contrast of semantic pairs (bonus)

For the declared text/background pairs (`text.primary` on `bg.surface`, etc.), in **every mode**, compute culori's `wcagContrast(fg, bg)`. WCAG 2.2 requires 4.5:1 for normal text and 3:1 for large text (≥ 24 px, or ≥ 18.66 px bold) and for UI components (1.4.11), **without rounding** (4.499 does not pass).

## Step 8. Report

**Deliver the report as a Markdown file, never as chat text.** Write the complete report to a `.md` file the user can open (in Cowork, save it in the outputs folder and share it as a file; in Claude Code, save it where the user asks or, by default, next to the other outputs of this skill) and in the chat reply only with the verdict, the count of findings by severity and the file path. Do not paste the report into the chat.

Save it as `qa-design-tokens.md` (plus the data in `qa-design-tokens.json`). Write the report in the user's language. Structure:

```markdown
# Design token audit — <project> — <date> — commit <hash>

## Summary
- Token source(s): … (single? generated from Figma?)
- Files scanned: N · Findings: X critical / Y high / Z medium / W low
- Token coverage: uses via token / total uses of style values = NN %
- Unique hand-written colors: N (in M near-duplicate groups)
- Unused tokens: N · Figma vs code: N match, N differ, N Figma only, N code only

## Critical and high findings
| # | Sev. | File:line | Found | Suggested token | ΔE / Δpx | Fix |
|---|---|---|---|---|---|---|
| T-001 | critical | components/Hero.tsx:42 | `bg-[#0B7DFF]` | color.brand.500 (#0a7cff) | 0.35 | `bg-brand-500` |

## Near duplicates
## Off-scale values
## Unused tokens
## Comparison with Figma
## Architecture and recommendations
## How to stop it happening again
```

Group repeated findings: "`#0B7DFF` appears 14 times in 6 files" reads better than 14 identical rows. Show the first 5 locations and leave the rest in the JSON.

## Step 9. Remediation and prevention (only if the user asks)

**Order of fixes**

1. Exact matches or ΔE00 < 1 (the value already exists as a token): direct replacement.
2. Approximate matches (1 ≤ ΔE00 < 2.3, or ±1 px from the scale): suggest and confirm. Those with ΔE00 < 1 belong in point 1.
3. Values with no token: decide with the designer. If it is a new token, it is created **in the source** (Figma → JSON) and regenerated; **the generated CSS is not edited by hand**.
4. Run the audit and the contrast check again.

**Block regressions in CI** (propose, don't install without permission):

- Tailwind v4: `@theme { --color-*: initial; }` leaves only the project's own palette.
- `eslint-plugin-better-tailwindcss` (Tailwind v3 and v4). This example is for v4: `enforce-canonical-classes` requires Tailwind ≥ 4.1.15. In v3 remove that rule and use `settings: { 'better-tailwindcss': { tailwindConfig: 'tailwind.config.js' } }` instead of `entryPoint`.

```js
// eslint.config.mjs
import betterTailwind from "eslint-plugin-better-tailwindcss";
export default [{ files: ["**/*.{ts,tsx,js,jsx}"],
  plugins: { "better-tailwindcss": betterTailwind },
  settings: { "better-tailwindcss": { entryPoint: "app/globals.css", rootFontSize: 16 } },
  rules: {
    "better-tailwindcss/no-unknown-classes": "error",          // catches the removed default palette
    "better-tailwindcss/enforce-canonical-classes": "warn",    // p-[16px] → p-4
    "better-tailwindcss/no-restricted-classes": ["error", { restrict: [{
      pattern: "\\[([^\\[\\]]*?)\\](?!:)", message: "Arbitrary value '$1': use a theme token." }] }] } }];
```

- `stylelint-declaration-strict-value` for CSS/SCSS. Disable it with `overrides` in the token file. With `ignoreFunctions: true`, `calc()`/`clamp()` with tokens are allowed, but `rgb()`/`hsl()` are not detected (`scan.mjs` and `css-raw.mjs` still catch those). If the project barely uses `calc()`, set it to `false`:

```json
{ "plugins": ["stylelint-declaration-strict-value"],
  "rules": { "scale-unlimited/declaration-strict-value": [
    ["/color$/", "fill", "stroke", "z-index", "font-size", "line-height", "border-radius", "box-shadow", "/^(margin|padding|gap)/"],
    { "ignoreValues": { "": ["currentColor", "transparent", "inherit", "initial", "unset", "none", "0"] }, "ignoreFunctions": true, "expandShorthand": true } ] } }
```

- Token pipeline: Figma "Export modes" → `*.tokens.json` in the repo → Style Dictionary 5 (requires Node ≥ 22) or Terrazzo (`@terrazzo/plugin-tailwind` generates the `@theme` block) → generated CSS. Terrazzo ships a token linter with rules such as `core/duplicate-values`, `core/required-modes` and `a11y/min-contrast`.
