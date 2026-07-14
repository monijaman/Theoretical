# Design a Booking System (Hotel/Flight Reservations)
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Search availability across properties/flights by date range, location, guest count, and filters.
- Hold a selected inventory unit (room-night or flight seat) temporarily while the user completes checkout.
- Confirm a booking with payment, converting the hold into a permanent reservation.
- Cancel/modify existing bookings, releasing inventory back to availability.
- Show accurate, near-real-time availability across a large, constantly changing inventory.

**Non-functional**
- **Never double-book** the same room-night or seat — this is the one guarantee the whole system exists to provide; everything else is secondary.
- Search can be slightly stale (seconds old is fine); the booking/confirm step must be strongly consistent against the authoritative inventory.
- High availability for search (a broken search page loses the customer to a competitor); correctness over availability for the actual booking commit.
- Support a "search then book" flow with a real time gap between the two (users compare options across tabs, on other sites, before committing) — the system must tolerate that gap without either blocking inventory too eagerly or overselling.
- Global inventory, many properties/flights, high read:write ratio on search vs. bookings.

**Assumptions**
- Concrete example: hotel booking, 500,000 properties, average 100 rooms/property → 50M room-night inventory units to track per day, booking window of ~365 days ahead → ~18B trackable room-night slots.
- 2M searches/day, 200,000 completed bookings/day.
- A hold during checkout lasts up to 10 minutes before expiring if payment isn't completed.

## 2. Capacity Estimation

**Traffic**
- Search: 2M/day ≈ 2,000,000 / 86,400 ≈ **~23 searches/sec average**, peak (weekend evenings, holiday booking rushes) 10-15x → ~300 searches/sec peak; each search may scan availability across hundreds of candidate properties, so backend query fan-out is much higher than raw request count.
- Bookings: 200,000/day ≈ **~2.3 bookings/sec average**, low absolute volume but each one is a contended write against a specific room-night/date range.

**Storage — availability calendar**
- 500,000 properties × 100 rooms × 365 days ≈ 18.25B room-night rows if modeled naively as one row per room per night. At ~40 bytes/row (room_id, date, status) that's **~730 GB** — manageable, but naive per-night rows create massive write amplification for a single multi-night booking (a 7-night stay touches 7 rows). A range-based model (see 6.2) collapses this dramatically in practice for mostly-available inventory, storing "booked ranges" rather than per-night rows, with per-night rows generated only for query/reporting convenience.

**Search index**
- Property metadata + rough availability signals (denormalized "has availability this month" flags) are what search actually queries — a small, highly cacheable dataset (property attributes rarely change) distinct from the authoritative, transactional per-night booking ledger. Assume ~500,000 properties × 5KB searchable document ≈ 2.5 GB, comfortably fits an Elasticsearch cluster in memory.

**Hold/lock storage**
- At peak, assume 5,000 concurrent in-progress checkouts holding a room-night each, ~200 bytes/hold → 1 MB — trivial; the interesting cost is the *expiry sweep* rate, not the storage volume (see 6.3).

## 3. High-Level Architecture

```
┌──────────┐   ┌───────────────┐   ┌──────────────────┐
│  Clients  │──▶│  API Gateway   │──▶│  Search Service     │──▶ Elasticsearch (property/availability index)
└──────────┘   └───────────────┘   └──────────────────┘
                                             │ user selects a room + dates
                                    ┌────────▼─────────┐
                                    │  Hold Service       │  (creates a short-TTL reservation)
                                    └────────┬─────────┘
                                             │
                                    ┌────────▼─────────┐
                                    │  Availability DB    │  (authoritative, per-property sharded, strongly consistent)
                                    │  (room-night ranges) │
                                    └────────┬─────────┘
                                             │ hold confirmed
                                    ┌────────▼─────────┐
                                    │  Booking Service     │──▶ Payment Service (see payment-system.md)
                                    └────────┬─────────┘
                                             │
                                    ┌────────▼─────────┐          ┌───────────────────┐
                                    │  Bookings DB         │──────▶│ Kafka (booking events)│──▶ Notifications,
                                    └───────────────────┘          └───────────────────┘    Property sync, Analytics
                                             ▲
                                    ┌────────┴─────────┐
                                    │  Hold Expiry Sweeper │ (releases stale holds back to availability)
                                    └────────────────────┘
```

