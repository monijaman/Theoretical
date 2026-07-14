# Design a Distributed Message Broker (Kafka-like)
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Producers publish messages to named topics; topics are split into partitions for parallelism.
- Consumers (organized into consumer groups) read messages from partitions, tracking their own progress (offsets).
- Messages persist for a configurable retention period (time- or size-based), independent of whether they've been consumed.
- Support log compaction for topics that represent "latest value per key" rather than an event stream.
- Guarantee ordering within a partition (never across the whole topic).

**Non-functional**
- Durability: an acknowledged write must survive broker failure — this is the core value proposition of the whole system.
- High throughput: sustain very high sustained write/read rates via sequential disk I/O and batching, not per-message round trips.
- Horizontal scalability: adding partitions and brokers increases both storage and throughput capacity linearly.
- Configurable consistency/durability trade-off per producer (fire-and-forget vs. leader-ack vs. full-ISR-ack).
- Consumers can be slow, fast, or offline for a while without the broker losing data they haven't yet read (within retention).

**Assumptions**
- 5,000 topics, 50 partitions/topic average, 3x replication factor.
- 2M messages/sec cluster-wide average, average message size 1KB.
- 7-day default retention for most topics; a subset are compacted (key-value changelog topics).

## 2. Capacity Estimation

**Throughput**
- 2,000,000 messages/sec × 1KB ≈ **~2 GB/sec** raw write throughput cluster-wide, before replication.
- With replication factor 3, actual disk write volume across the cluster ≈ **~6 GB/sec** (each message physically written to leader + 2 followers).

**Storage**
- 7-day retention × 2 GB/sec × 86,400 sec/day × 7 ≈ 2 × 86,400 × 7 ≈ 1,209,600 GB-seconds... computed directly: 2 GB/sec × 604,800 sec/week ≈ **~1.2 PB** of raw (unreplicated) data resident at any time; × 3 replication ≈ **~3.6 PB** total disk footprint cluster-wide.
- Per broker (assume 100 brokers in the cluster): 3.6 PB / 100 ≈ **~36 TB/broker** — well within range of dense-storage broker nodes (large local NVMe/SSD arrays), but this is the number that drives broker count and disk provisioning.

**Partition count**
- 5,000 topics × 50 partitions ≈ **250,000 total partitions** cluster-wide, × 3 replicas ≈ 750,000 partition-replicas distributed across 100 brokers ≈ ~7,500 partition-replicas/broker. This is a meaningful operational ceiling — each partition-replica carries per-partition overhead (open file handles, replication threads, metadata) — real clusters tune partition count per broker down to a few thousand max for this reason, which is why partition count (not just data volume) is a first-class capacity variable, not an afterthought.

**Consumer fan-out**
- A single partition can only be actively consumed by one consumer within a given consumer group at a time (this is what bounds max parallelism within a group to partition count) — 50 partitions/topic means at most 50 consumer instances in one group can process a topic in parallel; a group needing more parallelism than that requires more partitions, not more consumers.

## 3. High-Level Architecture

```
┌────────────┐        ┌─────────────────────────────────────────┐
│  Producers   │──────▶│              Broker Cluster                 │
└────────────┘        │  ┌───────────┐  ┌───────────┐  ┌───────────┐│
                       │  │ Broker 1    │  │ Broker 2    │  │ Broker 3    ││
                       │  │ P0(leader)  │  │ P0(replica) │  │ P1(leader)  ││
                       │  │ P1(replica) │  │ P1(replica) │  │ P0(replica) ││
                       │  └───────────┘  └───────────┘  └───────────┘│
                       └───────────────────┬─────────────────────────┘
                                           │ metadata / leader info
                                 ┌─────────▼──────────┐
                                 │  Controller (elected  │  (tracks partition leadership,
                                 │  via consensus)        │   broker liveness)
                                 └─────────┬──────────┘
                                           │
                       ┌───────────────────┴───────────────────┐
                       ▼                                         ▼
              ┌──────────────────┐                    ┌──────────────────┐
              │  Consumer Group A   │                    │  Consumer Group B   │
              │  (offsets tracked    │                    │  (independent offset │
              │   per group)          │                    │   position)           │
              └──────────────────┘                    └──────────────────┘
```

**Walkthrough**
1. **Produce**: a producer determines which partition a message belongs to (via key hash or round-robin — see 6.2) and sends it to that partition's current leader broker.
2. **Replicate**: the leader appends the message to its local append-only log segment and the message is replicated to the partition's follower replicas; depending on the producer's configured acknowledgment level, the write is considered "committed" once written locally, once the leader has it, or once a quorum of in-sync replicas (ISR) has it (see 6.4).
3. **Consume**: consumers in a group each claim a disjoint subset of a topic's partitions (partition assignment, rebalanced when group membership changes) and read sequentially from their last committed offset, periodically committing progress back to the broker.
4. **Leadership changes**: the Controller (itself elected via a consensus protocol) tracks which broker leads each partition and which replicas are in-sync; on broker failure, it promotes an in-sync replica to leader for that partition's clients to fail over to.
5. **Retention/compaction**: segments older than the retention window are deleted; for compacted topics, a background compaction process rewrites segments keeping only the latest value per key (6.5).

