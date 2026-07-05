import { Record } from "@servicenow/sdk/core";

/**
 * New meta graph for Forecast Variance Knowledge Graph.
 * Reuses the native Knowledge Graph explorer page with our data.
 */
export const forecastKgGraph = Record({
  $id: Now.ID["forecast-kg-graph"],
  table: "sys_meta_graph",
  data: {
    name: "forecast_kg_graph",
    description: "Forecast Variance Knowledge Graph: MV Detail -> Cost Center Bridge -> Cost Center",
    active: true,
    model: "extension",
    use_dictionary: false,
  },
});

const mvDetailNode = Record({
  $id: Now.ID["forecast-kg-node-mv-detail"],
  table: "sys_meta_graph_node",
  data: {
    graph: forecastKgGraph,
    table: "x_snc_forecast_v_0_df_mv_detail",
    label: "MV Detail",
    node_type: "[\"mv_detail\"]",
    active: true,
  },
});

const bridgeNode = Record({
  $id: Now.ID["forecast-kg-node-bridge"],
  table: "sys_meta_graph_node",
  data: {
    graph: forecastKgGraph,
    table: "x_snc_forecast_v_0_df_cost_center_bridge",
    label: "Cost Center Bridge",
    node_type: "[\"bridge\"]",
    active: true,
  },
});

const costCenterNode = Record({
  $id: Now.ID["forecast-kg-node-cost-center"],
  table: "sys_meta_graph_node",
  data: {
    graph: forecastKgGraph,
    table: "sn_erp_integration_cost_center",
    label: "SAP Cost Center",
    node_type: "[\"cost_center\"]",
    active: true,
  },
});

Record({
  $id: Now.ID["forecast-kg-edge-bridge-mv"],
  table: "sys_meta_graph_edge",
  data: {
    graph: forecastKgGraph,
    source_node: bridgeNode,
    target_node: mvDetailNode,
    target_key_field: "mv_detail",
    label: "MV Detail",
    edge_type: "mv_detail",
    active: true,
  },
});

Record({
  $id: Now.ID["forecast-kg-edge-bridge-cc"],
  table: "sys_meta_graph_edge",
  data: {
    graph: forecastKgGraph,
    source_node: bridgeNode,
    target_node: costCenterNode,
    target_key_field: "cost_center",
    label: "Cost Center",
    edge_type: "cost_center",
    active: true,
  },
});