**Walkthrough**
1. **Search**: query hits the Search Service, which reads a cache-friendly, slightly-stale availability signal from Elasticsearch (fast, horizontally scaled, eventually consistent) to show candidate properties/rooms — this is deliberately decoupled from the authoritative store so search load never contends with booking writes.
2. **Select & hold**: the user picks a room + date range; the Hold Service issues a conditional write against the authoritative Availability DB, creating a time-boxed hold (TTL ~10 minutes) on that exact room-night range. This is the first point where correctness, not just speed, matters.
3. **Checkout & payment**: the client proceeds through payment while the hold protects the inventory from being sold twice; on payment success, the Booking Service converts the hold into a permanent booking (atomic transition, same row/range).
4. **Expiry**: if payment doesn't complete in time, a background sweeper (or a TTL-native mechanism in the datastore) releases the hold, returning the room-night range to available inventory.
5. **Async propagation**: a booking-confirmed event flows to Kafka for guest notifications, property-owner sync, and updating the search index's availability signal (eventually consistent refresh, not the source of truth).

## 4. API Design

```
GET /api/v1/search?location=austin-tx&checkin=2026-08-10&checkout=2026-08-13&guests=2
Response: 200
{ "results": [ { "property_id": "p_4471", "room_type_id": "rt_12", "price_per_night": 18900, "available": true } ] }

POST /api/v1/holds
Request:
{ "property_id": "p_4471", "room_type_id": "rt_12", "checkin": "2026-08-10", "checkout": "2026-08-13" }
Response: 201
{ "hold_id": "hold_9F2a", "expires_at": "2026-07-14T10:12:00Z", "price_locked": 56700 }

POST /api/v1/bookings
Request: { "hold_id": "hold_9F2a", "payment_method_token": "tok_...", "guest_details": {...} }
Response: 201
{ "booking_id": "bk_7B31", "status": "confirmed", "checkin": "2026-08-10", "checkout": "2026-08-13" }

DELETE /api/v1/bookings/{booking_id}     // cancellation, subject to policy
Response: 200 { "booking_id": "bk_7B31", "status": "cancelled", "refund_amount": 51000 }
```

The two-phase `POST /holds` then `POST /bookings` split is deliberate — it lets the client lock in price and availability before collecting payment details, which is both better UX and the mechanism that prevents overselling during the checkout gap (see 6.3).

## 5. Data Model & Storage Choice

```
availability_ranges (authoritative, per property, strongly consistent)
  property_id, room_type_id, date_range (daterange type), status(available|held|booked), hold_id NULL, version

holds (short-lived)
  hold_id PK, property_id, room_type_id, date_range, expires_at, status(active|converted|expired)

bookings
  booking_id PK, hold_id, guest_id, property_id, room_type_id, checkin, checkout, status, total_price

property_search_index (Elasticsearch, eventually consistent)
  property_id, location, amenities, rough_availability_flags_by_month
```

