
# Database Replication


> **Database Replication** is the process of maintaining multiple copies of the same database on different servers.
>
> It improves:
>
> - ✅ High Availability
> - ✅ Disaster Recovery
> - ✅ Read Scalability
> - ✅ Fault Tolerance
>
> **Important:** Replication improves **read performance**, but **does not automatically improve write performance**. In most systems, writes still go to a single primary database.

---

# Why Do We Need Database Replication?

Imagine your application has only one database.

```
        Users
          │
          ▼
     Database Server
```

Problems:

- Single point of failure
- Limited read capacity
- Maintenance causes downtime
- Hardware failures affect everyone

Now imagine multiple copies.

```
               Users
                  │
                  ▼
          Primary Database
                  │
        Replication Stream
        ┌─────────┼─────────┐
        ▼         ▼         ▼
    Replica 1  Replica 2  Replica 3
```

Now if one replica fails, others continue serving traffic.

---

# What is Database Replication?

Database replication means copying data from one database server to one or more other servers.

Whenever data changes on the primary database, those changes are sent to replicas.

```
Primary

↓

INSERT User

↓

Replication

↓

Replica 1

↓

Replica 2

↓

Replica 3
```

All replicas eventually contain the same data.

---

# Why Replication is Important

Replication provides several major benefits:

- High Availability
- Read Scaling
- Backup & Recovery
- Disaster Recovery
- Geographic Distribution
- Reduced Downtime

---

# Primary-Replica Architecture

This is the most common replication architecture.

```
                    Write
                     │
                     ▼
              Primary Database
                     │
         Replication Log (WAL/Binlog)
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   Read Replica Read Replica Read Replica
```

### Write Requests

All writes go to the Primary.

Examples:

- INSERT
- UPDATE
- DELETE

### Read Requests

Reads can be served from any replica.

This distributes the workload across multiple servers.

---

# How Replication Works

Step 1

Client writes data.

```
Client

↓

INSERT User

↓

Primary
```

---

Step 2

Primary records the change in a replication log.

Different databases use different names.

| Database | Replication Log |
|----------|-----------------|
| PostgreSQL | WAL (Write Ahead Log) |
| MySQL | Binary Log (Binlog) |
| MongoDB | Oplog |

---

Step 3

Replicas receive the log.

```
Primary

↓

Replication Log

↓

Replica
```

---

Step 4

Replicas replay the same operations.

Eventually every replica contains identical data.

---

# Replication Modes

There are three common replication modes.

---

# 1. Asynchronous Replication

The Primary immediately responds to the client.

Replication happens afterward.

```
Client

↓

Write

↓

Primary

↓

SUCCESS

↓

Later...

↓

Replica
```

Advantages:

- Fast writes
- Low latency
- High throughput

Disadvantages:

- Possible data loss if Primary crashes before replication finishes
- Replica lag

This is the default in many systems.

---

# 2. Synchronous Replication

Primary waits for the replica before responding.

```
Client

↓

Primary

↓

Replica

↓

ACK

↓

Client
```

Advantages:

- No data loss
- Strong consistency

Disadvantages:

- Higher latency
- Slower writes
- Replica failures may block writes

Used in financial systems and other critical applications.

---

# 3. Semi-Synchronous Replication

A compromise between Async and Sync.

```
Client

↓

Primary

↓

Replica receives log

↓

ACK

↓

Client
```

The replica only needs to confirm it received the replication log.

It does not have to fully apply the changes before the client gets a response.

Advantages:

- Better durability than Async
- Lower latency than Sync

---

# Replication Comparison

| Feature | Async | Semi-Sync | Sync |
|----------|--------|-----------|------|
| Write Speed | Fastest | Fast | Slow |
| Latency | Low | Medium | High |
| Data Loss Risk | Possible | Very Low | None |
| Availability | High | High | Lower |
| Consistency | Eventual | Better | Strong |

---

# Replication Lag

One of the biggest interview topics.

Replication is rarely instantaneous.

```
Primary

↓

Update Balance = $500

↓

Replica (still has $400)
```

The delay is called **Replication Lag**.

---

# Problems Caused by Replication Lag

## Read-Your-Own-Write Problem

User updates their profile.

```
Update Name

↓

Primary
```

Immediately refreshes the page.

```
Read

↓

Replica
```

Replica hasn't caught up yet.

The old name appears.

User thinks the update failed.

---

## Stale Data

Different users may receive different data depending on which replica they read from.

---

## Monotonic Read Violation

A user first reads from Replica A (newer).

Later they read from Replica B (older).

The data appears to move backward in time.

---

# Solutions to Replication Lag

## Option 1: Read from Primary

Immediately after a write:

```
Write

↓

Primary

↓

Read

↓

Primary
```

Often called **Read-After-Write Consistency**.

---

## Option 2: Session Stickiness

A user's requests continue going to the same database.

This avoids inconsistent reads.

---

## Option 3: Wait Until Replica Catches Up

Advanced systems track replication positions (LSN/WAL position) and only read from replicas that have applied the required changes.

---

# Failover