## 4. API Design

```
POST /topics/{topic}/partitions/{partition}/messages     // conceptual — real clients use a binary wire protocol
Request: { "key": "user_4471", "value": "<bytes>", "producer_ack": "all" }   // acks: 0 | 1 | all
Response: 200 { "partition": 3, "offset": 88213421 }

GET /topics/{topic}/partitions/{partition}/messages?offset=88200000&max_bytes=1048576
Response: 200
{ "messages": [ { "offset": 88200000, "key": "...", "value": "...", "timestamp": "..." }, ... ] }

POST /consumer-groups/{group}/offsets
Request: { "topic": "orders", "partition": 3, "offset": 88213422 }   // commit progress

GET /consumer-groups/{group}/assignment
Response: 200 { "member_id": "c1", "assigned_partitions": [{"topic":"orders","partition":3}] }
```

In practice these brokers use a custom binary protocol over persistent TCP connections for performance (batched, pipelined requests), not per-message HTTP — the REST-style shapes above are for conceptual clarity of the semantics involved.

## 5. Data Model & Storage Choice

```
Per-partition, on disk:
  segment-00000000000000000000.log   (append-only, sequential writes, messages in offset order)
  segment-00000000000088200000.log   (a new segment starts once the active one hits a size/time limit)
  segment-...index                    (sparse offset → byte-position index, for fast seeks)

Consumer offsets (Kafka itself models this as a special compacted topic):
  __consumer_offsets: key=(group, topic, partition) → value=offset, compacted (latest value per key retained)
```

The partition log itself isn't a general-purpose database at all — it's a purpose-built **append-only sequential file structure** (segments + sparse index), which is precisely what makes the broker's core write path so fast: sequential disk writes (even on spinning disks, historically) vastly outperform random writes, and the OS page cache does most of the heavy lifting for recent-data reads since consumers are usually near the tail. This is a different data-structure question entirely from [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md) — neither applies to the hot-path log itself, though the elegant trick is that Kafka models its *own* consumer-offset tracking as just another (compacted) topic rather than inventing a separate storage system for it, eating its own dog food for metadata that needs the same durability/replication properties as regular data.

## 6. Deep Dive

### 6.1 Partitioned append-only log — the core data structure

Each partition is an ordered, immutable sequence of messages identified by a monotonically increasing **offset** — conceptually a single infinite array that's physically split into size/time-bounded segment files on disk. Ordering is guaranteed only *within* a partition (this is precisely why partitioning strategy, 6.2, matters so much — anything that needs relative ordering must land on the same partition). Consumers read by tracking an offset and requesting "everything after offset N," which the broker serves via the sparse offset index (mapping offsets to approximate byte positions, avoiding a full index entry per message) followed by a linear scan within that region — a deliberate memory/lookup-speed trade-off, since messages within a segment are read sequentially anyway once positioned.

### 6.2 Producer partitioning strategy

A producer must decide, per message, which partition it lands on: **keyed partitioning** (hash the message key, e.g., `user_id` or `order_id`, modulo partition count) guarantees all messages for the same key land on the same partition and are therefore strictly ordered relative to each other — essential when downstream consumers need to see, say, all events for one order in the order they happened. **Round-robin/random partitioning** (no key, or explicitly unkeyed) spreads load evenly across partitions when no ordering relationship exists between messages, maximizing parallelism. The catch with keyed partitioning: if partition count changes (a topic is expanded from 50 to 100 partitions), the hash-to-partition mapping for existing keys generally changes too, breaking the "same key always same partition" guarantee for messages produced before vs. after the resize — this is why partition count is typically treated as a rarely-changed, carefully-planned topic property rather than something resized casually.

### 6.3 Consumer group offset management

A consumer group represents one logical subscriber to a topic; within a group, each partition is assigned to exactly one member at a time, so the group as a whole processes every message exactly once *from the broker's perspective* (a member crash triggers a rebalance reassigning its partitions to surviving members, who resume from the last committed offset). Offsets are committed periodically (either automatically on an interval, or manually after the consumer has fully processed a batch) — this commit timing is what determines the group's actual delivery semantics: committing *before* processing risks message loss if the consumer crashes mid-processing (at-most-once), committing *after* processing risks reprocessing the same message if the consumer crashes after processing but before the commit lands (at-least-once, the standard default), and true exactly-once processing requires the consumer's side effect and its offset commit to be atomic together (e.g., writing both to the same transactional downstream store, or using the broker's own transactional/idempotent-producer features when the output is itself another topic).

### 6.4 Replication for durability — leader, ISR, and quorum

