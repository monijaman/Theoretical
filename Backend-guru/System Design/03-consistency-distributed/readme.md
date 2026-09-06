# 3. Consistency & Distributed Theory

This section deals with the hardest part of distributed systems: how nodes coordinate when failures happen.

## What this section covers

- CAP theorem: the trade-off between consistency, availability, and partition tolerance
- PACELC: extending CAP to latency and consistency decisions
- Strong vs eventual consistency
- Distributed locks
- Leader election
- Consensus algorithms
- Quorum

## How to study it

1. Learn the core trade-offs first.
2. Then connect them to real distributed systems problems like leader selection and coordination.
3. Focus on reasoning over memorization.

## Suggested starting point

- [CAP Theorem](cap-theorem.md)

## All Topics in This Folder

- [CAP Theorem](cap-theorem.md)
- [Consensus Algorithms](consensus-algorithms.md)
- [Distributed Locks](distributed-locks.md)
- [Leader Election](leader-election.md)
- [PACELC Theorem](pacelc-theorem.md)
- [Quorum](quorum.md)
- [Strong vs Eventual Consistency](strong-vs-eventual-consistency.md)

## Practice Check

Describe what a client sees during a network partition. Explain which operations may wait or fail to preserve correctness.

[System Design guide](../readme.md) · [Backend learning guide](../../readme.md)
