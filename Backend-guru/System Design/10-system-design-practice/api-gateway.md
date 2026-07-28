# Design an API Gateway
[← Back to index](../readme.md)

## 1. Requirements

### Functional

- Route incoming requests to the correct backend microservice based on path, host, or headers.
- Authenticate and authorize requests at the edge (API keys, JWT validation) before they reach backend services.
- Enforce per-client rate limits and quotas.
- Transform requests and responses (header injection, path rewriting, protocol translation such as REST ↔ gRPC).
- Detect unhealthy backends and stop routing traffic to them (circuit breaking).
- Support pluggable middleware (logging, validation, custom business logic) without modifying the core gateway.

### Non-functional

- Add minimal latency (single-digit milliseconds p99).
- Never become a single point of failure.
- Horizontally scalable and stateless.
- Highly available.
- Configuration changes should propagate without downtime or redeployment.

### Assumptions

- 200 backend microservices.
- 500,000 requests/sec peak.
- Public APIs use API keys.
- Internal services primarily use JWT or mTLS.

---

## 2. Capacity Estimation

### Traffic

- Peak: **500,000 requests/sec**
- Target gateway overhead: **≤5 ms p99**
- One gateway handles roughly **10,000 requests/sec**

```
500,000 / 10,000 ≈ 50 gateway instances
```

Deploy behind a load balancer with autoscaling.

### Rate-limit storage

Assume:

- 100,000 API clients
- ~100 bytes per counter

```
100,000 × 100B ≈ 10MB
```

Tiny in size, but shared across every gateway.

Use **Redis**.

### JWT validation

JWT verification is CPU work.

- Public keys cached locally
- No network call during request processing
- Refresh JWKS periodically

### Routing table

```
200 services
× 5 routes each
≈ 1,000 routes
```

Entire routing table easily fits in memory.

---

# 3. High-Level Architecture

```text
                 Clients
                    │
                    ▼
           ┌────────────────┐
           │ Load Balancer   │
           └───────┬─────────┘
                   ▼
      ┌──────────────────────────────┐
      │ Gateway Instance (×50)       │
      │                              │
      │ Authentication               │
      │        │                     │
      │ Rate Limiting (Redis)        │
      │        │                     │
      │ Routing Lookup               │
      │        │                     │
      │ Circuit Breaker              │
      │        │                     │
      │ Transform / Plugins          │
      └─────────────┬────────────────┘
                    ▼
      ┌──────────────────────────────┐
      │ Backend Microservices         │
      │ Orders │ Users │ Catalog ... │
      └──────────────────────────────┘

Control Plane
─────────────
Configuration Store
        │
        ▼
Push route updates to all gateways
```

### Request Flow

1. Request arrives.
2. Authenticate client.
3. Check authorization.
4. Enforce rate limit.
5. Match route.
6. Check circuit breaker.
7. Apply transformations/plugins.
8. Forward to backend.
9. Transform response.
10. Return to client.

---

# 4. API Design

## Create Route

```http
POST /admin/routes
```

```json
{
  "path_prefix": "/api/v1/orders",
  "backend": "order-service",
  "auth": "jwt",
  "rate_limit": {
    "tier": "standard",
    "requests_per_minute": 600
  },
  "circuit_breaker": {
    "error_threshold_pct": 50,
    "window_seconds": 30
  }
}
```

Response

```json
{
  "route_id": "rt_4471"
}
```

---

## Backend Health

```http
GET /admin/routes/{id}/health
```

```json
{
  "backend":"order-service",
  "circuit_state":"closed",
  "healthy_instances":12
}
```

---

## Client Request

```http
GET /api/v1/orders/123

Authorization: Bearer <JWT>
```

Gateway:

- validates JWT
- checks quota
- routes request
- returns backend response

---

# 5. Data Model

## Routes

```text
route_id
path_prefix
backend_service
auth_type
rate_limit_tier
transform_rules
```

---

## Rate Limit Counters

```text
client_id
window_bucket
request_count
TTL
```

---

## Circuit Breakers

```text
backend
state
failure_count
opened_at
```

---

## API Keys

```text
key_hash
client_id
scopes
created_at
revoked_at
```

### Storage Choices

| Data | Storage |
|-------|----------|
| Routes | etcd / Consul / SQL |
| Rate limits | Redis |
| API keys | SQL or KV |
| Circuit breaker | In-memory |

---

# 6. Deep Dive

