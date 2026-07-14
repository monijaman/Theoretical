# SQL vs NoSQL
[← Back to index](../readme.md)

## Why it's asked

Every system design interview eventually asks "what database would you use here?" The weak answer is a religious pick ("NoSQL scales better"). The strong answer maps the *access pattern* — how the data is queried, how it's shaped, how strict the invariants are — onto a storage model built for that pattern. SQL vs NoSQL isn't a maturity ladder; it's a set of different bets about what will be expensive later: joins, schema rigidity, write throughput, or horizontal scale.

## Relational (SQL): normalize, join, enforce constraints

A relational database (Postgres, MySQL, SQL Server, Oracle) stores data in fixed-schema tables and lets you decompose it into normalized forms (1NF/2NF/3NF) so each fact is stored once, then reconstitute it at query time with `JOIN`.

```sql
CREATE TABLE orders (id BIGINT PRIMARY KEY, user_id BIGINT REFERENCES users(id), total NUMERIC);
CREATE TABLE order_items (order_id BIGINT REFERENCES orders(id), sku TEXT, qty INT);

SELECT o.id, o.total, u.email
FROM orders o JOIN users u ON u.id = o.user_id
WHERE o.id = 42;
```

What you get in exchange for the upfront schema design:
- **ACID transactions** — a multi-table write either fully commits or fully rolls back, with isolation from concurrent transactions.
- **Constraints enforced by the engine** — foreign keys, uniqueness, `NOT NULL`, check constraints reject bad data before it's ever stored, instead of relying on every application code path to be correct.
- **Ad-hoc query flexibility** — you don't need to know every access pattern in advance; the query planner figures out how to satisfy a new `JOIN`/`WHERE` combination reasonably well.

What it costs: joins across billions of rows on multiple machines are expensive (network round trips per join), and schema changes on huge tables need care (see [Database Migration at Scale](database-migration-at-scale.md)). Scaling writes past one primary requires sharding, which reintroduces the cross-shard-join problem manually.

## NoSQL: four categories, four different bets

"NoSQL" isn't one model — it's four unrelated data models that all happen to relax some relational guarantee in exchange for something else.

### 1. Key-value — O(1) lookup by key, no query language

**Examples: Redis, DynamoDB, Riak.** Data is an opaque blob addressed by a single key; there's no server-side query into the value's structure (or only limited support, like Redis's data-type commands).

```
GET user:42:session   → {"cart": [...], "expires": 1700000000}
```

Wins when: the access pattern is *always* "fetch/write by exact key" — session stores, caches, feature flags, shopping carts. DynamoDB scales this to single-digit-millisecond latency at effectively unlimited horizontal scale because there's no cross-partition query to plan for.

### 2. Document — nested, self-contained records, per-document schema

**Examples: MongoDB, Couchbase, Firestore.** Each document (typically JSON/BSON) carries its own shape; a "products" collection can have documents with different fields.

```json
{
  "_id": "p_123",
  "name": "Keyboard",
  "variants": [{"color": "black", "price": 79}, {"color": "white", "price": 82}]
}
```

Wins when: your object naturally nests (a product with variants, a blog post with comments) and you'd otherwise pay for 3-4 joins to reassemble it every read. Costs you: no cross-document transactions across shards (mitigated but not eliminated by MongoDB's multi-document ACID since 4.0, which is expensive at scale), and duplicated data if the same nested value appears in multiple documents (denormalization moves the consistency burden onto the application).

### 3. Column-family (wide-column) — optimized for massive write throughput

**Examples: Cassandra, HBase, Bigtable.** Rows are grouped by a partition key, and within a partition, data is organized into column families and sorted by clustering columns — physically closer to a distributed, sorted multi-map than a table.

```
Partition key: sensor_id=42
  Clustering column: timestamp
    2024-01-01T00:00 → {temp: 21.3, humidity: 40}
    2024-01-01T00:01 → {temp: 21.4, humidity: 41}
```

Wins when: extremely high write volume with append-mostly access by a known key (time-series, IoT telemetry, event logs, Cassandra at Netflix for viewing history). Costs you: queries not aligned with the partition/clustering key design require a full scan or a separate materialized view; no joins, limited ad-hoc querying.

### 4. Graph — relationships are first-class, not foreign keys

**Examples: Neo4j, Amazon Neptune, JanusGraph.** Nodes and edges are stored so that traversing a relationship is a pointer-chase, not a join.

```cypher
MATCH (a:User {id: 1})-[:FOLLOWS*1..3]->(b:User)
RETURN b.name
```

