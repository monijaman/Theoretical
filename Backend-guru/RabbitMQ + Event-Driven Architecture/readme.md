# RabbitMQ + Event-Driven Architecture — Master Async Systems at Scale

Build a decoupled, scalable microservice system using event-driven patterns with RabbitMQ. Learn reliable message delivery, graceful failure handling, and clear separation of concerns across services. Master asynchronous communication like a principal engineer.

## ⚡ Quick Start: Real-World Analogies

Understand event-driven architecture with these simple analogies:

- **Events:** Like newspaper headlines. "Breaking: User signed up!" broadcast to everyone interested (email service, analytics, recommendation engine). (Broadcast information without explicit coupling)

- **Message Broker (RabbitMQ):** Like a postal service. Sender drops letter in mailbox, postal service delivers to recipient. Sender doesn't know/care who receives. (Decoupled communication)

- **Dead Letter Queue:** Like returned mail. If recipient doesn't exist, letter goes to DLQ (dead letter queue) for investigation. (Handle failures gracefully)

- **Idempotency:** Like mailing a check. If recipient receives twice (mail duplication), second check has same ID. Bank can ignore duplicate. (Safe to retry failures)

- **Saga Pattern:** Like a multi-step recipe. If one step fails, undo previous steps (rollback). No global transaction, but eventual consistency. (Distributed transactions)

- **Choreography vs Orchestration:** Like a dance troupe: Choreography = dancers respond to music (decoupled, each follows rules). Orchestration = choreographer directs each dancer (centralized, one point of failure). (Event-driven vs centralized control)

---

## 🚀 Event-Driven Architecture Deep Dive

### 1. **Core concepts: Publishers and Consumers**

**Publisher: "Something happened"**
```typescript
// Order Service (Publisher)
app.post('/orders', async (req, res) => {
  const order = await db.createOrder(req.body);
  
  // Publish event: "Order was created"
  // Everyone interested: "I'm listening for OrderCreated"
  await eventBus.publish('order.created', {
    orderId: order.id,
    userId: order.userId,
    items: order.items,
    total: order.total,
    timestamp: new Date()
  });
  
  res.json(order);
});

// Publisher doesn't care who listens - decoupled!
```

**Consumer: "I'll react when something happens"**
```typescript
// Email Service (Consumer)
eventBus.subscribe('order.created', async (event) => {
  const user = await db.getUser(event.userId);
  await sendEmail(user.email, `Order ${event.orderId} confirmed`);
  console.log('Email sent');
});

// Notification Service (Consumer)
eventBus.subscribe('order.created', async (event) => {
  await db.saveNotification({
    userId: event.userId,
    message: `Your order for $${event.total} is confirmed`,
    type: 'order.created'
  });
  console.log('Notification saved');
});

// Analytics Service (Consumer)
eventBus.subscribe('order.created', async (event) => {
  await analytics.track({
    event: 'order_created',
    userId: event.userId,
    revenue: event.total
  });
  console.log('Analytics event recorded');
});

// Same event triggers multiple independent actions
// Order Service has NO idea these services exist!
```

### 2. **RabbitMQ Topology: Exchanges and Queues**

**How RabbitMQ routes messages:**

```
Publisher sends message to Exchange
     ↓
Exchange routes based on type (Topic, Direct, Fanout)
     ↓
Messages land in Queues
     ↓
Consumers pull from Queues

Types of Exchanges:

1. TOPIC Exchange: Route by pattern matching
   - Pattern: "order.*" matches "order.created", "order.cancelled"
   - Use: Domain events that need selective routing

2. DIRECT Exchange: Route to specific queue
   - Routing key: "payment.processed" → queue "payment-queue"
   - Use: One-to-one communication, RPC-style

3. FANOUT Exchange: Broadcast to all queues
   - No routing key matching
   - All subscribed queues get copy
   - Use: announcements, broadcasts
```

**Implementing with RabbitMQ client:**

