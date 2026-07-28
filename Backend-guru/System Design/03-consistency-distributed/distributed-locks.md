# Distributed Locks

[← Back to index](../readme.md)

## What is a Distributed Lock?

A normal lock inside one application is easy.

Example:

```
Thread A
   |
   v
Lock memory address

Thread B waits
```

The operating system controls access.

Only one thread enters the critical section.

---

## Why Distributed Locks Are Hard

In distributed systems:

```
Machine A

      Network

Machine B
```

There is:

- No shared memory
- No common scheduler
- No instant communication

A client cannot always know:

```
Do I still own the lock?
```

because network messages can be delayed.

---

# Example Problem

Two workers process the same job.

Without a lock:

```
Worker A

Process payment


Worker B

Process payment
```

Result:

```
Payment executed twice
```

A distributed lock tries to guarantee:

```
Only one worker executes
at a time
```

---

# The Real Challenge

Getting a lock is easy.

Example:

```
SETNX lock
```

The hard part is:

> What happens when the lock holder fails?

Example:

```
Client A gets lock

        |
        |
       pause
        |
        |
Client B gets lock

        |
        |
Client A wakes up
```

Now:

```
Both think they own the lock
```

This breaks mutual exclusion.

---

# Redis Distributed Lock

A common implementation uses:

```
SETNX + TTL
```

Example:

```redis
SET lock:order_123 random-token NX PX 30000
```

Meaning:

```
NX:

Only create if lock does not exist


PX 30000:

Expire after 30 seconds
```

---

# Lock Release

Never simply do:

```redis
DEL lock:order_123
```

Why?

Example:

```
Client A gets lock

TTL expires


Client B gets lock


Client A sends DEL
```

Now:

```
Client B's lock is deleted
```

---

Instead use a unique token.

Example:

Client A:

```
lock value:

abc123
```

Client B:

```
lock value:

xyz789
```

Release only if token matches.

Example:

```lua
if redis.call("GET", KEYS[1]) == ARGV[1]
then
    return redis.call("DEL", KEYS[1])
end
```

---

# Problem With Redis TTL Locks

TTL creates a dangerous situation.

Example:

```
Client A:

Acquire lock

TTL = 10 seconds


Client A:

Starts database update


Client A:

GC pause for 15 seconds
```

Lock expires.

---

Now:

```
Client B:

Gets lock

Updates database
```

Then:

```
Client A wakes up

Continues update
```

Now:

```
A and B both modified data
```

The lock failed.

---

# Redlock

Redlock tries to improve Redis locks.

Instead of one Redis server:

```
Redis 1

Redis 2

Redis 3

Redis 4

Redis 5
```

Client acquires lock from a majority.

Example:

```
Need 3 out of 5 nodes
```

---

## Why Redlock Helps

It protects against:

```
One Redis node failure
```

---

## Why Redlock Is Still Not Perfect

The problem is not only Redis failure.

The problem is:

```
Client pauses longer than TTL
```

Example:

```
Client A gets lock

TTL = 10 seconds


Client A freezes for 20 seconds


Lock expires


Client B gets lock


Client A wakes up
```

Now:

```
Two owners exist
```

Adding more Redis nodes does not solve this.

---

# The Real Solution: Fencing Tokens

A fencing token is a number that increases every time a lock is acquired.

Example:

```
Client A:

Gets lock

Token = 100
```

Client A pauses.

---

Client B:

```
Gets lock

Token = 101
```

Client B writes:

```
token=101
```

Storage accepts.

---

Client A wakes:

```
Writes token=100
```

Storage checks:

```
100 < 101
```

Reject.

---

The important idea:

> The protected resource must reject old writers.

The lock service alone cannot guarantee safety.

---

# Fencing Token Example

```
Lock Service


Client A
Token: 33


        |
        |
      Pause


Client B
Token: 34



Database:

Last accepted token = 34


A writes token 33

Rejected
```

---

# ZooKeeper Distributed Locks

ZooKeeper provides safer locking primitives.

It uses:

```
Ephemeral Sequential Nodes
```

Example:

```
/locks/order/

lock-0001

lock-0002

lock-0003
```

The smallest number owns the lock.

Example:

```
lock-0001

Owner
```

---

If the client dies:

```
Session expires
```

ZooKeeper removes the node automatically.

---

The sequence number also works as:

```
Fencing token
```

---

# etcd Distributed Locks

etcd uses:

```
Lease + Revision Number
```

---

A client creates:

```
Lease
```

with heartbeat.

Example:

```
Client must keep renewing
```

If heartbeat stops:

```
Lease expires

Lock removed
```

---

etcd also provides:

```
Revision number
```

which can be used as fencing tokens.

---

# Redis vs ZooKeeper vs etcd

| Approach | Safety | Fencing Token | Complexity | Best For |
|-|-|-|-|-|
| Redis SETNX + TTL | Weak | No | Low | Cache locks, duplicate prevention |
| Redlock | Better | No native | Medium | Low-risk distributed locks |
| ZooKeeper | Strong | Yes | Medium/High | Critical coordination |
| etcd | Strong | Yes | Medium/High | Kubernetes-style systems |

---

# When To Use Redis Locks

Redis locks are fine when:

- Operation is idempotent
- Occasional duplicate execution is acceptable

Examples:

```
Prevent duplicate email sending

Avoid cache stampede

Run scheduled job once
```

---

# When NOT To Use Redis Locks

Avoid Redis locks for:

- Money transfers
- Inventory correctness
- Exclusive ownership
- Critical infrastructure

Because a rare lock failure can create data corruption.

---

# Distributed Lock vs Leader Election

They are related.

Leader election:

```
Who is the leader?
```

Distributed lock:

```
Who owns this resource?
```

Both require:

- Agreement
- Failure handling
- Ownership changes

For leader election, systems usually prefer:

- Raft
- ZooKeeper
- etcd

because they provide stronger guarantees.

---

# Common Interview Questions

## Q: Why doesn't Redlock completely solve the problem?

Because the main problem is not Redis failure.

The problem is:

```
Client pauses longer than lock expiration
```

No number of Redis nodes can detect that safely.

---

## Q: How do you make a distributed lock safe?

Use:

```
Fencing tokens
```

Flow:

```
Acquire lock

Receive increasing token

Write data with token

Storage rejects old tokens
```

---

## Q: Why use ZooKeeper/etcd instead of Redis?

Because they provide:

- Consensus-based coordination
- Strong ordering
- Session-based failure detection
- Fencing tokens

---

## Q: Should every operation use a distributed lock?

No.

Locks add:

- Complexity
- Latency
- Failure modes

Prefer:

- Idempotency
- Optimistic concurrency
- Database constraints

when possible.

---

# Simple Rule To Remember

```
Need a simple best-effort lock
        |
        v
Redis


Need correctness under failure
        |
        v
ZooKeeper / etcd


Need multiple writers safely
        |
        v
Fencing Tokens


Need choosing a leader
        |
        v
Consensus algorithms
```

---

# Interview Answer

> "A distributed lock is difficult because there is no shared memory and failures are ambiguous. A simple Redis SETNX lock works for best-effort cases but can fail when a client pauses beyond the TTL. For correctness-critical operations, I would use a coordination system like ZooKeeper or etcd with fencing tokens, so the protected resource can reject stale writers even if an old client wakes up later."


## Related topics
- [Leader Election](leader-election.md) — often implemented as "hold this lock to be leader," with the same failure modes
- [Consensus Algorithms](consensus-algorithms.md) — the Raft/ZAB machinery underneath ZooKeeper and etcd locks
- [CAP Theorem](cap-theorem.md) — why ZooKeeper/etcd choose CP, which is exactly what correctness-critical locking needs
- [Quorum](quorum.md) — the majority math behind Redlock and ZooKeeper/etcd session safety
- [Distributed Job Scheduler](../10-system-design-practice/distributed-job-scheduler.md) — a concrete system that needs locks to avoid double-running scheduled jobs
