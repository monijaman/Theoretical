# Message Queues
[← Back to index](../readme.md)

## Why an interviewer cares

Almost every non-trivial distributed system needs to move work or facts from one component to another without making the sender wait on the receiver. Message queues are the load-bearing wall of that decoupling: they let you absorb bursts, survive downstream outages, and scale producers and consumers independently. An interviewer asking about queues is really probing whether you understand *delivery semantics under failure* — because the honest answer to "can you guarantee exactly-once delivery?" is almost always "not for free," and knowing why separates people who have operated these systems from people who have only read the marketing page.

## The core mental model

A queue sits between producers and consumers as a durable buffer:

```
Producer(s) ---> [ Queue / Broker ] ---> Consumer(s)
                     |
                     +-- persists messages (disk / replicated log)
                     +-- tracks acknowledgment state
                     +-- redelivers on failure / timeout
```

Two fundamentally different delivery topologies get lumped under "message queue":

**Point-to-point (queue semantics)**
```
Producer --> [ Queue ] --> Consumer A
                    \--> Consumer B   (competing consumers — each message goes to exactly one)
```
Each message is consumed by exactly one worker in a pool. This is the classic "task queue" pattern — work items are distributed, not broadcast. Adding consumers increases throughput (horizontal scaling of processing).

**Publish/subscribe (fan-out semantics)**
```
Publisher --> [ Topic/Exchange ] --+--> Subscriber A (its own queue/offset)
                                    +--> Subscriber B (its own queue/offset)
                                    +--> Subscriber C
```
Every subscriber gets its own copy of the message. Used for broadcasting events to multiple independent downstream systems (e.g., "order placed" notifies billing, inventory, and analytics simultaneously).

Most real brokers support both: RabbitMQ does it via exchange types (direct/fanout/topic exchanges routing into per-consumer queues), Kafka does it via topics + consumer groups (each *group* gets a full copy of the stream; consumers *within* a group compete for partitions).

## Delivery guarantees

This is the part interviewers drill into.

