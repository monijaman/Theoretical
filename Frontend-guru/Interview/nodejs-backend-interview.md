# Node.js Backend Interview — Deep Dive

> These questions were asked in a real Node.js backend interview. Each answer goes beyond surface-level — covering *how it works*, *how it scales*, and the *trade-offs*.

---

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
15. [Bonus — Topics Interviewers Also Expect](#15-bonus--topics-interviewers-also-expect)

---

## 1. Message Queues & Reliability

### What happens if your RabbitMQ consumer crashes before processing a message?

By default, if a consumer crashes **after** receiving a message but **before** acknowledging it, RabbitMQ will **re-queue** the message and deliver it to another available consumer.

**How acknowledgments work:**

```
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

```
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

```
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

```
Write → DB + Redis (simultaneously)
Read  → always from Redis
```

**Trade-off:** Higher write latency, but reads are always fast and consistent.

---

### Write-Behind (Write-Back)

Write to Redis first, then sync to DB **asynchronously**.

```
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

```
Service A ──HTTP/gRPC──► Service B
           ◄─────────────
```

**Problem:** If Service B is slow, Service A is blocked. If B is down, A fails.

---

### Asynchronous (Event-Driven)

Services communicate through a **message broker** (RabbitMQ, Kafka). They don't wait.

```
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

```
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

```
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

```
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

```
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

```
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

```
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

```
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

```
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

```
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

```
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
```
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

## 15. Bonus — Topics Interviewers Also Expect

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

```
GET /health  → { status: 'ok' }            (liveness)
GET /ready   → { status: 'ok', db: 'ok' }  (readiness — checks dependencies)
```

---

## Key Takeaways

> It's not about **what you use** — it's about **how it works**, **how it scales**, and the **trade-offs**.

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
