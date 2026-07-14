# Design an E-commerce Platform
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Browse/search a product catalog with categories, filters, and full-text search.
- Add items to a cart, view/update cart, checkout (address, payment, order confirmation).
- Track inventory per SKU and prevent overselling when stock is limited.
- Order lifecycle: placed → paid → fulfilled → shipped → delivered (or cancelled/returned).
- Handle flash sales / limited-inventory drops without collapsing.

**Non-functional**
- Catalog browsing is read-heavy and can tolerate slightly stale data (seconds of staleness on price/stock display is fine).
- Checkout/inventory decrement must be strongly consistent — two customers must never both "win" the last unit of a sold-out item.
- High availability for browsing (an outage during Browse = lost revenue, but recoverable); checkout correctness matters more than checkout availability (better to briefly queue than to oversell or double-charge).
- Elastic scaling for traffic spikes — flash sales can be 50-100x normal QPS on a narrow set of SKUs.
- Global catalog, potentially multi-region customers, single consistent view of inventory per SKU.

**Assumptions**
- 10M SKUs, 5M daily active shoppers, 500K orders/day, a small number of flash-sale events with sub-second sellout on hero items.
- Each order references a handful of SKUs (avg 3 line items).

## 2. Capacity Estimation

**Traffic**
- Browsing: 5M DAU, average 20 page views/session → 100M page views/day ≈ 100,000,000 / 86,400 ≈ **~1,160 reads/sec average**, peak (evening + sale events) easily 20-50x → ~30,000-60,000 reads/sec peak, almost entirely cacheable.
- Orders: 500,000/day ≈ 500,000 / 86,400 ≈ **~6 orders/sec average**; checkout involves several sequential steps (cart validate → inventory reserve → payment → confirm), each much cheaper than the read path but far less tolerant of failure.
- Flash sale spike: a single SKU with 10,000 units can see 500,000 simultaneous "buy" attempts in the opening seconds — this concentrated write contention on one row is the hard problem, not aggregate throughput (see 6.2).

**Storage**
- Catalog: 10M SKUs × ~5KB (title, description, images metadata, attributes) ≈ 50 GB — small, and read-mostly, so it's almost entirely servable from cache/CDN plus a search index.
- Orders: 500K/day × 365 × ~2KB/order (header + line items) ≈ **~365 GB/year**, growing indefinitely — a clear sharding/archival candidate after a year or two of hot retention.
- Inventory: 10M SKUs × ~50 bytes (sku_id, warehouse_id, quantity, reserved) ≈ 500 MB per warehouse-location mapping — tiny, but this small table takes an outsized share of design effort because of concurrency, not volume.

**Bandwidth**
- Product images dominate bytes, not API payloads: assume avg 5 images/product × 200KB, served entirely via CDN — origin bandwidth for images should approach zero once cache-warm; API JSON payloads (a few KB per request) are comparatively negligible.

## 3. High-Level Architecture

```
┌──────────┐   ┌─────────┐   ┌───────────────────┐   ┌───────────────────┐
│  Clients  │──▶│   CDN    │──▶│  API Gateway (LB)  │──▶│  Catalog/Search Svc │──▶ Elasticsearch
└──────────┘   └─────────┘   └─────────┬───────────┘   └───────────────────┘
                                        │
                       ┌────────────────┼─────────────────────┐
                       ▼                ▼                     ▼
              ┌────────────────┐ ┌──────────────┐   ┌──────────────────┐
              │  Cart Service    │ │ Inventory Svc │   │  Order Service     │
              │ (Redis-backed)   │ │ (reservations)│   │ (state machine)    │
              └────────────────┘ └──────┬────────┘   └─────────┬──────────┘
                                          │                      │
                                 ┌────────▼────────┐   ┌─────────▼──────────┐
                                 │ Inventory DB      │   │  Payment Service    │──▶ (see payment-system.md)
                                 │ (per-SKU counters, │   └─────────┬──────────┘
                                 │  strongly consistent)│           │
                                 └───────────────────┘    ┌─────────▼──────────┐
                                                           │  Kafka (order events)│──▶ Fulfillment, Notifications,
                                                           └─────────────────────┘    Analytics
```

