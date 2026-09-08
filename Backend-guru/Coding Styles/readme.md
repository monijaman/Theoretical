# Readable Backend Code

Use consistent names, small responsibilities, and clear error handling to make backend code easier to change. The examples use JavaScript and TypeScript.

## Start Here

**Before you begin:** JavaScript functions, objects, promises, and basic TypeScript types.

Read the explanation before each code example, then follow the data through the normal path and one failure case. The snippets teach individual concepts; application helpers, package setup, credentials, and deployment configuration are not all included.

## Contents

- [Quick Analogy](#quick-analogy)
- [1. Naming Conventions](#1-naming-conventions)
- [2. Function Design](#2-function-design)
- [3. Code Structure & Project Layout](#3-code-structure--project-layout)
- [4. Error Handling Style](#4-error-handling-style)
- [5. Comments & Documentation Style](#5-comments--documentation-style)
- [6. Immutability & Pure Functions](#6-immutability--pure-functions)
- [7. Async / Await Style](#7-async--await-style)
- [8. TypeScript-Specific Style](#8-typescript-specific-style)
- [9. Linting & Formatting Tools](#9-linting--formatting-tools)
- [10. Code Review Checklist](#10-code-review-checklist)
- [Skill Progression](#skill-progression)
- [Practice Check](#practice-check)

## Key Terms

| Term | Meaning |
| --- | --- |
| Guard clause | an early return that handles a special case before the main path. |
| Pure function | a function whose result depends on its inputs and has no observable side effects. |
| Dependency injection | supplying collaborators to a function or class. |
| Linting | automated checks for code patterns and likely mistakes. |


## Quick Analogy

Think of coding style as **grammar in a language**. Two people can both speak English, but one uses run-on sentences, inconsistent tenses, and vague words while the other writes clearly and precisely. Both are technically "correct," but only one is easy to follow at scale. Coding style is what lets 50 engineers read and modify the same codebase without confusion.

---

## 1. Naming Conventions

Choose names that reveal purpose and follow the conventions already used by the project. The casing rules below are examples of a consistent JavaScript and TypeScript style.

Names are the most-read part of any codebase. A good name eliminates the need for a comment.

### Variables & Functions — use camelCase, be descriptive

```typescript
// ❌ Bad — unclear, cryptic abbreviations
const d = new Date();
const u = await db.find(id);
function calc(a: number, b: number) { return a * b * 0.1; }

// ✅ Good — self-documenting
const currentDate = new Date();
const user = await db.findUserById(userId);
function calculateTaxAmount(price: number, quantity: number): number {
  return price * quantity * TAX_RATE;
}
```

### Constants — use SCREAMING_SNAKE_CASE

```typescript
// ❌ Bad
const rate = 0.08;
const maxRetries = 3;

// ✅ Good
const TAX_RATE = 0.08;
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PAGE_SIZE = 20;
```

### Classes & Types — use PascalCase

```typescript
// ❌ Bad
class userService {}
type orderPayload = { ... }

// ✅ Good
class UserService {}
type OrderPayload = { ... }
interface PaymentGateway {}
```

### Booleans — prefix with is/has/can/should

```typescript
// ❌ Bad
const active = user.status === 'active';
const email = user.emailVerified;

// ✅ Good
const isActive = user.status === 'active';
const hasVerifiedEmail = user.emailVerified;
const canPublishPost = user.role === 'editor' && hasVerifiedEmail;
const shouldSendWelcomeEmail = !user.onboardingCompleted;
```

### Files & Directories — use kebab-case

```text
// ❌ Bad
UserService.ts
orderController.ts
PaymentHelper.ts

// ✅ Good
user.service.ts
order.controller.ts
payment.helper.ts
```

---

## 2. Function Design

A function is easier to follow when its main task is visible. Use early returns for exceptional cases and extract helpers when doing so gives a meaningful name to a distinct operation.

### Single Responsibility — one function does one thing

```typescript
// ❌ Bad — one function does everything: DB query, business logic, email, logging
async function processOrder(orderId: string) {
  const order = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (order.total > 1000) {
    order.discount = order.total * 0.1;
    await db.query('UPDATE orders SET discount = $1 WHERE id = $2', [order.discount, orderId]);
  }
  await emailService.send(order.userEmail, 'Order processed');
  console.log(`Order ${orderId} processed`);
  return order;
}

// ✅ Good — each concern is separated
async function getOrderById(orderId: string): Promise<Order> {
  return db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
}

function applyBulkDiscount(order: Order): Order {
  if (order.total > 1000) {
    return { ...order, discount: order.total * 0.1 };
  }
  return order;
}

async function processOrder(orderId: string): Promise<Order> {
  const order = await getOrderById(orderId);
  const discountedOrder = applyBulkDiscount(order);
  await saveOrder(discountedOrder);
  await emailService.sendOrderConfirmation(discountedOrder);
  logger.info({ orderId }, 'Order processed');
  return discountedOrder;
}
```

### Keep functions focused

Length is a signal to review, not a fixed rule. Extract a helper when its name clarifies a distinct operation; avoid splitting a clear sequence only to meet a line count.

### Avoid deep nesting — use early returns (guard clauses)

```typescript
// ❌ Bad — arrow-head antipattern, hard to follow
function getUserDiscount(user: User) {
  if (user) {
    if (user.isActive) {
      if (user.membershipTier === 'gold') {
        if (user.totalPurchases > 5000) {
          return 0.25;
        } else {
          return 0.15;
        }
      } else {
        return 0.05;
      }
    } else {
      return 0;
    }
  } else {
    return 0;
  }
}

// ✅ Good — guard clauses flatten the logic
function getUserDiscount(user: User): number {
  if (!user || !user.isActive) return 0;
  if (user.membershipTier !== 'gold') return 0.05;
  return user.totalPurchases > 5000 ? 0.25 : 0.15;
}
```

---

## 3. Code Structure & Project Layout

A consistent project layout lets any engineer find a file in under 10 seconds.

### Layered Architecture (most Node.js backends)

```text
src/
├── controllers/        # HTTP layer — parse request, call service, return response
│   ├── user.controller.ts
│   └── order.controller.ts
│
├── services/           # Business logic — orchestrates repositories, external calls
│   ├── user.service.ts
│   └── order.service.ts
│
├── repositories/       # Data access — SQL queries, ORM calls, Redis ops
│   ├── user.repository.ts
│   └── order.repository.ts
│
├── models/             # Type definitions, DTOs, entities
│   ├── user.model.ts
│   └── order.model.ts
│
├── middleware/         # Express middleware — auth, logging, rate limit
│   ├── auth.middleware.ts
│   └── error.middleware.ts
│
├── utils/              # Pure helper functions — no side effects
│   ├── date.utils.ts
│   └── crypto.utils.ts
│
├── config/             # Environment config, constants
│   └── env.ts
│
└── app.ts              # Express setup, middleware registration, route mounting
```

### Dependency direction rule

```text
Controller → Service → Repository → Database
```

In the layered example below, controllers call services and services call repositories. Keep that direction consistent when using this structure; simpler applications may choose fewer layers.

---

## 4. Error Handling Style

Make expected failures understandable to callers while preserving useful diagnostic information. A central handler can translate application errors into consistent HTTP responses.

Errors are first-class citizens — not afterthoughts.

### Use custom error classes when callers need distinct handling

```typescript
// Base error
class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class UnauthorizedError extends AppError {
  constructor() {
    super('Unauthorized', 401, 'UNAUTHORIZED');
  }
}
```

### Centralized error handler in Express

```typescript
// middleware/error.middleware.ts
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  // Unexpected errors — do not leak internals
  logger.error({ err }, 'Unexpected error');
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
}
```

### Never swallow errors silently

```typescript
// ❌ Bad — the error disappears, you have no idea it happened
try {
  await sendEmail(user.email);
} catch (e) {}

// ✅ Good — at minimum, log it
try {
  await sendEmail(user.email);
} catch (err) {
  logger.warn({ err, userId: user.id }, 'Failed to send welcome email');
  // Decide: rethrow, continue, or retry
}
```

---

## 5. Comments & Documentation Style

Comments are most useful when they explain a decision, constraint, or surprising behavior. Keep them close to the code and update them when behavior changes.

### Comments explain WHY, not WHAT

```typescript
// ❌ Bad — comment restates the code
// Loop through users and send emails
for (const user of users) {
  await sendEmail(user.email);
}

// ✅ Good — comment explains why a non-obvious choice was made
// We send emails sequentially (not Promise.all) because the SMTP
// provider rate-limits to 5 concurrent connections per account.
for (const user of users) {
  await sendEmail(user.email);
}
```

### Document public interfaces and non-obvious contracts

```typescript
/**
 * Calculates the total price after applying the user's membership discount.
 * Does NOT include tax — call calculateTax() separately.
 *
 * @param price - Base price in USD cents (integer)
 * @param user  - Must have membershipTier populated
 */
function applyMembershipDiscount(price: number, user: User): number {
  // ...
}
```

---

## 6. Immutability & Pure Functions

Avoiding hidden changes to shared objects makes code easier to reason about. A pure function is especially easy to test because its inputs determine its output.

Prefer immutable data transformations. Side effects should be explicit.

```typescript
// ❌ Bad — mutating input creates hidden bugs
function addDiscount(order: Order, discount: number) {
  order.discount = discount;       // mutates the caller's object
  order.total -= discount;
  return order;
}

// ✅ Good — returns new object, input is untouched
function addDiscount(order: Order, discount: number): Order {
  return {
    ...order,
    discount,
    total: order.total - discount,
  };
}
```

---

## 7. Async / Await Style

Use sequential awaits when one operation depends on another. Independent work can run concurrently, but the amount of concurrency should fit your database and downstream capacity.

```typescript
// ❌ Bad — callback hell / raw promise chains
getUser(id, (err, user) => {
  if (err) return handleError(err);
  getOrders(user.id, (err2, orders) => {
    if (err2) return handleError(err2);
    // ...
  });
});

// ❌ Also bad — unhandled rejection
doSomethingAsync().then(result => process(result));

// ✅ Good — async/await with proper error handling
async function getUserOrders(userId: string): Promise<Order[]> {
  const user = await getUser(userId);       // throws on error, caught upstream
  return getOrdersByUserId(user.id);
}
```

### Use `Promise.all` for independent async operations

```typescript
// ❌ Bad — sequential when they could run in parallel (2x latency)
const user = await getUser(userId);
const settings = await getSettings(userId);

// ✅ Good — parallel (half the latency)
const [user, settings] = await Promise.all([
  getUser(userId),
  getSettings(userId),
]);
```

---

## 8. TypeScript-Specific Style

Types describe valid inputs and outputs before the program runs. Use them to make invalid states harder to represent, while still validating data received from external sources.

### Prefer `interface` for shapes, `type` for aliases/unions

```typescript
// Shapes (objects) → interface
interface User {
  id: string;
  email: string;
  role: UserRole;
}

// Unions, aliases, computed → type
type UserRole = 'admin' | 'editor' | 'viewer';
type UserId = string;
type CreateUserInput = Omit<User, 'id'>;
```

### Avoid `any` — use `unknown` for truly unknown values

```typescript
// ❌ Bad — any disables type checking entirely
function parsePayload(raw: any) {
  return raw.userId;  // no safety
}

// ✅ Good — unknown forces you to narrow the type before use
function parsePayload(raw: unknown): string {
  if (typeof raw !== 'object' || raw === null) throw new ValidationError('Invalid payload');
  const payload = raw as Record<string, unknown>;
  if (typeof payload.userId !== 'string') throw new ValidationError('Missing userId');
  return payload.userId;
}
```

### Use `readonly` for domain objects that should not be mutated

```typescript
interface Order {
  readonly id: string;
  readonly createdAt: Date;
  total: number;     // can be updated
  discount: number;
}
```

---

## 9. Linting & Formatting Tools

The best style guide is one enforced automatically — not by code review debates.

| Tool         | Purpose                                       | Config file       |
| ------------ | --------------------------------------------- | ----------------- |
| **ESLint** | Catch likely mistakes and enforce conventions | `eslint.config.js` for flat config; legacy example below |
| **Prettier** | Consistent formatting (semicolons, quotes)    | `.prettierrc`     |
| **Husky**    | Run lint/format on git commit (pre-commit hook) | `.husky/`       |
| **lint-staged** | Only lint changed files (fast commits)    | `package.json`    |

### Legacy `.eslintrc.json` Example

This example uses the older ESLint configuration format. For projects using flat configuration, follow the [ESLint migration guide](https://eslint.org/docs/latest/use/configure/migration-guide) and use the configuration expected by your installed version.

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "no-console": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Recommended `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

---

## 10. Code Review Checklist

Before submitting or approving a PR, check:

```text
Naming
  [ ] Variables, functions, and files follow the conventions above
  [ ] Boolean variables start with is/has/can/should
  [ ] No single-letter variables outside of tiny loops

Functions
  [ ] Each function has one clear responsibility
  [ ] No function longer than ~30 lines
  [ ] No nesting deeper than 2 levels (use guard clauses)

Error Handling
  [ ] All promise rejections are caught
  [ ] Errors use the custom AppError hierarchy
  [ ] No empty catch blocks

Types
  [ ] No use of `any`
  [ ] All function parameters and return values are typed
  [ ] DTOs/interfaces are defined for all API inputs and outputs

Tests
  [ ] New logic is covered by at least one unit test
  [ ] Edge cases (null, empty, max) are tested
```

---

## Skill Progression

| Habit                       | Junior               | Mid                    | Senior                      |
| --------------------------- | -------------------- | ---------------------- | --------------------------- |
| Naming                      | Descriptive          | Consistent conventions | Names read like prose       |
| Function size               | Works but long       | < 30 lines             | < 20 lines, single purpose  |
| Error handling              | try/catch sometimes  | Custom errors          | Centralized, typed, logged  |
| TypeScript usage            | Any everywhere       | Basic types            | Strict mode, no any         |
| Linting                     | Manual               | ESLint configured      | Enforced in CI + pre-commit |
| Code review comments        | "Fix this"           | Explains the why       | Teaches the pattern         |

**Time Commitment:** 2 weeks (concepts) + ongoing practice | **Difficulty:** ⭐⭐⭐

## Practice Check

Refactor one request handler, explain the changes, and check that its behavior stays the same. Explain one trade-off and one failure mode before moving on.

[Back to contents](#contents) · [Backend learning guide](../readme.md)
