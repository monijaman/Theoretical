# Event-Driven Architecture
[← Back to index](../readme.md)

## Why an interviewer cares

Event-driven architecture (EDA) is the organizing principle behind most large-scale, loosely-coupled systems — it's how you avoid a mesh of synchronous service-to-service calls that turns into a distributed monolith. An interviewer brings this up to see whether you can reason about *when decoupling helps and when it just hides complexity* — specifically, whether you understand the eventual consistency and observability costs that come with going async, not just the scalability benefits.

## Core idea

Instead of Service A calling Service B directly and waiting for a response, Service A publishes a fact ("an event") that something happened, and any interested party reacts to it independently, on its own schedule.

```
Synchronous (request-driven):
  OrderService --HTTP call--> InventoryService --HTTP call--> BillingService
  (caller blocks until the whole chain completes; tight coupling to availability of all three)

Event-driven:
  OrderService --publishes--> "OrderPlaced" event --> [ Broker/Bus ]
                                                          |
                              +---------------------------+---------------------------+
                              v                           v                           v
                     InventoryService            BillingService              AnalyticsService
                     (reserves stock)            (charges card)              (updates dashboard)
```

OrderService doesn't know or care who's listening. Consumers can be added or removed without touching the producer. This is the essence of *decoupling in space* (producer/consumer don't need to know each other's location or identity — just the event schema) and *decoupling in time* (consumer doesn't need to be up when the event is published; it processes it whenever it comes back online).

## Event notification vs. event-carried state transfer

This is the distinction interviewers most often probe, because picking wrong causes real production pain.

**Event notification** — the event is a thin signal ("something happened, go find out more if you care"):
```json
{ "event": "OrderPlaced", "orderId": "o-123", "timestamp": "..." }
```
The consumer, on receiving this, calls back into the OrderService API to fetch full order details.

- Pros: small events, single source of truth for current data, no risk of stale duplicated data.
- Cons: reintroduces a synchronous dependency at consumption time — if OrderService is down, consumers can't enrich the event. Also causes a fan-in load spike on the source service every time an event fires.

**Event-carried state transfer** — the event carries the full (or sufficiently complete) data the consumer needs:
```json
{
  "event": "OrderPlaced",
  "orderId": "o-123",
  "customerId": "c-456",
  "items": [{"sku": "A1", "qty": 2, "price": 19.99}],
  "total": 39.98,
  "timestamp": "..."
}
```
- Pros: consumers are fully decoupled — no callback needed, they can process even if the source is down, and can build their own local read models from the event stream (see [CQRS](cqrs-pattern.md)).
- Cons: data duplication across services (multiple sources hold a copy of order data), payload bloat, and schema versioning becomes a first-class concern since every consumer depends on the event's shape.

Most mature systems land on event-carried state transfer for the "important enough to build a read model from" events, and thin notifications for high-frequency/low-value signals (e.g., "cache entry invalidated").

## Choreography vs. orchestration

Two ways to coordinate a multi-step business process across services.

**Choreography** — no central coordinator; each service reacts to events and emits its own events, and the overall workflow emerges from the chain of reactions.
```
OrderPlaced -> InventoryService reserves stock -> StockReserved
StockReserved -> BillingService charges card -> PaymentCharged
PaymentCharged -> ShippingService ships -> OrderShipped
```
- Pros: maximally decoupled, no single point of failure/bottleneck, easy to add new participants.
- Cons: the overall business process isn't written down anywhere explicit — it's implicit in the sum of each service's event handlers. Debugging "why didn't my order ship" means tracing across many services' logs. Handling a mid-flow failure (e.g., payment fails after stock is reserved) requires each service to know how to compensate, and that compensation logic is scattered.

**Orchestration** — a central coordinator (saga orchestrator / workflow engine) explicitly calls each step and handles success/failure/compensation.
```
                     +--------------------+
                     |  Order Orchestrator |
                     +--------------------+
                       |    |    |    |
                reserve|  charge| ship|  (each a command, with explicit compensation on failure)
                       v    v    v    v
                 Inventory Billing Shipping
```
- Pros: the business process is explicit code/config in one place — easy to understand, monitor, and modify. Centralized error handling and compensation (sagas).
- Cons: the orchestrator becomes a coupling point and potential bottleneck/single point of failure; it needs to know about every participant, reducing the "add a consumer without touching the producer" benefit.

Rule of thumb: choreography scales better for simple fan-out reactions with few steps; orchestration wins once you have a multi-step workflow with compensation logic and a need for visibility into "where is this order right now" (tools like AWS Step Functions, Temporal, Camunda exist specifically for this).

## Decoupling producers and consumers

The mechanics that make this work: producers publish to a broker/topic (not to a target address), and consumers subscribe independently.

```
Producer --> [Topic: order.events] <-- Consumer group A (inventory)
                                    <-- Consumer group B (billing)
                                    <-- Consumer group C (new: fraud-detection, added later)
```

Adding `fraud-detection` as a new consumer requires zero changes to OrderService or any existing consumer — this is the payoff. The cost is that the *contract* is now the event schema, not a request/response API, so schema evolution discipline matters (see [Event Sourcing](event-sourcing.md) for schema versioning strategies, which apply here too).

## Eventual consistency implications

Because consumers process events asynchronously, there is always a window where the system is in an inconsistent state relative to a synchronous model:

- Between `OrderPlaced` being published and `InventoryService` reserving stock, the order exists but stock hasn't been decremented — a second concurrent order could oversell if there's no compensating check.
- UI/read models built from events (see [CQRS](cqrs-pattern.md)) can lag behind the write side by milliseconds to seconds depending on broker/consumer latency — users may see "processing" states, or need optimistic UI updates.
- Failure handling shifts from "the transaction rolled back" to "compensating actions must be designed" — e.g., if billing fails after inventory reserved stock, something must emit a `ReleaseStock` command/event.

This is the same trade-off explored generally in [Strong vs. Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md) and [CAP theorem](../03-consistency-distributed/cap-theorem.md) — EDA is essentially choosing availability/partition-tolerance-friendly async processing over the simplicity of synchronous strong consistency, at the application-architecture level rather than just the database level.

## Trade-offs summary

| | Synchronous request/response | Event-driven |
|---|---|---|
| Coupling | Tight (caller needs callee up and responsive) | Loose (producer doesn't know consumers) |
| Consistency | Immediate/strong (within a request) | Eventual |
| Failure isolation | Failure cascades up the call chain | Failure is contained; consumer catches up later |
| Debuggability | Easier to trace a single request | Requires distributed tracing / correlation IDs across async hops |
| Adding new functionality | Requires modifying the caller to add a new call | Add a new consumer, zero changes to producer |
| Latency for the "full" workflow | Bounded by the sum of synchronous calls | Can be faster for the *triggering* action, but the full workflow's end-to-end completion is harder to observe |

## Common interview follow-ups

**Q: How do you handle a business process that fails halfway through in a choreographed system?**
Each participant must know how to compensate for its own action (e.g., inventory service listens for `PaymentFailed` and emits `StockReleased`). This is the saga pattern implemented via choreography. If compensation logic grows complex across many steps, that's usually the signal to switch to an orchestrated saga for explicit visibility.

**Q: How do you trace a request across five async hops for debugging?**
Propagate a correlation/trace ID through every event's metadata, and use [distributed tracing](../08-reliability-operations/distributed-tracing.md) infrastructure (e.g., OpenTelemetry context propagation) so spans across services can be stitched together even though the calls aren't a nested synchronous stack.

**Q: When would you avoid event-driven architecture entirely?**
When the caller genuinely needs an immediate answer to proceed (e.g., "is this payment authorized, yes/no, right now") — forcing that into async messaging just adds complexity and latency without benefit. Simple CRUD services with few integrations also don't need the operational overhead of a broker.

**Q: Event notification or event-carried state transfer — how do you decide?**
Ask whether consumers need to function when the producer is down or under load, and whether they need historical/replayable data to build their own view. If yes to either, carry the state in the event. If the event is high-frequency and most consumers won't care about the payload, a thin notification avoids bloat.

**Q: How do choreography-based systems avoid becoming a "distributed spaghetti" nobody can reason about?**
Discipline: maintain a living event catalog/schema registry, use consistent event naming and versioning, and invest in tracing/observability tooling that can reconstruct a business process across services. Some teams add a lightweight orchestrator specifically for the subset of workflows that need visibility, while keeping simple fan-outs choreographed.

## Related topics
- [Message Queues](message-queues.md)
- [Event Sourcing](event-sourcing.md)
- [CQRS Pattern](cqrs-pattern.md)
- [Outbox Pattern](outbox-pattern.md)
- [Strong vs. Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [Distributed Tracing](../08-reliability-operations/distributed-tracing.md)
- [Microservices Architecture](../07-architecture-patterns/microservices-architecture.md)
