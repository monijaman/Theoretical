# Outbox Pattern
[← Back to index](../readme.md)

## What it is and why it's asked

A service commonly needs to do two things atomically: write to its own database, and publish a message telling the rest of the system what happened. The trouble is that the database and the message broker are two separate systems with no shared transaction — you cannot wrap a Postgres `COMMIT` and a Kafka `produce` in one atomic unit. Whichever one you do second can fail after the first has already succeeded, and now the system is silently inconsistent. The outbox pattern is the standard, boring, production-proven answer to this, and interviewers ask about it because "just publish the event after you commit" is the wrong answer that sounds right, and knowing why it's wrong is the actual signal.

## The dual-write problem

```
Naive approach:
  1. db.commit(order)              <-- succeeds
  2. broker.publish(OrderPlaced)   <-- crashes / network blip / broker down

Result: order exists in the DB, but no one downstream ever finds out.
Inventory is never reserved, billing never charges the card — silent data loss.
```

Flipping the order doesn't fix it, it just moves the failure mode:

```
  1. broker.publish(OrderPlaced)   <-- succeeds
  2. db.commit(order)              <-- crashes / constraint violation / rollback

Result: consumers react to an order that was never actually committed.
Inventory reserves stock for an order that doesn't exist.
```

There is no ordering of "write to DB" and "publish to broker" as two independent calls that is safe, because between them there is always a window where one has happened and the other hasn't, and a crash in that window is a real, non-theoretical event at any meaningful scale.

## The transactional outbox: same transaction, one database

The fix is to stop treating "publish a message" as a call to a second system at all, at the moment the business transaction happens. Instead, write a row describing the event to an **outbox table in the same database**, in the **same local transaction** as the business change — a single-database transaction is atomic by definition, so this eliminates the dual-write entirely.

```sql
BEGIN;
  INSERT INTO orders (id, customer_id, total, status) VALUES (...);
  INSERT INTO outbox (id, aggregate_id, event_type, payload, created_at)
    VALUES (gen_random_uuid(), 'order-123', 'OrderPlaced', '{...}'::jsonb, now());
COMMIT;
```

Either both rows land, or neither does — normal ACID guarantees on a single database, no cross-system atomicity required. The event hasn't reached the broker yet, but it's durably recorded that it *must* reach the broker, which is the actual atomicity guarantee the system needs.

```
                     ONE local transaction
             +----------------------------------+
Business  -->|  orders table   +   outbox table  |
change       +----------------------------------+
                            |
                    (separate step, async)
                            v
                   relay reads outbox --> publishes to broker
```

## The relay: getting events from the outbox to the broker

A second process — the **relay** — is responsible for reading unpublished rows from the outbox and actually publishing them, then marking them published (or deleting them). Two common implementations:

**Polling relay** — a worker periodically queries for unpublished rows and publishes them:
```python
def relay_tick():
    rows = db.query("SELECT * FROM outbox WHERE published_at IS NULL ORDER BY created_at LIMIT 100")
    for row in rows:
        broker.publish(row.event_type, row.payload)
        db.execute("UPDATE outbox SET published_at = now() WHERE id = %s", row.id)
```
Simple to build and reason about, but adds polling latency (seconds, tunable) and load on the DB from repeated polling queries.

**CDC-based relay (Debezium)** — instead of polling, a change-data-capture connector tails the database's write-ahead log / binlog directly and streams every insert into the outbox table straight to the broker, near-instantly and without adding query load:
```
Postgres WAL --> Debezium connector --> Kafka Connect --> Kafka topic
   (row inserted into `outbox` is picked up from the replication stream, not via SQL polling)
```
This is the more common production setup at scale (used heavily at companies doing event-driven microservices with Kafka) because it has lower latency and doesn't compete with application traffic for database resources. The trade-off is operational: you're now running and monitoring a CDC pipeline (Debezium + Kafka Connect) as critical infrastructure.

Either way, once a row is published, it's typically deleted or archived from the outbox (it's a transient staging table, not permanent storage — that job belongs to the broker or, if full history matters, to an [event store](event-sourcing.md)).

## Delivery is still at-least-once — the consumer must be idempotent

The outbox pattern guarantees the event *will* eventually be published (durability across a crash), not that it will be published exactly once. A relay can crash after publishing but before marking the row as done, and will republish it on restart; a broker can redeliver on a consumer timeout. This composes with the same guarantee discussed in [Message Queues](message-queues.md): outbox delivery is **at-least-once**, and every downstream consumer must be idempotent (dedupe by event ID, or use naturally idempotent operations) for the overall pipeline to be correct.

