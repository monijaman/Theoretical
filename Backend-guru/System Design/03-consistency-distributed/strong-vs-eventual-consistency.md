# Strong vs Eventual Consistency
[← Back to index](../readme.md)

## What it is and why it's asked

Once you accept that a distributed system replicates data across multiple nodes (see [database replication](../02-data-storage/database-replication.md)), the next question is: **after a write, what can a read see?** The answer is a spectrum, not a binary, and interviewers use this question to check whether you can place a real product requirement ("show my comment immediately after I post it") on that spectrum instead of reaching for "strong consistency" by reflex.

- **Strong consistency (linearizability)** — every read sees the most recent write, globally, as if there were only one copy of the data and operations happened in a single, real-time-ordered sequence. Once a write commits, *every* subsequent read, from *any* node, returns it.
- **Eventual consistency** — after a write, replicas *will* converge to the same value, *eventually*, if no new writes occur — but there's no bound on how long "eventually" takes, and reads in the meantime may return stale or even out-of-order data.

Between those two extremes sit several named intermediate models that interviewers expect you to at least recognize, because "eventual consistency" alone is too weak a guarantee to build most real features on.

## The consistency spectrum

```
Strongest ─────────────────────────────────────────────────► Weakest

Linearizability → Sequential → Causal → Read-your-writes → Monotonic reads → Eventual
(single global    (global order  (respects   (a client sees   (a client never   (converges
 real-time order)  agreed by all, cause→effect  its own writes    sees older data     eventually,
                    not real-time) order)       immediately)      than it already   no ordering
                                                                    saw)              guarantee)
```

**Linearizability** — the gold standard. Equivalent to there being one copy of the data with a single, real-time-respecting order of operations. Expensive: typically requires a quorum round-trip or a single leader per write, as in [Raft](consensus-algorithms.md)-backed etcd or ZooKeeper.

**Read-your-writes** — a weaker, cheaper, and *very* commonly needed guarantee: after client A writes X, client A's subsequent reads see X (but client B might not yet). Achieved by routing a client's reads to the replica it wrote to (sticky sessions), or by having the client pass a version/token forward with its requests so any replica it hits can wait until it's caught up to that version.

**Monotonic reads** — a client that has seen value V of X will never later see an older value of X (though it may not yet see the newest value). Prevents the "comment count went from 42 to 41" regression a user would notice if their reads bounced between replicas at different replication lag.

**Causal consistency** — if operation B was caused by (or read the result of) operation A, every node must see A before B; operations with no causal relationship can be seen in any order. This is the strongest model that doesn't require full coordination on every write — most systems that market "eventual consistency" but "feel correct" in practice are actually leaning on causal ordering (e.g., a reply to a comment never appears before the comment it replies to).

**Eventual consistency** — the floor. No ordering guarantee at all beyond "it converges given no more writes." Cheapest, most available, hardest to reason about.

## DynamoDB: the same table, two consistency levels, one flag

DynamoDB is the canonical concrete example because it exposes the strong/eventual choice as a literal per-request parameter rather than a whole-system design decision:

```
GetItem(table, key, ConsistentRead=false)   # default: eventually consistent read
  → may be served by any replica, including one that hasn't
    applied the latest write yet. Roughly half the read cost.

GetItem(table, key, ConsistentRead=true)    # strongly consistent read
  → routed to (or confirmed against) the leader/latest replica.
    Higher latency, higher cost (2x read capacity units),
    unavailable during certain failover windows.
```

Under the hood, a DynamoDB write is acknowledged after being durably written to a leader storage node and replicated synchronously to enough peers to survive an AZ failure — but the *read* side gets to choose whether it pays the cost of confirming it has the absolute latest value. This is the same N/W/R idea covered in [quorum](quorum.md): eventually-consistent reads use W+R ≤ N, strongly-consistent reads use W+R > N.

## Vector clocks and CRDTs: living with divergence

An AP system (see [CAP theorem](cap-theorem.md)) that accepts concurrent writes on different replicas during a partition must later reconcile them. Two write to the same key on different nodes with no coordination — which one "wins"?

