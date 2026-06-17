# Advanced TypeScript for Frontend

## ⚡ Quick Start: Real-World Analogies

Understand complex type concepts with these easy analogies:

- **Generics:** Like a "One-Size-Fits-All" stretchable glove. It fits a small hand, a large hand, or even a robot hand, but it's still a glove and keeps the shape of the hand inside. (Type parameters).
- **Conditional Types:** Like a "Vending Machine". If you put in a Dollar, you get a Soda. If you put in a Quarter, you get Gum. The machine knows exactly what to give based on what you put in. (`T extends X ? A : B`).
- **Infer:** Like a "Type Detective". If you see a footprint, you can infer the size of the shoe that made it. TypeScript looks at the structure and "figures out" the missing type piece. (`infer U`).
- **Discriminated Unions:** Like a "Labeled Box". If the box says "FRAGILE", you know it contains Glass. If it says "HEAVY", you know it contains Books. The label tells you exactly what's inside.
- **Mapped Types:** Like a "Cookie Cutter". You take an existing shape (an interface) and transform it into a new shape (e.g., making all properties optional or read-only).

---

**Goal:** Build type-safe applications that catch bugs at compile-time, not runtime.

## 🏗️ TypeScript Foundations

Before diving into advanced patterns, master these essential concepts:

---

### 1️⃣ Unknown vs Any - Handle Unknown Data Safely

**The Problem:**
When data comes from external sources (APIs, user input, databases), you don't know its type. You have two options: `any` (dangerous) or `unknown` (safe).

**The Difference:**

```typescript
// ❌ ANY - The "opt-out" of type safety
let value: any = getUserInput(); // Could be anything!

value.toUpperCase(); // ✅ No error (but crashes at runtime if number!)
value.foo.bar.baz(); // ✅ No error (but crashes at runtime!)

const result: string = value; // ✅ No error (but type is wrong!)
```

**Why `any` is dangerous:**

```typescript
function processData(data: any) {
  // You lose ALL type safety
  console.log(data.length); // ✅ Compile-time OK, but crashes if data is number
  return data.toUpperCase(); // ✅ Compile-time OK, but crashes if data is number
}

processData(123); // 💥 Runtime error: data.toUpperCase is not a function
```

**✅ GOOD - Use `unknown` (the safe choice):**

```typescript
let value: unknown = getUserInput(); // Could be anything

// ❌ TypeScript won't let you use it directly
// value.toUpperCase(); // ERROR - "Object is of type 'unknown'"

// ✅ You MUST check the type first (type guard)
if (typeof value === "string") {
  value.toUpperCase(); // ✅ Now TypeScript knows it's a string!
}

// ✅ Or type it explicitly (assertion)
const str = value as string;
str.toUpperCase(); // ✅ OK if you're sure

// ✅ Or check with a helper function
function isString(val: unknown): val is string {
  return typeof val === "string";
}

if (isString(value)) {
  value.toUpperCase(); // ✅ TypeScript is confident now
}
```

**Real-World Example - API Response:**

```typescript
// ❌ BAD - Using `any`
async function fetchUser(): Promise<any> {
  const response = await fetch("/api/user");
  return response.json(); // Returns `any`
}

const user = await fetchUser();
console.log(user.email); // ✅ TypeScript doesn't warn, but crashes if email missing
console.log(user.toUpperCase()); // ✅ TypeScript allows it, but crashes at runtime!

// ✅ GOOD - Using `unknown` with validation
async function fetchUser(): Promise<unknown> {
  const response = await fetch("/api/user");
  return response.json(); // Returns `unknown`
}

const user = await fetchUser();

// ❌ TypeScript forces you to check first
// console.log(user.email); // ERROR

// ✅ Type guard approach
if (user && typeof user === "object" && "email" in user) {
  console.log((user as { email: string }).email); // Now it's safe
}

// ✅ Better - Use Zod validation (see later section)
const userSchema = z.object({ email: z.string() });
const validUser = userSchema.parse(user); // Validates and types it
console.log(validUser.email); // ✅ 100% safe
```

**Type Guards - Checking Unknown Types:**

```typescript
// Helper function to check if value is a specific type
function isString(val: unknown): val is string {
  return typeof val === "string";
}

function isNumber(val: unknown): val is number {
  return typeof val === "number";
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

function isArray(val: unknown): val is unknown[] {
  return Array.isArray(val);
}

// Usage - Type narrowing (see next section)
function handle(data: unknown) {
  if (isString(data)) {
    console.log(data.toUpperCase()); // ✅ data is string
  } else if (isNumber(data)) {
    console.log(data.toFixed(2)); // ✅ data is number
  } else if (isArray(data)) {
    console.log(data.length); // ✅ data is array
  }
}
```

**Summary Table:**

| Feature      | `any`                              | `unknown`                         |
| ------------ | ---------------------------------- | --------------------------------- |
| Type Safety  | ❌ None - You opt out             | ✅ Full - Must check type first  |
| Use When     | Legacy code / Third-party libs    | External data / Unknown sources   |
| Safety Level | 🔴 Dangerous                      | 🟢 Safe                           |
| Requires     | Nothing (too permissive)          | Type guard (forces discipline)    |

**Rule of Thumb:**
> Use `unknown` by default. Only use `any` when you absolutely must, and add a comment explaining why.

---

### 2️⃣ Union Types - Multiple Possible Types

**The Idea:**
A variable can be ONE of several types. Like a "union" in real life - a member belongs to one group or another.

**Basic Syntax:**

```typescript
// Type is either string OR number
type StringOrNumber = string | number;

let value: StringOrNumber;

value = "hello"; // ✅ OK
value = 42; // ✅ OK
value = true; // ❌ ERROR - not string or number
```

**Why Unions Matter:**

```typescript
// Without unions - you're forced to use `any`
function process(data: any) {
  // You don't know if it's string or number
  // So you can't safely call methods
}

// With unions - type safety!
function process(data: string | number) {
  console.log(data.toString()); // ✅ Both string and number have toString()
  // console.log(data.toUpperCase()); // ❌ ERROR - number doesn't have it
}

process("hello"); // ✅ OK
process(42); // ✅ OK
```

