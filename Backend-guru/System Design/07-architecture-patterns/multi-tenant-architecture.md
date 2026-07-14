# Multi-Tenant Architecture
[← Back to index](../readme.md)

## What it is and why it's asked

A multi-tenant architecture serves multiple independent customers (tenants — companies, teams, or accounts) from a single deployed system, rather than standing up a dedicated copy of the application per customer. Almost every B2B SaaS product is multi-tenant. Interviewers ask about this to see whether you can reason about the actual axis of the decision — how much isolation does each tenant need, and what does that cost in operational and infrastructure terms — rather than treating "multi-tenant" as a single fixed design. The real content of this topic is the spectrum of isolation models and when each one is the right (or legally required) choice.

## The isolation spectrum: silo, pool, and bridge

**Silo model** — each tenant gets a fully separate database (and sometimes a fully separate application deployment):
```
Tenant A --> [ App instance A ] --> [ Database A ]
Tenant B --> [ App instance B ] --> [ Database B ]
Tenant C --> [ App instance C ] --> [ Database C ]
```
Maximum isolation: one tenant's data is physically incapable of leaking into another's queries, one tenant's load can't degrade another's performance, and per-tenant backup/restore/deletion is trivial. Cost: N tenants means N databases (and possibly N app deployments) to provision, migrate schema on, monitor, and pay for — this doesn't scale cheaply to thousands of small tenants.

**Pool model** — all tenants share the same database (and often the same tables), distinguished by a `tenant_id` column on every row:
```sql
SELECT * FROM orders WHERE tenant_id = 'acme-corp' AND status = 'pending';
-- every table carries tenant_id; every query MUST filter by it
```
```
Tenant A --+
Tenant B --+--> [ Shared App ] --> [ Shared Database, every row tagged tenant_id ]
Tenant C --+
```
Cheapest to run — one database to operate, migrate, and scale, and idle tenants cost nothing beyond storage. Cost: isolation is enforced entirely in application code (forget one `WHERE tenant_id = ?` clause and you have a cross-tenant data leak — a routine, high-severity class of SaaS bug), and tenants share the same underlying resources, creating the noisy-neighbor problem below.

**Bridge model (hybrid)** — most tenants share a pooled database, but specific tenants (usually paying for an "enterprise"/"dedicated" tier, or with a compliance requirement) get their own silo:
```
Small/mid tenants --> [ Shared App ] --> [ Pooled DB, tenant_id column ]
Enterprise Tenant X --> [ Dedicated App instance ] --> [ Dedicated DB ]
```
This is the model most mature SaaS products converge on: pooled by default for cost efficiency, with an escape hatch to silo specific tenants that need stronger isolation, higher scale, or specific compliance guarantees.

## The noisy-neighbor problem

In a pooled model, tenants share compute, connection pools, and I/O capacity. One tenant running an unusually heavy workload — a huge batch export, a runaway analytics query, a traffic spike from their own successful product launch — can degrade response times for every other tenant sharing that infrastructure, even though those other tenants did nothing wrong.

```
Shared DB connection pool (size 100)
Tenant A (huge nightly report query) grabs 80 connections
Tenant B, C, D... (normal traffic) --> starved for connections --> elevated latency/errors
```

Mitigations, in increasing order of isolation (and cost):
- **Per-tenant rate limiting / quotas** at the API gateway layer, so one tenant can't consume unbounded request capacity.
- **Resource governance inside shared infrastructure** — per-tenant connection pool caps, query timeouts, and workload classes (e.g., routing heavy analytical queries to a read replica dedicated to reporting, away from the primary serving live traffic).
- **Tiered isolation** — move consistently heavy or high-value tenants to their own silo (database, or even compute) once they're demonstrably a noisy neighbor or once their contract justifies the cost, which is exactly the bridge model above.

## Tenant-aware connection routing

In a pool or bridge model, the application needs to resolve "which database/shard does this tenant's data live in" on every request, since not every tenant is guaranteed to be in the same physical location.

```
Request arrives with tenant identifier (subdomain, JWT claim, API key)
        |
        v
[ Tenant Routing Layer ] --looks up tenant_id in a tenant->shard/DB registry--> 
        |
        v
Connects to the correct connection pool / database / shard for that tenant
```

This routing layer is typically backed by a small, heavily-cached "tenant registry" (tenant_id → database host, shard, or silo instance) so the lookup is fast and doesn't itself become a bottleneck or single point of failure. This is the same shape of problem as [database sharding](../02-data-storage/database-sharding.md) — tenant ID is simply the shard key — and the same operational concerns (rebalancing, hot shards, routing-layer availability) apply.

## Row-level security for shared-DB isolation

Relying purely on application code to always add `WHERE tenant_id = ?` is fragile — a forgotten clause in one code path is a cross-tenant data leak, and code review can't catch every case forever. **Row-level security (RLS)**, supported natively by Postgres and other databases, pushes the isolation guarantee down into the database engine itself, so it holds even if application code has a bug:

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Application sets this once per connection/request:
SET app.current_tenant = 'acme-corp-uuid';

