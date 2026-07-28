I rewrote it into a more user-friendly Markdown version while keeping the senior interview concepts. I simplified the explanations, added mental models, and organized it for easier learning/revision.

````markdown id="8k492"
# Database Indexing

[← Back to index](../readme.md)

## Why This Topic Matters

Database indexing is one of the most important ways to improve query performance.

Interviewers ask about indexes because they want to know if you understand that:

- Indexes make reads faster
- Indexes make writes slower
- The wrong index may provide no benefit
- Index design depends on query patterns

A common beginner assumption:

> "Adding more indexes will always make my database faster."

Not true.

Indexes are a trade-off.

---

# What Is a Database Index?

An index is a separate data structure that helps the database find rows faster.

Without an index:

```
SELECT *
FROM users
WHERE email = 'john@test.com';
```

The database may need to check every row:

```
Users table:

Row 1 → email A
Row 2 → email B
Row 3 → email C
...
Row 50,000,000 → email john@test.com
```

This is called:

```
Full Table Scan
```

Time complexity:

```
O(n)
```

The database checks every row.

---

With an index:

```
Users table

id | email
-----------
1  | a@test.com
2  | b@test.com
3  | john@test.com
```

Index:

```
email index

a@test.com → row 1
b@test.com → row 2
john@test.com → row 3
```

The database can directly find the row.

Time complexity:

```
O(log n)
```

---

# How an Index Works Internally

Most relational databases use:

```
B-Tree Index
```

Example:

```
                 [50]

              /       \

          [20]        [80]

        /    \       /     \

      10     30    60      90
```

The database does not scan every value.

It navigates through the tree:

```
Search 60

Start:

50

60 > 50

Go right

80

60 < 80

Go left

Found 60
```

---

# B-Tree Index

B-tree is the default index type in:

- PostgreSQL
- MySQL
- SQL Server
- Oracle

It supports:

## Equality Search

Example:

```sql
WHERE id = 100
```

Works well.

---

## Range Queries

Example:

```sql
WHERE age > 30
```

Works because values are sorted.

---

## Sorting

Example:

```sql
ORDER BY created_at
```

The database can read already sorted data.

---

## Prefix Search

Example:

```sql
WHERE name LIKE 'John%'
```

Can use an index.

---

# Why B-Tree Is Fast

A B-tree node stores many values.

Example:

```
                 Root

       1-1000 values


             Children

       1000-2000 values


             Leaves

       Actual row locations
```

A billion-row table may only require:

```
3-4 tree levels
```

to find data.

---

# Hash Index

A hash index uses:

```
hash(value) → row location
```

Example:

```
hash("john@test.com")

        ↓

Bucket #123

        ↓

Row location
```

---

## Advantages

Very fast for:

```sql
WHERE email = 'john@test.com'
```

Average:

```
O(1)
```

---

## Disadvantages

Cannot efficiently handle:

```sql
WHERE age > 30
```

or:

```sql
ORDER BY name
```

Because hashing destroys ordering.

Example:

Original:

```
A
B
C
D
```

After hashing:

```
91
12
77
43
```

The order is gone.

---

In practice:

B-tree is preferred most of the time.

---

# LSM Tree Indexes

Some databases optimize for very high write volume.

Examples:

- Cassandra
- RocksDB
- LevelDB
- HBase

They use:

```
LSM Tree
(Log Structured Merge Tree)
```

---

# How LSM Works

Write flow:

```
Application

    |
    ↓

Memory table
(MemTable)

    |
    ↓

Write-Ahead Log

    |
    ↓

SSTable files on disk
```

Data is written sequentially.

---

Later:

```
Small SSTables

      +

Small SSTables

      ↓

Compaction

      ↓

Large optimized SSTable
```

---

# Why LSM Is Good for Writes

B-tree:

```
Write

↓

Find location

↓

Modify tree

↓

Rebalance
```

More random disk operations.

---

LSM:

```
Write

↓

Append data

↓

Sort later
```

Sequential writes are much faster.

---

Trade-off:

| Feature | B-tree | LSM |
|-|-|-|
| Reads | Faster | Usually slower |
| Writes | Slower | Faster |
| Storage | Less duplication | More temporary files |
| Examples | PostgreSQL | Cassandra |

---

# Composite Indexes

A composite index contains multiple columns.

Example:

```sql
CREATE INDEX idx_orders
ON orders(user_id, status, created_at);
```

This creates one index:

```
(user_id)

    ↓

(status)

    ↓

(created_at)
```

It is not three separate indexes.

---

# Leftmost Prefix Rule

A composite index works from left to right.

Index:

```
(user_id, status, created_at)
```

Works:

```sql
WHERE user_id = 10
```

✅

---

Works:

```sql
WHERE user_id = 10
AND status='paid'
```

✅

---

Works:

```sql
WHERE user_id = 10
AND status='paid'
AND created_at > '2025-01-01'
```

✅

---

Does not work well:

```sql
WHERE status='paid'
```

❌

Because the index starts with:

```
user_id
```

The database cannot jump directly to status.

---

# Choosing Column Order

Example query:

```sql
SELECT *
FROM orders
WHERE user_id = 10
AND status='completed'
ORDER BY created_at;
```

Good index:

```sql
(user_id, status, created_at)
```

Why?

First:

```
Find user
```

Then:

```
Filter status
```

Then:

```
Read sorted created_at values
```

---

General rule:

Put:

1. Frequently filtered columns first
2. Equality columns before range columns

Example:

Better:

```
(status, created_at)
```

for:

```sql
WHERE status='paid'
ORDER BY created_at
```

---

# Covering Index

A covering index contains all data needed by a query.

Example:

Query:

```sql
SELECT total, created_at
FROM orders
WHERE user_id=10;
```

Index:

```sql
CREATE INDEX idx_orders
ON orders(user_id)
INCLUDE(total, created_at);
```

Now:

```
Database

     |
     ↓

Index

     |
     ↓

Return result
```

It does not need to read the original table.

---

Without covering index:

```
Index

 ↓

Find row location

 ↓

Read table data
```

Extra disk access.

---

With covering index:

```
Index

 ↓

Return data
```

Faster.

---

# When Indexes Hurt

Indexes are not free.

Every write must update indexes.

Example:

Table:

```
users
```

Indexes:

```
1. email
2. username
3. phone
4. created_at
5. status
```

Insert:

```sql
INSERT INTO users(...)
```

Database updates:

```
Table

+

5 indexes
```

---

Problems:

## 1. Slower Writes

More indexes:

```
INSERT
UPDATE
DELETE
```

become slower.

---

## 2. More Storage

Indexes consume disk space.

---

## 3. Cache Pressure

Indexes compete with table data in memory.

Too many indexes can remove useful data from cache.

---

# Query Planner and EXPLAIN

The database decides:

```
Should I use the index?

or

Should I scan the table?
```

It uses:

- Table statistics
- Number of matching rows
- Query cost

---

Example:

```sql
SELECT *
FROM orders
WHERE status='active';
```

If:

```
95% of rows are active
```

The database may choose:

```
Full table scan
```

because reading everything is cheaper.

---

Example:

```sql
WHERE user_id=12345
```

If:

```
0.001% of rows match
```

Index is better.

---

# EXPLAIN Example

```sql
EXPLAIN ANALYZE
SELECT *
FROM orders
WHERE user_id=42;
```

Possible result:

```
Index Scan using idx_user_id

Index Cond:
(user_id = 42)

Execution Time:
0.03 ms
```

Meaning:

The index was used.

---

If you expected an index but see:

```
Seq Scan
```

Check:

## 1. Does the index exist?

```sql
SHOW INDEXES;
```

---

## 2. Is a function blocking it?

Example:

```sql
WHERE LOWER(email)= 'test@test.com'
```

Normal index:

```
email
```

cannot help.

Need:

```sql
CREATE INDEX
ON users(LOWER(email));
```

---

## 3. Are statistics updated?

Run:

```sql
ANALYZE users;
```

---

# Full Text Search Indexes

B-tree is not good for:

```sql
WHERE description contains "database"
```

because it searches inside text.

For this, databases use:

```
Inverted Index
```

Example:

Documents:

```
Doc1:
"database indexing"

Doc2:
"database scaling"
```

Index:

```
database

 ↓

Doc1, Doc2


indexing

 ↓

Doc1
```

---

PostgreSQL uses:

```
GIN Index
```

Common for:

- Full text search
- JSONB queries

---

# Index Type Comparison

| Index Type | Equality | Range | Write Cost | Use Case |
|-|-|-|-|-|
| B-tree | Yes | Yes | Medium | Normal database queries |
| Hash | Yes | No | Medium | Exact lookup only |
| LSM | Yes | Yes | Low | High-write systems |
| GIN | Text search | No | Higher | Search / JSON |

---

# Common Interview Questions

## Q: Why not add indexes everywhere?

Because:

- Every write updates indexes
- Indexes consume storage
- Some indexes are never used
- Low-selectivity indexes may not help

More indexes ≠ faster database.

---

## Q: How would you index:

```sql
WHERE status='paid'
ORDER BY created_at
```

Answer:

```sql
(status, created_at)
```

Because:

- status filters rows
- created_at provides ordering

---

## Q: What is an index-only scan?

When the query gets everything from the index.

No table lookup required.

Faster because:

```
Index

instead of

Index → Table → Data
```

---

## Q: Why do Cassandra-style databases use LSM?

Because writes are sequential.

They avoid expensive random updates.

Trade-off:

- Faster writes
- More complex reads

---

## Q: Why doesn't this query use my index?

Example:

```sql
WHERE LOWER(email)=?
```

Because:

```
Index:

original email values


Query:

modified email values
```

The database cannot use it.

Solution:

Create a functional index.

---

# Key Takeaways

Remember these points:

1. Indexes make reads faster by avoiding full table scans.
2. B-tree is the default index for relational databases.
3. Composite indexes follow the leftmost prefix rule.
4. Column order matters.
5. Equality filters usually come before range filters.
6. Covering indexes avoid extra table reads.
7. Every index increases write cost.
8. Use EXPLAIN ANALYZE to verify index usage.
9. LSM trees trade read complexity for extremely fast writes.
10. The best index is designed around actual query patterns.
````


## Related topics
- [Database Sharding](database-sharding.md)
- [Database Partitioning](database-partitioning.md)
- [SQL vs NoSQL](sql-vs-nosql.md)
- [Database Migration at Scale](database-migration-at-scale.md)
- [Search Architecture / Elasticsearch](../09-large-scale-data-systems/search-architecture-elasticsearch.md)
