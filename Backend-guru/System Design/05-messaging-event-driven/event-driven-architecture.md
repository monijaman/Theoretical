# Event-Driven Architecture
[← Back to index](../readme.md)

---

# Event-Driven Architecture

## What is Event-Driven Architecture?

**Event-Driven Architecture (EDA)** is a software architecture where services communicate by **publishing events** instead of calling each other directly.

An **event** represents something that has already happened, such as:

- Order placed
- Payment completed
- User registered
- Product updated

Instead of asking another service to perform work immediately, a service simply announces:

> "This happened."

Any service interested in that event reacts independently.

---

## Why Interviewers Ask This

Interviewers want to know whether you understand:

- How to decouple microservices
- When asynchronous communication is better than synchronous APIs
- Eventual consistency
- Scalability trade-offs
- Failure isolation
- Workflow coordination

Many modern systems (Uber, Netflix, Amazon, Airbnb) rely heavily on event-driven communication.

---

# Traditional Request/Response vs Event-Driven

## Traditional Synchronous Flow

```
Order Service
      |
      v
Inventory Service
      |
      v
Payment Service
      |
      v
Shipping Service
```

Every service waits for the previous one.

If one service is slow or unavailable...

Everything waits.

Problems:

- Tight coupling
- Higher latency
- Cascading failures
- Difficult scaling

---

## Event-Driven Flow

```
              OrderPlaced Event
                     |
                     v
              Message Broker
          /         |          \
         /          |           \
Inventory     Payment      Analytics
 Service       Service       Service
```

Order Service doesn't know who consumes the event.

Each consumer processes it independently.

Advantages:

- Loose coupling
- Better scalability
- Better fault isolation
- Easy to add new consumers

---

# Core Components

An event-driven system usually contains four parts.

## 1. Producer

Produces events.

Example:

```
Order Service

publishes

OrderPlaced
```

---

## 2. Event Broker

Receives events and distributes them.

Examples:

- Kafka
- RabbitMQ
- Amazon SNS/SQS
- Pulsar
- NATS

The broker stores or forwards events to interested consumers.

---

## 3. Consumer

Consumes events.

Example:

```
Payment Service

listens for

OrderPlaced
```

---

## 4. Event

A record describing something that already happened.

Example:

```json
{
  "event": "OrderPlaced",
  "orderId": "O-123",
  "customerId": "C-50",
  "timestamp": "2026-07-29T12:00:00Z"
}
```

Events should describe **facts**, not requests.

Good:

```
OrderPlaced
```

Bad:

```
CreateInvoice
```

The first describes something that happened.

The second is a command.

---

# Event Notification vs Event-Carried State Transfer

One of the most common interview questions.

---

## Event Notification

The event only contains minimal information.

```
{
  "event":"OrderPlaced",
  "orderId":"123"
}
```

Consumers call the producer to fetch details.

```
Consumer
     |
HTTP Request
     |
Order Service
```

### Advantages

- Small events
- Single source of truth
- Easier schema evolution

### Disadvantages

- Creates synchronous dependency
- Producer must be available
- Can overload producer

---

## Event-Carried State Transfer

The event contains all necessary data.

```
{
  "event":"OrderPlaced",
  "orderId":"123",
  "customerId":"456",
  "items":[...],
  "total":120
}
```

Consumers never call Order Service.

They already have the data.

### Advantages

- Fully decoupled
- Works if producer is offline
- Supports replay
- Great for CQRS

### Disadvantages

- Larger payloads
- Data duplication
- Schema versioning becomes important

---

## Which Should You Choose?

Use **Event Notification** when:

- Data is large
- Consumers rarely need full details

Use **Event-Carried State Transfer** when:

- Consumers build read models
- Services must stay independent
- Replay is required

Most mature systems use **Event-Carried State Transfer**.

---

# Choreography vs Orchestration

Another favorite interview topic.

---

## Choreography

There is **no central coordinator**.

Each service reacts to events.

```
OrderPlaced
      |
      v
Inventory
      |
StockReserved
      |
      v
Payment
      |
PaymentCompleted
      |
      v
Shipping
```

Each service only knows about events.

### Advantages

- Very loosely coupled
- Easy to add new consumers
- Highly scalable

### Disadvantages

- Workflow is difficult to visualize
- Debugging is harder
- Compensation logic is scattered

---

## Orchestration

One service coordinates everything.

```
              Order Orchestrator
                /     |      \
               /      |       \
      Inventory Payment Shipping
```

The orchestrator controls the workflow.

Advantages:

- Easy to understand
- Centralized workflow
- Easier retries
- Easier compensation

Disadvantages:

- Central dependency
- Potential bottleneck
- Knows about every participant

---

## Rule of Thumb

Use **Choreography** for:

- Independent reactions
- Simple workflows
- Fan-out events

