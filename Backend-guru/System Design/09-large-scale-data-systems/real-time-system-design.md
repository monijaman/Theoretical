# Real-Time System Design
[← Back to index](../readme.md)

## Why this matters in an interview

"Real-time" gets thrown around loosely — a live dashboard refreshing every 30 seconds and a stock-trading system reacting in microseconds are both called "real-time" but demand completely different architectures. Interviewers use this topic to see whether you can pin down an actual latency budget instead of accepting the vague word, whether you know the standard stream-processing stack (Kafka + Flink/Spark Streaming) and its core primitives (windowing, exactly-once semantics), and whether you understand the client-delivery half of the problem (push vs. poll) as a distinct decision from the server-side processing half.

## What "real-time" actually means: latency budgets

The first move in any real-time design question is to replace "real-time" with a number, because the number determines almost every downstream choice.

- **Hard real-time**: missing the deadline is a system failure, not just a degraded experience — think embedded flight control or industrial safety systems, where a late response is treated the same as a wrong one. Almost no web-scale system design interview is actually asking about this category.
- **Soft real-time**: missing the deadline degrades value but doesn't make the system incorrect — a live sports score arriving 2 seconds late is still useful; arriving 2 minutes late defeats the purpose. This is what "real-time system design" almost always means in an interview context: fraud detection (must flag within seconds, not hard-realtime microseconds), live dashboards, chat delivery, ride-location updates, trading market-data feeds (soft real-time even at low-single-digit milliseconds, since a slightly-late price update is degraded, not catastrophic, for most retail use cases).

```
Latency budget drives architecture:

  < 10ms      →  in-memory, single-process, no network hop if avoidable
  10–100ms    →  in-memory cache + optimized network path (WebSocket, gRPC)
  100ms–1s    →  stream processing with small windows, push delivery
  1s–seconds  →  stream processing with larger windows, batching acceptable
  minutes+    →  this isn't "real-time" — it's near-real-time/batch;
                 say so explicitly rather than over-engineering
```

Stating the budget up front ("I'm assuming sub-second end-to-end, since this is fraud detection on a payment") turns a vague prompt into a design you can defend, and signals you know real-time isn't a single tier.

## Stream processing architecture: Kafka + Flink/Spark Streaming

The dominant pattern for real-time data processing at scale is: an event log for durable, ordered ingestion, and a stream processor that consumes it continuously and computes derived results.

```
  Producers                Kafka (durable log)         Stream processor
┌────────────┐         ┌───────────────────────┐      ┌───────────────────┐
│ App events  │───────▶│ topic: clicks          │─────▶│ Flink / Spark      │
│ Sensor data │───────▶│  partition 0: [e1,e2..]│      │ Streaming job:     │
│ CDC changes │───────▶│  partition 1: [e3,e4..]│      │  - filter          │
└────────────┘         │  partition 2: [e5,e6..]│      │  - aggregate       │
                        └───────────────────────┘      │  - window          │
                                                        │  - join streams    │
                                                        └─────────┬──────────┘
                                                                  ▼
                                                    Sink: DB / cache / alert /
                                                    another Kafka topic (chaining)
```

- **Kafka** (or an equivalent log) provides the durable, replayable, partitioned backbone — consumers can fall behind and catch up, restart from a checkpoint, and multiple independent jobs can read the same topic without interfering. See [Message Queues](../05-messaging-event-driven/message-queues.md) for the durability/ordering mechanics.
- **Flink** processes events with true per-event streaming (lowest latency, native windowing/state), while **Spark Streaming** (Structured Streaming) processes in **micro-batches** — small batches of events on a fixed interval — trading a bit of latency for reuse of Spark's batch engine and ecosystem. The practical choice: Flink when you need the lowest possible per-event latency and complex event-time semantics; Spark Streaming when your team already runs Spark batch jobs and near-real-time (seconds, not tens of milliseconds) is acceptable.
- Jobs are commonly **chained**: one job's output topic is the next job's input topic, letting you compose a pipeline (raw events → cleaned/enriched events → aggregated metrics → alerts) instead of one monolithic job.

## Windowing: tumbling, sliding, session

Streams are unbounded, so "aggregate the last N events" needs a precise definition of the time boundary — that's a **window**.

