# Node.js Backend Interview — Deep Dive

Use these 100 questions to practice explaining backend behavior, design choices, and failure handling. Examples use Node.js and common backend tools; implementation details depend on the versions and application setup you use.

---

## Start Here

Treat this as a reference you can revisit. Pick three related questions, explain each aloud before reading, then compare your answer with the examples.

| Focus | Suggested questions |
| --- | --- |
| Application foundations | [Event loop](#13-nodejs-event-loop-phases), [error handling](#49-error-handling-patterns-in-nodejs), [middleware](#50-middleware-architecture-in-express) |
| API development | [REST design](#82-rest-api-design-best-practices), [validation](#86-schema-validation), [pagination](#22-pagination--offset-vs-cursor) |
| Storage and caching | [Indexes](#11-database-indexing-strategy), [Redis caching](#2-caching-with-redis), [replication](#16-database-replication) |
| Reliable background work | [Queues](#1-message-queues--reliability), [outbox](#20-outbox-pattern), [consumer idempotency](#85-idempotency-in-event-consumers) |
| Operating services | [Observability](#96-observability--the-three-pillars), [service objectives](#68-slo-sli-sla--error-budgets), [load testing](#88-load-testing) |
| Putting it together | [Architecture choices](#83-microservices-vs-monolith-vs-modular-monolith), [URL shortener](#100-system-design-url-shortener) |

## How to Build an Answer

1. **Define the idea.** Explain it in one or two plain-language sentences.
2. **Describe the flow.** Follow a request, message, or data item through the system.
3. **Test a failure case.** Consider a timeout, duplicate, concurrent update, or unavailable dependency.
4. **Explain the trade-off.** State what the approach improves and what it costs.

Code blocks are learning examples, sometimes abbreviated. A short snippet does not include every dependency, security control, concurrency guarantee, or recovery step. Read the related module when you need more context.

**Common abbreviations:** TTL = time to live; DLQ = dead letter queue; CQRS = command query responsibility segregation; SSE = server-sent events; JWT = JSON Web Token. Reliability terms such as SLI and SLO are explained in [question 68](#68-slo-sli-sla--error-budgets).

## Table of Contents

1. [Message Queues & Reliability](#1-message-queues--reliability)
2. [Caching with Redis](#2-caching-with-redis)
3. [Microservices Communication](#3-microservices-communication)
4. [API Gateway](#4-api-gateway)
5. [Service Failures & Resilience](#5-service-failures--resilience)
6. [Containers & Auto-Restart in Production](#6-containers--auto-restart-in-production)
7. [Secure API Design](#7-secure-api-design)
8. [Scaling WebSockets](#8-scaling-websockets)
9. [JWT Invalidation on Logout](#9-jwt-invalidation-on-logout)
10. [Socket.IO — Rooms & Namespaces](#10-socketio--rooms--namespaces)
11. [Database Indexing Strategy](#11-database-indexing-strategy)
12. [TTL Indexes & Expiry Handling](#12-ttl-indexes--expiry-handling)
13. [Node.js Event Loop Phases](#13-nodejs-event-loop-phases)
14. [Message Queue vs Redis Pub/Sub](#14-message-queue-vs-redis-pubsub)
15. [Horizontal vs Vertical Scaling](#15-horizontal-vs-vertical-scaling)
16. [Database Replication](#16-database-replication)
17. [Database Sharding & Partitioning](#17-database-sharding--partitioning)
18. [CQRS Pattern](#18-cqrs-pattern)
19. [Saga Pattern — Distributed Transactions](#19-saga-pattern--distributed-transactions)
20. [Outbox Pattern](#20-outbox-pattern)
21. [Idempotency in APIs](#21-idempotency-in-apis)
22. [Pagination — Offset vs Cursor](#22-pagination--offset-vs-cursor)
23. [Long Polling vs SSE vs WebSockets](#23-long-polling-vs-sse-vs-websockets)
24. [Worker Threads vs Cluster in Node.js](#24-worker-threads-vs-cluster-in-nodejs)
25. [Memory Leaks in Node.js](#25-memory-leaks-in-nodejs)
26. [Background Jobs with BullMQ](#26-background-jobs-with-bullmq)
27. [Consistent Hashing](#27-consistent-hashing)
28. [Service Discovery](#28-service-discovery)
29. [API Versioning Strategies](#29-api-versioning-strategies)
30. [Structured Logging & Correlation IDs](#30-structured-logging--correlation-ids)
31. [gRPC vs REST vs GraphQL](#31-grpc-vs-rest-vs-graphql)
32. [Load Balancing Algorithms](#32-load-balancing-algorithms)
33. [Database Connection Pooling](#33-database-connection-pooling)
34. [Rate Limiting Algorithms](#34-rate-limiting-algorithms)
35. [Bonus — Topics Interviewers Also Expect](#35-bonus--topics-interviewers-also-expect)
36. [Database Transaction Isolation Levels](#36-database-transaction-isolation-levels)
37. [Optimistic vs Pessimistic Locking](#37-optimistic-vs-pessimistic-locking)
38. [Race Conditions & Concurrency Control](#38-race-conditions--concurrency-control)
39. [Distributed Locks with Redis](#39-distributed-locks-with-redis)
40. [Event Sourcing](#40-event-sourcing)
41. [Two-Phase Commit (2PC)](#41-two-phase-commit-2pc)
42. [Cache Stampede & Thundering Herd](#42-cache-stampede--thundering-herd)
43. [SQL vs NoSQL — When to Choose](#43-sql-vs-nosql--when-to-choose)
44. [Normalization vs Denormalization](#44-normalization-vs-denormalization)
45. [Database Query Optimization](#45-database-query-optimization)
46. [Zero-Downtime Database Migrations](#46-zero-downtime-database-migrations)
47. [MongoDB Aggregation Pipeline](#47-mongodb-aggregation-pipeline)
48. [Node.js Streams & Backpressure](#48-nodejs-streams--backpressure)
49. [Error Handling Patterns in Node.js](#49-error-handling-patterns-in-nodejs)
50. [Middleware Architecture in Express](#50-middleware-architecture-in-express)
51. [Dependency Injection in Node.js](#51-dependency-injection-in-nodejs)
52. [Repository Pattern](#52-repository-pattern)
53. [OAuth 2.0 & OpenID Connect](#53-oauth-20--openid-connect)
54. [RBAC vs ABAC](#54-rbac-vs-abac)
55. [CORS — How It Works](#55-cors--how-it-works)
56. [File Uploads with Presigned URLs](#56-file-uploads-with-presigned-urls)
57. [Webhook Design Best Practices](#57-webhook-design-best-practices)
58. [HTTP/2 vs HTTP/3](#58-http2-vs-http3)
59. [SSL/TLS & HTTPS Internals](#59-ssltls--https-internals)
60. [Content Delivery Networks (CDN)](#60-content-delivery-networks-cdn)
61. [Compression (gzip, Brotli)](#61-compression-gzip-brotli)
62. [Blue-Green vs Canary Deployment](#62-blue-green-vs-canary-deployment)
63. [Zero-Downtime Deployments](#63-zero-downtime-deployments)
64. [Kubernetes HPA & Auto-Scaling](#64-kubernetes-hpa--auto-scaling)
65. [Secrets Management](#65-secrets-management)
66. [Container Security](#66-container-security)
67. [Monitoring & Alerting](#67-monitoring--alerting)
68. [SLO, SLI, SLA & Error Budgets](#68-slo-sli-sla--error-budgets)
69. [Chaos Engineering](#69-chaos-engineering)
70. [Database Backup & Recovery](#70-database-backup--recovery)
71. [Data Encryption at Rest & in Transit](#71-data-encryption-at-rest--in-transit)
72. [Multitenancy Patterns](#72-multitenancy-patterns)
73. [Feature Flags](#73-feature-flags)
74. [Soft Delete Patterns](#74-soft-delete-patterns)
75. [Bulk Operations & Batch Processing](#75-bulk-operations--batch-processing)
76. [GraphQL N+1 Problem & DataLoader](#76-graphql-n1-problem--dataloader)
77. [Serverless Architecture](#77-serverless-architecture)
78. [RabbitMQ Exchange Types](#78-rabbitmq-exchange-types)
79. [Redis Data Structures Deep Dive](#79-redis-data-structures-deep-dive)
80. [Node.js Performance Profiling](#80-nodejs-performance-profiling)
81. [Database Deadlocks](#81-database-deadlocks)
82. [REST API Design Best Practices](#82-rest-api-design-best-practices)
83. [Microservices vs Monolith vs Modular Monolith](#83-microservices-vs-monolith-vs-modular-monolith)
84. [Service Mesh](#84-service-mesh)
85. [Idempotency in Event Consumers](#85-idempotency-in-event-consumers)
86. [Schema Validation](#86-schema-validation)
87. [Backend Testing Strategies](#87-backend-testing-strategies)
88. [Load Testing](#88-load-testing)
89. [Security Headers](#89-security-headers)
90. [SQL Injection Prevention](#90-sql-injection-prevention)
91. [NoSQL Injection Prevention](#91-nosql-injection-prevention)
92. [Dependency Security & Supply Chain](#92-dependency-security--supply-chain)
93. [Twelve-Factor App Principles](#93-twelve-factor-app-principles)
94. [gRPC Streaming Patterns](#94-grpc-streaming-patterns)
95. [Data Serialization Formats](#95-data-serialization-formats)
96. [Observability — The Three Pillars](#96-observability--the-three-pillars)
97. [Event-Driven Architecture Patterns](#97-event-driven-architecture-patterns)
98. [Node.js Cluster with PM2](#98-nodejs-cluster-with-pm2)
99. [API Gateway Advanced Patterns](#99-api-gateway-advanced-patterns)
100. [System Design: URL Shortener](#100-system-design-url-shortener)

---

## 1. Message Queues & Reliability

### What happens if your RabbitMQ consumer crashes before processing a message?

With manual acknowledgments enabled, if a consumer crashes **after** receiving a message but **before** acknowledging it, RabbitMQ will **re-queue** the message and deliver it to another available consumer.

**How acknowledgments work:**

```text
Producer → Queue → Consumer (receives msg)
                        ↓
                   [processes msg]
                        ↓
                   ack() → RabbitMQ removes the message
```

If the consumer crashes before calling `ack()`, RabbitMQ marks the message as unacknowledged and redelivers it.

**Key patterns:**

| Pattern | Description |
|---|---|
| `ack` | Message processed successfully, remove from queue |
| `nack` (requeue: true) | Processing failed, put it back in the queue |
| `nack` (requeue: false) | Processing failed, discard or send to DLQ |

**Dead Letter Queue (DLQ):**

A DLQ catches messages that:

- Were rejected with `requeue: false`
- Exceeded the max retry count
- Expired (TTL)

```text
Queue → Consumer crashes → nack → Dead Letter Exchange → DLQ
```

**Best practices:**

- Always use manual `ack`, never auto-ack in production
- Set a retry limit to avoid infinite redelivery loops
- Use a DLQ to inspect and replay failed messages
- Make consumers **idempotent** — safe to process the same message twice

---

## 2. Caching with Redis

### How do you handle cache invalidation in Redis when data updates?

"Use Redis" is not an answer. The real answer is *which caching pattern* and *when to invalidate*.

---

### Cache-Aside (Lazy Loading) — Most Common

```text
Read:
  1. Check Redis
  2. Cache HIT → return data
  3. Cache MISS → query DB → store in Redis → return data

Write:
  1. Update DB
  2. Delete (invalidate) the Redis key
```

```js
async function getUser(id) {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);

  const user = await db.users.findById(id);
  await redis.setex(`user:${id}`, 3600, JSON.stringify(user)); // TTL: 1h
  return user;
}

async function updateUser(id, data) {
  await db.users.update(id, data);
  await redis.del(`user:${id}`); // invalidate
}
```

---

### Write-Through

Write to DB and cache **at the same time**. Cache is always fresh, but every write hits both.

```text
Write → DB + Redis (simultaneously)
Read  → always from Redis
```

**Trade-off:** Higher write latency, but reads are always fast and consistent.

---

### Write-Behind (Write-Back)

Write to Redis first, then sync to DB **asynchronously**.

```text
Write → Redis (immediate) → DB (async, batched)
```

**Trade-off:** Very fast writes, but risk of data loss if Redis crashes before the DB sync.

---

### TTL-based Invalidation

Set an expiry on the key. Cache becomes stale after TTL, then refreshes on next miss.

```js
await redis.setex(`product:${id}`, 300, JSON.stringify(product)); // expires in 5 min
```

**When to use TTL:** For data that is "good enough" slightly stale (e.g., product listings, leaderboards).

---

### Cache Invalidation Strategies Summary

| Strategy | When to Use | Trade-off |
|---|---|---|
| Delete on write | Strong consistency needed | Extra DB load on cache miss |
| TTL | Eventual consistency OK | Stale data within TTL window |
| Write-through | Read-heavy, consistency needed | Write overhead |
| Write-behind | Write-heavy, some data loss OK | Risk of inconsistency |

---

## 3. Microservices Communication

### How do microservices communicate reliably with each other?

There are two fundamental models:

---

### Synchronous (Request/Response)

Services call each other and **wait for a response**.

- **REST (HTTP)** — universal, human-readable, stateless
- **gRPC** — binary (Protocol Buffers), fast, strongly typed, great for internal services

```text
Service A ──HTTP/gRPC──► Service B
           ◄─────────────
```

**Problem:** If Service B is slow, Service A is blocked. If B is down, A fails.

---

### Asynchronous (Event-Driven)

Services communicate through a **message broker** (RabbitMQ, Kafka). They don't wait.

```text
Service A ──publish──► Broker ──consume──► Service B
```

**Benefits:**

- Decoupled: A doesn't care if B is down
- Durable: messages persist until consumed
- Scalable: multiple consumers can process in parallel

---

### Comparison

| | Sync (REST/gRPC) | Async (Queue/Events) |
|---|---|---|
| Coupling | Tight | Loose |
| Latency | Immediate response | Eventual |
| Failure impact | Cascades | Isolated |
| Complexity | Simple | Higher (broker infra) |
| Use case | Auth checks, reads | Notifications, workflows |

**Rule of thumb:** Use sync for things that need an immediate answer. Use async for everything else.

---

## 4. API Gateway

### What exactly does an API Gateway solve in a system?

Without an API Gateway, every client would need to know the address of every microservice. The gateway is a **single entry point** for all client requests.

```text
Client
  │
  ▼
API Gateway
  ├──► Auth Service
  ├──► User Service
  ├──► Order Service
  └──► Product Service
```

**What it handles:**

| Responsibility | Description |
|---|---|
| **Routing** | Forward requests to the correct service |
| **Authentication** | Verify JWT/API key before reaching services |
| **Rate Limiting** | Protect services from abuse/overload |
| **Load Balancing** | Distribute traffic across service instances |
| **SSL Termination** | Handle HTTPS at the gateway, internal traffic can be HTTP |
| **Request Aggregation** | Combine multiple service calls into one response |
| **Logging & Tracing** | Centralized observability |
| **Caching** | Cache frequent responses at the edge |

**Popular tools:** Kong, Nginx, AWS API Gateway, Traefik, Express Gateway.

---

## 5. Service Failures & Resilience

### What will you do if Service A calls Service B and Service B is down?

Never let one service failure cascade into a full system outage.

---

### Circuit Breaker Pattern

Like an electrical circuit breaker — it "opens" (stops requests) when failures exceed a threshold, giving Service B time to recover.

```text
States:
  CLOSED  → requests flow normally
  OPEN    → requests fail immediately (no calls to B)
  HALF-OPEN → allow one test request → if success, CLOSE; if fail, OPEN again
```

```js
// Using opossum (Node.js circuit breaker library)
const CircuitBreaker = require('opossum');
const breaker = new CircuitBreaker(callServiceB, {
  timeout: 3000,        // fail if takes > 3s
  errorThresholdPercentage: 50, // open after 50% failure rate
  resetTimeout: 10000   // try again after 10s
});
```

---

### Retry with Exponential Backoff

Retry failed requests, but wait longer between each attempt.

```text
Attempt 1 → fail → wait 1s
Attempt 2 → fail → wait 2s
Attempt 3 → fail → wait 4s → give up
```

**Always add jitter** (random offset) to prevent all instances retrying at the same time (thundering herd).

---

### Fallback

Define what to do when the service is unavailable.

```js
breaker.fallback(() => {
  return getCachedData() || { error: 'Service temporarily unavailable' };
});
```

---

### Timeout

Never wait forever. Set a hard timeout on every outbound call.

---

### Bulkhead

Isolate failures by limiting concurrent requests to each service. Like watertight compartments on a ship.

---

### Summary

| Pattern | Purpose |
|---|---|
| Circuit Breaker | Stop calling a failing service |
| Retry + Backoff | Handle transient failures |
| Timeout | Don't wait forever |
| Fallback | Serve degraded response |
| Bulkhead | Limit blast radius of failure |

---

## 6. Containers & Auto-Restart in Production

### How do you ensure containers/pods automatically restart in production?

---

### Docker — Restart Policies

```bash
docker run --restart=always my-service
```

| Policy | Behavior |
|---|---|
| `no` | Never restart (default) |
| `always` | Always restart, even after `docker stop` + daemon restart |
| `unless-stopped` | Always restart unless manually stopped |
| `on-failure[:n]` | Restart only on non-zero exit, max `n` times |

---

### Kubernetes — Restart & Health Checks

Kubernetes restarts pods automatically when they crash. But the smarter approach is **health probes**:

**Liveness Probe** — "Is this container alive? Should it be restarted?"

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 15
  failureThreshold: 3
```

**Readiness Probe** — "Is this container ready to receive traffic?"

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
```

**Key difference:**

- Liveness failure → restart the pod
- Readiness failure → remove from load balancer, don't send traffic (but don't restart)

**Restart Policy** (always the default for Deployments):

```yaml
spec:
  restartPolicy: Always
```

**Crash loop protection:** Kubernetes uses exponential backoff (10s → 20s → 40s...) to avoid rapid restart loops (CrashLoopBackOff).

---

## 7. Secure API Design

### How do you design secure APIs?

Security is layered. Each layer stops a different class of attack.

---

### Authentication & Authorization

- **JWT (Stateless):** Token signed with a secret, verified on every request. No DB lookup needed.
- **OAuth 2.0 / OpenID Connect:** For third-party or user-facing auth (Google login, etc.)
- **API Keys:** For machine-to-machine communication.
- **RBAC (Role-Based Access Control):** Gate resources by role, not just "is logged in."

```js
// Middleware pattern
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
```

---

### Rate Limiting

Prevent brute force, DDoS, and API abuse.

```js
const rateLimit = require('express-rate-limit');
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  message: 'Too many requests'
}));
```

**Algorithms:**

- **Fixed Window** — simple, but can burst at boundary
- **Sliding Window** — smoother, more accurate
- **Token Bucket** — allows bursts up to a limit
- **Leaky Bucket** — constant outflow rate, queues excess

---

### Input Validation & Sanitization

Never trust user input. Validate schema, sanitize values.

```js
// Using Joi or Zod
const schema = Joi.object({
  email: Joi.string().email().required(),
  age: Joi.number().min(0).max(120)
});
```

Protect against:

- **SQL Injection** → use parameterized queries / ORM
- **NoSQL Injection** → sanitize MongoDB operators (`$where`, `$gt`)
- **XSS** → escape HTML output, use `helmet`

---

### Transport & Headers

```js
const helmet = require('helmet');
app.use(helmet()); // sets security-related HTTP headers
```

- Always use **HTTPS**
- Set `Strict-Transport-Security`, `X-Content-Type-Options`, `Content-Security-Policy`
- Use **CORS** properly — whitelist origins, don't use `*` in production

---

### Secrets Management

- Never hardcode secrets — use environment variables or a secrets manager (Vault, AWS Secrets Manager)
- Rotate secrets regularly
- Never log tokens or passwords

---

## 8. Scaling WebSockets

### How do you scale WebSocket connections across multiple servers?

WebSockets are **stateful** — the client is pinned to one server. This breaks horizontal scaling.

---

### The Problem

```text
Client A connects to Server 1
Client B connects to Server 2

Client A sends message to Client B
→ Server 1 doesn't know about Client B's socket on Server 2
→ Message never delivered
```

---

### Solution 1: Sticky Sessions (Partial Fix)

Route the same client to the same server using load balancer session affinity. But this doesn't solve cross-server messaging and creates uneven load.

---

### Solution 2: Redis Pub/Sub (Recommended)

Each server subscribes to a shared Redis channel. When a message arrives, it's broadcast to all servers.

```text
Client A → Server 1 → Redis PUBLISH "room:xyz" msg
                              ↓
                    Server 2 SUBSCRIBE → delivers to Client B
```

**Socket.IO with Redis Adapter:**

```js
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

Now Socket.IO automatically handles cross-server room broadcasts.

---

### Solution 3: Dedicated WebSocket Service

Separate WebSocket handling into its own service. Other services emit events to this service via a message queue. This service manages all socket connections.

---

### Scaling Summary

| Approach | Pros | Cons |
|---|---|---|
| Sticky sessions | Simple | Uneven load, no cross-server |
| Redis Pub/Sub | Works well, widely used | Redis becomes a bottleneck |
| Dedicated WS service | Clean separation | More infra complexity |

---

## 9. JWT Invalidation on Logout

### How do you invalidate JWT tokens on logout?

JWTs are **stateless** — the server doesn't store them, so you can't "delete" one. This is the core problem.

---

### Option 1: Token Blacklist in Redis (Most Common)

On logout, store the token (or its `jti` claim) in Redis with the same TTL as the token's expiry.

```js
// Logout
async function logout(req) {
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.decode(token);
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  await redis.setex(`blacklist:${decoded.jti}`, ttl, '1');
}

// Auth middleware
async function authenticate(req, res, next) {
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const isBlacklisted = await redis.get(`blacklist:${decoded.jti}`);
  if (isBlacklisted) return res.status(401).json({ error: 'Token revoked' });

  req.user = decoded;
  next();
}
```

**Trade-off:** You now have a Redis lookup on every request — but it's fast (sub-millisecond).

---

### Option 2: Short-Lived Access Tokens + Refresh Tokens

- Access token TTL: 15 minutes (short enough that logout is "eventual")
- Refresh token: stored in DB, can be deleted on logout
- On logout: delete the refresh token — new access tokens can't be issued

```text
Login    → issue access_token (15m) + refresh_token (7d, stored in DB)
Request  → use access_token
Refresh  → exchange refresh_token for new access_token
Logout   → delete refresh_token from DB
```

**Trade-off:** Access token is still valid for up to 15 minutes after logout. Acceptable for most apps.

---

### Option 3: Version Counter per User

Store a `tokenVersion` in the user record. Embed it in the JWT. On logout (or "logout all devices"), increment `tokenVersion`. Tokens with old version are rejected.

```js
// Generate token
const token = jwt.sign({ userId, tokenVersion: user.tokenVersion }, secret);

// Verify token
const user = await db.users.findById(decoded.userId);
if (decoded.tokenVersion !== user.tokenVersion) {
  return res.status(401).json({ error: 'Token invalidated' });
}
```

**Trade-off:** Requires a DB lookup per request, but supports "logout all devices."

---

### Comparison

| Approach | Logout Speed | DB Lookup | "Logout All" |
|---|---|---|---|
| Redis blacklist | Immediate | Redis only | Per-token |
| Short-lived + refresh | ~15 min delay | DB (refresh only) | Yes (delete all refresh) |
| Version counter | Immediate | DB always | Yes |

---

## 10. Socket.IO — Rooms & Namespaces

### What are rooms and namespaces in sockets, and when would you use them?

---

### Namespaces — Logical Separation of Connections

A namespace is like a **separate channel on the same server**. Clients connect to a specific namespace.

```js
// Server
const chatNS = io.of('/chat');
const adminNS = io.of('/admin');

chatNS.on('connection', (socket) => { /* chat logic */ });
adminNS.on('connection', (socket) => { /* admin logic */ });
```

```js
// Client
const chatSocket = io('/chat');
const adminSocket = io('/admin');
```

**Use namespaces when:** You want feature-level separation (chat, notifications, admin panel) that share the same server but have independent logic and middleware.

---

### Rooms — Dynamic Groups Within a Namespace

A room is a **server-side group** that sockets can join/leave. Clients are unaware of room details.

```js
// Server
socket.join('room:game-42');

// Emit to everyone in the room
io.to('room:game-42').emit('gameUpdate', data);

// Emit to room except sender
socket.to('room:game-42').emit('playerMoved', data);

// Leave
socket.leave('room:game-42');
```

**Use rooms when:** You want to group connections dynamically — chat rooms, game lobbies, notification groups, live document collaboration.

---

### Visual Comparison

```text
Namespace: /chat
  ├── Room: room:general    ← socket A, socket B
  ├── Room: room:random     ← socket C
  └── Room: room:tech       ← socket A, socket D

Namespace: /admin
  └── Room: room:dashboard  ← socket E (admin only)
```

| | Namespace | Room |
|---|---|---|
| Created by | Server config | Server dynamically |
| Client awareness | Yes (client connects to it) | No (server-managed) |
| Isolation | Full (own event emitters) | Shared within namespace |
| Use case | Feature separation | Dynamic grouping |

---

[Back to question list](#table-of-contents)

## 11. Database Indexing Strategy

### How do you decide indexing strategy based on different query patterns?

An index speeds up reads but slows down writes. The key is to **index what you query**, not everything.

---

### Index Types (MongoDB-focused, concepts apply broadly)

**Single Field Index**

```js
db.users.createIndex({ email: 1 });
```
Use when you frequently query by one field.

**Compound Index**

```js
db.orders.createIndex({ userId: 1, createdAt: -1 });
```
Use for queries that filter on multiple fields. **Order matters** — matches queries that use the leftmost fields (prefix rule).

**Text Index**

```js
db.products.createIndex({ name: 'text', description: 'text' });
```
Use for full-text search.

**Partial Index**

```js
db.orders.createIndex(
  { createdAt: 1 },
  { partialFilterExpression: { status: 'active' } }
);
```
Only indexes documents that match the filter. Smaller, faster for specific query patterns.

**Sparse Index**

```js
db.users.createIndex({ phoneNumber: 1 }, { sparse: true });
```
Only indexes documents where the field exists. Useful for optional fields.

---

### How to Decide

1. **Look at your queries** — what fields appear in `WHERE`, `ORDER BY`, `GROUP BY`?
2. **Cardinality** — index high-cardinality fields (email, userId) over low-cardinality (boolean, status with 2 values)
3. **Read/write ratio** — high read? More indexes. High write? Fewer indexes (each index slows inserts/updates)
4. **Use `EXPLAIN`** — check if your query is doing a full collection scan (`COLLSCAN`) or using an index (`IXSCAN`)

```js
db.users.find({ email: 'test@example.com' }).explain('executionStats');
```

---

### Common Pitfalls

| Mistake | Fix |
|---|---|
| Indexing every field | Only index what you query |
| Wrong compound index order | Put equality fields first, range fields last |
| Ignoring write overhead | Balance index count with write frequency |
| Index not used | Check `explain()` — query may not match index prefix |

---

## 12. TTL Indexes & Expiry Handling

### If multiple TTL indexes or expirations are involved, how do you handle incoming user requests?

---

### MongoDB TTL Indexes

TTL (Time-To-Live) indexes automatically delete documents after a specified time.

```js
// Delete documents 1 hour after createdAt
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });
```

MongoDB's background thread runs **every 60 seconds** to clean expired documents. Documents are not deleted at the exact second — there can be up to ~60 seconds of lag.

---

### The Problem: Requests During the Expiry Window

A session may appear in the DB but be logically expired. If your app only relies on MongoDB TTL deletion, you'll serve stale data during that 60-second gap.

**Solution:** Always check the expiry field in your application logic, don't rely solely on TTL deletion.

```js
async function getSession(id) {
  const session = await db.sessions.findOne({ _id: id });
  if (!session) return null;

  // Application-level check — don't trust TTL timing
  if (new Date() > session.expiresAt) {
    await db.sessions.deleteOne({ _id: id });
    return null;
  }

  return session;
}
```

---

### Handling Multiple Expiry Rules

When multiple TTL indexes or expiry sources exist (e.g., session TTL + token TTL + cache TTL):

1. **Single source of truth** — store `expiresAt` as an explicit field, check it in code
2. **Consistent TTL logic** — centralize expiry checks in a service layer, not scattered across routes
3. **Redis for short-lived data** — use Redis with `SETEX` for sub-minute precision; MongoDB TTL for long-lived document cleanup
4. **Background jobs** — for complex expiry logic, use a cron job (Bull, Agenda) to process expirations with retry logic

```text
User request → App checks expiresAt in document → expired? → reject + cleanup
                                               → valid? → serve
MongoDB TTL → runs every ~60s → deletes expired docs (cleanup pass)
```

---

## 13. Node.js Event Loop Phases

### Can you explain the event loop phases in Node.js and how they impact execution?

The event loop is what makes Node.js non-blocking. It processes different types of async operations in a specific order.

---

### The 6 Phases

```text
   ┌───────────────────────────┐
┌─►│         timers            │ ← setTimeout, setInterval callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │     pending callbacks     │ ← I/O errors from previous tick
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │     idle, prepare         │ ← internal use only
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │         poll              │ ← retrieve new I/O events (fs, network)
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │         check             │ ← setImmediate callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
└──│      close callbacks      │ ← socket.on('close', ...) etc.
   └───────────────────────────┘
```

**Between each phase:** `process.nextTick()` and Promises (microtasks) run first, before moving to the next phase.

---

### Priority Order (Highest to Lowest)

```text
process.nextTick()   ← runs after current operation, before any I/O
Promise callbacks    ← microtask queue
setImmediate()       ← check phase (after poll)
setTimeout(fn, 0)    ← timers phase (not guaranteed to be 0ms)
```

---

### Practical Example

```js
console.log('1 - sync');

setTimeout(() => console.log('2 - setTimeout'), 0);

Promise.resolve().then(() => console.log('3 - promise'));

process.nextTick(() => console.log('4 - nextTick'));

setImmediate(() => console.log('5 - setImmediate'));

console.log('6 - sync');
```

**Output:**

```text
1 - sync
6 - sync
4 - nextTick       ← microtask: runs first
3 - promise        ← microtask: runs second
2 - setTimeout     ← timers phase
5 - setImmediate   ← check phase
```

---

### Why This Matters in Production

- **Blocking the event loop** (CPU-heavy sync code) starves all I/O — use `worker_threads` for CPU work
- **`process.nextTick` abuse** — stacking too many can starve I/O indefinitely
- **`setImmediate` vs `setTimeout(fn, 0)`** — inside an I/O callback, `setImmediate` always fires first; outside, order is non-deterministic

---

## 14. Message Queue vs Redis Pub/Sub

### How is a message queue (like RabbitMQ/Kafka) different from Redis Pub/Sub?

| Feature | Message Queue (RabbitMQ/Kafka) | Redis Pub/Sub |
|---|---|---|
| **Persistence** | Yes — messages stored on disk | No — if no subscriber, message is lost |
| **Delivery guarantee** | At-least-once / exactly-once | At-most-once (fire and forget) |
| **Consumer groups** | Yes — multiple consumers share load | No — all subscribers get all messages |
| **Replay** | Kafka: yes. RabbitMQ: via DLQ | No |
| **Backpressure** | Handled by queue depth | None |
| **Decoupling** | Producer/consumer fully decoupled | Tightly coupled (must be subscribed) |
| **Use case** | Reliable task processing, workflows | Real-time broadcast, live notifications |
| **Throughput** | High (Kafka: millions/s) | Very high but ephemeral |

---

### When to Use What

**Use RabbitMQ/Kafka when:**

- Order processing, payment events, email jobs
- Messages must not be lost
- Consumer might be offline temporarily
- You need retries, DLQ, or message replay

**Use Redis Pub/Sub when:**

- Live score updates, real-time dashboard metrics
- Presence indicators (online/offline)
- Cache invalidation signals across servers
- Messages can be lost without harm (subscriber was offline)

---

### Kafka vs RabbitMQ

| | Kafka | RabbitMQ |
|---|---|---|
| Model | Distributed log (pull-based) | Traditional queue (push-based) |
| Replay | Yes — consumers control offset | No (once acked, gone) |
| Order | Per partition | Per queue |
| Throughput | Extremely high | High |
| Use case | Event streaming, analytics | Task queues, microservice messaging |

---

## 15. Horizontal vs Vertical Scaling

### What is the difference between horizontal and vertical scaling, and when do you choose each?

---

### Vertical Scaling (Scale Up)

Add more power to the **same machine** — more CPU, more RAM, bigger disk.

```text
Before:  [Server: 2 CPU, 4GB RAM]
After:   [Server: 16 CPU, 64GB RAM]
```

**Pros:** Simple — no code changes, no load balancer needed.
**Cons:** Hardware has a ceiling. Single point of failure. Expensive at high specs.

---

### Horizontal Scaling (Scale Out)

Add **more machines** running the same service behind a load balancer.

```text
Before:                    After:
[Server 1]          [Load Balancer]
                    ├── [Server 1]
                    ├── [Server 2]
                    └── [Server 3]
```

**Pros:** Near-infinite scale. No single point of failure. Cheaper (commodity hardware).
**Cons:** App must be **stateless** (no in-memory session, no local file state). Needs a load balancer. More operational complexity.

---

### Making an App Horizontally Scalable

| Problem | Solution |
|---|---|
| Session state | Move sessions to Redis |
| File uploads | Store files in S3 / object storage |
| Background jobs | Use a shared queue (BullMQ, RabbitMQ) |
| WebSockets | Use Redis adapter for cross-server events |
| Scheduled tasks | Use distributed lock or single-leader election |

---

### When to Use Which

| | Vertical | Horizontal |
|---|---|---|
| Quick fix for a spike | Yes | Slower to set up |
| Long-term strategy | No ceiling hit | Yes |
| Stateful legacy app | Yes | Requires refactor |
| Cost at extreme scale | Very expensive | Economical |

**Rule of thumb:** Vertical for databases early on (simpler). Horizontal for stateless services from the start.

---

## 16. Database Replication

### How does database replication work, and why does it matter?

Replication is the process of copying data from one database server (primary) to one or more other servers (replicas/secondaries).

---

### Primary–Replica (Master–Slave)

All **writes** go to the primary. Replicas receive a copy of changes asynchronously and serve **reads**.

```text
Write  →  Primary  →  replicates async  →  Replica 1
                                        →  Replica 2

Read   →  Replica 1 or 2 (load balanced)
```

**Benefits:**

- Read throughput scales horizontally
- Replicas can be used for backups without hitting the primary
- Failover: promote a replica to primary if primary goes down

**Trade-off:** Replication lag — replicas may be slightly behind. A write followed by an immediate read from a replica might return stale data.

---

### Replication Modes

| Mode | Behavior | Trade-off |
|---|---|---|
| **Async** (default) | Primary doesn't wait for replica ack | Faster writes, possible data loss on crash |
| **Sync** | Primary waits for at least one replica to confirm | Zero data loss, slower writes |
| **Semi-sync** | Primary waits for one replica, rest are async | Balance of safety and speed |

---

### Read Your Own Writes Consistency

A common problem: user updates their profile, then immediately reads it — but gets the old value from a replica.

**Solutions:**

1. Route reads that follow writes to the primary for a short window
2. Pass a replication token — client sends the write timestamp, replica waits until it's caught up
3. Always read from primary for that user's own data

---

### MongoDB Replica Set

MongoDB uses a **3-node replica set** by default: 1 primary + 2 secondaries. If the primary fails, the secondaries hold an election and promote a new primary automatically.

```js
// Read from secondaries (read preference)
db.collection.find().readPreference('secondaryPreferred');
```

---

## 17. Database Sharding & Partitioning

### What is sharding and when would you use it?

Sharding is **horizontal partitioning** — splitting data across multiple database instances, where each instance (shard) holds a subset of the data.

```text
Without sharding:       With sharding:
[All 100M users]        [Shard A: users 0–33M]
                        [Shard B: users 33M–66M]
                        [Shard C: users 66M–100M]
```

---

### Sharding Strategies

**Range-based sharding**

```text
userId 0–1M  → Shard A
userId 1M–2M → Shard B
userId 2M+   → Shard C
```
Simple, but creates **hot spots** — most new users land on the latest shard.

**Hash-based sharding**

```text
shard = hash(userId) % numShards
```
Distributes evenly. No hot spots. But range queries span all shards.

**Directory-based sharding**
A lookup table maps each key to its shard. Flexible, but the lookup table itself becomes a bottleneck.

---

### The Challenges of Sharding

| Challenge | Problem |
|---|---|
| Cross-shard queries | `JOIN` across shards requires app-level aggregation |
| Resharding | Adding a shard means moving data — very disruptive |
| Transactions | Distributed transactions across shards are complex |
| Hot keys | One shard gets most traffic (e.g., a viral user) |

**Don't shard prematurely.** Start with replication + vertical scaling. Shard only when a single node can't handle the data volume or write throughput.

---

### Vertical Partitioning (Column-level Split)

Different columns of a table go into different tables/stores:

```text
users table (frequently queried):  id, email, name
user_profile (rarely queried):     id, bio, avatar, preferences
```

Useful when some columns are large (BLOBs) or accessed infrequently.

---

## 18. CQRS Pattern

### What is CQRS and when does it help?

**CQRS — Command Query Responsibility Segregation** — separates the model used to **write** data (Commands) from the model used to **read** data (Queries).

---

### The Problem with a Single Model

In a standard CRUD app, the same model handles both reads and writes:

```text
POST /orders   → validate, apply business logic, save to DB
GET  /orders   → complex join: orders + items + user + shipping
```

The write model is optimized for consistency and business rules. The read model is optimized for joins, aggregations, and performance. Trying to do both with one model creates friction.

---

### CQRS Architecture

```text
Client
  │
  ├── Command (write) ──► Command Handler ──► Write DB (normalized)
  │                                               │
  │                                          Event Bus
  │                                               │
  └── Query  (read)  ──► Query Handler  ◄── Read DB (denormalized / view)
```

The write DB stores normalized data with strong consistency. After a write, an event is published. A read model updater consumes the event and updates a **read-optimized store** (could be a different DB, a materialized view, or Elasticsearch).

---

### Simple Example

```js
// Command handler — write side
async function createOrder(command) {
  const order = new Order(command);
  await order.validate();
  await orderRepository.save(order);
  await eventBus.publish('order.created', order.toEvent());
}

// Query handler — read side (from pre-built view)
async function getOrderDetails(orderId) {
  return await orderReadModel.findById(orderId); // pre-joined, optimized
}
```

---

### When to Use CQRS

**Use it when:**

- Read and write workloads are very different in shape or scale
- You need separate scaling for reads vs writes
- Read models require complex aggregations that shouldn't touch the write DB

**Don't use it when:**

- Simple CRUD with no complex read requirements
- Small team / early product — the extra infrastructure overhead is not worth it

---

## 19. Saga Pattern — Distributed Transactions

### How do you handle transactions that span multiple microservices?

In a monolith, you use a database transaction. In microservices, each service has its own DB — you can't wrap them in one `BEGIN/COMMIT`. This is where the **Saga pattern** comes in.

---

### What is a Saga?

A saga is a sequence of local transactions. Each step publishes an event that triggers the next. If a step fails, compensating transactions undo previous steps.

---

### Choreography-based Saga (Event-driven)

Each service listens for events and decides what to do. No central coordinator.

```text
Order Service  →  order.created  →  Payment Service
                                         ↓
                                   payment.completed  →  Inventory Service
                                                              ↓
                                                       inventory.reserved  →  Shipping Service
```

**If payment fails:**

```text
payment.failed  →  Order Service compensates → cancels order
```

**Pros:** Loose coupling, no single point of failure.
**Cons:** Hard to track the overall flow. Debugging is painful.

---

### Orchestration-based Saga (Coordinator)

A central **Saga Orchestrator** tells each service what to do and handles failures.

```text
Orchestrator:
  1. Tell OrderService   → create order     ✅
  2. Tell PaymentService → charge card      ❌ (failed)
  3. Tell OrderService   → cancel order     ✅ (compensate)
```

**Pros:** Clear flow, centralized visibility, easier to debug.
**Cons:** Orchestrator becomes a coupling point.

---

### Compensating Transactions

These undo a completed step:

| Step | Compensating Action |
|---|---|
| Create Order | Cancel Order |
| Charge Payment | Refund Payment |
| Reserve Inventory | Release Inventory |
| Send Notification | Send Cancellation Notification |

**Key rule:** Every action in a saga must have a compensating action.

---

## 20. Outbox Pattern

### How do you ensure a database write and a message publish happen atomically?

This is a very common bug: you save to DB and then publish to a message queue — but what if the service crashes between the two?

```js
// Dangerous — not atomic
await db.orders.save(order);    // ✅ saved
// CRASH HERE
await mq.publish('order.created', order); // ❌ never published
```

The order is in the DB but the event was never sent — downstream services never know.

---

### The Outbox Pattern

Write both the data **and** the event to the database in a single transaction. A separate background process (outbox processor) reads unpublished events and publishes them.

```text
Step 1: Single DB Transaction
  INSERT INTO orders (...)
  INSERT INTO outbox (event_type='order.created', payload=..., published=false)
  COMMIT

Step 2: Outbox Processor (background job)
  SELECT * FROM outbox WHERE published = false
  → publish to message broker
  → UPDATE outbox SET published = true
```

```js
// Transaction — both writes succeed or both fail
await db.transaction(async (trx) => {
  const order = await trx('orders').insert(orderData).returning('*');
  await trx('outbox').insert({
    event_type: 'order.created',
    payload: JSON.stringify(order[0]),
    published: false,
    created_at: new Date()
  });
});
```

---

### Outbox Processor

```js
async function processOutbox() {
  const events = await db('outbox').where({ published: false }).limit(100);
  for (const event of events) {
    await mq.publish(event.event_type, JSON.parse(event.payload));
    await db('outbox').where({ id: event.id }).update({ published: true });
  }
}

// Run every few seconds
setInterval(processOutbox, 2000);
```

**Why it works:** The DB transaction guarantees both rows are written together. Even if the service crashes after the transaction, the outbox processor will pick it up on restart.

---

### Outbox vs Direct Publish

| | Direct Publish | Outbox Pattern |
|---|---|---|
| Atomicity | No (two separate systems) | Yes (single DB transaction) |
| Message loss | Possible | Prevented |
| Complexity | Low | Moderate |
| Use case | Non-critical events | Payment, orders, financial events |

---

[Back to question list](#table-of-contents)

## 21. Idempotency in APIs

### What is idempotency and how do you design idempotent APIs?

An operation is **idempotent** if doing it multiple times produces the same result as doing it once.

```text
GET /users/123        → always safe, no side effects
DELETE /users/123     → first call deletes, second call returns 404 (still idempotent — end state is the same)
POST /payments        → NOT idempotent — calling twice charges twice
```

---

### Why It Matters

Networks fail. Clients retry. If your payment API isn't idempotent, a retry after a timeout could charge the user twice.

---

### Implementing Idempotency Keys

The client sends a unique `Idempotency-Key` header. The server stores the result of the first request. If it sees the same key again, it returns the cached result without re-executing.

```js
// Client sends:
POST /payments
Idempotency-Key: "client-generated-uuid-abc123"
{ amount: 100, currency: 'USD' }

// Server middleware
async function idempotencyMiddleware(req, res, next) {
  const key = req.headers['idempotency-key'];
  if (!key) return next();

  const cached = await redis.get(`idempotency:${key}`);
  if (cached) {
    const { status, body } = JSON.parse(cached);
    return res.status(status).json(body);
  }

  // Capture the response
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    await redis.setex(
      `idempotency:${key}`,
      86400, // 24 hours
      JSON.stringify({ status: res.statusCode, body })
    );
    originalJson(body);
  };

  next();
}
```

---

### HTTP Methods & Idempotency

| Method | Idempotent? | Safe? |
|---|---|---|
| GET | Yes | Yes |
| HEAD | Yes | Yes |
| PUT | Yes | No |
| DELETE | Yes | No |
| POST | No | No |
| PATCH | No | No |

**PUT vs PATCH:** PUT replaces the entire resource (idempotent). PATCH applies partial changes (not idempotent unless designed carefully).

---

## 22. Pagination — Offset vs Cursor

### What is the difference between offset-based and cursor-based pagination, and when do you use each?

---

### Offset-based Pagination

Skip `N` rows, take `limit` rows.

```js
// Request: GET /posts?page=3&limit=10
const posts = await db.posts
  .find()
  .skip((page - 1) * limit)   // skip 20 rows
  .limit(limit);               // take 10 rows
```

**Problems:**

- **Performance degrades** — at page 1000 with limit 20, the DB scans and discards 20,000 rows
- **Inconsistent results** — if a new post is inserted between page 1 and page 2 requests, items shift and you either miss or duplicate an item

---

### Cursor-based Pagination (Keyset Pagination)

Use the last seen item's ID (or timestamp) as a cursor. The next page starts after that cursor.

```js
// First page
const posts = await db.posts
  .find({ _id: { $gt: null } })
  .sort({ _id: 1 })
  .limit(10);

// Next page — cursor is the last _id from previous page
const posts = await db.posts
  .find({ _id: { $gt: lastSeenId } })
  .sort({ _id: 1 })
  .limit(10);
```

**Response includes next cursor:**

```json
{
  "data": [...],
  "nextCursor": "64a7b3c2f4e1d5a9b8c7d6e5"
}
```

---

### Comparison

| | Offset | Cursor |
|---|---|---|
| Performance | Degrades with depth | Constant (uses index) |
| Consistency | Can skip/duplicate on insert | Stable |
| Random page access | Yes (jump to page 50) | No (sequential only) |
| Implementation | Simple | Moderate |
| Use case | Admin tables, small datasets | Infinite scroll, feeds |

**Use cursor pagination for feeds, timelines, and infinite scroll. Use offset for admin dashboards where jumping to a specific page matters.**

---

## 23. Long Polling vs SSE vs WebSockets

### How do you choose between Long Polling, Server-Sent Events, and WebSockets for real-time features?

---

### Long Polling

Client sends a request. Server **holds it open** until data is available (or timeout), then responds. Client immediately sends another request.

```text
Client → GET /events (holds open)
Server → waits... waits... data arrives → responds
Client → GET /events (immediately again)
```

**Pros:** Works everywhere, no special server needed.
**Cons:** Constant connection churn, high overhead, latency ~= polling interval.

---

### Server-Sent Events (SSE)

Server sends a **one-way stream** of events over a persistent HTTP connection. Client uses the `EventSource` API.

```js
// Server
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const interval = setInterval(() => send({ time: Date.now() }), 1000);
  req.on('close', () => clearInterval(interval));
});

// Client
const es = new EventSource('/events');
es.onmessage = (e) => console.log(JSON.parse(e.data));
```

**Pros:** Simple, built-in browser reconnect, works over standard HTTP/2.
**Cons:** One-way only (server → client). Not for bidirectional communication.

---

### WebSockets

Full-duplex, persistent TCP connection. Client and server can send messages at any time.

```js
// Server (ws library)
wss.on('connection', (ws) => {
  ws.on('message', (msg) => ws.send(`Echo: ${msg}`));
});

// Client
const ws = new WebSocket('ws://localhost:3000');
ws.onmessage = (e) => console.log(e.data);
ws.send('hello');
```

**Pros:** Bidirectional, low latency, efficient for high-frequency messages.
**Cons:** Stateful — harder to scale, load balancers need sticky sessions or Redis adapter.

---

### Decision Table

| Feature | Long Polling | SSE | WebSocket |
|---|---|---|---|
| Direction | Bidirectional (simulated) | Server → Client | Bidirectional |
| Latency | High | Low | Very low |
| Scalability | Easy | Easy | Harder |
| HTTP/2 support | Yes | Yes | No (separate protocol) |
| Auto-reconnect | Manual | Built-in | Manual |
| Use case | Legacy fallback | Notifications, feeds | Chat, games, collaboration |

---

## 24. Worker Threads vs Cluster in Node.js

### When do you use Worker Threads vs Cluster in Node.js?

Node.js is single-threaded. For CPU-heavy work or utilizing multi-core CPUs, you have two options.

---

### Cluster Module

Spawns **multiple Node.js processes**, each with its own event loop and memory. All processes share the same port — the OS load balances incoming connections.

```js
const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
  const cpus = os.cpus().length;
  for (let i = 0; i < cpus; i++) {
    cluster.fork(); // spawn one worker per CPU core
  }
  cluster.on('exit', (worker) => {
    cluster.fork(); // respawn on crash
  });
} else {
  require('./server'); // each worker runs the server
}
```

**Pros:** Full Node.js process per core, full memory isolation, simple to set up.
**Cons:** Memory not shared. IPC needed for communication between workers. Spawning is expensive.

**Use for:** HTTP servers that need to utilize multiple CPU cores.

---

### Worker Threads

Spawns **threads** within the same process. Threads share memory (via `SharedArrayBuffer`) and can communicate via message passing.

```js
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
  const worker = new Worker(__filename, { workerData: { n: 40 } });
  worker.on('message', (result) => console.log('Fibonacci:', result));
} else {
  function fib(n) { return n <= 1 ? n : fib(n-1) + fib(n-2); }
  parentPort.postMessage(fib(workerData.n));
}
```

**Pros:** Shared memory possible, lower spawn overhead than processes.
**Cons:** More complex, shared memory requires careful synchronization.

**Use for:** CPU-intensive tasks (image processing, encryption, data parsing) that would block the event loop.

---

### Comparison

| | Cluster | Worker Threads |
|---|---|---|
| Isolation | Full process isolation | Same process, separate thread |
| Memory | Separate per process | Can share via SharedArrayBuffer |
| Communication | IPC (message passing) | Message passing |
| Use case | Scale HTTP servers | CPU-bound tasks |
| Crash isolation | Yes (one crash = one process) | No (crash can affect main) |

---

## 25. Memory Leaks in Node.js

### How do you detect and fix memory leaks in Node.js?

A memory leak is when objects that are no longer needed are not garbage collected — they stay in heap memory, growing over time until the process crashes (`OOM`).

---

### Common Causes

**1. Forgotten event listeners**

```js
// Leak — listener added every request, never removed
app.get('/data', (req, res) => {
  emitter.on('data', handler); // grows with every request!
  res.json({ ok: true });
});

// Fix — remove when done, or use once()
emitter.once('data', handler);
```

**2. Closures holding large objects**

```js
function createHandler() {
  const bigBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
  return function handler() {
    // bigBuffer is captured in closure — never freed
    return 'done';
  };
}
```

**3. Growing caches with no eviction**

```js
const cache = new Map(); // grows forever
app.get('/user/:id', async (req, res) => {
  if (!cache.has(req.params.id)) {
    cache.set(req.params.id, await fetchUser(req.params.id));
  }
  res.json(cache.get(req.params.id));
});

// Fix — use LRU cache with max size
const LRU = require('lru-cache');
const cache = new LRU({ max: 500 });
```

**4. Uncleared timers and intervals**

```js
// Leak — setInterval keeps a reference alive
const timer = setInterval(() => doWork(), 1000);
// Fix — always clear when no longer needed
clearInterval(timer);
```

---

### Detecting Memory Leaks

**1. Monitor heap usage in production**

```js
setInterval(() => {
  const used = process.memoryUsage();
  console.log(`Heap: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
}, 30000);
```

**2. Take a heap snapshot**

```bash
node --inspect server.js
# Open Chrome → chrome://inspect → take heap snapshot
# Compare snapshots over time — growing objects = leak
```

**3. Use clinic.js**

```bash
npx clinic doctor -- node server.js
```

---

## 26. Background Jobs with BullMQ

### How do you handle background jobs in Node.js?

Some work should not happen in a request-response cycle — sending emails, resizing images, generating reports. These go into a **job queue**.

---

### BullMQ Architecture

```text
Producer (API server) → adds job to Redis queue → Worker processes job
```

BullMQ uses Redis as the queue backend. Jobs are durable — if the worker crashes, the job is requeued.

---

### Basic Setup

```js
// producer.js — add job from API route
const { Queue } = require('bullmq');
const emailQueue = new Queue('emails', { connection: { host: 'localhost', port: 6379 } });

app.post('/register', async (req, res) => {
  const user = await createUser(req.body);
  await emailQueue.add('welcome-email', { userId: user.id, email: user.email });
  res.json({ user });
});
```

```js
// worker.js — separate process
const { Worker } = require('bullmq');

const worker = new Worker('emails', async (job) => {
  if (job.name === 'welcome-email') {
    await sendWelcomeEmail(job.data.email);
  }
}, { connection: { host: 'localhost', port: 6379 } });

worker.on('completed', (job) => console.log(`Job ${job.id} done`));
worker.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err));
```

---

### Key Features

| Feature | Description |
|---|---|
| **Retries** | Automatically retry failed jobs with backoff |
| **Delay** | Schedule a job for the future |
| **Priority** | Higher priority jobs run first |
| **Rate limiting** | Process max N jobs per second |
| **Concurrency** | Run multiple jobs in parallel |
| **Cron jobs** | Repeat on a schedule |

```js
// Scheduled job — run every day at 9am
await emailQueue.add('daily-digest', { }, {
  repeat: { cron: '0 9 * * *' }
});

// Delayed job — send after 1 hour
await emailQueue.add('follow-up', { userId }, {
  delay: 60 * 60 * 1000
});

// Retry on failure
await emailQueue.add('payment', data, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
});
```

---

## 27. Consistent Hashing

### What is consistent hashing and why does it matter in distributed systems?

Regular hashing (`shard = hash(key) % N`) breaks when you add or remove a node — almost every key gets remapped. **Consistent hashing** minimizes remapping when nodes change.

---

### How It Works

Imagine a ring (hash space 0 → 2³² wrapped around). Both nodes and keys are placed on the ring by hashing. Each key is owned by the **next node clockwise**.

```text
         Node A (hash 100)
              │
   Key X ────►│
   (hash 90)  │
              │
Ring ─────────────────────── Node B (hash 250)
              │
   Key Y ────►│
   (hash 220) │
```

**Adding a node:** Only keys between the new node and its predecessor get remapped — typically `1/N` of all keys.

**Removing a node:** Only that node's keys move to the next node.

---

### Virtual Nodes (vnodes)

To avoid uneven distribution, each physical node is represented by multiple virtual nodes on the ring. This spreads the load evenly.

```text
Node A → represented at ring positions 45, 160, 310, 420...
Node B → represented at ring positions 80, 200, 355, 500...
```

---

### Where It's Used

- **Redis Cluster** — key distribution across shards
- **Cassandra / DynamoDB** — data partitioning
- **CDN / load balancers** — consistent routing (same client → same cache server)
- **Distributed caches** — adding a cache server doesn't invalidate all existing cache entries

---

## 28. Service Discovery

### How do microservices find each other?

In a static environment you could hardcode `http://payment-service:3001`. In a dynamic environment (Kubernetes, auto-scaling), service instances come and go — you need **service discovery**.

---

### Client-side Discovery

The client queries a **service registry** (like Consul, Eureka) to get the list of available instances, then picks one using a load balancing algorithm.

```text
Service A → ask Registry: "where is payment-service?"
         ← Registry: "10.0.0.5:3001, 10.0.0.6:3001"
         → picks 10.0.0.5:3001 and calls it
```

**Pros:** Client has full control.
**Cons:** Every client needs service discovery logic.

---

### Server-side Discovery

The client calls a **load balancer or API gateway**. The gateway handles service discovery internally.

```text
Service A → calls "http://api-gateway/payment"
API Gateway → queries registry → picks instance → forwards request
```

**Pros:** Clients are simple — they just call the gateway.
**Cons:** Load balancer is a potential bottleneck.

---

### Kubernetes DNS (Most Common Today)

In Kubernetes, every Service gets a DNS name. Pods find each other by name.

```text
payment-service.default.svc.cluster.local → resolves to the Service ClusterIP
```

```yaml
# payment-service Service
apiVersion: v1
kind: Service
metadata:
  name: payment-service
spec:
  selector:
    app: payment
  ports:
    - port: 3001
```

```js
// Other services just call by DNS name
const response = await fetch('http://payment-service:3001/charge');
```

Kubernetes automatically load balances across all healthy pods matching the selector.

---

## 29. API Versioning Strategies

### How do you version an API without breaking existing clients?

When you need to make breaking changes, you must version your API. Here are the main strategies:

---

### 1. URI Path Versioning (Most Common)

```text
GET /api/v1/users
GET /api/v2/users
```

**Pros:** Obvious, easy to test in browser, cacheable.
**Cons:** "Dirty" URLs — some argue versioning shouldn't be in the path.

---

### 2. Header Versioning

```text
GET /api/users
Accept-Version: 2
```

```js
app.get('/api/users', (req, res) => {
  const version = req.headers['accept-version'] || '1';
  if (version === '2') return res.json(getUsersV2());
  return res.json(getUsersV1());
});
```

**Pros:** Clean URLs.
**Cons:** Harder to test in browser. Less visible.

---

### 3. Query Parameter Versioning

```text
GET /api/users?version=2
```

**Pros:** Easy to implement and test.
**Cons:** Clutters query string, often breaks caching.

---

### 4. Content Negotiation (Accept Header)

```text
GET /api/users
Accept: application/vnd.myapi.v2+json
```

**Pros:** RESTful purists prefer this.
**Cons:** Very verbose, complex routing logic.

---

### Best Practices

- Maintain at least one previous version during a **deprecation window** (e.g., 6 months)
- Communicate deprecation via response headers: `Deprecation: true`, `Sunset: 2026-12-01`
- Never make breaking changes within the same version — only additive changes
- Version at the API level, not the endpoint level when possible

| Strategy | Visibility | Cacheability | Simplicity |
|---|---|---|---|
| URI path | High | Good | Simple |
| Header | Low | Good | Moderate |
| Query param | Medium | Poor | Simple |
| Content negotiation | Low | Good | Complex |

---

## 30. Structured Logging & Correlation IDs

### How do you log effectively in a distributed system?

`console.log('user updated')` is useless in production. You need logs you can **search, filter, and trace across services**.

---

### Structured Logging

Log as JSON, not plain strings. Every field is queryable.

```js
// Bad
console.log('User 123 updated their profile');

// Good — structured
logger.info({
  event: 'user.profile_updated',
  userId: '123',
  fields: ['name', 'email'],
  durationMs: 45,
  requestId: 'req-abc-xyz'
});
```

Use `pino` (fastest Node.js logger) or `winston`:

```js
const pino = require('pino');
const logger = pino({ level: 'info' });

logger.info({ userId, action: 'login', ip: req.ip }, 'User logged in');
```

---

### Correlation IDs (Trace IDs)

When a request spans multiple services, you need a shared ID to stitch the logs together.

```text
Request arrives → generate requestId (UUID)
                → attach to all logs in this service
                → forward in headers to downstream services

Service A logs: { requestId: "abc-123", event: "order.created" }
Service B logs: { requestId: "abc-123", event: "payment.charged" }
Service C logs: { requestId: "abc-123", event: "email.sent" }
```

**Middleware to generate and forward correlation ID:**

```js
const { v4: uuidv4 } = require('uuid');

app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.requestId);
  req.logger = logger.child({ requestId: req.requestId });
  next();
});

// Usage in a route
app.post('/orders', async (req, res) => {
  req.logger.info({ userId: req.user.id }, 'Creating order');
  // forward to downstream
  await fetch('http://payment-service/charge', {
    headers: { 'x-request-id': req.requestId }
  });
});
```

---

### Log Levels

| Level | When to use |
|---|---|
| `error` | Something failed that needs attention |
| `warn` | Something unexpected but not fatal |
| `info` | Normal business events (login, order created) |
| `debug` | Detailed flow for debugging — disabled in prod |
| `trace` | Very verbose — almost never in prod |

---

[Back to question list](#table-of-contents)

## 31. gRPC vs REST vs GraphQL

### How do you choose between gRPC, REST, and GraphQL?

---

### REST

- Resources are nouns (`/users`, `/orders`)
- HTTP verbs define actions (GET, POST, PUT, DELETE)
- Responses in JSON
- Stateless

**When to use:** Public APIs, mobile clients, standard CRUD services, anything needing broad compatibility.

---

### GraphQL

- Single endpoint (`/graphql`)
- Client specifies exactly what fields it needs — no over-fetching or under-fetching
- Supports queries (read), mutations (write), and subscriptions (real-time)

```graphql
query {
  user(id: "123") {
    name
    orders {
      id
      total
    }
  }
}
```

**When to use:** APIs consumed by complex UIs with varied data requirements. BFF (Backend for Frontend) layer. Mobile apps where bandwidth matters.

**Watch out for:** N+1 problem — use DataLoader for batching. Complex queries can be expensive.

---

### gRPC

- Uses Protocol Buffers (binary serialization — much smaller than JSON)
- Strongly typed contracts via `.proto` files
- Supports streaming (unary, server-stream, client-stream, bidirectional)
- ~7x faster than REST/JSON for same payload

```protobuf
// payment.proto
service PaymentService {
  rpc Charge (ChargeRequest) returns (ChargeResponse);
  rpc StreamTransactions (UserRequest) returns (stream Transaction);
}
```

```js
// Server (Node.js)
server.addService(PaymentService, {
  charge: (call, callback) => {
    callback(null, { transactionId: uuidv4(), status: 'success' });
  }
});
```

**When to use:** Internal microservice-to-microservice communication. Low-latency, high-throughput needs. Streaming scenarios.

---

### Comparison

| | REST | GraphQL | gRPC |
|---|---|---|---|
| Protocol | HTTP/1.1 | HTTP/1.1 | HTTP/2 |
| Format | JSON | JSON | Protocol Buffers (binary) |
| Typing | Loose (OpenAPI optional) | Strongly typed schema | Strongly typed (.proto) |
| Over/under-fetching | Possible | Eliminated | N/A (defined per call) |
| Streaming | SSE / WebSocket | Subscriptions | Native bidirectional |
| Browser support | Full | Full | Needs grpc-web proxy |
| Learning curve | Low | Medium | Medium |
| Best for | Public APIs | Complex UIs | Internal services |

---

## 32. Load Balancing Algorithms

### What are the different load balancing algorithms and when do you use each?

---

### Round Robin

Distribute requests to each server in order: S1 → S2 → S3 → S1 → ...

**Use when:** All servers have equal capacity and requests take similar time.

---

### Weighted Round Robin

Servers with higher weight receive more requests.

```text
Server A (weight 3): gets 3 requests
Server B (weight 1): gets 1 request
Ratio: A:B = 3:1
```

**Use when:** Servers have different hardware specs.

---

### Least Connections

Route to the server with fewest active connections.

**Use when:** Requests have varying processing times (some are fast, some are slow). Prevents one server from getting overwhelmed.

---

### IP Hash (Sticky Sessions)

Hash the client's IP to always route them to the same server.

```text
hash(client_ip) % numServers → always same server
```

**Use when:** App needs session affinity (WebSockets, stateful sessions not moved to Redis yet).

---

### Least Response Time

Route to the server with the lowest combination of active connections + response time.

**Use when:** Servers are geographically distributed or have varying latency.

---

### Random

Pick a random server. Surprisingly effective at scale due to the birthday paradox.

---

### Comparison

| Algorithm | State aware | Good for |
|---|---|---|
| Round Robin | No | Equal servers, short requests |
| Weighted RR | No | Servers with different capacity |
| Least Connections | Yes | Variable request duration |
| IP Hash | No | Session affinity |
| Least Response Time | Yes | Geo-distributed servers |

---

## 33. Database Connection Pooling

### Why does connection pooling matter and how does it work?

Opening a database connection is expensive — it involves TCP handshake, auth, and setup. If every request opens a new connection, the DB gets overwhelmed.

---

### What Connection Pooling Does

A pool maintains a set of **pre-opened, reusable connections**. When a request needs the DB, it borrows a connection. When done, it returns it to the pool.

```text
Without pooling:
Request 1 → open connection → query → close connection
Request 2 → open connection → query → close connection  (repeated overhead)

With pooling:
Pool: [conn1, conn2, conn3, conn4, conn5]
Request 1 → borrow conn1 → query → return conn1
Request 2 → borrow conn2 → query → return conn2
Request 3 → borrow conn1 (reused) → query → return conn1
```

---

### PostgreSQL Pool with `pg`

```js
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'mydb',
  user: 'postgres',
  password: 'secret',
  max: 20,              // max connections in pool
  idleTimeoutMillis: 30000,   // remove idle connection after 30s
  connectionTimeoutMillis: 2000, // fail if can't get connection in 2s
});

// Usage
const client = await pool.connect();
try {
  const result = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
  return result.rows[0];
} finally {
  client.release(); // always release back to pool
}
```

---

### Pool Sizing

**Rule of thumb for PostgreSQL:**

```text
connections = (num_cores * 2) + effective_spindle_count
```

- Too few connections → requests queue up waiting for a connection
- Too many connections → DB overhead, memory exhaustion, context switching

For a 4-core DB server: ~10 connections per application instance is a good starting point.

---

### PgBouncer

For high-concurrency apps, even pool connections can be too many for the DB. **PgBouncer** is a connection pooler that sits between your app and PostgreSQL, multiplexing thousands of app connections into a handful of real DB connections.

```text
App (100 connections) → PgBouncer → PostgreSQL (10 connections)
```

---

## 34. Rate Limiting Algorithms

### What are the different rate limiting algorithms and how do you choose one?

---

### Fixed Window Counter

Count requests in a fixed time window. Reset the counter at the end of the window.

```text
Window: 0s–60s  → 100 requests allowed
At 59s: 100 requests sent → blocked
At 60s: counter resets → 100 more allowed
```

**Problem:** Burst at the boundary — 100 requests at 59s + 100 requests at 61s = 200 in 2 seconds.

---

### Sliding Window Log

Store timestamp of each request. Count requests in the past 60 seconds.

```text
Request arrives at t=75s
→ count requests with timestamp > 15s (75-60)
→ if count < limit → allow
```

**Pros:** Smooth, no boundary burst.
**Cons:** Stores every request timestamp — memory-intensive at scale.

---

### Sliding Window Counter

Hybrid: approximate the sliding window using two fixed windows.

```text
Current window (partial): 30s elapsed, 40 requests
Previous window (full):   100 requests
Weight = (60-30)/60 = 0.5

Estimated count = 40 + (100 * 0.5) = 90 → under limit
```

**Pros:** Memory efficient, good approximation. Used by Cloudflare and Redis.

---

### Token Bucket

A bucket holds tokens. Each request consumes one token. Tokens refill at a fixed rate. Allows bursts up to bucket capacity.

```text
Bucket capacity: 10 tokens
Refill rate: 1 token/second

t=0: 10 tokens, 10 requests → all allowed (bucket empty)
t=1: 1 token refilled, 1 request → allowed
```

```js
// Redis-based token bucket
async function consumeToken(userId) {
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const capacity = 10;
  const refillRate = 1; // tokens per second

  const data = await redis.get(key);
  let { tokens, lastRefill } = data ? JSON.parse(data) : { tokens: capacity, lastRefill: now };

  const elapsed = (now - lastRefill) / 1000;
  tokens = Math.min(capacity, tokens + elapsed * refillRate);
  lastRefill = now;

  if (tokens < 1) return false; // rate limited
  tokens -= 1;
  await redis.setex(key, 3600, JSON.stringify({ tokens, lastRefill }));
  return true;
}
```

---

### Leaky Bucket

Requests enter a queue (bucket). The queue drains at a constant rate. Excess requests are dropped.

```text
Incoming: bursty traffic → queued
Outgoing: constant rate (e.g., 10 req/s)
```

**Pros:** Smooths bursts, protects downstream services.
**Cons:** Can add latency. Queue can fill up and drop requests.

---

### Algorithm Summary

| Algorithm | Burst handling | Memory | Smoothness | Best for |
|---|---|---|---|---|
| Fixed Window | Poor (boundary burst) | Low | Low | Simple rate limiting |
| Sliding Window Log | Excellent | High | Excellent | Strict limits |
| Sliding Window Counter | Good | Low | Good | Production (Redis) |
| Token Bucket | Allows bursts | Low | Good | API rate limits |
| Leaky Bucket | Absorbs bursts | Medium | Excellent | Downstream protection |

---

## 35. Bonus — Topics Interviewers Also Expect

---

### CAP Theorem

A distributed system can only guarantee **2 of 3**:

- **Consistency** — every read gets the latest write
- **Availability** — every request gets a (possibly stale) response
- **Partition Tolerance** — system works despite network splits

In practice, partition tolerance is required. So you choose between **CP** (banks, payments) or **AP** (social feeds, caches).

---

### Database Transactions & ACID

| Property | Meaning |
|---|---|
| **Atomicity** | All operations succeed or all roll back |
| **Consistency** | DB moves from one valid state to another |
| **Isolation** | Concurrent transactions don't interfere |
| **Durability** | Committed data survives crashes |

MongoDB supports multi-document transactions since v4.0.

---

### N+1 Query Problem

Fetching a list of items, then querying each item individually.

```js
// Bad — 1 query for users + N queries for each user's orders
const users = await User.find();
for (const user of users) {
  user.orders = await Order.find({ userId: user._id }); // N queries
}

// Good — fetch all orders in one query, join in memory
const users = await User.find();
const orders = await Order.find({ userId: { $in: users.map(u => u._id) } });
```

---

### Graceful Shutdown

When a container is stopped (SIGTERM), finish in-flight requests before shutting down.

```js
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await server.close();       // stop accepting new connections
  await db.disconnect();      // close DB pool
  await mqChannel.close();    // close message queue connection
  process.exit(0);
});
```

---

### Distributed Tracing

When a request spans multiple services, tracing lets you see the full journey.

Tools: **OpenTelemetry**, Jaeger, Zipkin, Datadog

Each request gets a `traceId`. Every service passes it along in headers and logs it.

---

### Health Check Endpoints

Every service should expose:

```text
GET /health  → { status: 'ok' }            (liveness)
GET /ready   → { status: 'ok', db: 'ok' }  (readiness — checks dependencies)
```

---

## 36. Database Transaction Isolation Levels

### What are transaction isolation levels and why do they matter?

Isolation levels control **what one transaction can see from another concurrent transaction**. More isolation = safer but slower. Less isolation = faster but more anomalies.

---

### The 4 Anomalies

| Anomaly | Description |
|---|---|
| **Dirty Read** | Reading uncommitted changes from another transaction |
| **Non-Repeatable Read** | Same row read twice gives different values (another tx updated it) |
| **Phantom Read** | Same query run twice returns different rows (another tx inserted/deleted) |
| **Lost Update** | Two txs read same row, both update it — one update is overwritten |

---

### The 4 Isolation Levels (SQL Standard)

| Level | Dirty Read | Non-Repeatable | Phantom |
|---|---|---|---|
| **Read Uncommitted** | Possible | Possible | Possible |
| **Read Committed** | Prevented | Possible | Possible |
| **Repeatable Read** | Prevented | Prevented | Possible |
| **Serializable** | Prevented | Prevented | Prevented |

---

### In Practice

**PostgreSQL default: Read Committed** — good for most apps. Each statement sees the latest committed snapshot.

**MySQL InnoDB default: Repeatable Read** — snapshot is taken at the start of the transaction.

**Serializable:** Transactions run as if they were serial. Safest, but can cause deadlocks and high contention. Use for financial operations.

```sql
-- Set isolation level for a session
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;
  SELECT balance FROM accounts WHERE id = 1;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

---

### MongoDB: Session-level Transactions

MongoDB transactions (since 4.0) default to **snapshot isolation** — reads within a transaction see a consistent snapshot of data as of the transaction start.

---

## 37. Optimistic vs Pessimistic Locking

### How do you prevent two users from overwriting each other's changes?

This is a classic **lost update** problem. Two users read the same record, both edit it, both save — the last writer wins and the first update is silently lost.

---

### Pessimistic Locking

Lock the row when you read it. Nobody else can update it until you release the lock.

```sql
-- PostgreSQL: SELECT FOR UPDATE
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;  -- locks the row
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

**Pros:** Guarantees no lost update.
**Cons:** Other transactions block waiting for the lock. Potential for deadlocks. Not great for high-concurrency reads.

---

### Optimistic Locking

Don't lock. Instead, track a **version** number. On update, verify the version hasn't changed. If it has, reject and retry.

```js
// Schema includes a version field
const userSchema = new Schema({
  name: String,
  email: String,
  __v: { type: Number, default: 0 } // Mongoose version key
});

// Application logic
async function updateUser(id, changes, expectedVersion) {
  const result = await User.findOneAndUpdate(
    { _id: id, __v: expectedVersion },        // only update if version matches
    { ...changes, $inc: { __v: 1 } },          // increment version
    { new: true }
  );
  if (!result) throw new Error('Conflict — record was modified by someone else');
  return result;
}
```

**Pros:** No blocking. Works well when conflicts are rare.
**Cons:** Requires retry logic in the application. Not suitable for high-contention scenarios.

---

### When to Use Which

| | Pessimistic | Optimistic |
|---|---|---|
| Conflict frequency | High | Low |
| Transaction duration | Short | Any |
| Concurrency | Low | High |
| Use case | Bank transfers, inventory | Profile edits, CMS |

---

## 38. Race Conditions & Concurrency Control

### What are race conditions and how do you prevent them in Node.js backends?

A race condition happens when the correctness of the program depends on the timing of concurrent operations. Even though Node.js is single-threaded, race conditions happen with async/await and I/O.

---

### Classic Race Condition: Check-Then-Act

```js
// Two requests arrive simultaneously — both check balance, both pass, both deduct
async function withdraw(userId, amount) {
  const user = await User.findById(userId);       // both reads: balance = 100
  if (user.balance < amount) throw new Error('Insufficient funds');
  await User.updateOne({ _id: userId }, { $inc: { balance: -amount } }); // both write
  // Result: balance = -900 (should be 0)
}
```

---

### Fix 1: Atomic Operations

Use the database's atomic operations — no read-modify-write cycle.

```js
// MongoDB atomic update with condition
const result = await User.findOneAndUpdate(
  { _id: userId, balance: { $gte: amount } },  // condition + update atomically
  { $inc: { balance: -amount } },
  { new: true }
);
if (!result) throw new Error('Insufficient funds');
```

---

### Fix 2: Database Transactions

```js
const session = await mongoose.startSession();
session.startTransaction();
try {
  const user = await User.findById(userId).session(session);
  if (user.balance < amount) throw new Error('Insufficient funds');
  user.balance -= amount;
  await user.save({ session });
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

---

### Fix 3: Distributed Lock (for cross-service races)

When multiple service instances compete, use a Redis lock:

```js
const lock = await redisClient.set(
  `lock:withdraw:${userId}`,
  'locked',
  'NX',    // only set if Not eXists
  'PX', 5000  // expire in 5 seconds (safety net)
);

if (!lock) throw new Error('Another operation in progress, try again');

try {
  // safe to proceed
  await performWithdrawal(userId, amount);
} finally {
  await redisClient.del(`lock:withdraw:${userId}`);
}
```

---

## 39. Distributed Locks with Redis

### How do you implement a distributed lock and what is Redlock?

A distributed lock ensures that only one process across your entire cluster holds a lock at a time — critical for operations like "process this payment exactly once" or "run this cron job on exactly one server."

---

### Simple Redis Lock

```js
// Acquire
const acquired = await redis.set(
  'lock:job:invoice-processor',
  instanceId,          // value = owner ID
  'NX',                // only set if key doesn't exist
  'PX', 30000          // TTL: 30 seconds
);
if (!acquired) return; // another instance holds the lock

try {
  await processInvoices();
} finally {
  // Release only if we own the lock (Lua script for atomicity)
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else return 0 end
  `;
  await redis.eval(script, 1, 'lock:job:invoice-processor', instanceId);
}
```

---

### Redlock Algorithm (Multi-node Redis)

A single Redis node lock fails if that node goes down. **Redlock** acquires locks on N independent Redis nodes (typically 5). The lock is valid if acquired on the majority (≥3).

```js
const Redlock = require('redlock');
const redlock = new Redlock([redis1, redis2, redis3, redis4, redis5]);

async function criticalSection() {
  const lock = await redlock.acquire(['lock:resource'], 30000);
  try {
    await doWork();
  } finally {
    await lock.release();
  }
}
```

**Trade-off:** Redlock is debated (Martin Kleppmann critique: clock drift can break it). For most practical cases, a single Redis node lock with proper TTL is sufficient.

---

### Lock Best Practices

1. **Always set a TTL** — never hold a lock forever (protects against crashes)
2. **Use unique owner IDs** — so only the lock holder can release it
3. **Keep critical sections short** — don't hold locks across long I/O
4. **Handle lock expiry** — if TTL expires during work, the work may need to be idempotent

---

## 40. Event Sourcing

### What is event sourcing and when would you use it?

Instead of storing the **current state** of an entity, event sourcing stores a **log of all events** that led to that state. The current state is derived by replaying the events.

---

### Traditional vs Event Sourcing

```text
Traditional:
orders table → { id: 1, status: 'shipped', total: 150 }
(current snapshot — history is lost)

Event Sourcing:
events table →
  { type: 'OrderCreated',   orderId: 1, total: 150,  at: t1 }
  { type: 'PaymentCharged', orderId: 1, amount: 150, at: t2 }
  { type: 'OrderShipped',   orderId: 1, carrier: 'UPS', at: t3 }
(full history preserved — current state = replay of all events)
```

---

### How State is Rebuilt

```js
function rebuildOrder(events) {
  return events.reduce((state, event) => {
    switch (event.type) {
      case 'OrderCreated':   return { ...state, id: event.orderId, status: 'pending', total: event.total };
      case 'PaymentCharged': return { ...state, paid: true };
      case 'OrderShipped':   return { ...state, status: 'shipped', carrier: event.carrier };
      default: return state;
    }
  }, {});
}
```

---

### Benefits

- **Full audit trail** — every change is recorded with who, what, and when
- **Time travel** — rebuild state as of any point in time
- **Event replay** — reprocess events through new logic (e.g., rebuild a new read model)
- **Natural fit for CQRS** — events update the read model

---

### Challenges

- **Query complexity** — you can't query current state with a simple `SELECT`. Use a separate read model (projection)
- **Event schema evolution** — how do you handle events from 3 years ago when the schema changed?
- **Storage grows** — events are append-only and never deleted

**When to use:** Financial systems, audit-heavy domains, e-commerce order lifecycles, anywhere you need a full history.

---

[Back to question list](#table-of-contents)

## 41. Two-Phase Commit (2PC)

### What is Two-Phase Commit and why is it rarely used in microservices?

2PC is a distributed transaction protocol that ensures all participants either all commit or all abort.

---

### The Two Phases

**Phase 1 — Prepare (Voting)**
The coordinator asks all participants: "Can you commit?"
Each participant locks its resources and votes Yes or No.

**Phase 2 — Commit or Abort**

- If all vote Yes → coordinator sends Commit to all
- If any vote No → coordinator sends Abort to all

```text
Coordinator → PREPARE → Service A (DB)
           → PREPARE → Service B (DB)

Service A votes YES  ↗
Service B votes YES  ↗
           ← COMMIT
```

---

### Why It's Avoided in Microservices

| Problem | Description |
|---|---|
| **Blocking** | Resources are locked during the entire protocol — latency spikes |
| **Coordinator failure** | If the coordinator crashes after Phase 1, participants wait forever (blocking) |
| **Network partitions** | Phase 2 message might never arrive |
| **Tight coupling** | All services must implement the 2PC protocol |

**The alternative:** Use the **Saga pattern** (compensating transactions) — it's resilient, async, and doesn't require a distributed lock.

2PC is appropriate when: you control all the databases (e.g., two PostgreSQL instances, or XA transactions between a DB and a message broker) and can accept the latency cost.

---

## 42. Cache Stampede & Thundering Herd

### What is a cache stampede and how do you prevent it?

A **cache stampede** (also called thundering herd) happens when a popular cached item expires. Hundreds of requests simultaneously find a cache miss and all query the database at the same time — overwhelming it.

```text
t=0:  cache miss → 1 DB query, 999 requests wait
t=X:  cached key expires
t=X+1ms: 1000 concurrent requests → all see cache miss → 1000 DB queries at once → DB crashes
```

---

### Solution 1: Locking / Mutex

Only allow one request to rebuild the cache. All others wait or return stale data.

```js
async function getCachedData(key) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // Try to acquire a lock
  const lock = await redis.set(`lock:${key}`, '1', 'NX', 'PX', 5000);
  if (!lock) {
    // Another request is rebuilding — wait briefly and retry
    await new Promise(r => setTimeout(r, 100));
    return getCachedData(key); // recursive retry
  }

  try {
    const data = await fetchFromDB(key);
    await redis.setex(key, 300, JSON.stringify(data));
    return data;
  } finally {
    await redis.del(`lock:${key}`);
  }
}
```

---

### Solution 2: Probabilistic Early Expiration

Randomly rebuild the cache slightly before it expires. Some requests refresh early — cache never actually expires for all at once.

```js
async function getCached(key, ttl) {
  const result = await redis.get(key);
  if (!result) return await rebuildCache(key, ttl);

  const { data, expiresAt } = JSON.parse(result);
  const remaining = expiresAt - Date.now();

  // Random early refresh: probability increases as TTL approaches 0
  if (Math.random() > remaining / (ttl * 1000)) {
    rebuildCache(key, ttl); // async refresh, don't await
  }

  return data;
}
```

---

### Solution 3: Stale-While-Revalidate

Serve the stale value immediately while refreshing in the background.

```js
async function getWithSWR(key, fetcher, ttl) {
  const cached = await redis.get(key);
  if (cached) {
    const { data, refreshAt } = JSON.parse(cached);
    if (Date.now() > refreshAt) {
      fetcher().then(fresh => redis.setex(key, ttl, JSON.stringify({
        data: fresh,
        refreshAt: Date.now() + (ttl * 500) // refresh at 50% of TTL
      })));
    }
    return data; // return stale immediately
  }
  return rebuildCache(key, ttl);
}
```

---

## 43. SQL vs NoSQL — When to Choose

### How do you decide between SQL and NoSQL databases?

This is not "SQL is old, NoSQL is modern." Each excels in different scenarios.

---

### SQL (Relational) — PostgreSQL, MySQL

**Strengths:**

- Strong ACID guarantees
- Powerful joins across normalized tables
- Schema enforces data integrity
- SQL is universal — easy to query ad-hoc
- Excellent for complex reporting

**Use when:**

- Data has clear relationships (users → orders → products)
- You need strong consistency (financial, healthcare)
- Schema is relatively stable
- Complex queries across multiple entities

---

### NoSQL — MongoDB, DynamoDB, Cassandra

**MongoDB (Document)**

- Flexible schema — fields can vary per document
- Nested objects avoid joins
- Scales horizontally well

**Use when:** Content management, user profiles, catalogs with variable attributes

**DynamoDB (Key-Value / Wide Column)**

- Extremely fast, horizontally scalable
- But: queries limited to primary key and GSIs

**Use when:** Session storage, gaming leaderboards, IoT data, anything with a simple access pattern

**Cassandra (Wide Column)**

- Write-optimized, massive scale
- Eventual consistency by default

**Use when:** Time-series data, metrics, logs at extreme scale

---

### Decision Framework

| Question | SQL | NoSQL |
|---|---|---|
| Complex relationships? | Yes | No |
| Flexible/variable schema? | No | Yes |
| Strong consistency required? | Yes | Depends |
| Horizontal write scaling? | Hard | Yes |
| Ad-hoc queries? | Yes | Limited |
| Known access patterns? | Either | Yes |

**In practice:** Most applications use both — SQL for core transactional data, Redis for caching, MongoDB or Elasticsearch for specific use cases.

---

## 44. Normalization vs Denormalization

### When do you normalize and when do you denormalize a database schema?

---

### Normalization

Split data into multiple tables to eliminate redundancy. Related by foreign keys.

```text
Normalized:
users:    { id, name, email }
orders:   { id, userId, createdAt }
products: { id, name, price }
order_items: { orderId, productId, qty }
```

**Pros:** No data duplication → updates are consistent. Storage efficient.
**Cons:** Reads require JOINs → slower as data grows.

---

### Denormalization

Embed related data into a single table/document to avoid joins.

```text
Denormalized order document:
{
  orderId: 1,
  userEmail: "alice@example.com",   // duplicated from users
  userName: "Alice",                 // duplicated
  items: [
    { productName: "Laptop", price: 999, qty: 1 }  // duplicated from products
  ]
}
```

**Pros:** Reads are fast — single document fetch.
**Cons:** Updates are complex — changing a product name requires updating every order.

---

### When to Denormalize

1. **Read-heavy workloads** — joins are too expensive at scale
2. **When the relationship doesn't change** — once an order is placed, the price/name is historical and shouldn't update
3. **Event sourcing / audit logs** — snapshot the data at the time of the event
4. **MongoDB documents** — embed when the data is accessed together and child data doesn't grow unboundedly

---

### The Rule

**Normalize first, denormalize when there's a measured performance problem.** Premature denormalization creates data consistency nightmares.

---

## 45. Database Query Optimization

### How do you find and fix slow database queries?

---

### Step 1: Find Slow Queries

**PostgreSQL:**

```sql
-- Enable slow query logging (queries > 1 second)
ALTER SYSTEM SET log_min_duration_statement = '1000';

-- Find top slow queries from pg_stat_statements
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**MongoDB:**

```js
db.setProfilingLevel(1, { slowms: 100 }); // log queries > 100ms
db.system.profile.find().sort({ ts: -1 }).limit(10);
```

---

### Step 2: Analyze with EXPLAIN

```sql
EXPLAIN ANALYZE
SELECT * FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending' AND o.created_at > NOW() - INTERVAL '7 days';
```

Look for:

- `Seq Scan` on large tables → missing index
- `Hash Join` or `Nested Loop` on huge datasets → wrong join order or missing index
- High `rows` estimates vs actual → stale statistics → run `ANALYZE`

---

### Step 3: Common Fixes

**Add missing indexes:**

```sql
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
```

**Avoid SELECT *:**

```sql
-- Bad: fetches all columns including large BLOBs
SELECT * FROM products WHERE category = 'electronics';

-- Good: only what you need
SELECT id, name, price FROM products WHERE category = 'electronics';
```

**Avoid N+1 queries** (see section 35).

**Use covering indexes** — include all columns the query needs so it never touches the main table:

```sql
CREATE INDEX idx_orders_covering
ON orders(user_id, status)
INCLUDE (id, total, created_at);
```

**Paginate with limits** — never return unbounded result sets.

**Use connection pooling** — avoid connection overhead per query.

---

## 46. Zero-Downtime Database Migrations

### How do you change a database schema without downtime?

Never run a migration that locks your table while traffic is flowing. At scale, adding a column to a table with 100M rows can lock it for minutes.

---

### The Expand–Contract Pattern

Also called **parallel change** or the **three-phase migration**.

**Phase 1: Expand (backward-compatible addition)**
Add the new column/table. Old code still works (column is nullable or has a default). New code starts writing to both old and new.

```sql
-- Safe: nullable column, no table lock needed in Postgres
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
```

**Phase 2: Migrate**
Backfill existing rows in batches (never update all rows at once — it locks the table).

```js
// Backfill in batches of 1000
let lastId = 0;
while (true) {
  const rows = await db.query(
    'UPDATE users SET phone_number = ... WHERE id > $1 AND phone_number IS NULL LIMIT 1000 RETURNING id',
    [lastId]
  );
  if (rows.length === 0) break;
  lastId = rows[rows.length - 1].id;
  await sleep(100); // throttle to avoid DB overload
}
```

**Phase 3: Contract (cleanup)**
Once all code uses the new column and all rows are backfilled, drop the old column in a separate deployment.

---

### Postgres-Specific Tips

- Adding a nullable column without a default: **instant** (no table rewrite)
- Adding a column WITH a non-volatile default: **instant** in PG 11+ (stored in catalog)
- Adding a NOT NULL column without default: **rewrites entire table** — dangerous
- Use `pg_repack` or `CONCURRENTLY` for index creation without locking

---

## 47. MongoDB Aggregation Pipeline

### How does the MongoDB aggregation pipeline work?

The aggregation pipeline processes documents through a series of stages, each transforming the data and passing it to the next stage — like Unix pipes.

---

### Core Stages

```js
db.orders.aggregate([
  // Stage 1: Filter
  { $match: { status: 'completed', createdAt: { $gte: new Date('2025-01-01') } } },

  // Stage 2: Join (lookup)
  { $lookup: {
    from: 'users',
    localField: 'userId',
    foreignField: '_id',
    as: 'user'
  }},
  { $unwind: '$user' },

  // Stage 3: Group and aggregate
  { $group: {
    _id: '$user.country',
    totalRevenue: { $sum: '$total' },
    orderCount: { $count: {} },
    avgOrderValue: { $avg: '$total' }
  }},

  // Stage 4: Sort
  { $sort: { totalRevenue: -1 } },

  // Stage 5: Limit
  { $limit: 10 },

  // Stage 6: Shape the output
  { $project: {
    country: '$_id',
    totalRevenue: 1,
    orderCount: 1,
    avgOrderValue: { $round: ['$avgOrderValue', 2] },
    _id: 0
  }}
]);
```

---

### Key Stages Reference

| Stage | Purpose |
|---|---|
| `$match` | Filter documents (like WHERE) — always put first to use indexes |
| `$group` | Aggregate by field (like GROUP BY) |
| `$sort` | Sort results |
| `$project` | Shape/rename fields |
| `$lookup` | Join with another collection |
| `$unwind` | Flatten an array field into separate documents |
| `$addFields` | Add computed fields |
| `$facet` | Run multiple aggregations in parallel |
| `$limit` / `$skip` | Pagination |

---

### Performance Tips

1. **`$match` as early as possible** — filter before joining and grouping
2. **`$project` early** — reduce document size before expensive stages
3. **Use indexes** — `$match` on indexed fields is fast; without indexes it's a full collection scan
4. **`allowDiskUse: true`** — for aggregations that exceed 100MB memory limit

```js
db.orders.aggregate([...], { allowDiskUse: true });
```

---

## 48. Node.js Streams & Backpressure

### When do you use streams in Node.js and what is backpressure?

Streams process data **chunk by chunk** instead of loading everything into memory. Essential for large files, API responses, database exports.

---

### The Problem Without Streams

```js
// Bad — loads entire 2GB file into memory
const data = fs.readFileSync('huge-file.csv'); // OOM crash
```

---

### Streams Solution

```js
// Good — processes chunk by chunk
const readable = fs.createReadStream('huge-file.csv');
const writable = fs.createWriteStream('output.csv');

readable.pipe(writable); // pipe handles backpressure automatically
```

---

### Four Stream Types

| Type | Description | Example |
|---|---|---|
| **Readable** | Source of data | `fs.createReadStream`, HTTP request |
| **Writable** | Destination | `fs.createWriteStream`, HTTP response |
| **Transform** | Read + modify + write | Gzip, CSV parser, encryption |
| **Duplex** | Both readable and writable | TCP socket, WebSocket |

---

### Backpressure

Backpressure is when the **consumer is slower than the producer**. Without it, the producer floods memory.

```js
// Manual backpressure handling
readable.on('data', (chunk) => {
  const canContinue = writable.write(chunk);
  if (!canContinue) {
    readable.pause();                         // slow down producer
    writable.once('drain', () => readable.resume()); // resume when writer catches up
  }
});
```

**`pipe()` handles this automatically.** Prefer `pipe()` or `pipeline()` over manual handling.

```js
const { pipeline } = require('stream/promises');
const zlib = require('zlib');

// Streaming: read → gzip compress → write
await pipeline(
  fs.createReadStream('input.txt'),
  zlib.createGzip(),
  fs.createWriteStream('input.txt.gz')
);
```

---

### Streaming HTTP Response

```js
app.get('/export', (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=export.csv');

  const cursor = db.collection('orders').find().stream();
  cursor
    .pipe(new CSVTransformStream())
    .pipe(res);
});
```

---

## 49. Error Handling Patterns in Node.js

### How do you structure error handling in a production Node.js app?

Inconsistent error handling is one of the most common sources of production bugs. Unhandled promise rejections silently swallow errors; incorrect status codes confuse clients.

---

### Operational vs Programmer Errors

- **Operational errors:** Expected failures — network timeout, validation failure, DB connection down, 404. **Handle gracefully.**
- **Programmer errors:** Bugs — `TypeError: cannot read property of undefined`, wrong argument type. **Crash and restart.**

---

### Custom Error Classes

```js
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(details) {
    super('Validation failed', 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}
```

---

### Global Error Handler (Express)

```js
// Must have 4 params — Express identifies error middleware by arity
app.use((err, req, res, next) => {
  const logger = req.logger || console;

  if (err.isOperational) {
    logger.warn({ err, requestId: req.requestId }, err.message);
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details }
    });
  }

  // Programmer error — log and crash (let process manager restart)
  logger.error({ err }, 'Unexpected error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  process.exit(1); // or just log and let PM2/K8s restart
});
```

---

### Async Route Handler Wrapper

```js
// Avoids try/catch in every route
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError('User');
  res.json(user);
}));
```

---

### Catch Unhandled Rejections

```js
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});
```

---

## 50. Middleware Architecture in Express

### How does Express middleware work and how do you structure it?

Middleware is a function with access to `req`, `res`, and `next`. Express processes middleware in the order it's registered. Each middleware either ends the request or calls `next()` to pass to the next one.

---

### The Middleware Pipeline

```text
Incoming Request
      │
      ▼
  [Logging]       → req.requestId, log entry
      │
  [Auth]          → verify JWT, attach req.user
      │
  [Rate Limit]    → check limits
      │
  [Validation]    → check body/params
      │
  [Route Handler] → business logic
      │
  [Error Handler] → catch any errors
      │
      ▼
  Response sent
```

---

### Writing Middleware

```js
// Request logger middleware
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    req.logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      durationMs: Date.now() - start
    });
  });
  next(); // MUST call next or the request hangs
}

// Auth middleware
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Usage
app.use(requestLogger);
app.use('/api', requireAuth);
app.get('/api/profile', (req, res) => res.json(req.user));
```

---

### Router-level Middleware

```js
const userRouter = express.Router();
userRouter.use(requireAuth);  // applies to all routes in this router
userRouter.get('/profile', getProfile);
userRouter.put('/profile', updateProfile);

app.use('/api/users', userRouter);
```

---

[Back to question list](#table-of-contents)

## 51. Dependency Injection in Node.js

### What is dependency injection and why does it matter for testability?

Dependency Injection (DI) means **passing dependencies as arguments** rather than importing/instantiating them inside a function. This makes code testable, swappable, and decoupled.

---

### Without DI (Hard to Test)

```js
// userService.js — tightly coupled to real DB
const db = require('./database'); // hard-coded dependency

async function getUserById(id) {
  return db.query('SELECT * FROM users WHERE id = $1', [id]);
}
```

To test this, you must have a real database.

---

### With DI (Easily Testable)

```js
// userService.js — dependency injected
function createUserService(db) {
  return {
    async getUserById(id) {
      return db.query('SELECT * FROM users WHERE id = $1', [id]);
    }
  };
}

module.exports = createUserService;
```

```js
// In tests
const mockDb = { query: jest.fn().mockResolvedValue({ rows: [{ id: 1, name: 'Alice' }] }) };
const userService = createUserService(mockDb);
const user = await userService.getUserById(1);
expect(user.rows[0].name).toBe('Alice');
```

```js
// In production
const db = require('./database');
const userService = createUserService(db);
```

---

### DI Containers (NestJS)

NestJS uses decorators for DI:

```ts
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {} // injected

  async findOne(id: string) {
    return this.userRepository.findById(id);
  }
}
```

The IoC container resolves and injects `UserRepository` automatically.

---

## 52. Repository Pattern

### What is the Repository pattern and why use it?

The Repository pattern is an abstraction layer between your business logic and the database. Business logic talks to a "repository interface" — it doesn't know or care if it's Mongo, PostgreSQL, or a mock.

---

### Without Repository

```js
// Business logic mixed with DB queries
async function checkoutOrder(userId, cartItems) {
  const user = await db.collection('users').findOne({ _id: userId });
  const order = await db.collection('orders').insertOne({ userId, items: cartItems });
  await db.collection('carts').deleteMany({ userId });
  return order;
}
```

---

### With Repository

```js
// Repository — all DB access here
class OrderRepository {
  async create(orderData) {
    const doc = await db.collection('orders').insertOne(orderData);
    return doc.insertedId;
  }
  async findByUser(userId) {
    return db.collection('orders').find({ userId }).toArray();
  }
}

// Service — pure business logic
class OrderService {
  constructor(orderRepo, userRepo, cartRepo) {
    this.orderRepo = orderRepo;
    this.userRepo = userRepo;
    this.cartRepo = cartRepo;
  }

  async checkout(userId, cartItems) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User');
    const orderId = await this.orderRepo.create({ userId, items: cartItems, status: 'pending' });
    await this.cartRepo.clearCart(userId);
    return orderId;
  }
}
```

---

### Benefits

- Swap MongoDB for PostgreSQL by changing only the repository
- Test business logic with a mock repository (no DB needed)
- Centralized query logic — no raw queries scattered through services

---

## 53. OAuth 2.0 & OpenID Connect

### How does OAuth 2.0 work and what is OpenID Connect?

---

### OAuth 2.0 — Authorization (Delegated Access)

OAuth 2.0 allows a third-party app to access resources on behalf of a user **without sharing the user's password**.

**Authorization Code Flow (most secure, for server-side apps):**

```text
1. User clicks "Login with Google"
2. App redirects to Google: ?client_id=...&redirect_uri=...&scope=email&state=xyz
3. User logs in on Google, grants permission
4. Google redirects back: /callback?code=AUTH_CODE&state=xyz
5. App server exchanges code for tokens:
   POST https://oauth2.googleapis.com/token
   { code, client_id, client_secret, redirect_uri, grant_type: 'authorization_code' }
6. Google returns: { access_token, refresh_token, expires_in }
7. App uses access_token to call Google APIs on behalf of user
```

**Key tokens:**

- `access_token` — short-lived (1 hour), used to access resources
- `refresh_token` — long-lived, used to get new access tokens without re-login
- `authorization_code` — single-use, exchanged for tokens

---

### OpenID Connect (OIDC) — Authentication

OIDC is a layer on top of OAuth 2.0 that adds **identity** — it tells you *who the user is*.

It adds an `id_token` (a JWT) containing user info: sub (user ID), email, name, picture.

```text
OAuth 2.0:  "This app can access your Google Drive"
OIDC:       "This app knows who you are (your Google identity)"
```

```js
// Decoded id_token payload
{
  "sub": "1234567890",          // unique user ID at Google
  "email": "alice@gmail.com",
  "name": "Alice Smith",
  "iat": 1700000000,
  "exp": 1700003600,
  "iss": "https://accounts.google.com"
}
```

---

### PKCE (Proof Key for Code Exchange)

For SPAs and mobile apps (no client secret), use PKCE to prevent authorization code interception:

```text
App generates: code_verifier (random string)
               code_challenge = SHA256(code_verifier)

Sends code_challenge in auth request.
Google stores it.

App sends code_verifier in token exchange.
Google verifies: SHA256(code_verifier) === stored code_challenge
```

---

## 54. RBAC vs ABAC

### What is the difference between RBAC and ABAC?

---

### RBAC — Role-Based Access Control

Users are assigned **roles**, and roles have **permissions**.

```text
Roles:       admin, editor, viewer
Permissions: articles:create, articles:edit, articles:delete, articles:read

editor → can: articles:create, articles:edit, articles:read
viewer → can: articles:read only
```

```js
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

app.delete('/articles/:id', requireAuth, requireRole('admin', 'editor'), deleteArticle);
```

**Pros:** Simple to understand and implement. Works well for most apps.
**Cons:** Role explosion — you end up with many fine-grained roles. Can't express "a user can only edit *their own* articles."

---

### ABAC — Attribute-Based Access Control

Access decisions based on **attributes** of the user, resource, and environment.

```text
Policy: "A user can edit an article if user.id === article.authorId OR user.role === 'admin'"

Attributes:
  User:     { id, role, department }
  Resource: { authorId, status, classification }
  Context:  { time, ipAddress }
```

```js
async function canEditArticle(user, articleId) {
  const article = await Article.findById(articleId);
  return user.role === 'admin' || article.authorId.equals(user.id);
}

app.put('/articles/:id', requireAuth, async (req, res, next) => {
  const allowed = await canEditArticle(req.user, req.params.id);
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  next();
});
```

**Pros:** Fine-grained. Handles "own resource" patterns. Flexible.
**Cons:** More complex. Harder to audit. Policies can become unwieldy.

---

### When to Use

| | RBAC | ABAC |
|---|---|---|
| Simple roles | Best | Overkill |
| "Own resource" rules | Hard | Natural |
| Multi-tenant apps | Role per tenant | Better |
| Enterprise (HIPAA, GDPR) | Insufficient | Required |

---

## 55. CORS — How It Works

### What is CORS and how do you configure it correctly?

**Cross-Origin Resource Sharing (CORS)** is a browser security mechanism that restricts web pages from making requests to a different origin (domain/port/protocol) than the one that served the page.

---

### Same-Origin Policy

```text
Page at:  https://myapp.com
API at:   https://api.myapp.com  ← DIFFERENT origin (different subdomain)
          https://myapp.com:8080 ← DIFFERENT origin (different port)
          http://myapp.com       ← DIFFERENT origin (different protocol)
```

Browsers block cross-origin fetch requests by default.

---

### How CORS Works

**Simple requests** (GET/POST with basic headers): Browser adds `Origin` header. Server must respond with `Access-Control-Allow-Origin`.

**Preflight requests** (PUT, DELETE, custom headers): Browser first sends an `OPTIONS` request to ask permission.

```text
Browser → OPTIONS /api/orders
          Origin: https://myapp.com
          Access-Control-Request-Method: DELETE

Server  → 200 OK
          Access-Control-Allow-Origin: https://myapp.com
          Access-Control-Allow-Methods: GET, POST, PUT, DELETE
          Access-Control-Max-Age: 86400  ← cache preflight for 24h
```

---

### Express CORS Configuration

```js
const cors = require('cors');

// Restrictive (production)
app.use(cors({
  origin: ['https://myapp.com', 'https://admin.myapp.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,   // allow cookies
  maxAge: 86400
}));

// Never do this in production — allows ANY origin
app.use(cors({ origin: '*' }));
```

**Security note:** `origin: '*'` with `credentials: true` is not allowed by browsers — it's an error.

---

## 56. File Uploads with Presigned URLs

### What is the best way to handle file uploads in a Node.js backend?

Uploading files directly through your API server is inefficient — large files consume server resources and bandwidth. The modern approach is **presigned URLs**.

---

### Direct Upload Anti-Pattern

```text
Client → POST file → API Server → S3
```
Server receives and re-uploads the entire file. Wastes bandwidth and compute.

---

### Presigned URL Pattern

```text
Client → GET /upload-url → API Server → generates presigned S3 URL → returns URL
Client → PUT file directly → S3 (bypasses API server entirely)
Client → POST /confirm-upload → API Server → records the file URL in DB
```

---

### Implementation (AWS S3)

```js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({ region: 'us-east-1' });

app.post('/upload-url', requireAuth, async (req, res) => {
  const { filename, contentType } = req.body;
  const key = `uploads/${req.user.id}/${Date.now()}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: req.body.size,     // enforce max size
    Metadata: { userId: req.user.id }
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
  res.json({ uploadUrl: url, key });
});
```

```js
// Client uploads directly to S3
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }
});

// Then confirm to backend
await fetch('/confirm-upload', {
  method: 'POST',
  body: JSON.stringify({ key })
});
```

---

### Security Considerations

- Validate `contentType` and `size` before generating URL
- Use a short expiry (5–15 minutes)
- Confirm uploads in a server-side webhook or callback — don't trust the client
- Consider virus scanning via S3 events → Lambda → ClamAV

---

## 57. Webhook Design Best Practices

### How do you design reliable webhooks?

A webhook is an HTTP POST that your server sends to another server when an event occurs. The challenge: HTTP is not reliable — the receiver might be down, slow, or return an error.

---

### Reliable Webhook Delivery

```js
async function sendWebhook(endpoint, event) {
  const payload = JSON.stringify(event);
  const signature = createHmacSignature(payload, endpoint.secret);

  let attempt = 0;
  const maxAttempts = 5;

  while (attempt < maxAttempts) {
    try {
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': Date.now().toString()
        },
        body: payload,
        signal: AbortSignal.timeout(5000)  // 5s timeout
      });
      if (res.ok) return;
    } catch (err) {
      // timeout or network error
    }
    attempt++;
    await sleep(Math.pow(2, attempt) * 1000); // exponential backoff
  }
  // Mark webhook as failed, notify customer
}
```

---

### Webhook Signatures (Security)

Receivers must verify the webhook came from you, not a malicious actor.

```js
// Sender — sign the payload
function createHmacSignature(payload, secret) {
  return 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Receiver — verify the signature
function verifyWebhook(req, secret) {
  const signature = req.headers['x-webhook-signature'];
  const expected = createHmacSignature(req.rawBody, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

### Best Practices

| Practice | Why |
|---|---|
| Idempotency key in payload | Receiver deduplicates retries |
| Short timeout (5–10s) | Don't block on slow receivers |
| Exponential backoff | Don't hammer a struggling receiver |
| Delivery log | Track success/failure per webhook |
| Replay button | Let customers re-trigger missed webhooks |
| Signature verification | Prevent spoofed webhook events |

---

## 58. HTTP/2 vs HTTP/3

### What are the key differences between HTTP/1.1, HTTP/2, and HTTP/3?

---

### HTTP/1.1 Problems

- **Head-of-line blocking:** Requests on a connection are processed sequentially. If one is slow, all wait.
- **Multiple connections:** Browsers open 6–8 parallel TCP connections per domain — wasteful.
- **Header overhead:** Headers are sent as plain text on every request, including large cookies.

---

### HTTP/2 Improvements

- **Multiplexing:** Multiple requests over a single TCP connection simultaneously — no head-of-line blocking at the application layer.
- **Header compression (HPACK):** Headers compressed and cached — saves bandwidth.
- **Server push:** Server can proactively send resources (CSS, JS) before the client asks.
- **Binary framing:** More efficient than text-based HTTP/1.1.

```text
HTTP/1.1: 6 TCP connections × 1 request each = 6 sequential streams
HTTP/2:   1 TCP connection × 100 concurrent streams
```

---

### HTTP/3 (QUIC)

HTTP/2 still has TCP-level head-of-line blocking — if one TCP packet is lost, all streams on that connection wait for retransmission.

HTTP/3 runs on **QUIC** (UDP-based) — each stream is independent at the transport level.

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Protocol | TCP | TCP | QUIC (UDP) |
| Multiplexing | No | Yes | Yes |
| HOL blocking | Yes (app + TCP) | Yes (TCP) | No |
| Connection setup | Slow (TCP+TLS) | Fast (reuses) | Very fast (0-RTT) |
| Mobile/packet loss | Poor | Medium | Excellent |
| Server push | No | Yes | Yes |

---

### Node.js HTTP/2

```js
const http2 = require('http2');
const fs = require('fs');

const server = http2.createSecureServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
});

server.on('stream', (stream, headers) => {
  stream.respond({ ':status': 200, 'content-type': 'text/plain' });
  stream.end('Hello HTTP/2');
});

server.listen(443);
```

---

## 59. SSL/TLS & HTTPS Internals

### How does HTTPS work under the hood?

HTTPS = HTTP + TLS (Transport Layer Security). TLS encrypts and authenticates the connection.

---

### TLS Handshake (TLS 1.3 simplified)

```text
Client → Server: ClientHello (supported cipher suites, TLS version, random bytes)
Server → Client: ServerHello (chosen cipher, certificate, random bytes)
Client:          verifies certificate (is it signed by a trusted CA? is it for this domain?)
Client → Server: key exchange (Diffie-Hellman)
Both:            derive session keys from the exchange
Client → Server: Finished (encrypted with session key)
Server → Client: Finished
═══ Encrypted communication begins ═══
```

---

### Certificate Chain of Trust

```text
Root CA (self-signed, built into OS/browser)
  └── Intermediate CA (signed by Root CA)
        └── Your Certificate (signed by Intermediate CA)
```

Browsers trust certificates that chain up to a known Root CA. This is why you need to include intermediate certificates in your server config.

---

### Key Concepts

| Concept | Description |
|---|---|
| **Public/Private key** | Server has a private key; certificate has the public key |
| **TLS 1.3** | Current standard — faster handshake, better ciphers |
| **Forward Secrecy** | Each session uses unique keys — past sessions can't be decrypted even if private key is compromised |
| **SNI** | Server Name Indication — allows multiple domains on one IP |
| **HSTS** | HTTP Strict Transport Security — browser always uses HTTPS |

---

### Node.js HTTPS

```js
const https = require('https');
const fs = require('fs');

const server = https.createServer({
  key: fs.readFileSync('private.key'),
  cert: fs.readFileSync('certificate.crt'),
  ca: fs.readFileSync('ca-bundle.crt'),  // intermediate certs
  minVersion: 'TLSv1.2',
  ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256' // strong ciphers only
}, app);
```

---

## 60. Content Delivery Networks (CDN)

### What is a CDN and what problems does it solve for backends?

A CDN is a globally distributed network of **edge servers** that cache and serve content from the location closest to the user.

---

### How It Works

```text
Without CDN:
User (Tokyo) → request → Origin Server (New York) → 150ms latency

With CDN:
User (Tokyo) → CDN Edge (Tokyo) → cache hit → 5ms latency
                                → cache miss → fetch from origin → cache → 5ms next time
```

---

### What CDNs Cache

- Static assets (images, CSS, JS bundles)
- API responses (with proper `Cache-Control` headers)
- Video/file downloads

---

### Cache-Control Headers

```js
// Static assets — cache for 1 year (content-hash in filename ensures freshness)
res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

// API response — CDN caches for 60s, but validates with origin using ETag
res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60');

// Sensitive data — never cache on CDN
res.setHeader('Cache-Control', 'private, no-store');
```

---

### CDN for APIs

Modern CDNs (Cloudflare, Fastly) can also:

- **Cache API responses** at the edge
- **Run edge functions** (Cloudflare Workers) — execute your JS logic at the edge
- **DDoS protection** — absorb attacks before they reach your origin
- **Rate limiting** — enforce limits at the edge globally
- **Bot detection** — filter malicious traffic

---

[Back to question list](#table-of-contents)

## 61. Compression (gzip, Brotli)

### How do you compress API responses and what difference does it make?

Compression reduces response payload size, lowering bandwidth costs and improving perceived performance.

---

### How It Works

```text
Client sends: Accept-Encoding: gzip, br
Server compresses response body
Server sends: Content-Encoding: br (+ compressed body)
Client decompresses automatically
```

---

### Node.js Compression

```js
const compression = require('compression');

app.use(compression({
  filter: (req, res) => {
    // Don't compress small responses — overhead not worth it
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,          // gzip compression level (1-9, 6 is a good balance)
  threshold: 1024    // only compress responses > 1KB
}));
```

---

### gzip vs Brotli

| | gzip | Brotli |
|---|---|---|
| Compression ratio | Good | 20–26% better |
| Speed | Fast | Slightly slower to compress |
| Browser support | Universal | All modern browsers |
| Best for | Dynamic content | Static assets |

Brotli should be preferred for static files (pre-compress at build time). gzip is fine for dynamic API responses.

---

### Pre-compress Static Files

```js
// In build pipeline — pre-compress, serve static files
const { gzipSync, brotliCompressSync } = require('zlib');

const content = fs.readFileSync('bundle.js');
fs.writeFileSync('bundle.js.gz', gzipSync(content, { level: 9 }));
fs.writeFileSync('bundle.js.br', brotliCompressSync(content));
```

```nginx
# Nginx — serve pre-compressed files
gzip_static on;
brotli_static on;
```

---

## 62. Blue-Green vs Canary Deployment

### What are the different zero-downtime deployment strategies?

---

### Blue-Green Deployment

Run two identical production environments: **Blue** (current) and **Green** (new version).

```text
Current: load balancer → Blue (v1)

Deploy:  update Green to v2, run smoke tests
Switch:  load balancer → Green (v2)

Rollback: load balancer → Blue (v1)  ← instant
```

**Pros:** Instant rollback — just flip the load balancer. Zero downtime.
**Cons:** Requires double the infrastructure. Database migration must be backward compatible.

---

### Canary Deployment

Route a small % of traffic to the new version. Gradually increase if metrics look good.

```text
Week 1:  1%  → v2,  99% → v1  (monitor error rate, latency)
Week 2:  10% → v2,  90% → v1
Week 3:  50% → v2,  50% → v1
Week 4:  100%→ v2   (full rollout)
```

**Pros:** Real user validation before full rollout. Limits blast radius of bugs.
**Cons:** Both versions run simultaneously — code must handle API/DB compatibility.

---

### Rolling Deployment

Replace instances one at a time (Kubernetes default).

```text
[v1] [v1] [v1] [v1]
[v2] [v1] [v1] [v1]  ← replace one
[v2] [v2] [v1] [v1]
[v2] [v2] [v2] [v2]  ← done
```

**Pros:** No extra infrastructure. Built into Kubernetes.
**Cons:** During rollout, two versions run simultaneously. Slower than blue-green.

---

### Comparison

| Strategy | Rollback speed | Resource cost | Risk exposure |
|---|---|---|---|
| Blue-Green | Instant | 2× infra | Low |
| Canary | Fast | Small extra | Very low |
| Rolling | Slow (re-deploy) | No extra | Medium |

---

## 63. Zero-Downtime Deployments

### What does it take to truly achieve zero downtime during deployments?

Zero-downtime deployment is not just about the deployment strategy — it requires the application to handle graceful shutdown and backward-compatible changes.

---

### 1. Graceful Shutdown (Drain In-Flight Requests)

```js
const server = app.listen(3000);

process.on('SIGTERM', () => {
  console.log('Received SIGTERM — draining connections...');
  server.close(() => {
    console.log('All requests served — shutting down');
    process.exit(0);
  });

  // Force shutdown after 30s if some connections hang
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});
```

Kubernetes sends SIGTERM, waits `terminationGracePeriodSeconds` (default 30s), then SIGKILL.

---

### 2. Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

The pod only receives traffic **after** it passes the readiness probe. During rolling updates, traffic only goes to ready pods.

---

### 3. Backward-Compatible API Changes

- **Never remove a field** from a response until all clients are updated
- **Never rename a field** — add the new name alongside the old one first
- **Never change a field's type** without versioning

---

### 4. Backward-Compatible Database Migrations

Use the **expand-contract pattern** (see section 46). Never drop a column that the currently running app version reads.

---

## 64. Kubernetes HPA & Auto-Scaling

### How does Kubernetes auto-scaling work?

---

### Horizontal Pod Autoscaler (HPA)

HPA automatically scales the number of pods up or down based on metrics.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70   # scale up when avg CPU > 70%
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

**Scaling up:** When CPU > 70%, add pods. New pods take ~30-60s to start.
**Scaling down:** When CPU drops, remove pods gradually (scale-down stabilization window prevents flapping).

---

### Custom Metrics HPA

Scale based on business metrics (queue depth, request rate):

```yaml
metrics:
  - type: External
    external:
      metric:
        name: rabbitmq_queue_messages_ready
        selector:
          matchLabels:
            queue: order-processor
      target:
        type: AverageValue
        averageValue: 100  # scale to keep ~100 messages per pod
```

---

### Vertical Pod Autoscaler (VPA)

Automatically adjusts CPU/memory **requests and limits** for a pod based on actual usage. Complements HPA.

---

### Cluster Autoscaler

Scales the **number of nodes** in the cluster when pods can't be scheduled due to insufficient resources.

```text
HPA adds pods → no node has capacity → Cluster Autoscaler adds nodes → pods scheduled
```

---

## 65. Secrets Management

### How do you manage secrets (API keys, DB passwords) in production?

---

### Anti-Pattern: Secrets in Code

```js
// Never do this
const dbPassword = 'myS3cretP@ssw0rd'; // committed to git forever
```

---

### Environment Variables (Minimum Baseline)

```bash
# .env (never commit this)
DB_PASSWORD=myS3cretP@ssw0rd
JWT_SECRET=my-jwt-secret
```

```js
require('dotenv').config();
const db = new Pool({ password: process.env.DB_PASSWORD });
```

**Problems:** `.env` files can leak via git, logs, error messages, or misconfigured containers.

---

### Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
stringData:
  password: myS3cretP@ssw0rd
```

```yaml
# Reference in Pod spec
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-secret
        key: password
```

**Note:** Kubernetes Secrets are base64-encoded by default, not encrypted. Enable **encryption at rest** for etcd or use an external secrets store.

---

### HashiCorp Vault (Production Grade)

```js
const vault = require('node-vault')({ endpoint: 'https://vault.internal' });

async function getDBPassword() {
  await vault.approleLogin({ role_id: process.env.VAULT_ROLE_ID, secret_id: process.env.VAULT_SECRET_ID });
  const secret = await vault.read('secret/data/production/db');
  return secret.data.data.password;
}
```

**Benefits:** Dynamic secrets (Vault generates a DB password just for your service, expires it after use), audit log, secret rotation without redeployment.

---

### Best Practices

| Practice | Why |
|---|---|
| Never log secrets | Logs are often stored and searchable |
| Rotate regularly | Limits exposure window if compromised |
| Least privilege | Each service gets only the secrets it needs |
| Audit access | Know who/what accessed which secret |
| Use short-lived credentials | Vault dynamic secrets, IRSA (AWS) |

---

## 66. Container Security

### What are the key security practices for Docker containers?

---

### Run as Non-Root

```dockerfile
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nodeuser

WORKDIR /app
COPY --chown=nodeuser:nodejs . .
RUN npm ci --production

USER nodeuser  # switch to non-root
EXPOSE 3000
CMD ["node", "server.js"]
```

---

### Use Minimal Base Images

```dockerfile
# Bad — full OS, many attack surface points
FROM ubuntu:22.04

# Good — minimal
FROM node:20-alpine   # 5MB vs 900MB

# Best for production — distroless
FROM gcr.io/distroless/nodejs20-debian12
```

---

### Never Store Secrets in Images

```dockerfile
# Bad — secret baked into image layer
ARG DB_PASSWORD
ENV DB_PASSWORD=${DB_PASSWORD}

# Good — inject at runtime via Kubernetes Secret
```

---

### Read-Only Filesystem

```yaml
# Kubernetes pod spec
securityContext:
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: 1001
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]   # drop all Linux capabilities
```

---

### Scan Images for Vulnerabilities

```bash
# Trivy — scan for known CVEs
trivy image myapp:latest

# In CI pipeline
trivy image --exit-code 1 --severity HIGH,CRITICAL myapp:latest
```

---

## 67. Monitoring & Alerting

### How do you monitor a Node.js backend in production?

The three pillars of observability: **Logs, Metrics, Traces** (covered in section 96). Here we focus on metrics and alerting.

---

### Prometheus + Grafana Stack

```js
const client = require('prom-client');

// Default Node.js metrics (heap, GC, event loop lag)
client.collectDefaultMetrics({ prefix: 'api_' });

// Custom business metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Current active connections'
});

// Middleware to track requests
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || 'unknown', status_code: res.statusCode });
  });
  next();
});

// Expose metrics endpoint for Prometheus to scrape
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

---

### What to Monitor

| Signal | Metrics to Track |
|---|---|
| **Latency** | p50, p95, p99 response times |
| **Errors** | 4xx rate, 5xx rate, error rate % |
| **Traffic** | Requests per second |
| **Saturation** | CPU %, memory %, event loop lag |
| **Business** | Orders per minute, signups, payment success rate |

---

### Alerting Rules (Prometheus AlertManager)

```yaml
groups:
  - name: api-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_request_duration_seconds_count{status_code=~"5.."}[5m]) > 0.05
        for: 2m
        annotations:
          summary: "Error rate above 5% for 2 minutes"

      - alert: HighP99Latency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        annotations:
          summary: "P99 latency above 1 second"
```

---

## 68. SLO, SLI, SLA & Error Budgets

### What is the difference between SLA, SLO, and SLI?

---

### Definitions

**SLI (Service Level Indicator):** A specific metric that measures service health.

```text
SLI = (good requests / total requests) × 100%
```

**SLO (Service Level Objective):** The internal target for an SLI.

```text
SLO: 99.9% of requests succeed in < 200ms
     (measured over 30 days)
```

**SLA (Service Level Agreement):** A contract with customers. If violated, there are consequences (refunds, credits).

```text
SLA: 99.5% monthly uptime. Breach → 10% credit.
```

**Rule of thumb:** SLO is stricter than SLA. If your SLO is 99.9%, your SLA might be 99.5% — you have buffer before compensating customers.

---

### Error Budget

The error budget is the allowed amount of downtime/errors within the SLO window.

```text
SLO: 99.9% availability over 30 days
→ Error budget = 0.1% of 30 days = 43.2 minutes of allowed downtime

If budget is exhausted:
  - No new feature deployments
  - All effort goes to reliability

If budget has headroom:
  - Ship features, accept some risk
```

---

### Common SLIs

| Service | SLI |
|---|---|
| API | Request success rate, latency percentiles |
| Queue consumer | Message processing success rate, processing lag |
| Database | Query success rate, replication lag |
| Storage | Read/write success rate, durability |

---

## 69. Chaos Engineering

### What is chaos engineering and how do you practice it?

Chaos engineering is deliberately introducing failures into your system in a **controlled way** to find weaknesses before they cause real incidents.

> "If your system can't handle a node going down in staging, it will fail in production."

---

### The Chaos Engineering Loop

1. **Define steady state** — what does "normal" look like? (error rate < 1%, p99 < 200ms)
2. **Hypothesize** — "The system will remain stable if we kill one API server pod"
3. **Inject fault** — kill the pod, add network latency, fill the disk
4. **Observe** — did the system self-heal? Did alerts fire? Was there user impact?
5. **Fix** — if the hypothesis was wrong, harden the system

---

### Common Chaos Experiments

| Experiment | Tests |
|---|---|
| Kill random pod | Pod restart, load balancer failover |
| Add 500ms network latency | Timeout configs, retry logic |
| Drop packets between services | Circuit breaker |
| Fill disk | Log rotation, graceful degradation |
| DB primary failover | Replica promotion, reconnect logic |
| Redis unavailable | Cache fallback to DB |
| High CPU load | Auto-scaling, throttling |

---

### Tools

- **Chaos Monkey** (Netflix) — randomly kills instances
- **Chaos Toolkit** — Python-based, declarative experiments
- **LitmusChaos** — Kubernetes-native chaos
- **AWS Fault Injection Simulator** — managed chaos for AWS

```bash
# Kubernetes: kill random pod in a namespace
kubectl delete pod -l app=api-server -n production --wait=false
```

---

## 70. Database Backup & Recovery

### How do you back up databases and test recovery?

A backup is useless if you've never tested restoring it.

---

### PostgreSQL Backup Strategies

**Logical backup (pg_dump):**

```bash
# Full logical backup
pg_dump -h localhost -U postgres mydb > backup_$(date +%Y%m%d).sql

# Compressed
pg_dump -h localhost -U postgres -Fc mydb > backup.dump

# Restore
pg_restore -h localhost -U postgres -d mydb backup.dump
```

**Physical backup (pg_basebackup):** Binary copy of data directory. Faster for large databases.

**WAL Archiving + PITR (Point-In-Time Recovery):**
Continuously archive WAL (Write-Ahead Log) files. Restore to any point in time.

```bash
# In postgresql.conf
archive_mode = on
archive_command = 'cp %p /backups/wal/%f'

# Restore to 3pm yesterday
restore_command = 'cp /backups/wal/%f %p'
recovery_target_time = '2026-06-10 15:00:00'
```

---

### MongoDB Backup

```bash
# mongodump — logical backup
mongodump --uri="mongodb://localhost:27017/mydb" --out=/backups/$(date +%Y%m%d)

# mongorestore
mongorestore --uri="mongodb://localhost:27017/mydb" /backups/20260611
```

For production: use **Atlas automated backups** or **Ops Manager**.

---

### Backup Best Practices

| Practice | Why |
|---|---|
| **Test restores regularly** | A backup you've never restored is an untested backup |
| **3-2-1 rule** | 3 copies, 2 media types, 1 offsite |
| **Automate and monitor** | Alert if backup job fails |
| **Encrypt backups** | Backups contain sensitive data |
| **Know your RTO/RPO** | RTO = how long to restore; RPO = how much data you can lose |

---

[Back to question list](#table-of-contents)

## 71. Data Encryption at Rest & in Transit

### How do you protect data with encryption?

---

### Encryption in Transit

Data encrypted while moving over the network. **TLS** handles this (see section 59).

```js
// Enforce HTTPS — redirect all HTTP
app.use((req, res, next) => {
  if (req.protocol === 'http') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});
```

---

### Encryption at Rest

Data encrypted while stored on disk.

**Database level:**

- PostgreSQL: **pgcrypto** extension for column-level encryption
- MongoDB: **Encrypted Storage Engine** (Atlas)
- Full disk encryption (AWS EBS encryption, GCP disk encryption)

**Application level (sensitive fields):**

```js
const crypto = require('crypto');
const ALGO = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);  // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString('hex'), tag: tag.toString('hex'), data: encrypted.toString('hex') };
}

function decrypt({ iv, tag, data }) {
  const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString('utf8');
}
```

---

### Password Hashing (bcrypt)

Passwords are never encrypted — they are **hashed**. One-way — cannot be reversed.

```js
const bcrypt = require('bcrypt');

// Hash (on registration)
const hash = await bcrypt.hash(password, 12); // cost factor 12

// Verify (on login)
const match = await bcrypt.compare(inputPassword, storedHash);
```

**Never use MD5 or SHA1 for passwords.** Use bcrypt, Argon2, or scrypt.

---

## 72. Multitenancy Patterns

### How do you build a multi-tenant application?

Multitenancy means one application instance serves multiple customers (tenants), each with isolated data.

---

### Pattern 1: Separate Database per Tenant

Each tenant gets their own database.

```js
const tenantDbs = new Map();

async function getTenantDb(tenantId) {
  if (!tenantDbs.has(tenantId)) {
    const db = await createConnection(`mongodb://localhost/tenant_${tenantId}`);
    tenantDbs.set(tenantId, db);
  }
  return tenantDbs.get(tenantId);
}

app.use(async (req, res, next) => {
  req.db = await getTenantDb(req.tenantId);
  next();
});
```

**Pros:** Full isolation. Tenant data can't leak to other tenants. Easy to delete a tenant.
**Cons:** Resource-intensive. Thousands of tenants = thousands of connections.

---

### Pattern 2: Separate Schema per Tenant (PostgreSQL)

Each tenant gets their own schema in the same database.

```sql
-- Create tenant schema
CREATE SCHEMA tenant_abc;
CREATE TABLE tenant_abc.users (...);

-- Set search path for session
SET search_path TO tenant_abc;
SELECT * FROM users; -- hits tenant_abc.users
```

**Pros:** Balance between isolation and resource efficiency.
**Cons:** Schema migrations must run for every tenant.

---

### Pattern 3: Shared Tables with Tenant ID Column

All tenants share the same tables. Every table has a `tenant_id` column.

```js
// Every query must include tenantId filter
const users = await db.collection('users').find({
  tenantId: req.tenantId,
  ...otherFilters
});
```

**Pros:** Cheapest. Easiest to scale one database.
**Cons:** Tenant data isolation relies entirely on your application code. A bug can expose cross-tenant data. Requires row-level security or careful query discipline.

**PostgreSQL Row-Level Security (RLS) for safety:**

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

### Identifying the Tenant

```text
Subdomain:  acme.myapp.com → tenantId = 'acme'
Header:     X-Tenant-ID: acme
JWT claim:  { tenantId: 'acme', userId: '...' }
```

---

## 73. Feature Flags

### What are feature flags and how do you use them safely?

Feature flags (feature toggles) let you **deploy code without enabling it**. You can release a feature to 1% of users, A/B test, or kill-switch a buggy feature without a deployment.

---

### Types of Feature Flags

| Type | Use Case | Lifetime |
|---|---|---|
| **Release toggle** | Ship code before it's ready for all users | Days–weeks |
| **Experiment toggle** | A/B test two implementations | Days–weeks |
| **Ops toggle** | Kill switch for performance-sensitive features | Long-lived |
| **Permission toggle** | Enable feature for specific users/plans | Long-lived |

---

### Simple Implementation

```js
// Feature flag service (backed by Redis or DB)
const flags = {
  'new-checkout-flow': { enabled: true, rolloutPercent: 10 },
  'ai-search': { enabled: true, rolloutPercent: 100 },
};

function isEnabled(flagName, userId) {
  const flag = flags[flagName];
  if (!flag?.enabled) return false;
  // Consistent hash: same userId always gets same result
  const hash = parseInt(crypto.createHash('md5').update(userId + flagName).digest('hex').slice(0, 8), 16);
  return (hash % 100) < flag.rolloutPercent;
}

// Usage
app.post('/checkout', async (req, res) => {
  if (isEnabled('new-checkout-flow', req.user.id)) {
    return newCheckoutHandler(req, res);
  }
  return legacyCheckoutHandler(req, res);
});
```

---

### Production Tools

- **GrowthBook** — open source, supports A/B testing
- **LaunchDarkly** — full-featured SaaS
- **Unleash** — open source self-hosted
- **Flagsmith** — open source

---

### Best Practices

- Remove flags after they're fully rolled out (flag debt is real)
- Test both the enabled and disabled code paths
- Log which variant a user saw (for debugging)
- Never gate critical infrastructure (auth, payments) behind a flag

---

## 74. Soft Delete Patterns

### What is soft delete and when should you use it?

Soft delete marks a record as deleted without physically removing it from the database.

---

### Implementation

```js
// Schema — add deletedAt field
const orderSchema = new Schema({
  userId: ObjectId,
  items: Array,
  total: Number,
  deletedAt: { type: Date, default: null }
});

// Soft delete
async function softDelete(id) {
  return Order.findByIdAndUpdate(id, { deletedAt: new Date() });
}

// All queries must exclude soft-deleted records
async function getOrders(userId) {
  return Order.find({ userId, deletedAt: null });
}
```

**Or use Mongoose middleware to automatically filter:**

```js
// Auto-filter deleted records on every query
orderSchema.pre(/^find/, function() {
  this.where({ deletedAt: null });
});
```

---

### When to Use Soft Delete

**Use it when:**

- Legal/compliance requires audit history (GDPR has a nuance — "right to erasure" still applies)
- Users might want to undo deletes
- Other records reference the deleted record (avoid dangling references)
- You need a recycle bin / restore feature

**Don't use it when:**

- Truly sensitive data that must be removed (GDPR erasure requests)
- High-churn tables — soft-deleted rows accumulate and hurt query performance
- Simple data with no need for history

---

### Hard Delete of Old Soft-Deleted Records

```js
// Cleanup job — hard delete records soft-deleted > 90 days ago
async function purgeOldDeletedRecords() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await Order.deleteMany({ deletedAt: { $lt: ninetyDaysAgo } });
}
```

---

## 75. Bulk Operations & Batch Processing

### How do you efficiently process large amounts of data?

---

### Database Bulk Inserts

```js
// Bad — N individual inserts
for (const item of items) {
  await db.collection('products').insertOne(item);  // N round trips to DB
}

// Good — single bulk insert
await db.collection('products').insertMany(items, { ordered: false });
// ordered: false — continues on error, all succeed or fail independently
```

**PostgreSQL bulk insert with COPY:**

```js
// 10–100x faster than individual INSERTs for large datasets
const { from } = require('pg-copy-streams');

const copyStream = client.query(from('COPY products (name, price, stock) FROM STDIN CSV'));
readable.pipe(copyStream);
```

---

### Batch Processing Large Datasets

Never load all records into memory at once. Process in chunks.

```js
async function processMigration() {
  let processed = 0;
  let lastId = null;

  while (true) {
    const query = lastId
      ? { _id: { $gt: lastId } }
      : {};

    const batch = await db.collection('users')
      .find(query)
      .sort({ _id: 1 })
      .limit(1000)
      .toArray();

    if (batch.length === 0) break;

    // Process batch
    await Promise.all(batch.map(user => transformUser(user)));

    // Bulk write results
    const bulkOps = batch.map(user => ({
      updateOne: {
        filter: { _id: user._id },
        update: { $set: { transformed: true } }
      }
    }));
    await db.collection('users').bulkWrite(bulkOps, { ordered: false });

    lastId = batch[batch.length - 1]._id;
    processed += batch.length;
    console.log(`Processed ${processed} records`);

    await sleep(50); // throttle to not overwhelm the DB
  }
}
```

---

### Worker Queue for Long-Running Jobs

```js
// Don't block HTTP request — queue it
app.post('/reports/generate', async (req, res) => {
  const jobId = await reportQueue.add('generate', { userId: req.user.id, filters: req.body });
  res.json({ jobId, status: 'queued' });
});

// Worker processes async
worker.process(async (job) => {
  const data = await fetchReportData(job.data.filters);
  const url = await uploadToS3(generateCSV(data));
  await notifyUser(job.data.userId, url);
});
```

---

## 76. GraphQL N+1 Problem & DataLoader

### How do you solve the N+1 problem in GraphQL?

GraphQL resolvers are powerful but prone to N+1 queries — especially with nested fields.

---

### The Problem

```graphql
query {
  orders {          # 1 query: fetch all orders
    id
    user {          # N queries: fetch user for EACH order
      name
      email
    }
  }
}
```

If there are 100 orders, this makes **101 database queries**.

---

### DataLoader Solution

DataLoader **batches and deduplicates** DB calls. Instead of one query per order, it collects all user IDs and fetches them in a single query.

```js
const DataLoader = require('dataloader');

// Batch function: receives array of userIds, returns array of users in same order
const userLoader = new DataLoader(async (userIds) => {
  const users = await User.find({ _id: { $in: userIds } });
  // Must return in same order as userIds
  const userMap = new Map(users.map(u => [u._id.toString(), u]));
  return userIds.map(id => userMap.get(id.toString()) || null);
});

// Resolver — uses loader instead of direct DB call
const resolvers = {
  Order: {
    user: (order) => userLoader.load(order.userId.toString())
    // DataLoader batches all these calls into one DB query
  }
};
```

---

### How DataLoader Works Internally

```text
Resolver for order 1 → userLoader.load('user-1')  ┐
Resolver for order 2 → userLoader.load('user-2')  ├── DataLoader batches in one tick
Resolver for order 3 → userLoader.load('user-1')  ┘   user-1 deduplicated!

Result: ONE query: db.users.find({ _id: { $in: ['user-1', 'user-2'] } })
```

---

### Per-Request DataLoader

DataLoader caches results within a request. Create a new instance per request (don't share across requests):

```js
app.use((req, res, next) => {
  req.loaders = {
    user: new DataLoader(batchLoadUsers),
    product: new DataLoader(batchLoadProducts)
  };
  next();
});
```

---

## 77. Serverless Architecture

### What is serverless and when does it make sense?

Serverless means running code without managing servers. You deploy functions and the cloud provider handles provisioning, scaling, and availability.

---

### How It Works

```text
HTTP Request → API Gateway → Lambda/Cloud Function → (auto-scale from 0 to thousands) → Response
```

**You pay per invocation**, not per running server. Zero traffic = zero cost.

---

### Cold Start Problem

When no instance is running, the first request must spin up a new one — this takes 200ms–2s (Node.js is one of the faster runtimes).

**Mitigation:**

- Keep functions small and fast to initialize
- Use **provisioned concurrency** (pre-warm instances)
- Avoid heavy imports at startup — lazy load

```js
// Bad — imports at module load
const heavyModule = require('./heavyModule');

// Good — lazy import only when needed
async function handler(event) {
  const { process } = await import('./heavyModule');
  return process(event);
}
```

---

### When Serverless Makes Sense

**Good fit:**

- Event-driven tasks (image resizing on upload, email on signup)
- Unpredictable or spiky traffic
- Cron jobs and scheduled tasks
- API backends with simple logic
- Prototypes and MVPs (low operational overhead)

**Not a good fit:**

- Long-running processes (Lambda max 15 minutes)
- WebSocket connections (stateful)
- High constant traffic (always-on servers are cheaper)
- Complex monolithic apps

---

### Example: S3 Trigger → Lambda

```js
// Lambda triggered when file uploaded to S3
exports.handler = async (event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;

  const image = await getFromS3(bucket, key);
  const thumbnail = await sharp(image).resize(200, 200).toBuffer();
  await uploadToS3(bucket, `thumbnails/${key}`, thumbnail);
};
```

---

## 78. RabbitMQ Exchange Types

### What are the different RabbitMQ exchange types and when do you use each?

An **exchange** receives messages from producers and routes them to queues based on routing rules.

---

### Direct Exchange

Routes messages to queues with a **matching routing key** (exact string match).

```js
// Producer
channel.publish('orders', 'order.created', Buffer.from(JSON.stringify(order)));

// Consumer binds queue to exchange with routing key
channel.bindQueue('email-queue', 'orders', 'order.created');
channel.bindQueue('inventory-queue', 'orders', 'order.created');
```

**Use for:** Routing specific event types to specific queues.

---

### Topic Exchange

Routes based on **routing key patterns** using wildcards.

- `*` matches exactly one word
- `#` matches zero or more words

```text
Routing key: 'order.europe.created'

Binding: 'order.#'        → matches (any order event)
Binding: 'order.*.created'→ matches (order from anywhere, created)
Binding: 'order.us.*'     → no match (europe ≠ us)
```

**Use for:** Flexible routing based on event categories. Best for complex event hierarchies.

---

### Fanout Exchange

Broadcasts to **all bound queues**, ignoring the routing key.

```js
// Producer — routing key is ignored
channel.publish('notifications', '', Buffer.from(message));

// All queues bound to this exchange get the message
channel.bindQueue('mobile-queue', 'notifications', '');
channel.bindQueue('email-queue', 'notifications', '');
channel.bindQueue('sms-queue', 'notifications', '');
```

**Use for:** Broadcasting events to multiple services (user logged in → log it, update last-seen, check suspicious activity).

---

### Headers Exchange

Routes based on **message headers** instead of routing key.

```js
channel.publish('tasks', '', Buffer.from(data), {
  headers: { 'content-type': 'image', 'region': 'us-east' }
});

// Bind queue that handles US image tasks
channel.bindQueue('us-image-queue', 'tasks', '', {
  'x-match': 'all',       // or 'any' for OR logic
  'content-type': 'image',
  'region': 'us-east'
});
```

---

### Summary

| Exchange | Routing Logic | Use Case |
|---|---|---|
| Direct | Exact routing key match | Specific task routing |
| Topic | Pattern matching (`*`, `#`) | Event categories |
| Fanout | All queues (broadcast) | Notifications, audit events |
| Headers | Message header attributes | Complex attribute routing |

---

## 79. Redis Data Structures Deep Dive

### What are the different Redis data structures and when do you use each?

Redis is not just a key-value cache. Its data structures solve specific problems efficiently.

---

### String — Cache, Counters, Locks

```js
await redis.set('session:abc', JSON.stringify(user), 'EX', 3600);
await redis.incr('page:home:views');     // atomic counter
await redis.setnx('lock:job', '1');      // distributed lock
```

---

### Hash — Object Storage

More memory-efficient than JSON strings when storing objects with many fields.

```js
await redis.hset('user:123', { name: 'Alice', email: 'alice@example.com', plan: 'pro' });
await redis.hget('user:123', 'email');    // single field
await redis.hgetall('user:123');          // all fields
await redis.hincrby('user:123', 'loginCount', 1);
```

---

### List — Queue, Recent Items

```js
await redis.lpush('notifications:user:123', JSON.stringify(notification));
await redis.ltrim('notifications:user:123', 0, 99);  // keep only 100 most recent
await redis.lrange('notifications:user:123', 0, 9);  // get latest 10
```

**FIFO queue:**

```js
await redis.rpush('job-queue', JSON.stringify(job));  // enqueue
const job = await redis.blpop('job-queue', 5);        // dequeue (block 5s if empty)
```

---

### Set — Unique Collections, Tags

```js
await redis.sadd('online-users', userId);
await redis.srem('online-users', userId);
await redis.sismember('online-users', userId);   // is user online?
await redis.scard('online-users');               // count of online users

// Intersection — friends who are online
await redis.sinter('user:123:friends', 'online-users');
```

---

### Sorted Set — Leaderboards, Rate Limiting

Every member has a **score**. Members ordered by score.

```js
// Leaderboard
await redis.zadd('leaderboard', score, userId);
await redis.zrevrange('leaderboard', 0, 9, 'WITHSCORES'); // top 10

// Rate limiting — sliding window
const now = Date.now();
await redis.zadd(`ratelimit:${userId}`, now, now.toString());
await redis.zremrangebyscore(`ratelimit:${userId}`, '-inf', now - 60000); // remove > 1min old
const count = await redis.zcard(`ratelimit:${userId}`);
```

---

### Streams — Event Log (Redis 5+)

```js
// Append to stream
await redis.xadd('order-events', '*', 'type', 'order.created', 'orderId', '123');

// Consumer group — multiple consumers share the work
await redis.xgroup('CREATE', 'order-events', 'processors', '$', 'MKSTREAM');
const messages = await redis.xreadgroup('GROUP', 'processors', 'worker-1', 'COUNT', 10, 'STREAMS', 'order-events', '>');
```

---

## 80. Node.js Performance Profiling

### How do you find and fix performance bottlenecks in Node.js?

---

### CPU Profiling (V8 Built-in)

```bash
# Run with CPU profiler
node --prof server.js

# Process the profile
node --prof-process isolate-*.log > profile.txt
```

Or use Chrome DevTools:

```bash
node --inspect server.js
# Open chrome://inspect → Profiler tab → record CPU profile
```

---

### Identify Event Loop Blocking

```js
const blocked = require('blocked-at');
blocked((ms, stack) => {
  console.error(`Event loop blocked for ${ms}ms`);
  console.error(stack.join('\n'));
}, { threshold: 100 }); // alert if blocked > 100ms
```

---

### Heap Profiling (Memory)

```bash
node --heap-prof server.js
# Generates *.heapprofile file
# Open in Chrome DevTools → Memory → Load heap profile
```

---

### clinic.js (Easiest Tool)

```bash
npx clinic doctor -- node server.js
# Automatically detects event loop delays, GC issues, I/O bottlenecks
# Generates visual report

npx clinic flame -- node server.js
# Generates flame graph — shows what's consuming CPU
```

---

### Key Metrics to Monitor

| Metric | Tool | Warning Threshold |
|---|---|---|
| Event loop lag | `perf_hooks`, `blocked-at` | > 100ms |
| Heap used | `process.memoryUsage()` | > 80% of max |
| GC pause | Prometheus `gc_duration_seconds` | p99 > 50ms |
| Handles/requests | `process._getActiveHandles()` | Growing unboundedly |

---

[Back to question list](#table-of-contents)

## 81. Database Deadlocks

### What is a database deadlock and how do you handle it?

A deadlock occurs when two or more transactions are each waiting for a lock held by the other — a circular wait.

---

### Example

```text
Transaction A:
  1. LOCK row in users WHERE id = 1
  2. (waiting for) LOCK row in accounts WHERE id = 1

Transaction B:
  1. LOCK row in accounts WHERE id = 1
  2. (waiting for) LOCK row in users WHERE id = 1

Result: Both wait forever → deadlock
```

---

### Detection & Resolution

Databases detect deadlocks automatically and abort one of the transactions (the "victim"). PostgreSQL chooses the cheapest to rollback.

```js
async function transferFunds(fromId, toId, amount) {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await db.transaction(async (trx) => {
        // Always lock in consistent order (lower ID first) to prevent deadlocks
        const [first, second] = fromId < toId ? [fromId, toId] : [toId, fromId];
        await trx.raw('SELECT 1 FROM accounts WHERE id = ? FOR UPDATE', [first]);
        await trx.raw('SELECT 1 FROM accounts WHERE id = ? FOR UPDATE', [second]);
        await trx('accounts').where('id', fromId).decrement('balance', amount);
        await trx('accounts').where('id', toId).increment('balance', amount);
      });
      return; // success
    } catch (err) {
      if (err.code === '40P01' && attempt < maxRetries - 1) { // PostgreSQL deadlock code
        await sleep(Math.random() * 100); // random backoff before retry
        continue;
      }
      throw err;
    }
  }
}
```

---

### Prevention

1. **Consistent lock ordering** — always lock resources in the same order (e.g., lower ID first)
2. **Short transactions** — hold locks for as little time as possible
3. **Avoid user input in transactions** — never wait for user interaction while holding a lock
4. **Use optimistic locking** for low-contention scenarios (see section 37)

---

## 82. REST API Design Best Practices

### What makes a well-designed REST API?

---

### Resource Naming

```text
# Use nouns, not verbs
GET  /orders          ✅  (not /getOrders)
POST /orders          ✅  (not /createOrder)
GET  /orders/123      ✅
PUT  /orders/123      ✅
DELETE /orders/123    ✅

# Nested resources
GET  /users/42/orders          ✅  (orders for user 42)
POST /users/42/orders          ✅
GET  /orders/123/items         ✅  (items in order 123)
```

---

### HTTP Status Codes

```text
200 OK              — successful GET, PUT, PATCH
201 Created         — successful POST (include Location header)
204 No Content      — successful DELETE
400 Bad Request     — validation error, malformed request
401 Unauthorized    — not authenticated
403 Forbidden       — authenticated but not authorized
404 Not Found       — resource doesn't exist
409 Conflict        — duplicate resource, version conflict
422 Unprocessable   — semantic validation failure
429 Too Many Requests — rate limited
500 Internal Error  — unexpected server error
```

---

### Response Shape Consistency

```js
// Success
{ "data": { "id": 1, "name": "Alice" } }

// Error
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid email", "details": [...] } }

// List with pagination
{
  "data": [...],
  "pagination": { "total": 150, "page": 2, "perPage": 20, "nextCursor": "abc123" }
}
```

---

### Filtering, Sorting, Pagination

```text
GET /orders?status=pending&userId=42       ← filter
GET /orders?sort=createdAt&order=desc      ← sort
GET /orders?limit=20&cursor=xyz            ← paginate
GET /orders?fields=id,total,status        ← sparse fieldsets
```

---

### Idempotency

```text
POST /orders  → not idempotent (can create duplicates)
POST /orders + Idempotency-Key: uuid → idempotent
PUT /orders/123 → idempotent (always results in same state)
```

---

## 83. Microservices vs Monolith vs Modular Monolith

### How do you choose the right architecture?

---

### Monolith

All code in one deployable unit. Single process, shared database.

```text
[Single Server]
├── Auth Module
├── Orders Module
├── Products Module
├── Payments Module
└── Single Database
```

**Pros:** Simple to develop, test, deploy. No network calls between modules. Easy to refactor.
**Cons:** Scales as a unit — can't scale just the orders service. Deployments affect the entire app. Can become hard to maintain ("big ball of mud").

**Use when:** Starting a new product. Small team. Unclear domain boundaries.

---

### Microservices

Each business capability is a separate service with its own database.

**Pros:** Independent deployments. Scale services independently. Technology flexibility per service. Team autonomy.
**Cons:** Distributed system complexity (network failures, distributed transactions, service discovery). Operational overhead (CI/CD per service, observability, latency). Hard to maintain data consistency.

**Use when:** Large team (multiple squads). Clear domain boundaries. Different scaling needs per service. High organizational autonomy.

---

### Modular Monolith (The Sweet Spot)

One deployable unit, but code is organized into strict modules with defined boundaries. Modules don't call each other's internals — they use explicit interfaces.

```text
[Single Server]
├── /modules/auth     → public interface only
├── /modules/orders   → public interface only
├── /modules/products → public interface only
└── Shared Database (schema per module)
```

**Pros:** Simple to deploy and test. Clear boundaries prevent coupling. Easy to extract to microservices later if needed.
**Cons:** Still scales as one unit. Team deployments are coupled.

**Use when:** Medium-sized team. Clear domains but not at microservices scale. Want the option to split later.

---

### Migration Path

```text
New product → Monolith
Growing → Modular Monolith
Scale/team needs → Extract hot modules to Microservices
```

---

## 84. Service Mesh

### What is a service mesh and when do you need one?

A service mesh is an infrastructure layer for handling **service-to-service communication** — it provides traffic management, security, and observability without changing application code.

---

### The Problem

In a microservices architecture, you need:

- mTLS between every service pair
- Circuit breaking on every client
- Retries on every outbound call
- Distributed tracing
- Traffic routing (canary, blue-green)

Implementing all of this in every service is duplicated work and error-prone.

---

### How a Service Mesh Works

Each service pod gets a **sidecar proxy** (Envoy) injected automatically. All traffic goes through the sidecar.

```text
Service A → [Envoy sidecar] ──network──► [Envoy sidecar] → Service B
               ↕                                ↕
           Control Plane (Istio)        Control Plane (Istio)
           (policies, config,            (certificates, metrics)
            circuit breakers)
```

The sidecar handles: mTLS, retries, circuit breaking, tracing, traffic shaping — **without any code changes**.

---

### Key Features

| Feature | Description |
|---|---|
| **mTLS** | Every service-to-service call is mutually authenticated and encrypted |
| **Traffic control** | Route 10% of traffic to v2 canary |
| **Retries & timeouts** | Configured centrally, not in code |
| **Circuit breaking** | Automatic, based on health |
| **Observability** | Metrics and traces for all service calls, zero code changes |
| **Authorization** | "Service A is allowed to call Service B's /orders endpoint" |

---

### When You Need a Service Mesh

- 10+ microservices in production
- Security compliance requires service-level authentication (mTLS)
- You need fine-grained traffic control (canary, mirroring)
- You want observability without instrumenting every service

**Tools:** Istio (most feature-rich), Linkerd (simpler, lighter), Consul Connect.

---

## 85. Idempotency in Event Consumers

### How do you handle duplicate messages in a message consumer?

Message queues guarantee **at-least-once delivery** — in failure scenarios, a message may be delivered more than once. Consumers must be idempotent.

---

### Why Duplicates Happen

```text
Consumer receives message → processes it → crash before ack
Queue redelivers the message → consumer processes it again
```

---

### Pattern 1: Idempotency Key in DB

```js
async function processOrderCreatedEvent(message) {
  const { eventId, orderId, userId } = message;

  // Check if already processed
  const alreadyProcessed = await db.processedEvents.findOne({ eventId });
  if (alreadyProcessed) {
    console.log(`Event ${eventId} already processed — skipping`);
    return;
  }

  // Process the event
  await createOrder({ orderId, userId });
  await sendConfirmationEmail(userId);

  // Mark as processed (atomic with the work, ideally in same transaction)
  await db.processedEvents.insertOne({ eventId, processedAt: new Date() });
}
```

---

### Pattern 2: Upsert Instead of Insert

```js
async function handleUserCreated(message) {
  // Upsert — safe to run multiple times
  await db.users.updateOne(
    { externalId: message.userId },
    { $setOnInsert: { externalId: message.userId, email: message.email, createdAt: new Date() } },
    { upsert: true }
  );
}
```

---

### Pattern 3: State Machine Check

If the entity has a state machine, check if the current state already reflects the event.

```js
async function handleOrderShipped(message) {
  const order = await Order.findById(message.orderId);
  if (order.status === 'shipped') return; // already in target state
  if (order.status !== 'paid') throw new Error(`Unexpected state: ${order.status}`);

  await Order.findByIdAndUpdate(message.orderId, { status: 'shipped' });
}
```

---

## 86. Schema Validation

### How do you validate incoming request data?

Never trust user input. Validate at the boundary — before it reaches your business logic.

---

### Zod (TypeScript-friendly, Modern)

```js
const { z } = require('zod');

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().int().min(18).max(120).optional(),
  role: z.enum(['admin', 'user', 'moderator']).default('user'),
  address: z.object({
    street: z.string(),
    city: z.string(),
    country: z.string().length(2)  // ISO country code
  }).optional()
});

// Middleware
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', details: result.error.issues }
      });
    }
    req.body = result.data; // typed and sanitized
    next();
  };
}

app.post('/users', validate(createUserSchema), createUserHandler);
```

---

### Joi (Classic, Widely Used)

```js
const Joi = require('joi');

const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/[A-Z]/).pattern(/[0-9]/).required(),
  confirmPassword: Joi.valid(Joi.ref('password')).required()
    .messages({ 'any.only': 'Passwords must match' })
});

const { error, value } = schema.validate(req.body, { abortEarly: false });
if (error) {
  return res.status(400).json({ errors: error.details.map(d => d.message) });
}
```

---

### What to Validate

| Field | Checks |
|---|---|
| Strings | min/max length, format (email, URL, UUID) |
| Numbers | min/max, integer vs float |
| Arrays | min/max items, item schema |
| Enums | only allowed values |
| Dates | valid ISO format, not in the past |
| Files | size, MIME type |

---

## 87. Backend Testing Strategies

### How do you structure tests for a Node.js backend?

---

### The Testing Pyramid

```text
         ┌────────────┐
         │  E2E Tests │  ← few, slow, expensive
         │  (Cypress, │    test the full system
         │  Playwright)│
        ┌──────────────────┐
        │ Integration Tests │ ← moderate, test services + real DB
        │  (Supertest,      │
        │   TestContainers) │
       ┌────────────────────────┐
       │      Unit Tests        │ ← many, fast, isolated
       │  (Jest, Vitest)        │   test pure logic
       └────────────────────────┘
```

---

### Unit Tests

Test pure business logic with no I/O:

```js
describe('calculateOrderTotal', () => {
  it('applies discount correctly', () => {
    const total = calculateOrderTotal([
      { price: 100, qty: 2 },
      { price: 50, qty: 1 }
    ], { discountPercent: 10 });
    expect(total).toBe(225); // 250 - 10%
  });
});
```

---

### Integration Tests

Test your API with a real database using **TestContainers**:

```js
const { MongoDBContainer } = require('@testcontainers/mongodb');
const request = require('supertest');

let container, app;

beforeAll(async () => {
  container = await new MongoDBContainer().start();
  process.env.MONGO_URI = container.getConnectionString();
  app = require('./app');
});

afterAll(async () => {
  await container.stop();
});

it('POST /users creates a user', async () => {
  const res = await request(app)
    .post('/users')
    .send({ name: 'Alice', email: 'alice@example.com' })
    .expect(201);
  expect(res.body.data.email).toBe('alice@example.com');
});
```

---

### E2E Tests

Test full user journeys through the real deployed system or staging.

---

### What to Test

| Layer | Test with |
|---|---|
| Business logic functions | Unit tests |
| API routes + DB | Integration tests (TestContainers) |
| Auth flows | Integration tests |
| Queue consumers | Integration tests with the real broker; mocks for isolated business logic. |
| Full user journeys | E2E (staging environment) |

---

## 88. Load Testing

### How do you load test a backend and what do you look for?

---

### Why Load Test

- Find the breaking point before users do
- Verify autoscaling kicks in at the right threshold
- Identify bottlenecks (DB, CPU, memory, external APIs)
- Validate SLOs under load

---

### k6 — Modern Load Testing Tool

```js
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // ramp up to 100 users
    { duration: '5m', target: 100 },   // stay at 100 for 5 min
    { duration: '2m', target: 500 },   // spike to 500
    { duration: '2m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p95<500'],     // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],     // < 1% failure rate
  }
};

export default function () {
  const res = http.get('https://api.myapp.com/products');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

```bash
k6 run load-test.js --out json=results.json
```

---

### What to Watch During Load Test

| Metric | What it tells you |
|---|---|
| Response time (p95, p99) | Latency under load |
| Error rate | When does the system start failing |
| CPU usage | Is the app CPU-bound? |
| Memory | Sustained growth may indicate retained data; investigate with profiles. |
| DB connection wait time | Need more pool connections? |
| Event loop lag | Is Node.js being blocked? |

---

### Types of Load Tests

| Test | Goal |
|---|---|
| **Load test** | Normal + peak traffic |
| **Stress test** | Find the breaking point |
| **Soak test** | Sustained load over hours (finds memory leaks) |
| **Spike test** | Sudden 10× traffic increase |

---

## 89. Security Headers

### What HTTP security headers should every API set?

---

### helmet.js (Recommended — Sets All Defaults)

```js
const helmet = require('helmet');
app.use(helmet()); // sets secure defaults for all headers below
```

---

### Key Headers

**Content-Security-Policy (CSP)**

```text
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com
```
Prevents XSS — restricts which scripts/resources the browser will load.

**Strict-Transport-Security (HSTS)**

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
Forces HTTPS — browsers will not load the site over HTTP after first visit.

**X-Content-Type-Options**

```text
X-Content-Type-Options: nosniff
```
Prevents MIME-type sniffing — browser won't try to "guess" the content type.

**X-Frame-Options**

```text
X-Frame-Options: DENY
```
Prevents clickjacking — page can't be embedded in an iframe.

**Referrer-Policy**

```text
Referrer-Policy: strict-origin-when-cross-origin
```
Controls what referrer info is sent with requests.

**Permissions-Policy**

```text
Permissions-Policy: geolocation=(), camera=(), microphone=()
```
Restricts browser features the page can use.

---

### For APIs (No HTML/Browser Clients)

For pure JSON APIs, HSTS and CORS config matter most. CSP is less relevant but harmless.

---

## 90. SQL Injection Prevention

### How do you prevent SQL injection in Node.js?

SQL injection is when a user input breaks out of the intended SQL query and executes arbitrary SQL.

---

### The Vulnerability

```js
// DANGEROUS — never do this
const userId = req.params.id; // attacker sends: "1 OR 1=1"
const query = `SELECT * FROM users WHERE id = ${userId}`;
// Becomes: SELECT * FROM users WHERE id = 1 OR 1=1
// Returns ALL users!
```

---

### Fix 1: Parameterized Queries (Always Use This)

```js
// pg (PostgreSQL)
const result = await client.query(
  'SELECT * FROM users WHERE id = $1 AND status = $2',
  [userId, 'active']
);

// MySQL
const [rows] = await pool.query(
  'SELECT * FROM users WHERE id = ? AND status = ?',
  [userId, 'active']
);
```

The database treats `$1` as data — it can never be interpreted as SQL.

---

### Fix 2: ORM / Query Builder

ORMs like Prisma, Knex, Sequelize, TypeORM use parameterized queries internally:

```js
// Prisma — safe by default
const user = await prisma.user.findFirst({
  where: { id: userId, status: 'active' }
});

// Knex — safe query builder
const users = await knex('users').where({ id: userId, status: 'active' });
```

---

### Dangerous Patterns Even with ORMs

```js
// STILL vulnerable — raw query with string interpolation
await prisma.$queryRaw`SELECT * FROM users WHERE name = '${name}'`; // vulnerable
await prisma.$queryRaw`SELECT * FROM users WHERE name = ${name}`;   // safe (tagged template)

// Knex — dangerous
knex.raw(`SELECT * FROM users WHERE name = '${name}'`); // vulnerable
knex.raw('SELECT * FROM users WHERE name = ?', [name]); // safe
```

---

[Back to question list](#table-of-contents)

## 91. NoSQL Injection Prevention

### How do MongoDB injection attacks work and how do you prevent them?

MongoDB injection occurs when user-controlled input is used as query operators.

---

### The Vulnerability

```js
// Attacker sends: { "email": { "$gt": "" }, "password": { "$gt": "" } }
const user = await User.findOne({
  email: req.body.email,    // { "$gt": "" }  ← MongoDB operator
  password: req.body.password
});
// This matches the first user with any email and password — auth bypass!
```

---

### Fix 1: Sanitize Input (express-mongo-sanitize)

```js
const mongoSanitize = require('express-mongo-sanitize');

// Remove $ and . from keys — strips MongoDB operators
app.use(mongoSanitize());
```

---

### Fix 2: Validate Input Types

```js
// Use Zod/Joi to ensure email is a string, not an object
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

// After validation, email and password are guaranteed to be strings
const { email, password } = loginSchema.parse(req.body);
```

---

### Fix 3: Use `$eq` Explicitly

```js
const user = await User.findOne({
  email: { $eq: req.body.email },  // $eq: forces a value comparison, not operator injection
  password: { $eq: req.body.password }
});
```

---

## 92. Dependency Security & Supply Chain

### How do you protect against vulnerable or malicious npm packages?

---

### Audit for Known Vulnerabilities

```bash
# Check for CVEs in your dependencies
npm audit

# Auto-fix safe updates
npm audit fix

# See detailed report
npm audit --json | jq '.vulnerabilities'
```

---

### Lock Your Dependencies

```bash
# Always commit package-lock.json or yarn.lock
# Use npm ci in CI/CD (installs exactly what's in lock file)
npm ci
```

---

### Minimize Attack Surface

```bash
# Only install production dependencies in Docker
npm ci --production
```

---

### Automated Scanning (CI/CD)

```yaml
# GitHub Actions — Snyk security scan
- name: Security scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high
```

---

### Supply Chain Attack Prevention

```bash
# Verify package integrity
npm install --ignore-scripts  # disable postinstall scripts (common attack vector)

# Use Subresource Integrity for CDN scripts
# <script src="..." integrity="sha384-..." crossorigin="anonymous">

# Consider private registry (Verdaccio, npm Enterprise) for critical apps
```

---

### Key Practices

| Practice | Why |
|---|---|
| Run `npm audit` in CI | Catch CVEs before deployment |
| Pin dependencies | `"express": "4.18.2"` not `"^4.18.2"` |
| Minimize dependencies | Every package is a potential attack vector |
| Review new packages | Check download count, maintenance, owner |
| Monitor with Snyk/Dependabot | Automated alerts for new CVEs |

---

## 93. Twelve-Factor App Principles

### What are the Twelve-Factor App principles and why do they matter?

The [12-Factor App](https://12factor.net/) is a methodology for building software-as-a-service apps that are portable, scalable, and maintainable.

---

| Factor | Principle | Practical Example |
|---|---|---|
| **1. Codebase** | One repo, many deploys | Same code → dev/staging/prod via config |
| **2. Dependencies** | Explicit declaration | `package.json`, never rely on system packages |
| **3. Config** | Store in environment | `process.env.DB_URL`, not hardcoded |
| **4. Backing services** | Treat as attached resources | DB, Redis, S3 — swappable via config |
| **5. Build/Release/Run** | Strict separation | Build docker image → tag release → run |
| **6. Processes** | Stateless and share-nothing | No in-memory sessions, no local file storage |
| **7. Port binding** | Export via port | `app.listen(process.env.PORT)` |
| **8. Concurrency** | Scale via process model | Horizontal scaling, multiple processes |
| **9. Disposability** | Fast startup, graceful shutdown | < 5s startup, SIGTERM drains connections |
| **10. Dev/Prod parity** | Keep environments similar | Docker, same DB in dev and prod |
| **11. Logs** | Treat as event streams | Write to stdout, external collector aggregates |
| **12. Admin processes** | One-off tasks as processes | Migrations, data fixes as separate commands |

---

### Logs as Streams (Factor 11)

```js
// Don't manage log files — write to stdout
console.log(JSON.stringify({ level: 'info', message: 'Server started', port: 3000 }));
// Let Kubernetes/Docker/systemd collect and route logs
```

---

## 94. gRPC Streaming Patterns

### What are the four gRPC communication patterns?

---

### 1. Unary (Request/Response)

Standard call — one request, one response. Same as REST.

```protobuf
rpc GetUser (UserRequest) returns (User);
```

---

### 2. Server-Side Streaming

Client sends one request, server streams back multiple responses.

```protobuf
rpc ListOrders (ListRequest) returns (stream Order);
```

```js
// Server
call.on('data', (req) => {
  orders.forEach(order => call.write(order));
  call.end();
});

// Client
const stream = client.listOrders({ userId: '123' });
stream.on('data', (order) => console.log(order));
stream.on('end', () => console.log('All orders received'));
```

**Use for:** Large result sets, real-time feeds (stock prices, live scores).

---

### 3. Client-Side Streaming

Client streams multiple requests, server responds once.

```protobuf
rpc UploadEvents (stream Event) returns (UploadResponse);
```

```js
// Client sends a stream of events
const call = client.uploadEvents((err, response) => {
  console.log(`Uploaded ${response.count} events`);
});
events.forEach(event => call.write(event));
call.end();
```

**Use for:** Batch uploads, telemetry, log ingestion.

---

### 4. Bidirectional Streaming

Both client and server send streams simultaneously.

```protobuf
rpc Chat (stream Message) returns (stream Message);
```

```js
const call = client.chat();
call.on('data', (msg) => console.log('Received:', msg.text));

// Send messages independently
call.write({ text: 'Hello' });
// ... later
call.write({ text: 'How are you?' });
call.end();
```

**Use for:** Real-time chat, collaborative editing, live game state sync.

---

## 95. Data Serialization Formats

### What are the differences between JSON, Protocol Buffers, and MessagePack?

---

### JSON

- Human-readable text format
- No schema enforcement
- Supported everywhere
- Large payload size (field names repeated in every record)

```json
{ "id": 123, "name": "Alice", "email": "alice@example.com", "score": 98.5 }
// ~65 bytes
```

---

### Protocol Buffers (Protobuf)

- Binary format with a schema (.proto file)
- 3–10x smaller than JSON
- 5–10x faster to serialize/deserialize
- Strongly typed

```protobuf
message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
  float score = 4;
}
```

Same data above: **~20 bytes** in protobuf vs 65 in JSON.

**Tradeoff:** Not human-readable. Requires schema. Harder to debug.

---

### MessagePack

- Binary version of JSON — no schema needed
- 2–3x smaller than JSON
- Faster than JSON, slower than Protobuf
- Easy drop-in replacement for JSON APIs

```js
const msgpack = require('msgpack-lite');
const encoded = msgpack.encode({ id: 123, name: 'Alice' }); // binary Buffer
const decoded = msgpack.decode(encoded);
```

---

### Comparison

| | JSON | Protobuf | MessagePack |
|---|---|---|---|
| Human-readable | Yes | No | No |
| Schema required | No | Yes | No |
| Size | Large | Smallest | Medium |
| Speed | Medium | Fastest | Fast |
| Debug friendliness | Easy | Hard | Hard |
| Use case | Public APIs, debugging | Internal gRPC services | High-throughput APIs |

---

## 96. Observability — The Three Pillars

### What are the three pillars of observability and how do they work together?

---

### 1. Logs — What Happened

Discrete events with context. Tell you exactly what occurred at a specific time.

```js
logger.error({
  requestId: 'req-abc',
  userId: '123',
  error: 'Payment declined',
  amount: 150,
  provider: 'stripe'
}, 'Payment failed');
```

**Stack:** Pino/Winston → Fluentd → Elasticsearch/Loki → Kibana/Grafana

---

### 2. Metrics — How Is the System Behaving

Numeric measurements over time. Great for dashboards and alerts.

```js
// Counters, gauges, histograms
const orderCounter = new client.Counter({ name: 'orders_created_total', labelNames: ['status'] });
orderCounter.inc({ status: 'success' });
```

**Stack:** Prometheus → Grafana

---

### 3. Traces — Why Is It Slow

Shows the full path of a request through multiple services with timing for each step.

```js
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('order-service');

async function createOrder(data) {
  const span = tracer.startSpan('createOrder');
  try {
    span.setAttributes({ userId: data.userId, itemCount: data.items.length });

    const dbSpan = tracer.startSpan('saveToDatabase', { parent: span });
    await db.orders.save(data);
    dbSpan.end();

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (err) {
    span.recordException(err);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw err;
  } finally {
    span.end();
  }
}
```

**Stack:** OpenTelemetry → Jaeger/Zipkin/Tempo → Grafana

---

### How They Work Together

```text
Alert fires: P99 latency spike (Metrics)
  → Find the affected requests (Logs: requestId filter)
    → Trace one slow request (Traces: see which service/DB is slow)
      → Fix the bottleneck
```

**You need all three.** Logs alone are too verbose to find patterns. Metrics alone don't tell you *why*. Traces alone miss system-wide patterns.

---

## 97. Event-Driven Architecture Patterns

### What are the key patterns in event-driven systems?

---

### Event Notification

Services publish lightweight events ("something happened"). Consumers decide what to do.

```text
Order Service → publishes: { type: 'order.created', orderId: '123' }
  ← Email Service: fetches order details, sends confirmation
  ← Inventory Service: fetches order details, reserves stock
```

**Decoupled.** Order Service doesn't know or care about consumers.
**Downside:** Hard to understand what happens when an event is published — you must search all consumers.

---

### Event-Carried State Transfer

Event contains all the data consumers need — no need to call back.

```text
Order Service → publishes: {
  type: 'order.created',
  orderId: '123',
  userId: '456',
  items: [...],
  total: 150,
  userEmail: 'alice@example.com'  // ← included so email service doesn't need to fetch user
}
```

**Pros:** Consumers are self-sufficient, more resilient.
**Cons:** Events become large. Schema changes affect all consumers.

---

### Event Sourcing (see section 40)

Events are the source of truth. State is derived by replaying events.

---

### CQRS + Events (see section 18)

Write side publishes events. Read side builds optimized projections from events.

---

### Choreography vs Orchestration (see section 19)

- **Choreography:** Services react to events independently (decentralized)
- **Orchestration:** A central saga orchestrator directs the workflow (centralized)

---

### Dead Letter Queue Pattern

Events that can't be processed go to a DLQ for investigation and replay.

```text
Queue → Consumer → fails after 3 retries → Dead Letter Queue
                              ↑
                      Ops team investigates → fixes code → replays DLQ
```

---

## 98. Node.js Cluster with PM2

### How do you use PM2 to cluster a Node.js app in production?

**PM2** is a production process manager for Node.js. It handles clustering, restarts, log management, and monitoring.

---

### Basic Setup

```bash
# Install PM2
npm install -g pm2

# Start in cluster mode — one process per CPU core
pm2 start server.js --name "api" -i max

# With TypeScript
pm2 start dist/server.js --name "api" -i max
```

---

### PM2 Ecosystem Config File

```js
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api-server',
    script: './dist/server.js',
    instances: 'max',        // or a number: 4
    exec_mode: 'cluster',    // cluster mode — shares port
    watch: false,            // disable in production
    max_memory_restart: '1G', // restart if memory exceeds 1GB
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};

// Start
// pm2 start ecosystem.config.js --env production
```

---

### Key PM2 Commands

```bash
pm2 list                    # show all processes
pm2 logs api-server         # stream logs
pm2 monit                   # real-time CPU/memory monitor
pm2 reload api-server       # zero-downtime reload (sends SIGUSR2)
pm2 restart api-server      # hard restart
pm2 delete api-server       # remove process
pm2 save && pm2 startup     # persist across server reboot
```

---

### Zero-Downtime Reload

PM2's `reload` command does a **graceful rolling restart** — it sends SIGUSR2 to each worker one at a time, waits for it to finish handling requests, then starts the next one.

```bash
pm2 reload api-server
# Process 1: SIGUSR2 → drain → restart with new code
# Process 2: SIGUSR2 → drain → restart with new code
# ... no downtime
```

---

## 99. API Gateway Advanced Patterns

### What are the advanced patterns an API Gateway enables?

Beyond basic routing (section 4), modern API Gateways support sophisticated patterns.

---

### Request Aggregation (API Composition)

Combine multiple microservice calls into a single response for the client.

```text
Client: GET /dashboard
  └── API Gateway:
        ├── GET /users/123      → { user data }
        ├── GET /orders/recent  → { recent orders }
        └── GET /notifications  → { notifications }
        → Merges into one response
```

Reduces round trips for mobile clients with slow connections.

---

### Backend for Frontend (BFF)

A specialized API Gateway per client type (mobile, web, third-party). Each BFF is optimized for its client's needs.

```text
Mobile App → BFF-Mobile  → aggregates, compresses, sends minimal data
Web App    → BFF-Web     → full data, richer responses
Partner    → BFF-Partner → rate-limited, versioned, authenticated differently
```

---

### Request Transformation

Modify requests/responses at the gateway level.

```text
Client sends:    { "user_name": "Alice" }    (snake_case)
Gateway rewrites: { "userName": "Alice" }    (camelCase — what backend expects)
```

---

### API Mocking / Circuit Breaker at Gateway

```text
If /payment-service is down:
  Gateway returns: { error: 'Payment service unavailable', canRetry: true }
  (instead of cascading failure through to client)
```

---

### GraphQL Federation

Multiple GraphQL services expose a partial schema. The Gateway stitches them into one unified schema.

```text
Product Service: type Product { id, name, price }
Review Service:  type Product { reviews: [Review] }

Gateway federation: type Product { id, name, price, reviews: [Review] }
```

---

## 100. System Design: URL Shortener

### How would you design a URL shortening service like bit.ly?

This is a classic system design question. Walk through requirements, components, data model, and trade-offs.

---

### Requirements

**Functional:**

- Shorten a long URL → return a short code (e.g., `short.ly/abc123`)
- Redirect short code → original URL
- Custom aliases (optional)
- Analytics: click count, location, device (optional)

**Non-Functional:**

- 100M URLs created/day, 10B redirects/day
- Redirect latency < 10ms
- High availability (99.99%)
- Short codes: 6-8 characters

---

### Short Code Generation

**Approach: Base62 encoding of an auto-incremented ID**

```js
const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function toBase62(num) {
  let result = '';
  while (num > 0) {
    result = CHARS[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result.padStart(6, 'a'); // always 6 chars
}

// 62^6 = 56 billion unique codes — enough headroom
```

---

### System Architecture

```text
Client
  │
  ▼
Load Balancer
  │
  ├── URL Creation Service
  │       │
  │   PostgreSQL (id AUTO_INCREMENT, long_url, short_code, created_at)
  │   + ID generator (Snowflake or DB sequence)
  │
  └── Redirect Service (read-heavy — 10B/day)
          │
      Redis Cache (short_code → long_url, TTL = 24h)
          │ (cache miss only)
      PostgreSQL / DynamoDB read replica
```

---

### Data Model

```sql
CREATE TABLE urls (
  id         BIGSERIAL PRIMARY KEY,  -- used to generate short code
  short_code VARCHAR(8) UNIQUE NOT NULL,
  long_url   TEXT NOT NULL,
  user_id    BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX idx_urls_short_code ON urls(short_code); -- critical for redirect lookup
```

---

### Redirect Flow

```text
1. Request: GET /abc123
2. Check Redis: hit? → 301 redirect (< 1ms)
3. Cache miss: query DB → cache it → 301 redirect (< 10ms)
4. Background: async log click event to analytics queue (Kafka)
```

---

### Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| **301 vs 302** | 302 (temporary) | 301 is cached by browser — we lose click analytics |
| **Short code** | Base62 of DB ID | Simple, no collision, predictable length |
| **Storage** | PostgreSQL + Redis | Relational for consistency, Redis for speed |
| **Analytics** | Async via Kafka | Don't slow down the redirect for logging |
| **Custom aliases** | Separate table or column | Store alongside auto-generated codes |
| **Expiry** | `expires_at` column + TTL in Redis | Clean up expired URLs with background job |

---

### Scaling Considerations

- **Redis cluster** for the redirect cache — 10B redirects/day = ~115K req/s
- **Database read replicas** — redirect service reads only from replicas
- **CDN** for the redirect service — can cache 301/302 responses at the edge
- **Rate limiting** on URL creation — prevent abuse

---

## Key Takeaways

Use this table as a reminder after studying the explanations. Each entry is a starting point for reasoning, not a universal implementation rule.

| Topic | The Real Answer |
|---|---|
| Redis caching | cache-aside, TTL, invalidation strategy |
| Message queues | ack, DLQ, idempotency, persistence |
| Service failures | circuit breaker, retry, fallback, timeout |
| JWT logout | blacklist, short TTL + refresh, version counter |
| WebSocket scaling | Redis adapter, pub/sub across servers |
| Indexing | query-driven, cardinality, compound prefix rule |
| Event loop | microtasks first, phase order, avoid blocking |
| Queue vs Pub/Sub | persistence, delivery guarantees, consumer groups |
| Scaling | stateless apps → horizontal; databases → vertical first |
| Replication | read replicas, replication lag, read-your-writes |
| Sharding | hash vs range, resharding cost, avoid premature sharding |
| CQRS | separate read/write models, eventual consistency on read side |
| Saga | compensating transactions, choreography vs orchestration |
| Outbox pattern | commit data and event together; retry publication and deduplicate consumers |
| Idempotency | idempotency keys in Redis, safe retries |
| Pagination | cursor-based for feeds; offset for admin tables |
| Real-time | SSE for server→client; WebSocket for bidirectional |
| Concurrency | Cluster for HTTP servers; Worker Threads for CPU work |
| Memory leaks | event listeners, growing maps, uncleaned intervals |
| Background jobs | BullMQ: retries, delay, cron, rate limiting |
| Consistent hashing | minimal remapping when nodes added/removed |
| Service discovery | Kubernetes DNS simplifies this in modern stacks |
| API versioning | URI path is most practical; document deprecation windows |
| Structured logging | JSON logs + correlation IDs to trace across services |
| gRPC vs REST | gRPC for internal services; REST for public APIs |
| Load balancing | least connections for variable workloads |
| Connection pooling | reuse connections; size against database capacity and measured wait time |
| Rate limiting | token bucket for APIs; leaky bucket to protect downstream |
| Isolation levels | read committed default; serializable for financial ops |
| Optimistic locking | version field — no blocking, retry on conflict |
| Race conditions | atomic DB ops, transactions, or distributed locks |
| Distributed locks | Redis SET NX + TTL + Lua release; Redlock for multi-node |
| Event sourcing | append-only event log, derive state by replaying |
| 2PC | avoid in microservices — use Saga instead |
| Cache stampede | mutex lock, probabilistic early expiry, stale-while-revalidate |
| SQL vs NoSQL | SQL for relationships; NoSQL for scale, flexibility, simple access patterns |
| Normalization | normalize first; denormalize only for measured performance need |
| Query optimization | EXPLAIN, covering indexes, avoid SELECT * |
| DB migrations | expand-contract pattern; never lock large tables |
| Aggregation pipeline | $match first, $project early, allowDiskUse for large data |
| Node.js streams | pipe() handles backpressure; stream large files, never buffer all |
| Error handling | operational vs programmer errors; global handler; asyncHandler wrapper |
| Middleware | ordered pipeline; router-level for route groups |
| Dependency injection | pass deps as args; enables mocking; factory functions |
| Repository pattern | DB logic in one place; business logic stays clean |
| OAuth 2.0 / OIDC | authorization code + PKCE for SPAs; OIDC adds identity (id_token) |
| RBAC vs ABAC | RBAC for simple roles; ABAC for own-resource and fine-grained |
| CORS | whitelist origins; never * with credentials |
| File uploads | presigned URLs — client uploads directly to S3 |
| Webhooks | HMAC signature, retries, idempotency key, delivery log |
| HTTP/2 vs HTTP/3 | HTTP/2: multiplexing; HTTP/3: QUIC eliminates TCP HOL blocking |
| TLS | forward secrecy, certificate chain, TLS 1.3 default |
| CDN | edge caching; Cache-Control headers control what/how long |
| Compression | gzip for dynamic; Brotli pre-compressed for static |
| Blue-green vs canary | blue-green: instant rollback; canary: real user validation |
| Zero-downtime deploy | graceful shutdown + readiness probe + expand-contract migrations |
| HPA | scale on CPU/memory/custom metrics; min/max replicas |
| Secrets | env vars baseline; Vault for dynamic, rotating, audited secrets |
| Container security | non-root, minimal image, read-only FS, drop all capabilities |
| Monitoring | p95/p99 latency, error rate, traffic, saturation |
| SLO/SLA/Error budget | define measurement windows and agree on release policies before incidents |
| Chaos engineering | inject failures in staging before they hit production |
| Backup | test restores; 3-2-1 rule; PITR for PostgreSQL |
| Encryption | TLS in transit; AES-256-GCM at application layer; bcrypt for passwords |
| Multitenancy | separate DB (isolation) vs shared table + RLS (cost) |
| Feature flags | ship code before enabling; gradual rollout; remove after full rollout |
| Soft delete | deletedAt field; hard purge old records; consider GDPR |
| Batch processing | cursor-based chunks; bulkWrite; throttle to avoid DB overload |
| GraphQL DataLoader | batch + deduplicate per request; new instance per request |
| Serverless | event-driven tasks, spiky traffic; avoid for long-running/stateful |
| RabbitMQ exchanges | direct=exact; topic=pattern; fanout=broadcast; headers=attributes |
| Redis data structures | string, hash, list, set, sorted set, streams — each solves a specific problem |
| Node.js profiling | clinic.js, --inspect heap snapshot, blocked-at for event loop |
| Deadlocks | lock in consistent order; short transactions; retry on deadlock code |
| REST design | nouns, correct status codes, consistent response shape |
| Monolith vs microservices | modular monolith is the sweet spot for most teams |
| Service mesh | sidecars handle mTLS, retries, tracing — no app code changes |
| Event consumer idempotency | idempotency key in DB; upsert; state machine check |
| Schema validation | Zod/Joi at the boundary; never trust user input |
| Backend testing | unit → integration (TestContainers) → E2E pyramid |
| Load testing | k6; find breaking point, verify autoscaling, validate SLOs |
| Security headers | helmet.js sets all; CSP prevents XSS; HSTS enforces HTTPS |
| SQL injection | parameterized queries always; ORMs are not magic — raw still vulnerable |
| NoSQL injection | sanitize $ and . from keys; validate types with schema |
| Supply chain | npm audit in CI; lock file; minimize dependencies |
| 12-factor app | stateless processes, config from env, logs to stdout |
| gRPC streaming | unary/server-stream/client-stream/bidirectional — pick by data flow |
| Serialization | JSON public; Protobuf internal (3–10× smaller); MessagePack drop-in |
| Observability | logs=what happened; metrics=how behaving; traces=why slow |
| Event-driven patterns | notification vs state-transfer; choreography vs orchestration |
| PM2 clustering | cluster mode, one process per core, zero-downtime reload |
| API Gateway patterns | BFF, request aggregation, transformation, GraphQL federation |
| URL shortener | Base62 ID, Redis cache, 302 redirect, async analytics via Kafka |

## Practice Check

Choose a question you found difficult and build a small example. Record the normal behavior, one failure case, and the evidence you would use to debug it.

[Back to question list](#table-of-contents) · [Backend learning guide](../readme.md)
