# PACELC Theorem
[← Back to index](../readme.md)

## What it is and why it's asked

PACELC (Daniel Abadi, 2010, pronounced "pass-elk") is the fix for the biggest gap in CAP: **CAP only describes behavior during a network partition, but partitions are rare and brief — most of a distributed system's life is spent in normal operation, and there's still a trade-off to make even then.**

PACELC states:

> **P**artition: if there **is** a Partition, trade off **A**vailability vs **C**onsistency (this part is exactly CAP).
> **E**lse (normal operation, no partition): trade off **L**atency vs **C**onsistency.

An interviewer bringing this up is testing whether you understand that consistency has a *cost in latency* even when everything is healthy — replicating a write to a quorum of nodes before acknowledging it is slower than acknowledging locally and replicating asynchronously, partition or not. CAP alone lets candidates believe "no partition → free lunch, get C and A both." PACELC removes that illusion.

## The four-letter classification

Every system gets a two-part label:

```
                 ┌─── during Partition ───┐   ┌─── Else (normal ops) ───┐
                 │   Availability / Consistency │  Latency / Consistency │
System           │         (A or C)              │        (L or C)        │
─────────────────┼───────────────────────────────┼────────────────────────┤
DynamoDB         │              PA                │           EL          │
Cassandra        │              PA                │           EL          │
MongoDB (default)│              PC                │           EC          │
ZooKeeper        │              PC                │           EC          │
etcd / Raft KV   │              PC                │           EC          │
Spanner          │              PC                │           EC*         │
Riak (tunable)   │        PA (default) or PC       │       EL or EC        │
```
*Spanner is PC/EC but engineers extremely tight latency bounds via TrueTime, so the "cost" of EC is much smaller in practice than a naive Paxos-over-WAN system.

So you get one of four combinations: **PC/EC**, **PC/EL** (rare/inconsistent design), **PA/EC** (rare), and **PA/EL**. In practice almost everything clusters into **PA/EL** (Dynamo-style) or **PC/EC** (consensus-store style) because the two choices tend to be philosophically coupled: if you've already decided to sacrifice consistency for availability under partition, you'll usually also sacrifice consistency for latency day-to-day, and vice versa.

## Why the "Else" trade-off exists even with a perfect network

Even with zero packet loss, replicating a write to multiple nodes before confirming it to the client takes time — speed of light and processing time across a WAN or even across AZs is not zero.

```
Strong consistency (EC) — synchronous replication:

  Client → Leader ──write──▶ Replica 1  (ack)
                   ──write──▶ Replica 2  (ack)
                   ◀── wait for quorum acks ──
           Client ◀── success (slower, but replicas match)

Low latency (EL) — asynchronous replication:

  Client → Leader ──write──▶ ack immediately
                   Leader ──(async, later)──▶ Replica 1
                                          ──▶ Replica 2
           Client ◀── success (fast, but replicas lag)
```

There is no partition in either diagram — this is everyday, healthy operation. The EC path pays a latency tax (round trip to a quorum, or to every replica) purely to guarantee the read-after-write is consistent everywhere. The EL path skips that tax and accepts a replication lag window during which a read from a lagging replica returns stale data.

## Classifying real systems

**DynamoDB — PA/EL.** Under partition, it stays available on both sides (sloppy quorums, hinted handoff). Under normal operation, its default read is eventually consistent and fast; you can opt into "strongly consistent reads" per request, which pushes that specific read toward EC at a latency cost — this per-request tunability is exactly why Abadi's model is useful, since it lets you describe a *knob* rather than a fixed label.

**Cassandra — PA/EL by default, but tunable.** `CL=ONE` for both read and write is PA/EL: fastest, most available, weakest guarantee. `CL=QUORUM` for both moves it toward PC/EC-like behavior: a partition that leaves fewer than quorum nodes reachable will start rejecting requests (more C, less A), and normal-operation requests wait for a quorum of replicas to respond (more C, less L).

**MongoDB — PC/EC leaning.** Single primary per replica set; by default reads and writes go through the primary, and `majority` write concern means the client waits for replication to a majority of the set before ack (EC = pays latency for consistency). If a partition strands the primary from a majority, the replica set cannot elect/retain a writable primary — it becomes unavailable rather than split-brained (PC).

**ZooKeeper / etcd — PC/EC.** Every write goes through the Raft/ZAB leader and must be replicated to a quorum before it's committed (EC — latency cost even absent a partition). During a partition, the minority side has no quorum and rejects requests (PC).

**Spanner — PC/EC, but latency-optimized.** Commits use Paxos across replicas (EC cost paid on every write) plus TrueTime `commit wait` to guarantee external consistency of timestamps. Google spent enormous engineering effort (atomic clocks + GPS in every datacenter) specifically to shrink the EC latency tax that a naive implementation would otherwise pay.

## Trade-offs summary

| Choice | Optimizes for | Cost | Typical use case |
|---|---|---|---|
| PC/EC | Correctness always | Higher latency, occasional unavailability | Coordination services, financial ledgers, config stores, inventory |
| PA/EL | Speed and uptime always | Stale reads, conflict resolution needed | Feeds, caches, presence, shopping carts, analytics counters |
| Tunable (Cassandra/Riak/Dynamo) | Per-operation choice | Operational complexity of choosing consistency level per call | Systems with mixed requirements (e.g., strong read for checkout, eventual for recommendations) |

## Common interview follow-ups

**Q: Why doesn't CAP alone cover this?**
CAP is defined strictly in terms of behavior *during a partition* — it's silent about the far more common case where the network is fine but you still must choose between waiting for replicas (consistent, slow) or not (fast, stale). PACELC adds that second axis explicitly.

**Q: Can a system be PC/EL — strongly consistent under partition but low-latency normally?**
In theory a system could serve fast local reads normally and only enforce strict quorum behavior when it detects a partition, but this is uncommon because detecting "no partition" reliably is itself hard (you can't distinguish a slow node from a partitioned one without a timeout, which reintroduces latency). Most real systems keep the same replication discipline in both states for simplicity.

**Q: How would you use PACELC to justify a technology choice in a design interview?**
State the business requirement first (e.g., "an inventory decrement must never oversell"), then map it to PC/EC (accept latency and rare unavailability to avoid overselling), and name a real system (etcd, ZooKeeper-backed lock, or Spanner) rather than staying abstract — that's the signal of someone who's operated these systems, not just read about them.

**Q: Where does client-perceived latency actually come from in an EC system?**
Primarily from waiting for acknowledgment from a quorum (or all) replicas before returning success to the client, plus cross-region network RTT if replicas are geographically distributed, plus consensus protocol overhead (leader election, log replication rounds) if using Raft/Paxos.

**Q: Is PA/EL "worse" than PC/EC?**
No — it's a different point on the same trade-off curve, correct for a different problem. A "like" button that occasionally shows a stale count for a second is a non-issue; a payment ledger with the same staleness is a incident. The theorem doesn't rank the choices, it forces you to make the choice explicit.

## Related topics
- [CAP Theorem](cap-theorem.md) — the partition-only half of this trade-off
- [Strong vs Eventual Consistency](strong-vs-eventual-consistency.md) — the consistency models on the "C" side of both axes
- [Quorum](quorum.md) — the N/W/R knobs that let you move a system along the EL↔EC axis per request
- [Database Replication](../02-data-storage/database-replication.md) — sync vs async replication is the literal mechanism behind EC vs EL
- [Consensus Algorithms](consensus-algorithms.md) — why PC/EC systems pay a latency cost on every write
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md) — PACELC trade-offs become dominant once replicas cross regions
