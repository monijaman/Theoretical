# Design an API Gateway
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Route incoming requests to the correct backend microservice based on path/host/header.
- Authenticate and authorize requests at the edge (API keys, JWT validation) before they reach backend services.
- Enforce per-client rate limits and quotas.
- Transform requests/responses (header injection, path rewriting, protocol translation e.g. REST↔gRPC).
- Detect unhealthy backends and stop routing to them (circuit breaking) rather than piling up failed requests.
- Support pluggable middleware (logging, request validation, custom business logic) without modifying core routing.

**Non-functional**
- The gateway sits in front of every request to every backend service — it must add minimal latency overhead (single-digit ms) and must not become a fleet-wide single point of failure.
- Horizontally scalable and stateless (or externalizes state to shared stores) so any instance can handle any request.
- High availability — a gateway outage is effectively a total platform outage.
- Config/routing changes (new service, new route) must propagate without a full redeploy or downtime.

**Assumptions**
- Fronts 200 backend microservices, handles 500,000 requests/sec cluster-wide at peak across all clients.
- A mix of public API clients (external developers, rate-limited by API key) and internal service-to-service traffic (higher trust, different auth model).

## 2. Capacity Estimation

**Traffic**
- 500,000 req/sec peak cluster-wide; assume the gateway fleet must add no more than ~5ms p99 overhead per request — at this rate even a small per-request inefficiency compounds into serious infrastructure cost, so the hot path (routing table lookup, JWT validation, rate-limit check) must be O(1)/in-memory, not a network round-trip per request wherever avoidable.
- Assume each gateway instance handles ~10,000 req/sec sustained → **~50 gateway instances** needed at peak, horizontally scaled behind a load balancer, stateless so any instance can serve any request.

