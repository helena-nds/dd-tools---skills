// targets.mjs: touch target size (WCAG 2.5.8 AA: 24×24 px or spacing exception; 44×44 recommended).
// Usage: node targets.mjs <url> <outDir> [width=390]   (emulates a touch phone at that width)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const [url, outDir = '.', width = '390'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +width, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });
const res = await page.evaluate(() => {
  const SEL = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=checkbox],[role=radio],[role=switch],[role=tab],[role=menuitem],[tabindex]:not([tabindex="-1"])';
  const els = [...document.querySelectorAll(SEL)].filter(e => {
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && r.right > 0 && r.left < innerWidth;   // off-screen is handled by keyboard.mjs
  }).filter(e => !e.parentElement.closest(SEL));                                                               // only the outer target
  const box = e => e.getBoundingClientRect();
  const name = e => (e.getAttribute('aria-label') || e.innerText || e.value || e.getAttribute('href') || '').trim().slice(0, 40);
  const sel = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.getAttribute('href') ? `[href="${e.getAttribute('href')}"]` : '') + (e.type && e.tagName === 'INPUT' ? `[type=${e.type}]` : '');
  // "Inline" exception: link inside a sentence (has sibling text nodes with content)
  const inline = e => e.tagName === 'A' && getComputedStyle(e).display === 'inline' && [...e.parentElement.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 3);
  const out = [];
  for (const e of els) {
    const r = box(e), w = Math.round(r.width * 10) / 10, h = Math.round(r.height * 10) / 10;
    if (w >= 44 && h >= 44) continue;
    let verdict = w >= 24 && h >= 24 ? 'ok-AA (<44 recommended)' : 'small';
    if (verdict === 'small') {
      if (inline(e)) verdict = 'inline exception';
      else if (['checkbox', 'radio'].includes(e.type) && !getComputedStyle(e).appearance.includes('none')) verdict = 'small (native control: user-agent exception only if not restyled)';
      else {
        // Spacing exception: a 24 px circle centred on each small target must not intersect another target or another circle
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const clashes = els.some(o => {
          if (o === e) return false;
          const q = box(o), ox = Math.max(q.left, Math.min(cx, q.right)), oy = Math.max(q.top, Math.min(cy, q.bottom));
          if (Math.hypot(cx - ox, cy - oy) < 12) return true;                                     // the circle intersects the other target
          const small = q.width < 24 || q.height < 24;
          return small && Math.hypot(cx - (q.left + q.width / 2), cy - (q.top + q.height / 2)) < 24;  // intersects the circle of another small target
        });
        verdict = clashes ? 'FAILS 2.5.8' : 'spacing exception';
      }
    }
    out.push({ sel: sel(e), name: name(e), w, h, verdict });
  }
  return out;
});
writeFileSync(`${outDir}/targets.json`, JSON.stringify({ url, width: +width, targets: res }, null, 1));
for (const o of res) console.log(`${o.verdict.padEnd(24)} ${o.w}×${o.h} ${o.sel} "${o.name}"`);
await browser.close();
