#!/usr/bin/env python3
"""
Create a bridge table in the x_snc_forecast_v_0 scope that links mv_detail
records to the ERP cost center table (sn_erp_integration_cost_center).

This gives the Knowledge Graph a real reference edge to follow from mv_detail
to Cost Center without altering the existing materialized view table.

Prerequisites:
    pip install requests python-dotenv
"""
import os
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
import requests

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / '.env')

SN_INSTANCE = os.environ.get('SN_INSTANCE')
SN_USER = os.environ.get('SN_USER')
SN_PASSWORD = os.environ.get('SN_PASSWORD')
APP_SYS_ID = os.environ.get('SN_APP_SYS_ID')

if not all([SN_INSTANCE, SN_USER, SN_PASSWORD]):
    print('ERROR: SN_INSTANCE, SN_USER, and SN_PASSWORD must be set in .env')
    sys.exit(1)

if not APP_SYS_ID:
    print('WARNING: SN_APP_SYS_ID not set. Looking up x_snc_forecast_v_0 app...')

BASE_URL = f'https://{SN_INSTANCE}.service-now.com'
AUTH = (SN_USER, SN_PASSWORD)
HEADERS = {'Accept': 'application/json', 'Content-Type': 'application/json'}

APP_SCOPE = 'x_snc_forecast_v_0'
TABLE_NAME = 'x_snc_forecast_v_0_df_cost_center_bridge'
TABLE_LABEL = 'Cost Center Bridge'


def resolve_app_sys_id():
    """Look up the app sys_id if not provided in .env."""
    global APP_SYS_ID
    if APP_SYS_ID:
        return APP_SYS_ID
    apps = get('sys_app', {'sysparm_query': 'scope=x_snc_forecast_v_0', 'sysparm_fields': 'sys_id', 'sysparm_limit': '1'})
    if apps:
        APP_SYS_ID = apps[0]['sys_id']
        print(f'Found app sys_id: {APP_SYS_ID}')
        return APP_SYS_ID
    print('ERROR: Could not resolve app sys_id. Set SN_APP_SYS_ID in .env')
    sys.exit(1)



def get(path, params=None, timeout=30):
    url = f'{BASE_URL}/api/now/table/{path}'
    r = requests.get(url, auth=AUTH, params=params, timeout=timeout)
    if r.status_code != 200:
        print(f'ERROR GET {path}: {r.status_code} {r.text[:200]}')
        return []
    return r.json().get('result', [])


def post(path, data, timeout=30):
    url = f'{BASE_URL}/api/now/table/{path}'
    r = requests.post(url, auth=AUTH, headers=HEADERS, json=data, timeout=timeout)
    if r.status_code not in (200, 201):
        print(f'ERROR POST {path}: {r.status_code} {r.text[:500]}')
        return None
    return r.json().get('result', {})


def create_table():
    """Create the bridge table in the forecast variance scope."""
    existing = get('sys_db_object', {'sysparm_query': f'name={TABLE_NAME}', 'sysparm_fields': 'sys_id'})
    if existing:
        print(f'Table {TABLE_NAME} already exists: {existing[0]["sys_id"]}')
        return existing[0]['sys_id']

    data = {
        'name': TABLE_NAME,
        'label': TABLE_LABEL,
        'sys_scope': resolve_app_sys_id(),
        'sys_package': resolve_app_sys_id(),
        'create_access_controls': 'false',
        'is_extendable': 'false'
    }
    result = post('sys_db_object', data)
    if not result:
        return None
    sys_id = result.get('sys_id')
    print(f'Created table {TABLE_NAME}: {sys_id}')
    return sys_id


def add_column(table_name, table_sys_id, element, label, internal_type, reference=None, max_length=None, mandatory=False):
    """Add a column to the bridge table."""
    existing = get('sys_dictionary', {
        'sysparm_query': f'name={table_name}^element={element}',
        'sysparm_fields': 'sys_id'
    })
    if existing:
        print(f'  Column {element} already exists')
        return existing[0]['sys_id']

    data = {
        'name': table_name,
        'element': element,
        'column_label': label,
        'internal_type': internal_type,
        'sys_scope': resolve_app_sys_id(),
        'sys_package': resolve_app_sys_id(),
        'reference': reference,
        'max_length': max_length,
        'mandatory': mandatory,
        'array': 'false',
        'read_only': 'false'
    }
    # Remove None values
    data = {k: v for k, v in data.items() if v is not None}
    result = post('sys_dictionary', data)
    if result:
        print(f'  Created column {element}: {result.get("sys_id")}')
    return result.get('sys_id') if result else None


