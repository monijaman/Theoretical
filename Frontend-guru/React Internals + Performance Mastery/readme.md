# React Internals + Performance Mastery

## � Table of Contents

1. [Reconciliation Algorithm](#reconciliation-algorithm)
2. [Re-rendering & Optimization](#re-rendering--optimization)
3. [Advanced Features](#advanced-features)

---

## �📚 Learn Deeply

### Core Concepts

- **Reconciliation algorithm**
  - Understanding how React determines what changed
  - Diffing strategy and optimization

- **React Fiber architecture**
  - The modern reconciliation engine
  - Work scheduling and priority levels
  - Time-slicing capabilities

- **Rendering phases**
  - Render phase vs Commit phase
  - Why they're separated
  - Idempotency and side effects

### Re-rendering & Optimization

- **Why components re-render**
  - Parent re-renders
  - State changes
  - Props changes (reference equality)

- **Performance optimization techniques**
  - `useMemo` vs `useCallback` vs `React.memo`
  - **When NOT to use** each one (critical!)
  - Trade-offs and pitfalls

- **Batching updates**
  - Automatic batching in React 18+
  - Behavior in event handlers vs async

### Advanced Features

- **Concurrent rendering**
  - Interruptible rendering
  - Suspense integration
  - Transition priorities (`startTransition`)

- **Suspense & streaming**
  - Code splitting benefits
  - Server-side rendering integration
  - Error boundaries

- **React Server Components**
  - Next.js 15+ implementation
  - Use cases and limitations
  - Performance implications

---

## Deep Dive: Reconciliation Algorithm {#reconciliation-algorithm}

**What is Reconciliation?**

Reconciliation is the process React uses to determine which parts of the UI need to be updated when state or props change. Instead of re-rendering the entire tree, React diffs the old and new virtual DOM to find the minimum set of changes needed.

**The Problem It Solves:**

Generating the optimal set of operations to transform one tree into another is O(n³) complexity. React solves this with **heuristic-based diffing** that achieves O(n) by making assumptions about real-world UIs:

1. **Two elements of different types produce different trees**
2. **Developers can hint which elements are stable** (using `key` prop)

**The Diffing Algorithm (Simplified):**

React compares VirtualDOMs tree by tree, level by level:

```javascript
// PSEUDO CODE - How React decides to update
function diffNode(oldNode, newNode) {
  // 1. Check if nodes are different types
  if (!oldNode) {
    return CREATE_NODE;
  }

  if (oldNode.type !== newNode.type) {
    // Different component types → unmount old, mount new
    return UNMOUNT_OLD_MOUNT_NEW;
  }

  // 2. Same type - could be element or component
  if (typeof oldNode.type === "string") {
    // DOM element (e.g., 'div')
    return diffDOMProps(oldNode, newNode);
  } else {
    // Component - check if props changed
    if (shallowPropsEqual(oldNode.props, newNode.props)) {
      return NO_CHANGE;
    }
    return UPDATE_PROPS;
  }
}
```

**Key Heuristics & Optimizations:**

1. **Element Type Comparison**

   ```javascript
   // Expensive - creates & destroys everything
   <Component />    // → changes to
   <AnotherComponent />   // Different type = UNMOUNT + MOUNT

   // Efficient - same type, just update props
   <div />          // → changes to
   <div />          // Same type = DIFF PROPS & CHILDREN
   ```

2. **The `key` Prop - Critical for Lists**

   ```javascript
   // ❌ WITHOUT key - compares by position (INEFFICIENT)
   {
     items.map((item, index) => (
       <Item data={item} /> // Implicitly: key={index}
       // Insert at beginning? All items re-render!
     ));
   }

   // ✅ WITH stable key (OPTIMAL)
   {
     items.map((item) => (
       <Item key={item.id} data={item} />
       // React matches by ID, not position
     ));
   }

   // Key helps identify which items changed, added, or removed
   ```

3. **Props & State Comparison**

   ```javascript
   // React does SHALLOW comparison by default
   function Parent() {
     const obj = { name: 'test' };  // New reference each render

     return <Child config={obj} />;
     // Even if obj.name is same, new reference = re-render
   }

   // Shallow comparison:
   { a: 1, b: 2 } === { a: 1, b: 2 }  // FALSE (different objects)
   ```

---

## Deep Dive: Re-rendering & Optimization {#re-rendering--optimization}

### Why Components Re-render

Components re-render when:

1. **Parent re-renders** - Children re-render by default
2. **State changes** - Component's own state updated
3. **Props change** - Parent passed new props (reference inequality)

```javascript
// EXAMPLE 1: Parent re-render causes child re-render
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <Child />{" "}
      {/* Re-renders when Parent re-renders, even if no props change */}
    </>
  );
}

function Child() {
  console.log("Child rendered");
  return <div>Child</div>;
}

// Every button click → Parent re-renders → Child re-renders
```

```javascript
// EXAMPLE 2: Props reference change triggers re-render
function Parent() {
  const [data, setData] = useState({ name: "John" });

  // ❌ NEW object every render
  const config = { color: "blue", data }; // Different reference each time

  return <Child config={config} />;
  // Child re-renders even if values are the same!
}

function Child({ config }) {
  console.log("Child rendered with:", config);
  return <div style={{ color: config.color }}>{config.data.name}</div>;
}
```

### Performance Optimization Techniques

#### 1. React.memo - Prevent re-render if props haven't changed

```javascript
// ❌ Without React.memo
function ChildComponent({ name, count }) {
  console.log("ChildComponent rendered");
  return <div>{name}</div>;
}

function Parent() {
  const [parentCount, setParentCount] = useState(0);

  // Even though 'name' never changes, ChildComponent re-renders
  return (
    <>
      <button onClick={() => setParentCount(parentCount + 1)}>
        Parent renders: {parentCount}
      </button>
      <ChildComponent name="John" count={parentCount} />
      {/* Re-renders on every parent update */}
    </>
  );
}

// ✅ With React.memo
const ChildComponent = React.memo(({ name, count }) => {
  console.log("ChildComponent rendered");
  return <div>{name}</div>;
});

// Now it only re-renders when 'name' or 'count' props actually change
// parentCount changes → Parent re-renders → ChildComponent checks props → NO CHANGE → skips re-render
```

**When NOT to use React.memo:**

```javascript
// ❌ TRAP: Props are functions/objects created each render
const Parent = () => {
  const onClick = () => console.log("clicked"); // NEW function each render
  const style = { color: "red" }; // NEW object each render

  return (
    <>
      <MemoChild onClick={onClick} style={style} />
      {/* React.memo is USELESS here - props always appear different */}
    </>
  );
};

// ✅ FIX: Stabilize props
const Parent = () => {
  const onClick = useCallback(() => console.log("clicked"), []);
  const style = useMemo(() => ({ color: "red" }), []);

  return <MemoChild onClick={onClick} style={style} />;
};
```

#### 2. useMemo - Cache expensive computations

```javascript
// ❌ WITHOUT useMemo - recalculates every render
function FilteredList({ items, searchTerm }) {
  // This runs on EVERY render, even if 'items' hasn't changed
  const filtered = items
    .filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => a.price - b.price)
    .map((item) => ({ ...item, discounted: item.price * 0.9 }));

  // With 10,000 items, this is expensive!
  return <div>{filtered.length} items found</div>;
}

// ✅ WITH useMemo - recalculate only when dependencies change
function FilteredList({ items, searchTerm }) {
  const filtered = useMemo(() => {
    console.log("Filtering...");
    return items
      .filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .sort((a, b) => a.price - b.price)
      .map((item) => ({ ...item, discounted: item.price * 0.9 }));
  }, [items, searchTerm]); // Only recalculate when items or searchTerm change

  return <div>{filtered.length} items found</div>;
}
```

**When NOT to use useMemo:**

```javascript
// ❌ TRAP: Simple computations - overhead > benefit
const doubled = useMemo(() => count * 2, [count]);
// useMemo is heavier than just computing count * 2

// ✅ Simple calculations are fine without useMemo
const doubled = count * 2;

// ✅ Use useMemo for expensive operations
const sorted = useMemo(() => {
  return largeArray.slice().sort((a, b) => b - a); // O(n log n)
}, [largeArray]);
```

#### 3. useCallback - Memoize function references

```javascript
// ❌ WITHOUT useCallback - new function every render
function SearchBox({ onSearch }) {
  const handleChange = (e) => {
    onSearch(e.target.value);
  };

  return <input onChange={handleChange} />;
}

// Parent passes memoized child but gets new function every time
function Parent() {
  const [results, setResults] = useState([]);

  return (
    <>
      <MemoSearchBox onSearch={setResults} />
      {/* Even though MemoSearchBox is memoized, new onSearch function 
          causes re-render each time Parent renders */}
    </>
  );
}

// ✅ WITH useCallback - stable function reference
function Parent() {
  const [results, setResults] = useState([]);

  const handleSearch = useCallback((term) => {
    setResults(term);
  }, []); // Function reference never changes

  return <MemoSearchBox onSearch={handleSearch} />;
  // Now MemoSearchBox truly skips re-renders
}
```

### Batching Updates

**React 18+ Automatic Batching:**

```javascript
// React 17 and below: Updates are NOT batched in async functions
const handleClick = async () => {
  setState1("updated"); // Update 1
  setState2("updated"); // Update 2
  // 2 renders happen (not batched)

  await fetch("/api/data");

  setState3("updated"); // Update 3
  // Another render (not batched)
};

// React 18+: ALL updates are automatically batched
const handleClick = async () => {
  setState1("updated");
  setState2("updated");
  // 1 render (batched automatically)

  await fetch("/api/data");

  setState3("updated");
  // Still batched! (automatic batching in async)
  // 1 render total
};

// BUT: Can opt out if needed
import { flushSync } from "react-dom";

const handleClick = () => {
  flushSync(() => setState1("updated")); // Force immediate render
  setState2("updated"); // Another render
};
```

---

## Deep Dive: Advanced Features {#advanced-features}

### Concurrent Rendering

**What is it?**

Concurrent rendering allows React to interrupt rendering work to handle higher-priority updates. Instead of rendering the entire component tree in one go, React can pause, yield to the browser, and resume later.

```javascript
// EXAMPLE: Normal rendering (blocking)
function ExpensiveComponent() {
  // Simulate expensive render (100ms)
  const start = performance.now();
  while (performance.now() - start < 100) {}

  return <div>Expensive render complete</div>;
}

function App() {
  const [urgent, setUrgent] = useState("");
  const [normal, setNormal] = useState("");

  return (
    <>
      {/* Typing in urgent input will be blocked by ExpensiveComponent render */}
      <input
        value={urgent}
        onChange={(e) => setUrgent(e.target.value)}
        placeholder="Type something (will lag)"
      />
      <button onClick={() => setNormal("clicked")}>Normal Update</button>
      <ExpensiveComponent />
    </>
  );
}

// Solution: Use startTransition to mark updates as non-urgent
import { startTransition } from "react";

function App() {
  const [urgent, setUrgent] = useState("");
  const [normal, setNormal] = useState("");

  const handleNormalClick = () => {
    startTransition(() => {
      setNormal("clicked"); // Low priority - can be interrupted
    });
  };

  return (
    <>
      {/* Urgent input updates are processed immediately */}
      <input
        value={urgent}
        onChange={(e) => setUrgent(e.target.value)}
        placeholder="Type something (smooth!)"
      />
      <button onClick={handleNormalClick}>Normal Update (interruptible)</button>
      <ExpensiveComponent />
    </>
  );
}
```

**Transition Hook:**

```javascript
import { useTransition } from "react";

function SearchResults() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    const value = e.target.value;
    setInput(value); // Urgent update - immediate

    startTransition(() => {
      // Non-urgent update - can be interrupted
      const filtered = expensiveSearch(value);
      setResults(filtered);
    });
  };

  return (
    <>
      <input value={input} onChange={handleChange} />
      {isPending && <div>Searching...</div>}
      <ResultsList results={results} />
    </>
  );
}

function expensiveSearch(term) {
  // Simulate expensive operation
  const start = performance.now();
  while (performance.now() - start < 100) {}
  return ["result1", "result2"];
}
```

### Suspense & Streaming

**Code Splitting with Suspense:**

```javascript
import { Suspense, lazy } from "react";

// Lazy load component only when needed
const HeavyComponent = lazy(() => import("./HeavyComponent"));
const ChartComponent = lazy(() => import("./ChartComponent"));

function Dashboard() {
  return (
    <>
      <h1>Dashboard</h1>

      {/* Show fallback while loading */}
      <Suspense fallback={<div>Loading dashboard...</div>}>
        <HeavyComponent />
      </Suspense>

      <Suspense fallback={<div>Loading chart...</div>}>
        <ChartComponent />
      </Suspense>
    </>
  );
}

// Benefits:
// 1. Initial bundle is smaller
// 2. User sees content faster
// 3. Components load on-demand
```

**Error Boundaries with Suspense:**

```javascript
import { Suspense } from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Component failed to load:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Failed to load component. Please try again.</div>;
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>
    </ErrorBoundary>
  );
}

// Handles both loading AND error states gracefully
```

**Server-Side Rendering with Suspense:**

```javascript
// Server (Node.js with renderToPipeableStream)
import { renderToPipeableStream } from "react-dom/server";

app.get("/", (req, res) => {
  const { pipe } = renderToPipeableStream(<App />, {
    onShellReady() {
      // Stream HTML to client immediately
      res.setHeader("content-type", "text/html");
      pipe(res);
    },
  });
});

// Client receives HTML in chunks:
// 1. Shell HTML (header, skeleton)
// 2. HeavyComponent loads
// 3. ChartComponent loads
// User sees content progressively!
```

### React Server Components

**What are Server Components?**

Server Components render exclusively on the server and don't require JavaScript in the browser. They can:

- Access databases directly
- Use server-only secrets
- Reduce bundle size

```javascript
// ✅ Server Component (runs only on server)
// app/products/page.tsx
import { fetchProducts } from "@/lib/db";

export default async function ProductPage() {
  // Direct database access - never exposed to client
  const products = await fetchProducts();

  return (
    <div>
      <h1>Products</h1>
      <ProductList products={products} />
    </div>
  );
}

// ProductList can be a Client Component if it needs interactivity
("use client");

function ProductList({ products }) {
  const [filter, setFilter] = useState("");

  return (
    <>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter products"
      />
      <ul>
        {products.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </>
  );
}
```

**Benefits:**

```javascript
// Bundle Size Comparison

// ❌ Client Component (traditional)
// - Query passed as JSON
// - ORM code shipped to browser
// - Database client library in JS
// Bundle: ~250KB

// ✅ Server Component (Next.js 15+)
// - Only rendered result sent
// - No database code in browser
// - Server handles all data fetching
// Bundle: ~50KB

// Result: Client receives ~80% less JS!
```

**Limitations & Trade-offs:**

```javascript
// ❌ Server Components CANNOT:
// - Use hook (useState, useContext, etc.)
// - Use browser APIs (localStorage, window, etc.)
// - Use event listeners

// ✅ Must use Client Components for those features
"use client";

import { useState } from "react";

function InteractiveProduct({ product }) {
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    localStorage.setItem("cart", quantity);
    // Client-only logic
  };

  return (
    <>
      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />
      <button onClick={handleAddToCart}>Add to Cart</button>
    </>
  );
}
```

---

## 🛠️ Practice

### Your Assignment

1. **Take one of your existing projects**
2. **Profile it** using React DevTools Profiler
   - Identify slow renders
   - Find unnecessary re-renders
3. **Detect bottlenecks**
   - Use the chrome DevTools Performance tab
   - Analyze rendering time
4. **Refactor strategically**
   - Apply optimization techniques
   - Measure improvements

---

## 🎯 Senior-Level Mastery

### Key Skill

> **You should be able to answer: "Why did this re-render?" in 10 seconds.**

This is what separates **senior+ level engineers** from the rest.

### Questions You Should Master

- Why did a component re-render without any prop/state changes?
- Is `React.memo` the right choice here?
- When should I use `useMemo` vs just re-calculating?
- How does batching affect my performance?
- What happens with Suspense boundaries?
- How do Server Components affect bundle size?

---

**Good luck! 🚀**
