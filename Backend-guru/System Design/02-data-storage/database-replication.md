# Database Replication
[← Back to index](../readme.md)

## Why it matters

Replication means keeping copies of the same data on multiple nodes. Interviewers probe this because almost every "design X at scale" answer eventually needs a durable, highly-available data layer, and replication is the mechanism that gives you both read scalability and survivability when a machine (or a whole AZ) dies. The follow-up questions almost always target the part people gloss over: replication is asynchronous by default, which means followers lag, and lag is where correctness bugs and on-call pages come from.

A single database node is a single point of failure and a throughput ceiling. Replication solves durability (data survives a node loss) and read scaling (spread reads across replicas), but it does not by itself solve write scaling — writes still typically go through one leader per shard.

## How it works mechanically

### Leader-follower (master-slave) replication

```
                 writes
   Clients ─────────────────►  Leader (primary)
                                   │
                     WAL / binlog stream (replication log)
                                   │
                 ┌─────────────────┼─────────────────┐
                 ▼                 ▼                 ▼
            Follower A         Follower B        Follower C
           (read replica)     (read replica)    (read replica)
                 ▲                 ▲                 ▲
                 └────────── reads ┴─────────────────┘
                            Clients
```

1. The leader accepts all writes.
2. Every write is recorded in a replication log — Postgres calls it the WAL (write-ahead log), MySQL calls it the binlog.
3. Followers pull (or receive a push of) that log and apply it in order to their own copy of the data.
4. Reads can be served from any follower (with the caveat that they may be stale — see replication lag below).
5. If the leader dies, one follower is promoted to leader (failover).

### Synchronous vs asynchronous

- **Asynchronous**: leader commits and acknowledges the client immediately; replication happens in the background. Fast, but a leader crash right after commit can lose the last few writes that never reached a follower.
- **Synchronous**: leader waits for at least one follower to confirm it has received (and possibly applied) the write before acknowledging the client. Zero data loss on failover, but write latency now includes a network round trip to the follower, and if that follower is down, writes can stall.
- **Semi-synchronous**: leader waits for the write to reach at least one follower's log (not necessarily fully applied/durable on disk), then acknowledges. A middle ground — MySQL's `semi-sync` replication and Postgres's `synchronous_commit = remote_write` both work this way.

```
Async:      Client → Leader (ack) ────► Follower (eventually)
Semi-sync:  Client → Leader → Follower (ack received) → Leader (ack) → Client
Sync:       Client → Leader → Follower (write durable, ack) → Leader (ack) → Client
```

### Multi-leader (multi-master) replication

Multiple nodes each accept writes and replicate to each other, usually across regions/datacenters to avoid cross-region write latency.

```
   Region US ──writes──► Leader US ◄──sync──► Leader EU ◄──writes── Region EU
```

The hard problem is write conflicts: two leaders can accept conflicting writes to the same key before either replication message arrives. Resolution strategies: last-write-wins (with a timestamp/version vector), application-level merge (CRDTs), or conflict-free design (each leader owns a disjoint key range).

### Replication lag and its consequences

Lag is the gap between "data committed on the leader" and "data visible on a follower." Common symptoms:

- **Read-your-own-writes violation**: a user posts a comment, the write hits the leader, the page reload reads from a lagging follower and the comment appears to have vanished.
- **Monotonic read violation**: a user reads from follower A (up to date), then reads from follower B (further behind) and sees older data — data appears to move backward in time.

Mitigations: route a user's own reads to the leader for some window after a write ("read-after-write consistency"), pin a session to one replica (sticky routing), or track a log sequence number/timestamp and only route reads to replicas that have caught up to it.

### Failover

```
Leader dies
   │
   ▼
Detect failure (heartbeat timeout / consensus check)
   │
   ▼
Elect new leader (most caught-up follower, or via Raft/etcd/ZooKeeper)
   │
   ▼
Reconfigure remaining followers to replicate from new leader
   │
   ▼
Redirect client writes (DNS/VIP flip, proxy reconfig, or driver-level topology refresh)
```