**Real-World Example - API Status:**

```typescript
// Response can be one of three states
type ApiResponse = 
  | { status: "loading" }
  | { status: "success"; data: string }
  | { status: "error"; error: string };

// You MUST check the status first (type narrowing - see next)
function handleResponse(response: ApiResponse) {
  if (response.status === "success") {
    console.log(response.data); // ✅ data exists
    // console.log(response.error); // ❌ error doesn't exist here!
  } else if (response.status === "error") {
    console.log(response.error); // ✅ error exists
    // console.log(response.data); // ❌ data doesn't exist here!
  }
}
```

**Literal Types in Unions:**

```typescript
// Status can only be one of these exact strings
type Status = "idle" | "loading" | "success" | "error";

const currentStatus: Status = "loading"; // ✅ OK
// const currentStatus: Status = "pending"; // ❌ ERROR - not in the union

// Combine with other types
type Result = 
  | { success: true; value: number }
  | { success: false; error: string };

const result: Result = { success: true, value: 42 }; // ✅ OK
```

---

### 3️⃣ Type Narrowing - Refining Types with Checks

**The Idea:**
Start with a broad type, then use checks to "narrow" it down to a specific type.

**Common Narrowing Techniques:**

```typescript
// Start with union type
function process(value: string | number) {
  // At this point, you don't know which type it is

  // ✅ NARROWING #1: typeof check
  if (typeof value === "string") {
    console.log(value.toUpperCase()); // ✅ TypeScript knows it's string
  } else {
    console.log(value.toFixed(2)); // ✅ TypeScript knows it's number
  }
}

// ✅ NARROWING #2: instanceof check (for classes)
function handle(value: Date | string) {
  if (value instanceof Date) {
    console.log(value.getTime()); // ✅ It's a Date
  } else {
    console.log(value.toUpperCase()); // ✅ It's a string
  }
}

// ✅ NARROWING #3: Property check (in operator)
function describe(value: { name: string } | string[]) {
  if ("name" in value) {
    console.log(value.name); // ✅ It has a name property
  } else {
    console.log(value.length); // ✅ It's an array
  }
}

// ✅ NARROWING #4: Custom type guards
function isString(val: unknown): val is string {
  return typeof val === "string";
}

function process(data: unknown) {
  if (isString(data)) {
    console.log(data.toUpperCase()); // ✅ TypeScript knows it's string
  }
}

// ✅ NARROWING #5: Truthiness check
function printLength(str: string | null) {
  if (str) {
    console.log(str.length); // ✅ str is not null
  }
}

// ✅ NARROWING #6: Equality check
function compare(x: string | number, y: boolean | string) {
  if (x === y) {
    // Both are strings now
    console.log(x.toUpperCase());
  }
}
```

**Real Example - React Component:**

```typescript
type ButtonProps = 
  | { variant: "primary"; onClick: () => void }
  | { variant: "secondary"; href: string };

function Button(props: ButtonProps) {
  // ✅ Type narrowing with variant check
  if (props.variant === "primary") {
    // TypeScript knows this is the first type
    return <button onClick={props.onClick}>Click me</button>;
  } else {
    // TypeScript knows this is the second type
    return <a href={props.href}>Link</a>;
  }
}

// Usage
<Button variant="primary" onClick={() => {}} />; // ✅ OK
<Button variant="secondary" href="/about" />; // ✅ OK
// <Button variant="primary" href="/about" />; // ❌ ERROR - href not in type
```

**Never Type - Unreachable Code:**

```typescript
// This ensures you've handled all cases
function exhaustiveCheck(status: "success" | "error" | "loading"): never {
  throw new Error(`Unhandled status: ${status}`);
}

function handleResponse(response: ApiResponse) {
  if (response.status === "success") {
    // ...
  } else if (response.status === "error") {
    // ...
  } else {
    // What if someone adds a new status?
    // TypeScript will catch it here!
    exhaustiveCheck(response.status); // ✅ Alerts you if you missed a case
  }
}
```

---

### 4️⃣ Generics - Reusable Types with Flexibility

**The Core Idea:**
Instead of hardcoding types, let the type be passed as a parameter.

```typescript
// ❌ BAD - Hardcoded types (repetitive)
function wrapString(value: string): { value: string } {
  return { value };
}

function wrapNumber(value: number): { value: number } {
  return { value };
}

// ✅ GOOD - Generic (reusable)
function wrap<T>(value: T): { value: T } {
  return { value };
}

// Works with any type!
wrap("hello"); // ✅ { value: string }
wrap(42); // ✅ { value: number }
wrap([1, 2, 3]); // ✅ { value: number[] }
```

**Generic with Constraints:**

```typescript
// ❌ Too loose - accepts anything
function getProperty<T>(obj: T, key: string): any {
  return obj[key]; // ❌ Error - key might not exist
}

// ✅ With constraint - only works with objects that have string keys
function getProperty<T extends Record<string, any>>(obj: T, key: keyof T): any {
  return obj[key]; // ✅ Key is guaranteed to exist
}

const user = { name: "John", age: 30 };
getProperty(user, "name"); // ✅ OK
getProperty(user, "email"); // ❌ ERROR - email doesn't exist
```

**Generic Arrays:**

```typescript
// Reusable array function
function first<T>(array: T[]): T {
  return array[0];
}

const firstString = first(["a", "b", "c"]); // ✅ type is string
const firstNumber = first([1, 2, 3]); // ✅ type is number
```

**Generic Types:**

```typescript
// Define once, use with many types
type Maybe<T> = T | null;
type Optional<T> = T | undefined;
type Async<T> = Promise<T>;

const maybeString: Maybe<string> = null; // ✅ OK
const maybeNumber: Maybe<number> = 42; // ✅ OK

const userData: Optional<{ name: string }> = undefined; // ✅ OK

const promise: Async<string> = Promise.resolve("hello"); // ✅ OK
```

---

### 5️⃣ Interfaces vs Types - When to Use Each

**The Similarities:**

Both define the shape of an object:

