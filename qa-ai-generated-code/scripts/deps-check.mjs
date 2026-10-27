// deps-check.mjs: checks each dependency against the npm registry (exists, age, weekly downloads, deprecated, package pulled for security,
// similarity to popular packages = typosquatting/slopsquatting), whether it is used in the code and whether there are several libraries for the same thing.
// Usage (from the project root): node deps-check.mjs [package.json] > deps.json      Requires network access to registry.npmjs.org (api.npmjs.org is optional).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const pkg = JSON.parse(readFileSync(process.argv[2] || 'package.json', 'utf8'));
const deps = { ...pkg.devDependencies, ...pkg.dependencies }, dev = new Set(Object.keys(pkg.devDependencies || {}));
const POPULAR = `react react-dom next typescript eslint prettier tailwindcss postcss autoprefixer sass axios lodash lodash-es moment dayjs date-fns luxon zod yup joi
valibot clsx classnames tailwind-merge class-variance-authority framer-motion motion gsap swr @tanstack/react-query react-hook-form formik zustand jotai redux
@reduxjs/toolkit react-redux immer uuid nanoid sharp next-auth next-intl next-themes next-seo next-sitemap @vercel/analytics @vercel/speed-insights
@next/third-parties @next/bundle-analyzer @next/mdx @mdx-js/react contentlayer gray-matter remark rehype react-markdown @sentry/nextjs posthog-js resend nodemailer
@sendgrid/mail stripe @stripe/stripe-js prisma @prisma/client drizzle-orm mongoose pg mysql2 @supabase/supabase-js firebase @upstash/redis ioredis graphql
@apollo/client urql react-icons lucide-react @heroicons/react @radix-ui/react-dialog @radix-ui/react-slot @headlessui/react @mui/material @emotion/react
@emotion/styled styled-components antd @chakra-ui/react @mantine/core sonner react-hot-toast swiper embla-carousel-react keen-slider @react-three/fiber three
recharts chart.js d3 react-chartjs-2 @tiptap/react jest vitest @testing-library/react @testing-library/jest-dom @playwright/test playwright cypress msw
@faker-js/faker husky lint-staged @types/node @types/react @types/react-dom eslint-config-next eslint-plugin-react eslint-plugin-react-hooks
eslint-plugin-jsx-a11y eslint-plugin-unused-imports @typescript-eslint/parser @typescript-eslint/eslint-plugin typescript-eslint dotenv cross-env rimraf
concurrently nodemon ts-node tsx esbuild vite webpack @babel/core jscodeshift geist @fontsource/inter react-intersection-observer react-use usehooks-ts
@vercel/og satori schema-dts @tailwindcss/postcss @tailwindcss/typography @tailwindcss/forms tailwindcss-animate tw-animate-css express cors helmet
jsonwebtoken bcrypt bcryptjs cookie js-cookie @auth/core better-auth openai @anthropic-ai/sdk ai @ai-sdk/react @ai-sdk/openai react-email @react-email/components`.split(/\s+/);
const GROUPS = { dates: ['moment', 'dayjs', 'date-fns', 'luxon'], http: ['axios', 'ky', 'got', 'node-fetch', 'superagent', 'isomorphic-fetch'],
  utilities: ['lodash', 'lodash-es', 'underscore', 'ramda'], icons: ['react-icons', 'lucide-react', '@heroicons/react', '@fortawesome/react-fontawesome', '@tabler/icons-react', '@phosphor-icons/react'],
  animation: ['framer-motion', 'motion', 'gsap', 'react-spring', '@react-spring/web', 'animejs'], forms: ['react-hook-form', 'formik', '@tanstack/react-form', 'react-final-form'],
  validation: ['zod', 'yup', 'joi', 'valibot', 'superstruct'], cssInJs: ['styled-components', '@emotion/react', '@stitches/react'], state: ['redux', '@reduxjs/toolkit', 'zustand', 'jotai', 'recoil', 'mobx', 'valtio'],
  data: ['swr', '@tanstack/react-query', 'react-query'], classes: ['clsx', 'classnames'], ids: ['uuid', 'nanoid'], carousel: ['swiper', 'embla-carousel-react', 'keen-slider', 'react-slick'],
  toasts: ['sonner', 'react-hot-toast', 'react-toastify'], ui: ['@mui/material', 'antd', '@chakra-ui/react', '@mantine/core'] };
