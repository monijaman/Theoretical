# Design Systems & Component Libraries

This module covers building the foundations that entire teams build on. We will break down complex concepts into easy-to-understand, real-world examples.

---

## 📚 Learn

### 🎨 Design Principles

# 🧱 Atomic Design Principles

Atomic Design is a methodology for creating **reusable, composable, and consistent UI components** by breaking the UI into small building blocks. It helps maintain **design consistency** and **scalability** across large applications.

**Real-World Analogy:**

Think of building a McDonald's restaurant:

- **Atoms:** Ingredients (a bun, a patty, lettuce, tomato, cheese)
- **Molecules:** A burger (combination of ingredients prepared together)
- **Organisms:** A meal combo (burger + fries + drink packaged together)
- **Templates:** A restaurant layout (where the counter, seating, and kitchen go)
- **Pages:** A specific McDonald's location with all the decorations, staffing, and current offerings

**Levels of Atomic Design:**

1. **Atoms:** Smallest UI elements that can't be broken down further
   - Button, Input field, Text label, Icon, Avatar image
   - These are used everywhere in your app, like how a McDonald's uses the same bun for every burger

2. **Molecules:** Two or more atoms working together to create a simple feature
   - Search Form = Input + Button
   - Card Header = Avatar + Name + Title
   - Navigation Item = Icon + Label
   - Like a burger = bun + patty + toppings

3. **Organisms:** Complex sections made from molecules and/or atoms
   - Header = Logo + Navigation + Search Form
   - Product Card = Image + Card Header + Description + Button
   - Like a meal combo = burger + fries + drink

4. **Templates:** Page structures/layouts using organisms
   - Product Grid Template = Multiple product cards arranged in a grid
   - Dashboard Layout = Header + Sidebar + Main Content Area
   - Like the McDonald's restaurant layout

5. **Pages:** Real content rendered using templates
   - Home Page = Header + Product Grid Template + Footer
   - Shopping Cart Page = Header + Cart Items + Checkout Form + Footer
   - Like a specific McDonald's location with real employees and customers

**Examples in React + TypeScript:**

```tsx
// Atoms: Smallest building blocks
export function Button({ children, onClick }) {
  return <button onClick={onClick}>{children}</button>;
}

export function Input({ placeholder }) {
  return <input placeholder={placeholder} />;
}

// Molecule: Combines atoms
export function SearchForm() {
  // Real-world: Like a search bar on Amazon
  return (
    <form>
      <Input placeholder="Search products..." />
      <Button>Search</Button>
    </form>
  );
}

// Molecule: Card header (user info)
export function CardHeader() {
  // Real-world: Like a user profile snippet on LinkedIn
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <img src="/avatar.png" alt="User Avatar" width={32} height={32} />
      <div>
        <h4>John Doe</h4>
        <p>Software Engineer</p>
      </div>
    </div>
  );
}

// Organism: Header with navigation and search
export function Header() {
  // Real-world: Like the top bar on YouTube
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "16px",
      }}
    >
      <div>Logo</div>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
      <SearchForm />
    </header>
  );
}

// Organism: Product card
export function ProductCard() {
  // Real-world: Like a product tile on an e-commerce site
  return (
    <div
      style={{ border: "1px solid #ccc", padding: "16px", borderRadius: "8px" }}
    >
      <img src="/product.png" alt="Product" />
      <CardHeader />
      <p>Product description goes here...</p>
      <Button>Add to Cart</Button>
    </div>
  );
}

// Template: Product grid
export function ProductGridTemplate() {
  // Real-world: Like the main product grid on Flipkart
  return (
    <main
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
        padding: "16px",
      }}
    >
      <ProductCard />
      <ProductCard />
      <ProductCard />
    </main>
  );
}

// Page: Home page
export function HomePage() {
  // Real-world: Like the homepage of an online store
  return (
    <div>
      <Header />
      <ProductGridTemplate />
    </div>
  );
}
```

**Key Takeaways from Atomic Design:**

- Start with atoms (Button, Input, Icon) and combine them up to Pages
- Each level adds more complexity and domain knowledge
- Reuse atoms in molecules, molecules in organisms, etc.
- Makes scaling and maintenance much easier

