import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../shared/services/apiClient";
import type { Ride } from "../types";

export function useRides(workspaceId: string) {
  return useQuery({
    queryKey: ["rides", workspaceId],
    queryFn: async (): Promise<Ride[]> => {
      return apiClient.request("/rides", { workspaceId });
    },
    enabled: !!workspaceId,
    staleTime: 30000,
  });
}
