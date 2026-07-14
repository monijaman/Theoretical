# Leader Election
[← Back to index](../readme.md)

## What it is and why it's asked

Many distributed systems need exactly one node making a certain class of decision at a time — accepting writes, assigning partitions, scheduling jobs — because letting two nodes do it independently produces **split-brain**: two "primaries" both accepting writes that silently diverge, or two schedulers both dispatching the same job. Leader election is the mechanism by which a cluster of peers, none of which can unilaterally know the global state, agrees on a single one of them to hold that role, and — just as importantly — agrees on when that leader is no longer valid and a new one must take over.

Interviewers probe this because the naive version ("just pick the first node that starts up") ignores the actual hard problem: nodes can't reliably distinguish "the leader crashed" from "the leader is just slow/partitioned," so any election protocol has to make a safety/liveness trade-off under exactly that ambiguity — and the wrong trade-off produces two live leaders at once.

## Raft leader election: terms, timeouts, votes

Raft (the algorithm behind etcd, Consul, CockroachDB) elects a leader using randomized timeouts and monotonically increasing **term numbers**:

```
Every node starts as Follower.
Each follower has an election timeout (randomized, e.g. 150-300ms).

Follower's timeout fires (no heartbeat from a leader received)
        │
        ▼
  Becomes Candidate, increments its term (term N → N+1)
  Votes for itself, sends RequestVote(term=N+1) to all peers
        │
        ▼
  Each peer votes for at most one candidate per term
  (first-come-first-served, and only if candidate's log is
   at least as up-to-date as the voter's own log)
        │
        ▼
  Candidate receives votes from a MAJORITY → becomes Leader
  Leader sends periodic heartbeats (empty AppendEntries) to
  reset every follower's election timeout and prevent a new election
```

The **term number** is what makes this safe: it's a logical clock that only increases, attached to every message. A node receiving a message with a lower term than its own immediately rejects it and tells the sender to step down; a leader that stops hearing acknowledgment from a majority (e.g., because it's on the losing side of a partition) will see followers time out and elect a new leader with a *higher* term, and when the old leader's messages reach anyone, the stale term number identifies it as no longer valid, forcing it to step down. Randomized timeouts (not a fixed value) exist specifically to make the case of two candidates timing out simultaneously and splitting the vote rare — if it does happen, the term just increments again and another round runs.

## ZooKeeper: ephemeral sequential znodes

ZooKeeper doesn't have a built-in "leader" primitive — leader election is a well-known **recipe** built from ephemeral sequential znodes, the same primitive used for [distributed locks](distributed-locks.md):

```
Each candidate creates: /election/node-<sequence>  (ephemeral, sequential)

Node creates /election/node-0000000041 (ephemeral)
Node creates /election/node-0000000042 (ephemeral)
Node creates /election/node-0000000043 (ephemeral)

Lowest sequence number (0000000041) = the leader.
Every other node sets a watch on the znode immediately below its own
(not on the leader — avoids a "herd" of watchers all firing on leader change).

If the leader's session dies, ZooKeeper auto-deletes its ephemeral znode
   → the node watching 0000000041 (say, 0000000042) gets notified
   → it re-checks: am I now the lowest? Yes → becomes leader
```

Because znodes are ephemeral, tied to the client's *session* (active heartbeat), a crashed or partitioned leader has its znode removed automatically without any node needing to guess a timeout — the guarantee comes from ZooKeeper's own quorum-based (ZAB) session tracking, not from each peer independently timing out the leader.

## etcd: lease-based election

etcd exposes leader election as a documented recipe (`etcdctl elect`, or the `concurrency.Election` API) built on **leases**, which are etcd's version of a TTL that must be actively kept alive:

```
1. Client creates a lease with TTL (e.g. 10s), and must send
   keep-alive pings before it expires or the lease is revoked.
2. Client attempts to create a key (e.g. /election/leader) bound to
   that lease, using a transactional compare-and-swap
   (only succeeds if the key doesn't already exist).
3. Success → this client is leader for as long as it keeps the lease alive.
4. If the leader's process dies or stops sending keep-alives,
   the lease expires, etcd deletes the key, and the next
   candidate's create succeeds.
```

The key detail that makes this safer than a bare Redis TTL lock: the underlying consensus (Raft) guarantees that only one client's create can win the compare-and-swap, and etcd's `mod_revision` gives every write a cluster-wide, strictly increasing number usable as a fencing token by anything downstream that the elected leader talks to — the same fencing-token pattern covered in [distributed locks](distributed-locks.md).

## Split-brain and why quorum prevents it

Split-brain happens when a partition leaves two disjoint groups of nodes each believing they have enough support to elect (or keep) a leader — if both groups can independently declare a leader, you get two leaders accepting divergent writes simultaneously.

