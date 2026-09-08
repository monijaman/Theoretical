# CQRS Pattern

[← Back to index](../readme.md)

## Simple idea

**CQRS** means separating writes from reads.

```text
Write request → Command model → Write database
Read request  → Query model   → Read database
```

- A **command** changes data.
- A **query** only reads data.

The read and write sides may use different models or databases.

## Why use CQRS?

Reading and writing often have different needs.

For example:

- Writes need validation and business rules.
- Reads need fast searches and simple response shapes.

Separating them allows each side to scale and change independently.

## Example

In an online store:

1. A command creates an order in the write database.
2. An event announces that the order was created.
3. A consumer updates a read model.
4. The user reads the order from the read model.

```text
Create order → Write DB → Event → Read DB → View order
```

## Main trade-off

The read model may update a little later than the write model. This is called **eventual consistency**.

Immediately after creating an order, the read side might not show it for a short time.

## Benefits

- Read and write workloads scale separately
- Read models can be optimized for the UI
- Complex business rules stay on the write side
- Works well with event-driven systems

## Costs

- More services and data models
- Data synchronization is harder
- Users may see slightly stale data
- Debugging becomes more difficult

## When to use it

Use CQRS when:

- Reads and writes have very different workloads
- The domain has complex write rules
- Independent scaling is valuable

Avoid it for a simple CRUD application. One model and one database are usually easier.

## CQRS vs event sourcing

CQRS and event sourcing are different:

- **CQRS** separates reads and writes.
- **Event sourcing** stores changes as events.

They can be used together, but neither requires the other.

## Interview summary

CQRS improves flexibility and scaling by separating commands from queries. Its main cost is extra complexity and eventual consistency.

## Related topics

- [Event-Driven Architecture](event-driven-architecture.md)
- [Event Sourcing](event-sourcing.md)
- [Outbox Pattern](outbox-pattern.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
