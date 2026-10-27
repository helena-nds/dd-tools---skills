// patterns.mjs: obsolete or misused Next/React APIs (Next 16 / React 19) and typical leftovers of agent-generated code
// (agent comments, commented-out code, TODO, mocks, any/@ts-ignore, swallowed errors, empty tests). Regex with folder context.
// Usage (from the root): rg --files -g '!node_modules' -g '!.next' -g '!out' -g '!*.d.ts' . | node patterns.mjs > patterns.jsonl
import { readFileSync, existsSync } from 'node:fs';

const files = readFileSync(0, 'utf8').split('\n').map(s => s.trim().replace(/^\.\//, '')).filter(f => /\.(m?[jt]sx?|cjs)$|(^|\/)package\.json$/.test(f) && !/\.d\.ts$/.test(f));
const APP = /(^|\/)(src\/)?app\//, PAGES = /(^|\/)(src\/)?pages\//, TEST = /\.(test|spec)\.[jt]sx?$|__tests__\/|(^|\/)(e2e|tests?)\//;
const hasPages = files.some(f => PAGES.test(f) && /\.[jt]sx?$/.test(f) && !/pages\/api\//.test(f)), hasApp = files.some(f => APP.test(f) && /(page|layout)\.[jt]sx?$/.test(f));
const R = [ // [id, sev, regex, condition(file, src), explanation]
  ['next-head-in-app', 'high', /from\s+['"]next\/head['"]/, f => APP.test(f) || !hasPages, 'next/head does nothing in App Router: use metadata / generateMetadata'],
  ['pages-data-fetching-in-app', 'critical', /export\s+(async\s+)?(function|const)\s+(getServerSideProps|getStaticProps|getStaticPaths|getInitialProps)\b/, f => APP.test(f), 'does not run in app/: the component does not receive the data'],
  ['next-router-in-app', 'high', /from\s+['"]next\/router['"]/, f => !PAGES.test(f) && hasApp, 'in App Router: useRouter/usePathname/useSearchParams from next/navigation'],
  ['img-instead-of-next-image', 'medium', /<img\b/, f => /\.[jt]sx$/.test(f), 'no next/image: no responsive sizes, lazy loading or modern formats (see performance/accessibility)'],
  ['link-legacy', 'medium', /\blegacyBehavior\b|\bpassHref\b|<Link\b[^>]*>\s*<a\b/, null, 'legacyBehavior is deprecated in Next 16 and will be removed'],
  ['next-legacy-image', 'medium', /next\/legacy\/image/, null, 'deprecated in Next 16'],
  ['amp-removed', 'high', /next\/amp|\bamp\s*:\s*(true|\{)/, null, 'AMP removed in Next 16'],
  ['runtime-config-removed', 'high', /serverRuntimeConfig|publicRuntimeConfig|from\s+['"]next\/config['"]/, null, 'removed in Next 16: use environment variables'],
  ['sync-request-api', 'high', /\b(cookies|headers|draftMode)\(\)\s*\.\s*\w+/, null, 'Next 16 removed synchronous access: await cookies() / headers() / draftMode()'],
  ['ppr-experimental', 'high', /experimental_ppr|\bppr\s*:|\bdynamicIO\s*:|\buseCache\s*:/, null, 'removed in Next 16: cacheComponents in next.config'],
  ['experimental-turbo', 'medium', /experimental\s*:\s*\{[^}]*\bturbo(pack)?\s*:/, null, 'in Next 16 turbopack goes at the root of next.config'],
  ['images-domains', 'medium', /images\s*:\s*\{[^}]*\bdomains\s*:/, null, 'images.domains is deprecated: remotePatterns'],
  ['eslint-in-next-config', 'medium', /^\s*eslint\s*:\s*\{/, f => /next\.config/.test(f), 'option removed in Next 16'],
  ['next-lint-removed', 'high', /"[^"]+"\s*:\s*"[^"]*\bnext lint\b/, f => /package\.json$/.test(f), 'next lint does not exist in Next 16: eslint directly'],
  ['unstable-cache', 'medium', /\bunstable_cache\b|\bunstable_noStore\b/, null, "replaced by 'use cache' / connection() in Next 16"],
  ['revalidateTag-single-argument', 'medium', /\brevalidateTag\(\s*[^,()]+\)/, null, 'single-argument form deprecated in Next 16: revalidateTag(tag, "max") or updateTag'],
  ['dynamic-ssr-false-on-server', 'high', /dynamic\([^)]*ssr\s*:\s*false/, (f, s) => !/^\s*['"]use client['"]/m.test(s), 'ssr:false is not allowed in Server Components'],
  ['react-render-legacy', 'high', /ReactDOM\.render\(|\bfindDOMNode\(|\.defaultProps\s*=|from\s+['"]react-dom\/test-utils['"]/, null, 'API removed in React 19'],
  ['useFormState', 'medium', /\buseFormState\b/, null, 'renamed to useActionState (react)'],
  ['propTypes', 'low', /\.propTypes\s*=/, null, 'React 19 ignores propTypes: TypeScript'],
  ['pending-codemod', 'high', /@next-codemod-error|UnsafeUnwrapped/, null, 'unfinished automatic migration'],
  ['agent-comment', 'medium', /\/\/.*\b(rest of (the )?(code|component|file)|\.\.\.\s*(rest|existing|other)|existing code|add (your|more) .{0,30}here|in a real (app|application|implementation|project)|for (demo|demonstration|example) purposes|replace (this|with (your|actual|real))|you (can|could|might|may|should) (also )?(add|replace|use|customi[sz]e|want)|I('ve| have) (added|updated|created|changed)|simplified (version|example|implementation)|en una (app|aplicaci[oó]n) real|sustituye? (esto|por tu)|aqu[ií] (va|ir[aá]|puedes))/i, null, 'comment addressed to the chat user, not to whoever maintains the code'],
  ['todo', 'low', /\b(TODO|FIXME|XXX|HACK)\b/, null, 'pending task in production code'],
  ['placeholder-content', 'medium', /lorem ipsum|via\.placeholder\.com|placehold\.co|picsum\.photos|\bJohn Doe\b|\bJane Doe\b|\bAcme\b|foo@bar|test@test\.|\b555-\d{4}\b|Your Company|Tu empresa|Company Name/i, (f) => !TEST.test(f), 'filler content in production'],
  ['mock-in-production', 'high', /\b(mock|fake|dummy|sample)[A-Z]?\w*\s*[:=]\s*[\[{]|from\s+['"][^'"]*\/(mocks?|fixtures?|__mocks__)\/|@faker-js\/faker/i, f => !TEST.test(f) && !/(mocks?|fixtures?|stories)\//.test(f), 'fake data that may end up published'],
  ['any', 'medium', /:\s*any\b|\bas\s+any\b|<any>|\bany\[\]/, f => /\.tsx?$/.test(f), 'any disables typing: it usually hides an error'],
  ['ts-ignore', 'high', /@ts-ignore|@ts-nocheck|@ts-expect-error(?!\s+\S)/, null, 'silences the compiler without explaining why'],
  ['eslint-disable-global', 'medium', /eslint-disable(?!-next-line|-line)(?![^\n]*--)/, null, 'disables rules for the whole file without justification'],
  ['empty-catch', 'high', /catch\s*(\(\s*\w*\s*\))?\s*\{\s*\}|\.catch\(\s*\(\s*\w*\s*\)\s*=>\s*(null|undefined|\{\s*\}|\[\]|false|void 0)\s*\)/, null, 'swallows the error: the failure disappears without a trace'],
  ['catch-log-only', 'medium', /catch\s*\(\s*(\w+)\s*\)\s*\{\s*console\.(log|error)\([^)]*\);?\s*\}/, null, 'logs and carries on as if nothing happened'],
  ['console-log', 'low', /console\.(log|debug)\(/, f => !TEST.test(f) && !/scripts?\//.test(f), 'forgotten console.log'],
  ['literal-secret', 'critical', /sk_live_|sk_test_|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|NEXT_PUBLIC_\w*(SECRET|TOKEN|PRIVATE|PASSWORD)/, null, 'secret in the code or exposed to the client: details in qa-security'],
  ['trivial-test', 'high', /expect\((true|1|false)\)\.(toBe|toEqual)\(\1\)|\b(it|test|describe)\.(skip|only)\(/, f => TEST.test(f), 'test that tests nothing or that disables others'],
];
const counts = {}, emit = o => { counts[o.rule] = (counts[o.rule] || 0) + 1; process.stdout.write(JSON.stringify(o) + '\n'); };
for (const file of files) {
  let src; try { src = readFileSync(file, 'utf8'); } catch { continue; }
  const lines = src.split('\n');
  lines.forEach((line, i) => { for (const [rule, sev, re, cond, why] of R) {
    if (cond && !cond(file, src)) continue;
    const isComment = /^\s*(\/\/|\/?\*|\{\s*\/\*)/.test(line);
    if (isComment && !/comment|todo|ts-ignore|eslint|codemod/.test(rule)) continue;
    const m = line.match(re); if (m) emit({ rule, sev, file, line: i + 1, text: line.trim().slice(0, 140), why });
  } });
  // Blocks of commented-out code (3+ consecutive // lines that look like code)
  let run = 0; lines.forEach((l, i) => { const code = /^\s*\/\/\s*(import |export |const |let |return |if \(|<\/?[A-Za-z]|\}|[\w.]+\(.*\);?$|\w+\s*=)/.test(l);
    run = code ? run + 1 : 0; if (run === 3) emit({ rule: 'commented-out-code', sev: 'medium', file, line: i - 1, text: lines[i - 2].trim().slice(0, 100), why: 'dead commented-out code: that is what git is for' }); });
  // "use client" with nothing that needs it
  if (/^\s*['"]use client['"]/m.test(src) && !/\buse[A-Z]\w*\(|\bon[A-Z]\w*=\{|\bwindow\b|\bdocument\b|localStorage|sessionStorage|navigator\.|createContext|\buse\(/.test(src))
    emit({ rule: 'unnecessary-use-client', sev: 'medium', file, line: 1, text: "'use client'", why: 'no hooks, events or browser APIs: it can be a Server Component (details in qa-code-optimization)' });
  // params without await in pages/layouts/routes (Next 15+ they are a Promise)
  if (APP.test(file) && /(page|layout|route|default)\.[jt]sx?$/.test(file) && /\bparams\.\w+|searchParams\.\w+/.test(src) && !/await\s+(props\.)?(params|searchParams)|use\(\s*(props\.)?(params|searchParams)/.test(src))
    emit({ rule: 'params-without-await', sev: 'high', file, line: lines.findIndex(l => /params\.\w+/.test(l)) + 1, text: 'params.x', why: 'in Next 16 params and searchParams are a Promise: await params' });
  // Test without assertions
  if (TEST.test(file) && /\b(it|test)\(/.test(src) && !/expect\(|assert|toHave|toMatch|\.should/.test(src)) emit({ rule: 'test-without-assertions', sev: 'high', file, line: 1, text: '', why: 'the test always passes' });
}
// Project structure
for (const f of ['middleware.ts', 'middleware.js', 'src/middleware.ts', 'src/middleware.js']) if (existsSync(f)) emit({ rule: 'middleware-renamed', sev: 'medium', file: f, line: 1, text: f, why: 'Next 16 renames it to proxy.ts (keep middleware only if it needs the edge runtime)' });
if (hasPages && hasApp) emit({ rule: 'pages-and-app-mixed', sev: 'high', file: 'pages/ + app/', line: 0, text: '', why: 'two routers at once: duplicated layouts, data and metadata (valid only during a planned migration)' });
console.error(JSON.stringify({ files: files.length, byRule: counts }, null, 1));
