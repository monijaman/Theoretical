# CAP Theorem

[← Back to index](../readme.md)

## What is CAP Theorem?

CAP Theorem explains the trade-off in distributed systems.

It says:

> A distributed system can guarantee only **two out of three properties at the same time during a network partition**.

The three properties are:

```
C - Consistency

A - Availability

P - Partition Tolerance
```

---

# The Three Properties

## 1. Consistency (C)

Every read receives the latest write.

Example:

User updates:

```
username = "john"
```

Immediately after:

Every server must return:

```
john
```

No stale data is allowed.

This is called:

```
Linearizability
```

Important:

CAP consistency is NOT the same as ACID consistency.

---

## 2. Availability (A)

Every request receives a response.

The response may not contain the latest data.

Example:

Server A:

```
balance = $100
```

Server B:

```
balance = $90
```

Even if data is old, the system responds.

---

## 3. Partition Tolerance (P)

The system continues working even when network communication fails.

Example:

```
Server A

     X

Server B
```

Messages between servers are delayed or lost.

The system must decide:

```
Stop requests?

or

Continue serving?
```

---

# Why Partition Tolerance Is Not Optional

A common interview mistake:

> "We choose CA."

This is usually wrong for distributed systems.

A single database:

```
One server
```

has no network partition between nodes.

But once you have:

```
Multiple servers
Multiple replicas
Multiple regions
```

network failures are unavoidable.

Examples:

- Network outage
- Packet loss
- Server pause
- DNS failure
- Hardware failure

Therefore:

```
Distributed System

must choose:

CP

or

AP
```

during a partition.

---

# CAP Decision Tree

```
             Network Partition Happens

                      |
        ---------------------------------
        |                               |
        v                               v

 Reject requests                 Continue serving
 until recovery                  with possible stale data


        |                               |

        CP                              AP
```

---

# CP Systems

## Consistency + Partition Tolerance

A CP system chooses:

```
Correct data

over

Always responding
```

During a partition:

```
Some requests fail
```

because returning wrong data is worse.

---

## Example

Cluster:

```
5 Nodes
```

Partition:

```
3 nodes | 2 nodes
```

Majority side:

```
3 nodes

Has quorum

Continues
```

Minority side:

```
2 nodes

No quorum

Rejects requests
```

---

# CP Examples

## ZooKeeper

Used for:

- Configuration
- Leader election
- Distributed locks

Requires majority agreement.

If quorum is lost:

```
No writes
```

---

## etcd

Used by:

```
Kubernetes
```

Stores cluster state.

Correctness is more important than availability.

---

## Financial Systems

Examples:

- Bank balances
- Inventory counts
- Payment processing

Wrong data is dangerous.

Example:

Two users buying the last item:

```
Inventory = 1

Request A
Request B
```

You cannot allow:

```
Inventory = -1
```

---

# AP Systems

## Availability + Partition Tolerance

An AP system chooses:

```
Always respond

over

Immediate consistency
```

During partition:

Both sides continue working.

---

Example:

Network split:

```
        Partition

Node A          Node B

value=10        value=20
```

Both accept writes.

Later:

```
Partition heals
```

The system resolves conflicts.

---

# AP Conflict Resolution

Common strategies:

## Last Write Wins (LWW)

Example:

```
Write 1:

value = A
time = 10


Write 2:

value = B
time = 20
```

Winner:

```
value = B
```

---

## Vector Clocks

Track the history of changes.

Example:

```
A changed from version 1

B changed from version 2
```

Used to detect conflicts.

---

## CRDT

Conflict-free data structures.

Designed so distributed updates can merge automatically.

---

# AP Examples

## Cassandra

Used for:

- Large-scale data
- High write volume
- Event storage

Prioritizes availability.

---

## DynamoDB

Designed for:

- Always available applications
- Massive scale

Examples:

- Shopping carts
- User preferences

---

## CouchDB

Allows conflicting versions and resolves later.

---

# CP vs AP Comparison

| Feature | CP | AP |
|-|-|-|
| Priority | Correct data | Always available |
| During partition | Rejects requests | Accepts requests |
| Data | Always consistent | May be stale |
| Conflict handling | Not required | Required |
| User experience | Errors possible | Old data possible |
| Best for | Payments, inventory | Feeds, carts, likes |

---

# Common CAP Mistakes

## Mistake 1: "NoSQL means AP"

Wrong.

Database type does not decide CAP behavior.

Examples:

MongoDB:

```
Document database

but can behave CP-like
```

Spanner:

```
SQL database

uses CP approach
```

---

## Mistake 2: "SQL means CP"

Wrong.

Configuration matters.

Replication strategy matters.

---

## Mistake 3: CAP Consistency = ACID Consistency

Wrong.

CAP Consistency:

```
Latest value returned
```

ACID Consistency:

```
Database rules remain valid
```

Example:

ACID:

```
Foreign key exists
```

CAP:

```
Everyone sees latest value
```

---

## Mistake 4: CAP Is Permanent

Wrong.

Many systems allow tuning.

Example:

Cassandra:

```
Consistency Level ONE

or

Consistency Level QUORUM
```

You choose per operation.

---

# Real Examples

## Payment System

Question:

What is worse?

```
Temporary failure

or

Wrong balance?
```

Answer:

Wrong balance.

Choose:

```
CP
```

---

## Social Media Likes

Question:

What is worse?

```
Like count delayed by 5 seconds

or

User cannot like a post?
```

Answer:

Delayed count is acceptable.

Choose:

```
AP
```

---

# CAP and Quorum

Many distributed databases use:

```
N = number of replicas

W = number of writes required

R = number of reads required
```

Rule:

```
W + R > N
```

usually gives stronger consistency.

Example:

```
N = 3

Write to 2 nodes

Read from 2 nodes
```

Then:

```
W + R = 4

4 > 3
```

Strong consistency is possible.

---

# CAP vs PACELC

CAP only talks about:

```
During network partition
```

PACELC adds:

```
Even without partition:

Do we choose:

Latency

or

Consistency?
```

Example:

Synchronous replication:

```
Higher consistency

Higher latency
```

Async replication:

```
Lower latency

Possible stale data
```

---

# Interview Answer

A strong interview answer:

> "CAP theorem says that during a network partition, a distributed system must choose between consistency and availability. Partition tolerance is mandatory because network failures are unavoidable. CP systems reject requests to maintain correctness, while AP systems continue serving requests and resolve conflicts later. The choice depends on the business requirement: payments and inventory usually prefer CP, while social feeds and caches often prefer AP."

## Related topics
- [PACELC Theorem](pacelc-theorem.md) — extends CAP to the normal-operation case (latency vs consistency)
- [Strong vs Eventual Consistency](strong-vs-eventual-consistency.md) — the consistency models CAP's "C" and "A" branches actually produce
- [Quorum](quorum.md) — the N/W/R math that lets you tune where a system sits between CP and AP
- [Consensus Algorithms](consensus-algorithms.md) — how CP systems like etcd/ZooKeeper actually achieve their consistency guarantee
- [Database Replication](../02-data-storage/database-replication.md) — sync vs async replication is the mechanism behind the CP/AP choice
- [Distributed Transactions](../02-data-storage/distributed-transactions.md) — 2PC/Saga trade-offs are a CAP-adjacent concern across services
