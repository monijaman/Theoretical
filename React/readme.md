# React Interview Questions and Answers

## React Interview Questions for Freshers

### 1. What is React?

React is a JavaScript library developed by Facebook for building user interfaces, particularly for single-page applications. It allows developers to create reusable UI components and manage the application's state efficiently.

### 2. What are the advantages of using React?

- Component-based architecture for reusability.
- Virtual DOM improves performance.
- Unidirectional data flow for better state management.
- Rich ecosystem and community support.
- Easy to learn and use with JavaScript.

### 3. What are the limitations of React?

- React is just a library, not a full framework.
- Requires additional libraries for routing and state management (e.g., React Router, Redux).
- JSX syntax might be confusing for beginners.
- The frequent updates require developers to keep up.

### 4. What is `useState()` in React?

`useState` is a React Hook that allows you to add state to functional components. It returns an array with the current state and a function to update it.

### 5. What are keys in React?

Keys are unique identifiers used in lists to help React identify which items have changed, been added, or removed, improving performance during rendering.

### 6. What is JSX?

JSX is a syntax extension for JavaScript that looks similar to HTML. It allows developers to write HTML-like code in React, which is then transformed into React elements.

### 7. What are the differences between functional and class components?

- **Functional components**: Stateless and use Hooks for state and lifecycle.
- **Class components**: Stateful and use lifecycle methods like `componentDidMount`.

### 8. What is the virtual DOM? How does React use it to render the UI?

The virtual DOM is a lightweight copy of the real DOM. React updates the virtual DOM and calculates the differences before applying the changes to the real DOM, making updates efficient.

### 9. What are the differences between controlled and uncontrolled components?

- **Controlled components**: Form inputs whose values are managed by React state.
- **Uncontrolled components**: Form inputs managed by the DOM.

### 10. What are props in React?

Props (short for properties) are used to pass data from a parent component to child components.

### 11. Explain React state and props.

- **State**: Local data storage managed within a component.
- **Props**: External data passed to a component for rendering.

### 12. Explain about types of side effects in React components.

Common side effects include:

- Data fetching.
- Subscriptions.
- DOM manipulations.
- Logging.
  These are typically handled in the `useEffect` Hook.

### 13. What is prop drilling in React?

Prop drilling occurs when data is passed through multiple nested components that don't need it directly, making the code harder to maintain.

### 14. What are error boundaries?

Error boundaries are React components that catch JavaScript errors in child components and display fallback UI without crashing the entire application.

### 15. What is React Hooks?

Hooks are functions that let you use React features (e.g., state and lifecycle) in functional components.

### 16. Explain React Hooks.

React Hooks (e.g., `useState`, `useEffect`, `useContext`) enable functional components to manage state and lifecycle features without needing class components.

### 17. What are the rules that must be followed while using React Hooks?

- Only call Hooks at the top level of your component.
- Only call Hooks in React function components or custom Hooks.

### 18. What is the use of `useEffect` React Hook?

`useEffect` handles side effects in functional components, such as fetching data, setting up subscriptions, or manually changing the DOM.

### 19. Why do React Hooks make use of refs?

Refs provide a way to access DOM nodes or React elements directly without re-rendering the component.

### 20. What are Custom Hooks?

Custom Hooks are user-defined functions that encapsulate reusable logic using built-in React Hooks.

---

## React Interview Questions for Experienced

### 21. Explain Strict Mode in React.

Strict Mode is a tool for highlighting potential problems in a React application. It activates additional checks and warnings for child components.

### 22. How to prevent re-renders in React?

- Use `React.memo` for functional components.
- Use `shouldComponentUpdate` in class components.
- Optimize state updates to reduce unnecessary renders.

### 23. What are the different ways to style a React component?

- Inline styles.
- CSS modules.
- Styled-components.
- Tailwind CSS or other utility libraries.

### 24. Name a few techniques to optimize React app performance.

- Use React's lazy loading and code splitting.
- Memoize expensive calculations with `useMemo`.
- Prevent unnecessary re-renders using `React.memo`.

### 25. How to pass data between React components?

- Use props for parent-to-child communication.
- Use context for global state.
- Use callback functions for child-to-parent communication.

### 26. What are Higher Order Components?

A higher-order component (HOC) is a function that takes a component and returns a new component, adding additional functionality.

### 27. What are the different phases of the component lifecycle?

- **Mounting**
- **Updating**
- **Unmounting**

### 28. What are the lifecycle methods of React?

Examples:

- `componentDidMount`
- `componentDidUpdate`
- `componentWillUnmount`

### 29. Does React Hook work with static typing?

Yes, React Hooks work with static typing using TypeScript.

### 30. Explain about types of Hooks in React.

Common types include:

- State Hooks (`useState`)
- Effect Hooks (`useEffect`)
- Context Hooks (`useContext`)
- Custom Hooks

### 31. Differentiate React Hooks vs Classes.

- Hooks simplify the syntax and avoid boilerplate.
- Hooks provide cleaner state and lifecycle management without requiring classes.

### 32. How does the performance of using Hooks differ compared to classes?

Hooks reduce boilerplate code and improve readability, making components faster to write and test.

### 33. Do Hooks cover all functionalities provided by the classes?

Yes, Hooks provide alternatives to all class-based features.

### 34. What is React Router?

React Router is a library for routing in React applications.

### 35. Can React Hooks replace Redux?

Yes, for simple state management, but Redux is better for complex global state.

### 36. Explain conditional rendering in React.

Conditional rendering is when components are rendered based on conditions using:

- `if`
- `&&`
- Ternary operators

### 37. Explain how to create a simple React Hooks example program.

Example: Create a counter using `useState`.

### 38. How to create a switching component for displaying different pages?

Use `React Router` with `<Route>` and `<Switch>`.

### 39. How to re-render the view when the browser is resized?

Attach a `resize` event listener in `useEffect`.

### 40. How to pass data between sibling components using React Router?

Use context or a shared parent component.

### 41. How to perform automatic redirect after login?

Use `useNavigate` from React Router or the `Navigate` component to redirect after authentication.
