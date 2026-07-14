# Database Migration at Scale
[← Back to index](../readme.md)

## Why it's asked

"Add a column" is a no-op on a toy database and a production incident on a billion-row table. Interviewers ask this to check whether you know that schema changes aren't free at scale — some `ALTER TABLE` variants block every read and write on the table for the duration of a rewrite — and whether you know the standard pattern (expand-contract) and tooling (gh-ost, pt-online-schema-change) that let large companies ship schema changes without downtime.

## Why `ALTER TABLE` locks matter at scale

Many schema changes require the database to take an exclusive lock on the table and, for some operations, rewrite every row to disk.

```
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
  -- Postgres (≥11), MySQL 8 with INSTANT ADD COLUMN: near-instant, metadata-only
  -- Older MySQL / adding a NOT NULL column with a non-null default pre-8.0:
  --   full table rewrite — every row copied to a new table file
  --   table locked (or heavily contended) for the duration

ALTER TABLE users ALTER COLUMN status TYPE VARCHAR(50);  -- type change
  -- almost always a full rewrite: every row's value must be re-encoded
```

On a 5-row dev table this finishes in milliseconds. On a 500M-row production table, a full rewrite can take hours, during which:

- The table is locked for writes (and sometimes reads) for MySQL's older `ALGORITHM=COPY` default, or MySQL 8's online DDL blocks writes briefly at the start/end even when the bulk of the operation happens in the background.
- Replication lag spikes — the huge rewrite operation itself is a giant transaction that has to replicate to every follower, and followers apply it serially, falling behind on all other traffic queued behind it.
- Disk usage temporarily doubles (old table + new table coexist during the rewrite).

```
Naive ALTER TABLE on a huge table:

  App writes ──X── blocked/queued ──X──  (locked for rewrite duration)
                         │
              [ rewriting 500M rows, minutes to hours ]
                         │
  App writes ──────────────────────────── resumes
```

This is why "just run the migration" is the wrong instinct past a certain table size — the safe pattern separates the *schema change* from the *data change* and never takes a long-held lock on a hot table.

## The expand-contract pattern

Expand-contract (also called parallel change) breaks a schema change that looks atomic into several independently-deployable, individually-safe steps, so the application is never broken mid-migration and any step can be paused or rolled back without an inconsistent state.

```
Goal: rename `email` → `email_address`, making it required.

1. EXPAND   Add new column, nullable:  ALTER TABLE users ADD COLUMN email_address TEXT;
2. DUAL-WRITE  App writes to BOTH old and new columns on every insert/update.
3. BACKFILL Populate email_address for all existing rows from email, in batches.
4. VERIFY   Confirm email_address matches email for 100% of rows (checksum / count).
5. CUTOVER  App reads switch from `email` to `email_address`.
6. CONTRACT Stop dual-writing to `email`; later, drop the old column entirely.
```

```
      expand          dual-write + backfill        verify        cutover       contract
   ┌──────────┐      ┌──────────────────────┐    ┌────────┐    ┌─────────┐   ┌──────────┐
   │ add col  │ ───▶ │ writes go to both;    │ ─▶ │ counts │ ─▶ │ reads   │ ─▶│ drop old │
   │ nullable │      │ background job fills  │    │ match  │    │ switch  │   │ column   │
   └──────────┘      │ old rows into new col │    └────────┘    └─────────┘   └──────────┘
                      └──────────────────────┘
```

Each arrow is a separate, safe, revertible deploy — if step 3's backfill causes replication lag, you pause it; if step 5's cutover reveals a bug, you roll the app back to reading the old column, because the old column is still being kept in sync until step 6. The property that makes this work: **at every step, both the old and new schema shapes are simultaneously valid**, so any two adjacent application versions (old code still running during a rolling deploy, new code already deployed) both work against the database at the same time. This is the same principle behind zero-downtime application deploys — see [Zero-Downtime Deployment](../08-reliability-operations/zero-downtime-deployment.md).

## Online schema change tools

Manually running expand-contract steps works, but the "add a redundant column and swap" trick generalizes to a well-known technique for *any* blocking `ALTER`, and several tools automate it:

### gh-ost (GitHub's Online Schema Transmogrifier)
Instead of using MySQL's built-in online DDL, gh-ost:
1. Creates a new "ghost" table with the desired schema.
2. Copies existing rows into it in batches (throttled, see below).
3. **Tails the binary log (binlog)** to capture ongoing writes to the original table during the copy, applying them to the ghost table asynchronously — this is the key trick that avoids triggers (which older tools like `pt-online-schema-change` use and which add per-row overhead on the live table).
4. Once the ghost table is caught up, atomically renames the original table out and the ghost table in.

```
users (original, live)  ──binlog stream──▶  users_ghost (new schema)
        │                                          ▲
        └── batched copy of existing rows ─────────┘
                     │
        once caught up: RENAME users → users_old, users_ghost → users  (atomic swap)
```

### pt-online-schema-change (Percona Toolkit)
Similar goal, older mechanism: creates triggers on the original table (`AFTER INSERT/UPDATE/DELETE`) that mirror changes into the new table while a background process copies existing rows in chunks, then does the same atomic rename at the end. The triggers add write overhead to the live table for the migration's duration, which is the main reason gh-ost's binlog-tailing approach is generally preferred for very hot tables.

