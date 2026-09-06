# System Design Practice Guide

This section is where the theory turns into interview-style practice. Each design note is meant to help you answer three questions:

- What problem is this system solving?
- Which components would you place in the architecture?
- What trade-offs would you explain in an interview?

## How to use this folder

Start with the simpler systems first, then move to the more complex ones.

### Good starting points

- [URL Shortener](url-shortener.md)
- [Rate Limiter](rate-limiter.md)
- [Notification System](notification-system.md)
- [Logging System](logging-system.md)

### Moderate difficulty

- [Chat System](chat-system.md)
- [News Feed](news-feed.md)
- [E-commerce Platform](ecommerce-platform.md)
- [Payment System](payment-system.md)

### Advanced / interview-heavy

- [Uber](uber.md)
- [YouTube](youtube.md)
- [Netflix](netflix.md)
- [Google Drive](google-drive.md)
- [Dropbox](dropbox.md)
- [Search Engine](search-engine.md)
- [Kafka-like Message Broker](kafka-like-message-broker.md)
- [Distributed Job Scheduler](distributed-job-scheduler.md)
- [Multi-Tenant SaaS](multi-tenant-saas.md)

## Suggested study sequence

1. Learn the core building blocks first: caching, queues, load balancing, sharding, and replication.
2. Practice a few smaller designs to build confidence.
3. Move to the larger, more distributed systems.
4. For interviews, explain your choices clearly and justify the trade-offs.

## A simple interview mindset

When you read any design note, try to structure your answer like this:

- Requirements: what must the system do?
- Core entities: what data and actors are involved?
- High-level architecture: how do the pieces connect?
- Bottlenecks: what could break at scale?
- Trade-offs: why choose this approach over another?

That structure makes your answer sound much more organized and interview-friendly.

## All Topics in This Folder

- [Design an API Gateway](api-gateway.md)
- [Design a Booking System (Hotel/Flight Reservations)](booking-system.md)
- [Design a Chat System](chat-system.md)
- [Design a Distributed Job Scheduler](distributed-job-scheduler.md)
- [Design Dropbox](dropbox.md)
- [Design an E-commerce Platform](ecommerce-platform.md)
- [Design Google Drive](google-drive.md)
- [Design a Distributed Message Broker (Kafka-like)](kafka-like-message-broker.md)
- [Design a Centralized Logging System](logging-system.md)
- [Design a Metrics & Monitoring System](metrics-monitoring-system.md)
- [Design a Multi-Tenant SaaS Platform](multi-tenant-saas.md)
- [Design Netflix](netflix.md)
- [Design a News Feed](news-feed.md)
- [Design a Notification System](notification-system.md)
- [Design a Payment Processing System](payment-system.md)
- [Design a Rate Limiter](rate-limiter.md)
- [Design a Search Engine](search-engine.md)
- [Design Uber / Ride-Hailing](uber.md)
- [Design a URL Shortener](url-shortener.md)
- [Design YouTube](youtube.md)

## Practice Check

Choose one exercise, state your assumptions, draw a design, and discuss two bottlenecks. Treat company-named exercises as design practice, not descriptions of those companies’ internal systems.

[System Design guide](../readme.md) · [Backend learning guide](../../readme.md)
