import React from "react";

interface RecordsTableProps {
  records: any[];
}

export function RecordsTable({ records }: RecordsTableProps) {
  if (!records || records.length === 0) {
    return <div style={{ color: "#64748b" }}>No records match your query.</div>;
  }

  const keys = Array.from(new Set(records.flatMap((r) => Object.keys(r)))).filter(
    (k) => !k.endsWith("_sys_id") && !k.endsWith("_label")
  );

  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: "#1e293b" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
            {keys.map((k) => (
              <th
                key={k}
                style={{
                  padding: "8px",
                  textAlign: "left",
                  background: "#f1f5f9",
                  color: "#475569",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
              {keys.map((k) => (
                <td key={k} style={{ padding: "8px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r[k] !== null && r[k] !== undefined ? String(r[k]) : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