```typescript
// Using interface
interface User {
  name: string;
  age: number;
}

// Using type
type User = {
  name: string;
  age: number;
};

// Both work the same way
const user: User = { name: "John", age: 30 };
```

**The Key Differences:**

| Feature                | Interface                  | Type                        |
| ---------------------- | -------------------------- | --------------------------- |
| **Declaration merging** | ✅ Yes (auto-merge)        | ❌ No (will error)          |
| **Extends other types** | ✅ Yes                     | ✅ Yes                      |
| **Union types**         | ❌ No                      | ✅ Yes (`A \| B`)           |
| **Mapped types**        | ❌ No                      | ✅ Yes                      |
| **Primitives**          | ❌ No                      | ✅ Yes (`type Age = number`) |
| **Tuples**              | ❌ No                      | ✅ Yes (`type Pair = [1, 2]`) |
| **Performance**         | Slightly faster            | Slightly slower             |

**Difference #1 - Declaration Merging:**

```typescript
// ✅ Interfaces auto-merge
interface User {
  name: string;
}

interface User {
  age: number; // Merged!
}

const user: User = { name: "John", age: 30 }; // ✅ Both properties required

// ❌ Types don't merge
type User = { name: string };
type User = { age: number }; // ❌ ERROR - duplicate identifier
```

**Difference #2 - Union Types:**

```typescript
// ✅ Types support unions
type Status = "success" | "error" | "loading";
type Response = User | Post | Comment;

// ❌ Interfaces don't (interfaces are always object-like)
// interface Status = "success" | "error"; // ❌ ERROR
```

**Difference #3 - Mapped Types:**

```typescript
// ✅ Types support mapped types
type ReadOnly<T> = {
  readonly [K in keyof T]: T[K];
};

type User = { name: string; age: number };
type ReadOnlyUser = ReadOnly<User>;
// ✅ Results in: { readonly name: string; readonly age: number }

// ❌ Interfaces don't support this
// interface ReadOnly<T> { // This won't work
//   readonly [K in keyof T]: T[K];
// }
```

**When to Use What:**

```typescript
// ✅ Use INTERFACE for:
// - Object structures (classes, components props)
// - Extensibility (will other libraries extend this?)
// - API contracts that might need merging

interface ComponentProps {
  title: string;
  onClick: () => void;
}

interface DatabaseRow {
  id: number;
  createdAt: Date;
}

// ✅ Use TYPE for:
// - Complex types (unions, intersections, mapped)
// - Primitives, tuples, functions
// - Type transformations

type Status = "idle" | "loading" | "error" | "success";
type Callback = (data: unknown) => void;
type Flatten<T> = T extends Array<infer U> ? U : T;
```

**Real-World Example - Combining Both:**

```typescript
// Define data shape with interface (object-like)
interface User {
  id: number;
  name: string;
  email: string;
}

// Define API response with type (union)
type ApiResponse<T> = 
  | { status: "success"; data: T }
  | { status: "error"; error: string };

// Use both together
type UserResponse = ApiResponse<User>;

// Result:
// {
//   status: "success";
//   data: {
//     id: number;
//     name: string;
//     email: string;
//   };
// } | {
//   status: "error";
//   error: string;
// }
```

**Extending Types:**

```typescript
// Interfaces - use extends
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}

// Types - use intersection (&)
type Animal = { name: string };
type Dog = Animal & { breed: string };

// Both result in: { name: string; breed: string }
```

---

## 📚 Learn

### 🧬 Core Mastery Concepts

- **Generics**
  - **What it is:** Flexible types that allow you to use a component or function with multiple types while keeping its type safety.
  - **Real-World Example:** Like a "One-Size-Fits-All" stretchable glove. It stretches to fit a hand, a robot's claw, or even a child's hand, but it stays a "glove" for each.
  - **Goal:** Write reusable code without using `any`.

- **Conditional Types**
  - **What it is:** Choosing one type or another based on a condition (like an "if-else" statement for types).
  - **Real-World Example:** Like a "Vending Machine". If you put in a Dollar, you get a Soda; if you put in a Quarter, you get Gum. The machine knows the output based on the input.
  - **Goal:** Create dynamic APIs that change their return type based on their arguments.

- **The `infer` Keyword**
  - **What it is:** Asking TypeScript to "figure out" a type for you based on its structure.
  - **Real-World Example:** Like a "Detective" using a footprint to infer the size of the shoe. You don't know the shoe, but you can "figure out" its size by looking at its mark.
  - **Goal:** Extract hidden types from complex structures or external libraries.

- **Discriminated Unions**
  - **What it is:** Using a common "tag" to tell TypeScript which specific thing you're dealing with in a list of options.
  - **Real-World Example:** Like a "Labeled Box". If the sticker says "FRAGILE", you know there's glass inside; if it says "HEAVY", it's books. The sticker tells you the contents without opening it.
  - **Goal:** Make your states (like Loading, Success, Error) 100% bug-proof and predictable.

---

---

## Advanced Generics & Conditional Types

**Why it matters:**
Generics let you write reusable code that works with ANY type while maintaining type safety. Instead of `any`, you can parameterize types and make them flexible yet strict.

**Generic Constraints:**

```typescript
// ❌ BAD: Works with any type (loses type safety)
function getValue(obj: any, key: string) {
  return obj[key];
}

// ✅ GOOD: Only works with objects that have string keys
function getValue<T extends Record<string, any>>(obj: T, key: keyof T) {
  return obj[key];
}

// Usage:
const user = { name: "John", age: 30 };
const name = getValue(user, "name"); // ✅ OK - type is string
const invalid = getValue(user, "email"); // ❌ ERROR - 'email' doesn't exist
```

---

### 🎯 1. Generic Defaults

**What it is:** When you define a generic type/function, you can provide a DEFAULT type that will be used if no type is specified.

**Simple Examples:**

```typescript
// ❌ BAD: Users have to specify ALL generic parameters every time
type Result<T, E> = {
  data: T;
  error: E;
};

// Usage becomes verbose
const response: Result<string, Error> = { data: "success", error: new Error() };
const emptyResponse: Result<null, Error> = { data: null, error: new Error() };

// ✅ GOOD: Use default types - much cleaner!
type Result<T = unknown, E = Error> = {
  data: T;
  error: E;
};

// Now you only specify what's different
const response: Result<string> = { data: "success", error: new Error() };
const emptyResponse: Result = { data: null, error: new Error() }; // Uses all defaults!
```

