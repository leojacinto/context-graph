import { ApplicationMenu } from "@servicenow/sdk/core";

/**
 * Application Menu for Forecast Variance Knowledge Graph.
 * Scope: x_snc_forecast_v_0
 */
export const forecastKgMenu = ApplicationMenu({
  $id: Now.ID["forecast-kg-menu"],
  title: "Forecast Knowledge Graph",
  category: "custom_applications",
  description: "Navigation menu for the Forecast Variance Knowledge Graph UI page",
  order: 100,
  roles: ["admin", "x_snc_forecast_v_0.user"],
  active: true,
});
