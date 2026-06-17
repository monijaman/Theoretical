# Architecture & Scalable Frontend Systems

## ⚡ Quick Start: Real-World Analogies

Master system architecture with these simple mental models:

- **State Colocation:** Like keeping your car keys in a bowl by the door instead of in a safety deposit box at the bank. If you use them every day at home (local state), keep them close.
- **Server State (TanStack Query):** Like a "Smart Fridge". It knows when you're out of milk (stale data), automatically orders more if you're low (background refetching), and keeps a backup in the freezer (caching) so you don't have to go to the store every time you want a glass.
- **Optimistic Updates:** Like telling your friend "I'll be there in 5 minutes" before you've even left the house. You assume it'll work out, and if you get a flat tire, you call them back and "rollback" the promise. (Instant UI feedback).
- **Feature Flags:** Like a "Light Switch" for your house's new deck. You build the whole deck (deploy the code), but you don't turn on the lights (enable the feature) until the party starts. You can also turn them off instantly if it starts raining.
- **Microfrontends:** Like a "Mall". Multiple different stores (teams) all coexist in the same building (the app). Each store has its own staff, inventory, and design, but to the customer, it's one seamless experience.

---

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

**What this means:** Not all state is created equal. Server state (user's posts, comments) is different from UI state (is modal open?, which item is hovered?). Many developers wrongly store server state in global Redux, causing sync issues. The solution: use React Query for server state (it handles caching, refetching, invalidation) and useState for UI state (which is cheap). This separation is the foundation of modern React apps.

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

**What this means:** TanStack Query (React Query) is the library that handles server state correctly. It automatically deduplicates requests, caches data, refetches in the background, and handles stale data. Instagram has 10M users viewing feeds—without good caching, that's millions of wasted API calls. TanStack Query prevents this. It's like having a smart cache that knows when to invalidate.

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

**What this means:** Optimistic updates make apps feel instant by updating the UI immediately while the request is still in flight. If it fails, rollback. If it succeeds, confirm. Users see changes instantly instead of waiting for server (which can take 200-500ms). This is the difference between an app feeling sluggish and feeling responsive.

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

**What this means:** Users don't always have internet. Offline-first apps save data locally (IndexedDB), continue working without network, and sync when connection returns. Google Docs, Figma, and Notion all do this. The key: never lose user data, even if server is down. When offline, the app is still fully functional.

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

**What this means:** Feature flags let you control what features users see WITHOUT deploying new code. You can roll out features to 1% of users, measure impact, then expand to 100%. Or instantly disable broken features in production without rollback. This is the difference between "deploy=risky" and "deploy=safe". Also enables A/B testing at scale.

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

**What this means:** Large apps are built by many teams. Microfrontends let each team own their own UI code, deploy independently, and even use different frameworks. Instead of one giant bundle, you have many small independent bundles that load together. Netflix went from 2-hour deploys to 8-minute deploys using this. Teams never step on each other's toes.

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

**What this section is for:** Real architecture decisions come from real constraints, not theory. Here we show how FAANG companies architect their systems. Study these patterns, understand WHY they made these choices, then apply them to your projects.

### Real-world Case Studies

#### Case Study 1: Multi-tenant SaaS Dashboard (Figma's Architecture)

**What this teaches:** Multi-tenant systems are hard because tenant data must be isolated (company A cannot see company B's designs). Figma serves 10M users across thousands of teams. The patterns here (TenantContext, permission hooks, query key prefixing) are standard in SaaS. Understanding this is critical for scaling B2B apps.

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

**What this teaches:** Most apps have permissions (admin vs user vs viewer). Netflix has creators, publishers, and viewers with different capabilities. Building permission systems isn't hard IF you plan early. The pattern: define roles upfront, make component rendering conditional on permissions, never hide secrets (permissions must be checked server-side). This is how you build systems that scale.

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

**What this teaches:** Uber has 3,000+ engineers. They can't all work in a monolith. Feature-based structure lets each team own their feature completely (code, tests, deployment). Uber's Rides team, Payments team, and Reviews team never merge conflicts. This is why Google, Amazon, Netflix, and Uber all use similar structures. At scale, architecture IS organizational structure.

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

#### What does "extend it" mean?

Extending means:

1. Take the core architecture pattern shown in the case study
2. Add 2-3 realistic features that would naturally exist in that system
3. Show how your new features interact with the existing architecture
4. Identify potential bottlenecks and how to handle them
5. Plan for real-world constraints (permissions, caching, performance)

**Bad extension:** Just copying the example code without thinking about integration

**Good extension:**

- Adding a feature that challenges the architecture (forces you to reconsider design)
- Showing conflict resolution (what if two things want different state?)
- Considering real-world constraints (offline users, slow networks, permissions)
- Documenting why you made specific choices

---

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

### Understanding Architecture Decisions

Every architecture decision involves trade-offs. The goal isn't to find the "perfect" solution—it's to understand the trade-offs and make a deliberate choice that fits YOUR constraints.

**Key questions to ask:**

- What are we optimizing for? (performance, scalability, maintainability, time-to-market?)
- What are the constraints? (team size, budget, time, user scale?)
- What will break first if we grow 10x? (database, API, UI, team coordination?)
- Can we change this later? (Can we refactor from Redux to React Query? Can we split a monolith?)

---

### Design Trade-offs (Real Examples)

#### 1. **Scalability vs Complexity**

**The dilemma:** Handling 100k concurrent users requires sophisticated algorithms. But complex code breaks, takes weeks to debug, and new hires take months to understand. You can't have both. Real companies choose based on their users.

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

**The dilemma:** Better DX means more abstraction, bigger code. Smaller bundles means writing more low-level code. At 1 user it doesn't matter. At 10M users, even 1KB saved = huge server costs. Companies weigh team happiness (DX) vs infrastructure costs (bundle size).

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

**The dilemma:** Real-time feels instant (WebSocket always connected) but costs money and is fragile. Polling is cheap and robust but has latency windows (user sees stale data for 30 seconds). Different features need different approaches.

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

**The dilemma:** (From CAP theorem) You can't have both perfect consistency + always available. Consistent systems are slow and fragile. Available systems have stale data. Companies choose based on what users value.

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

**What this means:** When you're building something TODAY, you should think about what breaks when you go from 100K → 1M → 10M users. The key is NOT to build for 10M users now (that's overengineering), but to build in a way that CAN scale to 10M without complete rewrite.

**Example: Building a video platform (like YouTube)**

```
Start (1M videos) - 3 months old startup
└── Single PostgreSQL server
    ├── All data in one table
    ├── Basic indexes on user_id, created_at
    └── Redis cache for Hot videos
Problem at scale: Queries slow down, disk space becomes issue

Growth to 10M videos - 12 months in
└── Database sharding by user_id
    ├── Shard 1: users 0-100k → videos uploaded by them
    ├── Shard 2: users 100k-200k → videos uploaded by them
    ├── Each shard 1/50 of data now
    └── Queries 50x faster on same hardware
Solution: Changes frontend little (still query same API)
Problem at scale: Joining data across shards is complex

Growth to 100M videos - 3 years in
└── Full polyglot architecture
    ├── Write path: Videos → Kafka → S3 + ElasticSearch
    ├── Read path: Highly optimized queries, cached results
    ├── ElasticSearch for search (PostgreSQL can't do relevance)
    ├── S3 for actual video files (not database!)
    └── CDN for delivery (content served globally)
Solution: Specific tools for specific jobs
Problem at scale: Coordinating across many services

Growth to 1B videos - 10 years in
└── Full microservices + event-driven
    ├── Metadata service (database info)
    ├── Search service (ElasticSearch cluster)
    ├── Recommendation service (ML, separate team)
    ├── Transcoding service (convert video formats)
    ├── Notification service (event-driven pipeline)
    ├── Analytics service (tracking user behavior)
    └── Each team owns its service independently
Solution: Teams can scale independently, deploy independently
Problem at scale: Coordinating between teams, debugging becomes complex
```

**Key insight:** At the start, you don't need sharding. But if you build WITHOUT thinking about sharding, you'll need a complete rewrite. The trick is to:

1. Build simple systems first (PostgreSQL)
2. But structure code so sharding is "just" a configuration change later
3. Example: Instead of `fetchUserVideos(userId)`, build with abstraction layer that can route to correct shard

**Frontend implications of backend scaling:**

From frontend perspective, most of this is invisible—you call `/api/videos/{videoId}` whether it's on shard 1 or shard 100. The backend handles routing. But smart frontend developers:

- Cache aggressively (if backend is distributed, requests are slow)
- Use pagination (don't load 1B videos at once)
- Preload next page (user won't see loading spinners)
- Track which videos are coming from which region (serve from nearest CDN)

#### 2. **Making Informed Trade-off Decisions**

**What this means:** You can't optimize for everything. Cache could be faster but uses more memory. Microservices add flexibility but increase complexity. The senior skill is: know what you're optimizing for, measure impact, and explain it to leadership.

**Real example: Shopify's decision on real-time inventory**

```
Option A: Real-time inventory (WebSocket)
✅ User never sees overbooking
❌ Infrastructure costs: $2M/year for global WebSocket servers
❌ If WebSocket connection drops, user is stuck
❌ Complex failover logic

Option B: Eventual consistency (checks every 5 seconds)
✅ Simpler code, cheaper infrastructure (~$100K/year)
✅ Fallback if connection error: just refresh page
❌ Small window where backend sold item but frontend shows available
    → 0.1% of transactions have overstock, manual refund

Option C: Hybrid (WebSocket with fallback)
✅ Real-time for power users (stored data)
✅ 5-sec polling for mobile users (saves bandwidth)
✅ Costs: $500K/year (middle ground)

Shopify chose: Option C
Why? Analysis showed:
- Power users (stored items in checkout) worth optimizing for (5% of traffic, 30% of revenue)
- Mobile users don't need real-time (they're browsing, not seriously buying)
- Extra $400K/year cost < loss from 0.1% overstock refunds (which damage trust)
```

**Framework: Weighing impact**

```javascript
function evaluateArchitecture(decision) {
  return {
    // 1. Quantify the trade-off
    performanceGain: measure("latency reduction"),
    complexityIncrease: measure("lines of code"),
    developmentTime: estimate("weeks"),
    infrastructureCost: estimate("$/year"),

    // 2. Calculate ROI
    estimatedRevenueImpact: performanceGain * userConversionRate,
    totalCost = infrastructureCost + (developmentTime * engSalary/year),
    ROI = estimatedRevenueImpact / totalCost,

    // 3. Consider team size
    if (teamSize < 5) {
      // Simpler is better - you'll maintain it forever
      // Bugs compound with small teams
      return simpleApproach;
    }

    // 4. Consider scale
    if (usersPerMonth > 10M) {
      // Must optimize for performance or costs explode
      // Fixed overhead becomes smaller per user
      return optimizedApproach;
    }

    // 5. Consider company stage
    if (startup) {
      // Shipping speed matters most - can refactor later
      // Get to product-market fit first
      return fastToShip;
    } else {
      // Mature company - technical debt is expensive long-term
      // Think architectural stability
      return maintainable;
    }

    // 6. Consider customer expectations
    if (isMarketplaceBusiness) {
      // Real-time matters - drives user trust (Amazon, Uber)
      return realTime;
    } else if (isCMS || B2B) {
      // Eventual consistency fine - users expect refreshing page
      return eventual;
}
```

#### 3. **Design for Team Scaling**

**What this means:** Code isn't just for computers—it's for humans to collaborate on. Bad architecture doesn't just hurt performance, it prevents teams from scaling. Two experienced engineers on same monolith might fight over code ownership constantly. Get architecture right, and 50 engineers can work in parallel.

**Real scenario: Scaling from 5 to 50 engineers**

```
WITHOUT proper architecture (Monolithic team):
Week 1-4: 5 engineers, no coordination issues
  ├── Can all understand the 20K lines of code
  ├── Can deploy together
  └── Fast: launch features in 2 weeks

Week 5-12: Hire 10 more (15 engineers total)
  ├── Code reviews take 3 days (fewer people understand each section)
  ├── Merge conflicts daily in shared files
  ├── Launch speed: 4 weeks (need team consensus)
  └── Bugs increase: "Where does X touch Y?")

Week 13-26: Hire 20 more (35 engineers total)
  ├── Code reviews take week (bottleneck on seniors)
  ├── Merge conflicts paralyze team
  ├── Launch speed: 2 months (need buy-in from multiple teams)
  ├── Bugs spike 50% (spaghetti code, unexpected interactions)
  └── Team morale down (engineers step on each other constantly)

Week 27+: Try to hire more (stop hiring, too chaotic)
  ├── Core issue: The ARCHITECTURE is the bottleneck, not people
  └── Refactoring takes 6+ months

WITH proper feature-based architecture:
Week 1-4: 5 engineers
  ├── Each engineer owns a feature folder
  ├── Can ship independently
  └── Launch speed: 2 weeks

Week 5-12: Hire 10 more (15 engineers)
  ├── Form feature teams (Auth team: 3 people, Payment: 3 people, etc)
  ├── No merge conflicts (each team owns their folder)
  ├── Teams can deploy independently (Auth launches, Payment launches)
  ├── Launch speed: still 2 weeks (teams launch in parallel)
  └── Onboarding new person: 2 days (one feature, not whole system)

Week 13-26: Hire 20 more (35 engineers)
  ├── Teams grow: Auth: 5 people, Payment: 5 people, etc.
  ├── Teams rarely see other teams' code
  ├── Deployment: each team owns their deploy (Auth launches without needing Payment approval)
  ├── Launch speed: still 2 weeks (parallel progress)
  ├── Bugs down (isolation = fewer side effects)
  └── Team morale: engineers feel ownership (this is MY feature, not "we broke something somewhere")

Week 27+: Scaling to 100+ engineers
  ├── Platform becomes service-oriented
  ├── Auth service, Payment service, Recommendations service (each 5+ engineers)
  ├── Zero merge conflicts (different services)
  ├── If Auth breaks, payments still work
  ├── Can fire/hire engineers without affecting other teams
  └── Business can add new products without full rewrite
```

**Problem: How to prevent chaos as teams grow?**

```jsx
// The "public contract" pattern - prevents breaking changes

// ✅ payments/index.ts - what other features can use
export { usePaymentMethods } from "./hooks";
export { PaymentForm } from "./components";
export type { Payment, PaymentMethod } from "./types";

// ❌ payments/services/paymentService.ts - PRIVATE!
// Other features cannot import this directly
// If you change implementation, no one breaks

// Enforcement: ESLint rules
// "error": "No imports from feature internals"
// import { paymentService } from 'features/payments/services'; // ❌ FAILS
// import { usePaymentMethods } from 'features/payments'; // ✅ OK
```

**How communication happens between teams:**

```
Before (Monolithic):
Payment Team wants to notify Commerce Team about failed payment
→ They message Slack, discuss 30 min
→ Agree on shared types in shared/types.ts
→ Code a function in shared/
→ Both teams depend on this function now
→ Changing it becomes nightmare (affects both teams)

After (Feature-based):
Payment Team publishes an EVENT when payment fails
→ Commerce Team LISTENS to that event
→ No shared code, just contracts
→ Payment Team can change implementation without telling Commerce
→ If Commerce Team doesn't care about event, no impact
→ Teams scale independently
```

#### 4. **Why Architecture Matters (Real Business Impact)**

**What this means:** Architecture isn't theoretical—it directly impacts business metrics (revenue, speed to market, team size, reliability). Good architecture costs more upfront but pays dividends. Bad architecture feels cheap at first but compounds into a nightmare. Let's look at real numbers.\n\n**Netflix case study: Impact of moving to microfrontends**

```
Before (Monolithic frontend) - Shared codebase:
├── Deploy time: 2 hours (had to test with all teams' features together)
├── Risk per deploy: 7+ teams affected (payment change breaks recommendations?)
├── Failed deploys per week: 2-3 (needed rollbacks, hotfixes)
├── Mean Time To Recover: 45+ minutes (debugging shared code is hard)
├── Can add features: 1-2 per week (slow iteration, blocked on teams)
├── Engineering time on deployment: 2 days/week/team (so much coordination!)
└── Bugs shipped to production: 5-10 per day

After (Microfrontends) - Independent deployments:
├── Deploy time: 8 minutes (just your team's features tested)
├── Risk per deploy: 1 team only (recommendations broken? Payment team doesn't care)
├── Failed deploys per week: 0.1 (fewer things to break)
├── Mean Time To Recover: 5 minutes (roll back just your service)
├── Can add features: 10-15 per week (parallel development)
├── Engineering time on deployment: 2 hours/week/team (mostly automated)
└── Bugs shipped to production: 1-2 per day

Financial impact over 1 year:
├── New features launched: +60 features (100 vs 50) × $500K value = +$30M
├── Bugs reduced: -60% bugs × $50K cost/bug = +$3M savings
├── Faster time-to-market: Personalization features 6 months earlier = +$5M from engagement
├── Team efficiency: 1 engineer-year saved per team (7 teams) = +$1.4M
├── User experience: 20% faster page loads (less code) = +5% retention = +$50M
└── Total business impact: ~+$90M in first year

Cost of refactoring:
├── Engineering time (3 engineers × 6 months): $500K
├── Infrastructure setup (new CDN, module federation): $100K
├── Training teams on new pattern: $50K
└── Total cost: $650K

ROI: $90M value / $650K cost = 138x return
```

**Why the impact is so large:**

1. **Speed to market** - Launch 2x as many features (personalization matters)
2. **Reliability** - Fewer bugs means better user experience
3. **Team scaling** - Can hire 50 engineers instead of 7 (more features faster)
4. **Compounding effect** - More features → more user engagement → more revenue

**Small companies:** "Should I do this?"

- Probably not yet. If you have < 10 engineers, overhead of architecture isn't worth it
- When you hit 20+ engineers, the pain becomes worth it

**Scaling companies:** "How do I plan for this?"

- Don't do it at day 1, but build so you CAN do it later
- Example: Use feature-based folder structure from start (low overhead, huge payoff when scaling)
- Avoid: Monolithic index.tsx that imports everything (can't split later without rewrite)

```

---

## 💡 Real-world Implementation Checklist

Follow this when building your project:

**Phase 1: Foundation (Week 1-2)**
- [ ] Choose your architecture pattern (TanStack Query + feature-based folders)
- [ ] Create folder structure (don't put everything in `src/`)
- [ ] Set up ESLint rules to enforce boundaries (no cross-feature imports of internals)
- [ ] Document public API for each feature (what can other features import?)

**Phase 2: Core Implementation (Week 3-4)**
- [ ] Build 3-5 core components using the pattern
- [ ] Implement optimistic updates for mutations (make UI feel fast)
- [ ] Set up error boundaries (one component error doesn't crash app)
- [ ] Add loading states everywhere (don't show blank screen)

**Phase 3: Advanced Features (Week 5-6)**
- [ ] Implement cache invalidation strategy (when to re-fetch data)
- [ ] Add offline support (use IndexedDB for persistence)
- [ ] Profile performance with Chrome DevTools (find bottlenecks)
- [ ] Write integration tests between features (features shouldn't break each other)

**Phase 4: Production Readiness (Week 7-8)**
- [ ] Add comprehensive error handling (what happens on network error? Server error?)
- [ ] Set up monitoring (track errors in production)
- [ ] Plan analytics strategy (how to measure feature success)
- [ ] Document onboarding for new team members (how to add a feature?)

**Phase 5: Scaling (Week 9+)**
- [ ] Plan for 10x growth (what breaks at 1M users?)
- [ ] Consider permission system (different features for different users)
- [ ] Measure bundle size (delete unused code)
- [ ] Plan feature flags (how to gradually roll out features)

---

## 🔍 Self-Assessment: Where Are You?

### Junior Engineer (0-1 year)

**What you know:**
- Understands component state vs global state
- Can use React Query for data fetching
- Knows what prop drilling is and how to avoid it
- Can implement a CRUD feature top-to-bottom

**Example interview question:**
> "You need to add a user profile page. Walk me through how you'd structure this."
- Expected answer: Create a feature folder, use hooks for data fetching, handle loading/error states

**To level up to Mid-level:**
- Study: React Query cache invalidation (not just basic queries)
- Build: A real App with 3+ features (not components in isolation)
- Learn: How permissions affect component rendering
- Understand: Why some state lives where it does

---

### Mid-level Engineer (1-3 years)

**What you know:**
- Designs feature-based folder structures
- Implements optimistic updates (shows change immediately)
- Considers cache invalidation strategies (what makes data stale?)
- Reduces bundle size consciously (not shipping unused code)
- Mentors junior engineers on architecture
- Handles complex state scenarios (offline sync, conflicts)

**Example interview question:**
> "Design a comment system for a social media app. Users should see their comment immediately after posting, even on slow networks. Walk me through caching, error handling, and architecture."
- Expected answer: Optimistic updates, cache invalidation on success, rollback on failure, feature-based structure

**To level up to Senior:**
- Study: Distributed systems basics (eventual consistency, CAP theorem)
- Build: Multi-tenant application or offline-first app
- Learn: How to refactor without rewriting (incrementally improve architecture)
- Understand: Trade-offs between consistency and performance

---

### Senior Engineer (3+ years)

**What you know:**
- Designs for 100+ person teams (architecture prevents chaos)
- Anticipates scaling to 10M+ users (not just today, but future)
- Makes architecture decisions with incomplete data (no perfect answer)
- Explains trade-offs clearly to leadership (why this decision?)
- Refactors legacy code without rewriting (incremental improvements)
- Mentors mid-level devs on architecture patterns
- Predicts what breaks at each 10x scale increase

**Example interview question:**
> "Design Instagram's feed architecture. For each phase of growth (1M users → 100M users → 1B users), explain how the architecture changes and why."
- Expected answer: Single PostgreSQL → sharding → microservices, explains what breaks at each stage, considers team structure, discusses trade-offs

**Example real-world scenario:**
> "Our team is growing from 5 to 30 engineers. The monolithic codebase is slowing us down. Design a refactoring strategy."
- Expected answer: Feature-based structure, team ownership, public APIs, parallel development, phased refactor (not rewrite)

**To level up to Staff+:**
- Study: System design at scale (distributed databases, event-driven architecture)
- Build: Architecture that scales from startup to enterprise
- Learn: How business strategy affects architecture decisions
- Understand: Hiring, retention, and team dynamics as architecture problem

---

### Staff+ Engineer (5+ years)

**What you know:**
- Sets architecture standards across entire company
- Anticipates future needs 2-3 years out (not just next quarter)
- Talks to customers about pain points and bakes them into architecture
- Biases architecture decisions toward team growth (org structure mirrors code structure)
- Creates reusable patterns/libraries for other teams
- Influences company strategy with technical insights
- Knows when to say "no" to refactoring (keep shipping)

**Example interview question:**
> "You're now VP of Engineering at a 50-person startup. The CEO wants to add a new product line. How does the architecture need to change? What organization structure do you recommend?"
- Expected answer: Considers team growth, product strategy, technical debt, time to market, hiring timeline, risk of new product affecting existing product

**Example real-world scenario:**
> "The company is going from $1B to $10B in revenue. What architectural changes do you foresee? What should we invest in now vs later?"
- Expected answer: Predicts what breaks, plans infrastructure investment, considers talent (can we hire/retain engineers?), discusses team structure, risk mitigation

---

### How to Progress Through Levels

**Junior → Mid-level (1-2 years):**
- Build multiple real projects (not just side projects)
- Understand why the architecture works, not just how to use it
- Study one FAANG company's architecture pattern deeply
- Write design docs explaining architecture decisions

**Mid-level → Senior (2-3 years):**
- Lead architecture decisions on a project
- Mentor other engineers (document your thinking)
- Work on refactoring (understanding legacy code is crucial)
- Understand trade-offs deeply (talk to PMs, measure impact)

**Senior → Staff+ (2-5 years):**
- Influence company-wide architecture (not just your team)
- Work on multi-year projects (long-term thinking)
- Present to executives (translate tech to business)
- Write RFC (Request For Comments) documents for major decisions
- Build strategic relationships with PMs and founders

---

**Build systems that scale with your team and users! 🚀**
```
