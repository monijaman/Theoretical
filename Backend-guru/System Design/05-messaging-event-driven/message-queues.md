## Visibility timeout

A broker delivering a message doesn't immediately remove it from the queue. Instead, it temporarily **hides** (makes invisible) the message from other consumers for a configurable **visibility timeout**. During this window, the consumer is expected to process the message and acknowledge success.

```
Queue
  |
  +--> Consumer receives message
           |
           +--> message becomes invisible for N seconds
                   |
         +---------+---------+
         |                   |
      ack()              timeout expires
         |                   |
     message deleted     message becomes visible again
                          for another consumer
```

This mechanism is how systems like **Amazon SQS** implement **at-least-once delivery** without locking a message forever. If a consumer crashes, hangs, or loses network connectivity before acknowledging, the visibility timeout eventually expires and another consumer can retry the work.

The timeout should be longer than the expected processing time. If it's too short, healthy consumers may still be working when the message becomes visible again, causing duplicate processing. If it's too long, failed messages take longer to be retried.

---

## Retry strategies

Not every failure should immediately send a message to the dead-letter queue. Many failures are temporary (database failover, network hiccup, downstream service restart), so brokers typically retry a message several times before giving up.

A common retry flow is:

```
Message fails
      │
      ▼
Immediate retry
      │
      ▼
Exponential backoff
(wait 1s → 2s → 4s → 8s ...)
      │
      ▼
Still failing after N attempts
      │
      ▼
Dead-Letter Queue (DLQ)
```

Exponential backoff is preferred over immediate retries because it gives downstream systems time to recover. If thousands of consumers instantly retry failed requests, they can overwhelm an already unhealthy dependency—a phenomenon known as a **retry storm**.

Many systems also add **random jitter** to the delay so consumers don't all retry simultaneously.

---

## Kafka partitions and consumer scaling

Kafka's unit of parallelism is the **partition**. Each partition can be processed by at most one consumer within a consumer group at any given time.

```
Topic (6 partitions)

P0 ─────────► Consumer A
P1 ─────────► Consumer B
P2 ─────────► Consumer C
P3 ─────────► Consumer D
P4 ─────────► Consumer E
P5 ─────────► Consumer F
```

If a topic has six partitions, the maximum useful parallelism for a single consumer group is six consumers.

```
6 partitions
8 consumers

P0 -> C1
P1 -> C2
P2 -> C3
P3 -> C4
P4 -> C5
P5 -> C6

C7 (idle)
C8 (idle)
```

Adding more consumers than partitions does **not** increase throughput because some consumers will have no partitions assigned to them.

Conversely, increasing the partition count allows greater parallelism, but it also weakens ordering guarantees: Kafka guarantees ordering **only within a partition**, never across partitions.

Rule of thumb:

- More partitions → higher throughput and parallelism.
- Fewer partitions → stronger ordering for related events.
- Choose a partition key (such as `user_id` or `account_id`) so events requiring ordering always land in the same partition.

---

## Choosing the right message broker

Different brokers optimize for different workloads.

| Broker | Best for | Strengths | Trade-offs |
|---|---|---|---|
| **RabbitMQ** | Task queues, RPC workflows, flexible routing | Rich routing (direct, topic, fanout), priorities, TTLs, DLQs | Limited replay, lower throughput than log-based systems |
| **Apache Kafka** | Event streaming, analytics, event sourcing, CQRS | Extremely high throughput, replay, consumer groups, durable log | Operational complexity, partition-based ordering only |
| **Amazon SQS** | Managed cloud task queues | Fully managed, highly durable, integrates with AWS | Limited routing, replay capabilities compared to Kafka |
| **Amazon SNS** | Broadcast notifications | Simple fan-out to multiple subscribers | No message replay or long-term retention |
| **Amazon EventBridge** | Application and AWS service events | Event routing, filtering, SaaS/AWS integrations | Not designed for very high-throughput stream processing |
| **Apache Pulsar** | Large multi-tenant event streaming | Separate compute/storage, geo-replication, queue + stream model | Smaller ecosystem than Kafka |
| **Amazon Kinesis** | AWS-native streaming pipelines | Fully managed streaming, tight AWS integration | More AWS-specific and less flexible than Kafka |

Rule of thumb:

- **RabbitMQ / SQS** → Task distribution and background jobs.
- **Kafka / Pulsar / Kinesis** → Event streaming, replay, analytics, and event sourcing.
- **SNS / EventBridge** → Event fan-out and service integration rather than long-lived event storage.

## Related topics
- [Backpressure](../01-scaling-traffic/backpressure.md)
- [Event-Driven Architecture](event-driven-architecture.md)
- [Event Sourcing](event-sourcing.md)
- [Outbox Pattern](outbox-pattern.md)
- [Kafka-like Message Broker (practice)](../10-system-design-practice/kafka-like-message-broker.md)
- [Retry & Exponential Backoff](../01-scaling-traffic/retry-exponential-backoff.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
