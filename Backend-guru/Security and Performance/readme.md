# Security & Performance — Build Fast, Bulletproof Backends

Security and performance are not features you add at the end — they are architectural decisions made from day one. This module covers the most critical backend attack vectors (mapped to OWASP Top 10), proven mitigation patterns, and the performance engineering techniques used at companies like Netflix, Cloudflare, and Stripe.

---

## ⚡ Quick Analogies

- **Security:** Like building a bank vault. The door lock is not enough — you also need security cameras (logging), guards (rate limiting), visitor logs (audit trails), and a silent alarm (intrusion detection). Every layer adds friction for the attacker.
- **Performance:** Like a restaurant kitchen. The total order time (latency) depends on the slowest station. You optimize by parallelizing prep work, caching frequently-made sauces, and never letting the dishwasher block the chef.

---

# PART 1 — SECURITY

## 1. OWASP Top 10 — Mapped to Node.js

### A01 — Broken Access Control

The #1 vulnerability. A user accesses data or actions they are not authorized for.

```typescript
// ❌ Bad — no ownership check
app.get('/api/orders/:id', authenticate, async (req, res) => {
  const order = await db.findOrder(req.params.id);
  res.json(order);  // Any authenticated user can see any order!
});

// ✅ Good — enforce ownership
app.get('/api/orders/:id', authenticate, async (req, res) => {
  const order = await db.findOrder(req.params.id);
  if (!order) throw new NotFoundError('Order');

  // Ownership check — user can only see their own orders
  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError();
  }
  res.json(order);
});
```

**Rule:** Never trust the client to tell you what they are allowed to see. Always verify on the server, every request.

---

### A02 — Cryptographic Failures (Sensitive Data Exposure)

Never store plaintext secrets, passwords, or PII.

```typescript
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// ❌ Bad — MD5 is broken; SHA256 without salt is rainbow-table vulnerable
const passwordHash = crypto.createHash('md5').update(password).digest('hex');

// ✅ Good — bcrypt with cost factor 12 (adaptive, slow by design)
const BCRYPT_ROUNDS = 12;
async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
```

**Encryption at rest — AES-256-GCM for sensitive fields**

```typescript
const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes, from secret manager

function encrypt(text: string): { iv: string; data: string; tag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  };
}

function decrypt(payload: { iv: string; data: string; tag: string }): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(payload.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.data, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}
```

---

### A03 — Injection (SQL, NoSQL, Command)

Never concatenate user input into queries.

```typescript
// ❌ Bad — SQL injection vulnerability
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;
// Attacker sends: email = "' OR '1'='1" — returns all users

// ✅ Good — parameterized query (pg driver)
const { rows } = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [req.body.email],
);

// ✅ Good — ORM (TypeORM / Prisma) handles this automatically
const user = await prisma.user.findUnique({
  where: { email: req.body.email },
});
```

**NoSQL injection (MongoDB)**

```typescript
// ❌ Bad — operator injection
const user = await User.findOne({ email: req.body.email });
// Attacker sends: { "email": { "$ne": null } } → bypasses auth

// ✅ Good — validate & cast input types before DB calls
import { z } from 'zod';
const schema = z.object({ email: z.string().email() });
const { email } = schema.parse(req.body);   // throws if invalid
const user = await User.findOne({ email }); // safe string value
```

---

### A04 — Insecure Design (Missing Rate Limiting & Brute Force Protection)

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });

// Strict limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }),
  handler: (req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in 15 minutes.' },
    });
  },
});

// General API limit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }),
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
```

---

### A05 — Security Misconfiguration

Security headers via Helmet.js — set them and forget them.

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,        // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Disable X-Powered-By header (hides Express fingerprint)
app.disable('x-powered-by');
```

---

### A07 — Identification and Authentication Failures

JWT best practices:

```typescript
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET  = process.env.JWT_ACCESS_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET!;

// Short-lived access token + long-lived refresh token
function generateTokens(userId: string) {
  const accessToken = jwt.sign(
    { sub: userId, type: 'access' },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '15m', algorithm: 'HS256' },
  );

  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh' },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' },
  );

  return { accessToken, refreshToken };
}

// Verify middleware
function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
    if (payload.type !== 'access') throw new UnauthorizedError();
    req.user = { id: payload.sub! };
    next();
  } catch {
    throw new UnauthorizedError();
  }
}
```

**Never store JWTs in localStorage** — use `HttpOnly` + `Secure` cookies for web apps.

---

### A08 — Software and Data Integrity Failures

Validate ALL external input at system boundaries using Zod:

