# react cheet-sheet

**Source:** react cheet-sheet.pdf

---

## Content

React.JS CheatSheet

TABLE OF CONTENTS
1. Introduction to React What is React? History and Features Virtual DOM Explained React vs Vanilla JS vs Other Frameworks
2. Environment Setup Installing Node.js and npm Create React App (CRA) Project Structure Using Vite for Faster Setup
3. JSX Basics What is JSX? JSX Syntax Rules Embedding Expressions JSX Best Practices
4. Components Functional Components Class Components Component Naming and Structure Props in Components Props Destructuring Children Props
5. State Management useState Hook setState in Class Components Lifting State Up Passing State as Props
6. Event Handling Handling Events in React Event Binding Synthetic Events Prevent Default and Event Objects

TABLE OF CONTENTS
7. Conditional Rendering if/else Statements Ternary Operators Logical && Operator Switch Statements
8. Lists and Keys Rendering Lists with .map() Using key Props Handling Empty Lists
9. Forms in React Controlled vs Uncontrolled Components Handling Inputs (text, checkbox, radio, select) Form Submission Form Validation Basics
10. useEffect Hook Basic Usage of useEffect Dependency Array Cleanup Function Fetching Data on Mount
11. Other React Hooks useRef useContext useReducer useMemo useCallback Custom Hooks
12. React Router (v6+) Setting up React Router BrowserRouter, Routes, Route Link, NavLink Route Parameters Nested Routes Redirects and Navigate 404 Page Setup

TABLE OF CONTENTS
13. Context API Creating and Providing Context Consuming Context Updating Context Values When to Use Context vs Props

14. State Management Libraries Redux Basics Redux Toolkit useSelector, useDispatch Zustand (Alternative) Recoil (Alternative) Context vs Redux

15. Styling in React

CSS Modules Inline

Styling

Styled-

Components Tailwind

CSS

with

React

SCSS/SASS with React

16. React Lifecycle (Class Components) constructor() render() componentDidMount() componentDidUpdate() componentWillUnmount()

17. Error Handling Error Boundaries Try-Catch in Event Handlers Handling Async Errors

18. Code Splitting and Lazy Loading React.lazy() and Suspense Dynamic Imports Loading Spinners

TABLE OF CONTENTS
19. Refs and DOM Manipulation useRef and Accessing DOM Elements Forwarding Refs DOM Interaction Best Practices
20. Portals Creating Portals Use Cases (Modals, Tooltips)
21. Fragments and StrictMode <React.Fragment> and <> Why and When to Use <React.StrictMode> Usage
22. Higher Order Components (HOC) What is an HOC? Common HOC Patterns Pros and Cons
23. Custom Hooks When to Create Custom Hooks Examples (useLocalStorage, useWindowSize) Best Practices
24. Testing React Apps Unit Testing with Jest Component Testing with React Testing Library Writing Test Cases for Hooks and Components
25. Deployment Building for Production Hosting on Vercel, Netlify, Firebase GitHub Pages Deployment Environment Variables
26. React with APIs Fetching with fetch and axios REST vs GraphQL Error Handling in API Calls Displaying Loading States

TABLE OF CONTENTS
27. Best Practices & Optimization Component Reusability Code Splitting Avoiding Unnecessary Renders Memoization Folder Structure Recommendations
28. React with TypeScript (Bonus) Why Use TypeScript? Typing Props and State Typing useState, useEffect, etc. Interfaces and Types
29. Popular UI Libraries for React Material UI (MUI) Ant Design Chakra UI Tailwind CSS ShadCN/UI
30. Mini Projects (Bonus Section) Common Beginner Mistakes in React Practice Tasks for Beginners

