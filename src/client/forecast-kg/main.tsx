import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";

const rootId = "forecast-kg-root";
const rootEl = document.getElementById(rootId);
if (!rootEl) {
  console.error(`Forecast KG: root element #${rootId} not found`);
} else {
  ReactDOM.createRoot(rootEl).render(<App />);
}