```typescript
const amqp = require('amqplib');

// Connect to RabbitMQ
const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

// Publisher setup
const exchange = 'app-events';
await channel.assertExchange(exchange, 'topic', { durable: true });

// Publish event
await channel.publish(
  exchange,
  'order.created',  // Routing key
  Buffer.from(JSON.stringify({
    orderId: '123',
    userId: '456',
    total: 99.99,
    timestamp: new Date()
  }))
);

// Consumer setup
const queue = 'email-service.orders';
await channel.assertQueue(queue, { durable: true });
await channel.bindQueue(queue, exchange, 'order.*');  // Subscribe to all order events

// Consume messages
channel.consume(queue, async (message) => {
  try {
    const event = JSON.parse(message.content.toString());
    
    if (event.orderId === 'order.created') {
      await sendEmail(event.userId);
    }
    
    // Acknowledge if successful
    channel.ack(message);
    
  } catch (error) {
    // Neither ACK nor NACK = message stays in queue (retry)
    console.error('Error processing:', error);
    // Or: channel.nack(message, false, true);  // Requeue after delay
  }
});
```

### 3. **Guaranteeing Message Delivery**

**Real-world problem:**
```
Consumer crashes while processing message
Message is lost forever
❌ Order email never sent
❌ No retry possible
❌ Customer upset
```

**Solution: At-Least-Once Delivery**

```typescript
// ❌ WITHOUT guarantees (fast but losing messages)
channel.consume(queue, async (message) => {
  channel.ack(message);  // Acknowledge immediately (dangerous!)
  
  // If crash here, message processed but email not sent
  await sendEmailSlowly(message);  
});

// ✅ WITH at-least-once guarantees
channel.consume(queue, async (message) => {
  try {
    const event = JSON.parse(message.content.toString());
    
    // Make operation idempotent (safe to retry)
    await sendEmailIdempotent(event);
    
    // Only acknowledge AFTER successful processing
    channel.ack(message);
    
  } catch (error) {
    if (retryable(error)) {
      // Don't ACK, message requeued automatically after delay
      channel.nack(message, false, true);  // requeue=true
    } else {
      // Non-retryable error, send to DLQ
      channel.nack(message, false, false);  // requeue=false, goes to DLQ
    }
  }
});

// ✅ Dead Letter Queue (for messages that failed permanently)
const dlqExchange = 'dlq-exchange';
const dlqQueue = 'email-service-dlq';

await channel.assertExchange(dlqExchange, 'direct', { durable: true });
await channel.assertQueue(dlqQueue, { durable: true });
await channel.bindQueue(dlqQueue, dlqExchange, 'failed-email');

// Associate main queue with DLQ
await channel.assertQueue(queue, {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': dlqExchange,
    'x-dead-letter-routing-key': 'failed-email'
  }
});

// Process DLQ messages (manual retry or alerting)
channel.consume(dlqQueue, async (message) => {
  const event = JSON.parse(message.content.toString());
  logger.error('Failed message in DLQ:', event);
  
  // Alert human or retry later
  await alertOps(`Failed to send email for ${event.orderId}`);
  channel.ack(message);
});

// Result: No message lost, automatic retry, dead letter handling
```

### 4. **Idempotency: Safe Retries**

**Real problem:**
```
Consumer processes: "Charge $100"
     ↓
Payment succeeds, but ACK never sent (crash)
     ↓
Message requeued
     ↓
Consumer processes AGAIN: "Charge $100"
     ↓ 
Customer charged $200 (disaster!)
```

**Solution: Idempotency keys**

```typescript
// Each message contains idempotency key
const event = {
  orderId: 'order-123',
  paymentId: 'charge-abc-xyz',  // Unique ID for this operation
  amount: 100,
  timestamp: Date.now()
};

// Consumer: Track processed operations
channel.consume(queue, async (message) => {
  try {
    const event = JSON.parse(message.content.toString());
    
    // Check if already processed (idempotency)
    const existing = await db.query(
      'SELECT * FROM processed_events WHERE id = ?',
      [event.paymentId]
    );
    
    if (existing) {
      // Already processed, return cached result
      channel.ack(message);
      return;
    }
    
    // Process
    await chargePayment(event.amount);
    
    // Store in processed_events to track
    await db.query(
      'INSERT INTO processed_events (id, result) VALUES (?, ?)',
      [event.paymentId, JSON.stringify({ charged: true })]
    );
    
    channel.ack(message);
    
  } catch (error) {
    channel.nack(message, false, true);  // Requeue
  }
});

// Retry scenario:
// 1st attempt: Process, store in DB, ACK
// 2nd attempt (requeued): Check DB, find existing, return cached → Safe!
// Result: No double charge
```

### 5. **Choreography vs Orchestration**

**Choice 1: Choreography (Event-driven, decoupled)**