**Rate-limit state**
- Assume 100,000 distinct API clients, each with a sliding-window rate-limit counter. At ~100 bytes/counter (client_id, window buckets) → 10 MB total — trivial in size, but this state must be shared across all 50 gateway instances (a client's limit must be enforced cluster-wide, not per-instance) — this pushes rate-limit counters into a shared, low-latency store (Redis) rather than in-process memory, and that store's latency directly adds to the gateway's per-request critical path (see 6.2 in [rate-limiting.md](../01-scaling-traffic/rate-limiting.md) for the general trade-offs).

**JWT validation cost**
- Signature verification (e.g., RS256) is CPU-bound, roughly sub-millisecond per token on modern hardware, and requires no network call if the gateway caches the issuer's public signing keys locally (refreshed periodically, not fetched per-request) — at 500,000 req/sec this local-verification design is what keeps auth from becoming the bottleneck; a per-request call to a central auth service to validate every token would not survive this load.

**Routing table size**
- 200 services × ~5 routes/service average ≈ 1,000 routes — small enough to hold entirely in memory on every gateway instance, refreshed via a control-plane push (not a per-request database lookup).

## 3. High-Level Architecture

```
┌──────────┐   ┌───────────┐   ┌───────────────────────────────────────────┐
│  Clients   │──▶│    LB      │──▶│              Gateway Instance (×50)          │
└──────────┘   └───────────┘   │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
                                 │  │ AuthN/Z  │▶│RateLimit │▶│ Routing  │▶│Transform ││
                                 │  │ (JWT/key)│ │ (Redis)  │ │ (in-mem  │ │ (headers,││
                                 │  │          │ │          │ │  table)  │ │ rewrite) ││
                                 │  └────────┘ └────────┘ └────────┘ └────────┘│
                                 └─────────────────────┬───────────────────────┘
                                                        ▼
                                        ┌───────────────────────────┐
                                        │  Circuit Breaker per backend │
                                        └─────────────┬─────────────┘
                          ┌──────────────────┬─────────┴──────────┬──────────────────┐
                          ▼                  ▼                    ▼                  ▼
                 ┌────────────────┐ ┌────────────────┐  ┌────────────────┐ ┌────────────────┐
                 │ Order Service     │ │ Catalog Service   │  │ User Service      │ │ ... (200 svcs)   │
                 └────────────────┘ └────────────────┘  └────────────────┘ └────────────────┘

               Control Plane (out-of-band):
               ┌──────────────────────────┐
               │  Config Store (routes,      │──▶ pushed to all gateway instances on change
               │  rate-limit tiers, plugins)   │
               └──────────────────────────┘
```

**Walkthrough**
1. **Request arrives** at a gateway instance (chosen by an upstream load balancer, health/latency-aware).
2. **AuthN/Z**: the gateway validates the request's credential — a JWT (verify signature against locally-cached public keys, check expiry/claims) or an API key (lookup against a fast local/shared cache of key→client mappings) — rejecting unauthenticated/unauthorized requests immediately, before any backend is touched.
3. **Rate limiting**: the client's quota is checked against a shared counter (Redis, see 6.2); requests over quota are rejected with `429` before consuming any backend capacity.
4. **Routing**: the request path/host/header is matched against an in-memory routing table (built from control-plane config, not queried per-request) to determine the target backend service and any needed path rewriting.
5. **Circuit breaking**: before dispatching, the gateway checks the target backend's circuit-breaker state (6.4) — if it's tripped (backend deemed unhealthy), the gateway fails fast with a `503` or serves a fallback rather than adding load to an already-struggling service.
6. **Transform & dispatch**: request/response transformation (header injection, protocol translation) is applied, the request is forwarded to a healthy backend instance, and the response flows back through the same pipeline in reverse (response transformation, metrics/logging).

## 4. API Design

The gateway's own "API" is largely about its control plane (defining routes/policies), since its data-plane behavior is to transparently proxy whatever API each backend exposes:

```
POST /admin/routes
Request:
{
  "path_prefix": "/api/v1/orders",
  "backend": "order-service",
  "auth": "jwt",
  "rate_limit": { "tier": "standard", "requests_per_minute": 600 },
  "circuit_breaker": { "error_threshold_pct": 50, "window_seconds": 30 }
}
Response: 201 { "route_id": "rt_4471" }

GET /admin/routes/{route_id}/health
Response: 200 { "backend": "order-service", "circuit_state": "closed", "healthy_instances": 12 }

# Data-plane example — a client calling through the gateway sees the backend's own API shape:
GET /api/v1/orders/ord_7B31
Headers: Authorization: Bearer eyJhbGciOi...
# Gateway validates JWT, checks rate limit, routes to order-service, forwards response unchanged (or transformed per config).
```

## 5. Data Model & Storage Choice

```
routes (control plane, low write volume, read by every gateway instance)
  route_id PK, path_prefix, backend_service, auth_type, rate_limit_tier, transform_rules(JSON)

rate_limit_counters (shared, high read/write volume, TTL-based)
  client_id + window_bucket → request_count

circuit_breaker_state (per gateway instance OR shared, see 6.4)
  backend_service → { state: closed|open|half_open, failure_count, opened_at }

api_keys
  key_hash PK, client_id, scopes[], created_at, revoked_at
```

Routing configuration is low-volume, read-dominant, and needs to be pushed to every gateway instance — this is a control-plane distribution problem more than a database-scale problem; a small relational store or even a versioned config file distributed via a config-management/service-discovery system (etcd/Consul) works fine, prioritizing fast propagation and strong read consistency across instances over write throughput. Rate-limit counters are the opposite profile — extremely high-frequency read/write, TTL-based, latency-critical on every single request — a clear fit for Redis over any relational store, per [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md) and the general patterns in [rate-limiting.md](../01-scaling-traffic/rate-limiting.md). API keys need fast point lookups by key hash and moderate write volume (key issuance/revocation) — a simple indexed relational table or KV store both work; the important property is that revocation must propagate quickly (short cache TTL on key validation, not "revoked but still valid for an hour").

## 6. Deep Dive

### 6.1 Authentication/authorization at the edge

Terminating auth at the gateway rather than in every backend service centralizes a security-critical concern instead of duplicating (and inevitably drifting) auth logic across 200 services. Two common credential types need different handling: **JWTs** are self-contained and stateless — the gateway verifies the signature against the issuer's public key (cached locally, refreshed on a schedule via the issuer's JWKS endpoint, never fetched per-request) and checks standard claims (expiry, audience, issuer) with zero network calls in the hot path, which is essential at 500,000 req/sec. **API keys** are opaque references requiring a lookup (client_id, scopes, rate-limit tier) — cached aggressively at the gateway (with a bounded TTL so revocation still takes effect promptly) to avoid a database round-trip per request. Once validated, the gateway typically injects a trusted, signed internal header (e.g., `X-Authenticated-Client-Id`) so backend services can trust the identity without re-validating the original credential themselves — backends trust the gateway, not the raw client-supplied token, which also lets internal service-to-service calls (already inside the trust boundary) skip redundant auth overhead.