**Walkthrough**
1. **Browse**: catalog reads hit CDN/edge cache first; misses go to the Catalog Service, which serves structured product data from a cache-in-front-of-DB layer and full-text/faceted search from Elasticsearch.
2. **Cart**: adding items writes to a fast, session-scoped store (Redis, or a small per-user document) — no inventory is touched yet; the cart is just an intent, not a hold.
3. **Checkout initiation**: on "place order," the Inventory Service attempts to **reserve** stock for each line item (see 6.1) — this is the first strongly-consistent, contended step.
4. **Payment**: on successful reservation, the Order Service creates a `pending` order and hands off to the Payment Service (a charge — see [payment-system.md](payment-system.md) for that subsystem in depth).
5. **Confirm or release**: on payment success, the order transitions to `paid` and the reservation is committed (decremented permanently); on payment failure or reservation-hold expiry, the hold is released back to available stock.
6. **Async fan-out**: an order-placed event goes to Kafka, driving fulfillment/warehouse picking, customer notifications, and analytics — none of which should block the checkout response.

## 4. API Design

```
GET /api/v1/products?q=running+shoes&category=footwear&page=1
Response: 200
{ "results": [ { "sku": "SKU-88213", "title": "...", "price": 7999, "in_stock": true } ], "total": 4821 }

POST /api/v1/cart/items
Request: { "sku": "SKU-88213", "quantity": 2 }
Response: 200 { "cart_id": "cart_9f2a", "items": [ ... ], "subtotal": 15998 }

POST /api/v1/checkout
Request: { "cart_id": "cart_9f2a", "shipping_address": {...}, "payment_method_token": "tok_..." }
Response: 202
{ "order_id": "ord_7B31", "status": "pending", "reservation_expires_at": "2026-07-14T10:15:00Z" }

GET /api/v1/orders/{order_id}
Response: 200
{ "order_id": "ord_7B31", "status": "paid", "line_items": [...], "tracking": null }

POST /internal/inventory/reserve      // internal, called by checkout flow
Request: { "sku": "SKU-88213", "quantity": 2, "reservation_id": "rsv_44" }
Response: 200 { "reserved": true } | 409 { "reserved": false, "reason": "insufficient_stock" }
```

Checkout returns `202 Accepted` rather than `201`/`200` because placing an order kicks off an asynchronous multi-step workflow (reserve → pay → confirm) — the client polls or receives a webhook/websocket update rather than getting a final status synchronously.

## 5. Data Model & Storage Choice

```
products (catalog)
  sku PK, title, description, category, attributes(JSON), price, images[]

inventory
  sku PK, warehouse_id, quantity_available, quantity_reserved, version (for optimistic locking)

reservations (TTL-bound holds)
  reservation_id PK, sku, quantity, order_id, expires_at, status(active|committed|released)

orders
  order_id PK, user_id, status, total, created_at
orders_line_items
  order_id, sku, quantity, unit_price
```

**Catalog** is read-heavy, loosely structured (varying attributes per product category), and benefits from denormalized, cache-friendly documents — a good fit for a document store (MongoDB/DynamoDB) or a relational table with a JSON attributes column, fronted heavily by cache and a dedicated search index (Elasticsearch) for query flexibility. **Inventory and orders**, by contrast, need multi-row transactional guarantees (decrement stock *and* create an order line item atomically; never let stock go negative) — this is squarely relational-database territory. Per [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md), we split the platform: SQL (Postgres) for inventory/orders where correctness under concurrency is paramount, NoSQL/search-engine hybrid for catalog where read scale and flexible schema dominate. See also [database-sharding](../02-data-storage/database-sharding.md) — orders shard naturally by `user_id` or time, inventory shards by `sku`.

## 6. Deep Dive

### 6.1 Preventing overselling under concurrent purchases

The core hard problem: N customers simultaneously try to buy the last unit of a SKU; exactly one must succeed. Two workable approaches:

- **Optimistic locking**: read `quantity_available` and a `version` number, then `UPDATE inventory SET quantity_available = quantity_available - 1, version = version + 1 WHERE sku = ? AND version = ? AND quantity_available >= 1`. If zero rows are affected, someone else won the race (or stock hit zero) — retry the read or fail the reservation. This avoids holding a lock for the duration of a request but requires a retry loop under contention.
- **Conditional atomic decrement**: skip optimistic-lock retries entirely with a single conditional write — `UPDATE inventory SET quantity_available = quantity_available - 1 WHERE sku = ? AND quantity_available >= 1`, checking the affected-row-count to know if it succeeded. This is simpler and is what most systems actually use in practice; it's effectively the same idea without needing a separate version column, since the `WHERE quantity_available >= 1` guard *is* the concurrency control.