```
Guarantee chain:
  DB write + outbox row  -->  atomic (single local transaction)
  outbox row  -->  broker   -->  at-least-once (relay/broker retry on failure)
  broker  -->  consumer      -->  at-least-once (redelivery on timeout/crash)

Net result: "exactly-once business effect" via at-least-once delivery + idempotent consumer,
never via a stronger delivery guarantee alone.
```

## Contrast with two-phase commit (2PC)

2PC is the "textbook" alternative: a distributed transaction coordinator asks both the database and the broker to *prepare* (vote yes/no), then tells both to *commit* only if both voted yes. It gives a stronger-sounding guarantee but is rarely used in practice for this problem:

| | Outbox pattern | 2PC (XA transactions) |
|---|---|---|
| Requires broker to support distributed transactions | No — broker only needs normal publish | Yes — broker must implement an XA/2PC participant |
| Blocking behavior | None — relay retries independently | Coordinator or participant crash mid-protocol can leave resources locked, blocking |
| Performance | Low overhead (one extra table write) | Higher latency — multiple network round trips per transaction, held locks |
| Kafka support | N/A — not needed | Effectively unsupported; Kafka does not participate in XA |
| Operational maturity | Widely used, well-understood failure modes | Rarely used in modern distributed systems; considered legacy for this problem |
| Failure recovery | Simple — republish unpublished/unconfirmed outbox rows | Requires a recovery coordinator to resolve in-doubt transactions |

2PC's blocking nature and poor fit with modern brokers (most, including Kafka, don't support XA at all) is why virtually every real-world "how do I atomically write to my DB and publish an event" problem is solved with the transactional outbox instead.

## Trade-offs summary

| | Naive dual-write | Transactional outbox |
|---|---|---|
| Atomicity | None — two independent operations | Guaranteed at the DB-write step (single local transaction) |
| Failure mode | Silent inconsistency (lost or phantom events) | Event durably recorded even if publish is delayed |
| Delivery guarantee to broker | Best-effort, can be zero | At-least-once (relay retries until published) |
| Added infrastructure | None | Outbox table + relay process (polling or CDC/Debezium) |
| Latency to downstream consumers | Immediate (when it works) | Small added delay (poll interval, or near-real-time with CDC) |
| Operational cost | Low, but fragile | Extra table to maintain/prune, relay to monitor, possibly a CDC pipeline |

## Common interview follow-ups

**Q: Why not just publish to the broker first and roll back the DB write if publishing fails?**
Because you can't "un-publish" a message once it's in flight to a broker — other consumers may already have read and acted on it before you decide to roll back. Atomicity has to be anchored on the side that supports real rollback (the local DB transaction), not the side that doesn't.

**Q: What happens if the relay publishes an event twice?**
That's expected and fine as long as downstream consumers are idempotent — the outbox pattern's guarantee is at-least-once delivery, not exactly-once, so duplicate delivery is a normal, designed-for case rather than a bug.

**Q: How do you avoid the outbox table growing forever?**
Periodically delete or archive rows once the relay confirms publish (and after any retention window you want for debugging), or use a lightweight TTL/cleanup job — the outbox is meant to be a transient staging area, not long-term storage; if you need permanent history, that's the job of an [event store](event-sourcing.md), not the outbox table.

**Q: How does the outbox pattern interact with ordering guarantees?**
Ordering within an aggregate is typically preserved by publishing outbox rows in `created_at`/sequence order and routing by the same partition key (e.g., `aggregate_id`) the business entity uses, so a downstream Kafka partition sees events for one entity in the order they were committed — same ordering rules as discussed in [Message Queues](message-queues.md).

**Q: Is CDC (Debezium) strictly better than polling for the relay?**
It's lower latency and lower DB load, but it adds a piece of infrastructure (Kafka Connect + Debezium, tied to the DB's replication log format) that needs its own monitoring and upgrade path. For lower-throughput services, a simple polling relay is often the pragmatic choice; CDC earns its complexity at higher event volume or when near-real-time propagation actually matters to the business.

**Q: Where does the outbox pattern fit relative to CQRS and event sourcing?**
It's the plumbing that makes non-event-sourced systems able to feed [CQRS](cqrs-pattern.md) read models or other services reliably: the write DB stays a normal current-state table, but the outbox guarantees that every state change is eventually and reliably turned into an event, which is the same downstream contract that a full event-sourced system gets natively from its event store.

## Related topics
- [Event Sourcing](event-sourcing.md)
- [CQRS Pattern](cqrs-pattern.md)
- [Message Queues](message-queues.md)
- [Event-Driven Architecture](event-driven-architecture.md)
- [Distributed Transactions](../02-data-storage/distributed-transactions.md)
- [Kafka-like Message Broker (practice)](../10-system-design-practice/kafka-like-message-broker.md)