**Real-World Example - API Response Handler:**

```typescript
// Generic default makes this reusable without being verbose
type ApiResponse<Data = any, StatusCode = 200> = {
  status: StatusCode;
  payload: Data;
  timestamp: Date;
};

// Use case 1: Success response (uses default StatusCode = 200)
type SuccessResponse = ApiResponse<{ userId: string }>;
// Equivalent to: { status: 200; payload: { userId: string }; timestamp: Date }

// Use case 2: Error response (custom status code)
type ErrorResponse = ApiResponse<{ message: string }, 500>;
// Equivalent to: { status: 500; payload: { message: string }; timestamp: Date }

// Use case 3: Generic response (uses all defaults)
type DefaultResponse = ApiResponse;
// Equivalent to: { status: 200; payload: any; timestamp: Date }
```

**Function with Generic Defaults:**

```typescript
// Without defaults: Users must specify BOTH types
function handleResponse<T, E>(data: T, error: E): void {
  // ...
}

// With defaults: Much more flexible
function handleResponse<T = string, E extends Error = Error>(
  data: T,
  error?: E,
): void {
  console.log(data, error?.message);
}

// Usage - all these work now!
handleResponse("hello"); // T=string (default), E=Error (default)
handleResponse("hello", new Error("oops")); // T=string, E=Error
handleResponse(42); // T=number, E=Error (default)
handleResponse(42, new TypeError("bad type")); // T=number, E=TypeError
```

---

### 🏭 2. Generic Factories - Creating Instances from Types

**What it is:** A factory is a function that **creates instances** of classes. Generic factories let you create ANY class instance while maintaining type safety.

**The Problem:**

```typescript
class User {
  constructor(public name: string) {}
}

class Product {
  constructor(public title: string) {}
}

// ❌ BAD: Need separate functions for each class
function createUser(name: string) {
  return new User(name);
}

function createProduct(title: string) {
  return new Product(title);
}

// Repetitive code!
```

**The Solution - Generic Factory:**

```typescript
// Step 1: Define what a "Constructor" is
type Constructor<T> = new (...args: any[]) => T;
// This means: "A constructor is something you can call with `new` that returns type T"

// Step 2: Create a generic factory
function createInstance<T>(constructor: Constructor<T>, ...args: any[]): T {
  return new constructor(...args);
}

// Step 3: Use it with any class!
class User {
  constructor(public name: string) {}
}

class Product {
  constructor(public title: string) {}
}

const user = createInstance(User, "John");
// ✅ typeof user === User

const product = createInstance(Product, "Laptop");
// ✅ typeof product === Product
```

**Advanced Factory with Type Safety:**

```typescript
// More realistic: Constructor with specific parameter types
type Constructor<T, Args extends any[] = any[]> = new (...args: Args) => T;

// Factory that validates constructor parameters
function create<T, Args extends any[]>(
  constructor: Constructor<T, Args>,
  ...args: Args
): T {
  if (!constructor) {
    throw new Error("Invalid constructor");
  }
  return new constructor(...args);
}

class User {
  constructor(name: string, age: number) {}
}

class Product {
  constructor(title: string, price: number) {}
}

// ✅ Works perfectly - TypeScript knows the required parameters
const user = create(User, "John", 30);

// ❌ ERROR - TypeScript catches wrong argument count!
// const invalid = create(User, "John"); // Missing age!

// ❌ ERROR - Wrong type!
// const invalid = create(User, "John", "thirty"); // age should be number
```

**Real-World: Dependency Injection Container**

```typescript
// IoC (Inversion of Control) Container using factories
class Container {
  private factories = new Map<string, Constructor<any>>();

  register<T>(name: string, constructor: Constructor<T>) {
    this.factories.set(name, constructor);
  }

  create<T>(name: string, ...args: any[]): T {
    const constructor = this.factories.get(name);
    if (!constructor) {
      throw new Error(`${name} not registered`);
    }
    return new constructor(...args);
  }
}

// Usage
const container = new Container();
container.register("user", User);
container.register("product", Product);

const user = container.create<User>("user", "John");
const product = container.create<Product>("product", "Laptop");
```

**Functional Examples - Real-World Use Cases:**

**Example 1: Database Model Factory**

```typescript
// Real use case: Auto-convert database rows to typed objects
class User {
  id: number;
  name: string;
  email: string;

  constructor(data: { id: number; name: string; email: string }) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
  }

  getDisplayName() {
    return `${this.name} (${this.email})`;
  }
}

class Post {
  id: number;
  title: string;
  authorId: number;

  constructor(data: { id: number; title: string; authorId: number }) {
    this.id = data.id;
    this.title = data.title;
    this.authorId = authorId;
  }
}

// Generic factory: Convert DB row to typed object
function dbModel<T>(Model: new (data: any) => T, rawData: any): T {
  return new Model(rawData);
}

// Usage - fetch from database and convert
const dbRow = { id: 1, name: "John", email: "john@example.com" };
const user = dbModel(User, dbRow); // ✅ Type is User
console.log(user.getDisplayName()); // ✅ Can call User methods

const postRow = { id: 1, title: "Hello", authorId: 1 };
const post = dbModel(Post, postRow); // ✅ Type is Post
```

**Example 2: API Response Factory**

```typescript
// Real use case: Convert API response to typed objects with validation
type ApiResponse<T> = {
  status: number;
  data: T;
};

class ApiResponseHandler {
  static handle<T>(Model: new (data: any) => T, response: ApiResponse<any>): T {
    if (response.status !== 200) {
      throw new Error(`API Error: ${response.status}`);
    }
    return new Model(response.data); // ✅ Type-safe conversion
  }
}

// Usage
const apiResponse = {
  status: 200,
  data: { id: 1, name: "John", email: "john@example.com" },
};
const user = ApiResponseHandler.handle(User, apiResponse);
// ✅ Automatically validates and converts
```

