# CQRS Pattern (Command Query Responsibility Segregation)
[← Back to index](../readme.md)

## What it is and why it's asked

CQRS splits a system's model into two: a **write model** that handles commands (things that change state) and a **read model** that handles queries (things that return data), instead of one model doing both. In a normal CRUD app, the same table (and often the same ORM entity) is used to insert an order and to render an order-history page — CQRS says those two jobs have such different shapes and scaling needs that forcing one model to serve both is what makes both jobs harder than they need to be.

Interviewers bring this up to check whether you reach for CQRS *because the read/write asymmetry actually justifies it* or because it sounds sophisticated — the honest answer for most CRUD services is "we don't need this," and knowing that is the actual signal they're listening for.

## Separating the write model from the read model

```
Traditional (single model):
  Client --command--> [ Service ] --> [ Table ] <-- [ Service ] <--query-- Client
                         (same schema, same code path, same database)

CQRS:
  Client --command--> [ Command Handler ] --> [ Write Store ]
                                                     |
                                          (events / sync projector)
                                                     v
  Client <--query-- [ Query Handler ] <-- [ Read Store(s) : denormalized, query-optimized ]
```

The write side enforces invariants and business rules (can this order actually be placed? is there enough stock?) and is typically normalized, transactional, and optimized for correctness under concurrent writes. The read side is denormalized, often duplicated across multiple purpose-built views, and optimized purely for the query patterns the UI/API actually needs — no joins, no normalization, just "give me this screen's data in one lookup."

