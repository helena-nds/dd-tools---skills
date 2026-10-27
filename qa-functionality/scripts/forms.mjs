// forms.mjs: tests every form on a page without actually submitting anything (page.route intercepts POST/PUT/PATCH).
// Usage: node forms.mjs <url> [--mode=block|staging] [--delay=1500] [--data=data.json] [--out=forms.json]
//   block (default): no submission leaves the browser. A 500 error is simulated after --delay ms; if the submission is fetch/JSON, success too.
//   staging: the valid submission and the server-validation test reach the backend. Only localhost or hosts with staging/preview/test/dev.
//   data.json: { "email": "qa+form@your-domain.es", "nombre": "Prueba QA" } (by field name) to override the test data.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2), url = args[0];
const opt = Object.fromEntries(args.slice(1).map(a => { const [k, v = true] = a.slice(2).split('='); return [k, v]; }));
const MODE = opt.mode || 'block', DELAY = +(opt.delay || 1500), DATA = opt.data ? JSON.parse(readFileSync(opt.data, 'utf8')) : {};
if (MODE === 'staging' && !/^(localhost|127\.0\.0\.1)$|(^|[.-])(staging|stg|preview|test|dev)([.-]|$)/.test(new URL(url).hostname)) { console.error('Staging mode refused: the host looks like production.'); process.exit(2); }
const ANALYTICS = /google-analytics|googletagmanager|doubleclick|clarity\.ms|hotjar|facebook|_vercel\/(insights|speed)|plausible|matomo/;
const SUBMIT = 'button:not([type=button]):not([type=reset]), input[type=submit]';
const sleep = ms => new Promise(z => setTimeout(z, ms));
const browser = await chromium.launch(), report = { url, mode: MODE, forms: [] };

function sample(f) {                                           // valid test value by type/name; reserved domain example.com
  if (DATA[f.name] !== undefined) return DATA[f.name];
  const n = `${f.name} ${f.type} ${f.autocomplete}`.toLowerCase();
  if (/mail/.test(n)) return 'qa+formulario@example.com';
  if (/tel|phone|movil|telefono/.test(n)) return '+34 600 000 000';
  if (/url|web/.test(n)) return 'https://example.com';
  if (/cp|postal|zip/.test(n)) return '28001';
  if (f.type === 'number') return '1';
  if (f.type === 'date') return '2026-12-01';
  return f.tag === 'textarea' ? '[QA] Mensaje de prueba automática. Ignorar.' : 'Prueba QA';
}
async function fillValid(form, fields, except) {
  for (const f of fields) {
    if (!f.name || f.hidden || f.name === except) continue;
    const el = form.locator(`[name="${f.name}"]`).first();
    try {
      if (f.type === 'checkbox' || f.type === 'radio') { if (f.required || /privacidad|acepto|consent|rgpd|terms/i.test(f.name)) await el.check(); }
      else if (f.tag === 'select') await el.selectOption({ index: 1 }).catch(() => {});
      else await el.fill(String(sample(f)));
    } catch (e) { f.fillError = e.message.split('\n')[0]; }
  }
}
const state = form => form.evaluate(f => {
  if (!f.isConnected) return { formGone: true };
  const b = f.querySelector('button:not([type=button]):not([type=reset]), input[type=submit]');
  return { invalid: [...f.querySelectorAll(':invalid')].filter(e => e.name).map(e => `${e.name}: ${e.validationMessage}`),
    ariaInvalid: f.querySelectorAll('[aria-invalid=true]').length, alerts: [...document.querySelectorAll('[role=alert],[role=status],[aria-live]')].map(e => e.innerText.trim()).filter(Boolean),
    button: b ? { disabled: b.disabled, ariaBusy: b.getAttribute('aria-busy'), text: (b.innerText || b.value || '').trim() } : null };
}).catch(() => ({ formGone: true }));

