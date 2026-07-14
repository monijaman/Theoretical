# Quorum
[← Back to index](../readme.md)

## What it is and why it's asked

A quorum is the minimum number of nodes that must participate in an operation for the system to trust its result. Instead of requiring *every* replica to respond (slow, and unavailable the moment one replica is down) or trusting *any single* replica (fast, but wrong the moment replicas diverge), quorum systems let you dial in exactly how many nodes must agree for a read and for a write, and the relationship between those two numbers determines whether you get strong consistency or just availability. Interviewers ask about quorum because it's the concrete arithmetic behind almost every abstract trade-off discussed elsewhere in this folder — [CAP](cap-theorem.md), [PACELC](pacelc-theorem.md), and [strong vs eventual consistency](strong-vs-eventual-consistency.md) all cash out, in Dynamo-style systems, as literal quorum numbers you can compute.

## The N/W/R math

- **N** — the number of replicas a piece of data is stored on (the replication factor).
- **W** — the number of replicas that must acknowledge a **write** before it's considered successful.
- **R** — the number of replicas that must respond to a **read** before its result is returned to the client.

The core guarantee: **if W + R > N, every read quorum and every write quorum are guaranteed to overlap in at least one replica**, so at least one node in any read set has seen the most recent write.

```
N = 3 replicas: [A]  [B]  [C]

Write with W=2: writes to any 2 of {A,B,C}, say A and B, succeeds
Read with R=2:  reads from any 2 of {A,B,C}

  Write set {A,B}  ∩  Read set {B,C}  =  {B}   → overlap guaranteed
  Write set {A,B}  ∩  Read set {A,C}  =  {A}   → overlap guaranteed

Because W + R = 2 + 2 = 4 > N = 3, ANY read quorum of size 2 must
share at least one node with ANY write quorum of size 2 — there's
no way to pick 2 of 3 nodes twice with zero overlap.
```

This is the same pigeonhole logic as majority-based [consensus](consensus-algorithms.md): with only N nodes total, two subsets whose sizes sum to more than N cannot be disjoint. It doesn't require a single leader or any coordination between the read and write paths — the guarantee is purely combinatorial, which is exactly why Dynamo-style systems can offer it without full consensus overhead.

## Tunable consistency: the same table, different guarantees per request