const NOTES = { moment: 'in maintenance mode: date-fns, dayjs or Intl', 'node-fetch': 'fetch is native in Node 18+ and in Next', axios: 'native fetch is enough in Next (and integrates with its cache)',
  request: 'deprecated', uuid: 'crypto.randomUUID() is native', 'react-helmet': 'App Router uses the Metadata API', 'react-helmet-async': 'App Router uses the Metadata API',
  'next-seo': 'App Router uses the Metadata API', '@next/font': 'removed: use next/font', 'react-router-dom': 'Next already has a router', 'react-ga': 'Universal Analytics, no longer processes data',
  'next-images': 'unnecessary: next/image', 'next-compose-plugins': 'abandoned', 'react-scripts': 'Create React App in a Next project' };
const IMPLICIT = /^(next|react|react-dom|typescript|@types\/.*|eslint|eslint-config-.*|eslint-plugin-.*|@eslint\/.*|typescript-eslint|prettier|prettier-plugin-.*|tailwindcss|@tailwindcss\/(postcss|turbopack|typography|forms)|postcss|autoprefixer|sharp|husky|lint-staged|@next\/bundle-analyzer)$/;

const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
    i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] ? d[i - 2][j - 2] + 1 : Infinity); return d[a.length][b.length]; };
const norm = s => s.replace(/[-_.]/g, '').replace(/js$/, '');
const similar = (name, cands) => cands.filter(p => p !== name && (lev(name, p) <= (name.length > 8 ? 2 : 1) || norm(p) === norm(name) && name[0] === p[0]));
const get = async (url, ms = 15000) => { try { const r = await fetch(url, { signal: AbortSignal.timeout(ms) }); return { status: r.status, json: r.ok ? await r.json() : null }; } catch (e) { return { status: 0, error: e.message }; } };
const enc = n => n.replace('/', '%2f');

