# Database Partitioning

[← Back to index](../readme.md)

## Why This Topic Matters

Database partitioning is often confused with sharding.

Many engineers say:

> "We partitioned our database."

But they may actually mean sharding.

They are different concepts.

The key difference:

| | Partitioning | Sharding |
|-|-|-|
| Scope | Single database server | Multiple database servers |
| Purpose | Improve query performance and maintenance | Scale beyond one machine |
| Data location | Same database instance | Different machines |
| Complexity | Lower | Higher |

A system can use both:

```
Application

      |
      ↓

Sharding
(split across machines)

      |
      ↓

Partitioning
(split tables inside each database)
```

---

# What Is Database Partitioning?

Partitioning splits one large table into smaller physical pieces.

To the application:

```
orders
```

still looks like one table.

Internally:

```
                 orders

                    |
     --------------------------------

     |              |              |

orders_2024_q1  orders_2024_q2  orders_2024_q3

```

All partitions live:

```
Inside the same database instance
```

---

# Why Use Partitioning?

Large tables create problems:

Example:

```
orders table

5 billion rows
```

Problems:

- Queries scan too much data
- Indexes become huge
- Backups take longer
- Deletes become expensive
- Maintenance becomes slower

Partitioning helps by dividing the workload.

---

# Partitioning vs Sharding Example

## Partitioning

One database:

```
PostgreSQL Server

        |
        ↓

orders table

        |
        |
        ├── orders_january
        ├── orders_february
        └── orders_march
```

Everything is on one machine.

---

## Sharding

Multiple databases:

```
Application

      |
      ↓

Router


      |
      |
 -----------------

 |               |

Shard 1          Shard 2

Server A         Server B


Users 1-5M       Users 5M-10M
```

Data is distributed across machines.

---

# Types of Partitioning

There are three common strategies:

1. Range partitioning
2. List partitioning
3. Hash partitioning

---

# 1. Range Partitioning

Rows are divided by value ranges.

Most common for:

- Time-series data
- Logs
- Events
- Transactions

Example:

```sql
CREATE TABLE orders (
    id BIGINT,
    created_at DATE
)
PARTITION BY RANGE(created_at);
```

Create partitions:

```sql
orders_2024_q1

Jan - Mar


orders_2024_q2

Apr - Jun
```

Data:

```
Order created:

2024-02-10

↓

orders_2024_q1
```

---

# Why Range Partitioning Is Useful

Deleting old data becomes easy.

Without partitioning:

```sql
DELETE FROM logs
WHERE created_at < '2022-01-01';
```

Database must:

```
Find millions of rows

↓

Delete each row

↓

Generate WAL/logs
```

Slow.

---

With partitioning:

```
DROP TABLE logs_2022;
```

Database removes metadata.

Almost instant.

---

# 2. List Partitioning

Partition based on specific values.

Example:

Country-based data:

```
users

        |
        |
 ------------------

 |                |

US users       Europe users
```

Example:

```sql
PARTITION BY LIST(country);
```

Partitions:

```
users_us

country IN ('US')


users_europe

country IN ('DE','FR','UK')
```

Useful for:

- Regions
- Tenant groups
- Categories

---

# 3. Hash Partitioning

Hash decides where data goes.

Example:

```text
hash(customer_id) % 4
```

Result:

```
Customer 101

hash(101)

↓

partition 2
```

Customer 202:

```
hash(202)

↓

partition 1
```

---

Why use hash partitioning?

When you want:

- Even data distribution
- Balanced storage
- Balanced writes

There is no natural range.

---

# Composite Partitioning

You can combine strategies.

Example:

Large order system:

First:

```
Partition by month
```

Then:

```
Hash by customer_id
```

Structure:

```
orders

 |
 |
 +-- January
 |       |
 |       +-- Hash partition 1
 |       +-- Hash partition 2
 |
 |
 +-- February
         |
         +-- Hash partition 1
         +-- Hash partition 2
```

Benefits:

- Easy data deletion by month
- Even write distribution

---

# Partition Pruning

The biggest performance benefit.

The database can skip partitions that do not contain relevant data.

Example:

Query:

```sql
SELECT *
FROM orders
WHERE created_at >= '2024-07-01'
AND created_at < '2024-08-01';
```

Database knows:

```
Need July data only
```

So:

```
Scan:

orders_july


Skip:

orders_january
orders_february
orders_march
...
```

This is called:

```
Partition pruning
```

---

# Without Partition Pruning

Example:

Query:

```sql
SELECT *
FROM orders
WHERE customer_id=100;
```