## 6.1 Authentication

Perform authentication once at the gateway.

### JWT

- Verify locally.
- Cache JWKS keys.
- Validate:
  - issuer
  - audience
  - expiration

No network call.

### API Keys

Lookup:

```
API Key
      ↓
Cache
      ↓
Database (cache miss only)
```

After authentication the gateway injects trusted headers.

Example

```
X-Authenticated-User
X-Client-ID
X-Request-ID
```

Backends trust the gateway.

---

## 6.2 Rate Limiting

All gateways share one counter.

```
Gateway
    │
Redis
    │
Atomic INCR
```

Algorithms:

- Token Bucket
- Sliding Window
- Fixed Window

Redis Lua scripts provide atomic updates.

Reject excess traffic with

```
HTTP 429
```

---

## 6.3 Request Transformation

Examples

```
External

/api/orders

↓

Internal

/internal/order-service/v3/orders
```

Header injection

```
X-Request-ID
Trace-ID
User-ID
```

Protocol translation

```
REST
    ↓
gRPC

or

gRPC
    ↓
REST
```

---

## 6.4 Circuit Breaker

Without one:

```
Backend failing

↓

Gateway keeps retrying

↓

Connection pool exhausted

↓

Entire platform slows
```

With one:

```text
Closed
   │
errors exceed threshold
   ▼
Open
   │
cooldown expires
   ▼
Half Open
   │
success?
   ├── Yes → Closed
   └── No  → Open
```

Open circuit returns

```
503 Service Unavailable
```

immediately instead of waiting for timeouts.

---

## 6.5 Plugin Pipeline

```text
Incoming Request

↓

Logging

↓

Authentication

↓

Validation

↓

Rate Limiting

↓

Custom Plugin

↓

Routing

↓

Backend
```

Advantages

- Easy extension
- No gateway recompilation
- Route-specific plugins

Potential issues

- Plugin ordering
- Latency accumulation

---

# 7. Scaling & Bottlenecks

### 10× traffic

```
5 million requests/sec
```

Simply add gateway instances.

Redis should be sharded.

---

### JWT refresh storm

Avoid every gateway refreshing JWKS simultaneously.

Add randomized refresh intervals.

---

### Circuit breaker tuning

Prevent temporary deployment spikes from opening breakers too aggressively.

---

### Route explosion

Use

- radix tree
- trie

instead of linear scans.

---

### Plugin latency

Monitor every plugin.

Set hard latency budgets.

---

# 8. Trade-offs

| Decision | Benefits | Drawbacks |
|-----------|----------|-----------|
| Edge authentication | Centralized security | Gateway becomes critical component |
| Local JWT verification | Very fast | JWT revocation delayed until expiration |
| Redis rate limiting | Cluster-wide enforcement | Redis becomes dependency |
| Per-instance circuit breakers | No shared dependency | Instances disagree briefly |
| Shared circuit breakers | Faster convergence | Requires highly available shared state |
| Plugin architecture | Extensible | Added latency and complexity |

---

# Common Interview Questions

### Why authenticate at the gateway?

Every backend no longer needs to duplicate authentication logic.

One place to:

- validate tokens
- enforce policies
- reject bad traffic

---

### Why cache JWT public keys?

Fetching the JWKS endpoint for every request would overwhelm the identity provider and dramatically increase latency.

---

### Why not keep rate limits in memory?

With 50 gateway instances, a client could exceed its quota by distributing requests across different instances.

Shared Redis guarantees global enforcement.

---

### Why use circuit breakers?

Fast failures are better than slow failures.

A dead backend should not consume gateway threads, connections, or retries.

---

### Why should the gateway remain stateless?

Any gateway instance can process any request.

Benefits:

- simple autoscaling
- rolling deployments
- high availability
- no session affinity

---

### Why use plugins instead of hardcoded features?

Cross-cutting functionality changes frequently.

A plugin system allows new capabilities without modifying or redeploying the gateway core.

## Related topics
- [Rate Limiting](../01-scaling-traffic/rate-limiting.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
- [Reverse Proxy & API Gateway](../01-scaling-traffic/reverse-proxy-api-gateway.md)
- [Load Balancing](../01-scaling-traffic/load-balancing.md)
- [REST vs GraphQL vs gRPC](../06-communication-protocols/rest-vs-graphql-vs-grpc.md)
- [Microservices Architecture](../07-architecture-patterns/microservices-architecture.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
