# Rate Limiting
[← Back to index](../readme.md)

## What it is and why it's asked

Rate limiting caps how many requests a client (a user, an IP, an API key, or another service) can make in a given window, and rejects or delays the rest. Interviewers reach for it constantly because it touches several skills at once: choosing an algorithm with the right burst/smoothness trade-off, making a stateful decision (a counter) work correctly across a fleet of stateless servers, and picking sane failure semantics (what does the client actually see when it's throttled?). A candidate who says "just use a counter in Redis" without addressing races, clock skew, or distributed coordination hasn't shown the depth the question is probing for.

It also sits at the intersection of two concerns that are easy to conflate: **protecting your system** (shed load before it falls over) and **enforcing a business contract** (a free-tier user gets 100 requests/day). Good answers separate the two.

## Algorithms

### Token bucket

A bucket holds up to `capacity` tokens and refills at `rate` tokens/second. Each request consumes one token; if the bucket is empty, the request is rejected (or queued). This is the industry default (AWS API Gateway, Stripe, Google Cloud APIs) because it naturally allows short bursts up to the bucket size while enforcing a long-run average rate.

```
capacity = 10, refill = 5 tokens/sec

t=0    [██████████]  10 tokens — burst of 10 requests allowed instantly
t=0    request x10 -> [          ]  0 tokens, 11th request rejected
t=1s   [█████     ]  5 tokens refilled -> 5 more requests allowed
```

```python
def allow_request(bucket):
    now = time.monotonic()
    elapsed = now - bucket.last_refill
    bucket.tokens = min(bucket.capacity, bucket.tokens + elapsed * bucket.rate)
    bucket.last_refill = now
    if bucket.tokens >= 1:
        bucket.tokens -= 1
        return True
    return False
```

### Leaky bucket

Requests enter a FIFO queue of fixed size and are processed ("leak out") at a constant rate, regardless of burst size. Unlike token bucket, it *smooths* traffic rather than permitting bursts — output rate is always constant. Used where downstream can't tolerate spikes at all (e.g. shaping traffic into a legacy system with a hard-coded max QPS).

```
Incoming (bursty): ||||    |          |||||||
                     v      v          v
Queue (fixed size): [ o o o o o o o o ]
                     v (constant drain rate)
Outgoing (smooth):   o   o   o   o   o   o
```

### Fixed window counter

Increment a counter per time bucket (e.g. `user:42:2026-07-14T10:15`) and reset it when the window rolls over. Cheap — one INCR per request — but has a boundary problem: a client can send `limit` requests at 10:15:59 and another `limit` at 10:16:00, doubling the effective rate for one second.

```
Window: 10:15:00-10:15:59, limit=100
99 requests at 10:15:59.900 + 100 requests at 10:16:00.100
= 199 requests in 200ms, both windows individually "compliant"
```

### Sliding window (log and counter)

**Sliding window log**: store a timestamp per request (e.g. a Redis sorted set), and on each request, drop entries older than `now - window` and count what's left. Perfectly accurate, but memory scales with request volume per key.

**Sliding window counter**: approximate the log by weighting the previous fixed window's count by how much of it overlaps the current window — `count = current_window_count + previous_window_count * overlap_fraction`. This fixes the boundary-burst problem with O(1) storage, at the cost of being an approximation (assumes uniform distribution within the previous window). This is what most production rate limiters (Cloudflare, Kong, Envoy's local rate limit filter) actually ship.

## Where it's enforced