Either way, this must be a **reservation**, not an immediate permanent decrement: place a `reservations` row with a short TTL (e.g., 10-15 minutes) when checkout starts, decrementing `quantity_available` and incrementing `quantity_reserved` atomically. If payment succeeds, the reservation is committed (removed, `quantity_reserved` decremented permanently). If payment fails or the TTL expires, a background sweeper releases the hold back to `quantity_available` — this is what stops abandoned checkouts from permanently locking up stock (see also the identical hold/expiry pattern in [booking-system.md](booking-system.md) 6.3).

### 6.2 Flash-sale traffic spikes

A flash sale concentrates massive write contention onto a tiny number of inventory rows — the general horizontal-scaling playbook (add more app servers) doesn't help because the bottleneck is row-level lock contention on one database row, not aggregate capacity. Mitigations, layered:
- **Queue-based admission control**: put arriving "buy" requests for the hot SKU into a queue/waiting-room (a virtual line) and process them serially or in small controlled batches against inventory, rather than letting all 500,000 requests hit the database row simultaneously — this bounds contention to a manageable rate regardless of front-door traffic.
- **In-memory/Redis counter for the hot SKU**: use an atomic `DECR` in Redis as a fast, low-contention gatekeeper (rejecting requests once the counter hits zero) in front of the durable database, which only needs to process requests that passed the Redis gate — this trades a small window of potential inconsistency (worth reconciling immediately after) for orders-of-magnitude less load on the transactional store.
- **Pre-scaling and static asset offload**: know about sale start times in advance; pre-warm caches/CDN and pre-scale the fleet rather than reacting to the spike after it starts.

### 6.3 Order state machine

```
placed → reserved → payment_pending → paid → fulfilling → shipped → delivered
                                    ↘ payment_failed → cancelled (stock released)
paid → return_requested → refunded (compensating ledger entry, stock restored optionally)
```
Transitions are enforced server-side (never trust a client to move an order state) and each transition is an atomic DB update plus an emitted event, so downstream systems (fulfillment, notifications) react to state changes rather than polling.

## 7. Bottlenecks & Scaling

- **10x order volume**: shard the orders table by `user_id` or time-range; keep the inventory table on its own dedicated, highly-tuned cluster since it's the narrowest bottleneck (see [database-sharding](../02-data-storage/database-sharding.md)).
- **Catalog search under load**: Elasticsearch scales horizontally by adding shards/replicas; keep search read replicas geographically close to users via [multi-region architecture](../09-large-scale-data-systems/multi-region-architecture.md).
- **Hot-SKU contention (flash sales)**: as above — queue-based admission plus Redis-gated atomic counters; without this, 10x traffic on a single popular SKU causes lock-wait pileups that can take down the whole inventory service, not just that SKU's checkout path.
- **Cart service under session sprawl**: Redis cart storage scales horizontally by consistent hashing across nodes; expire abandoned carts aggressively (TTL) to bound memory growth.
- **Payment service dependency latency**: circuit-break to the payment provider and degrade gracefully (queue-and-retry rather than fail the whole checkout) — see [circuit-breaker-pattern](../01-scaling-traffic/circuit-breaker-pattern.md).

## 8. Trade-offs & Alternatives

- **Reservation-with-TTL vs. immediate permanent decrement**: reservations add complexity (a sweeper job, an extra table) but prevent stock from being silently locked up by abandoned checkouts — the alternative (decrement immediately, refund on failure) risks a worse UX where "in stock" items intermittently fail at payment time.
- **Strong consistency for inventory vs. eventual consistency for catalog display**: accepted a deliberate split — catalog "in stock" badges can lag reality by seconds (cache-fed, eventually consistent) while the actual checkout-time reservation is strongly consistent against the real counter. This means the UI can occasionally show "in stock" for an item that sells out a second later — an acceptable trade because the checkout flow re-validates against the source of truth regardless of what the UI displayed.
- **Redis-gated counters for flash sales vs. pure database contention**: gains massive throughput headroom during spikes at the cost of a brief window where Redis and the database could theoretically disagree — mitigated with a reconciliation pass immediately following the sale window.
- **Synchronous reservation step vs. fully async checkout**: chose to make reservation synchronous (blocking the checkout response) because customers need an immediate yes/no on "is this actually available," rather than discovering failure minutes later — a queue-based async checkout would scale contention better but hurts UX for the common case.

## Related topics
- [Database Sharding](../02-data-storage/database-sharding.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Caching Strategies](../04-caching/caching-strategies.md)
- [CDN Architecture](../04-caching/cdn-architecture.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Distributed Locks](../03-consistency-distributed/distributed-locks.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
