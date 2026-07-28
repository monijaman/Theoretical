# Monolith vs. Microservices
[← Back to index](../readme.md)

## What it is and why it's asked

Choosing between a monolith and microservices isn't about picking the "better" architecture—it's about choosing the right architecture for your product, team, and stage of growth.

Interviewers ask this question to see whether you can reason about trade-offs instead of following industry trends.

A common junior answer is:

> "Microservices are better because they scale."

An experienced answer is:

> "Microservices solve organizational and scaling problems, but they introduce significant operational complexity. Many successful systems begin as monoliths."

Architecture should evolve with business needs—not hype.

---

# Monolith

A monolith is a single application where all features are built, deployed, and run together.

```
+--------------------------------------+
|              Monolith                |
|                                      |
|  Orders                             |
|  Billing                            |
|  Inventory                          |
|  Users                              |
|  Notifications                      |
|                                      |
+--------------------------------------+

        One Deployment
        One Database
```

Everything runs inside one process.

Advantages:

- Simple deployment
- Easy debugging
- Fast local development
- ACID transactions
- Simple testing
- Low operational overhead

Disadvantages:

- Entire application deploys together.
- Scaling affects the whole application.
- Large codebases become difficult to maintain.
- Team coordination becomes harder as the company grows.

---

# Modular Monolith

A modular monolith is still one application, but the internal structure is divided into well-defined modules.

```
+------------------------------------------------+

 Orders Module

 Billing Module

 Inventory Module

 Users Module

 Notification Module

+------------------------------------------------+

        One Deployment
        One Database
```

Each module owns its own:

- Business logic
- Database tables
- APIs inside the application

Modules communicate through well-defined interfaces instead of directly accessing each other's internals.

This gives many benefits of microservices without introducing distributed systems complexity.

For many companies, a modular monolith is the ideal long-term architecture.

---

# Microservices

Microservices split the application into independently deployable services.

```
        API Gateway

             |

+------------+-------------+

|            |             |

Order     Billing     Inventory

Service    Service      Service

|            |             |

DB          DB           DB
```

Each service owns:

- Code
- Database
- Deployment
- Scaling
- Monitoring

Services communicate through:

- REST
- gRPC
- Message queues
- Event brokers

---

# Comparing the Three

```
Monolith

Everything together

App
 |
DB
```

```
Modular Monolith

One application

+-------------------------+

Orders

Billing

Inventory

+-------------------------+

        |

      One DB
```

```
Microservices

Orders ----> Orders DB

Billing ---> Billing DB

Inventory -> Inventory DB
```

---

# Why Modular Monoliths Are So Popular

Many engineers jump directly to microservices.

In reality, a modular monolith provides most of the same development benefits while avoiding distributed-system complexity.

Benefits include:

- One deployment
- One debugger
- One process
- One CI/CD pipeline
- ACID transactions
- Easier refactoring
- Lower infrastructure cost

Changing module boundaries is easy.

Changing service boundaries requires:

- API redesign
- Database migration
- Versioning
- Deployment coordination

This is why many companies intentionally stay with a modular monolith for years.

---

# Conway's Law

Conway's Law states:

> Organizations design systems that mirror their communication structure.

If your company has:

```
Order Team

Billing Team

Inventory Team
```

you will naturally end up with:

```
Order Service

Billing Service

Inventory Service
```

Architecture often reflects team structure.

Microservices work best when independent teams own independent services.

Without that organizational structure, microservices often become difficult to manage.

---

# The Premature Microservices Problem

Many startups split into dozens of services too early.

Typical problems include:

- Domain boundaries are still changing.
- Small teams own too many services.
- Infrastructure grows rapidly.
- Debugging becomes difficult.
- Development slows down.

Instead of solving business problems, the team spends time maintaining infrastructure.

For early-stage products, a modular monolith is usually the better choice.

---

# When Should You Move to Microservices?

Move only when there is a clear reason.

Examples include:

- Independent engineering teams
- Different scaling requirements
- Compliance or security isolation
- Independent deployment schedules
- High traffic concentrated in one component

Traffic alone is not a reason.

Many large monoliths handle millions of users successfully.

---

# Migration Strategy — Strangler Fig Pattern

Instead of rewriting the entire application, gradually replace parts of the monolith.

Step 1

