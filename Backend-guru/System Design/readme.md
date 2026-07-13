# System Design — Senior/Architect Interview Notes

A structured knowledge base for senior/staff/architect-level system design interviews. Each topic below has its own write-up: what it is, how it actually works, trade-offs, real-world usage, and the follow-up questions interviewers tend to ask.

**Suggested study order** (per the original priority call): CAP/PACELC → sharding/replication → caching → queues/Kafka → consistency → resilience patterns → observability → multi-region → full system designs.

---

## 1. [Scaling & Traffic Management](01-scaling-traffic/)
| Topic | Link |
|---|---|
| Load Balancing | [load-balancing.md](01-scaling-traffic/load-balancing.md) |
| Reverse Proxy & API Gateway | [reverse-proxy-api-gateway.md](01-scaling-traffic/reverse-proxy-api-gateway.md) |
| Horizontal vs Vertical Scaling | [horizontal-vs-vertical-scaling.md](01-scaling-traffic/horizontal-vs-vertical-scaling.md) |
| Rate Limiting | [rate-limiting.md](01-scaling-traffic/rate-limiting.md) |
| Backpressure | [backpressure.md](01-scaling-traffic/backpressure.md) |
| Circuit Breaker Pattern | [circuit-breaker-pattern.md](01-scaling-traffic/circuit-breaker-pattern.md) |
| Retry & Exponential Backoff | [retry-exponential-backoff.md](01-scaling-traffic/retry-exponential-backoff.md) |

## 2. [Data & Storage](02-data-storage/)
| Topic | Link |
|---|---|
| Database Replication | [database-replication.md](02-data-storage/database-replication.md) |
| Database Sharding | [database-sharding.md](02-data-storage/database-sharding.md) |
| Database Partitioning | [database-partitioning.md](02-data-storage/database-partitioning.md) |
| SQL vs NoSQL | [sql-vs-nosql.md](02-data-storage/sql-vs-nosql.md) |
| Database Indexing | [database-indexing.md](02-data-storage/database-indexing.md) |
| Database Connection Pooling | [database-connection-pooling.md](02-data-storage/database-connection-pooling.md) |
| Distributed Transactions | [distributed-transactions.md](02-data-storage/distributed-transactions.md) |
| Database Migration at Scale | [database-migration-at-scale.md](02-data-storage/database-migration-at-scale.md) |

## 3. [Consistency & Distributed Theory](03-consistency-distributed/)
| Topic | Link |
|---|---|
| CAP Theorem | [cap-theorem.md](03-consistency-distributed/cap-theorem.md) |
| PACELC Theorem | [pacelc-theorem.md](03-consistency-distributed/pacelc-theorem.md) |
| Strong vs Eventual Consistency | [strong-vs-eventual-consistency.md](03-consistency-distributed/strong-vs-eventual-consistency.md) |
| Distributed Locks | [distributed-locks.md](03-consistency-distributed/distributed-locks.md) |
| Leader Election | [leader-election.md](03-consistency-distributed/leader-election.md) |
| Consensus Algorithms | [consensus-algorithms.md](03-consistency-distributed/consensus-algorithms.md) |
| Quorum | [quorum.md](03-consistency-distributed/quorum.md) |

## 4. [Caching](04-caching/)
| Topic | Link |
|---|---|
| Caching Strategies | [caching-strategies.md](04-caching/caching-strategies.md) |
| Cache Eviction Policies | [cache-eviction-policies.md](04-caching/cache-eviction-policies.md) |
| Cache Invalidation | [cache-invalidation.md](04-caching/cache-invalidation.md) |
| CDN Architecture | [cdn-architecture.md](04-caching/cdn-architecture.md) |

## 5. [Messaging & Event-Driven Architecture](05-messaging-event-driven/)
| Topic | Link |
|---|---|
| Message Queues | [message-queues.md](05-messaging-event-driven/message-queues.md) |
| Event-Driven Architecture | [event-driven-architecture.md](05-messaging-event-driven/event-driven-architecture.md) |
| Event Sourcing | [event-sourcing.md](05-messaging-event-driven/event-sourcing.md) |
| CQRS Pattern | [cqrs-pattern.md](05-messaging-event-driven/cqrs-pattern.md) |
| Outbox Pattern | [outbox-pattern.md](05-messaging-event-driven/outbox-pattern.md) |

## 6. [Communication Protocols](06-communication-protocols/)
| Topic | Link |
|---|---|
| WebSockets vs SSE vs Long Polling | [websockets-vs-sse-vs-long-polling.md](06-communication-protocols/websockets-vs-sse-vs-long-polling.md) |
| REST vs GraphQL vs gRPC | [rest-vs-graphql-vs-grpc.md](06-communication-protocols/rest-vs-graphql-vs-grpc.md) |

