interface RestRecord {
  sys_id: string;
  [key: string]: unknown;
}

interface BridgeRecord extends RestRecord {
  mv_detail?: { value: string } | string;
  cost_center?: { value: string } | string;
  cost_center_code?: string;
  fiscal_year?: string;
  fiscal_month?: string;
  variance?: string;
  service_category?: string;
}

interface MvDetailRecord extends RestRecord {
  u_cost_center?: string;
  u_service_category?: string;
  u_budget_owner_name?: string;
  u_fiscal_year?: string;
  u_fiscal_month?: string;
  u_variance?: string;
  u_variance_pct?: string;
}

interface CostCenterRecord extends RestRecord {
  u_cost_center?: string;
  u_cost_center_description?: string;
}

interface KgNode {
  id: string;
  label: string;
  type: "mv-detail" | "bridge" | "cost-center";
}

interface KgLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: KgNode[];
  links: KgLink[];
}

function getRefValue(ref: { value: string } | string | undefined): string {
  if (!ref) return "";
  return typeof ref === "object" ? ref.value : ref;
}

function getHeaders(): Record<string, string> {
  const w = window as any;
  const token = w.g_user_token || w.g_ck || "";
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-UserToken": token,
  };
}

function buildQuery(query: string): string {
  const q = query.trim();
  if (!q) return "sys_idISNOTEMPTY";
  const escaped = escapeQuery(q);
  return (
    `cost_center_codeLIKE${escaped}^OR` +
    `service_categoryLIKE${escaped}^OR` +
    `fiscal_yearLIKE${escaped}^OR` +
    `fiscal_monthLIKE${escaped}^OR` +
    `varianceLIKE${escaped}`
  );
}

function escapeQuery(q: string): string {
  return q.replace(/\^/g, "^^").replace(/ /g, "+");
}

export async function fetchBridgeRecords(query: string): Promise<BridgeRecord[]> {
  const base = window.location.origin;
  const headers = getHeaders();
  const q = buildQuery(query);
  const res = await fetch(
    `${base}/api/now/table/x_snc_forecast_v_0_df_cost_center_bridge?sysparm_query=${encodeURIComponent(
      q
    )}&sysparm_limit=100&sysparm_fields=sys_id,mv_detail,cost_center,cost_center_code,fiscal_year,fiscal_month,variance,service_category`,
    { headers }
  );
  if (!res.ok) throw new Error(`Failed to fetch bridge records: ${res.status}`);
  const data = (await res.json()).result as BridgeRecord[];
  return data || [];
}

export async function fetchNativeNLQ(query: string): Promise<{ result: any; records: any[] }> {
  const base = window.location.origin;
  const headers = getHeaders();
  const res = await fetch(`${base}/api/x_snc_forecast_v_0/forecast_kg_native_nlq/nlq`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      table: "x_snc_forecast_v_0_df_cost_center_bridge",
      query,
    }),
  });
  if (!res.ok) throw new Error(`Native NLQ failed: ${res.status}`);
  const body = (await res.json()) as { result?: { result?: any; records?: any[] } };
  return {
    result: body.result?.result,
    records: body.result?.records || [],
  };
}

export async function fetchBridgeData(query: string): Promise<GraphData> {
  const base = window.location.origin;
  const headers = getHeaders();
  const bridgeQuery = buildQuery(query);

  const [bridgeRes, mvRes, ccRes] = await Promise.all([
    fetch(
      `${base}/api/now/table/x_snc_forecast_v_0_df_cost_center_bridge?sysparm_query=${encodeURIComponent(
        bridgeQuery
      )}&sysparm_limit=100&sysparm_fields=sys_id,mv_detail,cost_center,cost_center_code,fiscal_year,fiscal_month,variance,service_category`,
      { headers }
    ),
    fetch(
      `${base}/api/now/table/x_snc_forecast_v_0_df_mv_detail?sysparm_query=u_cost_centerISNOTEMPTY&sysparm_limit=100&sysparm_fields=sys_id,u_cost_center,u_service_category,u_budget_owner_name,u_fiscal_year,u_fiscal_month,u_variance,u_variance_pct`,
      { headers }
    ),
    fetch(
      `${base}/api/now/table/sn_erp_integration_cost_center?sysparm_limit=100&sysparm_fields=sys_id,u_cost_center,u_cost_center_description`,
      { headers }
    ),
  ]);

  if (!bridgeRes.ok || !mvRes.ok || !ccRes.ok) {
    throw new Error(
      `Failed to fetch KG data: ${bridgeRes.status} ${mvRes.status} ${ccRes.status}`
    );
  }

  const bridges: BridgeRecord[] = ((await bridgeRes.json()).result as BridgeRecord[]) || [];
  const mvDetails: MvDetailRecord[] = ((await mvRes.json()).result as MvDetailRecord[]) || [];
  const costCenters: CostCenterRecord[] = ((await ccRes.json()).result as CostCenterRecord[]) || [];

  const mvById = new Map(mvDetails.map((m) => [m.sys_id, m]));
  const ccById = new Map(costCenters.map((c) => [c.sys_id, c]));

  const nodes: KgNode[] = [];
  const links: KgLink[] = [];
  const seen = new Set<string>();

  for (const bridge of bridges) {
    const mvId = getRefValue(bridge.mv_detail);
    const ccId = getRefValue(bridge.cost_center);
    const mv = mvById.get(mvId);
    const cc = ccById.get(ccId);

    if (!cc) continue;

    const hasMv = mvId && mv;

    if (hasMv && !seen.has(mvId)) {
      seen.add(mvId);
      nodes.push({
        id: mvId,
        label: `${mv!.u_service_category || "MV"} FY${mv!.u_fiscal_year} M${mv!.u_fiscal_month}`,
        type: "mv-detail",
      });
    }

    if (!seen.has(bridge.sys_id)) {
      seen.add(bridge.sys_id);
      nodes.push({
        id: bridge.sys_id,
        label: bridge.service_category || "Bridge",
        type: "bridge",
      });
    }

    if (!seen.has(ccId)) {
      seen.add(ccId);
      nodes.push({
        id: ccId,
        label: cc.u_cost_center || bridge.cost_center_code || "CC",
        type: "cost-center",
      });
    }

    if (hasMv) {
      links.push({ source: mvId, target: bridge.sys_id });
    }
    links.push({ source: bridge.sys_id, target: ccId });
  }

  return { nodes, links };
}
