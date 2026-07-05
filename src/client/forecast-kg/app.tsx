import React, { useEffect, useState } from "react";
import { GraphDbView } from "./components/Graphdb";
import { RecordsTable } from "./components/RecordsTable";
import { fetchNativeNLQ } from "./services/kgService";
import { GraphDbData, buildGraphDb } from "./utils/graphModel";

export default function App() {
  const [input, setInput] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [nlqResult, setNlqResult] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [graphData, setGraphData] = useState<GraphDbData>({ nodes: [], relationships: [] });
  const [error, setError] = useState<string>("");
  const [showOutput, setShowOutput] = useState<boolean>(false);

  const runQuery = () => {
    setQuery(input);
  };

  const clearQuery = () => {
    setInput("");
    setQuery("");
    setNlqResult(null);
  };

  useEffect(() => {
    let cancelled = false;
    if (query === undefined || query.trim() === "") return;
    setLoading(true);
    setError("");
    fetchNativeNLQ(query).then((nlqData) => {
      if (!cancelled) {
        setNlqResult(nlqData.result);
        setRecords(nlqData.records);
        const config = nlqData.result?.data_configurations?.[0];
        setGraphData(
          buildGraphDb(nlqData.records.slice(0, 5), {
            sourceTable: config?.source_id,
            sourceLabel: config?.source_id_label || "CostCenterBridge",
          })
        );
        setLoading(false);
      }
    }).catch((e) => {
      if (!cancelled) {
        setError(e.message);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "16px", backgroundColor: "#ffffff", color: "#1e293b", fontFamily: "sans-serif" }}>
      <div style={{ marginBottom: "12px" }}>
        <h1 style={{ margin: 0, fontSize: "20px", color: "#1e293b" }}>Forecast Knowledge Graph</h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
          Explore mv_detail → Cost Center Bridge → SAP Cost Center relationships
        </p>
      </div>

      <div style={{ marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") runQuery(); }}
          placeholder="Try: cost center CC_IT_002, category Cloud, year 2024, variance > 1000"
          style={{ flex: 1, minWidth: "300px", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#1e293b" }}
        />
        <button style={btnStyle("primary")} onClick={runQuery}>Search</button>
        <button style={btnStyle("secondary")} onClick={clearQuery}>Clear</button>
      </div>

      {error && <div style={{ color: "#dc2626", marginBottom: "12px" }}>{error}</div>}

      <div style={{ flex: 1, display: "flex", gap: "12px", overflow: "hidden" }}>
        <div style={{ flex: 1, overflow: "auto", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "12px" }}>
          {loading ? (
            <div style={{ color: "#64748b" }}>Loading records...</div>
          ) : (
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
                Records ({records.length})
              </div>
              <RecordsTable records={records} />
              <button
                style={{ ...btnStyle("secondary"), marginTop: "12px" }}
                onClick={() => setShowOutput((s) => !s)}
              >
                {showOutput ? "Hide raw output" : "Show raw output"}
              </button>
              {showOutput && (
                <pre style={{ margin: "8px 0 0", fontSize: "11px", color: "#1e293b", whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#ffffff", border: "1px solid #e2e8f0", padding: "8px", borderRadius: "4px" }}>
                  {nlqResult ? JSON.stringify(nlqResult, null, 2) : "No native KG output. Run a query."}
                </pre>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: "hidden", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          {loading ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
              Loading graph...
            </div>
          ) : (
            <GraphDbView data={graphData} theme="light" />
          )}
        </div>
      </div>
    </div>
  );
}

function btnStyle(variant: "primary" | "secondary"): React.CSSProperties {
  return {
    padding: "8px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    background: variant === "primary" ? "#0284c7" : "#ffffff",
    color: variant === "primary" ? "#ffffff" : "#1e293b",
    cursor: "pointer",
    fontWeight: 600,
  };
}
