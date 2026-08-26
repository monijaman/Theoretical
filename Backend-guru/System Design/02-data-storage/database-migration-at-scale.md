# Database Migration at Scale

[← Back to index](../readme.md)

## Why This Topic Matters

Changing a database schema sounds simple:

```sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

On a small database:

```
100 rows
→ finishes instantly
```

On a large production database:

```
500 million rows
→ possible downtime
→ replication problems
→ blocked traffic
```

Interviewers ask this topic because senior engineers need to understand:

- Schema changes are not always instant
- Large data changes need careful planning
- Production databases cannot simply be locked for hours
- Migration strategy must support zero downtime

---

# The Problem With Large ALTER TABLE

A schema change can require the database to:

1. Lock the table
2. Copy all existing rows
3. Rewrite data on disk
4. Update indexes
5. Replicate the operation to followers

Example:

```sql
ALTER TABLE users
ADD COLUMN last_login TIMESTAMP;
```

Depending on the database version:

```
Small table:

Add column
    |
    ↓
Done


Large table:

Lock table
    |
    ↓
Rewrite millions of rows
    |
    ↓
Wait hours
```

---

# Why Table Locks Are Dangerous

Imagine:

```
Application

    |
    |
    ↓

Users table
(500 million rows)
```

Migration starts:

```
ALTER TABLE users ...
```

Database:

```
Lock users table

        ↓

Rewrite data

        ↓

Unlock table
```

During this time:

```
INSERT user
       |
       X
       |
    Blocked


UPDATE user
       |
       X
       |
    Blocked
```

Users experience:

- Slow requests
- Timeouts
- Failed transactions

---

# Additional Problems

## 1. Replication Lag

Production databases usually have replicas:

```
Primary Database

        |
        ↓

Read Replicas
```

A large migration creates a huge replication event.

Example:

```
Primary:

Rewrite 500M rows


Replica:

Trying to replay changes
```

Result:

```
Replica falls behind

↓

Users see stale data
```

---

## 2. Extra Disk Usage

During a rewrite:

```
Old table

+

New rewritten table

=

2x storage temporarily
```

A 1TB table may require several TB of free space.

---

# The Safe Solution: Expand-Contract Pattern

The main idea:

> Never make a dangerous schema change in one step.

Instead:

```
Expand

↓

Move data

↓

Switch application

↓

Remove old schema
```

---

# Example: Rename email Column

Goal:

Change:

```sql
email
```

to:

```sql
email_address
```

---

## Step 1: Expand

Add the new column.

```sql
ALTER TABLE users
ADD COLUMN email_address TEXT;
```

Important:

Make it nullable.

Why?

Because old application code does not know about it yet.

Current state:

```
users table

id
email
email_address
```

---

## Step 2: Dual Write

Update application code.

Old:

```javascript
saveUser({
 email:"john@test.com"
})
```

New:

```javascript
saveUser({
 email:"john@test.com",
 email_address:"john@test.com"
})
```

Now every new update writes both columns.

```
Application

      |
      |
      ↓

email

email_address
```

---

## Step 3: Backfill Existing Data

Old users only have:

```
email
```

Need:

```
email_address
```

Copy existing data:

```
Before:

id | email | email_address

1  | a@test.com | NULL


After:

id | email | email_address

1  | a@test.com | a@test.com
```

---

## Step 4: Verify

Check that data matches.

Example:

```
Total users:

500 million


email matches email_address:

500 million
```

Only continue if everything is correct.

---

## Step 5: Cutover

Change application reads.

Before:

```sql
SELECT email
FROM users;
```

After:

```sql
SELECT email_address
FROM users;
```

Now the application uses the new column.

---

## Step 6: Contract

Remove old code.

Stop writing:

```
email
```

Later:

```sql
DROP COLUMN email;
```

---

# Complete Migration Flow

```
                EXPAND

          Add new column

                |
                ↓

            DUAL WRITE

      Write old + new columns

                |
                ↓

             BACKFILL

       Copy old data gradually

                |
                ↓

             VERIFY

          Compare data

                |
                ↓

             CUTOVER

        Read new column

                |
                ↓

            CONTRACT

        Remove old column
```

---

# Why Expand-Contract Is Safe

At every point:

```
Old application works

AND

New application works
```

Example:

During deployment:

```
Old servers

       |
       ↓

email column


New servers

       |
       ↓

email + email_address
```

Both versions work.

This is important because deployments happen gradually.

---

# Online Schema Migration Tools

For very large databases, companies use specialized tools.

Common tools:

- gh-ost
- pt-online-schema-change
- pg_repack

---

# gh-ost (GitHub Online Schema Migration)

Used for MySQL.

Idea:

Create a new table:

```
users

(old)


users_ghost

(new schema)
```

Copy data:

```
users

   |
   |
   ↓

users_ghost
```

While copying, new writes continue.

How?

gh-ost reads MySQL binary logs:

```
Application Write

        |
        ↓