// Usage in the code: import/require/@import/@plugin specifiers and package.json scripts
const used = new Set(), scripts = JSON.stringify(pkg.scripts || {});
const walk = d => { for (const f of readdirSync(d)) { if (/^(node_modules|\.next|\.git|out|dist|build|coverage|\.vercel)$/.test(f)) continue; const p = join(d, f);
  const s = statSync(p); if (s.isDirectory()) walk(p); else if (/\.(m?[jt]sx?|cjs|css|scss|mdx|json)$/.test(f) && f !== 'package.json' && !/lock/.test(f) && s.size < 2e6) {
    const src = readFileSync(p, 'utf8');
    for (const m of src.matchAll(/(?:from\s+|require\(\s*|import\(\s*|@import\s+|@plugin\s+|@reference\s+|import\s+)['"]([^'"./][^'"]*)['"]/g)) used.add(m[1].startsWith('@') ? m[1].split('/').slice(0, 2).join('/') : m[1].split('/')[0]);
    for (const m of src.matchAll(/["']((?:@[\w-]+\/)?[\w.-]+)["']/g)) if (/config|eslint|prettier|postcss|tailwind/.test(f) && deps[m[1]]) used.add(m[1]); } } };
walk('.');

const res = [];
const names = Object.keys(deps);
for (let i = 0; i < names.length; i += 6) await Promise.all(names.slice(i, i + 6).map(async name => {
  const r = { package: name, version: deps[name], dev: dev.has(name), findings: [] }; const add = (sev, msg) => r.findings.push({ sev, msg });
  if (/^(file|link|git\+?|github|https?):|^[\w-]+\/[\w.-]+$/.test(deps[name])) { add('high', `not from the registry: ${deps[name]}`); res.push(r); return; }
  const s = await get(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(name)}&size=20`, 10000);
  const objs = s.json?.objects || [], hit = objs.find(o => o.package.name === name);
  const dl = await get(`https://api.npmjs.org/downloads/point/last-week/${name}`, 5000);
  r.weeklyDownloads = dl.json?.downloads ?? hit?.downloads?.weekly ?? null; r.downloadsSource = dl.json ? 'api.npmjs.org' : hit ? 'registry search' : null;
  const big = r.weeklyDownloads >= 100000;
  const meta = await get(`https://registry.npmjs.org/${enc(name)}${big ? '/latest' : ''}`, big ? 15000 : 30000);
  const popularSearch = objs.filter(o => o.package.name !== name && (o.downloads?.weekly || 0) > 100 * Math.max(1, r.weeklyDownloads || 0)).map(o => o.package.name);
  const rest = name.replace(/^@[^/]+\//, '').replace(/^(react|next|vue|node|js|ts)-/, '');
  const sims = [...new Set([...similar(name, POPULAR), ...similar(name, popularSearch),
    ...(rest.length >= 6 && rest !== name ? POPULAR.filter(p => p !== name && p.includes(rest)) : [])])];
  if (sims.length && !(r.weeklyDownloads > 1e6)) add('high', `name similar to ${sims.join(', ')}: typosquatting, conflation or hallucination?`);
  if (meta.status === 404) { add('critical', 'DOES NOT EXIST on npm: possibly a hallucinated package (slopsquatting if someone registers it)'); res.push(r); return; }
  if (!meta.json) { add('medium', `could not query the registry (${meta.status || meta.error})`); res.push(r); return; }
  const m = meta.json, latest = big ? m : m.versions?.[m['dist-tags']?.latest] || {};
  r.latest = latest.version || m['dist-tags']?.latest; r.created = m.time?.created?.slice(0, 10); r.repository = (latest.repository?.url || m.repository?.url || '').replace(/^git\+/, '') || null;
  if (/security holding package/i.test(latest.description || m.description || '') || /-security$/.test(r.latest || '')) add('critical', 'package pulled by npm as malicious (security holding package)');
  else if (/placeholder|dependency confusion|reserved/i.test(latest.description || m.description || '')) add('high', `reserved package with no code ("${(latest.description || m.description).slice(0, 60)}"): the name is not the one intended`);
  if (latest.deprecated) add('high', `deprecated: ${String(latest.deprecated).slice(0, 120)}`);
  if (r.created) { const days = (Date.now() - Date.parse(r.created)) / 864e5; r.daysSinceCreated = Math.round(days);
    if (days < 90) add(r.weeklyDownloads > 100000 ? 'low' : 'high', `created ${Math.round(days)} days ago${r.weeklyDownloads > 100000 ? ' (widely used: probably legitimate, check the publisher)' : ''}`); }
  if (r.weeklyDownloads !== null && r.weeklyDownloads < 1000) add(r.weeklyDownloads < 100 ? 'high' : 'medium', `only ${r.weeklyDownloads} downloads/week`);
  if (!r.repository) add('low', 'no repository declared');
  if (!used.has(name) && !IMPLICIT.test(name) && !scripts.includes(name.replace(/^@[^/]+\//, ''))) add('medium', 'not imported in any file or script: installed "just in case"? (confirm with knip)');
  if (NOTES[name]) add('low', NOTES[name]);
  res.push(r);
}));
const groups = Object.entries(GROUPS).map(([g, l]) => [g, l.filter(p => deps[p])]).filter(([, l]) => l.length > 1).map(([g, l]) => ({ purpose: g, packages: l, msg: 'several libraries for the same thing' }));
const lock = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb'].filter(existsSync);
const foreign = lock.includes('package-lock.json') ? [...readFileSync('package-lock.json', 'utf8').matchAll(/"resolved":\s*"([^"]+)"/g)].map(m => m[1]).filter(u => !u.startsWith('https://registry.npmjs.org/')) : [];
const order = { critical: 0, high: 1, medium: 2, low: 3 };
res.sort((a, b) => Math.min(4, ...a.findings.map(h => order[h.sev])) - Math.min(4, ...b.findings.map(h => order[h.sev])));
console.log(JSON.stringify({ date: new Date().toISOString(), lockfile: lock.length ? lock : 'MISSING (non-reproducible installs)', resolvedOutsideRegistry: foreign.slice(0, 20),
  samePurpose: groups, dependencies: res, summary: { total: res.length, withFindings: res.filter(r => r.findings.some(h => h.sev !== 'low')).length } }, null, 1));