```typescript
import { z } from 'zod';

const CreateOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
  })).min(1).max(50),
  shippingAddress: z.object({
    street: z.string().min(1).max(200),
    city: z.string().min(1).max(100),
    countryCode: z.string().length(2).toUpperCase(),
  }),
});

// Middleware factory for validating request bodies
function validate<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError(result.error.issues.map(i => i.message).join(', '));
    }
    req.body = result.data;  // use validated + coerced data from here on
    next();
  };
}

app.post('/api/orders', authenticate, validate(CreateOrderSchema), orderController.create);
```

---

### A09 — Security Logging and Monitoring Failures

Every security event must be logged with structured data.

```typescript
// Security events to always log
const SECURITY_EVENTS = {
  LOGIN_SUCCESS:        'auth.login.success',
  LOGIN_FAILURE:        'auth.login.failure',
  TOKEN_REFRESH:        'auth.token.refresh',
  PASSWORD_CHANGE:      'auth.password.change',
  ACCESS_DENIED:        'authz.access.denied',
  RATE_LIMIT_EXCEEDED:  'security.rate_limit',
} as const;

function logSecurityEvent(event: string, context: Record<string, unknown>) {
  logger.warn({
    event,
    timestamp: new Date().toISOString(),
    ...context,
  });
}

// Usage
logSecurityEvent(SECURITY_EVENTS.LOGIN_FAILURE, {
  email: req.body.email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});
```

**What to log:** event type, timestamp, user/IP, resource accessed, outcome.  
**What NOT to log:** passwords, tokens, full credit card numbers, SSNs.

---

## 2. CORS Configuration

```typescript
import cors from 'cors';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS!.split(','); // e.g., ['https://app.example.com']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## 3. Secrets Management

```typescript
// ❌ Bad — secrets in code
const DB_URL = 'postgresql://admin:password123@prod-db:5432/app';

// ✅ Good — secrets from environment (injected by secret manager)
const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error('DATABASE_URL is required');
```

**Secret managers by platform:**
- AWS: Secrets Manager + Parameter Store
- GCP: Secret Manager
- Azure: Key Vault
- Self-hosted: HashiCorp Vault

**Rule:** Rotate secrets on a schedule. Never commit `.env` with real values.

---

# PART 2 — PERFORMANCE

## 4. Caching Strategy

The fastest request is the one you never make to the database.

### Cache-Aside Pattern (Lazy Loading) — most common

```typescript
async function getUserById(userId: string): Promise<User> {
  const cacheKey = `user:${userId}`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as User;

  // 2. Cache miss — fetch from DB
  const user = await db.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  // 3. Store in cache with TTL
  await redis.set(cacheKey, JSON.stringify(user), 'EX', 3600); // 1 hour TTL
  return user;
}

// Invalidate on update
async function updateUser(userId: string, data: UpdateUserInput): Promise<User> {
  const updated = await db.updateUser(userId, data);
  await redis.del(`user:${userId}`);  // invalidate cache
  return updated;
}
```

### Write-Through Pattern — for high read consistency

```typescript
async function updateUserWriteThrough(userId: string, data: UpdateUserInput): Promise<User> {
  const [updated] = await Promise.all([
    db.updateUser(userId, data),
    redis.set(`user:${userId}`, JSON.stringify(data), 'EX', 3600),
  ]);
  return updated;
}
```

### Cache Stampede Prevention — `singleflight` pattern

```typescript
const inFlight = new Map<string, Promise<unknown>>();

async function getWithSingleFlight<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl: number,
): Promise<T> {
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as T;

  // Deduplicate concurrent fetches for same key
  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey) as Promise<T>;
  }

  const fetchPromise = fetchFn().then(data => {
    redis.set(cacheKey, JSON.stringify(data), 'EX', ttl);
    inFlight.delete(cacheKey);
    return data;
  });

  inFlight.set(cacheKey, fetchPromise);
  return fetchPromise;
}
```

---

## 5. Database Performance

### Use indexes for every column in WHERE, JOIN, and ORDER BY

```sql
-- Slow: full table scan
SELECT * FROM orders WHERE user_id = $1 AND status = $2;

-- Fast: composite index
CREATE INDEX CONCURRENTLY idx_orders_user_status
  ON orders (user_id, status);

-- Check if a query uses an index
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = $1 AND status = $2;
```

### N+1 Query Problem — the most common performance bug

```typescript
// ❌ Bad — N+1 queries (1 query for users + N queries for each user's orders)
const users = await db.findAllUsers();
for (const user of users) {
  user.orders = await db.findOrdersByUserId(user.id); // fires for EVERY user!
}

// ✅ Good — 2 queries total, then join in memory
const users = await db.findAllUsers();
const userIds = users.map(u => u.id);
const orders = await db.findOrdersByUserIds(userIds); // one IN query