Use **Orchestration** for:

- Multi-step business processes
- Complex failure handling
- Long-running workflows

Examples:

- Temporal
- AWS Step Functions
- Camunda

---

# Event Broker

The broker sits between producers and consumers.

```
Producer
    |
    v
+-----------+
|   Kafka   |
+-----------+
   |   |   |
   |   |   |
Inventory
Billing
Analytics
Search
Fraud Detection
```

Adding another consumer requires:

**Zero changes to the producer.**

That's the biggest advantage of EDA.

---

# Eventual Consistency

EDA is usually **eventually consistent**.

Example:

```
User places order

↓

Order stored

↓

Event published

↓

Inventory updated

↓

Payment processed

↓

Analytics updated
```

Between these steps the system is temporarily inconsistent.

For example:

```
Order exists

Inventory not updated yet
```

This is normal.

---

## Handling Eventual Consistency

Common techniques include:

### Optimistic UI

Immediately show success.

Don't wait for every consumer.

---

### Processing Status

Show:

```
Processing...
```

instead of pretending everything is finished.

---

### Retry Mechanisms

If a consumer fails,

the broker retries later.

---

### Dead Letter Queue (DLQ)

Events that repeatedly fail are moved to a DLQ for investigation instead of blocking the system.

---

# Benefits

- Loose coupling
- Independent deployments
- Easy horizontal scaling
- Better fault isolation
- Easier feature expansion
- Supports replay
- Enables CQRS
- Enables Event Sourcing
- High throughput

---

# Challenges

- Eventual consistency
- More difficult debugging
- Distributed tracing required
- Duplicate event handling
- Idempotency
- Event versioning
- Ordering guarantees
- More operational complexity

---

# Real-World Examples

## E-commerce

```
OrderPlaced

↓

Inventory

↓

Payment

↓

Shipping

↓

Notification

↓

Analytics
```

---

## Ride Sharing

```
RideRequested

↓

Matching Service

↓

Driver Assigned

↓

Payment

↓

Location Tracking

↓

Analytics
```

---

## Banking

```
MoneyTransferred

↓

Fraud Detection

↓

Notification

↓

Audit

↓

Ledger

↓

Analytics
```

One event triggers many independent services.

---

# Best Practices

- Design immutable events
- Keep event names meaningful
- Include timestamps
- Include correlation IDs
- Make consumers idempotent
- Version event schemas
- Monitor consumer lag
- Use retries with DLQs
- Avoid overly large payloads
- Document every event contract

---

# Advantages vs Disadvantages

| Advantages | Disadvantages |
|------------|---------------|
| Loose coupling | Eventual consistency |
| Better scalability | Harder debugging |
| Independent deployments | More infrastructure |
| Better fault isolation | Duplicate events |
| Easy to add consumers | Schema evolution |
| Supports replay | Ordering challenges |

---

# Interview Cheat Sheet

### When should you use Event-Driven Architecture?

- Microservices
- Asynchronous workflows
- High scalability
- Multiple independent consumers

---

### When should you avoid it?

- Simple CRUD applications
- Immediate synchronous responses are required
- Small systems with few integrations

---

### What is the biggest trade-off?

You gain:

- Scalability
- Decoupling
- Availability

But you lose:

- Immediate consistency
- Simplicity
- Easier debugging

---

# Common Interview Questions

### Why use a message broker instead of HTTP?

Because producers don't need to know who consumes the event, enabling loose coupling and asynchronous processing.

---

### What is eventual consistency?

Consumers update independently after an event is published, so different parts of the system may temporarily observe different states.

---

### What is the difference between Event Notification and Event-Carried State Transfer?

- **Notification** → tells consumers that something happened.
- **State Transfer** → includes enough data for consumers to process the event without calling the producer.

---

### Choreography vs Orchestration?

- **Choreography** → services react to events independently.
- **Orchestration** → a central coordinator manages the workflow.

---

### How do you debug an event-driven system?

Use:

- Correlation IDs
- Distributed tracing (OpenTelemetry)
- Centralized logging
- Monitoring consumer lag
- Dead Letter Queues

---

# Key Takeaways

- Events represent **facts**, not commands.
- Producers publish events without knowing who consumes them.
- Consumers process events independently.
- Event-driven systems trade **strong consistency** for **scalability and loose coupling**.
- They are the foundation of modern microservices, CQRS, Event Sourcing, and Saga-based architectures.

## Related topics
- [Message Queues](message-queues.md)
- [Event Sourcing](event-sourcing.md)
- [CQRS Pattern](cqrs-pattern.md)
- [Outbox Pattern](outbox-pattern.md)
- [Strong vs. Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [Distributed Tracing](../08-reliability-operations/distributed-tracing.md)
- [Microservices Architecture](../07-architecture-patterns/microservices-architecture.md)
