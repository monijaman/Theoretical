import { describe, it, expect } from "vitest";
import type { Ride } from "../../src/features/rides";

describe("Rides Feature", () => {
  it("should have correct ride type structure", () => {
    const ride: Ride = {
      id: "1",
      userId: "user-1",
      workspaceId: "ws-1",
      pickupLocation: "NYC",
      dropoffLocation: "LA",
      status: "completed",
      fare: 150,
      createdAt: new Date().toISOString(),
    };

    expect(ride.status).toBe("completed");
    expect(ride.fare).toBeGreaterThan(0);
  });
});
