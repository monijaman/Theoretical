# Architecture Patterns — Master System Design Like a Senior Architect

Master the design and documentation of scalable, maintainable architectures. Learn to justify architectural decisions using real-world migration patterns, event-driven systems, and serverless design. Build the communication skills to present architecture decisions like a principal engineer.

## ⚡ Quick Start: Real-World Analogies

Understand architecture patterns with these foundational analogies:

- **Monolith:** Like a huge vacation cruise ship. One giant structure where everything is controlled from a central bridge. If the kitchen breaks, it affects the whole ship. Easy to manage when small (one tech team can maintain it). But impossible to scale if one system needs upgrades—the entire ship shuts down. Cost per room doesn't improve as you add more rooms. (All code, services, database in one place)
  - Startup advantage: Single deployment, unified codebase
  - Breaking point: 100+ engineers = chaos; 10K rps = latency problems

- **Microservices:** Like multiple charter boats/companies operating independently. Each boat is a specialized cruise line (Carnival, Royal Caribbean, Disney). They share the same docks/ports (shared infrastructure) but operate autonomously. Can scale one boat independently. When one breaks, others keep operating. But coordination is harder (booking across companies takes APIs). Cost: Each boat needs its own crew (operational overhead). (Multiple independent services, each with own DB)
  - Growth advantage: 100 engineers can work 100x faster
  - Trade-off: Operational complexity 10x higher

- **Serverless:** Like an Airbnb marketplace. You don't own/operate properties or deal with guests directly. You pay per guest night. Infrastructure scales automatically when demand spikes. Zero operational cost when nobody books. But you have limits (cold starts = new host availability checks). You can't predict exact latency. (Function calls, auto-scaling, pay-per-use)
  - Startup advantage: $0 baseline cost, infinite scaling, no servers to manage
  - Use case: Bursty traffic (batch jobs, webhooks, event handlers)

- **Hybrid:** Like an airline. Core operations (airports, main routes) are scaled vertically like a monolith. but peak-season spikes handled by third-party charters (serverless).

---

## 🏗️ Architectural Patterns Deep Dive

### 1. **Monolith Architecture** - Start here, graduate when needed

**What it is:** All code, services, and data in one codebase, one process, one deployment. Think: `npm start` runs the entire business.

**Real-world examples:**
- **Etsy 2005-2015:** Single Rails monolith. Worked great for 10 years, but at 1M requests/day, database became bottleneck
- **Amazon early 2000s:** Started monolithic, then pioneered Microservices to handle exponential growth
- **Shopify (today):** Still primarily monolithic internally + selective microservices on edge

**Advantages:**
```
✅ Simple:        One codebase, one deployment, one database
✅ Fast:          Function calls across features (no network latency)
✅ Consistent:    ACID transactions span entire business logic
✅ Easy debug:    Single process, stack traces are clear
✅ Dev speed:     Refactoring touches one place, all tests co-located
✅ Cost:          One server can handle millions of requests if coded efficiently
```

**Disadvantages:**
```
❌ Scaling:       One slow feature slows entire app (auth slow = checkout slow)
❌ Team friction: 100 engineers need code review on same database layer
❌ Deployment:    One bug in email feature breaks payments for everyone
❌ Technology:    Locked into language/framework choice (switching is impossible)
❌ Development:   Full regression test needed for every feature (2+ hour CI pipelines)
```

**When monolith makes sense:**
- Startup stage (<50 engineers)
- Single team (< 10 people)
- Consistent business logic (traditional CRUD app)
- Predictable scale (not viral growth)

