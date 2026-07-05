import { Record } from "@servicenow/sdk/core";

/**
 * Service Portal records for the Forecast Knowledge Graph UI.
 */

const page = Record({
  $id: Now.ID["forecast-kg-sp-page"],
  table: "sp_page",
  data: {
    id: "forecast_kg_page",
    title: "Forecast Knowledge Graph",
    description: "Page for exploring the Forecast Variance Knowledge Graph",
    active: true,
    draft: false,
    use_seo_script: false,
    public: false,
  },
});

const portal = Record({
  $id: Now.ID["forecast-kg-portal"],
  table: "sp_portal",
  data: {
    url_suffix: "forecast-kg-portal",
    title: "Forecast Knowledge Graph",
    short_description: "Portal for exploring the Forecast Variance Knowledge Graph",
    display_value: "Forecast Knowledge Graph",
    active: true,
    login_page: "login",
    homepage: page,
    theme: "02ca5e93cb13020000f8d856634c9cce",
    quick_start_buttons: true,
  },
});

const widget = Record({
  $id: Now.ID["forecast-kg-widget"],
  table: "sp_widget",
  data: {
    name: "forecast_kg_widget",
    data_table: "sp_instance",
    description: "Widget that loads the Forecast Knowledge Graph React app",
    css: `#forecast-kg-root {\n  height: 100vh;\n  width: 100%;\n}`,
    template: `<div id="forecast-kg-root" style="height: 100vh; width: 100%;"></div>`,
    client_script: `api.controller = function($scope, $element) {\n  var c = this;\n  var root = $element[0].querySelector('#forecast-kg-root');\n  if (!root) {\n    root = document.createElement('div');\n    root.id = 'forecast-kg-root';\n    root.style.height = '100vh';\n    root.style.width = '100%';\n    $element[0].appendChild(root);\n  }\n  var script = document.createElement('script');\n  script.type = 'module';\n  script.src = '/uxasset/externals/x_snc_forecast_v_0/forecast-kg/main.jsdbx';\n  document.head.appendChild(script);\n};`,
  },
});

const container = Record({
  $id: Now.ID["forecast-kg-container"],
  table: "sp_container",
  data: {
    sp_page: page,
    name: "Forecast KG Container",
    order: 100,
    width: "container-fluid",
  },
});

const row = Record({
  $id: Now.ID["forecast-kg-row"],
  table: "sp_row",
  data: {
    sp_container: container,
    order: 100,
  },
});

const column = Record({
  $id: Now.ID["forecast-kg-column"],
  table: "sp_column",
  data: {
    sp_row: row,
    size: 12,
    order: 100,
  },
});

Record({
  $id: Now.ID["forecast-kg-instance"],
  table: "sp_instance",
  data: {
    sp_column: column,
    sp_widget: widget,
    title: "Forecast Knowledge Graph",
    active: true,
    order: 100,
  },
});

export { portal, page };
