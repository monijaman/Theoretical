# Retry & Exponential Backoff
[← Back to index](../readme.md)

## What it is and why it's asked

Retrying a failed request seems like the most obvious thing in distributed systems — the network is unreliable, so just try again. But naive retries are one of the most common causes of *self-inflicted* outages: a struggling service gets hit with the same request volume again immediately, from every failed caller simultaneously, which is precisely the added load that pushes a "slow" dependency into "down." Interviewers ask about backoff and jitter because the math is simple but the failure mode it prevents (a retry storm turning a blip into an outage) is one of the most cited root causes in real postmortems — AWS's own Architecture Blog has written about this exact problem multiple times because it's recurred across their own services.

## The naive retry storm

```
Service B has a brief hiccup at t=0 (GC pause, brief overload, deploy blip)

1,000 clients' requests to B all timeout at t=0 (same fixed 1s timeout)
   |
   v
All 1,000 clients retry immediately at t=1s
   |
   v
B, already recovering, gets slammed with 1,000 requests in the same instant
   |
   v
B slows down again -> more timeouts -> more synchronized retries at t=2s
   |
   v
Thundering herd: retries perfectly resonate with B's recovery attempts,
keeping B in a permanent overload loop it can never climb out of
```

This is a **thundering herd**: every client learned about the failure at roughly the same instant (they all called at roughly the same instant), so without any randomization they all retry at roughly the same instant too, and the retries themselves become the new source of overload. A retry storm can keep a service down far longer than the original blip that triggered it — the fix has to break the synchronization, not just add a delay.

## Exponential backoff

Instead of retrying immediately or on a fixed interval, each successive attempt waits longer, growing exponentially with attempt number:

```
delay(attempt) = min(base * 2^attempt, max_delay)

base = 100ms, max = 20s

attempt 1: 100ms *  2  = 200ms
attempt 2: 100ms *  4  = 400ms
attempt 3: 100ms *  8  = 800ms
attempt 4: 100ms * 16  = 1.6s
attempt 5: 100ms * 32  = 3.2s
attempt 6: 100ms * 64  = 6.4s
attempt 7: 100ms * 128 = 12.8s
attempt 8: 100ms * 256 = 20s (capped at max_delay)
```

This alone spreads retries out over time and gives a struggling dependency room to recover — a client that fails once retries almost immediately (transient blips resolve fast), while one that keeps failing backs off increasingly aggressively instead of hammering the dependency at a constant rate forever.

## Jitter: why backoff alone isn't enough

Plain exponential backoff still has the thundering-herd problem, just spread across fewer, larger spikes instead of many small ones — every client that failed at the same instant still computes the *same* delay and therefore retries at the *same* instant, just later. AWS's "Exponential Backoff and Jitter" architecture blog post (the standard reference here) works through exactly this and proposes randomizing the delay so retries desynchronize:

- **Full jitter**: `delay = random(0, min(max_delay, base * 2^attempt))` — pick a uniformly random delay anywhere between zero and the capped exponential value. This gives the best spread and, in AWS's own benchmarking, the lowest total completion time and least load on the downstream service, precisely because it doesn't cluster retries near the exponential ceiling at all.
- **Equal jitter**: `delay = (capped_exponential / 2) + random(0, capped_exponential / 2)` — keep half the exponential delay as a guaranteed floor and randomize only the other half. This never lets the delay collapse toward zero, at the cost of a smaller spread than full jitter (and therefore slightly more clustering) since every client still waits at least half the exponential value.

```
Attempt 4, capped exponential value = 1.6s

No jitter:     |----------------1.6s----------------|  (every client, exact same instant)
Equal jitter:  |--------0.8s--------|<-- random 0-0.8s -->|   (floor guaranteed, spread on top)
Full jitter:   <---------------- random 0 to 1.6s ---------------->  (widest spread, no floor)
```

Full jitter is the generally recommended default because it minimizes the number of retries any given client needs (each retry has an independent random chance of landing in a low-contention gap), which in AWS's measurements outperformed equal jitter and no-jitter backoff on both client completion time and server load.

## Idempotency: the prerequisite for safe retries

