# Leader Election

[← Back to index](../readme.md)

## What is Leader Election?

In distributed systems, many tasks need exactly one node to make decisions.

Examples:

- Accepting writes
- Assigning partitions
- Running scheduled jobs
- Coordinating workflows

If multiple nodes think they are the leader, the system can enter:

```
Split Brain
```

Example:

```
Leader A:

Accepts writes


Leader B:

Also accepts writes
```

Now data can become inconsistent.

---

# Why Leader Election Is Hard

A simple idea:

```
Pick the first node that starts
```

does not work.

Why?

Because distributed systems cannot easily know:

```
Is the leader dead?

or

Is the network just slow?
```

Example:

```
Leader

      X

Follower
```

The follower cannot know whether:

```
Leader crashed

OR

Leader is temporarily unreachable
```

So election algorithms must balance:

```
Safety

(no two leaders)


and


Liveness

(system can recover)
```

---

# Raft Leader Election

Raft is used by:

- etcd
- Consul
- CockroachDB

Raft uses:

- Terms
- Heartbeats
- Voting
- Majority agreement

---

# Raft States

Every node is one of:

```
Follower

Candidate

Leader
```

---

# Raft Election Flow

Initially:

```
All nodes:

Follower
```

---

A follower waits for:

```
Leader heartbeat
```

If no heartbeat arrives:

```
Election timeout happens
```

---

The node becomes:

```
Candidate
```

Then:

1. Increases term number

```
Term 1 → Term 2
```

2. Votes for itself

3. Requests votes from other nodes

Example:

```
RequestVote(term=2)
```

---

Other nodes vote if:

- They have not voted in this term
- Candidate log is up to date

---

If candidate gets majority:

Example:

```
5 nodes

Need 3 votes
```

It becomes:

```
Leader
```

---

# Raft Heartbeats

The leader sends regular heartbeats.

Example:

```
Leader

 |
 |
 +----> Follower
 |
 +----> Follower
```

Heartbeat means:

```
I am still alive
```

Followers reset their election timers.

---

# Terms: Raft Logical Clock

A term is a number that increases over time.

Example:

```
Term 1

Term 2

Term 3
```

Every message contains a term.

---

Example:

Old leader:

```
Term 2
```

New leader:

```
Term 3
```

When old leader receives:

```
Term 3 message
```

it knows:

```
I am outdated

Step down
```

---

Terms prevent:

```
Two leaders existing forever
```

---

# ZooKeeper Leader Election

ZooKeeper uses:

```
Ephemeral Sequential Znodes
```

Example:

```
/election/

node-0001

node-0002

node-0003
```

---

The smallest number becomes leader.

Example:

```
node-0001

Leader
```

---

Other nodes watch the node before them.

Example:

```
node-0003

watches

node-0002
```

---

If leader crashes:

```
node-0001 deleted
```

because it is ephemeral.

Then:

```
node-0002 becomes leader
```

---

Why not everyone watches the leader?

Because it creates a:

```
Herd effect
```

Example:

```
Leader dies

1000 nodes wake up
```

ZooKeeper avoids this by watching only the previous node.

---

# etcd Leader Election

etcd uses:

```
Lease + Compare-And-Swap
```

---

Flow:

## 1. Create Lease

Example:

```
TTL = 10 seconds
```

Client must keep renewing.

---

## 2. Create Leader Key

Example:

```
/election/leader
```

Only one client can create it.

---

## 3. Become Leader

If successful:

```
Client = Leader
```

while lease is alive.

---

## 4. Failure

If client stops:

```
Lease expires

Key removed

New candidate wins
```

---

# Split Brain Problem

Split brain happens when two groups think they are leaders.

Example:

7 node cluster:

```
[A][B][C][D]     |     [E][F][G]
```

Majority:

```
4 nodes
```

Left side:

```
4 nodes

Can elect leader
```

Right side:

```
3 nodes

Cannot elect leader
```

Only one side can have majority.

Therefore:

```
Only one leader can exist
```

---

# Why Majority Is Required

For a cluster:

```
N nodes
```

Need:

```
N/2 + 1
```

votes.

Example:

| Nodes | Majority |
|-|-|
| 3 | 2 |
| 5 | 3 |
| 7 | 4 |

---

Why?

Because two majorities must overlap.

Example:

5 nodes:

Group A:

```
A B C
```

Group B:

```
C D E
```

Common node:

```
C
```

The overlap prevents conflicting decisions.

---

# Leader Timeout Trade-off

Election timeout affects behavior.

---

## Short Timeout

Example:

```
150ms
```

Advantages:

```
Fast failover
```

Problems:

```
False elections

More heartbeat traffic
```

---

## Long Timeout

Example:

```
10 seconds
```

Advantages:

```
More stable
```

Problems:

```
Slow recovery
```

---

# Real Systems

| System | Algorithm | Usage |
|-|-|-|
| etcd | Raft | Kubernetes cluster state |
| Consul | Raft | Service coordination |
| CockroachDB | Raft | Distributed database |
| ZooKeeper | ZAB | Coordination service |
| Kafka | KRaft | Metadata management |

---

# Leader Election vs Distributed Lock

They are related.

Distributed lock:

```
Who owns this resource?
```

Leader election:

```
Who is the coordinator?
```

Both require:

- Ownership
- Failure detection
- Safety

---

# Why Not Use Redis Lock for Leader Election?

A Redis lock:

```
SETNX + TTL
```

has problems.

Example:

```
Leader A gets lock

Pause happens

TTL expires


Leader B gets lock


Leader A wakes up
```

Now:

```
Two leaders
```

---

Consensus-based systems avoid this using:

- Terms
- Quorum
- Fencing tokens

---

# Common Interview Questions

## Q: How does Raft prevent old leaders?

Every request contains a term.

If a leader sees a higher term:

```
Step down
```

The old leader cannot continue.

---

## Q: Why need majority?

Because only one group can have majority.

This prevents:

```
Two leaders
```

---

## Q: What happens during leader failure?

During election:

```
Writes stop
```

until:

```
New leader elected
```

This is the CAP consistency trade-off.

---

## Q: How do you reduce failover time?

Improve:

```
Heartbeat interval

Election timeout tuning
```

but keep enough time to avoid false elections.

---

## Q: Is leader election the same as consensus?

Leader election is a type of consensus.

The cluster must agree on:

```
Who is leader?
```

Consensus algorithms solve this agreement problem.

---

# Simple Rule To Remember

```
Need one coordinator?
        |
        v
Leader Election


Need replicas agree?
        |
        v
Consensus


Need prevent two leaders?
        |
        v
Majority + Terms


Need Kubernetes coordination?
        |
        v
etcd/Raft
```

---

# Interview Answer

> "Leader election is the process of choosing one node as the coordinator in a distributed system while preventing split brain. Raft uses randomized timeouts, terms, heartbeats, and majority voting to elect a leader safely. Systems like etcd and CockroachDB use Raft because it provides strong guarantees and predictable failure handling."

## Related topics
- [Consensus Algorithms](consensus-algorithms.md) — the underlying agreement protocol (Raft/Paxos/ZAB) that makes election safe
- [Distributed Locks](distributed-locks.md) — leader election is often implemented as "hold this lock to be leader," same failure modes apply
- [Quorum](quorum.md) — the majority math that makes split-brain structurally impossible
- [CAP Theorem](cap-theorem.md) — why leader-based systems are CP (unavailable during leaderless windows) rather than AP
- [High Availability](../08-reliability-operations/high-availability.md) — failover time from leader election directly determines system-level availability
