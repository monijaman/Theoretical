# Strong vs Eventual Consistency

[← Back to index](../readme.md)

## Why This Topic Matters

In a distributed system, data is usually replicated across multiple servers or regions.

Once replication exists, an important question appears:

> After a write happens, what can a user expect when they read the data?

For example:

- A user posts a comment.
- The write succeeds.
- They refresh the page.
- Should they always see their comment immediately?

The answer depends on the **consistency model**.

Interviewers ask this topic to check whether you understand that consistency is a **spectrum**, not a simple yes/no choice.

---

# Strong vs Eventual Consistency

## Strong Consistency (Linearizability)

Strong consistency means:

> Every read always returns the latest successful write, no matter which node handles the request.

The system behaves as if there is only **one copy of the data**.

Example:

```
User writes:
    balance = $100

Any user reading immediately after:
    balance = $100
```

There is no possibility of seeing an older value.

### Advantages

- Simple mental model
- No stale reads
- Best correctness guarantees

### Disadvantages

- Higher latency
- Lower availability during network failures
- Requires coordination between nodes

Common examples:

- Bank balances
- Inventory reservations
- Distributed locks

---

# Eventual Consistency

Eventual consistency means:

> If no new writes happen, all replicas will eventually reach the same value.

However, during replication delay:

- Reads may return old data
- Different users may see different values
- Ordering is not guaranteed

Example:

```
User posts comment:

Primary Node:
    Comment exists ✅

Replica Node:
    Comment missing ❌

User refreshes:
    Comment not found
```

After replication catches up:

```
All nodes:
    Comment exists ✅
```

### Advantages

- High availability
- Lower latency
- Better performance at large scale

### Disadvantages

- Temporary stale data
- More application complexity
- Harder user experience problems

Common examples:

- Search indexes
- Analytics systems
- Social media feeds
- DNS caching

---

# Consistency Spectrum

```
Strongest                                             Weakest

Linearizability → Sequential → Causal → Read-Your-Writes
        → Monotonic Reads → Eventual Consistency
```

Different systems choose different points depending on business needs.

---

# 1. Linearizability

The strongest consistency model.

The system appears to have:

- One copy of data
- One global ordering of operations
- Real-time guarantees

Example:

```
Write:
    username = "Alice"

Immediately after:

Every server:
    username = "Alice"
```

Usually requires:

- Leader-based writes
- Quorum confirmation
- Consensus algorithms

Examples:

- etcd
- ZooKeeper
- Raft-based systems

---

# 2. Read-Your-Writes Consistency

Guarantee:

> A user will always see their own writes.

Example:

```
User creates post:

POST /comments
Success ✅

GET /comments

Result:
User sees their comment immediately
```

Other users may still not see it.

Common solutions:

### Sticky Sessions

Route the user back to the same replica.

```
User
 |
 v
Replica A
(write happens here)

Future reads:
Replica A
```

### Version Tokens

The client sends the version it has seen.

Example:

```
Client version:
    v=10

Replica:
    only has v=8

Wait until:
    v>=10
```

---

# 3. Monotonic Reads

Guarantee:

> Once a user has seen a value, they will never see an older value later.

Bad experience:

```
Refresh 1:
Likes = 42

Refresh 2:
Likes = 41 ❌
```

This happens when requests hit replicas with different replication delays.

Solution:

- Sticky sessions
- Version tracking

---

# 4. Causal Consistency

Guarantee:

> Related operations appear in the correct order.

Example:

A user writes:

```
Comment:
"Great article!"
```

Another user replies:

```
Reply:
"I agree"
```

The system should never show:

```
Reply:
"I agree"

without:

Comment:
"Great article!"
```

Causal consistency keeps:

```
Cause → Effect
```

but allows unrelated events to appear in different orders.

---

# 5. Eventual Consistency

The weakest model.

Guarantee:

```
No more writes happen

        ↓

All replicas eventually converge
```

No guarantee about:

- When convergence happens
- Which value appears first
- Ordering between writes

---

# DynamoDB Example

DynamoDB provides both consistency models.

## Eventually Consistent Read

```javascript
GetItem({
    TableName: "Users",
    Key: {
        id: 123
    },
    ConsistentRead: false
})
```

Behavior:

- Faster
- Cheaper
- May return stale data

---

## Strongly Consistent Read

```javascript
GetItem({
    TableName: "Users",
    Key: {
        id: 123
    },
    ConsistentRead: true
})
```

Behavior:

- Returns latest value
- Higher latency
- Costs more read capacity

---

# Vector Clocks: Handling Conflicts

In distributed systems, two replicas may update the same data at the same time.

