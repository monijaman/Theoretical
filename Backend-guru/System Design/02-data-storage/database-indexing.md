# Database Indexing
[← Back to index](../readme.md)

## Why it's asked

An index is the single highest-leverage lever for query performance, and interviewers use it to check whether you understand indexes as a *trade-off*, not a free win — every index speeds up some reads and slows down every write, and picking the wrong structure or column order silently produces an index that's never used at all.

## What an index actually is

An index is a separate, ordered data structure that maps column value → row location, so the engine can find matching rows without scanning the whole table. Without one, `WHERE email = 'x@y.com'` on a 50M-row table means reading every row (a sequential/full table scan).

```
Table (heap, unordered):
  row 1: id=88, email=z@y.com
  row 2: id=12, email=a@y.com
  row 3: id=41, email=x@y.com   ← the one we want, but we don't know that yet

Index on email (B-tree, ordered):
  a@y.com  → row 2
  x@y.com  → row 3   ← binary search finds this in O(log n), not O(n)
  z@y.com  → row 1
```

## B-tree vs hash vs LSM-backed indexes

### B-tree (the default almost everywhere)
Postgres, MySQL/InnoDB, and SQL Server all default to B-tree (technically B+tree) indexes: a balanced tree where every leaf is at the same depth, and leaves are linked for efficient range scans.

```
                [ M ]
              /       \
         [ D, H ]      [ R, W ]
        /   |   \      /   |   \
      A-C  E-G  I-L  N-Q  S-V  X-Z
```

- Supports equality (`=`), range (`>`, `<`, `BETWEEN`), prefix (`LIKE 'abc%'`), and `ORDER BY` for free since leaves are sorted.
- Lookup and insert are both O(log n); depth stays shallow (a B-tree over a billion rows is typically only 3-4 levels deep) because each node holds many keys, not just two.

### Hash index
Maps `hash(key) → row location` in a bucket structure.

- O(1) average lookup for exact equality — faster than a B-tree for `WHERE id = 42`, in theory.
- Useless for range queries (`>`, `<`, `BETWEEN`) and can't support `ORDER BY` — the hash destroys ordering.
- Postgres has hash indexes but they're rarely chosen over B-tree in practice because the win over B-tree equality lookups is marginal while the loss of range-query capability is total; MySQL's Memory engine and Redis hashes are common real uses.

### LSM-tree-backed indexes (write-optimized)
Cassandra, RocksDB, LevelDB, and HBase build indexes over a Log-Structured Merge tree instead of updating a B-tree in place: writes go to an in-memory memtable + append-only WAL, get flushed to sorted immutable SSTable files on disk, and background compaction merges SSTables and removes obsolete/deleted entries.

```
Write path:  write → memtable (in-memory) → flush → SSTable (disk, sorted, immutable)
                                                          │
                                        compaction merges multiple SSTables → fewer, larger files
Read path:   check memtable → check bloom filter per SSTable → check matching SSTables (newest first)
```

