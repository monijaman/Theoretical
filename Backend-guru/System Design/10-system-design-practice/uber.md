# Design Uber / Ride-Hailing
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Riders request a trip from pickup to destination; system matches them with a nearby available driver.
- Continuous driver location ingestion so the system always knows roughly where every driver is.
- Trip lifecycle: requested → driver assigned → en route to pickup → in progress → completed/cancelled.
- ETA estimation for driver arrival and for trip duration.
- Fare calculation including surge pricing during high demand.
- Both rider and driver apps see live location updates during an active trip.

**Non-functional**
- Location updates and matching must be near-real-time (seconds, not tens of seconds) — a stale driver location leads to bad matches.
- High availability for the matching path — a rider unable to request a ride is a core product failure.
- Matching should be "good enough fast" over "perfect but slow" — a slightly-further driver assigned in 2 seconds beats the optimal driver found in 20.
- Geographically partitioned by nature — a rider in São Paulo never needs to be matched against a driver in Tokyo, which should be exploited for scale, not fought.
- Consistency requirement is strict only around the "one driver, one active trip at a time" invariant — double-booking a driver is a serious correctness bug, not just a UX blemish.

**Assumptions**
- 5M active drivers globally, 20M daily riders, 900 metro areas.
- Peak concurrent active drivers in a single busy city: ~50,000 (e.g. a major metro at rush hour).
- Driver app pings location every 4 seconds while online; trip requests average 15M/day globally.

## 2. Capacity Estimation

**Location ingestion traffic**
- 5M drivers × 1 ping / 4 sec = **~1.25M location updates/sec** globally at steady state — this dwarfs the trip-request volume and is the dominant write load in the whole system.
- Per-city peak: 50,000 drivers × 1/4 sec ≈ **12,500 updates/sec** for one busy metro — must be handled by that region's shard without a global bottleneck (see §6.1 on geo-partitioning).

**Trip request traffic**
- 15M requests/day ÷ 86,400 ≈ **~175/sec average**, peak (rush hour, weekend nights) assume 8x → **~1,400/sec** peak globally, spread thin per city (a single busy city might see 50-100 requests/sec at its own peak).

**Storage**
- Location pings: 1.25M/sec × (driver_id + lat/lng + timestamp ≈ 40 bytes) ≈ **50 MB/sec** ≈ **~4.3 TB/day** if every raw ping were persisted — in practice only the *latest* position per driver needs to be durable/queryable for matching (an in-memory geo-index, not a growing log); trip-relevant location history (the path of an actual active trip) is what's durably stored, which is a far smaller subset: 15M trips/day × ~200 location points/trip × 40 bytes ≈ **120 GB/day**, a very different and far more manageable number.
- Trip records: id, rider_id, driver_id, pickup/dropoff coords, fare, timestamps, status ≈ 500 bytes/row × 15M/day ≈ **7.5 GB/day** ≈ **~2.7 TB/year** — trivial.

**Geo-index sizing**
- A live in-memory index (e.g. geohash-bucketed) holding current position for 5M drivers × ~100 bytes (id + geohash + timestamp) ≈ **500 MB** globally — comfortably fits in memory, sharded by region so each region's index only holds its own drivers.

## 3. High-Level Architecture

```
   ┌───────────┐                        ┌───────────┐
   │ Driver app │                        │ Rider app  │
   └─────┬─────┘                        └─────┬─────┘
         │ location ping (4s)                  │ request trip
   ┌─────▼──────────┐                    ┌──────▼───────┐
   │ Location Ingest  │                    │ Trip Service  │
   │ Service (regional)│                   │  (regional)   │
   └─────┬──────────┘                    └──────┬───────┘
         │ update                                │ query nearby + assign
   ┌─────▼──────────────┐              ┌─────────▼──────────┐
   │ Geo-Index (in-memory)│◀────────────│  Matching Service    │
   │ geohash/quadtree,     │  nearby     │  (scoring, dispatch)  │
   │ sharded per region     │  drivers   └─────────┬──────────┘
   └────────────────────┘                          │ assign
                                            ┌───────▼────────┐
                                            │  Trip State DB   │  (trip lifecycle,
                                            │  (sharded)        │   strongly consistent
                                            └───────┬────────┘   per-trip)
                                                    │
                                        ┌───────────▼────────────┐
                                        │ ETA / Pricing Service    │
                                        │ (map/traffic + surge calc)│
                                        └─────────────────────────┘
```

