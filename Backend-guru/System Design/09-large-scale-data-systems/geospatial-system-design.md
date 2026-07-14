# Geospatial System Design
[← Back to index](../readme.md)

## Why this matters in an interview

"Find the nearest 10 drivers/restaurants/stores to this location" (Uber, Yelp, DoorDash, Pokemon Go) is one of the most common system-design prompts precisely because the naive approach — filter rows where latitude and longitude fall within a bounding box — doesn't scale, and interviewers use it to see whether you know why, and what actually replaces it: grid-based spatial indexing (geohash, quad-tree, Google S2, Uber's H3) that turns a 2D "nearby" search into a fast key lookup, the same trick the inverted index plays for text search.

## Why naive lat/lng range queries don't scale

A naive query looks like:

```sql
SELECT * FROM drivers
WHERE lat BETWEEN 37.75 AND 37.79
  AND lng BETWEEN -122.45 AND -122.40;
```

This looks like a normal range query, but a standard B-tree index on `(lat)` or `(lng)` independently doesn't help much: an index on `lat` narrows to a band of rows spanning the *entire longitude range*, and you still filter those by `lng` afterward — the index can't represent "close in 2D space" as a single sorted dimension. A composite index on `(lat, lng)` still only helps the first column's range efficiently; the second column's range within a wide first-column match degrades toward a scan. The real problem: **latitude/longitude are two independent dimensions, but "nearby" is a 2D neighborhood concept that a 1D sorted index structure can't express directly.**

## Grid indexing: turning 2D proximity into a 1D key lookup

The fix is to divide the earth's surface into a grid of cells, assign every location a **cell ID**, and index that single ID — now "nearby" becomes "same or adjacent cell ID," a simple equality/prefix lookup instead of a 2D range scan.

### Geohashing

Geohash interleaves the bits of latitude and longitude into a single base-32 string, where **shared prefixes mean spatial proximity**:

```
lat = 37.7749, lng = -122.4194  (San Francisco)
        │
        ▼  interleave lat/lng bits, base32-encode
        ▼
     "9q8yy" (a ~4.9km × 4.9km cell)
     "9q8yyk" (a ~1.2km × 0.6km cell — one more char, finer grid)

Nearby points share a prefix:
  "9q8yyk"  ← point A
  "9q8yyt"  ← point B (same 5-char cell "9q8yy", different 6th char)
```

