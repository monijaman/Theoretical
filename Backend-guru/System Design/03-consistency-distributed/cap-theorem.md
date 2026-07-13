# CAP Theorem
[← Back to index](../readme.md)

## What it is and why it's asked

CAP (Brewer's theorem, 2000, formalized by Gilbert & Lynch in 2002) says a distributed data store can only guarantee **two** of the following three properties **at the same time, during a network partition**:

- **Consistency (C)** — every read receives the most recent write or an error. This is linearizability, not the "C" in ACID.
- **Availability (A)** — every request to a non-failing node receives a (non-error) response, without guaranteeing it's the latest write.
- **Partition tolerance (P)** — the system continues to operate despite an arbitrary number of messages being dropped or delayed between nodes.

Interviewers ask this not to hear the textbook triangle, but to see if you understand the real implication: **in any system that spans more than one node over an unreliable network, P is not optional.** The actual choice you make is between C and A, and only *during* a partition. Candidates who say "we chose CA" are telling the interviewer they don't understand the theorem.

## Why P isn't a real choice

A single-node database (or a single-node in-memory cache) can be CA — it never partitions because there's nothing to partition between. The moment you have two or more nodes that must coordinate over a network — replicas, shards, a multi-AZ cluster — packets *will* be dropped, links *will* fail, GC pauses *will* look like partitions to peers. You cannot opt out of network failures; you can only decide what your system does when one happens.

So CAP is really a decision tree with one fork:

```
                    Network partition occurs
                              │
              ┌───────────────┴────────────────┐
              │                                 │
     Reject/block requests             Serve requests anyway
     until partition heals              from both sides
              │                                 │
        Consistency (CP)                 Availability (AP)
```

Everything else — normal operation with no partition — both branches behave identically: you can have both C and A when the network is healthy. CAP is exclusively about the failure mode.

## CP systems: choose consistency, sacrifice availability

When a partition splits the cluster, a CP system will refuse to serve (or will block) requests on the minority side rather than risk returning stale or conflicting data.

**Examples:**
- **ZooKeeper** — uses ZAB (a Paxos-like protocol) and requires a quorum (majority) of nodes to make progress. If a partition leaves a subset without quorum, that subset stops accepting writes (and often reads) entirely. This is why ZooKeeper is used for config management and coordination, not for user-facing low-latency reads at any cost.
- **etcd** — Raft-based; same story. A minority partition can't elect/keep a leader and returns errors rather than stale data. This makes it safe as the source of truth for Kubernetes cluster state.
- **HBase / traditional RDBMS with synchronous replication** — a primary that can't reach enough replicas to satisfy its durability guarantee will reject writes rather than under-replicate them.

```
Cluster of 5 nodes, partition splits it 3 | 2

  [A][B][C]      |      [D][E]
   quorum=3       |     minority=2
   keeps serving  |     rejects writes/reads
   (leader here)  |     ("not enough replicas")
```

## AP systems: choose availability, sacrifice consistency

When partitioned, an AP system keeps accepting reads and writes on *both* sides, and reconciles divergent state later (via vector clocks, last-write-wins, CRDTs, or application-level merge logic).

**Examples:**
- **Cassandra** — tunable consistency (`ONE`, `QUORUM`, `ALL` per query), but its default posture and marketing use-case is AP: every replica accepts writes during a partition, and conflicts are resolved by timestamp (last-write-wins) or read-repair afterward.
- **DynamoDB (and the original Dynamo paper)** — sloppy quorums and hinted handoff mean writes succeed even when the "correct" replica set is unreachable, by writing to a temporary substitute node. Prioritizes "always writable."
- **CouchDB / Riak** — explicit multi-version conflict resolution (siblings) exposed to the application when concurrent writes diverge.

```
Cluster split 3 | 2, both sides keep serving writes

  [A][B][C]      |      [D][E]
   accepts writes |     accepts writes
   for key X=1    |     for key X=2

        Partition heals → conflict on X → resolved by
        LWW / vector clock / app-level merge / read-repair
```

## Common misconceptions (the ones that trip people up in interviews)

1. **"We built a CA system."** Impossible for any multi-node system on a real network. What people mean is "CA when there's no partition," which is trivially true for every system and says nothing useful. Single-node systems (a single Postgres instance) are the only honest CA example, and even they aren't really part of this conversation since there's no partition to reason about.
2. **CAP's "C" is not ACID consistency.** CAP-C is linearizability (single-copy consistency of reads/writes). ACID-C is about constraint/invariant preservation (foreign keys, uniqueness). A system can be CAP-inconsistent while still being ACID-consistent within each node's local transactions.
3. **CAP is binary and only about total network partitions.** In reality partitions are partial, transient, and asymmetric (A can reach B but not C). Modern designs (see PACELC) also care about the latency/consistency trade-off that exists even with *no* partition at all — CAP is silent on that, which is precisely why PACELC exists.
4. **"NoSQL = AP, SQL = CP."** False as a blanket rule. Spanner is a "NewSQL" system that is effectively CP (uses Paxos + TrueTime) yet offers external consistency. MongoDB is document-oriented but defaults to CP-leaning behavior (single primary, majority write concern). The database category doesn't determine the CAP choice — the configuration and consensus protocol do.
5. **The choice is global and permanent.** Real systems make the C-vs-A choice *per operation* or *per keyspace* via tunable consistency levels (Cassandra's `CL=QUORUM` vs `CL=ONE`, DynamoDB's eventually-consistent vs strongly-consistent reads). You don't pick once for the whole cluster.

## Trade-offs summary

| | CP | AP |
|---|---|---|
| Behavior during partition | Blocks/errors on minority side | Serves stale/divergent data on both sides |
| User experience | Occasional unavailability | Occasional stale reads / conflicting writes |
| Conflict resolution needed? | No (single accepted history) | Yes (LWW, vector clocks, CRDTs, app merge) |
| Good for | Coordination, locks, leader election, financial ledgers, inventory counts | Shopping carts, social feeds, session stores, presence/likes, caches |
| Examples | ZooKeeper, etcd, HBase, Spanner | Cassandra (default), DynamoDB, Riak, CouchDB |

## Common interview follow-ups

**Q: If a single-node database can't partition, is it CA or is CAP just not applicable?**
CAP is not applicable — it's a theorem about behavior across a network boundary between nodes. A single node has no such boundary, so calling it "CA" is technically true but vacuous; the more useful framing is "CAP doesn't apply here."

**Q: How does Spanner get both strong consistency and high availability, seemingly beating CAP?**
It doesn't beat CAP — it's CP, but engineers hard on minimizing the *practical* cost of the P branch: TrueTime (atomic clocks + GPS) tightens clock uncertainty so Paxos groups can commit with very low latency and very rare partition events across regions, plus enough replicas that losing one region still leaves a quorum. It sacrifices availability during a real partition just like any CP system; it's just rare and brief in practice.

**Q: How would you pick CP vs AP for a specific feature, not a whole system?**
Ask what's worse: showing stale/wrong data, or showing an error/spinner. Payment/inventory decrement → CP (double-spend is worse than a failed request). Like counts, view counts, "seen" receipts → AP (a slightly stale count is fine, an error is not).

**Q: What's the relationship between CAP and quorum-based systems like Dynamo?**
Quorums (N, W, R) let you tune the position on the CP↔AP spectrum per operation: W+R > N gives strong consistency (CP-leaning), W+R ≤ N allows stale reads but higher availability (AP-leaning). See the [quorum](quorum.md) page for the math.

**Q: Does CAP say anything about latency?**
No — that's exactly the gap PACELC fills. CAP is silent on the no-partition case; PACELC adds that even without a partition, you still trade latency against consistency (synchronous replication is consistent but slow; async is fast but can be stale).

## Related topics
- [PACELC Theorem](pacelc-theorem.md) — extends CAP to the normal-operation case (latency vs consistency)
- [Strong vs Eventual Consistency](strong-vs-eventual-consistency.md) — the consistency models CAP's "C" and "A" branches actually produce
- [Quorum](quorum.md) — the N/W/R math that lets you tune where a system sits between CP and AP
- [Consensus Algorithms](consensus-algorithms.md) — how CP systems like etcd/ZooKeeper actually achieve their consistency guarantee
- [Database Replication](../02-data-storage/database-replication.md) — sync vs async replication is the mechanism behind the CP/AP choice
- [Distributed Transactions](../02-data-storage/distributed-transactions.md) — 2PC/Saga trade-offs are a CAP-adjacent concern across services
