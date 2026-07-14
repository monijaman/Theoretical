# Database Connection Pooling
[← Back to index](../readme.md)

## Why it's asked

Connection pooling questions show up because they sit at the intersection of two things senior candidates are expected to know cold: why a "just open more connections" instinct breaks down at scale, and how modern deployment shapes (microservices fan-out, serverless) make the naive approach actively dangerous. It's also one of the few topics where the failure mode (connection exhaustion) is something most engineers have actually seen in production, so interviewers use it to probe real experience, not textbook recall.

## Why opening a connection is expensive

A "connection" to Postgres/MySQL isn't just a socket — establishing one does real work every time:

```
1. TCP handshake                    (SYN / SYN-ACK / ACK)           ~1 RTT
2. TLS handshake (if enabled)       (cert exchange, key negotiation) ~1-2 RTT
3. Database auth                    (password/cert check, privilege load)
4. Server-side process/thread fork  (Postgres forks a backend process per connection)
5. Session state init               (search_path, prepared statement cache, temp buffers)
```

On Postgres specifically, each connection is a full OS process (not a lightweight thread), so a spike in connections is a spike in OS process creation, memory (each backend reserves `work_mem`-scale buffers), and context-switching overhead on the server. This is why Postgres has a hard practical ceiling in the low thousands of concurrent connections even on large hardware, while a pool of a few hundred well-reused connections can serve far more application throughput than that ceiling would suggest.

A connection pool amortizes steps 1-5 across many logical queries: open the connection once, keep it alive, and hand it out/return it per request instead of per query.

```
Without pooling: request → open conn (5 steps above) → query → close conn   [repeated every request]
With pooling:     request → borrow conn from pool → query → return conn to pool
                                     (steps 1-5 paid once, at pool startup)
```

## Sizing the pool

