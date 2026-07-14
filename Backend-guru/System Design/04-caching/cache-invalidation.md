# Cache Invalidation
[← Back to index](../readme.md)

## What this is and why it's asked

"There are only two hard things in Computer Science: cache invalidation and naming things." The joke lands in interviews because it's true for a specific reason: caching itself is easy (put data somewhere fast), but *knowing when that copy is wrong* is a distributed-systems problem in disguise. The cache and the source of truth are two separate pieces of state that can diverge the instant a write happens anywhere, and every invalidation strategy is really a different answer to "how much staleness can we tolerate, and who is responsible for noticing it's gone stale?"

Interviewers use this topic to see whether you can reason about the write path, not just the read path — cache-aside and friends (see `caching-strategies.md`) describe how a cache gets *populated*; invalidation describes how it stops lying once the underlying data changes.

## TTL-based expiry

The simplest strategy: every cached entry carries an expiration time, after which it's treated as a miss regardless of whether the underlying data actually changed.

```
SET product:42 "{...}" EX 60      # stale after 60s, no matter what
```

- Pros: no coordination required at all — the cache never needs to be told about a write; trivially correct in the sense that staleness is bounded and known in advance.
- Cons: staleness window always exists (up to the full TTL) even when nothing changed; picking the TTL is a guess — too long and users see stale data, too short and you lose most of the hit-rate benefit and hammer the DB.
- Almost always used as a *backstop* layered under one of the strategies below, not as the only mechanism — e.g., a write-triggered delete plus a 5-minute TTL safety net in case the delete message is ever lost.

## Explicit invalidation on write

The application (or the cache library, under write-through) actively tells the cache a key is no longer valid at the moment the write happens, instead of waiting for a timer.

```
Write path (cache-aside, delete-on-write):
  App -> DB.write(key, value)
  App -> Cache.delete(key)          // next read is a guaranteed miss -> repopulate from DB

Write path (write-through, update-on-write):
  App -> Cache.set(key, value)
           Cache -> DB.write(key, value)   // synchronous
```

Deleting is preferred over updating the cache in place for the same reason covered in `caching-strategies.md`: a slow write can race a fast one and leave a *newer-looking but actually stale* value sitting in the cache. Delete-then-lazily-reload collapses that race into "worst case, one extra DB read," which is far easier to reason about than "worst case, permanently wrong data until the next unrelated write."

Write-behind (write-back) complicates this further: because the DB write is deferred and batched, any *other* cache node that isn't the one holding the buffered write can serve genuinely stale data until the flush happens — which is why write-behind systems usually funnel all reads through the same cache tier rather than allowing reads to bypass it.

## Event-driven invalidation (pub/sub fan-out)

Once you have more than one cache node — or a cache tier plus per-instance local caches — a single `Cache.delete(key)` call against one node doesn't invalidate the others. Event-driven invalidation solves this by publishing an invalidation event that every interested node subscribes to.

```
        Write happens
              |
              v
      App publishes: INVALIDATE product:42
              |
     +--------+--------+--------+
     v                 v        v
 Cache node A     Cache node B  Local in-process
 deletes key      deletes key   caches (via Redis
                                 Keyspace Notifications
                                 or a Kafka topic) also
                                 evict on receipt
```

- **Redis Keyspace Notifications** publish a pub/sub message on every key expiry/delete/set, which other services can subscribe to and react to (e.g., evict a local L1 cache when the shared L2 Redis entry changes).
- **Kafka/SNS-SQS fan-out** is the pattern for invalidating caches across many service instances or even across services: a "product updated" event is published once, and every consumer (each holding its own local cache) evicts the relevant key independently. This is the same fan-out shape as `event-driven-architecture.md` — invalidation is just one more event type flowing through the bus.
- **CDN purge APIs** (Cloudflare, Fastly, CloudFront) are the same idea at a different layer: a purge request is a targeted invalidation event pushed to every edge PoP holding a copy, discussed further in `cdn-architecture.md`.

The trade-off is latency and reliability: fan-out isn't instantaneous, and if a node misses the event (network blip, was down, restarted mid-flight) it needs a fallback — which is exactly why event-driven invalidation is almost never the *only* line of defense; it's paired with a TTL backstop so a missed event self-heals within a bounded window instead of staying wrong forever.

## Cache stampede / dogpile problem

When a single hot key expires (or is invalidated), every concurrent request that was reading it misses at the same instant and falls through to the database simultaneously — a "stampede" that can take down the DB even though the cache was doing its job a millisecond earlier.

```
Key "homepage:trending" expires at T
   |
   +-- Request 1 misses -> queries DB  \
   +-- Request 2 misses -> queries DB   |  1000s of identical
   +-- Request 3 misses -> queries DB   |  queries hit DB
   +-- ...                              |  at the same instant
   +-- Request N misses -> queries DB  /
```

**Request coalescing / single-flight locking**: the first request to miss acquires a short-lived lock (`SET lock:key NX PX 5000` in Redis) and is the only one allowed to query the DB and repopulate the cache; every other concurrent request either waits briefly and retries the cache read, or is served the (slightly) stale value while the winner refills it.

```python
def get_with_coalescing(key):
    val = cache.get(key)
    if val is not None:
        return val
    if cache.set(f"lock:{key}", 1, nx=True, px=5000):
        try:
            val = db.query(key)
            cache.set(key, val, ex=60)
            return val
        finally:
            cache.delete(f"lock:{key}")
    else:
        time.sleep(0.05)
        return get_with_coalescing(key)   # retry, likely a hit now
```