### 6.2 Rate limiting per client

Every client (or client tier — free/standard/enterprise) has a quota enforced cluster-wide across all 50 gateway instances, which means the counter can't simply live in each instance's local memory (a client could get 50x their real limit by spreading requests across instances). A shared, low-latency store (Redis) with an atomic increment-and-check operation (or a Lua script for atomicity) is the standard solution — see [rate-limiting.md](../01-scaling-traffic/rate-limiting.md) for the algorithm choices (token bucket, sliding window log, sliding window counter) and their trade-offs. The gateway is the natural enforcement point specifically because it's the one place every request from a given client necessarily passes through, regardless of which backend it's ultimately headed to — enforcing per-service would require each of 200 services to separately track and agree on the same client's global quota, which doesn't scale operationally.

### 6.3 Request/response transformation

The gateway can decouple what a client sees from what a backend actually implements: rewriting paths (`/api/v1/orders` → an internal `/internal/order-svc/v3/orders`), translating protocols (accepting REST/JSON from external clients, forwarding as gRPC to a backend that only speaks gRPC internally — see [REST vs GraphQL vs gRPC](../06-communication-protocols/rest-vs-graphql-vs-grpc.md)), injecting headers (auth context, request IDs for tracing), and even aggregating multiple backend calls into one client-facing response for simple cases. This lets backend services evolve their internal APIs independently of the public contract, and lets the platform introduce new internal protocols without breaking existing external clients — the gateway absorbs that translation cost in one centralized place instead of every client needing to adapt.

### 6.4 Circuit breaking to unhealthy backends

Without circuit breaking, a struggling backend (slow, erroring, or down) keeps receiving the same request volume from the gateway, compounding the problem — requests pile up waiting on a service that isn't going to answer, exhausting gateway-side connection pools and thread/worker capacity that healthy routes need too. A circuit breaker per backend service tracks recent error rate/latency; once a configured threshold is crossed within a window, it "opens," and the gateway fails fast (immediate `503`, optionally serving a cached/fallback response) for calls to that backend without even attempting the network call, for a cooldown period. After the cooldown, it moves to "half-open," allowing a small trickle of test requests through — if those succeed, the circuit closes and normal traffic resumes; if they still fail, it reopens the cooldown. This is what stops one degraded backend from cascading into a gateway-wide outage — see [circuit-breaker-pattern.md](../01-scaling-traffic/circuit-breaker-pattern.md) for the full state-machine detail. Circuit state can be tracked per gateway instance (fast, no shared-state dependency, but each instance detects failure independently and slightly out of sync with others) or shared cluster-wide (faster consensus on backend health across the fleet, but adds a dependency on the shared store being fast and available even during the very incidents circuit breaking exists to handle) — per-instance is the more common, more resilient default specifically because it has no dependency that could itself be part of an outage.

### 6.5 Plugin/middleware architecture

