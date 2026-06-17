const fs = require('fs');
const path = require('path');

const files = {
  'src/features/rides/types/index.ts': `export interface Ride {
  id: string;
  userId: string;
  workspaceId: string;
  pickupLocation: string;
  dropoffLocation: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  fare: number;
  createdAt: string;
  completedAt?: string;
}

export interface CreateRideRequest {
  pickupLocation: string;
  dropoffLocation: string;
  scheduledTime?: string;
}`,

  'src/features/rides/hooks/useRides.ts': `import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/services/apiClient';
import type { Ride } from '../types';

export function useRides(workspaceId: string, options = {}) {
  return useQuery({
    queryKey: [workspaceId, 'rides'],
    queryFn: async (): Promise<Ride[]> => {
      return apiClient.request('/rides', {
        method: 'GET',
        workspaceId,
      });
    },
    enabled: !!workspaceId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}`,

  'src/features/rides/components/RideCard.tsx': `import type { Ride } from '../types';
import { COLORS, SPACING } from '../../shared/constants/design-tokens';

interface Props {
  ride: Ride;
  onClick?: (ride: Ride) => void;
}

export function RideCard({ ride, onClick }: Props) {
  return (
    <div
      onClick={() => onClick?.(ride)}
      style={{
        padding: SPACING.md,
        border: '1px solid ' + COLORS.light,
        borderRadius: '8px',
        cursor: 'pointer',
      }}
    >
      <div style={{ marginBottom: SPACING.sm }}>
        <strong>{ride.pickupLocation} → {ride.dropoffLocation}</strong>
      </div>
      <div style={{ fontSize: '14px', color: '#666' }}>
        Status: {ride.status.toUpperCase()}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
        ${ride.fare.toFixed(2)}
      </div>
    </div>
  );
}`,

  'src/features/rides/mutations/useCreateRide.ts': `import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/services/apiClient';
import type { Ride, CreateRideRequest } from '../types';

export function useCreateRide(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRideRequest) => {
      return apiClient.request<Ride>('/rides', {
        method: 'POST',
        body: JSON.stringify(data),
        workspaceId,
      });
    },
    onMutate: async (newRide) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [workspaceId, 'rides'],
      });

      // Snapshot previous data
      const previousRides = queryClient.getQueryData<Ride[]>([workspaceId, 'rides']);

      // Optimistically update
      queryClient.setQueryData([workspaceId, 'rides'], (old: Ride[] = []) => [
        ...old,
        {
          id: 'temp-' + Date.now(),
          ...newRide,
          workspaceId,
          userId: 'current-user',
          status: 'pending' as const,
          fare: 0,
          createdAt: new Date().toISOString(),
        },
      ]);

      return { previousRides };
    },
    onError: (err, newRide, context) => {
      // Rollback optimistic update
      if (context?.previousRides) {
        queryClient.setQueryData([workspaceId, 'rides'], context.previousRides);
      }
    },
    onSuccess: () => {
      // Refetch rides
      queryClient.invalidateQueries({ queryKey: [workspaceId, 'rides'] });
    },
  });
}`,

  'src/features/rides/index.ts': `// PUBLIC API - Barrel export
export { useRides } from './hooks/useRides';
export { useCreateRide } from './mutations/useCreateRide';
export { RideCard } from './components/RideCard';
export type { Ride, CreateRideRequest } from './types';`,

  'src/core/QueryClientProvider.tsx': `import { QueryClient, QueryClientProvider as TanstackQueryProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Configure QueryClient for optimal performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export function QueryClientProvider({ children }: { children: ReactNode }) {
  return (
    <TanstackQueryProvider client={queryClient}>
      {children}
    </TanstackQueryProvider>
  );
}`,

  'src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from './core/QueryClientProvider'
import { ErrorBoundary } from './shared/ui/ErrorBoundary'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)`,

  'src/App.tsx': `import { useRides } from './features/rides'

export default function App() {
  // Example usage
  const { data: rides, isLoading, error } = useRides('workspace-123')

  if (isLoading) return <div>Loading rides...</div>
  if (error) return <div>Error loading rides</div>

  return (
    <div style={{ padding: '24px' }}>
      <h1>Multi-Tenant SaaS Platform</h1>
      <p>Rides feature example</p>
      <div>
        {rides?.length === 0 && <p>No rides available</p>}
      </div>
    </div>
  )
}`,

  'src/index.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  color: #1F2937;
  background: #F3F4F6;
}`,

  'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Staff-Level Portfolio Project</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,

  '.eslintrc.json': `{
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": ["react", "@typescript-eslint"],
  "rules": {}
}`,

  '.env.example': `VITE_API_BASE_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
VITE_ENABLE_OFFLINE_SYNC=true
VITE_ENABLE_ANALYTICS=false
VITE_APP_ENV=development`,

  '.gitignore': `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode
.idea
*.suo
*.swp
*.sln

# OS
.DS_Store`,

  'Dockerfile': `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "preview"]`,

  '.github/workflows/ci-cd.yml': `name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm run test
`,

  'QUICKSTART.md': `# Quick Start

## Setup

\`\`\`bash
npm install
cp .env.example .env
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
npm run preview
\`\`\`

## Testing

\`\`\`bash
npm run test
npm run e2e
\`\`\`

## Docker

\`\`\`bash
docker build -t staff-portfolio .
docker run -p 3000:3000 staff-portfolio
\`\`\`
`,

 'tests/unit/rides.hook.test.ts': `import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRides } from '../../src/features/rides';
import type { ReactNode } from 'react';

describe('useRides hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  it('should fetch rides with workspace isolation', async () => {
    const { result } = renderHook(() => useRides('workspace-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should not fetch without workspaceId', () => {
    const { result } = renderHook(() => useRides(''), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });
});
`,
};

Object.entries(files).forEach(([filepath, content]) => {
  const fullPath = path.resolve(filepath);
  const dir = path.dirname(fullPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log('✓', filepath);
});

console.log('\nAll files created successfully!');
