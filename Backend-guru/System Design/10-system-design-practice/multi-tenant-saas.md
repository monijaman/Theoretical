# Design a Multi-Tenant SaaS Platform
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Onboard a new tenant (company) with its own users, roles, and data, isolated from every other tenant.
- Provide the product's core features (e.g., a project-management tool: projects, tasks, comments) scoped per tenant.
- Meter usage per tenant (API calls, storage, seats) for billing.
- Support tenant-level configuration (custom fields, branding, feature flags) without code changes per tenant.
- Support self-service signup as well as enterprise sales-assisted onboarding.

**Non-functional**
- **Tenant isolation is the core guarantee**: one tenant must never see, modify, or degrade the experience of another. A single query bug leaking cross-tenant data is the worst possible failure mode for a B2B SaaS product — this shapes almost every design decision below.
- Noisy-neighbor protection: one tenant's usage spike (a large customer running a bulk import) must not degrade latency for other tenants sharing the same infrastructure.
- Elastic scaling as tenant count and per-tenant data volume both grow, often very unevenly (a small number of enterprise tenants may be 100-1000x the size of a typical small tenant).
- Onboarding a new tenant should be fast (self-service signup to first use in seconds-minutes) and safe (no manual per-tenant infrastructure provisioning for the common case).
- Usage metering must be accurate enough to bill correctly — undercounting loses revenue, overcounting damages trust.

**Assumptions**
- 50,000 tenants, wildly skewed size distribution: ~49,000 small tenants (under 20 users) and ~1,000 mid/large tenants (some with 5,000+ users), following a power law typical of B2B SaaS.
- Core product entities (projects, tasks, comments) are the dominant data volume; every row is tenant-scoped.
- Multi-region not assumed as a hard requirement initially, but data residency (EU customer data must stay in the EU) is a real constraint for a subset of tenants.

## 2. Capacity Estimation

**Tenant/data distribution**
- 50,000 tenants; assume average tenant has 5,000 tasks, but the largest 2% (1,000 tenants) average 200,000 tasks each. Total ≈ (49,000 × 5,000) + (1,000 × 200,000) = 245M + 200M ≈ **~445M task rows** — note the top 2% of tenants contribute nearly half the total data volume, which is exactly the skew that makes "one database, tenant_id column" naively fine at small scale but risky at this scale (see 6.1).

**Traffic**
- Assume 2M total active users platform-wide, average 20 actions/day each → 40M actions/day ≈ 40,000,000/86,400 ≈ **~460 requests/sec average**, peak ~5-10x during business hours across time zones → ~3,000-5,000 req/sec peak.
- Traffic is not evenly distributed per tenant — the largest tenants can individually generate more load than hundreds of small tenants combined, which is the crux of the noisy-neighbor problem (6.3).

**Storage**
- 445M task rows × ~500 bytes (title, description, assignee, status, timestamps, tenant_id) ≈ **~220 GB** for tasks alone; comparable orders of magnitude for projects, comments, attachments metadata — total core relational data on the order of a few TB, easily fitting a well-sharded relational tier, not remotely a "big data" volume problem — the challenge here is isolation and noisy-neighbor control, not raw scale.

**Usage metering volume**
- Every billable action (API call, storage delta, seat change) generates a metering event: at ~460 req/sec average that could be up to 460 events/sec ≈ ~40M events/day ≈ 40M × 200 bytes ≈ **8 GB/day** of raw usage events — small, but must be aggregated per tenant per billing period reliably (see 6.5), which is a correctness problem more than a volume problem.

## 3. High-Level Architecture

```
┌──────────┐   ┌───────────────┐   ┌────────────────────────┐
│  Clients   │──▶│  API Gateway    │──▶│  Tenant Resolution Layer │  (subdomain/token → tenant_id)
└──────────┘   │ (see api-gateway.md)│  └───────────┬────────────┘
               └───────────────┘                    ▼
                                          ┌────────────────────────┐
                                          │  App Services              │  (tenant-aware, tenant_id
                                          │  (projects, tasks, etc.)   │   threaded through every call)
                                          └───────────┬────────────┘
                        ┌────────────────────────────┼────────────────────────────┐
                        ▼                             ▼                            ▼
              ┌──────────────────┐         ┌──────────────────┐        ┌──────────────────┐
              │ Shared DB (RLS)     │         │ Pooled Shard(s)     │        │ Dedicated Shard      │
              │ small tenants        │         │ mid-size tenants     │        │ (large/enterprise      │
              │                      │         │                      │        │  tenants, data-      │
              │                      │         │                      │        │  residency needs)      │
              └──────────────────┘         └──────────────────┘        └──────────────────┘
                                                       │
                                             ┌─────────▼──────────┐
                                             │  Usage Metering Stream│──▶ Aggregation → Billing System
                                             │  (Kafka)                │
                                             └─────────────────────┘
                                                       │
                                             ┌─────────▼──────────┐
                                             │  Per-Tenant Rate/     │  (quotas, throttling —
                                             │  Resource Quotas       │   noisy-neighbor defense)
                                             └─────────────────────┘
```

