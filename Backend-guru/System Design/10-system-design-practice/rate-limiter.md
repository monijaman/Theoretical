# Design a Rate Limiter
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Enforce configurable request limits per dimension: per user, per API key, per IP, per (API key + endpoint).
- Support tiers (e.g. free: 100 req/min, pro: 2,000 req/min, enterprise: 100,000 req/min) with burst allowance above the sustained rate.
- Reject over-limit requests with `429 Too Many Requests` and standard headers (`X-RateLimit-Limit`, `-Remaining`, `-Reset`, `Retry-After`).
- Admin API to create/update/delete limit rules dynamically, without redeploying the gateway.
- Support both a global gateway-wide limit (protect the backend as a whole) and per-client limits (fairness between tenants).

**Non-functional**
- Adds negligible latency to the request path: target < 1ms p99 added overhead.
- Correct enough under a fleet of concurrently-running gateway nodes checking the *same* client's limit — no significant over-admission versus the configured limit.
- The limiter itself must not become a single point of failure for the whole platform: if the rate-limiting backend is unreachable, fail open (let traffic through) by default, with fail-closed as an opt-in per sensitive endpoint.
- Horizontally scalable to the same order of magnitude as total gateway traffic.
- Approximate correctness (small, bounded overshoot under a burst of concurrent nodes) is an acceptable trade for latency and availability — this is explicitly not a payments-grade exactness problem.

**Assumptions**
- API gateway fleet: 300 nodes across 3 regions, handling 1M requests/sec in aggregate at peak.
- 2M distinct API keys/clients, default limit 1,000 req/min, enterprise keys up to 100,000 req/min.
- Redis (or equivalent in-memory store) available as a shared, low-latency backing store per region.

## 2. Capacity Estimation

**Traffic**
- 1M req/sec in aggregate → every one of those requests needs a rate-limit decision, so the limiter's decision throughput must also handle **~1M ops/sec** at peak, plus retries.
- Naively, that's 1M Redis round-trips/sec. A single Redis node handles roughly 100k-200k simple ops/sec, so a naive "one Redis call per request" design needs **~5-10 Redis shards** just for this, before considering the gateway's own 300 nodes fanning in. This is why local, in-process pre-checks (see §6.2) matter as much as the backing store choice.

**Storage**
- State per client: bucket key, current token count, last-refill timestamp ≈ 40-60 bytes; round up to 100 bytes with key overhead.
- 2M clients × 100 bytes ≈ **200 MB** total — trivially fits in memory on a single Redis node, let alone a cluster. Storage volume is never the bottleneck here; op throughput and cross-node coordination are.

**Redis ops budget with local batching**
- If each gateway node batches its token-consumption locally and syncs to Redis every 100ms (see §6.2), Redis traffic drops from 1M ops/sec to roughly `300 nodes × 10 syncs/sec × (avg keys touched per sync)`. With ~50 active distinct keys per node per 100ms window, that's 300 × 10 × 50 = **150,000 ops/sec** — comfortably within a 2-3 shard Redis cluster, an ~85% reduction versus per-request round-trips.

**Rule storage / config**
- 2M keys × a small config row (limit, window, tier) ≈ 100 bytes ≈ 200 MB, cached fully in each gateway node's memory and invalidated via pub/sub on admin updates — config reads must never be on the hot path as a network call.

## 3. High-Level Architecture

```
                       ┌───────────┐
                       │  Clients   │
                       └─────┬──────┘
                             │
                    ┌────────▼────────┐
                    │  API Gateway     │   (N=300 nodes, stateless)
                    │  ┌────────────┐  │
                    │  │ Local token │  │  in-process cache: hot clients'
                    │  │ bucket cache│  │  bucket state, synced periodically
                    │  └──────┬─────┘  │
                    └─────────┼─────────┘
                              │ sync / on local-cache-miss
                    ┌─────────▼─────────┐
                    │  Redis Cluster      │   shared counters, Lua scripts
                    │  (per region)       │   for atomic check-and-decrement
                    └─────────┬─────────┘
                              │ replicate (async, best-effort)
                    ┌─────────▼─────────┐
                    │  Cross-region sync  │   (optional, for global limits)
                    └────────────────────┘
                              ▲
                    ┌─────────┴─────────┐
                    │  Rules/Config API   │──▶ Postgres (limit rules) + pub/sub
                    │  (admin)            │    fan-out to gateway nodes
                    └────────────────────┘
```

