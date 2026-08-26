# Quorum
[← Back to index](../readme.md)

## What it is and why it's asked

A quorum is the minimum number of nodes that must participate in an operation for the system to trust its result. Instead of requiring *every* replica to respond (slow, and unavailable the moment one replica is down) or trusting *any single* replica (fast, but wrong the moment replicas diverge), quorum systems let you dial in exactly how many nodes must agree for a read and for a write, and the relationship between those two numbers determines whether you get strong consistency or just availability. Interviewers ask about quorum because it's the concrete arithmetic behind almost every abstract trade-off discussed elsewhere in this folder — [CAP](cap-theorem.md), [PACELC](pacelc-theorem.md), and [strong vs eventual consistency](strong-vs-eventual-consistency.md) all cash out, in Dynamo-style systems, as literal quorum numbers you can compute.

## The N/W/R math

- **N** — the number of replicas a piece of data is stored on (the replication factor).
- **W** — the number of replicas that must acknowledge a **write** before it's considered successful.
- **R** — the number of replicas that must respond to a **read** before its result is returned to the client.

The core guarantee:

**If W + R > N, every read quorum and every write quorum are guaranteed to overlap in at least one replica.**

This means at least one node participating in the read has seen the latest successful write.


## Related topics
- [CAP Theorem](cap-theorem.md) — quorum settings are the literal dial between the CP and AP branches
- [PACELC Theorem](pacelc-theorem.md) — W/R choice directly trades off latency vs consistency during normal operation
- [Strong vs Eventual Consistency](strong-vs-eventual-consistency.md) — DynamoDB's consistent vs eventually-consistent reads are a quorum choice in disguise
- [Consensus Algorithms](consensus-algorithms.md) — majority quorums also underpin Raft/Paxos, for a stronger ordering guarantee
- [Database Replication](../02-data-storage/database-replication.md) — quorum is one strategy for how replicas are read/written
