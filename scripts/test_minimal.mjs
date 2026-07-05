import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { request } from 'playwright';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const INSTANCE = process.env.SN_INSTANCE;
const USER = process.env.SN_USER;
const PASSWORD = process.env.SN_PASSWORD;
const URL = `https://${INSTANCE}.service-now.com/forecast-kg-portal?id=forecast_kg_page`;
const log = [];

const apiContext = await request.newContext();
await apiContext.get(`https://${INSTANCE}.service-now.com/login.do`, { timeout: 120000 });
await apiContext.post(`https://${INSTANCE}.service-now.com/login.do`, {
  form: { user_name: USER, user_password: PASSWORD, sys_action: 'sysverb_login' },
  timeout: 120000,
});
const cookies = await apiContext.storageState();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1920, height: 1080 },
  storageState: cookies,
});

context.on('page', page => {
  page.on('console', msg => log.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => log.push(`[PAGE ERROR] ${err.message}`));
});

const page = await context.newPage();
log.push('Opening: ' + URL);
await page.goto(URL, { timeout: 120000 });
await page.waitForTimeout(60000);

const globals = await page.evaluate(() => ({
  g_user_token: (window.g_user_token || ''),
  g_ck: (window.g_ck || ''),
  NOW_userToken: (window.NOW && window.NOW.userToken ? window.NOW.userToken : ''),
  userTokenMeta: document.querySelector('meta[name="glide_user_token"]')?.getAttribute('content') || '',
}));
log.push('Auth globals: ' + JSON.stringify(globals));

log.push('Page title: ' + await page.title());
log.push('Page URL: ' + page.url);

await page.waitForFunction(() => {
  const el = document.querySelector('#forecast-kg-root');
  return el !== null;
}, { timeout: 60000 }).catch(() => log.push('forecast-kg-root not found after waiting'));

const rootCount = await page.locator('#forecast-kg-root').count();
log.push('#forecast-kg-root count: ' + rootCount);

if (rootCount === 0) {
  const body = await page.locator('body').innerHTML();
  log.push('Contains forecast-kg-root: ' + body.includes('forecast-kg-root'));
  log.push('Contains forecast_kg_widget: ' + body.includes('forecast_kg_widget'));
  log.push('Body first 1000: ' + body.slice(0, 1000));
} else {
  const rootText = await page.locator('#forecast-kg-root').textContent();
  log.push('Query root text: ' + rootText.slice(0, 500));

  // Click Graph button
  const graphBtn = await page.locator('button', { hasText: 'Graph' }).first();
  if (await graphBtn.count() > 0) {
    await graphBtn.click();
    log.push('Clicked Graph button');
    await page.waitForTimeout(30000);
    const graphText = await page.locator('#forecast-kg-root').textContent();
    log.push('Graph root text: ' + graphText.slice(0, 500));
  }
}

await page.screenshot({ path: join(__dirname, '..', 'minimal_test.png') });
log.push('Screenshot saved to minimal_test.png');
fs.writeFileSync(join(__dirname, '..', 'test_output.log'), log.join('\n'));
console.log('Log saved to test_output.log');
await browser.close();
