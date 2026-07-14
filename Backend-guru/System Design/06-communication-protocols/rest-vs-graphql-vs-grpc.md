# REST vs GraphQL vs gRPC
[← Back to index](../readme.md)

## What this is and why it's asked

Every API needs to pick a wire contract between client and server, and the three dominant answers optimize for different things: REST optimizes for uniformity and cacheability using HTTP itself as the semantics layer, GraphQL optimizes for letting the client dictate exactly what shape of data it needs, and gRPC optimizes for performance and strict contracts between services that both sides control. Interviewers ask this to see whether you understand *why* a company runs all three at once rather than picking a single "best" one — the honest answer is almost always "REST/GraphQL face the public internet and human client teams, gRPC talks to itself internally," and being able to justify that split is the actual signal they're listening for.

## REST — resource-oriented, HTTP semantics

REST models the API as a set of *resources* addressed by URLs, manipulated via standard HTTP verbs, with HTTP status codes and headers doing real semantic work (caching, idempotency, content negotiation) instead of being an afterthought.

```
GET    /users/42          -> fetch user 42
POST   /users             -> create a user
PATCH  /users/42          -> partially update user 42
DELETE /users/42          -> delete user 42
GET    /users/42/orders   -> nested resource: user 42's orders
```

Because REST reuses HTTP's own semantics, you get CDN/browser caching (`Cache-Control`, `ETag`), idempotency guarantees baked into the verb (`GET`/`PUT`/`DELETE` are supposed to be idempotent), and a uniform interface any HTTP-aware tool (browsers, curl, API gateways, CDNs) already understands without custom tooling — this is exactly what `../04-caching/cdn-architecture.md` and `../04-caching/caching-strategies.md` build on for GET-heavy endpoints.

**The over-fetching / under-fetching problem** is REST's classic pain point: a mobile client that only needs a user's name and avatar still gets the *entire* user object (over-fetching) because the endpoint shape is fixed by the server, not the client; conversely, rendering a screen that needs a user, their last 5 orders, and each order's line items often requires several round trips (under-fetching) — `GET /users/42`, then `GET /users/42/orders`, then `GET /orders/17/items` — unless the backend adds bespoke aggregation endpoints for every screen shape a client needs, which doesn't scale as the number of client screens grows.

```
Mobile screen needs: user.name, user.avatar, last 5 orders' totals

REST (naive):
  GET /users/42            -> full user object (way more fields than needed)
  GET /users/42/orders     -> full order objects (way more than "total")
  (2 round trips, both over-fetched)
```

## GraphQL — single endpoint, client-specified queries

GraphQL exposes exactly one endpoint (typically `POST /graphql`) backed by a strongly typed **schema**, and the client sends a query describing precisely the shape of data it wants — nested, in one request, no more and no less.

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

```json
{
  "data": {
    "user": {
      "name": "Alice",
      "avatar": "https://...",
      "orders": [
        { "total": 42.00, "createdAt": "2026-07-01" },
        { "total": 19.99, "createdAt": "2026-06-28" }
      ]
    }
  }
}
```

This directly solves REST's over/under-fetching problem: one request, exactly the fields asked for, arbitrarily nested. The **schema/type system** (defined in SDL — Schema Definition Language) is the contract: every field has a declared type, queries are validated against it before execution, and tools (GraphiQL, Apollo Studio) can introspect the schema to auto-generate docs and typed client code.

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

**The N+1 resolver problem** is GraphQL's own classic pain point, and it's the mirror image of REST's under-fetching problem: the naive way to resolve `user.orders` for a list of 50 users is to run one query per user's orders, resulting in 1 query for the users plus N queries for each user's orders — 51 round trips to the database for what should be 2.

```
Naive resolver execution for "give me 50 users and each one's orders":
  1 query: SELECT * FROM users LIMIT 50
  50 queries: SELECT * FROM orders WHERE user_id = ?   (one per user!)
  = 51 total DB round trips for what should be 2
```

**DataLoader** (originated at Facebook alongside GraphQL itself) fixes this by batching and deduplicating individual `load(id)` calls made *within a single tick of the event loop* into one batched query, then caching results for the duration of that one GraphQL request.