// Opens the page with the interceptor, runs `act` and returns requests, form state and the text that appeared
async function trial(i, onPost, act, wait = 1200) {
  const ctx = await browser.newContext({ locale: 'es-ES', serviceWorkers: 'block' }), page = await ctx.newPage(), posts = [];
  await page.route('**/*', async route => {
    const q = route.request();
    if (!['POST', 'PUT', 'PATCH'].includes(q.method())) return route.continue();
    if (ANALYTICS.test(q.url())) return route.fulfill({ status: 204 });
    posts.push({ url: q.url(), serverAction: !!q.headers()['next-action'], contentType: q.headers()['content-type']?.split(';')[0], body: (q.postData() || '').slice(0, 300) });
    return onPost(route);
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  const form = page.locator('form').nth(i), text = () => page.locator('body').innerText(), before = await text();
  const extra = (await act({ page, form })) || {};
  await page.waitForTimeout(wait);
  const after = await text();
  const r = { requests: posts.length, serverAction: posts[0]?.serverAction, ...extra, ...(await state(form)),
    newText: after.split('\n').map(s => s.trim()).filter(s => s && !before.includes(s)), sample: posts[0] };
  await ctx.close(); return r;
}

const probe = await browser.newPage();
await probe.goto(url, { waitUntil: 'networkidle' });
const forms = await probe.evaluate(() => [...document.forms].map(f => {
  const fields = [...f.elements].filter(e => /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) && !/^(submit|button|reset|image)$/.test(e.type)).map(e => {
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return { tag: e.tagName.toLowerCase(), type: e.type, name: e.name, required: e.required, autocomplete: e.autocomplete,
      label: !!(e.labels?.length || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby')), placeholder: e.placeholder || undefined,
      checkedByDefault: e.type === 'checkbox' ? e.defaultChecked : undefined,
      hidden: e.type === 'hidden' || cs.display === 'none' || cs.visibility === 'hidden' || r.width < 2 || r.left < -1000 };
  });
  return { action: f.getAttribute('action'), method: f.method, noValidate: f.noValidate, fields, hasSubmitButton: !!f.querySelector('button:not([type=button]):not([type=reset]), input[type=submit]'),
    honeypot: fields.some(x => x.hidden && x.type !== 'hidden'),
    captcha: [...new Set((document.documentElement.innerHTML.match(/challenges\.cloudflare\.com\/turnstile|recaptcha|hcaptcha|friendlycaptcha|altcha/gi) || []).map(s => s.toLowerCase()))] };
}));
await probe.close();

for (const [i, info] of forms.entries()) {
  if (!info.hasSubmitButton) { report.forms.push({ index: i, ...info, tests: 'no submit button: test manually' }); console.log(`form[${i}] no submit button: skipped`); continue; }
  const p = {}, fail = route => route.fulfill({ status: 500, body: 'QA simulated error' });
  // A. Empty submission: browser or custom validation should stop it, with no request
  p.empty = await trial(i, fail, ({ form }) => form.locator(SUBMIT).first().click());
  // B. Invalid email with everything else correct
  const em = info.fields.find(f => /mail/i.test(`${f.name} ${f.type}`) && !f.hidden);
  if (em) p.invalidEmail = await trial(i, fail, async ({ form }) => {
    await fillValid(form, info.fields, em.name); await form.locator(`[name="${em.name}"]`).fill('esto-no-es-un-email'); await form.locator(SUBMIT).first().click(); });
  // C. Valid data + double click + slow response: loading state, double submission and final message
  p.validSubmit = await trial(i, async route => { await sleep(DELAY); return MODE === 'staging' ? route.continue() : fail(route); }, async ({ page, form }) => {
    await fillValid(form, info.fields);
    const b = await form.locator(SUBMIT).first().boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.mouse.click(x, y); await sleep(120); await page.mouse.click(x, y); await sleep(300);
    return { mode: MODE === 'staging' ? 'real (staging)' : 'simulated 500 error', during: await state(form) };
  }, DELAY + 1500);
  // D. Simulated success: only if the submission is fetch/JSON (a server action needs a real RSC response)
  if (MODE === 'block' && p.validSubmit.requests && !p.validSubmit.serverAction)
    p.simulatedSuccess = await trial(i, async route => { await sleep(500); return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"success":true}' }); },
      async ({ form }) => { await fillValid(form, info.fields); await form.locator(SUBMIT).first().click(); }, 2000);
  // E. Server validation (staging only): browser validation is removed and the form is submitted empty
  if (MODE === 'staging') p.serverWithEmptyData = await trial(i, route => route.continue(), async ({ page, form }) => {
    await form.evaluate(f => { f.noValidate = true; f.querySelectorAll('[required],[pattern]').forEach(e => { e.removeAttribute('required'); e.removeAttribute('pattern'); }); });
    const resp = page.waitForResponse(q => ['POST', 'PUT'].includes(q.request().method()) && !ANALYTICS.test(q.url()), { timeout: 10000 }).catch(() => null);
    await form.locator(SUBMIT).first().click();
    return { status: (await resp)?.status() ?? null };
  }, 1500);
  report.forms.push({ index: i, ...info, tests: p });
  console.log(`form[${i}] ${info.fields.length} fields · no label: ${info.fields.filter(f => !f.label && !f.hidden).length} · empty→requests: ${p.empty.requests} · invalid email→requests: ${p.invalidEmail?.requests ?? 'n/a'} · double click→${p.validSubmit.requests} submissions · button disabled during submission: ${p.validSubmit.during?.button?.disabled} · message after submission: ${JSON.stringify(p.validSubmit.newText.slice(0, 2))}${p.serverWithEmptyData ? ` · server with empty data: HTTP ${p.serverWithEmptyData.status}, message ${JSON.stringify(p.serverWithEmptyData.newText.slice(0, 2))}` : ''} · antispam: ${[info.honeypot && 'honeypot', ...info.captcha].filter(Boolean).join(',') || 'none'}`);
}
if (!forms.length) console.log('No <form> on the page (check whether the form is a div with onClick or a third-party iframe).');
writeFileSync(opt.out || 'forms.json', JSON.stringify(report, null, 1));
await browser.close();