Danger zones: **split-brain** (two nodes both think they're leader — usually because failover happened too eagerly during a network partition, not an actual leader crash) and **lost writes** (a follower that hadn't caught up gets promoted, silently discarding the leader's most recent unreplicated commits).

## Real-world examples

- **PostgreSQL streaming replication**: WAL records are streamed to followers over a TCP connection (`walsender`/`walreceiver` processes). Supports async, sync (`synchronous_standby_names`), and quorum-sync (wait for N of M replicas). Tools like Patroni + etcd/Consul handle automated failover on top.
- **MySQL binlog replication**: leader writes to a binary log; followers run an I/O thread to copy it and a SQL (or applier) thread to replay it. Group Replication and MySQL InnoDB Cluster add Paxos-based consensus for automatic failover. Semi-sync is a plugin (`rpl_semi_sync`).
- **MongoDB replica sets**: a set of mongod nodes (one primary, N secondaries) replicate via the oplog (a capped collection acting as the replication log). Uses a Raft-like protocol (not literally Raft, but similar log-index/election-term concepts) for automatic primary election. Write concern (`w: "majority"`) and read concern let you dial in the sync/async trade-off per query.
- **Kafka** (as a comparison point): partition replication uses a leader + in-sync replica set (ISR); `acks=all` is the "synchronous" analog.

## Trade-offs

| Approach | Pros | Cons |
|---|---|---|
| Async replication | Low write latency, leader never blocked on followers | Possible data loss on failover; replica lag |
| Sync replication | No data loss on failover | Higher write latency; availability tied to follower health |
| Semi-sync | Balances latency and durability | Still adds one network hop; only guarantees the write reached *a* follower's log, not majority |
| Single-leader | Simple conflict model (no write conflicts) | All writes bottlenecked on one node; cross-region writes pay leader's-region latency |
| Multi-leader | Low-latency local writes in each region | Conflict resolution complexity; eventual consistency across regions |

## Common interview follow-ups

**Q: How do you achieve "read-your-own-writes" with async replicas?**
Route reads for the affected user/session to the leader for a short TTL after a write, or track the WAL position/timestamp of the user's last write and only serve reads from a replica whose applied position is at least that recent.

**Q: What happens if you promote a follower that hasn't fully caught up?**
Any writes committed on the old leader but not yet replicated to that follower are lost — this is why failover tooling picks the *most caught-up* replica and, in stricter setups, requires synchronous replication to at least one node so a "most caught-up" replica is guaranteed to have every acknowledged write.

**Q: How would you detect and prevent split-brain during failover?**
Use a consensus system (etcd/ZooKeeper/Raft) to hold an exclusive "leader lease" rather than a simple heartbeat timeout; fencing tokens ensure a demoted leader that comes back after a partition can't accept writes even if it still thinks it's primary.

**Q: Why not just make every replica synchronous to guarantee zero data loss?**
Because now write availability depends on every replica being healthy and reachable, and latency includes the slowest replica's round trip — you've traded a small chance of data loss for a much larger chance of write unavailability, which is usually the wrong trade for latency-sensitive systems.

**Q: How does semi-sync differ from a quorum write?**
Semi-sync typically waits for exactly one replica to acknowledge; a quorum write (e.g., MongoDB `w:"majority"`) waits for a majority of the replica set, which tolerates more simultaneous failures and is what you'd want before telling a client a financial transaction is durable.

## Related topics

- [Database Sharding](database-sharding.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [Leader Election](../03-consistency-distributed/leader-election.md)
- [Consensus Algorithms](../03-consistency-distributed/consensus-algorithms.md)
- [Quorum](../03-consistency-distributed/quorum.md)
- [High Availability](../08-reliability-operations/high-availability.md)
- [Disaster Recovery](../08-reliability-operations/disaster-recovery.md)