## 7. [Architecture Patterns](07-architecture-patterns/)
| Topic | Link |
|---|---|
| Microservices Architecture | [microservices-architecture.md](07-architecture-patterns/microservices-architecture.md) |
| Monolith vs Microservices | [monolith-vs-microservices.md](07-architecture-patterns/monolith-vs-microservices.md) |
| Multi-Tenant Architecture | [multi-tenant-architecture.md](07-architecture-patterns/multi-tenant-architecture.md) |

## 8. [Reliability & Operations](08-reliability-operations/)
| Topic | Link |
|---|---|
| High Availability | [high-availability.md](08-reliability-operations/high-availability.md) |
| Fault Tolerance | [fault-tolerance.md](08-reliability-operations/fault-tolerance.md) |
| Disaster Recovery | [disaster-recovery.md](08-reliability-operations/disaster-recovery.md) |
| Observability: Logs, Metrics & Traces | [observability-logs-metrics-traces.md](08-reliability-operations/observability-logs-metrics-traces.md) |
| Distributed Tracing | [distributed-tracing.md](08-reliability-operations/distributed-tracing.md) |
| Zero-Downtime Deployment | [zero-downtime-deployment.md](08-reliability-operations/zero-downtime-deployment.md) |
| Blue-Green & Canary Deployment | [blue-green-canary-deployment.md](08-reliability-operations/blue-green-canary-deployment.md) |

## 9. [Large-Scale Data Systems](09-large-scale-data-systems/)
| Topic | Link |
|---|---|
| Data Lake vs Data Warehouse | [data-lake-vs-data-warehouse.md](09-large-scale-data-systems/data-lake-vs-data-warehouse.md) |
| Search Architecture / Elasticsearch | [search-architecture-elasticsearch.md](09-large-scale-data-systems/search-architecture-elasticsearch.md) |
| Object Storage Architecture | [object-storage-architecture.md](09-large-scale-data-systems/object-storage-architecture.md) |
| Distributed File Systems | [distributed-file-systems.md](09-large-scale-data-systems/distributed-file-systems.md) |
| Geospatial System Design | [geospatial-system-design.md](09-large-scale-data-systems/geospatial-system-design.md) |
| Real-Time System Design | [real-time-system-design.md](09-large-scale-data-systems/real-time-system-design.md) |
| Multi-Region Architecture | [multi-region-architecture.md](09-large-scale-data-systems/multi-region-architecture.md) |

## 10. [Full System Design Practice](10-system-design-practice/)
| Design | Link |
|---|---|
| URL Shortener | [url-shortener.md](10-system-design-practice/url-shortener.md) |
| Rate Limiter | [rate-limiter.md](10-system-design-practice/rate-limiter.md) |
| Notification System | [notification-system.md](10-system-design-practice/notification-system.md) |
| Chat System | [chat-system.md](10-system-design-practice/chat-system.md) |
| News Feed | [news-feed.md](10-system-design-practice/news-feed.md) |
| Uber | [uber.md](10-system-design-practice/uber.md) |
| YouTube | [youtube.md](10-system-design-practice/youtube.md) |
| Netflix | [netflix.md](10-system-design-practice/netflix.md) |
| Google Drive | [google-drive.md](10-system-design-practice/google-drive.md) |
| Dropbox | [dropbox.md](10-system-design-practice/dropbox.md) |
| Search Engine | [search-engine.md](10-system-design-practice/search-engine.md) |
| Payment System | [payment-system.md](10-system-design-practice/payment-system.md) |
| E-commerce Platform | [ecommerce-platform.md](10-system-design-practice/ecommerce-platform.md) |
| Booking System | [booking-system.md](10-system-design-practice/booking-system.md) |
| Logging System | [logging-system.md](10-system-design-practice/logging-system.md) |
| Metrics/Monitoring System | [metrics-monitoring-system.md](10-system-design-practice/metrics-monitoring-system.md) |
| Distributed Job Scheduler | [distributed-job-scheduler.md](10-system-design-practice/distributed-job-scheduler.md) |
| Kafka-like Message Broker | [kafka-like-message-broker.md](10-system-design-practice/kafka-like-message-broker.md) |
| API Gateway | [api-gateway.md](10-system-design-practice/api-gateway.md) |
| Multi-Tenant SaaS | [multi-tenant-saas.md](10-system-design-practice/multi-tenant-saas.md) |

---

*For a 15+ years experience, architecture-focused CV: prioritize CAP/PACELC → sharding/replication → caching → queues/Kafka → consistency → resilience patterns → observability → multi-region → the 20 full system designs.*
