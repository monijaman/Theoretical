# Edge, Platform Engineering & Testing

## ⚡ Quick Start: Real-World Analogies

Understand modern deployment and edge computing with these analogies:

- **Edge Computing:** Like having a local 7-Eleven on every street corner instead of one giant Supermarket in another city.
  - City = Internet
  - Your home = User's browser
  - Local 7-Eleven = Edge server (Cloudflare, Vercel) near you
  - Getting milk: 2 minutes (edge) vs 30 minutes (central server)
  - Result: Faster response times, lower latency

- **Server Components (RSC):** Like a "Pre-Cooked Meal" delivered to your door.
  - Restaurant = Your server (has ingredients, recipes, expertise)
  - Cooking time = Server processing power
  - You eating = Browser rendering
  - **Benefit:** Your browser doesn't waste CPU cooking; you just enjoy it. Page loads faster because browser has less work.

- **Hydration:** Like "Watering a Plant".
  - Dry plant skeleton = HTML sent by server (no interactivity)
  - Water = JavaScript sent by client
  - Live plant = Interactive page (buttons work, forms respond)
  - **Problem:** If watering takes too long, you stare at a dead-looking plant (slow page)

- **Streaming SSR:** Like "Watching a Movie" while it's still downloading.
  - Traditional: Download entire 2GB movie → Then watch
  - Streaming: Watch first scene while rest downloads
  - Result: You see something immediately instead of waiting
  - **Benefit:** Users see content faster (better perceived performance)

- **Middleware:** Like a "Security Guard" at a building entrance.
  - Guard checks your ID (authentication)
  - Redirects you to the right floor (routing)
  - Blocks bad visitors (rate limiting)
  - All before you enter the building (before hitting main server)
  - **Benefit:** Offload work from main server, faster response because it's local

---

## 🚀 Master Advanced Deployment

### React Server Components Deep Dive

**React Server Components (RSCs)** are components that run **exclusively on the server** and never send JavaScript to the browser.

