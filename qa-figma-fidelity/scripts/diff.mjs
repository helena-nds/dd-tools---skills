// diff.mjs: compares the Figma PNG with the web one and generates a diff + side-by-side composite.
// Usage: node diff.mjs figma.png web.png outPrefix   → outPrefix-diff.png, outPrefix-side.png
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { readFileSync, writeFileSync } from 'node:fs';

const [fa, fb, out] = process.argv.slice(2);
const a = PNG.sync.read(readFileSync(fa)), b = PNG.sync.read(readFileSync(fb));
const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
const crop = img => { const o = new PNG({ width: w, height: h }); PNG.bitblt(img, o, 0, 0, w, h, 0, 0); return o; };
const A = crop(a), B = crop(b), D = new PNG({ width: w, height: h });
const n = pixelmatch(A.data, B.data, D.data, w, h, { threshold: 0.1, includeAA: false, alpha: 0.3, diffColorAlt: [0, 160, 255] });
writeFileSync(`${out}-diff.png`, PNG.sync.write(D));

// Side by side: Figma | Web | Diff (8 px grey separator)
const gap = 8, H = Math.max(a.height, b.height), S = new PNG({ width: a.width + b.width + w + gap * 2, height: H });
S.data.fill(200);
PNG.bitblt(a, S, 0, 0, a.width, a.height, 0, 0);
PNG.bitblt(b, S, 0, 0, b.width, b.height, a.width + gap, 0);
PNG.bitblt(D, S, 0, 0, w, h, a.width + b.width + gap * 2, 0);
writeFileSync(`${out}-side.png`, PNG.sync.write(S));

const ratio = n / (w * h);
console.log(JSON.stringify({
  figma: [a.width, a.height], web: [b.width, b.height], sizeDelta: { w: b.width - a.width, h: b.height - a.height },
  diffPixels: n, diffRatio: +ratio.toFixed(4),
  reading: ratio < 0.03 ? 'probable noise (antialiasing)' : ratio < 0.10 ? 'inspect' : 'probable structural difference',
}, null, 1));