Retrying is only safe if repeating the operation produces the same result as doing it once. A `GET`, `PUT` (full replace), or `DELETE` is naturally idempotent — sending it twice is equivalent to sending it once. A `POST` that creates a new resource (charge a card, place an order) is **not** naturally idempotent: if the first attempt actually succeeded server-side but the response was lost before the client saw it (a very common failure mode — the work happened, only the acknowledgment didn't arrive), a blind retry creates a duplicate charge or a duplicate order.

Stripe's API is the textbook example of the fix: clients pass an `Idempotency-Key` header (a client-generated UUID) with every mutating request. Stripe stores the key alongside the result of the first execution; if the same key arrives again (because the client retried after a timeout), Stripe returns the stored result instead of re-executing the charge.

```
POST /v1/charges
Idempotency-Key: 6f3d9c2a-...

Attempt 1: request times out after Stripe already processed the charge
Attempt 2 (retry, same key): Stripe recognizes the key, does NOT charge again,
                             returns the original charge's result
```

Without an idempotency key, the only safe retry policy for a non-idempotent write is: don't, unless you can independently verify the first attempt truly never took effect (e.g. querying for the resulting resource before assuming failure).

## Retry budgets

Even with backoff and jitter, unlimited retries at scale across an entire fleet still add sustained extra load — a retry budget caps the *fraction* of total traffic that's allowed to be retries (e.g. "retries may not exceed 10% of the request volume in the last minute"), and once the budget is exhausted, further failures are surfaced immediately instead of retried. This bounds the worst case cleanly: a dependency under real, sustained distress gets at most 1.1x its organic load, never an unbounded multiple of it from every caller retrying every failure. gRPC's client-side retry policy and several service meshes (Envoy, Linkerd) support retry budgets natively for exactly this reason — per-call backoff configuration alone doesn't protect against *aggregate* retry volume across thousands of concurrent callers.

## When NOT to retry

- **4xx errors** (except 429, and arguably 408) mean the request itself was invalid — bad auth, malformed payload, a resource that doesn't exist. Retrying an unmodified request that already failed validation will fail identically every time; it wastes a round trip and adds noise without any chance of success.
- **5xx errors and timeouts** are the legitimate retry targets — they indicate a transient server-side or network problem that may well not recur on the next attempt.
- **429 (rate limited)** is retry-worthy but only after honoring `Retry-After` (see [Rate Limiting](rate-limiting.md)) — retrying immediately just adds to the exact overload that produced the 429.
- **Non-idempotent POST without an idempotency key** — as above, retrying blind risks duplicate side effects; the safer failure mode is to surface the error to the caller (or the human) rather than guess.
- **Circuit breaker open** — if a breaker (see [Circuit Breaker Pattern](circuit-breaker-pattern.md)) has already tripped for this dependency, further retries should be suppressed entirely rather than attempted and immediately failed, since the breaker's whole purpose is to stop exactly this traffic.

## Trade-offs summary

| Strategy | Thundering herd risk | Total client wait time | Server load pattern |
|---|---|---|---|
| Immediate retry, no backoff | Severe | Low per-client, catastrophic in aggregate | Synchronized spikes, can prevent recovery |
| Fixed-delay retry | Severe (delayed, still synchronized) | Predictable but poor under load | Synchronized spikes at fixed intervals |
| Exponential backoff, no jitter | Moderate (spikes get farther apart but stay synchronized) | Grows per retry | Periodic large spikes |
| Exponential backoff + equal jitter | Low | Slightly higher floor wait | Smoothed, guaranteed minimum spacing |
| Exponential backoff + full jitter | Lowest | Best average in AWS's benchmarks | Most evenly smoothed |

## Common interview follow-ups

**Q: Why does AWS recommend full jitter over equal jitter as the default?**
In AWS's own benchmarking, full jitter produced both the lowest mean completion time across clients and the lowest load on the server being retried against, because it has no guaranteed floor — some retries land almost immediately in a low-contention gap, which equal jitter's mandatory half-delay floor prevents; the trade-off (occasionally a very short wait right after a failure) is worth it in aggregate.

**Q: How do retries interact with a circuit breaker?**
The breaker should sit "outside" the retry loop: check breaker state first, only attempt (and potentially retry) the call if the breaker is closed, and report each outcome back to the breaker's failure counter — retrying against a dependency the breaker has already identified as unhealthy just adds load to something already failing, which is precisely what the breaker exists to prevent. See [Circuit Breaker Pattern](circuit-breaker-pattern.md).

**Q: A client times out waiting for a POST that creates an order — the server actually processed it, but the response never arrived. What should happen?**
Without an idempotency key, the client can't safely distinguish "never processed" from "processed but ack lost," so a blind retry risks a duplicate order. The correct fix is an idempotency key generated once per logical operation and reused across retries (as in Stripe's API), so the server can recognize the replay and return the original result instead of creating a second order.

**Q: What's a retry budget and why is per-request backoff not sufficient on its own?**
Per-request backoff bounds how aggressively a *single* client retries, but says nothing about how many of the *fleet's* concurrent clients are simultaneously retrying — thousands of well-behaved, individually-jittered clients can still collectively double a dependency's load. A retry budget caps the aggregate retry-to-request ratio (e.g. 10%) fleet-wide, which per-client backoff configuration alone cannot do.

**Q: Should you retry on a connection timeout the same way you retry on a 503?**
Treat them similarly as transient/retryable, but be more cautious on a connection timeout for non-idempotent writes, since a timeout gives you no information about whether the request was received and processed before the connection died — whereas a 503 generally means the server explicitly rejected the request before doing any work. This is exactly the ambiguity an idempotency key is designed to remove.

## Related topics
- [Circuit Breaker Pattern](circuit-breaker-pattern.md)
- [Backpressure](backpressure.md)
- [Rate Limiting](rate-limiting.md)
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Distributed Locks](../03-consistency-distributed/distributed-locks.md)