- **Headless UI patterns**
  - **What it is:** Components that provide functionality and accessibility without any visual styling. You bring your own CSS.
  - **Real-World Example:** A car chassis (mechanics) without the body. You can put any "shell" on it (e.g., truck or sports car), but the engine and steering work the same.
  - **Why use it?** You get:
    - **Flexibility:** Styling looks the way YOU want, not the library's way
    - **Consistency:** The same dropdown works in every part of your app, just styled differently
    - **Reusability:** You can use the same component for web, mobile, or desktop apps
  - **Real example:** A dropdown component handles all the keyboard navigation and accessibility, but it's just a `<div>` with no styling. You add your own CSS to make it look good.

- **Controlled vs uncontrolled components**
  - **Controlled Components:** React state is the single source of truth for the input's value. You control everything.
    - _Real-World Example:_ A GPS navigation in a car. You (React) are constantly telling the car where it is. If you say "go left," the car turns left. You have 100% control.
    - _How it works:_ The input's value comes from state, and onChange updates that state.
    - _Use when:_ You need real-time validation, filtering, or conditional logic based on input.
    - _Example:_ Email field that validates format while typing

    ```tsx
    export function EmailInput() {
      const [email, setEmail] = useState("");

      const handleChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        // Real-time validation: show error if email is invalid
        if (!value.includes("@")) console.log("Invalid email");
      };

      return <input value={email} onChange={handleChange} />;
    }
    ```

  - **Uncontrolled Components:** The DOM handles the state. You read the value when needed (via `ref`).
    - _Real-World Example:_ A car's fuel gauge. The car manages its own fuel level. You don't control it; you just read it when needed.
    - _How it works:_ The input manages its own value, and you use `useRef` to grab it.
    - _Use when:_ You only care about the final value (like on form submit), not real-time updates.
    - _Example:_ A basic contact form where you only check the data when clicking "Submit"

    ```tsx
    export function ContactForm() {
      const nameRef = useRef(null);
      const emailRef = useRef(null);

      const handleSubmit = (e) => {
        e.preventDefault();
        // Only read the value when needed
        console.log("Name:", nameRef.current.value);
        console.log("Email:", emailRef.current.value);
      };

      return (
        <form onSubmit={handleSubmit}>
          <input ref={nameRef} placeholder="Name" />
          <input ref={emailRef} placeholder="Email" />
          <button type="submit">Submit</button>
        </form>
      );
    }
    ```

  - **Which one to use?**
    | Scenario | Controlled | Uncontrolled |
    |----------|-----------|-------------|
    | Real-time validation | ✅ | ❌ |
    | Conditional rendering | ✅ | ❌ |
    | Form reset | ✅ | ❌ |
    | File upload | ❌ | ✅ |
    | Quick simple form | Can be slower | ✅ |

---

### ♿ User Experience & Accessibility

- **Accessibility (ARIA roles)**
  - **What it is:** Making websites usable by everyone, including those using screen readers (software that reads text aloud).
  - **Real-World Example:** A museum has:
    - Wheelchair ramps (physical accessibility)
    - Audio guides (for blind visitors)
    - Braille signs (for blind visitors)
    - Captions on videos (for deaf visitors)
    - A website should have the same diversity support!

  - **Why it matters:**
    - ~15% of the world population has some form of disability
    - Accessibility helps elderly users, users with slow internet, mobile-only users, etc.
    - It's often a legal requirement (ADA in US, WCAG worldwide)

  - **Semantic HTML:** Using correct HTML tags so browsers and screen readers understand what things are

    ```tsx
    // ❌ BAD: Screen reader has no idea this is a button
    <div onClick={handleClick} style={{ cursor: 'pointer' }}>
      Click me
    </div>

    // ✅ GOOD: Screen reader knows this is a button
    <button onClick={handleClick}>
      Click me
    </button>
    ```

    Screen readers announce: "Button: Click me"

  - **ARIA Attributes:** Adding labels and roles for elements that don't have native text

    ```tsx
    // Example 1: Icon button without text
    <button aria-label="Close modal">
      <XIcon /> {/* Just an icon, no text */}
    </button>
    // Screen reader announces: "Button: Close modal"

    // Example 2: Describe a region
    <nav aria-label="Main navigation">
      <a href="/home">Home</a>
      <a href="/about">About</a>
    </nav>
    // Screen reader announces: "Navigation: Main navigation"

    // Example 3: Mark something as the current page
    <a href="/products" aria-current="page">Products</a>
    // Screen reader announces: "Link: Products, current page."
    ```

  - **Real-world impact:** Without these, a blind person using a screen reader would hear:
    - ❌ "Image" (no idea what it is)
    - ✅ "Image: Product photo of blue running shoes"

