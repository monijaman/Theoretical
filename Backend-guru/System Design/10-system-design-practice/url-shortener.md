# Design a URL Shortener
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Given a long URL, generate a short alias (e.g. `https://sho.rt/aZ9kLm`) that redirects to it.
- Support optional custom aliases (`sho.rt/my-launch`).
- Redirect `sho.rt/{code}` → original URL with an HTTP redirect.
- Support link expiration (TTL) and manual deletion.
- Basic analytics: click count, referrer, timestamp, geo/device (async, best-effort).
- Optional: per-user accounts, private links, QR code generation.

**Non-functional**
- Read-heavy: redirects vastly outnumber creations (assume 100:1 to 1000:1).
- Redirect latency must be very low — single-digit milliseconds at p99 from cache, low tens of ms from DB.
- High availability for redirects (a 500 on a shortened link is a broken product); creation can tolerate brief degraded mode.
- Uniqueness: no two active long URLs silently collide on the same code (unless intentional aliasing).
- Eventual consistency acceptable for click analytics; the redirect mapping itself should be strongly readable soon after creation (read-your-writes for the creator).
- Unguessable-enough codes if privacy matters (don't want sequential IDs leaking creation order/volume, though this is not a security boundary).

**Assumptions**
- 500M new links/month, links live "forever" unless expired, service is global, single write region acceptable for creation (redirects served from everywhere via cache/CDN).

## 2. Capacity Estimation

**Traffic**
- Writes: 500M/month ≈ 500,000,000 / (30×86,400) ≈ **~193 writes/sec** average; assume 10x peak → ~2,000 writes/sec peak.
- Read:write ratio 100:1 → reads ≈ 19,300/sec average, peak ~50,000-100,000/sec (a viral link can spike far higher, which is why caching/CDN matters more than raw DB capacity).

**Storage**
- Each record: short code (7 bytes), long URL (avg 200 bytes), metadata (user id, timestamps, flags) ≈ 500 bytes/row with indexing overhead.
- 500M/month × 12 = 6B links/year × 500 bytes ≈ **3 TB/year** raw, less with compression. Over 5 years, ~15 TB — trivially shardable, not a big-data problem by volume, but a big *QPS* problem.

**Key space**
- Base62 alphabet (`[a-zA-Z0-9]`), 7 characters → 62^7 ≈ 3.5 trillion codes. At 6B new links/year, this space lasts effectively forever; even 6 characters (62^6 ≈ 56.8B) would last ~9 years at this rate. Pick 7 for headroom and to keep collision probability negligible if using random generation.

**Bandwidth**
- Redirect response is tiny (a 301/302 with a Location header, ~300 bytes). At 50k QPS peak that's ~15 MB/s — negligible; the real cost driver is request *count*, not bytes, which is why this is a caching/infrastructure problem, not a bandwidth problem.

**Cache sizing**
- Hot set follows a power law — a small fraction of links get most clicks. Caching the top ~20% of active links (rough working number) in Redis covers the overwhelming majority of reads. If 100M links are "active" in a rolling window, 20M × ~500 bytes ≈ 10 GB — comfortably fits in a Redis cluster's memory.

## 3. High-Level Architecture

```
                                   ┌─────────────┐
                                   │   Clients   │
                                   └──────┬──────┘
                                          │
                                   ┌──────▼──────┐
                                   │     CDN      │  (edge caches hot redirects)
                                   └──────┬──────┘
                                          │
                             ┌────────────▼────────────┐
                             │   Load Balancer / API GW │  (rate limiting, TLS)
                             └────────────┬─────────────┘
                         ┌─────────────────┴──────────────────┐
                         ▼                                    ▼
               ┌──────────────────┐                 ┌──────────────────┐
               │  Write Service    │                 │  Redirect Service │
               │ (create/expire)   │                 │  (read hot path)  │
               └────────┬──────────┘                └─────────┬─────────┘
                         │                                     │
                 ┌───────▼────────┐                    ┌───────▼────────┐
                 │  ID Generator   │                    │  Redis Cache   │
                 │ (KGS / Snowflake)│                   │ code → long URL│
                 └───────┬─────────┘                    └───────┬────────┘
                         │                                      │ miss
                 ┌───────▼─────────────────────────────────────▼────────┐
                 │              Primary Datastore (sharded)              │
                 │      code (PK) → long_url, user_id, ttl, flags        │
                 └───────────────────────┬────────────────────────────────┘
                                         │ async
                                 ┌───────▼────────┐
                                 │  Kafka (clicks) │──▶ Analytics pipeline (Flink/Spark → warehouse)
                                 └─────────────────┘
```

**Walkthrough**
1. **Create**: client POSTs a long URL. Write Service asks the ID Generator for a unique code (or validates a requested custom alias), writes `{code → long_url}` to the sharded datastore, and populates the cache proactively (write-through) so the very first redirect is already a cache hit.
2. **Redirect**: client hits `sho.rt/{code}`. CDN/edge cache serves it directly if cached (common for viral links). Otherwise it hits the Redirect Service, which checks Redis; on a hit it responds with a 301/302 in ~1ms. On a miss it reads the sharded DB, backfills the cache, and responds.
3. **Click event**: fired asynchronously to Kafka so it never blocks the redirect's critical path; consumed by a stream processor into a warehouse (Snowflake/BigQuery) for analytics dashboards.
4. **Expiration**: a background job (or TTL directly in the datastore/cache) removes expired links; Redis TTL mirrors DB TTL so stale entries don't serve after expiry.

## 4. API Design

```
POST /api/v1/links
Request:
{
  "long_url": "https://example.com/some/very/long/path?query=1",
  "custom_alias": "my-launch",       // optional
  "ttl_seconds": 2592000,             // optional, null = no expiry
  "user_id": "u_123"                  // optional, for ownership/analytics
}
Response: 201
{
  "short_url": "https://sho.rt/aZ9kLm",
  "code": "aZ9kLm",
  "expires_at": "2026-08-13T00:00:00Z"
}

GET /{code}
Response: 301 Moved Permanently   (or 302 if you want click tracking to remain in the loop / A-B test destinations)
Location: https://example.com/some/very/long/path?query=1

GET /api/v1/links/{code}/stats
Response: 200
{
  "code": "aZ9kLm",
  "clicks": 18234,
  "created_at": "...",
  "last_clicked_at": "..."
}

DELETE /api/v1/links/{code}      // owner-only, soft delete
```

301 vs 302: 301 (permanent) lets browsers cache the redirect, cutting server load further but making click analytics and destination updates impossible without a client cache-bust. 302 (found/temporary) forces every click through the server — the right choice if analytics or dynamic destination-swapping matters more than shaving redirect latency.

## 5. Data Model & Storage Choice

```
links
  code            VARCHAR(10)  PK
  long_url        TEXT
  user_id         VARCHAR(36)  NULL, indexed
  created_at      TIMESTAMP
  expires_at      TIMESTAMP    NULL, indexed (for expiry sweeps)
  is_active       BOOLEAN
  custom          BOOLEAN

clicks (append-only, or skip and stream straight to Kafka)
  code, ts, referrer, geo, device
```

Access pattern is pure key-value: point lookup by `code`, point write on create. This is the canonical case for a NoSQL key-value store — DynamoDB or Cassandra — over a relational engine: no joins, no multi-row transactions, near-infinite horizontal scale by hashing `code`, and predictable single-digit-ms latency at any size. See [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md) for the general decision framework. If the team already runs Postgres at moderate scale, a sharded Postgres (by hash of `code`, see [database-sharding](../02-data-storage/database-sharding.md)) works fine too — the workload just doesn't *need* relational features.

`user_id` lookups ("show me my links") need a secondary index or a separate table keyed by `user_id` (DynamoDB GSI, or Cassandra table modeled per query). Clicks are a write-heavy, append-only stream — route them straight to Kafka rather than the primary store; the OLTP table should never see click-volume writes.

## 6. Deep Dive

### 6.1 Code generation — three approaches

**a) Random + collision check.** Generate 7 random base62 characters, check existence, retry on collision. Simple but adds a read-before-write and gets slower as the keyspace fills (birthday-paradox collisions become more frequent, though at 62^7 this is negligible for centuries at our volume).