```
Order Service publishes: "order.created"
     ↓ (listens for)
Payment Service processes payment → publishes "payment.processed"
     ↓ (listens for)
Inventory Service reserves stock → publishes "stock.reserved"
     ↓ (listens for)
Email Service sends confirmation

Advantages:
✅ Services independent (can deploy Payment without Inventory)
✅ Easy to add new service (just subscribe to event)
✅ Scales well with many services

Disadvantages:
❌ Complex to debug (flow unclear across services)
❌ Hard to handle failure (which service failed?)
❌ Testing requires all services up
```

**Implementation (Choreography):**

```typescript
// Order Service
eventBus.publish('order.created', { orderId: '123', total: 100 });

// Payment Service listens
eventBus.subscribe('order.created', async (order) => {
  const result = await charge(order.total);
  
  if (result.success) {
    eventBus.publish('payment.processed', { orderId: order.id });
  } else {
    eventBus.publish('payment.failed', { orderId: order.id });
  }
});

// Inventory Service listens
eventBus.subscribe('payment.processed', async (event) => {
  try {
    await reserveInventory(event.orderId);
    eventBus.publish('inventory.reserved', { orderId: event.orderId });
  } catch (error) {
    eventBus.publish('inventory.failed', { orderId: event.orderId });
  }
});

// Email Service listens
eventBus.subscribe('inventory.reserved', async (event) => {
  await sendConfirmationEmail(event.orderId);
});

// Flow: order.created → payment.processed → inventory.reserved → confirmation email
// Each event triggers next service
// All asynchronous, decoupled
```

**Choice 2: Orchestration (Centralized, easier to manage)**

```
Saga Orchestrator Service:
├─ Receives "order.created"
├─ Calls Payment Service (waits for response)
├─ If success: Calls Inventory Service
├─ If success: Calls Email Service
├─ If failure: Calls Compensation (refund, restore)

Advantages:
✅ Clear flow (one service manages process)
✅ Easy to handle failure (orchestrator knows where to retry)
✅ Clear error propagation

Disadvantages:
❌ Orchestrator is bottleneck
❌ Tight coupling (orchestrator knows all services)
❌ Single point of failure
```

**Implementation (Orchestration):**

```typescript
class OrderSaga {
  async executeOrderFlow(order) {
    try {
      // Step 1: Process payment
      const payment = await this.paymentService.charge(order.total);
      
      if (!payment.success) {
        return { status: 'failed', reason: 'payment failed' };
      }
      
      // Step 2: Reserve inventory
      const inventory = await this.inventoryService.reserve(order.items);
      
      if (!inventory.success) {
        // Compensation: Refund payment
        await this.paymentService.refund(payment.id);
        return { status: 'failed', reason: 'no inventory' };
      }
      
      // Step 3: Send email
      await this.emailService.sendConfirmation(order);
      
      return { status: 'success' };
      
    } catch (error) {
      // Handle errors with compensation
      return { status: 'failed', reason: error.message };
    }
  }
}

// Usage:
const saga = new OrderSaga();
const result = await saga.executeOrderFlow(order);
```

---

## 📊 Real-World Implementation: E-Commerce Order Flow

**Final working system:**