**Probabilistic early expiration** (used by Facebook's Memcached-fronting layer, described as "XFetch"): instead of a hard expiry, each read has a small, increasing probability of proactively recomputing the value *before* it actually expires, with the probability scaled by how expensive the recompute is and how close to expiry the entry is. This spreads the refresh load across many earlier reads instead of concentrating it in the instant of expiry.

```
score = (now - last_delta * beta * ln(random()))
if score >= expiry_time:
    recompute early, even though not technically expired yet
```

**Jittered TTLs**: instead of every related key sharing the exact same TTL (all set at cache-warm time with `EX 300`), add random jitter (`EX 300 + random(-30, 30)`) so thousands of keys don't expire in the same second — this is the cheapest mitigation and is often applied even when other techniques are also in place.

## Versioned / keyed invalidation

Instead of actively deleting or updating a key when data changes, bake a version identifier into the cache key itself, so old versions simply become unreferenced and expire naturally (or get evicted under memory pressure) rather than requiring an active invalidation step at all.

```
Naive key:      product:42
Versioned key:  product:42:v17

On update:
  bump version counter for product 42 (e.g. in DB or a Redis INCR: product:42:version)
  new reads compute key as product:42:v18 and miss -> repopulate
  old key product:42:v17 is never explicitly deleted — it just ages out via TTL/LRU
```

This pattern generalizes to whole-dataset cache busting: static asset URLs fingerprinted with a content hash (`app.a3f9c1.js`) are the same idea applied to CDN caching — instead of purging `app.js` everywhere, you simply ship a new URL, and browsers/CDNs that never saw the new filename can't possibly serve a stale copy. It trades a small amount of wasted cache space (orphaned old versions sitting around until eviction) for eliminating the entire class of "did the invalidation actually reach every node" reliability problem.

- Pros: no fan-out messaging needed, no risk of a missed invalidation event leaving a stale copy indefinitely; works well across CDNs/browsers you don't control directly.
- Cons: requires threading a version/hash through every reader and writer consistently; doesn't reclaim memory/storage immediately (old versions linger until TTL/eviction), and a version-lookup itself (e.g., `product:42:version`) can become a hot key that needs its own caching story.

## Trade-offs summary

| Strategy | Staleness bound | Coordination needed | Failure mode if it breaks |
|---|---|---|---|
| TTL expiry | Up to full TTL | None | Silent staleness within TTL window (safe, bounded) |
| Explicit invalidation on write | Near-zero (single node) | Write path must call cache | Stale forever if the delete/update call is lost |
| Event-driven (pub/sub) fan-out | Small (network + processing delay) | Message bus + subscribers on every node | A node that misses the event stays stale until TTL backstop |
| Stampede mitigation (locking/XFetch/jitter) | N/A (protects DB, not correctness) | Lock coordination or probabilistic logic | Without it: DB overload at the instant of expiry |
| Versioned keys | Zero (old key is simply never read again) | Version counter must be bumped and threaded through reads | Stale reads only if a reader caches the old version number itself |

## Common interview follow-ups

**Q: Why is cache invalidation considered one of the "two hard things" in CS?**
Because it isn't a local problem — the cache and the source of truth are separate copies of state that can be mutated independently, and any strategy that keeps them in sync has to answer what happens when the invalidation signal itself is delayed, duplicated, or lost, which is the same class of problem as consensus and distributed replication generally.

**Q: How do you invalidate a cache that's replicated across many regions?**
The same event-driven fan-out pattern, but you also have to account for cross-region replication lag on the invalidation event itself — most CDNs solve this by treating purge as an eventually-consistent operation with a published SLA (seconds to tens of seconds) rather than promising instant global consistency; see `cdn-architecture.md` for the purge-latency trade-off in detail.

**Q: What's the difference between a stampede and normal cache misses?**
Normal misses are spread out over time and the DB is sized to handle the steady-state miss rate; a stampede is many misses for the *same key* arriving within milliseconds of each other because they were all waiting on the same expiry event, which multiplies load on one DB row/query far beyond what capacity planning assumed.

**Q: Why prefer versioned keys over active invalidation for CDN-cached static assets?**
Because you don't control every intermediate cache (browser, corporate proxy, ISP cache, CDN edge) and can't guarantee a purge reaches all of them quickly; a new filename guarantees correctness by construction; no cache anywhere can serve a version-17 asset under a version-18 URL because that URL was never associated with the old content.

**Q: Can you combine versioned keys with a TTL?**
Yes, and it's common — the version bump gives you correctness (new readers never see stale data), while a modest TTL on the old versioned keys reclaims cache memory instead of relying purely on LRU/LFU eviction pressure to eventually clear them out.

**Q: What would you do if invalidation events could arrive out of order?**
Attach a monotonic version or timestamp to each event and have consumers ignore any invalidation older than the last one they've already applied, otherwise a late-arriving stale "invalidate to v3" event could clobber a newer v5 state — this is the same last-write-wins reasoning used in AP systems, covered in `../03-consistency-distributed/cap-theorem.md`.

## Related topics
- [Caching Strategies](caching-strategies.md)
- [Cache Eviction Policies](cache-eviction-policies.md)
- [CDN Architecture](cdn-architecture.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
