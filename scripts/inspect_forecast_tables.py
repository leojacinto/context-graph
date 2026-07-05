#!/usr/bin/env python3
"""Inspect tables in the x_snc_forecast_v_0 scope."""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import requests

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / '.env')

base = f"https://{os.environ['SN_INSTANCE']}.service-now.com"
auth = (os.environ['SN_USER'], os.environ['SN_PASSWORD'])


def get(path, params=None, timeout=30):
    url = f'{base}/api/now/table/{path}'
    r = requests.get(url, auth=auth, params=params, timeout=timeout)
    if r.status_code != 200:
        print(f'ERROR GET {path}: {r.status_code} {r.text[:200]}')
        return []
    return r.json().get('result', [])


# 1. Tables in the forecast scope
print('Tables in x_snc_forecast_v_0 scope:')
tables = get('sys_db_object', {'sysparm_query': 'nameSTARTSWITHx_snc_forecast_v_0', 'sysparm_limit': '100', 'sysparm_fields': 'name,label,extends_table'})
for t in tables:
    print(f"  {t['name']} - {t.get('label', '')} (extends: {t.get('extends_table', '')})")

# 2. Columns for each table
for t in tables:
    name = t['name']
    print(f"\n=== {name} ({t.get('label', '')}) ===")
    cols = get('sys_dictionary', {'sysparm_query': f'name={name}', 'sysparm_limit': '100', 'sysparm_fields': 'element,column_label,internal_type,reference'})
    for c in cols:
        itype = c.get('internal_type', {}).get('value', '') if isinstance(c.get('internal_type'), dict) else c.get('internal_type', '')
        ref = c.get('reference', '')
        ref_str = f' -> {ref}' if ref else ''
        print(f"  {c['element']} ({itype}{ref_str}) - {c.get('column_label', '')}")

    # Sample records
    records = get(name, {'sysparm_limit': '2'})
    if records:
        print('  Sample records:')
        for rec in records:
            short = {k: v for k, v in rec.items() if not k.startswith('sys_')}
            print(f'    {short}')