**b) Base62-encode an auto-increment / Snowflake ID.** A counter (DB sequence, or a distributed ID generator producing 64-bit unique IDs — Twitter Snowflake style: timestamp + shard ID + sequence) is base62-encoded into the code. No collision checks needed, generation is O(1), and IDs are monotonic which helps DB index locality. Downside: codes are guessable/sequential, leaking approximate creation order and link volume — mitigate by XOR-ing with a fixed random mask before encoding, or shuffling the bit layout, purely for obfuscation (not a security control).

**c) Pre-generated Key Generation Service (KGS).** A background service pre-computes batches of unique random codes and stores them in a "available keys" table/queue; each app server checks out a batch (e.g. 1,000 keys) to hand out locally without contention, refilling before exhaustion. This decouples code generation latency from the write path entirely and avoids any collision checks at request time. This is the classic Bitly-style design and is the recommended approach when write QPS is high enough that a shared counter or collision-retry loop becomes contention-prone. Batches must be persisted as "checked out" before use (not just in memory) or a server crash leaks/repeats keys — usually acceptable to lose a batch on crash if it's small.

Given our ~2,000 writes/sec peak, (b) or (c) both work; (c) is preferable if multiple write-service instances must generate independently without a shared bottleneck.

### 6.2 Cache strategy and stampede protection