**When monolith breaks:**
- Team size > 50 (deployment conflicts, 100+ PRs/day)
- QPS > 10K (database bottleneck, caching becomes desperate)
- Geographic distribution (latency, can't put everything in one data center)
- Different scaling needs (auth: 100K rps vs payment: 10 rps)

**Design a scalable monolith (if staying monolithic):**
```typescript
// Architecture: Layered monolith with clear boundaries
src/
  domain/                    // Business rules (no frameworks)
    User/
      User.ts               // Entity: user properties + behavior
      UserRepository.ts     // Data access interface
      UserService.ts        // Business logic (no HTTP, no DB)
    Order/
      Order.ts
      OrderService.ts
  
  application/              // Use cases, orchestration
    CreateOrderUseCase.ts   // Coordinates domain + repositories
    UserAuthUseCase.ts
  
  infrastructure/           // DB, HTTP, external services
    PostgresUserRepository.ts
    UserController.ts       // HTTP endpoint
    RabbitMQEventBus.ts
  
  shared/                   // Shared utilities
    dto/
    filters/
    middleware/

// Separation allows future extraction with minimal changes
// User.ts can move to separate service with 1-liner changes
```

**Code example: Layered monolith**
```typescript
// ❌ BAD: Monolith without layers = spaghetti code
app.post('/orders', async (req, res) => {
  // All logic in one place
  const user = await db.query('SELECT * FROM users WHERE id = ?', [req.body.userId]);
  const order = await db.query('INSERT INTO orders VALUES (?, ?, ?)', [user.id, req.body.items, Date.now()]);
  
  // Payment logic mixed with order logic
  const payment = stripe.charge(req.body.paymentToken, order.total);
  
  // Email logic mixed here
  await sendEmail(user.email, `Order ${order.id} confirmed`);
  
  // Hard to extract, hard to test, hard to scale
  res.json(order);
});

// ✅ GOOD: Layered monolith = extractable services
// Domain Layer
class Order {
  constructor(public userId: string, public items: Item[], public total: number) {}
  
  getOrderNumber(): string {
    return `ORD-${this.total}-${Date.now()}`;
  }
}

class OrderService {
  constructor(private orderRepo: OrderRepository, private paymentGateway: PaymentGateway) {}
  
  async createOrder(userId: string, items: Item[]): Promise<Order> {
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const order = new Order(userId, items, total);
    
    // Charge payment
    await this.paymentGateway.charge(userId, order.total);
    
    // Save order
    return this.orderRepo.save(order);
  }
}

// Application Layer
class CreateOrderUseCase {
  constructor(private orderService: OrderService, private eventBus: EventBus) {}
  
  async execute(userId: string, items: Item[]): Promise<Order> {
    const order = await this.orderService.createOrder(userId, items);
    
    // Publish event (for email service to consume)
    this.eventBus.publish(new OrderCreatedEvent(order));
    
    return order;
  }
}

// Presentation Layer (HTTP)
@Controller('/orders')
export class OrderController {
  constructor(private createOrderUseCase: CreateOrderUseCase) {}
  
  @Post()
  async createOrder(req: Request, res: Response) {
    const order = await this.createOrderUseCase.execute(
      req.user.id,
      req.body.items
    );
    res.json(order);
  }
}

// Benefits: OrderService can move to separate service with zero changes
// Email service subscribes to OrderCreatedEvent (no coupling)
// Easy to test, easy to understand, easy to extract
```

### 2. **Microservices Architecture** - Power through scale and team growth

**What it is:** Multiple services, each with own database, own deployment, own tech stack. Services communicate via APIs/events.

**Real-world transformation:**
```
Netflix 2008: Single monolithic Java app
↓ (Hit 1M customers, database groaning)
Netflix 2012: First microservices extraction (video recommendations)
↓ (Worked! Could scale independently)
Netflix 2018: 700+ microservices, 5000+ engineers deploying independently
↓ (Each engineer can deploy without affecting others)
Netflix 2024: Reduced to ~300 services (consolidated non-critical ones)

Lesson: Microservices solved Netflix's scaling problem
Cost: Operational complexity + distributed systems issues (network latency, eventual consistency)
```

**When to adopt microservices:**
```
Signals you NEED microservices:
✅ Team size: > 50 engineers
✅ Deployment frequency: Want to deploy multiple teams/day
✅ Different scaling needs: Some features need 100K rps, others need 10 rps
✅ Independent domains: User service ≠ Payment service ≠ Recommendation engine
✅ Technology diversity: Want Python for ML, Go for performance services

Signals you DON'T need microservices:
❌ Startup with < 20 engineers
❌ Monolith still 50X faster to ship features
❌ Not enough scale to justify complexity
❌ Team can't handle operational burden
```

**Migration case study: Monolith → Microservices**

```
Phase 0: Legacy Monolith (Rails)
- Single database (PostgreSQL, 100GB)
- 50 engineers, deployment takes 30 mins
- Cannot deploy independently (one bug breaks everything)

Phase 1: Extract First Service (Week 1–2)
Goal: Extract Email Service (external dependency, high latency)
Strategy:
  1. Keep Email Service in monolith (no changes user-facing)
  2. Monolith publishes EmailSent events to RabbitMQ
  3. New Email Microservice consumes events (async processing)
  4. Gradual traffic shift: 10% → 50% → 100% to new service
  5. Old email code can be deleted from monolith

Benefits:
  ✅ Email delays no longer block checkout
  ✅ Can scale email service independently
  ✅ Email team deploys without affecting other teams
  ✅ Easy rollback if something breaks

Phase 2: Extract High-Churn Services (Week 3–6)
Extract: User Service, Authentication Service, Notification Service
(Services that change frequently, scale independently)

Pattern: 
  - Each service owns its data (no shared database)
  - Services communicate via REST APIs + Events
  - Each service has own CI/CD + deployment

Benefits:
  ✅ 50 engineers now work in parallel (no bottleneck)
  ✅ User team ships 10x faster (no waiting for checkout code review)
  ✅ Can scale auth to handle 100K rps (separate from checkout)

Phase 3: Stabilize Core Services (Week 7–10)
Address: Distributed systems issues
  - Transaction/consistency (can't use ACID across services)
  - Debugging (requests span 5 services instead of 1)
  - Monitoring (where's the bottleneck now?)

Solutions:
  - Implement Sagas for distributed transactions
  - Distributed tracing (Jaeger, Datadog)
  - Event sourcing for state consistency
  - Circuit breakers for fault tolerance

Timeline: Monolith → 5 core services: 2–3 months
Team size grows 5x faster in microservices phase (+50% velocity)
But operational cost increases 10x (RabbitMQ, monitoring, coordination)
```

**Microservices architecture pattern:**
```
User calls API Gateway
         ↓
Service Registry (which services exist?)
         ↓
┌─────────────────────────────────────────────────────┐
│ User Service (Node.js + MongoDB)                    │
│  ├─ /auth                                           │
│  ├─ /profile                                        │
│  └─ Publishes: UserCreated, UserUpdated events      │
└──────────────┬──────────────────────────────────────┘
               ↓ (API call)
┌─────────────────────────────────────────────────────┐
│ Order Service (Go + PostgreSQL)                     │
│  ├─ /orders (create, read)                          │
│  └─ Publishes: OrderPlaced, OrderProcessed events   │
└──────────────┬──────────────────────────────────────┘
               ↓ (Event subscription)
┌─────────────────────────────────────────────────────┐
│ Email Service (Python + DynamoDB)                   │
│  ├─ Consumes: UserCreated, OrderPlaced events       │
│  └─ Sends emails asynchronously                     │
└─────────────────────────────────────────────────────┘

Key differences:
- No shared database (each service owns its data)
- API gateway as single entry point
- Event bus (RabbitMQ/Kafka) for async communication
- Each service independent deployment + scaling
```

**Trade-offs: Monolith vs Microservices**

| Aspect | Monolith | Microservices |
|--------|----------|---------------|
| **Deployment** | 1 command (but risky) | 10+ deployments (independent) |
| **Team scaling** | Slows as team grows | Speeds up (parallel work) |
| **Database transactions** | ACID (guaranteed consistency) | Eventual consistency (complex patterns) |
| **Latency** | Function calls (sub-ms) | Network calls (5-100ms) |
| **Debugging** | Single process (easy) | Spans 5+ services (hard, need distributed tracing) |
| **Operations** | Monitoring one service | Monitoring 50+ services |
| **Cost at 10K RPS** | 1 large server ($5K/mo) | 10 smaller services ($50K/mo infra) |
| **Cost at 100K RPS** | 20 large servers ($100K/mo) | Microservices still cleanly scale ($200K/mo infra) |

**Code example: API gateway + 2 microservices**

```typescript
// API Gateway (Express)
const app = express();

app.post('/checkout', async (req, res) => {
  try {
    // Call User Service
    const user = await fetch('http://user-service:3001/users/' + req.user.id);
    
    // Call Order Service
    const order = await fetch('http://order-service:3002/orders', {
      method: 'POST',
      body: JSON.stringify({ userId: req.user.id, items: req.body.items })
    });
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Checkout failed' });
  }
});

// User Service (separate deployment, own database)
app.get('/users/:id', async (req, res) => {
  const user = await userDb.findById(req.params.id);
  res.json(user);
});

// Order Service (separate team, can scale independently)
app.post('/orders', async (req, res) => {
  const order = await orderDb.create(req.body);
  
  // Publish event (async, non-blocking)
  eventBus.publish('order.created', order);
  
  res.json(order);
});

// Email Service (consumes events, no direct coupling)
eventBus.subscribe('order.created', async (order) => {
  await sendEmail(order.userId, `Order ${order.id} confirmed`);
});
```

### 3. **Serverless Architecture** - Pay-per-use scaling machine

**What it is:** Write functions, cloud provider manages infrastructure. Auto-scales to zero when not used. Pay for execution time only.

**Real-world use cases:**
```
Uber Eats (Lambda for order processing):
- Peak times: 100K requests = 100K functions spawn instantly
- Off-peak: $0 cost, zero servers running
- Each function processes one order independently
- Total cost: $0.0002 per order (vs $1+ with traditional servers)

Slack (Lambda for webhooks):
- Receives webhook from integration
- Triggers Lambda to process & store
- Never worry about infrastructure
- Scales from 1 → 1M concurrent events automatically

Netflix (Lambda for recommendations):
- User watches movie → Lambda triggered
- Generates personalized recommendations
- Returns in <100ms, cold start acceptable (user doesn't wait)
```

**When serverless makes sense:**
```
✅ Bursty traffic (webhooks, scheduled jobs, events)
✅ Unknown scale (viral feature, new market, can't predict)
✅ Cheap computation (process images, send emails, transform data)
✅ Simple functions (<1 second runtime)
✅ Stateless operations
✅ Startup budget constraints

❌ Long-running processes (>15 mins, Lambda times out)
❌ Always-on services (APIs with guaranteed low latency)
❌ Stateful services (maintain connection state)
❌ Complex deployments (infrastructure dependencies)
❌ Huge traffic (1M rps = expensive, traditional servers better value)
```

**Serverless deployment architecture:**
```
User Request
    ↓
API Gateway (handles routing)
    ↓
┌─────────────────────────────┐
│ Lambda: Validate & Auth     │ (100ms, $0.000001)
│ (Python, 128MB memory)      │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│ Lambda: Process Order       │ (500ms, $0.000010)
│ (Node.js, 256MB memory)     │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────────┐
│ SQS Queue (decoupling)          │
│ If Email Lambda down, msg waits │
└──────────┬────────────────────────┘
           ↓
┌─────────────────────────────┐
│ Lambda: Send Email          │ (1s, $0.000020)
│ Auto-retries on failure     │
└─────────────────────────────┘
           ↓
    DynamoDB (results)

Cost for 1M orders/month:
- 3 Lambda invocations × $0.0000002 × 1M = $0.60
- DynamoDB writes: 1M × $0.00125/1M = $1.25
- Total: ~$3/month (vs $1000+/month with servers)
```

**Code example: Serverless order processing**

```typescript
// Lambda 1: Order validation & processing
export const handler = async (event) => {
  // event = API Gateway POST /orders
  const { userId, items } = event.body;
  
  // Validate
  if (!userId || items.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid order' })
    };
  }
  
  // Calculate total
  const total = items.reduce((sum, item) => sum + item.price, 0);
  
  // Save to DynamoDB (serverless database)
  const orderId = await dynamodb.put({
    id: `order_${Date.now()}`,
    userId,
    items,
    total,
    status: 'PROCESSING'
  });
  
  // Publish to SQS for async processing
  await sqs.sendMessage({
    QueueUrl: 'https://sqs.../email-queue',
    MessageBody: JSON.stringify({ orderId, userId, total })
  });
  
  return {
    statusCode: 200,
    body: JSON.stringify({ orderId, total })
  };
};

// Lambda 2: Email sending (triggered by SQS)
export const emailHandler = async (event) => {
  // event = SQS message with order data
  
  for (const record of event.Records) {
    const { orderId, userId, total } = JSON.parse(record.body);
    
    try {
      const user = await dynamodb.get(`user_${userId}`);
      
      await sendEmail(user.email, `Order ${orderId} for \$${total}`);
      
      // Mark order as sent
      await dynamodb.update(orderId, { status: 'EMAIL_SENT' });
      
    } catch (error) {
      // Automatic retry by SQS (3x default)
      throw error;
    }
  }
};

// Cost breakdown:
// - 1M orders processed: ~$3/month
// - 1M emails sent: ~$5/month  
// - Total: $8/month (vs $5000+/month with servers)
// - Scale: 1M → 100M orders automatically (no changes)
```

**Monolith vs Microservices vs Serverless comparison:**

| Metric | Monolith | Microservices | Serverless |
|--------|----------|---------------|-----------|
| **Setup time** | 1 hour | 1 week | 30 mins |
| **Deployment** | 1 command | 10+ commands | 1 CLI command |
| **Scaling** | Vertical (bigger server) | Horizontal (more services) | Automatic |
| **Cost @ 10K RPS** | $5K/mo | $50K/mo | $2K/mo (if bursty) |
| **Cost @ 100K RPS** | $100K+/mo | $200K/mo | $10K+/mo (cheaper) |
| **Team needed** | 5 engineers | 50 engineers | 10 engineers |
| **Latency** | <10ms | 50-200ms | 100-500ms |
| **Operational overhead** | Low | Very high | Low |
| **Best for** | CRUD apps | Complex domains, big teams | Event-driven, bursty |

---

## 🎯 Building Production Architectures

### Project: Design Instagram's Architecture

**Requirements:**
- 100M active users
- Millions of posts per day
- Real-time feed (< 1s latency)
- Photos stored (100T+)
- High availability (99.99% uptime)

**Architecture decision:**
```
Monolith: ❌ Would collapse at 1M users
Microservices: ✅ Needed for scale, team size

Breaking down:
├─ Feed Service
│   ├─ Compute personalized feed (ML ranking)
│   ├─ Cache heavily (Redis)
│   └─ Billions of read queries/day
│
├─ Post Service
│   ├─ Store posts (DynamoDB for scale)
│   ├─ Handle billions of reads
│   └─ Image pipeline (compress, CDN)
│
├─ User Service
│   ├─ Auth, profiles
│   ├─ Relationships (followers/following)
│   └─ Scales with user growth
│
├─ Notification Service
│   ├─ Async (doesn't block post creation)
│   ├─ Push notifications (serverless)
│   └─ Event-driven
│
└─ Search Service
    ├─ Elasticsearch for full-text
    ├─ Separate from main data path
    └─ Can tolerate eventual consistency
```

**Trade-off decisions:**

| Decision | Why | Trade-off |
|----------|-----|-----------|
| API Gateway | Route billions of requests efficiently | Added latency layer |
| Cache (Redis) | Feed queries would kill DB | Eventual consistency |
| CDN for images | Photos stored globally | Complexity, cost |
| Event-driven architecture | Services decouple, scale independently | Distributed systems complexity |
| Eventual consistency | Can't guarantee ACID at 100M scale | App must handle temporary inconsistency |

---

## 💼 Career Impact & Interview Questions

### Interview: "Design an e-commerce platform that must support 100K QPS"

✅ Perfect answer:
```
1. Clarification:
   - 100K QPS averaged or peak?
   - Geographic distribution needed?
   - Payment processing latency requirements?

2. High-level architecture:
   - Start monolithic for MVP (simpler to build)
   - At 10K QPS, extract services (caching not helping)
   - Cart service + Product service + Order service (independent scaling)

3. Specific design:
   - API Gateway (route traffic)
   - Product Service (read-heavy, cache everything in Redis)
   - Cart Service (session-based, scales horizontally)
   - Order Service (write-heavy, persistence critical)
   - Event-driven order completion (async email/notifications)

4. Scale details:
   - Database sharding (by user ID or geography)
   - Read replicas for product queries
   - CDN for product images
   - Message queue (prevent order loss if service down)

5. Trade-offs:
   - Monolith: Simple but can't scale
   - Microservices: Can scale but operational overhead
   - This requires microservices (100K QPS impossible on single DB)
```

### What makes you a senior architect?

```
Junior: "I learned REST APIs and deployed to Heroku"
Mid: "I designed a microservice system for 50K users"
Senior: "I led a migration from monolith to microservices, managed eventual consistency issues, built decision frameworks for when to split services"
Staff: "I've designed systems at 10B scale, mentored architects, built org-wide standards for architecture reviews"

The progression = understanding not just WHAT to build, but WHY and WHEN
```

---

## 📋 ADR Template: Documenting Architectural Decisions

```markdown
# ADR-001: Extract Email Service from Monolith

## Status
ACCEPTED

## Context
Email sending is blocking 5% of requests (slow SMTP provider).
Takes 2-3s per email, causing checkout latency.
Other services don't need email coupling.

## Decision
Extract Email Service as first microservice.
Monolith publishes events to RabbitMQ.
Email Service consumes and processes asynchronously.

## Consequences
✅ Checkout latency reduced (no longer blocking)
✅ Email service can scale independently
✅ Email team ships changes without regression testing monolith
❌ Introduces distributed systems complexity (eventual consistency)
❌ Monitoring now spans multiple services
❌ Harder to test end-to-end

## Alternatives Considered
1. Upgrade SMTP provider (+$10K/month, still monolithic)
2. Use serverless (AWS Lambda) for emails
   - Rejected: Easier to extract service, more control, team autonomy

## Timeline
2 weeks extraction + 1 week stability testing = 3 weeks
Expected ROI: 30% checkout latency reduction
```

---

## 🚀 Next Steps: Build Your First Microservices System

### Project: Refactor a Monolith into Microservices

1. **Choose a real monolith** (portfolio project, work codebase, open source)
2. **Identify extraction candidate** (email, notifications, recommendations)
3. **Extract to microservice** (async event-driven)
4. **Document with ADRs** (decisions, trade-offs, timeline)
5. **Present decision** (as if explaining to CTO)

Success criteria:
- ✅ New service deployed independently
- ✅ Old monolith doesn't need changes (event-driven)
- ✅ ADR explains why this decision
- ✅ Can present trade-offs confidently

---

**Master architecture like you own the company. Your decisions will define how your team ships for years.** 🏗️