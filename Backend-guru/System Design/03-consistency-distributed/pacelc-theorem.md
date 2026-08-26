# PACELC Theorem

[← Back to index](../readme.md)

## What is PACELC?

PACELC extends the CAP theorem.

CAP explains what happens:

```
During a network partition
```

But most of the time:

```
The network works normally
```

Even then, distributed systems still face a trade-off.

PACELC says:

```
If Partition happens:

Choose between:

Availability (A)

or

Consistency (C)



Else (normal operation):

Choose between:

Latency (L)

or

Consistency (C)
```

---

# CAP vs PACELC

CAP:

```
During failure:

Partition

    |
    |
Choose:

Availability

or

Consistency
```

---

PACELC:

```
Partition happens?

        |
        |
       Yes

        |
        v

Availability vs Consistency



No partition?

        |
        v

Latency vs Consistency
```

---

# Why PACELC Matters

Many people think:

```
No network failure

=

Get consistency and availability for free
```

Wrong.

Even when the system is healthy, consistency costs time.

Example:

A user updates their profile.

Data exists on:

```
Server A

Server B

Server C
```

---

## Strong Consistency

Wait until replicas confirm.

```
Client

 |
 v

Server A

 |
 +----> Server B

 |
 +----> Server C


Wait for replies


Return success
```

Result:

```
Correct data

Higher latency
```

---

## Low Latency

Return immediately.

```
Client

 |
 v

Server A

 |
 v

Success


Later:

Server B updated

Server C updated
```

Result:

```
Fast response

Temporary stale data
```

---

# PACELC Naming

Every system gets two labels:

Example:

```
DynamoDB:

PA / EL
```

Meaning:

```
Partition:

Availability


Else:

Latency
```

---

Another example:

```
etcd:

PC / EC
```

Meaning:

```
Partition:

Consistency


Else:

Consistency
```

---

# Four Possible Choices

```
PC / EC

Strong consistency always


PA / EL

Fast and available always


PC / EL

Rare


PA / EC

Rare
```

Most real systems are:

```
PA/EL

or

PC/EC
```

---

# PA/EL Systems

PA/EL means:

During partition:

```
Prefer Availability
```

Normal operation:

```
Prefer Low Latency
```

---

Examples:

- DynamoDB
- Cassandra
- Riak

---

# DynamoDB

DynamoDB chooses:

```
PA / EL
```

During partition:

Both sides can continue serving requests.

Example:

```
Region A

User update:

name = John


Region B

User update:

name = Jack
```

Later:

```
Conflict resolution
```

---

Normal operation:

Default reads are:

```
Eventually consistent
```

Meaning:

```
Fast response

Possible stale data
```

---

DynamoDB can also provide:

```
Strongly consistent reads
```

but with higher latency.

---

# Cassandra

Default behavior:

```
PA / EL
```

Example:

Fast mode:

```
Consistency Level = ONE
```

Meaning:

One replica response is enough.

---

Stronger mode:

```
Consistency Level = QUORUM
```

Meaning:

Need majority replicas.

Benefits:

```
More consistency
```

Cost:

```
Higher latency

Less availability
```

---

# PC/EC Systems

PC/EC means:

During partition:

```
Prefer consistency
```

Normal operation:

```
Prefer consistency
```

---

Examples:

- etcd
- ZooKeeper
- Spanner
- MongoDB (default behavior)

---

# etcd / Raft

Writes:

```
Client

 |
 v

Leader

 |
 +----> Follower

 |
 +----> Follower
```

Commit happens after:

```
Majority acknowledgement
```

---

During partition:

Example:

```
5 nodes


3 nodes

Majority


2 nodes

Minority
```

Majority continues.

Minority stops accepting writes.

---

Result:

```
No conflicting data

Possible downtime
```

---

# ZooKeeper

ZooKeeper uses:

```
ZAB consensus protocol
```

It requires quorum.

During partition:

```
Minority side

Cannot make decisions
```

This protects consistency.

---

# MongoDB

MongoDB uses:

```
Single primary model
```

Writes go to:

```
Primary node
```

If primary loses majority:

```
No writable primary
```

System prefers:

```
Consistency

over availability
```

---

# Spanner

Google Spanner chooses:

```
PC / EC
```

It uses:

```
Paxos replication
```

for consistency.

Every write pays:

```
Replication latency
```

but gets:

```
Strong global consistency
```

---

# PACELC Comparison

| System | Partition Choice | Normal Choice | Category |
|-|-|-|-|
| DynamoDB | Availability | Latency | PA/EL |
| Cassandra | Availability | Latency | PA/EL |
| MongoDB | Consistency | Consistency | PC/EC |
| ZooKeeper | Consistency | Consistency | PC/EC |
| etcd | Consistency | Consistency | PC/EC |
| Spanner | Consistency | Consistency | PC/EC |

---

# Trade-off Summary

| Choice | Advantages | Disadvantages | Examples |
|-|-|-|-|
| PC/EC | Strong correctness | Higher latency, possible downtime | etcd, Spanner |
| PA/EL | Fast and highly available | Stale data, conflicts | DynamoDB, Cassandra |
| Tunable | Choose per operation | More complexity | Cassandra, DynamoDB |

---

# Choosing Based on Business Requirements

## Payment System

Need:

```
Correct balance
```

Example:

```
Account balance = $100
```

Cannot allow:

```
Two withdrawals at the same time
```

Choose:

```
PC/EC
```

---

## Social Media Like Counter

Example:

```
Likes = 10,001
```

A temporary wrong number is acceptable.

Choose:

```
PA/EL
```

---

## Inventory System

Need:

```
Never oversell products
```

Choose:

```
Consistency
```

because:

```
Wrong inventory

is worse than

temporary unavailability
```

---

# Common Interview Questions

## Q: Why is CAP not enough?

CAP only talks about:

```
When partition happens
```

PACELC adds:

```
Normal operation trade-off
```

because consistency also increases latency.

---

## Q: Is PA/EL worse than PC/EC?

No.

They solve different problems.

Example:

Social feed:

```
PA/EL is good
```

because speed matters.

Bank balance:

```
PC/EC is good
```

because correctness matters.

---

## Q: Can you have both low latency and strong consistency?

Only within limits.

Strong consistency requires:

```
Waiting for coordination
```

Coordination creates:

```
Latency
```

---

## Q: How does PACELC help in system design interviews?

Start with requirements.

Example:

```
Need correct money transfers
```

Choose:

```
PC/EC
```

Example:

```
Need fast social feed updates
```

Choose:

```
PA/EL
```

---

# Simple Rule To Remember

```
Money / Inventory / Locks
        |
        v
Consistency


Feeds / Likes / Analytics
        |
        v
Availability


Partition:

A vs C


Normal:

Latency vs C
```

---

# Interview Answer

> "CAP explains the consistency versus availability trade-off during network partitions, but PACELC extends this by adding the normal-operation trade-off between latency and consistency. Strongly consistent systems like etcd and Spanner choose PC/EC, accepting latency and occasional unavailability. Systems like DynamoDB and Cassandra choose PA/EL, prioritizing availability and low latency while accepting eventual consistency."

## Related topics
- [CAP Theorem](cap-theorem.md) — the partition-only half of this trade-off
- [Strong vs Eventual Consistency](strong-vs-eventual-consistency.md) — the consistency models on the "C" side of both axes
- [Quorum](quorum.md) — the N/W/R knobs that let you move a system along the EL↔EC axis per request
- [Database Replication](../02-data-storage/database-replication.md) — sync vs async replication is the literal mechanism behind EC vs EL
- [Consensus Algorithms](consensus-algorithms.md) — why PC/EC systems pay a latency cost on every write
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md) — PACELC trade-offs become dominant once replicas cross regions