Write-through on creation warms the cache for new links before their first read. For the redirect hot path, use [caching strategies](../04-caching/caching-strategies.md): cache-aside with a short-enough TTL to respect link expiration, Redis as the shared cache tier, and CDN edge caching in front of that for anonymous, cacheable (301) redirects to cut origin load for viral links to near zero.

Guard against **cache stampede** when a hot key evicts or a cold node comes up: use request coalescing (single in-flight DB read per key, others wait on it) or probabilistic early expiration, per [cache-invalidation](../04-caching/cache-invalidation.md). Eviction policy should be LRU/LFU-ish ([cache-eviction-policies](../04-caching/cache-eviction-policies.md)) since popularity is heavily skewed and recency correlates with future clicks.

### 6.3 Custom aliases and uniqueness under concurrency

Custom aliases need a uniqueness guarantee under concurrent creation — two users requesting `my-launch` simultaneously must not both "succeed." Enforce this with a unique constraint / conditional write at the storage layer (`INSERT ... IF NOT EXISTS` in Cassandra, a conditional `PutItem` in DynamoDB, or a unique index in Postgres) rather than a check-then-write from the app tier, which races. Return a 409 Conflict on collision and let the client retry with a different alias.

## 7. Bottlenecks & Scaling

- **10x traffic (500k writes/sec-equivalent redirects)**: CDN edge caching absorbs the bulk of it for popular links; for the long tail, scale Redis horizontally (cluster mode, consistent hashing across nodes) and shard the primary datastore further by `hash(code)`.
- **Hot single link goes viral (millions of clicks/minute on one code)**: a single Redis key becomes a hot key even inside a cluster (one node owns it). Mitigate with local (in-process) caching in front of Redis for the top-N hottest keys, or replicate that one key across multiple cache nodes and load-balance reads across replicas.
- **Click analytics volume**: move fully off any transactional store onto Kafka + a stream processor (Flink) writing rollups to a warehouse; never let analytics writes contend with the redirect path.
- **Global users, single write region**: redirects (reads) are trivially served from edge/regional caches everywhere; writes can stay in one region initially since write QPS is low, then move to [multi-region architecture](../09-large-scale-data-systems/multi-region-architecture.md) with regional ID-generator shard ranges (each region owns a slice of the ID space) if write latency from far regions becomes a problem.
- **Abuse/spam**: rate limit creation per user/IP ([rate-limiting](../01-scaling-traffic/rate-limiting.md)), scan long URLs against a malware/phishing blocklist before activating a code.

## 8. Trade-offs & Alternatives

- **301 vs 302**: chose 302-by-default for analytics fidelity, trading away browser-level caching of the redirect. A hybrid (301 for links older than N days with stable destinations) is a reasonable middle ground.
- **KGS vs on-the-fly Snowflake encoding**: KGS avoids any coordination on the hot path but adds an operational component (the key-generation/batch-checkout service) and a small blast radius if a server crashes with a checked-out batch. Snowflake-style encoding is operationally simpler but leaks ordering information unless obfuscated.
- **NoSQL over SQL**: gave up multi-row transactions and ad-hoc joins (e.g., "links created by users who also clicked X") in exchange for effectively unlimited horizontal scale and flat latency. If the product grows rich relational reporting needs, a secondary analytics store (warehouse) rather than the OLTP store handles that instead of forcing SQL back onto the hot path.
- **Strong vs eventual consistency for the redirect mapping**: once written, a code's mapping essentially never changes (links are immutable by design), so we don't actually need strong consistency after creation — eventual consistency between DB and cache is fine, we just need read-your-writes at creation time, which write-through caching gives us for free. See [strong-vs-eventual-consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md).

## Related topics
- [Database Sharding](../02-data-storage/database-sharding.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Caching Strategies](../04-caching/caching-strategies.md)
- [Cache Invalidation](../04-caching/cache-invalidation.md)
- [Cache Eviction Policies](../04-caching/cache-eviction-policies.md)
- [CDN Architecture](../04-caching/cdn-architecture.md)
- [Rate Limiting](../01-scaling-traffic/rate-limiting.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [Message Queues](../05-messaging-event-driven/message-queues.md)
