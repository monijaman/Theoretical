# API Design

Design an API that clients can understand and use consistently. Follow the examples from naming resources through documenting behavior and handling retries.

## Start Here

**Before you begin:** HTTP requests, JSON, and a simple Express route.

Read the explanation before each code example, then follow the data through the normal path and one failure case. The snippets teach individual concepts; application helpers, package setup, credentials, and deployment configuration are not all included.

## Contents

- [Quick Analogy](#quick-analogy)
- [1. RESTful URL Design](#1-restful-url-design)
- [2. Consistent Response Contracts](#2-consistent-response-contracts)
- [3. API Versioning](#3-api-versioning)
- [4. Request & Response Design Details](#4-request--response-design-details)
- [5. Idempotency Keys](#5-idempotency-keys)
- [6. Pagination Patterns](#6-pagination-patterns)
- [7. GraphQL vs REST — When to Use Which](#7-graphql-vs-rest--when-to-use-which)
- [8. API Documentation](#8-api-documentation)
- [9. Real-World API Design Patterns (Stripe-inspired)](#9-real-world-api-design-patterns-stripe-inspired)
- [10. API Design Checklist](#10-api-design-checklist)
- [API Maturity Model](#api-maturity-model)
- [Practice Check](#practice-check)

## Key Terms

| Term | Meaning |
| --- | --- |
| REST | an architectural style often used for resource-oriented HTTP APIs. |
| Contract | the requests and responses clients can rely on. |
| Idempotent | repeating an operation has the same intended effect as performing it once. |
| Cursor | a marker identifying where the next page should begin. |


## Quick Analogy

An API is like a **restaurant menu**. The menu (contract) tells customers exactly what they can order, what it costs, and what they will receive. A good menu is clear, predictable, and stable — you do not change the name of "Margherita Pizza" every week. A bad menu is ambiguous, inconsistent, and breaks customer expectations. API design is writing that menu for developers.

---

## 1. RESTful URL Design

A resource is something your API exposes, such as an order or a user. Use the URL to identify the resource and the HTTP method to describe the operation. The examples below compare names, methods, and relationships.

### Resource naming — nouns, not verbs

```text
// ❌ Bad — verbs in URLs (RPC-style)
GET  /getUser?id=123
POST /createOrder
POST /deleteProduct/456
POST /updateUserEmail

// ✅ Good — nouns, hierarchical, plural
GET    /users/123
POST   /orders
DELETE /products/456
PATCH  /users/123
```

### HTTP Methods map to CRUD operations

| Method   | Action            | Idempotent | Safe |
| -------- | ----------------- | ---------- | ---- |
| `GET`    | Read              | ✅ Yes     | ✅ Yes |
| `POST`   | Create            | ❌ No      | ❌ No |
| `PUT`    | Replace (full)    | ✅ Yes     | ❌ No |
| `PATCH`  | Partial update    | Depends*    | ❌ No |
| `DELETE` | Delete            | ✅ Yes     | ❌ No |

*PATCH idempotency depends on implementation — prefer idempotent patch semantics.

### Nested resources — express relationships, but avoid deep nesting

```text
// ❌ Bad — too deep, fragile
GET /users/123/orders/456/items/789/reviews/1

// ✅ Good — max 2 levels for hierarchy, use query params beyond that
GET /orders/456/items                     # items under an order
GET /orders/456/items/789                 # specific item
GET /reviews?itemId=789&userId=123        # use query params for associations
```

### Query parameters for filtering, sorting, pagination

```text
GET /products?category=electronics&inStock=true
GET /orders?status=pending&sortBy=createdAt&order=desc
GET /users?page=2&limit=20
GET /orders?cursor=eyJpZCI6MTAwfQ==&limit=20   # cursor pagination
```

---

## 2. Consistent Response Contracts

A response contract tells clients what fields and status codes to expect. Keep equivalent responses consistent so clients can share parsing and error-handling code.

Use predictable conventions for equivalent responses. A collection, a single resource, and an empty response may have different documented shapes.

### Success response envelope

```typescript
// ✅ Standard success shape
{
  "data": { ... },          // the actual payload
  "meta": {                 // optional metadata
    "total": 1250,
    "page": 2,
    "limit": 20,
    "nextCursor": "abc123"
  }
}

// Examples
// GET /users/123
{
  "data": {
    "id": "123",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}

// GET /orders?page=1&limit=2
{
  "data": [
    { "id": "ord_1", "total": 2500, "status": "shipped" },
    { "id": "ord_2", "total": 750, "status": "pending" }
  ],
  "meta": {
    "total": 84,
    "page": 1,
    "limit": 2,
    "hasNext": true
  }
}
```

### Error response envelope

```typescript
// ✅ Standard error shape (consistent across all endpoints)
{
  "error": {
    "code": "VALIDATION_ERROR",       // machine-readable, stable
    "message": "Email is invalid",    // human-readable, for developers
    "details": [                      // optional: field-level errors
      { "field": "email", "message": "Must be a valid email address" },
      { "field": "password", "message": "Must be at least 8 characters" }
    ],
    "requestId": "req_abc123"         // for support/debugging correlation
  }
}
```

### HTTP Status codes — use them semantically

```text
200 OK             — Successful GET, PUT, PATCH
201 Created        — Successful POST that creates a resource
204 No Content     — Successful DELETE (no body)
400 Bad Request    — Client error: validation failure, malformed JSON
401 Unauthorized   — Missing or invalid authentication token
403 Forbidden      — Authenticated but not authorized for this resource
404 Not Found      — Resource does not exist
409 Conflict       — Duplicate resource, version conflict
422 Unprocessable  — Passes validation but fails business rules
429 Too Many Req   — Rate limit exceeded
500 Internal       — Server error (never expose details to client)
503 Unavailable    — Temporary downtime (health check failures)
```

---

## 3. API Versioning

Versioning helps clients move between incompatible contracts. Before choosing URL or header versioning, decide which changes are compatible and how long older clients will be supported.

Avoid surprising existing clients with incompatible changes. Use an explicit migration and deprecation policy when a contract must change.

### URI versioning (most common, most explicit)

```text
https://api.example.com/v1/users
https://api.example.com/v2/users
```

**Pros:** Immediately visible, easy to route at the load balancer level, easy to deprecate old versions.
**Decision point:** Choose a versioning scheme based on client compatibility and routing needs.

### Header versioning

```text
GET /users
Accept: application/vnd.example.v2+json
```

**Pros:** Clean URLs.
**Cons:** Hidden from casual inspection, harder to test in a browser.

### What counts as a breaking change?

```text
BREAKING — requires a new major version
  ❌ Renaming a field (data.user_name → data.userName)
  ❌ Removing a field
  ❌ Changing a field's type (string → number)
  ❌ Changing HTTP status codes for existing operations
  ❌ Making a previously optional field required
  ❌ Changing authentication mechanisms

NON-BREAKING — safe to add in existing version
  ✅ Adding a new optional field to a response
  ✅ Adding a new endpoint
  ✅ Adding a new optional request parameter
  ✅ Relaxing validation (accepting more values)
```

### Deprecation strategy

```typescript
// Add deprecation header when a field or endpoint will be removed
res.set('Deprecation', 'true');
res.set('Sunset', 'Sat, 01 Jan 2026 00:00:00 GMT');
res.set('Link', '</v2/users>; rel="successor-version"');
```

---

## 4. Request & Response Design Details

Small format choices become long-lived client dependencies. Document timestamp units and time zones, identifier formats, and which fields appear after a mutation.

### Use ISO 8601 for all dates

```typescript
// ❌ Bad — ambiguous, timezone-dependent
{ "createdAt": "01/15/2024" }
{ "createdAt": 1705312800 }

// ✅ Good — unambiguous, sortable, timezone-explicit
{ "createdAt": "2024-01-15T10:00:00Z" }
```

### Use strings for IDs, not integers

```typescript
// ❌ Bad — integer IDs leak record counts, cause JS precision issues for large numbers
{ "id": 12345678901234567 }

// ✅ Good — opaque string IDs (UUID or prefixed IDs like Stripe)
{ "id": "usr_01HX4B7Q9NZK3YJ8PQRTV2MWE6" }
```

### Return created/updated resource after mutations

```typescript
// ❌ Bad — client must make a second request to get the new state
app.post('/users', async (req, res) => {
  await db.createUser(req.body);
  res.status(201).json({ success: true });  // useless
});

// ✅ Good — return the created resource
app.post('/users', async (req, res) => {
  const user = await db.createUser(req.body);
  res.status(201).json({ data: user });
});
```

### HATEOAS (Hypermedia links) — for discoverable APIs

```typescript
// Include links to related actions (optional but powerful)
{
  "data": {
    "id": "ord_123",
    "status": "pending",
    "total": 2500
  },
  "links": {
    "self": "/orders/ord_123",
    "cancel": "/orders/ord_123/cancel",
    "items": "/orders/ord_123/items",
    "user": "/users/usr_456"
  }
}
```

---

## 5. Idempotency Keys

A retry can arrive after the first request succeeded but its response was lost. Reusing an operation key lets the server recognize that retry and return the original outcome.

For mutations that must not be duplicated (payment processing, order creation), accept a client-supplied idempotency key.

The cache-based sketch below only illustrates returning a stored response. Its separate check, charge, and cache write do not prevent concurrent charges or a crash after charging. A complete implementation needs atomic ownership, a key scoped to the caller and operation, request-payload validation, and provider-level idempotency or reconciliation.

```typescript
// Client sends: POST /payments
// Header: Idempotency-Key: client-generated-uuid-123

app.post('/payments', authenticate, async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) throw new ValidationError('Idempotency-Key header required');

  // Check if this exact request was already processed
  const existing = await redis.get(`idem:${idempotencyKey}`);
  if (existing) {
    return res.status(200).json(JSON.parse(existing));  // return cached response
  }

  // Process payment
  const payment = await paymentService.charge(req.body);
  const response = { data: payment };

  // Store result for 24 hours (covers network retry window)
  await redis.set(`idem:${idempotencyKey}`, JSON.stringify(response), 'EX', 86400);

  res.status(201).json(response);
});
```

---

## 6. Pagination Patterns

Pagination returns a bounded portion of a collection. Offset pagination skips a number of rows; cursor pagination continues after a known position. Stable ordering and an appropriate index matter for both.

### Offset Pagination — simple, but problematic at scale

```typescript
// GET /posts?page=3&limit=20
// SQL: SELECT * FROM posts ORDER BY id LIMIT 20 OFFSET 40

// ❌ Problems:
//   - Items shift between pages if new records are inserted
//   - COUNT(*) query is expensive on large tables
//   - Large offsets require skipping more rows; inspect the query plan.
```

### Cursor Pagination — stable, scalable (recommended)

```typescript
// GET /posts?cursor=eyJpZCI6MTAwfQ==&limit=20
// Cursor is base64-encoded { id: 100 }

async function getPosts(cursor?: string, limit = 20) {
  const afterId = cursor
    ? JSON.parse(Buffer.from(cursor, 'base64').toString()).id
    : null;

  const query = afterId
    ? 'SELECT * FROM posts WHERE id > $1 ORDER BY id ASC LIMIT $2'
    : 'SELECT * FROM posts ORDER BY id ASC LIMIT $1';

  const params = afterId ? [afterId, limit + 1] : [limit + 1];
  const { rows } = await pool.query(query, params);

  const hasNext = rows.length > limit;
  const data = rows.slice(0, limit);
  const nextCursor = hasNext
    ? Buffer.from(JSON.stringify({ id: data[data.length - 1].id })).toString('base64')
    : null;

  return { data, meta: { nextCursor, hasNext } };
}
```

---

## 7. GraphQL vs REST — When to Use Which

REST endpoints expose resources through an HTTP contract. GraphQL lets clients request fields from a schema. Compare client needs, caching, authorization, and query cost before choosing.

```text
REST is better when:
  ✅ Public API consumed by third-party developers
  ✅ Simple CRUD resources with predictable shapes
  ✅ HTTP caching is important (GET requests cache natively)
  ✅ Team is small or unfamiliar with GraphQL

GraphQL is better when:
  ✅ Mobile clients with different field requirements than web
  ✅ Complex, deeply nested data (avoids N+1 with DataLoader)
  ✅ Client flexibility (select different fields already exposed by the schema)
  ✅ Internal BFF (Backend For Frontend) layer
  ✅ Many different consumer types with different data needs

Both can coexist: REST for public API, GraphQL for internal frontend BFF
```

---

## 8. API Documentation

Document a complete request and response, including authentication, validation failures, and pagination. The OpenAPI fragment below shows the structure; its referenced components must be defined in a complete specification.

A great API with poor documentation is a bad API.

### OpenAPI / Swagger spec (REST standard)

```yaml
# openapi.yaml
openapi: "3.0.3"
info:
  title: Orders API
  version: "1.0"
paths:
  /orders:
    post:
      summary: Create a new order
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderInput'
      responses:
        "201":
          description: Order created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'
        "400":
          $ref: '#/components/responses/ValidationError'
        "401":
          $ref: '#/components/responses/Unauthorized'
```

Generate docs from code with tools like `tsoa` or `@nestjs/swagger` to keep docs and code in sync.

---

## 9. Real-World API Design Patterns (Stripe-inspired)

Prefixed identifiers make logs and support requests easier to read. Expandable resources let a client request related data in one response, at the cost of more server work.

### Prefixed IDs for readability

```typescript
// Stripe-style prefixed IDs — immediately identifiable
const id = `cus_${generateId()}`;   // customer
const id = `ord_${generateId()}`;   // order
const id = `pay_${generateId()}`;   // payment
const id = `evt_${generateId()}`;   // event (webhook)
```

### Expandable resources — reduce round trips

```typescript
// GET /orders/ord_123
// Basic response
{ "id": "ord_123", "userId": "usr_456", "total": 2500 }

// GET /orders/ord_123?expand=user,items
// Expanded response — user and items are embedded, not just IDs
{
  "id": "ord_123",
  "user": { "id": "usr_456", "name": "Alice", "email": "alice@example.com" },
  "items": [{ "productId": "prd_789", "quantity": 2, "price": 1250 }],
  "total": 2500
}
```

Implementation:

```typescript
app.get('/orders/:id', authenticate, async (req, res) => {
  const expand = ((req.query.expand as string) ?? '').split(',').filter(Boolean);
  const order = await orderService.findById(req.params.id, { expand });
  res.json({ data: order });
});
```

---

## 10. API Design Checklist

Before shipping any new endpoint, verify:

```text
URL Design
  [ ] Uses nouns (not verbs) for resources
  [ ] Uses plural resource names (/users, not /user)
  [ ] Nesting is max 2 levels deep
  [ ] Query params used for filtering, sorting, pagination

HTTP Semantics
  [ ] Correct HTTP method for each action
  [ ] Correct HTTP status codes in all cases
  [ ] DELETE returns 204 with no body
  [ ] POST create returns 201 with the created resource

Response Contract
  [ ] Success response wrapped in { data: ... }
  [ ] Error response follows { error: { code, message, details } }
  [ ] All dates in ISO 8601 format
  [ ] IDs are strings, not integers

Security
  [ ] All endpoints require authentication (or have explicit public exemption)
  [ ] Input validated with schema before processing
  [ ] No sensitive data in error messages or logs

Versioning & Compatibility
  [ ] Breaking changes require a new version (/v2/)
  [ ] Deprecated endpoints send Deprecation header

Documentation
  [ ] OpenAPI spec updated for new endpoints
  [ ] Error codes documented
  [ ] At least one request/response example per endpoint
```

---

## API Maturity Model

| Level | Description                                | Example                                      |
| ----- | ------------------------------------------ | -------------------------------------------- |
| 0     | One endpoint, all actions via POST         | `POST /api?action=getUser&id=1`              |
| 1     | Individual resources                       | `GET /users/1`                               |
| 2     | HTTP verbs + status codes                  | `DELETE /users/1` → 204                      |
| 3     | HATEOAS — hypermedia links in response     | Response includes `links.nextPage`           |

Contract-first development and versioning are separate practices; they do not add a fourth level to the Richardson maturity model.

**Time Commitment:** 2-3 weeks | **Difficulty:** ⭐⭐⭐⭐

## Practice Check

Design an orders endpoint with validation, pagination, an error response, and a documented retry policy. Explain one trade-off and one failure mode before moving on.

[Back to contents](#contents) · [Backend learning guide](../readme.md)