**Vector clocks** attach a per-replica counter to each write so the system can distinguish "B happened after A" (causally dependent, keep B) from "A and B happened concurrently" (conflict, can't tell which is right):

```
Node1 writes X: vclock = {N1:1}
Node2 (before seeing Node1's write) also writes X: vclock = {N2:1}

Comparing {N1:1} vs {N2:1}: neither dominates the other
  → concurrent write, true conflict → surface both versions
    ("siblings" in Riak/Dynamo terms) to the application to merge
```

This is exactly what the original Dynamo paper (and Riak) do: return all conflicting versions to the client and let application logic decide (e.g., "union the two shopping cart item lists").

**CRDTs (Conflict-free Replicated Data Types)** go a step further by designing the data structure so merges are *automatic and always correct*, with no application-level conflict resolution needed:
- **G-Counter / PN-Counter** — a counter represented as a vector of per-replica counts; merge = element-wise max (or sum of increments/decrements). Always converges to the right total regardless of merge order.
- **OR-Set** (observed-remove set) — add/remove operations tagged with unique IDs so concurrent add-A-remove-B on different replicas merge deterministically without losing either operation.
- Used in Redis (CRDT-based Active-Active in Redis Enterprise), Riak's `riak_dt` library, and collaborative editors (a "like count" or "presence" feature is a textbook G-Counter/OR-Set use case).

## When eventual consistency burns users

The failure mode interviewers want you to name concretely: **"I just did X and it's gone."**

- A user posts a comment, the write is acknowledged, they refresh and the comment isn't there — because the read landed on a replica that hasn't caught up yet. This is a **read-your-writes violation**, not just generic staleness, and it's the single most common eventual-consistency complaint in the wild.
- A user's "like" count flickers from 43 back down to 42 on refresh — a **monotonic-reads violation** caused by load-balanced reads hitting replicas with different lag.
- Two support agents both update the same ticket status concurrently on different replicas; the "resolved" status silently reverts to "in progress" after replication converges via last-write-wins — a **lost update**, the classic reason LWW-by-timestamp is dangerous for anything the user directly edits.

The fix is almost never "switch everything to strong consistency" (too slow, too unavailable) — it's picking the *cheapest model that avoids the specific symptom*: session-affinity or write-through caching for read-your-writes on your own content, causal consistency (or just routing all writes for one entity through one partition/leader) for ordering-sensitive UI, and reserving true linearizable reads for the few operations (balance checks, inventory decrements) that actually need them.

## Trade-offs summary

| Model | Guarantee | Cost | Typical use |
|---|---|---|---|
| Linearizable / strong | Every read sees latest write, globally | High latency, lower availability during partitions | Bank balances, inventory counts, distributed locks |
| Causal | Cause precedes effect, everywhere | Moderate — needs dependency tracking | Comment threads, chat ordering |
| Read-your-writes | Own writes visible to self immediately | Low — session routing or version tokens | "Did my post go through" UX |
| Monotonic reads | Never see older data than already seen | Low — sticky reads or version floor | Counters, feeds |
| Eventual | Converges given no new writes, no ordering | Lowest, most available | Caches, DNS, search index freshness, analytics |

## Common interview follow-ups

**Q: If eventual consistency has no time bound, how do real systems make it practically usable?**
In practice replication lag is milliseconds to low seconds under healthy conditions, and systems add read-your-writes or session guarantees on top so the *worst* case (arbitrary staleness) rarely surfaces to users, even though the formal model doesn't promise a bound.

**Q: Is causal consistency achievable without a global clock?**
Yes — via vector clocks or per-entity version numbers attached to writes; a node only applies an incoming write once it has applied everything that write's version vector says it depends on, no synchronized wall-clock needed.

**Q: Why not just use last-write-wins everywhere and avoid the complexity of CRDTs/vector clocks?**
LWW silently discards one of two concurrent writes based on timestamp, which is fine for a cache or a "last seen" field but actively loses data for anything a user consciously edited (a support ticket, a document) — CRDTs and vector-clock-based sibling resolution exist specifically to avoid that silent data loss.

**Q: How would you give a user a read-your-writes guarantee in a system that's eventually consistent everywhere else?**
Route that user's subsequent reads to the same replica/partition they wrote to (sticky session or consistent hashing on user ID), or have the client pass the write's version/timestamp along and have the read path wait until the serving replica has caught up to at least that version.

**Q: Does strong consistency mean no replication lag?**
No — it means the system hides replication lag from the client's view by only acknowledging a read once it has confirmed it reflects the latest committed write (e.g., routing to a leader or a quorum), not that replication happens instantaneously.

## Related topics
- [CAP Theorem](cap-theorem.md) — the P-vs-A/C choice that determines which consistency model is even achievable
- [PACELC Theorem](pacelc-theorem.md) — the latency cost of strong consistency during normal operation
- [Quorum](quorum.md) — the N/W/R math behind DynamoDB's tunable consistent reads
- [Consensus Algorithms](consensus-algorithms.md) — how linearizable systems like etcd achieve their guarantee
- [Database Replication](../02-data-storage/database-replication.md) — sync vs async replication is the mechanism producing this spectrum
