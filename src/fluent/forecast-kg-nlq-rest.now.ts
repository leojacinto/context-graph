import { RestApi } from '@servicenow/sdk/core'

RestApi({
  $id: Now.ID['forecast-kg-nlq-rest'],
  name: 'Forecast KG Native NLQ REST',
  serviceId: 'forecast_kg_native_nlq',
  consumes: 'application/json',
  routes: [
    {
      $id: Now.ID['forecast-kg-nlq-post'],
      name: 'nlq',
      path: '/nlq',
      method: 'POST',
      script: `
(function process(request, response) {
  try {
    var body = request.body ? request.body.dataString : '{}';
    var params = JSON.parse(body);
    var query = params.query || '';
    var table = params.table || 'x_snc_forecast_v_0_df_cost_center_bridge';

    if (!query) {
      response.setBody({ error: 'Missing query parameter' });
      response.setStatus(400);
      return;
    }

    var nlq = new global.NLQVisualization();
    var nlqResult = nlq.execute({
      user_question: query,
      table: table,
      force_table_grammar: false,
    });

    var parsed = typeof nlqResult === 'string' ? JSON.parse(nlqResult) : nlqResult;
    var output = parsed.output && parsed.output.result ? JSON.parse(parsed.output.result) : parsed;

    var records = [];
    if (output.status_code === 'ok' && output.data_configurations && output.data_configurations.length > 0) {
      var config = output.data_configurations[0];
      var filterQuery = config.filter_query || '';
      var sourceTable = config.source_id || table;
      var fieldList = config.field_list ? config.field_list.split(',') : ['sys_id', 'mv_detail', 'cost_center', 'cost_center_code', 'service_category', 'fiscal_year', 'fiscal_month', 'variance'];
      if (fieldList.indexOf('sys_id') === -1) {
        fieldList.push('sys_id');
      }
      if (filterQuery) {
        var gr = new GlideRecord(sourceTable);
        gr.addEncodedQuery(filterQuery);
        gr.setLimit(100);
        gr.query();
        while (gr.next()) {
          var rec = {};
          for (var i = 0; i < fieldList.length; i++) {
            var fieldName = fieldList[i].trim();
            if (gr.isValidField(fieldName)) {
              rec[fieldName] = gr.getValue(fieldName);
            }
          }
          if (gr.isValidField('cost_center') && !gr.cost_center.nil()) {
            rec.cost_center_label = gr.cost_center.getDisplayValue();
            rec.cost_center_sys_id = gr.cost_center.toString();
            var costCenterGR = new GlideRecord('sn_erp_integration_cost_center');
            if (costCenterGR.get(rec.cost_center_sys_id)) {
              rec.cost_center_description = costCenterGR.getValue('u_cost_center_description') || rec.cost_center_label;
            } else {
              rec.cost_center_description = rec.cost_center_label;
            }
            rec.cost_center = rec.cost_center_description;
          }
          if (gr.isValidField('budget_owner') && !gr.budget_owner.nil()) {
            rec.budget_owner = gr.budget_owner.getDisplayValue();
          } else {
            var suffix = rec.sys_id ? rec.sys_id.slice(-4) : String(records.length);
            rec.budget_owner = 'Owner ' + suffix;
          }
          records.push(rec);
        }
      }
    }

    response.setBody({ result: output, records: records });
  } catch (e) {
    gs.error('[ForecastKG NLQ] error: ' + e.message);
    response.setBody({ error: e.message });
    response.setStatus(500);
  }
})(request, response);
      `,
      authentication: true,
      internalRole: false,
    },
  ],
})
