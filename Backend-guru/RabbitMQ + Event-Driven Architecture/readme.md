# RabbitMQ & Event-Driven Architecture

Learn how publishers, queues, and consumers work together. Follow an order event through routing, processing, retries, and a multi-step workflow.

## Start Here

**Before you begin:** Asynchronous JavaScript, JSON messages, and basic database transactions.

Read the explanation before each code example, then follow the data through the normal path and one failure case. The snippets teach individual concepts; application helpers, package setup, credentials, and deployment configuration are not all included.

## Contents

- [Quick Analogies](#quick-analogies)
- [1. Publishers and Consumers](#1-publishers-and-consumers)
- [2. RabbitMQ Topology: Exchanges and Queues](#2-rabbitmq-topology-exchanges-and-queues)
- [3. Guaranteeing Message Delivery](#3-guaranteeing-message-delivery)
- [4. Idempotency: Safe Retries](#4-idempotency-safe-retries)
- [5. Choreography vs Orchestration](#5-choreography-vs-orchestration)
- [6. Real-World E-Commerce Order Flow](#6-real-world-e-commerce-order-flow)
- [7. Key Concepts Summary](#7-key-concepts-summary)
- [8. RabbitMQ CLI Quick Reference](#8-rabbitmq-cli-quick-reference)
- [Quick Cheat Sheet](#quick-cheat-sheet)
- [Practice Check](#practice-check)

## Key Terms

| Term | Meaning |
| --- | --- |
| Publisher | an application that sends messages. |
| Exchange | routes messages to queues using bindings. |
| Binding | a routing rule connecting an exchange and a queue. |
| Acknowledgment | a consumer signal that a delivery has been handled. |
| DLQ | dead letter queue; a destination for messages that cannot be processed normally. |


## Quick Analogies

| Concept | Analogy |
|---|---|
| Event | Newspaper headline — "User signed up!" broadcast to anyone interested |
| Message Broker | Postal service — sender drops mail, broker delivers, sender doesn't know/care who receives |
| Dead Letter Queue | Returned mail — undeliverable letters go to a special box for investigation |
| Idempotency | Mailing a cheque with an ID — if received twice, bank ignores the duplicate |
| Choreography | Jazz band — each musician reacts to others, no conductor |
| Orchestration | Orchestra with conductor — one entity directs every player step by step |

---

## 1. Publishers and Consumers

**The problem with direct calls:** If Order Service calls Email Service, Payment Service, and Analytics Service directly, Order Service must know about all of them. Every time you add a new service, you modify Order Service. It becomes a god object with too many dependencies.

**The event-driven solution:** Order Service simply announces "an order was created" and moves on. Any service that cares about that event subscribes to it independently. Order Service has zero knowledge of who is listening. You can add, remove, or modify consumers without touching the publisher.

This is the fundamental shift: instead of *"call these services"*, you *"announce what happened"*.

```typescript
// Order Service (Publisher)
// It only cares about creating the order and announcing it happened.
// It does NOT call Email, Analytics, or Notification directly.
app.post('/orders', async (req, res) => {
  const order = await db.createOrder(req.body);

  await eventBus.publish('order.created', {
    orderId: order.id,
    userId: order.userId,
    items: order.items,
    total: order.total,
    timestamp: new Date()
  });

  res.json(order); // responds immediately — doesn't wait for email or analytics
});
```

```typescript
// Email Service (Consumer) — knows nothing about Order Service internals
eventBus.subscribe('order.created', async (event) => {
  const user = await db.getUser(event.userId);
  await sendEmail(user.email, `Order ${event.orderId} confirmed`);
});

// Analytics Service (Consumer) — completely independent
eventBus.subscribe('order.created', async (event) => {
  await analytics.track({ event: 'order_created', revenue: event.total });
});
```

The same event triggers multiple independent actions. If you need a new service (e.g. fraud detection), you subscribe it to `order.created` — zero changes to Order Service.

---

## 2. RabbitMQ Topology: Exchanges and Queues

RabbitMQ sits between publishers and consumers. Publishers never send directly to a queue — they send to an **Exchange**. The exchange is responsible for routing the message to the right queue(s) based on rules. Registered consumers receive deliveries from their queues; clients can also explicitly fetch messages.

```text
Publisher → Exchange → (routing rules) → Queue(s) → Consumer(s)
```

The following examples cover three exchange types. RabbitMQ also supports headers exchanges, which route using message headers.

**Topic Exchange** — route by wildcard pattern matching on the routing key. Most common for microservices because you can subscribe to a whole domain (`order.*`) or a specific event (`order.created`).

- `order.*` matches `order.created`, `order.cancelled`, `order.updated`
- `#` matches zero or more words: `order.#` matches `order.created.v2`

**Direct Exchange** — route only if the routing key is an exact match. Good for targeted, point-to-point communication where only one service should receive the message (e.g. a specific worker queue).

**Fanout Exchange** — broadcast to all bound queues, ignoring the routing key entirely. Use when every subscriber must receive every message (e.g. cache invalidation broadcasts, system-wide notifications).

```text
Routing key: "order.created"

Topic exchange "app-events":
  └── email-queue    bound with "order.*"     → receives ✅
  └── payment-queue  bound with "order.*"     → receives ✅
  └── audit-queue    bound with "#"           → receives ✅ (wildcard)
  └── sms-queue      bound with "user.*"      → skipped  ❌ (no match)
```

```typescript
const amqp = require('amqplib');

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

// Declare a topic exchange (creates it if it doesn't exist)
const exchange = 'app-events';
await channel.assertExchange(exchange, 'topic', { durable: true });
// durable: true → exchange survives RabbitMQ restart

// Consumer: declare a queue, bind it to the exchange with a pattern
const queue = 'email-service.orders';
await channel.assertQueue(queue, { durable: true });
await channel.bindQueue(queue, exchange, 'order.*'); // receive all order events

// Publisher: send to exchange with a routing key
channel.publish(
  exchange,
  'order.created',    // routing key — exchange uses this to decide which queues get it
  Buffer.from(JSON.stringify({ orderId: '123', userId: '456', total: 99.99 }))
);


channel.consume(queue, async (message) => {
  const event = JSON.parse(message.content.toString());
  await sendEmail(event.userId);
  channel.ack(message); // tell RabbitMQ: "processed successfully, remove it"
});
```

---

## 3. Guaranteeing Message Delivery

Separate three questions: did the broker accept the publication, did it route to a queue, and did a consumer complete the work? Publisher confirms and consumer acknowledgments cover different steps. See [RabbitMQ acknowledgments and confirms](https://www.rabbitmq.com/docs/confirms).

**The problem:** A consumer can crash mid-processing. Without acknowledgment, RabbitMQ has no way of knowing whether the message was processed or lost.

With manual **acknowledgments (ACKs)** enabled, RabbitMQ tracks outstanding deliveries. When a consumer receives a message, RabbitMQ holds onto it until the consumer explicitly acknowledges it. Only after the ACK does RabbitMQ remove the message from the queue. If the consumer crashes before ACKing, RabbitMQ requeues the message and delivers it to another consumer.

This gives you **at-least-once delivery** — the message will be processed at least once, but possibly more than once if a crash happens after processing but before ACKing. That's why idempotency (section 4) is required alongside this.

Three outcomes when a consumer processes a message:

- `channel.ack(msg)` — success, remove from queue
- `channel.nack(msg, false, true)` — failed but retryable, put back in queue
- `channel.nack(msg, false, false)` — failed permanently, dead-letter if configured; otherwise discard

```typescript
// ❌ Wrong: ACK immediately before processing — looks reliable, but if sendEmail() fails,
// the message is already gone. No retry possible.
channel.consume(queue, async (message) => {
  channel.ack(message);         // acknowledged before work is done!
  await sendEmail(message);     // if this crashes, email is lost forever
});

// ✅ Correct: ACK only AFTER successful processing
channel.consume(queue, async (message) => {
  try {
    const event = JSON.parse(message.content.toString());
    await sendEmailIdempotent(event); // safe to retry (see section 4)
    channel.ack(message);            // only remove after confirmed success

  } catch (error) {
    if (isRetryable(error)) {
      channel.nack(message, false, true);  // requeue=true → retry
    } else {
      channel.nack(message, false, false); // dead-letter if configured; otherwise discard
    }
  }
});
```

**Publisher reliability:** In amqplib, `publish()` returns a flow-control boolean, not a promise confirming broker acceptance. Use a confirm channel for publisher confirmations and handle unroutable publications separately. The topology example above illustrates routing only.

**Dead Letter Queue (DLQ):** When a message is rejected with `requeue=false`, RabbitMQ dead-letters it if a dead letter exchange and suitable routing are configured; otherwise it is discarded. The DLQ is a separate queue where permanently failed messages accumulate for human investigation, alerting, or manual replay. Without a DLQ, these messages would be silently dropped.

```typescript
// Declare and bind the dead-letter destination before using it.
await channel.assertExchange('dlq-exchange', 'direct', { durable: true });
await channel.assertQueue('email-service-dlq', { durable: true });
await channel.bindQueue('email-service-dlq', 'dlq-exchange', 'failed-email');

// Configure the main queue to send failures to the DLQ exchange
await channel.assertQueue('email-service.orders', {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': 'dlq-exchange',          // where to send rejected messages
    'x-dead-letter-routing-key': 'failed-email'
  }
});

// A separate consumer reads from the DLQ — usually alerts ops or retries manually
channel.consume('email-service-dlq', async (message) => {
  const event = JSON.parse(message.content.toString());
  await alertOps(`Failed to send email for order ${event.orderId}`);
  channel.ack(message);
});
```

---

Repeated immediate requeueing can create a hot retry loop. Define retry limits, delays, and an investigation path for messages that keep failing. Queue declaration arguments must also match any existing queue; these snippets represent alternative setup examples.

## 4. Idempotency: Safe Retries

**The problem with at-least-once delivery:** Because RabbitMQ retries when a consumer crashes before ACKing, the same message can be processed more than once. For non-idempotent operations (charging a card, placing an order), this causes real harm.

```text
Consumer processes: "Charge $100"
     ↓
Payment succeeds, then consumer crashes before sending ACK
     ↓
RabbitMQ requeues the message (it never saw an ACK)
     ↓
Consumer processes again: "Charge $100"
     ↓
Customer charged $200 — disaster
```

**The solution** is to make every operation idempotent: if the same message arrives twice, the second processing is a no-op. The standard technique is an **idempotency key** — a unique ID attached to the message. The consumer uses that ID to coordinate durable processing state and recognize completed work. A separate check followed by a write is not sufficient under concurrency.

The payment provider call and a local database insert cannot generally share one database transaction. Use the same operation key for provider retries and atomically protect local state from competing consumers.

```text
Receive event with a stable payment operation ID
Validate the event and look up its durable processing state
If completed, acknowledge the delivery
Otherwise:
  Claim the operation atomically, or coordinate through a unique database key
  Call the payment provider using that same idempotency key
  Record the provider result in durable local state
  Acknowledge after the result is recorded
If the provider result is unknown, reconcile it before charging again
```

This is an algorithm sketch. The provider must support the stated idempotency behavior, and the application must define key scope, retention, concurrency, and recovery from an interrupted claim.

The idempotency key should be generated by the publisher (not the consumer) and must be globally unique per logical operation — a UUID or a combination of domain IDs works well.

---

## 5. Choreography vs Orchestration

These are two fundamentally different ways to coordinate a multi-step business process (like placing an order) across multiple services. Both use events, but who decides the flow is completely different.

---

### Choice 1: Choreography (Decentralized — each service reacts independently)

In choreography, **no single service knows the full flow**. Each service only knows: "when I see event X, I do my job and publish event Y." The business process emerges from the chain of reactions between services — like a relay race where each runner starts when they receive the baton, without anyone coordinating the whole race.

**How it works:** Order Service publishes `order.created`. Payment Service is subscribed to `order.created` — it charges the card and publishes `payment.processed`. Inventory Service is subscribed to `payment.processed` — it reserves stock and publishes `stock.reserved`. Email Service is subscribed to `stock.reserved` — it sends the confirmation. No service calls another directly. No single service sees the whole picture.

**Why it scales well:** Because services are fully independent, you can deploy, scale, or update Payment Service without touching any other service. Adding an independent observer can require little publisher change. A new gate, such as fraud approval before charging, changes the workflow and must be coordinated with existing consumers.

**Why it's hard to debug:** When something goes wrong, tracing the failure requires looking across multiple services and their logs. There's no single place that shows "we're at step 3 of 5." Distributed tracing tools (Jaeger, Zipkin) are almost mandatory.

```text
order.created → Payment Service → payment.processed → Inventory Service → stock.reserved → Email Service
```

```typescript
// Order Service — publishes, has no idea what happens next
eventBus.publish('order.created', { orderId: '123', total: 100 });

// Payment Service — reacts to order.created, publishes result
eventBus.subscribe('order.created', async (order) => {
  const result = await charge(order.total);

  if (result.success) {
    eventBus.publish('payment.processed', { orderId: order.orderId });
  } else {
    eventBus.publish('payment.failed', { orderId: order.orderId });
  }
});

// Inventory Service — reacts to payment.processed
eventBus.subscribe('payment.processed', async (event) => {
  try {
    await reserveInventory(event.orderId);
    eventBus.publish('stock.reserved', { orderId: event.orderId });
  } catch {
    eventBus.publish('stock.failed', { orderId: event.orderId });
  }
});

// Email Service — reacts to stock.reserved
eventBus.subscribe('stock.reserved', async (event) => {
  await sendConfirmationEmail(event.orderId);
});
```

| ✅ Pros | ❌ Cons |
|---|---|
| Services fully independent — deploy separately | No single place shows the full flow |
| Easy to extend — add new service, subscribe to existing event | Hard to debug — failure could be in any service |
| Scales well — each service scales independently | Testing requires all services to be running |
| No single point of failure | Rollback / compensation is complex — each service must handle its own undo |

---

### Choice 2: Orchestration (Centralized — one service directs the flow)

In orchestration, a dedicated **Saga Orchestrator** service knows the entire workflow. It calls each service in order, waits for a response, then decides what to do next — including rolling back completed steps if something fails later. Services don't know about each other or about the overall flow. They only respond to commands from the orchestrator.

**How it works:** The orchestrator receives `order.created`. It calls Payment Service and waits. If payment succeeds, it calls Inventory Service and waits. If inventory succeeds, it calls Email Service. If any step fails, the orchestrator calls **compensation actions** — it tells Payment Service to refund, tells Inventory Service to un-reserve. The orchestrator is the single source of truth for where the transaction is.

**Why it's easier to manage failures:** Because one service controls the whole flow, you know exactly which step failed and what needs to be rolled back. The compensation logic lives in one place.

**Why it becomes a bottleneck:** The orchestrator must be available for every order. It becomes tightly coupled to all services — if you add a new step, you modify the orchestrator. It is also a single point of failure if it goes down.

```text
Orchestrator:
  Step 1 → call Payment Service → wait → success?
  Step 2 → call Inventory Service → wait → success?
  Step 3 → call Email Service → done
  On failure at any step → call compensation (refund, un-reserve)
```

```typescript
class OrderSaga {
  async execute(order) {
    let paymentId = null;
    let inventoryReserved = false;

    try {
      // Step 1: Charge payment — orchestrator waits for result
      const payment = await this.paymentService.charge(order.total);
      paymentId = payment.id;

      // Step 2: Reserve inventory — only runs if payment succeeded
      await this.inventoryService.reserve(order.items);
      inventoryReserved = true;

      // Step 3: Send confirmation — only runs if inventory succeeded
      await this.emailService.sendConfirmation(order);

      return { status: 'success' };

    } catch (error) {
      // Compensation: undo completed steps in reverse order
      // This is what makes orchestration easier for failure handling —
      // the orchestrator knows exactly what was done and what needs reversing.
      if (inventoryReserved) {
        await this.inventoryService.release(order.items); // undo step 2
      }
      if (paymentId) {
        await this.paymentService.refund(paymentId); // undo step 1
      }

      return { status: 'failed', reason: error.message };
    }
  }
}
```

| ✅ Pros | ❌ Cons |
|---|---|
| Full visibility — one place shows the entire flow | Orchestrator is a bottleneck — all orders go through it |
| Failure handling is clear — orchestrator knows what to compensate | Tight coupling — orchestrator must know every service |
| Easy to debug — single place to add logging | Single point of failure — orchestrator going down halts all orders |
| Business logic centralized | Adding a step means modifying the orchestrator |

---

### When to choose which

Use **Choreography** when: services are truly independent, each step is a standalone reaction with no dependencies on what came before, and you're okay investing in distributed tracing.

Use **Orchestration** when: the flow has conditional branching, rollback/compensation is complex, or you need clear visibility into transaction state. Most financial workflows use orchestration for this reason.

Many real systems use both: choreography for simple notifications (email, analytics), orchestration for multi-step transactions (payment → inventory → fulfillment).

---

## 6. Real-World E-Commerce Order Flow

Follow the order state through each event. Define the compensation for every step that can succeed before a later step fails—for example, releasing reserved stock or refunding a charge.

This combines everything: publishers, consumers, at-least-once delivery with ACK, idempotency keys, and graceful failure handling.

```typescript
// ==================== Order Service ====================
// Responsibility: create the order record, publish the event, return immediately.
// Does NOT wait for payment or email — fully async.
class OrderService {
  async createOrder(userId, items) {
    const order = await db.orders.create({
      userId, items, status: 'pending', createdAt: new Date()
    });

    // order.id doubles as the idempotency key — unique per order
    await eventBus.publish('order.created', {
      orderId: order.id,
      userId,
      items,
      total: calculateTotal(items),
      idempotencyKey: order.id
    });

    return order; // responds to client before payment or email completes
  }
}

// ==================== Payment Service ====================
// Responsibility: charge the card when an order is created.
// Uses idempotency key to prevent double charges on retry.
class PaymentService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.eventBus.subscribe('order.created', (event) => this.processPayment(event));
  }

  async processPayment(event) {
    try {
      // Idempotency check — if we already charged for this order, skip
      const existing = await db.payments.findOne({ idempotencyKey: event.idempotencyKey });
      if (existing) {
        // Still publish success so downstream services can continue
        await this.eventBus.publish('payment.processed', event);
        return;
      }

      const payment = await this.chargeCard(event.total);

      await db.payments.create({
        orderId: event.orderId,
        amount: event.total,
        status: 'succeeded',
        idempotencyKey: event.idempotencyKey
      });

      await this.eventBus.publish('payment.processed', event);

    } catch (error) {
      // Publish failure so Order Service or orchestrator can react
      await this.eventBus.publish('payment.failed', {
        orderId: event.orderId,
        error: error.message,
        idempotencyKey: event.idempotencyKey
      });
    }
  }
}

// ==================== Email Service ====================
// Responsibility: send emails in response to order events.
// Subscribed to multiple event types — fully independent of other services.
class EmailService {
  constructor(eventBus) {
    eventBus.subscribe('payment.processed', (e) => this.sendConfirmation(e));
    eventBus.subscribe('payment.failed',    (e) => this.sendFailureNotice(e));
    eventBus.subscribe('order.cancelled',   (e) => this.sendCancellation(e));
  }

  async sendConfirmation(event) {
    // If this throws, no ACK is sent → RabbitMQ requeues → automatic retry
    const order = await db.orders.findOne({ id: event.orderId });
    const user  = await db.users.findOne({ id: order.userId });
    await this.emailProvider.send({
      to: user.email,
      template: 'order-confirmation',
      data: { order, user }
    });
  }
}
```

---

## 7. Key Concepts Summary

| Concept | What it is | Why it matters |
|---|---|---|
| **Event** | Immutable record of something that happened | Decouples publisher from consumer |
| **Exchange** | Routes messages to queues based on rules | One publisher can reach many consumers |
| **Queue** | Buffer that stores messages until consumed | Consumer can be down temporarily |
| **ACK** | Consumer confirms successful processing | Prevents message loss on consumer crash |
| **NACK** | Consumer rejects message (retry or DLQ) | Enables retry without message loss |
| **DLQ** | Queue for permanently failed messages | Prevents silent message drops |
| **Idempotency key** | Unique ID to detect duplicate processing | Makes at-least-once delivery safe |
| **Choreography** | Each service reacts to events independently | Decoupled, scalable, hard to trace |
| **Orchestration** | One service directs all others | Clear flow, easier rollback, tight coupling |

---

## 8. RabbitMQ CLI Quick Reference

These commands inspect or change a running broker. Start with queue and connection inspection. Queue deletion and user-management commands change broker state and belong in a controlled practice setup.

```bash
# Queue management
rabbitmqctl list_queues               # show all queues + message counts
rabbitmqctl purge_queue <name>        # clear all messages from a queue

# User management
rabbitmqctl add_user <user> <pwd>
rabbitmqctl set_permissions -p / <user> ".*" ".*" ".*"

# Monitoring
rabbitmqctl status                    # broker health
rabbitmqctl list_channels             # active channels
rabbitmqctl list_consumers            # which queues have active consumers

# Management UI (browser)
# http://localhost:15672  (default credentials: guest / guest)
```

---

## Quick Cheat Sheet

```text
Event-Driven  → publish what happened, don't call services directly
Exchange      → routes messages: Topic (pattern) | Direct (exact) | Fanout (all)
ACK           → always ACK after processing, never before
NACK + requeue → retryable error → put back in queue
NACK + DLQ    → permanent failure → send to dead letter queue
Idempotency   → check processed_events table before acting
Choreography  → decentralized reactions, no coordinator, hard to trace
Orchestration → centralized coordinator, clear flow, single point of failure

Rule: at-least-once delivery + idempotency = safe async system
```

## Practice Check

Publish an order event, process it with two subscribers, and explain how retries avoid duplicate effects. Explain one trade-off and one failure mode before moving on.

[Back to contents](#contents) · [Backend learning guide](../readme.md)