Bigger is not better — a pool sized larger than the database can actually execute concurrently just means more queries queued *inside* the database's own scheduler/lock manager instead of in the pool's queue, with worse visibility and worse cache behavior. The commonly cited starting heuristic (from PostgreSQL's own connection pooling guidance, popularized by "PgBouncer's" author):

```
pool_size ≈ (core_count × 2) + effective_spindle_count
```

For an all-SSD, 8-core database host: `(8 × 2) + 1 ≈ 17` — often rounded to ~20. The intuition: once you have enough workers to keep every core busy plus a little slack for I/O wait, adding more connections just adds context-switching and lock contention rather than more real parallelism. This is a starting point, not a law — the actual right number depends on how much of each query is CPU-bound vs waiting on I/O; verify empirically (increase pool size while watching p99 latency and CPU/lock-wait metrics, stop when latency stops improving).

Little's Law gives the more rigorous version: `L = λ × W` — the number of connections in use (`L`) equals the request arrival rate (`λ`) times the average time each connection is held (`W`). If your service does 2,000 queries/sec and each query holds a connection for 5ms, you need `2000 × 0.005 = 10` connections in steady state — headroom above that absorbs variance, but an order-of-magnitude-larger pool just hides a slow-query problem instead of fixing it.

## PgBouncer: session vs transaction pooling

PgBouncer sits between the application and Postgres as a lightweight proxy that multiplexes many client connections onto a much smaller pool of real database connections.

```
App instances (hundreds)  →  PgBouncer (holds a small real pool)  →  Postgres (tens of connections)
     many idle "connections"        actually-busy connections reused across clients
```

- **Session pooling**: a client is assigned a real database connection for the lifetime of its session (until it disconnects) — safest, supports all Postgres features (session-level settings, `LISTEN/NOTIFY`, prepared statements), but doesn't reduce real connection count much since one client session still pins one real connection.
- **Transaction pooling**: a real connection is assigned only for the duration of a single transaction, then returned to the pool the instant the transaction commits/rolls back, even if the client "connection" stays open — this is where the big multiplexing win comes from (thousands of app-side connections served by tens of real ones), at the cost of losing session-level state guarantees: you cannot rely on `SET` variables, advisory locks, or prepared statements surviving across transactions, since the next transaction on that client connection might land on a different real connection.

```
Transaction pooling timeline:
Client A: BEGIN → query → COMMIT   [real conn #1 borrowed, then freed]
Client B: BEGIN → query → COMMIT   [real conn #1 reused for B, immediately after A]
Client A: BEGIN → query → COMMIT   [might get real conn #2 this time, not #1]
```

Most production PgBouncer deployments use transaction pooling because it's where the actual capacity win lives; the trade-off is that the application must avoid session-scoped features (or the pooler must be configured with those features disabled/warned against).

## Connection exhaustion in a microservices fan-out

In a monolith, one process pool talks to one database, and sizing is straightforward. In microservices, the failure mode compounds: if 50 service instances each open a pool of 20 connections to the same Postgres primary, that's 1,000 connections against a database whose practical ceiling might be a few hundred — and this scales with the number of service *instances* (which autoscale independently of the database), not with actual database capacity.

```
Service A (20 pods × 20 conns) = 400
Service B (15 pods × 20 conns) = 300
Service C (10 pods × 20 conns) = 200
                                 ─────
                          Total = 900 connections requested
                          Postgres ceiling ≈ 300-500
                                 → new connections rejected,
                                   healthy requests start failing
```

This is why a shared connection pooler (PgBouncer as a centralized layer, not one pool per service) or a hard per-service connection cap enforced independently of pod count is standard practice once you're past a handful of services sharing a database.

## Serverless connection storms

AWS Lambda (and other FaaS) makes this worse structurally: each concurrent Lambda *execution environment* can hold its own connection, and Lambda can scale to hundreds or thousands of concurrent invocations in seconds during a traffic spike — each one potentially opening a fresh connection because there's no long-lived process to keep a pool warm across invocations the way a traditional server does.

```
Traffic spike → Lambda scales to 2,000 concurrent executions
             → each tries to open a DB connection
             → RDS Postgres (max_connections ≈ 500) rejects the rest
             → cascading timeouts / "too many connections" errors
```

Standard fixes:
- **RDS Proxy** (or Aurora's equivalent) — a managed connection pooler sitting between Lambda and RDS, multiplexing thousands of Lambda-side connections onto a small, stable pool of real database connections, and smoothing over Lambda's connect/disconnect churn.
- **PgBouncer as a sidecar/standalone service** — same idea, self-managed, often placed in front of the database for both Lambda and non-Lambda callers.
- **Keeping the pool outside the handler's per-invocation scope** (reusing a connection across warm invocations of the same execution environment) — reduces but doesn't eliminate the problem, since cold starts still open fresh connections and the environment count itself scales with load.

## Trade-offs summary

| Approach | Reduces connection count? | Session features (advisory locks, `SET`, prepared stmts)? | Best fit |
|---|---|---|---|
| App-level pool only (e.g., HikariCP) | Within one process only | Yes | Monolith / single service |
| PgBouncer, session pooling | Modest | Yes | Need session features, want some multiplexing |
| PgBouncer, transaction pooling | Large | No (mostly) | Microservices fan-out against one DB |
| RDS Proxy | Large, serverless-aware | Partial (IAM auth, some pinning support) | Lambda / serverless workloads |

## Common interview follow-ups

**Q: Why not just raise `max_connections` on the database instead of pooling?**
Because each additional real connection costs the database server memory and process/thread overhead even when idle, and past the point where connections exceed available CPU cores, throughput degrades from context-switching and lock contention rather than improving — pooling fixes the actual bottleneck (concurrent execution capacity), raising the ceiling just delays the same failure at a higher number.

**Q: What breaks if you use transaction pooling with an ORM that relies on session state?**
Session-scoped features like `SET search_path`, temp tables, advisory locks, or unnamed prepared statements can silently misbehave, because the next statement in the same client session might execute over a *different* real backend connection that never saw the earlier `SET` — this shows up as intermittent, hard-to-reproduce bugs rather than a clean error.

**Q: How do you size a pool for a service with wildly bursty traffic?**
Use Little's Law against steady-state and p99 burst rate to get a floor and ceiling, but treat the pool as a backpressure mechanism, not just a capacity number — a saturated pool should queue and shed load (with timeouts) rather than let unlimited requests pile up waiting for a connection, protecting the database from the burst instead of just passing it through.

**Q: Why does Lambda make this categorically worse instead of just "more of the same problem"?**
Because concurrency scales per-invocation almost instantly and independently of any pool the application controls — a traditional service's connection count is bounded by its (slowly autoscaling) instance count times a fixed pool size, while Lambda's execution environment count can jump by hundreds within seconds, each a fresh potential connection with no shared pool to coordinate through unless you add one (RDS Proxy/PgBouncer) outside the function itself.

**Q: How would you detect connection exhaustion before it takes the system down?**
Monitor the database's active/idle connection count against `max_connections` as a percentage (alert well before 100%), track application-side pool wait time and pool-checkout timeouts (a rising wait time is the leading indicator before outright rejection), and load-test the actual fan-out (number of instances × pool size) against real database limits before relying on autoscaling in production.

## Related topics
- [Database Replication](database-replication.md)
- [Database Sharding](database-sharding.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
