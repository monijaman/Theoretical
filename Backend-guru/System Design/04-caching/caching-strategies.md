# Caching Strategies
[← Back to index](../readme.md)

## What this is and why it matters

Caching is the single highest-leverage technique in system design: it trades a small amount of staleness for a large reduction in latency and load on the source of truth. Every senior candidate is expected to know not just "add a cache" but *which* caching pattern fits a given read/write ratio, consistency requirement, and failure mode. Interviewers use this topic to see whether you reason about who is responsible for populating the cache, what happens on a miss, and what happens when the cache and the database disagree.

The five canonical patterns — cache-aside, read-through, write-through, write-behind (write-back), and refresh-ahead — differ in exactly one dimension each time: who talks to the cache, and when.

## Cache-Aside (Lazy Loading)

The application is in full control. It reads from the cache first; on a miss it reads from the DB, then populates the cache itself.

```
Read path:
  App -> Cache.get(key)
           |-- hit  -> return value
           |-- miss -> App -> DB.get(key)
                       App -> Cache.set(key, value, ttl)
                       return value

Write path:
  App -> DB.write(key, value)
  App -> Cache.delete(key)   // invalidate, don't update
```

This is the default pattern for Redis/Memcached in front of a relational database (Facebook's Memcached architecture, described in their 2013 paper, is the textbook example). The write path deletes rather than updates the cache entry to avoid race conditions where a stale write wins.

```python
def get_user(user_id):
    val = redis.get(f"user:{user_id}")
    if val is not None:
        return deserialize(val)
    val = db.query("SELECT * FROM users WHERE id=%s", user_id)
    redis.set(f"user:{user_id}", serialize(val), ex=300)
    return val

def update_user(user_id, fields):
    db.execute("UPDATE users SET ... WHERE id=%s", fields, user_id)
    redis.delete(f"user:{user_id}")
```

- Pros: cache only holds what's actually requested (no wasted memory on cold data); cache outage degrades to "slow" not "down" since app falls back to DB.
- Cons: first request for any key always misses (cold-start penalty); every read path has to contain cache-miss logic, duplicated across services unless abstracted.

## Read-Through

Functionally similar to cache-aside, but the cache library/provider itself owns the miss-fill logic, not the application. The app only ever talks to the cache; the cache is configured with a loader function that it calls on a miss.

```
App -> Cache.get(key)
         |-- hit  -> return value
         |-- miss -> Cache internally calls loader(key) -> DB
                     Cache stores result, returns to App
```

Examples: Google Guava `LoadingCache`, AWS DynamoDB Accelerator (DAX) in some modes, Ehcache with a `CacheLoader`. The distinction from cache-aside is purely architectural — it moves miss-handling out of business logic and into infrastructure, which matters for code reuse across many services but is otherwise operationally identical.

- Pros: centralizes loading logic, reduces duplicated boilerplate, easier to enforce consistent TTL/serialization policy.
- Cons: requires a cache provider that supports pluggable loaders; couples the cache library to your data-access layer.

## Write-Through

Every write goes to the cache first (or simultaneously), and the cache synchronously writes through to the DB before acknowledging.

```
App -> Cache.set(key, value)
         Cache -> DB.write(key, value)   // synchronous
         Cache acks App only after DB ack
```

- Pros: cache and DB never diverge; reads are always fresh; simplifies read path (no miss-fill race).
- Cons: write latency = cache write + DB write (no benefit to write throughput); every written key occupies cache space even if never read again (can pair with a short TTL or combine with cache-aside for reads).

Used when read-after-write consistency matters a lot and write volume is manageable, e.g. session stores, shopping carts.

## Write-Behind (Write-Back)

Writes go to the cache and are acknowledged immediately; the cache asynchronously flushes to the DB in the background, often batched.

```
App -> Cache.set(key, value)   // ack returned immediately
         Cache buffers write
         ... later, async ...
         Cache -> DB.batch_write([...])
```

Examples: CPU cache write-back is the original archetype; at the application layer, DynamoDB Accelerator (DAX) supports write-through only, but systems like Cassandra's memtable-to-SSTable flush, or custom Redis + background flusher jobs, follow write-behind semantics. Database buffer pools (e.g., InnoDB's dirty pages flushed by the checkpoint process) are also write-behind in spirit.

- Pros: highest write throughput and lowest write latency (DB write is off the critical path); batching amplifies DB efficiency.
- Cons: risk of data loss if the cache node crashes before flushing (must be mitigated with persistence/replication of the cache itself, e.g. Redis AOF); more complex failure/retry handling; readers must go through the same cache to avoid seeing stale DB data.

## Refresh-Ahead

The cache proactively refreshes a hot key *before* it expires, based on access patterns, so consumers never see a miss for popular keys.

