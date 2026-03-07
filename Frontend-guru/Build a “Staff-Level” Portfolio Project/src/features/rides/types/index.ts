export interface Ride {
  id: string;
  userId: string;
  workspaceId: string;
  pickupLocation: string;
  dropoffLocation: string;
  status: "pending" | "accepted" | "completed" | "cancelled";
  fare: number;
  createdAt: string;
  completedAt?: string;
}

export interface CreateRideRequest {
  pickupLocation: string;
  dropoffLocation: string;
  scheduledTime?: string;
}
