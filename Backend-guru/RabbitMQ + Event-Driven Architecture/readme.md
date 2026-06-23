# RabbitMQ + Event-Driven Architecture

> **Core idea:** Instead of Service A calling Service B directly (tight coupling), Service A publishes an event ("something happened") and any interested service reacts — without A knowing who they are.

---

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

RabbitMQ sits between publishers and consumers. Publishers never send directly to a queue — they send to an **Exchange**. The exchange is responsible for routing the message to the right queue(s) based on rules. Consumers then pull messages from their queues.

```
Publisher → Exchange → (routing rules) → Queue(s) → Consumer(s)
```

There are three exchange types, each with a different routing strategy:

**Topic Exchange** — route by wildcard pattern matching on the routing key. Most common for microservices because you can subscribe to a whole domain (`order.*`) or a specific event (`order.created`).
- `order.*` matches `order.created`, `order.cancelled`, `order.updated`
- `#` matches zero or more words: `order.#` matches `order.created.v2`

**Direct Exchange** — route only if the routing key is an exact match. Good for targeted, point-to-point communication where only one service should receive the message (e.g. a specific worker queue).

**Fanout Exchange** — broadcast to all bound queues, ignoring the routing key entirely. Use when every subscriber must receive every message (e.g. cache invalidation broadcasts, system-wide notifications).

```
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

// Publisher: send to exchange with a routing key
await channel.publish(
  exchange,
  'order.created',    // routing key — exchange uses this to decide which queues get it
  Buffer.from(JSON.stringify({ orderId: '123', userId: '456', total: 99.99 }))
);

// Consumer: declare a queue, bind it to the exchange with a pattern
const queue = 'email-service.orders';
await channel.assertQueue(queue, { durable: true });
await channel.bindQueue(queue, exchange, 'order.*'); // receive all order events

channel.consume(queue, async (message) => {
  const event = JSON.parse(message.content.toString());
  await sendEmail(event.userId);
  channel.ack(message); // tell RabbitMQ: "processed successfully, remove it"
});
```

---

## 3. Guaranteeing Message Delivery

**The problem:** A consumer can crash mid-processing. Without acknowledgment, RabbitMQ has no way of knowing whether the message was processed or lost.

By default, RabbitMQ uses **acknowledgments (ACKs)**. When a consumer receives a message, RabbitMQ holds onto it until the consumer explicitly acknowledges it. Only after the ACK does RabbitMQ remove the message from the queue. If the consumer crashes before ACKing, RabbitMQ requeues the message and delivers it to another consumer.

This gives you **at-least-once delivery** — the message will be processed at least once, but possibly more than once if a crash happens after processing but before ACKing. That's why idempotency (section 4) is required alongside this.

Three outcomes when a consumer processes a message:
- `channel.ack(msg)` — success, remove from queue
- `channel.nack(msg, false, true)` — failed but retryable, put back in queue
- `channel.nack(msg, false, false)` — failed permanently, route to Dead Letter Queue

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
      channel.nack(message, false, false); // requeue=false → goes to DLQ
    }
  }
});
```

**Dead Letter Queue (DLQ):** When a message is rejected with `requeue=false`, RabbitMQ routes it to the DLQ instead of discarding it. The DLQ is a separate queue where permanently failed messages accumulate for human investigation, alerting, or manual replay. Without a DLQ, these messages would be silently dropped.

```typescript
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

## 4. Idempotency: Safe Retries

**The problem with at-least-once delivery:** Because RabbitMQ retries when a consumer crashes before ACKing, the same message can be processed more than once. For non-idempotent operations (charging a card, placing an order), this causes real harm.

```
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

**The solution** is to make every operation idempotent: if the same message arrives twice, the second processing is a no-op. The standard technique is an **idempotency key** — a unique ID attached to the message. Before processing, the consumer checks a database table for that ID. If it's already there, skip (return the cached result). If not, process and record the ID.

```typescript
channel.consume(queue, async (message) => {
  try {
    const event = JSON.parse(message.content.toString());
    // event.paymentId is a unique ID for this specific payment operation
    
    // Step 1: Check if we already processed this exact operation
    const alreadyProcessed = await db.query(
      'SELECT id FROM processed_events WHERE event_id = ?',
      [event.paymentId]
    );
    
    if (alreadyProcessed) {
      channel.ack(message); // safe to ACK — we know it was handled
      return;
    }
    
    // Step 2: Process the operation
    await chargePayment(event.amount);
    
    // Step 3: Record that we processed it (inside a DB transaction with the payment)
    await db.query(
      'INSERT INTO processed_events (event_id, processed_at) VALUES (?, ?)',
      [event.paymentId, new Date()]
    );
    
    channel.ack(message);
    
  } catch (error) {
    channel.nack(message, false, true); // retry
  }
});

// What happens on duplicate delivery:
// 1st delivery: event_id not in DB → charge card → insert event_id → ACK ✅
// 2nd delivery: event_id found in DB → skip → ACK ✅ (no double charge)
```

The idempotency key should be generated by the publisher (not the consumer) and must be globally unique per logical operation — a UUID or a combination of domain IDs works well.

---

## 5. Choreography vs Orchestration

These are two fundamentally different ways to coordinate a multi-step business process (like placing an order) across multiple services. Both use events, but who decides the flow is completely different.

---

### Choice 1: Choreography (Decentralized — each service reacts independently)

In choreography, **no single service knows the full flow**. Each service only knows: "when I see event X, I do my job and publish event Y." The business process emerges from the chain of reactions between services — like a relay race where each runner starts when they receive the baton, without anyone coordinating the whole race.

**How it works:** Order Service publishes `order.created`. Payment Service is subscribed to `order.created` — it charges the card and publishes `payment.processed`. Inventory Service is subscribed to `payment.processed` — it reserves stock and publishes `stock.reserved`. Email Service is subscribed to `stock.reserved` — it sends the confirmation. No service calls another directly. No single service sees the whole picture.

**Why it scales well:** Because services are fully independent, you can deploy, scale, or update Payment Service without touching any other service. Adding a new step (e.g. fraud check) means subscribing a new service to the right event — zero changes to existing services.

**Why it's hard to debug:** When something goes wrong, tracing the failure requires looking across multiple services and their logs. There's no single place that shows "we're at step 3 of 5." Distributed tracing tools (Jaeger, Zipkin) are almost mandatory.

```
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

```
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

```
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