Cross-cutting concerns (custom logging, request validation, A/B test header injection, bespoke business rules for specific routes) shouldn't require modifying the gateway's core routing engine every time a new concern arises. A **plugin/middleware pipeline** — an ordered chain of small, independent handlers each given the request/response and a "continue or short-circuit" decision — lets teams add capability without touching shared code, similar in spirit to how a web framework's middleware stack works, but operating at the platform-wide edge rather than per-application. The trade-off is pipeline ordering and plugin interaction complexity (two plugins both wanting to rewrite the same header, or a slow plugin adding latency to every request that passes through it regardless of whether that specific plugin's logic was even relevant) — mitigated by scoping plugins to specific routes/services rather than applying every plugin globally, and by budgeting a strict per-plugin latency allowance enforced in the pipeline itself.

## 7. Bottlenecks & Scaling

- **10x request volume (5M req/sec)**: gateway instances scale horizontally and are stateless by design, so this is largely a "add more instances" problem — the real risk is the shared rate-limit store (Redis) becoming the bottleneck; shard rate-limit counters across a Redis cluster by client_id hash.
- **JWKS/public-key refresh storms**: if many gateway instances refresh signing keys from the issuer simultaneously (e.g., all restarting at once during a deploy), that's a synchronized load spike on the identity provider — stagger refresh timing with jitter.
- **Circuit breaker false positives during legitimate backend scaling events**: a backend rolling out a new deploy might show a brief error blip that shouldn't trip the breaker; tune thresholds/windows to tolerate normal deploy-time noise, and treat breaker trips as a signal for investigation, not just raw automation.
- **Routing table growth (thousands of services, deep route trees)**: keep the routing lookup O(log n) or better (a trie/radix structure over path prefixes) rather than linear scanning, so route-table growth doesn't degrade per-request latency.
- **Plugin pipeline latency creep**: as more plugins accumulate over time, cumulative per-request overhead grows silently; enforce and monitor a hard per-plugin and total-pipeline latency budget, alerting when it's approached.

## 8. Trade-offs & Alternatives

- **Centralized edge auth vs. per-service auth**: centralizing at the gateway avoids duplicated/drifting auth logic across 200 services, at the cost of the gateway becoming a high-value, high-blast-radius component that must be extremely well-tested and hardened — a bug here affects every service at once.
- **Local JWT verification vs. calling a central auth service per request**: local verification (cached public keys) is what makes 500,000 req/sec tractable, trading immediate revocation (a revoked-but-not-yet-expired JWT remains valid until its natural expiry, since there's no per-request central check) for enormous latency/throughput headroom — mitigated by keeping JWT expiry windows short (minutes, not days) and relying on a separate, checked-per-request revocation list only for high-privilege actions where immediate revocation actually matters.
- **Per-instance vs. shared circuit-breaker state**: per-instance avoids adding a shared-state dependency to the exact mechanism meant to handle degraded dependencies gracefully, at the cost of slower fleet-wide consensus on a backend's health (each instance learns independently) — an acceptable trade given the alternative's fragility.
- **General-purpose plugin pipeline vs. hardcoded gateway logic per concern**: pluggability trades a small latency/complexity tax (pipeline dispatch overhead, ordering considerations) for the ability for teams to extend gateway behavior without coordinating changes to a shared core codebase — worth it at 200-service scale where centralizing every possible cross-cutting need into core gateway code would make the gateway itself a deployment bottleneck.

## Related topics
- [Rate Limiting](../01-scaling-traffic/rate-limiting.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
- [Reverse Proxy & API Gateway](../01-scaling-traffic/reverse-proxy-api-gateway.md)
- [Load Balancing](../01-scaling-traffic/load-balancing.md)
- [REST vs GraphQL vs gRPC](../06-communication-protocols/rest-vs-graphql-vs-grpc.md)
- [Microservices Architecture](../07-architecture-patterns/microservices-architecture.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
