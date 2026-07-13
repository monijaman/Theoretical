# Cache Eviction Policies
[← Back to index](../readme.md)

## What this is and why it matters

A cache is finite memory in front of effectively infinite data. Once it's full, adding a new entry means something else has to go — the eviction policy decides *what*. Get this wrong and your cache thrashes (constantly evicting things that were about to be reused), which is worse than having no cache at all because you pay the memory/CPU cost of caching without the hit-rate benefit. Interviewers probe this to check you understand access-pattern-dependent trade-offs, not just "LRU is the default."

## LRU — Least Recently Used

Evict the entry that hasn't been accessed for the longest time. Implemented with a hash map (key -> node) plus a doubly linked list ordered by recency; every access moves the node to the front, eviction pops from the back — both O(1).

```
MRU end                                    LRU end
[ D ] <-> [ C ] <-> [ A ] <-> [ B ]  -> evict B next

access(A):
[ A ] <-> [ D ] <-> [ C ] <-> [ B ]
```

```python
class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.od = OrderedDict()

    def get(self, key):
        if key not in self.od:
            return None
        self.od.move_to_end(key)
        return self.od[key]

    def put(self, key, value):
        if key in self.od:
            self.od.move_to_end(key)
        self.od[key] = value
        if len(self.od) > self.cap:
            self.od.popitem(last=False)   # evict least-recently-used
```

