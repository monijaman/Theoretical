import { useParams } from "react-router-dom";
import { RidesPage } from "../features/rides/pages/RidesPage";
import { WorkspaceProvider } from "../shared/context/WorkspaceContext";

export function RidesRoute() {
    const { workspaceId } = useParams<{ workspaceId: string }>();

    if (!workspaceId) {
        return <div>Invalid workspace ID</div>;
    }

    return (
        <WorkspaceProvider initialWorkspaceId={workspaceId}>
            <RidesPage />
        </WorkspaceProvider>
    );
}