const ordersByUser = orders.reduce<Record<string, Order[]>>((acc, order) => {
  acc[order.userId] = [...(acc[order.userId] ?? []), order];
  return acc;
}, {});

return users.map(user => ({ ...user, orders: ordersByUser[user.id] ?? [] }));
```

### Use database connection pooling

```typescript
import { Pool } from 'pg';

// Connection pool — never create a new connection per request
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,             // max connections in pool
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

// Use pool.query(), not single Client for request handlers
async function findUser(id: string) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ?? null;
}
```

### Pagination — never return unbounded lists

```typescript
// ❌ Bad — could return millions of rows
const orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [userId]);

// ✅ Good — cursor-based pagination (stable under insertions)
async function getOrders(userId: string, cursor?: string, limit = 20) {
  const query = cursor
    ? 'SELECT * FROM orders WHERE user_id = $1 AND id < $2 ORDER BY id DESC LIMIT $3'
    : 'SELECT * FROM orders WHERE user_id = $1 ORDER BY id DESC LIMIT $2';

  const params = cursor ? [userId, cursor, limit + 1] : [userId, limit + 1];
  const { rows } = await pool.query(query, params);

  const hasNext = rows.length > limit;
  return {
    data: rows.slice(0, limit),
    nextCursor: hasNext ? rows[limit - 1].id : null,
  };
}
```

---

## 6. HTTP Performance

### Compression

```typescript
import compression from 'compression';

// Gzip responses > 1KB (CPU cost is worth it for text payloads)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  threshold: 1024,  // bytes
}));
```

### HTTP Keep-Alive & Connection Reuse

```typescript
import http from 'http';
import { Agent } from 'https';

// When calling external services, reuse TCP connections
const agent = new Agent({
  keepAlive: true,
  maxSockets: 50,
});

const response = await fetch('https://api.stripe.com/charges', {
  agent,    // reuses existing TCP connections
  // ...
});
```

### Response shape discipline — never over-fetch

```typescript
// ❌ Bad — sends the entire user object including sensitive fields
res.json(user);

// ✅ Good — only send what the client needs
res.json({
  id: user.id,
  name: user.name,
  email: user.email,
  // passwordHash, internalNotes, etc. are omitted
});
```

---

## 7. Async & Concurrency

### Non-blocking code — never block the event loop

```typescript
// ❌ Bad — synchronous fs/crypto blocks the event loop for all requests
const file = fs.readFileSync('/data/large-file.csv');
const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');

// ✅ Good — async versions yield control back to the event loop
const file = await fs.promises.readFile('/data/large-file.csv');
const hash = await new Promise<Buffer>((resolve, reject) =>
  crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, key) =>
    err ? reject(err) : resolve(key),
  ),
);
```

### Worker threads for CPU-intensive work

```typescript
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

// main.ts — offload CPU work to a worker
function runWorker(data: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./image-processor.worker.js', { workerData: data });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

// image-processor.worker.ts
if (!isMainThread) {
  const result = heavyCPUImageProcessing(workerData);
  parentPort!.postMessage(result);
}
```

---

## 8. Performance Monitoring & Profiling

### Request duration metrics (Prometheus-style)

```typescript
import { Histogram, register } from 'prom-client';

const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// Middleware
app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    end({
      method: req.method,
      route: req.route?.path ?? req.path,
      status_code: res.statusCode,
    });
  });
  next();
});

// Expose for Prometheus scraping
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});
```

---

## 📊 Security & Performance Quick Reference

| Area              | Key Principle                          | Tool / Pattern                        |
| ----------------- | -------------------------------------- | ------------------------------------- |
| Auth              | Short-lived tokens, rotate secrets     | JWT (15m) + refresh (7d)              |
| Input validation  | Validate at boundaries, never trust input | Zod schemas                        |
| SQL injection     | Parameterized queries only             | pg `$1` params, Prisma ORM            |
| Rate limiting     | Per-IP and per-user limits             | express-rate-limit + Redis            |
| Headers           | Enforce security headers               | Helmet.js                             |
| Passwords         | Slow hash with salt                    | bcrypt (rounds = 12)                  |
| Caching           | Cache-aside with TTL                   | Redis + cache invalidation            |
| DB queries        | Index on WHERE/JOIN columns            | `EXPLAIN ANALYZE`, composite indexes  |
| N+1              | Batch queries, not per-item loops      | `WHERE id IN (...)`, DataLoader       |
| Event loop        | Never block — use async/worker threads | `fs.promises`, Worker threads         |

**Time Commitment:** 3-4 weeks | **Difficulty:** ⭐⭐⭐⭐⭐