**Walkthrough**
1. **Tenant resolution**: every request is resolved to a `tenant_id` at the edge (from a subdomain like `acme.ourapp.com`, a JWT claim, or an API key) before any business logic runs — this identity is then threaded through every subsequent layer, never re-derived ambiguously downstream.
2. **Routing to the right isolation tier**: based on the tenant's plan/size, requests are routed to the appropriate data tier — small tenants share a pooled database with row-level isolation, larger tenants may live in a dedicated pooled shard, and the largest/regulated tenants get fully dedicated infrastructure (6.1).
3. **App services** apply business logic identically regardless of tenant tier — tenant isolation is a data-layer concern, not something application code re-implements per feature.
4. **Quota enforcement**: before/alongside processing, per-tenant rate limits and resource quotas are checked (6.3), protecting the shared infrastructure from any single tenant's spike.
5. **Usage metering**: every billable action emits an event to a stream, aggregated asynchronously into per-tenant usage totals that feed the billing system (6.5) — decoupled from the request path so metering never adds latency to the actual product action.

## 4. API Design

```
POST /api/v1/tenants                 // onboarding — typically internal/admin or self-service signup flow
Request: { "company_name": "Acme Corp", "subdomain": "acme", "plan": "team", "region": "us" }
Response: 201
{ "tenant_id": "t_9f2a", "subdomain": "acme.ourapp.com", "status": "provisioning" }

GET /api/v1/tenants/{tenant_id}/status
Response: 200 { "tenant_id": "t_9f2a", "status": "active", "isolation_tier": "pooled_shard_3" }

# All product-facing endpoints are implicitly tenant-scoped via the resolved tenant_id (subdomain/JWT claim),
# never via a client-supplied tenant_id parameter (which would allow a client to simply request another tenant's data):
GET /api/v1/projects
Headers: Host: acme.ourapp.com  (or Authorization: Bearer <jwt with tenant_id claim>)
Response: 200 { "projects": [ { "project_id": "p_44", "name": "Q3 Launch" } ] }   // only Acme's projects, ever

GET /api/v1/usage/current
Response: 200
{ "tenant_id": "t_9f2a", "billing_period": "2026-07", "api_calls": 812340, "storage_gb": 42.1, "seats_used": 87 }
```

The critical API design principle: `tenant_id` is **never** accepted as a client-supplied request parameter for data access — it is always derived server-side from an authenticated context (subdomain, JWT claim, or API key mapping), so there is no code path where a client could simply pass a different tenant's ID and access their data.

## 5. Data Model & Storage Choice

```
tenants
  tenant_id PK, name, subdomain, plan, isolation_tier, region, status, created_at

projects / tasks / comments (tenant-scoped tables, pooled tier)
  id PK, tenant_id (indexed, and enforced via row-level security), ... business columns

usage_events (append-only stream, then aggregated)
  tenant_id, event_type, quantity, occurred_at

usage_aggregates (per tenant, per billing period, precomputed)
  tenant_id, billing_period, api_calls, storage_gb, seats_used
```

For the pooled tiers, every tenant-scoped table carries a `tenant_id` column, and access is enforced via **row-level security (RLS)** at the database level (Postgres RLS policies, for example) rather than trusting every application query to remember a `WHERE tenant_id = ?` clause — pushing isolation into the database means a missing clause in application code fails closed (returns nothing / errors) rather than silently leaking cross-tenant rows, which is the single most consequential design decision for a multi-tenant system. See [multi-tenant-architecture.md](../07-architecture-patterns/multi-tenant-architecture.md) for the full comparison of isolation models (shared schema + RLS vs. schema-per-tenant vs. database-per-tenant) this system chooses among per tenant tier (6.1). This is fundamentally a relational workload — tenant-scoped business data has clear relational structure (projects have tasks have comments) and needs transactional consistency within a tenant — so Postgres/MySQL is the right default per [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md); usage events are a different, append-heavy, stream-shaped workload better suited to a log/queue (Kafka) followed by aggregation into a much smaller summary table.