- **Keyboard navigation**
  - **What it is:** Navigating a site using only a keyboard (Tab, Enter, Escape, Arrow keys)
  - **Real-World Example:** Navigation with a TV remote
    - Tab = Move to next button
    - Shift+Tab = Move to previous button
    - Enter/Space = Press the button
    - Escape = Close a popup
    - Arrow keys = Move between items in a dropdown

  - **Why it matters:**
    - Some users have motor disabilities and can't use a mouse
    - Power users prefer keyboard shortcuts (faster)
    - Mobile users sometimes use keyboards (iPad with keyboard case, TV remotes)

  - **Focus Management:** Ensuring focus goes to the right place when things change

    ```tsx
    export function Modal({ isOpen, onClose }) {
      const closeButtonRef = useRef(null);

      // When modal opens, move focus to the close button
      useEffect(() => {
        if (isOpen) {
          closeButtonRef.current?.focus();
        }
      }, [isOpen]);

      // When modal is open, Escape closes it
      useEffect(() => {
        const handleKeyDown = (e) => {
          if (e.key === "Escape" && isOpen) {
            onClose();
          }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
      }, [isOpen]);

      if (!isOpen) return null;

      return (
        <div role="dialog" aria-modal="true">
          <button ref={closeButtonRef} onClick={onClose}>
            Close
          </button>
          <p>Are you sure?</p>
          <button onClick={onClose}>Cancel</button>
          <button>Confirm</button>
        </div>
      );
    }
    ```

  - **Tab Order:** Making sure Tab key visits elements in a logical order
    - Without tabindex: Tab visits links and buttons in order they appear in HTML
    - With tabindex: You control the order

    ```tsx
    // Good tab order: Home → About → Contact
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>

    // Bad tab order: About → Home → Contact (confusing!)
    <a href="/about" tabIndex={1}>About</a>
    <a href="/" tabIndex={0}>Home</a>
    <a href="/contact" tabIndex={2}>Contact</a>
    ```

---

### 💅 Theming & Styling

- **Theming systems**
  - **What it is:** A centralized way to manage branding so your entire app looks consistent (same colors, fonts, spacing everywhere).
  - **Real-World Example:** Starbucks brand guidelines:
    - Every Starbucks logo is green and white
    - Every cup has the same size and temperature
    - Every store has similar music and lighting
    - If Starbucks changes their green color, they update it everywhere at once
  - **The Problem Without Theming:**

    ```jsx
    // ❌ Nightmare: Colors hardcoded everywhere
    <button style={{ backgroundColor: '#1E3A5F' }}>Login</button>
    <button style={{ backgroundColor: '#1E3A5F' }}>Sign Up</button>
    <Card style={{ borderColor: '#1E3A5F' }} />
    <Header style={{ backgroundColor: '#1E3A5F' }} />
    // Now if we need to change the blue → 10+ places to update!
    ```

  - **The Solution: Token Management**

    ```ts
    // theme.ts - One source of truth
    export const theme = {
      colors: {
        primary: '#1E3A5F',      // Navy blue
        secondary: '#F39C12',    // Orange
        success: '#27AE60',      // Green
        danger: '#E74C3C',       // Red
        background: '#FFFFFF',
        text: '#333333',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
      },
      fontSize: {
        small: '12px',
        base: '14px',
        large: '16px',
        xl: '20px',
      },
    };

    // Usage: Use tokens everywhere
    <button style={{ backgroundColor: theme.colors.primary }}>Login</button>
    <button style={{ backgroundColor: theme.colors.primary }}>Sign Up</button>
    <Card style={{ borderColor: theme.colors.primary }} />

    // Now if we need to change: Just change theme.colors.primary!
    ```

  - **CSS Custom Properties (Variables):** An even better approach

    ```css
    :root {
      --color-primary: #1e3a5f;
      --color-secondary: #f39c12;
      --spacing-sm: 8px;
      --spacing-md: 16px;
      --font-size-base: 14px;
    }

    button {
      background-color: var(--color-primary);
      padding: var(--spacing-md);
      font-size: var(--font-size-base);
    }
    ```

    Advantage: Can change at runtime (great for dark mode!)

  - **Why it matters:**
    - **Consistency:** Every button looks the same
    - **Scalability:** Easy to change branding globally
    - **Maintainability:** One place to update
    - **Accessibility:** Easy to ensure color contrast ratios are accessible

