import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from '../.agent-cache/qa/node_modules/playwright/index.mjs';

const root = resolve('.');
const server = createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    if (!extname(name)) name = name.endsWith('/') ? name + 'index.html' : name + '.html';
    const file = resolve(root, '.' + name);
    if (!file.startsWith(root + '\\') || !['.html', '.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico'].includes(extname(file))) {
      res.writeHead(404).end(); return;
    }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' })[extname(file)]);
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const pages = [
  'index.html', 'about.html', 'campaigns.html', 'campaign-eco.html', 'campaign-education.html',
  'campaign-hunger.html', 'campaign-medical.html', 'campaign-nutrition.html', 'campaign-relief.html',
  'campaign-water.html', 'campaign-women.html', 'contact.html', 'how.html', 'resources.html',
  'privacy-policy.html', 'terms-and-conditions.html', 'refund-policy.html', 'request-help.html'
];

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('https://**/*', route => route.abort());
  for (const path of pages) {
    await page.goto(`${origin}/${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(60);
    const state = await page.evaluate(() => {
      const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const labels = Array.from(document.querySelectorAll('button,a,h1,h2,h3,h4,h5,h6')).map(el => el.textContent.trim());
      return {
        path: location.pathname,
        donationActions: Array.from(document.querySelectorAll('button,a')).filter(el => visible(el) && /donate now|donate to this fund/i.test(el.textContent)),
        requestHelpActions: Array.from(document.querySelectorAll('button,a')).filter(el => visible(el) && /^request help$/i.test(el.textContent.trim())),
        prominentRequestHelp: Array.from(document.querySelectorAll('.site-nav .start-btn')).filter(el => visible(el) && /request help/i.test(el.textContent)),
        howLinks: Array.from(document.querySelectorAll('a[href],button[onclick]')).filter(el => /how\.html/i.test((el.getAttribute('href') || '') + ' ' + (el.getAttribute('onclick') || ''))),
        refundLinks: Array.from(document.querySelectorAll('a[href],button[onclick]')).filter(el => /refund-policy\.html/i.test((el.getAttribute('href') || '') + ' ' + (el.getAttribute('onclick') || ''))),
        footerRefundLabels: Array.from(document.querySelectorAll('footer, .footer, .footer-bottom')).filter(el => /refund\s*(?:\/|and)?\s*cancellation\s*policy|refund policy/i.test(el.textContent)),
        learnColumns: Array.from(document.querySelectorAll('.footer-col')).filter(el => /^learn$/i.test(el.querySelector('h4')?.textContent.trim() || '')),
        adminPortalLinks: Array.from(document.querySelectorAll('footer a,footer button')).filter(el => /^admin portal$/i.test(el.textContent.trim())),
        oldResourceLabels: labels.filter(label => /^resources$/i.test(label)),
        donationModal: !!document.querySelector('#donationModal'),
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth
      };
    });
    assert.deepEqual(state.donationActions, [], `${path}: public donation CTA remains visible`);
    assert.ok(state.requestHelpActions.length > 0, `${path}: Request Help action is missing`);
    if (path !== 'request-help.html') assert.ok(state.prominentRequestHelp.length > 0, `${path}: prominent Request Help navigation CTA is missing`);
    assert.deepEqual(state.howLinks, [], `${path}: public How It Works link remains`);
    assert.deepEqual(state.refundLinks, [], `${path}: public refund-policy link remains`);
    assert.deepEqual(state.footerRefundLabels, [], `${path}: refund policy label remains in the footer`);
    assert.deepEqual(state.learnColumns, [], `${path}: Learn footer column remains`);
    assert.deepEqual(state.adminPortalLinks, [], `${path}: public footer Admin Portal link remains`);
    assert.deepEqual(state.oldResourceLabels, [], `${path}: old Resources UI label remains`);
    assert.equal(state.donationModal, false, `${path}: donation modal remains in the active DOM`);
  }

  await page.goto(`${origin}/donate.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**/campaigns.html');
  await page.goto(`${origin}/donation-details.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**/campaigns.html');

  await page.goto(`${origin}/contact.html`);
  assert.ok(await page.locator('.site-nav .start-btn').filter({ hasText: 'Request Help' }).count(), 'contact page should retain the prominent Request Help CTA');
  await page.locator('.site-nav .start-btn').filter({ hasText: 'Request Help' }).click();
  await page.waitForURL('**/request-help.html');
  await page.goto(`${origin}/contact.html`);
  assert.equal(await page.locator('#contactForm').count(), 1);
  assert.equal(await page.locator('#contact_mobile').getAttribute('type'), 'tel');
  await page.getByRole('link', { name: 'aruna@swanturbinesfoundation.com' }).waitFor();
  await page.getByText('Plot No. 28 & 29, CBCID Officers Colony, Lane-5, Hydernagar, Kukatpally, Hyderabad - 500085, Telangana, India.', { exact: true }).waitFor();
  await page.getByText('Monday–Saturday, 10:00 AM–6:00 PM', { exact: true }).waitFor();
  await page.route('https://qlfdbimnswbaiouvmtau.supabase.co/functions/v1/api/api/v1/contact', route => route.request().method() === 'OPTIONS'
    ? route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' } })
    : route.fulfill({ status: 201, headers: { 'access-control-allow-origin': '*' }, json: { submission_id: 'disposable-contact-test' } }));
  await page.locator('#contact_full_name').fill('Disposable Contact QA');
  await page.locator('#contact_mobile').fill('9876543210');
  await page.locator('#contact_email').fill('qa@example.com');
  await page.locator('#contact_message').fill('This is a disposable local form functionality test.');
  await page.getByRole('button', { name: /send message/i }).click();
  await page.waitForURL('**/contact-thank-you.html?submission=disposable-contact-test');

  await page.goto(`${origin}/index.html`);
  assert.equal(await page.locator('.donation-card').count(), 0, 'homepage hero raised-funds box must remain reversibly disabled');
  assert.equal(await page.locator('.hero-right').count(), 1, 'other homepage hero content is preserved');
  const loaderSize = await page.locator('.loader-logo').evaluate(el => ({ size: getComputedStyle(el).width, ringAnimation: getComputedStyle(el.querySelector('.loader-brand-ring')).animationName }));
  assert.equal(loaderSize.size, '236px', 'mobile logo loader should scale to approximately twice its previous size');
  assert.equal(loaderSize.ringAnimation, 'loader-brand-ring-spin', 'logo ring animation remains enabled');
  assert.ok(await page.locator('.site-nav .start-btn').filter({ hasText: 'Request Help' }).count(), 'homepage should retain the prominent Request Help CTA');
  await page.setViewportSize({ width: 1366, height: 900 });
  assert.equal(await page.locator('.loader-logo').evaluate(el => getComputedStyle(el).width), '276px');

  await page.goto(`${origin}/contact.html`);
  for (const width of [320, 375, 390, 430, 600, 712, 768, 884, 1024, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const sizing = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, overflow: Array.from(document.querySelectorAll('body *')).filter(el => el.getBoundingClientRect().right > innerWidth + 2 && getComputedStyle(el).position !== 'fixed').slice(0, 8).map(el => ({ tag: el.tagName, className: String(el.className || ''), id: el.id, right: Math.round(el.getBoundingClientRect().right) })) }));
    assert.ok(sizing.scrollWidth <= width + 1, `contact page horizontal overflow at ${width}px: ${JSON.stringify(sizing.overflow)}`);
  }

  await page.goto(`${origin}/privacy-policy.html`);
  await page.getByText('Effective Date: November 1, 2026', { exact: true }).waitFor();
  await page.goto(`${origin}/terms-and-conditions.html`);
  await page.getByText('Effective Date: November 1, 2026', { exact: true }).waitFor();

  const admin = await browser.newPage({ viewport: { width: 320, height: 700 } });
  const token = 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.signature';
  await admin.addInitScript(({ token }) => {
    localStorage.setItem('swan_admin_token', token);
    localStorage.setItem('swan_auth_session_v2', JSON.stringify({ user_id: 'qa', user: { id: 'qa', email: 'qa-administrator-with-a-deliberately-long-address@example.foundation', full_name: 'QA Administrator', role: 'admin' }, expires_at: new Date(Date.now() + 3600000).toISOString() }));
  }, { token });
  await admin.route('**/functions/v1/api/api/v1/auth/me', route => route.fulfill({ json: { id: 'qa', email: 'qa-administrator-with-a-deliberately-long-address@example.foundation', full_name: 'QA Administrator', is_active: true, role_names: ['foundation_admin'] } }));
  await admin.route('**/functions/v1/api/api/v1/**', route => route.fulfill({ status: 404, json: { error: { message: 'Not needed in profile layout test.' } } }));
  await admin.goto(`${origin}/admin-profile.html`);
  await admin.locator('.adm-profile-container').waitFor();
  for (const width of [320, 375, 390, 430, 600, 712, 768, 884, 1024, 1366, 1920]) {
    await admin.setViewportSize({ width, height: 900 });
    const sizing = await admin.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, profile: document.querySelector('.adm-profile-container').getBoundingClientRect().width, email: document.querySelector('#profileEmailRow').getBoundingClientRect().width }));
    assert.ok(sizing.scrollWidth <= width + 1, `admin profile horizontal overflow at ${width}px: ${sizing.scrollWidth}`);
    assert.ok(sizing.profile <= width + 1 && sizing.email <= width + 1, `admin profile content clipped at ${width}px`);
  }
  await admin.setViewportSize({ width: 320, height: 700 });
  await admin.locator('.adm-mobile-menu-toggle').click();
  assert.equal(await admin.locator('.adm-sidebar').evaluate(el => el.classList.contains('open')), true);
  await admin.close();

  console.log('PASS public CTAs/navigation/footer cleanup, contact form/details, policy dates, disabled donation routes, reversible hero stats, logo animation and responsive widths');
} finally {
  await browser.close();
  server.close();
}
