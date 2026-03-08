import { QueryClient, QueryClientProvider as TanStackProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function QueryClientProvider({ children }: { children: ReactNode }) {
  return <TanStackProvider client={queryClient}>{children}</TanStackProvider>;
}
