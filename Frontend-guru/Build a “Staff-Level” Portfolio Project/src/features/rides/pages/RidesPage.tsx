import { useRides } from "../hooks/useRides";
import { RideCard } from "../components/RideCard";

interface Props {
  workspaceId: string;
}

export function RidesPage({ workspaceId }: Props) {
  const { data: rides, isLoading, error } = useRides(workspaceId);

  if (isLoading) {
    return (
      <div style={{ padding: "24px" }}>
        <h1 style={{ marginBottom: "16px" }}>Rides</h1>
        <div>Loading rides...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px" }}>
        <h1 style={{ marginBottom: "16px" }}>Rides</h1>
        <div style={{ color: "#EF4444" }}>
          Error loading rides: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ marginBottom: "16px" }}>Rides Dashboard</h1>
      <p style={{ color: "#666", marginBottom: "24px" }}>
        Workspace: <strong>{workspaceId}</strong> | Total Rides: <strong>{rides?.length || 0}</strong>
      </p>
      <div>
        {rides?.map((ride) => (
          <RideCard 
            key={ride.id} 
            ride={ride}
            onClick={(ride) => console.log("Ride clicked:", ride)}
          />
        ))}
      </div>
    </div>
  );
}