```
7-node cluster, partition splits it 4 | 3

  [A][B][C][D]         |         [E][F][G]
   4 nodes = majority   |          3 nodes = minority
   CAN elect a leader   |          CANNOT reach majority (needs 4)
   (quorum = 4 of 7)    |          stays leaderless, rejects writes

Only one side can ever have a majority of a fixed-size cluster at once
   → split-brain (two simultaneous leaders) is structurally impossible
     as long as every election requires a strict majority vote
```

This is precisely why Raft/ZAB require a **majority** (not "some quorum," specifically more than half) to elect or to commit: with a fixed cluster size, at most one partition-side can ever contain a majority, so at most one leader can ever be elected at a time, no matter how the network splits. This is the same N/2+1 math as [quorum](quorum.md) reads/writes, applied to votes instead of data replication.

## Leader lease renewal vs failover time

The election timeout / lease TTL you choose is a direct trade-off between **false-positive failovers** (electing a new leader while the old one is merely slow, causing unnecessary churn) and **failover latency** (how long the system is leaderless after a real crash):

```
Short timeout (e.g. 150ms):
  + Fast failover after a real crash
  - Risk of spurious re-elections during brief GC pauses/network blips
  - More heartbeat traffic (more frequent renewal required)

Long timeout (e.g. 10s):
  + Tolerant of transient slowness, fewer spurious elections
  - System is leaderless (often read-only or fully unavailable) for
    up to that long after a genuine leader crash
```

Raft's default assumption (heartbeat interval ≪ election timeout ≪ mean time between failures) is a tuning knob every real deployment adjusts: etcd's defaults (100ms heartbeat, 1000ms election timeout) favor fast failover for small, low-latency clusters; a geographically spread cluster with higher-variance network RTT needs a longer timeout to avoid an unstable "election storm" where nodes keep timing out each other's legitimately-slow-but-alive heartbeats.

## Trade-offs summary

| Mechanism | Failure detection | Fencing token available | Used by |
|---|---|---|---|
| Raft election timeout | Randomized timeout, no heartbeat from leader | Yes — term number | etcd, Consul, CockroachDB |
| ZooKeeper ephemeral sequential znode | Session heartbeat (auto-delete on session loss) | Yes — sequence number | Kafka (older versions), HBase, Solr |
| etcd lease + CAS | Active keep-alive, lease TTL expiry | Yes — mod_revision | Kubernetes control-plane coordination |
| Naive fixed-timeout / heartbeat only | Wall-clock timeout, no term/epoch | No (unless added manually) | Ad hoc/legacy systems — prone to split-brain |

## Common interview follow-ups

**Q: How does Raft prevent an old, partitioned-away leader from still accepting writes after a new leader is elected?**
Every message carries a term number; the old leader's term is now lower than the new leader's, so any follower (or client routing logic aware of terms) rejects the old leader's requests, and the moment the old leader receives any message with a higher term it steps down to follower — this is checked per-message, not on a timer.

**Q: Why do we need a majority specifically, not just "some" quorum?**
Because a strict majority of a fixed-size set is unique — two disjoint subsets of the same cluster can't both be a majority — which is exactly the property that makes two-leaders-at-once structurally impossible; any quorum size ≤ N/2 would allow two disjoint groups to both reach it.

**Q: What happens to writes during the leaderless window after a crash?**
They're rejected or queued/blocked (a CP choice, see [CAP theorem](cap-theorem.md)) until a new leader is elected and has re-established a majority — this is the direct, unavoidable cost of prioritizing correctness over availability during the gap.

**Q: Could you build leader election with a simple Redis lock instead of Raft/ZooKeeper?**
You could, and it's sometimes good enough for low-stakes coordination, but it inherits all the weaknesses covered in [distributed locks](distributed-locks.md) — a paused "leader" can wake up believing it's still leader with no term/epoch check to invalidate it, which is exactly the split-brain scenario purpose-built election protocols are designed to prevent.

**Q: How would you reduce failover time without causing spurious re-elections?**
Tighten the heartbeat interval relative to the election timeout (so the leader has many chances to prove liveness before a timeout fires) rather than just shortening the timeout itself, and keep the timeout randomized across nodes so simultaneous candidacies (and wasted vote-split rounds) stay rare even as the timeout shrinks.

**Q: Is leader election the same problem as consensus?**
It's a specific instance of consensus — the cluster must agree on one value (who the leader is) despite failures — which is why Raft folds leader election and log replication into the same protocol rather than treating them as separate problems; see [consensus algorithms](consensus-algorithms.md).

## Related topics
- [Consensus Algorithms](consensus-algorithms.md) — the underlying agreement protocol (Raft/Paxos/ZAB) that makes election safe
- [Distributed Locks](distributed-locks.md) — leader election is often implemented as "hold this lock to be leader," same failure modes apply
- [Quorum](quorum.md) — the majority math that makes split-brain structurally impossible
- [CAP Theorem](cap-theorem.md) — why leader-based systems are CP (unavailable during leaderless windows) rather than AP
- [High Availability](../08-reliability-operations/high-availability.md) — failover time from leader election directly determines system-level availability
