import React from "react";

interface QueryViewProps {
  children: React.ReactNode;
}

export function QueryView({ children }: QueryViewProps) {
  return (
    <div style={{ padding: "16px", height: "100%", overflow: "auto" }}>
      {children}
    </div>
  );
}
