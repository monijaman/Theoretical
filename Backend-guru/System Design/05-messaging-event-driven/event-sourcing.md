# Event Sourcing
[← Back to index](../readme.md)

---

# Event Sourcing

## What is Event Sourcing?

Traditional applications store the **current state** of an object.

Event Sourcing stores **every change (event)** that happened to that object.

The current state is **reconstructed by replaying those events**.

Instead of storing:

```
Account
-------
Balance = 80
```

You store:

```
AccountOpened ($100)

↓

MoneyWithdrawn ($20)
```

The balance is calculated by replaying those events:

```
$100 - $20 = $80
```

The event log becomes the **source of truth**.

---

## Why Interviewers Ask This

Interviewers want to know whether you understand:

- Events vs current state
- Append-only storage
- Audit history
- Replaying state
- Snapshotting
- Schema evolution
- CQRS integration

It's commonly discussed together with:

- CQRS
- Event-Driven Architecture
- Kafka
- Distributed Systems

---

# Traditional CRUD vs Event Sourcing

## Traditional CRUD

```
UPDATE Account

Balance

100

↓

80
```

The previous value disappears.

Current database:

```
Account

Balance = 80
```

History is lost unless you build a separate audit system.

---

## Event Sourcing

Every change is stored forever.

```
AccountOpened ($100)

↓

MoneyWithdrawn ($20)

↓

MoneyDeposited ($30)

↓

MoneyWithdrawn ($10)
```

Nothing is overwritten.

Current balance is simply:

```
100
-20
+30
-10

=100
```

History never disappears.

---

# Core Idea

Instead of storing state:

```
Current State
```

Store:

```
State Changes
```

These changes are called **Events**.

Examples:

- UserRegistered
- MoneyDeposited
- OrderPlaced
- PaymentCompleted
- ProductCreated

Events represent facts.

They should never change once written.

---

# Rebuilding State (Replay)

To calculate the current state:

1. Load all events.
2. Replay them in order.
3. Apply each event.

Example:

```
Events

↓

AccountOpened ($100)

↓

MoneyWithdrawn ($20)

↓

MoneyDeposited ($50)
```

Replay:

```
Balance

0

↓

100

↓

80

↓

130
```

Current balance:

```
$130
```

---

## Example Code

```python
def replay(account_id):
    events = event_store.load(account_id)

    account = Account.empty()

    for event in events:
        account.apply(event)

    return account
```

Replay simply applies every event in order.

---

# Event Store

Unlike a traditional database,

an Event Store only supports two major operations.

## Append

```
Add new event
```

Never:

```
UPDATE
DELETE
```

---

## Read

Load all events for an entity.

```
Account 1

↓

Event1

↓

Event2

↓

Event3
```

Then replay them.

---

# Example Event Store Table

```sql
CREATE TABLE events (

    stream_id UUID,

    sequence_no BIGINT,

    event_type TEXT,

    payload JSONB,

    occurred_at TIMESTAMPTZ,

    PRIMARY KEY(stream_id, sequence_no)

);
```

Each entity has its own event stream.

```
Account A

Event 1

Event 2

Event 3
```

```
Account B

Event 1

Event 2
```

---

# Snapshots

Replaying thousands of events every time would be slow.

Imagine:

```
500,000 events

↓

Replay

↓

Current Balance
```

Too expensive.

Instead we save periodic snapshots.

---

## Example

```
Events

1
2
3
4
5
6
7
8

↓

Snapshot

↓

9
10
11
12
```

To rebuild state:

```
Load Snapshot

↓

Replay only events

9
10
11
12
```

Instead of replaying all twelve events.

---

## Benefits

- Faster reads
- Faster startup
- Less replay work

Snapshots are **optimizations only**.

If deleted,

they can always be recreated by replaying events.

---

# Optimistic Concurrency

Suppose two users update the same account.

```
Current Version = 5
```

User A:

```
Append Event 6
```

User B:

```
Append Event 6
```

Only one should succeed.

The database checks:

```
Expected Version = 5
```

If another writer already inserted Event 6,

the second write fails.

The application:

- Reloads events
- Rebuilds state
- Retries

This prevents lost updates.

---

# Schema Evolution

Events live forever.

Your code changes.

How do old events still work?

Example:

Original event:

```json
{
  "orderId":"123",
  "total":100
}
```

Months later you need:

```json
{
  "orderId":"123",
  "total":100,
  "currency":"USD"
}
```

Millions of old events don't contain "currency".

---

## Common Strategies

### 1. Additive Changes

Only add optional fields.

Old events still work.

---

### 2. Upcasting

Convert old events into new versions during replay.

```
Stored

↓

Version 1

↓

Upcaster

↓

Version 2

↓

Application
```

The application only sees the newest version.

