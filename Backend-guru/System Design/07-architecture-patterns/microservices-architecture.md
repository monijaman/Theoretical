# Microservices Architecture
[← Back to index](../readme.md)

## What it is and why it's asked

A microservices architecture splits a system into a set of small, independently deployable services, each owning a specific piece of business capability and its own data. Interviewers ask about this not to hear a definition (everyone knows "small services"), but to see whether you understand what actually makes something a microservice — independent deployability and data ownership — versus what just makes it "a monolith cut into several network calls," which is a common and expensive failure mode. The real signal is whether you can name the operational costs as fluently as the benefits.

## Service boundaries by business capability

The hard part of microservices isn't the network layer, it's drawing the boundary lines correctly. The standard technique borrowed from Domain-Driven Design is to split along **bounded contexts** — areas of the business where a specific model and vocabulary hold consistently — rather than along technical layers (a "database service," a "validation service") or arbitrary size targets.

```
Wrong (technical-layer split):        Right (bounded-context split):
  [ Validation Service ]                [ Order Service ]     - orders, order lines, order status
  [ Database Service ]                  [ Inventory Service ] - stock levels, reservations
  [ Business Logic Service ]            [ Billing Service ]   - payments, invoices, refunds
  (every request touches all three,     [ Shipping Service ]  - fulfillment, tracking
   maximal coupling, no independence)   (each owns a full vertical slice: API, logic, and data)
```

"Order" means something different to Billing (a line item to charge) than it does to Shipping (a package to route) — a bounded-context boundary embraces that each service can have its *own* model of "order" rather than forcing one shared canonical Order object across all of them. Getting this wrong (splitting too finely, or along the wrong axis) is the single most common root cause of microservices projects that end up worse than the monolith they replaced.

## Database-per-service

Each service owns its data exclusively; no other service is allowed to reach into that database directly.

```
[ Order Service ] --owns--> [ Orders DB ]
[ Billing Service ] --owns--> [ Billing DB ]

Order Service needs billing info? --> calls Billing Service's API, never queries Billing DB directly.
```

This is the principle interviewers most want to hear defended, because a shared database between "microservices" defeats the entire point: it re-introduces the tight coupling microservices are meant to remove; a schema change in the shared DB now requires coordinating every service that touches it, deployments can't happen independently because a migration might break another team's queries, and one service's runaway query can degrade every other service sharing that database's resources. A system with N services and one shared database is, operationally, a monolith with extra network hops and worse transaction guarantees, not a microservices architecture.

The cost of database-per-service is that data an old monolith would fetch with one SQL join now requires either an API call to another service or a local, eventually-consistent copy built from that service's published events (see [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md) and [CQRS](../05-messaging-event-driven/cqrs-pattern.md)) — cross-service consistency has to be designed deliberately, it's no longer free.

## Service discovery and the API gateway

With many independently deployed, independently scaled service instances (each potentially at a different IP/port, coming and going as instances are rescheduled), callers can't hardcode addresses. Two complementary mechanisms handle this:

