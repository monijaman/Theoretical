# Frontend Performance Engineering

This module covers measurable performance optimization techniques that directly impact user experience and business metrics.

---

## ⚡ Quick Start: Real-World Analogies

Understand frontend performance with these real-world examples:

- **LCP (Largest Contentful Paint):** Like a restaurant taking your order
  - Slow: Waiter takes 5 seconds to come (3000ms LCP = bad)
  - Fast: Waiter comes in 1 second (800ms LCP = good)
  - **Goal:** ≤ 2.5 seconds for 75% of users

- **FCP (First Contentful Paint):** Like a movie starting to play
  - Slow: Loading screen for 3 seconds
  - Fast: First scene appears in 0.5 seconds
  - **Goal:** ≤ 1.8 seconds

- **CLS (Cumulative Layout Shift):** Like furniture moving while you sit
  - Bad: You sit, then couch shifts (you fall)
  - Good: Furniture locked in place (you stay comfortable)
  - **Goal:** ≤ 0.1 (almost no movement)

- **Bundle Size:** Like packing for vacation
  - Bad: Suitcase has 50lbs (takes forever to arrive)
  - Good: Backpack has 10lbs (arrives quickly)
  - **Impact:** Every 100KB = 10% slower on 4G

- **Code Splitting:** Like ordering delivery
  - Bad: Restaurant sends your entire menu even though you only ordered pizza
  - Good: Restaurant sends only your pizza order
  - **Benefit:** User only downloads what they need

---

## 📊 Core Performance Metrics (What You Must Measure)

### The "Core Web Vitals" (Google's ranking factors)

These 3 metrics directly affect your search ranking and user satisfaction:

#### 1. **LCP (Largest Contentful Paint)**

- **What it is:** Time when largest element on page is visible
- **Target:** ≤ 2.5 seconds (75th percentile)
- **Why it matters:** Users see main content (headline, image, video)

```typescript
// Measure LCP
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];
  console.log("LCP:", lastEntry.renderTime || lastEntry.loadTime);
});

observer.observe({ entryTypes: ["largest-contentful-paint"] });
```

**Real-world data:**

- Amazon: 100ms improvement → 1% more revenue
- Retailer: 1000ms → 2500ms LCP → Sales dropped 7%
- News site: 3000ms LCP → ⚠️ Google ranks lower (SEO penalty)

**What causes slow LCP?**

- ❌ Large unoptimized images (80% of slow LCP)
- ❌ Slow API calls (server too slow)
- ❌ Heavy JavaScript (blocking rendering)
- ❌ Render-blocking CSS/JS

**How to fix it:**

```typescript
// ✅ Preload critical resources
<link rel="preload" as="image" href="/hero-image.jpg" />
<link rel="preload" as="script" href="/critical.js" />

// ✅ Optimize images
<img src="image.webp" loading="lazy" alt="..." />

// ✅ Use CSS containment for rendering optimization
.card { contain: layout style paint; }

// ✅ Defer non-critical JavaScript
<script defer src="analytics.js"></script>
```

#### 2. **FCP (First Contentful Paint)**

- **What it is:** Time when anything (text, image, shape) is visible
- **Target:** ≤ 1.8 seconds (75th percentile)
- **Why it matters:** Feels fast (not blank, even if not fully loaded)

**Real-world impact:**

- User perceives 3 seconds faster when FCP improves by 1 second
- 50% of users abandon site if doesn't load in 3 seconds

```typescript
// Measure FCP
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log("FCP:", entry.startTime);
  }
});

observer.observe({ entryTypes: ["paint"] });
```

**What causes slow FCP?**

- ❌ Blocking parser (JavaScript blocks HTML parsing)
- ❌ CSS files not optimized
- ❌ Server response slow (TTFB)

```typescript
// ✅ Inline critical CSS
<style>
  /* Only critical above-fold styles */
  body { font-family: sans-serif; }
  .header { background: blue; }
</style>
<link rel="stylesheet" href="non-critical.css" media="print" onload="this.media='all'" />

// ✅ Async/defer JavaScript
<script async src="non-blocking.js"></script> <!-- Doesn't block parsing -->
<script defer src="secondary.js"></script>   <!-- Runs after parsing -->
```

#### 3. **CLS (Cumulative Layout Shift)**

- **What it is:** How much page elements jump around while loading
- **Target:** ≤ 0.1 (almost no movement)
- **Why it matters:** Prevents accidental clicks (you try to click "Subscribe", ad loads, you click ad instead)

