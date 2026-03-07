import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "./core/QueryClientProvider";
import { ErrorBoundary } from "./shared/ui/ErrorBoundary";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
