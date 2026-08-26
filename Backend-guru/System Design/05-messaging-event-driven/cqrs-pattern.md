# Caching Strategies
[← Back to index](../readme.md)

---

# What are Caching Strategies?

Caching strategies define **how data gets into the cache and how it stays synchronized with the database**.

Different applications have different requirements:

- Some read data much more often than they write.
- Some require the latest data immediately.
- Others prioritize speed over absolute consistency.

A caching strategy determines:

- Who loads data into the cache
- Who updates the cache
- What happens on a cache miss
- How writes are handled
- How consistency is maintained

> **Interview takeaway:** "Use a cache" isn't enough. You should know **which caching strategy best fits the application's read/write pattern and consistency requirements.**

---

# Why It Matters

Without caching:

```text
Application

↓

Database

↓

Response
```

Every request hits the database.

With caching:

```text
Application

↓

Cache

↓

Database (only when needed)
```

Benefits include:

- Lower latency
- Reduced database load
- Better scalability
- Lower infrastructure costs

---

# The Five Main Caching Strategies

1. Cache-Aside (Lazy Loading)
2. Read-Through
3. Write-Through
4. Write-Behind (Write-Back)
5. Refresh-Ahead

Each strategy differs mainly in **who manages the cache and when data is loaded or written.**

---

# 1. Cache-Aside (Lazy Loading)

## Idea

The application controls everything.

When reading:

1. Check the cache.
2. If found, return it.
3. Otherwise query the database.
4. Store the result in the cache.
5. Return the data.

---

## Read Flow

```text
Client

↓

Application

↓

Cache

│

├── Cache Hit

│       ↓

│    Return Data

│

└── Cache Miss

        ↓

    Database

        ↓

Store in Cache

        ↓

Return Data
```

---

## Write Flow

```text
Application

↓

Update Database

↓

Delete Cache Entry

↓

Next Read Reloads Cache
```

Notice that we **delete** the cache instead of updating it.

---

## Python Example

```python
def get_user(user_id):
    value = redis.get(f"user:{user_id}")

    if value:
        return deserialize(value)

    value = db.query(
        "SELECT * FROM users WHERE id=%s",
        user_id
    )

    redis.set(
        f"user:{user_id}",
        serialize(value),
        ex=300
    )

    return value


def update_user(user_id, fields):
    db.execute(
        "UPDATE users SET ... WHERE id=%s",
        fields,
        user_id
    )

    redis.delete(f"user:{user_id}")
```

---

## Advantages

- Very simple
- Cache stores only requested data
- Database remains the source of truth
- Cache failure only slows the application—it doesn't stop it

---

## Disadvantages

- First request always misses
- Every service must implement cache-miss logic
- Cold cache causes higher database traffic

---

## Best For

- Redis
- Memcached
- Product catalogs
- User profiles
- Social media applications

This is the **most commonly used caching strategy**.

---

# 2. Read-Through

## Idea

The application only communicates with the cache.

If data is missing, the cache automatically loads it from the database.

The application doesn't know whether the data came from the cache or the database.

---

## Read Flow

```text
Application

↓

Cache

│

├── Hit

│      ↓

│   Return Data

│

└── Miss

        ↓

Cache Loads From Database

        ↓

Store in Cache

        ↓

Return Data
```

---

## Difference from Cache-Aside

### Cache-Aside

```text
Application

↓

Cache

↓

Database
```

Application handles cache misses.

---

### Read-Through

```text
Application

↓

Cache

↓

Database
```

The cache itself handles cache misses.

The application code becomes much cleaner.

---

## Advantages

- Centralized cache logic
- Less duplicated code
- Easier to maintain
- Consistent TTL and serialization

---

## Disadvantages

- Requires cache libraries that support automatic loading
- More tightly coupled to the caching framework

---

## Best For

- Enterprise applications
- Framework-managed caches
- Java applications using LoadingCache or Ehcache

---

# 3. Write-Through

## Idea

Every write updates both the cache and the database.

The cache doesn't acknowledge success until the database write also succeeds.

---

## Write Flow

```text
Application

↓

Cache

↓

Database

↓

Success Returned
```

Everything stays synchronized.

---

## Advantages

- Cache and database remain consistent
- Reads are always fresh
- Simple read path

---

## Disadvantages

Every write must wait for:

- Cache write
- Database write

Write latency becomes higher.

Also, data that is never read still occupies cache memory.

---

## Best For

- Shopping carts
- User sessions
- Authentication data
- Frequently updated user information

---

# 4. Write-Behind (Write-Back)

## Idea

Writes go only to the cache initially.

The cache immediately returns success.

Later, it writes accumulated changes to the database asynchronously.

---

## Write Flow

```text
Application

↓

Cache

↓

Immediate Success

↓

Background Worker

↓

Database
```

---

## Why Use It?

Instead of:

```text
1000 Database Writes
```

The cache may combine them into:

```text
10 Batch Writes
```

This dramatically improves write performance.

---

## Advantages

- Extremely fast writes
- High throughput
- Database receives efficient batch updates

---

## Disadvantages

If the cache crashes before flushing:

```text
Cached Writes

↓

Lost
```

Potential data loss.

To reduce this risk:

- Redis AOF
- Replication
- Persistent storage

are commonly used.

---

## Best For

- Analytics
- Metrics
- View counters
- Logging
- Telemetry

Where losing a few seconds of data is acceptable.

---

# 5. Refresh-Ahead

## Idea

Instead of waiting for expiration,

