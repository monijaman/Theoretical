import type { Ride } from "../types";
import { COLORS, SPACING } from "../../../shared/constants/design-tokens";

interface Props {
  ride: Ride;
  onClick?: (ride: Ride) => void;
}

export function RideCard({ ride, onClick }: Props) {
  const statusColor = ride.status === "completed" ? COLORS.success : COLORS.warning;
  
  return (
    <div
      onClick={() => onClick?.(ride)}
      style={{
        padding: SPACING.md,
        border: "1px solid " + COLORS.light,
        borderRadius: "8px",
        cursor: "pointer",
        marginBottom: SPACING.sm,
      }}
    >
      <div style={{ marginBottom: SPACING.sm }}>
        <strong>{ride.pickupLocation} → {ride.dropoffLocation}</strong>
      </div>
      <div style={{ fontSize: "14px", color: "#666" }}>
        Status: <span style={{ color: statusColor }}>
          {ride.status.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: "14px", fontWeight: "bold", marginTop: SPACING.sm }}>
        ${ride.fare.toFixed(2)}
      </div>
    </div>
  );
}