- **Client-side**: SDKs that self-throttle (e.g. the AWS SDK's adaptive retry mode) to avoid hitting the server limit at all. Cooperative, not authoritative — a misbehaving client can ignore it.
- **Edge / gateway**: the common production placement — Cloudflare, Kong, an Envoy/Nginx layer, or a cloud API Gateway rejects over-limit traffic before it reaches application servers. Centralizes policy, protects everything behind it, adds one hop of latency.
- **Per-service**: each microservice enforces its own limit on callers (including internal callers), often via a sidecar (Envoy's local/global rate limit service) — useful when a single noisy internal service could otherwise starve a shared downstream dependency, independent of the edge policy.

Defense in depth is normal: GitHub's API is throttled at the edge (per-token) *and* individual endpoints (like search) apply tighter secondary limits server-side because their cost profile differs from a plain GET.

## Distributed rate limiting with Redis

A single server can keep counters in memory, but a fleet of API servers behind a load balancer needs a **shared** counter, or a client can get `limit × N` requests by hitting N different servers. Redis is the default choice: fast, shared, and supports atomic operations via Lua scripting so the read-check-increment isn't a race.

```lua
-- EVALSHA this atomically: check-and-increment token bucket, single round trip
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local bucket = redis.call("HMGET", key, "tokens", "ts")
local tokens = tonumber(bucket[1]) or capacity
local ts = tonumber(bucket[2]) or now

tokens = math.min(capacity, tokens + (now - ts) * refill_rate)
if tokens >= 1 then
    tokens = tokens - 1
    redis.call("HMSET", key, "tokens", tokens, "ts", now)
    redis.call("EXPIRE", key, 60)
    return 1   -- allowed
else
    redis.call("HMSET", key, "tokens", tokens, "ts", now)
    return 0   -- rejected
end
```

Without the Lua script, a naive `GET` then `SET` from two app servers racing on the same key can both read "9 tokens left" and both decrement, silently letting the limit slip. Running the whole check-and-decrement as one Lua script makes it atomic since Redis executes scripts single-threadedly. At very high QPS, even Redis becomes a bottleneck/single point of contention — Envoy's global rate limit service and Cloudflare's system instead push toward **approximate, sharded counters** (each edge node keeps a local count and gossips/aggregates periodically), trading perfect accuracy for horizontal scalability.

## 429 responses and Retry-After

When a request is throttled, return **`429 Too Many Requests`**, not a generic 500 — clients (and their retry logic) need to distinguish "you did something wrong, back off" from "the server is broken." Include:

- `Retry-After: 30` (seconds, or an HTTP date) — tells a well-behaved client exactly when to try again instead of guessing.
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` — GitHub, Stripe, and Twitter's APIs all expose these so clients can self-throttle proactively instead of reactively hitting 429s.

A client that ignores `Retry-After` and retries immediately in a tight loop is the single most common cause of a rate-limited client making its own situation worse — see [Retry & Exponential Backoff](retry-exponential-backoff.md) for why blind immediate retries are actively harmful.

## Per-user vs per-IP vs per-API-key

- **Per-IP**: simplest, but punishes everyone behind a NAT/corporate proxy/CGNAT together, and is trivially evaded with IP rotation (residential proxy pools, botnets).
- **Per-user (authenticated identity)**: fairer and harder to evade since it's tied to a login/session, but requires the request to be authenticated *before* the limiter runs, which means auth becomes part of the hot path.
- **Per-API-key**: the standard for B2B/platform APIs (Stripe, Twilio, SendGrid) — ties limits to a billing plan, is easy to communicate in docs, and lets you tier limits (free/pro/enterprise) without touching per-user identity at all.

Production systems commonly layer more than one: Discord rate-limits per-route *and* per-user *and* globally per-bot-token simultaneously, because a single dimension can't protect against every abuse pattern (one very hot endpoint vs. one very chatty client).

## Rate limiting vs quota

They're often confused but answer different questions. **Rate limiting** is about *velocity* — requests per second/minute, meant to protect real-time capacity and smooth bursts; exceeding it gets you a 429 that clears in seconds. **Quota** is about *volume over a long period* — requests per day/month, tied to a pricing plan or fair-use policy; exceeding it typically means you're locked out until the billing period resets, independent of how fast you're sending requests. A system can be well within its daily quota and still get a 429 for sending 500 requests in one second, and vice versa.

## Trade-offs summary

| Algorithm | Burst handling | Accuracy | Memory | Notes |
|---|---|---|---|---|
| Token bucket | Allows bursts up to capacity | Exact | O(1) per key | Most common default (AWS, Stripe) |
| Leaky bucket | Smooths to constant rate, no bursts | Exact | O(1) per key (+ queue) | Best when downstream can't handle spikes |
| Fixed window | Allows 2x burst at window edge | Approximate | O(1) per key | Cheapest, boundary bug |
| Sliding window log | None beyond window semantics | Exact | O(requests in window) | Most accurate, most memory |
| Sliding window counter | Small edge-case error | Approximate | O(1) per key | Best accuracy/cost trade-off, what most gateways ship |

## Common interview follow-ups

**Q: Why use a Lua script instead of a Redis transaction (MULTI/EXEC) for the token bucket check?**
`MULTI/EXEC` queues commands but can't make a decision *based on* an intermediate read within the same transaction (no branching) — you'd still need a separate GET before the transaction, reopening the race. A Lua script runs entirely inside Redis as one atomic unit with full branching logic, so the read, math, and write happen without any other client interleaving.

**Q: How would you rate-limit across multiple data centers with minimal cross-region latency?**
Don't do a synchronous global count on every request — that adds a cross-region round trip to the hot path. Instead give each region/node a local slice of the global budget (e.g. global limit / number of regions) with periodic reconciliation, or accept approximate global enforcement (each node enforces a slightly generous local limit, true global rate is capped within a small error margin). This is the same sharded/approximate trade-off Cloudflare and Envoy's global rate limit service make.

**Q: A client complains they're being throttled even though they're "clearly" under the limit. What do you check?**
Clock skew between the client's understanding of the window and the server's; whether the limiter key includes the right dimension (are they sharing an IP/NAT with other tenants?); whether a fixed-window boundary burst from a previous window is being miscounted; and whether multiple layers (edge + per-service) are each applying a limit, so the client is passing one but failing another.

**Q: Should rate limiting happen before or after authentication?**
Both, for different reasons. An unauthenticated, cheap IP-based limit should run first to blunt trivial floods before spending CPU/DB lookups on auth. A second, per-identity limit runs after authentication succeeds, since that's the only point you know who the caller actually is and which plan/tier applies.

**Q: How do you rate-limit WebSocket or streaming connections, where there's no discrete "request"?**
Shift the unit from requests to messages/events per second, or to connection attempts per minute (to stop connection-churn abuse), and enforce token-bucket-style limits on the message stream itself rather than on HTTP request counts.

## Related topics
- [Load Balancing](load-balancing.md)
- [Reverse Proxy & API Gateway](reverse-proxy-api-gateway.md)
- [Backpressure](backpressure.md)
- [Retry & Exponential Backoff](retry-exponential-backoff.md)
- [Rate Limiter (design practice)](../10-system-design-practice/rate-limiter.md)
- [API Gateway (design practice)](../10-system-design-practice/api-gateway.md)