Command handlers return an acknowledgment, not query results: `PlaceOrder` returns "accepted, order id o-123," not the fully rendered order. If the caller needs to see the result, it issues a *query* afterward (possibly against a read model that hasn't caught up yet — see below).

## Why CQRS pairs naturally with event sourcing

CQRS doesn't require [event sourcing](event-sourcing.md), but the two solve complementary halves of the same problem, which is why they're almost always mentioned together:

```
Command --> [ Command Handler ] --appends--> [ Event Store ]  (write side, source of truth)
                                                     |
                                         events streamed out (Kafka topic, CDC, outbox)
                                                     |
                          +--------------------------+---------------------------+
                          v                           v                           v
                 [ Read Model: SQL       [ Read Model: search      [ Read Model: cache
                   "orders by user" ]      index for full-text ]     for "order status" ]
```

The event store is a terrible thing to query directly (see [Event Sourcing](event-sourcing.md)'s note on this), but it's an excellent thing to *project* from — each read model is a **materialized view** built by a projector that subscribes to the event stream and folds events into whatever shape that particular query needs. Adding a new read model (e.g., a new analytics dashboard) means writing a new projector that replays the existing event history from scratch — zero changes to the write side.

Without event sourcing, the same pattern still works using ordinary domain events published via the [outbox pattern](outbox-pattern.md): the write DB is the source of truth, but every change also emits an event that projectors consume to update denormalized read tables.

## Eventual consistency between write and read sides

This is the cost side of the ledger, and it's the first thing an interviewer will press on. Because projectors consume events asynchronously, there is a window — milliseconds to seconds depending on broker/projector lag — where the read model doesn't yet reflect a write that has already been acknowledged as successful.

```
t0: PlaceOrder command succeeds, write store has the order
t0 + 50ms: OrderPlaced event lands on the projector's topic
t0 + 80ms: read model updated, order now visible in "my orders" query

Between t0 and t0+80ms: a query for "my orders" may not show the new order.
```

Applications work around this with:
- **Optimistic UI**: the client already has the data it just submitted (from the command response), so it renders that immediately rather than re-querying the read model.
- **Read-your-writes routing**: route a user's own immediate follow-up query to the write store (or a synchronously-updated cache) for a short window after their own write, while other users still see eventual consistency.
- **Versioned reads**: the client can pass "I need to see at least version N" and the query handler waits (briefly, with a timeout) for the read model to catch up.

## When CQRS is overkill vs. when it earns its complexity

Most systems should not do this. The tell is read/write **shape** asymmetry, not scale alone.

- **Overkill**: a typical internal CRUD admin tool, a blog, a settings page — one table, one shape, low volume. Adding command/query separation here is pure ceremony: two schemas, an eventing pipeline, and eventual consistency bugs, in exchange for nothing, because there's no asymmetry to exploit.
- **Earns it**: a system where writes are high-throughput and simple (e.g., "record a view," "place an order") but reads need rich, varied, denormalized shapes (a seller dashboard, a search index, a recommendations feed, a reporting/BI view) that would require expensive joins or full-table scans against the write schema. Complex reporting needs living alongside high-throughput transactional writes is the canonical CQRS trigger — the write model stays lean and fast, the read models can be shaped, indexed, and even scaled/replicated completely independently of write traffic.
- Netflix and Uber-scale systems use this shape constantly for exactly this reason: the write path (a stream event, a trip update) is a firehose that must never be slowed down by the needs of any one read use case, so read models for billing, analytics, and live dashboards are built as independent projections off the same stream.

## Trade-offs summary

| | Single (CRUD) model | CQRS |
|---|---|---|
| Consistency | Immediate (same transaction) | Eventual between write and read sides |
| Query flexibility | Limited by the write schema | Read models shaped exactly for each query need |
| Scaling | Read and write scale together | Read and write scale independently |
| Complexity | Low — one schema, one code path | Higher — two models, a projection pipeline, staleness handling |
| Adding a new query pattern | Reshape/join against existing schema | Add a new projector/read model, no write-side change |
| Best fit | Most CRUD apps | High read/write asymmetry, multiple divergent read shapes, high-throughput writes with heavy reporting needs |

## Common interview follow-ups

**Q: Does CQRS require two separate databases?**
No — the minimal form is two models within the same database (a normalized write schema and a couple of denormalized views/materialized tables), and the full form uses physically separate stores (e.g., Postgres for writes, Elasticsearch for search reads, Redis for a status cache). The separation of *responsibility*, not physical location, is what defines CQRS.

**Q: How do you keep multiple read models from drifting out of sync with each other?**
Each read model independently projects from the same source of truth (event log or outbox stream), so they converge to consistency with the write side on their own timelines — they don't need to be consistent *with each other* at every instant, only eventually consistent with the source. If a projector falls behind or crashes, replaying its consumed stream from the last committed offset rebuilds it correctly.

**Q: What happens if a projector has a bug and corrupts a read model?**
Because the read model is disposable and rebuildable from the event/outbox stream, you fix the projector code and replay the stream from the beginning (or from the last known-good checkpoint) to regenerate a correct read model — the write side and source events are untouched.

**Q: Isn't eventual consistency between write and read confusing for users?**
It can be, which is why UX design matters as much as backend design here — showing an optimistic "Order placed!" confirmation immediately (using data the client already has) avoids ever showing the user a stale negative result, and reserving "wait for consistency" only for cases where staleness would be actively misleading (e.g., available inventory count).

**Q: How does CQRS relate to microservices with their own databases?**
It's the same idea at a different scope: [database-per-service](../07-architecture-patterns/microservices-architecture.md) means each service owns its write model, and other services that need that data build their own local read-optimized projections from that service's published events rather than querying its database directly — CQRS applied across service boundaries instead of within one service.

**Q: When would you introduce CQRS without event sourcing?**
When you want the read/write separation and materialized views but don't need (or want the operational cost of) treating the write side's history as the permanent source of truth — the write DB stays a normal current-state table, and a simpler mechanism like the [outbox pattern](outbox-pattern.md) publishes change events to keep read models in sync.

## Related topics
- [Event Sourcing](event-sourcing.md)
- [Outbox Pattern](outbox-pattern.md)
- [Event-Driven Architecture](event-driven-architecture.md)
- [Message Queues](message-queues.md)
- [Microservices Architecture](../07-architecture-patterns/microservices-architecture.md)
- [Strong vs. Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