## 6. Deep Dive

### 6.1 Tenant isolation model — the central design decision

Three broad models, usually mixed by tenant tier rather than chosen platform-wide:
- **Shared schema, shared tables, row-level security** (all tenants in one set of tables, isolated by a `tenant_id` column + enforced RLS policies): the cheapest to operate and easiest to onboard new tenants instantly (just a new row, no infrastructure provisioning), and the default for the long tail of small tenants (the ~49,000 small tenants in our estimate). The risk is entirely in query correctness — a single missing filter is a data leak — which is why RLS enforcement at the database layer (not just application discipline) is essential here, not optional.
- **Schema-per-tenant** (same database instance, separate schema per tenant): stronger logical isolation (a bug is contained to schema-level access, and per-tenant backup/restore/export is simpler) but doesn't scale operationally past a few hundred-thousand schemas realistically (connection pool exhaustion, migration fan-out — every schema migration must run N times), and still shares the underlying database instance's resources across tenants, so noisy-neighbor risk at the infrastructure level remains.
- **Database-per-tenant / dedicated infrastructure**: the strongest isolation (a resource-hungry tenant can't affect any other tenant's database at all, and this is often a hard requirement for enterprise contracts or data-residency regulation) but the most expensive and operationally heavy — not viable for tens of thousands of tenants, but exactly right for the handful of largest/most regulated accounts.

The practical answer at this scale is **tiered**: small tenants share pooled databases with RLS (6.1's first model), a middle tier of pooled shards groups similarly-sized tenants together (bounding blast radius and noisy-neighbor exposure without per-tenant infrastructure cost), and the largest/regulated tenants get dedicated database instances — see [multi-tenant-architecture.md](../07-architecture-patterns/multi-tenant-architecture.md) for this decision framework in depth. A tenant can be migrated between tiers as it grows, which is why `tenant_id` as a stable, tier-independent identifier (rather than baking tier/location into the ID itself) matters for onboarding flexibility.

### 6.2 Tenant-aware data access layer

Regardless of isolation tier, application code should never construct a raw, tenant-unaware query — a shared data-access layer (an ORM scoping hook, a query-builder wrapper, or database session variables that RLS policies key off of) automatically injects the current request's `tenant_id` into every query, so individual feature developers can't accidentally forget the filter. This is the practical difference between "isolation is a policy we hope engineers follow" and "isolation is a property the platform enforces" — the RLS-at-the-database-layer approach (6.1) is the strongest version of this, since it holds even if the application-layer scoping is somehow bypassed or buggy (e.g., a raw SQL escape hatch, a background job that forgets to set tenant context) — defense in depth, not a single point of enforcement.

### 6.3 Noisy neighbor mitigation

In a pooled tier, one tenant running a bulk operation (a large CSV import, a reporting query scanning their entire history) can consume disproportionate database connections, CPU, or I/O, degrading latency for every other tenant sharing that pool — exactly the scenario the size-skew in our capacity estimate warns about. Mitigations, layered: **per-tenant rate limits and connection quotas** at the application/gateway layer (see [rate-limiting.md](../01-scaling-traffic/rate-limiting.md)) cap how much load any single tenant can generate against shared infrastructure; **query timeouts and resource governors** at the database layer prevent one runaway query from monopolizing a shared connection pool indefinitely; **tiered pooling** (grouping tenants of similar size/usage profile into the same pooled shard, per 6.1) bounds the blast radius so a mid-size tenant's spike affects a pool of similarly-sized tenants, not the entire small-tenant population; and **background/bulk operations routed to a separate, rate-limited async processing path** rather than the interactive request path, so a large import doesn't compete with real-time user actions for the same resources at all.

### 6.4 Tenant onboarding and provisioning flow

Self-service signup must be fast and safe: creating a `tenants` row, assigning an initial isolation tier (new tenants typically start in the shared pooled tier by default — cheapest, instant, no provisioning delay), setting up the tenant's subdomain routing, and seeding default data (a starter project, default roles) — all as an idempotent, resumable provisioning workflow (a saga-like sequence, similar in spirit to the multi-step workflows in [payment-system.md](payment-system.md) 6.2) so a partial failure (e.g., subdomain registered but seed data failed) doesn't leave the tenant in a broken half-provisioned state. Enterprise/sales-assisted onboarding follows the same underlying flow but with additional steps (custom contract terms, dedicated tier assignment, data-residency region selection) gated behind manual approval rather than instant self-service.

### 6.5 Billing and usage metering per tenant

Every billable action (API call, storage consumed, active seat) emits a lightweight usage event to a stream (Kafka) rather than synchronously updating a running counter in the request path — this keeps metering from adding latency or a shared-state contention point to the actual product action. A separate aggregation pipeline consumes these events and rolls them up into per-tenant, per-billing-period totals, which the billing system reads to generate invoices. This mirrors the metrics/logging systems' pattern of decoupling "the event happened" from "the aggregate is queryable" (see [metrics-monitoring-system.md](metrics-monitoring-system.md) 6.3) — and for the same reason: synchronous, exactly-precise metering on every request doesn't scale and isn't actually necessary, since billing operates on periodic (daily/monthly) aggregates, not real-time totals. Accuracy at the aggregate level matters far more than per-event latency, so occasional event reprocessing/reconciliation (comparable to the payment system's reconciliation job, [payment-system.md](payment-system.md) 6.4) catches any drift between raw events and billed totals before invoices go out.

