# RabbitMQ + Event-Driven Architecture — Upgrade Plan

## Purpose

Build a decoupled, scalable microservice system using event-driven patterns with RabbitMQ, ensuring reliable message delivery, graceful failure handling, and clear separation of concerns across services.

## Learning Objectives

- Understand RabbitMQ exchange types (direct, topic, fanout) and when to use each
- Implement dead letter queues (DLQ) and poison pill handling
- Design robust retry strategies with exponential backoff
- Build idempotent processors to handle duplicate messages safely
- Manage event versioning and schema evolution
- Guarantee at-least-once delivery semantics
- Monitor message flow and detect bottlenecks

## Project Scope

- Refactor a monolithic REST API into a microservice system with RabbitMQ
- **Services**: User Service, Order Service, Email Service, Notification Service
- Replace direct API calls with asynchronous event publishing and consumption
- Implement a complete event-driven workflow (user signup → email sent → notification logged)

## Success Criteria (examples)

- All inter-service communication via RabbitMQ events (zero direct API calls)
- No event loss: guaranteed delivery with DLQ and monitoring
- Retry attempts transparent to clients; failed events in DLQ for later replay
- New service can subscribe to events without modifying existing services
- Message processing latency p99 < 5 seconds for happy path

## Implementation Plan (phases)

1. RabbitMQ Setup & Topology (1 day)
   - Spin up RabbitMQ instance (standalone or cluster)
   - Design exchange topology: topic exchanges for domain events, direct for RPC-style
   - Create durable queues and DLQ bindings
   - Test connectivity and basic publish/consume

2. Event Schema & Versioning (1 day)
   - Define event schema (e.g., JSON with `eventType`, `version`, `timestamp`, `payload`)
   - Plan versioning strategy (additive fields, deprecated fields flagged)
   - Document contract per event type
   - Create schema validation/serialization layer

3. Core Microservices (2–3 days)
   - User Service: publishes `UserCreated`, `UserUpdated` events
   - Order Service: publishes `OrderPlaced`, `OrderProcessed` events; consumes `UserCreated`
   - Email Service: consumes `UserCreated`, `OrderPlaced`; sends emails asynchronously
   - Notification Service: consumes `OrderProcessed`; stores/delivers notifications
   - Each service has its own DB (no shared schema)

4. Retry & Idempotency (1–2 days)
   - Implement exponential backoff for failed messages (DLQ with TTL and re-queue)
   - Add idempotency keys to events (use deduplication in consumers)
   - Test idempotency: replay same event, verify no duplicates in state
   - Set up DLQ monitoring and alert thresholds

5. At-Least-Once Delivery (1 day)
   - Ensure idempotent message processing (transaction/unique constraint per event ID)
   - Test: force service crash during message handling, verify recovery
   - Disable message acknowledgment until processing complete (transactional)
   - Document recovery and replay procedures

6. Monitoring & Observability (1–2 days)
   - Log all published and consumed events with context (service, timestamp, ID)
   - Track queue depth, consumer lag, and message throughput
   - Set up alerts for DLQ accumulation, stalled consumers
   - Create dashboards for event flow (e.g., Grafana + Prometheus)

7. Testing & Chaos (1–2 days)
   - Write integration tests: publish event, verify all consumers processed
   - Chaos test: simulate service crashes, network partitions, message loss
   - Load test: sustained high message throughput
   - Verify no message loss and eventual consistency

## Tools & Commands (recommended)

- **Message Broker**: RabbitMQ, RabbitMQ Management UI
- **Client Libraries**: `pika` (Python), `amqplib` (Node.js), `bunny` (Ruby)
- **Serialization**: JSON with schema validation (jsonschema, Joi, zod)
- **Monitoring**: RabbitMQ Admin API, Prometheus metrics, ELK/Splunk for logs
- **Testing**: testcontainers, Docker for local RabbitMQ, chaos-engineering frameworks

## Key Patterns

| Pattern               | Example                                       | RabbitMQ Setup                      |
| --------------------- | --------------------------------------------- | ----------------------------------- |
| **Domain Events**     | `user.created`                                | Topic exchange, multiple consumers  |
| **Saga/Choreography** | Multi-step workflow (order → payment → email) | Event chain across services         |
| **Dead Letter Queue** | Poison pill, repeated failures                | DLQ binding, retry logic            |
| **Idempotency**       | Same event processed twice = same result      | Dedup key, unique constraint        |
| **Event Sourcing**    | Append-only event log                         | Capture all state changes as events |

## RabbitMQ Configuration Example

```ruby
# Pseudo-config
- Exchange: events.topic (durable, type: topic)
- Queue: user-events (durable, consumer_priority: 10)
- Binding: events.topic → user-events (routing_key: user.*)
- DLQ: user-events.dlq (auto-expire: 24h, x-dead-letter-exchange: events.topic)
```

## Deliverables

- Updated `readme.md` with full implementation plan and architecture
- RabbitMQ topology setup script (exchanges, queues, DLQ)
- Microservice implementations (user, order, email, notification) with event publishing/consuming
- Event schema definitions and validation layer
- Integration test suite and chaos test scenarios
- Monitoring dashboard and runbook (failover, replay, DLQ handling)
- Performance report: event latency, throughput, and reliability metrics

---

If you want, I can break the phased plan into tracked TODOs, provide code scaffolds for each service, or help with RabbitMQ topology setup.