### pg_repack (PostgreSQL)
Solves a related but distinct problem — table/index bloat from MVCC dead tuples — by creating a new table, copying live rows into it (using a log table + trigger to capture concurrent changes, conceptually similar to pt-online-schema-change), and swapping it in, all without holding the long exclusive lock a plain `VACUUM FULL` or `CLUSTER` would require. Postgres's native support for adding nullable columns and (since PG 11+) many `ALTER TABLE ... ADD COLUMN ... DEFAULT` cases is already near-instant metadata-only, so pg_repack is used less for "add a column" and more for reclaiming bloated space or changing physical row order without downtime.

## Backfill job design

The backfill step (populating a new column/table for existing rows) is usually the slowest and riskiest part, because it's the one step that touches every row rather than a small metadata change.

- **Batching** — process rows in small chunks (hundreds to low thousands of rows per batch, by primary key range) rather than one giant `UPDATE`, so each batch is a short transaction that doesn't hold long locks or bloat the WAL/binlog into one massive entry.

```sql
-- one batch, repeated with an advancing cursor until no rows remain
UPDATE users
SET email_address = email
WHERE id > :last_id AND id <= :last_id + 1000
  AND email_address IS NULL;
```

- **Throttling** — sleep between batches, and actively monitor replica lag (or a proxy metric like `SHOW SLAVE STATUS` / `pg_stat_replication` lag) to slow down or pause automatically if replicas fall behind — an unthrottled backfill can single-handedly cause replication lag serious enough to break read-your-writes guarantees or trigger read-replica failover thresholds elsewhere in the system.
- **Idempotency** — batches should be safely re-runnable (the `WHERE email_address IS NULL` guard above) so a crashed/restarted backfill job doesn't double-process or need complex resume logic.
- **Progress tracking** — persist the last processed key/offset outside the job's memory (a checkpoint row/table) so a restart resumes near where it left off instead of rescanning from the start on a multi-hour job.

## Zero-downtime migration checklist

```
[ ] Schema change is backward AND forward compatible during the transition
    (old app code and new app code both work against the DB simultaneously)
[ ] New columns/tables added as nullable / with safe defaults, never NOT NULL upfront
[ ] Backfill is batched, throttled, idempotent, and checkpointed
[ ] Replication lag monitored and used as a live throttle signal during backfill
[ ] Verification step (row counts / checksums) before cutover, not after
[ ] Cutover is a config/flag flip, not a code deploy tied to the data change
[ ] Old column/table kept (not dropped) for a rollback window after cutover
[ ] Final DROP is a separate, later, low-risk deploy once nothing reads the old shape
```

## Trade-offs summary

| Approach | Locking | Live write overhead | Best fit |
|---|---|---|---|
| Plain `ALTER TABLE` | Full table lock possible | None (until it runs) | Small tables, low-traffic tables, or engines with true instant DDL (Postgres nullable ADD COLUMN, MySQL 8 instant ADD COLUMN) |
| pt-online-schema-change | Brief, at final rename | Trigger overhead during copy | MySQL, moderate table size, acceptable trigger cost |
| gh-ost | Brief, at final rename | None (binlog tailing instead of triggers) | MySQL, very hot/large tables |
| pg_repack | Brief, at final swap | Log-table/trigger overhead during copy | Postgres bloat/reorg without long `VACUUM FULL` lock |
| Manual expand-contract | None per step (each step is small) | Dual-write overhead during transition | Any engine, any change including full column renames/type changes with app-level coordination |

## Common interview follow-ups

**Q: Why not just run the migration during a maintenance window instead of all this?**
Maintenance windows don't scale globally — a 24/7 multi-region product has no universally low-traffic window, and even for products that do, "just take downtime" is a choice you're explicitly trying to avoid; the tooling and pattern cost is the price of never needing that window at all.

**Q: What's the actual risk if you skip the backfill throttling step?**
An unthrottled backfill on a large table can generate WAL/binlog faster than replicas can apply it, causing replication lag to spike into minutes; anything depending on replica freshness (read-after-write consistency, read replicas serving user-facing queries) degrades or serves stale data during that window, and in severe cases can trip failover/health-check thresholds unrelated to the migration itself.

**Q: How do gh-ost and pt-online-schema-change differ in how they capture concurrent writes?**
pt-online-schema-change uses triggers on the original table to mirror every insert/update/delete into the new table in real time, adding per-write overhead directly on the hot path; gh-ost instead tails the MySQL binary log asynchronously and applies captured changes to the ghost table out-of-band, avoiding any added overhead on the live table's write path — which is why gh-ost is generally preferred for the busiest tables.

**Q: When is a schema change actually safe to run directly, without expand-contract?**
When the specific database version and operation combination is genuinely metadata-only and near-instant (Postgres adding a nullable column, MySQL 8's `INSTANT ADD COLUMN` for compatible cases) — check your specific engine/version's documented behavior for the exact operation rather than assuming; the same-looking `ALTER TABLE` statement can be instant on one version and a full rewrite on another.

**Q: What's the rollback story if verification fails after backfill but before cutover?**
Because the old column/table was never touched and the app is still reading from it, rollback is simply "don't cut over" — pause or fix the backfill and re-verify; this is the main reason expand-contract is safer than an in-place migration, where a failure partway through can leave the table in a half-migrated, hard-to-reason-about state.

## Related topics
- [Database Sharding](database-sharding.md)
- [Database Partitioning](database-partitioning.md)
- [Database Replication](database-replication.md)
- [Database Indexing](database-indexing.md)
- [Zero-Downtime Deployment](../08-reliability-operations/zero-downtime-deployment.md)
- [Distributed Transactions](distributed-transactions.md)