**Example 3: Service Factory Pattern**

```typescript
// Real use case: Inject dependencies into services
interface Logger {
  log(msg: string): void;
}

interface Database {
  query(sql: string): Promise<any[]>;
}

class UserService {
  constructor(
    public logger: Logger,
    public db: Database,
  ) {}

  async getUser(id: number) {
    this.logger.log(`Fetching user ${id}`);
    const users = await this.db.query(`SELECT * FROM users WHERE id = ${id}`);
    return users[0];
  }
}

class PostService {
  constructor(
    public logger: Logger,
    public db: Database,
  ) {}

  async getPost(id: number) {
    this.logger.log(`Fetching post ${id}`);
    const posts = await this.db.query(`SELECT * FROM posts WHERE id = ${id}`);
    return posts[0];
  }
}

// Generic service factory with dependency injection
type ServiceConstructor<T> = new (logger: Logger, db: Database) => T;

function createService<T>(
  Service: ServiceConstructor<T>,
  logger: Logger,
  db: Database,
): T {
  return new Service(logger, db); // ✅ Inject dependencies
}

// Usage
const logger = { log: console.log };
const db = { query: async (sql) => [] };

const userService = createService(UserService, logger, db);
// ✅ UserService has logger and db injected automatically
const users = await userService.getUser(1);

const postService = createService(PostService, logger, db);
const post = await postService.getPost(1);
```

**Example 4: Higher-Order Factory Function**

```typescript
// Real use case: Create multiple instances with shared configuration
class ConfigurableCache {
  maxSize: number;
  ttl: number;

  constructor(config: { maxSize: number; ttl: number }) {
    this.maxSize = config.maxSize;
    this.ttl = config.ttl;
  }

  set(key: string, value: any) {
    // Store with TTL
  }

  get(key: string) {
    // Retrieve from cache
  }
}

class ConfigurableQueue {
  maxSize: number;
  ttl: number;

  constructor(config: { maxSize: number; ttl: number }) {
    this.maxSize = config.maxSize;
    this.ttl = config.ttl;
  }
}

// Higher-order factory: Create factories with preset config
function withConfig<T>(
  Model: new (config: { maxSize: number; ttl: number }) => T,
  defaultConfig: { maxSize: number; ttl: number },
) {
  return (...overrides: Partial<{ maxSize: number; ttl: number }>[]) => {
    const config = { ...defaultConfig, ...overrides[0] };
    return new Model(config);
  };
}

// Usage - different services with different configs
const createProductCache = withConfig(ConfigurableCache, {
  maxSize: 1000,
  ttl: 3600,
});

const createUserCache = withConfig(ConfigurableCache, {
  maxSize: 500,
  ttl: 1800,
});

const productCache = createProductCache(); // ✅ Uses preset config
const userCache = createUserCache({ maxSize: 2000 }); // ✅ Override maxSize
```

**Example 5: Plugin Factory System**

```typescript
// Real use case: Register and instantiate plugins dynamically
interface Plugin {
  name: string;
  init(): void;
}

class LoggerPlugin implements Plugin {
  name = "Logger";
  init() {
    console.log("Logger initialized");
  }
}

class AnalyticsPlugin implements Plugin {
  name = "Analytics";
  init() {
    console.log("Analytics initialized");
  }
}

class StoragePlugin implements Plugin {
  name = "Storage";
  init() {
    console.log("Storage initialized");
  }
}

// Plugin registry and factory
class PluginManager {
  private plugins = new Map<string, new () => Plugin>();

  register<T extends Plugin>(name: string, Plugin: new () => T) {
    this.plugins.set(name, Plugin);
  }

  createPlugin<T extends Plugin>(name: string): T {
    const PluginClass = this.plugins.get(name);
    if (!PluginClass) {
      throw new Error(`Plugin "${name}" not registered`);
    }
    return new PluginClass() as T;
  }

  initializeAll() {
    this.plugins.forEach((PluginClass) => {
      const instance = new PluginClass();
      instance.init();
    });
  }
}

// Usage
const manager = new PluginManager();
manager.register("logger", LoggerPlugin);
manager.register("analytics", AnalyticsPlugin);
manager.register("storage", StoragePlugin);

// Create specific plugins
const logger = manager.createPlugin<LoggerPlugin>("logger");
const analytics = manager.createPlugin<AnalyticsPlugin>("analytics");

// Initialize all
manager.initializeAll();
```

---

### 🔀 3. Conditional Types - Choose Type Based on Condition

**What it is:** A conditional type picks ONE type or another based on a type condition. Think of it like a ternary operator for TYPES: `T extends Condition ? TypeIfTrue : TypeIfFalse`

**Basic Syntax:**

```typescript
type MyType<T> = T extends SomeType ? TypeA : TypeB;
//                                   ^       ^     ^
//                           if T matches     |     alternative
//                                        then use this
```

**Simple Examples to Understand:**

```typescript
// Example 1: Check if it's a string
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">; // ✅ true
type B = IsString<42>; // ❌ false
type C = IsString<string>; // ✅ true (matches string type)

// Example 2: Pick a type based on input
type GetReturnType<T> = T extends (...args: any[]) => infer R ? R : unknown;

type A = GetReturnType<() => string>; // ✅ string
type B = GetReturnType<(x: number) => boolean>; // ✅ boolean
type C = GetReturnType<"not a function">; // ❌ unknown
```

**Real-World Examples:**

**Example 1: Extract Value from Promises**

```typescript
// Problem: You need to get the VALUE TYPE from a Promise
type Unwrap<T> = T extends Promise<infer U> ? U : T;
//                         ^^^^^^^^^^^^^^^^^   ^
//       "If T is a Promise, extract what's inside it (U)"

type A = Unwrap<Promise<string>>; // ✅ string
type B = Unwrap<Promise<number>>; // ✅ number
type C = Unwrap<string>; // ✅ string (not a promise, return as-is)

// Real usage:
async function fetchUser(): Promise<{ id: number; name: string }> {
  return { id: 1, name: "John" };
}

type UserData = Unwrap<ReturnType<typeof fetchUser>>;
// ✅ UserData = { id: number; name: string }
```

