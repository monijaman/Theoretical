# Distributed Locks
[← Back to index](../readme.md)

## What it is and why it's asked

A local mutex works because one process holds a memory address that every thread in that process can see, and the OS scheduler guarantees only one thread enters the critical section at a time. **None of that holds across machines.** There is no shared memory, no single scheduler, and — critically — no way for a lock holder to be *certain* it is still "the" holder at the instant it acts, because a message ("I still hold the lock") takes non-zero, unbounded time to arrive.

Interviewers ask about distributed locks to see if you understand that the hard part isn't *acquiring* a lock (any key-value store can do `SETNX`) — it's **guaranteeing mutual exclusion under partial failure**: what happens when the lock holder pauses (GC, page fault, disk stall) for longer than the lock's TTL, wakes up believing it still holds the lock, and issues a write against a resource a *second* client has since acquired the lock for? A naive implementation gives you a lock that looks correct in the happy path and silently fails exactly when it matters — under load, under GC pressure, during a slow disk write.

## Redis-based locks: SETNX + TTL, and why it's not enough alone

The basic recipe:

```
SET lock:resource_123 <unique-token> NX PX 30000
# NX = only set if not exists (acquire)
# PX 30000 = auto-expire after 30s (avoid deadlock if holder crashes)

... critical section ...

# release: only delete if the token still matches (Lua script, atomic)
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end
```

The unique token prevents client A from accidentally releasing a lock that expired and was re-acquired by client B (without it, A's delayed `DEL` would delete B's active lock). This is a real improvement over naive `SETNX`/`DEL`, but it does **not** solve the core problem: the TTL is a guess about how long the critical section will take, and if client A is paused (GC, VM migration, swap) for longer than the TTL, the lock silently expires, client B acquires it and starts mutating the resource, and then A wakes up still believing it holds the lock — with no way for A to know that in general.

## Redlock and Kleppmann's critique

**Redlock** (proposed by Redis' author) tries to make single-Redis-node locks safer against node failure by acquiring the same lock against a majority of N independent Redis instances (typically 5), with a shared expiry, and requiring a majority to agree within a timing budget. This addresses "what if one Redis node crashes" — but Martin Kleppmann's well-known critique (2016) shows it does **not** address the more fundamental problem: **there is no bound, in a real system, on how long a process can be paused.**

```
Client A acquires Redlock (majority of 5 nodes)  →  granted, TTL = 10s
Client A: about to write to shared storage
Client A: GC pause / VM pause for 15s  ─────────────▶ (paused, holds no CPU)
   ... meanwhile, lock TTL (10s) expires on all nodes ...
Client B acquires the same Redlock (nodes now free) →  granted
Client B writes to shared storage
Client A wakes up, believes it still holds the lock, writes to shared storage
  → BOTH A and B have now written — mutual exclusion violated
```

Kleppmann's point generalizes beyond GC: network delays, disk stalls (`fsync` taking seconds under load), and even NTP clock jumps (Redlock's safety argument relies on TTL comparisons against wall-clock time across independent nodes) can all produce the same violation. Redlock adds nodes for fault tolerance against crashes, but a lock built purely on **timeouts with no way for the protected resource to verify freshness** cannot guarantee mutual exclusion under an unbounded pause — no matter how many nodes participate.

## Fencing tokens: the actual fix

The fix isn't a "better" lock — it's making the *protected resource* reject stale writes, using a monotonically increasing number handed out by the lock service on every acquisition: a **fencing token**.

```
Lock service hands out an incrementing token on every acquire:

  Client A acquires lock → token = 33
  Client A: GC pause (long enough for lock to expire)
  Client B acquires lock (A's expired) → token = 34
  Client B writes to storage with token=34 → storage accepts (34 > last seen 0)
  Client A wakes up, writes to storage with token=33
  Storage checks: 33 < 34 (last accepted token) → REJECTS A's write
```

```
      A acquires (token 33)         B acquires (token 34)
            │                              │
    ────────┼───────GC pause A─────────────┼──────────────▶ time
            │                              │
            │                     B writes (token=34) ──▶ storage accepts
            │
       A wakes, writes (token=33) ────────────────────────▶ storage REJECTS
                                                            (33 < 34 already seen)
```

This requires the *storage layer itself* to understand and check tokens (e.g., a `WHERE token > last_token` guard in a SQL update, or S3/DB compare-and-swap semantics) — the lock service alone cannot enforce this by timeout tricks, because timeouts on the client side can't detect the client's own pause. Fencing tokens turn an unenforceable "trust the timer" guarantee into an enforceable "the storage layer has final say" guarantee.

## ZooKeeper / etcd: safer primitives for correctness-critical locking

Because the fencing-token idea requires monotonic, globally-agreed numbers and reliable failure detection, purpose-built coordination services are generally the right tool when correctness (not just best-effort mutual exclusion) matters:

