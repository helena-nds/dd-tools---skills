// css-baseline.mjs: scans the COMPILED CSS (.next/static/**/*.css) and lists the features with limited support
// according to Baseline (web-features package) and the target browsers (browserslist).
// Usage: [IGNORE=cursor,resize,font-family-ui] TARGETS="chrome >= 111, edge >= 111, firefox >= 111, safari >= 16.4, ios_saf >= 16.4" node css-baseline.mjs <a.css> [b.css ...]
//   Without TARGETS it uses the Next 16 minimums (the ones above). Output: JSON with features that are not "widely available",
//   target browsers that don't support them and whether the use is protected by @supports.
import postcss from 'postcss';
import browserslist from 'browserslist';
import { features } from 'web-features';
import { readFileSync } from 'node:fs';

const TARGETS = process.env.TARGETS || 'chrome >= 111, edge >= 111, firefox >= 111, safari >= 16.4, ios_saf >= 16.4';
const BL2WF = { chrome: 'chrome', edge: 'edge', firefox: 'firefox', safari: 'safari', ios_saf: 'safari_ios', and_chr: 'chrome_android', and_ff: 'firefox_android' };
const minVer = {};                                       // web-features browser → minimum target version
for (const t of browserslist(TARGETS)) { const [b, v] = t.split(' '); const k = BL2WF[b]; if (!k) continue; const n = parseFloat(v.split('-')[0]); if (!(k in minVer) || n < minVer[k]) minVer[k] = n; }

const idx = {};                                          // BCD key → feature id
for (const [id, f] of Object.entries(features)) for (const k of f.compat_features || []) idx[k] = id;
const UNITS = { dvh: 'dynamic', dvw: 'dynamic', dvi: 'dynamic', dvb: 'dynamic', dvmin: 'dynamic', dvmax: 'dynamic', svh: 'small', svw: 'small', svmin: 'small', svmax: 'small', lvh: 'large', lvw: 'large' };
const keysFor = { at: n => [`css.at-rules.${n}`], prop: n => [`css.properties.${n}`], val: (p, v) => [`css.properties.${p}.${v}`],
  fn: n => [`css.types.color.${n}`, `css.types.${n}`, `css.types.image.gradient.${n}`, `css.types.transform-function.${n}`, `css.types.basic-shape.${n}`],
  sel: n => [`css.selectors.${n}`], unit: u => UNITS[u] ? [`css.types.length.viewport_percentage_units_${UNITS[u]}`] : [`css.types.length.${u}`],
  media: n => [`css.at-rules.media.${n}`] };

const uses = new Map();                                  // featureId → { count, unguarded, examples }
const hit = (keys, example, guarded) => {
  for (const k of keys) { const id = idx[k]; if (!id) continue;
    const u = uses.get(id) || { count: 0, unguarded: 0, examples: new Set(), bcd: new Set() };
    u.count++; if (!guarded) u.unguarded++; if (u.examples.size < 3) u.examples.add(example.slice(0, 90)); u.bcd.add(k); uses.set(id, u); return; }
};
const iosRisks = [];
for (const file of process.argv.slice(2)) {
  let root; try { root = postcss.parse(readFileSync(file, 'utf8'), { from: file }); } catch (e) { console.error(`${file}: ${e.message}`); continue; }
  root.walk(node => {
    let guarded = false; for (let p = node.parent; p; p = p.parent) if (p.type === 'atrule' && p.name === 'supports') guarded = true;
    if (node.type === 'atrule') {
      hit(keysFor.at(node.name), `@${node.name} ${node.params}`, guarded);
      if (node.name === 'media') {
        if (/[<>]=?/.test(node.params)) hit(keysFor.media('range_syntax'), `@media ${node.params}`, guarded);
        for (const m of node.params.matchAll(/\(\s*([a-z-]+)\s*[:)<>=]/g)) hit(keysFor.media(m[1]), `@media ${node.params}`, guarded);
      }
    } else if (node.type === 'rule') {
      for (const m of node.selector.matchAll(/::?([a-z-]+)(?=[^a-z-]|$)/g)) hit(keysFor.sel(m[1]), node.selector, guarded);
      if (/(^|[^\w-])&/.test(node.selector)) hit(['css.selectors.nesting'], node.selector, guarded);
    } else if (node.type === 'decl') {
      const prop = node.prop.toLowerCase(), val = node.value;
      if (!prop.startsWith('--')) hit(keysFor.prop(prop), `${prop}: ${val}`, guarded);
      for (const w of val.match(/(?<![\w-])[a-z][a-z-]+(?![\w(-])/g) || []) hit(keysFor.val(prop, w), `${prop}: ${val}`, guarded);
      for (const m of val.matchAll(/([a-z-]+)\(/g)) hit(keysFor.fn(m[1]), `${prop}: ${val}`, guarded);
      for (const m of val.matchAll(/\d(dv[hwib]|dvmin|dvmax|sv[hw]|svmin|svmax|lv[hw]|cq[whib]|cqmin|cqmax|lh|rlh|cap|rcap|ic)\b/g)) hit(keysFor.unit(m[1]), `${prop}: ${val}`, guarded);
      for (const m of val.matchAll(/env\(\s*([a-z-]+)/g)) hit([`css.types.env.${m[1]}`, 'css.types.env'], `${prop}: ${val}`, guarded);
      // Specific Safari iOS risks
      if (/(^|-)height$/.test(prop) && /\b100vh\b/.test(val)) iosRisks.push({ risk: '100vh (the Safari iOS bar covers the end; use 100dvh/100svh)', rule: node.parent.selector, decl: `${prop}: ${val}` });
      if (prop === 'position' && val === 'fixed' && node.parent.nodes?.some(d => d.prop === 'bottom')) iosRisks.push({ risk: 'position: fixed + bottom (the virtual keyboard shifts or covers it on iOS)', rule: node.parent.selector });
    }
  });
}
// Known noise: cursor/resize don't apply on touch; ui-monospace sits inside a stack with fallbacks.
const IGNORE = new Set((process.env.IGNORE ?? 'cursor,resize,font-family-ui').split(',').filter(Boolean));
const out = [];
for (const [id, u] of uses) {
  if (IGNORE.has(id)) continue;
  const f = features[id], st = f.status || {};
  if (st.baseline === 'high') continue;                  // widely available: no risk
  const missing = Object.entries(minVer).filter(([b, v]) => !st.support?.[b] || parseFloat(st.support[b]) > v).map(([b, v]) => `${b} ${v}${st.support?.[b] ? ` (since ${st.support[b]})` : ' (no support)'}`);
  out.push({ feature: id, name: f.name, baseline: st.baseline === 'low' ? `newly available (${st.baseline_low_date})` : 'limited', count: u.count,
    withoutSupports: u.unguarded, unsupportedTargets: missing, examples: [...u.examples], bcd: [...u.bcd].slice(0, 3) });
}
const rank = x => (x.unsupportedTargets.length ? 0 : 2) + (x.withoutSupports ? 0 : 1);
out.sort((a, b) => rank(a) - rank(b) || b.count - a.count);
console.log(JSON.stringify({ targets: TARGETS, minimums: minVer, featuresUsed: uses.size, noWidelyAvailable: out, iosRisks }, null, 1));