1. INTRODUCTION TO REACT
1.1 What is React? React is a JavaScript library used to build user interfaces (UIs). That means it helps you create the parts of a website that users can see and interact with. React is especially good for building single-page applications (SPAs) -- websites that update the content without reloading the entire page. For example, when you scroll Instagram, the page doesn't reload, but new content appears -- that's similar to how React works.
In simple words: React helps you build websites that are fast, easy to manage, and don't reload every time something changes.
1.2 History and Features Created by: Jordan Walke, a software engineer at Facebook Released in: 2013 (open-sourced) Used by: Facebook, Instagram, Netflix, WhatsApp Web, etc.
Key Features: Component-based: You build UI in small pieces called components. Reusable: One component can be used in many places. Virtual DOM: It updates only the changed part of the page instead of the whole page. Fast and Efficient: Because of virtual DOM and smart updates.
1.3 Virtual DOM Explained DOM stands for Document Object Model -- it's like a tree structure of your HTML. React creates a copy of the real DOM in memory. This copy is called the Virtual DOM. When something changes, React compares the virtual DOM with the real DOM and only updates the parts that actually changed. This makes the website faster, because it doesn't reload everything.

1. INTRODUCTION TO REACT
1.4 React vs Vanilla JS vs Other Frameworks

Feature

React

Vanilla JS

Other Frameworks (e.g., Angular, Vue)

Structure

Component-based No structure

Component-based

Speed

Very fast

Medium

Fast

Learning Curve

Easy to Medium

Easy

Medium to Hard

Reusability

High

Low

High

DOM Updates

Virtual DOM

Full page reload Virtual DOM or optimized updates

Conclusion: React offers a balanced approach -- faster than plain JavaScript and easier to learn than some heavy frameworks like Angular.

2. ENVIRONMENT SETUP
2.1 Installing Node.js and npm React apps need Node.js and npm (Node Package Manager) to work.
Steps: 1.Go to https://nodejs.org 2.Download the LTS version (Recommended for most users) 3.Install it After installing, open your terminal and check versions:
nginx
If you see the versions, Node.js and npm are installed correctly. 2.2 Create React App (CRA)
React provides a tool called Create React App (CRA) to start building apps quickly. To create a project:
perl
"npx" runs a command without installing it globally. "create-react-app" sets up everything for you. "npm" start runs your app in the browser. 2.3 Project Structure When you create a React app, you'll see a folder like this:
pgsql
public/index.html: Main HTML file src/index.js: Starting point of your React app src/App.js: Main component

2. ENVIRONMENT SETUP
2.4 Using Vite for Faster Setup Vite is a modern build tool that's faster than CRA. To create a Vite project:
perl
Vite starts faster and is better for modern projects.

3. JSX BASICS
3.1 What is JSX? JSX stands for JavaScript XML. It lets you write HTML-like code inside JavaScript.
Example:
jsx
This looks like HTML, but it's actually JavaScript code. 3.2 JSX Syntax Rules
Return only one parent element.
jsx
Use camelCase for attributes like className, onClick:
jsx
3.3 Embedding Expressions You can write JavaScript inside JSX using { }.
Example:
jsx
3.4 JSX Best Practices Use meaningful names for variables and components. Keep JSX clean and readable. Avoid too much logic inside JSX. Use fragments (<> </>) if you don't want to wrap everything in a <div>.

4. COMPONENTS
4.1 Functional Components A simple way to create a component using a function. jsx
4.2 Class Components Another way using ES6 class (older way). jsx
4.3 Component Naming and Structure Always start component names with Capital letters. Each component should be in its own file. jsx
4.4 Props in Components Props (short for properties) are used to pass data from one component to another. jsx
Used like: jsx
4.5 Props Destructuring Instead of props.name, you can do: jsx

4. COMPONENTS
4.6 Children Props Props can also include inner HTML using props.children. jsx

5. STATE MANAGEMENT
5.1 useState Hook For functional components, we use the useState hook to manage data. jsx
5.2 setState in Class Components In class components, we use this.state and this.setState(). jsx
5.3 Lifting State Up When two components need to share the same state, move the state to their common parent. jsx

5. STATE MANAGEMENT
5.4 Passing State as Props You can pass the current state value to another component using props. jsx

6. EVENT HANDLING
6.1 Handling Events in React In React, we can handle user actions like clicks, typing, or hovering using event handlers. Example: Button click
jsx
Note: We use camelCase like onClick instead of onclick. 6.2 Event Binding
In class components, we often need to bind the event handler to this. jsx
In functional components, you don't need binding. 6.3 Synthetic Events
React uses a system called Synthetic Events. It wraps browser events to work the same way across all browsers. It behaves like regular JavaScript events but works consistently everywhere. Example:
jsx