```javascript
const orderLoader = new DataLoader(async (userIds) => {
  const orders = await db.query(
    "SELECT * FROM orders WHERE user_id IN (?)", userIds
  );
  return userIds.map(id => orders.filter(o => o.user_id === id));
});

// each resolver just calls orderLoader.load(userId);
// DataLoader collects all calls made in the same tick and
// issues ONE batched query instead of 50 individual ones
```

- Good fit: mobile/web clients with diverse, evolving data needs (many different screens each wanting a different slice of the graph), rapidly iterating frontend teams who don't want to wait on backend endpoint changes for every new field.
- Costs: query complexity itself becomes an attack surface (a deeply nested query can be expensive to resolve — needs query cost analysis/depth limiting); HTTP-level caching is mostly lost since everything goes through `POST /graphql` (no verb/URL semantics for a CDN to key on) — response caching has to be done at the application/field level instead.

## gRPC — binary, HTTP/2, contract-first, internal default

gRPC defines service contracts in **Protocol Buffers** (protobuf) — a schema language and binary serialization format — and generates strongly-typed client/server stubs in whatever languages the services are written in, communicating over **HTTP/2** for built-in multiplexing (many concurrent requests over one TCP connection, no head-of-line blocking at the request level) and low overhead (binary framing instead of repeated text headers).

```protobuf
service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc StreamOrderUpdates(OrderSubscription) returns (stream OrderUpdate);
}
message GetOrderRequest { int64 order_id = 1; }
message Order {
  int64 id = 1;
  double total = 2;
  string status = 3;
}
```

```
Client stub (generated)          Server (generated skeleton, you implement)
   orderClient.GetOrder(req)  --protobuf over HTTP/2-->  OrderService.GetOrder(req)
   <-- Order (binary) --------------------------------------
```

**Streaming RPCs** are a first-class part of the contract, not a bolt-on — gRPC supports unary (one request, one response), server streaming (one request, a stream of responses — e.g., `StreamOrderUpdates` above), client streaming (a stream of requests, one response — e.g., uploading chunks), and full bidirectional streaming, all multiplexed over the same HTTP/2 connection.

**Why it's the internal service-to-service default** at companies like Google (where it originated, as the open-sourced version of Google's internal Stubby protocol) and Netflix: internal microservice calls happen at enormous volume between services *you control on both ends*, so the trade-offs flip relative to a public API — you want the smallest possible serialization overhead (binary protobuf vs. JSON text), the strongest possible compile-time contract (protobuf-generated types catch a mismatched field at build time, not in production), and multiplexed low-latency streaming (service meshes routing thousands of calls/sec benefit enormously from HTTP/2 connection reuse) — none of which matter as much when your client is a public web browser that can't easily consume raw binary protobuf or arbitrary HTTP/2 semantics behind corporate proxies. This is exactly why the typical shape of a large system (see `../07-architecture-patterns/microservices-architecture.md`) is REST or GraphQL at the edge, facing external clients, with gRPC carrying the calls between internal services behind the API gateway.

