# Cache Invalidation
[← Back to index](../readme.md)

---

# What is Cache Invalidation?

Caching speeds up reads by storing a copy of data closer to the application.

The challenge is **keeping that cached copy correct** when the original data changes.

This is called **cache invalidation**.

> **Interview takeaway:** Caching is easy. Knowing **when cached data is no longer valid** is the difficult part.

---

# Why It Matters

Imagine this flow:

```text
Database
    │
    ▼
 Cache
    │
    ▼
 User
```

The cache and the database are **two separate copies** of the same data.

If the database changes but the cache doesn't, users receive stale data.

Every invalidation strategy answers one question:

> **How do we make sure the cache stops serving outdated data?**

---

# Common Cache Invalidation Strategies

1. TTL (Time-To-Live)
2. Explicit Invalidation
3. Event-Driven Invalidation
4. Cache Stampede Prevention
5. Versioned Cache Keys

---

# 1. TTL (Time-To-Live)

## Idea

Each cache entry has an expiration time.

After that time passes, the entry is considered invalid.

---

## Example

```redis
SET product:42 "{...}" EX 60
```

The cached product automatically expires after **60 seconds**.

---

## Timeline

```text
Time

0s ---------------------- 60s

Cache Valid

↓

Expires

↓

Next request loads from DB
```

---

## Advantages

- Extremely simple
- No coordination required
- Automatically removes stale data
- Easy to implement

---

## Disadvantages

Even if the product changes after 5 seconds...

```text
Database

Updated

↓

Cache

Still serves old data

↓

Until TTL expires
```

Users may see stale data for up to the full TTL duration.

Choosing the correct TTL is difficult.

- Long TTL → better performance but more stale data
- Short TTL → fresher data but more database traffic

---

## Best Practice

TTL is usually **not used alone**.

Instead:

- Delete cache immediately on writes
- Keep a TTL as a safety net

This ensures stale data eventually disappears even if an invalidation event is missed.

---

# 2. Explicit Invalidation

## Idea

Whenever data changes, immediately remove or update the cache.

Instead of waiting for TTL, the application actively invalidates the cache.

---

## Delete-on-Write (Cache-Aside)

```text
Client

↓

Application

↓

Update Database

↓

Delete Cache

↓

Next Read

↓

Cache Miss

↓

Reload From Database
```

---

## Example

```text
DB.update(product)

↓

Cache.delete(product)
```

The next request reloads fresh data into the cache.

---

## Update-on-Write (Write-Through)

```text
Application

↓

Cache.set()

↓

Database.write()
```

Both cache and database are updated together.

---

## Why Delete is Often Better

Imagine two concurrent updates:

```text
Update A

↓

Update B

↓

Slow network

↓

Cache accidentally ends with older value
```

Updating the cache directly can introduce race conditions.

Deleting the cache avoids this issue.

Worst case:

- One additional database query

Instead of:

- Serving incorrect data.

---

## Advantages

- Very fresh data
- Simple logic
- Works well with cache-aside

---

## Disadvantages

If cache deletion fails,

the stale value remains until TTL expires.

---

# 3. Event-Driven Invalidation

## Problem

One cache server is easy.

Many cache servers are harder.

```text
Client

↓

Load Balancer

↓

Cache A

Cache B

Cache C
```

Deleting a key from Cache A doesn't remove it from B or C.

---

## Solution

Publish an invalidation event.

Every cache server subscribes and removes the key.

---

## Architecture

```text
Database Updated

↓

Publish Event

INVALIDATE product:42

↓

───────────────┬───────────────┬───────────────

Cache A      Cache B      Cache C

Delete       Delete       Delete
```

---

## Technologies

Common implementations include:

- Redis Pub/Sub
- Redis Keyspace Notifications
- Apache Kafka
- Amazon SNS
- Amazon SQS
- RabbitMQ

---

## CDN Example

CDNs use the same idea.

```text
Origin

↓

Purge Request

↓

Cloudflare

↓

Every Edge Server

Deletes Cached File
```

---

## Advantages

- Scales to many cache nodes
- Near real-time invalidation
- Good for distributed systems

---

## Disadvantages

Messages can be:

- Delayed
- Lost
- Delivered late

Therefore event-driven invalidation is almost always combined with TTL.

TTL acts as a backup.

---

# 4. Cache Stampede (Dogpile Problem)

## Problem

Suppose a very popular cache entry expires.

```text
Homepage

↓

1 Million Requests

↓

Cache Entry Expires
```

Now every request misses simultaneously.

---

## Result

```text
Request 1 → Database

Request 2 → Database

Request 3 → Database

...

Request 1000 → Database
```

Thousands of identical queries overload the database.

This is called a:

> **Cache Stampede** (or **Dogpile Effect**)

---

# Solution 1 — Request Coalescing

Only one request is allowed to refresh the cache.

Everyone else waits.

```text
Request 1

Gets Lock

↓

Database Query

↓

Updates Cache

↓

Releases Lock

↓

Other Requests Read Cache
```

---

## Redis Lock

```redis
SET lock:product42 1 NX PX 5000
```

Meaning:

- NX → create only if absent
- PX → automatically expire after 5 seconds

This prevents deadlocks.