But partition key is:

```
created_at
```

Database does not know where the customer data exists.

It may scan:

```
January partition

+

February partition

+

March partition

+

...
```

No performance benefit.

---

# Choosing a Partition Key

A good partition key should:

## 1. Match Query Patterns

Good:

Table:

```
events
```

Queries:

```sql
WHERE created_at BETWEEN ...
```

Partition:

```
created_at
```

---

Bad:

Partition:

```
country
```

Queries:

```sql
WHERE event_id=123
```

No pruning benefit.

---

## 2. Have Good Distribution

Avoid:

```
status
```

Example:

```
active = 99%

inactive = 1%
```

One partition becomes huge.

---

# Combining Partitioning and Sharding

Large systems often use both.

Example:

Multi-tenant SaaS:

```
Application

       |
       ↓

Shard Router

       |
 -----------------------

 |                     |

Shard 1              Shard 2

Tenant A-M           Tenant N-Z


Each shard:

events table

      |
      ↓

Partition by month
```

---

The reasons are different:

## Sharding solves:

"One machine is not enough."

Example:

```
10TB data

needs

multiple servers
```

---

## Partitioning solves:

"This table is too large to manage efficiently."

Example:

```
One 10TB table

split into

monthly partitions
```

---

# Real-World Examples

## PostgreSQL

Supports:

```sql
PARTITION BY RANGE

PARTITION BY LIST

PARTITION BY HASH
```

Common use:

- Logs
- Events
- Time-series data

---

## MySQL

Supports:

```
RANGE

LIST

HASH

KEY
```

Often combined with sharding systems.

---

## Cassandra

Important terminology difference:

Cassandra uses:

```
partition key
```

but it means something closer to:

```
shard key
```

It decides:

```
Which node stores the data
```

Not relational table partitioning.

---

## BigQuery / Snowflake

Analytical databases automatically manage partitions.

Example:

Partition by:

```
event_date
```

Query:

```sql
WHERE event_date='2026-01-01'
```

Only scans:

```
one partition
```

Reducing cost.

---

# Partitioning Trade-offs

| Feature | Partitioning | Sharding |
|-|-|-|
| Goal | Better management/performance | Scale capacity |
| Machines | One | Multiple |
| Query complexity | Low | High |
| Cross data queries | Easy | Expensive |
| Maintenance | Easier | Harder |
| Failure isolation | No | Yes |

---

# Common Interview Questions

## Q: If partitioning does not add more servers, why use it?

Because huge tables create maintenance problems.

Partitioning improves:

- Query speed through pruning
- Index management
- Backup operations
- Data deletion
- Vacuum/maintenance

---

## Q: Can partition pruning fail?

Yes.

Example:

Partition key:

```
created_at
```

Query:

```sql
WHERE customer_id=10
```

Database cannot know which partition contains the data.

It scans everything.

---

## Q: How do you migrate a huge table to partitions?

Use expand-contract:

1. Create new partitioned table
2. Copy old data gradually
3. Dual write new changes
4. Verify data
5. Switch application
6. Remove old table

Same pattern as zero-downtime schema migration.

---

## Q: When would you partition but not shard?

Example:

A logging system:

```
One powerful PostgreSQL server

+

Huge events table
```

Need:

- Easier retention
- Faster queries

But one server is enough.

---

## Q: When would you shard but not partition?

Example:

SaaS application:

```
100 tenants

Each tenant has small data
```

Need:

```
Multiple databases
```

but each table is manageable.

---

## Q: Should partition key and shard key be the same?

Usually no.

They solve different problems.

Example:

Shard key:

```
tenant_id
```

Reason:

Spread tenants across machines.

Partition key:

```
created_at
```

Reason:

Efficient time-based queries.

---

# Key Takeaways

Remember:

1. Partitioning splits one table inside one database.
2. Sharding splits data across multiple databases.
3. They solve different scaling problems.
4. Range partitioning is common for time-series data.
5. Partition pruning is the main performance benefit.
6. The partition key should match query patterns.
7. Partitioning helps maintenance and retention.
8. Large systems often use both sharding and partitioning.
9. A bad partition key gives little or no benefit.
10. Partitioning improves manageability; sharding improves capacity.

## Related topics

- [Database Sharding](database-sharding.md)
- [Database Replication](database-replication.md)
- [Database Indexing](database-indexing.md)
- [Database Migration at Scale](database-migration-at-scale.md)
- [Data Lake vs Data Warehouse](../09-large-scale-data-systems/data-lake-vs-data-warehouse.md)
