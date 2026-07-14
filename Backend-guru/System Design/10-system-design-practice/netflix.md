# Design Netflix
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Browse a catalog of licensed titles (movies, series/episodes), filtered by region-specific availability.
- Stream video with adaptive bitrate across devices (TV, mobile, web, game console).
- Resume playback from the last watched position, synced across a user's devices.
- Personalized recommendations/homepage rows per user.
- Support simultaneous streams per account up to a plan limit.

**Non-functional**
- Playback start latency low (a few hundred ms to low seconds) globally — this is a content-delivery problem more than a compute problem, since content is pre-encoded, unlike YouTube's user-upload transcoding pipeline.
- Extremely high, sustained, predictable peak load (evening prime-time is a daily, forecastable spike, not a surprise) — capacity planning can lean on that predictability.
- Licensing/region rules must be enforced consistently — showing a title in a region without rights is a legal/contractual problem, not just a UX bug.
- Playback position sync should be fast enough that switching devices mid-episode feels seamless (a couple seconds of staleness is fine; minutes is not).
- Recommendations can be computed near-line/offline — homepage personalization does not need to reflect the last second of activity.

**Assumptions**
- 260M subscribers, ~150M watching on a peak evening, average bitrate ~4 Mbps (mixed SD/HD/4K).
- Catalog: ~15,000 titles, most already fully pre-encoded into all target renditions before ever being requested (unlike user-generated upload content) — this is the single biggest architectural difference from YouTube.
- Content served overwhelmingly through a dedicated CDN (Netflix's real-world approach: Open Connect appliances embedded inside ISP networks) rather than a general-purpose third-party CDN.

## 2. Capacity Estimation

**Bandwidth (the dominant cost and design driver)**
- 150M concurrent streams × 4 Mbps average ≈ **600 Tbps of aggregate peak egress**. No centralized origin infrastructure can serve this directly — the entire architecture is built around pushing content as close to the viewer as physically possible (ISP-embedded caching appliances) so that the "last mile" of this bandwidth never has to cross the open internet or hit a traditional origin at all. This single number is why Netflix operates its own CDN hardware program rather than relying purely on third-party CDNs.

**Storage**
- Per title: assume avg 1 hour runtime, pre-encoded into ~10 rendition/bitrate variants (multiple resolutions × multiple codecs like H.264/AV1/HEVC for device compatibility) ≈ **~15 GB total across all renditions per title-hour**.
- 15,000 titles × avg 8 hours/title (movies shorter, series much longer) × 15 GB/hour ≈ **~1.8 PB** for a single master copy of the full catalog encoded once. Because this copy is then replicated to thousands of CDN cache locations worldwide (not stored once centrally), the *effective* stored footprint across the whole delivery network is far larger — but critically, this is a **one-time-per-title encode**, not a per-view or per-upload cost, which is what makes this tractable compared to YouTube's continuous transcoding load.

**Playback position sync**
- 150M concurrent sessions, each emitting a position-checkpoint event every ~10-30 seconds ≈ **~150M / 15s ≈ 10,000 writes/sec** average for position sync alone — small compared to bandwidth, but latency-sensitive and needs to be available instantly on any device the user switches to.

**Metadata/catalog reads**
- Homepage load for 150M concurrent users, each fetching personalized rows (assume ~20 rows × 20 titles = 400 title-metadata lookups per homepage load) ≈ potentially billions of metadata reads/day — this load is almost entirely cacheable (catalog metadata changes rarely relative to how often it's read), so it's a caching problem, not a raw database-throughput problem.

## 3. High-Level Architecture

```
   ┌───────────┐
   │  Studios/   │  (content ingest — licensing partners deliver source masters)
   │  Partners   │
   └─────┬─────┘
         │ one-time per title
   ┌─────▼──────────────┐
   │ Encoding Pipeline     │  pre-encodes every rendition/codec, once, offline
   │ (offline, not per-view)│
   └─────┬──────────────┘
         │
   ┌─────▼───────────────┐         ┌───────────────────┐
   │ Origin Object Storage  │────────▶│  Open Connect / CDN │──▶ Viewer devices
   │ (master copies)         │ push   │  (ISP-embedded edge  │   (adaptive bitrate
   └────────────────────┘  content   │   caches, prefetched) │    player)
                                     └───────────────────┘
   ┌────────────────────┐
   │ Catalog/Metadata Svc │──▶ Metadata DB (titles, licensing/region rules)
   └─────────┬──────────┘
             │
   ┌─────────▼──────────┐        ┌───────────────────┐
   │ Personalization Svc   │◀───────│  Viewing History /  │
   │ (offline-computed,     │        │  Event Stream       │
   │  served from cache)    │        └───────────────────┘
   └────────────────────┘
                                    ┌───────────────────┐
                                    │ Playback Position   │  (small, fast,
                                    │ Sync Service         │   cross-device)
                                    └───────────────────┘
```

**Walkthrough**
1. Studios/partners deliver source masters; the Encoding Pipeline transcodes each title into every target rendition/codec **once**, offline, well before any viewer requests it — no per-view or per-request encoding work, the defining contrast with YouTube's user-upload pipeline.
2. Encoded content is pushed proactively from origin object storage out to Open Connect appliances embedded inside ISP networks, often ahead of anticipated demand (e.g. a hyped new season pre-positioned at edge caches before its release), rather than waiting for organic cache-fill on first request.
3. A viewer opens the app; the client requests the personalized homepage from the Personalization Service, which serves precomputed (offline-generated) recommendation rows from a fast cache — no heavy ranking computation happens synchronously on page load.
4. On play, the client checks the Playback Position Sync Service for a resume point (if any), fetches the manifest, and streams segments from the nearest Open Connect node — almost always a cache hit, since content was pre-positioned in step 2.
5. As playback progresses, the client periodically checkpoints position to the Sync Service, which propagates it quickly enough that switching to a second device mid-episode resumes from close to the same spot.
6. Viewing events also flow to an event stream that feeds both the Personalization Service's offline model training/row-generation and business analytics — decoupled entirely from the playback path.

## 4. API Design

```
GET /api/v1/browse?user_id=u_512&region=BR
Response: 200
{
  "rows": [
    { "title": "Continue Watching", "items": [ { "title_id": "t_991", "resume_seconds": 1240 } ] },
    { "title": "Trending in Brazil", "items": [ { "title_id": "t_204" }, { "title_id": "t_310" } ] }
  ]
}

GET /api/v1/titles/{id}?region=BR
Response: 200
{
  "title_id": "t_991",
  "name": "Some Series",
  "available_in_region": true,
  "seasons": [ { "season": 1, "episodes": 8 } ],
  "manifest_url": "https://oca.netflix.com/t991/s1e1/master.m3u8"
}

POST /api/v1/playback/position
Request: { "user_id": "u_512", "title_id": "t_991", "episode_id": "e_4", "position_seconds": 1250, "device_id": "d_tv_88" }
Response: 202 { "synced": true }

GET /api/v1/playback/position?user_id=u_512&title_id=t_991&episode_id=e_4
Response: 200 { "position_seconds": 1250, "updated_at": "2026-07-14T21:32:00Z", "device_id": "d_tv_88" }
```

## 5. Data Model & Storage Choice

```
titles (catalog metadata — relatively low write volume, read-heavy)
  title_id        PK
  name, type (movie|series), genres, cast
  seasons/episodes (for series)

licensing_availability
  title_id, region   composite key
  available_from, available_until
  rights_holder

playback_position (very high write volume, small payload, needs fast cross-device reads)
  user_id, title_id, episode_id   composite key
  position_seconds
  device_id, updated_at

viewing_history (append-only event log, feeds personalization offline)
  user_id, title_id, event_type, ts
```

`titles` and `licensing_availability` are comparatively low-write, high-read, and genuinely relational (a title has region rules, a region has date-bounded rights, episodes belong to seasons belong to titles) — a well-indexed relational store fits naturally per [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md), sitting behind an aggressive cache since catalog data changes far less often than it's read (§2).

`playback_position` has the opposite shape: extremely high write frequency (10,000/sec, §2), tiny payload, simple key-value access pattern (`user_id + title_id + episode_id → position`), and needs to be read quickly from any device — a perfect fit for a distributed key-value/NoSQL store (e.g. DynamoDB-style) with the composite key as the partition key, prioritizing write throughput and low-latency point reads over any relational query need.

`viewing_history` is a pure append-only event stream — belongs in Kafka/a data lake feeding batch/near-line personalization jobs, not a transactional database, per [data-lake-vs-data-warehouse](../09-large-scale-data-systems/data-lake-vs-data-warehouse.md).

## 6. Deep Dive

### 6.1 Pre-encoded content in object storage + dedicated CDN (Open Connect)

The single biggest architectural divergence from a user-generated platform like YouTube is that **all encoding happens offline, once, per title**, entirely decoupled from viewer demand — there is no "upload → wait for transcoding → available" pipeline running continuously at viewer-driven scale. This means the origin's job is simple and predictable (serve a bounded, slowly-growing catalog) and lets nearly all engineering effort go into **distribution**: pushing every rendition of every title out to edge caching appliances (Open Connect) physically embedded inside ISP networks, often pre-positioned ahead of anticipated demand (a new season's premiere, a regional trending title) rather than reactively cached on first request. This proactive-push model is only viable because the catalog is bounded and well-understood in advance (~15,000 titles) — it would not work for an unbounded, unpredictable, user-generated upload volume, which is exactly why YouTube's architecture (§ in youtube.md) looks different despite superficially similar streaming mechanics.

### 6.2 Adaptive bitrate streaming (brief, shared mechanics with YouTube)

Mechanically similar to any ABR system: segmented video at multiple bitrates described by an HLS/DASH manifest, with the client player adapting quality per-segment based on measured bandwidth and buffer health. The distinguishing factor here isn't the streaming protocol — it's that every rendition already exists at every edge cache before the first viewer in that region ever presses play, so a quality switch is virtually always a cache hit at the edge, never an origin round-trip.

### 6.3 Personalization/recommendation architecture (brief)

Homepage rows are generated **offline/near-line**, not computed synchronously per page load: batch and streaming jobs consume the viewing-history event stream, update per-user taste/embedding models and per-row candidate lists on a recurring cadence (not real-time-per-click), and write the results to a fast-read cache keyed by user_id that the Personalization Service simply serves on request. This means a homepage load is always a cheap cache read, and the heavy ML computation is amortized across a scheduled batch window rather than paid for on every single user session — critical given hundreds of millions of daily homepage loads.

### 6.4 Resumable playback position sync across devices

The core requirement is that pausing on a phone and resuming on a TV minutes later picks up close to the same spot. This is solved by treating position as a small, extremely write-heavy but simple key-value record (§5) updated on a steady checkpoint cadence (every 10-30 seconds, plus on explicit pause/stop) rather than only at session end — a crash or app-kill should lose at most a few seconds of position accuracy, not the whole session. Reads must be fast and available from any region/device, so this store is replicated broadly (read-heavy-friendly), while writes only need to be correct for the single user issuing them — there's no cross-user contention to worry about, unlike, say, view-counting, which makes this a comparatively easy scaling problem despite its high write volume.

### 6.5 Licensing/region availability data model

Because the same title can be licensed differently (or not at all) per country, and rights windows have start/end dates, availability is modeled as its own indexed table (`title_id, region → date range, rights holder`) checked on every catalog browse/playback request, not folded as a boolean flag onto the title itself — a title is not simply "available" or "unavailable," it's available in a specific set of regions during a specific window, and that window can end without any change to the title's own metadata. This table is small and read-extremely-often, so it's cached per-region (a region's available catalog changes rarely enough that a cache with modest TTL plus explicit invalidation on rights changes is sufficient) rather than checked against a live database on every request.

