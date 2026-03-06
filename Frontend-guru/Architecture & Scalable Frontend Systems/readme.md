# Architecture & Scalable Frontend Systems

## 📚 Learn

### State Management Patterns

#### 1. State Colocation vs Global State

**The Problem:** Airbnb's old architecture stored ALL state in Redux, causing performance issues with 10k+ properties and filters.

**Solution - State colocation:**

```jsx
// ❌ WRONG: Global state for every UI state
const airbnbStore = {
  filters: { priceRange: [0, 500] },
  hoveredCard: null, // UI state (temporary)
  selectedDates: null, // UI state
  searchResults: [], // Server state
};

// ✅ CORRECT: Collocate UI state with component
function PropertyListing() {
  // Local UI state - doesn't need Redux
  const [selectedDates, setSelectedDates] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  // Server state - stored globally/cache layer
  const { data: properties } = useQuery(["properties", filters]);

  return (
    <div onMouseLeave={() => setHoveredId(null)}>
      {properties.map((p) => (
        <Card
          key={p.id}
          isHovered={hoveredId === p.id}
          onHover={() => setHoveredId(p.id)}
        />
      ))}
    </div>
  );
}
```

**Performance Impact:**

- Redux DevTools showed 40% less re-renders
- Memory usage decreased from 45MB to 18MB
- Faster component unmounting

**When to use each:**

- **Local state**: Form inputs, hover effects, open/close modals, animations
- **Global state**: Authentication, theme, user preferences
- **Server state**: API data, cache

---

#### 2. Server State vs UI State

**Real-world case: Netflix recommendations**

```jsx
import { useQuery } from "@tanstack/react-query";

function RecommendationsFeed() {
  // Server state - fetched and cached
  const {
    data: recommendations,
    isLoading,
    isStale,
  } = useQuery({
    queryKey: ["recommendations", userId],
    queryFn: () => fetchRecommendations(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // garbage collect after 30 min
  });

  // UI state - local component state
  const [expandedId, setExpandedId] = useState(null);
  const [viewMode, setViewMode] = useState("grid");

  if (isLoading) return <SkeletonGrid />;

  return (
    <div className={`view-${viewMode}`}>
      {recommendations.map((item) => (
        <Card
          key={item.id}
          data={item}
          isExpanded={expandedId === item.id}
          onToggleExpand={() =>
            setExpandedId(expandedId === item.id ? null : item.id)
          }
        />
      ))}
    </div>
  );
}
```

**Synchronization strategy (like Instagram):**

```jsx
const useUserPosts = (userId, options = {}) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["posts", userId],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${userId}`);
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });

  // Auto-sync when user returns to tab
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && query.isStale) {
        queryClient.invalidateQueries({
          queryKey: ["posts", userId],
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [userId, queryClient, query.isStale]);

  return query;
};
```

---

#### 3. TanStack Query Deep Dive

**Real example: Twitter feed with infinite scroll**

```jsx
import { useInfiniteQuery } from "@tanstack/react-query";

function TwitterFeed() {
  const { data, hasNextPage, isFetching, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["tweets", "Following"],
      queryFn: async ({ pageParam = 1 }) => {
        const res = await fetch(`/api/tweets/following?cursor=${pageParam}`);
        return res.json(); // { tweets, nextCursor }
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 1000 * 60 * 5,
    });

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 500
      ) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div>
      {data?.pages.map((page) =>
        page.tweets.map((tweet) => <Tweet key={tweet.id} data={tweet} />),
      )}
      {isFetchingNextPage && <LoadingSpinner />}
    </div>
  );
}
```

**Cache deduplication (Stripe's implementation):**

```jsx
// Multiple requests for same user → one API call
function UserProfile({ userId }) {
  const query1 = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUser(userId),
  });

  return <div>{query1.data?.name}</div>;
}

function UserBilling({ userId }) {
  // Same queryKey → automatic deduplication
  const query2 = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUser(userId),
  });

  return <div>{query2.data?.email}</div>;
}