- **Dark mode architecture**
  - **What it is:** Allowing users to switch to a darker interface to reduce eye strain (especially useful at night).
  - **Real-World Example:** Your phone's "Night Mode" or car's "Dark Dashboard"
    - During day: bright white background, dark text (easy to read in sunlight)
    - During night: dark background, light text (reduces eye strain)

  - **The Challenge:** Switching between light/dark without the page flickering

    ```tsx
    // ❌ Bad: Flash of unstyled content
    export function App() {
      const [isDark, setIsDark] = useState(false); // Starts light
      // Page renders light... then flickers to dark!
      return <div style={{ background: isDark ? "#000" : "#fff" }} />;
    }

    // ✅ Good: Check preference BEFORE rendering
    export function App() {
      // Check system preference or localStorage BEFORE rendering
      const [isDark, setIsDark] = useState(() => {
        // 1. Check if user saved preference
        const saved = localStorage.getItem("theme");
        if (saved) return saved === "dark";

        // 2. Check system preference
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      });

      useEffect(() => {
        document.documentElement.setAttribute(
          "data-theme",
          isDark ? "dark" : "light",
        );
        localStorage.setItem("theme", isDark ? "dark" : "light");
      }, [isDark]);

      return (
        <div data-theme={isDark ? "dark" : "light"}>
          <button onClick={() => setIsDark(!isDark)}>Toggle Theme</button>
          <p>Content here</p>
        </div>
      );
    }
    ```

  - **CSS Implementation:**

    ```css
    :root[data-theme="light"] {
      --bg-primary: #ffffff;
      --text-primary: #333333;
      --border: #cccccc;
    }

    :root[data-theme="dark"] {
      --bg-primary: #1a1a1a;
      --text-primary: #eeeeee;
      --border: #444444;
    }

    button {
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }
    ```

  - **Performance Tips:**
    - Load theme preference from localStorage synchronously (before first render)
    - Use CSS variables instead of JS to avoid re-rendering on toggle
    - Transition colors smoothly so switching doesn't feel jarring
    ```css
    button {
      background: var(--bg-primary);
      transition: background 0.3s ease; /* Smooth transition */
    }
    ```

---

## 🛠️ Build

### Hands-On Projects

**1. Internal UI component library**

- _Why build it?_
  - Every project in your company uses `<Button>`, `<Card>`, `<Modal>`. Why rebuild them?
  - Consistency: All buttons look and act the same
  - Faster development: Copy-paste your button instead of rebuilding it
  - Easier updates: Fix a bug once, and it's fixed everywhere
- _Real-World Example:_
  - Google: All Google products use the same Material Design components
  - Airbnb: All Airbnb websites/apps use the Airbnb Design System
  - Every Starbucks uses the same cup and logo style

- _How to build it:_
  1. Create a `packages/ui-library` folder with reusable components
  2. Organize by atomic design: atoms, molecules, organisms
  3. Each component gets documentation and examples
  4. Export from a main `index.ts` file
  5. Publish to npm or internal registry
  6. Import and use across projects

  ```
  packages/
  └── ui-library/
      ├── src/
      │   ├── atoms/
      │   │   ├── Button.tsx
      │   │   ├── Input.tsx
      │   │   └── Icon.tsx
      │   ├── molecules/
      │   │   ├── SearchForm.tsx
      │   │   └── CardHeader.tsx
      │   ├── organisms/
      │   │   ├── Header.tsx
      │   │   └── ProductCard.tsx
      │   ├── theme.ts
      │   └── index.ts
      ├── package.json
      └── README.md
  ```

  ```ts
  // packages/ui-library/src/index.ts
  export { Button } from "./atoms/Button";
  export { Input } from "./atoms/Input";
  export { SearchForm } from "./molecules/SearchForm";
  export { Header } from "./organisms/Header";
  export { theme } from "./theme";
  ```

  ```tsx
  // Usage in another project
  import { Button, SearchForm } from "@company/ui-library";

  export function App() {
    return (
      <div>
        <SearchForm />
        <Button>Click me</Button>
      </div>
    );
  }
  ```

**2. Storybook setup**

- _What is Storybook?_
  - A tool to display every component in isolation (like a showroom for furniture)
  - You write "stories" for each component showing different states
  - Great for testing, documentation, and collaboration with designers