- Writes are always sequential appends (no random-write seek cost), which is why LSM-backed stores handle far higher write throughput than a B-tree updated in place.
- Reads can be slower/more variable — a key might need to be checked against several SSTables before found — mitigated by bloom filters (skip SSTables that definitely don't contain the key) and compaction (reduce SSTable count).
- This is the fundamental trade-off underlying "Cassandra writes fast, reads need tuning": it's a direct consequence of the LSM structure, not an implementation quirk.

## Composite index column order

A multi-column index `(a, b, c)` is a single B-tree sorted first by `a`, then by `b` within each `a`, then by `c` within each `b` — **not three separate indexes.**

```sql
CREATE INDEX idx_orders ON orders (user_id, status, created_at);
```

- Usable for: `WHERE user_id = ?`, `WHERE user_id = ? AND status = ?`, `WHERE user_id = ? AND status = ? AND created_at > ?` — any *left-prefix* of the column list.
- **Not** usable (or only partially, via an index skip scan on some engines) for: `WHERE status = ?` alone, or `WHERE created_at > ?` alone — the tree isn't sorted by those columns independent of `user_id`.
- Rule of thumb for column order: highest-selectivity / most-frequently-filtered-alone column first, unless a specific query pattern dictates otherwise; equality columns before range columns (put `status = ?` before `created_at > ?`, because once a range starts, the sort order for subsequent columns stops helping).

## Covering indexes

An index "covers" a query when every column the query needs (`SELECT` list + `WHERE` + `ORDER BY`) is present in the index itself, so the engine never touches the underlying table (heap) at all.

```sql
CREATE INDEX idx_covering ON orders (user_id, status) INCLUDE (total, created_at);

SELECT total, created_at FROM orders WHERE user_id = 42 AND status = 'shipped';
-- Postgres: "Index Only Scan" — no heap fetch needed
```

This avoids the extra random I/O of "index says row is at block 8842, now go read block 8842" (called a bookmark lookup / heap fetch), which matters enormously when the table doesn't fit in memory.

## When an index hurts

Every index is a second data structure that must be updated on every `INSERT`/`UPDATE`/`DELETE` to the indexed columns — this isn't free:

- A table with 10 indexes means every write updates 10 B-trees (or LSM structures), multiplying write amplification and slowing write-heavy workloads.
- Indexes also consume disk and cache (buffer pool) space, competing with table data for memory — an over-indexed table can push hot data pages out of cache.
- A common real failure mode: a well-intentioned engineer adds an index "just in case" on a high-write table (e.g., an events/audit table), and write latency/throughput regresses noticeably with no query ever benefiting, because nothing selects by that column.

## Query planner / EXPLAIN basics

The planner decides whether to use an index at all, based on estimated **selectivity** — the fraction of rows a condition is expected to match. Low selectivity (e.g., `status = 'active'` matching 95% of rows) usually means a full table scan is actually *cheaper* than an index lookup plus that many bookmark fetches; high selectivity (`user_id = 42` matching 0.0001% of rows) makes the index a clear win.

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 42;

--  Index Scan using idx_orders_user_id on orders
--    Index Cond: (user_id = 42)
--    Rows Removed by Filter: 0
--    Planning Time: 0.09 ms   Execution Time: 0.03 ms
```

If `EXPLAIN` shows a `Seq Scan` where you expected an `Index Scan`, check: does an index even exist on that column; is the column wrapped in a function (`WHERE LOWER(email) = ...` needs a matching functional/expression index); are statistics stale (`ANALYZE` the table); is selectivity actually low enough that a scan is genuinely cheaper.

## Full-text / GIN indexes (briefly)

Standard B-tree indexes can't efficiently answer "does this text column contain word X." Postgres's **GIN** (Generalized Inverted Index) inverts the relationship — mapping each token/lexeme to the set of rows containing it, similar in spirit to a search engine's inverted index — and backs both full-text search (`tsvector`/`tsquery`) and JSONB containment queries (`@>`). Elasticsearch's core data structure is the same idea (an inverted index) at a much larger, distributed scale; see [Search Architecture / Elasticsearch](../09-large-scale-data-systems/search-architecture-elasticsearch.md).

## Trade-offs summary

| Index type | Equality | Range | Write cost | Typical use |
|---|---|---|---|---|
| B-tree | Yes | Yes | Moderate | Default for OLTP relational tables |
| Hash | Yes (fast) | No | Moderate | Pure exact-match lookups (rare in practice vs B-tree) |
| LSM-backed | Yes | Yes (slower) | Low (sequential writes) | Very high write-throughput stores (Cassandra, RocksDB) |
| GIN / inverted | Contains/full-text | N/A | Higher (multi-entry per row) | Full-text search, JSONB containment |

## Common interview follow-ups

**Q: Why doesn't adding an index on every filtered column always help?**
Because the planner picks one access path per table per query (or merges a couple via bitmap index scans) based on selectivity, and because every extra index adds write overhead — past a certain point more indexes make writes slower without making any real query faster, especially on low-selectivity columns.

**Q: How would you index a table for a query that filters on `status` and sorts by `created_at`?**
A composite index `(status, created_at)` lets the engine do an equality lookup on `status` then read `created_at`-sorted rows directly off the index without a separate sort step — critical for `ORDER BY ... LIMIT` pagination queries at scale.

**Q: What's an index-only scan and why is it faster?**
It's when every column the query needs is present in the index itself, so the engine skips the heap fetch (the extra random I/O of going from index entry to actual row on disk) entirely — turning what would be index-lookup-plus-N-random-reads into just the index lookup.

**Q: Why do write-heavy systems like Cassandra prefer LSM trees over B-trees?**
Because LSM writes are always sequential appends to an in-memory structure and a WAL, avoiding the random-write seeks a B-tree needs to keep itself balanced and sorted in place — at the cost of read amplification (checking multiple SSTables), which is mitigated with bloom filters and compaction.

**Q: A query got slow after adding a `LOWER(email)` filter — why doesn't the existing index on `email` help?**
Because a plain B-tree index is sorted by the raw column value, not by the result of a function applied to it; the fix is a functional/expression index — `CREATE INDEX ON users (LOWER(email))` — so the tree is sorted by the actual expression the query filters on.

**Q: How do you decide if an index will actually get used before adding it in production?**
Test with `EXPLAIN ANALYZE` on representative data volume and value distribution (not a tiny dev dataset), check the estimated selectivity of the condition, and confirm the column isn't wrapped in a function/type cast that would block index use.

## Related topics
- [Database Sharding](database-sharding.md)
- [Database Partitioning](database-partitioning.md)
- [SQL vs NoSQL](sql-vs-nosql.md)
- [Database Migration at Scale](database-migration-at-scale.md)
- [Search Architecture / Elasticsearch](../09-large-scale-data-systems/search-architecture-elasticsearch.md)
