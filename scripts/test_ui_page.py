#!/usr/bin/env python3
"""Open the Forecast KG UI page in Playwright and capture console logs/screenshot."""
import os
import asyncio
import requests
from pathlib import Path
from dotenv import load_dotenv
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / '.env')

INSTANCE = os.environ.get('SN_INSTANCE')
USER = os.environ.get('SN_USER')
PASSWORD = os.environ.get('SN_PASSWORD')
URL = f'https://{INSTANCE}.service-now.com/forecast-kg-portal?id=forecast_kg_page'

def get_session_cookies():
    """Establish a ServiceNow session via requests and return cookies."""
    session = requests.Session()
    base = f'https://{INSTANCE}.service-now.com'
    session.get(f'{base}/login.do', timeout=60)
    session.post(
        f'{base}/login.do',
        data={'user_name': USER, 'user_password': PASSWORD, 'sys_action': 'sysverb_login'},
        timeout=60,
    )
    return session.cookies.get_dict()

async def main():
    cookies = get_session_cookies()
    print('Session cookies:', list(cookies.keys()))

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        await context.add_cookies([
            {'name': k, 'value': v, 'domain': f'{INSTANCE}.service-now.com', 'path': '/'}
            for k, v in cookies.items()
        ])
        page = await context.new_page()

        logs = []
        page.on('console', lambda msg: logs.append(f'{msg.type}: {msg.text}'))
        page.on('pageerror', lambda err: logs.append(f'PAGE ERROR: {err}'))

        # Open the UI page directly
        print('Opening UI page...')
        await page.goto(URL, timeout=120000)
        await page.wait_for_timeout(30000)

        screenshot = await page.screenshot(full_page=True)
        with open(ROOT / 'ui_page_test.png', 'wb') as f:
            f.write(screenshot)

        print('Console logs:')
        for log in logs:
            print(log)

        print('\nPage title:', await page.title())
        print('Page URL:', page.url)
        print('Has #root:', await page.locator('#root').count())
        root_html = await page.locator('#root').inner_html()
        print('Root innerHTML:', root_html[:200])

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