**Walkthrough**
1. Drivers continuously stream location pings to a **regional** Location Ingest Service, which updates the in-memory Geo-Index — this index is the live, queryable "who's near where" source of truth, deliberately separate from any durable trip data since it's ephemeral and needs to be extremely fast to update and query.
2. A rider requests a trip; the Trip Service queries the Matching Service, which asks the Geo-Index for candidate nearby available drivers (via geohash/quadtree lookup, §6.1) within an expanding radius.
3. The Matching Service scores candidates (distance, ETA, driver rating, acceptance-likelihood) and dispatches a request to the top candidate driver's app; on acceptance, the Trip Service transitions the trip to `driver_assigned` and marks that driver `unavailable` in the Geo-Index atomically — this atomic flip is what prevents double-booking.
4. If the driver doesn't respond/declines within a timeout, the Matching Service falls through to the next candidate — this retry loop is bounded (a handful of attempts) before widening the search radius or informing the rider of a delay.
5. During the trip, both apps continue to receive live location updates (driver's position relayed to the rider, and vice versa for context) via the same ingest/query path, while the ETA/Pricing Service recomputes arrival estimates against live traffic conditions.
6. On completion, the Trip Service finalizes the fare (base + surge + distance/time), persists the full trip record, and releases the driver back to `available` in the Geo-Index.

## 4. API Design

```
POST /api/v1/drivers/{id}/location
Request: { "lat": 37.7749, "lng": -122.4194, "heading": 90, "ts": "2026-07-14T09:00:00Z" }
Response: 200 { "ack": true }

POST /api/v1/trips
Request:
{
  "rider_id": "r_1029",
  "pickup": { "lat": 37.7750, "lng": -122.4183 },
  "destination": { "lat": 37.8044, "lng": -122.2712 }
}
Response: 202
{
  "trip_id": "t_88213",
  "status": "matching",
  "estimated_fare_range": { "low": 18.50, "high": 24.00 },
  "surge_multiplier": 1.4
}

GET /api/v1/trips/{id}
Response: 200
{
  "trip_id": "t_88213",
  "status": "driver_assigned",
  "driver": { "id": "d_512", "location": { "lat": 37.7755, "lng": -122.4190 }, "eta_seconds": 180 }
}

POST /api/v1/trips/{id}/driver-response
Request: { "driver_id": "d_512", "accept": true }
Response: 200 { "status": "driver_assigned" }

PATCH /api/v1/trips/{id}/status
Request: { "status": "completed", "final_location": {...} }
Response: 200 { "fare": { "base": 12.00, "surge": 1.4, "total": 21.30 } }
```

Live location during a trip is typically streamed over a WebSocket or SSE channel per trip rather than polled via REST, for the same latency reasons as [chat system](chat-system.md)'s connection design — polling every few seconds at this scale multiplies request volume unnecessarily.

## 5. Data Model & Storage Choice

```
driver_current_location (in-memory geo-index, ephemeral, sharded by region)
  driver_id → { geohash, lat, lng, heading, updated_at, status: available|on_trip|offline }

trips (durable, sharded by trip_id / region)
  trip_id           PK
  rider_id, driver_id
  pickup, destination (lat/lng)
  status            (requested|matching|driver_assigned|in_progress|completed|cancelled)
  fare_breakdown
  requested_at, started_at, completed_at
  route_points      (array, for the actual path taken — used for fare verification/support)

drivers (durable profile — rarely-changing data)
  driver_id PK, vehicle_info, rating, home_region

surge_zones (regional, short-lived)
  geohash_prefix → current_multiplier, computed on a rolling window
```

The live geo-index is the one component that is fundamentally **not** a traditional database — it's an in-memory spatial index (geohash-bucketed sorted structure, or a quadtree) that must support "find all available drivers within radius R of point P" in milliseconds and tolerate being rebuilt from scratch (drivers simply re-ping) if a node is lost. This maps directly to [geospatial-system-design](../09-large-scale-data-systems/geospatial-system-design.md) rather than a generic SQL/NoSQL choice.

`trips`, by contrast, needs stronger consistency guarantees per record (a trip must not be assigned two drivers, or double-billed) but low cross-trip relational complexity — a sharded document/wide-column store keyed by `trip_id` works well, per [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md), with the single-driver-single-active-trip invariant enforced via a conditional write (e.g. `UPDATE ... WHERE status = 'available'`) rather than an application-level check-then-write, which would race under concurrent match attempts.

## 6. Deep Dive

### 6.1 Geospatial indexing — geohash vs quadtree

**Geohash**: encode (lat, lng) into a base32 string where shared prefixes mean geographic proximity (e.g. `9q8yy` and `9q8yz` are adjacent cells). Nearby-driver search becomes "look up drivers whose geohash shares my prefix," expanding to shorter (coarser) prefixes if too few results are found nearby. This is simple to shard (partition the index by geohash prefix, which naturally co-locates a region's drivers on one shard) and cheap to update (just re-bucket on each ping), but has an edge-boundary quirk: two points very close together can have completely different geohash prefixes if they straddle a cell boundary, requiring the search to also check adjacent cells, not just prefix matches.

**Quadtree**: recursively subdivide space into 4 cells, going deeper where driver density is high and staying coarse where it's sparse — naturally adaptive to real-world density (dense in Manhattan, sparse in rural areas), giving more uniform per-node driver counts than a fixed-precision geohash grid. It's more complex to shard and rebalance across nodes as tree structure changes, though, versus a geohash's simple string-prefix partitioning.

In practice, most production ride-hailing systems (Uber included, per public engineering writeups) use geohash-style or H3-hexagonal grid indexing for exactly the sharding-simplicity reason — the boundary-adjacency quirk is a solved, well-known problem (search the current cell plus its 8 neighbors) versus quadtree rebalancing being an ongoing operational cost.

### 6.2 Matching algorithm

A naive "nearest available driver" is simple but not optimal system-wide — it ignores which direction the driver is already heading, how likely they are to accept, and city-wide supply/demand balance. Real matching typically layers on top of proximity: score candidates by a combination of ETA-to-pickup (not straight-line distance — actual road/traffic-aware ETA), driver acceptance-rate history, and sometimes a batched/windowed matching pass (collect requests and available drivers over a short window, e.g. a few seconds, and solve a mini bipartite-matching/assignment problem) rather than greedily matching one-at-a-time, which can leave a globally worse assignment (e.g. two riders each get a "nearest" driver that, matched differently, would have produced two shorter total trips). The trade is small added latency (batching window) for meaningfully better aggregate efficiency — most systems find a 2-4 second batching window an acceptable trade.

### 6.3 Trip state machine and the double-booking invariant

The trip lifecycle (`requested → matching → driver_assigned → in_progress → completed/cancelled`) is a strict state machine — transitions are validated server-side (a `completed` trip can't go back to `in_progress`) and, critically, assigning a driver must be an atomic conditional operation: `assign driver D to trip T only if D.status == available`, executed as a single conditional write, not a read-then-write from application code, which would allow two concurrent matching attempts to both "see" the driver as available and both assign them. This is the one place in the whole system where strong consistency is non-negotiable, even though almost everything else (location freshness, ETA accuracy) tolerates being approximate — see [strong-vs-eventual-consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md) for the general framing of picking consistency levels per-invariant rather than uniformly.

### 6.4 Surge pricing and ETA calculation (brief)

Surge pricing is computed per small geographic zone (geohash-prefix bucket) on a short rolling window, as a function of the ratio of open trip requests to available drivers in that zone — a simple multiplier (e.g. 1.0-3.0x) applied to the base fare, recalculated every 1-2 minutes and cached per zone so every fare quote doesn't recompute it from scratch. ETA calculation blends a road-network routing engine (shortest/fastest path considering real road topology, not straight-line distance) with live traffic-condition data (aggregated from the very driver GPS pings the system already ingests, which is a nice reinforcing loop — more drivers on the road means better traffic estimates for everyone). Both are supporting services that read from the same live location data but are architecturally decoupled from the matching hot path so a slow pricing/ETA recompute never blocks driver assignment.

## 7. Bottlenecks & Scaling

- **10x location ping volume (12.5M/sec)**: shard the geo-index further by finer-grained region, and consider reducing ping frequency adaptively (e.g. less frequent pings for a stationary/idle driver) rather than a flat 4-second interval for everyone.
- **A single mega-city event (concert letting out, causing a demand spike)**: surge pricing partially self-corrects by pulling in drivers from adjacent zones, but the matching service must also widen its search radius automatically as local supply thins out, and the batching window (§6.2) may need to temporarily lengthen to solve a fairer assignment under contention.
- **Regional geo-index node failure**: since the index is ephemeral and reconstructible (drivers re-ping every few seconds regardless), failover just means a brief gap in freshness for affected drivers, not data loss — design the index tier for fast node replacement over complex replication.
- **Cross-region trips (rare, e.g. near a regional boundary)**: handle as an edge case via a small overlap zone queried against both neighboring regions' indexes, rather than trying to make the global index a single non-partitioned structure.
- **Trip-state DB write contention during rush hour**: shard `trips` by region/trip_id so peak-hour writes in one city don't contend with unrelated regions, per [database-sharding](../02-data-storage/database-sharding.md).

## 8. Trade-offs & Alternatives

- **Geohash over quadtree**: chosen for simpler, string-prefix-based sharding at the cost of needing explicit neighbor-cell checks near boundaries — the right trade when operational simplicity of rebalancing matters more than perfectly uniform cell density.
- **Batched matching window vs greedy nearest-driver assignment**: a few seconds of added latency buys noticeably better city-wide assignment efficiency; greedy would be simpler and slightly faster per-request but leaves value on the table in aggregate.
- **Ephemeral, approximate location data vs durable, exact tracking**: the geo-index is deliberately treated as best-effort and reconstructible — trying to make every 4-second ping durably consistent across replicas would add latency and complexity for a data point whose value decays to nothing within seconds anyway.
- **Strong consistency scoped only to the driver-assignment invariant**: rather than running the whole system at one consistency level, we pick per-invariant — this is more design effort upfront but avoids either over-paying for consistency everywhere (slow) or under-paying where it truly matters (double-booked drivers, a real business/trust problem).

## Related topics
- [Geospatial System Design](../09-large-scale-data-systems/geospatial-system-design.md)
- [Real-Time System Design](../09-large-scale-data-systems/real-time-system-design.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [WebSockets vs SSE vs Long Polling](../06-communication-protocols/websockets-vs-sse-vs-long-polling.md)
- [Caching Strategies](../04-caching/caching-strategies.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
- [Chat System](chat-system.md)