Dynamo-style databases (Cassandra, DynamoDB's underlying model, Riak, ScyllaDB) let the client choose W and R **per operation**, trading off consistency, latency, and availability on the fly:

```
N = 3 for all examples below

W=1, R=1  (W+R=2 ≤ N=3)   → fastest, most available, NOT guaranteed
                              consistent — a read can miss the latest write
                              (only 1 of 3 replicas needs to be up at all)

W=2, R=2  (W+R=4 > N=3)   → strong consistency guaranteed, tolerates
                              1 replica being down for either op

W=3, R=1  (W+R=4 > N=3)   → strong consistency, but write blocks unless
                              ALL 3 replicas are up (fragile writes,
                              fast/available reads)

W=1, R=3  (W+R=4 > N=3)   → strong consistency, but read blocks unless
                              ALL 3 replicas are up (fragile reads,
                              fast/available writes)
```

The practical sweet spot most teams use is **W=QUORUM, R=QUORUM** (majority of N for both) — it gives the overlap guarantee (W+R > N) while still tolerating some replicas being down on *either* path, unlike the W=3 or R=3 extremes above which make one path fully fragile. This is Cassandra's `CL=QUORUM` for both reads and writes, and it's exactly the DynamoDB `ConsistentRead=true` mechanism described in [strong vs eventual consistency](strong-vs-eventual-consistency.md) — a strongly consistent read is really just a read with R chosen so W+R > N.

## Worked example: N=3, W=2, R=2 vs N=3, W=1, R=1

```
Scenario: replica B is temporarily lagging behind (hasn't applied
the latest write to key X yet). Latest value of X is "v2", B still has "v1".

N=3, W=2, R=2:
  Write "v2" to X: succeeds once 2 of {A,B,C} ack — say A and C ack (v2), W satisfied.
  Read X: must contact 2 of {A,B,C} — say B and C respond: {v1, v2}
     → client (or coordinator) detects the mismatch, returns the
       higher-timestamped value (v2) to the caller, and can trigger
       read-repair to push v2 to B.
     → RESULT: caller always gets v2 (the latest write), guaranteed
       by the W+R>N overlap, at the cost of contacting 2 nodes per op.

N=3, W=1, R=1:
  Write "v2" to X: succeeds as soon as ANY 1 replica acks — say A acks, done.
     (B and C haven't even received it yet, W is already satisfied)
  Read X: contacts only 1 replica — if it happens to be B (still "v1"):
     → RESULT: caller gets STALE data (v1), even though a write already
       "succeeded" — there was no overlap requirement, so nothing
       guaranteed the read would hit a replica that has v2.
     → Cheapest possible latency (1 round trip each way), but the
       classic AP trade-off: availability and speed over correctness.
```

The W=2,R=2 case costs one extra network round trip on each side compared to W=1,R=1, and in exchange converts "the client *might* see stale data" into "the client is *mathematically guaranteed* to see the latest write" — assuming no more than N−majority replicas are simultaneously unreachable.

## Sloppy quorums and hinted handoff

Strict quorums (always writing to the *specific* N replicas assigned to a key) become unavailable for writes the moment fewer than W of those specific nodes are reachable — even if plenty of *other* healthy nodes exist in the cluster. Dynamo's answer is the **sloppy quorum**: if one of the "correct" N replicas is unreachable, temporarily write to the next healthy node in the ring instead, to preserve write availability.

```
Key X's "correct" replicas (by consistent hashing): [A, B, C]
Node B is down / partitioned away.

Sloppy quorum write (W=2):
  Write to A (correct) + D (substitute, next node on the ring)
  → W=2 satisfied even though D isn't one of X's "real" replicas

D holds a HINT: "this data belongs to B, forward it when B returns"

When B comes back online:
  D detects B is alive → hands off the hinted data to B → deletes its
  local copy → key X is now correctly back on {A, B, C}
```

This is explicitly an availability-over-consistency choice (an AP move, per [CAP theorem](cap-theorem.md)): a read quorum contacting only the "correct" replicas {A,B,C} might miss the write that's temporarily parked on D as a hint, so sloppy quorums technically break the strict W+R>N overlap guarantee during the window before hinted handoff completes — traded deliberately for the write never being rejected just because one specific replica is briefly unreachable.

## Trade-offs summary

| Configuration | Consistency | Availability / Latency | Notes |
|---|---|---|---|
| W+R > N (e.g., W=2,R=2 on N=3) | Strong (guaranteed overlap) | Lower — needs multiple nodes per op | Standard "QUORUM/QUORUM" choice |
| W+R ≤ N (e.g., W=1,R=1 on N=3) | Eventual / no guarantee | Highest — 1 node per op | Fine for caches, counters, low-stakes data |
| W=N (write to all) | Strong reads possible even with R=1 | Writes fragile — any replica down blocks writes | Rare; used when reads must be cheap |
| R=N (read from all) | Strong writes possible even with W=1 | Reads fragile — any replica down blocks reads | Rare; used when writes must be cheap |
| Sloppy quorum + hinted handoff | Temporarily weaker during outage | Writes stay available despite node loss | Dynamo/Cassandra default under node failure |

## Common interview follow-ups

**Q: If W+R > N guarantees overlap, does that mean the read always returns the absolute latest write instantly?**
It guarantees at least one replica in the read set has the latest write, but the read path must still detect and resolve the case where different replicas in the read set disagree (via timestamps/version vectors) and return the most recent one — the overlap is a guarantee of *availability of the right data somewhere in the set*, not automatic agreement across the set.

**Q: Why would anyone choose W=1, R=1 if it doesn't guarantee consistency?**
For data where staleness is cheap and latency/availability matters far more — view counters, presence/heartbeat data, ephemeral session caches — the same reasoning as choosing AP over CP for a specific feature, covered in [CAP theorem](cap-theorem.md).

**Q: How does a sloppy quorum affect the W+R>N guarantee?**
It weakens it — a write acknowledged via a substitute node (a "hint") isn't yet on any of the "correct" N replicas a normal read quorum would contact, so a read can miss it until hinted handoff completes; it's a deliberate, temporary availability-over-consistency trade that resolves itself once the original replica recovers.

**Q: What's the difference between quorum in Dynamo-style systems and quorum in Raft/Paxos?**
Dynamo-style quorums are per-operation and don't require a leader or ongoing agreement between reads and writes — just enough overlap in the sets contacted; Raft/Paxos quorums are majorities used to agree on a single, globally ordered sequence of committed values via a leader, which is a strictly stronger (and more expensive) guarantee — see [consensus algorithms](consensus-algorithms.md).

**Q: How do you choose N?**
N is primarily a durability/fault-tolerance decision (how many copies survive losing K nodes or an AZ), typically 3 for most systems (tolerates 1 node loss with quorum reads/writes) or higher for wider geographic replication; W and R are then tuned against that fixed N per the consistency/availability needs of each operation type.

**Q: Can quorum reads/writes replace a consensus protocol entirely?**
No — quorums alone don't order operations relative to each other or elect a single decision-maker, which is why quorum-based stores still need extra machinery (vector clocks, LWW, read-repair, or an explicit consensus layer) to handle concurrent writes to the same key, whereas Raft/Paxos bake ordering and agreement into the protocol itself.

## Related topics
- [CAP Theorem](cap-theorem.md) — quorum settings are the literal dial between the CP and AP branches
- [PACELC Theorem](pacelc-theorem.md) — W/R choice directly trades off latency vs consistency during normal operation
- [Strong vs Eventual Consistency](strong-vs-eventual-consistency.md) — DynamoDB's consistent vs eventually-consistent reads are a quorum choice in disguise
- [Consensus Algorithms](consensus-algorithms.md) — majority quorums also underpin Raft/Paxos, for a stronger ordering guarantee
- [Database Replication](../02-data-storage/database-replication.md) — quorum is one strategy for how replicas are read/written