| Guarantee | What it means | How it's achieved | Failure mode |
|---|---|---|---|
| **At-most-once** | Message delivered 0 or 1 times | Fire-and-forget, no ack/retry | Message lost if consumer crashes before processing |
| **At-least-once** | Message delivered 1+ times | Consumer acks only *after* successful processing; broker redelivers on timeout/crash | Duplicates on redelivery — consumer must be idempotent |
| **Exactly-once** | Message delivered and processed exactly once | Transactional/idempotent producer + transactional consumer offset commits, or dedupe at consumer | Expensive, often scoped narrowly (e.g., Kafka's exactly-once is only end-to-end within Kafka-to-Kafka pipelines) |

In practice, **at-least-once + idempotent consumer** is the pragmatic default almost everyone builds toward, because true exactly-once requires coordinating a distributed transaction across broker and downstream side effects (DB writes, external API calls) — see the [Outbox Pattern](outbox-pattern.md) for how that's actually solved for the producer side.

Idempotency techniques for consumers:
- Deduplicate on a message ID (store processed IDs in a table/cache with TTL).
- Make the operation naturally idempotent (`SET balance = 100` instead of `balance += 10`, or use a conditional `UPDATE ... WHERE version = N`).
- Use upserts keyed by a natural/business key instead of blind inserts.

## Ordering guarantees

- **RabbitMQ classic queue**: FIFO order per queue, but with multiple competing consumers, *processing* order is not guaranteed (consumer B might finish before consumer A even if A got an earlier message). Ordering across queues/routing keys is not guaranteed at all.
- **Kafka**: ordering is guaranteed **only within a partition**. Messages with the same partition key (e.g., `user_id`) always land in the same partition and are read in the order they were written. Across partitions there's no global order — this is the standard trade-off for parallelism.
- **SQS Standard**: best-effort ordering, no guarantee. **SQS FIFO queues**: strict ordering per `MessageGroupId`, at the cost of throughput (300 msg/s per API call, or 3000/s with batching, per queue).

Rule of thumb: if you need ordering, you need a *partition key* / *group ID* concept, and you accept that ordering is only guaranteed within that key, not globally.

## Dead-letter queues (DLQ)

When a message repeatedly fails processing (poison message, bug, bad payload), redelivering it forever wastes resources and can block the queue behind it (head-of-line blocking). A DLQ is a side queue that captures messages after N failed delivery attempts so they can be inspected/replayed manually without stalling the main pipeline.

```
[ Main Queue ] --fail x N times--> [ Dead Letter Queue ] --> alerting / manual replay
```

- RabbitMQ: configure `x-dead-letter-exchange` on a queue; messages rejected (`nack`) or expired (TTL) are routed there.
- SQS: attach a `RedrivePolicy` with `maxReceiveCount`; after that many receives without deletion, the message moves to the configured DLQ.
- Kafka: no native DLQ concept (it's a log, not a queue) — applications implement it by producing failed records to a `topic.DLQ` themselves (common in Kafka Streams / Kafka Connect error handling).

## Backpressure via queues

Queues are one of the primary mechanisms for [backpressure](../01-scaling-traffic/backpressure.md): instead of a fast producer overwhelming a slow consumer, the queue absorbs the difference up to its capacity, and the *rate of consumption* (not the rate of production) governs how fast work actually completes. Key levers:
- **Bounded queues**: cap queue depth, reject or block producers when full (explicit backpressure signal).
- **Unbounded queues**: never reject, but risk unbounded memory/disk growth and huge latency if consumers fall behind — depth becomes a lagging indicator you must alert on (e.g., Kafka consumer lag).
- **Prefetch/QoS**: RabbitMQ consumers set a prefetch count so the broker doesn't flood a slow consumer with more unacked messages than it can hold in flight.

## Kafka as a log vs. a traditional queue

This distinction trips people up constantly, so it's worth being precise:

| | Traditional queue (RabbitMQ, SQS) | Kafka (distributed log) |
|---|---|---|
| Message lifecycle | Deleted/acked after consumption | Retained for a configured time/size regardless of consumption |
| Multiple consumers | Need fan-out (exchange/topic) to give each a copy | Native — each consumer group tracks its own offset over the same log |
| Replay | Not possible once acked/deleted | Trivial — reset consumer group offset and re-read history |
| Ordering | Per-queue FIFO (best effort with competing consumers) | Per-partition strict order |
| Consumption model | Push (broker pushes to consumer) | Pull (consumer polls and tracks its own offset) |
| Best fit | Task distribution, RPC-style workflows, DLQ-centric error handling | Event streaming, audit logs, event sourcing, high-throughput pipelines, multiple independent readers of the same history |

Kafka's "it's a log, not a queue" nature is exactly what makes it the natural transport for [event sourcing](event-sourcing.md) and [CQRS](cqrs-pattern.md) projections — consumers can replay the entire history to rebuild state, which a traditional queue that deletes on ack cannot do.

## Trade-offs summary

- **Use a traditional queue (RabbitMQ/SQS)** when: you need simple task distribution, flexible routing (topic/header exchanges), per-message TTL/priority, and don't need replay.
- **Use a log (Kafka/Kinesis/Pulsar)** when: you need high throughput, multiple independent consumer groups reading the same stream, replay/reprocessing, or you're building event sourcing / stream processing.
- **Managed vs self-hosted**: SQS/SNS/EventBridge trade configurability for near-zero operational burden; Kafka/RabbitMQ self-hosted give more control at the cost of running a stateful distributed system (partition rebalancing, disk management, ZooKeeper/KRaft or Erlang clustering).

## Illustrative snippet — idempotent consumer (pseudocode)

```python
def handle_message(msg):
    if dedupe_store.exists(msg.id):        # already processed
        ack(msg)
        return
    with db.transaction():
        apply_business_logic(msg.payload)
        dedupe_store.put(msg.id, ttl=7*24*3600)
    ack(msg)   # only ack after successful commit
```

## Common interview follow-ups

**Q: How would you achieve exactly-once processing given that the broker only guarantees at-least-once?**
Push idempotency to the consumer: dedupe on message ID, or make writes naturally idempotent (upserts, conditional updates). Never rely on the broker alone for exactly-once semantics across a system boundary — it can only guarantee that within its own internal transaction log (e.g., Kafka transactions for Kafka-to-Kafka).

**Q: A consumer is falling behind — Kafka consumer lag is growing. What do you do?**
Diagnose first: is it a slow downstream dependency, insufficient partition/consumer parallelism, or a poison message stalling a partition? Fixes include adding partitions + consumers (up to partition count), scaling consumer processing (async I/O, batching), or isolating the slow path into its own topic so it doesn't block healthy traffic.

**Q: Why can't Kafka guarantee global ordering?**
Because partitions are the unit of parallelism — spreading messages across partitions is what lets you scale throughput horizontally. Guaranteeing global order across partitions would serialize all writes/reads, defeating the purpose. You only get ordering within a partition, so anything requiring strict order must share a partition key.

**Q: When would you pick SQS FIFO over SQS Standard, and what do you give up?**
Pick FIFO when correctness depends on order or exactly-once-within-a-window per group (e.g., financial ledger entries per account). You give up throughput (much lower TPS per queue/group) and pay slightly higher cost per request.

**Q: How do dead-letter queues interact with ordering guarantees?**
Pulling a poison message out to a DLQ after N retries is precisely what *preserves* ordering/throughput for everything behind it — without a DLQ, a single bad message can block a FIFO queue or partition indefinitely (head-of-line blocking).

## Related topics
- [Backpressure](../01-scaling-traffic/backpressure.md)
- [Event-Driven Architecture](event-driven-architecture.md)
- [Event Sourcing](event-sourcing.md)
- [Outbox Pattern](outbox-pattern.md)
- [Kafka-like Message Broker (practice)](../10-system-design-practice/kafka-like-message-broker.md)
- [Retry & Exponential Backoff](../01-scaling-traffic/retry-exponential-backoff.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
