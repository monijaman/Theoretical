# Database Partitioning
[← Back to index](../readme.md)

## Why it matters

"Partitioning" and "sharding" get used interchangeably in casual conversation, and interviewers will specifically probe whether you know they're not the same thing. Partitioning is a single-node technique — splitting one logical table into smaller physical pieces inside the same database instance to make maintenance and queries cheaper. Sharding is a multi-node technique — splitting data across separate machines to scale beyond one node's capacity. You can, and often should, use both at once: shard across machines, then partition within each shard.

## What it is

A partitioned table looks like one table to the application (one name, one schema), but the database engine physically stores its rows in multiple separate partitions, each with its own storage, and can route or prune queries to only the partitions that matter.

```
Logical table: orders
                │
    ┌───────────┼───────────┬───────────┐
    ▼           ▼           ▼           ▼
orders_2024_q1 orders_2024_q2 orders_2024_q3 orders_2024_q4
 (Jan-Mar)      (Apr-Jun)      (Jul-Sep)      (Oct-Dec)
       all physically stored on the SAME database instance
```

Contrast with sharding, where each piece lives on a **different** instance/machine:

```
                Logical table: orders
                        │
        ┌───────────────┼───────────────┐
        ▼                                ▼
   Shard 1 (Machine A)              Shard 2 (Machine B)
   [orders_2024_q1, orders_2024_q2] [orders_2024_q3, orders_2024_q4]
```

## Partitioning strategies

### Range partitioning
Rows go to a partition based on a value range of the partition key — most common for time-series data (`created_at`).

```sql
CREATE TABLE orders (
  id BIGINT, created_at DATE, ...
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024_q1 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE orders_2024_q2 PARTITION OF orders
  FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
```

Old partitions can be dropped instantly (e.g., "delete data older than 2 years" becomes `DROP TABLE orders_2022_q1` — an O(1) metadata operation instead of a slow `DELETE` that has to scan and generate WAL for millions of rows).

### List partitioning
Rows go to a partition based on a discrete set of values — e.g., partition by `country_code IN ('US','CA')` vs `country_code IN ('DE','FR')`. Good for categorical splits like region or tenant tier.

### Hash partitioning
`hash(key) % N` decides the partition, used when there's no natural range/list split and you just want to spread I/O evenly across partitions (and often across separate physical disks/tablespaces).

### Composite partitioning
Partition by range, then sub-partition each range by hash — e.g., partition `orders` by month, then sub-partition each month by `hash(customer_id)` to spread each month's write load across multiple physical partitions.

## Partition pruning

The query planner looks at the `WHERE` clause and, if it references the partition key, skips scanning partitions that can't possibly contain matching rows.

```sql
SELECT * FROM orders WHERE created_at >= '2024-07-01' AND created_at < '2024-08-01';
-- planner touches ONLY orders_2024_q3, skips q1/q2/q4 entirely
```

```
EXPLAIN output (conceptual):
  Append
    -> Seq Scan on orders_2024_q3   -- only this one scanned
    (orders_2024_q1, q2, q4 pruned before execution)
```

Without a filter on the partition key, the planner falls back to scanning every partition (equivalent to scanning the whole logical table) — so, just like a shard key, the partition key should match your actual query patterns or you get none of the benefit.

## How partitioning composes with sharding

They operate at different layers and stack naturally:

```
                        Application
                             │
                     Shard router (by tenant_id)
                             │
        ┌────────────────────┼────────────────────┐
        ▼                                          ▼
   Shard 1 (Machine A)                        Shard 2 (Machine B)
   tenants A-M                                tenants N-Z
        │                                          │
   table "events" partitioned                 table "events" partitioned
   BY RANGE(created_at) locally                BY RANGE(created_at) locally
   [events_jan, events_feb, ...]                [events_jan, events_feb, ...]
```

