import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import { setupMonaco } from "./lib/monacoSetup";
import "./styles/index.css";

// Load Monaco from the locally-bundled package (offline + CSP-safe) before the
// editor mounts, instead of the default CDN.
setupMonaco();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