Each partition has one leader broker (handles all reads/writes) and N-1 follower replicas that continuously fetch and replicate the leader's log. The **in-sync replica (ISR) set** is the subset of replicas that are caught up closely enough to the leader to be considered viable failover candidates — followers that fall too far behind (slow disk, network partition) are dropped from the ISR until they catch back up. A producer's acknowledgment level controls the durability/latency trade-off directly: `acks=0` (fire-and-forget, fastest, no durability guarantee at all), `acks=1` (leader has written it locally — survives follower failures but not leader failure before replication), `acks=all` (every current ISR member has the write — survives any single broker failure, at the cost of waiting for the slowest in-sync replica). Leader election on failure (promoting an ISR member to leader) is itself a consensus problem — see [consensus-algorithms.md](../03-consistency-distributed/consensus-algorithms.md) and [quorum.md](../03-consistency-distributed/quorum.md) for the general theory (majority-quorum election, split-brain avoidance) that underlies the controller's leader-promotion logic.

### 6.5 Log segments, retention, and compaction

Segments are the unit of both retention and I/O management: the active segment receives new writes, while older, closed segments are eligible for deletion once they age past the retention window (time-based) or the partition exceeds a size cap (size-based) — deleting a whole segment file is cheap (an unlink), which is exactly why retention is segment-granular rather than message-granular (deleting individual old messages from the middle of a file would require rewriting it). **Log compaction** is a different retention model for topics representing "current state per key" rather than an event stream (e.g., a changelog of `user_id → latest_profile`): a background compaction thread rewrites segments keeping only the most recent message per key, discarding older values for the same key entirely (a `null` value acts as a delete tombstone). This lets a compacted topic be replayed to reconstruct a full current-state snapshot without needing to retain the entire history of every update ever made to every key — the mechanism the broker's own consumer-offsets topic relies on internally.

## 7. Bottlenecks & Scaling

- **10x throughput (20M messages/sec)**: add partitions (the primary throughput lever) and brokers; ensure the partitioning strategy (6.2) still distributes load evenly at the new scale — a poor key distribution that was fine at lower volume can create a hot partition that no amount of broker scaling fixes.
- **Partition-count ceiling per broker**: as computed in section 2, thousands of partition-replicas per broker create real per-partition overhead (metadata, replication threads); scale out (more brokers, each hosting fewer partitions) rather than scaling up partition density indefinitely on existing brokers.
- **Slow consumer causing ISR shrinkage upstream**: a follower that can't keep up gets dropped from the ISR, reducing durability margin for that partition; monitor ISR shrinkage as a leading indicator and provision follower brokers with I/O headroom, not just leader brokers.
- **Rebalance storms in large consumer groups**: frequent membership churn (deploys, autoscaling) triggers repeated full-group rebalances, pausing consumption during each one; mitigate with incremental/cooperative rebalancing protocols that reassign only the affected partitions rather than stopping the whole group.
- **Cross-region replication for disaster recovery**: intra-cluster ISR replication is not the same as cross-region DR — that requires a separate mirroring layer (e.g., a MirrorMaker-style async replicator) between independent clusters, trading some replication lag for surviving a full regional outage — see [multi-region architecture](../09-large-scale-data-systems/multi-region-architecture.md).

## 8. Trade-offs & Alternatives

- **acks=all vs. acks=1 as the default**: `acks=all` (full ISR acknowledgment) is the durability-safe default, accepting higher producer-side latency (bounded by the slowest in-sync replica) — services that can tolerate rare message loss on broker failure can opt into `acks=1` for lower latency, but that's an explicit, informed trade per-producer, not a system-wide default.
- **Keyed partitioning vs. round-robin**: keyed partitioning buys per-key ordering at the cost of potential hot partitions if key distribution is skewed (a viral `user_id` or a dominant tenant) — round-robin avoids hot partitions entirely but gives up any ordering guarantee, so the choice is fundamentally about whether the consumer's logic depends on per-key order.
- **At-least-once as the default consumer semantic vs. exactly-once**: at-least-once (commit offset after processing) is simple and the sane default, pushing idempotency responsibility onto consumers for operations where duplicate processing matters — true exactly-once requires atomic offset-commit-plus-side-effect, which is only practical when the downstream effect is itself another topic in the same broker (transactional producer) or a store that can transactionally include the offset.
- **Segment-based deletion vs. fine-grained per-message expiry**: segment-granular retention is far cheaper operationally (bulk unlink vs. rewriting files) at the cost of coarser retention precision (a message can live slightly longer or shorter than its "ideal" retention window depending on segment boundaries) — an acceptable approximation given retention windows are measured in days, not seconds.

## Related topics
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Consensus Algorithms](../03-consistency-distributed/consensus-algorithms.md)
- [Quorum](../03-consistency-distributed/quorum.md)
- [Leader Election](../03-consistency-distributed/leader-election.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
