# Zero Copy Connector (ZCC) — Postgres

This document describes the manual ServiceNow UI steps to configure a Zero Copy Connector (ZCC) for a Postgres database (e.g. Neon) and expose it through Workflow Data Fabric. The connection itself was created manually in the ServiceNow UI; the steps below are recorded so the setup can be reproduced from scratch.

## Goal

- Create a `sys_df_connection_data` record that points to a Postgres database.
- Test the connection from the Data Fabric Hub.
- (Optional) Make the connection available to the Knowledge Graph / Workflow Data Fabric discovery layer.

## Prerequisites

- Postgres database reachable from your ServiceNow instance (or from a MID Server if using on-prem). Neon is a public Postgres host that works without a MID Server.
- ServiceNow credentials with access to the Workflow Data Fabric / Data Management Hub.

## Step 1: Create the connection record

1. In ServiceNow, navigate to **System Web Services > Outbound > Data Sources** or search for `sys_df_connection_data`.
2. Open the table `sys_df_connection_data` via a list view or use the filter navigator directly: `https://<instance>.service-now.com/sys_df_connection_data_list.do`
3. Click **New**.
4. Fill in the form:
   - **Name**: `Forecast Postgres ZCC` (or your preferred name)
   - **Type**: `Database` / `Postgres`
   - **Host**: your Postgres host (e.g. `ep-aged-river-a8gbh9xq.eastus2.azure.neon.tech`)
   - **Port**: `5432`
   - **Database**: `neondb`
   - **User**: `neondb_owner`
   - **Password**: your Postgres password
   - **Connection URL** (if shown): `jdbc:postgresql://<host>:5432/neondb`
5. Save the record.
6. Note the `sys_id` and update `.env`:

   ```
   ZCC_POSTGRES_CONNECTION_SYS_ID=your_connection_sys_id
   ```

## Step 2: Test the connection in Data Fabric Hub

1. Navigate to **Workflow Data Fabric > Data Fabric Hub**.
2. Find or add your connection under **Connections**.
3. Click **Test Connection**.
4. Verify that the connection succeeds and the database/schema list loads.

## Step 3: Register the connection for NLQ / Knowledge Graph

1. In the Data Fabric Hub, choose the connection and select the schema/tables you want to expose.
2. Use the **Discover** or **Register** action to create the metadata catalog entries.
3. The Knowledge Graph can then use the registered tables as additional data sources.

## Automation helper

If you prefer a scripted approach, you can create the connection record via the REST API:

```python
import requests, os
from dotenv import load_dotenv
load_dotenv()

base = f"https://{os.environ['SN_INSTANCE']}.service-now.com"
auth = (os.environ['SN_USER'], os.environ['SN_PASSWORD'])

payload = {
    "name": "Forecast Postgres ZCC",
    "type": "Database",
    "connection_url": f"jdbc:postgresql://{os.environ['NEON_HOST']}:5432/{os.environ['NEON_DB']}",
    "user_name": os.environ['NEON_USER'],
    "password": os.environ['NEON_PASSWORD'],
}

r = requests.post(
    f"{base}/api/now/table/sys_df_connection_data",
    auth=auth,
    json=payload,
)
print(r.status_code, r.json())
```

> Note: The connection model/table structure may vary by ServiceNow release. The manual UI steps are the most reliable path; use the REST API only after confirming the exact field names in your instance.

## Related files

- `scripts/inspect_forecast_tables.py` — inspect the local ServiceNow tables
- `scripts/create_cost_center_bridge_table.py` — create the bridge table used by the Knowledge Graph
