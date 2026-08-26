# Microservices Architecture
[← Back to index](../readme.md)

## What it is and why it's asked

Microservices architecture breaks a large application into multiple small, independently deployable services. Each service owns a single business capability, its own business logic, and its own database.

Interviewers don't ask this to hear "small services." They want to know whether you understand the two principles that truly define microservices:

- **Independent deployment**
- **Independent data ownership**

Many systems call themselves microservices but still share one database or require every service to deploy together. Those are usually distributed monoliths rather than true microservices.

The biggest interview signal is whether you can explain both the **benefits** and the **operational costs**.

---

## Business Capability First

The hardest part of designing microservices isn't writing APIs.

It's deciding **where to split the system.**

Services should be divided by **business capability (bounded context)** instead of technical layers.

### Poor design

```
Validation Service
Database Service
Authentication Service
Business Logic Service
```

Every request passes through every service.

This creates:

- Tight coupling
- Many network calls
- Difficult deployments
- Poor scalability

---

### Better design

```
Order Service
Inventory Service
Billing Service
Shipping Service
Notification Service
```

Each service owns everything related to that domain:

- API
- Business logic
- Database
- Deployment

For example:

```
Order Service
├── Orders API
├── Order validation
├── Order database
└── Order business rules
```

This allows each service to evolve independently.

---

## Database Per Service

Every service owns its own database.

```
Order Service
      |
      v
 Orders Database

Billing Service
      |
      v
Billing Database
```

No service is allowed to directly query another service's database.

Instead:

```
Order Service
      |
      | HTTP / gRPC
      v
Billing Service
```

not

```
Order Service
      |
      v
Billing Database ❌
```

### Why?

Sharing databases creates tight coupling.

Problems include:

- Schema changes break multiple services.
- Independent deployments become impossible.
- One slow query can affect every service.
- Teams become tightly coupled.

A shared database often turns a microservice architecture into a distributed monolith.

---

## Data Sharing

If services cannot share databases, how do they share data?

There are two common approaches.

### API calls

```
Order Service
        |
        | REST / gRPC
        v
Billing Service
```

Good for current data.

---

### Event-driven replication

```
Billing Service

Payment Completed

        |

Message Broker

        |

Order Service
```

Services maintain local copies of data they need.

This improves performance but introduces **eventual consistency**.

---

## Service Discovery

Service instances are constantly starting, stopping, and moving.

Hardcoding IP addresses doesn't work.

Instead, services register themselves.

```
              Service Registry

        billing-service
        ↓
10.0.1.15
10.0.1.22
10.0.1.37

        ↑

Order Service
```

The caller asks the registry where a service currently lives.

Modern platforms like Kubernetes provide this automatically using Services and DNS.

---

## API Gateway

Clients should not communicate directly with dozens of internal services.

Instead, every external request passes through an API Gateway.

```
             Browser
                |
                |
          API Gateway
        /      |      \
       /       |       \
 Order   Billing   Shipping
```

The gateway handles common concerns such as:

- Authentication
- Authorization
- TLS termination
- Rate limiting
- Request routing
- Logging
- Response aggregation

Services can remain focused on business logic.

---

## Communication Between Services

Microservices typically communicate using one of two approaches.

### Synchronous

```
Order Service

        |

REST / gRPC

        |

Inventory Service
```

Good for immediate responses.

Examples:

- Check inventory
- Validate payment
- Fetch customer profile

---

### Asynchronous

```
Order Service

OrderCreated Event

        |

Message Broker

        |

Inventory Service

Billing Service

Notification Service
```

Good for:

- Notifications
- Analytics
- Background processing
- Decoupled workflows

---

## Operational Challenges

Microservices solve some problems while introducing many new ones.

### Distributed tracing

A single user request might travel through several services.

```
Client

   |

Gateway

   |

Order

   |

Inventory

   |

Billing

   |

Notification
```

Without tracing, debugging becomes extremely difficult.

Tools include:

- OpenTelemetry
- Jaeger
- Zipkin

---

### Network failures

Function calls become network calls.

Network calls can:

- timeout
- retry
- fail
- return partial responses

Every service should use:

- Timeouts
- Retries
- Circuit breakers

---

### Distributed transactions

One business operation may involve multiple services.

Example:

```
Order

↓

Inventory

↓

Payment

↓

Shipping
```

A normal SQL transaction cannot span multiple databases.

Instead, systems use:

- Saga Pattern
- Outbox Pattern
- Event-driven workflows

---

### More infrastructure

Instead of deploying one application, you now manage many.

Typical additions include:

- API Gateway
- Service discovery
- Message broker
- Monitoring
- Distributed tracing
- CI/CD pipelines
- Container orchestration
- Service mesh

Operational complexity increases significantly.

---

### Testing

Testing also becomes harder.

Besides unit tests, teams need:

- Integration tests
- Contract tests
- End-to-end tests

One service changing its API can break others.

---

## Advantages

- Independent deployments
- Independent scaling
- Better fault isolation
- Smaller codebases
- Team autonomy
- Technology flexibility
- Faster releases
- Easier ownership

---

## Disadvantages

- Higher operational complexity
- Network latency
- More infrastructure
- Distributed debugging
- Eventual consistency
- More deployments
- Harder testing
- More monitoring

---

## Comparison

| Feature | Monolith | Microservices |
|----------|-----------|---------------|
| Deployment | Entire application | Individual services |
| Database | Shared | Database per service |
| Scaling | Entire application | Per service |
| Transactions | Easy | Difficult |
| Team ownership | Shared | Per service |
| Fault isolation | Lower | Higher |
| Operational complexity | Low | High |
| Debugging | Easier | Requires distributed tracing |
| Best for | Small teams | Large organizations |

---

## When to Choose Microservices

Choose microservices when:

- Large engineering teams
- Independent product teams
- Different scaling requirements
- Frequent deployments
- Well-defined business domains

Examples:

- Amazon
- Netflix
- Uber
- Spotify

---

## When NOT to Choose Microservices

Stay with a monolith when:

- Small team
- Startup
- Early product
- Unclear business boundaries
- Low traffic
- Simple application

A well-designed monolith is often the fastest way to build a product.

Many successful companies begin with a monolith and split into microservices only after scaling demands it.

---

## Rule of Thumb

Ask yourself:

> Can this service be deployed, scaled, and own its data independently?

If the answer is **no**, it probably isn't a true microservice.

---

## Common Interview Questions

### Q: How small should a microservice be?

There is no fixed size.

A microservice should represent one business capability and be deployable independently by a single team.

---

### Q: Why is database-per-service important?

It prevents tight coupling.

Each service controls its own schema, deployment, and scaling without affecting others.

---

### Q: How do services communicate?

Typically through:

- REST
- gRPC
- Message queues
- Event brokers

Synchronous calls are used for immediate responses, while asynchronous messaging is used for workflows and background processing.

---

### Q: How do you handle transactions across services?

Instead of distributed ACID transactions, modern systems use:

- Saga Pattern
- Outbox Pattern
- Event-driven architecture

These provide eventual consistency while avoiding distributed transaction coordinators.

---

### Q: What's the biggest reason microservice projects fail?

Choosing poor service boundaries.

Splitting by technical layers or sharing a database creates tightly coupled services that are harder to maintain than a monolith.

---

### Q: How does service discovery work in Kubernetes?

Each service is exposed through a Kubernetes Service.

Pods register automatically, and Kubernetes DNS routes requests to healthy instances without clients knowing individual pod IPs.

---

### Q: When would you avoid microservices?

When building an early-stage product with a small team.

Microservices add significant operational complexity. Unless independent deployments and scaling are necessary, a modular monolith is usually the better choice.

## Related topics
- [Monolith vs. Microservices](monolith-vs-microservices.md)
- [Multi-Tenant Architecture](multi-tenant-architecture.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [CQRS Pattern](../05-messaging-event-driven/cqrs-pattern.md)
- [Distributed Transactions](../02-data-storage/distributed-transactions.md)
- [Distributed Tracing](../08-reliability-operations/distributed-tracing.md)
- [Observability: Logs, Metrics, Traces](../08-reliability-operations/observability-logs-metrics-traces.md)
