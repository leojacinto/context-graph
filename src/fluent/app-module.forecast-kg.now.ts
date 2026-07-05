import { Record } from "@servicenow/sdk/core";
import { forecastKgMenu } from "./app-menu.forecast-kg.now";
import { forecastKgGraph } from "./forecast-kg-graph.now";

/**
 * Application Module that opens the native Knowledge Graph explorer
 * using the new forecast_kg_graph meta graph.
 * Scope: x_snc_forecast_v_0
 */
Record({
  $id: Now.ID["forecast-kg-module"],
  table: "sys_app_module",
  data: {
    title: "Knowledge Graph Explorer",
    application: forecastKgMenu,
    link_type: "DIRECT",
    query: `now/knowledge_graph/record/${forecastKgGraph}/params/open-global-graph-landing-page/false`,
    hint: "Open the Forecast Knowledge Graph Explorer",
    order: 100,
    roles: ["admin", "x_snc_forecast_v_0.user"],
    active: true,
  },
});