**Example 2: Type Different API Responses by Endpoint**

```typescript
type ApiEndpoint<E> = E extends "users"
  ? { id: number; name: string; email: string }
  : E extends "posts"
    ? { id: number; title: string; content: string }
    : E extends "comments"
      ? { id: number; text: string; postId: number }
      : never;

// Auto-complete your response type!
type UserData = ApiEndpoint<"users">;
// ✅ { id: number; name: string; email: string }

type PostData = ApiEndpoint<"posts">;
// ✅ { id: number; title: string; content: string }

type UnknownData = ApiEndpoint<"unknown">;
// ❌ never (will cause TypeScript error if you use it)
```

**Example 3: Check if Type is Array, then get Element Type**

```typescript
type GetArrayType<T> = T extends Array<infer U> ? U : T;

type A = GetArrayType<string[]>; // ✅ string
type B = GetArrayType<number[]>; // ✅ number
type C = GetArrayType<string>; // ✅ string (not array, return as-is)

// Practical use:
type FlattenArray<T> = T extends Array<infer U> ? U : T;

function flattenValue<T>(val: T): FlattenArray<T> {
  if (Array.isArray(val)) {
    return val[0] as any; // Returns first element
  }
  return val as any; // Returns value as-is
}

const result1 = flattenValue([1, 2, 3]); // ✅ type is number
const result2 = flattenValue("hello"); // ✅ type is string
```

**Example 4: React Hook Pattern - Extract Props from Component**

```typescript
type ComponentProps<C> =
  C extends React.ComponentType<infer P>
    ? P
    : never;

interface ButtonProps {
  label: string;
  onClick: () => void;
}

const MyButton: React.FC<ButtonProps> = ({ label, onClick }) => (
  <button onClick={onClick}>{label}</button>
);

type MyButtonProps = ComponentProps<typeof MyButton>;
// ✅ MyButtonProps = ButtonProps automatically!
```

**Example 5: Multi-Level Conditional Type (Complex)**

```typescript
// Determine if something is a promise, array, or plain value
type Resolve<T> =
  T extends Promise<infer U>
    ? Resolve<U> // Recursively unwrap promises
    : T extends Array<infer U>
      ? U // Extract array element type
      : T; // Return as-is

type A = Resolve<Promise<string[]>>; // ✅ string
type B = Resolve<Promise<Promise<number>>>; // ✅ number
type C = Resolve<number>; // ✅ number
```

---

## 📌 Summary Table

| Concept               | Purpose                                                         | Key Syntax                           |
| --------------------- | --------------------------------------------------------------- | ------------------------------------ |
| **Generic Defaults**  | Provide default types so users don't have to specify everything | `<T = Default>`                      |
| **Generic Factories** | Create instances of ANY class with type safety                  | `Constructor<T>, new (...args) => T` |
| **Conditional Types** | Pick a type based on a condition                                | `T extends X ? TypeA : TypeB`        |

type User = ApiEndpoint<"users">; // { id: number; name: string }

````

**Distributive Conditional Types - Iterating over unions:**

```typescript
// Applies conditional to each type in union
type ToArray<T> = T extends any ? T[] : never;

type Result = ToArray<string | number>;
// Result = string[] | number[]  (not (string | number)[])

// Real example: Filter out null from union
type NonNullable<T> = T extends null | undefined ? never : T;

type User = { name: string } | null | undefined;
type ValidUser = NonNullable<User>; // { name: string }
````

---

## Infer Keyword & Utility Types

**What is Infer?**
`infer` lets TypeScript figure out what a type should be based on the structure. It's like destructuring for types.

```typescript
// Extract the parameter type of a function
type GetParameter<T> = T extends (arg: infer P) => any ? P : never;

function greet(name: string) {
  /* ... */
}
type GreetParam = GetParameter<typeof greet>; // string

// Extract return type
type GetReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type GreetReturn = GetReturnType<typeof greet>; // void
```

**Pattern Matching with Infer:**

```typescript
// Extract types from complex structures
type ExtractUser<T> = T extends { user: infer U } ? U : never;

type Response = { status: 200; user: { id: number; name: string } };
type User = ExtractUser<Response>; // { id: number; name: string }

// Extract array element type
type ExtractArray<T> = T extends (infer E)[] ? E : never;

type Numbers = ExtractArray<[1, 2, 3]>; // 1 | 2 | 3
type Strings = ExtractArray<string[]>; // string
```

**Built-in Utility Types (that use infer):**

```typescript
// Extract function return type
type MyReturnType<T extends (...args: any) => any> = T extends (
  ...args: any
) => infer R
  ? R
  : any;

// Extract function parameters
type MyParameters<T extends (...args: any) => any> = T extends (
  ...args: infer P
) => any
  ? P
  : [];

// Extract Promise/async value
type MyAwaited<T> = T extends Promise<infer U> ? U : T;

const promise = Promise.resolve("hello");
type Value = MyAwaited<typeof promise>; // string
```

**Practical Example - API Response Handler:**

```typescript
// Infer response type from endpoint definition
type Endpoint = {
  "/users": { id: number; name: string }[];
  "/posts": { id: number; title: string }[];
};

type GetEndpointResponse<T extends keyof Endpoint> = Endpoint[T];

type UsersResponse = GetEndpointResponse<"/users">; // User[]
type PostsResponse = GetEndpointResponse<"/posts">; // Post[]

// Now all handlers are properly typed
function handleResponse<T extends keyof Endpoint>(
  endpoint: T,
  data: GetEndpointResponse<T>,
) {
  // data is automatically the right type!
}

handleResponse("/users", [{ id: 1, name: "John" }]); // ✅ OK
handleResponse("/users", [{ id: 1, title: "Hello" }]); // ❌ ERROR
```

---

## Discriminated Unions

**Simple Idea: Use a "tag" to tell TypeScript which type you have**

Imagine you're driving a car app. You need to show:

- **Loading state**: Show spinner, no data
- **Success state**: Show the data
- **Error state**: Show the error message

```typescript
// ❌ BAD: TypeScript gets confused
type ApiResponse = {
  status: string; // Is it loading? success? error?
  data?: string;
  error?: string;
};