- Good fit: internal microservice-to-microservice calls, especially latency-sensitive or high-fanout ones; polyglot service meshes where strict, generated contracts prevent drift between teams' services; anything needing real bidirectional streaming (live telemetry, chat backends' internal fanout, video encoding pipelines).
- Costs: not natively browser-consumable (needs gRPC-Web plus a proxy translation layer to reach browsers, since browsers can't originate raw HTTP/2 trailers-based streams the way gRPC needs); binary payloads aren't human-readable/debuggable with just curl and your eyes the way JSON is; schema changes require regenerating and redistributing stubs across every consuming service, which is a coordination cost REST/GraphQL's looser contracts don't have.

## Comparison table

| | REST | GraphQL | gRPC |
|---|---|---|---|
| Endpoint shape | Many resource URLs + HTTP verbs | Single endpoint, client-specified query | Many typed RPC methods, code-generated stubs |
| Serialization | Usually JSON (text) | Usually JSON (text) | Protobuf (binary) |
| Transport | HTTP/1.1 or HTTP/2 | HTTP/1.1 or HTTP/2 (transport-agnostic in spec) | HTTP/2 required |
| Over/under-fetching | Common problem | Solved by design | N/A (fixed, purpose-built messages per call) |
| Browser-native | Yes | Yes (just HTTP POST) | No (needs gRPC-Web + proxy) |
| HTTP-level caching (CDN, browser) | Excellent (verbs + headers) | Poor (single POST endpoint) | Poor (binary, not cache-key-friendly) |
| Contract strictness | Loose (OpenAPI optional, not enforced) | Strong (schema enforced at query time) | Strongest (protobuf, compile-time generated types) |
| Streaming | Not native (needs SSE/WebSockets alongside) | Subscriptions exist but bolt-on | First-class (unary/server/client/bidi streaming) |
| Typical audience | Public APIs, web clients | Frontend teams, mobile apps with diverse screens | Internal service-to-service (Google, Netflix internally) |

## Common interview follow-ups

**Q: Why don't companies just use gRPC everywhere, since it's the fastest and most strictly typed?**
Because its strengths (binary payloads, HTTP/2-only, generated stubs) are exactly what makes it a poor fit for public clients: browsers can't natively speak it, it's not human-debuggable over curl, and every schema change requires redistributing generated code to every consumer — fine when you control both ends inside one organization's service mesh, painful when your consumers are third-party developers or a web frontend team shipping independently.

**Q: How does GraphQL's single endpoint break traditional HTTP caching, and how do teams work around it?**
Since every query goes through `POST /graphql`, there's no stable URL or verb for a CDN to key a cache entry on the way it can with `GET /users/42`; workarounds include persisted queries (mapping a query to a stable hash/ID so it *can* be treated like a cacheable GET), field-level caching inside resolvers (often backed by the same Redis patterns in `../04-caching/caching-strategies.md`), or automatic persisted queries plus a CDN rule keyed on the query hash.

**Q: Walk through why the N+1 problem happens and how DataLoader fixes it without changing the GraphQL query itself.**
GraphQL resolves a query field-by-field, so a nested list field like `orders` gets its own resolver invocation per parent object — with 50 users, that resolver naively runs 50 times, once per user, each issuing its own DB query; DataLoader intercepts each individual `load(id)` call, waits until the current execution tick finishes collecting all of them, then fires one batched query for the whole set and hands each caller its slice of the result — no change to the GraphQL schema or query is needed, only to how the resolver fetches data.

**Q: If gRPC is internal and REST/GraphQL are external, how does a request from a browser actually reach a gRPC-based backend service?**
Through an API gateway or edge proxy (see `../10-system-design-practice/api-gateway.md`) that terminates the public REST/GraphQL request, then translates it into one or more internal gRPC calls to the appropriate microservices — the browser never speaks gRPC directly; the gateway is the seam where the public contract (REST/GraphQL) meets the internal one (gRPC).

**Q: What's a concrete reason to pick REST over GraphQL for a simple public API?**
If the API is small, resource shapes are stable, and you want to lean on free infrastructure — CDN caching of `GET` responses, HTTP status codes for error semantics, straightforward rate limiting per endpoint — REST gets you all of that for free from existing HTTP tooling, whereas GraphQL's single endpoint and query flexibility mostly pay off once you have many different client screens with genuinely divergent data needs; for a handful of well-known resources, that flexibility is often not worth the added operational complexity (query cost limiting, persisted queries, resolver N+1 diligence).

**Q: How do streaming RPCs in gRPC compare to WebSockets for a real-time use case?**
Both provide a persistent bidirectional channel, but gRPC streaming is contract-first (protobuf-defined message types flowing in a typed stream) and lives inside a service-mesh/internal context, whereas WebSockets are the browser-facing, untyped-by-default choice — a chat backend might use gRPC bidi streaming between its own internal chat and presence services, while still exposing WebSockets at the edge for the actual browser/mobile client connection; see `websockets-vs-sse-vs-long-polling.md` for the client-facing side of that split.

## Related topics
- [WebSockets vs SSE vs Long Polling](websockets-vs-sse-vs-long-polling.md)
- [Load Balancing](../01-scaling-traffic/load-balancing.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
- [Microservices Architecture](../07-architecture-patterns/microservices-architecture.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [API Gateway](../10-system-design-practice/api-gateway.md)
- [Caching Strategies](../04-caching/caching-strategies.md)
