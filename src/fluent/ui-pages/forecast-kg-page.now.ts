import { UiPage } from "@servicenow/sdk/core";

/**
 * React-based UI Page for exploring the Forecast Variance Knowledge Graph.
 *
 * Scope: x_snc_forecast_v_0 (Forecast Variance)
 * Endpoint: x_snc_forecast_v_0_forecast_kg.do
 */
UiPage({
  $id: Now.ID["forecast-kg-page"],
  category: "general",
  endpoint: "x_snc_forecast_v_0_forecast_kg.do",
  description: "Custom React UI page for the Forecast Variance Knowledge Graph with query and graph views",
  html: Now.include("../../client/forecast-kg/index.html"),
  direct: true,
});
