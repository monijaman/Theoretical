# React Internals + Performance Mastery

## ⚡ Quick Start: Real-World Analogies

If you're new to these concepts, here are easy ways to think about them:

- **Reconciliation:** Like a "Spot the Difference" game. Instead of redrawing the whole picture, you only paint over the 3 things that changed. (Virtual DOM diffing).
- **Fiber:** Like a chef who can pause chopping onions to answer an urgent phone call (high priority) and then resume exactly where they left off. (Scheduling/Concurrency).
- **Render vs Commit Phase:**
  - **Render Phase:** Designing the house blueprint. You can change your mind 100 times; no physical work is done. (Pure functions).
  - **Commit Phase:** Actually building the house from the blueprint. Once you pour the concrete (update DOM), you can't easily stop. (Side effects).
- **useMemo / useCallback:** Like a "Sticky Note". Instead of recalculating `987 * 123` every time someone asks, you write the answer on a note and just hand it to them next time. (Memory caching).
- **Batching:** Like a waiter waiting to take *all* the drink orders for a table at once instead of running to the kitchen for every single glass of water. (Efficiency).

---

## � Table of Contents

1. [Reconciliation Algorithm](#reconciliation-algorithm)
2. [React Fiber Architecture](#react-fiber-architecture)
3. [Rendering Phases](#rendering-phases)
4. [Re-rendering & Optimization](#re-rendering--optimization)
5. [Advanced Features](#advanced-features)

---

## �📚 Learn Deeply

### Core Concepts

- **Reconciliation algorithm**
  - **What it is:** React’s “Spot the Difference” engine. It compares the old Virtual DOM with the new one to decide exactly what needs to change in the real DOM.
  - **Real-World Example:** Like updating a shopping list. Instead of throwing away the whole list and writing a new one, you just cross off "Milk" and add "Eggs."
  - **Goal:** Minimize expensive browser layout/paint operations to keep the app snappy.

- **React Fiber architecture**
  - **What it is:** The modern rendering engine that breaks work into tiny, pause-able chunks.
  - **Real-World Example:** Like a chef who can pause chopping onions to answer an urgent phone call (high priority), then resume chopping exactly where they left off.
  - **Goal:** Keep the UI responsive by never blocking the main thread for too long.

- **Rendering phases (Render vs Commit)**
  - **What it is:** The two-step process of building the UI. Render phase designs the "blueprint"; Commit phase pours the "concrete."
  - **Real-World Example:** Planning a house (Render) where you can change the layout 100 times for free, versus actually building it (Commit) where changes become physical and expensive.
  - **Goal:** Separate "pure" calculation from "impure" DOM changes for performance and stability.

### Re-rendering & Optimization

- **Why components re-render**
  - **What it is:** When React decides a component needs to refresh its output due to changes in its state, its parent, or its context.
  - **Real-World Example:** Like a news ticker updating when the stock price changes, or a clock updating every second.
  - **Goal:** Ensure the UI always stays in sync with the underlying data.

- **Performance optimization techniques**
  - **What it is:** Using `useMemo`, `useCallback`, and `React.memo` to stop unnecessary work.
  - **Real-World Example:** Like writing down the answer to a math problem on a "Sticky Note" (memoization) so you don't have to calculate it again next time someone asks.
  - **Goal:** Avoid "wasteful" renders where nothing has visually changed.

- **Batching updates**
  - **What it is:** React grouping multiple state updates into a single render to save time.
  - **Real-World Example:** A waiter waiting to take *all* the drink orders for a table at once instead of running to the kitchen for every single glass of water.
  - **Goal:** Drastically reduce the number of times the screen has to re-draw.

### Advanced Features

- **Concurrent rendering**
  - **What it is:** The ability for React to work on multiple tasks at once and prioritize the most urgent ones (like typing).
  - **Real-World Example:** Like a computer OS that handles your typing instantly even while it's downloading a large file in the background.
  - **Goal:** Perfect fluid interactivity even during heavy data processing.

- **Suspense & streaming**
  - **What it is:** A way to show parts of your page as they become ready, rather than waiting for the whole thing to load.
  - **Real-World Example:** Like a YouTube video that starts playing while it's still buffering the rest of the file.
  - **Goal:** Significantly reduce "Time to First Byte" and improve perceived loading speed.

- **React Server Components (RSC)**
  - **What it is:** Components that run entirely on the server, sending only the final result to the browser.
  - **Real-World Example:** Receiving a fully cooked meal (HTML) instead of getting a box of raw ingredients (JavaScript) that you have to cook yourself.
  - **Goal:** Reduce the amount of JavaScript sent to the client and speed up initial page loads.
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

## Reconciliation Algorithm

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

## React Fiber Architecture

**What is Fiber?**

Fiber is React's reconciliation engine introduced in React 16. It's a complete rewrite of how React schedules and manages component rendering. Instead of rendering the entire component tree synchronously (one big blocking operation), Fiber breaks rendering into small units of work that can be paused, prioritized, and resumed.

**Pre-Fiber (React 15) Problem:**

```javascript
// React 15: Stack Reconciler
// Rendering was synchronous and blocking
function render(component) {
  // Render entire tree from top to bottom
  // If this takes 50ms, the browser is blocked for 50ms
  // User input, animations are delayed

  processComponent(component);
  for (let child of component.children) {
    render(child); // Recursive - can't pause
  }
}

// Problem: Large apps could cause janky UI (16ms frame budget violated)
```

**Fiber Solution:**

```javascript
// React 16+: Fiber Architecture
// Rendering is asynchronous and interruptible

class Fiber {
  constructor(component, props) {
    this.component = component;
    this.props = props;
    this.parent = null;
    this.child = null;
    this.sibling = null;
    this.alternate = null; // Previous version of this fiber
    this.effects = []; // Side effects to run later
    this.hooks = []; // Hooks state
  }
}

// Instead of recursion, React walks a linked list
// Can pause at any time and resume later
function performWork(deadline) {
  while (hasMoreWork() && deadline.timeRemaining() > 1) {
    // Do some work (render one component)
    processWorkUnit();
  }

  if (hasMoreWork()) {
    // More work? Schedule another batch
    scheduleCallback(performWork);
  } else {
    // All render work done? Commit changes to DOM
    commitRoot();
  }
}
```

**Key Concepts:**

1. **Work Scheduling & Priority Levels**

```javascript
// React has 5 priority levels:
// 1. IMMEDIATE       (Sync, like user input)
// 2. USER_BLOCKING   (100-250ms, like clicking a button)
// 3. NORMAL          (250-5000ms, data fetching)
// 4. LOW             (5-10s, analytics)
// 5. IDLE            (whenever browser is free)

import { startTransition, useTransition } from "react";

function SearchApp() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    // User typing = IMMEDIATE priority (urgent)
    setInput(e.target.value);

    // Search results = NORMAL priority (can be interrupted)
    startTransition(() => {
      setResults(expensiveSearch(e.target.value));
    });
  };

  return (
    <>
      <input value={input} onChange={handleChange} />
      {isPending && <Spinner />}
      <ResultsList results={results} />
    </>
  );
}

// Network request comes in while searching?
// React pauses search, handles network, resumes search
```

2. **Time-Slicing (Concurrent Features)**

```javascript
// React has ~5ms per frame to do work
// (60fps = 16.67ms total, minus browser overhead)

function timeSlice() {
  const frameDeadline = performance.now() + 5; // 5ms budget

  while (hasMoreWork() && performance.now() < frameDeadline) {
    // Render one component
    processOneComponent();
  }

  if (hasMoreWork()) {
    // Request next frame
    requestIdleCallback(timeSlice, { timeout: 250 });
  } else {
    // Commit phase
    commit();
  }
}

// Result: 60fps animations + responsive UI
// Before: 1000-item list render = janky
// After: 1000-item list render = smooth (split across frames)
```

3. **The Fiber Tree Structure**

```javascript
// Component tree:
// <App>
//   <Header />
//   <List>
//     <Item />
//     <Item />
//   </List>
// </App>

// Becomes a Fiber tree (linked list):
const appFiber = {
  component: App,
  child: headerFiber, // First child
  sibling: null, // No siblings (is root)
  parent: null,
  alternate: previousAppFiber, // Previous render
};

const headerFiber = {
  component: Header,
  parent: appFiber,
  sibling: listFiber, // Next sibling
  child: null, // No children
  alternate: previousHeaderFiber,
};

const listFiber = {
  component: List,
  parent: appFiber,
  sibling: null,
  child: itemFiber1, // First item child
  alternate: previousListFiber,
};

// Traversal order: App → Header → List → Item1 → Item2
// Can pause at any step and resume later
```

**Benefits:**

| Feature          | Old (Stack)            | New (Fiber)                  |
| ---------------- | ---------------------- | ---------------------------- |
| Rendering        | Synchronous (blocking) | Asynchronous (interruptible) |
| Pause/Resume     | ❌ No                  | ✅ Yes                       |
| Priority         | ❌ All same            | ✅ 5 levels                  |
| Browser feedback | ❌ Blocked             | ✅ Responsive                |
| Large trees      | 🐢 Janky               | 🚀 Smooth                    |

---

## Rendering Phases

**Overview:**

React's rendering is split into two distinct phases:

1. **Render Phase** - Determines what changed (can be paused)
2. **Commit Phase** - Applies changes to DOM (synchronous, no pausing)

**Why They're Separated:**

Render phase is **pure and idempotent** (no side effects), so React can:

- Pause and resume it
- Discard work if higher-priority updates come in
- Run it multiple times

Commit phase **must be synchronous** because side effects are involved:

- DOM mutations
- Lifecycle methods
- User-visible changes

---

### 1. Render Phase

**What happens:**

- React visits each fiber
- Calls component function (or class render method)
- Compares old and new Virtual DOM
- Marks what needs updating (no actual changes yet)
- **NO side effects allowed**

```javascript
// EXAMPLE: Render Phase
function Parent() {
  const [count, setCount] = useState(0);

  // ✅ This is fine - pure function
  const doubled = count * 2;

  // ❌ NOT ALLOWED - side effect
  // fetch('/api/data');  // Will break!

  return <Child value={doubled} />;
}

function Child({ value }) {
  // Component function is called during render phase
  // Should be pure - same inputs → same output
  // Can run multiple times

  console.log("Child render"); // Can run 0, 1, or 2+ times
  return <div>{value}</div>;
}

// If higher-priority update comes in during render:
// React discards Child's work and starts over
// That's why Child rendered 2x but only showed once
```

**Render Phase Timeline:**

```javascript
Render Phase:
├─ Visit Parent fiber
│  ├─ Call Parent() function
│  ├─ Reconcile old vs new Virtual DOM
│  └─ Mark changes needed
├─ Visit Child fiber
│  ├─ Call Child() function
│  ├─ Reconcile props
│  └─ Mark changes needed
└─ (Can be interrupted by higher-priority work)

// At any point, if urgent update arrives:
// React discards current progress and starts render phase over
```

**Idempotency Requirement:**

```javascript
// ✅ GOOD - Pure render function
function Counter({ count }) {
  // Same input (count=5) → always returns same JSX
  return <div>{count}</div>;
}

// ❌ BAD - Impure render function
function Counter() {
  // Side effect in render (bad!)
  fetch("/api/count").then((c) => setCount(c));

  // May run multiple times during render
  // Triggers multiple API calls
  return <div>...</div>;
}

// Rule: Render phase must be idempotent
// f(x) called 1x or 100x = same result
```

---

### 2. Commit Phase

**What happens:**

- **Synchronous** - cannot be interrupted
- Actually updates the DOM
- Runs lifecycle methods
- Runs effects from useEffect, useLayoutEffect
- **Side effects are allowed here**

```javascript
Commit Phase Flow:
├─ Run useLayoutEffect cleanup (if deps changed)
├─ Apply DOM mutations (insert, update, remove nodes)
├─ Run useLayoutEffect
├─ Browser paints
├─ Run useEffect cleanup (if deps changed)
└─ Run useEffect

// All of this is BLOCKING - browser can't do anything else
// But it's usually very fast (few milliseconds)
```

**Complete Example:**

```javascript
function DataComponent({ id }) {
  const [data, setData] = useState(null);

  // Render phase - pure, may run multiple times
  const displayData = data?.toUpperCase(); // ✅ Pure

  // useLayoutEffect - commit phase, runs AFTER DOM
  useLayoutEffect(() => {
    // ✅ Allowed - side effect
    element.style.color = "blue";

    return () => {
      // Cleanup before next effect
      element.style.color = "black";
    };
  }, []); // Only runs once (no id in deps)

  // useEffect - commit phase, runs AFTER paint
  useEffect(() => {
    // ✅ Allowed - side effect
    fetch(`/api/data/${id}`)
      .then((r) => r.json())
      .then(setData);

    return () => {
      // Cleanup
      // (if id changes before fetch completes, cleanup runs)
    };
  }, [id]); // Runs when id changes

  return <div>{displayData || "Loading..."}</div>;
}

// Timeline for id=1 → id=2 change:
// 1. Render phase: Call DataComponent with id=2
// 2. Commit phase:
//    a. useLayoutEffect cleanup from id=1
//    b. DOM updated
//    c. useLayoutEffect with id=2
//    d. Browser paints
//    e. useEffect cleanup from id=1
//    f. useEffect with id=2
//    g. (fetch fires off)
```

**useLayoutEffect vs useEffect:**

```javascript
// ❌ useEffect (runs AFTER paint)
function BrokenFlash() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // User sees element jump:
    // 1. Paint: element height=0
    // 2. useEffect runs: setHeight(200)
    // 3. Paint: element height=200
    // Flashes!
    setHeight(element.offsetHeight);
  }, []);

  return <div>Content</div>;
}

// ✅ useLayoutEffect (runs BEFORE paint)
function SmoothMeasure() {
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    // No flash:
    // 1. Measure: height=200
    // 2. Paint: element height=200 (correct!)
    setHeight(element.offsetHeight);
  }, []);

  return <div>Content</div>;
}
```

---

### Visual Timeline

```
User clicks button / State changes
    ↓
┌─ RENDER PHASE ──────────────────┐
│ • Call component functions      │ 🔄 Can be interrupted
│ • Create new Virtual DOM        │ 🔄 Can run multiple times
│ • Compare with old Virtual DOM  │ ✅ Must be pure
│ • Plan DOM changes              │
└─────────────────────────────────┘
    ↓
┌─ COMMIT PHASE ──────────────────┐
│ 1. useLayoutEffect cleanup      │ 🚫 Cannot interrupt
│ 2. Update DOM                   │ ⚡ Synchronous
│ 3. Run useLayoutEffect          │ ✅ Side effects OK
│ 4. Browser paints (user sees)  │
│ 5. useEffect cleanup            │
│ 6. Run useEffect                │
└─────────────────────────────────┘
    ↓
 User sees result
```

**Real-world Impact:**

```javascript
// Scenario: Expensive render + many state updates

function ExpensiveList({ items }) {
  // This component is slow (100ms to render)
  const sorted = slowSort(items); // Takes 100ms

  return sorted.map((item) => <Item key={item.id} item={item} />);
}

// With Fiber:
// User clicks → urgent update (input) comes in
// React pauses slow render, shows input immediately ✅
// Resumes slow render when browser idle

// Render phase was interrupted:
// - Render phase: Discarded
// - Commit phase: Waits (input is more important)
// - Input renders: Commit phase runs (synchronous with DOM)
// - Back to slow render: Render phase starts fresh
```

---

## Re-rendering & Optimization

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
  console.log("SearchBox rendered");
  const handleChange = (e) => {
    onSearch(e.target.value);
  };

  return <input onChange={handleChange} />;
}

const MemoSearchBox = React.memo(SearchBox); // Memoized version

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
function ParentOptimized() {
  const [results, setResults] = useState([]);

  // stabilize the callback function with useCallback
  const handleSearch = useCallback((term) => {
    setResults(term);
  }, []); // Function reference never changes across renders

  return <MemoSearchBox onSearch={handleSearch} />;
  // Now MemoSearchBox truly skips re-renders!
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

## Advanced Features

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

**What is Suspense?**

Suspense is a React feature that lets you handle asynchronous operations (like code splitting, data fetching) gracefully. It allows components to "suspend" rendering while waiting for something (usually code or data), and shows a fallback UI during that time.

---

**Code Splitting with Suspense:**

**What it does:**

- Automatically splits your bundle into smaller chunks
- Loads components only when they're needed (lazy loading)
- Reduces initial bundle size significantly
- Shows loading UI while component is being downloaded

**Why it matters:**

- Smaller initial JavaScript = faster page load
- Only downloaded code that's actually used
- Fallback UI shows users something is loading
- Each chunk can load independently

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

**Example Flow:**

```
1. User visits dashboard (only Dashboard component loaded)
2. Dashboard renders with Suspense wrappers
3. HeavyComponent chunk starts downloading in background
4. User sees "Loading dashboard..." fallback
5. Chunk downloads and component renders
6. ChartComponent chunk downloads separately
7. User sees "Loading chart..." fallback
8. Chart renders when ready

Result: User sees content progressively, not stuck on blank page
```

---

**Error Boundaries with Suspense:**

**What it does:**

- Catches errors thrown by suspended components
- Provides error UI when code splitting fails
- Combines loading state (Suspense) + error state (ErrorBoundary)
- Allows graceful degradation when components fail to load

**Why it matters:**

- Network failures happen (timeouts, 404s, etc.)
- Users need to know what went wrong
- Can retry loading failed components
- Better UX than blank screen or console errors

**When it catches errors:**

- Failed lazy component imports (network error, 404)
- Errors during render phase
- Errors in lifecycle methods

⚠️ **Important:** ErrorBoundary only catches errors during render, not in event handlers or async code

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

---

**Server-Side Rendering with Suspense:**

**What it does:**

- Renders React components on the server
- Streams HTML to the client in chunks (not all at once)
- Shows a shell/skeleton UI immediately while data loads
- Gradually hydrates components as they become ready
- Suspense boundaries control what gets streamed when

**Why it matters:**

- **Faster First Paint:** User sees something immediately (shell HTML)
- **Better SEO:** Server-rendered HTML is crawlable
- **Progressive Enhancement:** Content appears as it loads
- **Reduced Blocking:** High-priority content loads first
- **No blank page:** Users see skeleton UI while waiting

**Traditional SSR (without Suspense):**

```
Server renders entire app → waits for ALL data → sends HTML
User waits for slowest component before seeing anything
```

**With Streaming SSR + Suspense:**

```
Server renders shell → sends HTML immediately → shows skeleton
Slow components load → stream HTML chunks to client
User sees fast shell first, content fills in progressively
```

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
