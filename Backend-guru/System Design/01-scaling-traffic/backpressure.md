# Backpressure
[← Back to index](../readme.md)

## What it is and why it's asked

Backpressure is the mechanism by which a slow consumer signals a fast producer to stop overwhelming it, instead of the producer blindly firing data at a rate the consumer can't absorb. It's asked because it separates candidates who design happy-path pipelines from those who design pipelines that survive a slow downstream dependency — which is not the exception in distributed systems, it's the default state during a partial outage, a GC pause, a deploy, or a traffic spike. Without backpressure, a slowdown two hops downstream turns into an out-of-memory crash one hop upstream, and the failure propagates and amplifies instead of staying contained.

## What happens without it

Picture a producer pushing events into an in-memory queue faster than a consumer can drain it, with no bound on the queue's size.

```
Producer (10k msg/s) ---> [ unbounded queue: growing... ] ---> Consumer (2k msg/s)

t=0s   queue = 0
t=10s  queue = 80,000 messages (heap growing)
t=30s  queue = 240,000 messages
t=45s  GC pauses lengthen as heap fills -> consumer gets even slower
t=60s  OutOfMemoryError -> process crashes -> ALL queued messages lost
```

This is the classic "unbounded queue" failure mode: the queue looks like it's absorbing the mismatch, but it's actually just delaying and compounding the crash. Worse, an unbounded queue also hides the problem from monitoring until it's catastrophic — latency-to-drain silently grows for a minute before the OOM kill, instead of failing fast and visibly at second one.

## Reactive streams: pull instead of push

