#!/usr/bin/env python3
"""Add ServiceNow SDK auth credentials without shell expansion issues."""
import os
import subprocess
import sys
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / '.env')

instance = os.environ.get('SN_INSTANCE')
user = os.environ.get('SN_USER')
password = os.environ.get('SN_PASSWORD')

if not all([instance, user, password]):
    print('ERROR: SN_INSTANCE, SN_USER, and SN_PASSWORD must be set in .env')
    sys.exit(1)

cmd = [
    'npx', '@servicenow/sdk', 'auth', '--add',
    f'https://{instance}.service-now.com',
    '--type', 'basic',
    '--alias', 'forecast-kg',
    '--username', user,
    '--password-stdin',
]

print(f'Adding auth for {instance} as user {user}...')
proc = subprocess.run(cmd, input=password, text=True, cwd=ROOT)
sys.exit(proc.returncode)