- _Real-World Example:_
  - Visit: https://storybook.js.org/showcase
  - Every component has multiple "stories":
    - Button: Normal, Hover, Disabled, Loading, Large, Small
    - Modal: Open, Closed, With form, With alert
  - Designers can see all button styles in one place

- _How to set it up:_

  ```bash
  # Install Storybook
  npx storybook@latest init

  # This creates:
  # - .storybook/main.ts (config)
  # - .storybook/preview.ts (global settings)
  # - src/stories/ (example stories)
  ```

  ```tsx
  // src/components/Button.stories.tsx
  import { Button } from "./Button";

  export default {
    title: "Atoms/Button", // Where it appears in Storybook
    component: Button,
  };

  // Story 1: Default button
  export const Primary = {
    args: {
      children: "Click me",
      variant: "primary",
    },
  };

  // Story 2: Disabled button
  export const Disabled = {
    args: {
      children: "Can't click",
      disabled: true,
    },
  };

  // Story 3: Loading button
  export const Loading = {
    args: {
      children: "Loading...",
      isLoading: true,
    },
  };

  // Story 4: Large button
  export const Large = {
    args: {
      children: "Large button",
      size: "lg",
    },
  };
  ```

  Benefits:
  - Run `npm run storybook` → Opens a browser with all components
  - Test all button states without opening your main app
  - Share with designers to get feedback
  - Auto-generated documentation

**3. Typed theme system**

- _What it is:_ Using TypeScript to ensure developers only use allowed colors/spacing/fonts
- _Real-World Example:_ A dress code for a company
  - ✅ Allowed: Navy suit, white shirt, leather shoes
  - ❌ Not allowed: Neon yellow pants, flip flops
  - To violate the code, you need to deliberately go out of your way

- _Why use it?_
  - Prevents inconsistent spacing (some use 13px, some use 12px)
  - Prevents random colors (prevents "color soup")
  - Autocomplete: VS Code shows all allowed values
  - Future-proof: When refactoring, TypeScript warns you of breaking changes

- _How to build it:_

  ```ts
  // theme.ts
  export const spacing = [4, 8, 12, 16, 24, 32, 48, 64] as const;
  export const colors = {
    primary: "#1E3A5F",
    secondary: "#F39C12",
    success: "#27AE60",
    danger: "#E74C3C",
  } as const;
  export const fontSizes = [12, 14, 16, 18, 20, 24, 32] as const;

  // Create types from the theme
  export type Spacing = (typeof spacing)[number]; // 4 | 8 | 12 | 16 | etc
  export type Color = keyof typeof colors; // 'primary' | 'secondary' | etc
  export type FontSize = (typeof fontSizes)[number]; // 12 | 14 | 16 | etc
  ```

  ```tsx
  // Button.tsx - Now TypeScript checks everything
  interface ButtonProps {
    padding?: Spacing;           // ✅ Only 4, 8, 12, 16, etc allowed
    color?: Color;               // ✅ Only 'primary', 'secondary', etc
    fontSize?: FontSize;         // ✅ Only 12, 14, 16, etc allowed
    children: React.ReactNode;
  }

  export function Button({ padding = 12, color = 'primary', fontSize = 14, children }: ButtonProps) {
    return (
      <button
        style={{
          padding: `${padding}px`,
          backgroundColor: colors[color],
          fontSize: `${fontSize}px`,
        }}
      >
        {children}
      </button>
    );
  }

  // Usage
  <Button padding={16} color="primary" fontSize={16}>Login</Button> // ✅ OK
  <Button padding={13} color="blue" fontSize={15}>Login</Button>   // ❌ TypeScript error!
  ```

  The error message will be:

  ```
  Type '13' is not assignable to type '4 | 8 | 12 | 16 | 24 | 32 | 48 | 64'
  Type '"blue"' is not assignable to type '"primary" | "secondary" | "success" | "danger"'
  ```

  Developers see what values are allowed right in VS Code!

---

## 📖 Practical Deep Dives

### Component Composition Patterns

**Pattern 1: Compound Components** (Components that work together)

```tsx
// ❌ Hard to use: Too many props
<DataTable
  data={users}
  columns={['name', 'email']}
  renderName={(user) => <strong>{user.name}</strong>}
  renderEmail={(user) => <a href={`mailto:${user.email}`}>{user.email}</a>}
/>

// ✅ Better: Composable, easier to understand
<DataTable data={users}>
  <DataTable.Column field="name" header="Name" />
  <DataTable.Column field="email" header="Email" />
</DataTable>
```