```
Cache tracks: key accessed frequently, TTL nearing expiry (e.g. < 20% of TTL left)
Cache -> asynchronously calls loader(key) -> DB
Cache updates value, resets TTL
   (readers keep getting the old value until refresh completes — no miss)
```

Used for hot, expensive-to-compute keys — e.g., a homepage "trending" widget, leaderboard snapshots, or ML feature values. EVCache (Netflix's Memcached wrapper) and some CDN configurations implement refresh-ahead-style background revalidation.

- Pros: eliminates the miss penalty entirely for predictable hot keys, avoids thundering-herd-on-expiry.
- Cons: wastes work refreshing keys nobody ends up reading again soon; needs access-pattern tracking, adding complexity; still needs a fallback path for genuinely cold keys.

## Where to cache — the layered picture

```
Client (browser/mobile)  -- localStorage, HTTP cache, in-memory app state
        |
       CDN / Edge PoP     -- static assets, sometimes API GET responses
        |
   API Gateway / LB       -- occasionally response caching for idempotent GETs
        |
   Application layer      -- in-process cache (Caffeine, local LRU) + Redis/Memcached (shared)
        |
   Database layer         -- query cache, buffer pool/page cache, materialized views
        |
      Disk
```

- **Client**: HTTP `Cache-Control`/`ETag`, service workers, mobile app local DB (SQLite/Realm). Zero network cost but per-device, hard to invalidate remotely.
- **CDN**: for static assets always; increasingly for cacheable dynamic responses (see `cdn-architecture.md`). Removes load and latency at the edge, closest to the user.
- **Application (in-process)**: e.g. Caffeine/Guava in the JVM, or an LRU dict in a Python worker. Nanosecond access, no network hop, but not shared across instances — every node has its own copy, so it's best for read-mostly, small, slowly-changing data (feature flags, config).
- **Application (shared/distributed)**: Redis, Memcached. Shared across all app instances, single source of "hot" truth, but adds a network hop and a new failure domain.
- **Database layer**: buffer pool (InnoDB), query result cache, read replicas acting as a coarse cache, materialized views for expensive aggregates.

Most real systems use several of these simultaneously (browser cache + CDN + Redis + DB buffer pool), each with a different TTL and invalidation story — which is exactly why cache invalidation (see companion doc) is the hard part, not the caching itself.

## Trade-off summary

| Pattern | Write latency | Read latency (steady state) | Data-loss risk | Complexity |
|---|---|---|---|---|
| Cache-aside | DB only | Fast after warm | Low | Low |
| Read-through | DB only | Fast after warm | Low | Medium (needs loader plumbing) |
| Write-through | Cache + DB (sync) | Fast, always fresh | Low | Medium |
| Write-behind | Cache only (fast) | Fast, always fresh | Higher (buffered writes) | High |
| Refresh-ahead | DB only | Fast, no miss for hot keys | Low | High (needs access tracking) |

## Common interview follow-ups

**Q: Why delete the cache entry on write instead of updating it (cache-aside)?**
Updating risks a race: if two writes interleave with two reads, a slower DB write can overwrite the cache with stale data after a newer value was already cached. Deleting forces the next read to reload from the DB, which is simpler to reason about and self-heals through the invalidation path.

**Q: What happens if the cache goes down under cache-aside vs write-through?**
Under cache-aside, the app falls back to hitting the DB directly on every read — degraded latency but functionally correct. Under write-through/write-behind, a cache outage can mean writes are lost (write-behind) or blocked entirely (write-through, since writes go through the cache), so those patterns need the cache tier to be highly available or persistent.

**Q: How would you avoid a stampede when a hot key expires?**
Combine refresh-ahead for known-hot keys with request coalescing/locking for the rest (single-flight pattern: only one request recomputes, others wait), plus jittered TTLs so many keys don't expire in the same instant. Details in `cache-invalidation.md`.

**Q: When would you choose write-behind despite the data-loss risk?**
When write volume is very high and slight loss on crash is acceptable or mitigated by cache persistence/replication — e.g., view-count counters, analytics event buffers, or metrics aggregation where losing the last few seconds of data is tolerable but blocking on synchronous DB writes is not.

**Q: Local in-process cache vs shared Redis — how do you pick?**
Local cache wins on latency and removes a network hop and a failure domain, but every instance has its own copy (memory multiplied by instance count, and invalidation must fan out to all nodes). Shared cache costs a network round trip but guarantees consistency across instances. Many systems use both: a small local cache (with a short TTL) backed by Redis as the shared layer.

## Related topics
- [Cache Eviction Policies](cache-eviction-policies.md)
- [Cache Invalidation](cache-invalidation.md)
- [CDN Architecture](cdn-architecture.md)
- [Database Replication](../02-data-storage/database-replication.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
