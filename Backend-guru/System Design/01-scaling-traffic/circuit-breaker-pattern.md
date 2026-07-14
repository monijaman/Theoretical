# Circuit Breaker Pattern
[← Back to index](../readme.md)

## What it is and why it's asked

A circuit breaker wraps a call to a remote dependency and stops making that call entirely once failures cross a threshold, failing fast locally instead of letting every caller keep waiting on (and retrying) a dependency that's already down. The name is a deliberate borrow from electrical circuit breakers: better to trip and cut power to a faulty branch than let it keep drawing current until something burns. Interviewers ask this because it's the single pattern most responsible for stopping **cascading failures** — the scenario where one slow or dead service takes down every service that calls it, which takes down every service that calls *those*, until an entire system is unavailable because of one bad dependency. Netflix's Hystrix (now in maintenance mode but still the canonical reference) was built specifically because this happened to them repeatedly at scale.

## The three states

```
                failure_rate >= threshold
        ┌─────────────────────────────────────┐
        │                                      ▼
   ┌─────────┐                           ┌──────────┐
   │ CLOSED  │                           │  OPEN    │
   │ (calls  │                           │ (calls   │
   │  flow   │                           │  fail    │
   │ through)│                           │ instantly│
   └─────────┘                           └──────────┘
        ▲                                      │
        │                                      │ timeout window elapses
        │            success                   ▼
        │        ┌──────────────┐        ┌──────────┐
        └────────│ probe succeeds│◄───────│HALF-OPEN │
                  └──────────────┘        │ (allow a │
                          ▲                │ few test │
                          │ failure        │ requests)│
                          │                └──────────┘
                          └────────────────────┘
                             probe fails -> back to OPEN
```

- **Closed**: normal operation. Requests pass through to the real dependency, and the breaker keeps a rolling count of successes/failures.
- **Open**: the failure threshold was exceeded, so the breaker stops calling the dependency at all — it returns an error (or a fallback) immediately, without even attempting the network call. This is the entire point: a caller waiting on a 30-second timeout from a dead service, repeated across thousands of requests per second, is what actually causes the cascading collapse — cutting that off before it happens is what "fast failure" buys you.
- **Half-open**: after a cooldown window, the breaker lets a small number of trial requests through to check whether the dependency has recovered. If they succeed, it closes again; if they fail, it reopens and restarts the cooldown clock.

## Failure threshold and timeout window

Two parameters define the sensitivity: a **failure threshold** (e.g. "50% of the last 20 requests failed," or "5 consecutive failures") and a **timeout/cooldown window** (how long to stay open before probing half-open). Both need tuning against real traffic:

- Too low a threshold trips the breaker on normal transient blips (one slow GC pause looks like 3 failed requests) and needlessly cuts off a healthy dependency.
- Too high a threshold means the breaker doesn't trip until real damage is already done — thousands of timed-out requests have already piled up waiting for the slow dependency.
- Too short a cooldown re-opens the floodgates onto a dependency that hasn't actually recovered, causing it to flap between open and half-open.
- Too long a cooldown keeps routing traffic to a fallback (or failing fast) well after the dependency is healthy again, costing availability unnecessarily.

resilience4j (the modern, actively maintained successor to Hystrix in the JVM ecosystem) configures this explicitly:

```yaml
resilience4j.circuitbreaker:
  instances:
    paymentService:
      failureRateThreshold: 50          # % of calls that must fail to trip
      slowCallRateThreshold: 80         # calls slower than slowCallDurationThreshold count too
      slowCallDurationThreshold: 2s
      slidingWindowSize: 20             # count-based or time-based window
      waitDurationInOpenState: 30s      # cooldown before half-open probe
      permittedNumberOfCallsInHalfOpenState: 5
```

Note the `slowCallRateThreshold` — a dependency that responds but is unacceptably slow is functionally as bad as one that's down outright, and a well-built breaker trips on latency degradation, not only on hard errors.

## Why it prevents cascading failures

Without a breaker, imagine service A calls service B, and B starts timing out (not erroring — hanging). Every one of A's threads that calls B blocks for the full timeout. If A has a fixed thread pool of 200 and gets 500 requests/sec, its entire pool fills with threads stuck waiting on B within half a second, and A now can't serve *any* request — including ones that don't even touch B. A becomes unavailable because of B, and anything calling A now sees the same thing happen to it, one hop further out. This is exactly the failure mode that took down large chunks of Netflix's stack before Hystrix, and it's why the pattern's stated goal is "fail fast, fail cheap" — an immediate local error costs a few microseconds and one freed thread; a hung call costs a thread for the entire timeout duration, multiplied across every concurrent request.

## Circuit breaker vs retry vs timeout — the ordering matters