refresh hot cache entries **before** they expire.

Users never experience a cache miss.

---

## Normal Cache

```text
TTL Ends

↓

Cache Miss

↓

Database

↓

Cache Updated
```

---

## Refresh-Ahead

```text
TTL Almost Finished

↓

Background Refresh

↓

Cache Updated

↓

Users Continue Reading
```

No interruption.

---

## Advantages

- Eliminates cache misses for popular items
- Reduces database spikes
- Great for predictable traffic

---

## Disadvantages

Some entries may be refreshed even if nobody requests them again.

This wastes resources.

It also requires tracking access patterns.

---

## Best For

- Homepages
- Trending products
- Dashboards
- Leaderboards
- Frequently accessed APIs

---

# Where Can You Cache?

Caching usually exists at multiple layers.

```text
User

↓

Browser Cache

↓

CDN

↓

API Gateway

↓

Application Cache

↓

Redis / Memcached

↓

Database Cache

↓

Disk
```

Most large systems use several cache layers simultaneously.

---

# 1. Browser Cache

Examples:

- HTTP Cache
- Local Storage
- Service Workers
- Mobile SQLite

Advantages:

- Zero network latency
- Very fast

Disadvantages:

- Device-specific
- Hard to invalidate remotely

---

# 2. CDN Cache

Stores content near users.

Typical content:

- Images
- CSS
- JavaScript
- Videos
- Cacheable API responses

Benefits:

- Lower latency worldwide
- Reduced server traffic

---

# 3. Application Cache (In-Memory)

Examples:

- Caffeine
- Guava
- Local LRU Cache

Advantages:

- Extremely fast
- No network call

Disadvantages:

- Every application instance has its own cache
- Synchronization becomes harder

---

# 4. Shared Cache

Examples:

- Redis
- Memcached

Advantages:

- Shared across all servers
- Central cache

Disadvantages:

- Requires network access
- Introduces another service to manage

---

# 5. Database Cache

Examples include:

- Buffer Pool
- Query Cache
- Materialized Views
- Read Replicas

These reduce expensive disk operations.

---

# Strategy Comparison

| Strategy | Read Speed | Write Speed | Data Freshness | Complexity |
|-----------|------------|-------------|----------------|------------|
| Cache-Aside | Fast after warm-up | Normal | Good | Low |
| Read-Through | Fast after warm-up | Normal | Good | Medium |
| Write-Through | Very Fast | Slower | Excellent | Medium |
| Write-Behind | Very Fast | Very Fast | Eventual | High |
| Refresh-Ahead | Fastest for hot data | Normal | Excellent | High |

---

# Which Strategy Should You Use?

| Scenario | Recommended Strategy |
|----------|----------------------|
| Product catalog | Cache-Aside |
| User profiles | Cache-Aside |
| Shopping cart | Write-Through |
| Session storage | Write-Through |
| Analytics | Write-Behind |
| View counters | Write-Behind |
| Trending homepage | Refresh-Ahead |
| Expensive reports | Refresh-Ahead |
| Enterprise cache framework | Read-Through |

---

# Common Interview Questions

## Why delete the cache instead of updating it?

Deleting avoids race conditions.

If multiple updates happen simultaneously, directly updating the cache may leave an older value in the cache.

Deleting forces the next request to reload fresh data from the database.

---

## What happens if Redis goes down?

### Cache-Aside

The application falls back to the database.

Performance decreases, but correctness is maintained.

---

### Write-Through

Since writes go through the cache, writes may fail or be blocked if the cache is unavailable.

---

### Write-Behind

Any writes still buffered in the cache may be lost unless the cache uses persistence or replication.

---

## How do you prevent a cache stampede?

Common techniques include:

- Request coalescing (single-flight)
- Refresh-ahead
- Jittered TTLs
- Serving stale data during refresh

---

## When should you use Write-Behind?

Choose it when:

- Write throughput is extremely high
- Small amounts of data loss are acceptable
- Batch writes significantly improve performance

Examples include analytics, metrics, and view counters.

---

## Local Cache vs Redis

### Local Cache

Advantages:

- Fastest possible access
- No network latency

Disadvantages:

- Each server has its own copy
- Harder to keep synchronized

---

### Shared Redis

Advantages:

- One shared cache across all servers
- Easier consistency

Disadvantages:

- Network hop required
- Additional infrastructure

Many production systems combine both:

```text
Application

↓

Local Cache (L1)

↓

Redis (L2)

↓

Database
```

This provides ultra-fast local reads while maintaining a shared cache across multiple application instances.

---

# Key Takeaways

- **Cache-Aside** is the most widely used strategy and gives applications full control over cache population.
- **Read-Through** moves cache-loading logic into the cache layer, simplifying application code.
- **Write-Through** keeps the cache and database synchronized by writing to both before acknowledging success.
- **Write-Behind** prioritizes write performance by buffering writes and flushing them asynchronously, at the cost of potential data loss if not made durable.
- **Refresh-Ahead** refreshes frequently accessed data before it expires, preventing cache misses for hot keys.
- Most real-world systems combine multiple cache layers—browser, CDN, application cache, Redis, and database cache—to maximize performance while balancing consistency and complexity.

## Related topics
- [Event Sourcing](event-sourcing.md)
- [Outbox Pattern](outbox-pattern.md)
- [Event-Driven Architecture](event-driven-architecture.md)
- [Message Queues](message-queues.md)
- [Microservices Architecture](../07-architecture-patterns/microservices-architecture.md)
- [Strong vs. Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