---

### 3. Versioned Events

```
OrderPlacedV1

OrderPlacedV2

OrderPlacedV3
```

Application handles each version explicitly.

---

### 4. Schema Registry

Systems like:

- Confluent Schema Registry
- AWS Glue Schema Registry

Prevent incompatible event changes.

---

# Audit Trail

One of Event Sourcing's biggest strengths.

Because nothing is deleted,

you always know:

- Who changed it
- What changed
- When
- Why

Example:

```
09:00

AccountOpened

↓

10:05

Deposit

↓

12:15

Withdrawal

↓

13:20

Transfer
```

The complete history is preserved forever.

Perfect for:

- Banking
- Healthcare
- Accounting
- Compliance
- Finance

---

# Time Travel

Since every event exists,

you can reconstruct state at any point in history.

Example:

```
Replay until

10:00 AM
```

You get the account exactly as it looked then.

Or:

```
Replay until

Yesterday
```

Or:

```
Replay until

Last Month
```

Traditional CRUD systems usually cannot do this.

---

# Event Sourcing + CQRS

These patterns often work together.

```
Command

↓

Event Store

↓

Events

↓

Projector

↓

Read Database
```

The Event Store is optimized for writes.

Read databases are optimized for queries.

This is CQRS.

---

# Event Sourcing + Kafka

Kafka is naturally append-only.

```
Producer

↓

Kafka Topic

↓

Consumers
```

Many systems use Kafka as:

- Event transport
- Event storage
- Replay mechanism

Although dedicated Event Stores (EventStoreDB, Axon) provide richer features.

---

# Benefits

- Complete audit history
- Replay capability
- Time travel
- Easy debugging
- Supports CQRS
- Easy projections
- Immutable history
- Excellent for compliance

---

# Challenges

- More complex architecture
- Slower replay without snapshots
- Schema evolution
- More storage required
- Harder learning curve
- GDPR/privacy challenges
- Event versioning

---

# Real-World Examples

## Banking

```
AccountOpened

↓

Deposit

↓

Withdraw

↓

Transfer
```

Every financial operation becomes an immutable event.

---

## E-commerce

```
OrderPlaced

↓

PaymentCaptured

↓

Packed

↓

Shipped

↓

Delivered
```

The entire order lifecycle is preserved.

---

## Healthcare

```
PatientRegistered

↓

DiagnosisAdded

↓

PrescriptionIssued

↓

MedicationUpdated
```

Medical history becomes fully traceable.

---

# Best Practices

- Events should be immutable
- Never update old events
- Use snapshots for performance
- Version event schemas
- Include timestamps
- Include correlation IDs
- Keep events business-focused
- Replay should be deterministic

---

# CRUD vs Event Sourcing

| CRUD | Event Sourcing |
|-------|----------------|
| Stores current state | Stores every event |
| History usually lost | Complete history |
| Fast reads | Replay required |
| Easy to understand | More complex |
| Simple schema changes | Requires versioning |
| Limited auditing | Built-in audit trail |
| Best for most applications | Best for audit-heavy systems |

---

# When Should You Use Event Sourcing?

Good fit:

- Banking
- Payments
- Financial ledgers
- Inventory systems
- Healthcare
- Compliance-heavy applications
- Systems requiring audit history

Avoid when:

- Simple CRUD apps
- Internal admin panels
- Small business systems
- Basic CMS applications

Most applications **do not need Event Sourcing**.

---

# Interview Cheat Sheet

### What is Event Sourcing?

Store every state-changing event instead of the current state.

---

### What is replay?

Reconstruct current state by applying events in order.

---

### Why use snapshots?

To avoid replaying thousands of events every time.

---

### Why is Event Sourcing good for auditing?

Because every change is permanently stored.

---

### Does Event Sourcing require CQRS?

No.

But they naturally complement each other.

---

### Can you delete events?

Generally no.

Events are immutable.

---

### What is the biggest downside?

Higher complexity:

- Replay
- Snapshots
- Schema evolution
- Storage
- Operational overhead

---

# Key Takeaways

- Event Sourcing stores **facts**, not current state.
- The **event log** is the source of truth.
- Current state is rebuilt by replaying events.
- Snapshots improve replay performance.
- Event Sourcing naturally complements CQRS.
- It provides excellent auditability and time travel but introduces significant architectural complexity, making it suitable only for domains where those benefits outweigh the cost.

## Related topics
- [CQRS Pattern](cqrs-pattern.md)
- [Outbox Pattern](outbox-pattern.md)
- [Message Queues](message-queues.md)
- [Event-Driven Architecture](event-driven-architecture.md)
- [Strong vs. Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [Kafka-like Message Broker (practice)](../10-system-design-practice/kafka-like-message-broker.md)
