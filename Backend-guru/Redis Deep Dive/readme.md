# Redis: Caching and Coordination

Learn how Redis can support caching, rate limiting, and real-time updates. For every pattern, consider what happens when data expires, Redis is unavailable, or two requests arrive together.

## Start Here

**Before you begin:** A database-backed API and asynchronous JavaScript.

Read the explanation before each code example, then follow the data through the normal path and one failure case. The snippets teach individual concepts; application helpers, package setup, credentials, and deployment configuration are not all included.

## Contents

- [Quick Start: Real-World Analogies](#quick-start-real-world-analogies)
- [Core Redis Patterns & Implementation](#core-redis-patterns--implementation)
- [Illustrative Performance Example](#illustrative-performance-example)
- [Avoiding Cache Pitfalls](#avoiding-cache-pitfalls)
- [Career Impact](#career-impact)
- [Essential Redis Commands Cheatsheet](#essential-redis-commands-cheatsheet)
- [Practice Check](#practice-check)

## Key Terms

| Term | Meaning |
| --- | --- |
| Cache hit | requested data is found in the cache. |
| Cache miss | the application must fetch the data elsewhere. |
| TTL | time to live; how long a key remains before expiry. |
| Eviction | removing keys to make room under a memory policy. |


## Quick Start: Real-World Analogies

Understand Redis with these simple analogies:

- **Cache (Redis):** Like keeping frequently-used books on your desk instead of in the library. Check desk first (fast), only go to library if not found (slow). But desk has limited space, so remove old books when full. (In-memory storage, fast but limited)

- **Cache-Aside Pattern:** Like asking a librarian "Is this book on your desk? If not, get it and add it to your desk for next time." (Check cache, fall back to DB, populate cache)

- **TTL (Time To Live):** Like restaurant coupons that expire. Freshly printed = valid. 1 month old = invalid. Remove from circulation. (Cached data expires automatically)

- **Cache Stampede:** Like a Twitter trending topic crushing the database. Million users ask "What's hot?" at same time. If cache expired, DB gets million queries at once (sudden spike). (Concurrent cache misses cause database overload)

- **Rate Limiting:** Like a concert venue with capacity limit. Try to enter, bouncer checks: "Have tickets for this minute?" If no, rejected. Limits prevent overcrowding. (Control request rate to prevent abuse)

- **Distributed Lock:** Like a parking space reservation. One person reserves it (lock acquired), others wait. When person leaves, next person can take it. (Mutual exclusion across multiple processes)

---

## Core Redis Patterns & Implementation

Read each pattern as a data flow: which store is authoritative, what happens on a cache miss, and how concurrent updates or failures are handled.

### 1. **Cache-Aside Pattern** - The most common caching strategy

**What it is:** Check cache first. If miss, fetch from database, then cache for future reads.

**Illustrative calculation:** With a 95% cache hit rate, a 2 ms hit, and a 50 ms miss, average latency is `0.95 × 2 + 0.05 × 50 = 4.4 ms`. This ignores other request work. Measure throughput separately; average query duration alone does not tell you database capacity.

**Implementation:**

```typescript
// ❌ WITHOUT cache (every read hits database)
app.get('/products/:id', async (req, res) => {
  const product = await db.query(
    'SELECT * FROM products WHERE id = ?',
    [req.params.id]
  );
  res.json(product);
});
// Problem: 1000 concurrent users = 1000 database queries

// ✅ WITH cache-aside pattern
app.get('/products/:id', async (req, res) => {
  const id = req.params.id;

  // Step 1: Check cache first
  const cached = await redis.get(`product:${id}`);
  if (cached) {
    return res.json(JSON.parse(cached));  // Return cached
  }

  // Step 2: Cache miss - fetch from database
  const product = await db.query(
    'SELECT * FROM products WHERE id = ?',
    [id]
  );

  // Step 3: Cache for future requests (TTL = 1 hour)
  await redis.setex(
    `product:${id}`,
    3600,  // TTL in seconds
    JSON.stringify(product)
  );

  res.json(product);
});

// Measure hit rate, latency, and database load with your workload.
```

**Choosing TTL:**

```text
TTL Strategy:

Fast-changing data (user balance):
├─ TTL: 1-5 seconds
├─ Why: If outdated by 5 mins, shows wrong balance
├─ Trade-off: More database load

Static data (product catalog):
├─ TTL: 1 hour or longer
├─ Why: Product price doesn't change per hour
├─ Trade-off: Stale price for first hour after update

Very static (categories, features):
├─ TTL: 24 hours or no expiry
├─ Why: Categories don't change
├─ Manual invalidation on update

Real-time data (stock):
├─ TTL: 100ms
├─ Why: Stock changes rapidly, 100ms latency acceptable
├─ With cache: 100 users × 100ms = 10 concurrent DB queries
```

### 2. **Write-Through Caching** - Updating cached data on writes

**What it is:** The write path updates the cache as well as the backing store. Two separate writes are not an atomic transaction; concurrency and partial failure can still leave them inconsistent.

**Use case:** Applications that benefit from updating cached views during writes, with an explicit failure and freshness policy.

```typescript
// ❌ Cache-aside on writes: Inconsistent
app.post('/users/:id/profile', async (req, res) => {
  // Update database
  const updated = await db.update(
    'UPDATE users SET name = ? WHERE id = ?',
    [req.body.name, req.params.id]
  );

  res.json(updated);
  // Problem: Cache still has old data (stale)
  // Users see old profile for 1 hour
});

// Sketch: two independent writes, requiring a partial-failure policy
app.post('/users/:id/profile', async (req, res) => {
  // Update both simultaneously
  const updated = await Promise.all([
    db.update('UPDATE users SET name = ? WHERE id = ?', [req.body.name, req.params.id]),
    redis.set(`user:${req.params.id}`, JSON.stringify(req.body), 'EX', 3600)
  ]);

  res.json(updated[0]);
  // Either write may fail independently; do not assume atomic consistency.
});
```

**Trade-off: Speed vs Consistency**

| Strategy | Write Performance | Consistency | Use Case |
|----------|------------------|-------------|----------|
| Cache-aside | Fast (1 DB write) | Stale up to TTL | Product catalog |
| Write-through | Slow (2 writes: DB + cache) | Always current | User profiles |
| Write-behind | Fast (cache only initially) | Eventually consistent | Logs, analytics |

### 3. **Rate Limiting** - Prevent abuse with sliding windows

A rate limiter bounds work per identity and time window. Fixed windows are simple; sliding windows reduce boundary bursts. The decision and counter update must be atomic when multiple instances share a limit.

**Real-world impact:**

```text
API: 1000 requests/hour limit per user

Without rate limiting:
├─ Attacker: 1M requests per hour
├─ Database: Overwhelmed (DOS attack)
├─ Legitimate users: Experience slowness
└─ Cost: $10K+ in extra infrastructure

With rate limiting (Redis):
├─ Attacker: Request #1001 rejected (429 Too Many Requests)
├─ Response speed: <1ms (from Redis, not DB)
├─ Legitimate users: Unaffected
└─ Cost: Add-on feature, free
```

**Implementation (Token Bucket Algorithm):**

```typescript
// Token Bucket: Users get N tokens per minute.
// Each request costs 1 token.
// If no tokens, request rejected.

async function rateLimit(userId, maxRequests, windowSeconds) {
  const key = `ratelimit:${userId}`;

  // Increment counter
  const current = await redis.incr(key);

  // First request: Set expiry
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  // Check if exceeded
  if (current > maxRequests) {
    const ttl = await redis.ttl(key);
    throw new Error(`Rate limit exceeded. Retry in ${ttl} seconds`);
  }
}

// Usage:
app.get('/api/data', async (req, res) => {
  try {
    // Limit: 100 requests per minute
    await rateLimit(req.user.id, 100, 60);

    const data = await fetchData();
    res.json(data);
  } catch (error) {
    res.status(429).json({
      error: error.message,
      retryAfter: 60
    });
  }
});

// Result: Simple, effective DOS prevention
```

**Advanced: Sliding Window Rate Limit**

The steps below explain the algorithm but are separate Redis calls. Concurrent callers can both pass the count check. Combine the decision and update in an atomic operation before relying on it across instances.

```typescript
// Sliding window: Track exact timestamps of requests
// More accurate, prevents burst exploitation

async function slidingWindowLimit(userId, maxRequests, windowSeconds) {
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  // Remove old requests outside window
  await redis.zremrangebyscore(key, '-inf', windowStart);

  // Count remaining requests in window
  const requestCount = await redis.zcard(key);

  if (requestCount >= maxRequests) {
    throw new Error('Rate limit exceeded');
  }

  // Add current request
  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.expire(key, windowSeconds);
}

// Advantage: Prevents burst (100 requests in 1sec then 100 in 59sec)
// More accurate but slightly more expensive
```

### 4. **Distributed Locks** - Mutual exclusion at scale

A lock with an expiry is a time-limited lease. If work runs past that expiry, another worker may acquire it. Protect correctness at the authoritative datastore too; an expiring Redis key alone is not a payment transaction.

**Real-world problem:**

```text
Two payment processes running simultaneously:
Process 1: Check balance ($1000), transfer $500 → Balance: $500
Process 2: Check balance ($1000), transfer $500 → Balance: $500
Result: A lost update leaves $500 recorded, although two $500 debits should leave $0.

Solution: Acquire lock before critical section
Process 1: Acquire lock → Check balance → Transfer → Release lock
Process 2: Wait for lock → Acquire → Check balance ($500) → Transfer → Balance: $0
```

**Implementation (Redis SETNX):**

The release operation must check ownership and delete atomically. Separate `GET` and `DEL` calls can delete another worker's replacement lock. See [Redis distributed lock guidance](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/).

```typescript
// Simple lock with automatic timeout
async function acquireLock(key, lockId, timeoutSeconds) {
  // SET only if doesn't exist (atomic check-and-set)
  const acquired = await redis.set(
    `lock:${key}`,
    lockId,
    'NX',           // Only if not exists
    'EX',           // With expiry
    timeoutSeconds
  );

  if (!acquired) {
    throw new Error('Could not acquire lock');
  }

  return lockId;
}

async function releaseLock(key, lockId) {
  // Compare ownership and delete in one atomic script (ioredis-style API).
  return redis.eval(`
    if redis.call('get', KEYS[1]) == ARGV[1] then
      return redis.call('del', KEYS[1])
    end
    return 0
  `, 1, `lock:${key}`, lockId);
}

// Usage:
app.post('/transfer', async (req, res) => {
  const lockId = `${req.user.id}-${Date.now()}`;

  try {
    // Acquire lock with 5 second timeout
    await acquireLock(req.user.id, lockId, 5);

    // Critical section
    const balance = await db.getBalance(req.user.id);
    if (balance < req.body.amount) {
      throw new Error('Insufficient funds');
    }

    await db.transfer(req.user.id, req.body.to, req.body.amount);

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    // Always release lock
    await releaseLock(req.user.id, lockId);
  }
});

// Also enforce transaction correctness in the authoritative database.
```

**Redlock: Multi-datacenter locks**

```typescript
// For critical systems, use Redlock (requires majority quorum)
const redis = require('redis');
const Redlock = require('redlock');

// Create clients to multiple Redis instances
const clients = [
  redis.createClient({ host: 'redis1' }),
  redis.createClient({ host: 'redis2' }),
  redis.createClient({ host: 'redis3' })
];

const redlock = new Redlock(clients, {
  driftFactor: 0.01,
  retryCount: 3,
  retryDelay: 200
});

// Usage: Requires majority (2 out of 3) to succeed
const lock = await redlock.lock('payment', 30000);  // 30 second TTL

try {
  // Critical section protected by Redlock
  await processPayment();
} finally {
  await lock.unlock();
}

// Advantage: Survives single Redis instance failure
```

### 5. **Pub/Sub & Real-Time Events** - Broadcast to multiple subscribers

Pub/Sub broadcasts to currently connected subscribers. Redis Pub/Sub uses at-most-once delivery, so disconnected subscribers miss messages. Use a durable history or stream when replay is required. See [Redis Pub/Sub delivery semantics](https://redis.io/docs/latest/develop/pubsub/).

**Real-world use:**

```text
Multiplayer game: Player wins, notify all players instantly
├─ Event: "Player won"
├─ Pub to Redis topic: `game:updates`
├─ Subscribers (other players): Receive instantly
├─ No polling needed (vs HTTP polling with delays)
```

**Implementation:**

```typescript
// Publisher (when something important happens)
app.post('/game/move', async (req, res) => {
  const move = await processMove(req.body);

  // Broadcast to all players in game
  await redis.publish(`game:${gameId}`, JSON.stringify({
    event: 'move',
    player: req.user.id,
    move: move,
    timestamp: Date.now()
  }));

  res.json(move);
});

// Subscribers (WebSocket connections receive updates)
const subscriber = redis.createClient();

subscriber.subscribe(`game:${gameId}`, (message) => {
  const event = JSON.parse(message);

  // Broadcast to all WebSocket clients
  wsServer.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });
});

// Result: Real-time multiplayer, low latency
```

---

## Illustrative Performance Example

### Example: Scaling a Social Media Feed

**Scenario:** 100M users, showing personalized feed

**Before Redis:**

```text
Database: PostgreSQL with 50 replicas
User: Clicks "load feed" → Query 5000 recent posts
Performance:
├─ Database CPU: 95% (saturated)
├─ Latency: 2-5 seconds
├─ Users: Can't load feed (timeouts)
├─ Cost: $500K/month infrastructure
```

**After Redis (Cache-Aside):**

```text
Add Redis cluster:
├─ Cache popular posts (top 1000 posts from day)
├─ Cache personalized feeds (per user, 1 hour TTL)
├─ Cache trending hashtags (5 minute TTL)

Performance improvement:
├─ Hit rate: 92% (most requests hit Redis)
├─ Latency: 50-200ms (10x improvement)
├─ Database load: Reduced 80%
├─ Database CPU: 15% (relaxed)
├─ Cost: $50K/month infrastructure + Redis

ROI:
├─ Cost saved: $450K/month
├─ Business impact: Feed loads instantly → More users
├─ Payback: <1 month
```

---

## Avoiding Cache Pitfalls

Watch cache behavior under failure and concurrent misses, not only on the fast path. Measure hit rate, memory usage, expiry, and database load together.

### Cache Stampede (Thundering Herd)

**Problem:**

```text
Hot item cached with TTL = 1 hour
At 1 hour mark: TTL expires
Million users request simultaneously
All miss cache → All hit database
Database spike → Possible crash
```

**Solutions:**

```typescript
// Solution 1: Probabilistic early expiration
async function getProduct(id) {
  const cached = await redis.get(`product:${id}`);
  if (!cached) return null;

  const ttl = await redis.ttl(`product:${id}`);

  // Regenerate if will expire in < 10% of lifetime
  if (ttl < 360) {  // 360s out of 3600s TTL
    // Async refresh (don't block user)
    refreshCache(`product:${id}`);  // Background
  }

  return cached;  // Return stale while refreshing
}

// Solution 2: Use locks to prevent multiple refreshes
async function getProductWithLock(id) {
  const cached = await redis.get(`product:${id}`);
  if (cached) return cached;

  // Lock to prevent stampede
  const lock = await redis.set(`lock:${id}`, '1', 'NX', 'EX', 5);

  if (!lock) {
    // Wait for lock holder to refresh
    await sleep(100);
    return await redis.get(`product:${id}`);
  }

  try {
    // First one to refresh
    const fresh = await db.getProduct(id);
    await redis.setex(`product:${id}`, 3600, fresh);
    return fresh;
  } finally {
    await redis.del(`lock:${id}`);
  }
}
```

### Memory Issues

**Problem:** Redis stores everything in RAM. Run out of space.

```typescript
// Check memory usage
INFO memory

// Configure eviction policy
maxmemory 4gb
maxmemory-policy allkeys-lru  // Remove least recently used

// Monitor from application
app.get('/health', async (req, res) => {
  const info = await redis.info('memory');
  const used = info.used_memory_human;
  const max = info.maxmemory_human;

  if (used > max * 0.9) {
    logger.warn(`Redis 90% full: ${used}/${max}`);
  }

  res.json({ redis: { used, max } });
});
```

---

## Career Impact

### What Makes You a Redis Expert

```text
Junior: "I used Redis as a cache in one project"
Mid: "I implemented rate limiting and distributed locks"
Senior: "I reduced database load 80% and designed cache architecture for 100M users"
Staff: "I built Redis cluster strategy for company-wide scaling"

That progression = 5-10x impact on system performance
```

### Interview Question: "Design a cache for an e-commerce site"

✅ Perfect answer:

```text
1. Identify what to cache:
   - Product catalog (static, high access)
   - User profiles (medium change, medium access)
   - Shopping carts (frequent change, frequent access)

2. Cache strategy per item:
   - Products: Cache-aside, 1 hour TTL, high priority
   - Profiles: Write-through (must stay consistent)
   - Carts: Cache only (reconstruct from DB if lost)

3. Handle failures:
   - Redis down: Fall back to database (slow but works)
   - Cache stampede: Use probabilistic refresh + locks
   - Memory pressure: Eviction policy (LRU)

4. Monitoring:
   - Hit rate goal: > 80%
   - Latency: < 5ms for cache hits
   - Memory usage: < 80% of max
   - Evictions: < 1% of operations

Result: 10x throughput improvement with cache
```

---

## Essential Redis Commands Cheatsheet

```bash
# Basic
SET key value EX 3600          # Set with 1 hour TTL
GET key                         # Get value
DEL key                         # Delete
INCR counter                    # Increment

# Lists (for queues)
LPUSH queue item                # Push to list
RPOP queue                      # Pop from list

# Sets (for uniqueness)
SADD tags "redis"              # Add to set
SMEMBERS tags                  # Get all members

# Sorted Sets (for leaderboards)
ZADD leaderboard 100 player1    # Add with score
ZREVRANGE leaderboard 0 9       # Top 10

# Pub/Sub
PUBLISH channel message         # Publish
SUBSCRIBE channel               # Subscribe

# Scripting (atomic operations)
EVAL "return redis.call('GET', KEYS[1])" 1 mykey

# Monitoring
INFO                            # All info
INFO memory                     # Memory usage
KEYS *                          # All keys (DANGER in production)
MONITOR                         # Watch all commands
```

---

**Master Redis, master scalability. Caching is the bridge between monolith and microservices.** ⚡
## Practice Check

Cache one read endpoint, define an invalidation policy, and measure hit rate and latency under load. Explain one trade-off and one failure mode before moving on.

[Back to contents](#contents) · [Backend learning guide](../readme.md)
