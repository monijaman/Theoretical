# Database Sharding

[← Back to index](../readme.md)

## Why This Topic Matters

A single database server has limits:

- CPU
- Memory
- Disk capacity
- Write throughput

Replication helps with:

```
More reads
Higher availability
```

But replication does **not** solve:

```
Too much data

or

Too many writes
```

Why?

Because every replica contains the same data.

Example:

```
Primary Database

10 TB data

        |
        |
 -----------------

Replica 1      Replica 2

10 TB          10 TB
```

The write still goes to one primary.

---

# What Is Sharding?

Sharding splits data horizontally across multiple database servers.

Instead of:

```
One huge database

10 TB
```

you create:

```
Shard 1

3 TB


Shard 2

4 TB


Shard 3

3 TB
```

Each shard owns only part of the data.

---

# Sharding Architecture

Typical design:

```
                 Application

                      |
                      ↓

                Query Router

                      |
        --------------------------------

        ↓              ↓              ↓

     Shard 1        Shard 2        Shard 3

     Users          Users          Users

     1-1M           1M-2M          2M-3M
```

The application usually does not directly know where data lives.

A router decides:

```
Which shard owns this data?
```

---

# Sharding vs Replication

They solve different problems.

| Feature | Replication | Sharding |
|-|-|-|
| Copies data? | Yes | No |
| Improves reads? | Yes | Sometimes |
| Improves writes? | No | Yes |
| Increases storage capacity? | No | Yes |
| Multiple machines? | Yes | Yes |

Example:

Replication:

```
Same users table

Primary
Replica
Replica
```

Sharding:

```
Shard 1

Users 1-1M


Shard 2

Users 1M-2M
```

---

# Shard Key

The shard key decides where a row is stored.

Example:

Users table:

```
users

id
name
email
```

Shard key:

```
user_id
```

Example:

```
hash(user_id)

        ↓

Shard number
```

---

# Choosing a Good Shard Key

Shard key selection is one of the hardest database decisions.

A bad shard key creates production problems.

---

## 1. High Cardinality

Good shard keys have many unique values.

Good:

```
user_id

10 million unique users
```

Bad:

```
country

200 countries
```

Why?

Because data may become uneven.

Example:

```
US shard

90% data


Other countries

10% data
```

---

## 2. Even Distribution

A good shard key spreads:

- Data size
- Requests
- Writes

Example:

Good:

```
hash(user_id)
```

Distribution:

```
Shard 1: 33%

Shard 2: 34%

Shard 3: 33%
```

---

Bad:

```
signup_date
```

Because:

```
2026 users

        ↓

Newest shard gets all writes
```

Result:

```
Hot shard
```

---

## 3. Match Query Patterns

Most queries should hit one shard.

Good:

Query:

```sql
Get orders for customer 123
```

Shard key:

```
customer_id
```

Database knows:

```
Customer 123

↓

Shard 2
```

---

Bad:

Query:

```sql
Find all customers named John
```

Need:

```
Shard 1 search

+

Shard 2 search

+

Shard 3 search
```

This is called:

```
Scatter-gather query
```

---

# Sharding Strategies

There are four common approaches.

---

# 1. Range-Based Sharding

Data is divided by ranges.

Example:

```
User IDs:

0 - 1,000,000

        ↓

Shard 1


1,000,001 - 2,000,000

        ↓

Shard 2
```

Architecture:

```
Shard 1

[0 - 1000]


Shard 2

[1001 - 2000]


Shard 3

[2001 - 3000]
```

---

## Advantages

Easy to understand.

Range queries are fast.

Example:

```
Find users 1000-2000
```

Only one shard.

---

## Disadvantages

Hot shards.

Example:

Auto-increment IDs:

```
Newest users

1000000
1000001
1000002
```

All writes go to:

```
Latest shard
```

---

# 2. Hash-Based Sharding

Use a hash function.

Example:

```
hash(user_id) % number_of_shards
```

Example:

```
hash(100)

↓

Shard 2
```

---

## Advantages

Data spreads evenly.

Avoids hot ranges.

---

## Disadvantages

Range queries become expensive.

Example:

Find:

```
Users 1-10000
```

May require:

```
Shard 1

+

Shard 2

+

Shard 3
```

---

## Resizing Problem

With:

```
hash(user_id) % 3
```

If you add another shard:

```
hash(user_id) % 4
```

Almost every row changes location.

This causes massive data movement.

---

# 3. Consistent Hashing

Consistent hashing solves the resizing problem.

Instead of:

```
hash(key) % N
```

we create a ring.

```
             0

        Shard A


   Shard D       Shard B


        Shard C
```

Both:

- Data keys
- Shards

are placed on the ring.

A key belongs to the next shard clockwise.

---

Example:

```
User hash:

500


Move clockwise:

↓

Shard B owns it
```

---

# Adding a New Shard

Normal hashing:

```
Add shard

↓

Move almost everything
```

Consistent hashing:

```
Add shard

↓

Move only nearby keys
```

Much less data movement.

---

# Virtual Nodes

A single point per shard can create imbalance.

Example:

```
Shard A

owns huge area


Shard B

owns tiny area
```

Solution:

Virtual nodes.

Instead of:

```
Shard A = 1 point
```

Use:

```
Shard A = 100 virtual points
```

Benefits:

- Better distribution
- Easier balancing

Used in systems like:

- Cassandra
- Dynamo-style databases
- Distributed caches

---

# 4. Directory-Based Sharding

Instead of calculating:

```
hash(customer_id)
```

use a lookup table.

Example:

```
Customer ID

        ↓

Shard Directory


Customer 101 → Shard 1

Customer 202 → Shard 3
```

