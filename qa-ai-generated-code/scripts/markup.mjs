// markup.mjs: "div soup" and Figma leftovers in JSX (TypeScript AST): div/span ratio, div nesting, wrappers with no function,
// div/span with onClick, position absolute with fixed coordinates and fixed px widths/heights copied from the design.
// Usage (from the root): rg --files -g '!node_modules' -g '!.next' -g '*.tsx' -g '*.jsx' . | node markup.mjs > markup.json
// Requires: npm i typescript@5 in /tmp/qa-ai-generated-code (the TypeScript 5 AST API)
import ts from 'typescript';
import { readFileSync } from 'node:fs';

const files = readFileSync(0, 'utf8').split('\n').map(s => s.trim()).filter(f => /\.[jt]sx$/.test(f) && !/\.(test|spec|stories)\./.test(f));
const SEM = /^(header|nav|main|section|article|aside|footer|h[1-6]|p|ul|ol|li|dl|button|a|form|label|figure|figcaption|table|blockquote|address|time)$/;
const ABS_COORD = /(?:^|\s)(?:-?(?:top|left|right|bottom|inset(?:-[xy])?)-\[-?\d+(?:\.\d+)?px\])/g;
const FIXED = /(?:^|\s)(?:min-|max-)?(w|h)-\[(\d+(?:\.\d+)?)px\]/g;
const out = [], tot = { intrinsic: 0, div: 0, span: 0, semantic: 0 };
for (const file of files) {
  let text; try { text = readFileSync(file, 'utf8'); } catch { continue; }
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const m = { file, intrinsic: 0, div: 0, span: 0, semantic: 0, maxDivDepth: 0, findings: [] };
  const line = n => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
  const attrs = el => (el.attributes?.properties || []).filter(ts.isJsxAttribute);
  const attr = (el, name) => attrs(el).find(a => a.name.getText() === name);
  const strVal = a => !a?.initializer ? '' : ts.isStringLiteral(a.initializer) ? a.initializer.text : a.initializer.getText();
  const visit = (node, divDepth) => {
    let d = divDepth;
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const open = ts.isJsxElement(node) ? node.openingElement : node, tag = open.tagName.getText();
      if (/^[a-z]/.test(tag)) {
        m.intrinsic++; if (tag === 'div') m.div++; if (tag === 'span') m.span++; if (SEM.test(tag)) m.semantic++;
        const cls = strVal(attr(open, 'className')), style = strVal(attr(open, 'style'));
        if (tag === 'div') { d++; m.maxDivDepth = Math.max(m.maxDivDepth, d); }
        if (/^(div|span)$/.test(tag) && attr(open, 'onClick') && !attr(open, 'role')) m.findings.push({ rule: 'clickable-div', sev: 'high', line: line(node), why: 'use button or a (keyboard and screen reader); details in the accessibility audit' });
        if (tag === 'div' && ts.isJsxElement(node) && attrs(open).length === 0 && !open.attributes.properties.length) {
          const kids = node.children.filter(c => !(ts.isJsxText(c) && !c.text.trim()));
          if (kids.length === 1 && (ts.isJsxElement(kids[0]) || ts.isJsxSelfClosingElement(kids[0]))) m.findings.push({ rule: 'pointless-wrapper', sev: 'low', line: line(node), why: 'div without attributes wrapping a single element' });
        }
        const coords = [...cls.matchAll(ABS_COORD)].length + (/position\s*:\s*['"]absolute/.test(style) && /(top|left|right|bottom)\s*:\s*-?\d/.test(style) ? 2 : 0);
        if ((/(^|\s)absolute(\s|$)/.test(cls) || /position\s*:\s*['"]absolute/.test(style)) && coords >= 2) m.findings.push({ rule: 'absolute-with-coordinates', sev: 'high', line: line(node), text: cls.slice(0, 100) || style.slice(0, 100), why: 'absolute position with px coordinates: layout copied from the Figma canvas, breaks when the width changes' });
        for (const f of cls.matchAll(FIXED)) if (Number(f[2]) >= (f[1] === 'w' ? 480 : 400) && !/max-/.test(f[0])) m.findings.push({ rule: 'fixed-size-from-figma', sev: Number(f[2]) >= 1000 ? 'high' : 'medium', line: line(node), text: f[0].trim(), why: 'fixed width/height of the Figma frame: overflows on mobile (use max-w, w-full, aspect-*)' });
        const sw = style.match(/\b(width|height)\s*:\s*['"]?(\d{3,})(px)?\b/); if (sw && Number(sw[2]) >= 480) m.findings.push({ rule: 'fixed-size-from-figma', sev: 'medium', line: line(node), text: sw[0], why: 'fixed size in style' });
        if (/(?:leading|tracking|text)-\[\d+\.\d{2,}px\]/.test(cls)) m.findings.push({ rule: 'figma-decimals', sev: 'low', line: line(node), text: (cls.match(/(?:leading|tracking|text)-\[\d+\.\d{2,}px\]/) || [])[0], why: 'value with decimals exported from Figma: see qa-design-tokens' });
      }
    }
    ts.forEachChild(node, c => visit(c, d));
  };
  visit(sf, 0);
  if (!m.intrinsic) continue;
  m.divRatio = +((m.div + m.span) / m.intrinsic).toFixed(2);
  if (m.div >= 10 && m.divRatio > 0.6 && m.semantic / m.intrinsic < 0.2) m.findings.push({ rule: 'div-soup', sev: 'medium', line: 1, why: `${m.div} div and ${m.span} span out of ${m.intrinsic} elements (${Math.round(m.divRatio * 100)} %), few semantic tags` });
  if (m.maxDivDepth >= 6) m.findings.push({ rule: 'excessive-nesting', sev: 'medium', line: 1, why: `${m.maxDivDepth} nested divs` });
  for (const k of Object.keys(tot)) tot[k] += m[k];
  out.push(m);
}
const abs = out.reduce((n, m) => n + m.findings.filter(h => h.rule === 'absolute-with-coordinates').length, 0);
console.log(JSON.stringify({ summary: { ...tot, divSpanRatio: +((tot.div + tot.span) / (tot.intrinsic || 1)).toFixed(2), absoluteWithCoordinates: abs,
  filesWithFindings: out.filter(m => m.findings.length).length }, files: out.filter(m => m.findings.length).sort((a, b) => b.findings.length - a.findings.length), rest: out.filter(m => !m.findings.length).map(m => `${m.file} (${m.div} div / ${m.intrinsic})`) }, null, 1));