Original Table

        |
        ↓

Binary Log

        |
        ↓

Ghost Table
```

When finished:

```
Rename:

users
   ↓
users_old


users_ghost
   ↓
users
```

The swap is atomic.

---

# pt-online-schema-change

Percona tool.

Similar goal:

```
Old table

      +

New table
```

But it uses triggers.

Flow:

```
Create new table

       ↓

Copy rows

       ↓

Triggers copy new changes

       ↓

Swap tables
```

Problem:

Every write triggers extra work.

Example:

Normal:

```
INSERT

 ↓

users table
```

With migration:

```
INSERT

 ↓

users table

 ↓

Trigger

 ↓

new table
```

For very busy tables, this extra overhead matters.

---

# pg_repack (PostgreSQL)

PostgreSQL has MVCC.

Over time tables can become bloated:

```
Old deleted rows

+

New rows

=

Unused space
```

pg_repack rebuilds the table without requiring a long blocking lock.

Common uses:

- Remove table bloat
- Rebuild indexes
- Improve storage layout

---

# Designing a Backfill Job

Backfilling millions of rows is usually the riskiest step.

Bad:

```sql
UPDATE users
SET email_address=email;
```

Problem:

```
Millions of rows

one huge transaction

↓

Locks

↓

Replication lag
```

---

# Better: Batch Processing

Process small chunks.

Example:

```sql
UPDATE users
SET email_address=email
WHERE id > 10000
AND id <= 11000
AND email_address IS NULL;
```

Repeat:

```
Batch 1

10000 rows


Batch 2

10000 rows


Batch 3

10000 rows
```

---

# Backfill Best Practices

## 1. Small Batches

Benefits:

- Short transactions
- Less locking
- Easier recovery

---

## 2. Throttling

Do not run as fast as possible.

Monitor:

```
Database CPU

Replication lag

Query latency
```

Slow down when production is busy.

---

## 3. Idempotency

A failed batch should be safe to run again.

Example:

```sql
WHERE email_address IS NULL
```

If already copied:

```
Skip it
```

---

## 4. Checkpoint Progress

Store progress:

Example:

```
migration_checkpoint

last_processed_id = 5000000
```

If job crashes:

```
Restart from 5000001
```

---

# Zero Downtime Migration Checklist

```
✓ New schema works with old application code

✓ New schema works with new application code

✓ New columns added safely

✓ Backfill runs in batches

✓ Backfill can restart safely

✓ Replication lag is monitored

✓ Data verification happens before cutover

✓ Cutover is a small application change

✓ Old schema remains temporarily

✓ Old column is removed later
```

---

# Migration Strategy Comparison

| Approach | Locking Risk | Write Impact | Best Use |
|-|-|-|-|
| Normal ALTER TABLE | High for large tables | None | Small tables |
| pt-online-schema-change | Low | Trigger overhead | MySQL migrations |
| gh-ost | Very low | Minimal | Large MySQL tables |
| pg_repack | Low | Temporary overhead | PostgreSQL maintenance |
| Expand-contract | Lowest | Dual-write cost | Complex changes |

---

# Common Interview Questions

## Q: Why not run migration during maintenance hours?

Because many systems are:

- Global
- 24/7
- Multi-region

There may be no safe downtime window.

Zero downtime migration avoids depending on maintenance periods.

---

## Q: Why throttle backfills?

Because a huge update can:

- Consume database CPU
- Fill replication logs
- Slow replicas
- Affect users

The migration should behave like a background task, not a production attack.

---

## Q: How does gh-ost avoid blocking writes?

It does not use triggers.

Instead:

```
Binary log

↓

gh-ost

↓

Ghost table
```

It copies changes asynchronously.

---

## Q: When is normal ALTER TABLE safe?

When the operation is truly metadata-only.

Examples:

```
Add nullable column

Simple metadata changes
```

But always check:

- Database version
- Storage engine
- Exact operation

The same SQL can behave differently across versions.

---

## Q: What happens if verification fails?

Because expand-contract keeps the old schema:

```
Old column still exists

↓

Application still works

↓

Fix migration

↓

Retry verification
```

Rollback is simple.

---

# Key Takeaways

Remember:

1. Large schema changes are operational problems, not just SQL problems.
2. Avoid long table locks on production databases.
3. Expand-contract is the standard zero-downtime migration pattern.
4. Backfills should be batched, throttled, and restartable.
5. Online migration tools copy data while production continues running.
6. Keep old schema until the new system is proven stable.
7. A safe migration allows old and new application versions to run together.

## Related topics
- [Database Sharding](database-sharding.md)
- [Database Partitioning](database-partitioning.md)
- [Database Replication](database-replication.md)
- [Database Indexing](database-indexing.md)
- [Zero-Downtime Deployment](../08-reliability-operations/zero-downtime-deployment.md)
- [Distributed Transactions](distributed-transactions.md)
