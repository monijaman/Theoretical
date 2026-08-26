# Cache Eviction Policies
[← Back to index](../readme.md)

---

# What Are Cache Eviction Policies?

A cache has **limited memory**, while the underlying database or storage is effectively unlimited.

When the cache becomes full and a new item needs to be stored, **something must be removed**. The rule that decides which item gets removed is called the **cache eviction policy**.

Choosing the wrong policy can dramatically reduce cache efficiency, causing frequent cache misses and unnecessary database queries.

> **Interview takeaway:** There is no universally "best" eviction policy. The right choice depends entirely on the application's access pattern.

---

# Why It Matters

A good eviction policy helps you:

- Increase cache hit rate
- Reduce database load
- Improve application latency
- Prevent cache pollution
- Make better use of limited memory

Poor eviction can actually make performance worse than having no cache at all because you're paying the cost of caching without getting the benefit.

---

# 1. LRU (Least Recently Used)

## Idea

Remove the item that **hasn't been accessed for the longest time**.

The assumption is:

> If something hasn't been used recently, it's less likely to be used again soon.

---

## Example

```
MRU                                    LRU

[D] ⇄ [C] ⇄ [A] ⇄ [B]

Next eviction → B
```

After accessing **A**:

```
[A] ⇄ [D] ⇄ [C] ⇄ [B]

Next eviction → B
```

The most recently accessed item always moves to the front.

---

## Typical Implementation

LRU is usually implemented using:

- Hash Map → O(1) lookup
- Doubly Linked List → O(1) insert/remove

This gives:

| Operation | Time |
|-----------|------|
| Get | O(1) |
| Put | O(1) |
| Evict | O(1) |

---

## Python Example

```python
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.cache = OrderedDict()

    def get(self, key):
        if key not in self.cache:
            return None

        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)

        self.cache[key] = value

        if len(self.cache) > self.cap:
            self.cache.popitem(last=False)
```

---

## Best For

- Session cache
- User profiles
- Shopping carts
- Recently viewed products
- Recently opened documents

These workloads exhibit **temporal locality**.

---

## Weakness

Large sequential scans can destroy cache quality.

Example:

A batch job reads 5 million rows once.

Every row becomes "recent," pushing truly hot items out of the cache.

This is called:

> **Cache Pollution**

---

# 2. LFU (Least Frequently Used)

## Idea

Remove the item that has been accessed the **fewest number of times**.

Instead of asking:

> "When was it used?"

LFU asks:

> "How often is it used?"

---

## Example

| Item | Access Count |
|------|-------------:|
| A | 100 |
| B | 65 |
| C | 8 |
| D | 1 |

If space is needed:

```
Evict D
```

---

## Implementation

A typical LFU implementation stores:

- Hash Map (key → frequency)
- Frequency buckets
- Ordered set inside each bucket

This allows O(1) operations.

---

## Best For

Stable popularity patterns such as:

- Trending products
- Celebrity pages
- Frequently requested API responses
- Popular blog posts

---

## Weakness

New items start with frequency = 1.

They may be evicted before having enough time to become popular.

This is called the:

> **Cache Warm-up Problem**

Another issue:

Old popular items can stay forever even after nobody accesses them.

---

## Redis Solution

Redis gradually decreases frequency counters using:

```
lfu-decay-time
```

Old popularity slowly fades, allowing newer hot items to replace them.

---

# 3. FIFO (First In, First Out)

## Idea

Evict the item that entered the cache first.

Access history is ignored completely.

---

## Example

Insertion order:

```
A
B
C
D
```

Cache becomes full.

Next insertion:

```
Evict A
```

Even if A is accessed thousands of times.

---

## Implementation

Simple queue.

Very low overhead.

---

## Best For

- Circular buffers
- Log rotation
- Streaming systems
- Fixed-size queues

---

## Weakness

Doesn't consider:

- Recency
- Frequency

Therefore, it's rarely used as the primary cache policy.

---

# 4. ARC (Adaptive Replacement Cache)

## Idea

ARC automatically balances between:

- Recent items
- Frequently used items

Unlike LRU or LFU, it adapts to workload changes.

---

## Structure

```
Recent Cache (T1)

↓

Frequently Used Cache (T2)

↓

Ghost Lists

B1
B2
```

The ghost lists don't store data.

They only remember which keys were recently evicted.

Using ghost hits, ARC automatically adjusts how much memory should be dedicated to recency versus frequency.

---

## Why It's Good

Works well when workloads change.

Example:

Morning:

- Many repeated requests

Afternoon:

- Large analytics scan

Night:

- Popular products again

ARC adapts automatically without manual tuning.

---

## Downsides

- More complicated
- Four internal lists
- More memory overhead
- Harder to implement

---

## Interesting Fact

ARC was created by IBM.

Because of patent restrictions (now expired), many open-source systems used LRU/LFU instead.

