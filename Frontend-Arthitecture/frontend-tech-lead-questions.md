# Tech Lead Frontend Team Lead Interview Cheat Sheet

This is a complete **question and answer cheat sheet** for the Frontend Team Lead role at Tech Lead, covering **React, Next.js, frontend architecture, performance optimization, leadership, system design, testing, Agile, and behavioral questions**.

---

## 1️⃣ React Advanced Questions

### Q1: Explain React rendering lifecycle.

**Answer:**

- **Mount:** `constructor()`, `getDerivedStateFromProps()`, `render()`, `componentDidMount()`
- **Update:** `getDerivedStateFromProps()`, `shouldComponentUpdate()`, `render()`, `getSnapshotBeforeUpdate()`, `componentDidUpdate()`
- **Unmount:** `componentWillUnmount()`
- **Hooks:** `useEffect()` replaces lifecycle methods; `useLayoutEffect()` runs before DOM paint.
- **Fiber architecture:** Enables interruptible updates and concurrent rendering.

**Example:**

> In a vehicle dashboard, we used `useEffect` for WebSocket connections and `useLayoutEffect` for chart rendering.

---

### Q2: How do you prevent unnecessary re-renders?

**Answer:**

- Use `React.memo` for components
- `useCallback` for function props
- `useMemo` for expensive calculations
- Keep state local to components
- Avoid inline objects/arrays as props

**Example:**

> Wrapped `VehicleCard` in `React.memo` and memoized vehicle stats calculation, reducing re-renders by 40%.

---

### Q3: What is reconciliation?

**Answer:**

- React compares Virtual DOM to previous Virtual DOM.
- Only updates changed nodes.
- Use unique keys for lists; avoid index as key.

**Example:**

> Used vehicle VIN as key for vehicle list to avoid unnecessary re-renders.

---

### Q4: Concurrent rendering

**Answer:**

- Introduced in React 18.
- Allows interruptible rendering.
- Improves perceived performance for large UI trees.
- Uses `startTransition`, Suspense, and automatic batching.

---

## 2️⃣ Next.js Questions

### Q1: SSR vs SSG vs ISR vs CSR

**Answer:**
| Type | When | Example |
|------|------|---------|
| SSR | Dynamic content per user | Vehicle dashboard |
| SSG | Static marketing pages | Landing page |
| ISR | Semi-static pages updated periodically | Vehicle alerts page |
| CSR | Heavy client interaction | Admin panel |

---

### Q2: Code splitting

**Answer:**

- Use dynamic imports with `next/dynamic`
- Tree shaking removes unused code
- Reduces initial load time
- Lazy-load non-critical components

**Example:**

> Lazy-loaded `VehicleCharts` component using `next/dynamic` on dashboard tab.

---

### Q3: Performance optimization in Next.js

**Answer:**

- Image optimization with `next/image`
- Font optimization
- React Server Components
- Bundle analysis and code splitting
- CDN caching
- Prefetching links
- Compression of assets

**Example:**

> Optimized dashboard bundle size by lazy-loading charts, images, and fonts, reducing LCP by 30%.

---

## 3️⃣ Frontend Architecture Questions

### Q1: How would you design a frontend for a vehicle monitoring dashboard?

**Answer:**

- **Folder structure:** Feature-based
- **Shared components:** Charts, tables, modals
- **State management:** TanStack Query (server state), Redux/Zustand (client state)
- **Real-time updates:** WebSockets
- **Error handling:** Error boundaries + fallback UI
- **Testing:** Unit tests for components, integration for API

**Example structure:**

```
src/
  features/
    vehicles/
    alerts/
    health/
  shared/
    components/
    hooks/
    utils/
```

---

### Q2: How to enforce coding standards?

**Answer:**

- ESLint + Prettier
- Husky pre-commit hooks
- Pull request checklist for architecture, performance, testing
- Code review rotation
- ADR documentation

---

### Q3: How do you scale React application?

**Answer:**

- Modular architecture, lazy loading
- Component libraries/design systems
- Split state management
- Dynamic imports
- Performance profiling & memoization

---

## 4️⃣ Performance & Optimization Questions

### Q1: How to debug performance issues?

**Answer:**

- React DevTools Profiler
- Chrome DevTools timeline
- Lighthouse / Web Vitals
- Network analysis
- Optimize heavy renders & API calls

---

### Q2: Tree shaking

**Answer:**

- Removes unused code from final bundle
- Works with ES6 modules
- Reduces JS size → faster load

---

### Q3: Handling large tables

**Answer:**

- Virtualization (`react-window` / `react-virtualized`)
- Pagination/infinite scroll
- Memoization for row rendering
- Debounced filtering

---

## 5️⃣ API & Backend Collaboration

### Q1: API contracts

**Answer:**

- Shared OpenAPI/Swagger definitions
- Type-safe DTOs
- Versioning strategy
- Error format standardization

---

### Q2: Handling API failures

**Answer:**

- Retry with exponential backoff
- Global error boundary
- Fallback UI & toast notifications
- Optimistic updates where safe

---

## 6️⃣ Leadership Questions

### Q1: Handling underperforming team member

**Answer:**

1. Private discussion → identify issues
2. Offer mentorship/training
3. Set clear expectations & deadlines
4. Follow up regularly
5. Escalate if no improvement

---

### Q2: Code reviews

**Answer:**

- Check architecture, performance, and security
- Focus on naming, readability, test coverage
- Give constructive feedback
- Use review checklist

---

### Q3: Managing technical debt

**Answer:**

- Allocate sprint % for refactoring
- Keep ADR for future reference
- Prioritize based on impact
- Track in Jira

---

## 7️⃣ System Design Example

**Question:** Design a Real-Time Vehicle Dashboard
**Answer:**

- **Frontend:** WebSockets → Zustand/TanStack Query → Component updates
- **Backend:** Pub/Sub / Redis / Kafka → API → Client
- **Performance:** Throttle updates, selective rendering
- **Scalability:** Lazy-load modules, split state, optimize charts

---

## 8️⃣ Agile / Process Questions

- **Sprint:** Fixed time iteration to deliver features
- **Story points:** Relative effort estimation
- **Velocity:** Work completed per sprint
- **RFC:** Request for Comments → proposed solution for review
- **ADR:** Architecture Decision Record → documents key technical decisions
- **PR policy:** Review + approval + CI checks before merging

---

## 9️⃣ Testing Questions

- **Unit testing:** Jest
- **Component testing:** React Testing Library
- **E2E testing:** Cypress
- **API mocking:** MSW / Axios mocks
- **Snapshot testing:** For UI regression

---

## 🔟 Behavioral Questions

**Examples:**

- **Architectural decision:** "Migrated dashboard to Server Components → reduced load by 50%"
- **Conflict resolution:** "Mentored junior developer on API integration → delivered feature on time"
- **Handling deadlines:** "Prioritized critical dashboards, deferred minor UI improvements"

---

## 11️⃣ Remote Work & Communication

- Overlap 4 hours with SF → Zoom / Slack daily standup
- Document decisions in Confluence
- Async updates for non-overlapping hours
- Jira for sprint tracking

---

## **Tips for Maximum Impact**

1. Use **STAR method** for behavioral answers (Situation, Task, Action, Result)
2. Quantify achievements (e.g., "Reduced dashboard load time by 50%")
3. Use **domain-relevant examples** (EV / vehicle monitoring)
4. Practice **whiteboarding** or Figma architecture diagrams
5. Ask questions about tech stack, team size, roadmap
6. Be ready to justify working SF overlap hours (8 PM–12 AM Dhaka)

---

This cheat sheet is ready for **memorization and last-minute review** before your interview.