Example:

```
Replica A:

Shopping Cart:
    Item = Laptop


Replica B:

Shopping Cart:
    Item = Mouse
```

Which one wins?

A vector clock helps detect whether:

- One update happened after another
- Both updates happened independently

Example:

```
Replica A:

{
    A:1
}


Replica B:

{
    B:1
}
```

Comparison:

```
A:1
B:1
```

Neither happened before the other.

Result:

```
Conflict detected
```

The application decides how to merge.

---

# CRDTs (Conflict-Free Replicated Data Types)

CRDTs solve conflicts automatically.

They are data structures designed so that:

- Different replicas can update independently
- Merging is deterministic
- All replicas eventually converge

---

## Example: Counter

Three replicas:

```
Replica A:
+5


Replica B:
+3


Replica C:
+2
```

Merge:

```
Total = 10
```

No conflict.

---

## Common CRDT Types

### G-Counter

Used for:

- Like counts
- View counts
- Metrics

### PN-Counter

Supports:

- Increment
- Decrement

### OR-Set

Used for:

- Collaborative lists
- Distributed collections

---

# When Eventual Consistency Creates Problems

## Problem 1: "My data disappeared"

Example:

```
User creates comment

Write succeeds ✅

Refresh page

Comment missing ❌
```

Cause:

Read-your-writes violation.

---

## Problem 2: Values go backward

Example:

```
First refresh:

Followers = 100


Second refresh:

Followers = 99
```

Cause:

Monotonic read violation.

---

## Problem 3: Lost updates

Example:

Two users edit the same ticket.

```
Agent A:
Status = Resolved


Agent B:
Status = Pending
```

Replication chooses:

```
Last write wins

Status = Pending
```

The first update disappears.

---

# Choosing the Right Consistency Model

Do not make everything strongly consistent.

Instead:

> Choose the minimum consistency guarantee required by the feature.

Examples:

| Feature | Recommended Model |
|---|---|
| Bank balance | Strong consistency |
| Inventory reservation | Strong consistency |
| User's own comment | Read-your-writes |
| Chat messages | Causal consistency |
| Social media likes | Eventual consistency |
| Search results | Eventual consistency |
| Analytics dashboards | Eventual consistency |

---

# Trade-off Summary

| Model | Guarantee | Cost | Usage |
|---|---|---|---|
| Linearizable | Latest value globally | Highest | Payments, inventory |
| Causal | Maintains cause-effect order | Medium | Chat, comments |
| Read-your-writes | User sees own changes | Low | User actions |
| Monotonic reads | Never goes backward | Low | Feeds, counters |
| Eventual | Eventually converges | Lowest | Search, cache |

---

# Interview Questions

## Q: If eventual consistency has no time guarantee, why is it useful?

Because real systems usually have small replication delays.

Most systems add:

- Session guarantees
- Version tracking
- Smart routing

so users rarely experience stale data.

---

## Q: Can causal consistency work without synchronized clocks?

Yes.

Common techniques:

- Vector clocks
- Version numbers
- Logical timestamps

No global clock is required.

---

## Q: Why not use Last-Write-Wins everywhere?

Because it silently deletes data.

Example:

```
User A:
Change address → New York


User B:
Change address → London
```

Last-write-wins keeps only one.

For:

- Documents
- Tickets
- Collaborative editing

this can cause data loss.

---

## Q: How do you provide read-your-writes in an eventually consistent system?

Options:

### Option 1: Sticky Sessions

Send the user back to the replica that handled the write.

### Option 2: Version Tokens

Client sends:

```
I have seen version 10
```

Replica waits until:

```
version >= 10
```

---

## Q: Does strong consistency mean zero replication lag?

No.

Replication can still happen asynchronously.

Strong consistency only means:

> The system does not expose stale data to the user.

It hides replication delay by using:

- Leaders
- Quorum reads
- Version checks

---

# Key Takeaway

Strong consistency gives correctness but costs performance.

Eventual consistency gives scalability and availability but requires careful handling.

A good distributed system does not choose one everywhere.

It chooses the **right consistency level for each feature**.

## Related topics
- [CAP Theorem](cap-theorem.md) — the P-vs-A/C choice that determines which consistency model is even achievable
- [PACELC Theorem](pacelc-theorem.md) — the latency cost of strong consistency during normal operation
- [Quorum](quorum.md) — the N/W/R math behind DynamoDB's tunable consistent reads
- [Consensus Algorithms](consensus-algorithms.md) — how linearizable systems like etcd achieve their guarantee
- [Database Replication](../02-data-storage/database-replication.md) — sync vs async replication is the mechanism producing this spectrum
