# 5. Messaging & Event-Driven Architecture

This section explains how systems communicate asynchronously and decouple producers from consumers.

## What this section covers

- Message queues
- Event-driven architecture
- Event sourcing
- CQRS
- Outbox pattern

## How to study it

1. Learn how async communication changes system behavior.
2. Focus on durability, ordering, retries, and eventual consistency.
3. Compare event-driven patterns with direct request-response design.

## Suggested starting point

- [Message Queues](message-queues.md)

## All Topics in This Folder

- [Caching Strategies](cqrs-pattern.md)
- [Event-Driven Architecture](event-driven-architecture.md)
- [Event Sourcing](event-sourcing.md)
- [Message Queues](message-queues.md)
- [Outbox Pattern](outbox-pattern.md)

## Practice Check

Follow an order event from database write to consumer. Identify how a failed publish or duplicate delivery is handled.

[System Design guide](../readme.md) · [Backend learning guide](../../readme.md)
