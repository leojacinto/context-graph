import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    bom_json: {
                        table: 'sys_module'
                        id: '7d140d6deb13454096f8553220929171'
                    }
                    'forecast-kg-column': {
                        table: 'sp_column'
                        id: '036eb8fbc9af4e95bb914385da9157ac'
                    }
                    'forecast-kg-container': {
                        table: 'sp_container'
                        id: '0ab3ad1ea7484d068dc58847f4a09814'
                    }
                    'forecast-kg-edge-bridge-cc': {
                        table: 'sys_meta_graph_edge'
                        id: 'ae53c2f2fcb14cae8b3f93b896953629'
                    }
                    'forecast-kg-edge-bridge-mv': {
                        table: 'sys_meta_graph_edge'
                        id: '76efad02caef4474b559ece7e3f99870'
                    }
                    'forecast-kg-graph': {
                        table: 'sys_meta_graph'
                        id: 'c97b4335fb82486993a8cd6fd20180b2'
                    }
                    'forecast-kg-instance': {
                        table: 'sp_instance'
                        id: '7a5fcfc641474af68cf0b1e14f70c6f4'
                    }
                    'forecast-kg-menu': {
                        table: 'sys_app_application'
                        id: '6a5e96c5911f417fbe5f24ea4db9e05d'
                    }
                    'forecast-kg-module': {
                        table: 'sys_app_module'
                        id: 'ad45ce7f62f841ba9ae341fb863c6200'
                    }
                    'forecast-kg-nlq-post': {
                        table: 'sys_ws_operation'
                        id: 'aaab8364dc4a4addb0ae7d30f501dd66'
                        deleted: false
                    }
                    'forecast-kg-nlq-rest': {
                        table: 'sys_ws_definition'
                        id: '7a26a2eebc6343aea063679061382b6c'
                        deleted: false
                    }
                    'forecast-kg-nlq-script-include': {
                        table: 'sys_script_include'
                        id: '23c9b9b38f694a6eaeef1c243ad1bb93'
                        deleted: true
                    }
                    'forecast-kg-node-bridge': {
                        table: 'sys_meta_graph_node'
                        id: '2561bc31a8d34fdda1c0f45874a604fd'
                    }
                    'forecast-kg-node-cost-center': {
                        table: 'sys_meta_graph_node'
                        id: '7cb2c50d64de4f10a4a66b25c654a989'
                    }
                    'forecast-kg-node-mv-detail': {
                        table: 'sys_meta_graph_node'
                        id: '98e9de0163fe4e169ed22deeb65cfff3'
                    }
                    'forecast-kg-portal': {
                        table: 'sp_portal'
                        id: '85fadf7dc2ed40c3b8c80a284e75c8f7'
                    }
                    'forecast-kg-row': {
                        table: 'sp_row'
                        id: '03c3b3e66d3a4dfca30c06f1fc9bb996'
                    }
                    'forecast-kg-widget': {
                        table: 'sp_widget'
                        id: '5f85fa31903e4bb0b8f7b326d8e19ff2'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: '7a78f3e455194dc2ad3432639ec42dd2'
                    }
                    'src_server_forecast-kg_nlq-processor_ts': {
                        table: 'sys_module'
                        id: '9cb8784914924a468a2affa5aeef53a4'
                        deleted: true
                    }
                    'src_server_kg-query_forecast-kg-nlq_ts': {
                        table: 'sys_module'
                        id: 'fd2b421fab384c3da0a538710b9b1f36'
                        deleted: true
                    }
                    'src_server_kg-query_ForecastKGNLQ_server_js': {
                        table: 'sys_module'
                        id: 'dc53fa32c6634782a06da5f8d9dabe57'
                        deleted: true
                    }
                }
                composite: [
                    {
                        table: 'sys_ux_lib_asset'
                        id: '16f1c2994361456c8febfa4b486e6ca9'
                        key: {
                            name: 'x_snc_forecast_v_0/forecast-kg/main'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '84df5c9e9e544493a2418459574f4a00'
                        key: {
                            name: 'x_snc_forecast_v_0/forecast-kg/main.js.map'
                        }
                    },
                    {
                        table: 'sp_page'
                        id: '926e1cb4ff834fd39e7d7849e52ee5ea'
                        key: {
                            id: 'forecast_kg_page'
                        }
                    },
                    {
                        table: 'sys_ui_page'
                        id: 'd354ce39a60f45dd8ca776b7b5c95a27'
                        key: {
                            endpoint: 'x_snc_forecast_v_0_forecast_kg.do'
                        }
                    },
                ]
            }
        }
    }
}