// Only 1 network request, both components get same data
```

### Advanced Strategies

#### 1. Optimistic Updates

**Real case: LinkedIn's comment system**

```jsx
function CommentSection({ postId }) {
  const queryClient = useQueryClient();
  const { data: comments } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => fetchComments(postId),
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content) => {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to post");
      return res.json();
    },

    // Optimistic update - update UI immediately
    onMutate: async (content) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["comments", postId],
      });

      // Get old data
      const previousComments = queryClient.getQueryData(["comments", postId]);

      // Add optimistic comment
      queryClient.setQueryData(["comments", postId], (old) => [
        ...old,
        {
          id: Date.now(), // temporary ID
          content,
          author: currentUser,
          createdAt: new Date(),
          _optimistic: true,
        },
      ]);

      // Return context for rollback
      return { previousComments };
    },

    // Handle error - rollback UI
    onError: (error, content, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", postId],
          context.previousComments,
        );
      }
      toast.error("Failed to post comment");
    },

    // Mark comment as confirmed when server responds
    onSuccess: (newComment) => {
      queryClient.setQueryData(["comments", postId], (old) =>
        old.map((c) =>
          c._optimistic ? { ...newComment, _optimistic: false } : c,
        ),
      );
    },
  });

  return (
    <div>
      {comments?.map((comment) => (
        <Comment
          key={comment.id}
          data={comment}
          isLoading={comment._optimistic}
        />
      ))}
      <textarea
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.ctrlKey) {
            addCommentMutation.mutate(e.target.value);
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}
```

**Error recovery with retry logic:**

```jsx
const mutation = useMutation({
  mutationFn: async (payload) => {
    return fetch("/api/send", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // exponential backoff
  onError: (error, variables, context) => {
    // After 3 retries still failed - handle offline scenario
    if (!navigator.onLine) {
      // Persist to IndexedDB for sync later
      saveToOfflineQueue(variables);
    }
  },
});
```

---

#### 2. Offline-first Strategy

**Real example: Google Docs offline mode**

```jsx
import { openDB } from "idb";

class OfflineStorage {
  constructor() {
    this.db = null;
  }

  async init() {
    this.db = await openDB("docstore", 1, {
      upgrade(db) {
        db.createObjectStore("documents", { keyPath: "id" });
        db.createObjectStore("pendingChanges", {
          keyPath: "id",
          autoIncrement: true,
        });
      },
    });
  }

  // Save document locally
  async saveDocument(docId, content) {
    const doc = {
      id: docId,
      content,
      updatedAt: Date.now(),
      synced: false,
    };
    await this.db.put("documents", doc);
  }

  // Queue changes when offline
  async addPendingChange(docId, change) {
    await this.db.add("pendingChanges", {
      docId,
      change,
      timestamp: Date.now(),
      status: "pending",
    });
  }

  // Sync when back online
  async syncPendingChanges() {
    const changes = await this.db.getAll("pendingChanges");

    for (const record of changes) {
      try {
        await fetch(`/api/documents/${record.docId}/changes`, {
          method: "POST",
          body: JSON.stringify(record.change),
        });

        // Mark as synced
        await this.db.delete("pendingChanges", record.id);
      } catch (error) {
        console.error("Sync failed:", error);
        // Retry next time
      }
    }
  }
}

function DocumentEditor({ docId }) {
  const storage = useRef(new OfflineStorage());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    storage.current.init();

    const handleOnline = () => {
      setIsOnline(true);
      storage.current.syncPendingChanges();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSave = async (content) => {
    try {
      await storage.current.saveDocument(docId, content);

      if (isOnline) {
        await fetch(`/api/documents/${docId}`, {
          method: "PUT",
          body: JSON.stringify({ content }),
        });
      } else {
        await storage.current.addPendingChange(docId, { content });
      }
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  return (
    <div>
      {!isOnline && <NetworkWarning />}
      <Editor onSave={handleSave} />
    </div>
  );
}
```

---

#### 3. Feature Flag Architecture

**Real example: Spotify's gradual rollout**

```jsx
// Feature flag service
class FeatureFlagService {
  async getFlags(userId) {
    // FAANG companies use LaunchDarkly or custom CDN
    const res = await fetch(`/api/feature-flags?userId=${userId}`, {
      cache: "no-store",
    });
    return res.json();
  }
}

// Hook for components
export const useFeatureFlag = (flagName, defaultValue = false) => {
  const { userId } = useAuth();
  const [isEnabled, setIsEnabled] = useState(defaultValue);

  useEffect(() => {
    featureFlagService.getFlags(userId).then((flags) => {
      if (flagName in flags) {
        setIsEnabled(flags[flagName]);
      }
    });
  }, [userId, flagName]);

  return isEnabled;
};

// Usage in Spotify: gradual rollout of new UI
function PodcastPlayer() {
  const isNewUIEnabled = useFeatureFlag("podcast-ui-v2");
  const isAIRecommendationsEnabled = useFeatureFlag("ai-recommendations");

  return (
    <div>
      {isNewUIEnabled ? (
        <PodcastPlayerV2 showAI={isAIRecommendationsEnabled} />
      ) : (
        <PodcastPlayerV1 />
      )}
    </div>
  );
}

// A/B Testing implementation
function ExperimentWrapper({ experimentId, children }) {
  const { variant } = useExperiment(experimentId);

  useEffect(() => {
    // Track which variant user sees
    analytics.trackExperiment({
      experimentId,
      variant,
      timestamp: Date.now(),
    });
  }, [experimentId, variant]);

  return (
    <div data-experiment={experimentId} data-variant={variant}>
      {children}
    </div>
  );
}

// Usage: Airbnb's search refinement test
function AirbnbSearch() {
  return (
    <ExperimentWrapper experimentId="search-filters-redesign">
      <SearchPage />
    </ExperimentWrapper>
  );
}
```

---

#### 4. Microfrontends (Module Federation)

**Real case: Netflix's team-based architecture**

```js
// webpack.config.js - Platform (host)
module.exports = {
  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: "auto",
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "netflix_platform",
      filename: "remoteEntry.js",
      remotes: {
        // Teams can deploy independently
        "@netflix/recommendations":
          "recommendations@https://recommendations-service.netflix.com/remoteEntry.js",
        "@netflix/playback":
          "playback@https://playback-service.netflix.com/remoteEntry.js",
        "@netflix/auth": "auth@https://auth-service.netflix.com/remoteEntry.js",
      },
      shared: {
        react: { singleton: true, requiredVersion: "^18" },
        "react-dom": { singleton: true, requiredVersion: "^18" },
      },
    }),
  ],
};

// Home page - loads micro-apps dynamically
function HomePage() {
  const RecommendationsModule = lazy(
    () => import("@netflix/recommendations/RecommendationsFeed"),
  );
  const PlaybackModule = lazy(() => import("@netflix/playback/VideoPlayer"));

  return (
    <Suspense fallback={<Skeleton />}>
      <div>
        <RecommendationsModule />
        <PlaybackModule />
      </div>
    </Suspense>
  );
}

// Benefits:
// 1. Teams can deploy independently (3-5 min vs 2 hours)
// 2. Technology freedom (one team uses Vue, another React)
// 3. Parallel development
// 4. Isolated failures
```

---

## 🎨 Design Exercise

### Real-world Case Studies

#### Case Study 1: Multi-tenant SaaS Dashboard (Figma's Architecture)

**Architecture:**

```
figma-workspace/
├── shared/
│   ├── components/      # Shared across all tenants
│   ├── hooks/
│   ├── utils/
│   └── types/
├── features/
│   ├── editor/
│   │   ├── components/
│   │   ├── canvases/
│   │   ├── layers-panel/
│   │   └── hooks/
│   ├── collaboration/
│   │   ├── realtime-sync/
│   │   ├── cursors/
│   │   └── comments/
│   ├── teams/
│   │   ├── tenant-isolation/
│   │   ├── permissions/
│   │   └── billing/
│   └── workspace/
│       ├── project-list/
│       └── settings/
└── layout/
    └── tenant-wrapper.tsx
```

**Tenant Isolation Pattern:**

```jsx
// TenantContext.tsx - Isolate tenant data
const TenantContext = createContext(null);

export function TenantProvider({ tenantId, children }) {
  const [tenantData, setTenantData] = useState(null);

  useEffect(() => {
    // Load tenant-specific config
    fetchTenantConfig(tenantId).then(setTenantData);
  }, [tenantId]);

  return (
    <TenantContext.Provider value={tenantData}>
      {children}
    </TenantContext.Provider>
  );
}

// useTenantisolation.ts
export function useTenantIsolation() {
  const tenantContext = useContext(TenantContext);
  const { user } = useAuth();

  // Prefix all queries with tenantId
  const queryWithTenant = (key) => [tenantContext.id, ...key];

  // Validate user can access tenant
  if (user.tenantId !== tenantContext.id) {
    throw new Error("Unauthorized");
  }

  return { tenantId: tenantContext.id, queryWithTenant };
}

// Usage in features
function EditorCanvas() {
  const { tenantId, queryWithTenant } = useTenantIsolation();

  const { data: canvas } = useQuery({
    queryKey: queryWithTenant(["canvas", canvasId]),
    queryFn: () => fetchCanvas(tenantId, canvasId),
  });

  return <Canvas data={canvas} />;
}
```

**Permission-based Visibility:**

```jsx
// permissions/usePermission.ts
export function usePermission(resource, action) {
  const { user } = useAuth();
  const { tenantId } = useTenantIsolation();

  // Check user's role and permissions
  const hasPermission = user.roles.some((role) => {
    return checkRolePermission(role, resource, action, tenantId);
  });

  return hasPermission;
}

// Usage
function DocumentEditor({ docId }) {
  const canEdit = usePermission("documents", "edit");
  const canShare = usePermission("documents", "share");
  const canDelete = usePermission("documents", "delete");

  if (!canEdit) {
    return <ReadOnlyViewer docId={docId} />;
  }

  return (
    <Editor>
      {canShare && <ShareButton />}
      {canDelete && <DeleteButton />}
    </Editor>
  );
}
```

**Data Isolation:**

```jsx
// Data only loads for current tenant
function useTenantidata(key) {
  const { tenantId } = useTenantIsolation();

  return useQuery({
    queryKey: [tenantId, key],
    queryFn: () =>
      fetch(`/api/tenants/${tenantId}/${key}`).then((r) => r.json()),
    // Automatic tenant isolation - changing tenant refetches
  });
}
```

---

#### Case Study 2: Role-based UI System (Netflix's Approach)

**Permission Hierarchy:**

```
Netflix Roles:
├── Admin
│   ├── Can manage teams
│   ├── Can publish content
│   ├── Can view analytics
│   └── Full access
├── Creator
│   ├── Can create/edit content
│   ├── Can view own analytics
│   └── Limited access
├── Viewer
│   ├── Can watch content
│   └── Basic access
└── Guest
    └── Read-only access
```

**Implementation:**

```jsx
// permissions/roleDefinitions.ts
const rolePermissions = {
  admin: {
    "content.create": true,
    "content.edit": true,
    "content.publish": true,
    "content.delete": true,
    "users.manage": true,
    "analytics.view": true,
    "analytics.export": true,
  },
  creator: {
    "content.create": true,
    "content.edit": true,
    "content.publish": true,
    "content.delete": false,
    "users.manage": false,
    "analytics.view": true,
    "analytics.export": false,
  },
  viewer: {
    "content.create": false,
    "content.view": true,
    "analytics.view": false,
  },
};

// UI components that adapt to permissions
function ContentDashboard() {
  const user = useAuth();
  const permissions = rolePermissions[user.role];

  return (
    <div>
      <SearchBar />

      {permissions["content.create"] && <CreateContentButton />}

      <ContentList
        onEdit={permissions["content.edit"] ? handleEdit : undefined}
        onDelete={permissions["content.delete"] ? handleDelete : undefined}
      />

      {permissions["analytics.view"] && (
        <AnalyticsWidget canExport={permissions["analytics.export"]} />
      )}
    </div>
  );
}
```

**Dynamic Feature Rendering:**

```jsx
// ProtectedFeature.tsx
export function ProtectedFeature({
  requiredPermission,
  fallback = null,
  children,
}) {
  const user = useAuth();

  if (!hasPermission(user, requiredPermission)) {
    return fallback || <LimitedAccessNotice />;
  }

  return children;
}

// Usage
<ProtectedFeature requiredPermission="users.manage">
  <UserManagementPanel />
</ProtectedFeature>

<ProtectedFeature
  requiredPermission="content.publish"
  fallback={<SubmitForReviewButton />}
>
  <PublishButton />
</ProtectedFeature>
```

---

#### Case Study 3: Feature-based Folder Structure (Uber's Architecture)

**Scalable to 100+ features:**

```
src/
├── core/                 # App-wide utilities (no features depend on this)
│   ├── api/
│   ├── hooks/
│   ├── context/
│   └── types/
│
├── features/             # Feature modules (complete vertical slices)
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   └── index.ts (export only public components)
│   │   ├── hooks/
│   │   │   └── useAuth.ts (exported for other features)
│   │   ├── types/
│   │   │   └── index.ts (exported types)
│   │   ├── services/
│   │   │   ├── authService.ts
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   ├── LoginForm.test.tsx
│   │   │   └── authService.test.ts
│   │   └── index.ts (public API barrel export)
│   │
│   ├── rides/
│   │   ├── components/
│   │   │   ├── RideCard/
│   │   │   │   ├── RideCard.tsx
│   │   │   │   ├── RideCard.module.css
│   │   │   │   ├── RideCard.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── RideHistory/
│   │   │   ├── RideMap/
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useRideHistory.ts
│   │   │   ├── useRideTracking.ts
│   │   │   └── index.ts
│   │   ├── pages/
│   │   │   └── RidesPage.tsx
│   │   ├── services/
│   │   │   ├── rideService.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── Ride.ts
│   │   │   ├── RideStatus.ts
│   │   │   └── index.ts
│   │   ├── store/
│   │   │   ├── rideStore.ts
│   │   │   └── index.ts
│   │   └── index.ts (ONLY exports public API)
│   │
│   ├── payments/
│   ├── locations/
│   ├── reviews/
│   ├── notifications/
│   └── ... (100+ more features)
│
├── shared/                # ONLY components used in 2+ features
│   ├── components/
│   │   ├── Button/
│   │   ├── Modal/
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useLocalStorage.ts
│   │   └── index.ts
│   └── utils/
│
└── layout/              # Top-level layout, routing
    ├── MainLayout.tsx
    ├── routes.ts
    └── App.tsx
```

**Avoiding Circular Dependencies:**

```jsx
// ❌ WRONG: feature/rides imports from feature/payments
// feature/rides/RideCard.tsx
import { PaymentBadge } from "../payments/components"; // ❌ Cross-feature

// ✅ CORRECT: Extract shared component
// shared/components/PaymentBadge.tsx
export function PaymentBadge({ method }) {
  return <Badge>{method}</Badge>;
}

// Both features import from shared
// feature/rides/RideCard.tsx
import { PaymentBadge } from "../../shared/components";

// feature/payments/PaymentSummary.tsx
import { PaymentBadge } from "../../shared/components";
```

**Public API Pattern:**

```jsx
// feature/rides/index.ts - BARREL EXPORT (public API)
export { useRideHistory } from "./hooks";
export { RideCard } from "./components";
export { RideStatus } from "./types";
export { default as RidesPage } from "./pages";

// Only export what other features need
// These are PRIVATE - cannot be imported from other features:
// - services/
// - store/ internals
// - private components

// feature/rides/_private/internalHelper.ts
// This file is NEVER exported - truly internal

// Other features use only public API
// payment/services/paymentService.ts
import { useRideHistory } from "features/rides"; // ✅ OK
import RideCard from "features/rides/components/RideCard"; // ❌ WRONG
```

**Testing Boundaries:**

```jsx
// feature/rides/__tests__/RideCard.test.tsx
import { useRideHistory } from "../hooks"; // ✅ Same feature - OK
import { PaymentBadge } from "../../shared/components"; // ✅ Shared - OK
import { rideService } from "../services"; // ✅ Same feature - OK

// ❌ Would fail linting
// import { paymentService } from 'features/payments/services';
```

---

### Your Assignment

Choose ONE case study above and extend it. Document:

**1. Extension Implementation (Add 2-3 new components/features)**

Example: Multi-tenant SaaS - Add "Custom Branding"

```jsx
// feature/branding/hooks/useBrandingConfig.ts
export function useBrandingConfig() {
  const { tenantId } = useTenantIsolation();

  return useQuery({
    queryKey: [tenantId, "branding"],
    queryFn: () =>
      fetch(`/api/tenants/${tenantId}/branding`).then((r) => r.json()),
  });
}

// feature/branding/components/BrandedLayout.tsx
export function BrandedLayout({ children }) {
  const { data: branding } = useBrandingConfig();

  const theme = {
    primaryColor: branding?.colors?.primary || "#3B82F6",
    logo: branding?.logo || "/default-logo.png",
    favicon: branding?.favicon || "/default-favicon.ico",
  };

  return (
    <ThemeProvider theme={theme}>
      <header style={{ backgroundColor: theme.primaryColor }}>
        <img src={theme.logo} alt="Logo" />
      </header>
      <main>{children}</main>
    </ThemeProvider>
  );
}
```

**2. Trade-offs & Decisions**

| Decision                     | Trade-off                                                          |
| ---------------------------- | ------------------------------------------------------------------ |
| Client-side tenant isolation | Fast, instant feedback vs potential security breach if not careful |
| Server validation required   | Extra latency for each request vs guaranteed security              |
| Feature flags enabled        | Flexible rollout vs added complexity                               |
| Global state for tenant ID   | Convenient access vs harder to test in isolation                   |

**3. Scalability Plan for 1M+ Users**

```
Phase 1 (Current: 100K users)
├── Single tenant context provider
├── IndexedDB caching
└── Basic rate limiting

Phase 2 (1M users)
├── Shard tenants across regional servers
├── WebSocket for real-time sync
└── Redis for distributed cache

Phase 3 (10M+ users)
├── Multi-region deployment
├── Event-sourcing for state
└── CQRS pattern for queries
```

---

## 🎯 What You Should Know

### Design Trade-offs (Real Examples)

#### 1. **Scalability vs Complexity**

**Figma's choice: Optimized for 100k+ concurrent users**

```
Choice: Implemented sophisticated conflict-free replicated data type (CRDT)

Pro:
- Can handle thousands of simultaneous edits
- Works offline
- No server bottleneck

Con:
- 10x more complex code
- Harder to debug
- New team members take 3 weeks to understand

Alternative: Traditional OT (Operational Transformation)
- Simpler code, but server must sequence all edits
- Bottleneck at high concurrency
```

#### 2. **Developer Experience vs Bundle Size**

**React Query vs Redux** - Netflix's decision making:

```
React Query
✅ Better DX - hooks are intuitive
✅ Automatic cache management
✅ Built-in loading/error states
✅ Less boilerplate
❌ Larger bundle (~25KB gzipped)

Redux
✅ Smaller bundle (~10KB)
✅ Time-traveling debugger
❌ More boilerplate
❌ Manual cache management
❌ Steeper learning curve

Netflix chose: React Query
Reasoning: At 10M users, 15KB more per user = better UX benefit > bundle cost
```

#### 3. **Real-time Updates vs Network Efficiency**

**Stripe's approach: Billing dashboard**

```
WebSocket approach (Real-time)
✅ Users see balance change instantly
❌ Constant server-client connection
❌ Higher infrastructure costs
❌ More complex error handling

Polling approach (Every 30s)
✅ Simpler to implement
✅ Less resource usage
❌ User sees stale data for up to 30s
❌ Still uses significant bandwidth

Stripe chose: Hybrid
- WebSocket for transactions (real-time critical)
- Polling for analytics (eventual consistency ok)
- WebSocket has 30s fallback to polling if connection lost
```

#### 4. **Consistency vs Availability**

**Twitter's timeline vs Tweets**

```
Consistency (CA system):
- All users see exact same timeline
- Requires database consistency
- Single point of failure risk
- Slower

Availability (AP system):
- Eventual consistency (everyone sees same thing in 1-2 sec)
- Can have temporary differences
- Partition tolerant
- Faster

Twitter chose: AP (Availability + Partition tolerance)
- Why? Users prefer "slightly stale feed" over "feed not loading"
- Read latency more important than immediate consistency
```

---

### Senior-Level Architecture Skills

#### 1. **Architect for 10x Growth**

**Example: Building a video platform (like YouTube)**

```
Start (1M videos)
└── Single PostgreSQL server
    └── Indexes on user_id, created_at
    └── Redis cache layer

Growth to 10M videos
└── Shard by user_id
    ├── Partition 1: users 0-100k
    ├── Partition 2: users 100k-200k
    └── ...
    └── New queries now scan less data

Growth to 100M videos
└── Sharding no longer enough
    ├── Implement ElasticSearch for full-text search
    ├── Kafka for events (new video = notify subscribers)
    ├── S3 for video storage (not database!)
    └── CDN for video delivery

Growth to 1B videos
└── Full microservices
    ├── Search service (ElasticSearch)
    ├── Recommendation service (ML model)
    ├── Transcoding service (convert video formats)
    └── Notification service (event-driven)
```

#### 2. **Making Informed Trade-off Decisions**

**Framework: Weighing impact**

```javascript
function evaluateArchitecture(decision) {
  return {
    // 1. Quantify the trade-off
    performanceGain: measure("latency reduction"),
    complexityIncrease: measure("lines of code"),
    developmentTime: estimate("weeks"),

    // 2. Calculate ROI
    ROI = performanceGain / (complexityIncrease + developmentTime),

    // 3. Consider team size
    if (teamSize < 5) {
      // Simpler is better - you'll maintain it forever
      return simpleApproach;
    }

    // 4. Consider scale
    if (usersPerMonth > 10M) {
      // Must optimize for performance
      return optimizedApproach;
    }

    // 5. Consider company stage
    if (startup) {
      // Shipping matters more than optimization
      return fastToShip;
    } else {
      // Legacy matters - think long-term
      return maintainable;
    }
  }
}
```

#### 3. **Design for Team Scaling**

**Problem: 3 engineers → 50 engineers on same codebase**

```
Without proper architecture:
- Merge conflicts daily
- Circular dependency nightmares
- Step on each other's toes
- Launch slows from daily to weekly

With feature-based architecture:
Team Structure:
├── Auth team (4 engineers)
│   └── Owns features/auth/* exclusively
├── Payment team (5 engineers)
│   └── Owns features/payments/* exclusively
├── Recommendations team (6 engineers)
│   └── Owns features/recommendations/* exclusively
└── Platform team (3 engineers)
    └── Maintains shared/core/*

Benefits:
✅ Teams work in parallel (no merge conflicts)
✅ Can have different tech stacks per feature
✅ Can deploy independently
✅ Can increase to 100 engineers without chaos
```

**Communication through contracts:**

```jsx
// Payment team defines their public API
// payments/index.ts
export { usePaymentMethods } from './hooks';
export { PaymentForm } from './components';
export type { Payment, PaymentMethod } from './types';

// Other teams can only use this,
// Implementation changes won't break them
// Checkout team using it
import { usePaymentMethods, PaymentForm } from 'features/payments';
```

#### 4. **Why Architecture Matters (Real Business Impact)**

**Netflix case study:**

```
Before (Monolithic frontend):
- Deploy time: 2 hours
- Risk per deploy: 7+ teams affected
- Failed deploys per week: 2-3
- Can add features: 1-2 per week

After (Microfrontends):
- Deploy time: 8 minutes
- Risk per deploy: 1 team only
- Failed deploys per week: 0.1
- Can add features: 10-15 per week
- Time to market: 10x faster

Business impact:
- Launch 100+ new features/year (vs 50)
- Revenue from personalization: +15%
- Reduced bugs by 70%
- Team satisfaction increased
```

---

## 💡 Real-world Implementation Checklist

- [ ] Choose your architecture pattern (state management / feature structure)
- [ ] Build 3 real components using that pattern
- [ ] Document trade-offs made vs alternatives
- [ ] Plan for 10x growth
- [ ] Design for a team of 20+ (not just yourself)
- [ ] Implement error boundaries and loading states
- [ ] Add comprehensive error handling
- [ ] Write integration tests between features
- [ ] Profile performance (use Chrome DevTools)
- [ ] Plan monitoring and analytics strategy
- [ ] Document onboarding for new team members

---

## 🔍 Self-Assessment

**Junior (0-1 year)**

- Understands component state vs global state
- Can use React Query for data fetching
- Knows what prop drilling is

**Mid-level (1-3 years)**

- Designs feature-based folder structures
- Implements optimistic updates
- Considers cache invalidation strategies
- Reduces bundle size consciously

**Senior (3+ years)**

- Designs for 100+ person teams
- Anticipates scaling to 10M+ users
- Makes architecture decisions with incomplete data
- Explains trade-offs clearly to leadership
- Refactors legacy code without rewriting
- Mentors junior devs on architecture patterns

**Staff+ (5+ years)**

- Sets architecture standards across company
- Anticipates future needs 2-3 years out
- Talks to customers about their pain points
- Biases architecture decisions toward team growth
- Creates reusable patterns/libraries for other teams

---

**Build systems that scale with your team and users! 🚀**