---

## Advantages

Very flexible.

You can:

- Move individual customers
- Isolate large customers
- Create dedicated shards

Example:

```
Normal customers

↓

Shared shards


Enterprise customer

↓

Dedicated shard
```

---

## Disadvantages

The directory becomes critical.

Need:

- High availability
- Fast lookup
- Backup strategy

---

# Hot Shards

A hot shard happens when one shard receives too much traffic.

Example:

Social network:

Shard key:

```
celebrity_user_id
```

One celebrity:

```
100 million followers
```

Result:

```
Shard 5

CPU 100%

Requests overloaded
```

---

# Detecting Hot Shards

Monitor per shard:

```
CPU usage

Memory

Disk IO

Queries/sec

Write rate

Latency
```

Example:

```
Shard 1:

CPU 40%


Shard 2:

CPU 45%


Shard 3:

CPU 99%
```

Shard 3 is hot.

---

# Fixing Hot Shards

Options:

## 1. Better Shard Key

Change:

```
celebrity_id
```

to:

```
user_id
```

---

## 2. Add Random Suffix (Salting)

Instead of:

```
celebrity_123
```

Use:

```
celebrity_123_1

celebrity_123_2

celebrity_123_3
```

Spread writes.

---

## 3. Split the Shard

Move part of the data:

Before:

```
Shard A

All users
```

After:

```
Shard A

Users 1-5M


Shard B

Users 5M-10M
```

---

# Resharding

Adding shards is difficult.

Example:

Before:

```
Shard 1

Users A-M


Shard 2

Users N-Z
```

Need:

```
Add Shard 3
```

New:

```
Shard 1

A-F


Shard 3

G-M


Shard 2

N-Z
```

---

# How Resharding Works

Typical process:

## Step 1

Create new shard.

```
Shard 3
```

---

## Step 2

Copy existing data.

```
Old shard

      ↓

New shard
```

---

## Step 3

Capture new writes.

Options:

- Dual writes
- Change Data Capture (CDC)

---

## Step 4

Verify data.

Check:

```
Counts

Checksums

Consistency
```

---

## Step 5

Switch routing.

Before:

```
User 500

↓

Shard 1
```

After:

```
User 500

↓

Shard 3
```

---

# Real-World Examples

## Vitess

Used for large MySQL deployments.

Architecture:

```
Application

      |

VTGate router

      |

MySQL shards
```

Provides:

- Query routing
- Online resharding
- Shard management

---

## MongoDB Sharding

Architecture:

```
Application

      |

mongos router

      |

----------------

Shard 1

Shard 2

Shard 3
```

Uses:

- Config servers
- Chunk migration
- Automatic balancing

---

## Citus (PostgreSQL)

Distributes PostgreSQL tables.

Example:

```
Coordinator

      |

Workers

Worker 1
Worker 2
Worker 3
```

Good for:

- Analytics
- Multi-tenant applications

---

## DynamoDB

AWS hides the shard management.

You choose:

```
Partition key
```

AWS decides:

```
Which storage node
```

Still:

Bad partition keys create:

```
Hot partitions
```

---

# Sharding Strategy Comparison

| Strategy | Advantages | Disadvantages | Best For |
|-|-|-|-|
| Range | Simple, fast ranges | Hot shards | Time-based data |
| Hash | Even distribution | Hard range queries | High-write systems |
| Consistent Hash | Easy scaling | More complexity | Distributed systems |
| Directory | Maximum control | Directory dependency | Multi-tenant SaaS |

---

# Common Interview Questions

## Q: How do you choose a shard key?

Answer:

Look for:

1. High cardinality
2. Even distribution
3. Query patterns
4. Avoid hot spots

Example:

For SaaS:

```
tenant_id
```

because tenant queries stay on one shard.

---

## Q: What if a query needs data from all shards?

Example:

```
Global leaderboard
```

Options:

### Scatter-gather

```
Query all shards

↓

Merge results
```

Problem:

- Higher latency
- More failures

---

### Maintain Aggregates

Create:

```
Leaderboard table

or

Materialized view
```

updated through events.

---

## Q: How do you reshard without downtime?

Use:

```
Copy data

+

Capture new writes

+

Verify

+

Switch routing
```

Same idea as expand-contract migrations.

---

## Q: Sharding vs partitioning?

Sharding:

```
Multiple machines
```

Partitioning:

```
Multiple pieces inside one database
```

They can be combined.

Example:

```
Shard by tenant_id

Partition by created_at
```

---

## Q: What is a hot shard?

A shard receiving too much:

- Traffic
- Data
- Writes

Fix with:

- Better shard key
- Splitting
- Salting
- Dedicated shards

---

# Key Takeaways

Remember:

1. Sharding scales beyond one database machine.
2. Replication improves reads; sharding improves capacity.
3. The shard key is the most important decision.
4. Good shard keys distribute load evenly.
5. Avoid scatter-gather queries.
6. Range sharding is simple but can create hot spots.
7. Hash sharding distributes better but hurts range queries.
8. Consistent hashing makes scaling easier.
9. Resharding is a major migration project.
10. Large systems often combine sharding with partitioning.

## Related topics

- [Database Partitioning](database-partitioning.md)
- [Database Replication](database-replication.md)
- [Database Migration at Scale](database-migration-at-scale.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Quorum](../03-consistency-distributed/quorum.md)
- [Load Balancing](../01-scaling-traffic/load-balancing.md)
- [Multi-Tenant Architecture](../07-architecture-patterns/multi-tenant-architecture.md)
- [Multi-Tenant SaaS](../10-system-design-practice/multi-tenant-saas.md)