-- Now ANY query against `orders` — even a bare `SELECT * FROM orders` with no WHERE clause —
-- is transparently filtered to that tenant's rows by the database itself.
```

This is a meaningfully stronger guarantee than "our ORM always adds the filter," because it moves enforcement below the application layer, making it the reasonable default recommendation for any pooled-model system that stores real customer data.

## Data residency and compliance driving the silo model

For enterprise customers, especially in regulated industries (healthcare, finance, government) or specific jurisdictions (EU customers under GDPR requiring data to stay in-region), a pooled database often isn't a legally viable option regardless of engineering preference:

- **Data residency** — a customer (or law) may require their data to physically reside in a specific country/region, which means it needs its own database instance provisioned in that region — impossible to satisfy from one shared, single-region database.
- **Contractual/audit isolation** — enterprise contracts frequently require demonstrable physical data isolation ("no other customer's infrastructure touches ours") for security audits (SOC 2, HIPAA, FedRAMP), which a shared-table pool model can't prove as convincingly as a dedicated silo can, even if row-level security is technically sound.
- **Independent backup/restore and deletion SLAs** — "delete all our data within 30 days of contract termination" is a straightforward `DROP DATABASE` in a silo, versus a careful, auditable row-level purge across shared tables in a pool.

This is why SaaS pricing tiers so often map directly to isolation model: a self-serve/SMB tier runs pooled for cost efficiency, while an "Enterprise" tier's price premium partly funds the dedicated (siloed) infrastructure that data residency and compliance commitments require.

## Trade-offs summary

| | Silo (DB per tenant) | Pool (shared DB, tenant_id) | Bridge (hybrid) |
|---|---|---|---|
| Isolation strength | Strongest (physical) | Weakest (logical, enforced in app/DB policy) | Strong for silo'd tenants, weaker for pooled ones |
| Cost per tenant | High — dedicated infra per tenant | Low — shared infra, marginal cost per tenant is small | Mixed — low for pooled majority, high for silo'd minority |
| Noisy-neighbor risk | None (fully isolated) | High without mitigation | Contained to the pooled segment |
| Operational complexity | High at scale (N databases to manage/migrate) | Low (one database to operate) | Highest — two operational models to maintain simultaneously |
| Compliance/data residency fit | Best fit | Poor fit without extra controls | Good — route compliance-sensitive tenants to silo |
| Typical use | Enterprise tier, regulated tenants | Self-serve/SMB tier, large tenant counts | Most mature SaaS products at scale |

## Common interview follow-ups

**Q: How do you migrate a tenant from the pool model to a dedicated silo once they outgrow it?**
Provision a new dedicated database, run a backfill/copy of that tenant's rows (filtered by `tenant_id`) into it, cut the tenant-routing registry over to point at the new database (ideally with a brief dual-write or read-only window to avoid losing in-flight writes), then delete that tenant's rows from the shared pool. This is operationally similar to a live database migration/resharding.

**Q: What's the biggest real-world risk in the pool model, and how do you defend against it in depth?**
Cross-tenant data leakage from a missing or incorrect `tenant_id` filter. Defend in layers: enforce row-level security at the database so a bug in application code can't leak data even if a filter is forgotten, add automated tests that assert every tenant-scoped query includes the tenant filter, and log/alert on any query pattern that touches multiple tenants' data outside of known admin paths.

**Q: How do you handle a tenant's noisy nightly batch job in a pooled model without giving them a full silo?**
Route heavy/batch workloads to a separate read replica or a dedicated query queue with its own resource limits, separate from the connection pool and replica serving live user-facing traffic, so the batch job's resource consumption is contained even though the data still lives in the shared primary.

**Q: Does multi-tenancy conflict with microservices' database-per-service principle?**
No — they're orthogonal axes. Database-per-service is about which *service* owns a given table; multi-tenancy is about how *tenants* share (or don't share) the database that a given service owns. A single microservice can itself be pooled, silo'd, or bridged across its tenants independently of how many other services exist.

**Q: How would you decide, for a new SaaS product, whether to start with silo or pool?**
Start pooled by default — it's dramatically cheaper to operate with few tenants and no proven need for isolation yet — and add row-level security from day one so the safety net exists before any leak can happen. Move to silo/bridge only when a specific tenant's contract, compliance requirement, or demonstrated noisy-neighbor impact justifies the added operational cost, not preemptively.

**Q: Can row-level security fully replace the need for a silo model?**
No — RLS solves logical data-leak risk within a shared database, but it doesn't address noisy-neighbor resource contention (all tenants still share the same compute/IO), nor does it satisfy data-residency requirements that need physically separate infrastructure in a specific region, nor does it give as strong an audit story for compliance certifications that specifically ask about physical isolation.

## Related topics
- [Microservices Architecture](microservices-architecture.md)
- [Monolith vs. Microservices](monolith-vs-microservices.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
- [Multi-Tenant SaaS (practice)](../10-system-design-practice/multi-tenant-saas.md)
- [Strong vs. Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