These three combine, and the order they're applied in changes the outcome entirely:

1. **Timeout** bounds how long a single call is allowed to take before giving up — without one, a hung dependency ties up resources indefinitely and nothing downstream (retry, breaker) ever even gets a chance to react.
2. **Retry** (see [Retry & Exponential Backoff](retry-exponential-backoff.md)) decides whether to try again after a failed/timed-out call — but retrying against an *already-overloaded* dependency is exactly what makes an outage worse, which is why retry policies must respect the breaker's state.
3. **Circuit breaker** wraps the timeout+retry pair and decides, based on aggregate recent history, whether to even attempt the call at all.

The correct composition is: breaker → (if closed) attempt call with a timeout → (if it fails) retry with backoff, up to a small bounded number of attempts → report the outcome back to the breaker. A retry loop that ignores breaker state will keep hammering a dependency the breaker has already identified as dead, defeating the entire purpose.

## Bulkhead pattern

A circuit breaker limits *whether* you call a failing dependency; a **bulkhead** limits *how much of your own capacity* any single dependency can consume, named after the watertight compartments in a ship's hull that stop one breached compartment from sinking the whole vessel. Concretely: give calls to service B their own dedicated, small thread pool (or semaphore-limited concurrency) separate from calls to service C, so that even before a breaker trips, B being slow can only exhaust *B's* pool, not the shared pool every other dependency also uses. resilience4j and Hystrix both ship bulkheads (`ThreadPoolBulkhead` / `SemaphoreBulkhead`) alongside circuit breakers precisely because they address different failure surfaces — a breaker reacts to a dependency that's *already* failing; a bulkhead limits the blast radius while it's in the process of failing, before the breaker has even tripped.

## Trade-offs summary

| Aspect | Behavior |
|---|---|
| Closed state cost | Near zero — just bookkeeping on success/failure counts |
| Open state benefit | Instant failure instead of blocking on a dead dependency; frees threads/connections immediately |
| Open state cost | Legitimate requests fail even if the dependency would have handled some of them fine |
| Half-open risk | Too aggressive probing re-floods a barely-recovering dependency |
| Needs a fallback? | Usually yes — returning a cached value, default, or degraded response is far better UX than a bare error |
| Complements | Timeouts (bound call duration), retries (handle transient blips), bulkheads (limit blast radius) |

## Common interview follow-ups

**Q: Should the circuit breaker live in the client, or can it live centrally (e.g. in a service mesh)?**
Both exist in practice: library-level breakers (Hystrix, resilience4j) live inside each calling service's process and are simple to reason about per-service, while a service mesh sidecar (Envoy's outlier detection in Istio/Linkerd) centralizes the same logic at the infrastructure layer so every service gets it without embedding a library — the mesh approach trades per-call flexibility for consistency and zero application code.

**Q: What should a caller do when the breaker is open — just return an error?**
Prefer a fallback when one exists: a cached/stale value, a sensible default, or a degraded feature (e.g. "recommendations unavailable, showing bestsellers instead") rather than surfacing a raw failure to the end user. Netflix's fallback for a failed personalization call is exactly this — show generic popular content instead of an error page.

**Q: How is a circuit breaker different from a simple health check that removes a backend from a load balancer's rotation?**
A load balancer's health check operates on the pool of backend *instances* of a service you're routing to (removing one sick replica while others still serve traffic); a circuit breaker operates per calling-service-to-dependency edge and trips even if the dependency's replicas are individually "healthy" but the aggregate call pattern (from this particular caller, for this particular operation) is failing or too slow — they operate at different layers and are typically both present.

**Q: What metric should the failure-rate window be based on — a fixed count of recent calls, or a time window?**
A count-based window (e.g. "the last 20 calls") is simple but behaves oddly under very low traffic (one call every few minutes takes a long time to accumulate 20 samples); a time-based window (e.g. "the last 10 seconds") reacts faster under high traffic but can trip on too few samples under low traffic. resilience4j supports both explicitly because production services often need to choose based on their own traffic shape.

**Q: How do half-open trial requests avoid causing the same pile-up problem the breaker was designed to prevent?**
The breaker deliberately permits only a small, fixed number of concurrent trial requests in half-open state (e.g. 5, via `permittedNumberOfCallsInHalfOpenState`) rather than opening the floodgates to full traffic — this bounds the worst case if the dependency is in fact still unhealthy to just those few probe requests, not the full incoming load.

## Related topics
- [Retry & Exponential Backoff](retry-exponential-backoff.md)
- [Backpressure](backpressure.md)
- [Reverse Proxy & API Gateway](reverse-proxy-api-gateway.md)
- [High Availability](../08-reliability-operations/high-availability.md)
- [Fault Tolerance](../08-reliability-operations/fault-tolerance.md)