const response: ApiResponse = { status: "success", data: "hello" };

// Problem: Which one exists - data or error?
if (response.status === "success") {
  console.log(response.data); // ❌ TypeScript says might not exist!
  console.log(response.error); // ❌ TypeScript says might not exist!
}

// ✅ GOOD: Use a "tag" (the status field) to identify the type
type LoadingState = {
  status: "loading"; // Only one option
};

type SuccessState = {
  status: "success"; // Only one option
  data: string; // This ALWAYS exists here
};

type ErrorState = {
  status: "error"; // Only one option
  error: string; // This ALWAYS exists here
};

type ApiResponse = LoadingState | SuccessState | ErrorState;

const response: ApiResponse = { status: "success", data: "hello" };

// Now TypeScript is smart!
if (response.status === "success") {
  console.log(response.data); // ✅ OK! TypeScript knows it exists
  // console.log(response.error); // ❌ ERROR - doesn't exist on success!
}
```

**Real-World Example - User Permissions:**

```typescript
// Different users have different permissions
type AdminUser = {
  role: "admin";
  canDeleteUsers: boolean;
  canEditSettings: boolean;
};

type RegularUser = {
  role: "user";
  canEditProfile: boolean;
};

type Guest = {
  role: "guest";
  // Guests have no permissions
};

type User = AdminUser | RegularUser | Guest;

// When you check the role, TypeScript knows what properties exist!
function deleteUser(user: User) {
  if (user.role === "admin") {
    // TypeScript knows: user IS AdminUser here
    if (user.canDeleteUsers) {
      // Delete the user
    }
  }
}

// React Example: Show different UI based on role
function renderUser(user: User) {
  switch (user.role) {
    case "admin":
      return <AdminDashboard deletable={user.canDeleteUsers} />; // ✅ Exists!
    case "user":
      return <UserProfile editable={user.canEditProfile} />; // ✅ Exists!
    case "guest":
      return <GuestPage />; // ✅ No extra properties
    // 💡 TypeScript WARNS if you forget a case!
  }
}
```

---

## Type-Safe API Layer

**The Problem:**

When you fetch data from an API, bad things happen:

```typescript
// ❌ BAD: No type safety
const response = await fetch("/api/users/1");
const user = await response.json();

console.log(user.email); // ❌ Runtime error if email doesn't exist
console.log(user.fullName); // ❌ Did you mean 'name' or 'full_name'?

// Plus: Do you remember if it's /users or /api/users? /api/user or /api/users?
```

**The Solution:**

Define what each API call returns, ONCE, in a central place. Then TypeScript helps you everywhere.

```typescript
// Step 1: Define what each endpoint returns
type ApiEndpoints = {
  "/users": User[]; // GET /users returns array of users
  "/users/:id": User; // GET /users/123 returns ONE user
  "/login": { token: string; user: User }; // POST /login returns token + user
  "/posts": Post[]; // GET /posts returns posts
};

// Step 2: Create a helper that's type-safe
async function apiGet<T extends keyof ApiEndpoints>(
  endpoint: T,
): Promise<ApiEndpoints[T]> {
  const response = await fetch(endpoint);
  return response.json();
}

// Step 3: Use it - TypeScript autocompletes and validates!
const users = await apiGet("/users"); // ✅ Returns User[]
const user = await apiGet("/users/:id"); // ✅ Returns User
const loginResult = await apiGet("/login"); // ✅ Returns { token, user }

// TypeScript prevents typos!
// const bad = await apiGet("/userz"); // ❌ ERROR - endpoint doesn't exist
// const bad = await apiGet("/users/123/invalid"); // ❌ ERROR - not defined

// You get autocomplete suggestions for all endpoints!
```

**Real Example - Shopping App:**

```typescript
type ShoppingApiEndpoints = {
  "/products": { id: number; name: string; price: number }[];
  "/cart": { items: number[]; total: number };
  "/checkout": { orderId: string; status: "success" | "pending" };
};

async function api<E extends keyof ShoppingApiEndpoints>(
  endpoint: E,
): Promise<ShoppingApiEndpoints[E]> {
  const response = await fetch(endpoint);
  return response.json();
}

// In your component:
const products = await api("/products"); // ✅ You know it's a list of products
const cart = await api("/cart"); // ✅ You know it has items and total

// Instead of guessing!
// products[0].price // ✅ Works, you KNOW price exists
// products[0].cost // ❌ ERROR - property doesn't exist
```

**Error Handling - Be Prepared:**

```typescript
// Show different errors to users
type ApiResponse<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: string }
  | { status: "loading" };

async function apiWithError<E extends keyof ShoppingApiEndpoints>(
  endpoint: E,
): Promise<ApiResponse<ShoppingApiEndpoints[E]>> {
  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: String(error) };
  }
}

// Usage:
const result = await apiWithError("/products");

if (result.status === "success") {
  console.log(result.data); // ✅ data exists here
  showProducts(result.data);
} else if (result.status === "error") {
  console.log(result.error); // ✅ error exists here
  showErrorMessage(result.error);
}
```

---

## Zod Schema Validation

**The Problem:**

You fetch data from the backend. But what if it's different than expected?

```typescript
// Backend sends: { name: "John", age: 30 }
const user = await fetch("/api/users/1").then((r) => r.json());

console.log(user.name); // ✅ Works
console.log(user.age); // ✅ Works

// But what if backend returns: { fullName: "John", years: 30 } ?
// Your code breaks at RUNTIME! 😱
```

**The Solution - Zod:**

Zod "checks" data from the API before you use it.

```typescript
import { z } from "zod";

// Step 1: Define what shape the data should have
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(), // Must be valid email
  age: z.number().min(0).max(150), // Age between 0-150
});

// Step 2: Get TypeScript type from the schema (one source of truth!)
type User = z.infer<typeof UserSchema>;
// Automatically: {
//   id: number;
//   name: string;
//   email: string;
//   age: number;
// }

// Step 3: Validate data
const apiResponse = { id: 1, name: "John", email: "john@example.com", age: 30 };