- **React Server Components deeply**
  - **What it is:** Components that render on server, send only HTML to browser
  - **Real-World Example:** Netflix watching a show
    - Traditional: Download the entire movie to your phone (slow)
    - RSC: Stream the show (send only what you're watching right now)
  - **Server vs client component boundaries**

    ```tsx
    // ✅ Server Component (default in app/ directory)
    // Runs on server, zero JavaScript sent to browser
    export default async function ProductCard({ productId }) {
      const product = await db.query(
        `SELECT * FROM products WHERE id = ${productId}`,
      );
      return (
        <div>
          {product.name} - ${product.price}
        </div>
      );
    }

    // ❌ Error: Can't expose database connection to browser
    export default function BadExample() {
      return <div>{process.env.DATABASE_URL}</div>; // Secrets leak!
    }

    // ✅ Client Component (opt-in with "use client")
    // Runs in browser, can have state, event handlers
    ("use client");
    import { useState } from "react";

    export function Counter() {
      const [count, setCount] = useState(0); // ✅ Works
      return <button onClick={() => setCount(count + 1)}>{count}</button>;
    }
    ```

  - **Key differences:**
    | Feature | Server Component | Client Component |
    |---------|-----------------|-----------------|
    | Can call async functions | ✅ Yes | ❌ No |
    | Can access secrets/DB | ✅ Yes | ❌ No |
    | Can use useState, useEffect | ❌ No | ✅ Yes |
    | JavaScript sent to browser | ❌ No | ✅ Yes |
    | Runs closer to database | ✅ Yes | ❌ No (user's computer) |
    | Initial page load speed | ✅ Fast | ❌ Slower |

  - **When to use RSCs**
    - ✅ Fetching data from database
    - ✅ Keeping secrets safe (API keys, database URLs)
    - ✅ Large dependencies (markdown parser, image processing)
    - ✅ Components that just render static content

    ```tsx
    // ✅ Good: Fetch data on server
    export async function BlogPosts() {
      const posts = await fetch("https://api.example.com/posts"); // No exposed credentials
      return (
        <div>
          {posts.map((post) => (
            <article key={post.id}>
              <h2>{post.title}</h2>
              <p>{post.content}</p>
              {/* Use client component for interactive parts */}
              <InteractiveCommentSection postId={post.id} />
            </article>
          ))}
        </div>
      );
    }
    ```

  - **Props serialization:** Only JSON-serializable data can be passed to client components

    ```tsx
    // ✅ Good: Serialize before passing to client
    export async function Page() {
      const user = await fetchUser(); // Object from database
      return <ClientComponent user={JSON.parse(JSON.stringify(user))} />;
    }

    // ❌ Bad: Date objects, functions, etc. can't be serialized
    export async function BadPage() {
      const user = await fetchUser();
      return <ClientComponent user={user} />; // Error: Date objects can't serialize!
    }
    ```

  - **Server/client boundary pattern**

    ```tsx
    // File: app/page.tsx (Server Component)
    import { CommentForm } from "./CommentForm"; // Client component
    import { db } from "@/lib/db";

    export default async function Post({ postId }) {
      // ✅ Run on server
      const comments = await db.query(
        "SELECT * FROM comments WHERE postId = ?",
        [postId],
      );
      const likes = await getPostLikes(postId);

      return (
        <article>
          <h1>My Blog Post</h1>
          <p>Content here...</p>

          {/* Show static comments */}
          <div className="comments">
            {comments.map((comment) => (
              <div key={comment.id}>{comment.text}</div>
            ))}
          </div>

          {/* Use client component only for interactive parts */}
          <CommentForm postId={postId} />
        </article>
      );
    }

    // File: app/CommentForm.tsx (Client Component)
    ("use client");
    import { useState } from "react";
    import { addComment } from "./actions";

    export function CommentForm({ postId }) {
      const [text, setText] = useState("");
      const [loading, setLoading] = useState(false);

      const handleSubmit = async () => {
        setLoading(true);
        await addComment(postId, text); // Call server action
        setText("");
        setLoading(false);
      };

      return (
        <form onSubmit={handleSubmit}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} />
          <button disabled={loading}>
            {loading ? "Posting..." : "Post Comment"}
          </button>
        </form>
      );
    }
    ```

  - **Performance benefits**
    - ✅ Less JavaScript sent to browser (smaller bundle)
    - ✅ Smaller initial page size
    - ✅ Can fetch data on server (no network waterfalls)
    - ✅ Secrets stay on server (no accidental leaks)
    - ✅ Direct database access (no API layer needed)

- **Server Actions**
  - **What it is:** Type-safe functions that run on the server, callable from client
  - **Real-World Example:** Restaurant order form
    - Form on your phone (client)
    - Send order to restaurant (server action)
    - Restaurant prepares it (server runs function)
    - Get confirmation (response back to client)

  ```tsx
  // File: app/actions.ts
  "use server"; // Marks this file as server-only code

  import { db } from "@/lib/db";
  import { revalidatePath } from "next/cache";

  // Define a server action
  export async function createPost(formData: FormData) {
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;

    // ✅ Safe to use database, secrets here
    await db.posts.create({
      title,
      content,
      createdAt: new Date(),
    });

    // Revalidate the posts page
    revalidatePath("/posts");

    return { success: true, message: "Post created!" };
  }

  // Error handling in server actions
  export async function updatePost(id: string, formData: FormData) {
    try {
      if (!id) throw new Error("Post ID required");

      const post = await db.posts.findById(id);
      if (!post) throw new Error("Post not found");

      await db.posts.update(id, {
        title: formData.get("title"),
        content: formData.get("content"),
      });

      return { success: true, message: "Post updated!" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
  ```

  ```tsx
  // File: app/CreatePostForm.tsx (Client Component using server action)
  "use client";
  import { useState } from "react";
  import { createPost } from "./actions";

  export function CreatePostForm() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        // Call server action directly from client!
        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const result = await createPost(formData);

        if (result.success) {
          setStatus("success");
          (e.target as HTMLFormElement).reset();
        } else {
          setStatus("error");
        }
      } catch (error) {
        setStatus("error");
      } finally {
        setLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit}>
        <input name="title" placeholder="Title" required />
        <textarea name="content" placeholder="Content" required />
        <button disabled={loading}>
          {loading ? "Creating..." : "Create Post"}
        </button>
        {status === "success" && <p>✅ Post created!</p>}
        {status === "error" && <p>❌ Error creating post</p>}
      </form>
    );
  }
  ```

  - **Type-safe server actions**

    ```typescript
    // With proper TypeScript, you get autocomplete and type checking
    export async function updateUserRole(
      userId: string,
      role: "admin" | "user" | "moderator",
    ) {
      // TypeScript ensures role is one of the allowed values
      await db.users.update(userId, { role });
      return { success: true };
    }

    // Usage in client component
    await updateUserRole("123", "admin"); // ✅ OK
    await updateUserRole("123", "superadmin"); // ❌ TypeScript error!
    ```

- **Streaming SSR**
  - **What it is:** Send HTML in chunks as components finish rendering, instead of waiting for entire page
  - **Real-World Example:** Restaurant delivery
    - Old way: Chef cooks entire meal → Delivery → Arrives all at once
    - Streaming: Appetizer ready → Send → Wine ready → Send → Main course → Send
    - You eat while waiting for main course (feel faster)

  ```tsx
  // File: app/page.tsx
  import { Suspense } from "react";
  import { Header } from "./Header"; // Fast
  import { SlowContent } from "./SlowContent"; // Takes 5 seconds
  import { Footer } from "./Footer"; // Fast

  export default function HomePage() {
    return (
      <div>
        <Header /> {/* Send immediately */}
        {/* Suspense boundary: Show fallback while loading */}
        <Suspense fallback={<div>Loading posts...</div>}>
          <SlowContent /> {/* This can take 5 seconds */}
        </Suspense>
        <Footer /> {/* Don't wait for slow content, send footer too */}
      </div>
    );
  }

  // SlowContent.tsx
  async function SlowContent() {
    // Simulate slow database query
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const posts = await db.posts.findAll();

    return (
      <div className="posts">
        {posts.map((post) => (
          <article key={post.id}>{post.title}</article>
        ))}
      </div>
    );
  }
  ```

  **What happens:**
  1. Browser receives HTML with header immediately (fast!)
  2. Shows "Loading posts..." fallback UI
  3. After 5 seconds, sends posts HTML
  4. Browser replaces fallback with actual posts
  5. User sees footer and everything rendered

  **Benefits:**
  - ✅ First Contentful Paint (FCP) much faster (see header immediately)
  - ✅ Users think page loads " faster" even if total time is same
  - ✅ Accessibility: Screen readers can start reading immediately
  - ✅ Better perceived performance

### Infrastructure & Runtime

- **Edge runtime**
  - **What it is:** Code that runs on servers distributed around the world (close to users), not in one central location
  - **Real-World Example:** AWS has data centers in Tokyo, London, São Paulo, Sydney
    - User in Japan → Code runs in Tokyo (5ms latency)
    - User in London → Code runs in London (5ms latency)
    - vs. Central server in US → Japanese user has 150ms latency
  - **Cloudflare Workers**

    ```typescript
    // cloudflare-worker.ts
    export default {
      async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // Redirect based on geography
        const country = request.headers.get("cf-ipcountry");

        if (country === "JP") {
          // Japanese users get Japanese content
          return new Response("こんにちは World!");
        }

        if (country === "FR") {
          return new Response("Bonjour World!");
        }

        return new Response("Hello World!");
      },
    };
    ```

  - **Vercel Edge Functions** (same concept, different provider)

    ```typescript
    // pages/api/edge.ts (Next.js)
    export const config = {
      runtime: "edge", // Run on edge, not serverless
    };

    export default function handler(request: Request) {
      return new Response("Hello from edge!", {
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
    ```

  - **Limitations and trade-offs**
    - ❌ Limited compute (can't do heavy ML models)
    - ❌ Limited execution time (usually ~30 seconds max)
    - ❌ Limited memory (usually ~128MB)
    - ✅ Why worth it: Respond in 5ms instead of 200ms
    - ✅ Good for: Auth, redirects, request filtering, A/B testing

  - **Performance benefits**
    | Metric | Central Server | Edge Server |
    |--------|---|---|
    | Latency (US user) | 5ms | 5ms |
    | Latency (Japan user) | 150ms | 10ms |
    | Latency (Brazil user) | 120ms | 15ms |
    | Global users treated equally | ❌ | ✅ |

- **Middleware**
  - **What it is:** Functions that intercept requests, run checks, then pass to main app or redirect
  - **Real-World Example:** Airport security
    - You arrive → Scan ID (auth check)
    - If no ID → Deny entry
    - If ID valid for international → Gate 1
    - If ID valid for domestic → Gate 2
    - All before you see the flight board

  ```typescript
  // middleware.ts (Next.js)
  import { NextResponse } from "next/server";
  import type { NextRequest } from "next/server";

  export function middleware(request: NextRequest) {
    const token = request.cookies.get("auth-token")?.value;

    // Redirect unauthenticated users
    if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  }

  // Apply middleware to specific paths
  export const config = {
    matcher: ["/dashboard/:path*", "/admin/:path*"],
  };
  ```

  - **Geolocation routing**

    ```typescript
    export function middleware(request: NextRequest) {
      const country = request.headers.get("x-vercel-ip-country");
      const response = NextResponse.next();

      // GDPR: Redirect EU users to GDPR-compliant version
      if (country === "DE" || country === "FR" || country === "IT") {
        response.headers.set("x-content-compliance", "gdpr");
      }

      return response;
    }
    ```

  - **Rate limiting and throttling**

    ```typescript
    import { Ratelimit } from "@upstash/ratelimit";
    import { Redis } from "@upstash/redis";

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });

    const ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "60 s"), // 10 requests per 60 seconds
    });

    export async function middleware(request: NextRequest) {
      const identifier = request.ip || "anonymous";
      const { success, pending, limit, reset, remaining } =
        await ratelimit.limit(`ratelimit_${identifier}`);

      if (!success) {
        return new Response("Too many requests", { status: 429 });
      }

      const response = NextResponse.next();
      response.headers.append("X-RateLimit-Limit", limit.toString());
      response.headers.append("X-RateLimit-Remaining", remaining.toString());
      return response;
    }
    ```

  - **Request/response interception**

    ```typescript
    export function middleware(request: NextRequest) {
      // Add timestamp to all requests
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-request-time", new Date().toISOString());

      // Clone request with new headers
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      // Add response headers
      response.headers.set("x-response-time", new Date().toISOString());
      return response;
    }
    ```

- **Partial hydration / Island Architecture**
  - **What it is:** Only hydrate (make interactive) parts of the page that need to be interactive
  - **Real-World Example:** Restaurant menu
    - Static parts: Menu description (just text) - Don't need to hydrate
    - Interactive parts: "Add to cart" buttons - Need JavaScript

  - **Island architecture**

    ```tsx
    // Astro example (explicitly uses island architecture)
    ---
    // This runs on server, never sent to browser
    const products = await fetch('/api/products').then(r => r.json());
    ---

    <html>
      <head><title>Shop</title></head>
      <body>
        {/* Static HTML - no JavaScript */}
        <h1>Products</h1>
        <div class="product-list">
          {products.map(product => (
            <div>
              <h3>{product.name}</h3>
              <p>${product.price}</p>
              {/* Only this button needs JavaScript */}
              <AddToCartButton client:load product={product} />
            </div>
          ))}
        </div>
      </body>
    </html>
    ```

  - **Selective hydration**
    - ✅ Static text, images, links: NO hydration needed
    - ✅ Buttons, forms, interactive elements: Hydrate only these
    - Result: 80% of page works without JavaScript!

  - **Framework implementations**
    - **Astro:** "Ship zero JavaScript by default"
    - **Fresh (Deno):** Island architecture built-in
    - **Qwik:** Resumable framework (pause JS execution, resume on user interaction)

  - **Performance comparison**
    | Approach | Bundle Size | Interactivity |
    |----------|---|---|
    | Full SPA | 500KB | Instant (after load) |
    | Server-rendered | 150KB | After hydration |
    | Island architecture | 50KB | Partial instantly |

### Caching & Optimization

- **CDN caching strategy**
  - **What it is:** Tell CDN how long to keep copies of your content before checking main server again
  - **Real-World Example:** Movie distribution
    - Movie studio = Origin server
    - Cinemas around world = CDN edge locations
    - Deliver same movie to all cinemas → Fewer requests to studio
    - Every 3 months: Get fresh copy → Cache-Control: max-age=3 months

  - **Cache control headers**

    ```typescript
    // app/api/products.ts
    export async function GET(request: Request) {
      const products = await db.products.findAll();

      return new Response(JSON.stringify(products), {
        headers: {
          "Content-Type": "application/json",
          // Cache for 1 hour, can share among users
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // For user-specific data (auth)
    export async function GET_UserProfile(request: Request) {
      const user = await getCurrentUser(request);

      return new Response(JSON.stringify(user), {
        headers: {
          "Content-Type": "application/json",
          // DON'T cache user-specific data
          "Cache-Control": "private, no-cache",
        },
      });
    }

    // Homepage (vary by language)
    export async function GET_HomePage(request: Request) {
      return new Response(getHome(), {
        headers: {
          "Cache-Control": "public, max-age=3600",
          Vary: "Accept-Language", // Cache separately per language
        },
      });
    }
    ```

  - **Cache control directives explained**
    | Directive | Meaning |
    |-----------|---------|
    | `public` | Anyone can cache this (CDN, browsers) |
    | `private` | Only browser cache, not CDN |
    | `max-age=3600` | Keep for 3600 seconds (1 hour) |
    | `no-cache` | Must validate with server before use |
    | `no-store` | Never cache (use for sensitive data) |
    | `s-maxage=86400` | CDN cache for 24h, browser cache for 1h |
    | `stale-while-revalidate=300` | Serve stale copy for 5min, update in background |

  - **Stale-while-revalidate pattern**

    ```typescript
    // Great for content that changes infrequently
    export async function GET_BlogPost(request: Request) {
      return new Response(getPost(), {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          // ↑ Serve cached version for 1 hour
          // ↑ If older than 1 hour, still serve old version while fetching new
          // ↑ For up to 24 hours, can improve performance dramatically
        },
      });
    }

    // Real-world scenario:
    // 1. User requests blog post at 10:00
    // 2. Server: "Cache for 1 hour, but serve stale for 24h"
    // 3. User requests again at 11:00 → Gets cached version (1 hour old, fresh)
    // 4. User requests again at 11:30 → CDN sees it's stale, but serves it anyway
    //    → Fetches fresh version in background
    //    → Next request (11:31) has fresh content
    // Benefit: Instant response + background refresh!
    ```

  - **Cache invalidation**

    ```typescript
    // Problem: Content is cached, user updates it, but CDN still serves old version
    // Solution: Invalidate cache after updates

    export async function POST_CreatePost(request: Request) {
      const data = await request.json();
      const post = await db.posts.create(data);

      // Invalidate read endpoints so CDN fetches fresh data
      await fetch("https://cdn.example.com/purge", {
        method: "POST",
        headers: { "Api-Key": process.env.CDN_API_KEY },
        body: JSON.stringify({
          url: [
            "/api/posts",
            `/api/posts/${post.id}`,
            "/blog", // Homepage lists posts
          ],
        }),
      });

      return new Response(JSON.stringify(post));
    }

    // Alternative: Time-based invalidation (immutable content)
    // /posts/1-abc123.js (include hash in filename)
    // /posts/1-xyz789.js (different content)
    // → Always get fresh, no invalidation needed
    ```

  - **Geographic distribution**

    ```typescript
    // Serve static assets from nearest CDN location
    {
      "assets": [
        { "path": "/images/**", "cache": "public, max-age=31536000" },
        // Images cache for 1 year (include hash in filename for invalidation)

        { "path": "/css/**", "cache": "public, max-age=31536000" },
        { "path": "/js/**", "cache": "public, max-age=31536000" },

        { "path": "/api/**", "cache": "public, max-age=60" },
        // API responses cache for 1 minute

        { "path": "/", "cache": "public, max-age=0, must-revalidate" },
        // Homepage always revalidate (changes frequently)
      ]
    }
    ```

  - **Cache key strategies**

    ```typescript
    // By default, cache key = URL only
    // Problem: Same URL with different auth headers gets same cached response!

    export async function middleware(request: NextRequest) {
      const response = NextResponse.next();

      // Include user ID in cache key
      const userId = await getUserId(request);
      response.headers.set("Vary", `Cookie,Authorization`);
      // ↑ Cache separately per user

      return response;
    }

    // For A/B testing:
    export async function GET(request: Request) {
      const variant = request.headers.get("x-ab-variant") || "control";

      return new Response(getPage(variant), {
        headers: {
          "Cache-Control": "public, max-age=3600",
          Vary: "x-ab-variant", // Cache separately per variant
        },
      });
    }
    ```

  - **Practical caching checklist**
    - ✅ Static assets (images, fonts, CSS): `max-age=31536000` (1 year)
    - ✅ JavaScript: `max-age=31536000` + include hash in filename
    - ✅ API responses: `max-age=60` to `max-age=3600` depending on freshness
    - ✅ User-specific pages: `private, no-cache`
    - ✅ HTML pages: `max-age=0, stale-while-revalidate=86400`
    - ✅ Always invalidate cache after content updates

---

## 🛠️ Build & Deploy

### Hands-On: Build a Hybrid Rendering App

**Project: E-commerce product page with all techniques**

**1. SSR (Server-Side Rendering)**

- Fetch product from database on server
- Generate HTML with product data
- Send to browser ready to display

```tsx
// app/products/[id]/page.tsx (Server Component)
import { db } from "@/lib/db";
import { ProductDetails } from "./ProductDetails"; // Client component

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  // ✅ Run on server: Fetch from DB
  const product = await db.products.findById(params.id);

  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <div>
      <h1>{product.name}</h1>
      <img src={product.image} alt={product.name} />
      <p>${product.price}</p>
      <ProductDetails productId={product.id} />
    </div>
  );
}
```

**2. RSC (React Server Components)**

- Keep product data fetch on server
- Direct database access (no API needed)
- Only send necessary data to client

```tsx
// app/products/[id]/page.tsx
export async function generateStaticParams() {
  // Pre-render top 100 products for instant loads
  const products = await db.products.findMany({ limit: 100 });
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  // SEO: Generate metadata on server
  const product = await db.products.findById(params.id);
  return {
    title: `${product.name} - Shop`,
    description: product.description,
    openGraph: {
      title: product.name,
      images: [product.image],
    },
  };
}
```

**3. Edge optimizations**

- Middleware for authentication
- Early redirects (don't hit main server)
- Geographic routing

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Redirect if not logged in
  if (request.nextUrl.pathname.startsWith("/checkout")) {
    const token = request.cookies.get("auth-token");
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Route based on geography
  const country = request.headers.get("x-vercel-ip-country");
  if (country === "JP") {
    // Serve Japanese prices, inventory from Tokyo warehouse
    request.headers.set("x-warehouse", "tokyo");
  }

  return NextResponse.next();
}
```

**Complete flow:**

```
User Request
    ↓
Middleware (edge, 5ms)
  ├─ Check auth (instant reject if needed)
  ├─ Add geographic data
  └─ Pass to app
    ↓
Next.js App Router
  ├─ Fetch product from DB (server component)
  ├─ Generate HTML
  └─ Send to browser
    ↓
Browser
  ├─ Render HTML (users see content)
  ├─ Hydrate client components
  └─ Interactive (buttons work, etc.)
```

### Testing Edge Functions

```typescript
// __tests__/middleware.test.ts
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

describe("middleware", () => {
  test("redirects to login if not authenticated", () => {
    const request = new NextRequest(new URL("http://localhost:3000/checkout"));
    const response = middleware(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get("location")).toContain("/login");
  });

  test("routes to Tokyo warehouse for Japanese users", () => {
    const request = new NextRequest(
      new URL("http://localhost:3000/products/1"),
      {
        headers: {
          "x-vercel-ip-country": "JP",
        },
      },
    );
    const response = middleware(request);

    expect(response.headers.get("x-warehouse")).toBe("tokyo");
  });
});

// __tests__/edge-function.test.ts
import { handler } from "@/pages/api/edge";

describe("edge function", () => {
  test("responds quickly", async () => {
    const start = performance.now();
    await handler(new Request("http://localhost:3000"));
    const time = performance.now() - start;

    expect(time).toBeLessThan(100); // Should be instant
  });
});
```

### Architecture Diagram

```
┌─────────────────────────────────────┐
│  User Request (Browser/Edge)        │
└──────────────┬──────────────────────┘
               │
      ┌────────▼────────┐
      │  Edge Middleware│ (Auth, redirects)
      └────────┬────────┘
               │
      ┌────────▼────────────┐
      │  Next.js App Router │
      │  - RSCs             │
      │  - Server Actions   │
      └────────┬────────────┘
               │
      ┌────────▼────────┐
      │  Database/APIs  │
      └─────────────────┘
```

## 🎯 Career Track & Common Patterns

> **This is where fullstack engineers become platform engineers.**

Understanding edge computing, server-side rendering, and deployment infrastructure separates senior engineers from the rest. Platform engineers think about scalability, latency, and infrastructure from day 1.

### You Should Master

- **How to architect hybrid rendering systems** - Know when to use RSC vs SSR vs Client Components
- **When edge functions are worth the complexity** - Edge adds complexity; don't use without reason
- **Streaming benefits vs lazy loading trade-offs** - Streaming = fast first paint, lazy loading = less bandwidth
- **Cache invalidation strategies at scale** - One of hardest problems (Phil Karlton quote)
- **Performance monitoring and optimization** - Measure everything, don't guess
- **Geographic routing and multi-region deployments** - Think globally, code locally

### Common Patterns & Mistakes

| Pattern                       | Good For                | Problems                         | Solution                    |
| ----------------------------- | ----------------------- | -------------------------------- | --------------------------- |
| **Full SPA**                  | Highly interactive apps | Slow initial load, SEO issues    | Add SSR                     |
| **Full SSR**                  | SEO, initial load       | Hydration waterfall, server load | Add RSC, streaming          |
| **RSC everywhere**            | Fast loads              | Can't use useState/effects       | Mix with client components  |
| **Middleware for everything** | Edge is instant         | Edge can't do heavy work         | Use for auth/redirects only |
| **No caching**                | Always fresh            | High server load, slow           | Add CDN cache strategically |
| **Cache everything**          | Fast loads              | Stale content, hard invalidate   | Use stale-while-revalidate  |

### Platform Engineering Mindset

```typescript
// Wrong: Just write code
async function getProducts() {
  return await db.products.findAll(); // What's the latency?
}

// Right: Think about latency and scale
async function getProducts() {
  // CDN edge cache for 1 hour
  // CDN revalidates every 5 minutes in background
  // Database query should take < 100ms
  // Should handle 10,000 concurrent users
  // Geographic routing: Tokyo users hit Tokyo DB

  const cached = await cache.get("products");
  if (cached) return cached;

  const products = await db.products.findAll(); // Measure this!
  await cache.set("products", products, { ttl: 3600 });
  return products;
}
```

### Real-world Scalability Questions

**Q: "How would you handle 1 million users?"**

```
A: Not one per one:
1. Cache at CDN (same response to 10k users)
2. Cache at database layer (same query once per hour)
3. Use RSC to run on server (not browser JS)
4. Use middleware to offload auth to edge
5. Geographic distribution (Tokyo users ≠ US users)

Result: 1M users → 100k unique queries → 1k unique at database
```

**Q: "User in Japan is slow, what do you do?"**

```
A: Measure first (could be network, not code):
1. Check if database is in US (it is, that's 150ms latency)
2. Set up read replica in Tokyo
3. Use middleware to route to nearest DB
4. Cache aggressively (user sees cached data in 5ms)
5. Most users don't need fresh data every second
```

**Q: "Cache is stale, users see old data"**

```
A: Use stale-while-revalidate:
- Serve cached data (instant)
- Fetch fresh in background
- Next request has fresh data
- Users never see "loading"
```

---

## 📖 Advanced Patterns

### Pattern 1: ISR (Incremental Static Regeneration)

Pre-render many pages at build time, update specific ones on-demand.

```typescript
// app/blog/[slug]/page.tsx
export const revalidate = 3600; // Revalidate every hour

export async function generateStaticParams() {
  // Pre-render top 100 blog posts
  const posts = await db.posts.findMany({ limit: 100 });
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await db.posts.findBySlug(params.slug);

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}

// On-demand revalidation (e.g., when blog post is updated)
export async function POST_RevalidatePost(request: Request) {
  const { slug } = await request.json();

  // Revalidate this specific post immediately
  await revalidatePath(`/blog/${slug}`);

  return new Response('Revalidated!');
}
```

### Pattern 2: API Route Deduplication

Avoid multiple simultaneous requests to the same expensive resource.

```typescript
// lib/cache.ts
const requestCache = new Map<string, Promise<any>>();

export async function deduplicateRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (requestCache.has(key)) {
    return requestCache.get(key)!;
  }

  const promise = fetcher();
  requestCache.set(key, promise);

  try {
    return await promise;
  } finally {
    requestCache.delete(key);
  }
}

// Usage: 100 users load products page simultaneously
// Only 1 database query runs, all 100 share the result!
export async function GET_Products() {
  const products = await deduplicateRequest("products", async () => {
    return await db.products.findAll();
  });

  return new Response(JSON.stringify(products));
}
```

### Pattern 3: Progressive Enhancement

Build an app that works without JavaScript, then enhance with JavaScript.

```tsx
// Form that works with or without JS
export function NewsletterForm() {
  return (
    <form action="/api/subscribe" method="POST">
      <input name="email" type="email" required />
      <button type="submit">Subscribe</button>
    </form>
  );
}

// If JavaScript loads, enhance it
("use client");
import { useState } from "react";
import { NewsletterForm as BaseForm } from "./NewsletterForm";

export function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <p>✅ Thanks for subscribing!</p>;
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await fetch("/api/subscribe", {
          method: "POST",
          body: new FormData(e.currentTarget),
        });
        setSubmitted(true);
      }}
    >
      <input name="email" type="email" required />
      <button>Subscribe</button>
    </form>
  );
}
```

---

## 🎯 Career Impact

## 🎯 Career Impact

> **This positions you as a Platform/Infrastructure Engineer**

It's the difference between knowing how to code and knowing how to build scalable systems.

### You'll Master

- **Architecture decisions at scale:** Should this be RSC? Edge function? Cached?
- **Global performance:** Making sites fast for users in Tokyo, São Paulo, London simultaneously
- **Operational excellence:** Monitoring, caching strategies, graceful degradation
- **Cost optimization:** Smart caching saves 10x on infrastructure costs
- **Debugging production issues:** "Users in Brazil are slow" → Diagnose → Fix

### Platform Engineer Toolkit

```typescript
// This is what platform engineers think about:

Export async function shouldUseEdge(requirement: string): boolean {
  if (requirement.includes('sensitive auth')) return true;      // Edge is secure
  if (requirement.includes('super low latency')) return true;   // <10ms
  if (requirement.includes('geographic routing')) return true;  // Route by location
  if (requirement.includes('CPU expensive')) return false;      // Edge limited
  if (requirement.includes('database query')) return false;     // Use RSC on main server
  return false;
}

export async function cacheStrategy(data: string): CacheControl {
  if (data === 'user-specific') return 'private, no-cache';
  if (data === 'frequently changes') return 'public, max-age=60, stale-while-revalidate=300';
  if (data === 'rarely changes') return 'public, max-age=31536000';
  return 'public, max-age=3600'; // Default: 1 hour
}

export async function renderingStrategy(page: string): 'SSG' | 'ISR' | 'SSR' | 'RSC' | 'CSR' {
  // SSG: markdown blogs, documentation
  // ISR: news articles (fresh every hour)
  // SSR: SEO-critical, dynamic content
  // RSC: high-security data
  // CSR: one-off internal tools

  if (page === 'blog') return 'ISR';
  if (page === 'product-page') return 'SSR'; // SEO important
  if (page === 'admin-dashboard') return 'CSR'; // No SEO needed
  return 'SSG'; // Default: static
}
```

### Interview Questions You'll Nail

**Q: "How would you optimize a site for global users?"**

✅ Good answer:

- Use CDN to serve static assets from nearest location (5ms instead of 150ms)
- Set up database read replicas in different regions
- Use edge middleware for geographic routing
- Cache aggressively with proper invalidation
- Measure: CloudWatch, Sentry, Web Vitals

### Performance Impact Comparison

| Optimization                     | LCP    | FCP    | TTI    | Server Load | Bundle Size |
| -------------------------------- | ------ | ------ | ------ | ----------- | ----------- |
| **No optimization**              | 2800ms | 1200ms | 3500ms | High        | High        |
| **SSR only**                     | 1200ms | 800ms  | 2500ms | Medium-High | Medium      |
| **RSC**                          | 900ms  | 600ms  | 1200ms | Low         | Small       |
| **RSC + CDN**                    | 500ms  | 300ms  | 800ms  | Low         | Small       |
| **RSC + CDN + Edge**             | 200ms  | 100ms  | 400ms  | Very Low    | Small       |
| **RSC + CDN + Edge + Streaming** | 150ms  | 80ms   | 300ms  | Very Low    | Small       |

**_LCP = Largest Contentful Paint (when main content visible)_**
**_FCP = First Contentful Paint (when anything appears)_**
**_TTI = Time to Interactive (when page responds to clicks)_**

### Senior Engineer Perspective

```typescript
// Junior engineer thinks:
"Does it work?"

// Senior platform engineer thinks:
"Does it work?"        ✅
"How fast is it?"      ← Geography?  ← Is it cached?
"Will it scale?"       ← 1k users? 1M users?
"What's the cost?"     ← Compute, bandwidth, storage
"Can we debug it?"     ← Monitoring, logs, traces
"What if it fails?"    ← Fallbacks, graceful degradation
"How do we deploy?"    ← Blue-green? Canary? Rollback?
```

### What Makes You Valuable

- Not just "React developer" but "platform engineer"
- Not just "builds features" but "scales systems"
- Not just "fixes bugs" but "prevents production incidents"
- Not just "writes code" but "thinks about infrastructure"

That's when you get hired as Staff/Senior engineer. 🚀