**Walkthrough**
1. Request hits a gateway node. The node extracts the client identity (API key / user id / IP) and looks up the applicable rule from its local config cache (refreshed via pub/sub whenever an admin changes a rule — never a synchronous network call on the hot path).
2. The node first checks its **local, in-process bucket approximation** for that client. If comfortably within budget, it decrements locally and allows the request immediately — zero network round-trip.
3. Periodically (or when local budget runs low), the node reconciles with Redis via an atomic Lua script that checks-and-decrements the shared bucket, and updates its local approximation with the authoritative remaining count.
4. If the shared bucket is exhausted, the gateway returns `429` with `Retry-After` computed from the bucket's refill rate.
5. If Redis is unreachable, the gateway falls back to a local-only decision (fail-open by default) and emits a metric/alert — better to slightly over-admit than to reject all traffic platform-wide.
6. For clients with a **global** (not per-region) limit, an async cross-region reconciliation job nudges each region's view of remaining budget, accepting eventual consistency in exchange for not putting cross-region calls on the request path.

## 4. API Design

**Data-plane (implicit — enforced by the gateway on every request)**
```
Response headers on every rate-limited request:
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 842
X-RateLimit-Reset: 1752480060      // unix ts when window/bucket resets

429 response body (when exceeded):
{
  "error": "rate_limit_exceeded",
  "retry_after_seconds": 12
}
```

**Control-plane (admin API to manage rules)**
```
PUT /admin/v1/rate-limit-rules/{client_id}
Request:
{
  "scope": "api_key",              // api_key | user | ip | endpoint
  "limit": 100000,
  "window_seconds": 60,
  "burst": 20000,                  // extra tokens allowed above sustained rate
  "algorithm": "token_bucket"
}
Response: 200
{ "client_id": "key_9f3a", "applied": true, "effective_at": "2026-07-14T10:00:05Z" }

GET /admin/v1/rate-limit-rules/{client_id}
Response: 200
{ "client_id": "key_9f3a", "scope": "api_key", "limit": 100000, "window_seconds": 60, "burst": 20000 }

DELETE /admin/v1/rate-limit-rules/{client_id}   // revert to tier default
```

## 5. Data Model & Storage Choice

```
rate_limit_state (Redis, per client — the hot path)
  key            = "rl:{scope}:{client_id}"
  tokens         (float, current available tokens)
  last_refill_ts (float, epoch seconds)
  TTL            = a few multiples of window_seconds (auto-expire idle clients)

rate_limit_rules (Postgres — control plane, low write volume)
  client_id       VARCHAR PK
  scope           ENUM(api_key, user, ip, endpoint)
  limit           INT
  window_seconds  INT
  burst           INT
  algorithm       ENUM(token_bucket, sliding_window, fixed_window)
  updated_at      TIMESTAMP
```

The hot-path counters are the textbook case for an in-memory key-value store (Redis) rather than a relational database, per [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md): the access pattern is a single-key atomic read-modify-write at extremely high frequency, with no need for joins, secondary indexes, or transactions spanning multiple clients. Redis's `EVAL`-based Lua scripting gives us atomicity for the check-and-decrement without a separate distributed lock.

The **rules/config** side is exactly the opposite workload — low write volume, needs durability and easy admin querying — so a small relational table in Postgres is the right fit, replicated to every gateway node's local cache via pub/sub (Redis Pub/Sub or a lightweight Kafka topic) rather than queried per request.

## 6. Deep Dive

### 6.1 Token bucket algorithm and atomic Redis implementation

Token bucket models each client as a bucket with capacity `burst`, refilling at `limit / window_seconds` tokens/sec; each request consumes one token, and requests are rejected when the bucket is empty. It's preferred over fixed-window counters because it smooths bursts (fixed windows allow up to 2x the limit right at a window boundary) and over sliding-log because it needs O(1) state per client instead of O(requests).

The check-and-decrement must be atomic across concurrent requests hitting the same key from different gateway nodes simultaneously — a naive `GET` then `SET` races. Implement it as a single Lua script executed via `EVAL`, which Redis runs atomically:
```
-- KEYS[1] = bucket key, ARGV = capacity, refill_rate, now, requested_tokens
local tokens = tonumber(redis.call('HGET', KEYS[1], 'tokens') or capacity)
local last   = tonumber(redis.call('HGET', KEYS[1], 'ts') or now)
local elapsed = now - last
tokens = math.min(capacity, tokens + elapsed * refill_rate)
if tokens >= requested then
  tokens = tokens - requested
  redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
  redis.call('EXPIRE', KEYS[1], ttl)
  return 1   -- allowed
else
  redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
  return 0   -- rejected
end
```
This is one round-trip, one atomic operation, no separate lock needed — Redis is single-threaded per key-slot, so the script itself provides mutual exclusion.

### 6.2 Distributed synchronization across gateway nodes — the real hard part

The naive design (every gateway node calls Redis on every request) is correct but expensive at 1M req/sec, and every request pays a network round-trip. Two complementary techniques reduce this:

- **Local token pre-allocation.** Each gateway node periodically (e.g. every 100-200ms) requests a *batch* of tokens from Redis for its actively-seen clients (e.g. "give me 50 tokens for client X, debited from the shared bucket now") and spends them locally without a network call per request. This trades strict global accuracy for throughput: in the worst case, a client could burst slightly above its configured limit equal to `(number of active gateway nodes) × (batch size)` before the shared bucket catches up — bounded and tunable via batch size, and acceptable per our stated non-functional requirement.
- **Sticky routing by client key.** If the load balancer consistently routes a given API key to the same gateway node/region (consistent hashing on client id), that node can hold near-authoritative local state and only rarely reconcile with Redis, eliminating most of the distributed-coordination problem at the cost of uneven load if one client is very hot — mitigated by falling back to shared-Redis-only for the small set of clients whose volume alone exceeds one node's fair share.

In practice, production systems (e.g. Cloudflare's, Stripe's) combine both: sticky-ish routing for the common case, with local batching as the fallback smoothing layer, accepting bounded overshoot as a deliberate trade against the alternative — a synchronous distributed lock or CRDT counter on every request, which would reintroduce the exact latency cost we're trying to avoid.

### 6.3 Multiple limit dimensions and rule precedence

A single request can be subject to several simultaneous limits — global per-IP (anti-abuse), per-API-key (contract), and per-endpoint (protect an expensive backend route). Evaluate all applicable rules and reject if *any* is exceeded, but check cheapest/most-likely-to-reject first (e.g. per-IP before per-key) to short-circuit and avoid unnecessary Redis calls. Store composite keys like `rl:endpoint:{route}:{api_key}` so each dimension has independent bucket state rather than conflating them into one counter, which would make the `429` reason ambiguous to the caller — always return which dimension was hit in the response body for debuggability.

### 6.4 Fail-open vs fail-closed and graceful degradation

If Redis becomes unreachable (network partition, node failure), the default policy is fail-open: the gateway allows the request through using only its local approximate state (or unconditionally, if no local state exists), because an outage in the rate limiter should never cascade into a full platform outage — see [high-availability](../08-reliability-operations/high-availability.md). Certain sensitive endpoints (e.g. login, password reset) can be configured fail-closed, accepting some availability loss to hold a stricter anti-abuse guarantee during an incident. Circuit-breaker logic ([circuit-breaker-pattern](../01-scaling-traffic/circuit-breaker-pattern.md)) around the Redis client prevents every gateway node from hammering a struggling Redis cluster with retries during a partial outage.

## 7. Bottlenecks & Scaling

- **10x traffic (10M req/sec)**: local batching absorbs most of the increase without more Redis ops; shard Redis further by consistent-hashing client id across more nodes, and increase batch sizes for the hottest clients specifically.
- **A single enterprise client dominates traffic (hot key)**: one client's bucket key becomes a hot key on one Redis shard. Mitigate by splitting that client's counter into N sub-counters (sharded counter pattern) summed approximately, trading exactness for spreading load.
- **Cross-region global limits**: exact global counting across regions requires either a single authoritative region (adds latency for far regions) or accepting eventual consistency via async replication — most designs choose the latter and size the "overshoot budget" into the limit itself (e.g. advertise 1000/min knowing true enforcement is closer to 1050/min across regions).
- **Config/rules propagation lag**: pub/sub fan-out to 300 nodes could lag during a burst of admin changes; bound this with a max local-cache TTL as a safety net so a rule never goes stale for more than, say, 30 seconds even if a pub/sub message is dropped.
- **Redis cluster failover**: use Redis Sentinel/Cluster mode with replicas per shard so a single node failure doesn't blank out that shard's rate-limit state; on failover, briefly fail open for affected keys rather than fail closed.

## 8. Trade-offs & Alternatives

- **Local batching/approximate limits vs strict global exactness**: chose bounded overshoot for a 5-10x reduction in Redis load and sub-millisecond added latency — the right call for API protection, wrong call if this were, say, a financial quota with hard legal limits (which would need a stronger, slower path).
- **Token bucket vs sliding-window-log vs fixed-window counter**: token bucket gives smooth burst handling with O(1) state; sliding-window-log is more precise (no boundary burst) but needs O(requests) state per client, unaffordable at 2M clients; fixed-window is cheapest but allows up to 2x burst at window edges — rejected for that reason.
- **Fail-open by default**: prioritizes platform availability over strict enforcement during a rate-limiter outage — the right default for most APIs, wrong for auth-adjacent endpoints where we explicitly opt into fail-closed.
- **Redis (in-memory, shared) vs pure in-process (no shared state)**: pure in-process would be fastest and simplest but gives each gateway node its own independent limit, effectively multiplying the real limit by node count — unacceptable for per-client fairness, hence the hybrid local-cache-plus-shared-Redis design.

## Related topics
- [Rate Limiting](../01-scaling-traffic/rate-limiting.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
- [Reverse Proxy & API Gateway](../01-scaling-traffic/reverse-proxy-api-gateway.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [Distributed Locks](../03-consistency-distributed/distributed-locks.md)
- [Caching Strategies](../04-caching/caching-strategies.md)
- [High Availability](../08-reliability-operations/high-availability.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