```
Client

   |

Router

   |

Monolith
```

Step 2

```
Client

   |

Router

 |       \

 |        \

Monolith  Billing Service
```

Step 3

```
Client

   |

Router

 |    |     |

Order Billing Inventory
```

The router slowly redirects traffic to newly extracted services.

This approach:

- minimizes risk,
- allows gradual migration,
- enables easy rollback,
- avoids "big bang" rewrites.

---

# Operational Cost of Microservices

Microservices introduce many new responsibilities.

You now need:

- Service discovery
- API Gateway
- Distributed tracing
- Monitoring
- Logging
- CI/CD pipelines
- Container orchestration
- Message brokers
- Retry policies
- Circuit breakers
- Distributed transactions

These costs are often greater than expected.

---

# Advantages of Monolith

- Simple deployment
- Easy debugging
- ACID transactions
- Lower infrastructure cost
- Faster development
- Easier testing

---

# Advantages of Microservices

- Independent deployments
- Independent scaling
- Better fault isolation
- Smaller codebases
- Team autonomy
- Technology flexibility

---

# Disadvantages of Monolith

- Entire application deploys together.
- Scaling is coarse-grained.
- Large codebases become harder to maintain.
- Team coordination becomes difficult.

---

# Disadvantages of Microservices

- Operational complexity
- Network latency
- Distributed debugging
- Eventual consistency
- More infrastructure
- Harder testing
- Higher operational cost

---

# Comparison

| Feature | Monolith | Modular Monolith | Microservices |
|----------|-----------|-----------------|---------------|
| Deployment | Single | Single | Independent |
| Database | Shared | Shared (modular ownership) | Database per service |
| Scaling | Whole application | Whole application | Per service |
| Transactions | ACID | ACID | Saga / Eventual consistency |
| Debugging | Easy | Easy | Distributed tracing |
| Infrastructure | Low | Low | High |
| Team Size | Small–Medium | Small–Large | Large organizations |
| Refactoring | Easy | Easy | Expensive |
| Best Fit | Startups | Most products | Large distributed systems |

---

# When to Choose a Monolith

Choose a monolith when:

- Small engineering team
- Startup
- Fast iteration
- Simple business domain
- Low operational budget

---

# When to Choose a Modular Monolith

Choose a modular monolith when:

- Product is growing
- Team is expanding
- Clear internal boundaries exist
- Independent services are not yet necessary

This is the recommendation for most applications.

---

# When to Choose Microservices

Choose microservices when:

- Multiple independent engineering teams
- Independent deployment requirements
- Different scaling profiles
- Large organization
- Complex business domains
- High operational maturity

---

# Rule of Thumb

Ask yourself:

> Does this problem require independent deployment and independent scaling?

If **no**, a monolith or modular monolith is usually the better choice.

If **yes**, microservices may be justified.

---

# Common Interview Questions

### Q: Are microservices always better?

No.

Microservices solve organizational and scaling problems but introduce significant operational complexity.

Many successful products remain monoliths for years.

---

### Q: What is the biggest mistake companies make?

Adopting microservices too early.

Without stable business boundaries and independent teams, the result is often a distributed monolith.

---

### Q: Why is a modular monolith often recommended?

It provides:

- clean architecture,
- easier refactoring,
- ACID transactions,
- simple deployments,
- low infrastructure cost,

while delaying the complexity of distributed systems until it is truly needed.

---

### Q: What is the Strangler Fig Pattern?

It is an incremental migration strategy where new services gradually replace parts of a monolith behind a routing layer instead of rewriting the entire application.

---

### Q: Can a monolith scale?

Yes.

A well-designed monolith can scale much further than many people expect through:

- Vertical scaling
- Horizontal scaling
- Load balancing
- Caching
- Database replication

Many companies only adopt microservices when organizational needs—not traffic alone—justify the added complexity.

---

### Q: When should you migrate to microservices?

Only when there is a clear business or organizational reason, such as:

- independent teams,
- different scaling needs,
- compliance requirements,
- independent release cycles,

rather than simply because the application has become large.

## Related topics
- [Microservices Architecture](microservices-architecture.md)
- [Multi-Tenant Architecture](multi-tenant-architecture.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
- [Distributed Transactions](../02-data-storage/distributed-transactions.md)
