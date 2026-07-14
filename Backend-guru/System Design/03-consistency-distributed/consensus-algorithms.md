# Consensus Algorithms
[← Back to index](../readme.md)

## What it is and why it's asked

Consensus is the problem of getting a set of nodes — some of which may crash, pause, or be partitioned away — to agree on a single value, and to keep that agreement even if some nodes never respond. It sounds abstract, but it's the machinery underneath almost everything else in this folder: [leader election](leader-election.md) is "agree on who's leader," a replicated log is "agree on the order of operations," and a [distributed lock](distributed-locks.md) service needs consensus internally to avoid handing the same lock to two clients. Interviewers ask about consensus not expecting you to re-derive Paxos on a whiteboard, but to check that you know **why it's provably hard**, what the actual safety properties are, and which real systems use which algorithm — because "just use a database" stops being an answer once the database itself needs to agree with its own replicas.

Formally, a consensus protocol must guarantee, even with some nodes crashing or messages being delayed:
- **Agreement** — no two correct nodes decide on different values.
- **Validity** — the decided value was actually proposed by some node (no inventing values).
- **Termination** — every correct node eventually decides (liveness — the protocol doesn't hang forever).

The FLP impossibility result (Fischer, Lynch, Paterson, 1985) proves that in a fully **asynchronous** system (no bound on message delay) with even one faulty node, no protocol can guarantee both safety and termination deterministically — real consensus algorithms sidestep this by relying on partial synchrony (timeouts, heartbeats) to make progress in practice, while never sacrificing safety even if those timing assumptions are temporarily wrong.

## Paxos: correct but notoriously hard to implement

Paxos (Lamport, 1989/1998) is the original proof that consensus is solvable despite failures. It defines three roles (which can co-locate on the same physical nodes):

```
Proposer                Acceptors (majority needed)          Learner
   │                       │      │      │                     │
   │──Prepare(n)──────────▶│      │      │                     │
   │◀─Promise(n, prev)─────│      │      │                     │
   │  (from a majority)    │      │      │                     │
   │──Accept(n, value)────▶│      │      │                     │
   │◀─Accepted(n, value)───│      │      │                     │
   │  (from a majority)    │      │      │────notify──────────▶│
   │                                                       value chosen
```

Two-phase structure: **Phase 1 (Prepare/Promise)** — a proposer picks a proposal number `n` higher than any it's seen, and asks a majority of acceptors to promise not to accept any proposal numbered less than `n`; acceptors reply with the highest-numbered proposal they've already accepted, if any. **Phase 2 (Accept/Accepted)** — the proposer sends an Accept request with either its own value (if no acceptor had already accepted something) or the *highest already-accepted value it learned about in phase 1* (this is the subtle, easy-to-get-wrong part — it's what guarantees agreement even if multiple proposers compete).

Paxos is notoriously hard to implement correctly in practice — not because the two-phase idea is complicated, but because: (1) the base protocol only decides a *single* value, so real systems need **Multi-Paxos** (a long-lived leader running phase 2 repeatedly for a sequence of log slots, skipping phase 1 after the first round) which isn't fully specified by the original paper; (2) handling reconfiguration (membership changes), log compaction, and leader stability are all left as "exercises," leading to famously divergent, hard-to-verify implementations (Lamport's own "Paxos Made Simple" paper exists because the original was widely considered unreadable). This gap between "the algorithm is proven correct" and "the exact system you should build is unspecified" is the direct motivation for Raft.

## Raft: consensus designed to be understandable

Raft (Ongaro & Ousterhout, 2014) is explicitly "Paxos with an engineering write-up" — same guarantees, but decomposed into three separably-understandable sub-problems:

1. **Leader election** — exactly one node becomes leader per term, using randomized timeouts and majority votes (see [leader election](leader-election.md) for the full mechanism).
2. **Log replication** — the leader is the *only* node that accepts client writes; it appends each write to its own log and replicates it to followers via `AppendEntries`, only considering an entry **committed** once a majority of nodes have durably stored it.
3. **Safety** — a candidate can only win an election if its log is at least as up-to-date as a majority of the cluster (compared by last log term, then index), which guarantees a newly elected leader already has every previously committed entry — no separate "recovery" phase is needed, unlike Paxos-based systems.

```
Client write → Leader appends to local log (uncommitted)
             → Leader sends AppendEntries to all followers
             → Followers append and ack
             → Leader sees ack from majority → entry COMMITTED
             → Leader applies to state machine, responds to client
             → Leader includes commit index in next heartbeat so
               followers know to apply it too
```

Because there's always exactly one leader accepting writes (unlike Multi-Paxos, where any proposer can attempt phase 2 for a given slot, requiring careful proposal-number bookkeeping to avoid duplicate work), Raft's log replication reduces to "append-only replication from a single source of truth, committed on majority ack" — which is dramatically easier to reason about, test, and implement correctly. This understandability, not a difference in fundamental power, is Raft's entire value proposition — it solves the exact same problem Paxos does.

## The quorum requirement: majority = N/2 + 1

Both Paxos and Raft (and ZAB) require any accepted/committed value to be acknowledged by a **strict majority** of nodes, for the same reason covered in [quorum](quorum.md) and [leader election](leader-election.md): two disjoint majorities of the same fixed-size cluster cannot both exist, so requiring a majority for every commit/election guarantees that any two decisions (or any two elected leaders) must share at least one node in common — and that shared node is what prevents contradictory outcomes.

```
Cluster size (N)   Majority needed   Tolerable failures (N - majority)
        3                 2                       1
        5                 3                       2
        7                 4                       3
```

Note the pattern: going from 5 to 7 nodes only buys you one more tolerable failure but adds real latency and coordination overhead (more nodes to hear back from on every write) — which is why almost no production Raft/Paxos/ZAB cluster runs larger than 5 or 7 nodes; the marginal fault tolerance stops being worth the cost past that point.

## Where each is used in real systems

- **etcd — Raft.** The reference use case for "I chose Raft because I need to understand and operate it correctly" — etcd's entire value to Kubernetes is a correctly-replicated, linearizable key-value store, and its docs explicitly credit Raft's understandability as the reason it was chosen over Paxos.
- **ZooKeeper — ZAB (ZooKeeper Atomic Broadcast).** Purpose-built for ZooKeeper specifically (predates Raft), similar in spirit to Multi-Paxos with a stable leader broadcasting a totally ordered stream of state updates; differs from Raft mainly in its recovery/synchronization phase details and its emphasis on total-order broadcast as the primitive rather than a generic replicated log.
- **Google Spanner / Chubby — Paxos.** Chubby (Google's lock service, precursor to the ideas behind ZooKeeper) and Spanner's replica groups both use Paxos directly — each Spanner tablet's replicas form a Paxos group, and cross-shard transactions layer 2PC on top of multiple Paxos groups (see [distributed transactions](../02-data-storage/distributed-transactions.md)).
- **Kafka — its own Raft-like protocol (KRaft), replacing ZooKeeper.** Modern Kafka (post-KIP-500) replaced its ZooKeeper dependency for metadata management with KRaft, an in-house Raft variant, specifically to avoid operating two separate consensus systems (ZooKeeper for metadata, Kafka's own ISR replication for data) — see [Kafka-like message broker](../10-system-design-practice/kafka-like-message-broker.md).
- **CockroachDB / TiDB — Raft.** Each data range/region is an independent Raft group, following the same "many small Raft groups" pattern as Spanner's Paxos groups.

## Trade-offs summary

| Algorithm | Core idea | Understandability | Real-world users |
|---|---|---|---|
| Paxos (Multi-Paxos) | Two-phase majority voting per value/slot | Low — base spec incomplete for real systems | Chubby, Spanner (per replica group) |
| Raft | Strong single leader + majority-committed log | High — explicit design goal | etcd, Consul, CockroachDB, TiDB |
| ZAB | Leader-based atomic broadcast, primary/backup style | Medium — predates Raft, ZooKeeper-specific | ZooKeeper (and systems built on it: Kafka pre-KRaft, HBase) |
| KRaft | Raft variant purpose-built for log/metadata replication | High (inherits Raft's design goals) | Kafka (post-KIP-500) |

## Common interview follow-ups

**Q: Is Raft "better" than Paxos, or just easier?**
Just easier — they solve the identical problem with the same fundamental guarantees and the same fault tolerance for a given cluster size; Raft's contribution is decomposing the protocol into independently understandable, fully-specified sub-parts (leader election, log replication, safety) so implementers don't have to invent the missing pieces themselves the way Multi-Paxos implementations historically did.

**Q: Why does consensus require a majority instead of, say, any two nodes agreeing?**
Because with a fixed cluster size, requiring a strict majority guarantees any two majorities overlap in at least one node — that overlap is what prevents two contradictory values from both being "decided," since the overlapping node can't have voted for both.

**Q: What does the FLP result actually rule out, given that Raft and Paxos demonstrably work in production?**
It rules out a protocol that's both always-safe and guaranteed-to-terminate in a purely asynchronous model with even one crash failure; real systems get around this by using timeouts (partial synchrony assumptions) to drive termination/liveness, while keeping the safety properties (agreement, validity) unconditional — so they can theoretically stall (fail to terminate) under adversarial timing, but they never violate agreement.

**Q: How do these algorithms handle a leader that's alive but partitioned away from the majority?**
The partitioned leader can't get a majority ack for new entries (Raft) or accepted proposals (Paxos), so it simply can't commit anything new — it may still believe it's leader locally, but it's inert from the cluster's perspective, while the majority side elects a new leader with a higher term and continues; this is exactly the split-brain prevention described in [leader election](leader-election.md).

**Q: When would you NOT want a full consensus protocol, and use something weaker instead?**
When availability matters more than a single global order — e.g., Cassandra/DynamoDB-style systems use quorum reads/writes and gossip instead of full consensus specifically to stay available under partition (AP), accepting eventual consistency and conflict resolution (vector clocks/CRDTs) rather than paying consensus's cost of blocking the minority side.

**Q: What's the relationship between consensus and distributed transactions across multiple shards?**
They're complementary, not the same thing — consensus (Paxos/Raft) keeps a *single* replica group consistent with itself; coordinating a transaction that spans *multiple* independent replica groups additionally needs an atomic commitment protocol like two-phase commit layered on top, which is exactly what Spanner does (Paxos per shard + 2PC across shards), covered in [distributed transactions](../02-data-storage/distributed-transactions.md).

## Related topics
- [Leader Election](leader-election.md) — a specific, common instance of the consensus problem
- [Quorum](quorum.md) — the majority arithmetic that underlies every consensus algorithm's safety
- [CAP Theorem](cap-theorem.md) — consensus-based systems are the textbook CP choice
- [Distributed Locks](distributed-locks.md) — lock services (ZooKeeper, etcd) rely on consensus internally
- [Distributed Transactions](../02-data-storage/distributed-transactions.md) — how consensus combines with 2PC/Saga across shards
