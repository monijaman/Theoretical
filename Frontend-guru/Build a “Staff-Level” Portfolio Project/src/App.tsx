import { RidesPage } from "./features/rides";

function App() {
  // In a real app, this would come from authentication/routing
  const workspaceId = "workspace-abc";
  
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F3F4F6" }}>
      <RidesPage workspaceId={workspaceId} />
    </div>
  );
}

export default App;
