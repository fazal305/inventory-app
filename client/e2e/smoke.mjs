// Browser smoke test for the built app.
//   1. Build the client, start `php -S 127.0.0.1:8080 -t server/public server/router.php`.
//   2. Create the account it signs in with: STAFF_PASSWORD=demo-pass-2026 php server/bin/create-staff.php demo
//      and seed the sample data: php server/bin/seed-sample-assets.php
//   3. npm run test:e2e   (set CHROMIUM_PATH to use a specific browser binary)
// It adds and then deletes its own test assets; run it against a development database only.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://127.0.0.1:8080';
const SHOTS = process.env.SHOTS ?? 'e2e/screenshots';
const USERNAME = process.env.E2E_USERNAME ?? 'demo';
const PASSWORD = process.env.E2E_PASSWORD ?? 'demo-pass-2026';
mkdirSync(SHOTS, { recursive: true });
const results = [];
const check = (name, ok, extra) => {
  results.push({ name, ok });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${!ok && extra !== undefined ? ' :: ' + JSON.stringify(extra) : ''}`);
};

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(String(e)));
let dialogFired = false;
page.on('dialog', async (d) => {
  dialogFired = true;
  await d.dismiss();
});

const rowCount = () => page.locator('.asset-table:not(.asset-table--skeleton) tbody tr').count();
const overflow = () =>
  page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth);

// Route guard
await page.goto(BASE + '/');
await page.waitForURL('**/login');
check('logged-out visit to / redirects to /login', page.url().endsWith('/login'));
await page.waitForFunction(() => document.title === 'Sign in · Asset Register', null, { timeout: 3000 }).catch(() => {});
check('login page title', (await page.title()) === 'Sign in · Asset Register', await page.title());
check('username field is focused on first visit', await page.evaluate(() => document.activeElement?.name === 'username'));
await page.screenshot({ path: `${SHOTS}/login.png` });

// Inline validation
await page.locator('form.login__form').evaluate((f) => f.requestSubmit());
check('empty submit shows both field errors', (await page.locator('.field__error').count()) === 2);
check('first invalid field gets focus', await page.evaluate(() => document.activeElement?.name === 'username'));
await page.fill('input[name=username]', 'x');
check('typing clears that field error', (await page.locator('.field__error').count()) === 1);

// Wrong password
await page.fill('input[name=username]', USERNAME);
await page.fill('input[name=password]', 'wrong-password');
await page.click('button[type=submit]');
await page.locator('.alert--error').waitFor();
check('wrong password shows error alert', (await page.locator('.alert--error').innerText()).includes('incorrect'));
check('password cleared after failure', (await page.inputValue('input[name=password]')) === '');

// Show/hide password
await page.fill('input[name=password]', PASSWORD);
await page.click('.password-toggle');
check('show password toggles input type', (await page.getAttribute('input[name=password]', 'type')) === 'text');
await page.click('.password-toggle');

// Successful login with remember me
await page.check('.checkbox input');
await page.click('button[type=submit]');
await page.waitForURL(BASE + '/');
await page.locator('.asset-table:not(.asset-table--skeleton) tbody tr').first().waitFor();
check('login lands on dashboard', (await page.title()) === 'Dashboard · Asset Register');
const initialRows = await rowCount();
check('dashboard shows seeded assets', initialRows >= 8, initialRows);
check('header shows username', (await page.locator('.app-header__who').innerText()).includes(USERNAME));
check('remembered username stored', (await page.evaluate(() => localStorage.getItem('staff-assets:remembered-username'))) === USERNAME);

// Add asset - validation then success
await page.fill('input[name=item_name]', 'Test Scanner');
await page.fill('input[name=category]', 'Scanner');
await page.fill('input[name=room_number]', 'Room@1');
await page.locator('form.add-form').evaluate((f) => f.requestSubmit());
check('invalid room shows inline error', (await page.locator('.add-form .field__error').innerText()).includes('Room number may use'));
await page.fill('input[name=room_number]', 'D-12');
await page.locator('form.add-form').evaluate((f) => f.requestSubmit());
await page.locator('.toast').first().waitFor();
check('add shows success toast', (await page.locator('.toast').first().innerText()).includes('Added “Test Scanner”'));
check('add appends row', (await rowCount()) === initialRows + 1);
check('add form resets', (await page.inputValue('input[name=item_name]')) === '');
check('new row is highlighted', (await page.locator('tr.is-highlighted').count()) === 1);

// XSS
await page.fill('input[name=item_name]', '<img src=x onerror=alert(1)>');
await page.fill('input[name=category]', 'Test');
await page.fill('input[name=room_number]', 'X1');
await page.locator('form.add-form').evaluate((f) => f.requestSubmit());
await page.locator('tbody th', { hasText: '<img src=x onerror=alert(1)>' }).waitFor();
check('HTML in names renders as literal text', (await page.locator('tbody img').count()) === 0 && !dialogFired);

// Search & filters
await page.fill('#asset-search', 'scanner');
await page.waitForTimeout(300);
check('search narrows the list', (await rowCount()) === 1, await rowCount());
await page.fill('#asset-search', 'zzzz-nothing');
await page.waitForTimeout(300);
check('no-results state shows', await page.locator('text=No assets match these filters').isVisible());
await page.click('text=Clear filters');
await page.waitForTimeout(300);
check('clear filters restores list', (await rowCount()) === initialRows + 2);
await page.selectOption('#filter-category', 'Laptop');
check('category filter works', (await rowCount()) === 2, await rowCount());
await page.selectOption('#filter-category', '');

// Sorting
await page.click('th.col-item_name .sort-button');
const firstName = await page.locator('tbody th').first().innerText();
check('sorting by item updates aria-sort', (await page.getAttribute('th.col-item_name', 'aria-sort')) === 'ascending', firstName);

// Move
await page.click('th.col-id .sort-button'); // asc
await page.click('th.col-id .sort-button'); // desc
const target = page.locator('tbody tr', { hasText: 'Test Scanner' });
await target.getByRole('button', { name: /^Move/ }).click();
await page.locator('dialog[open]').waitFor();
check('move dialog opens with room input focused', await page.evaluate(() => document.activeElement?.name === 'room_number'));
await page.screenshot({ path: `${SHOTS}/move-dialog.png` });
await page.locator('dialog form').evaluate((f) => f.requestSubmit());
check('same-room move is rejected inline', (await page.locator('dialog .field__error').innerText()).includes('already in that room'));
await page.fill('dialog input[name=room_number]', 'E-07');
await page.locator('dialog form').evaluate((f) => f.requestSubmit());
await page.locator('dialog[open]').waitFor({ state: 'detached' });
check('move updates the row', (await target.locator('.col-room_number').innerText()) === 'E-07');
check('focus returns to Move button', await page.evaluate(() => document.activeElement?.textContent === 'Move'));

// Escape closes dialog
await target.getByRole('button', { name: /^Delete/ }).click();
await page.locator('dialog[open]').waitFor();
check('delete dialog focuses the safe option', await page.evaluate(() => document.activeElement?.textContent === 'Keep asset'));
await page.keyboard.press('Escape');
await page.locator('dialog[open]').waitFor({ state: 'detached' });
check('Escape cancels delete', (await target.count()) === 1);

// Delete both test rows
for (const name of ['Test Scanner', '<img src=x onerror=alert(1)>']) {
  await page.locator('tbody tr', { hasText: name }).getByRole('button', { name: /^Delete/ }).click();
  await page.click('dialog >> text=Delete permanently');
  await page.locator('dialog[open]').waitFor({ state: 'detached' });
}
check('delete removes rows', (await rowCount()) === initialRows);

// 375px overflow on dashboard (with and without dialog)
await page.setViewportSize({ width: 375, height: 800 });
await page.waitForTimeout(200);
check('no horizontal overflow at 375px: dashboard', await overflow());
await page.screenshot({ path: `${SHOTS}/dashboard-mobile.png`, fullPage: true });
await page.locator('tbody tr').first().getByRole('button', { name: /^Move/ }).click();
await page.locator('dialog[open]').waitFor();
check('no horizontal overflow at 375px: dialog open', await overflow());
await page.keyboard.press('Escape');
await page.setViewportSize({ width: 1280, height: 860 });

// Error state + retry
await page.route('**/api/assets.php', (r) =>
  r.request().method() === 'GET'
    ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":{"code":"SERVER_ERROR","message":"Something went wrong on our side. Please try again."}}' })
    : r.continue(),
);
await page.reload();
await page.locator('text=The inventory couldn\'t be loaded').waitFor();
check('load error shows message + retry', await page.locator('.alert--error').getByRole('button', { name: 'Try again' }).isVisible());
await page.unroute('**/api/assets.php');
await page.getByRole('button', { name: 'Try again' }).click();
await page.locator('.asset-table:not(.asset-table--skeleton) tbody tr').first().waitFor();
check('retry recovers', (await rowCount()) === initialRows);

// Empty state
await page.route('**/api/assets.php', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' }));
await page.reload();
await page.locator('text=The register is empty').waitFor();
check('empty state shows', true);
await page.screenshot({ path: `${SHOTS}/empty.png` });
await page.unroute('**/api/assets.php');

// Slow network
await page.route('**/api/assets.php', async (r) => {
  await new Promise((res) => setTimeout(res, 4500));
  await r.continue();
});
await page.reload();
await page.locator('.skeleton').first().waitFor();
check('skeleton shows while loading', true);
await page.locator('text=Still loading').waitFor({ timeout: 5000 });
check('slow-network hint appears after 3s', true);
await page.locator('.asset-table:not(.asset-table--skeleton)').waitFor();
await page.unroute('**/api/assets.php');

// Offline
await context.setOffline(true);
await page.locator('.offline-banner').waitFor();
check('offline banner appears', true);
await page.fill('input[name=item_name]', 'Offline test');
await page.fill('input[name=category]', 'Test');
await page.fill('input[name=room_number]', 'A1');
await page.locator('form.add-form').evaluate((f) => f.requestSubmit());
await page.locator('.add-form .alert--error').waitFor();
check('offline submit explains the problem', (await page.locator('.add-form .alert--error').innerText()).includes('offline'));
await context.setOffline(false);
await page.locator('.offline-banner').waitFor({ state: 'detached' });
check('offline banner clears on reconnect', true);
await page.fill('input[name=item_name]', '');

// Session expired mid-use
await page.route('**/api/assets.php', (r) =>
  r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":{"code":"SESSION_EXPIRED","message":"Your session expired. Please sign in again."}}' }),
);
await page.reload();
await page.waitForURL('**/login');
await page.locator('text=Your session expired').waitFor();
check('expired session redirects with explanation', true);
await page.unroute('**/api/assets.php');
await page.goto(BASE + '/');
await page.waitForURL(BASE + '/');

// Logout + remembered username
await page.click('text=Sign out');
await page.waitForURL('**/login');
check('logout returns to login', true);
check('remember me pre-fills username', (await page.inputValue('input[name=username]')) === USERNAME);
check('password field focused when username remembered', await page.evaluate(() => document.activeElement?.name === 'password'));
await page.goto(BASE + '/');
await page.waitForURL('**/login');
check('after logout, / is guarded again', true);

// Other pages + overflow
await page.setViewportSize({ width: 375, height: 800 });
for (const path of ['/login', '/privacy', '/no-such-page']) {
  await page.goto(BASE + path);
  await page.waitForTimeout(300);
  check(`no horizontal overflow at 375px: ${path}`, await overflow());
}
check('404 page renders', await page.locator('text=This page isn\'t in the register').isVisible());
const robots = await (await page.request.get(BASE + '/robots.txt')).text();
check('robots.txt served as file, not SPA', robots.includes('Disallow: /'));
const missing = await page.request.get(BASE + '/missing.png');
check('missing static file is a real 404', missing.status() === 404);

check('no console errors', consoleErrors.filter((e) => !/401|500|Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(e)).length === 0, consoleErrors);

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