const user = UserSchema.parse(apiResponse); // ✅ All fields are correct!

// What if data is wrong?
const badResponse = { id: 1, name: "John", email: "not-an-email", age: -5 };
try {
  UserSchema.parse(badResponse); // ❌ Throws error with details
} catch (error) {
  console.log(error.issues);
  // [
  //   { message: "Invalid email", path: ["email"] },
  //   { message: "Must be at least 0", path: ["age"] }
  // ]
}
```

**Better Approach - Don't Throw:**

```typescript
// Use .safeParse() to get error messages, not exceptions
const result = UserSchema.safeParse(apiResponse);

if (result.success) {
  // ✅ Data is valid!
  console.log(result.data); // Safely use it
} else {
  // ❌ Data is invalid
  console.log(result.error.issues); // Show user what's wrong
  // [
  //   { code: "invalid_string", message: "Invalid email", path: ["email"] },
  //   { code: "too_small", message: "Must be at least 0", path: ["age"] }
  // ]
}
```

**Real Example - Form Validation:**

```typescript
const SignupSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username too short")
      .max(20, "Username too long"),
    password: z
      .string()
      .min(8, "Password must be 8+ characters")
      .regex(/[A-Z]/, "Need uppercase letter")
      .regex(/[0-9]/, "Need a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// In your form handler:
function handleSignup(formData: unknown) {
  const result = SignupSchema.safeParse(formData);

  if (!result.success) {
    // Show errors to user
    result.error.issues.forEach((issue) => {
      showError(issue.path[0], issue.message);
    });
    return;
  }

  // ✅ Data is 100% valid
  await signup(result.data);
}
```

**Validate Optional Fields:**

```typescript
const UpdateUserSchema = z.object({
  username: z.string().optional(), // Can be missing
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

type UpdateUser = z.infer<typeof UpdateUserSchema>;
// {
//   username?: string;
//   email?: string;
//   phone?: string;
// }

// Update only some fields
const updates = { email: "newemail@example.com" };
const validated = UpdateUserSchema.parse(updates); // ✅ OK
```

---

## Build a Type-Safe API Client

**The Goal:** ONE place to define your API, then use it everywhere with type safety.

**Step-by-Step Example - E-commerce App:**

```typescript
import { z } from "zod";

// Step 1: Define all the data shapes
const Product = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number(),
  inStock: z.boolean(),
});

const User = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
});

const Order = z.object({
  id: z.string(),
  userId: z.number(),
  products: z.array(Product),
  total: z.number(),
  status: z.enum(["pending", "shipped", "delivered"]),
});

// Step 2: List all your API endpoints
const apiEndpoints = {
  // GET /api/products -> returns list of products
  getProducts: {
    method: "GET" as const,
    url: "/api/products",
    response: z.array(Product),
  },

  // GET /api/products/123 -> returns ONE product
  getProduct: {
    method: "GET" as const,
    url: "/api/products/:id",
    params: z.object({ id: z.number() }),
    response: Product,
  },

  // POST /api/orders -> create order, send products
  createOrder: {
    method: "POST" as const,
    url: "/api/orders",
    body: z.object({
      userId: z.number(),
      productIds: z.array(z.number()),
    }),
    response: Order,
  },

  // GET /api/users/me -> get current user
  getCurrentUser: {
    method: "GET" as const,
    url: "/api/users/me",
    response: User,
  },
};

// Step 3: Create the API client
class ApiClient {
  constructor(private baseUrl: string) {}

  async request<T>(
    endpoint: (typeof apiEndpoints)[keyof typeof apiEndpoints],
    options?: { params?: any; body?: any },
  ): Promise<T> {
    let url = endpoint.url;

    // Replace URL params (e.g., :id with actual id)
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url = url.replace(`:${key}`, String(value));
      });
    }

    // Make fetch call
    const response = await fetch(this.baseUrl + url, {
      method: endpoint.method,
      headers: { "Content-Type": "application/json" },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();

    // Validate response matches schema
    return endpoint.response.parse(data);
  }
}

// Step 4: Use it!
const client = new ApiClient("http://localhost:3000");

// All TypeScript-safe!
const products = await client.request(apiEndpoints.getProducts);
// ✅ products is Product[], you KNOW the structure

const product = await client.request(apiEndpoints.getProduct, {
  params: { id: 123 },
});
// ✅ product is Product

const order = await client.request(apiEndpoints.createOrder, {
  body: { userId: 1, productIds: [1, 2, 3] },
});
// ✅ order is Order, status is one of pending|shipped|delivered

const user = await client.request(apiEndpoints.getCurrentUser);
// ✅ user is User, you know all fields exist
```

**What This Gives You:**

✅ **One source of truth** - Define API once, use everywhere  
✅ **IDE autocomplete** - See all endpoints and their requirements  
✅ **Type safety** - TypeScript catches mistakes before runtime  
✅ **Auto-validation** - Response data is checked against schema  
✅ **Better error messages** - Know exactly what's wrong if validation fails

**Real-World Pattern:**

```typescript
// In your React component
function ProductList() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<z.infer<typeof Product>[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const result = await client.request(apiEndpoints.getProducts);
        setProducts(result); // ✅ result is already Product[]
        setError(null);
      } catch (err) {
        setError("Failed to load products");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;

  return (
    <div>
      {products.map(p => (
        <ProductCard
          key={p.id}
          name={p.name} // ✅ TypeScript knows name exists
          price={p.price} // ✅ TypeScript knows price exists
          inStock={p.inStock} // ✅ TypeScript knows inStock exists
        />
      ))}
    </div>
  );
}
```

---

## 🎯 Mastery Checklist

> **Move runtime bugs → compile-time errors.**

The goal of advanced TypeScript is to catch issues at the editor level before they ever reach users.

### You Should Master

- Why does this type error exist?
- How do I write a generic that prevents this bug?
- Can I make this impossible to misuse with types?
- What's the simplest type-safe solution?
- When should I use `infer` vs explicit types?
- How do discriminated unions help with safety?

---

**Let's make TypeScript work for you! 💪**
