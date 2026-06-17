# Staff-Level Frontend Portfolio Project

A production-ready, multi-tenant SaaS platform demonstrating staff-level React architecture patterns.

## ÌøóÔ∏è Architecture Highlights

- **Feature-based modularity** with barrel exports
- **Multi-tenant workspace isolation** using workspace headers
- **Server vs Client state** separation (React Query + Zustand)
- **Design system** with reusable tokens
- **TypeScript strict mode** throughout
- **Error boundaries** for fault tolerance

## Ì≥Å Project Structure

```
src/
‚îú‚îÄ‚îÄ shared/              # Shared utilities across features
‚îÇ   ‚îú‚îÄ‚îÄ types/          # Global TypeScript types
‚îÇ   ‚îú‚îÄ‚îÄ utils/          # Utility functions (env config)
‚îÇ   ‚îú‚îÄ‚îÄ services/       # API client with workspace headers
‚îÇ   ‚îú‚îÄ‚îÄ constants/      # Design tokens (colors, spacing, shadows
)
‚îÇ   ‚îî‚îÄ‚îÄ ui/             # Shared UI components (ErrorBoundary)
‚îú‚îÄ‚îÄ features/           # Feature-based modules
‚îÇ   ‚îî‚îÄ‚îÄ rides/         
‚îÇ       ‚îú‚îÄ‚îÄ types/      # Feature-specific types
‚îÇ       ‚îú‚îÄ‚îÄ hooks/      # React Query hooks (useRides)
‚îÇ       ‚îú‚îÄ‚îÄ components/ # Presentational components (RideCard)
‚îÇ       ‚îú‚îÄ‚îÄ pages/      # Page components (RidesPage)
‚îÇ       ‚îî‚îÄ‚îÄ index.ts    # Public API (barrel export)
‚îî‚îÄ‚îÄ core/               # Core React setup
    ‚îî‚îÄ‚îÄ QueryClientProvider.tsx
```

## Ì∫Ä Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Servers

**Option A: Run both API and frontend together**
```bash
npm run dev
```

This starts:
- **JSON Server API** on `http://localhost:4000`
- **Vite Dev Server** on `http://localhost:5173` (or next available port)

**Option B: Run separately**
```bash
# Terminal 1: Start API
npm run dev:api

# Terminal 2: Start frontend  
npm run dev:vite
```

### 3. Access the Application

Open your browser to:
- **Frontend**: http://localhost:5173 (or port shown in terminal)
- **API**: http://localhost:4000

## Ì≥ä Available API Endpoints

The mock API (json-server) provides:

- `GET /rides` - List all rides
- `GET /rides/:id` - Get single ride
- `POST /rides` - Create new ride
- `GET /users` - List all users
- `GET /workspaces` - List all workspaces

### Example API Calls

```bash
# Get all rides for workspace-abc
curl http://localhost:4000/rides?workspaceId=workspace-abc

# Get single ride
curl http://localhost:4000/rides/ride-001

# Create new ride
curl -X POST http://localhost:4000/rides \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "workspaceId": "workspace-abc",
    "pickupLocation": "Main St",
    "dropoffLocation": "Park Ave",
    "status": "pending",
    "fare": 20.00
  }'
```

## Ìª†Ô∏è Available Scripts

```bash
npm run dev          # Start both API and frontend
npm run dev:api      # Start only API server
npm run dev:vite     # Start only frontend
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Lint TypeScript files
npm run test         # Run unit tests
npm run e2e          # Run E2E tests
```

## Ì≥¶ Mock Data

The project includes realistic mock data in `db.json`:

- **8 rides** across 2 workspaces
- **2 users** with different roles
- **2 workspaces** (Acme Corporation, StartupXYZ)

Modify `db.json` to add more test data!

## Ì¥ß Environment Variables

Create a `.env` file (already included):

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
VITE_APP_ENV=development
```

## Ì∑™ Technology Stack

**Framework & Libraries:**
- React 18.2.0 + React DOM
- TypeScript 5.3.3 (strict mode)
- Vite 5.0.0 (build tool)
- TanStack React Query 5.0.0 (server state)
- Zustand 4.4.0 (client state)

**Development:**
- json-server 0.17.4 (mock API)
- Vitest 1.0.0 (unit testing)
- Playwright 1.40.0 (E2E testing)
- ESLint + TypeScript ESLint

## ÌæØ Key Features Demonstrated

### 1. Multi-Tenant Architecture
The API client automatically injects `X-Workspace-ID` headers for workspace isolation:

```typescript
const { data: rides } = useRides("workspace-abc");
// Automatically filters rides for workspace-abc
```

### 2. React Query Integration
Server state managed with React Query for caching and revalidation:

```typescript
export function useRides(workspaceId: string) {
  return useQuery({
    queryKey: ["rides", workspaceId],
    queryFn: async () => apiClient.request("/rides", { workspaceId }),
    enabled: !!workspaceId,
    staleTime: 30000,
  });
}
```

### 3. Design System
Centralized design tokens for consistent styling:

```typescript
import { COLORS, SPACING, SHADOWS } from "@/shared/constants/design-tokens";

const style = {
  padding: SPACING.md,
  color: COLORS.primary,
  boxShadow: SHADOWS.sm,
};
```

### 4. Barrel Exports
Clean public APIs from feature modules:

```typescript
// features/rides/index.ts
export { useRides } from "./hooks/useRides";
export { RideCard } from "./components/RideCard";
export { RidesPage } from "./pages/RidesPage";
export type { Ride } from "./types";
```

## Ì¥ç What's Next?

Add more features to expand this portfolio project:

- [ ] Add authentication feature
- [ ] Add payments feature  
- [ ] Add real-time updates (WebSocket)
- [ ] Add analytics dashboard
- [ ] Add E2E test coverage
- [ ] Add Storybook for component library
- [ ] Add Docker setup
- [ ] Add CI/CD pipeline

## Ì≥ù License

MIT