Implementation:

```tsx
export function DataTable({ data, children }) {
  return (
    <table>
      <thead>
        <tr>
          {children.map((col) => (
            <th key={col.props.field}>{col.props.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {children.map((col) => (
              <td key={col.props.field}>{row[col.props.field]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

DataTable.Column = function ({ field, header }) {
  return null; // Just a marker, not rendered
};
```

**Pattern 2: Render Props** (Pass a function as a child to customize rendering)

```tsx
// Component gives you data, you decide how to render it
<UserList>
  {(user, isHovered) => (
    <div className={isHovered ? "highlighted" : ""}>
      {user.name} - {user.email}
    </div>
  )}
</UserList>;

export function UserList({ children }) {
  const [users, setUsers] = useState([]);
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  return (
    <div>
      {users.map((user) => (
        <div
          key={user.id}
          onMouseEnter={() => setHoveredId(user.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          {children(user, hoveredId === user.id)}
        </div>
      ))}
    </div>
  );
}
```

**Pattern 3: Custom Hooks** (Extract logic into reusable hooks)

```tsx
// Hook encapsulates useState + useEffect complexity
function useFormState(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" })); // Clear error on change
  };

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    setErrors,
    setIsSubmitting,
  };
}

// Usage: Simple and clean
function LoginForm() {
  const { values, errors, handleChange } = useFormState({
    email: "",
    password: "",
  });

  return (
    <form>
      <input name="email" value={values.email} onChange={handleChange} />
      {errors.email && <span>{errors.email}</span>}
      <input
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
      />
    </form>
  );
}
```

### Common Mistakes to Avoid

| Mistake               | Example                                                               | Fix                                          |
| --------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| Prop drilling         | `<Header user={user} /> → <Nav user={user} /> → <Menu user={user} />` | Use Context API                              |
| Inline functions      | `<Button onClick={() => handleClick(id)}>` on every item in a list    | Use useCallback or event delegation          |
| Hardcoded values      | `backgroundColor: '#1E3A5F'` everywhere                               | Use theme tokens                             |
| No focus management   | Opening a modal doesn't move focus into it                            | Use useEffect + useRef to focus              |
| Missing alt text      | `<img src="/logo.png" />`                                             | `<img src="/logo.png" alt="Company logo" />` |
| Color-only indicators | "Click the red button"                                                | Add text: "Click the red button (Delete)"    |
| Component overuse     | Wrapping everything in custom components                              | Only create components you'll reuse          |

### Testing Components

```tsx
// Button.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  // Test 1: Does it render?
  test("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  // Test 2: Does it respond to clicks?
  test("calls onClick when clicked", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalled();
  });

  // Test 3: Is it accessible?
  test("is keyboard accessible", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByText("Click me");
    button.focus();
    fireEvent.keyDown(button, { key: "Enter" });
    expect(handleClick).toHaveBeenCalled();
  });

  // Test 4: Does disabled state work?
  test("is disabled when disabled prop is true", () => {
    const handleClick = jest.fn();
    render(
      <Button disabled onClick={handleClick}>
        Click me
      </Button>,
    );
    fireEvent.click(screen.getByText("Click me"));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
```

### Performance Optimization

```tsx
// Problem: Every Button re-renders when parent re-renders
function ParentComponent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <Button>This also re-renders unnecessarily!</Button>
    </div>
  );
}

// Solution 1: Memoize the button
const MemoizedButton = React.memo(Button);

// Solution 2: Move state down
function MemoizedInput() {
  const [value, setValue] = useState("");
  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}

function ParentComponent() {
  return (
    <div>
      <p>Other content</p>
      <MemoizedInput /> {/* Only this re-renders */}
    </div>
  );
}

// Solution 3: Use useCallback for event handlers
function ParentComponent() {
  const handleButtonClick = useCallback(() => {
    console.log("Button clicked");
  }, []);

  return <Button onClick={handleButtonClick} />;
}
```

---

## 🎯 Career Impact

> **This positions you as a Frontend Platform Engineer**

### You'll Master

- Building components others love using
- Scaling design consistency across teams
- Performance optimization at scale

### Senior Skills

- **Design systems architecture:** Deciding _how_ the system should be built for the long term.
- **Token-based design thinking:** Treating styles as data.
- **Team enablement:** Making tools that make other developers faster and better.