---

# 5. TTL (Time-To-Live)

## Idea

TTL is **not an eviction policy**.

It controls **how long data stays valid**.

---

Example:

```
SET session:123 "..." EX 1800
```

The key expires after:

```
1800 seconds
```

Whether or not the cache is full.

---

## Lazy Expiration

Expired keys are removed only when accessed.

```
Read key

↓

Expired?

↓

Delete it
```

Simple but expired data may remain unused.

---

## Active Expiration

A background task periodically removes expired keys.

Redis samples keys with TTL several times per second and deletes expired ones.

This prevents unlimited buildup of expired entries.

---

## Best For

- Login sessions
- Authentication tokens
- OTPs
- Rate limiting
- Price caches
- API responses

TTL guarantees bounded staleness.

---

# Redis Eviction Policies

When Redis reaches:

```
maxmemory
```

it applies the configured eviction policy.

| Policy | Description |
|---------|-------------|
| `noeviction` | Reject new writes once memory is full |
| `allkeys-lru` | Evict least recently used key |
| `allkeys-lfu` | Evict least frequently used key |
| `allkeys-random` | Evict a random key |
| `volatile-lru` | LRU among keys with TTL only |
| `volatile-lfu` | LFU among keys with TTL only |
| `volatile-random` | Random key with TTL |
| `volatile-ttl` | Evict key closest to expiration |

---

## allkeys vs volatile

### allkeys

Every key is eligible for eviction.

```
A
B
C
D

Any key may be removed.
```

---

### volatile

Only keys with TTL can be evicted.

```
Config
(User Data)
↓

Never Evicted

Session Cache
↓

Can Be Evicted
```

Useful when permanent configuration and temporary cache share the same Redis instance.

---

# Approximate LRU in Redis

Redis does **not** maintain a perfect LRU linked list.

Instead, it:

1. Randomly samples a few keys (default = 5)
2. Chooses the oldest among those samples
3. Evicts it

This greatly reduces memory overhead while providing behavior close to true LRU.

You can increase accuracy using:

```
maxmemory-samples
```

Higher values improve eviction quality but use more CPU.

---

# Comparison

| Policy | Tracks | Best For | Weakness |
|---------|--------|----------|----------|
| LRU | Recency | Session data, recent activity | Sequential scans can pollute cache |
| LFU | Frequency | Popular content | Slow to adapt to changing popularity |
| FIFO | Insertion order | Queues, buffers | Ignores actual usage |
| ARC | Recency + Frequency | Mixed workloads | Complex implementation |
| TTL | Time | Data freshness | Doesn't manage memory alone |

---

# Which One Should You Choose?

| Scenario | Recommended Policy |
|----------|--------------------|
| User sessions | LRU |
| Shopping cart | LRU |
| Product catalog | LFU |
| Trending pages | LFU |
| Streaming buffer | FIFO |
| Mixed workload | ARC |
| Authentication tokens | TTL + LRU |
| Rate limiting | TTL |
| API response cache | TTL + LRU |

---

# Common Interview Questions

## Why can LRU perform worse than random eviction?

A large sequential scan marks every item as recently used.

This pushes genuinely hot data out of the cache.

Random eviction is unaffected because it ignores recency.

This problem is known as:

> **Cache Pollution**

---

## How does Redis implement LRU efficiently?

Instead of maintaining an exact global LRU list, Redis:

- Samples a small number of random keys
- Picks the least recently used among the sample
- Evicts that key

This provides near-LRU behavior with much lower memory overhead.

---

## When should you choose LFU over LRU?

Choose LFU when data popularity is stable.

Examples:

- Product pages
- Celebrity profiles
- Frequently requested APIs

LFU preserves consistently popular items even if they haven't been accessed very recently.

---

## What is the risk of `noeviction`?

Once Redis reaches `maxmemory`, write operations begin failing with:

```
OOM command not allowed
```

If applications don't handle these failures properly, it can cause cascading production errors.

---

## How do TTL and eviction work together?

They solve different problems.

**TTL**

Removes data because it has become stale.

**Eviction Policy**

Removes data because memory is full.

A key can be evicted long before its TTL expires if the cache needs space.

---

# Key Takeaways

- **LRU** → Keeps recently used items.
- **LFU** → Keeps frequently used items.
- **FIFO** → Removes the oldest inserted item.
- **ARC** → Automatically balances recency and frequency.
- **TTL** → Controls data freshness, not memory management.
- Redis combines TTL with an eviction policy to manage both staleness and memory efficiently.
```

## Related topics
- [Caching Strategies](caching-strategies.md)
- [Cache Invalidation](cache-invalidation.md)
- [CDN Architecture](cdn-architecture.md)
- [Database Indexing](../02-data-storage/database-indexing.md)
- [Rate Limiting](../01-scaling-traffic/rate-limiting.md)
