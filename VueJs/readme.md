# Vue 3 Interview Guide

Vue 3 is a progressive JavaScript framework for building user interfaces. In interviews, the focus is usually not just on syntax, but on whether you understand reactivity, component communication, state management, rendering behavior, and tradeoffs between Vue 2 and Vue 3 patterns.

---

## Table of Contents

1. [Vue 3 Overview](#vue-3-overview)
2. [Vue 3 Core Concepts](#vue-3-core-concepts)
3. [Vue 3 Interview Questions and Answers](#vue-3-interview-questions-and-answers)
4. [Composition API Questions](#composition-api-questions)
5. [Reactivity Questions](#reactivity-questions)
6. [Lifecycle Questions](#lifecycle-questions)
7. [Routing and State Management](#routing-and-state-management)
8. [Performance and Optimization](#performance-and-optimization)
9. [Vue vs React Comparison](#vue-vs-react-comparison)
10. [Coding Examples](#coding-examples)
11. [Common Interview Traps](#common-interview-traps)
12. [Quick Revision Notes](#quick-revision-notes)

---

## Vue 3 Overview

### What is Vue 3?

Vue 3 is the latest major version of Vue.js. It improves performance, TypeScript support, tree-shaking, and developer ergonomics. The biggest conceptual addition is the Composition API, which makes it easier to organize reusable logic in larger components.

### Why do companies use Vue 3?

- Easy to learn and adopt incrementally.
- Strong component model.
- Built-in reactivity system.
- Good performance with compiler optimizations.
- Clean integration with tooling like Vite, Pinia, and Vue Router.

### Key Vue 3 features

- Composition API
- Improved reactivity system based on `Proxy`
- Better TypeScript support
- Fragments
- Teleport
- Suspense
- Multiple `v-model` bindings
- Better bundle optimization and tree-shaking

---

## Vue 3 Core Concepts

### Component-Based Architecture

Vue applications are built from reusable components. Each component can contain:

- Template
- Logic
- Reactive state
- Styles

### Declarative Rendering

Vue lets you declare how the UI should look based on state, instead of manually updating the DOM.

```vue
<template>
	<p>{{ message }}</p>
</template>

<script setup>
const message = 'Hello Vue 3'
</script>
```

### Directives

Common directives:

- `v-if`
- `v-else`
- `v-for`
- `v-bind`
- `v-model`
- `v-on`
- `v-show`

### Single File Components

Vue commonly uses `.vue` files that group template, script, and style together.

---

## Vue 3 Interview Questions and Answers

### 1. What is the difference between Vue 2 and Vue 3?

Important differences:

- Vue 3 uses a `Proxy`-based reactivity system instead of `Object.defineProperty`.
- Vue 3 introduced the Composition API.
- Vue 3 has better TypeScript support.
- Vue 3 supports Fragments, Teleport, and Suspense.
- Vue 3 is generally faster and more tree-shakable.

### 2. What is the Composition API?

The Composition API is a way to organize component logic by feature instead of by option type. Instead of scattering related logic across `data`, `methods`, `computed`, and `watch`, you can group it together in `setup()` or `script setup`.

### 3. What is the Options API?

The Options API organizes component code by options such as:

- `data`
- `methods`
- `computed`
- `watch`
- lifecycle hooks

It is still fully supported in Vue 3 and is often easier for small components.

### 4. Composition API vs Options API?

- **Options API:** Simpler for small components and beginners.
- **Composition API:** Better for large components and reusable logic.
- **Interview answer:** Vue 3 does not force one style. Teams choose based on maintainability, consistency, and complexity.

### 5. What is `script setup`?

`script setup` is a compile-time syntax sugar for Composition API. It reduces boilerplate and makes Vue 3 components more concise.

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)

function increment() {
	count.value++
}
</script>
```

### 6. What is `v-model` in Vue 3?

`v-model` creates two-way binding between form input and component state. In Vue 3, custom components use `modelValue` and emit `update:modelValue`.

### 7. What is a computed property?

A computed property derives a value from reactive state and caches the result until its dependencies change.

Use computed when:

- You want derived state
- The result should be cached
- The logic is used in the template or other computed values

### 8. What is a watcher?

A watcher is used when you want to perform side effects in response to reactive state changes, such as:

- calling an API
- writing to local storage
- debouncing a search
- integrating with external libraries

### 9. Computed vs watch?

- Use `computed` for derived values.
- Use `watch` for side effects.

This is a common interview question.

### 10. What is the virtual DOM in Vue?

Vue creates an in-memory representation of the UI, compares changes, and updates only the necessary parts of the real DOM.

### 11. What are props in Vue?

Props allow data to flow from parent to child.

### 12. How do child components communicate with parents?

Common approaches:

- Emit custom events using `defineEmits`
- Use `v-model`
- In more complex cases, use shared state with Pinia

### 13. What is `key` in `v-for` and why is it important?

`key` helps Vue track identity across re-renders. It improves DOM patching accuracy and prevents subtle UI bugs.

Bad:

```vue
<li v-for="(item, index) in items" :key="index">
	{{ item.name }}
</li>
```

Better:

```vue
<li v-for="item in items" :key="item.id">
	{{ item.name }}
</li>
```

### 14. What is the difference between `v-if` and `v-show`?

- `v-if` adds or removes elements from the DOM.
- `v-show` toggles CSS display.

Use `v-if` when the condition changes rarely.
Use `v-show` when the condition toggles frequently.

### 15. What are slots in Vue?

Slots allow parent components to pass template content into child components.

Types of slots:

- default slot
- named slots
- scoped slots

### 16. What are composables in Vue 3?

Composables are reusable functions that encapsulate reactive logic using the Composition API.

Example use cases:

- fetch data
- track mouse position
- handle form validation
- manage pagination

---

## Composition API Questions

### 17. What happens inside `setup()`?

`setup()` runs before the component is created and is the entry point for Composition API logic. You define refs, reactive state, computed values, watchers, and functions there.

### 18. What is the difference between `ref()` and `reactive()`?

- `ref()` is typically used for primitive values and can also hold objects.
- `reactive()` is used for reactive objects.
- With `ref`, you access the value in JavaScript using `.value`.

```js
import { ref, reactive } from 'vue'

const count = ref(0)
const user = reactive({ name: 'Aman', role: 'Frontend' })
```

### 19. When would you choose `ref` over `reactive`?

Choose `ref` when:

- you have a primitive
- you want explicit value wrapping
- you may replace the whole object reference later

Choose `reactive` when:

- you want an object-like state container
- you prefer property-based access for nested fields

### 20. What are `toRef()` and `toRefs()`?

They convert reactive object properties into refs. This is useful when returning pieces of a reactive object without losing reactivity.

### 21. What is `defineProps()`?

In `script setup`, `defineProps()` declares component props.

```vue
<script setup>
const props = defineProps({
	title: String,
	count: Number
})
</script>
```

### 22. What is `defineEmits()`?

`defineEmits()` declares events a component can emit.

```vue
<script setup>
const emit = defineEmits(['save'])

function handleSave() {
	emit('save')
}
</script>
```

### 23. What is dependency injection in Vue?

Vue supports `provide` and `inject` for dependency sharing across component trees without prop drilling. It is useful for plugin-like or app-wide contextual values, but should not replace all state management.

---

## Reactivity Questions

### 24. How does Vue 3 reactivity work?

Vue 3 uses ES6 `Proxy` to intercept property access and mutations. Vue tracks dependencies during reads and triggers updates on writes.

### 25. Why is Vue 3 reactivity better than Vue 2 reactivity?

- Better support for property additions and deletions
- Better support for arrays and nested structures
- More maintainable internal design
- Better performance characteristics in many cases

### 26. What is the difference between `watch` and `watchEffect`?

- `watch` tracks explicit sources and gives access to old and new values.
- `watchEffect` automatically tracks dependencies used inside its callback.

Use `watchEffect` when the dependency list is naturally derived from the effect itself.

### 27. What is shallow reactivity?

Vue provides APIs like `shallowRef` and `shallowReactive` when you only want top-level reactivity instead of deep reactivity. This can help with performance or integration with external libraries.

### 28. Can destructuring break reactivity?

Yes. Destructuring properties from a reactive object can lose reactivity unless you use `toRefs()` or `toRef()`.

```js
const state = reactive({ count: 0 })

const { count } = state // not reactive as expected
```

Safer:

```js
const state = reactive({ count: 0 })
const { count } = toRefs(state)
```

---

## Lifecycle Questions

### 29. Common lifecycle hooks in Vue 3?

- `onBeforeMount`
- `onMounted`
- `onBeforeUpdate`
- `onUpdated`
- `onBeforeUnmount`
- `onUnmounted`

### 30. When do you use `onMounted()`?

Use `onMounted()` for logic that depends on rendered DOM or browser APIs, such as:

- DOM measurements
- third-party library initialization
- initial client-side API calls

### 31. What should be cleaned up in `onUnmounted()`?

- intervals
- timers
- event listeners
- WebSocket subscriptions
- third-party library instances

---

## Routing and State Management

### 32. What is Vue Router?

Vue Router is the official routing library for Vue. It supports:

- nested routes
- dynamic route params
- navigation guards
- lazy-loaded route components

### 33. What are navigation guards?

Navigation guards allow you to control route access before navigation is completed.

Common use cases:

- authentication
- role-based authorization
- unsaved changes protection

### 34. What is Pinia?

Pinia is the recommended state management library for Vue 3. It is simpler and more type-friendly than Vuex for modern Vue applications.

### 35. Pinia vs Vuex?

- Pinia has a simpler API.
- Pinia is better aligned with Vue 3 and Composition API.
- Pinia has better TypeScript ergonomics.
- Vuex historically used mutations; Pinia does not require that pattern.

### 36. When should you use local state, props, provide/inject, or Pinia?

- Use local state for component-specific data.
- Use props and emits for parent-child communication.
- Use provide/inject for deep contextual sharing.
- Use Pinia for cross-feature shared application state.

---

## Performance and Optimization

### 37. How do you optimize a Vue 3 application?

- Use proper `key` values in lists.
- Avoid unnecessary watchers.
- Prefer computed over repeating expensive logic in templates.
- Lazy load routes and heavy components.
- Use `defineAsyncComponent` when needed.
- Split large components into smaller focused components.
- Avoid deep reactive structures when not needed.

### 38. What is `defineAsyncComponent`?

It allows lazy loading of components.

```js
import { defineAsyncComponent } from 'vue'

const UserChart = defineAsyncComponent(() => import('./UserChart.vue'))
```

### 39. What is Suspense in Vue 3?

Suspense provides a way to coordinate async dependencies in the component tree and show fallback UI while waiting.

### 40. What is Teleport in Vue 3?

Teleport allows rendering part of a component's template somewhere else in the DOM. This is useful for modals, tooltips, and overlays.

---

## Vue vs React Comparison

This chapter matters because interviewers often ask framework comparison questions to evaluate engineering judgment, not brand loyalty. A good answer should explain tradeoffs around learning curve, architecture, rendering model, state handling, and ecosystem choices.

### 41. Vue vs React: what is the high-level difference?

- **Vue:** A more opinionated progressive framework for building UI, with official solutions for routing and state management.
- **React:** A UI library focused on rendering, with a larger ecosystem of third-party choices for routing, state management, and data fetching.

Short interview answer:
Vue gives more built-in conventions, while React gives more flexibility and ecosystem choice.

### 42. Which is easier to learn, Vue or React?

For many developers, Vue is easier initially because:

- templates feel closer to HTML
- the API is more guided
- official tools are more standardized

React can feel more JavaScript-centric because JSX mixes rendering logic directly into JavaScript expressions.

Better interview framing:
Vue usually has a lower entry barrier, while React often becomes attractive when teams want maximum ecosystem flexibility or already have strong JavaScript and architectural discipline.

### 43. Template syntax in Vue vs JSX in React?

- **Vue:** Uses templates with directives like `v-if`, `v-for`, and `v-model`.
- **React:** Uses JSX, where UI is expressed directly in JavaScript.

Vue example:

```vue
<template>
	<button @click="increment">{{ count }}</button>
</template>
```

React example:

```jsx
function Counter() {
	const [count, setCount] = useState(0)

	return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

Interview tradeoff:

- Vue templates can be easier for teams that want stronger separation between markup and logic.
- React JSX can be more flexible because all rendering logic is just JavaScript.

### 44. Vue reactivity vs React state updates?

- **Vue:** Uses a reactivity system that tracks dependencies automatically.
- **React:** Re-renders based on state updates and props changes, with explicit hook-driven state management.

In Vue, computed dependencies are tracked automatically. In React, you often manage memoization and dependency arrays more explicitly.

Interview answer:
Vue hides more of the reactive bookkeeping. React exposes more of the update model to the developer.

### 45. Composition API vs React Hooks?

They solve similar problems: organizing reusable logic in function-based units.

- **Vue Composition API:** Uses `ref`, `reactive`, `computed`, `watch`, and composables.
- **React Hooks:** Uses `useState`, `useEffect`, `useReducer`, `useRef`, and custom hooks.

Key difference:

- Vue separates side effects and derived state through dedicated primitives like `computed` and `watch`.
- React relies heavily on hooks plus render cycles, and developers need to reason carefully about dependency arrays.

### 46. State management in Vue vs React?

- **Vue:** Local state plus props/emits covers a lot; Pinia is the standard modern global store.
- **React:** Local state is built in, but teams choose from Context, Redux, Zustand, Jotai, or others for shared state.

Interview tradeoff:
Vue gives a more standardized path. React gives more options, but teams must choose and enforce consistency.

### 47. Routing in Vue vs React?

- **Vue:** Vue Router is the standard official solution.
- **React:** React Router is common, but it is still a library choice rather than part of React itself.

This matters in interviews because it shows that Vue’s ecosystem is more opinionated and cohesive by default.

### 48. Performance: is Vue faster than React?

The correct interview answer is not to make absolute claims.

- Both are fast enough for most real-world apps.
- Performance depends more on architecture, rendering patterns, component boundaries, list handling, and unnecessary work.
- Vue 3 has strong compiler optimizations and efficient reactivity.
- React is also highly optimized and benefits from a mature ecosystem and advanced rendering strategies.

Better answer:
Framework choice rarely fixes poor component design. Teams usually get bigger gains from reducing unnecessary renders, splitting bundles, and managing state carefully.

### 49. Vue vs React for large applications?

Both can scale well.

Vue strengths for large apps:

- official ecosystem
- consistent patterns
- easier onboarding for mixed-seniority teams

React strengths for large apps:

- huge ecosystem
- easier hiring in many markets
- strong flexibility for custom architecture

Interview answer:
Vue often optimizes for convention and team consistency, while React optimizes for flexibility and ecosystem breadth.

### 50. Vue vs React with TypeScript?

- Vue 3 improved TypeScript support significantly.
- React with TypeScript is also extremely common and mature.
- Pinia and Vue 3 Composition API work well with TypeScript.
- React TypeScript patterns are widely documented, especially in enterprise codebases.

Balanced answer:
Both work well with TypeScript today. The decision is more about team preference, ecosystem fit, and codebase standards than raw capability.

### 51. When would you choose Vue over React?

You might choose Vue when:

- the team wants faster onboarding
- a more guided official ecosystem is preferred
- template-based authoring feels more maintainable for the team
- the project values convention over ecosystem experimentation

### 52. When would you choose React over Vue?

You might choose React when:

- the team wants maximum ecosystem flexibility
- the organization already has React expertise
- hiring strongly favors React experience
- the codebase depends on React-specific ecosystem tooling

### 53. Interview answer: which is better, Vue or React?

Best answer:
Neither is universally better. Vue is often stronger on conventions, approachability, and official tooling cohesion. React is often stronger on ecosystem breadth, flexibility, and talent availability. The right choice depends on team experience, project size, architectural constraints, and hiring strategy.

### 54. Quick comparison table

| Area | Vue 3 | React |
| --- | --- | --- |
| Nature | Progressive framework | UI library |
| Syntax | Templates + directives | JSX |
| Logic reuse | Composables | Custom hooks |
| Reactivity | Automatic dependency tracking | Explicit state and render model |
| Official router | Vue Router | External library choice |
| Official global state | Pinia | No single official choice |
| Learning curve | Often easier initially | Often steeper initially |
| Flexibility | Moderate, guided | Very high |
| Ecosystem | Cohesive | Massive |
| Hiring market | Strong, smaller than React | Very large |

### 55. High-value Vue vs React interview questions

1. How would you compare Vue Composition API with React Hooks?
2. Why might one team prefer Vue templates over React JSX?
3. What does Vue's reactivity system abstract away compared to React?
4. Why can React projects drift more in architecture than Vue projects?
5. When does ecosystem flexibility become a cost instead of a benefit?
6. How would hiring constraints affect Vue vs React choice?
7. Why is it inaccurate to claim one is always faster than the other?

---

## Coding Examples

### Example 1: Counter with `ref`

```vue
<template>
	<div>
		<p>Count: {{ count }}</p>
		<button @click="increment">Increment</button>
	</div>
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)

function increment() {
	count.value += 1
}
</script>
```

### Example 2: Derived state with `computed`

```vue
<script setup>
import { ref, computed } from 'vue'

const firstName = ref('John')
const lastName = ref('Doe')

const fullName = computed(() => `${firstName.value} ${lastName.value}`)
</script>
```

### Example 3: Side effect with `watch`

```vue
<script setup>
import { ref, watch } from 'vue'

const search = ref('')

watch(search, async (newValue) => {
	if (!newValue) return
	console.log('Fetch API for:', newValue)
})
</script>
```

### Example 4: Child to parent communication

```vue
<!-- ChildComponent.vue -->
<template>
	<button @click="sendData">Send</button>
</template>

<script setup>
const emit = defineEmits(['submit'])

function sendData() {
	emit('submit', { id: 1, name: 'Vue' })
}
</script>
```

```vue
<!-- ParentComponent.vue -->
<template>
	<ChildComponent @submit="handleSubmit" />
</template>

<script setup>
function handleSubmit(payload) {
	console.log(payload)
}
</script>
```

### Example 5: Simple Pinia store

```js
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
	state: () => ({ count: 0 }),
	getters: {
		doubleCount: (state) => state.count * 2
	},
	actions: {
		increment() {
			this.count++
		}
	}
})
```

---

## Common Interview Traps

### Trap 1: Saying Composition API replaces Options API completely

Better answer:
Vue 3 supports both. Composition API is an additional pattern, not a forced replacement.

### Trap 2: Using `watch` for derived state

Better answer:
Use `computed` for derived state and `watch` for side effects.

### Trap 3: Forgetting `.value` with refs in JavaScript

In templates, refs are automatically unwrapped. In JavaScript, you usually need `.value`.

### Trap 4: Using array index as key in dynamic lists

This can cause rendering bugs when items are inserted, deleted, or reordered.

### Trap 5: Treating Pinia as mandatory for every app

Many Vue apps do not need global state. Use the smallest state-sharing tool that fits the problem.

---

## Quick Revision Notes

- Vue 3 uses `Proxy`-based reactivity.
- Composition API improves logic organization and reuse.
- `ref` is common for primitives; `reactive` is common for objects.
- `computed` is for derived values; `watch` is for side effects.
- `v-if` removes from DOM; `v-show` toggles visibility.
- Props go down; events go up.
- Pinia is the standard state management choice for Vue 3.
- Vue Router handles navigation, nested routes, and guards.
- Teleport is useful for modals.
- Suspense helps coordinate async UI.

---

## High-Value Interview Questions to Practice

1. Why did Vue 3 introduce the Composition API?
2. When would you choose `ref` vs `reactive`?
3. What is the difference between `watch`, `watchEffect`, and `computed`?
4. How does Vue 3 reactivity differ from Vue 2?
5. How would you avoid prop drilling in a medium-sized app?
6. When should you use Pinia instead of local component state?
7. How would you optimize a slow Vue component rendering a large list?
8. How does `v-model` work for custom components in Vue 3?
9. What problems can happen if you use index as `key` in `v-for`?
10. What logic belongs in a composable versus a component?

---

## References

- https://vuejs.org/
- https://router.vuejs.org/
- https://pinia.vuejs.org/
- https://vuejs.org/guide/extras/reactivity-in-depth.html