6. EVENT HANDLING
6.4 Prevent Default and Event Objects If you want to stop the default action (like refreshing the page on form submit), use event.preventDefault().
Example:
jsx

7. CONDITIONAL RENDERING
7.1 if/else Statements You can use normal if/else logic before the return. jsx
7.2 Ternary Operators Short way to write if/else inside JSX: jsx
7.3 Logical && Operator Use && when you want to render something only if a condition is true. jsx
If cart.length is 0, it won't show anything. 7.4 Switch Statements
For multiple conditions, you can use switch. jsx

8. LISTS AND KEYS
8.1 Rendering Lists with .map() When you want to show many items, use .map() to loop through them. jsx
8.2 Using key Props Each item in a list needs a unique key so React can track changes. jsx
Use a unique ID if available (don't always rely on index). 8.3 Handling Empty Lists
You can check if the list is empty before showing it. jsx

9. FORMS IN REACT
9.1 Controlled vs Uncontrolled Components Controlled Component: React controls the input value using useState. Uncontrolled Component: DOM handles the input using a ref.
Controlled example: jsx
9.2 Handling Inputs (text, checkbox, radio, select) Text: jsx
Checkbox: jsx
Radio: jsx
Select dropdown: jsx
9.3 Form Submission jsx

9. FORMS IN REACT
9.4 Form Validation Basics Before submitting, check if the inputs are correct. jsx

10. USEEFFECT HOOK
10.1 Basic Usage of useEffect "useEffect" lets you run code after your component renders.
Example: jsx
10.2 Dependency Array You can control when useEffect runs using dependencies. jsx
Empty array []: run only once (like on mount) With [name]: run when name changes 10.3 Cleanup Function If you want to clean up something (like removing a timer), return a function inside useEffect.
jsx
10.4 Fetching Data on Mount jsx
It runs once after the component loads and gets the data.

11. OTHER REACT HOOKS
11.1 useRef useRef is used to store a value that doesn't need to re-render the component. It's also used to directly access a DOM element (like an input box). jsx
11.2 useContext It helps to share values like user info or theme between components without props. jsx

11. OTHER REACT HOOKS
11.3 useReducer Like useState, but better when state is complex (like a counter with actions). jsx
11.4 useMemo Stops a function from running again if the inputs (dependencies) didn't change. jsx
11.5 useCallback Stops a function from re-creating again and again. jsx
11.6 Custom Hooks Your own reusable hook logic using other hooks. jsx

12.1 Installation

12. REACT ROUTER (V6+)
jsx

12.2 BrowserRouter, Routes, Route jsx

12.3 Link and NavLink jsx
12.4 Route Parameters jsx
Use useParams() in User component to get the id. 12.5 Nested Routes
jsx
12.6 Redirects and Navigate jsx
12.7 404 Page jsx

13. CONTEXT API
13.1 Creating and Providing Context jsx
13.2 Consuming Context jsx
13.3 Updating Context Use useState and pass both value and function via value.
13.4 Context vs Props Use props if data is used only by child. Use context when many components need the data.

14. STATE MANAGEMENT LIBRARIES
14.1 Redux (Basics) A central store to keep all app data. Use actions to update data.
14.2 Redux Toolkit Easier way to write Redux
jsx

14.3 useSelector and useDispatch jsx
14.4 Zustand Lightweight library, less setup. jsx

14.5 Recoil Works with atoms (like small pieces of state).
jsx

14.6 Context vs Redux

Use Case

Tool

Small data like theme/user

Context

Big apps with many updates Redux

15.1 CSS Modules

15. STYLING IN REACT
jsx

15.2 Inline Styling jsx
15.3 Styled Components jsx

15.4 Tailwind CSS jsx
jsx
15.5 SASS / SCSS jsx
jsx

16. REACT LIFECYCLE (CLASS COMPONENTS)
In classcomponents, lifecycle methodsletyouruncodeatspecific times in a component's life (mount, update, unmount). 16.1 constructor() Runs first, when the component is created. Used to initialize state and bind methods.
jsx
16.2 render() Required method. Returns JSX to display on the screen. jsx
16.3 componentDidMount() Called after component is added to the DOM. Good for API calls or timers. jsx
16.4 componentDidUpdate() Runs when props or state change. Good for updating based on changes. jsx

16. REACT LIFECYCLE (CLASS COMPONENTS)
16.5 componentWillUnmount() Called before component is removed. Use it to clear timers or remove listeners
jsx

17. ERROR HANDLING
17.1 Error Boundaries A special class component that catches JavaScript errors in children. jsx
17.2 Try-Catch in Event Handlers jsx
17.3 Handling Async Errors jsx

18. CODE SPLITTING AND LAZY LOADING
18.1 React.lazy() and Suspense React.lazy() loads components only when needed. jsx
18.2 Dynamic Imports Load parts of the code only when needed (saves load time). jsx
18.3 Loading Spinners Use during lazy loading or data fetching. jsx

19. REFS AND DOM MANIPULATION
19.1 useRef andAccessingDOM Elements useRef() returns a reference to a DOM node. jsx
19.2 Forwarding Refs Pass a ref to child from parent. jsx
19.3 DOM Interaction Best Practices Prefer React state. Use refs only when you must access DOM (e.g., focus, scroll). Avoid modifying DOM directly (don't use document.querySelector).

20. PORTALS IN REACT
20.1 What is a Portal? Normally, in React, all components render inside a single root element -- like this: jsx
But what if you want to show something outside this root? For example, a popup, a modal, or a tooltip that appears on top of everything. That's where Portals help. A Portal lets you render a React component into a different part of the HTML, outside the main app root. 20.2 How to Create a Portal Step 1: Add a new HTML element in index.html Open your public/index.html file and add a new <div> for the portal:
jsx
Step 2: Use createPortal() in your component jsx
You can now use this PortalComponent in your app.

20. PORTALS IN REACT
20.3 Full Example: Modalwith Portal Let's create a simple modal that opens and closes using a portal.
Modal. jsx jsx
App. jsx jsx

20. PORTALS IN REACT
20.4 Use Cases of Portals
Modals/Popups When you want a window to appear on top of everything else.
Tooltips Small hint boxes that appear on hover.
Dropdown Menus If a dropdown needs to overflow a parent with overflow: hidden.
Sidebars or Toast Messages For alerts or temporary notifications.
20.5 Why Use Portals? It solves CSS issues when the parent component has overflow: hidden, zindex, or position: relative. Keeps UI elements like modals and tooltips outside the normal hierarchy. Cleaner and more flexible design.

21. FRAGMENTS AND STRICTMODE
21.1 <React.Fragment> and <>...</> In React, a component must return a single parent element. But what if you need to return multiple elements without wrapping them in a <div>? Use Fragments!
Example: jsx
Why Use It? No extra <div> tags in the DOM. Keeps code clean. 21.2 <React.StrictMode>
React provides a special wrapper that helps you find bugs early. jsx
What it does: Warns about unsafe code. Helps with future-proofing your app. Does not show anything to the user. Works only in development (not in production).

22. HIGHER ORDER COMPONENTS (HOC)
22.1 What is an HOC? An HOC is a function that takes a component and returns a new component. jsx
Think of it like adding extra powers to a component. 22.2 Example: withLogger HOC
jsx
Now use it: jsx
22.3 Common HOC Use Cases Logging props Adding loading spinners Access control (admin vs normal user) Reusing logic across components
22.4 Pros and Cons
Pros Reuse logic easily Cleaner components
Cons Can become complex to debug Not as popular now (Hooks are preferred)

23. CUSTOM HOOKS
23.1 When to Create Custom Hooks When you find yourself copying the same useEffect, useState, or logic in multiple places -- create a custom hook.
23.2 Example: useLocalStorage jsx
Usage: jsx
23.3 Another Example: useWindowSize jsx
Usage: jsx
23.4 Best Practices Always start with use Return only what's needed Keep it simple

24. TESTING REACT APPS
24.1 Unit Testing withJest
 Jest is a testing framework for JavaScript. Example test: jsx
24.2 Component Testing with React Testing Library React Testing Library helps you test how a user would interact.
jsx
24.3 Testing Hooks For hooks, use @testing-library/react-hooks or test them inside a component. jsx
Test using fireEvent from the testing library.

25. DEPLOYMENT
25.1 Build for Production Run this in the terminal: bash
It creates a build/ folder with all optimized files.
25.2 Hosting on Vercel 1.Go to https://vercel.com 2.Connect your GitHub repo 3.Click "Deploy"
 Done
25.3 Hosting on Netlify 1.Go to https://netlify.com 2.Drag your build folder 3.Or connect GitHub and deploy automatically
25.4 Hosting on Firebase bash

Choose "Hosting" and follow the steps. 25.5 GitHub Pages
Install the package: bash

Add to package.json:

json

Then run:

bash

25. DEPLOYMENT
25.6 Environment Variables You can use environment variables for API keys or settings. Create a .env file: env
Use in code: jsx

26. REACT WITH APIS
26.1 Fetching with fetch and axios  Using fetch:
jsx
 Using axios: jsx

26.2 REST vs GraphQL

Feature

REST

GraphQL

Structure

Multiple endpoints Single endpoint

Data Fetching

Fixed response

Flexible (you choose fields)

Overfetching

Yes (extra data)

No

26.3 Error Handling in API Calls jsx

26. REACT WITH APIS
26.4 Displaying Loading States jsx

27. BEST PRACTICES & OPTIMIZATION
27.1 Component Reusability Create reusable components like Button, Input, Card instead of repeating code.
27.2 Code Splitting Use React.lazy() to load components only when needed. jsx
27.3 Avoiding Unnecessary Renders Use React.memo to prevent re-render when props haven't changed. jsx
27.4 Memoization Use useMemo or useCallback for expensive calculations or stable function references. jsx
27.5 Folder Structure Recommendation css

28. REACT WITH TYPESCRIPT (BONUS)
28.1 Why Use TypeScript? Catch errors before runtime Better developer experience with IntelliSense Safer code with types
28.2 Typing Props and State tsx
tsx
28.3 Typing useEffect and useRef tsx
28.4 Interfaces and Types tsx

29. POPULAR UI LIBRARIES FOR REACT
Material UI (MUI) Google's design system Prebuilt styled components bash
Ant Design Enterprise UI with lots of components bash
Chakra UI Easy-to-use, accessible components bash
Tailwind CSS Utility-first CSS framework bash
ShadCN/UI Beautiful components built with Tailwind, Radix UI bash

30. COMMON MISTAKES & PRACTICE TASKS (BONUS SECTION)
31.1 Common Beginner Mistakes in React

Mistake Mutating state directly Missing key in lists Incorrect useEffect usage
Calling hooks conditionally Overusing props instead of state

Why It's a Problem

Correct Approach

React won't detect changes and re-render React has trouble tracking items
Missing dependency array can cause infinite loops
Breaks the rules of hooks
Can lead to prop drilling

Always use setState() or setSomething() Use unique key props in .map() Include the correct dependencies or use [] for run-once
Always call hooks at the top level of the component Use context or state where appropriate

31.2 Practice Tasks for Beginners

#

Task

1

Counter with +/� buttons

2

Form with submit handler

3

Render a favorite movie list

4

Toggle dark/light mode

5

Joke fetcher app

6

Basic login page

7

Like button toggle

8

Dropdown list

9

Timer/Stopwatch

10

Weather app

Concepts Practiced useState, events Forms, controlled inputs .map(), JSX, keys useState, conditional rendering useEffect, fetch API Input handling, form validation useState, events JSX, select elements useEffect, setInterval, clearInterval API integration, conditional UI

Tip for Learners Try one small project every 2�3 days. Don't aim for perfection. Aim for progress.



---

*Parsed from PDF on 2026-03-13T10:19:00.337Z*
