# System Design Study Guide

This folder is a practical study guide for system design, not just a collection of notes. The goal is to help you understand the core ideas, the trade-offs, and the interview-style thinking behind them.

## How to use this guide

1. Start with the core foundations: scaling, storage, caching, messaging, and reliability.
2. Read one topic at a time and focus on the plain-English idea first.
3. Use the linked notes to drill into the details when you need them.
4. Practice the full design problems at the end to turn knowledge into interview readiness.

## Best study path

1. Scaling & traffic management
2. Data storage & consistency
3. Caching & messaging
4. Reliability & observability
5. Full system design practice

## Good starting topics

- [Load Balancing](01-scaling-traffic/load-balancing.md)
- [Rate Limiting](01-scaling-traffic/rate-limiting.md)
- [Database Replication](02-data-storage/database-replication.md)
- [Caching Strategies](04-caching/caching-strategies.md)
- [CAP Theorem](03-consistency-distributed/cap-theorem.md)
- [Observability: Logs, Metrics & Traces](08-reliability-operations/observability-logs-metrics-traces.md)

## Section overview

- [1. Scaling & Traffic Management](01-scaling-traffic/readme.md)
- [2. Data & Storage](02-data-storage/readme.md)
- [3. Consistency & Distributed Theory](03-consistency-distributed/readme.md)
- [4. Caching](04-caching/readme.md)
- [5. Messaging & Event-Driven Architecture](05-messaging-event-driven/readme.md)
- [6. Communication Protocols](06-communication-protocols/readme.md)
- [7. Architecture Patterns](07-architecture-patterns/readme.md)
- [8. Reliability & Operations](08-reliability-operations/readme.md)
- [9. Large-Scale Data Systems](09-large-scale-data-systems/readme.md)
- [10. Full System Design Practice](10-system-design-practice/readme.md)

> Tip: if you are preparing for interviews, focus on the first 8 sections first and use the practice section as your final review set.

## Optional Extension

[Enterprise AI, Cloud, and System Design](11-upgrade/readme.md) connects these foundations to AI applications. Study it after the core topics if that matches your goals.

## Practice Check

Pick one design, describe the request flow in plain language, and explain where data could be delayed, duplicated, or lost. Use those questions to choose the next topic to study.

[Backend learning guide](../readme.md)
