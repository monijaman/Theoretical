# Advanced TypeScript for Frontend

**Goal:** Build type-safe applications that catch bugs at compile-time, not runtime.

## 📑 Table of Contents

1. [Advanced Generics & Conditional Types](#advanced-generics--conditional-types)
2. [Infer Keyword & Utility Types](#infer-keyword--utility-types)
3. [Discriminated Unions](#discriminated-unions)
4. [Type-Safe API Layer](#type-safe-api-layer)
5. [Zod Schema Validation](#zod-schema-validation)
6. [Build a Type-Safe API Client](#build-a-type-safe-api-client)

---

## 📚 Learn

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

**Generic Defaults:**

```typescript
// Without defaults (verbose)
function createState<T, S = T>(initial: T) {
  // ...
}

// With defaults (cleaner)
type ApiResponse<T = unknown, E = Error> = {
  data?: T;
  error?: E;
};

const response: ApiResponse = { data: "success" }; // Uses defaults
const typedResponse: ApiResponse<User> = { data: new User() }; // Override default
```

**Generic Factories - Creating instances from types:**

```typescript
// Factory pattern with generics
type Constructor<T> = new (...args: any[]) => T;

function createInstance<T>(constructor: Constructor<T>, ...args: any[]): T {
  return new constructor(...args);
}

class User {
  constructor(public name: string) {}
}

const user = createInstance(User, "John"); // ✅ Type is User
```

**Conditional Types - Choose type based on condition:**

```typescript
// Type depends on what you pass
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">; // true
type B = IsString<number>; // false

// Real-world: Extract Promise value type
type Unwrap<T> = T extends Promise<infer U> ? U : T;

type A = Unwrap<Promise<string>>; // string
type B = Unwrap<string>; // string

// Practical: API type based on endpoint
type ApiEndpoint<T> = T extends "users"
  ? { id: number; name: string }
  : T extends "posts"
    ? { id: number; title: string }
    : never;

type User = ApiEndpoint<"users">; // { id: number; name: string }
```

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
```

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

**What are they?**
Discriminated unions are a pattern where you have multiple types that share a common property (the discriminant). TypeScript uses this to narrow the type automatically.

```typescript
// ❌ Regular union (TypeScript can't narrow well)
type Result =
  | { success: boolean; data: string }
  | { success: boolean; error: string };

const result: Result = { success: true, data: "hello" };
if (result.success) {
  // Still can't tell if result.data or result.error exists
  // result.data  // ERROR - property might not exist
}

// ✅ Discriminated union (much better!)
type Success = { status: "success"; data: string };
type Error = { status: "error"; error: string };
type Result = Success | Error;

const result: Result = { status: "success", data: "hello" };
if (result.status === "success") {
  // Now TypeScript knows this is Success type!
  console.log(result.data); // ✅ OK
  // result.error;  // ❌ ERROR - doesn't exist on Success
}
```

**Real-world API Response:**

```typescript
type ApiResponse =
  | { status: 'loading'; data: null }
  | { status: 'success'; data: any; error: null }
  | { status: 'error'; data: null; error: string };

function handleResponse(response: ApiResponse) {
  switch (response.status) {
    case 'loading':
      return <Spinner />;
    case 'success':
      return <Data data={response.data} />;  // data exists!
    case 'error':
      return <Error error={response.error} />;  // error exists!
  }
}

// Exhaustiveness checking - TypeScript warns if you forget a case!
```

**Type Guards for Union Types:**

```typescript
type User =
  | { type: 'admin'; adminLevel: number }
  | { type: 'user'; userId: number }
  | { type: 'guest' };

// Type guard function
function isAdmin(user: User): user is Extract<User, { type: 'admin' }> {
  return user.type === 'admin';
}

const user: User = /* ... */;
if (isAdmin(user)) {
  console.log(user.adminLevel);  // ✅ TypeScript knows this is admin
}
```

---

## Type-Safe API Layer

**What it does:**
A type-safe API layer ensures that:

- Endpoints are strictly typed
- Request parameters are validated
- Response data is properly typed
- Error handling is type-aware

```typescript
// 1. Define your API schema upfront
type ApiSchema = {
  "/users": {
    GET: { response: User[] };
    POST: { body: { name: string; email: string }; response: User };
  };
  "/users/:id": {
    GET: { params: { id: string }; response: User };
    PUT: { params: { id: string }; body: Partial<User>; response: User };
    DELETE: { params: { id: string }; response: void };
  };
};

// 2. Create a generic API client
type Endpoint = keyof ApiSchema;

function apiCall<E extends Endpoint, M extends keyof ApiSchema[E]>(
  endpoint: E,
  method: M,
  options: ApiSchema[E][M] extends { body: any }
    ? { body: ApiSchema[E][M]["body"] }
    : {},
): Promise<
  ApiSchema[E][M] extends { response: any }
    ? ApiSchema[E][M]["response"]
    : never
> {
  // Implementation
  return fetch(endpoint, { method, ...options }).then((r) => r.json());
}

// 3. Usage - fully type-safe!
const user = await apiCall("/users", "GET"); // ✅ Returns User[]
const newUser = await apiCall("/users", "POST", {
  body: { name: "John", email: "john@example.com" }, // ✅ Typed params
}); // ✅ Returns User

// Type errors caught at compile time!
// await apiCall('/users', 'POST', { body: { invalid: 'field' } });  // ❌ ERROR
```

**Error Handling Types:**

```typescript
type ApiError =
  | { type: "validation"; errors: Record<string, string[]> }
  | { type: "unauthorized"; message: string }
  | { type: "not_found"; resource: string }
  | { type: "server"; message: string };

async function apiCallSafe<T>(
  endpoint: string,
  options: any,
): Promise<{ data: T; error: null } | { data: null; error: ApiError }> {
  try {
    const response = await fetch(endpoint, options);
    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data }; // Typed error
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: { type: "server", message: String(err) },
    };
  }
}

// Usage with discriminated union
const result = await apiCallSafe<User>("/users/1", {});
if (result.error) {
  switch (result.error.type) {
    case "validation":
      // result.error.errors exists
      break;
  }
}
```

---

## Zod Schema Validation

**What is it?**
Zod is a TypeScript-first schema validation library that validates data at runtime AND infers TypeScript types from the schema.

```typescript
import { z } from "zod";

// 1. Define schema
const UserSchema = z.object({
  id: z.number(),
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().optional(),
});

// 2. Infer TypeScript type from schema
type User = z.infer<typeof UserSchema>;
// type User = {
//   id: number;
//   name: string;
//   email: string;
//   age?: number | undefined;
// }

// 3. Validate at runtime
const data = { id: 1, name: "John", email: "john@example.com" };
const result = UserSchema.parse(data); // ✅ Valid
// If invalid: throws ZodError

// Better: Use .safeParse() to get error info
const parsed = UserSchema.safeParse(data);
if (parsed.success) {
  console.log(parsed.data); // User
} else {
  console.log(parsed.error.issues); // Array of validation errors
}
```

**Advanced Patterns:**

```typescript
// Discriminated unions with Zod
const SuccessResponse = z.object({
  status: z.literal("success"),
  data: z.any(),
});

const ErrorResponse = z.object({
  status: z.literal("error"),
  error: z.string(),
});

const ApiResponse = z.discriminatedUnion("status", [
  SuccessResponse,
  ErrorResponse,
]);

type ApiResponse = z.infer<typeof ApiResponse>;

// Custom validation
const PasswordSchema = z
  .string()
  .min(8, "Must be 8+ characters")
  .regex(/[A-Z]/, "Must have uppercase")
  .regex(/[0-9]/, "Must have number");

// Refining types
const UpdateUserSchema = UserSchema.partial(); // All fields optional
const StrictUserSchema = UserSchema.strict(); // No extra properties
```

**Combining with API layer:**

```typescript
// Type-safe API client with Zod validation
type ApiEndpoint<T> = {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  responseSchema: z.ZodType<T>;
  bodySchema?: z.ZodType<any>;
};

const endpoints = {
  getUsers: {
    url: "/users",
    method: "GET",
    responseSchema: z.array(UserSchema),
  },
  createUser: {
    url: "/users",
    method: "POST",
    responseSchema: UserSchema,
    bodySchema: UserSchema.pick({ name: true, email: true }),
  },
} satisfies Record<string, ApiEndpoint<any>>;

async function apiCall<T>(endpoint: ApiEndpoint<T>, body?: any): Promise<T> {
  const response = await fetch(endpoint.url, {
    method: endpoint.method,
    body: body && JSON.stringify(endpoint.bodySchema?.parse(body)),
  });

  const data = await response.json();
  return endpoint.responseSchema.parse(data); // ✅ Validated!
}

// Usage
const users = await apiCall(endpoints.getUsers); // User[]
```

---

## Build a Type-Safe API Client

**Complete example:** Full-featured type-safe REST client

```typescript
import axios from "axios";
import { z } from "zod";

// 1. Define all endpoints with their types
const endpoints = {
  "GET /users": {
    params: z.object({ page: z.number().optional() }),
    response: z.array(z.object({ id: z.number(), name: z.string() })),
  },
  "POST /users": {
    body: z.object({ name: z.string(), email: z.string().email() }),
    response: z.object({ id: z.number(), name: z.string(), email: z.string() }),
  },
  "GET /users/:id": {
    params: z.object({ id: z.string() }),
    response: z.object({ id: z.number(), name: z.string(), email: z.string() }),
  },
  "DELETE /users/:id": {
    params: z.object({ id: z.string() }),
    response: z.null(),
  },
} as const;

type Endpoints = typeof endpoints;

// 2. Create type-safe client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async call<K extends keyof Endpoints>(
    endpoint: K,
    {
      params,
      body,
    }: {
      params?: any;
      body?: any;
    } = {},
  ): Promise<z.infer<Endpoints[K]["response"]>> {
    const schema = endpoints[endpoint];

    // Validate input
    if ("params" in schema && params) {
      schema.params.parse(params);
    }
    if ("body" in schema && body) {
      schema.body.parse(body);
    }

    // Make request
    const [method, path] = (endpoint as string).split(" ");
    const fullPath = path.replace(/:(\w+)/g, (_, key) => params[key]);

    const response = await axios({
      method,
      url: `${this.baseUrl}${fullPath}`,
      params: method === "GET" ? params : undefined,
      data: body,
    });

    // Validate and return response
    return schema.response.parse(response.data);
  }
}

// 3. Usage - fully type-safe!
const client = new ApiClient("https://api.example.com");

const users = await client.call("GET /users"); // User[]
const newUser = await client.call("POST /users", {
  body: { name: "John", email: "john@example.com" }, // Typed params!
});
const user = await client.call("GET /users/:id", {
  params: { id: "123" },
});

// Type errors caught at compile time!
// await client.call('GET /users', { params: { invalid: 123 } });  // ❌ ERROR
// await client.call('POST /users', { body: { name: 'John' } });  // ❌ ERROR (missing email)
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