- Good fit: temporal locality (a user's recent orders, session data, recently viewed products).
- Weak spot: a single large sequential scan (e.g., a batch job reading every row) can flush the entire cache of genuinely hot data — this is the classic "cache pollution by scan" problem.

## LFU — Least Frequently Used

Evict the entry with the lowest access *count*, not recency. Needs a frequency counter per key plus an efficient way to find the min — typically a hash map of key->count alongside a hash map of count->OrderedSet of keys (O(1) LFU, as used in Redis's approximated LFU).

- Good fit: stable popularity distributions (a "top 100 products" cache, celebrity profiles) where being accessed once recently shouldn't outrank being accessed constantly.
- Weak spot: new items start at frequency 1 and get evicted quickly even if they're about to become hot ("cache warm-up problem" / new-item bias); old popular items can get stuck forever even after they stop being relevant unless counts decay over time.

Redis mitigates the decay problem with `lfu-decay-time`, which periodically halves counters so stale popularity fades.

## FIFO — First In, First Out

Evict whatever was inserted earliest, regardless of access pattern. Simplest to implement (a queue), cheapest in CPU, but ignores usage entirely — a key inserted first and read constantly gets evicted at the same time as one inserted first and never touched again.

- Good fit: rarely used alone in production caches; more relevant for buffer/queue-like structures or where all items have genuinely equal value and a simple TTL-like rotation is enough (e.g., rotating logs, fixed-size ring buffers).

## ARC — Adaptive Replacement Cache

Combines recency and frequency by maintaining two LRU lists — one for items seen once ("recency", T1) and one for items seen more than once ("frequency", T2) — plus two "ghost" lists (B1, B2) that track recently evicted keys without storing their values. The ghost-list hit rate is used to *adaptively* shift the target size between T1 and T2, so the cache tunes itself toward whichever regime (recency-heavy or frequency-heavy) the current workload actually needs.

```
T1 (recent, seen once)  <---- balance shifts based on ghost hits ----> T2 (frequent, seen 2+)
B1 (ghost of evicted T1)                                               B2 (ghost of evicted T2)
```

ARC was developed at IBM and used in ZFS's page cache; it was patented (expired 2015-ish), which is historically why open-source projects like Redis and Memcached shipped LRU/LFU instead of ARC despite ARC's generally superior hit rates in mixed workloads.

- Good fit: workloads that shift between scan-heavy and hot-key-heavy over time, where a fixed LRU or LFU would need manual retuning.
- Cons: more bookkeeping overhead (four lists instead of one/two), more complex to implement and reason about.

## TTL-based Expiration

Orthogonal to the above — TTL isn't a *replacement* policy, it's a *staleness* policy: entries expire after N seconds regardless of memory pressure, and are usually combined with LRU/LFU as the actual eviction mechanism for when memory fills up before TTL expiry.

```
SET session:abc123 "..." EX 1800     # expires in 30 min, whether or not cache is full
```

- Lazy expiration: checked on access (if expired, treat as miss and delete).
- Active expiration: background sweep periodically scans and removes expired keys (Redis samples a random subset of keys with a TTL, ~10 times/sec, and removes expired ones — this bounds average latency impact vs. scanning everything).

TTL is essential wherever correctness requires bounded staleness (auth tokens, price quotes, rate-limit counters) independent of how much memory is free.

## Redis eviction policies (maxmemory-policy)

Redis is the most common interview reference point because it exposes eviction policy as a single config knob, `maxmemory-policy`, applied once `maxmemory` is reached:

| Policy | Behavior |
|---|---|
| `noeviction` | Reject writes with an error once full; reads still work. Default. Safe but can break producers. |
| `allkeys-lru` | Evict least-recently-used key across the whole keyspace. |
| `allkeys-lfu` | Evict least-frequently-used key across the whole keyspace (Redis 4.0+). |
| `allkeys-random` | Evict a random key. Cheap, surprisingly effective for uniform access patterns. |
| `volatile-lru` | LRU, but only among keys that have a TTL set. |
| `volatile-lfu` | LFU, but only among keys that have a TTL set. |
| `volatile-ttl` | Evict the key with the nearest expiry first, among keys with a TTL. |
| `volatile-random` | Random eviction among keys that have a TTL set. |

`volatile-*` policies are used when some keys must never be evicted except by explicit delete (e.g., persistent config data mixed in the same instance as ephemeral session cache) — keys without a TTL are untouchable, so eviction pressure only falls on the volatile subset.

Redis's LRU/LFU are approximated, not exact: it samples a small number of random keys (`maxmemory-samples`, default 5) and evicts the best candidate among the sample rather than tracking a perfect global order, trading a small accuracy loss for O(1) memory overhead per key instead of a full linked-list pointer per entry.

## Trade-off summary

| Policy | Tracks | Best for | Weakness |
|---|---|---|---|
| LRU | Recency | Temporal locality | Scans evict hot data |
| LFU | Frequency | Stable popularity | Slow to adapt to new hot items |
| FIFO | Insertion order | Simplicity, equal-value items | Ignores usage entirely |
| ARC | Recency + frequency, adaptive | Mixed/shifting workloads | Implementation complexity |
| TTL | Absolute time | Bounded staleness requirements | Not memory-aware by itself |

## Common interview follow-ups

**Q: Why might LRU perform worse than random eviction in some workloads?**
A large one-off sequential scan (batch export, full-table backfill) touches every key once, pushing genuinely hot keys out of the MRU position and evicting them — "cache pollution." Pure random eviction is immune to this because it doesn't reward recency of a scan. Some systems (like PostgreSQL's buffer pool) use scan-resistant variants (2Q, clock-sweep with a "recently used" bit) specifically to guard against this.

**Q: How does Redis implement approximate LRU cheaply?**
Instead of a full linked list (which costs two pointers per key), Redis stores a 24-bit access-time field per key and, on eviction, samples a handful of random keys (default 5) and evicts the oldest among that sample. Increasing `maxmemory-samples` trades CPU for closer-to-true-LRU accuracy.

**Q: When would you pick LFU over LRU?**
When popularity is stable and long-tailed — e.g., caching product detail pages where a small set of items are perpetually hot — LFU avoids evicting them just because a burst of one-off requests for cold items temporarily front-ran them in recency order, which is exactly the failure mode LRU has against scans.

**Q: What's the risk of `noeviction` in production Redis?**
Once memory fills, all write commands start failing with `OOM command not allowed`, which can cascade into application errors if the write path isn't defensively coded — worth alerting on `used_memory` approaching `maxmemory` well before this triggers, and pairing with capacity planning rather than relying on eviction to "just handle it."

**Q: How do TTL and eviction policy interact when both are configured?**
They're independent mechanisms: TTL removes a key at (or after) its expiry time regardless of memory pressure; the eviction policy only kicks in when `maxmemory` is hit, and only chooses among eligible keys (all keys, or just those with a TTL, depending on policy). A key can be evicted for memory pressure well before its TTL would have expired it naturally.

## Related topics
- [Caching Strategies](caching-strategies.md)
- [Cache Invalidation](cache-invalidation.md)
- [CDN Architecture](cdn-architecture.md)
- [Database Indexing](../02-data-storage/database-indexing.md)
- [Rate Limiting](../01-scaling-traffic/rate-limiting.md)