**Service discovery** — a registry (Consul, etcd, Kubernetes' built-in DNS/Service objects, Netflix Eureka historically) tracks which instances of a service are currently healthy and reachable, so a caller resolves "billing-service" to a live IP:port at call time rather than at deploy time.

```
Order Service --"where is billing-service?"--> [ Service Registry ] --> [10.0.4.12:8080, 10.0.4.19:8080]
Order Service --HTTP--> 10.0.4.12:8080   (load-balanced across healthy instances)
```

**API gateway** — a single entry point that external clients (web/mobile apps) talk to, which routes requests to the appropriate internal service, and centralizes cross-cutting concerns (auth, rate limiting, TLS termination, request logging) so individual services don't each reimplement them.

```
Client --> [ API Gateway ] --routes to--> Order Service / Billing Service / Shipping Service
              |
              +-- auth/authn, rate limiting, TLS termination, request routing, response aggregation
```

Without a gateway, clients would need to know about and directly call N internal services, coupling client code to internal topology and making it painful to reshape services later; the gateway is the seam that lets internal service boundaries move without breaking external contracts.

## The operational cost: what you're actually signing up for

This is the section interviewers listen hardest for, because it's the part marketing slides skip.

- **Distributed tracing becomes mandatory, not optional**: a single user request might now fan out across six services; understanding "why was this request slow" requires propagating a trace/correlation ID and stitching spans together (see [Distributed Tracing](../08-reliability-operations/distributed-tracing.md) and [Observability](../08-reliability-operations/observability-logs-metrics-traces.md)) — a single-process stack trace no longer tells the whole story.
- **Network calls replace function calls**: an in-process method call that used to take microseconds and never fails is now an HTTP/gRPC call that can be slow, can time out, and can fail partially — every inter-service call needs retries, timeouts, and circuit breakers, and the aggregate latency of a chain of calls is the sum (or worse) of each hop.
- **Data consistency across services is now hard**: a business operation spanning Order + Inventory + Billing can't use one ACID transaction across three databases; it needs a saga (choreographed or orchestrated, see [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)) with explicit compensation logic for partial failure, replacing what used to be a single `ROLLBACK`.
- **Deployment and infra overhead multiplies**: N services means N CI/CD pipelines, N sets of dashboards/alerts/on-call runbooks, and a service mesh or equivalent to manage inter-service networking, TLS, and retries at scale.
- **Testing gets harder**: integration tests now need multiple services running together (or contract testing / consumer-driven contracts to avoid that), because a unit test of one service can't catch a mismatch with another service's actual behavior.

## Trade-offs summary

| | Monolith | Microservices |
|---|---|---|
| Deployment | Single unit, all-or-nothing | Independent per service |
| Data consistency | Easy (one DB, ACID transactions) | Hard (sagas, eventual consistency across services) |
| Scaling | Scale the whole app together | Scale each service independently to its own load |
| Team ownership | Harder to parallelize across large teams | Natural fit for team-per-service ownership |
| Failure isolation | A bug can take down the whole app | A failing service can be isolated (with circuit breakers) |
| Operational overhead | Low — one thing to deploy/monitor | High — N pipelines, service discovery, distributed tracing |
| Debugging | Single stack trace, straightforward | Requires distributed tracing across async/network hops |
| Best fit | Small-to-medium teams, early-stage products, simple domains | Large orgs with independent teams, clear bounded contexts, differing scaling needs per component |

## Common interview follow-ups

**Q: How small should a microservice be?**
Small enough to be owned end-to-end by one team and deployed independently without coordinating with other teams, and bounded by a coherent business capability — not a specific line-of-code or file count. "Can this be deployed on its own without breaking anyone else, and does it map to a real bounded context" is the actual test, not size.

**Q: How do you handle a transaction that spans multiple services?**
You don't use a distributed ACID transaction across databases in practice — you use a saga: either choreographed (each service reacts to the previous step's event and knows how to compensate) or orchestrated (a coordinator explicitly calls each step and handles failure/compensation). See [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md) for the mechanics.

**Q: What's the single biggest reason microservices projects fail?**
Splitting along the wrong boundaries (usually technical layers instead of bounded contexts, or splitting too finely before the domain is well understood), combined with skipping the database-per-service discipline — a shared database between "microservices" reintroduces the coupling the architecture was supposed to remove.

**Q: How do you avoid every service reimplementing auth, rate limiting, and retries?**
Centralize what's genuinely cross-cutting at the edge (API gateway for auth/rate limiting on north-south traffic) and standardize inter-service concerns (retries, timeouts, mTLS) via a shared library or a service mesh (Istio/Linkerd) rather than leaving each team to hand-roll it inconsistently.

**Q: When would you NOT choose microservices?**
Early-stage products with unclear domain boundaries and a small team — you'll draw the wrong boundaries before you understand the domain, and you'll pay the full operational tax (service discovery, distributed tracing, N deployment pipelines) without having the team size or scaling needs that justify it. See [Monolith vs. Microservices](monolith-vs-microservices.md) for the "premature microservices" anti-pattern in detail.

**Q: How does service discovery work when instances are constantly being rescheduled (e.g., Kubernetes)?**
The orchestrator (Kubernetes) maintains a Service object backed by dynamic Endpoints/EndpointSlices that track healthy pod IPs in real time via health checks; DNS for the service name resolves to a stable virtual IP that load-balances across whatever pods are currently healthy, so callers never hardcode a specific instance's address.

## Related topics
- [Monolith vs. Microservices](monolith-vs-microservices.md)
- [Multi-Tenant Architecture](multi-tenant-architecture.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [CQRS Pattern](../05-messaging-event-driven/cqrs-pattern.md)
- [Distributed Transactions](../02-data-storage/distributed-transactions.md)
- [Distributed Tracing](../08-reliability-operations/distributed-tracing.md)
- [Observability: Logs, Metrics, Traces](../08-reliability-operations/observability-logs-metrics-traces.md)