- **ZooKeeper** — a client creates an **ephemeral sequential znode** under a lock path (`/locks/resource_123/lock-0000000042`); the client with the lowest sequence number holds the lock, everyone else watches the next-lower znode and wakes up when it's deleted. Ephemeral means the znode is auto-removed if the client's session dies (heartbeat-based, not a blind TTL), and the sequence number itself *is* a usable fencing token.
- **etcd** — similar idea via **leases**: a client acquires a lease (a TTL-backed session that must be actively renewed via keep-alives, not a fire-and-forget timer), attaches a key to it, and uses etcd's `Revision` number (a global, monotonically increasing counter bumped on every write) as the fencing token, checked with a transactional `compare-and-swap` (`etcd`'s `Txn` with a `Compare` on mod-revision) when writing to the protected resource.
- Both differ from Redis-based locks in a critical way: liveness is tied to an actively-maintained **session** (missed heartbeats reliably expire the lock) rather than an independent, unrenewed wall-clock TTL, and both hand out a token from a single, cluster-wide, strictly increasing counter — which is exactly what a correct fencing scheme needs and which multiple independent Redis nodes can't cleanly provide.

## Trade-offs summary

| Approach | Mutual exclusion guarantee | Fencing token support | Complexity | Good for |
|---|---|---|---|---|
| Redis SETNX+TTL | Best-effort, breaks under long pauses | No (needs custom token, still racy) | Low | Best-effort deduplication, low-stakes idempotency |
| Redlock (multi-node Redis) | Better against node crash, still breaks under GC/clock issues | No native support | Medium | Same as above, slightly more crash-tolerant |
| ZooKeeper ephemeral sequential znodes | Strong — session-based liveness + built-in ordering | Yes (sequence number) | Medium-high (operate a ZK cluster) | Leader election, critical-section locks in infra |
| etcd lease + revision | Strong — session-based liveness + monotonic revision | Yes (mod-revision via CAS) | Medium-high (operate an etcd cluster) | Kubernetes-style coordination, config locks |

## Common interview follow-ups

**Q: Why doesn't adding more Redis nodes (Redlock) fix the fundamental issue Kleppmann raised?**
Because the failure mode isn't "a node crashes" (which majority quorums do handle) — it's "the lock holder itself pauses for longer than the TTL and can't know it," which no number of additional lock-service nodes can prevent, since the problem lives in the client's own execution, not in the lock service's availability.

**Q: What's the minimum change needed to make a Redis-based lock safe for a critical operation?**
Add a fencing token — an incrementing number issued at acquisition time — and make the protected resource itself reject any write whose token is lower than the highest token it has already accepted; without that check at the resource, no amount of lock-service hardening helps.

**Q: When is a "good enough" Redis lock actually fine to use?**
When the operation is idempotent or the cost of a rare double-execution is low — e.g., deduplicating a scheduled job across replicas, or a cache-stampede guard — where an occasional double-run is a minor inefficiency, not a correctness incident.

**Q: How do ZooKeeper's ephemeral znodes solve the "client paused, still thinks it holds the lock" problem better than a TTL?**
They don't eliminate pauses, but the znode's liveness is tied to an active session heartbeat the client must maintain; combined with a fencing token (the sequence number) checked at the resource, a client that resumes after its session expired will have its stale writes rejected the same way the generic fencing-token pattern rejects them.

**Q: Would you use a distributed lock for a leader election problem?**
It's closely related — leader election is often implemented as "whoever holds a particular lock is the leader," but the dedicated primitives (Raft leader election, ZooKeeper leader-election recipe) add term/epoch numbers and quorum-based safety specifically tuned for that use case; see [leader election](leader-election.md).

**Q: What's the real-world cost of choosing ZooKeeper/etcd over a Redis lock for correctness-critical locking?**
Operational: you now run and maintain a consensus-based cluster (odd node count, quorum sizing, backup/restore procedures) instead of reusing a cache you likely already have — a cost worth paying only when the lock genuinely guards something where double-execution is a real incident (financial operations, exclusive resource ownership), not a general-purpose mutex for everything.

## Related topics
- [Leader Election](leader-election.md) — often implemented as "hold this lock to be leader," with the same failure modes
- [Consensus Algorithms](consensus-algorithms.md) — the Raft/ZAB machinery underneath ZooKeeper and etcd locks
- [CAP Theorem](cap-theorem.md) — why ZooKeeper/etcd choose CP, which is exactly what correctness-critical locking needs
- [Quorum](quorum.md) — the majority math behind Redlock and ZooKeeper/etcd session safety
- [Distributed Job Scheduler](../10-system-design-practice/distributed-job-scheduler.md) — a concrete system that needs locks to avoid double-running scheduled jobs