```
Tumbling window (fixed, non-overlapping):
|--- 0-5s ---|--- 5-10s ---|--- 10-15s ---|
each event belongs to exactly ONE window

Sliding window (fixed size, overlapping):
|--- 0-5s ---|
    |--- 2-7s ---|
        |--- 4-9s ---|
each event can belong to MULTIPLE windows (e.g., "requests per 5s, evaluated every 1s")

Session window (dynamic, gap-based):
event  event   event         [gap > timeout]         event  event
|────── session A ──────|                            |── session B ──|
window boundary is defined by inactivity, not a fixed clock
```

- **Tumbling windows** are the simplest: fixed-size, non-overlapping buckets — "count clicks per minute." Each event contributes to exactly one window.
- **Sliding windows** overlap: "average request rate over the last 5 seconds, recomputed every 1 second" — used for smoothed metrics and moving averages, at the cost of each event being processed by multiple overlapping window computations.
- **Session windows** have no fixed clock at all — a window stays open as long as events keep arriving within a gap threshold, and closes after a period of inactivity. This is the natural fit for "user session" analytics (a burst of clicks separated by long idle gaps defines session boundaries organically, not by a wall-clock interval).

A related, easy-to-miss detail: **event time vs. processing time**. A mobile event generated offline and synced hours later has an event time in the past but arrives at processing time "now" — correct windowing needs to bucket by event time, with a **watermark** mechanism (Flink's core feature) that tracks how far behind out-of-order/late events the system is willing to wait before finalizing a window.

## Exactly-once processing

Failures (consumer crash, network blip) naturally push a system toward **at-least-once** (retry until acknowledged, risking duplicate processing) or **at-most-once** (don't retry, risking dropped events) delivery. **Exactly-once** — the effect of processing each event precisely once, even across failures — is what most real-time systems actually want (a payment shouldn't be double-charged because a consumer retried), and it's achieved by combining two things, not by a single magic guarantee:

1. **Idempotent/transactional writes to the sink** — Kafka's transactional producer API and Flink's checkpointing coordinate so that a consumer offset commit and its corresponding output write commit or roll back together (two-phase-commit-like), so a crash-and-replay reprocesses the same input without double-applying the output.
2. **Deduplication at the sink** — even without transactional infrastructure, giving every event an idempotency key and having the sink upsert (rather than blindly insert/append) on that key achieves the same practical effect, cheaply, at the application layer.

The honest framing for an interview: "exactly-once" describes the *observable effect*, not a literal guarantee that a message is transmitted exactly one time on the wire — duplicates can and do occur at the transport layer, but idempotent application logic makes their effect indistinguishable from exactly-once.

## Push vs. poll for real-time delivery to clients

Getting a real-time result computed server-side is only half the problem — getting it to the client with the same latency budget is the other half, and it's a genuinely separate decision.

```
Poll                                    Push
────                                    ────
Client → GET /status  (every Nsec)      Server → client (WebSocket / SSE)
Client → GET /status                     pushed the moment new data exists
Client → GET /status  (mostly "no       No wasted requests, but the server
 new data" responses — wasted work)      must hold an open connection per
                                          client (stateful, resource cost)

+ simple, works everywhere,             + true low latency, no polling
  no persistent connection                interval floor
- latency floor = polling interval      - connection state to manage at
- wasted requests when nothing's new      scale (load balancer stickiness,
                                           reconnect/backoff logic)
```

- **WebSocket**: full-duplex, persistent TCP connection — needed when the client also sends frequent messages back (chat, collaborative editing).
- **Server-Sent Events (SSE)**: one-directional server→client stream over plain HTTP — simpler than WebSocket, sufficient when the client only receives updates (live score ticker, notification stream), and plays more nicely with existing HTTP infra (proxies, load balancers) since it's just a long-lived HTTP response.
- **Long polling**: a middle ground — client makes a request that the server holds open until there's new data (or a timeout), then the client immediately re-requests. Useful as a fallback when WebSocket/SSE aren't available (older clients, restrictive proxies).
- The real trade-off is operational: push means the server fleet holds one open connection per active client, so connection count (not just request rate) becomes a capacity dimension, and a client's server-affinity (which node holds its socket) complicates horizontal scaling and deployments (a rolling deploy has to gracefully migrate/reconnect live sockets).

## Backpressure in streaming pipelines

If a downstream stage (sink, consumer, network) is slower than the upstream production rate, something has to give — that's **backpressure**, and how a pipeline handles it determines whether it degrades gracefully or falls over.

```
Producer rate: 10,000 events/sec
Consumer processing rate: 6,000 events/sec
                                    │
                     Without backpressure handling:
                     unbounded buffer growth → OOM → crash → data loss

                     With backpressure handling:
        ┌─────────────────────────────────────────────┐
        │ Option A: bounded queue + block/slow producer │
        │ Option B: bounded queue + drop oldest/newest   │
        │ Option C: propagate "slow down" signal upstream│
        │           (Flink's credit-based flow control,   │
        │            Kafka consumer simply reads slower — │
        │            the log absorbs the gap durably)     │
        └─────────────────────────────────────────────┘
```

Kafka's design inherently absorbs a lot of backpressure for free: since the log is durable and partitioned, a slow consumer just falls behind its read offset rather than data being lost or the producer being blocked — the buffer is the durable log itself, bounded only by retention policy. Flink implements explicit credit-based flow control between operators so a slow downstream operator signals upstream operators to slow their emission rate, rather than buffering unboundedly in memory. The failure mode to avoid articulating away in an interview: an unbounded in-memory buffer "to not drop anything" just delays the crash and turns it into an OOM instead of a controlled degradation.

## Trade-offs summary

| | Choice A | Choice B |
|---|---|---|
| Processing engine | Flink (true per-event, lowest latency) | Spark Structured Streaming (micro-batch, ecosystem reuse) |
| Windowing | Tumbling/sliding (fixed clock) | Session (activity-gap based) |
| Delivery guarantee | At-least-once (simpler, needs idempotent sink) | Exactly-once semantics (transactional, more infra) |
| Client delivery | Poll (simple, latency floor = interval) | Push: WebSocket/SSE (lower latency, stateful connections) |
| Overload response | Unbounded buffer (delays the crash) | Bounded queue + backpressure/drop policy (controlled degradation) |

## Common interview follow-ups

**Q: How do you decide between Flink and Spark Streaming for a given system?**
Pick Flink when you need the lowest achievable per-event latency, complex event-time windowing, and fine-grained state management; pick Spark Structured Streaming when the team already operates Spark for batch workloads and near-real-time (low single-digit seconds) is genuinely acceptable, since reusing one engine/operational model across batch and streaming reduces total system complexity even if raw latency is a bit higher.

**Q: What's the difference between "exactly-once" and "effectively-once"?**
Strictly, no distributed system delivers a message exactly one time at the transport layer — retries and duplicates happen; "effectively-once" (sometimes used instead) is the more honest term for the same guarantee: duplicates may occur in transit, but idempotent writes or transactional offset/output commits make the *observable result* identical to processing each event exactly once.

**Q: How would you handle a late-arriving event that belongs to a window that's already closed?**
Use a watermark strategy that defines how long to wait for stragglers before finalizing a window (trading completeness for latency), and configure a policy for events arriving after the watermark has passed — typically either dropping them with a metric/alert, or emitting a "late update" that corrects a previously-published aggregate, depending on whether downstream consumers can handle a revision.

**Q: When would you choose polling over push, even though push is lower latency?**
When the latency requirement is genuinely loose (a dashboard refreshing every 30 seconds is fine polling every 30 seconds), when client diversity is high and maintaining persistent connections across all of them is operationally costly, or when the infrastructure between client and server (corporate proxies, some mobile carriers) is hostile to long-lived connections — polling's simplicity and statelessness can outweigh the latency cost.

**Q: How do you scale a system holding millions of open WebSocket connections?**
Shard connections across many stateful gateway nodes (each holding a subset of live sockets), use a separate pub/sub layer (Redis Pub/Sub, Kafka) to route a message to whichever gateway node currently holds the target client's socket, and handle deploys/scaling events with graceful connection draining and client-side reconnect-with-backoff rather than hard-dropping sockets.

**Q: What happens to a stream-processing job's state (e.g., a running aggregate) when it needs to restart after a crash?**
The engine periodically checkpoints its internal state (Flink writes checkpoints to durable storage like S3/HDFS on an interval) alongside the input offset it had consumed up to; on restart, it restores state from the last checkpoint and resumes consuming from that offset, which is also the mechanism that underlies exactly-once processing guarantees.

## Related topics
- [Message Queues](../05-messaging-event-driven/message-queues.md) — Kafka's durability/partitioning/ordering mechanics underlying the stream backbone
- [Geospatial System Design](geospatial-system-design.md) — a concrete real-time ingestion pipeline (driver location pings) feeding a geo-index
- [Search Architecture / Elasticsearch](search-architecture-elasticsearch.md) — another near-real-time system with the same "durable log → async processor → queryable store" shape
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md) — the consistency model underlying "eventually delivered" streaming results
- [High Availability](../08-reliability-operations/high-availability.md) — checkpoint/restart patterns for stream processors as a form of fault tolerance
