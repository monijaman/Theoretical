# REST vs GraphQL vs gRPC
[← Back to index](../readme.md)

## What it is and why interviewers ask about it

When building an API, you need a contract between clients and servers. The three dominant approaches solve different problems:

- **REST** focuses on simplicity, HTTP standards, and caching.
- **GraphQL** lets clients request exactly the data they need.
- **gRPC** focuses on high-performance communication between services.

There is no universally "best" API style.

Large companies commonly use all three:

- **REST** for public APIs.
- **GraphQL** for frontend applications with flexible data needs.
- **gRPC** for internal service-to-service communication.

Interviewers want to know whether you understand these trade-offs instead of treating one technology as universally superior.

---

# REST

REST models everything as **resources** exposed through URLs and manipulated using standard HTTP methods.

```text
GET    /users/42
POST   /users
PATCH  /users/42
DELETE /users/42
GET    /users/42/orders
```

REST relies heavily on HTTP semantics.

Examples include:

- HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- HTTP status codes
- Cache-Control
- ETag
- Content negotiation

Because it follows HTTP conventions, REST integrates naturally with:

- browsers
- CDNs
- API gateways
- proxies
- curl
- monitoring tools

---

## REST's biggest weakness

REST endpoints return predefined response shapes.

Suppose a mobile screen only needs:

- user name
- avatar
- last five order totals

The client might call:

```text
GET /users/42
GET /users/42/orders
```

Problems:

- User endpoint returns many unnecessary fields.
- Orders endpoint returns far more information than needed.
- Multiple HTTP requests are required.

This creates two common problems:

### Over-fetching

Receiving more data than needed.

### Under-fetching

Making multiple requests to build one screen.

As applications grow, backend teams often create custom endpoints for every UI screen, which becomes difficult to maintain.

---

# GraphQL

GraphQL exposes a single endpoint, typically:

```text
POST /graphql
```

Instead of fixed endpoints, the client sends a query describing exactly the data it wants.

```graphql
query {
  user(id: 42) {
    name
    avatar
    orders(limit: 5) {
      total
      createdAt
    }
  }
}
```

The server returns only those fields.

```json
{
  "data": {
    "user": {
      "name": "Alice",
      "avatar": "...",
      "orders": [
        {
          "total": 42,
          "createdAt": "2026-07-01"
        }
      ]
    }
  }
}
```

One request.

No over-fetching.

No under-fetching.

---

## Strong schema

Every GraphQL API defines a schema.

```graphql
type User {
  id: ID!
  name: String!
  avatar: String
  orders(limit: Int): [Order!]!
}

type Order {
  id: ID!
  total: Float!
  createdAt: String!
}
```

The schema provides:

- type safety
- automatic documentation
- IDE autocomplete
- query validation
- code generation

---

## The N+1 problem

GraphQL resolves fields independently.

Imagine requesting:

- 50 users
- each user's orders

A naive implementation performs:

```text
1 query:
SELECT * FROM users

50 queries:
SELECT * FROM orders WHERE user_id = ?

Total = 51 database queries
```

This is called the **N+1 problem**.

---

## DataLoader

DataLoader batches multiple resolver calls into one database query.

Instead of:

```text
50 database queries
```

It performs:

```text
SELECT * FROM orders
WHERE user_id IN (...)
```

Only one query is executed.

Resolvers remain simple while database performance improves dramatically.

---

## When GraphQL shines

GraphQL works well when:

- mobile apps need different data
- frontend teams iterate rapidly
- many screens require different response shapes
- reducing network requests matters

---

## GraphQL drawbacks

GraphQL introduces new challenges:

- Query complexity must be limited.
- Deeply nested queries can become expensive.
- HTTP caching is harder because everything uses one endpoint.
- Resolver performance requires careful optimization.

---

# gRPC

gRPC is Google's high-performance RPC framework.

Instead of JSON, it uses **Protocol Buffers (protobuf)** for compact binary serialization.

Example service definition:

```protobuf
service OrderService {
    rpc GetOrder(GetOrderRequest)
        returns (Order);

    rpc StreamOrders(OrderSubscription)
        returns (stream OrderUpdate);
}
```

Code generators create client and server implementations automatically.

Developers simply call methods like:

```text
orderClient.GetOrder(...)
```

instead of constructing HTTP requests manually.

---

## Why gRPC is fast

gRPC gains performance through:

- binary protobuf messages
- HTTP/2
- connection reuse
- multiplexing
- generated serialization code

Compared to JSON APIs:

- smaller payloads
- less CPU
- lower latency
- higher throughput

---

## Streaming support

Streaming is built into gRPC.

