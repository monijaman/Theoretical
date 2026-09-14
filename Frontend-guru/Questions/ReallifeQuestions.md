## 1. JavaScript bundle grew from 500 KB to 5 MB. Where do you start?

I would first confirm which route or chunk grew by comparing the latest build output with the previous build.

Then I would:

* Run a bundle analyzer such as `@next/bundle-analyzer`.
* Inspect recently added dependencies and imports.
* Look for accidental full-library imports:

```ts
// Expensive
import _ from "lodash";

// Better
import debounce from "lodash/debounce";
```

* Check whether server-only packages leaked into Client Components.
* Find duplicate dependencies and multiple library versions.
* Check source maps and compressed sizes: raw, gzip and Brotli.
* Dynamically import large, non-critical components:

```tsx
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
});
```

* Verify tree-shaking and package side effects.

I would fix the largest regression first, then add bundle-size budgets to CI.

---

## 2. A rendering bug affects only 1% of users. How would you reproduce it?

First, I would identify what is unique about the affected users:

* Browser and browser version
* Device, OS, viewport and pixel ratio
* Locale, timezone and accessibility settings
* Account state, feature flags and experiment variants
* Route, navigation path and API response
* Network speed and cached application version

I would use structured frontend error reporting, session replay, release identifiers, breadcrumbs and correlation IDs. Then I would recreate the same environment using device emulation or a real device.

If it appears timing-related, I would test with:

* CPU and network throttling
* Delayed or reordered API responses
* Empty, partial and malformed data
* Hydration differences
* Rapid navigation and repeated interaction
* Disabled cache or stale assets

The important point is to capture the affected user’s exact state, not merely retry the page repeatedly.

---

## 3. The UI receives thousands of events every second. How do you keep it responsive?

I would avoid updating React state for every event.

Instead:

1. Receive events into a buffer.
2. Aggregate, deduplicate or sample them.
3. Update the visible UI at a controlled rate.
4. Move expensive processing into a Web Worker.
5. Render only visible items using virtualization.

```ts
const pendingEvents: Event[] = [];

socket.onmessage = (message) => {
  pendingEvents.push(JSON.parse(message.data));
};

setInterval(() => {
  const batch = pendingEvents.splice(0);
  updateStore(aggregate(batch));
}, 100);
```

Other techniques include:

* Backpressure and bounded queues
* Throttling or batching with `requestAnimationFrame`
* Dropping obsolete intermediate updates
* Using `startTransition` for non-urgent rendering
* Memoizing stable components and selectors
* Keeping high-frequency transient values in refs
* Asking the server to send snapshots or aggregates instead of every raw event

The client needs an overload policy: buffer, aggregate, sample or drop. An unlimited queue only delays the failure.

---

## 4. How would you divide caching between the browser, CDN, service worker and API layer?

| Layer           | Best suited for                                                       |
| --------------- | --------------------------------------------------------------------- |
| Browser         | Versioned JS, CSS, fonts, images and user-specific responses          |
| CDN             | Public content shared by many users                                   |
| Service worker  | Offline support, application shell and controlled stale-data behavior |
| API/application | Expensive database queries, computed results and shared business data |

Typical strategy:

* Versioned static assets: `Cache-Control: public, max-age=31536000, immutable`
* Public pages/API data: CDN caching with `s-maxage` and `stale-while-revalidate`
* Private responses: browser-private caching or `no-store`
* Service worker: cache only explicit resources with a defined update policy
* API/Redis: cache expensive queries using tenant-aware keys

For mutations, I would invalidate or update every affected layer. I would never CDN-cache personalized or tenant-specific data unless the cache key safely includes the complete authorization context.

---

## 5. When should a mutation use a Server Action instead of an API route?

Use a Server Action when the mutation:

* Is initiated by your own Next.js UI
* Is tightly coupled to a form or component
* Benefits from progressive enhancement
* Needs simple server-side validation and revalidation
* Is not intended as a public contract

```tsx
<form action={updateProfile}>
  ...
</form>
```

Use an API route when:

* Mobile apps or external clients need it
* It is a stable, versioned API contract
* It receives webhooks
* You need custom HTTP methods, headers or status handling
* It supports streaming, polling or machine-to-machine communication
* Independent testing and deployment boundaries matter

Server Actions are still server endpoints. They require authentication, authorization, validation and CSRF-aware design.

---

## 6. How do you decide where a Server Component ends and a Client Component begins?

I start with Server Components and add `"use client"` at the smallest interactive boundary.

Keep a component on the server when it:

* Fetches data
* Reads secrets or directly accesses server resources
* Renders mostly static content
* Does not require browser APIs, state or event handlers

Use a Client Component when it needs:

* `useState`, `useEffect` or client-side context
* Click, input or drag interactions
* Browser APIs
* Real-time client subscriptions
* Client-only libraries

A common structure is:

```text
Server page
├── Server data/content
├── Server list
└── Client filter or interactive widget
```

I also avoid marking a high-level layout as a Client Component because that pulls its entire imported subtree into the client bundle. Server-rendered content can instead be passed to a Client Component as `children`.

---

## 7. Why doesn’t an Error Boundary catch an async failure?

An Error Boundary catches errors thrown while React is rendering, running lifecycle methods or constructing descendants.

It does not normally catch errors thrown later in:

* Event handlers
* `setTimeout`
* Promise callbacks
* Arbitrary async functions
* Server-side execution

```tsx
async function handleClick() {
  try {
    await saveData();
  } catch (error) {
    setError(error);
  }
}
```

Async errors occur outside the render call stack, so they must be handled where the promise is awaited and then represented in state.

Errors integrated into React rendering or Suspense may be routed to the appropriate boundary, but an unhandled promise rejection is not automatically caught by a traditional Error Boundary.

---

## 8. Multiple tabs are open and one logs out. How do the others know?

I would broadcast an authentication event using `BroadcastChannel`:

```ts
const authChannel = new BroadcastChannel("auth");

export function logout() {
  authChannel.postMessage({ type: "logout" });
}

authChannel.onmessage = (event) => {
  if (event.data.type === "logout") {
    window.location.assign("/login");
  }
};
```

A fallback is writing a logout marker to `localStorage` and listening for the `storage` event in other tabs.

Security must still be enforced by the server. Broadcasting only updates the UI quickly; session revocation or token invalidation prevents another tab from continuing to make authorized requests.

---

## 9. WebSocket messages arrive out of order. What should the client do?

Each stream or entity should carry ordering metadata such as:

* Sequence number
* Entity version
* Event ID
* Server timestamp, when appropriate

The client should track the last applied sequence:

```ts
if (message.sequence === lastSequence + 1) {
  apply(message);
  lastSequence = message.sequence;
} else if (message.sequence <= lastSequence) {
  // Duplicate or stale message
  ignore(message);
} else {
  // A gap exists
  requestResync();
}
```

For a small gap, it can buffer events briefly and wait for the missing sequence. For a persistent gap, it should request missed events or fetch an authoritative snapshot.

Timestamps alone are generally insufficient because clocks can differ and several events may share similar times. Ordering should also be scoped correctly—for example, per account or order—rather than forcing an unnecessary global order.

---

## 10. The app is fast locally but slow on real Android devices. What do you measure first?

I would start with real-user monitoring segmented by device and route, especially:

* LCP
* INP
* CLS
* TTFB
* Long tasks and Total Blocking Time
* JavaScript parse, compile and execution time
* Memory usage
* Network payload and request waterfalls

The first diagnostic question is:

* Is it waiting on the network or server?
* Is the main thread blocked by JavaScript?
* Is rendering/layout expensive?
* Is memory pressure causing garbage collection or tab reloads?

I would reproduce it on a real low-to-mid-range Android device using Chrome remote debugging. Local desktop emulation can throttle CPU and network, but it does not fully reproduce mobile CPU, GPU, memory and thermal constraints.

On Android, a frequent cause is not only download size but the cost of parsing, compiling and executing JavaScript.