**Real-world impact:**

- 25% shift score → Users frustrated
- Sports betting site: CLS issue → Doubled accidental bets → Legal issues

```typescript
// Measure CLS
const observer = new PerformanceObserver((list) => {
  let clsScore = 0;
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      // Don't count if user just clicked
      clsScore += entry.value;
    }
  }
  console.log("CLS:", clsScore);
});

observer.observe({ entryTypes: ["layout-shift"] });
```

**What causes CLS?**

- ❌ Images without fixed dimensions
- ❌ Ads/embeds without reserved space
- ❌ Fonts flashing (system → web font)

```html
<!-- ❌ Bad: Image height unknown, space shifts after load -->
<img src="image.jpg" />

<!-- ✅ Good: Tell browser image height in advance -->
<img src="image.jpg" width="600" height="400" />

<!-- ✅ Better: Use aspect-ratio (responsive) -->
<img src="image.jpg" style="aspect-ratio: 3 / 2;" />

<!-- For ads: Reserve space -->
<div style="min-height: 250px; width: 300px;">{/* Ad loads here */}</div>
```

### Other Important Metrics

#### **TTFB (Time to First Byte)**

- Server response time (how fast server responds)
- Target: ≤ 600ms
- Slow TTFB → Slow everything (can't improve FCP if server is slow)

```typescript
const navigation = performance.getEntriesByType("navigation")[0];
const ttfb = navigation.responseStart - navigation.requestStart;
console.log("TTFB:", ttfb, "ms");
```

#### **INP (Interaction to Next Paint)** ⭐ New Core Web Vital (2024)

- Time from user click to page responds visually (button changes, data shows)
- Target: ≤ 200ms
- Replacing TTI (more accurate for real interactions)

```typescript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log("INP:", entry.processingDuration);
  }
});

observer.observe({ type: "long-animation-frame" });
```

---

## 🔧 Core Optimization Techniques

### 1. **Image Optimization** (80% of slow sites have bad images)

**Problem:** User downloads 5MB image on mobile (takes 5 seconds on 4G)

**Solution:**

```html
<!-- Modern format with fallback -->
<picture>
  <source srcset="image.webp" type="image/webp" />
  <source srcset="image.jpg" type="image/jpeg" />
  <img src="image.jpg" alt="Product" loading="lazy" />
</picture>

<!-- Responsive images (600px phone, 1200px desktop) -->
<img
  srcset="image-600w.jpg 600w, image-1200w.jpg 1200w"
  sizes="(max-width: 600px) 600px, 1200px"
  src="image.jpg"
  alt="Product"
/>

<!-- Avoid: <img src="5000x3000px-image.jpg"> ❌ -->
```

**Tools:**

- TinyPNG: Compress 70% without quality loss
- ImageOptim: Batch optimize (free)
- Next.js/Astro Image component: Automatic optimization

**Real impact:**

- 80% images smaller → 3x faster initial load
- 1.5MB → 300KB images = 1.2s faster FCP

### 2. **Code Splitting & Lazy Loading**

**Problem:** User downloads 500KB JavaScript, uses only 50KB on landing page

**Solution:**

```typescript
// ❌ Bad: Everything in one file
import { HeavyChart } from './charts'; // 50KB
import { PDFGenerator } from './pdf';   // 100KB
import { VideoPlayer } from './video';  // 80KB

export default function Dashboard() {
  return (
    <>
      <HeavyChart data={data} />
      <PDFGenerator />
      <VideoPlayer />
    </>
  );
}

// ✅ Good: Lazy load what you need
import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./charts'));
const PDFGenerator = lazy(() => import('./pdf'));
const VideoPlayer = lazy(() => import('./video'));

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyChart data={data} />
      <PDFGenerator />
      <VideoPlayer />
    </Suspense>
  );
}

// Even better: Load on user interaction
const [showChart, setShowChart] = useState(false);

if (!showChart) {
  return <button onClick={() => setShowChart(true)}>Show Chart</button>;
}

return <Suspense fallback={<div>Loading chart...</div>}><HeavyChart /></Suspense>;
```

**Impact:**

- Initial bundle: 500KB → 100KB (80% reduction)
- First page load: 2 seconds → 0.4 seconds (5x faster)

### 3. **Minification & Compression**

```javascript
// ❌ Original (4KB)
export function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

// ✅ Minified (200 bytes)
export function p(t) {
  let e = 0;
  for (let i = 0; i < t.length; i++) e += t[i].price;
  return e;
}

// ✅✅ With gzip compression (80 bytes on wire)
// Gzip: Compression algorithm that reduces 4KB to 80 bytes!
```

**Configuration (Next.js):**

```js
// next.config.js
/** @type {import('next').NextConfig} */
const config = {
  swcMinify: true, // Use Rust-based minifier (SWC)
  compress: true, // Enable gzip compression
};
```

**Real impact:**

- Bundle: 500KB → 100KB minified → 30KB with gzip
- Network: 500ms to download → 150ms (3x faster)

### 4. **JavaScript Performance**

**Problem:** Heavy JavaScript blocks main thread (user can't click for 5 seconds)

```typescript
// ❌ Bad: Blocking main thread
export function processLargeData(data) {
  // Loops through 1 million items, takes 3 seconds
  return data.map((item) => JSON.parse(item.json));
}

// Called on page load
const result = processLargeData(hugeArray); // User can't click for 3s!

// ✅ Good: Use Web Worker (separate thread)
// worker.js
self.onmessage = (event) => {
  const result = processLargeData(event.data);
  self.postMessage(result);
};

// main.js
const worker = new Worker("worker.js");
worker.postMessage(hugeArray);
worker.onmessage = (event) => {
  const result = event.data;
  render(result);
};

// ✅✅ Better: Use requestIdleCallback (defer to idle time)
// Run heavy tasks only when user isn't doing anything
requestIdleCallback(() => {
  processLargeData(hugeArray);
});
```

**Measure JavaScript performance:**

```typescript
// Measure function execution time
const start = performance.now();
heavyFunction();
const time = performance.now() - start;
console.log(`Function took ${time}ms`);

// Long tasks (> 50ms) hurt INP
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log("Long task:", entry.duration, "ms");
  }
});

observer.observe({ entryTypes: ["long-animation-frame"] });

// If > 200ms, break into chunks
export async function heavyWork(items) {
  for (let i = 0; i < items.length; i += 1000) {
    processChunk(items.slice(i, i + 1000));
    await new Promise((resolve) => setTimeout(resolve, 0)); // Yield to browser
  }
}
```

### 5. **CSS Optimization**

```css
/* ❌ Bad: Unoptimized CSS */
* {
  margin: 0;
  padding: 0; /* Universal selector, applies to 10k elements */
}

body > div > .card > .title {
  color: blue; /* Overly specific selector */
}

.card {
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
/* Triggers layout shift if `fadeIn` animates width/height */

/* ✅ Good: Optimized CSS */
html,
body {
  margin: 0;
  padding: 0; /* Don't use universal selector */
}

.card__title {
  color: blue; /* BEM naming, less specific */
}

.card {
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateZ(0);
  } /* GPU acceleration */
  to {
    opacity: 1;
  }
}
/* Use `will-change` sparingly */
.card {
  will-change: transform;
}
```

**Critical CSS:**

```html
<!-- Style for above-fold content inline (no render-blocking) -->
<style>
  .hero {
    background: blue;
    padding: 20px;
  }
  .btn {
    background: green;
    color: white;
  }
</style>

<!-- Defer non-critical CSS -->
<link
  rel="stylesheet"
  href="non-critical.css"
  media="print"
  onload="this.media='all'"
/>

<!-- Preload important fonts -->
<link rel="preload" as="font" href="font.woff2" type="font/woff2" crossorigin />
```

### 6. **Font Optimization**

```html
<!-- ❌ Slow: Block parsing while font downloads, then flash -->
<link href="https://fonts.googleapis.com/css2?family=Roboto" rel="stylesheet" />
<style>
  body {
    font-family: "Roboto", sans-serif;
  }
</style>

<!-- ✅ Better: Preload + font-display -->
<link
  rel="preload"
  as="font"
  href="roboto.woff2"
  type="font/woff2"
  crossorigin
/>
<style>
  @font-face {
    font-family: "Roboto";
    src: url("roboto.woff2") format("woff2");
    font-display: swap; /* Show system font first, swap when loaded */
  }
  body {
    font-family: "Roboto", sans-serif;
  }
</style>

<!-- ✅✅ Best: Subset fonts (only characters needed) -->
<link
  href="https://fonts.googleapis.com/css2?family=Roboto&text=Hello%20World"
  rel="stylesheet"
/>
<!-- Only load 'H', 'e', 'l', 'o', ' ', 'W', 'r', 'd' -->
```

**Font performance impact:**

- System font: 0ms (instant)
- Font file loading: 500ms → Flash of unstyled text
- font-display: swap → System font (fast) → Web font (0ms flash)

### 7. **Caching Strategy**

```typescript
// Service Worker: Cache API responses, images, CSS
const cacheName = "v1-2024-03-08";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache.addAll(["/", "/styles.css", "/script.js", "/logo.png"]);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  // Cache-first for images, API-first for JSON
  if (event.request.url.includes("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Update cache in background
          caches
            .open(cacheName)
            .then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request)), // Fallback to cached
    );
  } else {
    event.respondWith(
      caches
        .match(event.request)
        .then((response) => response || fetch(event.request)),
    );
  }
});
```

**Real impact:**

- First visit: 3 seconds (no cache)
- Repeat visits: 0.5 seconds (everything cached)
- Offline: Site still works!

---

## 📈 Performance Profiling & Auditing

### Tools You Must Know

1. **Lighthouse** (Chrome DevTools)

   ```bash
   # Generate report
   lighthouse https://example.com --view

   # Keep it above 90 for good SEO
   ```

   Scores:
   - 90-100: Good ✅
   - 50-90: Needs work
   - 0-50: Critical

2. **WebPageTest** (Real-world conditions)
   - Test on actual 4G networks
   - Shows waterfall of what loads first
   - Simulation vs. real-world data

3. **Chrome DevTools Performance Tab**

   ```javascript
   // Record performance
   performance.mark("myFunction-start");
   myFunction();
   performance.mark("myFunction-end");
   performance.measure("myFunction", "myFunction-start", "myFunction-end");

   const measure = performance.getEntriesByName("myFunction")[0];
   console.log(`Took ${measure.duration}ms`);
   ```

4. **React Profiler** (for React apps)

   ```jsx
   import { Profiler } from "react";

   export function App() {
     const onRenderCallback = (id, phase, actualDuration) => {
       console.log(`${id} (${phase}) took ${actualDuration}ms`);
     };

     return (
       <Profiler id="App" onRender={onRenderCallback}>
         <YourComponent />
       </Profiler>
     );
   }
   ```

### Real Performance Audit Example

```typescript
// Simulated audit: E-commerce product page
const audit = {
  metrics: {
    lcp: 3200, // ❌ Target: 2500ms
    fcp: 1800, // ✅ Target: 1800ms
    cls: 0.15, // ❌ Target: 0.1
    ttfb: 800, // ❌ Target: 600ms
  },
  issues: [
    "❌ Hero image 4MB unoptimized",
    "⚠️ 3 render-blocking scripts",
    "❌ Fonts causing layout shift",
    "⚠️ 200KB unused CSS",
  ],
  recommendations: [
    "✅ Optimize hero image → 300KB (80% reduction)",
    "✅ Defer non-critical scripts",
    "✅ Preload fonts with font-display: swap",
    "✅ Purge unused CSS with PurgeCSS",
  ],
  impact: {
    before: "3200ms LCP (slow, poor SEO ranking)",
    after: "800ms LCP (excellent, top ranking)",
    revenue: "+2.5% conversion (industry avg)",
  },
};
```

---

## 💰 Real-World ROI Data

Performance isn't just about user experience—it's about money:

| Company         | Improvement                | Business Impact                  |
| --------------- | -------------------------- | -------------------------------- |
| **Amazon**      | 100ms faster               | 1% more revenue                  |
| **Walmart**     | 2s faster page load        | 15% increase in conversions      |
| **Pinterest**   | 40% reduction in wait time | 15% increase in signups          |
| **Etsy**        | 160KB code split off       | 2% increase in checkout rate     |
| **Yahoo**       | 400ms improvement          | 9% increase in full-page traffic |
| **DoubleClick** | Each 100ms delay           | 1% drop in conversions           |

**Mobile impact (even bigger):**

- 1s delay → 7% conversion loss
- 3s load time → 40% abandonment

**Search engine ranking:**

- Page Speed is Google ranking factor
- Slow sites ranked lower (lose organic traffic)

---

## 🎯 Building a Performance Culture

### Checklist: Performance Budget

```typescript
// performance-budget.json
{
  "bundles": [
    { "name": "main.js", "maxSize": "100kb" },
    { "name": "vendor.js", "maxSize": "50kb" },
    { "name": "styles.css", "maxSize": "30kb" },
  ],
  "metrics": [
    { "name": "LCP", "budget": "2500ms" },
    { "name": "FCP", "budget": "1800ms" },
    { "name": "CLS", "budget": "0.1" },
    { "name": "INP", "budget": "200ms" },
  ],
}

// CI/CD: Fail build if exceeds budget
if (bundleSize > 100kb) {
  console.error('❌ Bundle exceeded budget! Split more code.');
  process.exit(1);
}
```

### Monitoring in Production

```typescript
// Send performance data to analytics
function sendMetrics() {
  const metrics = {
    lcp: getMetric("LCP"),
    fcp: getMetric("FCP"),
    cls: getMetric("CLS"),
    inp: getMetric("INP"),
    ttfb: getMetric("TTFB"),
  };

  // Send to your analytics (Sentry, DataDog, etc.)
  fetch("/api/metrics", { method: "POST", body: JSON.stringify(metrics) });
}

// Run on page unload (don't lose data on SPA navigation)
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    sendMetrics();
  }
});
```

---

## 🚀 Performance Optimization Checklist

### Priority 1 (Do First - Biggest Impact)

- ✅ Optimize images (WebP, responsive sizes)
- ✅ Implement code splitting (lazy load routes)
- ✅ Remove render-blocking JavaScript
- ✅ Inline critical CSS

### Priority 2 (High Impact)

- ✅ Minify and compress assets (gzip)
- ✅ Preload critical resources
- ✅ Optimize fonts (font-display: swap, subset)
- ✅ Set up CDN for static assets

### Priority 3 (Good to Have)

- ✅ Implement service worker caching
- ✅ Use Web Workers for heavy JS
- ✅ Set up performance monitoring
- ✅ Create performance budget

### Priority 4 (Nice to Have)

- ✅ Install Lighthouse CI
- ✅ A/B test performance improvements
- ✅ Optimize third-party scripts
- ✅ Progressive enhancement

---

## 🎯 Career Impact

> **Performance engineers are 3x more valuable than regular developers.**

### You'll Master

- **Why** sites are slow (not just "fix it")
- **Measuring** performance (metrics, profiling)
- **Root cause analysis** (is it JS? Images? Server?)
- **Strategic optimization** (biggest bang for buck)
- **Mentoring** others on performance mindset

### Interview Questions You'll Ace

**Q: "Why is the checkout page slow?"**

✅ Good answer:

- Ask: On mobile or desktop? On what network (4G, 3G)?
- Measure: Use Lighthouse, WebPageTest
- Diagnose: Is it LCP (large image), FCP (slow server), CLS (layout shift)?
- Fix: Show exact code changes
- Measure again: Document improvement with before/after

**Q: "How to improve Core Web Vitals?"**

✅ Good answer (with data):

- LCP: Optimize images (80% of slow LCP), defer JS
- FCP: Inline critical CSS, reduce TTFB
- CLS: Fixed dimensions on images, reserve ad space
- Show metrics, not guesses

### Real-World Impact

```typescript
// You: "Let me optimize this site"
// Process:
1. Audit (5 min)        → Found: 4MB hero image, 500KB unused CSS
2. Fix (30 min)         → Image: 4MB → 300KB, CSS: 500KB → 50KB
3. Test (5 min)         → LCP: 3200ms → 900ms (64% faster!)
4. Deploy (5 min)       → Goes live (estimated 2% revenue increase)

// Result:
// Your effort: ~1 hour
// Business impact: +$10,000/month (for avg e-commerce)
// Your leverage: 🚀📈💰

// That's why performance engineers are hired/promoted faster
```

### Skills Progression

| Level      | Mindset               | Impact                      |
| ---------- | --------------------- | --------------------------- |
| **Junior** | "Code works"          | Slower sites                |
| **Mid**    | "Code is fast"        | 10-20% improvements         |
| **Senior** | "Architecture scales" | 50-80% improvements         |
| **Staff**  | "Systems think"       | Platform-level optimization |

---

## 📚 Additional Resources

### Measurement

- [Web.dev/metrics](https://web.dev/metrics/) - Google's performance guide
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) - Automate audits
- [Core Web Vitals report](https://search.google.com/u/1/manage/search-console) - See real user data

### Optimization

- [Web.dev/performance](https://web.dev/performance/) - In-depth guides
- [MDN Performance](https://developer.mozilla.org/en-US/docs/Web/Performance) - Technical reference
- [CSS Tricks](https://css-tricks.com/) - Practical examples

### Tools

- Chrome DevTools Performance tab
- WebPageTest
- Lighthouse
- SpeedCurve (continuous monitoring)

---

**Performance isn't optional. It's how you scale user experience.** 🚀