---

## Python Example

```python
def get_with_lock(key):
    value = cache.get(key)

    if value:
        return value

    if cache.set(f"lock:{key}", 1, nx=True, px=5000):
        try:
            value = db.query(key)
            cache.set(key, value, ex=60)
            return value
        finally:
            cache.delete(f"lock:{key}")
    else:
        time.sleep(0.05)
        return get_with_lock(key)
```

---

# Solution 2 — Early Refresh

Instead of waiting until expiration,

refresh the cache **slightly before** it expires.

```text
TTL

300 sec

↓

Refresh at

290 sec

↓

Users never experience a massive miss.
```

Facebook popularized this idea (often referred to as **XFetch**).

---

# Solution 3 — Jittered TTL

Suppose every key expires at exactly:

```text
300 seconds
```

Thousands expire together.

Instead:

```text
300 ± Random(30)
```

Some expire at:

- 271
- 288
- 304
- 319

This spreads database load across time.

---

# 5. Versioned Cache Keys

## Idea

Instead of deleting cache entries,

change the cache key.

---

## Example

Without versioning:

```text
product:42
```

With versioning:

```text
product:42:v17
```

After an update:

```text
product:42:v18
```

The application now requests the new key.

The old cache is simply ignored.

---

## Workflow

```text
Update Product

↓

Increase Version

↓

New Cache Key

↓

Cache Miss

↓

Load Fresh Data

↓

Old Cache Eventually Expires
```

---

## Advantages

- No invalidation messages
- No race conditions
- Great for distributed systems
- Excellent for CDNs

---

## Static Assets Example

Instead of:

```text
app.js
```

Use:

```text
app.a3f9c1.js
```

When the application changes:

```text
app.b8d4ff.js
```

Browsers and CDNs automatically fetch the new file.

No purge required.

---

## Disadvantages

Old cache entries remain until:

- TTL expires
- Memory eviction occurs

Extra storage is temporarily consumed.

---

# Strategy Comparison

| Strategy | Freshness | Coordination | Common Failure |
|-----------|-----------|--------------|----------------|
| TTL | Bounded by TTL | None | Temporary stale data |
| Explicit Invalidation | Near immediate | Application must delete/update cache | Delete failure leaves stale data |
| Event-Driven | Near immediate | Message broker required | Missed events leave stale cache until TTL |
| Stampede Prevention | Doesn't affect freshness | Locking or probabilistic refresh | Database overload if not implemented |
| Versioned Keys | Immediate correctness | Version management | Old versions occupy memory |

---

# Which Strategy Should You Use?

| Scenario | Recommended Strategy |
|----------|----------------------|
| User sessions | TTL + Explicit Delete |
| Product catalog | Explicit Delete + TTL |
| Social media feed | Event-Driven + TTL |
| CDN static assets | Versioned Keys |
| Microservices | Event Bus + TTL |
| High-traffic homepage | Request Coalescing + Jittered TTL |
| Frequently updated APIs | Explicit Invalidation |
| Distributed cache cluster | Event-Driven + TTL |

---

# Common Interview Questions

## Why is cache invalidation considered difficult?

Because there are multiple copies of the same data.

Whenever the database changes, every cached copy must eventually become invalid.

In distributed systems, invalidation messages may be delayed, duplicated, or lost.

---

## How do you invalidate caches across multiple servers?

Use an event bus.

Typical choices include:

- Redis Pub/Sub
- Kafka
- SNS/SQS
- RabbitMQ

Each server receives the invalidation event and removes the cached entry.

---

## What is a cache stampede?

Many requests miss the same cache entry simultaneously after it expires.

Instead of one database query,

thousands of identical queries overload the database.

---

## How do you prevent cache stampedes?

Common techniques include:

- Request coalescing (single-flight locking)
- Early refresh
- Jittered TTLs
- Serving stale data while refreshing

---

## Why use versioned keys for static assets?

You don't control every browser, proxy, or CDN cache.

Changing the filename guarantees clients fetch the new version.

Example:

```text
app.v17.js

↓

app.v18.js
```

No cache can accidentally serve the old file under the new URL.

---

## Can versioned keys and TTL be used together?

Yes.

Versioning guarantees correctness.

TTL eventually removes old, unused cache entries to reclaim memory.

---

## What if invalidation events arrive out of order?

Include a version number or timestamp in every event.

Consumers ignore any event older than the latest version they have already processed.

This prevents stale invalidation messages from overwriting newer data.

---

# Key Takeaways

- **TTL** automatically expires cached data after a fixed duration.
- **Explicit invalidation** removes cache immediately after writes.
- **Event-driven invalidation** keeps multiple cache nodes synchronized.
- **Request coalescing, early refresh, and jittered TTLs** prevent cache stampedes.
- **Versioned cache keys** eliminate many invalidation problems by changing the cache key instead of deleting it.
- In production systems, multiple strategies are usually combined—for example, **Explicit Invalidation + TTL**, or **Event-Driven Invalidation + TTL**—to balance performance, correctness, and reliability.

## Related topics
- [Caching Strategies](caching-strategies.md)
- [Cache Eviction Policies](cache-eviction-policies.md)
- [CDN Architecture](cdn-architecture.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
