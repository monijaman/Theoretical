import { createContext, useContext, ReactNode, useState } from 'react';

interface WorkspaceContextType {
  workspaceId: string;
  setWorkspaceId: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children, initialWorkspaceId = 'workspace-abc' }: { children: ReactNode; initialWorkspaceId?: string }) {
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId);

  return (
    <WorkspaceContext.Provider value={{ workspaceId, setWorkspaceId }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