## 7. Bottlenecks & Scaling

- **10x concurrent streams (1.5M Tbps aggregate)**: this is fundamentally a CDN/edge-capacity problem, not an origin-compute problem — scale by adding more edge appliance capacity inside more ISPs, and lean harder into predictive pre-positioning for anticipated hot content.
- **A single simultaneous global release (all subscribers streaming the same new season on release day)**: pre-position that specific title's renditions at every edge node well ahead of release (a scheduled, known event, unlike YouTube's unpredictable virality) — predictability is the advantage here.
- **Playback position write hotspots**: unlikely to hot-spot on any single key (writes are naturally spread across user_id), but regional replication lag could cause a stale resume point if a user switches devices across regions quickly — bound by requiring the sync read to check the most recent write's region first, or accept brief staleness as a rare edge case.
- **Metadata/catalog read load during a homepage-heavy event (e.g. a major marketing push)**: caching absorbs this almost entirely since catalog data is slow-changing; if cache invalidation lags behind a licensing change, a stricter TTL specifically for licensing-adjacent fields limits the blast radius of showing unavailable content.
- **Encoding pipeline backlog for a large content batch (e.g. acquiring a large catalog of licensed back-catalog titles at once)**: this is an offline, schedulable batch job, not a request-time bottleneck — throw more encoding capacity at it without any viewer-facing urgency.

