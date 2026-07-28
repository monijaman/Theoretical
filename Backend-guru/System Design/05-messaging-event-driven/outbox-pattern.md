````md
# Outbox Pattern
[← Back to index](../readme.md)

## What it is and why interviewers ask about it

Many services need to perform two actions whenever something important happens:

1. Save a business change to the database.
2. Publish an event so other services know about it.

The problem is that these happen in **two different systems**. Your database transaction cannot atomically include a message broker like Kafka or RabbitMQ. If either operation succeeds while the other fails, the system becomes inconsistent.

The Outbox Pattern solves this by making the database the only thing involved in the business transaction. The event is stored inside the same transaction and published later by a separate process.

Interviewers ask about this because the obvious solution—"commit the database, then publish the event"—looks correct until you think about failures.

---

## The dual-write problem

Suppose an order is created.

### Database first

```text
1. Save order to database        ✓ Success
2. Publish OrderPlaced event     ✗ Broker unavailable
```

Result:

- The order exists.
- No other service knows it exists.
- Inventory is never reserved.
- Billing never charges.
- Analytics never updates.

The event has been lost.

### Broker first

```text
1. Publish OrderPlaced event     ✓ Success
2. Save order to database        ✗ Transaction rolls back
```

Result:

- Inventory reserves stock.
- Billing charges the customer.
- The order doesn't actually exist.

Now downstream systems reacted to something that never happened.

Neither ordering is safe because a crash can always occur between the two operations.

---

## The transactional outbox

Instead of publishing immediately, write the event into an **Outbox** table during the same database transaction as the business data.

```sql
BEGIN;

INSERT INTO orders (...);

INSERT INTO outbox (
    id,
    aggregate_id,
    event_type,
    payload,
    created_at
)
VALUES (...);

COMMIT;
```

The transaction now contains both pieces of information.

```text
            Single Database Transaction

+-----------------------------------------------+
|                                               |
|  Orders Table       Outbox Table              |
|                                               |
|  Order #123         OrderPlaced Event         |
|                                               |
+-----------------------------------------------+
                    │
                    │ committed together
                    ▼
          Relay publishes event later
```

If the transaction commits:

- the order exists,
- the event is guaranteed to exist.

If the transaction rolls back:

- neither exists.

No inconsistent state is possible.

---

## The relay process

Publishing is performed by a completely separate component called the **relay**.

Its job is simple:

1. Read unpublished outbox rows.
2. Publish them to the broker.
3. Mark them as published (or delete them).

### Polling relay

The simplest implementation periodically checks the table.

```python
while True:
    events = load_unpublished_events()

    for event in events:
        broker.publish(event)
        mark_as_published(event)
```

Advantages:

- Simple
- Easy to understand
- Works almost everywhere

Disadvantages:

- Adds polling delay
- Continuously queries the database

---

### CDC (Change Data Capture)

Instead of polling, a CDC tool such as Debezium watches the database's write-ahead log.

```text
Postgres WAL
      │
      ▼
 Debezium
      │
      ▼
 Kafka Connect
      │
      ▼
 Kafka Topic
```

Advantages:

- Near real-time
- No polling queries
- Lower database load

Disadvantages:

- More infrastructure
- Operational complexity
- Requires CDC tooling

For smaller systems, polling is usually sufficient. High-throughput platforms often use CDC.

---

## Delivery is still at-least-once

The Outbox Pattern guarantees the event is **never lost**, but it does **not** guarantee it is published only once.

Example:

```text
Relay publishes event
        │
        ▼
Broker receives event
        │
Relay crashes before updating Outbox
```

When the relay restarts, it sees the event as unpublished and sends it again.

Duplicate delivery is expected.

Therefore consumers must always be **idempotent**.

Typical approaches include:

- Store processed event IDs.
- Use UPSERT operations.
- Use naturally idempotent updates.
- Ignore duplicate event IDs.

The complete guarantee becomes:

```text
Database Transaction
        │
        ▼
Outbox Record (atomic)
        │
        ▼
Broker (at-least-once)
        │
        ▼
Idempotent Consumer
        │
        ▼
Correct business outcome
```

Exactly-once business behavior comes from:

- atomic database writes,
- reliable retries,
- idempotent consumers.

Not from the broker itself.

---

## Outbox Pattern vs. Two-Phase Commit (2PC)

Another theoretical solution is Two-Phase Commit (2PC), where both the database and broker participate in one distributed transaction.

| Feature | Outbox Pattern | 2PC |
|---|---|---|
| Distributed transaction | No | Yes |
| Broker XA support required | No | Yes |
| Performance | Fast | Slower |
| Blocking during failures | No | Yes |
| Kafka compatible | Yes | No (Kafka doesn't support XA) |
| Production adoption | Very common | Rare |

Modern distributed systems overwhelmingly prefer the Outbox Pattern because it is simpler, faster, and works with virtually every message broker.

---

## Trade-offs

| | Naive Dual Write | Outbox Pattern |
|---|---|---|
| Atomicity | None | Guaranteed within the database |
| Lost events | Possible | Prevented |
| Duplicate events | Rare | Expected |
| Consumer requirement | None | Must be idempotent |
| Infrastructure | None | Outbox + relay |
| Reliability | Low | High |
| Complexity | Low | Moderate |

---

## When should you use it?

Use the Outbox Pattern when a service:

- owns its own database,
- publishes events,
- communicates asynchronously,
- participates in event-driven architecture,
- feeds CQRS read models,
- integrates with Kafka, RabbitMQ, SQS, or similar brokers.

It is one of the foundational reliability patterns in microservice architectures.

---

# Common interview follow-ups

### Q: Why can't I publish after committing the database?

Because the application might crash immediately after the commit. The database change survives, but the event is lost forever.

---

### Q: Why not publish first?

Because publishing cannot be rolled back. Other services may already process the event before the database transaction fails.

---

### Q: What if the relay publishes twice?

That's normal.

Consumers must be idempotent so duplicate events have no additional business effect.

---

### Q: Does the Outbox Pattern guarantee exactly-once delivery?

No.

It guarantees reliable **at-least-once** delivery.

Exactly-once business behavior is achieved by combining retries with idempotent consumers.

---

### Q: How do you prevent the Outbox table from growing forever?

After successful publication:

- delete processed rows,
- archive old rows,
- or run scheduled cleanup jobs.

The Outbox is temporary storage, not permanent history.

---

### Q: How is event ordering preserved?

Publish events in commit order and partition by the aggregate identifier (for example, `order_id`).

This keeps all events for the same entity in order while allowing unrelated entities to be processed in parallel.

---

### Q: When should I use CDC instead of polling?

Use polling when:

- event volume is moderate,
- a few seconds of delay is acceptable,
- operational simplicity matters.

Use CDC when:

- propagation must be nearly real-time,
- event volume is high,
- polling becomes inefficient,
- Kafka and Debezium are already part of the platform.

---

### Q: How does the Outbox Pattern relate to Event Sourcing and CQRS?

The Outbox Pattern is designed for traditional CRUD systems.

The database remains the source of truth, while the outbox guarantees every committed change eventually becomes an event.

Those events can then:

- update CQRS read models,
- notify other microservices,
- feed analytics pipelines,
- trigger workflows.

In Event Sourcing, the event log itself is already the source of truth, so a separate outbox is often unnecessary.
````

## Related topics
- [Event Sourcing](event-sourcing.md)
- [CQRS Pattern](cqrs-pattern.md)
- [Message Queues](message-queues.md)
- [Event-Driven Architecture](event-driven-architecture.md)
- [Distributed Transactions](../02-data-storage/distributed-transactions.md)
- [Kafka-like Message Broker (practice)](../10-system-design-practice/kafka-like-message-broker.md)
