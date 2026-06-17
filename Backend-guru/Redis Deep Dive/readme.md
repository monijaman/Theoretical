# Redis Deep Dive — Master Caching, Rate Limiting & Distributed Coordination

Integrate Redis strategically to reduce database load, implement bulletproof rate limiting, and enable real-time distributed coordination patterns in high-performance systems. Master caching like a staff engineer.

## ⚡ Quick Start: Real-World Analogies

Understand Redis with these simple analogies:

- **Cache (Redis):** Like keeping frequently-used books on your desk instead of in the library. Check desk first (fast), only go to library if not found (slow). But desk has limited space, so remove old books when full. (In-memory storage, fast but limited)

- **Cache-Aside Pattern:** Like asking a librarian "Is this book on your desk? If not, get it and add it to your desk for next time." (Check cache, fall back to DB, populate cache)

- **TTL (Time To Live):** Like restaurant coupons that expire. Freshly printed = valid. 1 month old = invalid. Remove from circulation. (Cached data expires automatically)

- **Cache Stampede:** Like a Twitter trending topic crushing the database. Million users ask "What's hot?" at same time. If cache expired, DB gets million queries at once (sudden spike). (Concurrent cache misses cause database overload)

- **Rate Limiting:** Like a concert venue with capacity limit. Try to enter, bouncer checks: "Have tickets for this minute?" If no, rejected. Limits prevent overcrowding. (Control request rate to prevent abuse)

- **Distributed Lock:** Like a parking space reservation. One person reserves it (lock acquired), others wait. When person leaves, next person can take it. (Mutual exclusion across multiple processes)

---

## 🚀 Core Redis Patterns & Implementation

### 1. **Cache-Aside Pattern** - The most common caching strategy

**What it is:** Check cache first. If miss, fetch from database, then cache for future reads.

**Real-world impact:**
```
E-commerce site: Product catalog with 1M products

Without cache:
└─ Every product view: Query database (50ms)
   1000 users × 50ms = 50s of DB time per second
   Database maxes out at ~20 requests/sec
   
With cache (Redis):
└─ First view: Cache miss → Query DB (50ms) + cache (5ms)
├─ Second view (same product): Cache hit (2ms)
├─ Hit ratio: ~95% (1 miss per 20 hits)
├─ Effective latency: (1 × 50ms + 19 × 2ms) / 20 = 3.8ms
├─ Database load reduced 90%
└─ Result: Handle 100x more users on same DB

Calculation:
Without cache: 20 requests/sec × 1000ms = 20 users
With cache: 100K hits/sec (all from Redis)
Cost: Redis instance ($100/mo) vs database upgrade ($5000/mo)
```

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

// Result: Same code, 100x throughput improvement
```

**Choosing TTL:**

```
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

### 2. **Write-Through Caching** - Guarantee consistency

**What it is:** Write to cache AND database. Always keep in sync.

**Use case:** Critical data that can't be stale

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

// ✅ Write-through: Consistent
app.post('/users/:id/profile', async (req, res) => {
  // Update both simultaneously
  const updated = await Promise.all([
    db.update('UPDATE users SET name = ? WHERE id = ?', [req.body.name, req.params.id]),
    redis.set(`user:${req.params.id}`, JSON.stringify(req.body), 'EX', 3600)
  ]);
  
  res.json(updated[0]);
  // Result: Cache and database always consistent
});
```

**Trade-off: Speed vs Consistency**

| Strategy | Write Performance | Consistency | Use Case |
|----------|------------------|-------------|----------|
| Cache-aside | Fast (1 DB write) | Stale up to TTL | Product catalog |
| Write-through | Slow (2 writes: DB + cache) | Always current | User profiles |
| Write-behind | Fast (cache only initially) | Eventually consistent | Logs, analytics |

### 3. **Rate Limiting** - Prevent abuse with sliding windows

**Real-world impact:**
```
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

**Real-world problem:**
```
Two payment processes running simultaneously:
Process 1: Check balance ($1000), transfer $500 → Balance: $500
Process 2: Check balance ($1000), transfer $500 → Balance: $500
Result: $1000 disappeared! Balance should be $0

Solution: Acquire lock before critical section
Process 1: Acquire lock → Check balance → Transfer → Release lock
Process 2: Wait for lock → Acquire → Check balance ($500) → Transfer → Balance: $0
```

**Implementation (Redis SETNX):**

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
  // Only release if we own it (prevent releasing others' locks)
  const stored = await redis.get(`lock:${key}`);
  
  if (stored === lockId) {
    await redis.del(`lock:${key}`);
  }
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

// Result: No race conditions, guaranteed consistency
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

**Real-world use:**
```
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

## 📊 Real-World Performance Impact

### Case Study: Scaling a Social Media Feed

**Scenario:** 100M users, showing personalized feed

**Before Redis:**
```
Database: PostgreSQL with 50 replicas
User: Clicks "load feed" → Query 5000 recent posts
Performance:
├─ Database CPU: 95% (saturated)
├─ Latency: 2-5 seconds
├─ Users: Can't load feed (timeouts)
├─ Cost: $500K/month infrastructure
```

**After Redis (Cache-Aside):**
```
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

## 🛡️ Avoiding Cache Pitfalls

### Cache Stampede (Thundering Herd)

**Problem:**
```
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

## 💼 Career Impact

### What Makes You a Redis Expert

```
Junior: "I used Redis as a cache in one project"
Mid: "I implemented rate limiting and distributed locks"
Senior: "I reduced database load 80% and designed cache architecture for 100M users"
Staff: "I built Redis cluster strategy for company-wide scaling"

That progression = 5-10x impact on system performance
```

### Interview Question: "Design a cache for an e-commerce site"

✅ Perfect answer:
```
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

## 🔧 Essential Redis Commands Cheatsheet

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