Suppose the Primary crashes.

```
Primary

❌ Down
```

Replication systems detect failure.

```
Replica 1

↓

Promoted

↓

New Primary
```

Other replicas now replicate from the new Primary.

Applications automatically reconnect.

---

# Failover Process

```
Primary Dies

↓

Failure Detection

↓

Leader Election

↓

Replica Promotion

↓

Traffic Redirect

↓

Normal Operation
```

---

# Split Brain

One of the biggest distributed systems problems.

Imagine a network partition.

```
Primary A

believes it is Primary

AND

Replica B

also believes it is Primary
```

Now two databases accept writes.

Eventually the data conflicts.

This is called **Split Brain**.

Consensus systems such as:

- Raft
- etcd
- ZooKeeper

prevent this by ensuring only one node can become the leader.

---

# Single Leader Replication

Most relational databases use this model.

```
             Primary
           /    |    \
          ▼     ▼     ▼
      Replica Replica Replica
```

Advantages:

- Simple
- Easy conflict handling

Disadvantages:

- Write bottleneck

---

# Multi-Leader Replication

Multiple databases accept writes.

```
US Primary

⇄

EU Primary
```

Advantages:

- Local writes
- Better global performance

Disadvantages:

- Conflict resolution
- More complex architecture

Common in globally distributed systems.

---

# Conflict Resolution

If two Primaries update the same record:

```
US

Name = Alice
```

```
EU

Name = Bob
```

Which one wins?

Common approaches:

- Last Write Wins
- Version Numbers
- Vector Clocks
- CRDTs
- Application-Level Merge

---

# Real-World Examples

## PostgreSQL

Uses **WAL (Write Ahead Log)**.

Features:

- Streaming Replication
- Synchronous Replication
- Asynchronous Replication
- Read Replicas

---

## MySQL

Uses **Binary Log (Binlog)**.

Supports:

- Async
- Semi-Sync
- Group Replication
- InnoDB Cluster

---

## MongoDB

Uses **Replica Sets**.

Components:

- Primary
- Secondary
- Arbiter (optional)

Supports automatic leader election.

---

## Kafka (Comparison)

Each partition has:

- Leader
- Followers

Producers usually write only to the Leader.

---

# Advantages

✅ High Availability

✅ Better Read Performance

✅ Disaster Recovery

✅ Backup

✅ Geographic Distribution

---

# Disadvantages

❌ Increased Infrastructure Cost

❌ Replication Lag

❌ More Operational Complexity

❌ Failover Management

❌ Monitoring Required

---

# Replication vs Backup

Many beginners confuse these.

| Replication | Backup |
|-------------|--------|
| Live copy | Snapshot |
| Real-time | Scheduled |
| High Availability | Disaster Recovery |
| Can replicate mistakes | Restores old data |

Replication **does not replace backups**.

If someone deletes data accidentally, replicas will delete it too.

---

# Common Interview Questions

## Does replication improve write performance?

Usually **No**.

Writes still go to the Primary.

Replication mainly improves:

- Read scalability
- Availability

---

## Why do read replicas sometimes return stale data?

Because replication is usually asynchronous.

The Primary has newer data than the replicas.

---

## What happens if the Primary crashes?

A replica is promoted to become the new Primary.

Applications reconnect automatically.

---

## Why isn't synchronous replication always used?

Because it increases latency.

Every write must wait for replica acknowledgment.

This slows the entire system.

---

## What is Replication Lag?

The delay between data being committed on the Primary and becoming visible on replicas.

---

## Difference Between Replication and Sharding

**Replication**

Copies the **same** data.

```
Primary

↓

Replica A

↓

Replica B
```

Purpose:

- High Availability
- Read Scaling

---

**Sharding**

Splits **different** data across servers.

```
Shard 1

Users A-M
```

```
Shard 2

Users N-Z
```

Purpose:

- Write Scaling
- Massive Data Storage

---

# Best Practices

✅ Monitor replication lag

✅ Use automatic failover

✅ Keep replicas in different Availability Zones

✅ Read from replicas only when eventual consistency is acceptable

✅ Route critical reads to the Primary

✅ Always maintain backups in addition to replication

---

# Key Takeaways

- **Database Replication** keeps multiple copies of the same data.
- The **Primary** handles writes, while **Replicas** usually serve reads.
- Replication improves **availability**, **fault tolerance**, and **read scalability**.
- Replication does **not** automatically improve write throughput.
- **Asynchronous Replication** is fast but may have replication lag.
- **Synchronous Replication** offers strong consistency but increases latency.
- **Semi-Synchronous Replication** balances speed and durability.
- Replication is **not a replacement for backups**.

---

## Related topics

- [Database Sharding](database-sharding.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [Leader Election](../03-consistency-distributed/leader-election.md)
- [Consensus Algorithms](../03-consistency-distributed/consensus-algorithms.md)
- [Quorum](../03-consistency-distributed/quorum.md)
- [High Availability](../08-reliability-operations/high-availability.md)
- [Disaster Recovery](../08-reliability-operations/disaster-recovery.md)
