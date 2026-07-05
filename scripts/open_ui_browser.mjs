import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { request } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const INSTANCE = process.env.SN_INSTANCE;
const USER = process.env.SN_USER;
const PASSWORD = process.env.SN_PASSWORD;
const URL = `https://${INSTANCE}.service-now.com/forecast-kg-portal?id=forecast_kg_page`;

// Establish a session via API context
const apiContext = await request.newContext();
await apiContext.get(`https://${INSTANCE}.service-now.com/login.do`, { timeout: 120000 });
await apiContext.post(`https://${INSTANCE}.service-now.com/login.do`, {
  form: { user_name: USER, user_password: PASSWORD, sys_action: 'sysverb_login' },
  timeout: 120000,
});
const cookies = await apiContext.storageState();

// Open a visible browser with the same cookies
const browser = await chromium.launch({ headless: false, slowMo: 100 });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1920, height: 1080 },
  storageState: cookies,
});

context.on('page', page => {
  page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));
});

const page = await context.newPage();
console.log('Opening UI page:', URL);
await page.goto(URL, { timeout: 120000 });

console.log('Browser is open. Press Ctrl+C in this terminal to close.');
await new Promise(() => {});