## 7. Bottlenecks & Scaling

- **10x tenant count (500,000 tenants)**: the pooled shared-schema tier needs to be sharded across multiple database instances (tenant_id hash or range-based, per [database-sharding.md](../02-data-storage/database-sharding.md)), since a single Postgres instance eventually can't hold every small tenant's data and connections — route tenants to shards via a lookup table, not a fixed hash, so individual tenants can be rebalanced/migrated without re-deriving their shard from a hash function.
- **A single tenant outgrowing its tier (organic growth from small to enterprise-scale)**: needs a defined, low-downtime migration path between isolation tiers (dump/restore or live replication into a new dedicated instance, then cut over) — this must be a supported, tested operation, not a one-off manual scramble the first time it's needed.
- **RLS overhead at very high query volume**: row-level security policies add a per-query predicate evaluation cost; ensure `tenant_id` is always the leading column in relevant indexes so RLS filtering doesn't force a full table scan under the covers.
- **Cross-tenant reporting/analytics needs (internal, e.g. "total tasks created across all tenants this month")**: don't run these against the tenant-isolated OLTP tier at all — replicate into a separate analytics warehouse where tenant isolation is enforced at the access-control layer instead of the storage layer, since aggregate cross-tenant queries are a fundamentally different access pattern than the isolation model is designed for.
- **Data residency requirements growing (more regions needing local storage)**: the dedicated-tier tenants already support region pinning; extending this to pooled tiers means running region-local pooled clusters rather than one global pool — see [multi-region architecture](../09-large-scale-data-systems/multi-region-architecture.md).

## 8. Trade-offs & Alternatives

- **Tiered isolation (shared → pooled → dedicated) vs. one uniform model for all tenants**: tiering matches infrastructure cost to tenant value/risk (small tenants are cheap to serve, large/regulated ones justify dedicated cost) but adds real operational complexity — multiple isolation models to build, test, and migrate tenants between, versus the simplicity of "everyone gets the same treatment."
- **Database-enforced RLS vs. application-layer tenant scoping only**: RLS adds a small per-query overhead and ties isolation logic partly to the database engine's feature set, but closes off an entire class of catastrophic data-leak bugs that application-only discipline can't fully prevent — judged worth it given the severity of a cross-tenant leak in a B2B product.
- **Asynchronous usage metering vs. synchronous real-time counters**: async metering (event stream + periodic aggregation) sacrifices instant "your usage right now" precision (a small window of lag before an action is reflected in the usage dashboard) in exchange for not adding shared-state contention or latency to the actual product request path — the right trade since billing operates on periods, not instants.
- **Shared subdomain-based tenant resolution vs. requiring an explicit tenant header/parameter**: subdomain-based resolution (`acme.ourapp.com`) is more user-friendly and harder to accidentally misconfigure client-side (a client literally cannot construct a request for another tenant without controlling that tenant's subdomain/credentials), at the cost of some added complexity in TLS certificate management (wildcard/per-subdomain certs) and DNS provisioning during onboarding.

## Related topics
- [Multi-Tenant Architecture](../07-architecture-patterns/multi-tenant-architecture.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Rate Limiting](../01-scaling-traffic/rate-limiting.md)
- [Microservices Architecture](../07-architecture-patterns/microservices-architecture.md)
- [Reverse Proxy & API Gateway](../01-scaling-traffic/reverse-proxy-api-gateway.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
- [Message Queues](../05-messaging-event-driven/message-queues.md)