Wins when: the query itself *is* the relationship — "friends of friends," fraud rings, recommendation graphs, org charts. A relational equivalent needs a self-join per hop, which gets unusable past 2-3 hops; a graph traversal stays roughly constant per hop.

## NewSQL: relational guarantees at NoSQL scale

**Spanner, CockroachDB, YugabyteDB, TiDB** try to remove the "pick one" framing: relational schema, SQL, ACID transactions, *and* horizontal scale via automatic sharding and a consensus protocol (Paxos/Raft) under the hood.

```
Spanner: shards data into ranges, replicates each range via Paxos across
zones/regions, uses TrueTime (bounded clock uncertainty) to assign
globally-ordered commit timestamps without a single bottleneck coordinator.
```

The cost is operational complexity and (for cross-region deployments) commit latency — a write that must reach a Paxos quorum across regions costs more round trips than a single-region MySQL commit. NewSQL is the right answer when the interviewer's system genuinely needs both strict consistency *and* more scale than one relational primary can give — global inventory ledgers, banking systems with multi-region requirements.

## The pragmatic default

Most systems, even ones that will eventually be large, should start relational: Postgres/MySQL with good indexing handles far more scale than people assume (millions of rows, thousands of QPS on modest hardware), and you get flexibility to answer questions you didn't anticipate at design time. Reach for a NoSQL model only when a specific, known access pattern doesn't fit relational well — a cache, a truly schemaless document shape, write volume past what one primary+read-replicas can sustain, or a relationship-heavy query. Picking NoSQL upfront "for scale" you don't have yet trades away flexibility and constraint-enforcement for a scaling problem you may never encounter.

## Trade-offs summary

| Model | Best for | Weak at | Example systems |
|---|---|---|---|
| Relational | Ad-hoc queries, strong invariants, joins | Horizontal write scale, schema churn at huge scale | Postgres, MySQL, SQL Server |
| Key-value | Exact-key lookups at massive scale/low latency | Any query not by key | Redis, DynamoDB |
| Document | Nested, self-contained, evolving objects | Cross-document consistency, joins | MongoDB, Couchbase |
| Column-family | Very high write throughput, time-series | Ad-hoc queries off the partition key | Cassandra, HBase, Bigtable |
| Graph | Relationship traversal queries | Bulk analytics, non-relational lookups | Neo4j, Neptune |
| NewSQL | Relational semantics at distributed scale | Operational complexity, cross-region latency | Spanner, CockroachDB |

## Common interview follow-ups

**Q: How do you decide between MongoDB and Postgres with JSONB columns?**
Postgres's `JSONB` gives you schemaless flexibility for the fields that vary while keeping relational integrity, indexing, and joins for everything else — reach for MongoDB proper only when *most* of your data is document-shaped and you need its horizontal sharding model, not just a few flexible fields.

**Q: Can you get ACID transactions in a document store?**
Yes, within limits — MongoDB supports multi-document ACID transactions since 4.0, but they're more expensive (they hold locks/snapshots across the transaction and don't span shards as cheaply as a single-node relational commit), so document stores are still best treated as "transactional within one document" by default.

**Q: Why not just always use a column-family store since it scales the most?**
Because you pay for that scale with query flexibility — every access pattern must be known and modeled into the partition/clustering key design ahead of time (often requiring denormalized materialized views per query shape), which is a much bigger design and operational burden than a relational schema for a system that doesn't actually need Cassandra-level write throughput.

**Q: Is "eventually consistent" unique to NoSQL?**
No — it's a property of the replication/consensus design, not the data model; Cassandra and DynamoDB default to eventual consistency for availability, but MongoDB defaults to strongly consistent reads from a primary, and Spanner (relational) offers external consistency. See [CAP Theorem](../03-consistency-distributed/cap-theorem.md).

**Q: When would you pick a graph database over a relational one with a `friendships` join table?**
When queries need variable-depth traversal ("within 3 hops") rather than a fixed number of joins — a relational self-join needs one extra join per hop and degrades badly past 2-3 hops, while a graph engine's traversal cost stays close to linear in path length regardless of depth.

**Q: What's the actual reason people say "NoSQL doesn't have schemas" is misleading?**
The schema still exists — it just lives in application code and is enforced (or not) at write time instead of by the database engine; document stores don't eliminate the need to agree on a shape, they move where that agreement is checked, which trades upfront rigor for flexibility and pushes data-quality bugs later into the pipeline.

## Related topics
- [Database Sharding](database-sharding.md)
- [Database Partitioning](database-partitioning.md)
- [Database Replication](database-replication.md)
- [Database Indexing](database-indexing.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