It supports four communication models.

### Unary

One request.

One response.

```text
Client ─────► Server
Client ◄───── Server
```

---

### Server streaming

One request.

Many responses.

```text
Client ─────► Server

Client ◄───── Event 1
Client ◄───── Event 2
Client ◄───── Event 3
```

---

### Client streaming

Many requests.

One response.

```text
Client ─────► Chunk 1
Client ─────► Chunk 2
Client ─────► Chunk 3

Client ◄───── Upload complete
```

---

### Bidirectional streaming

Both sides continuously exchange messages.

```text
Client ◄────────────► Server
```

Useful for:

- chat
- telemetry
- video processing
- live collaboration

---

## Why companies use gRPC internally

Internal microservices communicate constantly.

Requirements include:

- low latency
- strict contracts
- high throughput
- efficient serialization

gRPC is ideal because both client and server are controlled by the same organization.

Large companies often expose REST or GraphQL publicly while using gRPC internally between services.

---

## gRPC drawbacks

gRPC is less suitable for public APIs because:

- browsers don't natively support it
- debugging binary messages is harder
- generated client code must stay synchronized
- schema changes require regenerating stubs

---

# Comparison

| Feature | REST | GraphQL | gRPC |
|---|---|---|---|
| API style | Resource-oriented | Query-oriented | RPC |
| Endpoints | Many | Single | Multiple RPC methods |
| Serialization | JSON | JSON | Protobuf |
| Transport | HTTP/1.1 or HTTP/2 | HTTP/1.1 or HTTP/2 | HTTP/2 |
| Browser support | Excellent | Excellent | Requires gRPC-Web |
| Caching | Excellent | Limited | Limited |
| Over-fetching | Common | None | None |
| Under-fetching | Common | None | None |
| Type safety | Optional | Strong | Very strong |
| Streaming | External technologies | Subscriptions | Built-in |
| Performance | Good | Good | Excellent |
| Best use case | Public APIs | Flexible frontend APIs | Internal microservices |

---

# Which should you choose?

Choose **REST** when:

- resources are stable
- HTTP caching is important
- public APIs are simple
- browser compatibility matters

Choose **GraphQL** when:

- clients need different data
- mobile bandwidth matters
- frontend teams evolve quickly
- many UI screens require different response shapes

Choose **gRPC** when:

- services communicate internally
- performance is critical
- streaming is required
- strict contracts are valuable

Many organizations use all three simultaneously.

---

# Common interview follow-ups

### Q: Why not use gRPC everywhere?

Because browsers don't natively support it, debugging is harder, and distributing generated client libraries to external consumers is inconvenient.

REST and GraphQL provide a much better developer experience for public APIs.

---

### Q: Why does GraphQL make HTTP caching difficult?

Everything typically goes through a single endpoint (`POST /graphql`).

Traditional CDNs cache based on URL and HTTP method, so GraphQL usually requires application-level caching or persisted queries.

---

### Q: What causes the N+1 problem?

Each resolver independently fetches related data.

Fetching 50 users may trigger 50 additional database queries for orders unless requests are batched.

DataLoader solves this by combining multiple resolver requests into one query.

---

### Q: How does a browser reach internal gRPC services?

The browser communicates with an API Gateway using REST or GraphQL.

The gateway translates incoming requests into internal gRPC calls to backend services.

```text
Browser
    │
 REST / GraphQL
    │
    ▼
API Gateway
    │
   gRPC
    │
    ▼
Microservices
```

---

### Q: When is REST better than GraphQL?

REST is often better when:

- the API is small
- response shapes rarely change
- HTTP caching provides significant value
- infrastructure simplicity is preferred

GraphQL's flexibility introduces additional operational complexity that isn't always justified.

---

### Q: When is GraphQL better than REST?

When multiple frontend clients require different combinations of data.

GraphQL eliminates unnecessary network requests while allowing each client to request exactly the fields it needs.

---

### Q: How does gRPC streaming compare with WebSockets?

Both support long-lived connections.

The difference is the audience:

- **WebSockets** are designed for browsers and public clients.
- **gRPC streaming** is designed for internal services using strongly typed protobuf messages.

A typical architecture exposes WebSockets to browsers while using gRPC streams between backend services.

## Related topics
- [WebSockets vs SSE vs Long Polling](websockets-vs-sse-vs-long-polling.md)
- [Load Balancing](../01-scaling-traffic/load-balancing.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
- [Microservices Architecture](../07-architecture-patterns/microservices-architecture.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [API Gateway](../10-system-design-practice/api-gateway.md)
- [Caching Strategies](../04-caching/caching-strategies.md)