def add_columns(table_name, table_sys_id):
    """Add the columns that create the bridge relationships."""
    print('Adding columns...')
    add_column(table_name, table_sys_id, 'mv_detail', 'MV Detail', 'reference', reference='x_snc_forecast_v_0_df_mv_detail', max_length=32, mandatory=True)
    add_column(table_name, table_sys_id, 'cost_center', 'Cost Center', 'reference', reference='sn_erp_integration_cost_center', max_length=32, mandatory=True)
    add_column(table_name, table_sys_id, 'cost_center_code', 'Cost Center Code', 'string', max_length=40)
    add_column(table_name, table_sys_id, 'budget_owner', 'Budget Owner', 'reference', reference='sys_user', max_length=32)
    add_column(table_name, table_sys_id, 'fiscal_year', 'Fiscal Year', 'integer', max_length=40)
    add_column(table_name, table_sys_id, 'fiscal_month', 'Fiscal Month', 'integer', max_length=40)
    add_column(table_name, table_sys_id, 'variance', 'Variance', 'decimal', max_length=15)
    add_column(table_name, table_sys_id, 'variance_percent', 'Variance Percent', 'decimal', max_length=15)
    add_column(table_name, table_sys_id, 'service_category', 'Service Category', 'string', max_length=100)


def populate_bridge(table_name):
    """Populate bridge records by joining mv_detail cost_center strings to ERP cost centers."""
    print('Populating bridge records...')
    # Get all ERP cost centers keyed by u_cost_center code
    erp = get('sn_erp_integration_cost_center', {'sysparm_limit': '1000', 'sysparm_fields': 'sys_id,u_cost_center,u_owner'})
    cost_center_map = {}
    for row in erp:
        code = row.get('u_cost_center', '').strip()
        if code:
            cost_center_map[code] = row.get('sys_id')

    print(f'  Loaded {len(cost_center_map)} ERP cost centers')

    # Get mv_detail records with cost_center populated
    mv = get('x_snc_forecast_v_0_df_mv_detail', {
        'sysparm_query': 'u_cost_centerISNOTEMPTY',
        'sysparm_limit': '1000',
        'sysparm_fields': 'sys_id,u_cost_center,u_budget_owner_name,u_fiscal_year,u_fiscal_month,u_variance,u_variance_pct,u_service_category'
    })
    print(f'  Loaded {len(mv)} mv_detail records with cost center')

    # Get existing bridge records so we can skip duplicates
    existing = get(table_name, {'sysparm_limit': '1000', 'sysparm_fields': 'mv_detail'})
    existing_mv_ids = {row.get('mv_detail', {}).get('value', row.get('mv_detail')) for row in existing}
    print(f'  {len(existing_mv_ids)} bridge records already exist')

    records_to_create = []
    for row in mv:
        mv_id = row.get('sys_id')
        if mv_id in existing_mv_ids:
            continue
        code = row.get('u_cost_center', '').strip()
        cc_sys_id = cost_center_map.get(code)
        if not cc_sys_id:
            print(f'  Warning: no ERP cost center for code {code}')
            continue

        data = {
            'mv_detail': mv_id,
            'cost_center': cc_sys_id,
            'cost_center_code': code,
            'fiscal_year': row.get('u_fiscal_year'),
            'fiscal_month': row.get('u_fiscal_month'),
            'variance': row.get('u_variance'),
            'variance_percent': row.get('u_variance_pct'),
            'service_category': row.get('u_service_category')
        }
        data = {k: v for k, v in data.items() if v is not None and v != ''}
        records_to_create.append(data)

    print(f'  Creating {len(records_to_create)} bridge records...')
    created = 0
    failed = 0

    def create_one(data):
        return post(table_name, data)

    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_data = {executor.submit(create_one, d): d for d in records_to_create}
        for future in as_completed(future_to_data):
            if future.result():
                created += 1
            else:
                failed += 1

    print(f'Created {created} bridge records, failed {failed}')


def main():
    print(f'Creating bridge table {TABLE_NAME} in scope {APP_SCOPE}...')
    resolve_app_sys_id()
    table_sys_id = create_table()
    if not table_sys_id:
        print('ERROR: Failed to create table')
        sys.exit(1)

    add_columns(TABLE_NAME, table_sys_id)
    populate_bridge(TABLE_NAME)
    print(f'\nDone. You can open the table at: {BASE_URL}/{TABLE_NAME}_list.do')
    print('Refresh the Knowledge Graph to see if the new reference edges appear.')


if __name__ == '__main__':
    main()