The authoritative availability store needs range-overlap queries ("is this room free for these dates") and multi-row transactional guarantees when converting a hold into a booking — this demands a relational engine with native range types and exclusion constraints (Postgres's `daterange` + `EXCLUDE USING gist` is a natural fit: it can enforce "no two active ranges for the same room may overlap" as a database-level constraint, an extremely strong correctness guarantee that would otherwise require careful application-level locking). Per [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md), this is a clear SQL choice for the authoritative layer — NoSQL stores generally don't offer native range-overlap exclusion constraints. The search-facing availability signal, by contrast, is read-heavy, tolerant of staleness, and benefits from a denormalized document store/search index instead.

## 6. Deep Dive

### 6.1 Preventing double-booking — the core concurrency problem

Two customers request the same room for overlapping dates at nearly the same instant; exactly one must win. This is fundamentally the same class of problem as e-commerce inventory oversell (see [ecommerce-platform.md](ecommerce-platform.md) 6.1), but harder because bookings span **date ranges**, not a simple quantity counter — two bookings for the same room can conflict only if their date ranges overlap, and range-overlap checks under concurrency are more failure-prone than a simple `quantity >= 1` guard.

The most robust mechanism is a **database-enforced exclusion constraint**: `EXCLUDE USING gist (room_id WITH =, date_range WITH &&)` in Postgres rejects any `INSERT`/`UPDATE` that would create two overlapping active ranges for the same room, atomically, at the database level — no application-side locking or retry logic can accidentally miss a race condition the way a hand-rolled "check then insert" would. The application only needs to catch the constraint-violation error and translate it into a 409 "no longer available" response. This is strictly better than optimistic locking with a version column for range data, because it doesn't require the application to correctly enumerate every possible conflicting range ahead of time — the database does the overlap math.

### 6.2 Availability calendar data model

Storing one row per room per night (18B+ rows as computed above) is wasteful when the common case is long unbroken stretches of "available." Model availability as **ranges** instead: a row represents a contiguous block of dates in one state (available/held/booked) for one room, dramatically reducing row count for typical low-churn inventory. Booking a 7-night stay becomes one range insert/update, not seven. The trade-off is that range-based models need careful handling of split/merge logic when a booking partially overlaps an existing available range (splitting one "available" range into "available-before, booked, available-after"), which is more complex than flat per-night rows but pays for itself in write volume and matches naturally with Postgres's native range types and GiST indexing for fast overlap queries.

### 6.3 Hold/reservation TTL during checkout

Between "user selects a room" and "user completes payment," the room must be provisionally locked so a second customer can't book it out from under the first — but it can't be locked forever, or abandoned checkouts would permanently waste inventory. Solve with a **TTL-bound hold**: creating a hold writes a `status=held, expires_at=now()+10min` range (via the same exclusion-constraint mechanism, so a hold conflicts with other holds/bookings identically to a real booking). Expiry is enforced two ways for defense in depth: (1) a background sweeper job periodically finds and releases expired holds back to `available`, and (2) every read/write path that touches a range double-checks `expires_at` and treats an expired-but-not-yet-swept hold as if it doesn't exist, so a slow sweeper never causes an incorrect "unavailable" result. This TTL-hold pattern is the same shape as the checkout reservation problem in e-commerce (see [ecommerce-platform.md](ecommerce-platform.md) 6.1) — both trade a small window of "held but maybe abandoned" inventory for the ability to protect a room during the necessarily-asynchronous payment step.

### 6.4 Search-then-book consistency gap

Search results are deliberately served from an eventually-consistent, cached view (property search index) because search traffic is 10-100x booking traffic and must never contend with the authoritative store. This means search can show a room as available that gets held or booked by someone else moments later — an accepted trade, resolved by re-validating against the authoritative Availability DB at hold-creation time (step 2 of the walkthrough) rather than trusting the search result. If the room is gone by then, the API returns a clear "no longer available, here are similar options" response rather than a silent failure — a UX problem to solve, not a correctness problem, since the authoritative layer is what actually prevents the double-booking.

## 7. Bottlenecks & Scaling

- **10x search volume**: search is already decoupled and horizontally scalable (Elasticsearch shards, cache layers); scale by adding replicas and regional search clusters — see [multi-region architecture](../09-large-scale-data-systems/multi-region-architecture.md).
- **Popular property/date contention (e.g., a major event driving demand to one city)**: many holds racing against the same small set of rooms increases exclusion-constraint conflict rate; queue-based admission (a virtual waiting room, as in flash sales) smooths the arrival rate against the authoritative store.
- **Hold sweeper falling behind**: if expired holds aren't released promptly, availability appears artificially scarcer than it is. Scale the sweeper horizontally (partition by property_id range) and rely on read-path expiry double-checks (6.3) as a safety net independent of sweeper cadence.
- **Cross-property/date range search (e.g., "flexible dates" search across a whole month)**: fans out into far more range queries than a fixed-date search; pre-aggregate rough monthly availability signals into the search index rather than computing them live per query.
- **Global inventory, regional demand spikes**: shard the authoritative Availability DB by property/region (properties are naturally regional; a hotel in Austin never contends with one in Tokyo) — see [database-sharding](../02-data-storage/database-sharding.md).

## 8. Trade-offs & Alternatives

- **Database-enforced exclusion constraints vs. application-level locking**: chose to push overlap-conflict detection into the database (Postgres GiST exclusion constraints) rather than distributed locks or optimistic-locking retries in application code, trading some vendor/engine-specific coupling for a dramatically stronger and simpler correctness guarantee.
- **Range-based calendar model vs. per-night rows**: range rows are far more storage- and write-efficient for typical inventory but add split/merge complexity on every partial-overlap mutation — accepted because the write-volume savings dominate at this scale.
- **Eventually-consistent search vs. always-live availability**: search intentionally shows slightly stale availability to protect the authoritative store from read load, accepting a small rate of "sorry, just booked" moments at hold time as the cost of a scalable, fast search experience.
- **10-minute hold TTL**: a longer TTL improves conversion for slow-paying customers but increases the population of temporarily-locked inventory during demand spikes; a shorter TTL protects availability more aggressively at the cost of penalizing legitimately slow checkouts (e.g., users re-entering a declined card) — 10 minutes is a product-tunable balance, not a technical constant.

## Related topics
- [Database Sharding](../02-data-storage/database-sharding.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Distributed Locks](../03-consistency-distributed/distributed-locks.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [Caching Strategies](../04-caching/caching-strategies.md)
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