## 8. Trade-offs & Alternatives

- **Dedicated ISP-embedded CDN (Open Connect) vs third-party CDN**: much higher upfront investment and operational complexity (negotiating with and shipping hardware into ISPs) in exchange for effectively free, extremely close-to-viewer delivery at a scale where third-party CDN costs at 600 Tbps peak would be enormous — justified specifically by Netflix's scale and predictability; a smaller streaming service would rationally choose a third-party CDN instead.
- **Offline/near-line personalization vs real-time re-ranking per session**: gives up minute-to-minute freshness (a click 30 seconds ago might not yet be reflected in the homepage) in exchange for homepage loads being cheap cache reads instead of expensive live ML inference at hundreds of millions of daily loads — the right trade since recommendation quality degrades gracefully with modest staleness.
- **Pre-encoding entire catalog once vs on-demand/lazy encoding of rarely-watched titles**: pre-encoding is simpler operationally and guarantees instant availability, at the cost of spending encoding compute on titles that may get very few views — reasonable given a bounded, licensed catalog (unlike YouTube's firehose of uploads, where lazy/staged encoding is the necessary trade instead).
- **Region-scoped licensing table vs a single global availability flag**: more complex data model and an extra check on every request, but a legal/contractual necessity — there's no simplifying this away.

## Related topics
- [Object Storage Architecture](../09-large-scale-data-systems/object-storage-architecture.md)
- [CDN Architecture](../04-caching/cdn-architecture.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Caching Strategies](../04-caching/caching-strategies.md)
- [Data Lake vs Data Warehouse](../09-large-scale-data-systems/data-lake-vs-data-warehouse.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
- [Database Replication](../02-data-storage/database-replication.md)
- [YouTube](youtube.md)