Query pattern: compute the geohash prefix for the search center at the desired precision, then query `WHERE geohash LIKE '9q8yy%'` (a prefix match, which a normal B-tree index *does* handle efficiently since it's now a 1D sorted-string range). The catch: geohash cells are rectangular and their **edges cause boundary problems** — two points a meter apart on opposite sides of a cell boundary can have completely different prefixes, so a naive single-cell lookup misses nearby points across an edge. Production implementations query the center cell plus its 8 neighboring cells to compensate.

### Quad-trees, Google S2, Uber H3

Geohash's rectangular grid distorts near the poles (longitude lines converge) and has the boundary/neighbor problem. More sophisticated systems use:

- **Quad-tree**: recursively subdivides space into 4 quadrants only where data density requires it — dense urban areas get many small cells, sparse rural areas stay as one large cell. This adapts cell size to data density rather than using a uniform grid.
- **Google S2**: projects the earth onto a cube (6 faces), then recursively subdivides each face into a quad-tree, giving cells of roughly uniform physical area everywhere on earth (unlike lat/lng grids, which shrink toward the poles) and no distortion problems near the poles.
- **Uber H3**: uses a **hexagonal** grid instead of square cells. Hexagons have a key advantage for proximity search: every neighboring cell is equidistant from the center cell (a square cell's diagonal neighbor is farther away than its edge neighbor), which makes "check the ring of neighbors" logic simpler and more uniform — directly useful for Uber's driver-matching, where you want a consistent search radius regardless of direction.

```
Square grid (geohash)              Hexagonal grid (H3)
┌───┬───┬───┐                          ⬡ ⬡ ⬡
│   │   │   │                         ⬡ ⬡ ⬡ ⬡
├───┼───┼───┤                          ⬡ ⬡ ⬡
│   │ X │   │   diagonal neighbor      all 6 neighbors of X
├───┼───┼───┤   farther than edge      are equidistant from
│   │   │   │   neighbor               X's center
└───┴───┴───┘
```

## Proximity search architecture: driver-matching (Uber/Lyft)

A running example ties the index choice to a real system: matching a rider to nearby available drivers.

```
                    ┌─────────────────────────────┐
  Driver app  ─────▶│  Location ingestion service  │  (every few seconds,
  (GPS ping)         └──────────────┬───────────────┘   each driver pings
                                    │                     current lat/lng)
                                    ▼
                     ┌───────────────────────────┐
                     │  Geo-index store           │
                     │  (Redis GEO / H3 cell →     │
                     │   set of driver IDs, or      │
                     │   in-memory quad-tree)       │
                     └──────────────┬───────────────┘
                                    │
  Rider requests ride  ────────────▶│  compute rider's cell + ring of
                                    │  neighbor cells, fetch candidate
                                    │  driver IDs, rank by real
                                    │  distance/ETA, return top N
                                    ▼
                          Candidate drivers ranked
                          by routing-engine ETA
                          (not straight-line distance)
```

- Driver locations update frequently (every few seconds), so the index needs cheap **upserts**, not just reads — this rules out anything requiring expensive rebalancing per write. Redis's `GEOADD`/`GEORADIUS` commands (backed by a geohash-sorted set) are popular precisely because updates are O(log N) and in-memory.
- The index narrows millions of drivers down to a small candidate set in the rider's cell + immediate neighbor ring (typically tens of candidates), and only *then* does a more expensive step run — a real routing engine computing actual road-network ETA, since straight-line ("as the crow flies") distance is a poor proxy for real drivable time in a city with rivers, highways, one-ways.
- This two-phase pattern (cheap grid-index narrowing → expensive precise ranking on a small candidate set) is the general shape of almost every geospatial search system, directly analogous to search engines using an inverted index to narrow candidates before expensive relevance scoring (see [Search Architecture / Elasticsearch](search-architecture-elasticsearch.md)).

## PostGIS and geospatial indexes in relational databases

For systems that don't need Uber-scale driver-ping throughput, a relational database with a spatial extension is often sufficient and simpler operationally:

- **PostGIS** (Postgres extension) adds native geometry/geography types and **R-tree**-based indexes (via Postgres's GiST index infrastructure) that index bounding boxes hierarchically, so `ST_DWithin(location, point, radius)` queries use the index instead of scanning.
- This keeps geospatial data alongside the rest of your relational data (joins to `restaurants`, `orders`, etc. stay simple SQL) at the cost of scaling less elastically than a purpose-built geo-index/cache for extremely high write-throughput, constantly-moving-point workloads like live driver locations.
- Rule of thumb: mostly-static points (store locations, delivery zones, property listings) → PostGIS is usually enough; extremely high-frequency-updating points (live vehicle locations at city scale) → a dedicated in-memory grid index (Redis GEO, or a custom H3-keyed store) tends to win.

## Grid cell size: precision vs. fan-out trade-off

Cell size is the central tuning knob, and it trades off in both directions:

```
Smaller cells                          Larger cells
──────────────                          ─────────────
+ precise "nearby" match                + fewer cells to check per query
+ fewer false-positive candidates       + tolerates sparse data areas better
                                          (no near-empty cells)
- more cells to fan out over            - many irrelevant candidates
  for a given search radius               returned per cell (need more
  (more neighbor cells to check)          post-filtering/ranking work)
- dense areas: still can be many        - boundary effects less precise
  points per cell in a big city
```

Pick cell size relative to expected query radius and point density: a rideshare app searching within ~2km wants cells on that rough order so one ring-of-neighbors covers the search radius without needing dozens of cells; a hyper-local search (find the exact building) wants much finer cells. Over-fine cells in sparse regions waste lookups on mostly-empty cells; over-coarse cells in dense regions return too many candidates and push work onto the expensive ranking step.

## Trade-offs summary

| | Geohash | Quad-tree | Google S2 | Uber H3 | PostGIS (R-tree) |
|---|---|---|---|---|---|
| Cell shape | Rectangle | Rectangle (adaptive size) | Roughly square (projected) | Hexagon | Bounding-box hierarchy |
| Uniform area globally | No (distorts near poles) | No (density-adaptive, not area-uniform) | Yes | Yes | N/A (index over stored geometry) |
| Neighbor uniformity | Poor (edge vs. corner differ) | Poor | Better | Best (all 6 neighbors equidistant) | N/A |
| Update cost for moving points | Low (recompute string) | Medium (tree rebalancing) | Low | Low | Medium (index update per write) |
| Best fit | Simple prefix-based systems, Redis GEO | Density-skewed static data | Global-scale uniform indexing (Google Maps) | High-frequency ring queries (Uber) | Data already relational, moderate write rate |

## Common interview follow-ups

**Q: Why does Uber use hexagons (H3) instead of the simpler square-based geohash?**
Every hexagon has exactly 6 neighbors, all equidistant from its center, whereas a square grid's diagonal neighbors are farther away than its edge neighbors — this asymmetry complicates "check the ring around me" logic and biases matching toward drivers that happen to sit on an edge-adjacent cell rather than true nearest ones, which hexagons avoid.

**Q: How do you handle the boundary problem where two nearby points fall in different cells?**
Query not just the point's own cell but its full ring of immediate neighbor cells (8 for a square grid, 6 for hexagonal), so points just across a boundary are still captured; the trade-off is more cells fetched per query, which is why cell size should roughly match the expected search radius so the neighbor ring alone covers it.

**Q: Would you use a grid index or a k-d tree/R-tree for this problem?**
Grid indexes (geohash/H3) are simpler, support fast upserts (critical for constantly-moving points like drivers), and turn lookups into simple key equality/prefix queries; tree structures (k-d tree, R-tree) can give tighter exact-nearest-neighbor results and handle non-uniform density more gracefully but are more expensive to rebalance under high write rates — which is why moving-point systems (driver locations) lean grid-based and mostly-static datasets (store locations, property boundaries) lean tree-based (PostGIS's R-tree/GiST).

**Q: How would you scale this to a global user base rather than one city?**
Shard the geo-index by a coarse geographic key (e.g., region or country, or the top-level S2/H3 cell), since queries are inherently local — a rider in Tokyo never needs to search cells in São Paulo — so this is a natural, low-skew sharding key, unlike, say, sharding by user ID which offers no locality benefit for this workload.

**Q: Why not just compute Euclidean/Haversine distance to every point and sort?**
That's O(N) per query against every driver in the system regardless of how far away they are, which doesn't scale past a small fleet; grid indexing prunes to a small local candidate set in roughly O(1)/O(log N) before any distance math runs at all, and only that small set needs the more expensive real-distance or routing-ETA calculation.

**Q: How fresh does the driver location index need to be, and what does that imply architecturally?**
Driver positions update every few seconds and matching needs sub-second responsiveness, so the index has to live in a low-latency, high-write in-memory store (Redis GEO or an equivalent in-memory grid) rather than a disk-backed relational index rebuilt periodically — this pushes the design toward the same near-real-time, eventually-slightly-stale trade-off seen in search indexes (see [Search Architecture / Elasticsearch](search-architecture-elasticsearch.md)).

## Related topics
- [Search Architecture / Elasticsearch](search-architecture-elasticsearch.md) — the same "cheap index narrows candidates, expensive step ranks them" two-phase pattern
- [Database Sharding](../02-data-storage/database-sharding.md) — sharding a geo-index by coarse region as a natural, low-skew key
- [Uber System Design](../10-system-design-practice/uber.md) — the full ride-matching system this page's running example is drawn from
- [Real-Time System Design](real-time-system-design.md) — the streaming location-ping ingestion path feeding the geo-index