The Reactive Streams initiative (which became the basis of Project Reactor, RxJava, Akka Streams, and the JDK's `Flow` API) formalizes backpressure as part of the subscription contract itself: a `Subscriber` calls `request(n)` to tell the `Publisher` "I can handle n more items," and the publisher is contractually forbidden from sending more than that. This inverts the naive push model into a demand-driven pull model.

```
Publisher                          Subscriber
    |<----- subscribe() -----------------|
    |------ onSubscribe(subscription) -->|
    |<----- request(32) -----------------|   "I can handle 32 items"
    |------ onNext(item) x32 ----------->|
    |               ... subscriber processes, catches up ...
    |<----- request(16) -----------------|   "ready for 16 more"
    |------ onNext(item) x16 ----------->|
```

The producer never sends faster than the consumer has explicitly asked for. Compare this to a plain `Iterator`/callback push model where the producer has no idea how fast the consumer can actually keep up, and simply calls `onNext` as fast as data is available.

## Bounded queues and rejection

The simplest practical backpressure mechanism doesn't need a reactive framework at all: cap the queue size and decide explicitly what happens when it's full.

```java
// java.util.concurrent.ThreadPoolExecutor
new ThreadPoolExecutor(
    corePoolSize, maxPoolSize, keepAlive, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(1000),        // bounded, not unbounded
    new ThreadPoolExecutor.CallerRunsPolicy()  // reject -> push work back to caller
);
```

Rejection policies express the actual design decision:
- **Abort** — throw/reject immediately, caller must handle the failure (fail fast, don't hide it).
- **Caller runs** — the submitting thread executes the task itself, which naturally throttles the producer since it's now busy doing the work instead of submitting more.
- **Drop oldest / drop newest** — acceptable when only the freshest data matters (e.g. a live price ticker; a stale price is worse than a missing one).

A bounded queue converts a slow, silent memory leak into an immediate, visible signal — exactly the failure-fast property that made the unbounded case dangerous.

## The TCP analogy

TCP has had backpressure built in since the beginning, and it's the clearest mental model for the concept: the receiver advertises a **receive window** (how many unacknowledged bytes it's willing to buffer), and the sender is not allowed to send more than that window permits. As the receiver's application reads data slower, its window shrinks; if the buffer fills completely, the window drops to zero and the sender stops entirely until the receiver signals room again. Nothing is silently dropped or grows without bound — the flow rate is negotiated continuously by the two ends. Every backpressure mechanism above (reactive `request(n)`, bounded queue + rejection) is really re-implementing this same idea — bounded buffer + explicit signal — at a different layer of the stack.

## Backpressure in Kafka: consumer lag

Kafka sidesteps in-memory backpressure entirely by using its **log** as the buffer: producers append to a partition, and consumers pull at their own pace by tracking an offset. There's no risk of a producer overwhelming a consumer's process memory, because the consumer only pulls what it's ready to process — this is backpressure by construction (a pull model), not an add-on.

**Consumer lag** (the gap between the latest produced offset and the consumer's committed offset) is the observable symptom of a consumer that can't keep up — it's the same signal as a growing queue, just measured on durable storage instead of in memory, so it doesn't crash the process, but a growing lag still means data is going stale and needs action: scale out consumers (more partitions + more consumer instances), speed up per-message processing, or shed lower-priority topics. Netflix and Uber both monitor consumer lag as a first-class SLO metric precisely because it's the earliest warning sign of a downstream bottleneck, well before anything actually breaks.

## Load shedding vs backpressure

These solve related but distinct problems, and interviewers probe the difference deliberately.

- **Backpressure** is a *negotiated slowdown*: the producer is told to send less, and (ideally) responds by slowing down or buffering upstream of itself — the request isn't necessarily lost, just delayed or pushed back further up the chain.
- **Load shedding** is *unilateral rejection*: the overloaded system decides, on its own, to drop or reject a fraction of incoming work immediately (often the least important fraction) to protect itself, without any coordination with the caller. Google's "The Tail at Scale" and general SRE practice describe shedding low-priority traffic first (e.g. background sync jobs) while continuing to serve user-facing requests, once a service crosses a load threshold.

In practice they're used together at different points in a request's lifecycle: backpressure between well-behaved internal components that can afford to wait, and load shedding at the edge, where refusing a request outright with a fast 503 is better for overall system health than accepting it and risking collapse.

## Backpressure across a queue

When two services are decoupled by a message queue (see [Message Queues](../05-messaging-event-driven/message-queues.md)), the queue itself acts as the elastic buffer that absorbs short-term rate mismatches — this is one of the main reasons to introduce a queue between a fast producer and a slower consumer in the first place. But a queue is not infinite backpressure-in-a-box: if the consumer stays slower than the producer indefinitely, the *queue's own depth* becomes the new thing you must bound and monitor (via consumer lag, queue depth alarms, or a max-length policy with dead-lettering), otherwise you've just moved the unbounded-growth problem from application heap to broker disk.

## Trade-offs summary

| Mechanism | Signal direction | Failure mode if ignored | Where used |
|---|---|---|---|
| Unbounded queue (anti-pattern) | None | OOM crash, silent latency growth | Rarely intentional — usually a bug |
| Bounded queue + rejection | Implicit (caller sees rejection) | Caller must handle rejection explicitly | Thread pools, in-process work queues |
| Reactive streams (`request(n)`) | Explicit pull/demand | Requires the whole chain to be reactive-aware | Akka Streams, Reactor, RxJava pipelines |
| TCP receive window | Explicit, continuous | N/A — built into the transport | Every TCP connection |
| Queue/broker (Kafka) | Consumer pulls at its own pace | Growing lag, stale data | Cross-service async pipelines |
| Load shedding | None (unilateral drop) | Dropped work if not designed for it | Edge/gateway under overload |

## Common interview follow-ups

**Q: Why is an unbounded in-memory queue worse than just being slow?**
Because it hides the problem instead of surfacing it: latency-to-process silently grows while memory fills, and the eventual OOM kill loses everything queued, whereas a bounded queue with rejection fails fast, visibly, and only loses the excess — the system stays observably degraded rather than catastrophically failing all at once.

**Q: How does HTTP/2 or gRPC implement backpressure at the application layer?**
Both are built on stream-level flow control windows layered on top of TCP's own window — a receiver advertises how many bytes of a given stream it can buffer, independent of the underlying TCP window, so one slow stream on a multiplexed connection doesn't need to stall every other stream sharing that connection.

**Q: If backpressure means "slow down," what does the producer actually do when told to slow down?**
It has three real options: buffer locally (bounded, with its own backpressure to *its* callers), apply its own backpressure further upstream (propagating the slowdown all the way to the original source), or shed/reject the excess itself — there's no magic fourth option; the mismatch in rate has to be absorbed, delayed, or dropped somewhere in the chain.

**Q: Can backpressure alone replace rate limiting?**
No — they solve different problems. Backpressure protects a system from its own known, cooperating downstream components; rate limiting protects a system from external or potentially adversarial callers who have no obligation to honor a slow-down signal. See [Rate Limiting](rate-limiting.md).

**Q: How would you detect that a service needs backpressure before it OOMs in production?**
Watch queue depth / consumer lag trend, not just absolute value — a small but steadily growing lag over minutes is the early signal, well before a threshold alert fires, and combining it with GC pause frequency/duration usually confirms the death spiral (slower processing -> bigger heap -> longer GC -> even slower processing) before it becomes irreversible.

## Related topics
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [Rate Limiting](rate-limiting.md)
- [Circuit Breaker Pattern](circuit-breaker-pattern.md)
- [High Availability](../08-reliability-operations/high-availability.md)
