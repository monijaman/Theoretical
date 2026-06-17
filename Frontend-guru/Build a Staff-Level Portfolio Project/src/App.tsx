import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RidesRoute } from "./routes/RidesRoute";

function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", backgroundColor: "#F3F4F6" }}>
        <Routes>
          {/* Multi-tenant route: /workspaces/:workspaceId/rides */}
          <Route path="/workspaces/:workspaceId/rides" element={<RidesRoute />} />
          {/* Default redirect to first workspace */}
          <Route path="/" element={<Navigate to="/workspaces/workspace-abc/rides" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