A large multi-tenant analytics platform, for example, might shard by `tenant_id` across a dozen Postgres instances (to scale write throughput and isolate noisy tenants) and, independently, partition each shard's `events` table by month (to make retention/deletion cheap and keep indexes small). The two decisions are made for different reasons and don't have to use the same key.

## Real-world examples

- **PostgreSQL declarative partitioning**: native `PARTITION BY RANGE/LIST/HASH` since PG 10, with partition pruning at plan time and execution time (`enable_partition_pruning`), used heavily for time-series retention.
- **MySQL partitioning**: `PARTITION BY RANGE/LIST/HASH/KEY`, commonly paired with Vitess sharding — MySQL partitioning handles intra-node splits, Vitess handles inter-node splits.
- **Cassandra**: technically calls its shard key a "partition key" — this is a common source of terminology confusion. Cassandra's "partition" is actually closer to what this doc calls a shard (it determines which physical node owns the data via consistent hashing); within a partition, data is further organized by "clustering columns," which is closer to intra-node ordering than partitioning in the relational sense.
- **BigQuery / Snowflake**: automatically partition (and cluster) large tables by ingestion time or a specified column, pruning partitions transparently to avoid full scans on massive analytical tables — you don't manage physical partition files but you still choose the partitioning column for pruning benefit.

## Trade-offs

| Aspect | Partitioning (single node) | Sharding (multi node) |
|---|---|---|
| Scales | Query/maintenance efficiency, index size | Total storage capacity, write throughput, node count |
| Failure domain | One instance — partitioning doesn't add availability | Each shard is an independent failure domain |
| Cross-partition queries | Cheap (same instance, same query engine) | Expensive (network fan-out / scatter-gather) |
| Adding more | Add a partition — local DDL operation | Add a shard — data movement across machines (see sharding's resharding pain) |
| Typical driver | Retention/archival, query pruning, VACUUM/index maintenance size | Capacity limits, write throughput, tenant isolation |

## Common interview follow-ups

**Q: If partitioning doesn't add capacity, why bother?**
Because a lot of the pain of huge tables isn't raw storage — it's maintenance operations (index rebuilds, vacuum, backups) and query planning getting slower as one table grows; splitting into partitions keeps each physical piece small enough that these operations stay fast, and lets you drop old data in O(1) instead of a scanning `DELETE`.

**Q: Can partition pruning fail silently and hurt performance?**
Yes — if the query doesn't filter on the partition key (or filters on an expression the planner can't statically resolve, like a function call on the column), the planner scans every partition; this shows up as a query that used to be fast suddenly scanning 10x the rows after a refactor changed how the date filter is constructed.

**Q: How would you migrate an unpartitioned multi-billion-row table to a partitioned one with no downtime?**
Create the new partitioned table alongside the old one, backfill historical data into partitions in batches, dual-write new rows to both, verify row counts/checksums match, then atomically rename tables in a single transaction — the same expand-contract pattern used for any zero-downtime schema change.

**Q: When would you shard without partitioning, or partition without sharding?**
Partition-only fits a single large but not-yet-write-bottlenecked table needing cheaper retention/maintenance (e.g., a logging table on one beefy Postgres instance); shard-only fits smaller tables per shard that don't need internal splitting but the overall dataset/write-rate exceeds one machine, like a multi-tenant SaaS where each tenant's table is modest in size.

**Q: Does the partition key have to be the same as the shard key?**
No, and usually it shouldn't be — the shard key is chosen to distribute load/capacity across machines (e.g., `tenant_id`), while the partition key is chosen for query pruning and lifecycle management within a shard (e.g., `created_at`); conflating them can force an awkward compromise on both goals.

## Related topics

- [Database Sharding](database-sharding.md)
- [Database Replication](database-replication.md)
- [Database Indexing](database-indexing.md)
- [Database Migration at Scale](database-migration-at-scale.md)
- [Data Lake vs Data Warehouse](../09-large-scale-data-systems/data-lake-vs-data-warehouse.md)
