# Consensus Algorithms

[← Back to index](../readme.md)

## What is Consensus?

Consensus is the problem of getting multiple computers to agree on the same decision even when:

- Some machines crash
- Some messages are delayed
- Some nodes become unreachable

Example:

A distributed database has 5 replicas.

A user writes:

```
balance = $100
```

All replicas must eventually agree:

```
balance = $100
```

The challenge:

What happens if one replica fails?

or:

```
Node A says:
balance = $100


Node B says:
balance = $200
```

Consensus algorithms solve this problem.

---

# Why Consensus Matters

Many distributed systems depend on consensus.

Examples:

## Leader Election

Question:

```
Who is the leader?
```

All nodes must agree on one leader.

---

## Replicated Logs

Question:

```
What is the order of operations?
```

Example:

```
1. Create account

2. Deposit money

3. Withdraw money
```

Every replica must apply operations in the same order.

---

## Distributed Locks

Question:

```
Who owns this lock?
```

Two clients cannot receive the same lock.

---

# Requirements of Consensus

A correct consensus algorithm provides three guarantees.

---

# 1. Agreement

All correct nodes decide the same value.

Example:

Wrong:

```
Node A:

Leader = Server 1


Node B:

Leader = Server 2
```

Correct:

```
Everyone agrees:

Leader = Server 1
```

---

# 2. Validity

The chosen value must come from a proposal.

The system cannot invent values.

Example:

Nodes propose:

```
A
B
C
```

Decision:

```
D
```

is invalid.

---

# 3. Termination

Every healthy node eventually reaches a decision.

The system should not wait forever.

---

# FLP Impossibility Result

The FLP theorem says:

> In a completely asynchronous distributed system, no deterministic algorithm can guarantee both safety and progress if even one node can fail.

Meaning:

If you cannot know whether:

```
Node is dead

or

Network is slow
```

you cannot guarantee both:

```
Always safe

+
Always available
```

---

Real systems solve this using:

```
Partial synchrony
```

Meaning:

They assume:

- Network usually works
- Messages usually arrive
- Timeouts can detect failures

But safety is never sacrificed.

---

# Paxos

Paxos is the original consensus algorithm.

Created by:

```
Leslie Lamport
```

It solves:

> How can distributed nodes agree on one value despite failures?

---

# Paxos Roles

Paxos has three roles:

```
Proposer

Acceptor

Learner
```

---

## Proposer

Suggests a value.

Example:

```
I propose:

Leader = Node A
```

---

## Acceptors

Vote on proposals.

A majority must accept.

Example:

Cluster:

```
5 nodes
```

Need:

```
3 votes
```

---

## Learner

Learns the final decision.

---

# Paxos Flow

## Phase 1: Prepare

Proposer sends:

```
Prepare(number)
```

Example:

```
Proposal #10
```

Acceptors reply:

```
Promise
```

Meaning:

```
I will not accept older proposals
```

---

## Phase 2: Accept

Proposer sends:

```
Accept(value)
```

Example:

```
Leader = Node A
```

If majority accepts:

```
Value is chosen
```

---

# Why Paxos Is Hard

Paxos is mathematically correct.

But implementation is difficult.

Problems:

## 1. Basic Paxos Only Chooses One Value

Real systems need:

```
Thousands of operations
```

Example:

Database log:

```
1. INSERT user

2. UPDATE account

3. DELETE session
```

This requires:

```
Multi-Paxos
```

---

## 2. Leader Management

Need to handle:

- Leader failures
- Recovery
- Membership changes
- Log cleanup

The original Paxos paper leaves many engineering details open.

---

# Raft

Raft was created to make consensus easier to understand.

It provides the same guarantees as Paxos.

Main idea:

```
One leader

+
Replicated log

+
Majority agreement
```

---

# Raft Components

Raft separates consensus into three problems:

```
1. Leader Election

2. Log Replication

3. Safety
```

---

# 1. Leader Election

Nodes vote for a leader.

Example:

```
Node A
Node B
Node C
Node D
Node E
```

A majority chooses:

```
Node C = Leader
```

Only one leader exists per term.

---

# 2. Log Replication

Clients send writes to the leader.

Example:

```
Client

 |
 v

Leader

 |
 |
 +----> Follower
 |
 +----> Follower
```

Leader writes:

```
SET balance = $100
```

Then replicates.

---

Commit happens after majority acknowledgement.

Example:

5 nodes:

```
Leader
+
Follower 1
+
Follower 2
```

3 nodes agree.

The entry is committed.

---

# 3. Safety

A new leader must already contain committed data.

This prevents:

Old data becoming the truth again.

---

# Raft Example

Client writes:

```
Create order #123
```

Flow:

```
Client
 |
 v
Leader

Store log entry

 |
 v

Send AppendEntries

 |
 v

Followers acknowledge

 |
 v

Majority reached

 |
 v

Commit

 |
 v

Return success
```

---

# Quorum Requirement

Consensus algorithms require:

```
Majority = N/2 + 1
```

Why?

Because two majorities must overlap.

Example:

5 nodes:

```
Majority = 3
```

Possible groups:

```
A B C

C D E
```

Overlap:

```
C
```

The shared node prevents conflicting decisions.

---

# Cluster Size Examples

| Nodes | Majority | Failures Allowed |
|-|-|-|
| 3 | 2 | 1 |
| 5 | 3 | 2 |
| 7 | 4 | 3 |

---

Increasing nodes has a cost:

More nodes:

```
More coordination

More latency
```

That is why production clusters usually use:

```
3, 5, or 7 nodes
```

---

# Real Systems Using Consensus

## etcd → Raft

Used by:

```
Kubernetes
```

Stores:

- Cluster state
- Configuration
- Metadata

Needs strong consistency.

---

## ZooKeeper → ZAB

Used for:

- Leader election
- Distributed coordination

Uses:

```
ZAB protocol
```

(similar idea to leader-based consensus)

---

## Google Spanner → Paxos

Spanner uses:

```
Paxos groups
```

for replica consistency.

Then uses:

```
2PC
```

for transactions across multiple groups.

---

## Kafka → KRaft

Modern Kafka replaced ZooKeeper dependency.

Uses:

```
KRaft
```

A Kafka-specific Raft implementation.

---

## CockroachDB / TiDB → Raft

Data is split into ranges.

Each range has its own:

```
Raft group
```

---

# Paxos vs Raft vs ZAB

| Algorithm | Main Idea | Difficulty | Used By |
|-|-|-|-|
| Paxos | Majority voting | Hard | Spanner |
| Raft | Leader + replicated log | Easier | etcd, CockroachDB |
| ZAB | Leader broadcast | Medium | ZooKeeper |
| KRaft | Kafka Raft variant | Easier | Kafka |

---

# Common Interview Questions

## Q: Is Raft better than Paxos?

No.

They solve the same problem.

Raft is easier because it clearly defines:

- Leader election
- Log replication
- Safety rules

---

## Q: Why need majority?

Because majorities overlap.

Example:

5 nodes.

Majority:

```
3 nodes
```

Two different majorities must share at least one node.

That prevents conflicting decisions.

---

## Q: What happens if the leader crashes?

Example:

```
Old Leader

      X

Followers
```

Followers wait for timeout.

Then:

```
New election
```

A new leader is selected.

---

## Q: What happens if leader is alive but disconnected?

Example:

```
Leader

   X

Majority of cluster
```

The old leader cannot commit writes.

The majority side elects a new leader.

This prevents split brain.

---

## Q: When should you NOT use consensus?

When availability matters more than strict ordering.

Examples:

- Social media likes
- View counters
- Shopping recommendations

These can tolerate:

```
Temporary inconsistency
```

Systems like Cassandra choose availability instead.

---

# Consensus vs Distributed Transactions

They solve different problems.

## Consensus

Keeps one replica group consistent.

Example:

```
Database replicas agree
```

---

## Distributed Transaction

Coordinates multiple systems.

Example:

```
Payment

+

Inventory

+

Shipping
```

---

Large systems may use both.

Example:

Spanner:

```
Paxos

for replica consistency


+

2PC

for cross-shard transactions
```

---

# Simple Rule To Remember

```
Need nodes to agree?
        |
        v
Consensus


Need one leader?
        |
        v
Leader Election


Need ordered replicated data?
        |
        v
Raft/Paxos


Need multiple services commit together?
        |
        v
Distributed Transaction
```

---

# Interview Answer

A strong answer:

> "Consensus algorithms allow distributed nodes to agree on a value even when failures occur. Paxos is the original algorithm but is difficult to implement. Raft provides the same guarantees with a simpler leader-based design using leader election and replicated logs. Systems like etcd, CockroachDB, and Kafka KRaft use Raft because operational simplicity is extremely important in production distributed systems."

## Related topics
- [Leader Election](leader-election.md) — a specific, common instance of the consensus problem
- [Quorum](quorum.md) — the majority arithmetic that underlies every consensus algorithm's safety
- [CAP Theorem](cap-theorem.md) — consensus-based systems are the textbook CP choice
- [Distributed Locks](distributed-locks.md) — lock services (ZooKeeper, etcd) rely on consensus internally
- [Distributed Transactions](../02-data-storage/distributed-transactions.md) — how consensus combines with 2PC/Saga across shards
