# Database Sharding
[← Back to index](../readme.md)

## Why it matters

Replication scales reads and survivability, but not write throughput or dataset size — every replica still holds the *entire* dataset and the leader still handles *every* write. Sharding (horizontal partitioning across independent nodes) is how you scale past what a single machine's disk, memory, or write throughput can handle. Interviewers use sharding questions to see whether you understand that it's a one-way door: picking the wrong shard key is a production incident six months later, not a config change.

## What it is

Sharding splits a dataset by rows across multiple independent database instances (shards), each owning a disjoint subset of the data and typically running its own leader-follower replication set underneath. Unlike a read replica, a shard is not a full copy — it's a fraction of the data.

```
                        Application / Router
                                │
             shard_key = hash(user_id) or range lookup
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
    Shard 0                 Shard 1                 Shard 2
  (users 0-999)          (users 1000-1999)       (users 2000-2999)
  [leader+replicas]      [leader+replicas]       [leader+replicas]
```

## Shard keys

The shard key (partition key) determines which shard a row lives on. Choosing it well is the whole game:

- Must have high cardinality (many distinct values) so data spreads evenly.
- Should match your dominant query pattern — most queries should be satisfiable by hitting one shard, not fanning out to all of them (a "scatter-gather" query).
- Should avoid **hot shards**: e.g., sharding a social app by `signup_date` means the newest shard gets all the write traffic from new signups; sharding by `celebrity_user_id` means one shard gets crushed by their follower activity.

## Sharding strategies

### 1. Range-based sharding

Rows are assigned to shards by contiguous key ranges (`A-M` → shard 1, `N-Z` → shard 2; or `user_id 0-1M` → shard 1).

```
Shard A: keys [0, 1000)
Shard B: keys [1000, 2000)
Shard C: keys [2000, 3000)
```

- Pro: efficient range queries (e.g., "all orders in March") stay on one shard.
- Con: prone to hot shards if writes cluster at one end of the range (monotonically increasing IDs, timestamps).

### 2. Hash-based sharding

`shard = hash(key) % N`, spreading rows uniformly regardless of value patterns.

- Pro: even distribution, no hot ranges.
- Con: range queries now scatter across every shard; naive `% N` means **every row must move** if you add a shard.

### 3. Consistent hashing

Instead of `hash(key) % N`, map both shards and keys onto a hash ring (0 to 2^32-1). A key belongs to the first shard clockwise from its hash position. Adding/removing a shard only reshuffles the keys between it and its ring neighbors — not the whole dataset.

```
                    0
              ┌───────────┐
       Shard D│           │ Shard A
              │    ring    │
       Shard C│           │ Shard B
              └───────────┘
             key → hash → walk clockwise → owning shard
```

Virtual nodes (each physical shard owns many points on the ring) smooth out uneven load that a single point per shard would cause. This is the mechanism behind DynamoDB's original design, Cassandra, and most CDN/cache hash-ring implementations.

### 4. Directory-based (lookup table) sharding

A separate mapping service/table stores `key → shard` explicitly instead of computing it.

- Pro: maximum flexibility — rebalance by moving individual entries, put VIP customers on dedicated hardware.
- Con: the directory is itself a critical, must-be-fast, must-be-highly-available service and a potential bottleneck/SPOF.

## Resharding — the painful part

Adding shards to relieve a hot or full shard means physically moving data:

```
Before:  Shard0 [A-M]           Shard1 [N-Z]
Split Shard0 →
After:   Shard0 [A-F]  Shard2 [G-M]   Shard1 [N-Z]
```

This requires: copying rows to the new shard, keeping both old and new in sync during the migration (dual writes or a change-data-capture pipeline), atomically flipping the routing table, and backfilling without downtime — this is the same expand/contract problem as schema migrations, applied to data placement. See [Database Migration at Scale](database-migration-at-scale.md).

## Real-world examples

- **Vitess** (runs YouTube's, and now Slack's/Square's, MySQL fleet): shards MySQL horizontally, adds a query routing layer (VTGate) that speaks the MySQL protocol so apps don't need to know shard topology, and provides online resharding (`Reshard` workflows) that copies data with VReplication (CDC-based) before cutting over.
- **MongoDB sharding**: `mongos` routers, config servers holding the chunk-to-shard map, and shards that are themselves replica sets. Chunks (contiguous key ranges) are automatically split and rebalanced across shards by the balancer.
- **Citus** (Postgres extension, now part of Azure Cosmos DB for PostgreSQL): distributes Postgres tables across worker nodes by a distribution column, co-locating related tables on the same shard so joins on the shard key stay local; the coordinator node plans and routes distributed queries.
- **DynamoDB**: partitions by hash of the partition key across storage nodes transparently; you never see the shard map, but you still design your partition key to avoid hot partitions (their equivalent of a hot shard).

## Trade-offs

| Strategy | Pros | Cons | Good fit |
|---|---|---|---|
| Range | Efficient range scans, simple to reason about | Hot shards on sequential keys | Time-series with rotation, analytics |
| Hash | Even load distribution | Range queries scatter-gather; naive rehash on resize | High write-throughput OLTP with point lookups |
| Consistent hashing | Minimal data movement on resize | Slightly uneven without virtual nodes; still scatters ranges | Systems that scale nodes frequently (caches, Dynamo-style stores) |
| Directory-based | Maximum control, per-tenant placement | Directory becomes a critical dependency | Multi-tenant SaaS with uneven tenant sizes |

## Common interview follow-ups

**Q: How do you pick a shard key for a multi-tenant SaaS product?**
Shard by `tenant_id` so each tenant's data lives on one shard, making every tenant query single-shard; watch for a small number of huge "whale" tenants that overload one shard, which usually needs a directory-based override to isolate them onto dedicated shards.

**Q: What breaks when you need a query that spans shards, like a global leaderboard?**
You either fan out to every shard and merge results in the application (scatter-gather, higher latency, more failure surface) or maintain a separate denormalized aggregate (a secondary index or a stream-built materialized view) that isn't sharded the same way.

**Q: How does resharding happen without downtime?**
Dual-write or CDC-stream new writes to both old and new shard layouts, backfill historical data in the background, verify consistency, then atomically switch the routing/config map — conceptually identical to the expand-contract pattern used for schema changes.

**Q: Sharding vs partitioning — what's the actual difference?**
Sharding distributes data across separate machines/database instances; partitioning (in the single-node sense) subdivides a table within one database instance. They compose: you can partition a table by date *within* each shard that's already split by tenant. See [Database Partitioning](database-partitioning.md).

**Q: What's a hot shard and how do you detect/fix it?**
A shard receiving disproportionate traffic (e.g., a viral user, monotonically increasing IDs concentrating recent writes) — detect via per-shard QPS/CPU metrics, fix by choosing a better-distributed key, adding a random suffix ("salting") to spread writes, or splitting that shard's range further.

## Related topics

- [Database Partitioning](database-partitioning.md)
- [Database Replication](database-replication.md)
- [Database Migration at Scale](database-migration-at-scale.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Quorum](../03-consistency-distributed/quorum.md)
- [Load Balancing](../01-scaling-traffic/load-balancing.md)
- [Multi-Tenant Architecture](../07-architecture-patterns/multi-tenant-architecture.md)
- [Multi-Tenant SaaS](../10-system-design-practice/multi-tenant-saas.md)