```typescript
// ==================== Order Service ====================
class OrderService {
  async createOrder(userId, items) {
    // Save order to database
    const order = await db.orders.create({
      userId,
      items,
      status: 'pending',
      createdAt: new Date()
    });
    
    // Publish event (async, non-blocking)
    await eventBus.publish('order.created', {
      orderId: order.id,
      userId,
      items,
      total: calculateTotal(items),
      idempotencyKey: order.id  // For idempotency
    });
    
    return order;
  }
}

// ==================== Payment Service ====================
class PaymentService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    
    // Subscribe to order events
    this.eventBus.subscribe('order.created', (event) => {
      this.processPayment(event);
    });
  }
  
  async processPayment(event) {
    try {
      // Check if already processed (idempotency)
      const existing = await db.payments.findOne({
        idempotencyKey: event.idempotencyKey
      });
      
      if (existing) {
        // Already processed, publish event again
        await this.eventBus.publish('payment.processed', event);
        return;
      }
      
      // Process payment with retry logic
      const payment = await this.chargeCard(event.total);
      
      // Store payment record
      await db.payments.create({
        orderId: event.orderId,
        amount: event.total,
        status: 'succeeded',
        idempotencyKey: event.idempotencyKey
      });
      
      // Publish success event
      await this.eventBus.publish('payment.processed', event);
      
    } catch (error) {
      // Publish failure event
      await this.eventBus.publish('payment.failed', {
        orderId: event.orderId,
        error: error.message,
        idempotencyKey: event.idempotencyKey
      });
    }
  }
  
  async chargeCard(amount) {
    // Call Stripe, PayPal, etc.
    // With retry logic and timeout
  }
}

// ==================== Email Service ====================
class EmailService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    
    this.eventBus.subscribe('payment.processed', (event) => {
      this.sendConfirmation(event);
    });
    
    this.eventBus.subscribe('order.cancelled', (event) => {
      this.sendCancellation(event);
    });
  }
  
  async sendConfirmation(event) {
    try {
      const order = await db.orders.findOne({ id: event.orderId });
      const user = await db.users.findOne({ id: order.userId });
      
      // Email sending with retry
      await this.emailProvider.send({
        to: user.email,
        template: 'order-confirmation',
        data: { order, user }
      });
      
    } catch (error) {
      logger.error('Email send failed:', error);
      // No ACK = message requeued, will retry
    }
  }
}

// ==================== Main Setup ====================
const amqp = require('amqplib');

async function startServices() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  // Exchange for all events
  await channel.assertExchange('order-events', 'topic', { durable: true });
  
  // Initialize services
  const orderService = new OrderService(channel);
  const paymentService = new PaymentService(channel);
  const emailService = new EmailService(channel);
  
  // All services connected via event bus (RabbitMQ)
  logger.info('All services started and listening for events');
}

// ==================== Testing ====================
test('complete order flow', async () => {
  const order = await orderService.createOrder('user123', [
    { sku: 'LAPTOP', price: 1000 }
  ]);
  
  // Wait for events to process
  await sleep(1000);
  
  // Verify payment processed
  const payment = await db.payments.findOne({
    orderId: order.id
  });
  expect(payment.status).toBe('succeeded');
  
  // Verify email sent
  const emailLog = await db.emailLogs.findOne({
    orderId: order.id
  });
  expect(emailLog).toBeDefined();
});

test('handles payment failure gracefully', async () => {
  // Mock payment failure
  paymentService.chargeCard = jest.fn().mockRejectedValue(
    new Error('Card declined')
  );
  
  const order = await orderService.createOrder('user123', items);
  await sleep(1000);
  
  // Verify payment failed
  const payment = await db.payments.findOne({ orderId: order.id });
  expect(payment.status).toBe('failed');
  
  // Verify failure email sent
  expect(emailLog.type).toBe('payment-failed');
});
```

---

## 💼 Career Impact & Interview Questions

### Interview: "Design a reliable event-driven system for 1M events/day"

✅ Perfect answer:
```
1. Architecture:
   - RabbitMQ for event broker (scales to millions)
   - Topic exchanges for domain events
   - DLQ for failed messages
   - Multiple consumers per event (decoupled)

2. Reliability:
   - Idempotency keys (safe retries)
   - Durable queues (survive restarts)
   - Acknowledgments (confirmation of processing)
   - DLQ monitoring (alert humans)

3. Scale:
   - Partition events by service (payment events ≠ email events)
   - Consumer groups (multiple workers per service)
   - Monitoring: Queue depth, consumer lag, error rate

4. Monitoring:
   - Alert if DLQ grows (processing failures)
   - Track latency (p50/p95/p99)
   - Monitor consumer lag (falling behind)

Result: At-least-once delivery, no data loss, handles 1M events/day
```

### What makes you senior in event-driven systems?

```
Junior: "I published events and consumed them"
Mid: "I built a system with retry logic and DLQ"
Senior: "I designed event architecture for 100M/day, handled distributed transactions with sagas, managed eventual consistency issues"
Staff: "I built event infrastructure for company-wide adoption, mentored engineers on event design patterns"

That progression = deep understanding of trade-offs
```

---

## 🔧 RabbitMQ CLI Commands

```bash
# Queue management
rabbitmqctl list_queues      # Show all queues
rabbitmqctl purge_queue name  # Clear queue

# User management
rabbitmqctl add_user user pwd
rabbitmqctl list_users
rabbitmqctl set_permissions -p / user ".*" ".*" ".*"

# Monitoring
rabbitmqctl status           # Broker status
rabbitmqctl list_channels    # Active channels
rabbitmqctl list_connections # Active connections

# Management UI
# http://localhost:15672 (default: guest/guest)
```

---

**Master event-driven architecture. Async systems scale where monoliths fail.** 📨